from app.database import SessionLocal
from app.models import Campaign, HistoryUnit

db = SessionLocal()

try:
    # Delete all history units
    db.query(HistoryUnit).delete()
    
    # Delete all campaigns
    db.query(Campaign).delete()
    
    db.commit()
    print("Successfully deleted all campaigns and history units!")
except Exception as e:
    db.rollback()
    print(f"Error: {e}")
finally:
    db.close()
