from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from utils.gemini_client import GeminiClient
from utils.database import DatabaseManager
from loguru import logger

class BookingCoordinatorAgent:
    """Agent responsible for handling appointment booking and scheduling"""
    
    def __init__(self, gemini_client: GeminiClient, db_manager: DatabaseManager):
        self.gemini_client = gemini_client
        self.db_manager = db_manager
        
    async def check_doctor_availability(
        self, 
        doctor_id: str,
        preferred_date: Optional[str] = None,
        days_ahead: int = 7
    ) -> Dict[str, Any]:
        """Check available slots for a specific doctor"""
        
        try:
            # Get doctor information first
            doctor = await self.db_manager.get_doctor_ById(doctor_id)
            if not doctor:
                return {
                    "success": False,
                    "error": "Doctor not found",
                    "response_message": "I couldn't find that doctor. Please select another doctor from the list."
                }
            
            # Determine date range to check
            if preferred_date:
                try:
                    start_date = datetime.strptime(preferred_date, "%Y-%m-%d")
                except ValueError:
                    start_date = datetime.now() + timedelta(days=1)
            else:
                start_date = datetime.now() + timedelta(days=1)
            
            available_slots = []
            
            # Check availability for the next 'days_ahead' days
            for i in range(days_ahead):
                check_date = start_date + timedelta(days=i)
                
                # Skip past dates
                if check_date.date() < datetime.now().date():
                    continue
                
                slots = await self.db_manager.get_doctor_availability(doctor_id, check_date)
                
                if slots:
                    available_slots.append({
                        "date": check_date.strftime("%Y-%m-%d"),
                        "day_name": check_date.strftime("%A"),
                        "slots": slots
                    })
            
            if available_slots:
                response_message = f"**Dr. {doctor['name']}** has the following available slots:\n\n"
                
                for day_info in available_slots[:5]:  # Show max 5 days
                    response_message += f"**{day_info['day_name']}, {day_info['date']}:**\n"
                    
                    for slot in day_info['slots'][:4]:  # Show max 4 slots per day
                        response_message += f"• {slot['startTime']} - {slot['endTime']}\n"
                    
                    if len(day_info['slots']) > 4:
                        response_message += f"• ... and {len(day_info['slots']) - 4} more slots\n"
                    
                    response_message += "\n"
                
                response_message += "Please let me know your preferred date and time, and I'll book the appointment for you."
                
                return {
                    "success": True,
                    "doctor": doctor,
                    "available_slots": available_slots,
                    "response_message": response_message,
                    "next_step": "slot_selection"
                }
            else:
                return {
                    "success": False,
                    "doctor": doctor,
                    "available_slots": [],
                    "response_message": f"I'm sorry, but Dr. {doctor['name']} doesn't have any available slots in the next {days_ahead} days. Would you like me to check other doctors?",
                    "next_step": "alternative_options"
                }
            
        except Exception as e:
            logger.error(f"Error checking doctor availability: {e}")
            return {
                "success": False,
                "error": str(e),
                "response_message": "I'm having trouble checking availability right now. Please try again.",
                "next_step": "error"
            }

    async def handle_slot_selection(
        self, 
        doctor_id: str,
        selected_date: str,
        selected_time_slot: Dict[str, str],
        user_id: str,
        symptoms: str,
        conversation_id: str
    ) -> Dict[str, Any]:
        """Handle user's appointment slot selection"""
        
        try:
            # Parse the selected date
            appointment_date = datetime.fromisoformat(selected_date)
            
            # Check if the slot is still available
            conflict = await self.db_manager.check_appointment_conflict(
                doctor_id,
                appointment_date,
                selected_time_slot["startTime"],
                selected_time_slot["endTime"]
            )
            
            if conflict:
                return {
                    "message": "I'm sorry, but that time slot has just been booked by another patient. Let me show you other available options.",
                    "slotUnavailable": True,
                    "nextStep": "slot_selection"
                }
            
            # Get doctor and user information
            doctor = await self.db_manager.get_doctor_ById(doctor_id)
            user = await self.db_manager.get_user_by_id(user_id)
            
            if not doctor or not user:
                return {
                    "message": "There was an issue retrieving the necessary information. Please try again.",
                    "nextStep": "slot_selection",
                    "error": "Doctor or user not found"
                }
            
            # Generate confirmation message
            confirmation_message = self._generate_confirmation_message(
                doctor, appointment_date, selected_time_slot
            )
            
            # Prepare appointment data
            appointment_data = {
                "patient": user_id,
                "doctor": doctor_id,
                "appointmentDate": appointment_date,
                "timeSlot": selected_time_slot,
                "symptoms": symptoms,
                "consultationFee": doctor.get("consultationFee", 0),
                "conversationId": conversation_id,
                "status": "scheduled"
            }
            
            return {
                "message": confirmation_message,
                "appointmentData": appointment_data,
                "doctor": doctor,
                "appointmentDate": appointment_date.isoformat(),
                "timeSlot": selected_time_slot,
                "nextStep": "final_confirmation",
                "requiresConfirmation": True
            }
        
        except Exception as e:
            logger.error(f"Error handling slot selection: {e}")
            return {
                "message": "There was an error processing your selection. Please try again.",
                "nextStep": "slot_selection",
                "error": str(e)
            }
    
    async def confirm_booking(
        self, 
        appointment_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Confirm and create the appointment booking"""
        
        try:
            # Create the appointment
            appointment_id = await self.db_manager.create_appointment(appointment_data)
            
            if appointment_id:
                # Generate success message
                success_message = self._generate_booking_success_message(
                    appointment_data, appointment_id
                )
                
                return {
                    "message": success_message,
                    "appointmentId": appointment_id,
                    "bookingSuccessful": True,
                    "nextStep": "completed",
                    "appointmentDetails": {
                        "id": appointment_id,
                        "doctorName": appointment_data.get("doctorName", ""),
                        "hospital": appointment_data.get("hospital", ""),
                        "date": appointment_data["appointmentDate"].strftime("%B %d, %Y") if isinstance(appointment_data["appointmentDate"], datetime) else appointment_data["appointmentDate"],
                        "time": f"{appointment_data['timeSlot']['startTime']} - {appointment_data['timeSlot']['endTime']}",
                        "fee": appointment_data.get("consultationFee", 0)
                    }
                }
            else:
                return {
                    "message": "I'm sorry, there was an issue confirming your appointment. This might be due to a scheduling conflict or technical issue. Would you like to try a different time slot?",
                    "bookingSuccessful": False,
                    "nextStep": "slot_selection"
                }
        
        except Exception as e:
            logger.error(f"Error confirming booking: {e}")
            return {
                "message": "There was an error confirming your appointment. Please try again or contact support for assistance.",
                "bookingSuccessful": False,
                "nextStep": "slot_selection",
                "error": str(e)
            }
    
    def _generate_availability_message(self, available_dates: List[Dict[str, Any]]) -> str:
        """Generate a message about available appointment slots"""
        
        if not available_dates:
            return "No available slots found."
        
        if len(available_dates) == 1:
            date_info = available_dates[0]
            date_str = datetime.fromisoformat(date_info["date"]).strftime("%B %d, %Y")
            slot_count = len(date_info["slots"])
            
            return f"Great! I found {slot_count} available slot{'s' if slot_count > 1 else ''} on {date_info['dayName']}, {date_str}. Please select your preferred time:"
        
        total_slots = sum(len(date["slots"]) for date in available_dates)
        return f"Excellent! I found {total_slots} available appointment slots across {len(available_dates)} days. Here are your options:"
    
    def _prepare_slot_options(self, available_dates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Prepare slot options for user selection"""
        options = []
        
        for date_info in available_dates:
            date_obj = datetime.fromisoformat(date_info["date"])
            date_str = date_obj.strftime("%B %d")
            day_name = date_info["dayName"]
            
            for slot in date_info["slots"]:
                # Convert 24h format to 12h format for display
                start_time = self._format_time_12h(slot["startTime"])
                end_time = self._format_time_12h(slot["endTime"])
                
                option = {
                    "id": f"{date_info['date']}_{slot['startTime']}_{slot['endTime']}",
                    "label": f"{day_name}, {date_str} at {start_time}",
                    "value": {
                        "date": date_info["date"],
                        "timeSlot": {
                            "startTime": slot["startTime"],
                            "endTime": slot["endTime"]
                        }
                    },
                    "description": f"{start_time} - {end_time}"
                }
                options.append(option)
        
        return options[:10]  # Limit to 10 options to avoid overwhelming the user
    
    def _format_time_12h(self, time_24h: str) -> str:
        """Convert 24h format to 12h format"""
        try:
            time_obj = datetime.strptime(time_24h, "%H:%M")
            return time_obj.strftime("%I:%M %p").lstrip("0")
        except:
            return time_24h
    
    def _generate_confirmation_message(
        self, 
        doctor: Dict[str, Any], 
        appointment_date: datetime,
        time_slot: Dict[str, str]
    ) -> str:
        """Generate appointment confirmation message"""
        
        doctor_name = doctor.get("name", "the doctor")
        hospital = doctor.get("hospital", "the hospital")
        fee = doctor.get("consultationFee", 0)
        
        date_str = appointment_date.strftime("%A, %B %d, %Y")
        start_time = self._format_time_12h(time_slot["startTime"])
        end_time = self._format_time_12h(time_slot["endTime"])
        
        message = f"Perfect! Here are your appointment details:\n\n"
        message += f"👨‍⚕️ Doctor: Dr. {doctor_name}\n"
        message += f"🏥 Hospital: {hospital}\n"
        message += f"📅 Date: {date_str}\n"
        message += f"🕐 Time: {start_time} - {end_time}\n"
        
        if fee > 0:
            message += f"💰 Consultation Fee: ₹{fee}\n"
        
        message += f"\nWould you like me to confirm and book this appointment for you?"
        
        return message
    
    def _generate_booking_success_message(
        self, 
        appointment_data: Dict[str, Any],
        appointment_id: str
    ) -> str:
        """Generate booking success message"""
        
        message = "🎉 Great news! Your appointment has been successfully booked!\n\n"
        message += f"📋 Appointment ID: {appointment_id}\n"
        message += f"👨‍⚕️ Doctor: Dr. {appointment_data.get('doctorName', 'N/A')}\n"
        message += f"🏥 Hospital: {appointment_data.get('hospital', 'N/A')}\n"
        
        if isinstance(appointment_data["appointmentDate"], datetime):
            date_str = appointment_data["appointmentDate"].strftime("%A, %B %d, %Y")
        else:
            date_str = appointment_data["appointmentDate"]
        
        message += f"📅 Date: {date_str}\n"
        
        start_time = self._format_time_12h(appointment_data["timeSlot"]["startTime"])
        end_time = self._format_time_12h(appointment_data["timeSlot"]["endTime"])
        message += f"🕐 Time: {start_time} - {end_time}\n"
        
        if appointment_data.get("consultationFee", 0) > 0:
            message += f"💰 Fee: ₹{appointment_data['consultationFee']}\n"
        
        message += "\n📱 You will receive a confirmation message with all the details shortly."
        message += "\n\n✅ Your appointment is confirmed. Is there anything else I can help you with?"
        
        return message
    
    async def get_alternative_slots(
        self, 
        doctor_id: str,
        original_date: str,
        days_to_check: int = 14
    ) -> List[Dict[str, Any]]:
        """Get alternative appointment slots when preferred date is not available"""
        
        try:
            start_date = datetime.fromisoformat(original_date).date()
            available_dates = []
            
            for i in range(1, days_to_check + 1):
                check_date = start_date + timedelta(days=i)
                if check_date.weekday() < 5:  # Only weekdays
                    slots = await self.db_manager.get_doctor_availability(
                        doctor_id, 
                        datetime.combine(check_date, datetime.min.time())
                    )
                    
                    if slots:
                        available_dates.append({
                            "date": check_date.isoformat(),
                            "dayName": check_date.strftime("%A"),
                            "slots": slots[:3]  # Limit to 3 slots per day
                        })
                        
                        if len(available_dates) >= 5:  # Limit to 5 alternative dates
                            break
            
            return available_dates
            
        except Exception as e:
            logger.error(f"Error getting alternative slots: {e}")
            return []
