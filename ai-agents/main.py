from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any
import os
from dotenv import load_dotenv
import asyncio
from loguru import logger
import sys

# Import our enhanced workflows
from workflows.medical_consultation_workflow import EnhancedMedicalConsultationWorkflow
from utils.database import DatabaseManager
from utils.gemini_client import GeminiClient

# Load environment variables
load_dotenv()

print("GEMINI_API_KEY:", os.getenv("GEMINI_API_KEY"))
# Configure logging
logger.remove()
logger.add(sys.stderr, level="INFO", format="{time} - {level} - {message}")

# Initialize FastAPI app
app = FastAPI(
    title="MediGo AI Agent Service",
    description="Intelligent medical appointment booking system",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Initialize services
db_manager = None
gemini_client = None
workflow = None

# Pydantic models
class ChatRequest(BaseModel):
    conversationId: str = Field(..., description="Unique conversation identifier")
    message: str = Field(..., description="User's message")
    userId: str = Field(..., description="User ID from authentication")
    conversationState: Dict[str, Any] = Field(default={}, description="Current conversation state")

class ChatResponse(BaseModel):
    message: str = Field(..., description="Agent's response message")
    agentType: str = Field(..., description="Type of agent that responded")
    confidence: float = Field(default=0.0, description="Confidence level of the response")
    suggestions: List[str] = Field(default=[], description="Suggested responses or actions")
    options: List[Dict[str, Any]] = Field(default=[], description="Available options for user")
    requiresInput: bool = Field(default=True, description="Whether user input is required")
    newStatus: Optional[str] = Field(None, description="New conversation status")
    newStep: Optional[str] = Field(None, description="New conversation step")
    extractedData: Optional[Dict[str, Any]] = Field(None, description="Extracted data from conversation")
    aiContext: Optional[Dict[str, Any]] = Field(None, description="Updated AI context")
    appointmentId: Optional[str] = Field(None, description="Created appointment ID if booking completed")

class HealthResponse(BaseModel):
    status: str
    services: Dict[str, str]
    version: str

# Authentication dependency
async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify the Bearer token"""
    expected_token = os.getenv("AI_AGENT_SERVICE_TOKEN", "medigo-agent-token")
    
    if credentials.credentials != expected_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    global db_manager, gemini_client, workflow
    
    try:
        logger.info("Initializing AI Agent Service...")
        
        # Initialize database manager
        db_manager = DatabaseManager()
        await db_manager.connect()
        
        # Initialize Gemini client
        gemini_client = GeminiClient()
        
        # Initialize simplified workflow
        workflow = EnhancedMedicalConsultationWorkflow(db_manager, gemini_client)
        
        logger.info("Simple Medical Workflow initialized - No hallucinations mode activated")
        
    except Exception as e:
        logger.error(f"Failed to initialize AI Agent Service: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    global db_manager
    
    try:
        if db_manager:
            await db_manager.disconnect()
        logger.info("AI Agent Service shutdown complete")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    try:
        # Check database connection
        db_status = "connected" if db_manager and db_manager.is_connected() else "disconnected"
        
        # Check Gemini API
        gemini_status = "available" if gemini_client and gemini_client.is_available() else "unavailable"
        
        return HealthResponse(
            status="healthy" if db_status == "connected" and gemini_status == "available" else "degraded",
            services={
                "database": db_status,
                "gemini_api": gemini_status,
                "workflow": "active" if workflow else "inactive"
            },
            version="1.0.0"
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail="Health check failed")

@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_agents(
    request: ChatRequest,
    token: str = Depends(verify_token)
):
    """Main chat endpoint that processes user messages through the AI workflow"""
    try:
        logger.info(f"Processing chat request for user {request.userId}, conversation {request.conversationId}")
        
        if not workflow:
            raise HTTPException(status_code=503, detail="AI workflow not initialized")
        
        # Process the message through the workflow
        response = await workflow.process_message(
            conversation_id=request.conversationId,
            user_id=request.userId,
            message=request.message,
            conversation_state=request.conversationState
        )
        
        logger.info(f"Chat response generated for conversation {request.conversationId}")
        
        return ChatResponse(**response)
        
    except Exception as e:
        logger.error(f"Error processing chat request: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error processing message: {str(e)}"
        )

@app.get("/api/conversation/{conversation_id}/state")
async def get_conversation_state(
    conversation_id: str,
    token: str = Depends(verify_token)
):
    """Get the current state of a conversation"""
    try:
        if not workflow:
            raise HTTPException(status_code=503, detail="AI workflow not initialized")
        
        state = await workflow.get_conversation_state(conversation_id)
        
        if not state:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        return {"conversationId": conversation_id, "state": state}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting conversation state: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/conversation/{conversation_id}")
async def end_conversation(
    conversation_id: str,
    token: str = Depends(verify_token)
):
    """End and cleanup a conversation"""
    try:
        if not workflow:
            raise HTTPException(status_code=503, detail="AI workflow not initialized")
        
        success = await workflow.end_conversation(conversation_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        return {"message": "Conversation ended successfully", "conversationId": conversation_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ending conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stats")
async def get_service_stats(token: str = Depends(verify_token)):
    """Get service statistics"""
    try:
        stats = {
            "active_conversations": await workflow.get_active_conversations_count() if workflow else 0,
            "total_processed_messages": await workflow.get_total_messages_count() if workflow else 0,
            "service_uptime": "Available",  # You can implement actual uptime tracking
            "database_status": "connected" if db_manager and db_manager.is_connected() else "disconnected"
        }
        
        return stats
        
    except Exception as e:
        logger.error(f"Error getting service stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )
