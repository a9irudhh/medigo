import express from 'express';
import userRoutes from './user.routes.js';

const router = express.Router();

// API routes
router.use('/users', userRoutes);

// Health check route
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'MediGo API is running successfully',
        timestamp: new Date().toISOString()
    });
});

export default router;
