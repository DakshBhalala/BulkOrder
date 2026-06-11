"""
SQLAlchemy ORM models for the Bulk Order Automation Platform.
"""
import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum, Text
)
from sqlalchemy.orm import relationship
from app.database import Base


class OrderStatus(str, enum.Enum):
    IMPORTED = "imported"
    MATCHED = "matched"
    QUEUED = "queued"
    PROCESSING = "processing"
    ORDERED = "ordered"
    TRACKING_ASSIGNED = "tracking_assigned"
    COMPLETED = "completed"
    FAILED = "failed"


def _utcnow():
    return datetime.now(timezone.utc)


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    website_url = Column(String(500), default="")
    created_at = Column(DateTime, default=_utcnow)

    products = relationship("Product", back_populates="supplier")
    orders = relationship("Order", back_populates="supplier")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    name = Column(String(500), nullable=False)
    sku = Column(String(100), default="")
    price = Column(Float, default=0.0)
    in_stock = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_utcnow)

    supplier = relationship("Supplier", back_populates="products")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(String(50), unique=True, nullable=False, index=True)
    product_name = Column(String(500), nullable=False)
    quantity = Column(Integer, default=1)
    customer_name = Column(String(255), nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.IMPORTED, nullable=False)

    # Matching fields
    matched_product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    matched_product_name = Column(String(500), nullable=True)
    match_score = Column(Float, nullable=True)

    # Supplier assignment
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)

    # Tracking
    supplier_order_ref = Column(String(100), nullable=True)
    tracking_number = Column(String(100), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=_utcnow)
    updated_at = Column(DateTime, default=_utcnow, onupdate=_utcnow)

    # Relationships
    supplier = relationship("Supplier", back_populates="orders")
    matched_product = relationship("Product")
    history = relationship("OrderHistory", back_populates="order", order_by="OrderHistory.timestamp")


class OrderHistory(Base):
    __tablename__ = "order_history"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    from_status = Column(String(50), nullable=True)
    to_status = Column(String(50), nullable=False)
    timestamp = Column(DateTime, default=_utcnow)
    notes = Column(Text, default="")

    order = relationship("Order", back_populates="history")


# --- Bot Automation Models ---

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(String(50), primary_key=True, index=True)
    created = Column(String(50), nullable=False)
    platform = Column(String(50), nullable=False)
    isMock = Column(Boolean, default=False)
    status = Column(String(50), default="Processing")
    product = Column(String(500), nullable=False)
    url = Column(String(1000), nullable=True)
    variant = Column(String(255), default="Default Variant")
    quantityTotal = Column(Integer, default=10)
    quantityPerOrder = Column(Integer, default=1)
    unitsCompleted = Column(Integer, default=0)
    unitsTotal = Column(Integer, default=10)
    unitsOver = Column(Integer, default=0)
    progress = Column(Integer, default=0)
    ordersSuccess = Column(Integer, default=0)
    ordersFailed = Column(Integer, default=0)
    ordersPending = Column(Integer, default=10)
    user = Column(String(100), default="admin")
    cardType = Column(String(100), default="ICICI_PHYSICAL")
    parentCards = Column(String(500), default="") # JSON list string
    addressLabel = Column(String(255), default="Warehouse")
    gstLabel = Column(String(255), default="Default GST")
    cod = Column(Boolean, default=False)
    timeTaken = Column(String(50), default="0s")
    phone = Column(String(20), nullable=True)
    pincode = Column(String(20), nullable=True)
    flat = Column(String(100), nullable=True)
    area = Column(String(255), nullable=True)
    gstNo = Column(String(100), nullable=True)
    excludeOutOfStock = Column(Boolean, default=False)
    maxOrdersPerAccount = Column(Integer, default=10)

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(50), primary_key=True, index=True)
    created = Column(String(50), nullable=False)
    type = Column(String(100), nullable=False)
    warning = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    orderUnit = Column(String(100), nullable=False)
    status = Column(String(50), default="Active")
    severity = Column(String(50), default="High")

class HistoryUnit(Base):
    __tablename__ = "history_units"

    id = Column(String(50), primary_key=True, index=True)
    platform = Column(String(50), nullable=False)
    date = Column(String(50), nullable=False)
    email = Column(String(255), nullable=False)
    status = Column(String(50), default="Processing")
    product = Column(String(500), nullable=False)
    orderId = Column(String(100), nullable=False)
    bobOrder = Column(Boolean, default=True)
    amount = Column(String(100), nullable=False)
    deliveryDate = Column(String(100), default="Pending")
    otp = Column(String(50), default="—")
    tracking = Column(String(100), default="—")
    gstNo = Column(String(100), default="09AANCP...")
    phone = Column(String(100), default="999XXXXXXX")
    cod = Column(String(50), default="No")

class PlatformMetric(Base):
    __tablename__ = "platform_metrics"
    id = Column(Integer, primary_key=True, index=True)
    supercoinsApplied = Column(Integer, default=0)
    loggedIn = Column(Integer, default=0)
    failed = Column(Integer, default=0)
    loginRatio = Column(Float, default=100.0)
    availableCoins = Column(Integer, default=0)
    giftVouchers = Column(Integer, default=0)

class Account(Base):
    __tablename__ = "accounts"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    platform = Column(String)
    cookies_json = Column(String, nullable=True) # Serialized Playwright cookies
    is_active = Column(Boolean, default=True)

class Proxy(Base):
    __tablename__ = "proxies"
    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String, unique=True)
    port = Column(Integer)
    username = Column(String, nullable=True)
    password = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

class TrackingEvent(Base):
    __tablename__ = "tracking_events"
    id = Column(Integer, primary_key=True, index=True)
    awb = Column(String, index=True)
    status = Column(String) # Manifested, In Transit, Out for Delivery, Delivered
    location = Column(String)
    timestamp = Column(String)

class CreditCard(Base):
    __tablename__ = "credit_cards"
    id = Column(Integer, primary_key=True, index=True)
    card_number = Column(String, unique=True, index=True)
    card_name = Column(String)
    expiry_month = Column(String)
    expiry_year = Column(String)
    cvv = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

