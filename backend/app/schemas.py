"""
Pydantic schemas for request/response validation.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class OrderStatusEnum(str, Enum):
    IMPORTED = "imported"
    MATCHED = "matched"
    QUEUED = "queued"
    PROCESSING = "processing"
    ORDERED = "ordered"
    TRACKING_ASSIGNED = "tracking_assigned"
    COMPLETED = "completed"
    FAILED = "failed"


# ─── Supplier Schemas ────────────────────────────────────────────

class SupplierBase(BaseModel):
    name: str
    code: str
    website_url: str = ""

class SupplierResponse(SupplierBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Product Schemas ─────────────────────────────────────────────

class ProductBase(BaseModel):
    name: str
    sku: str = ""
    price: float = 0.0
    in_stock: bool = True

class ProductResponse(ProductBase):
    id: int
    supplier_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Order Schemas ───────────────────────────────────────────────

class OrderCreate(BaseModel):
    order_id: str
    product_name: str
    quantity: int = Field(ge=1, default=1)
    customer_name: str

class OrderResponse(BaseModel):
    id: int
    order_id: str
    product_name: str
    quantity: int
    customer_name: str
    status: OrderStatusEnum
    matched_product_name: Optional[str] = None
    match_score: Optional[float] = None
    supplier_id: Optional[int] = None
    supplier_name: Optional[str] = None
    supplier_order_ref: Optional[str] = None
    tracking_number: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class OrderDetailResponse(OrderResponse):
    history: List["OrderHistoryResponse"] = []
    matched_product: Optional[ProductResponse] = None


# ─── Order History Schemas ───────────────────────────────────────

class OrderHistoryResponse(BaseModel):
    id: int
    from_status: Optional[str] = None
    to_status: str
    timestamp: Optional[datetime] = None
    notes: str = ""

    class Config:
        from_attributes = True


# ─── Matching Schemas ────────────────────────────────────────────

class MatchResult(BaseModel):
    order_id: str
    product_name: str
    matched_product: str
    match_score: float
    supplier_name: str
    auto_matched: bool


class MatchingResponse(BaseModel):
    total: int
    matched: int
    results: List[MatchResult]


# ─── Dashboard Schemas ───────────────────────────────────────────

class DashboardMetrics(BaseModel):
    total_orders: int = 0
    matched_orders: int = 0
    completed_orders: int = 0
    failed_orders: int = 0
    processing_orders: int = 0
    queued_orders: int = 0


# ─── Upload Schemas ──────────────────────────────────────────────

class UploadResponse(BaseModel):
    success: bool
    total_rows: int
    valid_rows: int
    invalid_rows: int
    errors: List[str] = []
    orders: List[OrderResponse] = []


# ─── Automation Schemas ──────────────────────────────────────────

class AutomationResult(BaseModel):
    order_id: str
    success: bool
    supplier_order_ref: Optional[str] = None
    tracking_number: Optional[str] = None
    message: str = ""


class AutomationBatchResponse(BaseModel):
    total: int
    failed: int
    results: List[AutomationResult]


# --- Bot Automation Schemas ---

class CampaignCreate(BaseModel):
    platform: str
    isMock: bool = False
    quantityTotal: int = 10
    quantityPerOrder: int = 1
    cardType: str = "ICICI_PHYSICAL"
    addressLabel: str = "Warehouse"
    gstLabel: str = "Default GST"
    gstNo: Optional[str] = None
    cod: bool = False
    product: str = "Automated Product Selection"
    url: Optional[str] = None
    phone: Optional[str] = None
    pincode: Optional[str] = None
    flat: Optional[str] = None
    area: Optional[str] = None
    excludeOutOfStock: Optional[bool] = False
    maxOrdersPerAccount: Optional[int] = 10

class CampaignResponse(BaseModel):
    id: str
    created: str
    platform: str
    isMock: bool
    status: str
    product: str
    variant: str
    quantityTotal: int
    quantityPerOrder: int
    unitsCompleted: int
    unitsTotal: int
    unitsOver: int
    progress: int
    ordersSuccess: int
    ordersFailed: int
    ordersPending: int
    user: str
    cardType: str
    parentCards: str
    addressLabel: str
    gstLabel: str
    cod: bool
    timeTaken: str
    phone: Optional[str] = None
    pincode: Optional[str] = None
    flat: Optional[str] = None
    area: Optional[str] = None
    gstNo: Optional[str] = None
    excludeOutOfStock: Optional[bool] = False
    maxOrdersPerAccount: Optional[int] = 10

    class Config:
        from_attributes = True

class AlertResponse(BaseModel):
    id: str
    created: str
    type: str
    warning: str
    email: str
    orderUnit: str
    status: str
    severity: str

    class Config:
        from_attributes = True

class HistoryUnitResponse(BaseModel):
    id: str
    platform: str
    date: str
    email: str
    status: str
    product: str
    orderId: str
    bobOrder: bool
    amount: str
    deliveryDate: str
    otp: str
    tracking: str
    gstNo: str
    phone: str
    cod: str

    class Config:
        from_attributes = True

class PlatformMetricResponse(BaseModel):
    supercoinsApplied: int
    loginRatio: float
    loggedIn: int
    failed: int
    availableCoins: int
    giftVouchers: int

    class Config:
        from_attributes = True


# --- Account & Proxy Schemas ---

class AccountCreate(BaseModel):
    email: str
    password_hash: str
    platform: str
    is_active: bool = True

class AccountResponse(AccountCreate):
    id: int
    cookies_json: Optional[str] = None
    class Config:
        from_attributes = True


class ProxyCreate(BaseModel):
    ip_address: str
    port: int
    username: Optional[str] = None
    password: Optional[str] = None
    is_active: bool = True

class ProxyResponse(ProxyCreate):
    id: int
    class Config:
        from_attributes = True

# ─── Fleet Credit Card Schemas ───────────────────────────────────

class CreditCardBase(BaseModel):
    card_number: str
    card_name: str
    expiry_month: str
    expiry_year: str
    cvv: Optional[str] = None
    is_active: bool = True

class CreditCardCreate(CreditCardBase):
    pass

class CreditCardResponse(CreditCardBase):
    id: int

    class Config:
        from_attributes = True


# ─── Virtual Card & Payment Schemas ──────────────────────────────

class VirtualCardResponse(BaseModel):
    id: int
    provider: str
    brand: str
    last4: str
    exp_month: str
    exp_year: str
    spend_limit: float
    currency: str
    single_use: bool
    status: str

    class Config:
        from_attributes = True


class PaymentCreate(BaseModel):
    amount: float = Field(gt=0)
    currency: str = "INR"
    campaign_id: Optional[str] = None
    order_ref: Optional[str] = None
    # If true, authorize (and capture) immediately after issuing the card.
    auto_capture: bool = True


class PaymentResponse(BaseModel):
    id: str
    campaign_id: Optional[str] = None
    order_ref: Optional[str] = None
    amount: float
    currency: str
    status: str
    provider: str
    gateway_ref: Optional[str] = None
    failure_reason: Optional[str] = None
    virtual_card: Optional[VirtualCardResponse] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OtpSubmit(BaseModel):
    otp: str
