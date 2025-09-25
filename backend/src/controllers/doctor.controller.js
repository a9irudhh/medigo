import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import Doctor from '../models/doctor.model.js';
import Specialization from '../models/specialization.model.js';

// Get all doctors with filters
const getAllDoctors = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        specialization,
        hospital,
        search,
        sortBy = 'rating',
        sortOrder = 'desc',
        minRating,
        maxFee
    } = req.query;

    // Build query
    const query = { isActive: true };

    if (specialization) {
        query.specialization = new RegExp(specialization, 'i');
    }

    if (hospital) {
        query.hospital = new RegExp(hospital, 'i');
    }

    if (search) {
        query.$or = [
            { name: new RegExp(search, 'i') },
            { specialization: new RegExp(search, 'i') },
            { hospital: new RegExp(search, 'i') }
        ];
    }

    if (minRating) {
        query.rating = { ...query.rating, $gte: parseFloat(minRating) };
    }

    if (maxFee) {
        query.consultationFee = { ...query.consultationFee, $lte: parseFloat(maxFee) };
    }

    // Build sort object
    const sortObj = {};
    if (sortBy === 'rating') {
        sortObj.rating = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'fee') {
        sortObj.consultationFee = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'experience') {
        sortObj.experience = sortOrder === 'asc' ? 1 : -1;
    } else if (sortBy === 'name') {
        sortObj.name = sortOrder === 'asc' ? 1 : -1;
    } else {
        sortObj.rating = -1; // Default sort
    }

    const doctors = await Doctor.find(query)
        .select('name specialization hospital experience consultationFee rating totalReviews languages profileImage')
        .sort(sortObj)
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Doctor.countDocuments(query);

    res.status(200).json(
        new ApiResponse(200, {
            doctors,
            pagination: {
                totalPages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                total,
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1
            },
            filters: {
                specialization,
                hospital,
                search,
                sortBy,
                sortOrder,
                minRating,
                maxFee
            }
        }, 'Doctors retrieved successfully')
    );
});

// Get doctor by ID
const getDoctorById = asyncHandler(async (req, res) => {
    const { doctorId } = req.params;

    const doctor = await Doctor.findOne({ _id: doctorId, isActive: true });

    if (!doctor) {
        throw new ApiError(404, 'Doctor not found');
    }

    res.status(200).json(
        new ApiResponse(200, doctor, 'Doctor details retrieved successfully')
    );
});

// Get doctors by specialization
const getDoctorsBySpecialization = asyncHandler(async (req, res) => {
    const { specialization } = req.params;
    const { page = 1, limit = 10, sortBy = 'rating' } = req.query;

    const doctors = await Doctor.findBySpecialization(specialization)
        .select('name specialization hospital experience consultationFee rating totalReviews languages profileImage')
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Doctor.countDocuments({ 
        specialization: new RegExp(specialization, 'i'), 
        isActive: true 
    });

    res.status(200).json(
        new ApiResponse(200, {
            doctors,
            specialization,
            pagination: {
                totalPages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                total,
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1
            }
        }, `Doctors for ${specialization} retrieved successfully`)
    );
});

