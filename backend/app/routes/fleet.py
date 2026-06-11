from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import os
from twocaptcha import TwoCaptcha

from app.database import get_db
from app import crud, schemas

router = APIRouter(prefix="/api/fleet", tags=["fleet"])

@router.get("/analytics")
def get_fleet_analytics(db: Session = Depends(get_db)):
    from app import models
    # 1. Mock proxy success rates (randomized slightly around 90-100% for existing proxies)
    proxies = db.query(models.Proxy).all()
    proxy_metrics = []
    import random
    for p in proxies:
        success_rate = random.randint(85, 99)
        proxy_metrics.append({"ip": p.ip_address, "success_rate": success_rate})
        
    # 2. Account Velocity limits (mock logic based on active accounts)
    accounts = db.query(models.Account).all()
    velocity_alerts = []
    for acc in accounts:
        # 1 in 3 chance to show a warning for demo purposes
        if random.random() < 0.33:
            velocity_alerts.append({"email": acc.email, "message": f"{acc.email} placed 5 orders today. Nearing Amazon limit (10/day)."})
            
    # 3. 2Captcha Balance
    balance = 0.0
    try:
        api_key = os.getenv("TWOCAPTCHA_API_KEY", "")
        if api_key and api_key != "dummy":
            solver = TwoCaptcha(api_key)
            balance = solver.balance()
        else:
            balance = 12.45 # Mock balance
    except Exception as e:
        balance = -1.0 # Error fetching

    return {
        "proxy_metrics": proxy_metrics,
        "velocity_alerts": velocity_alerts,
        "captcha_balance": balance
    }

# --- Accounts ---

@router.get("/accounts", response_model=List[schemas.AccountResponse])
def get_accounts_route(platform: Optional[str] = None, db: Session = Depends(get_db)):
    return crud.get_accounts(db, platform)

@router.post("/accounts", response_model=schemas.AccountResponse)
def create_account_route(account_in: schemas.AccountCreate, db: Session = Depends(get_db)):
    return crud.create_account(db, account_in)

@router.delete("/accounts/{account_id}")
def delete_account_route(account_id: int, db: Session = Depends(get_db)):
    from app import models
    account = db.query(models.Account).filter(models.Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    db.delete(account)
    db.commit()
    return {"success": True}

# --- Proxies ---

@router.get("/proxies", response_model=List[schemas.ProxyResponse])
def get_proxies_route(db: Session = Depends(get_db)):
    return crud.get_proxies(db)

@router.post("/proxies", response_model=schemas.ProxyResponse)
def create_proxy_route(proxy_in: schemas.ProxyCreate, db: Session = Depends(get_db)):
    return crud.create_proxy(db, proxy_in)

@router.delete("/proxies/{proxy_id}")
def delete_proxy_route(proxy_id: int, db: Session = Depends(get_db)):
    from app import models
    proxy = db.query(models.Proxy).filter(models.Proxy.id == proxy_id).first()
    if not proxy:
        raise HTTPException(status_code=404, detail="Proxy not found")
    db.delete(proxy)
    db.commit()
    return {"success": True}

# --- Credit Cards ---

@router.get("/cards", response_model=List[schemas.CreditCardResponse])
def get_cards_route(db: Session = Depends(get_db)):
    return crud.get_credit_cards(db)

@router.post("/cards", response_model=schemas.CreditCardResponse)
def create_card_route(card_in: schemas.CreditCardCreate, db: Session = Depends(get_db)):
    return crud.create_credit_card(db, card_in)

@router.delete("/cards/{card_id}")
def delete_card_route(card_id: int, db: Session = Depends(get_db)):
    from app import models
    card = db.query(models.CreditCard).filter(models.CreditCard.id == card_id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Credit Card not found")
    db.delete(card)
    db.commit()
    return {"success": True}
