import User from '../models/user.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateVerificationToken, generatePasswordResetToken, generateOTP } from '../utils/userUtils.js';
import { 
    sendPasswordResetEmail, 
    sendPasswordChangeConfirmationEmail,
    sendVerificationEmail,
    sendWelcomeEmail 
} from '../services/emailService.js';

/**
 * Register a new user
 * @route POST /api/users/signup
 * @access Public
 */
const signup = asyncHandler(async (req, res) => {
    const {
        firstName,
        lastName,
        email,
        phone,
        password,
        dateOfBirth,
        gender,
        bloodGroup,
        address,
        emergencyContact,
        preferences
    } = req.body;

    // Required field validation
    if (!firstName || !lastName || !email || !phone || !password || !dateOfBirth || !gender) {
        throw new ApiError(400, "All required fields must be provided");
    }

    // Check if user already exists
    const existingUser = await User.findByEmailOrPhone(email) || await User.findByEmailOrPhone(phone);
    if (existingUser) {
        throw new ApiError(409, "User with this email or phone already exists");
    }

    // Validate address required fields
    if (!address?.city || !address?.state || !address?.zipCode) {
        throw new ApiError(400, "Address city, state, and zipCode are required");
    }

    // Create user object
    const userData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        password,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        bloodGroup: bloodGroup || 'unknown',
        address: {
            street: address.street?.trim() || '',
            city: address.city.trim(),
            state: address.state.trim(),
            zipCode: address.zipCode.trim(),
            country: address.country?.trim() || 'India'
        },
        emergencyContact: emergencyContact || {},
        preferences: {
            preferredLanguage: preferences?.preferredLanguage || 'english',
            notificationPreferences: {
                email: preferences?.notificationPreferences?.email ?? true,
                sms: preferences?.notificationPreferences?.sms ?? true,
                push: preferences?.notificationPreferences?.push ?? true
            },
            appointmentReminders: preferences?.appointmentReminders ?? true,
            dataSharing: preferences?.dataSharing ?? false
        },
        // Generate email verification OTP
        emailOTP: generateOTP(),
        emailOTPExpiry: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    };

    // Create user
    const user = await User.create(userData);

    // Remove sensitive information from response
    const userResponse = await User.findById(user._id).select('-password -emailVerificationToken -phoneVerificationToken -emailOTP -forgotPasswordOTP');

    // Generate JWT token
    const token = user.generateAuthToken();

    // Send verification email with OTP
    try {
        await sendVerificationEmail(user.email, user.firstName, user.emailOTP);
        console.log('Verification email sent successfully');
    } catch (error) {
        console.error('Failed to send verification email:', error);
        // Don't fail registration if email sending fails
    }

    return res.status(201).json(
        new ApiResponse(
            201,
            {
                user: userResponse,
                token,
                message: "Account created successfully. Please check your email for verification OTP."
            },
            "User registered successfully"
        )
    );
});

/**
 * Login user
 * @route POST /api/users/login
 * @access Public
 */
const login = asyncHandler(async (req, res) => {
    const { identifier, password } = req.body; // identifier can be email or phone

    // Validation
    if (!identifier || !password) {
        throw new ApiError(400, "Email/Phone and password are required");
    }

    // Find user by email or phone
    const user = await User.findByEmailOrPhone(identifier.toLowerCase().trim()).select('+password');
    
    if (!user) {
        throw new ApiError(401, "Invalid credentials");
    }

    // Check if account is active
    if (!user.isActive) {
        throw new ApiError(403, "Account has been deactivated. Please contact support.");
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    // Generate JWT token
    const token = user.generateAuthToken();

    // Update last login (optional for v1)
    // await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    // Remove sensitive information from response
    const userResponse = await User.findById(user._id).select('-password');

    // Set secure HTTP-only cookie (optional)
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };

    return res
        .status(200)
        .cookie('token', token, cookieOptions)
        .json(
            new ApiResponse(
                200,
                {
                    user: userResponse,
                    token
                },
                "Login successful"
            )
        );
});

