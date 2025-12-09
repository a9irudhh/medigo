from typing import Dict, Any, List, Optional, Tuple
from loguru import logger
from datetime import datetime, timedelta
import asyncio
import json

# Import our enhanced context management
from utils.enhanced_context import MedicalContextManager, EnhancedPromptBuilder

# Import our agents
from agents.symptom_analyzer import SymptomAnalyzerAgent
from agents.doctor_matcher import DoctorMatcherAgent
from agents.booking_coordinator import BookingCoordinatorAgent

class EnhancedMedicalConsultationWorkflow:
    """
    Streamlined medical consultation workflow:
    1. Understand symptoms quickly (no excessive clarification)
    2. Match with available doctors from database
    3. Let user select doctor (if multiple options)
    4. Book appointment immediately
    5. Send confirmation email
    """
    
    def __init__(self, database_manager, gemini_client):
        self.db = database_manager
        self.gemini_client = gemini_client
        
        # Initialize enhanced context management
        self.context_manager = MedicalContextManager(database_manager)
        self.prompt_builder = EnhancedPromptBuilder()
        
        # Initialize agents
        self.symptom_analyzer = SymptomAnalyzerAgent(gemini_client)
        self.doctor_matcher = DoctorMatcherAgent(gemini_client, database_manager)
        self.booking_coordinator = BookingCoordinatorAgent(gemini_client, database_manager)
        
        # Conversation state tracking with enhanced metadata
        self.active_conversations = {}
        
        logger.info("Streamlined Medical consultation workflow initialized")
    
    async def process_message(
        self,
        conversation_id: str,
        user_id: str,
        message: str,
        conversation_state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Simplified process: Greeting → Symptoms → Show 1 Doctor → Yes/No → Book → Done
        """
        
        try:
            current_step = conversation_state.get("currentStep", "initial_greeting")
            
            logger.info(f"Processing message - Conversation: {conversation_id}, Step: {current_step}, Message: {message[:50]}")
            
            # Route based on current step
            if current_step == "initial_greeting":
                return self._handle_initial_greeting(message, conversation_state)
            
            elif current_step == "symptom_collection":
                return await self._handle_symptom_collection(message, conversation_state, user_id, conversation_id)

            elif current_step == "doctor_confirmation":
                return await self._handle_doctor_confirmation(message, conversation_state, user_id, conversation_id)
            
            elif current_step == "completed":
                result = self._handle_completed(message)
                # If user provided health concerns directly, process them as symptoms
                if result.get("processAsSymptoms"):
                    symptom_result = await self._handle_symptom_collection(
                        message, conversation_state, user_id, conversation_id
                    )
                    return symptom_result
                return result
            
            else:
                return self._handle_general_inquiry(message)
        
        except Exception as e:
            logger.error(f"Error processing message in workflow: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return {
                "message": "I apologize for the technical difficulty. Could you please describe your symptoms again?",
                "agentType": "system",
                "confidence": 0.5,
                "requiresInput": True,
                "newStatus": "gathering_symptoms",
                "newStep": "symptom_collection"
            }
    
    def _handle_initial_greeting(self, message: str, conversation_state: Dict[str, Any]) -> Dict[str, Any]:
        """Handle initial greeting and move to symptom collection"""
        return {
            "message": "Hello! I'm here to help you find the right doctor and book an appointment. Please describe your symptoms or health concern.",
            "agentType": "symptom_analyzer",
            "confidence": 1.0,
            "requiresInput": True,
            "newStatus": "gathering_symptoms",
            "newStep": "symptom_collection"
        }
    
    async def _handle_symptom_collection(
        self, 
        message: str, 
        conversation_state: Dict[str, Any],
        user_id: str,
        conversation_id: str
    ) -> Dict[str, Any]:
        """
        Analyze symptoms and show THE BEST MATCHING DOCTOR (top 1 only).
        """
        
        try:
            message_lower = message.lower().strip()
            
            # Check if user is giving a yes/no response instead of symptoms
            # This happens when they're responding to "Would you like to describe symptoms again?"
            if any(word in message_lower for word in ["yes", "yeah", "yep", "sure", "ok", "okay"]):
                # They said yes to describing symptoms again, ask them to describe
                return {
                    "message": "Great! Please describe your symptoms or health concern in detail so I can find the right doctor for you.",
                    "agentType": "system",
                    "confidence": 0.9,
                    "requiresInput": True,
                    "newStep": "symptom_collection"
                }
            elif any(word in message_lower for word in ["no", "nope", "nah"]):
                # They said no, ask what they want instead
                return {
                    "message": "I understand. What would you like to do? You can describe symptoms for a different concern, or if you'd like to end this conversation, just let me know.",
                    "agentType": "system",
                    "confidence": 0.8,
                    "requiresInput": True,
                    "newStep": "symptom_collection"
                }
            
            # Analyze symptoms with AI
            analysis_prompt = self._build_streamlined_symptom_prompt({"current_message": message})
            ai_response = await self.gemini_client.generate_response(analysis_prompt)
            
            logger.info(f"AI Symptom Analysis: {ai_response[:200]}")
            
            # Parse AI response
            try:
                cleaned_response = ai_response.strip()
                if cleaned_response.startswith("```json"):
                    cleaned_response = cleaned_response[7:]
                if cleaned_response.startswith("```"):
                    cleaned_response = cleaned_response[3:]
                if cleaned_response.endswith("```"):
                    cleaned_response = cleaned_response[:-3]
                cleaned_response = cleaned_response.strip()
                
                analysis_result = json.loads(cleaned_response)
            except json.JSONDecodeError:
                logger.warning("JSON parse error, using fallback extraction")
                analysis_result = self._extract_specialization_from_message(message)
            
            specialization = analysis_result.get("specialization", "General Medicine")
            symptoms_text = ", ".join(analysis_result.get("symptoms", [message]))
            
            # Check for urgent cases
            if analysis_result.get("severity") == "urgent":
                return {
                    "message": f"Based on your symptoms, I recommend seeking immediate medical attention. Please visit the nearest emergency room or call emergency services.",
                    "agentType": "symptom_analyzer",
                    "confidence": 1.0,
                    "requiresInput": False,
                    "newStatus": "completed",
                    "newStep": "completed"
                }
            
            # Find doctors for the specialization (get top 1 only)
            all_doctors = await self._find_doctors_by_specialization(specialization)
            
            if not all_doctors:
                return {
                    "message": f"I couldn't find available doctors for {specialization}. Would you like me to check for General Medicine doctors instead?",
                    "agentType": "doctor_matcher",
                    "confidence": 0.7,
                    "requiresInput": True,
                    "newStep": "symptom_collection"
                }
            
            # Get TOP 1 doctor only
            top_doctor = all_doctors[0]
            
            # Format message with single doctor
            doctor_message = (
                f"Based on your concern ({symptoms_text}), I recommend seeing a {specialization} specialist.\n\n"
                f"I found the best match for you:\n\n"
                f"Dr. {top_doctor['name']}\n"
                f"- Specialization: {top_doctor['specialization']}\n"
                f"- Experience: {top_doctor['experience']} years\n"
                f"- Rating: {top_doctor['rating']}/5\n"
                f"- Hospital: {top_doctor['hospital']}\n"
                f"- Consultation Fee: ₹{top_doctor['consultationFee']}\n\n"
                f"Would you like to book an appointment with Dr. {top_doctor['name']}?\n"
                f"Reply 'yes' to proceed or 'no' to cancel."
            )
            
            return {
                "message": doctor_message,
                "agentType": "doctor_matcher",
                "confidence": 0.95,
                "requiresInput": True,
                "newStatus": "confirming_doctor",
                "newStep": "doctor_confirmation",
                "extractedData": {
                    "symptoms": symptoms_text,
                    "specialization": specialization,
                    "recommended_doctor": top_doctor,
                    "doctor_id": top_doctor['id'],
                    "doctor_name": top_doctor['name']
                }
            }
            
        except Exception as e:
            logger.error(f"Error in symptom collection: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return {
                "message": "I'm having trouble analyzing your symptoms. Could you please describe them briefly?",
                "agentType": "symptom_analyzer",
                "confidence": 0.5,
                "requiresInput": True,
                "newStep": "symptom_collection"
            }
    
    def _extract_preferred_day_from_message(self, message: str) -> Optional[str]:
        """Extract preferred day of the week from user message"""
        message_lower = message.lower()
        
        day_mapping = {
            "monday": "Monday",
            "tuesday": "Tuesday", 
            "wednesday": "Wednesday",
            "thursday": "Thursday",
            "friday": "Friday",
            "saturday": "Saturday",
            "sunday": "Sunday",
            "tomorrow": None,  # Will be calculated dynamically
            "today": None,  # Will be calculated dynamically
        }
        
        for keyword, day_name in day_mapping.items():
            if keyword in message_lower:
                if keyword == "tomorrow":
                    tomorrow = datetime.now() + timedelta(days=1)
                    return tomorrow.strftime("%A")
                elif keyword == "today":
                    return datetime.now().strftime("%A")
                return day_name
        
        return None

    def _find_slot_for_day(self, available_dates: List[Dict], preferred_day: str) -> Optional[Dict]:
        """Find the first available slot for a specific day of the week"""
        for date_info in available_dates:
            if date_info.get("day_name") == preferred_day:
                if date_info.get("slots"):
                    return {
                        "date": date_info["date"],
                        "day_name": date_info["day_name"],
                        "slot": date_info["slots"][0]
                    }
        return None

    async def _handle_doctor_confirmation(
        self,
        message: str,
        conversation_state: Dict[str, Any],
        user_id: str,
        conversation_id: str
    ) -> Dict[str, Any]:
        """
        Simplified flow:
        1. User says 'yes' -> Show available days
        2. User picks a day -> Book on that day
        3. User says 'no' -> Go back to symptom collection
        """
        
        try:
            message_lower = message.lower().strip()
            
            # Get doctor data from aiContext.agentData
            ai_context = conversation_state.get("aiContext", {})
            agent_data = ai_context.get("agentData", {}) or {}
            
            logger.info(f"=== DOCTOR CONFIRMATION ===")
            logger.info(f"User message: {message}")
            logger.info(f"agentData keys: {list(agent_data.keys())}")
            
            doctor_id = agent_data.get("doctor_id")
            doctor_name = agent_data.get("doctor_name")
            recommended_doctor = agent_data.get("recommended_doctor", {})
            symptoms = agent_data.get("symptoms", "Medical consultation")
            available_days_list = agent_data.get("available_days", [])  # From slot_selection step
            
            # Extract if user mentioned a specific day
            preferred_day = self._extract_preferred_day_from_message(message)
            
            # Check if user said NO
            if any(word in message_lower for word in ["no", "nope", "nah", "cancel", "don't", "dont"]):
                return {
                    "message": "No problem! Would you like to describe your symptoms again to find another doctor?",
                    "agentType": "system",
                    "confidence": 0.9,
                    "requiresInput": True,
                    "newStatus": "gathering_symptoms",
                    "newStep": "symptom_collection",
                    "extractedData": None
                }
            
            if not doctor_id:
                logger.error("No doctor_id found in agentData")
                return {
                    "message": "I'm sorry, I lost track of the doctor selection. Could you describe your symptoms again?",
                    "agentType": "system",
                    "confidence": 0.5,
                    "requiresInput": True,
                    "newStep": "symptom_collection"
                }
            
            # Get doctor availability
            logger.info(f"Checking availability for doctor: {doctor_id}")
            availability_result = await self.booking_coordinator.check_doctor_availability(
                doctor_id=str(doctor_id),
                days_ahead=14
            )
            
            available_dates = availability_result.get("available_slots", [])
            
            if not available_dates:
                return {
                    "message": f"I'm sorry, Dr. {doctor_name} doesn't have any available slots in the next 2 weeks. Would you like to find another doctor?",
                    "agentType": "booking_coordinator",
                    "confidence": 0.8,
                    "requiresInput": True,
                    "newStep": "symptom_collection"
                }
            
            # Get unique available days
            available_days = list(set([d["day_name"] for d in available_dates]))
            
            # CASE 1: User mentioned a specific day - try to book it
            if preferred_day:
                logger.info(f"User requested day: {preferred_day}")
                
                # Check if the requested day is available
                if preferred_day in available_days:
                    # Find the slot for this day and book it
                    day_slot = self._find_slot_for_day(available_dates, preferred_day)
                    if day_slot:
                        return await self._book_appointment(
                            doctor_id=doctor_id,
                            doctor_name=doctor_name,
                            recommended_doctor=recommended_doctor,
                            selected_slot={
                                "date": day_slot["date"],
                                "startTime": day_slot["slot"]["startTime"],
                                "endTime": day_slot["slot"]["endTime"]
                            },
                            symptoms=symptoms,
                            user_id=user_id,
                            conversation_id=conversation_id
                        )
                else:
                    # Requested day is not available
                    return {
                        "message": f"Sorry, Dr. {doctor_name} is not available on {preferred_day}.\n\n"
                                  f"Available days are: {', '.join(available_days)}\n\n"
                                  f"Please pick one of these days.",
                        "agentType": "booking_coordinator",
                        "confidence": 0.8,
                        "requiresInput": True,
                        "newStep": "doctor_confirmation",
                        "extractedData": {
                            "symptoms": symptoms,
                            "doctor_id": doctor_id,
                            "doctor_name": doctor_name,
                            "recommended_doctor": recommended_doctor,
                            "available_days": available_days
                        }
                    }
            
            # CASE 2: User said 'yes' or similar - show available days
            if any(word in message_lower for word in ["yes", "yeah", "yep", "sure", "ok", "okay", "proceed", "book", "confirm"]):
                return {
                    "message": f"Great! Dr. {doctor_name} is available on the following days:\n\n"
                              f"{', '.join(available_days)}\n\n"
                              f"Which day would you like to book? (e.g., Monday, Tuesday)",
                    "agentType": "booking_coordinator",
                    "confidence": 0.9,
                    "requiresInput": True,
                    "newStep": "doctor_confirmation",
                    "extractedData": {
                        "symptoms": symptoms,
                        "doctor_id": doctor_id,
                        "doctor_name": doctor_name,
                        "recommended_doctor": recommended_doctor,
                        "available_days": available_days
                    }
                }
            
            # CASE 3: Unclear response
            return {
                "message": f"Would you like to book an appointment with Dr. {doctor_name}? Please reply 'yes' or 'no'.",
                "agentType": "doctor_matcher",
                "confidence": 0.6,
                "requiresInput": True,
                "newStep": "doctor_confirmation"
            }
            
        except Exception as e:
            logger.error(f"Error in doctor confirmation: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return {
                "message": "I'm having trouble processing your response. Please try again.",
                "agentType": "system",
                "confidence": 0.5,
                "requiresInput": True,
                "newStep": "doctor_confirmation"
            }

    async def _book_appointment(
        self,
        doctor_id: str,
        doctor_name: str,
        recommended_doctor: Dict,
        selected_slot: Dict,
        symptoms: str,
        user_id: str,
        conversation_id: str
    ) -> Dict[str, Any]:
        """Book the appointment and return confirmation message"""
        
        logger.info(f"Booking appointment: {selected_slot}")
        
        booking_result = await self.booking_coordinator.handle_slot_selection(
            doctor_id=str(doctor_id),
            selected_date=selected_slot["date"],
            selected_time_slot={
                "startTime": selected_slot["startTime"],
                "endTime": selected_slot["endTime"]
            },
            user_id=user_id,
            symptoms=symptoms,
            conversation_id=conversation_id
        )
        
        if booking_result.get("slotUnavailable"):
            return {
                "message": booking_result["message"] + "\n\nWould you like to try another day?",
                "agentType": "booking_coordinator",
                "confidence": 0.7,
                "requiresInput": True,
                "newStep": "doctor_confirmation"
            }
        
        # Confirm booking
        appointment_data = booking_result.get("appointmentData")
        
        if appointment_data:
            confirmation_result = await self.booking_coordinator.confirm_booking(appointment_data)
            
            if confirmation_result.get("bookingSuccessful"):
                try:
                    date_obj = datetime.fromisoformat(selected_slot.get("date", ""))
                    date_str = date_obj.strftime("%A, %B %d, %Y")
                except:
                    date_str = selected_slot.get("date", "")
                
                confirmation_message = (
                    f"Appointment Confirmed!\n\n"
                    f"Doctor: Dr. {doctor_name}\n"
                    f"Specialization: {recommended_doctor.get('specialization', 'N/A')}\n"
                    f"Date: {date_str}\n"
                    f"Time: {selected_slot.get('startTime', '')} - {selected_slot.get('endTime', '')}\n"
                    f"Hospital: {recommended_doctor.get('hospital', 'N/A')}\n"
                    f"Consultation Fee: Rs.{recommended_doctor.get('consultationFee', 0)}\n"
                    f"Appointment ID: {confirmation_result.get('appointmentId', 'N/A')}\n\n"
                    f"A confirmation email has been sent to your registered email address.\n\n"
                    f"Important:\n"
                    f"- Please arrive 15 minutes early\n"
                    f"- Bring a valid ID and medical records if any\n\n"
                    f"Thank you for using MediGo! Take care!"
                )
                
                return {
                    "message": confirmation_message,
                    "agentType": "booking_coordinator",
                    "confidence": 1.0,
                    "requiresInput": False,
                    "newStatus": "completed",
                    "newStep": "completed",
                    "appointmentId": confirmation_result["appointmentId"]
                }
        
        return {
            "message": "Your appointment has been booked! You should receive a confirmation email shortly.",
            "agentType": "booking_coordinator",
            "confidence": 0.9,
            "requiresInput": False,
            "newStatus": "completed",
            "newStep": "completed"
        }
    
    def _handle_completed(self, message: str) -> Dict[str, Any]:
        """Handle messages after appointment is completed"""
        message_lower = message.lower().strip()
        
        # Check if user is describing symptoms or health concerns directly
        # (e.g., "I have headache", "eye checkup", "skin problem")
        health_keywords = [
            "headache", "pain", "fever", "cold", "cough", "eye", "skin", "stomach",
            "heart", "chest", "back", "knee", "throat", "ear", "nose", "tooth",
            "checkup", "check up", "consultation", "problem", "issue", "symptom",
            "blurry", "vision", "rash", "allergy", "breathing", "dizzy", "nausea"
        ]
        
        has_health_concern = any(keyword in message_lower for keyword in health_keywords)
        wants_new_booking = any(word in message_lower for word in ["yes", "another", "more", "again", "different", "book", "appointment", "new"])
        
        if has_health_concern:
            # User directly mentioned a health concern - process as symptoms immediately
            return {
                "processAsSymptoms": True,  # Flag to process message as symptoms
                "newStatus": "gathering_symptoms",
                "newStep": "symptom_collection",
                "extractedData": None
            }
        
        if wants_new_booking:
            return {
                "message": "Sure! Please describe your symptoms or health concern.",
                "agentType": "system",
                "confidence": 0.9,
                "requiresInput": True,
                "newStatus": "gathering_symptoms",
                "newStep": "symptom_collection",
                "extractedData": None
            }
        
        # Otherwise, thank them and remain in completed state
        return {
            "message": "Thank you for using MediGo! If you need to book another appointment in the future, just let me know your symptoms. Take care!",
            "agentType": "system",
            "confidence": 1.0,
            "requiresInput": True,
            "newStep": "completed"
        }
    
    def _handle_general_inquiry(self, message: str) -> Dict[str, Any]:
        """Handle unclear messages"""
        return {
            "message": "I'm here to help you book a medical appointment. Please describe your symptoms or health concern so I can find the right doctor for you.",
            "agentType": "system",
            "confidence": 0.7,
            "requiresInput": True,
            "newStep": "symptom_collection"
        }
    
    # ===== HELPER METHODS =====
    
    def _extract_specialization_from_message(self, message: str) -> Dict[str, Any]:
        """Fallback method to extract specialization from message when AI parsing fails"""
        
        message_lower = message.lower()
        
        # Map of keywords to specializations
        specialization_keywords = {
            "Cardiology": ["cardiologist", "cardiology", "heart", "ecg", "ekg", "cardiac", "chest pain", "blood pressure"],
            "Dermatology": ["dermatologist", "dermatology", "skin", "rash", "acne", "eczema"],
            "Pediatrics": ["pediatrician", "pediatrics", "child", "baby", "infant", "kid"],
            "Orthopedics": ["orthopedic", "orthopedics", "bone", "joint", "fracture", "sprain"],
            "Neurology": ["neurologist", "neurology", "brain", "headache", "migraine", "seizure"],
            "Gastroenterology": ["gastroenterologist", "gastroenterology", "stomach", "digestion", "gastro"],
            "Gynecology": ["gynecologist", "gynecology", "gynae", "women's health", "pregnancy"],
            "Psychiatry": ["psychiatrist", "psychiatry", "mental health", "depression", "anxiety"],
            "Endocrinology": ["endocrinologist", "endocrinology", "diabetes", "thyroid", "hormone"],
            "Ophthalmology": ["ophthalmologist", "ophthalmology", "eye", "vision", "opthal"]
        }
        
        # Check for direct matches
        for specialization, keywords in specialization_keywords.items():
            if any(keyword in message_lower for keyword in keywords):
                return {
                    "symptoms": [message],
                    "specialization": specialization,
                    "severity": "moderate"
                }
        
        # Default fallback
        return {
            "symptoms": [message],
            "specialization": "General Medicine",
            "severity": "moderate"
        }
    
    def _build_streamlined_symptom_prompt(self, context: Dict[str, Any]) -> str:
        """Build a streamlined prompt that doesn't over-analyze"""
        
        message = context["current_message"]
        
        return f"""You are a medical assistant. The patient said: "{message}"

Your task: Extract symptoms and recommend ONE medical specialization.

Available specializations in our system:
- Cardiology (heart, chest pain, ECG, palpitations, blood pressure)
- Dermatology (skin, rash, acne, hair, nails)
- General Medicine (fever, cold, flu, general checkup)
- Orthopedics (bones, joints, fractures, back pain, knee pain)
- Neurology (headache, migraine, dizziness, seizures)
- Pediatrics (children, baby, infant care)
- Gastroenterology (stomach, digestion, nausea, diarrhea)
- Gynecology (women's health, pregnancy, periods)
- Psychiatry (mental health, anxiety, depression)
- Endocrinology (diabetes, thyroid, hormones)
- Ophthalmology (eyes, vision problems)

IMPORTANT: 
- If the user explicitly mentions a specialization (e.g., "cardiologist", "dermatologist"), use that specialization.
- If the user mentions a specific procedure (e.g., "ECG", "X-ray"), match it to the relevant specialization.
- Extract actual symptoms if mentioned, or use the reason for visit.

Respond with JSON only (no markdown, no code blocks):
{{
    "symptoms": ["reason for visit or symptoms"],
    "specialization": "exact match from list above",
    "severity": "mild|moderate|severe|urgent"
}}

Only mark as "urgent" if life-threatening (chest pain, severe bleeding, difficulty breathing, unconscious)."""
    
    async def _find_doctors_by_specialization(self, specialization: str) -> List[Dict[str, Any]]:
        """Find available doctors for a specialization"""
        
        try:
            # Query database for doctors
            db = self.db.db  # Use self.db.db instead of self.db.database
            doctors_collection = db.doctors
            
            logger.info(f"Searching for doctors with specialization: {specialization}")
            
            doctors_cursor = doctors_collection.find({
                "specialization": specialization,
                "isActive": True
            }).sort("rating", -1).limit(5)
            
            doctors = await doctors_cursor.to_list(length=None)
            
            logger.info(f"Found {len(doctors)} doctors for {specialization}")
            
            # Format doctor data
            formatted_doctors = []
            for doc in doctors:
                formatted_doctors.append({
                    "id": str(doc["_id"]),
                    "_id": str(doc["_id"]),
                    "name": doc.get("name", ""),
                    "specialization": doc.get("specialization", ""),
                    "experience": doc.get("experience", 0),
                    "rating": doc.get("rating", 4.0),
                    "hospital": doc.get("hospital", ""),
                    "consultationFee": doc.get("consultationFee", 0),
                    "languages": doc.get("languages", [])
                })
            
            return formatted_doctors
            
        except Exception as e:
            logger.error(f"Error finding doctors: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return []
    
    def _format_doctor_options_message(
        self, 
        doctors: List[Dict[str, Any]], 
        symptoms: str,
        specialization: str
    ) -> str:
        """Format doctor options in a clear message"""
        
        if len(doctors) == 1:
            doc = doctors[0]
            return (f"Based on your symptoms ({symptoms}), I recommend seeing a {specialization} specialist.\n\n"
                   f"I found Dr. {doc['name']} who can help you:\n"
                   f"• Experience: {doc['experience']} years\n"
                   f"• Rating: {doc['rating']}/5\n"
                   f"• Hospital: {doc['hospital']}\n"
                   f"• Consultation Fee: ${doc['consultationFee']}\n\n"
                   f"Would you like to book an appointment with Dr. {doc['name']}? (Reply 'yes' or '1')")
        
        message = f"Based on your symptoms ({symptoms}), I recommend seeing a {specialization} specialist.\n\n"
        message += f"I found {len(doctors)} available doctors:\n\n"
        
        for i, doc in enumerate(doctors, 1):
            message += f"{i}. Dr. {doc['name']}\n"
            message += f"   - Experience: {doc['experience']} years | Rating: {doc['rating']}/5\n"
            message += f"   - Hospital: {doc['hospital']}\n"
            message += f"   - Fee: Rs.{doc['consultationFee']}\n\n"
        
        message += "Please choose a doctor by number (e.g., 1, 2) or by name."
        
        return message
    
    def _format_doctor_selection_options(self, doctors: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format doctor selection options for UI"""
        
        options = []
        for i, doc in enumerate(doctors, 1):
            options.append({
                "id": f"doctor_{i}",
                "label": f"Dr. {doc['name']} - {doc['specialization']}",
                "value": doc['id'],
                "metadata": {
                    "experience": doc['experience'],
                    "rating": doc['rating'],
                    "fee": doc['consultationFee']
                }
            })
        
        return options
    
    def _format_booking_slots_message(
        self,
        doctor: Dict[str, Any],
        slots: List[Dict[str, Any]]
    ) -> str:
        """Format available booking slots message"""
        
        message = f"Great! Here are available time slots with Dr. {doctor['name']}:\n\n"
        
        # Group slots by date
        slots_by_date = {}
        for slot in slots[:10]:  # Limit to 10 slots
            date = slot.get("date", "")
            if date not in slots_by_date:
                slots_by_date[date] = []
            slots_by_date[date].append(slot)
        
        slot_index = 1
        for date, date_slots in slots_by_date.items():
            # Format date nicely
            try:
                date_obj = datetime.fromisoformat(date)
                date_str = date_obj.strftime("%A, %B %d, %Y")
            except:
                date_str = date
            
            message += f"{date_str}\n"
            for slot in date_slots:
                start_time = slot.get("startTime", "")
                end_time = slot.get("endTime", "")
                message += f"{slot_index}. {start_time} - {end_time}\n"
                slot_index += 1
            message += "\n"
        
        message += "Please choose a time slot by number (e.g., 1, 2)."
        
        return message
    
    def _format_time_slot_options(self, slots: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format time slot options for UI"""
        
        options = []
        for i, slot in enumerate(slots[:10], 1):
            try:
                date_obj = datetime.fromisoformat(slot.get("date", ""))
                date_str = date_obj.strftime("%b %d, %Y")
            except:
                date_str = slot.get("date", "")
            
            options.append({
                "id": f"slot_{i}",
                "label": f"{date_str} at {slot.get('startTime', '')}",
                "value": i,
                "metadata": {
                    "date": slot.get("date"),
                    "startTime": slot.get("startTime"),
                    "endTime": slot.get("endTime")
                }
            })
        
        return options
    
    def _format_confirmation_message(
        self,
        doctor: Dict[str, Any],
        slot: Dict[str, Any],
        appointment_id: str
    ) -> str:
        """Format appointment confirmation message"""
        
        try:
            date_obj = datetime.fromisoformat(slot.get("date", ""))
            date_str = date_obj.strftime("%A, %B %d, %Y")
        except:
            date_str = slot.get("date", "")
        
        message = "Appointment Confirmed!\n\n"
        message += f"Doctor: Dr. {doctor['name']}\n"
        message += f"Specialization: {doctor['specialization']}\n"
        message += f"Date: {date_str}\n"
        message += f"Time: {slot.get('startTime', '')} - {slot.get('endTime', '')}\n"
        message += f"Hospital: {doctor['hospital']}\n"
        message += f"Consultation Fee: Rs.{doctor['consultationFee']}\n"
        message += f"Appointment ID: {appointment_id}\n\n"
        message += "A confirmation email has been sent to your registered email address.\n\n"
        message += "Important Notes:\n"
        message += "- Please arrive 15 minutes early\n"
        message += "- Bring a valid ID and any previous medical records\n"
        message += "- If you need to cancel or reschedule, please do so at least 24 hours in advance\n\n"
        message += "Thank you for choosing MediGo! Take care!"
        
        return message
    
    def _extract_doctor_selection(
        self, 
        message: str, 
        doctors: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """Extract doctor selection from user message"""
        
        message_lower = message.lower().strip()
        
        # Check for numeric selection
        if message_lower in ["1", "first", "one"] and len(doctors) >= 1:
            return doctors[0]
        if message_lower in ["2", "second", "two"] and len(doctors) >= 2:
            return doctors[1]
        if message_lower in ["3", "third", "three"] and len(doctors) >= 3:
            return doctors[2]
        if message_lower in ["4", "fourth", "four"] and len(doctors) >= 4:
            return doctors[3]
        if message_lower in ["5", "fifth", "five"] and len(doctors) >= 5:
            return doctors[4]
        
        # Try to extract number
        for char in message:
            if char.isdigit():
                try:
                    index = int(char) - 1
                    if 0 <= index < len(doctors):
                        return doctors[index]
                except:
                    pass
        
        # Check for name match
        for doctor in doctors:
            doctor_name = doctor.get("name", "").lower()
            if doctor_name in message_lower or any(part in message_lower for part in doctor_name.split()):
                return doctor
        
        # If only one doctor and user says yes/ok/sure
        if len(doctors) == 1 and any(word in message_lower for word in ["yes", "ok", "sure", "book", "proceed"]):
            return doctors[0]
        
        return None
    
    def _extract_slot_selection(
        self,
        message: str,
        slots: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """Extract slot selection from user message"""
        
        message_lower = message.lower().strip()
        
        # Check for numeric selection
        number_words = {
            "1": 0, "first": 0, "one": 0,
            "2": 1, "second": 1, "two": 1,
            "3": 2, "third": 2, "three": 2,
            "4": 3, "fourth": 3, "four": 3,
            "5": 4, "fifth": 4, "five": 4,
            "6": 5, "sixth": 5, "six": 5,
            "7": 6, "seventh": 6, "seven": 6,
            "8": 7, "eighth": 7, "eight": 8,
            "9": 8, "ninth": 8, "nine": 8,
            "10": 9, "tenth": 9, "ten": 9
        }
        
        for word, index in number_words.items():
            if word in message_lower and index < len(slots):
                return slots[index]
        
        # Try to extract number directly
        for char in message:
            if char.isdigit():
                try:
                    index = int(char) - 1
                    if 0 <= index < len(slots):
                        return slots[index]
                except:
                    pass
        
        return None
    
    # Workflow management methods
    async def get_conversation_state(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Get conversation state from database"""
        return await self.db.get_conversation_state(conversation_id)
    
    async def end_conversation(self, conversation_id: str) -> bool:
        """End and cleanup a conversation"""
        try:
            success = await self.db.update_conversation_state(
                conversation_id, 
                {"isActive": False, "status": "cancelled"}
            )
            
            if conversation_id in self.active_conversations:
                del self.active_conversations[conversation_id]
            
            return success
        except Exception as e:
            logger.error(f"Error ending conversation: {e}")
            return False
    
    async def get_active_conversations_count(self) -> int:
        """Get count of active conversations"""
        return await self.db.get_active_conversations_count()
    
    async def get_total_messages_count(self) -> int:
        """Get total count of processed messages"""
        return await self.db.get_total_messages_count()
    
    async def cleanup_expired_conversations(self):
        """Cleanup expired conversations"""
        await self.db.cleanup_expired_conversations()
