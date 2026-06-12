"""
PaymentService — ties virtual-card issuance to a simple payment state machine.

Flow:
    create_payment  -> issues a single-use virtual card sized to the amount,
                       persists masked card + Payment(pending),
                       returns the full IssuedCard once (for the checkout step).
    authorize       -> attempts authorization on the virtual card.
                       In sandbox this is simulated (with occasional OTP/decline).
    submit_otp      -> completes an OTP-challenged authorization.
    capture         -> captures an authorized payment and burns a single-use card.
    refund          -> refunds and cancels the card.
"""
from __future__ import annotations

import random
import string
import logging
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from app import models
from app.models import PaymentStatus, VirtualCardStatus
from app.services.payments.base import IssueRequest, IssuedCard
from app.services.payments.issuer import get_issuer

logger = logging.getLogger(__name__)


def _payment_id() -> str:
    return "PAY-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=10))


def _ref() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=14))


class PaymentService:
    def __init__(self, issuer=None):
        self.issuer = issuer or get_issuer()

    # ── creation ────────────────────────────────────────────────
    def create_payment(
        self,
        db: Session,
        *,
        amount: float,
        currency: str = "INR",
        campaign_id: Optional[str] = None,
        order_ref: Optional[str] = None,
        single_use: bool = True,
    ) -> Tuple[models.Payment, IssuedCard]:
        """Issue a virtual card and open a pending payment."""
        issued = self.issuer.issue(
            IssueRequest(
                amount=amount,
                currency=currency,
                single_use=single_use,
                label=campaign_id or order_ref,
            )
        )

        masked = issued.masked()
        vcard = models.VirtualCard(
            provider=masked["provider"],
            provider_card_id=masked["provider_card_id"],
            brand=masked["brand"],
            last4=masked["last4"],
            exp_month=masked["exp_month"],
            exp_year=masked["exp_year"],
            spend_limit=masked["spend_limit"],
            currency=masked["currency"],
            single_use=masked["single_use"],
            status=VirtualCardStatus.ACTIVE.value,
            campaign_id=campaign_id,
        )
        db.add(vcard)
        db.flush()  # get vcard.id

        payment = models.Payment(
            id=_payment_id(),
            campaign_id=campaign_id,
            order_ref=order_ref,
            virtual_card_id=vcard.id,
            amount=amount,
            currency=currency,
            status=PaymentStatus.PENDING.value,
            provider=self.issuer.name,
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)
        return payment, issued

    # ── authorization / capture ─────────────────────────────────
    def authorize(self, db: Session, payment_id: str) -> models.Payment:
        payment = self._get(db, payment_id)
        if payment.status not in (PaymentStatus.PENDING.value, PaymentStatus.FAILED.value):
            return payment

        # Sandbox simulation. Real issuers authorize when the card is used at the
        # merchant and notify via webhook — see routes/payments webhook stub.
        roll = random.random()
        if self.issuer.name == "mock":
            if roll < 0.10:
                payment.status = PaymentStatus.DECLINED.value
                payment.failure_reason = "Issuer declined (insufficient funds)"
            elif roll < 0.30:
                payment.status = PaymentStatus.OTP_REQUIRED.value
            else:
                payment.status = PaymentStatus.AUTHORIZED.value
                payment.gateway_ref = _ref()
        else:
            payment.status = PaymentStatus.AUTHORIZED.value
            payment.gateway_ref = _ref()

        db.commit()
        db.refresh(payment)

        if payment.status == PaymentStatus.AUTHORIZED.value:
            return self.capture(db, payment_id)
        return payment

    def submit_otp(self, db: Session, payment_id: str, otp: str) -> models.Payment:
        payment = self._get(db, payment_id)
        if payment.status != PaymentStatus.OTP_REQUIRED.value:
            return payment
        if not otp or len(otp) < 4:
            payment.failure_reason = "Invalid OTP"
            db.commit()
            db.refresh(payment)
            return payment
        payment.status = PaymentStatus.AUTHORIZED.value
        payment.gateway_ref = _ref()
        payment.failure_reason = None
        db.commit()
        return self.capture(db, payment_id)

    def capture(self, db: Session, payment_id: str) -> models.Payment:
        payment = self._get(db, payment_id)
        if payment.status != PaymentStatus.AUTHORIZED.value:
            return payment
        payment.status = PaymentStatus.CAPTURED.value
        if payment.virtual_card and payment.virtual_card.single_use:
            payment.virtual_card.status = VirtualCardStatus.USED.value
        db.commit()
        db.refresh(payment)
        logger.info("Captured payment %s (%.2f %s)", payment.id, payment.amount, payment.currency)
        return payment

    def refund(self, db: Session, payment_id: str) -> models.Payment:
        payment = self._get(db, payment_id)
        if payment.status != PaymentStatus.CAPTURED.value:
            return payment
        payment.status = PaymentStatus.REFUNDED.value
        if payment.virtual_card:
            try:
                self.issuer.cancel(payment.virtual_card.provider_card_id)
            except Exception as e:
                logger.warning("Issuer cancel failed: %s", e)
            payment.virtual_card.status = VirtualCardStatus.CANCELED.value
        db.commit()
        db.refresh(payment)
        return payment

    # ── helpers ─────────────────────────────────────────────────
    def _get(self, db: Session, payment_id: str) -> models.Payment:
        payment = db.query(models.Payment).filter(models.Payment.id == payment_id).first()
        if not payment:
            raise ValueError(f"Payment {payment_id} not found")
        return payment
