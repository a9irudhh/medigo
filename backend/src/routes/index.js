import express from 'express';
import userRoutes from './user.routes.js';
import chatRoutes from './chat.routes.js';
import appointmentRoutes from './appointment.routes.js';
import doctorRoutes from './doctor.routes.js';

const router = express.Router();

// API routes
router.use('/users', userRoutes);
router.use('/chat', chatRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/doctors', doctorRoutes);

// Health check route
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'MediGo API is running successfully',
        timestamp: new Date().toISOString(),
        services: {
            api: 'running',
            database: 'connected',
            aiAgent: 'available'
        }
    });
});

export default router;
