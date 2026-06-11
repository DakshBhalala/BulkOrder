import asyncio
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import TrackingEvent, HistoryUnit
from datetime import datetime
import random

async def tracking_webhook_simulator():
    """Background task to simulate logistic tracking state progressions."""
    while True:
        await asyncio.sleep(15) # Run every 15 seconds
        
        db: Session = SessionLocal()
        try:
            # Find all active history units that have an AWB
            active_orders = db.query(HistoryUnit).filter(HistoryUnit.tracking != "—", HistoryUnit.status != "Delivered").all()
            
            locations = ["Delhi Hub", "Mumbai Facility", "Bangalore Sorting Center", "Local Distribution", "Out for Delivery"]
            statuses = ["Manifested", "In Transit", "Reached Destination", "Out for Delivery", "Delivered"]
            
            for order in active_orders:
                # Randomly progress
                if random.random() > 0.7:
                    current_events = db.query(TrackingEvent).filter(TrackingEvent.awb == order.tracking).all()
                    current_len = len(current_events)
                    
                    if current_len < len(statuses):
                        new_status = statuses[current_len]
                        new_location = locations[current_len]
                        
                        event = TrackingEvent(
                            awb=order.tracking,
                            status=new_status,
                            location=new_location,
                            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        )
                        db.add(event)
                        
                        if new_status == "Delivered":
                            order.status = "Delivered"
                            order.deliveryDate = datetime.now().strftime("%B %d, %Y")
                            order.otp = str(random.randint(1000, 9999))
                            
            db.commit()
            
        except Exception as e:
            print(f"Tracking Webhook Error: {e}")
        finally:
            db.close()
