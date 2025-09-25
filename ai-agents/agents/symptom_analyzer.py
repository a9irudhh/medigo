from typing import Dict, Any, List, Optional
from loguru import logger
import json
import asyncio
import concurrent.futures
import re

class SymptomAnalyzerAgent:
    """
    Agent responsible for analyzing patient symptoms and providing initial assessment
    """
    
    def __init__(self, gemini_client):
        """Initialize the symptom analyzer agent"""
        self.gemini_client = gemini_client
        self.role = "Medical Symptom Analyzer"
        self.system_prompt = """You are an experienced medical AI assistant specializing in 
                    symptom analysis and patient triage. You have extensive knowledge 
                    of medical conditions, diagnostic procedures, and patient safety 
                    protocols. Your primary responsibility is to provide accurate, 
                    helpful, and safe preliminary medical assessments while always 
                    emphasizing the importance of professional medical care when 
                    appropriate."""
        logger.info("SymptomAnalyzerAgent initialized successfully")
    
    async def _analyze_with_gemini(self, symptoms_data: str) -> Dict[str, Any]:
        """
        Analyze symptoms using Gemini AI client
        
        Args:
            symptoms_data: JSON string containing symptoms and patient info
            
        Returns:
            Analysis results from Gemini
        """
        try:
            prompt = f"""
            As a medical AI assistant, analyze the following symptoms and patient information:
            
            {symptoms_data}
            
            Please provide a structured analysis including:
            1. Severity assessment (low, moderate, high)
            2. Possible conditions or diagnoses
            3. Recommendations for next steps
            4. Whether urgent medical attention is needed
            
            Return your response as a JSON object with the following structure:
            {{
                "severity": "low|moderate|high",
                "analysis": "Your detailed analysis",
                "possible_conditions": ["condition1", "condition2"],
                "recommendations": ["recommendation1", "recommendation2"],
                "urgent": true/false
            }}
            """
            
            response = await self.gemini_client.generate_content_async(prompt)
            
            # Try to parse JSON response, fallback to structured format
            try:
                import json
                result = json.loads(response)
            except:
                # Fallback if response is not valid JSON
                result = {
                    "severity": "moderate",
                    "analysis": response,
                    "possible_conditions": ["General illness"],
                    "recommendations": ["Consult with a healthcare professional"],
                    "urgent": False
                }
            
            return result
            
        except Exception as e:
            logger.error(f"Error in Gemini analysis: {e}")
            return {
                "severity": "unknown",
                "analysis": "Unable to complete analysis with AI",
                "possible_conditions": [],
                "recommendations": ["Please consult with a healthcare professional"],
                "urgent": False
            }
    
    async def _generate_questions_with_gemini(self, context_data: str) -> List[str]:
        """
        Generate follow-up questions using Gemini AI client
        
        Args:
            context_data: JSON string containing symptoms and existing info
            
        Returns:
            List of clarifying questions
        """
        try:
            prompt = f"""
            Based on the following patient symptoms and information, generate 3-5 relevant follow-up questions 
            to better understand the patient's condition:
            
            {context_data}
            
            Generate questions that would help a doctor make a better diagnosis. Focus on:
            - Symptom duration and severity
            - Associated symptoms
            - Medical history relevance
            - Lifestyle factors
            
            Return your response as a JSON array of strings:
            ["question1", "question2", "question3"]
            """
            
            response = await self.gemini_client.generate_content_async(prompt)
            
            # Try to parse JSON response
            try:
                import json
                questions = json.loads(response)
                if isinstance(questions, list):
                    return questions
            except:
                pass
            
            # Fallback questions if parsing fails
            return [
                "When did these symptoms first appear?",
                "How would you rate the severity on a scale of 1-10?",
                "Have you taken any medications for these symptoms?",
                "Do you have any existing medical conditions?"
            ]
            
        except Exception as e:
            logger.error(f"Error generating questions with Gemini: {e}")
            return [
                "When did these symptoms first appear?",
                "How severe are your symptoms?",
                "Have you experienced these symptoms before?"
            ]
    
    async def analyze_patient_symptoms(self, symptoms: List[str], patient_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze patient symptoms and provide assessment
        
        Args:
            symptoms: List of patient symptoms
            patient_info: Patient demographic and medical history information
            
        Returns:
            Analysis results including severity, recommendations, and urgency flags
        """
        try:
            logger.info(f"Analyzing symptoms: {symptoms}")
            
            # Prepare input data
            symptoms_data = json.dumps({
                'symptoms': symptoms,
                'patient_info': patient_info
            })
            
            # Use Gemini client directly
            analysis_result = await self._analyze_with_gemini(symptoms_data)
            analysis = analysis_result
            
            logger.info(f"Symptom analysis completed: {analysis}")
            return analysis
            
        except Exception as e:
            logger.error(f"Error in symptom analysis: {e}")
            return {
                "error": str(e),
                "severity": "unknown",
                "analysis": "Unable to complete symptom analysis",
                "recommendations": ["Please consult with a healthcare professional"],
                "urgent": False
            }
    
    async def generate_follow_up_questions(self, symptoms: List[str], existing_info: Dict[str, Any]) -> List[str]:
        """
        Generate clarifying questions based on symptoms and existing information
        
        Args:
            symptoms: List of current symptoms
            existing_info: Existing patient information and responses
            
        Returns:
            List of clarifying questions
        """
        try:
            logger.info(f"Generating follow-up questions for symptoms: {symptoms}")
            
            # Prepare context data
            context_data = json.dumps({
                'symptoms': symptoms,
                'existing_info': existing_info
            })
            
            # Generate questions using Gemini
            questions_result = await self._generate_questions_with_gemini(context_data)
            questions = questions_result
            
            logger.info(f"Generated {len(questions)} clarifying questions")
            return questions
            
        except Exception as e:
            logger.error(f"Error generating follow-up questions: {e}")
            return [
                "When did these symptoms first appear?",
                "How would you rate the severity of your symptoms?",
                "Have you experienced these symptoms before?"
            ]
    
    def get_agent_description(self) -> Dict[str, str]:
        """Get agent description for debugging"""
        return {
            "role": self.agent.role,
            "goal": self.agent.goal,
            "backstory": self.agent.backstory,
            "tools": [tool.name for tool in self.agent.tools] if hasattr(self.agent, 'tools') else []
        }
    
    async def analyze_message(self, message: str, conversation_history: List[Dict[str, Any]], existing_symptoms: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze a user's message for symptoms and return a structured response for the workflow.
        """
        try:
            logger.info(f"Analyzing message: {message}")
            # Improved symptom extraction using simple keyword matching
            symptom_keywords = [
                "headache", "fever", "cough", "pain", "cold", "sore throat", "nausea", "vomiting", "fatigue", "dizziness", "chills", "body ache", "diarrhea", "rash", "shortness of breath"
            ]
            symptoms = [kw for kw in symptom_keywords if kw in message.lower()]
            if not symptoms:
                symptoms = [message]  # fallback to raw message
            patient_info = existing_symptoms if existing_symptoms else {}
            analysis = await self.analyze_patient_symptoms(symptoms, patient_info)
            # Generate follow-up questions
            questions = await self.generate_follow_up_questions(symptoms, patient_info)
            # Compose response
            return {
                "message": analysis.get("analysis", "Based on your symptoms, I recommend consulting a doctor."),
                "confidence": 0.8,
                "questions": questions,
                "needsMoreInfo": True,
                "extractedData": {
                    "symptoms": {"raw": message, "keywords": symptoms}
                },
                "nextStep": "doctor_recommendation"
            }
        except Exception as e:
            logger.error(f"Error in analyze_message: {e}")
            return {
                "message": "I'm sorry, I couldn't analyze your symptoms. Please try again.",
                "confidence": 0.5,
                "questions": [],
                "needsMoreInfo": True,
                "extractedData": {},
                "nextStep": "symptom_clarification"
            }
