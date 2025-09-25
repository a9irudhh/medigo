from typing import Dict, Any, List, Optional, Tuple
from loguru import logger
from datetime import datetime, timedelta
import asyncio
import json
import re

class MedicalContextManager:
    """
    Comprehensive context management system that maintains rich conversation context,
    medical history, and decision-making rationale throughout the consultation process.
    """
    
    def __init__(self, database_manager):
        self.db = database_manager
        
    async def build_conversation_context(
        self, 
        conversation_id: str, 
        user_id: str,
        current_message: str,
        conversation_state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Build comprehensive context including:
        - Full conversation history with medical relevance analysis
        - Available doctors and specializations from database
        - Patient profile and preferences
        - Medical terminology and symptom mappings
        """
        
        # Get conversation history
        conversation_data = await self.db.get_conversation_state(conversation_id)
        message_history = conversation_data.get("messages", []) if conversation_data else []
        
        # Build medical conversation summary
        medical_context = await self._extract_medical_context(message_history, current_message)
        
        # Get real-time database context
        database_context = await self._get_database_context()
        
        # Get patient context
        patient_context = await self._get_patient_context(user_id)
        
        return {
            "conversation_id": conversation_id,
            "user_id": user_id,
            "current_message": current_message,
            "conversation_state": conversation_state,
            "medical_context": medical_context,
            "database_context": database_context,
            "patient_context": patient_context,
            "timestamp": datetime.now().isoformat(),
            "step_history": self._build_step_history(conversation_state)
        }
    
    async def _extract_medical_context(self, message_history: List[Dict], current_message: str) -> Dict[str, Any]:
        """Extract and analyze medical information from conversation history"""
        
        all_messages = [msg.get("content", "") for msg in message_history] + [current_message]
        combined_text = " ".join(all_messages).lower()
        
        # Comprehensive symptom patterns - expanded to catch more symptoms
        symptom_patterns = {
            "pain": r'\b(?:pain|ache|aching|hurt|hurting|sore|soreness|discomfort|uncomfortable)\b',
            "fever": r'\b(?:fever|temperature|hot|burning up|chills|cold|shivering)\b',
            "headache": r'\b(?:headache|head pain|migraine|headache|throbbing head)\b',
            "nausea": r'\b(?:nausea|nauseous|sick|vomiting|throw up|queasy|dizzy|dizziness|vertigo)\b',
            "fatigue": r'\b(?:tired|exhausted|fatigue|weak|weakness|tiredness|lethargic|sluggish)\b',
            "breathing": r'\b(?:breath|breathing|shortness|wheeze|wheezing|cough|coughing|asthma|respiratory)\b',
            "chest": r'\b(?:chest|heart|cardiac|pressure|tightness|palpitations)\b',
            "stomach": r'\b(?:stomach|belly|abdomen|gut|digestive|indigestion|bloating|cramp|cramps)\b',
            "skin": r'\b(?:skin|rash|itch|itchy|red|swollen|inflammation|allergy|allergic)\b',
            "cough": r'\b(?:cough|coughing|dry cough|wet cough|productive cough)\b',
            "sore throat": r'\b(?:throat|sore throat|throat pain|swollen throat)\b',
            "runny nose": r'\b(?:nose|runny nose|nasal|congestion|stuffy nose|sinus)\b',
            "muscle pain": r'\b(?:muscle|muscles|joint|joints|arthritis|back pain|neck pain)\b',
            "sleep": r'\b(?:sleep|insomnia|sleepless|restless|nightmares)\b',
            "mood": r'\b(?:anxiety|anxious|depression|depressed|stress|stressed|worried|mood)\b',
            "urinary": r'\b(?:urine|urinary|bladder|kidney|frequent urination|painful urination)\b',
            "bowel": r'\b(?:bowel|constipation|diarrhea|stool|poop|bathroom|toilet)\b',
            "vision": r'\b(?:eye|eyes|vision|blurry|sight|seeing|blind)\b',
            "hearing": r'\b(?:ear|ears|hearing|deaf|ringing|tinnitus)\b'
        }
        
        detected_symptoms = {}
        for symptom, pattern in symptom_patterns.items():
            matches = re.findall(pattern, combined_text)
            if matches:
                detected_symptoms[symptom] = {
                    "mentioned": True,
                    "frequency": len(matches),
                    "context": matches
                }
        
        # Also check for direct symptom mentions that might not match patterns
        direct_symptoms = []
        symptom_keywords = [
            "headache", "fever", "cough", "cold", "flu", "pain", "ache", "sore", "tired", 
            "nausea", "dizzy", "dizziness", "stomach", "chest", "breath", "breathing",
            "rash", "itch", "swollen", "infection", "ill", "sick", "hurt", "burning",
            "pressure", "tightness", "cramp", "spasm", "inflammation", "allergy"
        ]
        
        for keyword in symptom_keywords:
            if keyword in combined_text:
                if keyword not in detected_symptoms:
                    detected_symptoms[keyword] = {
                        "mentioned": True,
                        "frequency": combined_text.count(keyword),
                        "context": [keyword]
                    }
        
        # Extract booking/appointment intent
        booking_patterns = {
            "doctor_request": r'\b(?:doctor|physician|specialist|recommend|find|see|consult)\b',
            "appointment_request": r'\b(?:appointment|book|schedule|slot|make|set up|tomorrow|today|next)\b',
            "time_preference": r'\b(?:tomorrow|today|thursday|friday|monday|tuesday|wednesday|saturday|sunday|morning|afternoon|evening|asap|soon|urgent|emergency)\b'
        }
        
        booking_intent = {}
        for intent_type, pattern in booking_patterns.items():
            matches = re.findall(pattern, combined_text)
            if matches:
                booking_intent[intent_type] = {
                    "mentioned": True,
                    "frequency": len(matches),
                    "context": matches
                }
        
        # Extract temporal information
        time_patterns = {
            "duration": r'\b(?:for|since|past|last)\s+(\d+)\s+(day|days|week|weeks|month|months|hour|hours)\b',
            "onset": r'\b(?:started|began|first|initially|when)\s+(yesterday|today|(\d+)\s+(day|days|week|weeks|hour|hours)\s+ago)\b'
        }
        
        temporal_info = {}
        for time_type, pattern in time_patterns.items():
            matches = re.findall(pattern, combined_text)
            if matches:
                temporal_info[time_type] = matches
        
        return {
            "detected_symptoms": detected_symptoms,
            "booking_intent": booking_intent,
            "temporal_information": temporal_info,
            "message_count": len(message_history) + 1,
            "conversation_length": len(combined_text),
            "medical_terms_mentioned": len(detected_symptoms),
            "full_conversation_text": combined_text[:1000]  # Truncated for context
        }
    
    async def _get_database_context(self) -> Dict[str, Any]:
        """Get comprehensive database context with real doctor and specialization data"""
        
        db = self.db.db
        
        # Get all specializations with their keywords
        specializations = await db.specializations.find({}).to_list(length=None)
        specialization_mapping = {}
        for spec in specializations:
            specialization_mapping[spec["name"]] = {
                "description": spec.get("description", ""),
                "keywords": spec.get("keywords", []),
                "common_symptoms": spec.get("common_symptoms", [])
            }
        
        # Get all available doctors
        doctors = await db.doctors.find({}).to_list(length=None)
        doctor_mapping = {}
        specialization_doctors = {}
        
        for doc in doctors:
            doc_id = str(doc["_id"])
            specialization = doc.get("specialization", "General Medicine")
            
            doctor_mapping[doc_id] = {
                "name": doc.get("name", ""),
                "specialization": specialization,
                "location": doc.get("location", ""),
                "rating": doc.get("rating", 0),
                "experience": doc.get("experience", 0),
                "availability": doc.get("availability", []),
                "consultation_fee": doc.get("consultation_fee", 0),
                "hospital": doc.get("hospital", ""),
                "languages": doc.get("languages", [])
            }
            
            if specialization not in specialization_doctors:
                specialization_doctors[specialization] = []
            specialization_doctors[specialization].append(doctor_mapping[doc_id])
        
        return {
            "specializations": specialization_mapping,
            "doctors": doctor_mapping,
            "doctors_by_specialization": specialization_doctors,
            "total_doctors": len(doctors),
            "available_specializations": list(specialization_mapping.keys())
        }
    
    async def _get_patient_context(self, user_id: str) -> Dict[str, Any]:
        """Get patient-specific context and preferences"""
        
        # Get user profile from database
        db = self.db.db
        user = await db.users.find_one({"_id": user_id})
        
        if not user:
            return {"new_patient": True}
        
        # Get conversation history for this user
        user_conversations = await db.conversations.find({"user": user_id}).to_list(length=None)
        
        return {
            "user_id": user_id,
            "name": user.get("name", ""),
            "age": user.get("age"),
            "location": user.get("location", ""),
            "previous_consultations": len(user_conversations),
            "consultation_history": [conv.get("extractedData", {}) for conv in user_conversations[-3:]],  # Last 3
            "preferences": user.get("preferences", {}),
            "new_patient": False
        }
    
    def _build_step_history(self, conversation_state: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Build history of conversation steps and decisions"""
        
        current_step = conversation_state.get("currentStep", "initial_greeting")
        current_status = conversation_state.get("status", "started")
        
        step_sequence = [
            "initial_greeting",
            "symptom_collection", 
            "symptom_clarification",
            "doctor_recommendation",
            "doctor_confirmation",
            "slot_selection",
            "appointment_confirmation",
            "completed"
        ]
        
        current_index = step_sequence.index(current_step) if current_step in step_sequence else 0
        
        return {
            "current_step": current_step,
            "current_status": current_status,
            "steps_completed": step_sequence[:current_index],
            "current_step_index": current_index,
            "remaining_steps": step_sequence[current_index + 1:],
            "progress_percentage": round((current_index / len(step_sequence)) * 100, 1)
        }

class EnhancedPromptBuilder:
    """
    Builds rich, context-aware prompts that eliminate hallucinations by providing
    comprehensive, factual information to the AI agents.
    """
    
    def __init__(self):
        self.base_medical_knowledge = self._load_medical_knowledge()
    
    def build_symptom_analysis_prompt(self, context: Dict[str, Any]) -> str:
        """Build comprehensive prompt for symptom analysis"""
        
        medical_ctx = context["medical_context"]
        db_ctx = context["database_context"]
        patient_ctx = context["patient_context"]
        
        prompt = f"""
You are an expert medical symptom analyzer with access to comprehensive patient context and medical databases.

PATIENT CONTEXT:
- Patient ID: {context['user_id']}
- Current Message: "{context['current_message']}"
- Conversation History: {medical_ctx['message_count']} messages
- Previously Mentioned Symptoms: {', '.join(medical_ctx['detected_symptoms'].keys()) if medical_ctx['detected_symptoms'] else 'None'}
- Temporal Information: {medical_ctx.get('temporal_information', 'None provided')}

AVAILABLE SPECIALIZATIONS IN DATABASE:
{self._format_specializations_for_prompt(db_ctx['specializations'])}

MEDICAL ANALYSIS REQUIREMENTS:
1. Analyze the current message in context of the full conversation
2. Extract specific symptoms, duration, severity, and associated factors
3. Map symptoms to appropriate medical specializations using ONLY the specializations available in our database
4. Provide severity assessment (mild, moderate, severe, urgent)
5. Generate relevant follow-up questions to gather missing critical information

CONVERSATION CONTEXT:
- Full conversation so far: "{medical_ctx['full_conversation_text']}"
- Detected medical terms: {list(medical_ctx['detected_symptoms'].keys())}
- Booking intent detected: {list(medical_ctx['booking_intent'].keys()) if medical_ctx['booking_intent'] else 'None'}

SPECIAL CASE - APPOINTMENT REQUEST WITHOUT SYMPTOMS:
If the user is requesting a doctor or appointment but hasn't described symptoms:
- Set "needs_symptom_clarification": true
- Ask for symptoms before proceeding with doctor recommendations
- Provide helpful prompts to gather medical information

RESPONSE FORMAT:
Provide a JSON response with:
{{
    "analysis": "Detailed medical analysis of symptoms in context",
    "extracted_symptoms": ["symptom1", "symptom2"],
    "severity": "mild|moderate|severe|urgent",
    "recommended_specializations": ["spec1", "spec2"],
    "confidence": 0.0-1.0,
    "follow_up_questions": ["question1", "question2"],
    "reasoning": "Step-by-step reasoning for recommendations",
    "needs_symptom_clarification": true/false,
    "booking_intent_detected": true/false
}}

CRITICAL: Only recommend specializations that exist in our database. Never hallucinate or invent medical information.
"""
        return prompt
    
    def build_doctor_matching_prompt(self, context: Dict[str, Any], symptoms_analysis: Dict[str, Any]) -> str:
        """Build comprehensive prompt for doctor matching"""
        
        db_ctx = context["database_context"]
        patient_ctx = context["patient_context"]
        
        # Get relevant doctors for the recommended specializations
        relevant_specializations = symptoms_analysis.get("recommended_specializations", [])
        available_doctors = []
        
        for spec in relevant_specializations:
            if spec in db_ctx["doctors_by_specialization"]:
                available_doctors.extend(db_ctx["doctors_by_specialization"][spec])
        
        # Fallback to general medicine if no specific specialists found
        if not available_doctors and "General Medicine" in db_ctx["doctors_by_specialization"]:
            available_doctors = db_ctx["doctors_by_specialization"]["General Medicine"]
        
        prompt = f"""
You are an expert healthcare coordinator matching patients with the most suitable doctors.

PATIENT CONTEXT:
- Patient ID: {context['user_id']}
- Location: {patient_ctx.get('location', 'Not specified')}
- Previous consultations: {patient_ctx.get('previous_consultations', 0)}
- Patient preferences: {patient_ctx.get('preferences', {})}

SYMPTOM ANALYSIS RESULTS:
- Symptoms: {symptoms_analysis.get('extracted_symptoms', [])}
- Severity: {symptoms_analysis.get('severity', 'unknown')}
- Recommended specializations: {symptoms_analysis.get('recommended_specializations', [])}
- Analysis confidence: {symptoms_analysis.get('confidence', 0)}

AVAILABLE DOCTORS IN DATABASE:
{self._format_doctors_for_prompt(available_doctors)}

MATCHING CRITERIA:
1. Specialization match with symptom analysis
2. Doctor rating and experience
3. Location proximity (if patient location available)
4. Language compatibility
5. Consultation fees

RESPONSE FORMAT:
Provide a JSON response with:
{{
    "matched_doctors": [
        {{
            "doctor_id": "actual_mongodb_id",
            "name": "doctor_name",
            "specialization": "specialization",
            "match_score": 0.0-1.0,
            "match_reasoning": "why this doctor is suitable"
        }}
    ],
    "recommendation_message": "User-friendly message explaining the recommendations",
    "confidence": 0.0-1.0,
    "specialization_used": "specialization_that_was_matched"
}}

CRITICAL: 
- Only use doctors that exist in the provided database
- Use actual MongoDB IDs for doctor_id
- Never invent or hallucinate doctor information
- Match doctors based on actual specializations and patient needs
"""
        return prompt
    
    def build_appointment_booking_prompt(self, context: Dict[str, Any], selected_doctor: Dict[str, Any]) -> str:
        """Build comprehensive prompt for appointment booking"""
        
        patient_ctx = context["patient_context"]
        
        prompt = f"""
You are an expert appointment scheduling coordinator.

PATIENT CONTEXT:
- Patient ID: {context['user_id']}
- Current message: "{context['current_message']}"
- Patient name: {patient_ctx.get('name', 'Not provided')}

SELECTED DOCTOR:
- Name: {selected_doctor.get('name', 'Unknown')}
- Specialization: {selected_doctor.get('specialization', 'Unknown')}
- Hospital: {selected_doctor.get('hospital', 'Unknown')}
- Consultation fee: ${selected_doctor.get('consultation_fee', 0)}
- Available days: {selected_doctor.get('availability', [])}
- Languages: {selected_doctor.get('languages', [])}

BOOKING REQUIREMENTS:
1. Extract date/time preferences from patient message
2. Check doctor availability against their schedule
3. Generate available time slots for the next 7 days
4. Handle appointment confirmation and details

RESPONSE FORMAT:
Provide a JSON response with:
{{
    "available_slots": [
        {{
            "date": "YYYY-MM-DD",
            "time": "HH:MM",
            "day_of_week": "Monday"
        }}
    ],
    "booking_message": "User-friendly scheduling message",
    "requires_confirmation": true/false,
    "consultation_details": {{
        "doctor": "doctor_name",
        "fee": "consultation_fee",
        "location": "hospital_name"
    }}
}}

CRITICAL: Only provide real availability based on doctor's schedule, never hallucinate time slots.
"""
        return prompt
    
    def _format_specializations_for_prompt(self, specializations: Dict[str, Any]) -> str:
        """Format specializations for prompt context"""
        formatted = []
        for spec_name, spec_info in specializations.items():
            formatted.append(f"- {spec_name}: {spec_info['description']}")
            formatted.append(f"  Keywords: {', '.join(spec_info['keywords'])}")
            formatted.append(f"  Common symptoms: {', '.join(spec_info['common_symptoms'])}")
        return "\n".join(formatted)
    
    def _format_doctors_for_prompt(self, doctors: List[Dict[str, Any]]) -> str:
        """Format doctors for prompt context"""
        if not doctors:
            return "No doctors available for the recommended specializations."
        
        formatted = []
        for doctor in doctors:
            formatted.append(f"- {doctor['name']} ({doctor['specialization']})")
            formatted.append(f"  Rating: {doctor['rating']}/5, Experience: {doctor['experience']} years")
            formatted.append(f"  Location: {doctor['location']}, Hospital: {doctor['hospital']}")
            formatted.append(f"  Fee: ${doctor['consultation_fee']}, Languages: {', '.join(doctor['languages'])}")
        return "\n".join(formatted)
    
    def _load_medical_knowledge(self) -> Dict[str, Any]:
        """Load base medical knowledge to prevent hallucinations"""
        return {
            "severity_indicators": {
                "urgent": ["severe pain", "difficulty breathing", "chest pain", "loss of consciousness"],
                "severe": ["high fever", "persistent symptoms", "worsening condition"],
                "moderate": ["moderate pain", "recurring symptoms", "affecting daily activities"],
                "mild": ["minor discomfort", "occasional symptoms", "manageable condition"]
            },
            "red_flags": [
                "chest pain",
                "difficulty breathing", 
                "severe headache",
                "loss of consciousness",
                "severe bleeding",
                "high fever with confusion"
            ]
        }
