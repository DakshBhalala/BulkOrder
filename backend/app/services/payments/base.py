"""
Provider-agnostic contracts for virtual card issuance.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol, Optional


@dataclass
class IssuedCard:
    """
    A freshly issued virtual card.

    The full `number` and `cvv` are sensitive and are returned ONLY once, at
    issuance time, for the checkout step to consume in-memory. They are never
    persisted to the database — callers should not log or store them.
    """
    provider: str
    provider_card_id: str
    number: str            # full PAN — sensitive, do not persist
    cvv: str               # sensitive, do not persist
    brand: str
    last4: str
    exp_month: str
    exp_year: str
    spend_limit: float
    currency: str
    single_use: bool = True

    def masked(self) -> dict:
        """Safe representation for storage / API responses."""
        return {
            "provider": self.provider,
            "provider_card_id": self.provider_card_id,
            "brand": self.brand,
            "last4": self.last4,
            "exp_month": self.exp_month,
            "exp_year": self.exp_year,
            "spend_limit": self.spend_limit,
            "currency": self.currency,
            "single_use": self.single_use,
        }


@dataclass
class IssueRequest:
    amount: float
    currency: str = "INR"
    single_use: bool = True
    label: Optional[str] = None     # e.g. campaign id, for the issuer's metadata


class VirtualCardIssuer(Protocol):
    """Anything that can mint and revoke virtual cards."""

    name: str

    def issue(self, req: IssueRequest) -> IssuedCard: ...

    def cancel(self, provider_card_id: str) -> bool: ...
