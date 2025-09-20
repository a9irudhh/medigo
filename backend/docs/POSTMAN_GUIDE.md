# MediGo API - Postman Testing Guide

## Base URL
```
http://localhost:5000/api
```

## HTTP Status Codes

### Success Codes
- **200 OK** - Request successful, data retrieved/updated
- **201 Created** - Resource created successfully (signup)
- **204 No Content** - Request successful, no content returned

### Client Error Codes
- **400 Bad Request** - Invalid request data or missing required fields
- **401 Unauthorized** - Authentication required or invalid credentials
- **403 Forbidden** - Access denied or account deactivated
- **404 Not Found** - Resource or endpoint not found
- **409 Conflict** - Resource already exists (duplicate email/phone)
- **422 Unprocessable Entity** - Validation errors

### Server Error Codes
- **500 Internal Server Error** - Server-side error

## API Endpoints

### 1. User Signup
**Method:** POST  
**URL:** `{{baseUrl}}/users/signup`

**Request Body:**
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
  },
  "preferences": {
    "preferredLanguage": "english",
    "notificationPreferences": {
      "email": true,
      "sms": true,
      "push": false
    },
    "appointmentReminders": true,
    "dataSharing": false
  }
}
```

**Response (201 Created):**
```json
{
  "statusCode": 201,
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
      "preferences": {
        "preferredLanguage": "english",
        "notificationPreferences": {
          "email": true,
          "sms": true,
          "push": false
        },
        "appointmentReminders": true,
        "dataSharing": false
      },
      "isActive": true,
      "isEmailVerified": false,
      "isPhoneVerified": false,
      "conversationHistory": [],
      "createdAt": "2025-09-21T10:30:00.000Z",
      "updatedAt": "2025-09-21T10:30:00.000Z",
      "age": 35,
      "fullName": "John Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "message": "Account created successfully. Please verify your email and phone number."
  },
  "message": "User registered successfully",
  "success": true
}
```

---

### 2. User Login
**Method:** POST  
**URL:** `{{baseUrl}}/users/login`

**Request Body:**
```json
{
  "identifier": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

**Alternative Login (with phone):**
```json
{
  "identifier": "+1234567890",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "statusCode": 200,
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
      "preferences": {
        "preferredLanguage": "english",
        "notificationPreferences": {
          "email": true,
          "sms": true,
          "push": false
        },
        "appointmentReminders": true,
        "dataSharing": false
      },
      "isActive": true,
      "isEmailVerified": false,
      "isPhoneVerified": false,
      "conversationHistory": [],
      "createdAt": "2025-09-21T10:30:00.000Z",
      "updatedAt": "2025-09-21T10:30:00.000Z",
      "age": 35,
      "fullName": "John Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful",
  "success": true
}
```

---

### 3. Get User Profile (Protected Route)
**Method:** GET  
**URL:** `{{baseUrl}}/users/profile`  
**Headers:** Authorization: Bearer {{token}}

**Response (200 OK):**
```json
{
  "statusCode": 200,
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
      "preferences": {
        "preferredLanguage": "english",
        "notificationPreferences": {
          "email": true,
          "sms": true,
          "push": false
        },
        "appointmentReminders": true,
        "dataSharing": false
      },
      "isActive": true,
      "isEmailVerified": false,
      "isPhoneVerified": false,
      "conversationHistory": [],
      "createdAt": "2025-09-21T10:30:00.000Z",
      "updatedAt": "2025-09-21T10:30:00.000Z",
      "age": 35,
      "fullName": "John Doe"
    }
  },
  "message": "Profile retrieved successfully",
  "success": true
}
```

---

### 4. Update User Profile (Protected Route)
**Method:** PUT  
**URL:** `{{baseUrl}}/users/profile`  
**Headers:** Authorization: Bearer {{token}}

**Request Body:**
```json
{
  "firstName": "Jonathan",
  "bloodGroup": "A+",
  "address": {
    "street": "456 Oak Avenue",
    "city": "Delhi",
    "state": "Delhi",
    "zipCode": "110001"
  },
  "preferences": {
    "preferredLanguage": "hindi",
    "notificationPreferences": {
      "push": true
    }
  }
}
```

---

### 5. Verify Email (Protected Route)
**Method:** POST  
**URL:** `{{baseUrl}}/users/verify-email`  
**Headers:** Authorization: Bearer {{token}}

**Request Body:**
```json
{
  "token": "123456"
}
```

---

### 6. Verify Phone (Protected Route)
**Method:** POST  
**URL:** `{{baseUrl}}/users/verify-phone`  
**Headers:** Authorization: Bearer {{token}}

**Request Body:**
```json
{
  "token": "654321"
}
```

---

### 7. Logout (Protected Route)
**Method:** POST  
**URL:** `{{baseUrl}}/users/logout`  
**Headers:** Authorization: Bearer {{token}}

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "data": null,
  "message": "Logout successful",
  "success": true
}
```

---

### 8. Health Check
**Method:** GET  
**URL:** `{{baseUrl}}/health`

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "MediGo API is running successfully",
  "timestamp": "2025-09-21T10:30:00.000Z"
}
```

---

## Postman Environment Variables
Create these variables in your Postman environment:

```json
{
  "baseUrl": "http://localhost:5000/api",
  "token": ""
}
```

## Testing Workflow
1. Health Check - Verify API is running
2. Signup - Create a new user account
3. Login - Get authentication token (save to {{token}} variable)
4. Get Profile - Test protected route
5. Update Profile - Test profile updates
6. Verify Email/Phone - Test verification (use tokens from signup response)
7. Logout - Clear session

## Error Response Examples

**400 Bad Request:**
```json
{
  "statusCode": 400,
  "data": null,
  "message": "All required fields must be provided",
  "success": false,
  "errors": []
}
```

**409 Conflict:**
```json
{
  "statusCode": 409,
  "data": null,
  "message": "User with this email or phone already exists",
  "success": false,
  "errors": []
}
```

**401 Unauthorized:**
```json
{
  "statusCode": 401,
  "data": null,
  "message": "Invalid credentials",
  "success": false,
  "errors": []
}
```
