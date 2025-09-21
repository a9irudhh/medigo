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

This updated guide includes all the new OTP-based authentication features while maintaining compatibility with the existing system structure.
