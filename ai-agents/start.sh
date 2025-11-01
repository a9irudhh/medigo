#!/bin/bash

# MediGo AI Agent Service Startup Script

echo "🚀 Starting MediGo AI Agent Service..."

# Check if Python 3.8+ is available
python_version=$(python3 --version 2>&1 | awk '{print $2}' | cut -d. -f1,2)
required_version="3.8"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]; then
    echo "❌ Error: Python 3.8+ is required. Current version: $python_version"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "✏️  Please edit .env file with your actual configuration values."
    echo "🔑 Don't forget to add your GEMINI_API_KEY!"
fi

# Run database connectivity test
echo "🔍 Testing database connectivity..."
python3 -c "
import asyncio
import os
from dotenv import load_dotenv
load_dotenv()
from utils.database import DatabaseManager

async def test_db():
    try:
        db = DatabaseManager()
        await db.connect()
        success = await db.test_connection()
        await db.disconnect()
        if success:
            print('✅ Database connection successful')
            return True
        else:
            print('❌ Database connection failed')
            return False
    except Exception as e:
        print(f'❌ Database connection error: {e}')
        return False

result = asyncio.run(test_db())
exit(0 if result else 1)
"

if [ $? -ne 0 ]; then
    echo "⚠️  Database connection failed. Service will start but some features may not work."
fi

# Start the service
echo "🎯 Starting AI Agent Service on port 8001..."
echo "📡 Service will be available at: http://localhost:8001"
echo "📋 Health check endpoint: http://localhost:8001/health"
echo "🔧 API documentation: http://localhost:8001/docs"
echo ""
echo "💡 To stop the service, press Ctrl+C"
echo ""

uvicorn main:app --host 0.0.0.0 --port 8001 --reload --log-level info
