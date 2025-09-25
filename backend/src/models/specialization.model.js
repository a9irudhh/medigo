import mongoose from 'mongoose';

const specializationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Specialization name is required'],
        unique: true,
        trim: true,
        maxlength: [100, 'Specialization name cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    commonSymptoms: [{
        symptom: {
            type: String,
            required: true,
            trim: true
        },
        keywords: [{
            type: String,
            trim: true,
            lowercase: true
        }],
        weight: {
            type: Number,
            default: 1,
            min: [0.1, 'Weight must be at least 0.1'],
            max: [10, 'Weight cannot exceed 10']
        }
    }],
    commonConditions: [{
        type: String,
        trim: true
    }],
    bodyParts: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    urgencyKeywords: [{
        keyword: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },
        urgencyLevel: {
            type: String,
            enum: ['low', 'medium', 'high', 'urgent'],
            default: 'medium'
        }
    }],
    department: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    averageConsultationTime: {
        type: Number, // in minutes
        default: 30,
        min: [15, 'Consultation time must be at least 15 minutes'],
        max: [120, 'Consultation time cannot exceed 120 minutes']
    }
}, {
    timestamps: true
});

// Indexes for better search performance
specializationSchema.index({ 'commonSymptoms.keywords': 1 });
specializationSchema.index({ bodyParts: 1 });
specializationSchema.index({ isActive: 1 });

// Static method to find specialization by symptoms
specializationSchema.statics.findBySymptoms = function(symptoms) {
    const symptomKeywords = symptoms.toLowerCase().split(/\s+/);
    
    return this.aggregate([
        {
            $match: { isActive: true }
        },
        {
            $addFields: {
                matchScore: {
                    $sum: {
                        $map: {
                            input: '$commonSymptoms',
                            as: 'symptom',
                            in: {
                                $multiply: [
                                    '$$symptom.weight',
                                    {
                                        $size: {
                                            $setIntersection: [
                                                '$$symptom.keywords',
                                                symptomKeywords
                                            ]
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        },
        {
            $match: { matchScore: { $gt: 0 } }
        },
        {
            $sort: { matchScore: -1 }
        },
        {
            $limit: 5
        }
    ]);
};

// Static method to get urgency level for symptoms
specializationSchema.statics.getUrgencyLevel = function(symptoms) {
    const symptomText = symptoms.toLowerCase();
    
    return this.aggregate([
        { $unwind: '$urgencyKeywords' },
        {
            $match: {
                isActive: true,
                'urgencyKeywords.keyword': { $in: symptomText.split(/\s+/) }
            }
        },
        {
            $group: {
                _id: null,
                maxUrgency: { $max: '$urgencyKeywords.urgencyLevel' }
            }
        }
    ]);
};

export default mongoose.model('Specialization', specializationSchema);
