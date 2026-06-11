from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import crud, schemas

router = APIRouter(prefix="/api", tags=["bot-automation"])

@router.get("/campaigns", response_model=List[schemas.CampaignResponse])
def get_campaigns_route(db: Session = Depends(get_db)):
    return crud.get_campaigns(db)

@router.post("/campaigns", response_model=schemas.CampaignResponse)
def create_campaign_route(campaign_in: schemas.CampaignCreate, db: Session = Depends(get_db)):
    return crud.create_campaign(db, campaign_in)

@router.post("/campaigns/cancel")
def cancel_campaign_route(request: dict, db: Session = Depends(get_db)):
    campaign_id = request.get("id")
    campaign = crud.cancel_campaign(db, campaign_id)
    if not campaign:
        return {"error": "Campaign not found or not processing"}
    return {"success": True}

@router.post("/campaigns/retry")
def retry_campaign_route(request: dict, db: Session = Depends(get_db)):
    campaign_id = request.get("campaignId")
    resolution = request.get("resolution", {})
    
    # Reset campaign status to Processing
    from app import models
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        return {"error": "Campaign not found"}
        
    campaign.status = "Processing"
    campaign.ordersPending = campaign.unitsTotal - (campaign.ordersSuccess or 0)
    campaign.ordersFailed = 0
    # Apply resolution if any (e.g. swap card)
    if resolution.get("cardId"):
        campaign.cardType = resolution.get("cardId")
        
    db.commit()
    
    # Re-dispatch automation
    from app.services.engine import dispatch_campaign_automation
    import threading
    threading.Thread(target=dispatch_campaign_automation, args=(campaign.id,), daemon=True).start()
    
    return {"success": True}

@router.get("/alerts", response_model=List[schemas.AlertResponse])
def get_alerts_route(db: Session = Depends(get_db)):
    return crud.get_alerts(db)

@router.post("/alerts/resolve")
def resolve_alert_route(request: dict, db: Session = Depends(get_db)):
    alert_id = request.get("id")
    alert = crud.resolve_alert(db, alert_id)
    if not alert:
        return {"error": "Alert not found"}
    return {"success": True}

@router.get("/metrics", response_model=schemas.PlatformMetricResponse)
def get_metrics_route(db: Session = Depends(get_db)):
    return crud.get_platform_metrics(db)

@router.get("/history", response_model=List[schemas.HistoryUnitResponse])
def get_history_route(db: Session = Depends(get_db)):
    return crud.get_history_units(db)

from fastapi.responses import StreamingResponse
from app.services.invoice import generate_invoice_pdf

@router.get("/history/{order_id}/invoice")
def download_invoice(order_id: str, db: Session = Depends(get_db)):
    # Find the history unit
    units = crud.get_history_units(db)
    unit = next((u for u in units if u.orderId == order_id), None)
    
    if not unit:
        # Fallback dummy invoice if not found
        buffer = generate_invoice_pdf(order_id, "₹0.00", "Unknown", "Unknown Product", "unknown@domain.com")
    else:
        buffer = generate_invoice_pdf(unit.orderId, unit.amount, unit.platform, unit.product, unit.email)
        
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=invoice_{order_id}.pdf"}
    )

import io
import zipfile

@router.post("/history/invoice-bundle")
def download_invoice_bundle(request: dict, db: Session = Depends(get_db)):
    # request can contain list of order_ids
    order_ids = request.get("order_ids", [])
    units = crud.get_history_units(db)
    
    if not order_ids:
        # Download all if none provided
        target_units = units
    else:
        target_units = [u for u in units if u.orderId in order_ids]
        
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        for unit in target_units:
            pdf_buffer = generate_invoice_pdf(unit.orderId, unit.amount, unit.platform, unit.product, unit.email)
            zip_file.writestr(f"invoice_{unit.orderId}.pdf", pdf_buffer.getvalue())
            
    zip_buffer.seek(0)
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=invoices_bundle.zip"}
    )
