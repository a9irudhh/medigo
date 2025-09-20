import express from 'express';
import {
    signup,
    login,
    logout,
    getProfile,
    updateProfile,
    verifyEmail,
    verifyPhone
} from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.route('/signup').post(signup);
router.route('/login').post(login);

// Protected routes (require authentication)
router.route('/logout').post(authenticate, logout);
router.route('/profile').get(authenticate, getProfile);
router.route('/update-profile').put(authenticate, updateProfile);
router.route('/verify-email').post(authenticate, verifyEmail);
router.route('/verify-phone').post(authenticate, verifyPhone);

export default router;
