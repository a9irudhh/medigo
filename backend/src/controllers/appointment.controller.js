import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import Appointment from '../models/appointment.model.js';
import Doctor from '../models/doctor.model.js';
import User from '../models/user.model.js';

// Get user's appointments
const getUserAppointments = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { 
        page = 1, 
        limit = 10, 
        status, 
        upcoming = false,
        startDate,
        endDate 
    } = req.query;

    // Build query
    const query = { patient: userId };
    
    if (status) {
        query.status = status;
    }
    
    if (upcoming === 'true') {
        query.appointmentDate = { $gte: new Date() };
        query.status = { $in: ['scheduled', 'confirmed'] };
    }
    
    if (startDate && endDate) {
        query.appointmentDate = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    const appointments = await Appointment.find(query)
        .populate('doctor', 'name specialization hospital consultationFee rating profileImage')
        .populate('patient', 'firstName lastName email phone')
        .sort({ appointmentDate: upcoming === 'true' ? 1 : -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Appointment.countDocuments(query);

    res.status(200).json(
        new ApiResponse(200, {
            appointments,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total,
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1
        }, 'Appointments retrieved successfully')
    );
});

// Get specific appointment details
const getAppointmentDetails = asyncHandler(async (req, res) => {
    const { appointmentId } = req.params;
    const userId = req.user._id;

    const appointment = await Appointment.findOne({
        _id: appointmentId,
        patient: userId
    })
    .populate('doctor', 'name specialization hospital consultationFee rating profileImage contact languages qualifications experience')
    .populate('patient', 'firstName lastName email phone dateOfBirth gender bloodGroup');

    if (!appointment) {
        throw new ApiError(404, 'Appointment not found');
    }

    res.status(200).json(
        new ApiResponse(200, appointment, 'Appointment details retrieved successfully')
    );
});

// Cancel appointment
const cancelAppointment = asyncHandler(async (req, res) => {
    const { appointmentId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    const appointment = await Appointment.findOne({
        _id: appointmentId,
        patient: userId,
        status: { $in: ['scheduled', 'confirmed'] }
    });

    if (!appointment) {
        throw new ApiError(404, 'Appointment not found or cannot be cancelled');
    }

    // Check if appointment is at least 2 hours away
    const now = new Date();
    const appointmentTime = new Date(appointment.appointmentDate);
    const timeDiff = appointmentTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 3600);

    if (hoursDiff < 2) {
        throw new ApiError(400, 'Appointments can only be cancelled at least 2 hours before the scheduled time');
    }

    appointment.status = 'cancelled';
    appointment.cancelledAt = new Date();
    appointment.cancelledBy = 'patient';
    appointment.cancellationReason = reason || 'Cancelled by patient';

    await appointment.save();

    // TODO: Send cancellation notification to doctor
    // TODO: Update doctor's schedule availability

    res.status(200).json(
        new ApiResponse(200, {
            appointmentId: appointment._id,
            status: appointment.status,
            cancelledAt: appointment.cancelledAt
        }, 'Appointment cancelled successfully')
    );
});

// Reschedule appointment
const rescheduleAppointment = asyncHandler(async (req, res) => {
    const { appointmentId } = req.params;
    const { newDate, newStartTime, newEndTime, reason } = req.body;
    const userId = req.user._id;

    if (!newDate || !newStartTime || !newEndTime) {
        throw new ApiError(400, 'New date and time slots are required');
    }

    const appointment = await Appointment.findOne({
        _id: appointmentId,
        patient: userId,
        status: { $in: ['scheduled', 'confirmed'] }
    });

    if (!appointment) {
        throw new ApiError(404, 'Appointment not found or cannot be rescheduled');
    }

    // Check if new appointment time is in the future
    const newAppointmentDate = new Date(newDate);
    const now = new Date();
    
    if (newAppointmentDate < now) {
        throw new ApiError(400, 'New appointment date must be in the future');
    }

    // Check if the new slot is available
    const hasConflict = await Appointment.checkConflict(
        appointment.doctor,
        newAppointmentDate,
        newStartTime,
        newEndTime,
        appointmentId
    );

    if (hasConflict) {
        throw new ApiError(409, 'The selected time slot is not available');
    }

    // Update appointment
    appointment.appointmentDate = newAppointmentDate;
    appointment.timeSlot.startTime = newStartTime;
    appointment.timeSlot.endTime = newEndTime;
    appointment.status = 'scheduled'; // Reset to scheduled
    
    if (reason) {
        appointment.notes.patient = reason;
    }

    await appointment.save();

    // Populate doctor details for response
    await appointment.populate('doctor', 'name specialization hospital');

    res.status(200).json(
        new ApiResponse(200, {
            appointmentId: appointment._id,
            appointmentDate: appointment.appointmentDate,
            timeSlot: appointment.timeSlot,
            doctor: appointment.doctor,
            status: appointment.status
        }, 'Appointment rescheduled successfully')
    );
});

// Get available slots for a doctor
const getDoctorAvailableSlots = asyncHandler(async (req, res) => {
    const { doctorId } = req.params;
    const { date, days = 7 } = req.query;

    if (!date) {
        throw new ApiError(400, 'Date is required');
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor || !doctor.isActive) {
        throw new ApiError(404, 'Doctor not found or not available');
    }

    const startDate = new Date(date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + parseInt(days));

    const availableSlots = [];

    // Generate slots for the specified date range
    for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
        // Skip past dates
        if (currentDate < new Date().setHours(0, 0, 0, 0)) {
            continue;
        }

        const daySlots = doctor.getAvailableSlotsForDate(currentDate);
        
        if (daySlots.length > 0) {
            // Get existing appointments for this date
            const existingAppointments = await Appointment.find({
                doctor: doctorId,
                appointmentDate: {
                    $gte: new Date(currentDate.setHours(0, 0, 0, 0)),
                    $lt: new Date(currentDate.setHours(23, 59, 59, 999))
                },
                status: { $in: ['scheduled', 'confirmed', 'in-progress'] }
            });

            // Filter out booked slots
            const availableSlotsForDay = daySlots.filter(slot => {
                return !existingAppointments.some(appointment => 
                    appointment.timeSlot.startTime === slot.startTime &&
                    appointment.timeSlot.endTime === slot.endTime
                );
            });

            if (availableSlotsForDay.length > 0) {
                availableSlots.push({
                    date: new Date(currentDate),
                    dayName: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
                    slots: availableSlotsForDay
                });
            }
        }
    }

    res.status(200).json(
        new ApiResponse(200, {
            doctor: {
                id: doctor._id,
                name: doctor.name,
                specialization: doctor.specialization,
                hospital: doctor.hospital,
                consultationFee: doctor.consultationFee
            },
            availableSlots,
            dateRange: {
                start: startDate,
                end: endDate
            }
        }, 'Available slots retrieved successfully')
    );
});

