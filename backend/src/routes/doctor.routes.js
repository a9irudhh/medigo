import express from 'express';
import {
    getAllDoctors,
    getDoctorById,
    getDoctorsBySpecialization,
    searchDoctorsBySymptoms,
    getSpecializations,
    getHospitals,
    getDoctorStats
} from '../controllers/doctor.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes (no authentication required)
router.get('/', getAllDoctors);
router.get('/stats', getDoctorStats);
router.get('/specializations', getSpecializations);
router.get('/hospitals', getHospitals);
router.get('/specialization/:specialization', getDoctorsBySpecialization);
router.get('/:doctorId', getDoctorById);

// Protected routes (authentication required)
router.post('/search-by-symptoms', authenticate, searchDoctorsBySymptoms);

export default router;
