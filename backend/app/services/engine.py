import asyncio
import random
import string
from datetime import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Campaign, Alert, HistoryUnit, PlatformMetric
from app.services.bot import run_bot_campaign

import math

active_bot_tasks_count = {}

async def simulation_engine():
    """Background task to simulate campaign progression."""
    while True:
        await asyncio.sleep(2)
        
        db: Session = SessionLocal()
        try:
            campaigns = db.query(Campaign).filter(Campaign.status == "Processing").all()
            for campaign in campaigns:
                units_completed = campaign.unitsCompleted or 0
                units_total = campaign.unitsTotal or 1
                quantity_per_order = campaign.quantityPerOrder or 1
                
                if units_completed >= units_total:
                    campaign.status = "Completed"
                    db.commit()
                    continue
                    
                total_orders_needed = math.ceil((units_total - units_completed) / quantity_per_order)
                
                # How many tasks are already running for this campaign?
                running_tasks = active_bot_tasks_count.get(campaign.id, 0)
                
                # Spawn new tasks up to the total needed
                orders_to_spawn = total_orders_needed - running_tasks
                
                if orders_to_spawn > 0:
                    for _ in range(orders_to_spawn):
                        active_bot_tasks_count[campaign.id] = active_bot_tasks_count.get(campaign.id, 0) + 1
                        
                        task = asyncio.create_task(run_bot_campaign(campaign.id))
                        
                        def task_done_callback(t, cid=campaign.id):
                            active_bot_tasks_count[cid] -= 1
                            if active_bot_tasks_count[cid] <= 0:
                                active_bot_tasks_count.pop(cid, None)
                                
                        task.add_done_callback(task_done_callback)
                    
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
