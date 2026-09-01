const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

/**
 * =============================================================================
 * DATABASE SCHEMAS
 * =============================================================================
 */

// Room Schema
const RoomSchema = new mongoose.Schema({
    roomNumber: { type: String, required: true, unique: true },
    type: { type: String, enum: ['Single', 'Double', 'Suite', 'Deluxe'], required: true },
    pricePerNight: { type: Number, required: true },
    capacity: { type: Number, required: true },
    amenities: [{ type: String }],
    status: { type: String, enum: ['Available', 'Booked', 'Maintenance'], default: 'Available' },
    description: String,
    images: [String]
}, { timestamps: true });

// User/Guest Schema
const UserSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // In production, use bcrypt to hash
    phone: String,
    role: { type: String, enum: ['guest', 'admin'], default: 'guest' }
}, { timestamps: true });

// Booking Schema
const BookingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    checkInDate: { type: Date, required: true },
    checkOutDate: { type: Date, required: true },
    totalPrice: { type: Number, required: true },
    paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Cancelled'], default: 'Pending' },
    specialRequests: String
}, { timestamps: true });

// Review Schema
const ReviewSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: String
}, { timestamps: true });

const Room = mongoose.model('Room', RoomSchema);
const User = mongoose.model('User', UserSchema);
const Booking = mongoose.model('Booking', BookingSchema);
const Review = mongoose.model('Review', ReviewSchema);

/**
 * =============================================================================
 * MIDDLEWARE
 * =============================================================================
 */

// Error Handling Wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * =============================================================================
 * API ENDPOINTS
 * =============================================================================
 */

// --- ROOMS ENDPOINTS ---

// Get all available rooms with filters
router.get('/rooms', asyncHandler(async (req, res) => {
    const { type, minPrice, maxPrice } = req.query;
    let query = { status: 'Available' };

    if (type) query.type = type;
    if (minPrice || maxPrice) {
        query.pricePerNight = {};
        if (minPrice) query.pricePerNight.$gte = Number(minPrice);
        if (maxPrice) query.pricePerNight.$lte = Number(maxPrice);
    }

    const rooms = await Room.find(query);
    res.json({ success: true, data: rooms });
}));

// Get specific room details
router.get('/rooms/:id', asyncHandler(async (req, res) => {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
    res.json({ success: true, data: room });
}));

// Create room (Admin Only)
router.post('/rooms', asyncHandler(async (req, res) => {
    const room = await Room.create(req.body);
    res.status(201).json({ success: true, data: room });
}));

// Update room status or details (Admin Only)
router.put('/rooms/:id', asyncHandler(async (req, res) => {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: room });
}));

// --- USER ENDPOINTS ---

// Register user
router.post('/auth/register', asyncHandler(async (req, res) => {
    const user = await User.create(req.body);
    res.status(201).json({ success: true, data: { userId: user._id, email: user.email } });
}));

// --- BOOKING ENDPOINTS ---

// Create a new booking
router.post('/bookings', asyncHandler(async (req, res) => {
    const { userId, roomId, checkInDate, checkOutDate } = req.body;

    // Check if room is available for these dates
    const existingBooking = await Booking.findOne({
        roomId,
        $or: [
            { checkInDate: { $lte: checkOutDate }, checkOutDate: { $gte: checkInDate } }
        ]
    });

    if (existingBooking) {
        return res.status(400).json({ success: false, message: 'Room is already booked for these dates' });
    }

    // Calculate Price (simplified logic)
    const room = await Room.findById(roomId);
    const days = (new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24);
    const totalPrice = days * room.pricePerNight;

    const booking = await Booking.create({ ...req.body, totalPrice });
    
    // Mark room as booked (simplified)
    await Room.findByIdAndUpdate(roomId, { status: 'Booked' });

    res.status(201).json({ success: true, data: booking });
}));

// Get user's bookings
router.get('/bookings/user/:userId', asyncHandler(async (req, res) => {
    const bookings = await Booking.find({ userId: req.params.userId }).populate('roomId');
    res.json({ success: true, data: bookings });
}));

// Cancel booking
router.delete('/bookings/:id', asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    await Room.findByIdAndUpdate(booking.roomId, { status: 'Available' });
    await Booking.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Booking cancelled successfully' });
}));

// --- REVIEW ENDPOINTS ---

// Submit a room review
router.post('/reviews', asyncHandler(async (req, res) => {
    const review = await Review.create(req.body);
    res.status(201).json({ success: true, data: review });
}));

// Get reviews for a specific room
router.get('/reviews/room/:roomId', asyncHandler(async (req, res) => {
    const reviews = await Review.find({ roomId: req.params.roomId }).populate('userId', 'fullName');
    res.json({ success: true, data: reviews });
}));

/**
 * =============================================================================
 * GLOBAL ERROR HANDLER
 * =============================================================================
 */
router.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal Server Error'
    });
});

module.exports = router;