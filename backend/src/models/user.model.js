import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema({
    // Basic Information
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        match: [/^[+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long'],
        select: false // to not return password field by default
    },

    // Demographics
    dateOfBirth: {
        type: Date,
        required: [true, 'Date of birth is required']
    },
    gender: {
        type: String,
        required: [true, 'Gender is required'],
        enum: ['male', 'female', 'other', 'prefer-not-to-say']
    },
    bloodGroup: {
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'],
        default: 'unknown'
    },

    // Address Information
    address: {
        street: {
            type: String,
            trim: true
        },
        city: {
            type: String,
            required: [true, 'City is required'],
            trim: true
        },
        state: {
            type: String,
            required: [true, 'State is required'],
            trim: true
        },
        zipCode: {
            type: String,
            required: [true, 'ZIP code is required'],
            trim: true
        },
        country: {
            type: String,
            required: [true, 'Country is required'],
            trim: true,
            default: 'India'
        }
    },

    // Emergency Contact
    emergencyContact: {
        name: {
            type: String,
            trim: true
        },
        relationship: {
            type: String,
            trim: true
        },
        phone: {
            type: String,
            trim: true
        }
    },

    // Basic Medical Information (simplified for v1)
    medicalHistory: [{
        condition: {
            type: String,
            trim: true
        },
        notes: String
    }],

    // User Preferences & Settings
    preferences: {
        preferredLanguage: {
            type: String,
            default: 'english',
            enum: ['english', 'hindi', 'spanish', 'french', 'german', 'chinese']
        },
        notificationPreferences: {
            email: {
                type: Boolean,
                default: true
            },
            sms: {
                type: Boolean,
                default: true
            },
            push: {
                type: Boolean,
                default: true
            }
        },
        appointmentReminders: {
            type: Boolean,
            default: true
        },
        dataSharing: {
            type: Boolean,
            default: false
        }
    },

    // Account Status & Security
    isActive: {
        type: Boolean,
        default: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isPhoneVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    phoneVerificationToken: String,
    phoneVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,

    // AI Interaction History (for MediGo AI agent)
    conversationHistory: [{
        sessionId: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        symptoms: [String],
        aiRecommendations: [{
            specialty: String,
            confidence: Number,
            reasoning: String
        }],
        outcome: {
            type: String,
            enum: ['appointment_booked', 'consultation_only', 'referred_emergency', 'incomplete']
        }
    }],


}, {
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});


// Virtual for user's age
userSchema.virtual('age').get(function() {
    if (!this.dateOfBirth) return null;
    const today = new Date();
    let age = today.getFullYear() - this.dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - this.dateOfBirth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < this.dateOfBirth.getDate())) {
        age--;
    }
    return age;
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});


// Indexes for better query performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { unique: true });
userSchema.index({ 'address.city': 1, 'address.state': 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ isActive: 1 });


// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();
    
    try {
        const saltRounds = 12;
        this.password = await bcrypt.hash(this.password, saltRounds);
        next();
    } catch (error) {
        next(error);
    }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error('Password comparison failed');
    }
};

// Instance method to generate JWT token
userSchema.methods.generateAuthToken = function() {
    const payload = {
        id: this._id,
        email: this.email,
        role: 'patient' // Default role for users
    };
    
    return jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );
};



// Static method to find user by email or phone
userSchema.statics.findByEmailOrPhone = function(identifier) {
    return this.findOne({
        $or: [
            { email: identifier },
            { phone: identifier }
        ],
        isActive: true
    });
};

// Efficient method to add conversation history using MongoDB operators
userSchema.methods.addConversationHistory = async function(sessionData) {
    const conversationEntry = {
        sessionId: sessionData.sessionId,
        timestamp: new Date(),
        symptoms: sessionData.symptoms || [],
        aiRecommendations: sessionData.aiRecommendations || [],
        outcome: sessionData.outcome || 'incomplete'
    };

    // Use MongoDB $push with $slice to efficiently manage array size
    return await this.updateOne({
        $push: {
            conversationHistory: {
                $each: [conversationEntry],
                $slice: -50 // Keep only last 50 conversations
            }
        }
    });
};

const User = mongoose.model('User', userSchema);

export default User;