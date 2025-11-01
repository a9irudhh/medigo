import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiResponse} from '../utils/apiResponse.js';
import {ApiError} from '../utils/apiError.js';
import Conversation from '../models/conversation.model.js';
import Appointment from '../models/appointment.model.js';
import Doctor from '../models/doctor.model.js';
import User from '../models/user.model.js';
import { v4 as uuidv4 } from 'uuid';
import { sendAppointmentConfirmationEmail } from '../services/emailService.js';

// Chat with AI Agent
const chatWithAgent = asyncHandler(async (req, res) => {
    const { message, conversationId } = req.body;
    const userId = req.user._id;

    if (!message || message.trim().length === 0) {
        throw new ApiError(400, 'Message is required');
    }

    let conversation;

    // Find or create conversation
    if (conversationId) {
        conversation = await Conversation.findOne({
            conversationId,
            user: userId,
            isActive: true
        });

        if (!conversation) {
            throw new ApiError(404, 'Conversation not found or expired');
        }

        // Check if conversation is expired
        if (conversation.isExpired) {
            conversation.status = 'cancelled';
            conversation.isActive = false;
            await conversation.save();
            throw new ApiError(410, 'Conversation session expired. Please start a new conversation.');
        }
    } else {
        // Create new conversation
        const newConversationId = uuidv4();
        conversation = new Conversation({
            user: userId,
            conversationId: newConversationId,
            status: 'started',
            currentStep: 'initial_greeting'
        });
        await conversation.save();
    }

    // Add user message to conversation
    conversation.addMessage('user', message.trim());

    try {
        // Call AI Agent Service
        const agentResponse = await callAIAgentService({
            conversationId: conversation.conversationId,
            message: message.trim(),
            userId: userId.toString(),
            conversationState: {
                status: conversation.status,
                currentStep: conversation.currentStep,
                extractedData: conversation.extractedData,
                aiContext: conversation.aiContext
            }
        });

        // Add agent response to conversation
        conversation.addMessage('agent', agentResponse.message, 'text', {
            agentType: agentResponse.agentType,
            confidence: agentResponse.confidence,
            suggestions: agentResponse.suggestions
        });

        // Update conversation state based on agent response
        if (agentResponse.newStatus) {
            conversation.updateStatus(agentResponse.newStatus, agentResponse.newStep);
        }

        // Update extracted data if provided
        if (agentResponse.extractedData) {
            // Store agent-specific data in aiContext for workflow purposes
            // but don't override schema-defined structure
            if (!conversation.aiContext) {
                conversation.aiContext = {};
            }
            
            // Store raw agent data for workflow continuity
            conversation.aiContext.agentData = {
                ...conversation.aiContext.agentData,
                ...agentResponse.extractedData
            };
            
            // Handle schema-compliant fields
            if (agentResponse.extractedData.symptoms && typeof agentResponse.extractedData.symptoms === 'object') {
                conversation.updateSymptoms(agentResponse.extractedData.symptoms);
            }
            if (agentResponse.extractedData.recommendation) {
                conversation.updateRecommendation(agentResponse.extractedData.recommendation);
            }
            if (agentResponse.extractedData.selectedDoctor) {
                conversation.extractedData.selectedDoctor = agentResponse.extractedData.selectedDoctor;
            }
            if (agentResponse.extractedData.selectedSlot && typeof agentResponse.extractedData.selectedSlot === 'object') {
                conversation.extractedData.selectedSlot = agentResponse.extractedData.selectedSlot;
            }
        }

        // Update AI context
        if (agentResponse.aiContext) {
            // Preserve agentData when merging aiContext
            const existingAgentData = conversation.aiContext?.agentData || {};
            conversation.aiContext = {
                ...conversation.aiContext,
                ...agentResponse.aiContext,
                agentData: {
                    ...existingAgentData,
                    ...(agentResponse.aiContext.agentData || {})
                }
            };
        }

        // If appointment was created, update conversation and send confirmation email
        if (agentResponse.appointmentId) {
            conversation.complete(agentResponse.appointmentId);
            
            // Send appointment confirmation email
            try {
                // Fetch appointment details
                const appointment = await Appointment.findById(agentResponse.appointmentId)
                    .populate('doctor', 'name specialization hospital consultationFee')
                    .populate('patient', 'firstName email');
                
                if (appointment && appointment.patient && appointment.doctor) {
                    const appointmentDate = new Date(appointment.appointmentDate);
                    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    
                    const formattedTime = `${appointment.timeSlot.startTime} - ${appointment.timeSlot.endTime}`;
                    
                    await sendAppointmentConfirmationEmail(
                        appointment.patient.email,
                        appointment.patient.firstName,
                        {
                            appointmentId: appointment._id.toString(),
                            doctorName: appointment.doctor.name,
                            specialization: appointment.doctor.specialization,
                            date: formattedDate,
                            time: formattedTime,
                            hospital: appointment.doctor.hospital,
                            consultationFee: appointment.doctor.consultationFee || 0
                        }
                    );
                    
                    console.log(`Appointment confirmation email sent to ${appointment.patient.email}`);
                }
            } catch (emailError) {
                console.error('Error sending appointment confirmation email:', emailError);
                // Don't fail the request if email fails
            }
        }

        await conversation.save();

        // Prepare response
        const responseData = {
            conversationId: conversation.conversationId,
            message: agentResponse.message,
            status: conversation.status,
            currentStep: conversation.currentStep,
            suggestions: agentResponse.suggestions || [],
            options: agentResponse.options || [],
            metadata: {
                agentType: agentResponse.agentType,
                confidence: agentResponse.confidence,
                requiresInput: agentResponse.requiresInput !== false,
                isComplete: conversation.status === 'completed'
            }
        };

        // Include appointment details if completed
        if (conversation.status === 'completed' && conversation.appointmentId) {
            const appointment = await conversation.populate('appointmentId');
            responseData.appointment = {
                id: appointment.appointmentId._id,
                doctor: appointment.appointmentId.doctor,
                date: appointment.appointmentId.appointmentDate,
                timeSlot: appointment.appointmentId.timeSlot,
                status: appointment.appointmentId.status
            };
        }

        res.status(200).json(
            new ApiResponse(200, responseData, 'Message processed successfully')
        );

    } catch (error) {
        // Log error in conversation
        conversation.errorLog.push({
            error: error.message,
            step: conversation.currentStep,
            timestamp: new Date()
        });
        await conversation.save();

        throw new ApiError(500, `AI Agent Error: ${error.message}`);
    }
});

