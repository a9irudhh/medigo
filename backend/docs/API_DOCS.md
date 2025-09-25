# MediGo API - Complete Postman Testing Guide

This comprehensive guide covers all MediGo API endpoints including OTP-based email verification and password reset features.

## Base URL
```
http://localhost:5000/api/v1
```

## Environment Setup

Create these variables in your Postman environment:
```json
{
  "baseUrl": "http://localhost:5000/api/v1",
  "token": "",
  "userId": "",
  "email": "",
  "phone": ""
}
```

## Authentication Flow (Updated with OTP)

### 1. User Registration (Signup)
**Method:** `POST`  
**URL:** `{{baseUrl}}/users/signup`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "password": "SecurePassword123!",
  "dateOfBirth": "1990-05-15",
  "gender": "male",
  "bloodGroup": "O+",
  "address": {
    "street": "123 Main Street, Apt 4B",
    "city": "Mumbai",
    "state": "Maharashtra",
    "zipCode": "400001",
    "country": "India"
  },
  "emergencyContact": {
    "name": "Jane Doe",
    "relationship": "wife",
    "phone": "+0987654321"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully. Please check your email for verification OTP.",
  "data": {
    "user": {
      "_id": "64f8a9b2c8d4e5f6a7b8c9d0",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "isEmailVerified": false,
      "age": 35,
      "fullName": "John Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Save token to {{token}} variable in Postman**

### 2. Email Verification (New OTP-based)
**Method:** `POST`  
**URL:** `{{baseUrl}}/users/verify-email`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Body (JSON):**
```json
{
  "otp": "123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "user": {
      "_id": "64f8a9b2c8d4e5f6a7b8c9d0",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "isEmailVerified": true
    }
  }
}
```

### 3. Resend Email OTP
**Method:** `POST`  
**URL:** `{{baseUrl}}/users/resend-email-otp`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Verification OTP sent to your email successfully"
}
```

### 4. User Login
**Method:** `POST`  
**URL:** `{{baseUrl}}/users/login`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

**Alternative (Login with phone):**
```json
{
  "phone": "+1234567890",
  "password": "SecurePassword123!"
}
```

> **Note:** Phone verification has been removed. Users can still login with phone numbers, but phone verification is not required.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "64f8a9b2c8d4e5f6a7b8c9d0",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "isEmailVerified": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## Password Reset Flow (New OTP-based)

### 5. Forgot Password
**Method:** `POST`  
**URL:** `{{baseUrl}}/users/forgot-password`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "email": "john.doe@example.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset OTP sent to your email"
}
```

### 6. Reset Password
**Method:** `POST`  
**URL:** `{{baseUrl}}/users/reset-password`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "email": "john.doe@example.com",
  "otp": "654321",
  "newPassword": "NewSecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset successfully",
  "data": {
    "user": {
      "_id": "64f8a9b2c8d4e5f6a7b8c9d0",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## Protected Routes (Require Authentication)

### 7. Get User Profile
**Method:** `GET`  
**URL:** `{{baseUrl}}/users/profile`

**Headers:**
```
Authorization: Bearer {{token}}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "user": {
      "_id": "64f8a9b2c8d4e5f6a7b8c9d0",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "dateOfBirth": "1990-05-15T00:00:00.000Z",
      "gender": "male",
      "bloodGroup": "O+",
      "address": {
        "street": "123 Main Street, Apt 4B",
        "city": "Mumbai",
        "state": "Maharashtra",
        "zipCode": "400001",
        "country": "India"
      },
      "emergencyContact": {
        "name": "Jane Doe",
        "relationship": "wife",
        "phone": "+0987654321"
      },
      "isEmailVerified": true,
      "medicalHistory": [],
      "conversationHistory": [],
      "age": 35,
      "fullName": "John Doe"
    }
  }
}
```

### 8. Update User Profile
**Method:** `PUT`  
**URL:** `{{baseUrl}}/users/profile`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "firstName": "Jonathan",
  "bloodGroup": "A+",
  "address": {
    "street": "456 Oak Avenue",
    "city": "Delhi",
    "state": "Delhi",
    "zipCode": "110001",
    "country": "India"
  },
  "medicalHistory": [
    {
      "condition": "Hypertension",
      "diagnosedDate": "2020-01-15",
      "status": "ongoing",
      "medications": ["Lisinopril 10mg"]
    }
  ]
}
```

### 9. Change Password
**Method:** `PUT`  
**URL:** `{{baseUrl}}/users/change-password`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "currentPassword": "SecurePassword123!",
  "newPassword": "NewPassword456!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

## Email Configuration Setup

To test email functionality, update your `.env` file:

```env
# Email Configuration (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-16-character-app-password
```

### Gmail App Password Setup:
1. Enable 2-Factor Authentication on your Gmail account
2. Go to Google Account Settings → Security
3. Under "2-Step Verification", click "App passwords"
4. Generate a new app password for "Mail"
5. Use this 16-character password in `EMAIL_APP_PASSWORD`

## Complete Testing Workflow

### Registration & Verification Flow:
1. **POST** `/signup` → Register new user
2. **Check email** for verification OTP (6-digit code)
3. **POST** `/verify-email` → Verify email with OTP
4. **POST** `/login` → Login to get fresh token

### Password Reset Flow:
1. **POST** `/forgot-password` → Request password reset
2. **Check email** for reset OTP (6-digit code)
3. **POST** `/reset-password` → Reset password with OTP

### Profile Management:
1. **GET** `/profile` → View current profile
2. **PUT** `/profile` → Update profile information
3. **PUT** `/change-password` → Change password (requires current password)

### Error Testing:
1. Try login with unverified email (should fail)
2. Use expired/invalid OTP codes
3. Attempt password reset with wrong email
4. Access protected routes without token

## HTTP Status Codes

### Success Codes
- `200` - OK (successful request)
- `201` - Created (successful registration)

### Client Error Codes
- `400` - Bad Request (validation errors, missing fields)
- `401` - Unauthorized (invalid token, wrong credentials)
- `403` - Forbidden (email not verified, account issues)
- `404` - Not Found (user not found, invalid endpoint)
- `409` - Conflict (email/phone already exists)
- `429` - Too Many Requests (rate limiting, OTP limits)

### Server Error Codes
- `500` - Internal Server Error

## Common Error Responses

**Validation Error (400):**
```json
{
  "success": false,
  "message": "Validation failed",
  "error": "Password must be at least 8 characters long"
}
```

**Authentication Error (401):**
```json
{
  "success": false,
  "message": "Authentication failed",
  "error": "Invalid credentials"
}
```

**Email Not Verified (403):**
```json
{
  "success": false,
  "message": "Access denied",
  "error": "Please verify your email before accessing this resource"
}
```

**User Not Found (404):**
```json
{
  "success": false,
  "message": "Resource not found",
  "error": "User not found with this email"
}
```

**Duplicate User (409):**
```json
{
  "success": false,
  "message": "User already exists",
  "error": "User with this email already exists"
}
```

## Testing Tips

1. **Start the server:** Run `npm run dev` in backend directory
2. **MongoDB connection:** Check console for successful database connection
3. **Email testing:** Use a real Gmail account with app password
4. **OTP validity:** OTPs expire in 10 minutes
5. **Rate limiting:** Wait between multiple OTP requests
6. **Token management:** Save JWT tokens in Postman environment variables
7. **Error handling:** Test both success and error scenarios
8. **Data persistence:** Verify data changes persist in database

## Quick Start Collection

Import this Postman collection structure:
```
MediGo API Testing/
├── Authentication/
│   ├── 1. Signup
│   ├── 2. Verify Email
│   ├── 3. Login
│   └── 4. Resend Email OTP
├── Password Management/
│   ├── 1. Forgot Password
│   ├── 2. Reset Password
│   └── 3. Change Password
├── Profile Management/
│   ├── 1. Get Profile
│   └── 2. Update Profile
└── Utilities/
    └── Health Check
```

---

## Chat & AI Agent API

The chat functionality integrates with the AI Agent microservice to provide intelligent medical consultation services.

### 10. Start New Chat Conversation
**Method:** `POST`  
**URL:** `{{baseUrl}}/chat/start`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body:** No body required

**Response (201 Created):**
```json
{
  "success": true,
  "message": "New conversation started successfully",
  "data": {
    "conversationId": "64f8a9b2-c8d4-e5f6-a7b8-c9d0e1f2a3b4",
    "message": "Hello! I'm MediGo, your AI medical assistant. I'm here to help you find the right doctor and book an appointment. Could you please tell me about your symptoms or health concerns?",
    "status": "started",
    "currentStep": "initial_greeting",
    "metadata": {
      "agentType": "symptom_analyzer",
      "confidence": 1.0,
      "requiresInput": true,
      "isComplete": false
    }
  }
}
```

**Save conversationId to {{conversationId}} variable in Postman**

### 11. Send Message to AI Agent
**Method:** `POST`  
**URL:** `{{baseUrl}}/chat/message`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "message": "I have been experiencing headaches and fever for the past 2 days"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "AI agent response retrieved successfully",
  "data": {
    "response": "I understand you're experiencing headaches and fever for the past 2 days. These symptoms could indicate various conditions. Let me ask you a few questions to better understand your situation:\n\n1. What is the intensity of your headache on a scale of 1-10?\n2. What is your current body temperature?\n3. Are you experiencing any other symptoms like nausea, sensitivity to light, or body aches?\n4. Have you taken any medications for these symptoms?\n\nBased on your responses, I can help you find an appropriate doctor and schedule an appointment if needed.",
    "conversationId": "64f8a9b2c8d4e5f6a7b8c9d1",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "aiAgentStatus": "active"
  }
}
```

### 12. Continue Chat Conversation
**Method:** `POST`  
**URL:** `{{baseUrl}}/chat/message`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "message": "The headache intensity is about 7/10, my temperature is 101°F, and I also have body aches. I haven't taken any medication yet.",
  "conversationId": "64f8a9b2c8d4e5f6a7b8c9d1"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "AI agent response retrieved successfully",
  "data": {
    "response": "Based on your symptoms (headache 7/10, fever 101°F, body aches), this could be a viral infection or flu-like illness. Given the severity, I recommend seeing a doctor.\n\nI found several available doctors who can help:\n\n1. **Dr. Sarah Johnson** - General Physician\n   - Experience: 8 years\n   - Rating: 4.8/5\n   - Available: Today 2:00 PM - 5:00 PM\n   - Consultation Fee: ₹500\n\n2. **Dr. Michael Chen** - Internal Medicine\n   - Experience: 12 years  \n   - Rating: 4.9/5\n   - Available: Tomorrow 9:00 AM - 12:00 PM\n   - Consultation Fee: ₹600\n\nWould you like me to book an appointment with any of these doctors?",
    "conversationId": "64f8a9b2c8d4e5f6a7b8c9d1",
    "timestamp": "2024-01-15T10:32:00.000Z",
    "availableDoctors": [
      {
        "doctorId": "64f8a9b2c8d4e5f6a7b8c9d2",
        "name": "Dr. Sarah Johnson",
        "specialization": "General Physician",
        "availableSlots": ["14:00", "14:30", "15:00", "15:30", "16:00"]
      }
    ],
    "aiAgentStatus": "awaiting_booking_decision"
  }
}
```

### 13. Book Appointment through Chat
**Method:** `POST`  
**URL:** `{{baseUrl}}/chat/message`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "message": "Yes, I'd like to book an appointment with Dr. Sarah Johnson at 2:30 PM today",
  "conversationId": "64f8a9b2c8d4e5f6a7b8c9d1"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "AI agent response retrieved successfully",
  "data": {
    "response": "Perfect! I've successfully booked your appointment with Dr. Sarah Johnson.\n\n**Appointment Details:**\n- Doctor: Dr. Sarah Johnson (General Physician)\n- Date: January 15, 2024\n- Time: 2:30 PM\n- Duration: 30 minutes\n- Consultation Fee: ₹500\n- Appointment ID: #APT001234\n\n**Important Information:**\n- Please arrive 15 minutes early for registration\n- Bring a valid ID and any previous medical records\n- You'll receive a confirmation email shortly\n\n**Preparation Tips:**\n- Continue monitoring your temperature\n- Note any changes in symptoms\n- Stay hydrated and get plenty of rest\n\nIs there anything else I can help you with regarding your appointment or symptoms?",
    "conversationId": "64f8a9b2c8d4e5f6a7b8c9d1",
    "timestamp": "2024-01-15T10:35:00.000Z",
    "appointmentBooked": {
      "appointmentId": "APT001234",
      "doctorId": "64f8a9b2c8d4e5f6a7b8c9d2",
      "doctorName": "Dr. Sarah Johnson",
      "dateTime": "2024-01-15T14:30:00.000Z",
      "status": "confirmed"
    },
    "aiAgentStatus": "appointment_confirmed"
  }
}
```

### 14. Get Chat History
**Method:** `GET`  
**URL:** `{{baseUrl}}/chat/history`

**Headers:**
```
Authorization: Bearer {{token}}
```

**Query Parameters (Optional):**
```
?page=1&limit=10&status=active
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Chat history retrieved successfully",
  "data": {
    "conversations": [
      {
        "conversationId": "64f8a9b2c8d4e5f6a7b8c9d1",
        "startTime": "2024-01-15T10:30:00.000Z",
        "lastActivity": "2024-01-15T10:35:00.000Z",
        "status": "completed",
        "summary": "Patient reported headaches and fever, booked appointment with Dr. Sarah Johnson",
        "messages": [
          {
            "messageId": "msg001",
            "sender": "user",
            "content": "I have been experiencing headaches and fever for the past 2 days",
            "timestamp": "2024-01-15T10:30:00.000Z"
          },
          {
            "messageId": "msg002", 
            "sender": "ai_agent",
            "content": "I understand you're experiencing headaches and fever...",
            "timestamp": "2024-01-15T10:30:30.000Z"
          }
        ],
        "appointmentBooked": {
          "appointmentId": "APT001234",
          "doctorName": "Dr. Sarah Johnson"
        }
      }
    ],
    "pagination": {
      "total": 1,
      "limit": 10,
      "offset": 0,
      "hasNext": false
    }
  }
}
```

### 15. Get Specific Conversation History
**Method:** `GET`  
**URL:** `{{baseUrl}}/chat/conversation/{{conversationId}}`

**Headers:**
```
Authorization: Bearer {{token}}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Conversation history retrieved successfully",
  "data": {
    "conversationId": "64f8a9b2-c8d4-e5f6-a7b8-c9d0e1f2a3b4",
    "status": "completed",
    "currentStep": "appointment_confirmed",
    "messages": [
      {
        "messageId": "msg001",
        "sender": "agent",
        "content": "Hello! I'm MediGo, your AI medical assistant...",
        "timestamp": "2024-01-15T10:30:00.000Z",
        "metadata": {
          "agentType": "symptom_analyzer",
          "confidence": 1.0
        }
      }
    ],
    "extractedData": {
      "symptoms": ["headache", "fever"],
      "selectedDoctor": {
        "name": "Dr. Sarah Johnson",
        "specialization": "General Physician"
      }
    },
    "appointmentId": "APT001234",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:45:00.000Z"
  }
}
```

### 16. End Conversation
**Method:** `PUT`  
**URL:** `{{baseUrl}}/chat/conversation/{{conversationId}}/end`

**Headers:**
```
Authorization: Bearer {{token}}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Conversation ended successfully",
  "data": {
    "conversationId": "64f8a9b2-c8d4-e5f6-a7b8-c9d0e1f2a3b4",
    "status": "cancelled"
  }
}
```

### 17. Get AI Agent Health Status
**Method:** `GET`  
**URL:** `{{baseUrl}}/chat/agent-status`

**Headers:**
```
Authorization: Bearer {{token}}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "AI agent status retrieved successfully",
  "data": {
    "aiAgentService": {
      "status": "online",
      "responseTime": "1.2s",
      "lastHealthCheck": "2024-01-15T10:40:00.000Z",
      "version": "1.0.0"
    },
    "capabilities": [
      "symptom_analysis",
      "doctor_matching", 
      "appointment_booking",
      "medical_consultation",
      "health_recommendations"
    ],
    "activeConversations": 15,
    "systemLoad": "normal"
  }
}
```

## Chat API Error Responses

**AI Agent Service Unavailable (503):**
```json
{
  "success": false,
  "message": "AI agent service unavailable",
  "error": "The AI consultation service is temporarily unavailable. Please try again later."
}
```

**Invalid Conversation ID (404):**
```json
{
  "success": false,
  "message": "Conversation not found",
  "error": "The specified conversation ID does not exist or you don't have access to it."
}
```

**AI Agent Processing Error (500):**
```json
{
  "success": false,
  "message": "AI agent processing failed",
  "error": "An error occurred while processing your request. Please try again."
}
```

## Chat Testing Workflow

> ⚠️ **IMPORTANT**: Do NOT test the AI microservice directly at `localhost:8001`. Always test through the backend endpoints at `localhost:5000/api/v1/chat/*`. The backend handles conversation management, authentication, and calls the AI service internally.

### Complete Medical Consultation Flow:
1. **POST** `/chat/start` → Start new conversation
2. **POST** `/chat/message` → Describe symptoms
3. **POST** `/chat/message` → Provide additional symptom details
4. **POST** `/chat/message` → Request doctor recommendations
5. **POST** `/chat/message` → Book appointment with selected doctor
6. **GET** `/chat/history` → Review all conversations
7. **GET** `/chat/conversation/{conversationId}` → Get specific conversation
8. **PUT** `/chat/conversation/{conversationId}/end` → End conversation if needed
9. **GET** `/chat/agent-status` → Check AI service health

### Chat Testing Tips:
1. **AI Service:** Ensure AI agent microservice is running on port 8001
2. **Authentication:** All chat endpoints require valid JWT token
3. **Conversation Flow:** Use conversationId to maintain context
4. **Symptom Analysis:** AI agent analyzes symptoms and suggests doctors
5. **Appointment Booking:** Integration with appointment system
6. **Error Handling:** AI service failures are handled gracefully

## Updated Postman Collection Structure

```
MediGo API Testing/
├── Authentication/
│   ├── 1. Signup
│   ├── 2. Verify Email
│   ├── 3. Login
│   └── 4. Resend Email OTP
├── Password Management/
│   ├── 1. Forgot Password
│   ├── 2. Reset Password
│   └── 3. Change Password
├── Profile Management/
│   ├── 1. Get Profile
│   └── 2. Update Profile
├── Chat & AI Agent/
│   ├── 1. Start New Conversation
│   ├── 2. Send Message to AI Agent
│   ├── 3. Continue Conversation
│   ├── 4. Book Appointment via Chat
│   ├── 5. Get All Conversations
│   ├── 6. Get Specific Conversation
│   ├── 7. End Conversation
│   └── 8. Check AI Agent Status
└── Utilities/
    └── Health Check
```

## Prerequisites for Chat Testing

### Backend Setup:
1. Start Express.js backend server: `npm run dev` (port 5000)
2. Ensure MongoDB connection is active
3. Configure authentication middleware

### AI Agent Microservice Setup:
1. Navigate to `ai-agents/` directory
2. Install dependencies: `pip install -r requirements.txt`
3. Start AI service: `python main.py` (port 8001)
4. Verify service health at `http://localhost:8001/health`

### Environment Variables:
```env
# AI Agent Service
AI_AGENT_BASE_URL=http://localhost:8001
AI_AGENT_SERVICE_KEY=your-service-key

# Database
MONGODB_URI=your-mongodb-connection-string

# JWT
JWT_SECRET=your-jwt-secret
```

This updated guide includes all the new OTP-based authentication features while maintaining compatibility with the existing system structure, plus comprehensive chat and AI agent integration documentation.