// Get appointment statistics for user
const getAppointmentStats = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const stats = await Appointment.aggregate([
        { $match: { patient: userId } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    const totalAppointments = await Appointment.countDocuments({ patient: userId });
    
    const upcomingAppointments = await Appointment.countDocuments({
        patient: userId,
        appointmentDate: { $gte: new Date() },
        status: { $in: ['scheduled', 'confirmed'] }
    });

    const completedAppointments = await Appointment.countDocuments({
        patient: userId,
        status: 'completed'
    });

    // Get most visited specializations
    const specializationStats = await Appointment.aggregate([
        { $match: { patient: userId } },
        { $lookup: { from: 'doctors', localField: 'doctor', foreignField: '_id', as: 'doctorInfo' } },
        { $unwind: '$doctorInfo' },
        {
            $group: {
                _id: '$doctorInfo.specialization',
                count: { $sum: 1 },
                lastVisit: { $max: '$appointmentDate' }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
    ]);

    res.status(200).json(
        new ApiResponse(200, {
            totalAppointments,
            upcomingAppointments,
            completedAppointments,
            statusBreakdown: stats,
            topSpecializations: specializationStats
        }, 'Appointment statistics retrieved successfully')
    );
});

export {
    getUserAppointments,
    getAppointmentDetails,
    cancelAppointment,
    rescheduleAppointment,
    getDoctorAvailableSlots,
    getAppointmentStats
};