// Get conversation history
const getConversationHistory = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({
        conversationId,
        user: userId
    }).populate('appointmentId', 'appointmentDate timeSlot status doctor')
      .populate('extractedData.selectedDoctor', 'name specialization hospital');

    if (!conversation) {
        throw new ApiError(404, 'Conversation not found');
    }

    res.status(200).json(
        new ApiResponse(200, {
            conversationId: conversation.conversationId,
            status: conversation.status,
            currentStep: conversation.currentStep,
            messages: conversation.messages,
            extractedData: conversation.extractedData,
            appointmentId: conversation.appointmentId,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
            isExpired: conversation.isExpired
        }, 'Conversation history retrieved successfully')
    );
});

// Get user's conversations
const getUserConversations = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { page = 1, limit = 10, status } = req.query;

    const query = { user: userId };
    if (status) {
        query.status = status;
    }

    const conversations = await Conversation.find(query)
        .populate('appointmentId', 'appointmentDate timeSlot status')
        .select('conversationId status currentStep createdAt updatedAt isActive extractedData.recommendedSpecialization')
        .sort({ updatedAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

    const total = await Conversation.countDocuments(query);

    res.status(200).json(
        new ApiResponse(200, {
            conversations,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        }, 'Conversations retrieved successfully')
    );
});

// Start new conversation
const startNewConversation = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Check if user has any active conversations and deactivate them
    await Conversation.updateMany(
        { 
            user: userId, 
            isActive: true, 
            status: { $nin: ['completed', 'cancelled'] } 
        },
        { 
            isActive: false, 
            status: 'cancelled' 
        }
    );

    // Create new conversation
    const conversationId = uuidv4();
    const conversation = new Conversation({
        user: userId,
        conversationId,
        status: 'started',
        currentStep: 'initial_greeting'
    });

    await conversation.save();

    // Add initial greeting message
    conversation.addMessage('agent', 
        'Hello! I\'m MediGo, your AI medical assistant. I\'m here to help you find the right doctor and book an appointment. Could you please tell me about your symptoms or health concerns?',
        'text',
        { agentType: 'symptom_analyzer', confidence: 1.0 }
    );

    await conversation.save();

    res.status(201).json(
        new ApiResponse(201, {
            conversationId: conversation.conversationId,
            message: conversation.messages[0].content,
            status: conversation.status,
            currentStep: conversation.currentStep,
            metadata: {
                agentType: 'symptom_analyzer',
                confidence: 1.0,
                requiresInput: true,
                isComplete: false
            }
        }, 'New conversation started successfully')
    );
});

// End conversation
const endConversation = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({
        conversationId,
        user: userId,
        isActive: true
    });

    if (!conversation) {
        throw new ApiError(404, 'Active conversation not found');
    }

    conversation.status = 'cancelled';
    conversation.isActive = false;
    conversation.addMessage('system', 'Conversation ended by user');

    await conversation.save();

    res.status(200).json(
        new ApiResponse(200, {
            conversationId: conversation.conversationId,
            status: conversation.status
        }, 'Conversation ended successfully')
    );
});

// Helper function to call AI Agent Service
async function callAIAgentService(requestData) {
    try {
        // This will call our Agentic microservice
        const response = await fetch(`${process.env.AI_AGENT_SERVICE_URL || 'http://localhost:8001'}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.AI_AGENT_SERVICE_TOKEN || 'medigo-agent-token'}`
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error(`AI Agent Service responded with status: ${response.status}`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error('AI Agent Service Error:', error);
        
        // Fallback response when AI service is down
        return {
            message: "I'm currently experiencing some technical difficulties. Please try again in a moment, or you can call our helpline for immediate assistance.",
            agentType: 'system',
            confidence: 0,
            requiresInput: false,
            suggestions: ['Try again', 'Contact support'],
            newStatus: 'error'
        };
    }
}

export {
    chatWithAgent,
    getConversationHistory,
    getUserConversations,
    startNewConversation,
    endConversation
};
