import google.generativeai as genai
import os
from typing import Optional, Dict, Any, List
from loguru import logger
import asyncio
import json
from tenacity import retry, stop_after_attempt, wait_exponential
import time

class GeminiClient:
    """Client for interacting with Google's Gemini API"""
    
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        
        genai.configure(api_key=self.api_key)
        
        # Initialize the model
        self.model_name = "gemini-2.5-flash"
        try:
            self.model = genai.GenerativeModel(self.model_name)
            self._available = True
            logger.info(f"Gemini client initialized with model: {self.model_name}")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini model: {e}")
            self._available = False
    
    def is_available(self) -> bool:
        """Check if the Gemini API is available"""
        return self._available
    
    async def generate_content_async(self, prompt: str) -> str:
        """Alias for generate_response for backward compatibility"""
        return await self.generate_response(prompt)
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def generate_response(
        self, 
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        json_mode: bool = False
    ) -> str:
        """Generate a response using Gemini"""
        try:
            # Prepare the full prompt
            full_prompt = prompt
            if system_instruction:
                full_prompt = f"System: {system_instruction}\n\nHuman: {prompt}"
            
            # Configure generation parameters
            generation_config = genai.types.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens or 2048,
            )
            
            # Add JSON instruction if needed
            if json_mode:
                full_prompt += "\n\nPlease respond with valid JSON only."
            
            # Generate response
            response = await asyncio.to_thread(
                self.model.generate_content,
                full_prompt,
                generation_config=generation_config
            )
            
            if not response.text:
                raise Exception("Empty response from Gemini")
            
            return response.text.strip()
            
        except Exception as e:
            logger.error(f"Error generating response with Gemini: {e}")
            raise
    
    async def analyze_symptoms(
        self, 
        symptoms: str, 
        conversation_history: List[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Analyze symptoms and extract structured information"""
        
        system_instruction = """You are a medical symptom analyzer. Your job is to analyze patient symptoms and extract structured information.

You should:
1. Identify key symptoms and body parts affected
2. Assess severity level (mild, moderate, severe, urgent)
3. Determine if more information is needed
4. Extract duration and frequency if mentioned
5. Identify urgency keywords

Always respond with valid JSON in this exact format:
{
    "symptoms": {
        "keywords": ["list", "of", "symptom", "keywords"],
        "bodyParts": ["list", "of", "affected", "body", "parts"],
        "severity": "mild|moderate|severe|urgent",
        "duration": "extracted duration or null",
        "frequency": "extracted frequency or null"
    },
    "needsMoreInfo": true/false,
    "clarifyingQuestions": ["question1", "question2"],
    "urgencyLevel": "low|medium|high|urgent",
    "confidence": 0.0-1.0
}"""
        
        # Build context from conversation history
        context = ""
        if conversation_history:
            context = "\nConversation history:\n"
            for msg in conversation_history[-5:]:  # Last 5 messages for context
                context += f"{msg.get('sender', 'unknown')}: {msg.get('content', '')}\n"
        
        prompt = f"""Analyze these symptoms: "{symptoms}"{context}

Extract structured information about the symptoms."""
        
        try:
            response = await self.generate_response(
                prompt=prompt,
                system_instruction=system_instruction,
                temperature=0.3,
                json_mode=True
            )
            
            # Parse JSON response
            analysis = json.loads(response)
            return analysis
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse symptom analysis JSON: {e}")
            # Return fallback structure
            return {
                "symptoms": {
                    "keywords": symptoms.lower().split(),
                    "bodyParts": [],
                    "severity": "moderate",
                    "duration": None,
                    "frequency": None
                },
                "needsMoreInfo": True,
                "clarifyingQuestions": ["Could you provide more details about your symptoms?"],
                "urgencyLevel": "medium",
                "confidence": 0.5
            }
        except Exception as e:
            logger.error(f"Error in symptom analysis: {e}")
            raise
    
    async def generate_clarifying_questions(
        self, 
        symptoms: str, 
        existing_info: Dict[str, Any]
    ) -> List[str]:
        """Generate clarifying questions based on symptoms"""
        
        system_instruction = """You are a medical assistant generating clarifying questions about patient symptoms.

Generate 2-3 specific, relevant questions to better understand the patient's condition.
Questions should be:
- Clear and easy to understand
- Medically relevant
- Help determine severity or urgency
- Not repetitive of information already known

Respond with a JSON array of questions."""
        
        prompt = f"""Patient symptoms: "{symptoms}"

Existing information: {json.dumps(existing_info, indent=2)}

Generate clarifying questions to better understand the patient's condition."""
        
        try:
            response = await self.generate_response(
                prompt=prompt,
                system_instruction=system_instruction,
                temperature=0.5,
                json_mode=True
            )
            
            questions = json.loads(response)
            if isinstance(questions, list):
                return questions[:3]  # Limit to 3 questions
            else:
                return ["Could you tell me more about when these symptoms started?"]
                
        except Exception as e:
            logger.error(f"Error generating clarifying questions: {e}")
            return ["Could you provide more details about your symptoms?"]
    
    async def recommend_specialization(
        self, 
        symptoms_data: Dict[str, Any],
        available_specializations: List[str]
    ) -> Dict[str, Any]:
        """Recommend medical specialization based on symptoms"""
        
        system_instruction = """You are a medical specialist recommender. Based on patient symptoms, recommend the most appropriate medical specialization.

Consider:
- Primary symptoms and body parts affected
- Severity and urgency
- Available specializations

Respond with valid JSON:
{
    "primary": {
        "specialization": "exact match from available list",
        "confidence": 0.0-1.0,
        "reasoning": "brief explanation"
    },
    "alternatives": [
        {
            "specialization": "alternative option",
            "confidence": 0.0-1.0,
            "reasoning": "brief explanation"
        }
    ],
    "urgencyAssessment": "low|medium|high|urgent"
}"""
        
        prompt = f"""Patient symptoms data:
{json.dumps(symptoms_data, indent=2)}

Available specializations:
{', '.join(available_specializations)}

Recommend the most appropriate specialization(s)."""
        
        try:
            response = await self.generate_response(
                prompt=prompt,
                system_instruction=system_instruction,
                temperature=0.3,
                json_mode=True
            )
            
            recommendation = json.loads(response)
            return recommendation
            
        except Exception as e:
            logger.error(f"Error in specialization recommendation: {e}")
            # Return fallback recommendation
            return {
                "primary": {
                    "specialization": "General Medicine",
                    "confidence": 0.6,
                    "reasoning": "General consultation recommended when specific specialization cannot be determined"
                },
                "alternatives": [],
                "urgencyAssessment": "medium"
            }
    
    async def generate_conversational_response(
        self, 
        context: Dict[str, Any],
        agent_type: str = "general"
    ) -> str:
        """Generate a natural conversational response"""
        
        agent_personalities = {
            "symptom_analyzer": "You are a caring medical assistant focused on understanding patient symptoms. Be empathetic, ask relevant questions, and provide reassurance while gathering information.",
            "doctor_matcher": "You are a knowledgeable medical coordinator who explains doctor recommendations clearly and helps patients understand why a particular specialist is suggested.",
            "booking_coordinator": "You are an efficient appointment scheduler who helps patients find convenient appointment times and confirms booking details clearly."
        }
        
        system_instruction = agent_personalities.get(agent_type, agent_personalities["symptom_analyzer"])
        system_instruction += "\n\nKeep responses conversational, helpful, and under 150 words. Be professional but warm."
        
        prompt = f"""Context: {json.dumps(context, indent=2)}

Generate an appropriate conversational response based on the current situation."""
        
        try:
            response = await self.generate_response(
                prompt=prompt,
                system_instruction=system_instruction,
                temperature=0.7
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating conversational response: {e}")
            return "I understand you're looking for medical assistance. Could you please tell me more about how you're feeling?"

    async def test_connection(self) -> bool:
        """Test the connection to Gemini API"""
        try:
            response = await self.generate_response(
                prompt="Say 'Hello' if you can hear me.",
                temperature=0.1
            )
            return "hello" in response.lower()
        except Exception as e:
            logger.error(f"Gemini connection test failed: {e}")
            return False