// Search doctors by symptoms
const searchDoctorsBySymptoms = asyncHandler(async (req, res) => {
    const { symptoms } = req.body;
    const { page = 1, limit = 10 } = req.query;

    if (!symptoms || symptoms.trim().length === 0) {
        throw new ApiError(400, 'Symptoms are required');
    }

    try {
        // Find matching specializations based on symptoms
        const matchingSpecializations = await Specialization.findBySymptoms(symptoms);

        if (matchingSpecializations.length === 0) {
            return res.status(200).json(
                new ApiResponse(200, {
                    doctors: [],
                    specializations: [],
                    message: 'No specific specialization found for these symptoms. Please consult a General Medicine doctor.'
                }, 'No matching specializations found')
            );
        }

        // Get doctors for the top matching specializations
        const specializationNames = matchingSpecializations.slice(0, 3).map(spec => spec.name);
        
        const doctors = await Doctor.find({
            specialization: { $in: specializationNames },
            isActive: true
        })
        .select('name specialization hospital experience consultationFee rating totalReviews languages profileImage')
        .sort({ rating: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

        // Get urgency level
        const urgencyResult = await Specialization.getUrgencyLevel(symptoms);
        const urgencyLevel = urgencyResult.length > 0 ? urgencyResult[0].maxUrgency : 'medium';

        res.status(200).json(
            new ApiResponse(200, {
                doctors,
                recommendedSpecializations: matchingSpecializations.slice(0, 3),
                urgencyLevel,
                symptoms: symptoms.trim(),
                totalDoctors: doctors.length,
                message: `Found ${doctors.length} doctors for your symptoms`
            }, 'Doctors found based on symptoms')
        );

    } catch (error) {
        throw new ApiError(500, `Error searching doctors: ${error.message}`);
    }
});

// Get available specializations
const getSpecializations = asyncHandler(async (req, res) => {
    const { search, isActive = true } = req.query;

    const query = {};
    if (isActive !== undefined) {
        query.isActive = isActive === 'true';
    }

    if (search) {
        query.$or = [
            { name: new RegExp(search, 'i') },
            { description: new RegExp(search, 'i') }
        ];
    }

    const specializations = await Specialization.find(query)
        .select('name description commonSymptoms commonConditions bodyParts averageConsultationTime')
        .sort({ name: 1 });

    res.status(200).json(
        new ApiResponse(200, {
            specializations,
            total: specializations.length
        }, 'Specializations retrieved successfully')
    );
});

// Get hospitals list
const getHospitals = asyncHandler(async (req, res) => {
    const { search } = req.query;

    const pipeline = [
        { $match: { isActive: true } },
        {
            $group: {
                _id: '$hospital',
                doctorCount: { $sum: 1 },
                specializations: { $addToSet: '$specialization' },
                avgRating: { $avg: '$rating' },
                minFee: { $min: '$consultationFee' },
                maxFee: { $max: '$consultationFee' }
            }
        },
        { $sort: { doctorCount: -1 } }
    ];

    if (search) {
        pipeline.unshift({
            $match: {
                hospital: new RegExp(search, 'i'),
                isActive: true
            }
        });
    }

    const hospitals = await Doctor.aggregate(pipeline);

    res.status(200).json(
        new ApiResponse(200, {
            hospitals: hospitals.map(hospital => ({
                name: hospital._id,
                doctorCount: hospital.doctorCount,
                specializations: hospital.specializations,
                averageRating: Math.round(hospital.avgRating * 10) / 10,
                feeRange: {
                    min: hospital.minFee,
                    max: hospital.maxFee
                }
            })),
            total: hospitals.length
        }, 'Hospitals retrieved successfully')
    );
});

// Get doctor statistics
const getDoctorStats = asyncHandler(async (req, res) => {
    const stats = await Doctor.aggregate([
        { $match: { isActive: true } },
        {
            $group: {
                _id: null,
                totalDoctors: { $sum: 1 },
                avgRating: { $avg: '$rating' },
                avgExperience: { $avg: '$experience' },
                avgFee: { $avg: '$consultationFee' },
                specializationCount: { $addToSet: '$specialization' },
                hospitalCount: { $addToSet: '$hospital' }
            }
        }
    ]);

    const specializationStats = await Doctor.aggregate([
        { $match: { isActive: true } },
        {
            $group: {
                _id: '$specialization',
                count: { $sum: 1 },
                avgRating: { $avg: '$rating' },
                avgFee: { $avg: '$consultationFee' }
            }
        },
        { $sort: { count: -1 } }
    ]);

    const result = stats[0] || {};
    
    res.status(200).json(
        new ApiResponse(200, {
            totalDoctors: result.totalDoctors || 0,
            averageRating: Math.round((result.avgRating || 0) * 10) / 10,
            averageExperience: Math.round((result.avgExperience || 0) * 10) / 10,
            averageFee: Math.round((result.avgFee || 0) * 100) / 100,
            totalSpecializations: result.specializationCount?.length || 0,
            totalHospitals: result.hospitalCount?.length || 0,
            specializationBreakdown: specializationStats.map(spec => ({
                specialization: spec._id,
                doctorCount: spec.count,
                averageRating: Math.round((spec.avgRating || 0) * 10) / 10,
                averageFee: Math.round((spec.avgFee || 0) * 100) / 100
            }))
        }, 'Doctor statistics retrieved successfully')
    );
});

export {
    getAllDoctors,
    getDoctorById,
    getDoctorsBySpecialization,
    searchDoctorsBySymptoms,
    getSpecializations,
    getHospitals,
    getDoctorStats
};
