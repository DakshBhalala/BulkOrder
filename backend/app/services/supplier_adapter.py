"""
Supplier adapter interface with mock implementations for Supplier A and B.
"""
import random
import string
from abc import ABC, abstractmethod
from typing import Optional


class SupplierAdapter(ABC):
    """Abstract base for supplier integrations."""

    @abstractmethod
    async def search_product(self, query: str) -> dict:
        ...

    @abstractmethod
    async def place_order(self, product_id: str, quantity: int) -> dict:
        ...

    @abstractmethod
    async def get_tracking(self, order_ref: str) -> dict:
        ...


def _random_id(prefix: str, length: int = 6) -> str:
    digits = "".join(random.choices(string.digits, k=length))
    return f"{prefix}{digits}"


class SupplierAAdapter(SupplierAdapter):
    """Mock adapter for TechDirect (Supplier A)."""

    name = "TechDirect"

    async def search_product(self, query: str) -> dict:
        return {
            "found": True,
            "product_id": _random_id("TD-"),
            "name": query,
            "price": round(random.uniform(99, 1999), 2),
            "in_stock": True,
        }

    async def place_order(self, product_id: str, quantity: int) -> dict:
        order_ref = _random_id("ORD-TD-")
        return {
            "success": True,
            "order_ref": order_ref,
            "product_id": product_id,
            "quantity": quantity,
            "estimated_days": random.randint(2, 7),
        }

    async def get_tracking(self, order_ref: str) -> dict:
        tracking = f"TRK-{random.randint(100001, 999999)}"
        return {
            "order_ref": order_ref,
            "tracking_number": tracking,
            "carrier": "FastShip",
            "status": "in_transit",
        }


class SupplierBAdapter(SupplierAdapter):
    """Mock adapter for GadgetWorld (Supplier B)."""

    name = "GadgetWorld"

    async def search_product(self, query: str) -> dict:
        return {
            "found": True,
            "product_id": _random_id("GW-"),
            "name": query,
            "price": round(random.uniform(49, 1499), 2),
            "in_stock": True,
        }

    async def place_order(self, product_id: str, quantity: int) -> dict:
        order_ref = _random_id("ORD-GW-")
        return {
            "success": True,
            "order_ref": order_ref,
            "product_id": product_id,
            "quantity": quantity,
            "estimated_days": random.randint(3, 10),
        }

    async def get_tracking(self, order_ref: str) -> dict:
        tracking = f"TRK-{random.randint(100001, 999999)}"
        return {
            "order_ref": order_ref,
            "tracking_number": tracking,
            "carrier": "QuickDeliver",
            "status": "in_transit",
        }


def get_adapter(supplier_code: str) -> Optional[SupplierAdapter]:
    """Return the adapter for a given supplier code."""
    adapters = {
        "supplier_a": SupplierAAdapter(),
        "supplier_b": SupplierBAdapter(),
    }
    return adapters.get(supplier_code)
