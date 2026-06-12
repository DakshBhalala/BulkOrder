"""
Payment routes — virtual-card funded payments.

POST   /api/payments            create a payment (issues a single-use virtual card)
GET    /api/payments            list payments
GET    /api/payments/{id}       payment detail
POST   /api/payments/{id}/pay   authorize (+ capture) the payment
POST   /api/payments/{id}/otp   complete an OTP-challenged payment
POST   /api/payments/{id}/refund refund + cancel the card
POST   /api/payments/webhook    issuer webhook (real-gateway auth/capture events)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas
from app.services.payments import PaymentService

router = APIRouter(prefix="/api/payments", tags=["payments"])

service = PaymentService()


@router.post("", response_model=schemas.PaymentResponse)
def create_payment(body: schemas.PaymentCreate, db: Session = Depends(get_db)):
    payment, _issued = service.create_payment(
        db,
        amount=body.amount,
        currency=body.currency,
        campaign_id=body.campaign_id,
        order_ref=body.order_ref,
    )
    # NOTE: _issued holds the full PAN/CVV for the checkout step to consume
    # in-memory. We deliberately do NOT return it in the API response.
    if body.auto_capture:
        payment = service.authorize(db, payment.id)
    return payment


@router.get("", response_model=List[schemas.PaymentResponse])
def list_payments(db: Session = Depends(get_db)):
    return db.query(models.Payment).order_by(models.Payment.created_at.desc()).limit(200).all()


@router.get("/{payment_id}", response_model=schemas.PaymentResponse)
def get_payment(payment_id: str, db: Session = Depends(get_db)):
    payment = db.query(models.Payment).filter(models.Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment


@router.post("/{payment_id}/pay", response_model=schemas.PaymentResponse)
def pay(payment_id: str, db: Session = Depends(get_db)):
    try:
        return service.authorize(db, payment_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{payment_id}/otp", response_model=schemas.PaymentResponse)
def submit_otp(payment_id: str, body: schemas.OtpSubmit, db: Session = Depends(get_db)):
    try:
        return service.submit_otp(db, payment_id, body.otp)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{payment_id}/refund", response_model=schemas.PaymentResponse)
def refund(payment_id: str, db: Session = Depends(get_db)):
    try:
        return service.refund(db, payment_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/webhook")
def issuer_webhook(event: dict, db: Session = Depends(get_db)):
    """
    Stub for real issuer webhooks (e.g. Stripe Issuing authorization.created /
    .updated). Map the provider's card id to a Payment and advance its status.
    Verify the signature header before trusting this in production.
    """
    provider_card_id = (event.get("data", {}) or {}).get("card") or event.get("card")
    event_type = event.get("type", "")
    if not provider_card_id:
        return {"received": True, "matched": False}

    vcard = (
        db.query(models.VirtualCard)
        .filter(models.VirtualCard.provider_card_id == provider_card_id)
        .first()
    )
    if not vcard:
        return {"received": True, "matched": False}

    payment = (
        db.query(models.Payment)
        .filter(models.Payment.virtual_card_id == vcard.id)
        .first()
    )
    if payment:
        if "authorization.created" in event_type:
            payment.status = models.PaymentStatus.AUTHORIZED.value
        elif "captured" in event_type or "transaction.created" in event_type:
            payment.status = models.PaymentStatus.CAPTURED.value
            if vcard.single_use:
                vcard.status = models.VirtualCardStatus.USED.value
        db.commit()
    return {"received": True, "matched": True}
