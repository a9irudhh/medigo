import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Doctor name is required'],
        trim: true,
        maxlength: [100, 'Doctor name cannot exceed 100 characters']
    },
    specialization: {
        type: String,
        required: [true, 'Specialization is required'],
        enum: [
            'Cardiologist', 
            'Neurologist', 
            'Dermatologist', 
            'Orthopedic', 
            'Pediatrician', 
            'Gynecologist', 
            'General Medicine', 
            'ENT', 
            'Ophthalmologist', 
            'Psychiatrist',
            'Endocrinologist',
            'Gastroenterologist',
            'Pulmonologist',
            'Urologist',
            'Rheumatologist'
        ]
    },
    qualifications: [{
        type: String,
        trim: true
    }],
    experience: {
        type: Number,
        required: [true, 'Experience is required'],
        min: [0, 'Experience cannot be negative']
    },
    hospital: {
        type: String,
        required: [true, 'Hospital name is required'],
        trim: true
    },
    department: {
        type: String,
        trim: true
    },
    availability: [{
        day: {
            type: String,
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        },
        slots: [{
            startTime: {
                type: String,
                match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter valid time format (HH:MM)']
            },
            endTime: {
                type: String,
                match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter valid time format (HH:MM)']
            },
            maxPatients: {
                type: Number,
                default: 1,
                min: [1, 'Max patients must be at least 1']
            }
        }]
    }],
    consultationFee: {
        type: Number,
        required: [true, 'Consultation fee is required'],
        min: [0, 'Consultation fee cannot be negative']
    },
    rating: {
        type: Number,
        default: 4.0,
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5']
    },
    totalReviews: {
        type: Number,
        default: 0,
        min: [0, 'Total reviews cannot be negative']
    },
    languages: [{
        type: String,
        trim: true
    }],
    contact: {
        phone: {
            type: String,
            trim: true
        },
        email: {
            type: String,
            trim: true,
            match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    profileImage: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Index for better query performance
doctorSchema.index({ specialization: 1, isActive: 1 });
doctorSchema.index({ hospital: 1, isActive: 1 });
doctorSchema.index({ rating: -1 });

// Virtual for full name
doctorSchema.virtual('fullName').get(function() {
    return `Dr. ${this.name}`;
});

// Method to get available slots for a specific date
doctorSchema.methods.getAvailableSlotsForDate = function(date) {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dayAvailability = this.availability.find(avail => avail.day === dayName);
    
    if (!dayAvailability) {
        return [];
    }
    
    return dayAvailability.slots || [];
};

// Static method to find doctors by specialization
doctorSchema.statics.findBySpecialization = function(specialization) {
    return this.find({ 
        specialization: new RegExp(specialization, 'i'), 
        isActive: true 
    }).sort({ rating: -1 });
};

export default mongoose.model('Doctor', doctorSchema);
