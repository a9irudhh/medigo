import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    conversationId: {
        type: String,
        required: [true, 'Conversation ID is required'],
        unique: true
    },
    status: {
        type: String,
        enum: [
            'started',
            'gathering_symptoms',
            'analyzing_symptoms',
            'recommending_doctor',
            'confirming_doctor',
            'checking_availability',
            'selecting_slot',
            'confirming_appointment',
            'completed',
            'cancelled',
            'error'
        ],
        default: 'started'
    },
    currentStep: {
        type: String,
        enum: [
            'initial_greeting',
            'symptom_collection',
            'symptom_clarification',
            'doctor_recommendation',
            'doctor_confirmation',
            'slot_selection',
            'appointment_confirmation',
            'completed'
        ],
        default: 'initial_greeting'
    },
    messages: [{
        messageId: {
            type: String,
            required: true
        },
        sender: {
            type: String,
            enum: ['user', 'agent', 'system'],
            required: true
        },
        content: {
            type: String,
            required: true,
            trim: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        messageType: {
            type: String,
            enum: ['text', 'options', 'confirmation', 'error', 'system'],
            default: 'text'
        },
        metadata: {
            agentType: String, // symptom_analyzer, doctor_matcher, booking_coordinator
            confidence: Number,
            suggestions: [String],
            options: [{
                id: String,
                label: String,
                value: mongoose.Schema.Types.Mixed
            }]
        }
    }],
    extractedData: {
        symptoms: {
            raw: String,
            processed: String,
            keywords: [String],
            bodyParts: [String],
            severity: {
                type: String,
                enum: ['mild', 'moderate', 'severe', 'urgent']
            },
            duration: String,
            frequency: String
        },
        recommendedSpecialization: {
            primary: {
                name: String,
                confidence: Number,
                reasoning: String
            },
            alternatives: [{
                name: String,
                confidence: Number,
                reasoning: String
            }]
        },
        selectedDoctor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor'
        },
        preferredDate: Date,
        preferredTime: String,
        selectedSlot: {
            date: Date,
            startTime: String,
            endTime: String
        }
    },
    aiContext: {
        lastAgentResponse: String,
        pendingQuestions: [String],
        clarificationNeeded: Boolean,
        conversationSummary: String,
        userPreferences: {
            communicationStyle: String, // formal, casual, brief, detailed
            preferredTime: String, // morning, afternoon, evening
            maxWaitDays: Number
        }
    },
    appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment'
    },
    sessionTimeout: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
    },
    isActive: {
        type: Boolean,
        default: true
    },
    completedAt: Date,
    errorLog: [{
        timestamp: {
            type: Date,
            default: Date.now
        },
        error: String,
        step: String,
        resolved: {
            type: Boolean,
            default: false
        }
    }]
}, {
    timestamps: true
});

// Indexes
conversationSchema.index({ user: 1, createdAt: -1 });
conversationSchema.index({ status: 1, isActive: 1 });
conversationSchema.index({ sessionTimeout: 1 }); // For cleanup

// Virtual to check if session is expired
conversationSchema.virtual('isExpired').get(function() {
    return new Date() > this.sessionTimeout;
});

// Method to add a message
conversationSchema.methods.addMessage = function(sender, content, messageType = 'text', metadata = {}) {
    const messageId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.messages.push({
        messageId,
        sender,
        content,
        messageType,
        metadata,
        timestamp: new Date()
    });
    
    // Update session timeout
    this.sessionTimeout = new Date(Date.now() + 30 * 60 * 1000);
    
    return messageId;
};

// Method to update conversation status and step
conversationSchema.methods.updateStatus = function(status, step = null) {
    this.status = status;
    if (step) {
        this.currentStep = step;
    }
    
    // Update session timeout
    this.sessionTimeout = new Date(Date.now() + 30 * 60 * 1000);
};

// Method to extract and update symptoms
conversationSchema.methods.updateSymptoms = function(symptomsData) {
    this.extractedData.symptoms = {
        ...this.extractedData.symptoms,
        ...symptomsData
    };
};

// Method to update doctor recommendation
conversationSchema.methods.updateRecommendation = function(recommendation) {
    this.extractedData.recommendedSpecialization = recommendation;
};

// Method to complete conversation
conversationSchema.methods.complete = function(appointmentId = null) {
    this.status = 'completed';
    this.currentStep = 'completed';
    this.completedAt = new Date();
    this.isActive = false;
    
    if (appointmentId) {
        this.appointmentId = appointmentId;
    }
};

// Static method to cleanup expired conversations
conversationSchema.statics.cleanupExpired = function() {
    return this.updateMany(
        { 
            sessionTimeout: { $lt: new Date() },
            status: { $nin: ['completed', 'cancelled'] },
            isActive: true
        },
        { 
            status: 'cancelled',
            isActive: false 
        }
    );
};

// Static method to find active conversation for user
conversationSchema.statics.findActiveForUser = function(userId) {
    return this.findOne({
        user: userId,
        isActive: true,
        status: { $nin: ['completed', 'cancelled'] },
        sessionTimeout: { $gt: new Date() }
    }).sort({ updatedAt: -1 });
};

export default mongoose.model('Conversation', conversationSchema);
