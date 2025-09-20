import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import User from '../models/user.model.js';

/**
 * Authentication middleware to verify JWT tokens
 * Adds user information to req.user if token is valid
 */
export const authenticate = asyncHandler(async (req, res, next) => {
    try {
        // Get token from Authorization header or cookies
        const token = req.cookies?.token || req.header("Authorization")?.replace("Bearer ", "");
        
        if (!token) {
            throw new ApiError(401, "Access token is required");
        }

        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decodedToken?.id).select("-password");
        
        if (!user) {
            throw new ApiError(401, "Invalid access token");
        }

        if (!user.isActive) {
            throw new ApiError(403, "Account has been deactivated");
        }
        req.user = user;
        next();
        
    } catch (error) {
        // Handle JWT specific errors
        if (error.name === 'JsonWebTokenError') {
            throw new ApiError(401, "Invalid access token");
        } else if (error.name === 'TokenExpiredError') {
            throw new ApiError(401, "Access token has expired");
        } else if (error.name === 'NotBeforeError') {
            throw new ApiError(401, "Access token not active");
        }
        throw error;
    }
});

/**
 * Optional authentication middleware
 * Adds user information to req.user if token is valid, but doesn't fail if no token
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.token || req.header("Authorization")?.replace("Bearer ", "");
        
        if (token) {
            const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decodedToken?.id).select("-password");
            
            if (user && user.isActive) {
                req.user = user;
            }
        }
        
        next();
    } catch (error) {
        next();
    }
});

/**
 * Role-based authorization middleware
 * @param {string[]} allowedRoles - Array of roles that can access the route
 */
export const authorize = (...allowedRoles) => {
    return asyncHandler(async (req, res, next) => {
        if (!req.user) {
            throw new ApiError(401, "Authentication required");
        }

        const userRole = req.user.role || 'patient'; // Default role is patient
        
        if (!allowedRoles.includes(userRole)) {
            throw new ApiError(403, `Access denied. Required roles: ${allowedRoles.join(', ')}`);
        }

        next();
    });
};
