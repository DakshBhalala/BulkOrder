"""
Virtual-card payment subsystem.

This package issues single-use virtual cards (sized to an order's total) and
runs a simple authorize -> capture flow against them.

Defaults to a SANDBOX issuer that mints test card numbers only — no real money
moves and no real card data is stored. A real Stripe Issuing adapter is included
but only activates when STRIPE_API_KEY (a *test* key) is configured.

Use only with funding sources and merchant accounts you own and are authorized
to transact with.
"""
from app.services.payments.base import IssuedCard, VirtualCardIssuer
from app.services.payments.issuer import get_issuer, MockIssuer
from app.services.payments.service import PaymentService

__all__ = [
    "IssuedCard",
    "VirtualCardIssuer",
    "get_issuer",
    "MockIssuer",
    "PaymentService",
]
