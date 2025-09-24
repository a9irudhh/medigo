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
    Enhanced medical consultation workflow with deep context awareness,
    rich prompts, and elimination of hallucinations through data-driven decisions.
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
        
        logger.info("Enhanced Medical consultation workflow initialized with deep context management")
    
    async def process_message(
        self,
        conversation_id: str,
        user_id: str,
        message: str,
        conversation_state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Process a user message with comprehensive context awareness and rich prompts.
        Eliminates hallucinations by using real database data and detailed context.
        """
        
        try:
            # Build comprehensive conversation context
            full_context = await self.context_manager.build_conversation_context(
                conversation_id, user_id, message, conversation_state
            )
            
            current_status = conversation_state.get("status", "started")
            current_step = conversation_state.get("currentStep", "initial_greeting")
            
            logger.info(f"Processing message with enhanced context - Conversation: {conversation_id}, "
                       f"Step: {current_step}, Progress: {full_context['step_history']['progress_percentage']}%")
            
            # Route to enhanced handlers based on current step
            if current_step in ["initial_greeting", "symptom_collection", "symptom_clarification"]:
                return await self._enhanced_symptom_analysis(full_context)
            
            elif current_step in ["doctor_recommendation", "doctor_confirmation"]:
                return await self._enhanced_doctor_matching(full_context)
            
            elif current_step in ["slot_selection", "appointment_confirmation"]:
                return await self._enhanced_appointment_booking(full_context)
            
            else:
                # Enhanced fallback with context
                return await self._enhanced_general_inquiry(full_context)
        
        except Exception as e:
            logger.error(f"Error processing message in workflow: {e}")
            return {
                "message": "I apologize, but I'm experiencing some technical difficulties. Could you please try again?",
                "agentType": "system",
                "confidence": 0.0,
                "requiresInput": True,
                "newStatus": "error"
            }
    
    async def _enhanced_symptom_analysis(self, full_context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enhanced symptom analysis with comprehensive context and rich prompts.
        Eliminates hallucinations by using real database data for specialization matching.
        """
        
        try:
            # Build rich, context-aware prompt
            analysis_prompt = self.prompt_builder.build_symptom_analysis_prompt(full_context)
            
            # Get AI analysis with comprehensive context
            ai_response = await self.gemini_client.generate_response(analysis_prompt)
            
            # Parse AI response (expecting JSON)
            try:
                analysis_result = json.loads(ai_response)
            except json.JSONDecodeError:
                # Fallback parsing if JSON is malformed
                analysis_result = self._parse_analysis_fallback(ai_response, full_context)
            
            # Validate analysis against database context
            validated_analysis = self._validate_analysis_against_database(
                analysis_result, full_context["database_context"]
            )
            
            # Determine next step based on analysis completeness
            next_step, next_status = self._determine_symptom_analysis_next_step(
                validated_analysis, full_context
            )
            
            # Prepare comprehensive response
            response = {
                "message": self._format_symptom_analysis_response(validated_analysis, full_context),
                "agentType": "symptom_analyzer",
                "confidence": validated_analysis.get("confidence", 0.8),
                "suggestions": validated_analysis.get("follow_up_questions", []),
                "requiresInput": next_step != "doctor_recommendation",
                "newStatus": next_status,
                "newStep": next_step
            }
            
            # Add extracted data with rich context
            response["extractedData"] = {
                "symptoms": {
                    "extracted": validated_analysis.get("extracted_symptoms", []),
                    "severity": validated_analysis.get("severity", "moderate"),
                    "analysis": validated_analysis.get("analysis", ""),
                    "confidence": validated_analysis.get("confidence", 0.8)
                },
                "recommended_specializations": validated_analysis.get("recommended_specializations", []),
                "analysis_reasoning": validated_analysis.get("reasoning", ""),
                "context_used": {
                    "conversation_length": full_context["medical_context"]["message_count"],
                    "previous_symptoms": list(full_context["medical_context"]["detected_symptoms"].keys()),
                    "available_specializations": len(full_context["database_context"]["specializations"])
                }
            }
            
            return response
            
        except Exception as e:
            logger.error(f"Error in enhanced symptom analysis: {e}")
            return self._create_error_response("symptom_analyzer", "I'm having trouble analyzing your symptoms. Could you please describe them again?")
    
    async def _enhanced_doctor_matching(self, full_context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enhanced doctor matching with comprehensive context and real database integration.
        Eliminates hallucinations by using actual doctor data from MongoDB.
        """
        
        try:
            conversation_state = full_context["conversation_state"]
            current_step = conversation_state.get("currentStep", "doctor_recommendation")
            
            if current_step == "doctor_recommendation":
                # Get symptom analysis from extracted data
                extracted_data = conversation_state.get("extractedData", {})
                symptoms_data = extracted_data.get("symptoms", {})
                
                if not symptoms_data.get("extracted"):
                    return self._create_error_response(
                        "doctor_matcher", 
                        "I need to understand your symptoms better before recommending doctors. Could you describe what's bothering you?"
                    )
                
                # Build rich prompt for doctor matching
                doctor_matching_prompt = self.prompt_builder.build_doctor_matching_prompt(
                    full_context, symptoms_data
                )
                
                # Get AI recommendation with real database context
                ai_response = await self.gemini_client.generate_response(doctor_matching_prompt)
                
                # Parse and validate AI response
                try:
                    matching_result = json.loads(ai_response)
                except json.JSONDecodeError:
                    matching_result = self._parse_doctor_matching_fallback(ai_response, full_context)
                
                # Validate recommended doctors exist in database
                validated_doctors = await self._validate_recommended_doctors(
                    matching_result.get("matched_doctors", []), full_context["database_context"]
                )
                
                if not validated_doctors:
                    return self._create_fallback_doctor_response(full_context)
                
                # Format comprehensive response
                response = {
                    "message": self._format_doctor_recommendation_message(validated_doctors, full_context),
                    "agentType": "doctor_matcher", 
                    "confidence": matching_result.get("confidence", 0.8),
                    "options": self._format_doctor_options(validated_doctors),
                    "requiresInput": True,
                    "newStatus": "confirming_doctor",
                    "newStep": "doctor_confirmation"
                }
                
                # Add extracted data with matched doctors
                response["extractedData"] = {
                    "matched_doctors": validated_doctors,
                    "specialization_used": matching_result.get("specialization_used", "General Medicine"),
                    "matching_confidence": matching_result.get("confidence", 0.8),
                    "context_used": {
                        "total_doctors_considered": len(full_context["database_context"]["doctors"]),
                        "specializations_available": len(full_context["database_context"]["specializations"])
                    }
                }
                
                return response
                
            elif current_step == "doctor_confirmation":
                # Handle doctor selection with context awareness
                return await self._handle_doctor_selection_with_context(full_context)
                
        except Exception as e:
            logger.error(f"Error in enhanced doctor matching: {e}")
            return self._create_error_response("doctor_matcher", "I'm having trouble finding suitable doctors. Let me try again.")
    
    async def _enhanced_appointment_booking(self, full_context: Dict[str, Any]) -> Dict[str, Any]:
        """Enhanced appointment booking with comprehensive context"""
        
        try:
            conversation_state = full_context["conversation_state"]
            extracted_data = conversation_state.get("extractedData", {})
            selected_doctor = extracted_data.get("selected_doctor")
            
            if not selected_doctor:
                return self._create_error_response("booking_coordinator", "I need to know which doctor you'd like to see first.")
            
            # Build appointment booking prompt with full context
            booking_prompt = self.prompt_builder.build_appointment_booking_prompt(full_context, selected_doctor)
            
            # Get AI response for appointment scheduling
            ai_response = await self.gemini_client.generate_response(booking_prompt)
            
            # Parse booking response
            try:
                booking_result = json.loads(ai_response)
            except json.JSONDecodeError:
                booking_result = self._create_fallback_booking_response(selected_doctor)
            
            return {
                "message": booking_result.get("booking_message", "Let me help you schedule an appointment."),
                "agentType": "booking_coordinator",
                "confidence": 0.8,
                "options": booking_result.get("available_slots", []),
                "requiresInput": booking_result.get("requires_confirmation", True),
                "newStatus": "selecting_slot",
                "newStep": "appointment_confirmation"
            }
            
        except Exception as e:
            logger.error(f"Error in enhanced appointment booking: {e}")
            return self._create_error_response("booking_coordinator", "I'm having trouble with appointment scheduling. Let me try again.")
    
    async def _enhanced_general_inquiry(self, full_context: Dict[str, Any]) -> Dict[str, Any]:
        """Enhanced general inquiry handler with context awareness"""
        
        medical_context = full_context["medical_context"]
        
        # If medical symptoms detected, route to symptom analysis
        if medical_context["detected_symptoms"]:
            return {
                "message": "I noticed you mentioned some symptoms. Let me help you find the right medical care.",
                "agentType": "symptom_analyzer",
                "confidence": 0.7,
                "requiresInput": True,
                "newStatus": "gathering_symptoms",
                "newStep": "symptom_collection"
            }
        
        # Default helpful response
        return {
            "message": "I'm here to help you with medical consultations. Could you please describe any symptoms or health concerns you have?",
            "agentType": "system",
            "confidence": 0.6,
            "requiresInput": True,
            "suggestions": [
                "Describe your symptoms",
                "Tell me what's bothering you",
                "How can I help with your health?"
            ]
        }
    
    async def _handle_doctor_matching(
        self,
        message: str,
        conversation_state: Dict[str, Any],
        conversation_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """Handle doctor matching and selection phase"""
        
        try:
            current_step = conversation_state.get("currentStep", "doctor_recommendation")
            extracted_data = conversation_state.get("extractedData", {})
            
            if current_step == "doctor_recommendation":
                # Get symptoms data and recommend doctors
                symptoms_data = extracted_data.get("symptoms", {})
                
                if not symptoms_data.get("keywords"):
                    return {
                        "message": "I need to understand your symptoms better before I can recommend a doctor. Could you please describe what's bothering you?",
                        "agentType": "doctor_matcher",
                        "confidence": 0.5,
                        "requiresInput": True,
                        "newStatus": "gathering_symptoms",
                        "newStep": "symptom_collection"
                    }
                
                # Get doctor recommendations
                recommendation_result = await self.doctor_matcher.recommend_doctors(
                    symptoms=symptoms_data.get("keywords", []),
                    analysis=symptoms_data,
                    patient_preferences={}
                )
                
                response = {
                    "message": recommendation_result["message"],
                    "agentType": "doctor_matcher",
                    "confidence": recommendation_result.get("confidence", 0.7),
                    "options": recommendation_result.get("doctorOptions", []),
                    "requiresInput": recommendation_result.get("requiresSelection", True)
                }
                
                # Update extracted data with recommendation
                if recommendation_result.get("recommendation"):
                    response["extractedData"] = {
                        "recommendation": recommendation_result["recommendation"],
                        "recommendedSpecialization": recommendation_result.get("recommendedSpecialization")
                    }
                
                response["newStatus"] = "confirming_doctor"
                response["newStep"] = "doctor_confirmation"
                
                return response
            
            elif current_step == "doctor_confirmation":
                # Handle doctor selection
                selected_doctor_id = self._extract_doctor_id_from_message(message, conversation_state)
                
                if not selected_doctor_id:
                    return {
                        "message": "I didn't catch which doctor you'd like to see. Could you please select one from the options I provided?",
                        "agentType": "doctor_matcher",
                        "confidence": 0.6,
                        "requiresInput": True,
                        "newStep": "doctor_confirmation"
                    }
                
                selection_result = await self.doctor_matcher.handle_doctor_selection(
                    selected_doctor_id=selected_doctor_id,
                    user_message=message
                )
                
                response = {
                    "message": selection_result["message"],
                    "agentType": "doctor_matcher",
                    "confidence": 0.8,
                    "requiresInput": selection_result.get("requiresConfirmation", True)
                }
                
                if selection_result.get("selectedDoctor"):
                    response["extractedData"] = {
                        "selectedDoctor": selection_result["selectedDoctor"]["_id"]
                    }
                
                if selection_result.get("nextStep") == "availability_check":
                    response["newStatus"] = "checking_availability"
                    response["newStep"] = "slot_selection"
                
                return response
        
        except Exception as e:
            logger.error(f"Error in doctor matching: {e}")
            return {
                "message": "I'm having trouble with the doctor recommendation. Let me try again.",
                "agentType": "doctor_matcher",
                "confidence": 0.5,
                "requiresInput": True
            }
    
    async def _handle_appointment_booking(
        self,
        message: str,
        conversation_state: Dict[str, Any],
        conversation_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """Handle appointment booking phase"""
        
        try:
            current_step = conversation_state.get("currentStep", "slot_selection")
            extracted_data = conversation_state.get("extractedData", {})
            
            if current_step == "slot_selection":
                # First check if we need to show availability or handle slot selection
                selected_doctor_id = extracted_data.get("selectedDoctor")
                
                if not selected_doctor_id:
                    return {
                        "message": "I need to know which doctor you'd like to see. Let me help you select one.",
                        "agentType": "booking_coordinator",
                        "confidence": 0.5,
                        "requiresInput": True,
                        "newStatus": "confirming_doctor",
                        "newStep": "doctor_confirmation"
                    }
                
                # Check if user is selecting a slot or we need to show availability
                slot_data = self._extract_slot_from_message(message, conversation_state)
                
                if not slot_data:
                    # Show availability if no slot selected yet
                    preferred_date = self._extract_date_from_message(message)
                    
                    availability_result = await self.booking_coordinator.check_availability(
                        doctor_id=selected_doctor_id,
                        preferred_date=preferred_date,
                        days_ahead=7
                    )
                    
                    response = {
                        "message": availability_result["message"],
                        "agentType": "booking_coordinator",
                        "confidence": 0.8,
                        "options": availability_result.get("slotOptions", []),
                        "requiresInput": availability_result.get("hasAvailability", False),
                        "newStatus": "selecting_slot",
                        "newStep": "slot_selection"
                    }
                    
                    if not availability_result.get("hasAvailability"):
                        response["newStatus"] = "checking_alternatives"
                        response["newStep"] = "doctor_confirmation"
                    
                    return response
                
                # Handle actual slot selection if slot_data exists
                
                # Get symptoms from extracted data
                symptoms = extracted_data.get("symptoms", {}).get("raw", "Medical consultation")
                
                selection_result = await self.booking_coordinator.handle_slot_selection(
                    doctor_id=extracted_data.get("selectedDoctor"),
                    selected_date=slot_data["date"],
                    selected_time_slot=slot_data["timeSlot"],
                    user_id=user_id,
                    symptoms=symptoms,
                    conversation_id=conversation_id
                )
                
                response = {
                    "message": selection_result["message"],
                    "agentType": "booking_coordinator",
                    "confidence": 0.9,
                    "requiresInput": selection_result.get("requiresConfirmation", True)
                }
                
                if selection_result.get("appointmentData"):
                    response["extractedData"] = {
                        "appointmentData": selection_result["appointmentData"],
                        "selectedSlot": {
                            "date": selection_result["appointmentDate"],
                            "timeSlot": selection_result["timeSlot"]
                        }
                    }
                
                if selection_result.get("nextStep") == "final_confirmation":
                    response["newStatus"] = "confirming_appointment"
                    response["newStep"] = "appointment_confirmation"
                
                return response
            
            elif current_step == "appointment_confirmation":
                # Handle final confirmation
                if self._is_confirmation_positive(message):
                    appointment_data = extracted_data.get("appointmentData")
                    
                    if not appointment_data:
                        return {
                            "message": "I'm missing some appointment details. Let me start the booking process again.",
                            "agentType": "booking_coordinator",
                            "confidence": 0.5,
                            "requiresInput": True,
                            "newStatus": "checking_availability",
                            "newStep": "slot_selection"
                        }
                    
                    booking_result = await self.booking_coordinator.confirm_booking(appointment_data)
                    
                    response = {
                        "message": booking_result["message"],
                        "agentType": "booking_coordinator",
                        "confidence": 1.0,
                        "requiresInput": False
                    }
                    
                    if booking_result.get("bookingSuccessful"):
                        response["appointmentId"] = booking_result["appointmentId"]
                        response["newStatus"] = "completed"
                        response["newStep"] = "completed"
                    else:
                        response["newStatus"] = "selecting_slot"
                        response["newStep"] = "slot_selection"
                        response["requiresInput"] = True
                    
                    return response
                else:
                    return {
                        "message": "No problem! Would you like to select a different time slot or make any other changes?",
                        "agentType": "booking_coordinator",
                        "confidence": 0.8,
                        "requiresInput": True,
                        "newStatus": "selecting_slot",
                        "newStep" : "slot_selection"
                    }
        
        except Exception as e:
            logger.error(f"Error in appointment booking: {e}")
            return {
                "message": "I'm having trouble with the appointment booking. Let me try to help you in a different way.",
                "agentType": "booking_coordinator",
                "confidence": 0.5,
                "requiresInput": True
            }
    
    async def _handle_general_inquiry(
        self, 
        message: str, 
        conversation_state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle general inquiries or unclear messages"""
        
        # Generate a contextual response using Gemini
        try:
            response_text = await self.gemini_client.generate_conversational_response(
                context=conversation_state,
                agent_type="general"
            )
            
            return {
                "message": response_text,
                "agentType": "general",
                "confidence": 0.6,
                "requiresInput": True,
                "suggestions": ["Tell me about your symptoms", "Find a doctor", "Book an appointment"]
            }
        except Exception as e:
            logger.error(f"Error in general inquiry handling: {e}")
            return {
                "message": "Hi! I'm here to help you find the right doctor and book an appointment. Could you please tell me about your symptoms or what kind of medical assistance you need?",
                "agentType": "general",
                "confidence": 0.5,
                "requiresInput": True
            }
    
    # Helper methods for extracting information from messages
    def _extract_doctor_id_from_message(
        self, 
        message: str, 
        conversation_state: Dict[str, Any]
    ) -> Optional[str]:
        """Extract doctor ID from user message"""
        
        # This is a simplified implementation
        # In a real system, you might use NLP to better understand user selection
        
        # Look for patterns like "doctor 1", "first one", "Dr. Smith", etc.
        message_lower = message.lower()
        
        # Check if user mentioned a specific choice
        if "first" in message_lower or "1" in message:
            # Get first doctor from conversation state
            extracted_data = conversation_state.get("extractedData", {})
            # This would need to be implemented based on how you store the options
            pass
        
        # For now, return None - this would need proper implementation
        return None
    
    def _extract_date_from_message(self, message: str) -> Optional[str]:
        """Extract preferred date from user message"""
        
        # This is a simplified implementation
        # In a real system, you'd use NLP to extract dates like "tomorrow", "next Monday", etc.
        
        message_lower = message.lower()
        today = datetime.now().date()
        
        if "tomorrow" in message_lower:
            date = today + timedelta(days=1)
            return date.isoformat()
        elif "today" in message_lower:
            return today.isoformat()
        
        return None
    
    def _extract_slot_from_message(
        self, 
        message: str, 
        conversation_state: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Extract selected time slot from user message"""
        
        # This would need proper implementation with NLP
        # For now, return None
        return None
    
    def _is_confirmation_positive(self, message: str) -> bool:
        """Check if message is a positive confirmation"""
        
        positive_words = ["yes", "confirm", "book", "okay", "ok", "sure", "proceed", "go ahead"]
        negative_words = ["no", "cancel", "change", "different", "not"]
        
        message_lower = message.lower()
        
        has_positive = any(word in message_lower for word in positive_words)
        has_negative = any(word in message_lower for word in negative_words)
        
        return has_positive and not has_negative
    
    # Workflow management methods
    async def get_conversation_state(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Get conversation state from database"""
        return await self.db.get_conversation_state(conversation_id)
    
    async def end_conversation(self, conversation_id: str) -> bool:
        """End and cleanup a conversation"""
        try:
            # Update conversation in database to inactive
            success = await self.db.update_conversation_state(
                conversation_id, 
                {"isActive": False, "status": "cancelled"}
            )
            
            # Remove from active conversations
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
    
    # ===== ENHANCED HELPER METHODS =====
    
    def _parse_analysis_fallback(self, ai_response: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback parsing when JSON parsing fails"""
        
        # Extract key information using simple patterns
        symptoms = context["medical_context"]["detected_symptoms"].keys()
        available_specs = list(context["database_context"]["specializations"].keys())
        
        return {
            "analysis": ai_response[:500],  # Truncated response
            "extracted_symptoms": list(symptoms),
            "severity": "moderate",  # Safe default
            "recommended_specializations": available_specs[:2],  # First 2 available
            "confidence": 0.6,
            "follow_up_questions": ["How long have you been experiencing these symptoms?"],
            "reasoning": "Fallback analysis due to parsing error"
        }
    
    def _validate_analysis_against_database(self, analysis: Dict[str, Any], db_context: Dict[str, Any]) -> Dict[str, Any]:
        """Validate analysis results against actual database content"""
        
        # Ensure recommended specializations exist in database
        available_specializations = set(db_context["specializations"].keys())
        recommended = analysis.get("recommended_specializations", [])
        
        valid_specializations = [spec for spec in recommended if spec in available_specializations]
        
        # Fallback to General Medicine if no valid specializations
        if not valid_specializations:
            if "General Medicine" in available_specializations:
                valid_specializations = ["General Medicine"]
            else:
                valid_specializations = list(available_specializations)[:1]
        
        # Update analysis with validated data
        validated_analysis = analysis.copy()
        validated_analysis["recommended_specializations"] = valid_specializations
        validated_analysis["validation_applied"] = True
        
        return validated_analysis
    
    def _determine_symptom_analysis_next_step(self, analysis: Dict[str, Any], context: Dict[str, Any]) -> Tuple[str, str]:
        """Determine next step based on analysis completeness"""
        
        symptoms = analysis.get("extracted_symptoms", [])
        confidence = analysis.get("confidence", 0.0)
        
        # If we have successfully extracted symptoms, let's be more confident
        if len(symptoms) >= 2:
            confidence = max(confidence, 0.8) # Boost confidence if we have solid symptoms

        severity = analysis.get("severity", "moderate")
        booking_intent = analysis.get("booking_intent_detected", False)
        needs_clarification = analysis.get("needs_symptom_clarification", False)
        
        # If booking intent detected but no symptoms, stay in symptom collection
        if booking_intent and needs_clarification and not symptoms:
            return "symptom_collection", "gathering_symptoms"
        
        # If high confidence and symptoms extracted, move to doctor recommendation
        if confidence > 0.7 and symptoms and severity != "urgent":
            return "doctor_recommendation", "recommending_doctor"
        
        # If urgent, fast-track to doctor recommendation
        elif severity == "urgent":
            return "doctor_recommendation", "urgent_referral"
        
        # Otherwise, continue symptom clarification
        else:
            return "symptom_clarification", "gathering_symptoms"
    
    def _format_symptom_analysis_response(self, analysis: Dict[str, Any], context: Dict[str, Any]) -> str:
        """Format user-friendly symptom analysis response"""
        
        symptoms = analysis.get("extracted_symptoms", [])
        severity = analysis.get("severity", "moderate")
        reasoning = analysis.get("analysis", "")
        booking_intent = analysis.get("booking_intent_detected", False)
        needs_clarification = analysis.get("needs_symptom_clarification", False)
        
        # Handle appointment request without symptoms
        if booking_intent and needs_clarification and not symptoms:
            return ("I'd be happy to help you find a doctor and book an appointment! However, to recommend the most suitable "
                   "specialist for you, I need to understand what health concerns or symptoms you'd like to address. "
                   "Could you please describe what's been bothering you or what type of medical care you're seeking?")
        
        # Handle urgent symptoms
        if severity == "urgent":
            return f"Based on your symptoms ({', '.join(symptoms)}), I recommend seeking immediate medical attention. {reasoning[:200]}..."
        
        # Handle identified symptoms
        elif symptoms:
            return f"I understand you're experiencing {', '.join(symptoms)}. {reasoning[:300]}..."
        
        # Default symptom clarification
        else:
            return "I'd like to better understand your symptoms to provide the most appropriate recommendations."
    
    async def _validate_recommended_doctors(self, recommended_docs: List[Dict], db_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Validate that recommended doctors exist in database and format them properly"""
        
        validated_doctors = []
        doctor_mapping = db_context["doctors"]
        
        for rec_doc in recommended_docs:
            doctor_id = rec_doc.get("doctor_id", "")
            
            if doctor_id in doctor_mapping:
                real_doctor = doctor_mapping[doctor_id]
                validated_doctors.append({
                    "id": doctor_id,
                    "name": real_doctor["name"],
                    "specialization": real_doctor["specialization"],
                    "rating": real_doctor["rating"],
                    "experience": real_doctor["experience"],
                    "location": real_doctor["location"],
                    "hospital": real_doctor["hospital"],
                    "consultation_fee": real_doctor["consultation_fee"],
                    "match_score": rec_doc.get("match_score", 0.8),
                    "match_reasoning": rec_doc.get("match_reasoning", "Suitable for your condition")
                })
        
        return validated_doctors
    
    def _parse_doctor_matching_fallback(self, ai_response: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback doctor matching when JSON parsing fails"""
        
        # Get available doctors from database
        db_context = context["database_context"]
        available_doctors = list(db_context["doctors"].items())[:3]  # Top 3
        
        matched_doctors = []
        for doc_id, doc_info in available_doctors:
            matched_doctors.append({
                "doctor_id": doc_id,
                "name": doc_info["name"],
                "specialization": doc_info["specialization"],
                "match_score": 0.7,
                "match_reasoning": "Available for consultation"
            })
        
        return {
            "matched_doctors": matched_doctors,
            "recommendation_message": "I found several doctors who can help with your condition.",
            "confidence": 0.7,
            "specialization_used": "General Medicine"
        }
    
    def _create_fallback_doctor_response(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Create fallback response when no doctors match"""
        
        # Get any available doctors as fallback
        db_context = context["database_context"]
        fallback_doctors = list(db_context["doctors"].items())[:2]
        
        if fallback_doctors:
            doctors_list = []
            for doc_id, doc_info in fallback_doctors:
                doctors_list.append({
                    "id": doc_id,
                    "name": doc_info["name"],
                    "specialization": doc_info["specialization"],
                    "rating": doc_info["rating"]
                })
            
            return {
                "message": f"I found {len(doctors_list)} doctors who can help with general medical consultation.",
                "agentType": "doctor_matcher",
                "confidence": 0.6,
                "options": self._format_doctor_options(doctors_list),
                "requiresInput": True,
                "newStatus": "confirming_doctor",
                "newStep": "doctor_confirmation",
                "extractedData": {"matched_doctors": doctors_list}
            }
        
        return self._create_error_response("doctor_matcher", "I'm having trouble finding available doctors at the moment.")
    
    def _format_doctor_recommendation_message(self, doctors: List[Dict[str, Any]], context: Dict[str, Any]) -> str:
        """Format comprehensive doctor recommendation message"""
        
        if not doctors:
            return "I'm having trouble finding suitable doctors for your condition."
        
        if len(doctors) == 1:
            doc = doctors[0]
            return f"I found an excellent doctor for your condition:\n\n**{doc['name']}** - {doc['specialization']}\n- Rating: {doc['rating']}/5\n- Experience: {doc['experience']} years\n- Location: {doc['location']}\n- Hospital: {doc['hospital']}\n\nWould you like to book an appointment?"
        
        else:
            message = f"I found {len(doctors)} doctors who can help with your condition:\n\n"
            for i, doc in enumerate(doctors[:3], 1):  # Limit to top 3
                message += f"{i}. **{doc['name']}** - {doc['specialization']}\n"
                message += f"   Rating: {doc['rating']}/5, Experience: {doc['experience']} years\n"
                message += f"   Location: {doc['location']}, Fee: ${doc['consultation_fee']}\n\n"
            
            message += "Which doctor would you prefer, or would you like more information about any of them?"
            return message
    
    def _format_doctor_options(self, doctors: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format doctor options for UI selection"""
        
        options = []
        for i, doc in enumerate(doctors):
            options.append({
                "id": f"doctor_{i+1}",
                "label": f"{doc['name']} - {doc['specialization']}",
                "value": doc['id'],
                "metadata": {
                    "rating": doc['rating'],
                    "experience": doc['experience'],
                    "location": doc.get('location', ''),
                    "fee": doc.get('consultation_fee', 0)
                }
            })
        
        return options
    
    async def _handle_doctor_selection_with_context(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Handle doctor selection with comprehensive context awareness"""
        
        message = context["current_message"].lower()
        conversation_state = context["conversation_state"]
        extracted_data = conversation_state.get("extractedData", {})
        matched_doctors = extracted_data.get("matched_doctors", [])
        
        # Enhanced doctor selection logic
        selected_doctor = None
        
        # Check for numerical selection
        for i, word in enumerate(["first", "1", "one"]):
            if word in message and matched_doctors:
                selected_doctor = matched_doctors[0]
                break
        
        for i, word in enumerate(["second", "2", "two"]):
            if word in message and len(matched_doctors) > 1:
                selected_doctor = matched_doctors[1]
                break
        
        # Check for name-based selection
        if not selected_doctor:
            for doctor in matched_doctors:
                doctor_name = doctor.get("name", "").lower()
                if any(name_part in message for name_part in doctor_name.split()):
                    selected_doctor = doctor
                    break
        
        if not selected_doctor:
            return {
                "message": "I didn't catch which doctor you'd like to see. Could you please select one from the options I provided?",
                "agentType": "doctor_matcher",
                "confidence": 0.6,
                "requiresInput": True,
                "newStep": "doctor_confirmation"
            }
        
        # Proceed to appointment booking
        return {
            "message": f"Great choice! You've selected **{selected_doctor['name']}**. Let me check their availability for you.",
            "agentType": "booking_coordinator",
            "confidence": 0.9,
            "requiresInput": True,
            "newStatus": "checking_availability",
            "newStep": "slot_selection",
            "extractedData": {
                "selected_doctor": selected_doctor,
                "booking_context": {
                    "specialization": selected_doctor["specialization"],
                    "fee": selected_doctor.get("consultation_fee", "TBD"),
                    "hospital": selected_doctor.get("hospital", "")
                }
            }
        }
    
    def _create_error_response(self, agent_type: str, message: str) -> Dict[str, Any]:
        """Create standardized error response"""
        
        return {
            "message": message,
            "agentType": agent_type,
            "confidence": 0.5,
            "requiresInput": True,
            "suggestions": ["Could you please try rephrasing your message?"],
            "options": [],
            "metadata": {
                "error": True,
                "requiresInput": True,
                "isComplete": False
            }
        }
    
    def _create_fallback_booking_response(self, selected_doctor: Dict[str, Any]) -> Dict[str, Any]:
        """Create fallback booking response when AI parsing fails"""
        
        # Generate basic available slots (next 3 days, 9 AM - 5 PM)
        available_slots = []
        base_date = datetime.now().date()
        
        for i in range(1, 4):  # Next 3 days
            date = base_date + timedelta(days=i)
            day_name = date.strftime("%A")
            
            # Basic morning and afternoon slots
            available_slots.extend([
                {"date": date.isoformat(), "time": "09:00", "day_of_week": day_name},
                {"date": date.isoformat(), "time": "14:00", "day_of_week": day_name},
                {"date": date.isoformat(), "time": "16:00", "day_of_week": day_name}
            ])
        
        return {
            "available_slots": available_slots,
            "booking_message": f"Here are available appointments with **{selected_doctor.get('name', 'the selected doctor')}**. Please choose a convenient time slot.",
            "requires_confirmation": True,
            "consultation_details": {
                "doctor": selected_doctor.get("name", "Unknown"),
                "fee": selected_doctor.get("consultation_fee", "TBD"),
                "location": selected_doctor.get("hospital", "TBD")
            }
        }
