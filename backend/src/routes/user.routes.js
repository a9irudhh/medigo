import express from 'express';
import {
    signup,
    login,
    logout,
    getProfile,
    updateProfile,
    verifyEmail,
    forgotPassword,
    resetPassword,
    changePassword,
    resendEmailOTP
} from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.route('/signup').post(signup);
router.route('/login').post(login);
router.route('/forgot-password').post(forgotPassword);
router.route('/reset-password').post(resetPassword);

// Protected routes (require authentication)
router.route('/logout').post(authenticate, logout);
router.route('/profile').get(authenticate, getProfile).put(authenticate, updateProfile);
router.route('/verify-email').post(authenticate, verifyEmail);
router.route('/change-password').post(authenticate, changePassword);
router.route('/resend-email-otp').post(authenticate, resendEmailOTP);

export default router;
