from typing import Dict, Any, List, Optional
from loguru import logger
import json
import asyncio
import concurrent.futures

# --- Dummy Implementations for Tool Functions ---
# In a real-world scenario, these would interact with a database, an API, or the Gemini client.

def recommend_specializations(symptoms_data: str) -> str:
    """Enhanced function to recommend medical specializations based on symptoms."""
    logger.info(f"Dummy Tool: Recommending specializations for: {symptoms_data}")
    data = json.loads(symptoms_data)
    symptoms = data.get("symptoms", [])
    analysis = data.get("analysis", {})
    
    # Convert symptoms to lowercase for matching
    symptoms_str = " ".join(symptoms).lower()
    
    # Enhanced symptom-to-specialization mapping
    if any(word in symptoms_str for word in ["chest pain", "heart", "cardiac", "palpitations"]):
        return json.dumps(["Cardiology", "Emergency Medicine"])
    elif any(word in symptoms_str for word in ["headache", "fever", "body ache", "cold", "flu"]):
        return json.dumps(["General Medicine"])
    elif any(word in symptoms_str for word in ["cough", "breathing", "lungs", "chest congestion"]):
        return json.dumps(["General Medicine", "Pulmonology"])
    elif any(word in symptoms_str for word in ["stomach", "nausea", "vomiting", "diarrhea"]):
        return json.dumps(["General Medicine", "Gastroenterology"])
    elif any(word in symptoms_str for word in ["skin", "rash", "itching", "allergy"]):
        return json.dumps(["Dermatology", "General Medicine"])
    elif any(word in symptoms_str for word in ["joint pain", "muscle pain", "back pain"]):
        return json.dumps(["Orthopedics", "General Medicine"])
    else:
        # Default to General Medicine for common symptoms
        return json.dumps(["General Medicine"])

def find_doctors_by_specialization(specialization_query: str) -> str:
    """Dummy function to find doctors in a database."""
    logger.info(f"Dummy Tool: Finding doctors for query: {specialization_query}")
    query = json.loads(specialization_query)
    specializations = query.get('specializations', [])
    
    # Enhanced dummy doctor database
    all_doctors = {
        "Cardiology": [
            {
                "id": "doc_001", 
                "name": "Dr. Sarah Johnson", 
                "specialization": "Cardiology",
                "experience": "12 years",
                "rating": 4.8,
                "hospital": "Apollo Hospital",
                "available_slots": ["14:00", "14:30", "15:00", "15:30", "16:00"]
            }
        ],
        "General Medicine": [
            {
                "id": "doc_002", 
                "name": "Dr. Michael Chen", 
                "specialization": "General Medicine",
                "experience": "8 years",
                "rating": 4.7,
                "hospital": "City General Hospital",
                "available_slots": ["09:00", "09:30", "10:00", "10:30", "11:00"]
            },
            {
                "id": "doc_003", 
                "name": "Dr. Priya Sharma", 
                "specialization": "General Medicine",
                "experience": "15 years",
                "rating": 4.9,
                "hospital": "Max Healthcare",
                "available_slots": ["16:00", "16:30", "17:00", "17:30"]
            }
        ],
        "Pulmonology": [
            {
                "id": "doc_004", 
                "name": "Dr. Robert Wilson", 
                "specialization": "Pulmonology",
                "experience": "10 years",
                "rating": 4.6,
                "hospital": "Fortis Hospital",
                "available_slots": ["11:00", "11:30", "12:00", "15:00"]
            }
        ],
        "Emergency Medicine": [
            {
                "id": "doc_005", 
                "name": "Dr. Emily Davis", 
                "specialization": "Emergency Medicine",
                "experience": "6 years",
                "rating": 4.5,
                "hospital": "AIIMS",
                "available_slots": ["24x7"]
            }
        ]
    }
    
    found_docs = []
    for spec in specializations:
        if spec in all_doctors:
            found_docs.extend(all_doctors[spec])
    
    # If no specific specialization found, return general medicine doctors
    if not found_docs:
        found_docs = all_doctors["General Medicine"]
    
    return json.dumps(found_docs)