/**
 * Logout user
 * @route POST /api/users/logout
 * @access Private
 */
const logout = asyncHandler(async (req, res) => {
    // Clear the cookie
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    };

    return res
        .status(200)
        .clearCookie('token', cookieOptions)
        .json(
            new ApiResponse(200, null, "Logout successful")
        );
});

/**
 * Get current user profile
 * @route GET /api/users/profile
 * @access Private
 */
const getProfile = asyncHandler(async (req, res) => {
    // req.user should be set by auth middleware
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res.status(200).json(
        new ApiResponse(200, { user }, "Profile retrieved successfully")
    );
});

/**
 * Update user profile
 * @route PUT /api/users/profile
 * @access Private
 */
const updateProfile = asyncHandler(async (req, res) => {
    const {
        firstName,
        lastName,
        phone,
        dateOfBirth,
        gender,
        bloodGroup,
        address,
        emergencyContact,
        preferences
    } = req.body;

    // Find user
    const user = await User.findById(req.user.id);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Check if phone is being changed and if it's already taken
    if (phone && phone !== user.phone) {
        const existingUser = await User.findOne({ phone, _id: { $ne: user._id } });
        if (existingUser) {
            throw new ApiError(409, "Phone number is already registered");
        }
        user.phone = phone;
    }

    // Update fields if provided
    if (firstName) user.firstName = firstName.trim();
    if (lastName) user.lastName = lastName.trim();
    if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);
    if (gender) user.gender = gender;
    if (bloodGroup) user.bloodGroup = bloodGroup;
    
    if (address) {
        user.address = {
            street: address.street?.trim() || user.address.street,
            city: address.city?.trim() || user.address.city,
            state: address.state?.trim() || user.address.state,
            zipCode: address.zipCode?.trim() || user.address.zipCode,
            country: address.country?.trim() || user.address.country
        };
    }

    if (emergencyContact) {
        user.emergencyContact = {
            name: emergencyContact.name?.trim() || user.emergencyContact.name,
            relationship: emergencyContact.relationship?.trim() || user.emergencyContact.relationship,
            phone: emergencyContact.phone?.trim() || user.emergencyContact.phone
        };
    }

    if (preferences) {
        user.preferences = {
            preferredLanguage: preferences.preferredLanguage || user.preferences.preferredLanguage,
            notificationPreferences: {
                ...user.preferences.notificationPreferences,
                ...preferences.notificationPreferences
            },
            appointmentReminders: preferences.appointmentReminders ?? user.preferences.appointmentReminders,
            dataSharing: preferences.dataSharing ?? user.preferences.dataSharing
        };
    }

    // Save updated user
    await user.save();

    // Return updated user without sensitive fields
    const updatedUser = await User.findById(user._id).select('-password');

    return res.status(200).json(
        new ApiResponse(200, { user: updatedUser }, "Profile updated successfully")
    );
});

/**
 * Verify email with OTP
 * @route POST /api/users/verify-email
 * @access Private
 */
const verifyEmail = asyncHandler(async (req, res) => {
    const { otp } = req.body;

    if (!otp) {
        throw new ApiError(400, "Email OTP is required");
    }

    const user = await User.findOne({
        _id: req.user.id,
        emailOTP: otp.toString(),
        emailOTPExpiry: { $gt: Date.now() }
    });

    if (!user) {
        throw new ApiError(400, "Invalid or expired email OTP");
    }

    // Update user verification status
    user.isEmailVerified = true;
    user.emailOTP = undefined;
    user.emailOTPExpiry = undefined;
    await user.save();

    // Send welcome email
    try {
        await sendWelcomeEmail(user.email, user.firstName);
    } catch (error) {
        console.error('Failed to send welcome email:', error);
    }

    return res.status(200).json(
        new ApiResponse(200, null, "Email verified successfully! Welcome to MediGo.")
    );
});

