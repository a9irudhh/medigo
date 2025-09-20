import User from '../models/user.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateVerificationToken } from '../utils/userUtils.js';

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
        // Generate verification tokens
        emailVerificationToken: generateVerificationToken(),
        phoneVerificationToken: generateVerificationToken(),
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        phoneVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };

    // Create user
    const user = await User.create(userData);

    // Remove sensitive information from response
    const userResponse = await User.findById(user._id).select('-password -emailVerificationToken -phoneVerificationToken');

    // Generate JWT token
    const token = user.generateAuthToken();

    // TODO: Send verification emails/SMS in production
    // await sendVerificationEmail(user.email, user.emailVerificationToken);
    // await sendVerificationSMS(user.phone, user.phoneVerificationToken);

    return res.status(201).json(
        new ApiResponse(
            201,
            {
                user: userResponse,
                token,
                message: "Account created successfully. Please verify your email and phone number."
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
        user.isPhoneVerified = false; // Reset verification if phone changed
        user.phoneVerificationToken = generateVerificationToken();
        user.phoneVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
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
 * Verify email
 * @route POST /api/users/verify-email
 * @access Private
 */
const verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token) {
        throw new ApiError(400, "Verification token is required");
    }

    const user = await User.findOne({
        _id: req.user.id,
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
        throw new ApiError(400, "Invalid or expired verification token");
    }

    // Update user verification status
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return res.status(200).json(
        new ApiResponse(200, null, "Email verified successfully")
    );
});

/**
 * Verify phone
 * @route POST /api/users/verify-phone
 * @access Private
 */
const verifyPhone = asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token) {
        throw new ApiError(400, "Verification token is required");
    }

    const user = await User.findOne({
        _id: req.user.id,
        phoneVerificationToken: token,
        phoneVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
        throw new ApiError(400, "Invalid or expired verification token");
    }

    // Update user verification status
    user.isPhoneVerified = true;
    user.phoneVerificationToken = undefined;
    user.phoneVerificationExpires = undefined;
    await user.save();

    return res.status(200).json(
        new ApiResponse(200, null, "Phone verified successfully")
    );
});

export {
    signup,
    login,
    logout,
    getProfile,
    updateProfile,
    verifyEmail,
    verifyPhone
};