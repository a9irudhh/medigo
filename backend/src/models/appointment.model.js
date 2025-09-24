import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Patient ID is required']
    },
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: [true, 'Doctor ID is required']
    },
    appointmentDate: {
        type: Date,
        required: [true, 'Appointment date is required']
    },
    timeSlot: {
        startTime: {
            type: String,
            required: [true, 'Start time is required'],
            match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter valid time format (HH:MM)']
        },
        endTime: {
            type: String,
            required: [true, 'End time is required'],
            match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter valid time format (HH:MM)']
        }
    },
    symptoms: {
        type: String,
        required: [true, 'Symptoms description is required'],
        trim: true,
        maxlength: [1000, 'Symptoms description cannot exceed 1000 characters']
    },
    symptomsSummary: {
        type: String,
        trim: true,
        maxlength: [500, 'Symptoms summary cannot exceed 500 characters']
    },
    reasonForVisit: {
        type: String,
        enum: [
            'Regular Checkup',
            'Follow-up',
            'New Symptom',
            'Chronic Condition',
            'Emergency',
            'Second Opinion',
            'Preventive Care',
            'Other'
        ],
        default: 'New Symptom'
    },
    status: {
        type: String,
        enum: [
            'scheduled',
            'confirmed',
            'in-progress',
            'completed',
            'cancelled',
            'no-show',
            'rescheduled'
        ],
        default: 'scheduled'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    consultationFee: {
        type: Number,
        required: [true, 'Consultation fee is required'],
        min: [0, 'Consultation fee cannot be negative']
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'refunded', 'failed'],
        default: 'pending'
    },
    notes: {
        patient: {
            type: String,
            trim: true,
            maxlength: [500, 'Patient notes cannot exceed 500 characters']
        },
        doctor: {
            type: String,
            trim: true,
            maxlength: [1000, 'Doctor notes cannot exceed 1000 characters']
        },
        admin: {
            type: String,
            trim: true,
            maxlength: [500, 'Admin notes cannot exceed 500 characters']
        }
    },
    conversationId: {
        type: String,
        trim: true
    },
    aiRecommendation: {
        confidence: {
            type: Number,
            min: [0, 'Confidence cannot be negative'],
            max: [1, 'Confidence cannot exceed 1']
        },
        specialization: {
            type: String,
            trim: true
        },
        alternativeSpecializations: [{
            type: String,
            trim: true
        }]
    },
    rescheduledFrom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment'
    },
    cancelledAt: {
        type: Date
    },
    cancelledBy: {
        type: String,
        enum: ['patient', 'doctor', 'admin', 'system']
    },
    cancellationReason: {
        type: String,
        trim: true,
        maxlength: [300, 'Cancellation reason cannot exceed 300 characters']
    }
}, {
    timestamps: true
});

// Indexes for better query performance
appointmentSchema.index({ patient: 1, appointmentDate: -1 });
appointmentSchema.index({ doctor: 1, appointmentDate: 1 });
appointmentSchema.index({ status: 1, appointmentDate: 1 });
appointmentSchema.index({ conversationId: 1 });
appointmentSchema.index({ appointmentDate: 1, status: 1 });

// Virtual for appointment duration in minutes
appointmentSchema.virtual('duration').get(function() {
    const [startHours, startMinutes] = this.timeSlot.startTime.split(':').map(Number);
    const [endHours, endMinutes] = this.timeSlot.endTime.split(':').map(Number);
    
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    
    return endTotalMinutes - startTotalMinutes;
});

// Virtual to check if appointment is upcoming
appointmentSchema.virtual('isUpcoming').get(function() {
    return new Date() < this.appointmentDate && ['scheduled', 'confirmed'].includes(this.status);
});

// Static method to find appointments by date range
appointmentSchema.statics.findByDateRange = function(startDate, endDate, options = {}) {
    const query = {
        appointmentDate: {
            $gte: startDate,
            $lte: endDate
        }
    };
    
    if (options.doctor) query.doctor = options.doctor;
    if (options.patient) query.patient = options.patient;
    if (options.status) query.status = options.status;
    
    return this.find(query)
        .populate('patient', 'firstName lastName email phone')
        .populate('doctor', 'name specialization hospital consultationFee')
        .sort({ appointmentDate: 1 });
};

// Method to check for scheduling conflicts
appointmentSchema.statics.checkConflict = async function(doctorId, appointmentDate, startTime, endTime, excludeAppointmentId = null) {
    const query = {
        doctor: doctorId,
        appointmentDate: appointmentDate,
        status: { $in: ['scheduled', 'confirmed', 'in-progress'] },
        $or: [
            {
                'timeSlot.startTime': { $lt: endTime },
                'timeSlot.endTime': { $gt: startTime }
            }
        ]
    };
    
    if (excludeAppointmentId) {
        query._id = { $ne: excludeAppointmentId };
    }
    
    const conflictingAppointments = await this.find(query);
    return conflictingAppointments.length > 0;
};

// Pre-save middleware to validate appointment time
appointmentSchema.pre('save', async function(next) {
    if (this.isNew || this.isModified('appointmentDate') || this.isModified('timeSlot')) {
        // Check if appointment is in the future
        const now = new Date();
        if (this.appointmentDate < now) {
            return next(new Error('Appointment cannot be scheduled in the past'));
        }
        
        // Check for conflicts
        const hasConflict = await this.constructor.checkConflict(
            this.doctor,
            this.appointmentDate,
            this.timeSlot.startTime,
            this.timeSlot.endTime,
            this._id
        );
        
        if (hasConflict) {
            return next(new Error('Time slot is already booked'));
        }
    }
    
    next();
});

export default mongoose.model('Appointment', appointmentSchema);
