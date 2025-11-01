"""
Database seeding script to populate MongoDB with doctors and specializations
"""
import asyncio
import json
import os
from pathlib import Path
from dotenv import load_dotenv
from loguru import logger
from utils.database import DatabaseManager
from datetime import datetime

# Load environment variables
load_dotenv()

async def seed_doctors():
    """Load doctors from doctors.json into MongoDB"""
    
    # Initialize database
    db_manager = DatabaseManager()
    await db_manager.connect()
    
    try:
        # Read doctors.json
        doctors_file = Path(__file__).parent / "doctors.json"
        
        with open(doctors_file, 'r') as f:
            doctors_data = json.load(f)
        
        logger.info(f"Loaded {len(doctors_data)} doctors from JSON file")
        
        # Get database reference
        db = db_manager.db
        doctors_collection = db.doctors
        
        # Check if doctors already exist
        existing_count = await doctors_collection.count_documents({})
        
        if existing_count > 0:
            logger.warning(f"Database already contains {existing_count} doctors")
            response = input("Do you want to delete existing doctors and reseed? (yes/no): ")
            if response.lower() == 'yes':
                await doctors_collection.delete_many({})
                logger.info("Cleared existing doctors")
            else:
                logger.info("Skipping doctor seeding")
                await db_manager.disconnect()
                return
        
        # Transform and insert doctors
        inserted_count = 0
        for doctor_data in doctors_data:
            # Transform availability from simple list to detailed schedule
            availability_schedule = []
            for day in doctor_data.get("availability", []):
                availability_schedule.append({
                    "day": day,
                    "slots": [
                        {"startTime": "09:00", "endTime": "10:00"},
                        {"startTime": "10:00", "endTime": "11:00"},
                        {"startTime": "11:00", "endTime": "12:00"},
                        {"startTime": "14:00", "endTime": "15:00"},
                        {"startTime": "15:00", "endTime": "16:00"},
                        {"startTime": "16:00", "endTime": "17:00"}
                    ]
                })
            
            # Prepare doctor document for MongoDB
            doctor_doc = {
                "name": doctor_data["name"],
                "specialization": doctor_data["specialization"],
                "location": doctor_data.get("location", ""),
                "rating": doctor_data.get("rating", 4.5),
                "experience": doctor_data.get("experience", 10),
                "availability": availability_schedule,
                "consultationFee": doctor_data.get("consultation_fee", 150),
                "phone": doctor_data.get("phone", ""),
                "email": doctor_data.get("email", ""),
                "hospital": doctor_data.get("hospital", ""),
                "qualifications": doctor_data.get("qualifications", []),
                "languages": doctor_data.get("languages", ["English"]),
                "isActive": True,
                "createdAt": datetime.now(),
                "updatedAt": datetime.now()
            }
            
            # Insert doctor
            result = await doctors_collection.insert_one(doctor_doc)
            inserted_count += 1
            logger.info(f"Inserted: {doctor_data['name']} - {doctor_data['specialization']}")
        
        logger.success(f"Successfully inserted {inserted_count} doctors into database")
        
    except Exception as e:
        logger.error(f"Error seeding doctors: {e}")
        raise
    finally:
        await db_manager.disconnect()

async def seed_specializations():
    """Create specializations collection with common symptoms"""
    
    db_manager = DatabaseManager()
    await db_manager.connect()
    
    try:
        db = db_manager.db
        specializations_collection = db.specializations
        
        # Check if specializations already exist
        existing_count = await specializations_collection.count_documents({})
        
        if existing_count > 0:
            logger.info(f"Specializations already exist ({existing_count} records)")
            await db_manager.disconnect()
            return
        
        # Define specializations with common symptoms
        specializations_data = [
            {
                "name": "Cardiology",
                "description": "Heart and cardiovascular system",
                "commonSymptoms": {
                    "keywords": ["chest pain", "heart", "palpitations", "shortness of breath", "high blood pressure", "irregular heartbeat"],
                    "weight": 10
                },
                "isActive": True
            },
            {
                "name": "Dermatology",
                "description": "Skin, hair, and nails",
                "commonSymptoms": {
                    "keywords": ["rash", "skin", "acne", "eczema", "psoriasis", "itching", "moles", "hair loss"],
                    "weight": 8
                },
                "isActive": True
            },
            {
                "name": "Pediatrics",
                "description": "Children's health",
                "commonSymptoms": {
                    "keywords": ["child", "baby", "infant", "fever", "vaccination", "growth", "development"],
                    "weight": 9
                },
                "isActive": True
            },
            {
                "name": "Orthopedics",
                "description": "Bones, joints, and muscles",
                "commonSymptoms": {
                    "keywords": ["joint pain", "bone", "fracture", "sprain", "arthritis", "back pain", "knee pain", "shoulder pain"],
                    "weight": 9
                },
                "isActive": True
            },
            {
                "name": "Neurology",
                "description": "Brain and nervous system",
                "commonSymptoms": {
                    "keywords": ["headache", "migraine", "seizure", "dizziness", "numbness", "tremor", "memory loss", "stroke"],
                    "weight": 10
                },
                "isActive": True
            },
            {
                "name": "Gastroenterology",
                "description": "Digestive system",
                "commonSymptoms": {
                    "keywords": ["stomach pain", "nausea", "diarrhea", "constipation", "bloating", "acid reflux", "vomiting"],
                    "weight": 8
                },
                "isActive": True
            },
            {
                "name": "Gynecology",
                "description": "Women's reproductive health",
                "commonSymptoms": {
                    "keywords": ["menstrual", "period", "pregnancy", "pelvic pain", "vaginal", "breast", "menopause"],
                    "weight": 9
                },
                "isActive": True
            },
            {
                "name": "Psychiatry",
                "description": "Mental health",
                "commonSymptoms": {
                    "keywords": ["depression", "anxiety", "stress", "insomnia", "mood", "panic", "mental health"],
                    "weight": 8
                },
                "isActive": True
            },
            {
                "name": "Endocrinology",
                "description": "Hormones and metabolism",
                "commonSymptoms": {
                    "keywords": ["diabetes", "thyroid", "weight", "hormone", "metabolism", "fatigue"],
                    "weight": 8
                },
                "isActive": True
            },
            {
                "name": "Ophthalmology",
                "description": "Eyes and vision",
                "commonSymptoms": {
                    "keywords": ["eye", "vision", "blurred vision", "eye pain", "cataracts", "glaucoma", "redness"],
                    "weight": 8
                },
                "isActive": True
            },
            {
                "name": "General Medicine",
                "description": "General health and wellness",
                "commonSymptoms": {
                    "keywords": ["fever", "cold", "flu", "cough", "general checkup", "fatigue", "weakness"],
                    "weight": 7
                },
                "isActive": True
            }
        ]
        
        # Insert specializations
        result = await specializations_collection.insert_many(specializations_data)
        logger.success(f"Successfully inserted {len(result.inserted_ids)} specializations")
        
    except Exception as e:
        logger.error(f"Error seeding specializations: {e}")
        raise
    finally:
        await db_manager.disconnect()

async def main():
    """Main seeding function"""
    logger.info("Starting database seeding...")
    
    try:
        # Seed specializations first
        await seed_specializations()
        
        # Then seed doctors
        await seed_doctors()
        
        logger.success("Database seeding completed successfully!")
        
    except Exception as e:
        logger.error(f"Database seeding failed: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())
