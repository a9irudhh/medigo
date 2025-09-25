import express from 'express';
import {
    getUserAppointments,
    getAppointmentDetails,
    cancelAppointment,
    rescheduleAppointment,
    getDoctorAvailableSlots,
    getAppointmentStats
} from '../controllers/appointment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// All appointment routes require authentication
router.use(authenticate);

// Appointment routes
router.get('/', getUserAppointments);
router.get('/stats', getAppointmentStats);
router.get('/:appointmentId', getAppointmentDetails);
router.patch('/:appointmentId/cancel', cancelAppointment);
router.patch('/:appointmentId/reschedule', rescheduleAppointment);

// Doctor availability routes
router.get('/doctors/:doctorId/slots', getDoctorAvailableSlots);

export default router;
