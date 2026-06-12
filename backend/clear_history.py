from app.database import SessionLocal, Base, engine
from app.models import Campaign, HistoryUnit, PlatformMetric

Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    # 1. Delete all history units
    db.query(HistoryUnit).delete()
    
    # 2. Reset all campaigns
    campaigns = db.query(Campaign).all()
    for campaign in campaigns:
        campaign.ordersSuccess = 0
        campaign.ordersFailed = 0
        campaign.ordersPending = campaign.unitsTotal
        campaign.progress = 0
        campaign.status = "Pending"
        
    db.commit()
    print("Successfully cleared all history and reset campaigns!")
except Exception as e:
    db.rollback()
    print(f"Error: {e}")
finally:
    db.close()
