const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// --- CONFIGURATION & SECURITY ---
const JWT_SECRET = process.env.JWT_SECRET || 'v_rao_secure_secret_2024';
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100 
});
app.use(limiter);

// --- MONGOOSE SCHEMAS ---

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    stats: {
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        draws: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 }
    },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const GameSchema = new mongoose.Schema({
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    board: { 
        type: [String], 
        default: [null, null, null, null, null, null, null, null, null],
        validate: [val => val.length === 9, 'Board must have exactly 9 cells']
    },
    turn: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    turnSymbol: { type: String, enum: ['X', 'O'], default: 'X' },
    status: { type: String, enum: ['ONGOING', 'DRAW', 'WINNER'], default: 'ONGOING' },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Game = mongoose.model('Game', GameSchema);

// --- MIDDLEWARE ---

const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) throw new Error('Authentication token required');
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Unauthorized', error: err.message });
    }
};

const globalErrorHandler = (err, req, res, next) => {
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'production' ? {} : err.stack
    });
};

// --- GAME LOGIC HELPERS ---

const checkWinner = (board) => {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
        [0, 4, 8], [2, 4, 6]             // Diagonals
    ];

    for (let pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    if (!board.includes(null)) return 'DRAW';
    return null;
};

// --- API ENDPOINTS ---

// AUTHENTICATION
router.post('/auth/register', async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        const user = await User.create({ username, email, password });
        res.status(201).json({ success: true, data: { userId: user._id }, message: 'User registered successfully' });
    } catch (err) { next(err); }
});

router.post('/auth/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, password });
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, data: { token, userId: user._id }, message: 'Login successful' });
    } catch (err) { next(err); }
});

// GAME MANAGEMENT
router.post('/games/create', authenticate, async (req, res, next) => {
    try {
        const { opponentId } = req.body;
        if (!opponentId) return res.status(400).json({ success: false, message: 'Opponent ID required' });
        
        const game = await Game.create({
            players: [req.user.id, opponentId],
            turn: req.user.id,
            turnSymbol: 'X'
        });
        res.status(201).json({ success: true, data: game, message: 'Game initialized' });
    } catch (err) { next(err); }
});

router.get('/games/:id', authenticate, async (req, res, next) => {
    try {
        const game = await Game.findById(req.params.id).populate('players', 'username');
        if (!game) return res.status(404).json({ success: false, message: 'Game not found' });
        res.json({ success: true, data: game });
    } catch (err) { next(err); }
});

router.patch('/games/:id/move', authenticate, async (req, res, next) => {
    try {
        const { cellIndex } = req.body;
        const game = await Game.findById(req.params.id);

        if (!game) return res.status(404).json({ success: false, message: 'Game not found' });
        if (game.status !== 'ONGOING') return res.status(400).json({ success: false, message: 'Game is already finished' });
        if (game.turn.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Not your turn' });
        if (cellIndex < 0 || cellIndex > 8 || game.board[cellIndex] !== null) {
            return res.status(400).json({ success: false, message: 'Invalid move' });
        }

        const currentSymbol = game.turnSymbol;
        game.board[cellIndex] = currentSymbol;

        const result = checkWinner(game.board);
        if (result) {
            game.status = result === 'DRAW' ? 'DRAW' : 'WINNER';
            if (result !== 'DRAW') {
                game.winner = req.user.id;
                await User.findByIdAndUpdate(req.user.id, { $inc: { 'stats.wins': 1, 'stats.gamesPlayed': 1 } });
                const opponent = game.players.find(p => p.toString() !== req.user.id);
                await User.findByIdAndUpdate(opponent, { $inc: { 'stats.losses': 1, 'stats.gamesPlayed': 1 } });
            } else {
                await User.updateMany({ _id: { $in: game.players } }, { $inc: { 'stats.draws': 1, 'stats.gamesPlayed': 1 } });
            }
            game.endTime = new Date();
        } else {
            // Switch Turn
            game.turn = game.players.find(p => p.toString() !== req.user.id);
            game.turnSymbol = currentSymbol === 'X' ? 'O' : 'X';
        }

        await game.save();
        res.json({ success: true, data: game, message: 'Move processed successfully' });
    } catch (err) { next(err); }
});

// STATS
router.get('/users/stats/:id', authenticate, async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).select('username stats');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, data: user });
    } catch (err) { next(err); }
});

app.use('/api', router);
app.use(globalErrorHandler);

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tictactoe').then(() => {
    app.listen(PORT, () => console.log(`API Service running on port ${PORT}`));
});