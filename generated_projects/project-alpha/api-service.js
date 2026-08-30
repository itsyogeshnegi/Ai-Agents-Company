const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

/**
 * DATABASE SCHEMAS
 */

// User Schema for authentication and ownership
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Todo Schema
const TodoSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    isCompleted: { type: Boolean, default: false },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    dueDate: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Todo = mongoose.model('Todo', TodoSchema);

/**
 * MIDDLEWARE: Error Handler & Validation
 */
const validateTodo = (req, res, next) => {
    const { title } = req.body;
    if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'Title is required and cannot be empty.' });
    }
    next();
};

/**
 * AUTH ENDPOINTS (Simplified for Project Brief)
 */
router.post('/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const user = new User({ username, email, password });
        await user.save();
        res.status(201).json({ message: 'User created successfully', userId: user._id });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * TODO CRUD ENDPOINTS
 */

// GET /api/todos - Fetch all todos for a specific user
router.get('/todos', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: 'userId query parameter is required' });

        const todos = await Todo.find({ userId }).sort({ createdAt: -1 });
        res.json(todos);
    } catch (err) {
        res.status(500).json({ error: 'Server error retrieving todos' });
    }
});

// POST /api/todos - Create a new todo
router.post('/todos', validateTodo, async (req, res) => {
    try {
        const { userId, title, description, priority, dueDate } = req.body;
        if (!userId) return res.status(400).json({ error: 'userId is required' });

        const todo = new Todo({
            userId,
            title,
            description,
            priority,
            dueDate
        });

        await todo.save();
        res.status(201).json(todo);
    } catch (err) {
        res.status(500).json({ error: 'Server error creating todo' });
    }
});

// PUT /api/todos/:id - Update todo status or details
router.put('/todos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        updates.updatedAt = Date.now();

        const updatedTodo = await Todo.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
        
        if (!updatedTodo) return res.status(404).json({ error: 'Todo not found' });
        
        res.json(updatedTodo);
    } catch (err) {
        res.status(400).json({ error: 'Update failed: ' + err.message });
    }
});

// DELETE /api/todos/:id - Remove a todo
router.delete('/todos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedTodo = await Todo.findByIdAndDelete(id);
        
        if (!deletedTodo) return res.status(404).json({ error: 'Todo not found' });
        
        res.json({ message: 'Todo successfully deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Server error deleting todo' });
    }
});

/**
 * SERVER INITIALIZATION (Boilerplate for execution)
 */
if (require.main === module) {
    const app = express();
    app.use(express.json());

    // API Route Integration
    app.use('/api', router);

    const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/todo_db';
    const PORT = process.env.PORT || 3000;

    mongoose.connect(MONGO_URI)
        .then(() => {
            console.log('Connected to MongoDB successfully.');
            app.listen(PORT, () => console.log(`Vikram Rao's API Service running on port ${PORT}`));
        })
        .catch(err => console.error('MongoDB connection error:', err));
}

module.exports = router;