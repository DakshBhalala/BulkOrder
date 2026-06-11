import asyncio
import random
import string
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Campaign, Alert, HistoryUnit, PlatformMetric
from app.services.bot import run_bot_campaign

active_bot_tasks = set()

async def simulation_engine():
    """Background task to simulate campaign progression."""
    while True:
        await asyncio.sleep(2)
        
        db: Session = SessionLocal()
        try:
            campaigns = db.query(Campaign).filter(Campaign.status == "Processing").all()
            for campaign in campaigns:
                # Spawn the actual Playwright bot instead of faking it!
                # Ensure we don't spawn multiple bots for the same campaign while it's processing
                if campaign.id not in active_bot_tasks:
                    active_bot_tasks.add(campaign.id)
                    task = asyncio.create_task(run_bot_campaign(campaign.id))
                    task.add_done_callback(lambda t, cid=campaign.id: active_bot_tasks.discard(cid))
                    
            db.commit()
            
            # Keep history and alerts from growing infinitely
            history_count = db.query(HistoryUnit).count()
            if history_count > 100:
                oldest = db.query(HistoryUnit).order_by(HistoryUnit.date.asc()).limit(history_count - 100).all()
                for o in oldest:
                    db.delete(o)
                    
            alert_count = db.query(Alert).count()
            if alert_count > 50:
                oldest_alerts = db.query(Alert).order_by(Alert.created.asc()).limit(alert_count - 50).all()
                for o in oldest_alerts:
                    db.delete(o)
                    
            db.commit()
            
        except Exception as e:
            print(f"Simulation engine error: {e}")
        finally:
            db.close()