def get_doctor_availability(doctor_query: str) -> str:
    """Dummy function to get a doctor's availability."""
    logger.info(f"Dummy Tool: Getting availability for query: {doctor_query}")
    query = json.loads(doctor_query)
    doctor_id = query.get('doctor_id')
    # Simulate checking a calendar
    return json.dumps({
        "doctor_id": doctor_id,
        "name": "Dr. Evelyn Reed",
        "available_slots": ["2025-10-01T10:00:00", "2025-10-01T14:30:00"]
    })

# --- Refactored Agent Class ---

class DoctorMatcherAgent:
    """
    Agent responsible for matching patients with appropriate doctors using a direct LLM client.
    """
    
    def __init__(self, database_manager, gemini_client):
        """Initialize the doctor matcher agent"""
        self.database_manager = database_manager
        self.gemini_client = gemini_client
        self.role = "Doctor Matching Specialist"
        self.system_prompt = """You are a specialized healthcare coordinator with extensive 
                    knowledge of medical specializations, doctor expertise areas, 
                    and healthcare system navigation. You excel at understanding 
                    patient needs and matching them with the most appropriate 
                    healthcare providers while considering factors like location, 
                    availability, and specific medical requirements. Your goal is to
                    match patients with the most suitable doctors based on their 
                    medical needs, specialization requirements, location preferences, 
                    and appointment availability while ensuring optimal care quality."""
        logger.info("DoctorMatcherAgent initialized successfully")
    
    async def find_suitable_doctors(self, symptoms: List[str], analysis: Dict[str, Any], 
                                   patient_preferences: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Find doctors suitable for a patient's condition using database.
        
        Args:
            symptoms: List of patient symptoms.
            analysis: Symptom analysis results.
            patient_preferences: Patient preferences (location, availability, etc.).
            
        Returns:
            A list of suitable doctors with their information.
        """
        try:
            logger.info(f"Finding suitable doctors for symptoms: {symptoms}")
            
            # Step 1: Get specialization recommendations
            symptoms_data = json.dumps({'symptoms': symptoms, 'analysis': analysis})
            specializations_result = recommend_specializations(symptoms_data)
            specializations = json.loads(specializations_result)
            
            logger.info(f"Recommended specializations: {specializations}")
            
            # Step 2: Query database for doctors
            db = self.database_manager.database
            doctors_collection = db.doctors
            
            # Build database query
            query = {
                "is_available": True,
                "specialization": {"$in": specializations}
            }
            
            # Add location filter if specified
            location = patient_preferences.get('location', '')
            if location:
                query["$or"] = [
                    {"address.city": {"$regex": location, "$options": "i"}},
                    {"address.state": {"$regex": location, "$options": "i"}},
                    {"hospital": {"$regex": location, "$options": "i"}}
                ]
            
            # Find doctors and sort by rating
            doctors_cursor = doctors_collection.find(query).sort("rating", -1).limit(10)
            doctors = await doctors_cursor.to_list(length=None)
            
            # Convert ObjectId to string and format response
            formatted_doctors = []
            for doc in doctors:
                doc['id'] = str(doc['_id'])
                del doc['_id']  # Remove ObjectId
                formatted_doctors.append(doc)
            
            logger.info(f"Found {len(formatted_doctors)} suitable doctors from database")
            return formatted_doctors
            
        except Exception as e:
            logger.error(f"Error finding suitable doctors from database: {e}")
            # Fallback to dummy data if database fails
            query = json.dumps({
                'specializations': specializations,
                'location': patient_preferences.get('location', ''),
                'availability': patient_preferences.get('availability', {})
            })
            
            doctors_result = find_doctors_by_specialization(query)
            doctors = json.loads(doctors_result)
            
            logger.info(f"Using fallback data: Found {len(doctors)} doctors")
            return doctors
    
    async def get_doctor_details_with_availability(self, doctor_id: str, 
                                                  date_preferences: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get detailed doctor information, including availability.
        
        Args:
            doctor_id: The doctor's unique identifier.
            date_preferences: Date range and time preferences.
            
        Returns:
            Doctor details with availability information.
        """
        try:
            logger.info(f"Getting doctor details and availability for: {doctor_id}")
            
            doctor_query = json.dumps({'doctor_id': doctor_id, 'date_range': date_preferences})
            availability_result = get_doctor_availability(doctor_query)
            availability = json.loads(availability_result)
            
            logger.info(f"Retrieved availability for doctor {doctor_id}")
            return availability
            
        except Exception as e:
            logger.error(f"Error getting doctor details: {e}")
            return {}
    
    async def recommend_best_matches(self, symptoms: List[str], analysis: Dict[str, Any],
                                   patient_preferences: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Get top doctor recommendations with ranking.
        
        Args:
            symptoms: Patient symptoms.
            analysis: Symptom analysis.
            patient_preferences: Patient preferences and requirements.
            
        Returns:
            A ranked list of the best doctor matches.
        """
        try:
            logger.info("Generating best doctor matches")
            
            # Get suitable doctors
            doctors = await self.find_suitable_doctors(symptoms, analysis, patient_preferences)
            
            if not doctors:
                logger.warning("No doctors found for the given criteria")
                return []
            
            # In a full implementation, ranking logic would be applied here based on
            # specialization match, location, availability, reviews, experience, etc.
            # This could involve another call to the Gemini client for sophisticated ranking.
            
            ranked_doctors = doctors[:5]  # Return up to the top 5 matches
            logger.info(f"Returning top {len(ranked_doctors)} doctor recommendations")
            
            return ranked_doctors
            
        except Exception as e:
            logger.error(f"Error generating best matches: {e}")
            return []
    
    async def recommend_doctors(self, symptoms: List[str], analysis: Dict[str, Any], patient_preferences: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Main method called by workflow to recommend doctors for symptoms
        
        Args:
            symptoms: List of patient symptoms
            analysis: Symptom analysis results
            patient_preferences: Optional patient preferences
            
        Returns:
            Structured response with doctor recommendations
        """
        try:
            logger.info(f"Recommending doctors for symptoms: {symptoms}")
            
            if patient_preferences is None:
                patient_preferences = {}
            
            # Get doctor recommendations
            doctors = await self.recommend_best_matches(symptoms, analysis, patient_preferences)
            
            if not doctors:
                return {
                    "message": "I'm having trouble finding available doctors right now. Let me try to help you in another way.",
                    "confidence": 0.3,
                    "doctors": [],
                    "nextStep": "fallback_recommendation",
                    "needsMoreInfo": False
                }
            
            # Format response for workflow
            doctor_list = []
            for doc in doctors:
                doctor_info = {
                    "id": doc.get("id", "unknown"),
                    "name": doc.get("name", "Unknown Doctor"),
                    "specialization": doc.get("specialization", "General Medicine"),
                    "experience": doc.get("experience", "Unknown"),
                    "rating": doc.get("rating", 4.5),
                    "available_slots": doc.get("available_slots", [])
                }
                doctor_list.append(doctor_info)
            
            # Generate response message
            if len(doctor_list) == 1:
                message = f"I found a suitable doctor for your condition:\n\n{doctor_list[0]['name']} - {doctor_list[0]['specialization']}\n\nWould you like me to help you book an appointment?"
            else:
                message = f"I found {len(doctor_list)} doctors who can help with your condition:\n\n"
                for i, doc in enumerate(doctor_list[:3], 1):  # Show top 3
                    message += f"{i}. {doc['name']} - {doc['specialization']}\n"
                message += "\nWhich doctor would you prefer, or would you like more information about any of them?"
            
            return {
                "message": message,
                "confidence": 0.8,
                "doctors": doctor_list,
                "nextStep": "doctor_selection",
                "needsMoreInfo": True
            }
            
        except Exception as e:
            logger.error(f"Error in recommend_doctors: {e}")
            return {
                "message": "I'm having trouble with the doctor recommendation. Let me try again.",
                "confidence": 0.5,
                "doctors": [],
                "nextStep": "retry_recommendation",
                "needsMoreInfo": False
            }
    
    def get_agent_description(self) -> Dict[str, str]:
        """Get the agent's description for debugging or logging."""
        return {
            "role": self.role,
            "system_prompt": self.system_prompt
        }