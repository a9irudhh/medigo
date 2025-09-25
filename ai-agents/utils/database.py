from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
import os
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from loguru import logger
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import json

class DatabaseManager:
    """Async MongoDB database manager for AI agent operations"""
    
    def __init__(self):
        self.mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/medigo")
        self.database_name = os.getenv("DB_NAME", "medigo")
        self.client: Optional[AsyncIOMotorClient] = None
        self.db = None
        
    async def connect(self):
        """Connect to MongoDB"""
        try:
            self.client = AsyncIOMotorClient(self.mongodb_uri)
            self.db = self.client[self.database_name]
            
            # Test connection
            await self.client.admin.command('ping')
            logger.info("Connected to MongoDB successfully")
            
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise
    
    async def disconnect(self):
        """Disconnect from MongoDB"""
        if self.client:
            self.client.close()
            logger.info("Disconnected from MongoDB")
    
    def is_connected(self) -> bool:
        """Check if connected to MongoDB"""
        return self.client is not None and self.db is not None
    
    # Doctor-related methods
    async def get_doctors_by_specialization(
        self, 
        specialization: str, 
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get doctors by specialization"""
        try:
            cursor = self.db.doctors.find({
                "specialization": {"$regex": specialization, "$options": "i"},
                "isActive": True
            }).limit(limit).sort("rating", -1)
            
            doctors = []
            async for doctor in cursor:
                doctor['_id'] = str(doctor['_id'])
                doctors.append(doctor)
            
            return doctors
            
        except Exception as e:
            logger.error(f"Error fetching doctors by specialization: {e}")
            return []
    
    async def get_doctor_ById(self, doctor_id: str) -> Optional[Dict[str, Any]]:
        """Get doctor by ID"""
        try:
            if not ObjectId.is_valid(doctor_id):
                return None
                
            doctor = await self.db.doctors.find_one({"_id": ObjectId(doctor_id)})
            if doctor:
                doctor['_id'] = str(doctor['_id'])
            return doctor
            
        except Exception as e:
            logger.error(f"Error fetching doctor by ID: {e}")
            return None
    
    async def get_available_specializations(self) -> List[str]:
        """Get list of available specializations"""
        try:
            cursor = self.db.specializations.find({"isActive": True})
            specializations = []
            async for spec in cursor:
                specializations.append(spec.get("name", ""))
            
            return specializations
            
        except Exception as e:
            logger.error(f"Error fetching specializations: {e}")
            return [
                "General Medicine", "Cardiologist", "Neurologist", 
                "Dermatologist", "Orthopedic", "Pediatrician"
            ]  # Fallback list
    
    async def search_doctors_by_symptoms(self, symptoms: List[str]) -> List[Dict[str, Any]]:
        """Search doctors based on symptom keywords"""
        try:
            # First, find matching specializations
            specialization_matches = await self.db.specializations.find({
                "commonSymptoms.keywords": {"$in": symptoms},
                "isActive": True
            }).sort("commonSymptoms.weight", -1).to_list(3)
            
            if not specialization_matches:
                return []
            
            # Get specialization names
            spec_names = [spec["name"] for spec in specialization_matches]
            
            # Find doctors for these specializations
            cursor = self.db.doctors.find({
                "specialization": {"$in": spec_names},
                "isActive": True
            }).sort("rating", -1).limit(10)
            
            doctors = []
            async for doctor in cursor:
                doctor['_id'] = str(doctor['_id'])
                doctors.append(doctor)
            
            return doctors
            
        except Exception as e:
            logger.error(f"Error searching doctors by symptoms: {e}")
            return []
    
    # Appointment-related methods
    async def get_doctor_availability(
        self, 
        doctor_id: str, 
        date: datetime
    ) -> List[Dict[str, str]]:
        """Get available slots for a doctor on a specific date"""
        try:
            if not ObjectId.is_valid(doctor_id):
                return []
            
            # Get doctor's availability schedule
            doctor = await self.db.doctors.find_one({"_id": ObjectId(doctor_id)})
            if not doctor:
                return []
            
            day_name = date.strftime("%A")
            day_availability = None
            
            for avail in doctor.get("availability", []):
                if avail.get("day") == day_name:
                    day_availability = avail
                    break
            
            if not day_availability:
                return []
            
            # Get booked appointments for this date
            start_of_day = datetime.combine(date.date(), datetime.min.time())
            end_of_day = datetime.combine(date.date(), datetime.max.time())
            
            booked_appointments = await self.db.appointments.find({
                "doctor": ObjectId(doctor_id),
                "appointmentDate": {"$gte": start_of_day, "$lte": end_of_day},
                "status": {"$in": ["scheduled", "confirmed", "in-progress"]}
            }).to_list(None)
            
            booked_slots = set()
            for appointment in booked_appointments:
                slot_key = f"{appointment['timeSlot']['startTime']}-{appointment['timeSlot']['endTime']}"
                booked_slots.add(slot_key)
            
            # Filter available slots
            available_slots = []
            for slot in day_availability.get("slots", []):
                slot_key = f"{slot['startTime']}-{slot['endTime']}"
                if slot_key not in booked_slots:
                    available_slots.append({
                        "startTime": slot["startTime"],
                        "endTime": slot["endTime"]
                    })
            
            return available_slots
            
        except Exception as e:
            logger.error(f"Error getting doctor availability: {e}")
            return []
    
    async def create_appointment(self, appointment_data: Dict[str, Any]) -> Optional[str]:
        """Create a new appointment"""
        try:
            # Convert string IDs to ObjectIds
            if isinstance(appointment_data.get("patient"), str):
                appointment_data["patient"] = ObjectId(appointment_data["patient"])
            if isinstance(appointment_data.get("doctor"), str):
                appointment_data["doctor"] = ObjectId(appointment_data["doctor"])
            
            # Set default values
            appointment_data.setdefault("status", "scheduled")
            appointment_data.setdefault("reasonForVisit", "New Symptom")
            appointment_data.setdefault("priority", "medium")
            appointment_data.setdefault("paymentStatus", "pending")
            
            # Insert appointment
            result = await self.db.appointments.insert_one(appointment_data)
            return str(result.inserted_id)
            
        except Exception as e:
            logger.error(f"Error creating appointment: {e}")
            return None
    
    async def check_appointment_conflict(
        self, 
        doctor_id: str, 
        appointment_date: datetime,
        start_time: str, 
        end_time: str
    ) -> bool:
        """Check if there's a scheduling conflict"""
        try:
            if not ObjectId.is_valid(doctor_id):
                return True  # Assume conflict if invalid ID
            
            start_of_day = datetime.combine(appointment_date.date(), datetime.min.time())
            end_of_day = datetime.combine(appointment_date.date(), datetime.max.time())
            
            conflict = await self.db.appointments.find_one({
                "doctor": ObjectId(doctor_id),
                "appointmentDate": {"$gte": start_of_day, "$lte": end_of_day},
                "timeSlot.startTime": start_time,
                "timeSlot.endTime": end_time,
                "status": {"$in": ["scheduled", "confirmed", "in-progress"]}
            })
            
            return conflict is not None
            
        except Exception as e:
            logger.error(f"Error checking appointment conflict: {e}")
            return True  # Assume conflict on error
    
    # User-related methods  
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        try:
            if not ObjectId.is_valid(user_id):
                return None
                
            user = await self.db.users.find_one({"_id": ObjectId(user_id)})
            if user:
                user['_id'] = str(user['_id'])
                # Remove sensitive fields
                user.pop('password', None)
                user.pop('otp', None)
            return user
            
        except Exception as e:
            logger.error(f"Error fetching user by ID: {e}")
            return None
    
    # Conversation state management
    async def get_conversation_state(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Get conversation state from database"""
        try:
            conversation = await self.db.conversations.find_one({
                "conversationId": conversation_id
            })
            
            if conversation:
                conversation['_id'] = str(conversation['_id'])
                if 'user' in conversation and isinstance(conversation['user'], ObjectId):
                    conversation['user'] = str(conversation['user'])
                if 'selectedDoctor' in conversation.get('extractedData', {}):
                    if isinstance(conversation['extractedData']['selectedDoctor'], ObjectId):
                        conversation['extractedData']['selectedDoctor'] = str(conversation['extractedData']['selectedDoctor'])
            
            return conversation
            
        except Exception as e:
            logger.error(f"Error getting conversation state: {e}")
            return None
    
    async def update_conversation_state(
        self, 
        conversation_id: str, 
        state_update: Dict[str, Any]
    ) -> bool:
        """Update conversation state"""
        try:
            result = await self.db.conversations.update_one(
                {"conversationId": conversation_id},
                {"$set": state_update}
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            logger.error(f"Error updating conversation state: {e}")
            return False
    
    # Analytics and statistics
    async def get_active_conversations_count(self) -> int:
        """Get count of active conversations"""
        try:
            count = await self.db.conversations.count_documents({
                "isActive": True,
                "status": {"$nin": ["completed", "cancelled"]},
                "sessionTimeout": {"$gt": datetime.now()}
            })
            return count
        except Exception as e:
            logger.error(f"Error getting active conversations count: {e}")
            return 0
    
    async def get_total_messages_count(self) -> int:
        """Get total count of processed messages"""
        try:
            pipeline = [
                {"$unwind": "$messages"},
                {"$count": "total"}
            ]
            
            result = await self.db.conversations.aggregate(pipeline).to_list(1)
            return result[0]["total"] if result else 0
            
        except Exception as e:
            logger.error(f"Error getting total messages count: {e}")
            return 0
    
    # Cleanup methods
    async def cleanup_expired_conversations(self):
        """Clean up expired conversations"""
        try:
            result = await self.db.conversations.update_many(
                {
                    "sessionTimeout": {"$lt": datetime.now()},
                    "status": {"$nin": ["completed", "cancelled"]},
                    "isActive": True
                },
                {
                    "$set": {
                        "status": "cancelled",
                        "isActive": False
                    }
                }
            )
            
            if result.modified_count > 0:
                logger.info(f"Cleaned up {result.modified_count} expired conversations")
                
        except Exception as e:
            logger.error(f"Error cleaning up expired conversations: {e}")

    async def test_connection(self) -> bool:
        """Test database connection"""
        try:
            await self.client.admin.command('ping')
            return True
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            return False