/**
 * Forgot password - Send reset OTP
 * @route POST /api/users/forgot-password
 * @access Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    // Find user by email
    const user = await User.findOne({ 
        email: email.toLowerCase().trim(),
        isActive: true 
    });

    if (!user) {
        // Don't reveal if email exists or not for security
        return res.status(200).json(
            new ApiResponse(200, null, "If the email exists, a password reset OTP has been sent")
        );
    }

    // Generate password reset OTP
    const resetOTP = generateOTP();
    const resetOTPExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save reset OTP to user
    user.resetPasswordOTP = resetOTP;
    user.resetPasswordOTPExpiry = resetOTPExpires;
    await user.save();

    try {
        // Send password reset email with OTP
        await sendPasswordResetEmail(user.email, user.firstName, resetOTP);

        return res.status(200).json(
            new ApiResponse(200, null, "Password reset OTP sent to your email successfully")
        );
    } catch (error) {
        // Clear reset OTP if email sending fails
        user.resetPasswordOTP = undefined;
        user.resetPasswordOTPExpiry = undefined;
        await user.save();

        console.error("Failed to send password reset email:", error);
        throw new ApiError(500, "Failed to send password reset email. Please try again.");
    }
});

/**
 * Reset password using OTP
 * @route POST /api/users/reset-password
 * @access Public
 */
const resetPassword = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        throw new ApiError(400, "Email, OTP and new password are required");
    }

    if (newPassword.length < 8) {
        throw new ApiError(400, "Password must be at least 8 characters long");
    }

    // Find user with valid reset OTP
    const user = await User.findOne({
        email: email.toLowerCase().trim(),
        resetPasswordOTP: otp.toString(),
        resetPasswordOTPExpiry: { $gt: Date.now() },
        isActive: true
    });

    if (!user) {
        throw new ApiError(400, "Invalid or expired password reset OTP");
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpiry = undefined;
    await user.save();

    // Send confirmation email
    try {
        await sendPasswordChangeConfirmationEmail(user.email, user.firstName);
    } catch (error) {
        console.error("Failed to send password change confirmation email:", error);
        // Don't throw error here as password was successfully changed
    }

    return res.status(200).json(
        new ApiResponse(200, null, "Password reset successfully")
    );
});

/**
 * Change password (for logged-in users)
 * @route POST /api/users/change-password
 * @access Private
 */
const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        throw new ApiError(400, "Current password and new password are required");
    }

    if (newPassword.length < 8) {
        throw new ApiError(400, "New password must be at least 8 characters long");
    }

    // Find user with password
    const user = await User.findById(req.user.id).select('+password');
    
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
        throw new ApiError(400, "Current password is incorrect");
    }

    // Check if new password is same as current
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
        throw new ApiError(400, "New password must be different from current password");
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Send confirmation email
    try {
        await sendPasswordChangeConfirmationEmail(user.email, user.firstName);
    } catch (error) {
        console.error("Failed to send password change confirmation email:", error);
    }

    return res.status(200).json(
        new ApiResponse(200, null, "Password changed successfully")
    );
});

/**
 * Resend email verification OTP
 * @route POST /api/users/resend-email-otp
 * @access Private
 */
const resendEmailOTP = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (user.isEmailVerified) {
        throw new ApiError(400, "Email is already verified");
    }

    // Generate new OTP
    const newOTP = generateOTP();
    user.emailOTP = newOTP;
    user.emailOTPExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    // Send new OTP
    try {
        await sendVerificationEmail(user.email, user.firstName, newOTP);
        
        return res.status(200).json(
            new ApiResponse(200, null, "New verification OTP sent to your email")
        );
    } catch (error) {
        console.error("Failed to resend verification email:", error);
        throw new ApiError(500, "Failed to send verification email. Please try again.");
    }
});

export {
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
};