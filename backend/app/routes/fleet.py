from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app import crud, schemas

router = APIRouter(prefix="/api/fleet", tags=["fleet"])

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
