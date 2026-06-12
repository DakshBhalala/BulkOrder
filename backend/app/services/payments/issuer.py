"""
Concrete virtual-card issuers.

- MockIssuer: default. Generates Luhn-valid *test* card numbers (no real money,
  no real cards). Perfect for the sandbox demo and local development.
- StripeIssuingIssuer: optional. Activates only when STRIPE_API_KEY is set
  (use a TEST key). Requires `pip install stripe`.

Select with get_issuer(), which reads PAYMENT_ISSUER / STRIPE_API_KEY from env.
"""
from __future__ import annotations

import os
import random
import logging
from datetime import datetime

from app.services.payments.base import IssuedCard, IssueRequest

logger = logging.getLogger(__name__)


def _luhn_complete(prefix: str, length: int = 16) -> str:
    """Build a Luhn-valid number from a BIN prefix (test numbers only)."""
    body = prefix + "".join(str(random.randint(0, 9)) for _ in range(length - len(prefix) - 1))

    def luhn_checksum(num: str) -> int:
        digits = [int(d) for d in num]
        for i in range(len(digits) - 1, -1, -2):
            digits[i] *= 2
            if digits[i] > 9:
                digits[i] -= 9
        return sum(digits) % 10

    check = (10 - luhn_checksum(body + "0")) % 10
    return body + str(check)


class MockIssuer:
    """Sandbox issuer — mints test cards. No real value is moved."""

    name = "mock"

    # Visa test BIN range — clearly non-production.
    TEST_BIN = "411111"

    def issue(self, req: IssueRequest) -> IssuedCard:
        number = _luhn_complete(self.TEST_BIN, 16)
        cvv = f"{random.randint(0, 999):03d}"
        now = datetime.utcnow()
        exp_month = f"{random.randint(1, 12):02d}"
        exp_year = str(now.year + 3)
        card_id = f"vc_mock_{random.getrandbits(48):012x}"

        logger.info(
            "Issued sandbox virtual card %s (limit %.2f %s) for %s",
            card_id, req.amount, req.currency, req.label or "n/a",
        )
        return IssuedCard(
            provider=self.name,
            provider_card_id=card_id,
            number=number,
            cvv=cvv,
            brand="visa",
            last4=number[-4:],
            exp_month=exp_month,
            exp_year=exp_year,
            spend_limit=req.amount,
            currency=req.currency,
            single_use=req.single_use,
        )

    def cancel(self, provider_card_id: str) -> bool:
        logger.info("Canceled sandbox virtual card %s", provider_card_id)
        return True


class StripeIssuingIssuer:
    """
    Real virtual cards via Stripe Issuing. Optional.

    Only used when STRIPE_API_KEY is present. Use a TEST key in non-production.
    Requires a cardholder id (STRIPE_CARDHOLDER_ID) and the `stripe` package.
    """

    name = "stripe_issuing"

    def __init__(self, api_key: str, cardholder_id: str):
        self.api_key = api_key
        self.cardholder_id = cardholder_id

    def issue(self, req: IssueRequest) -> IssuedCard:
        import stripe  # lazy import so the package is optional
        stripe.api_key = self.api_key

        # Spending controls cap the card at the order total.
        card = stripe.issuing.Card.create(
            cardholder=self.cardholder_id,
            currency=req.currency.lower(),
            type="virtual",
            spending_controls={
                "spending_limits": [
                    {
                        "amount": int(round(req.amount * 100)),  # minor units
                        "interval": "per_authorization",
                    }
                ]
            },
            metadata={"label": req.label or ""},
        )
        # Sensitive number/cvc require the expand on a separate retrieve call.
        details = stripe.issuing.Card.retrieve(card.id, expand=["number", "cvc"])
        number = getattr(details, "number", "")
        cvv = getattr(details, "cvc", "")

        return IssuedCard(
            provider=self.name,
            provider_card_id=card.id,
            number=number,
            cvv=cvv,
            brand=card.brand or "visa",
            last4=card.last4,
            exp_month=f"{card.exp_month:02d}",
            exp_year=str(card.exp_year),
            spend_limit=req.amount,
            currency=req.currency,
            single_use=req.single_use,
        )

    def cancel(self, provider_card_id: str) -> bool:
        import stripe
        stripe.api_key = self.api_key
        stripe.issuing.Card.modify(provider_card_id, status="canceled")
        return True


def get_issuer():
    """
    Choose an issuer from the environment.

    PAYMENT_ISSUER=stripe + STRIPE_API_KEY + STRIPE_CARDHOLDER_ID -> Stripe Issuing.
    Otherwise -> MockIssuer (sandbox).
    """
    choice = os.getenv("PAYMENT_ISSUER", "mock").lower()
    if choice in ("stripe", "stripe_issuing"):
        api_key = os.getenv("STRIPE_API_KEY", "")
        cardholder = os.getenv("STRIPE_CARDHOLDER_ID", "")
        if api_key and cardholder:
            return StripeIssuingIssuer(api_key, cardholder)
        logger.warning(
            "PAYMENT_ISSUER=stripe but STRIPE_API_KEY/STRIPE_CARDHOLDER_ID missing; "
            "falling back to sandbox MockIssuer."
        )
    return MockIssuer()
