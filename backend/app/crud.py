"""
Database CRUD operations for orders, suppliers, products, and order history.
"""
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from app import models
from app.models import OrderStatus


# ─── Suppliers ───────────────────────────────────────────────────

def get_suppliers(db: Session) -> List[models.Supplier]:
    return db.query(models.Supplier).all()


def get_supplier(db: Session, supplier_id: int) -> Optional[models.Supplier]:
    return db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()


def get_supplier_by_code(db: Session, code: str) -> Optional[models.Supplier]:
    return db.query(models.Supplier).filter(models.Supplier.code == code).first()


def create_supplier(db: Session, name: str, code: str, website_url: str = "") -> models.Supplier:
    supplier = models.Supplier(name=name, code=code, website_url=website_url)
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


# ─── Products ────────────────────────────────────────────────────

def get_products(db: Session, supplier_id: Optional[int] = None) -> List[models.Product]:
    query = db.query(models.Product)
    if supplier_id:
        query = query.filter(models.Product.supplier_id == supplier_id)
    return query.all()


def get_product(db: Session, product_id: int) -> Optional[models.Product]:
    return db.query(models.Product).filter(models.Product.id == product_id).first()


def create_product(
    db: Session, supplier_id: int, name: str,
    sku: str = "", price: float = 0.0, in_stock: bool = True
) -> models.Product:
    product = models.Product(
        supplier_id=supplier_id, name=name,
        sku=sku, price=price, in_stock=in_stock
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


# ─── Orders ──────────────────────────────────────────────────────

def get_orders(
    db: Session,
    status: Optional[OrderStatus] = None,
    skip: int = 0,
    limit: int = 100
) -> List[models.Order]:
    query = db.query(models.Order).options(joinedload(models.Order.supplier))
    if status:
        query = query.filter(models.Order.status == status)
    return query.order_by(models.Order.id.desc()).offset(skip).limit(limit).all()


def get_order(db: Session, order_id: int) -> Optional[models.Order]:
    return (
        db.query(models.Order)
        .options(
            joinedload(models.Order.supplier),
            joinedload(models.Order.matched_product),
            joinedload(models.Order.history),
        )
        .filter(models.Order.id == order_id)
        .first()
    )


def get_order_by_order_id(db: Session, order_id: str) -> Optional[models.Order]:
    return (
        db.query(models.Order)
        .options(
            joinedload(models.Order.supplier),
            joinedload(models.Order.matched_product),
            joinedload(models.Order.history),
        )
        .filter(models.Order.order_id == order_id)
        .first()
    )


def create_order(
    db: Session, order_id: str, product_name: str,
    quantity: int, customer_name: str
) -> models.Order:
    order = models.Order(
        order_id=order_id,
        product_name=product_name,
        quantity=quantity,
        customer_name=customer_name,
        status=OrderStatus.IMPORTED,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    # Log initial history
    add_order_history(db, order.id, None, OrderStatus.IMPORTED, "Order imported")
    return order


def update_order_status(
    db: Session, order_id: int, new_status: OrderStatus, notes: str = ""
) -> Optional[models.Order]:
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        return None
    old_status = order.status
    order.status = new_status
    db.commit()
    db.refresh(order)
    add_order_history(db, order.id, old_status, new_status, notes)
    return order


def update_order_matching(
    db: Session, order_id: int,
    matched_product_id: int, matched_product_name: str,
    match_score: float, supplier_id: int
) -> Optional[models.Order]:
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        return None
    order.matched_product_id = matched_product_id
    order.matched_product_name = matched_product_name
    order.match_score = match_score
    order.supplier_id = supplier_id
    order.status = OrderStatus.MATCHED
    db.commit()
    db.refresh(order)
    add_order_history(
        db, order.id, OrderStatus.IMPORTED, OrderStatus.MATCHED,
        f"Matched to '{matched_product_name}' (score: {match_score:.1f}%)"
    )
    return order


def update_order_tracking(
    db: Session, order_id: int,
    supplier_order_ref: str, tracking_number: str
) -> Optional[models.Order]:
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        return None
    order.supplier_order_ref = supplier_order_ref
    order.tracking_number = tracking_number
    order.status = OrderStatus.TRACKING_ASSIGNED
    db.commit()
    db.refresh(order)
    add_order_history(
        db, order.id, OrderStatus.ORDERED, OrderStatus.TRACKING_ASSIGNED,
        f"Tracking: {tracking_number}"
    )
    return order


# ─── Order History ───────────────────────────────────────────────

def add_order_history(
    db: Session, order_id: int,
    from_status: Optional[OrderStatus], to_status: OrderStatus,
    notes: str = ""
) -> models.OrderHistory:
    history = models.OrderHistory(
        order_id=order_id,
        from_status=from_status.value if from_status else None,
        to_status=to_status.value if isinstance(to_status, OrderStatus) else to_status,
        notes=notes,
    )
    db.add(history)
    db.commit()
    return history


# --- Accounts & Proxies CRUD ---

def get_accounts(db: Session, platform: Optional[str] = None):
    query = db.query(models.Account)
    if platform:
        query = query.filter(models.Account.platform == platform)
    return query.all()

def create_account(db: Session, account_in: schemas.AccountCreate):
    db_acc = models.Account(**account_in.model_dump())
    db.add(db_acc)
    db.commit()
    db.refresh(db_acc)
    return db_acc

def get_proxies(db: Session):
    return db.query(models.Proxy).all()

def create_proxy(db: Session, proxy_in: schemas.ProxyCreate) -> models.Proxy:
    db_proxy = models.Proxy(**proxy_in.model_dump())
    db.add(db_proxy)
    db.commit()
    db.refresh(db_proxy)
    return db_proxy

# --- Credit Cards ---

def get_credit_cards(db: Session):
    return db.query(models.CreditCard).all()

def create_credit_card(db: Session, card_in: schemas.CreditCardCreate) -> models.CreditCard:
    db_card = models.CreditCard(**card_in.model_dump())
    db.add(db_card)
    db.commit()
    db.refresh(db_card)
    return db_card

def delete_credit_card(db: Session, card_id: int):
    card = db.query(models.CreditCard).filter(models.CreditCard.id == card_id).first()
    if card:
        db.delete(card)
        db.commit()
        return True
    return False


# ─── Dashboard Metrics ───────────────────────────────────────────

def get_dashboard_metrics(db: Session) -> dict:
    total = db.query(func.count(models.Order.id)).scalar() or 0

    def _count(status: OrderStatus) -> int:
        return db.query(func.count(models.Order.id)).filter(
            models.Order.status == status
        ).scalar() or 0

    matched = db.query(func.count(models.Order.id)).filter(
        models.Order.status != OrderStatus.IMPORTED
    ).scalar() or 0

    return {
        "total_orders": total,
        "matched_orders": matched,
        "completed_orders": _count(OrderStatus.COMPLETED),
        "failed_orders": _count(OrderStatus.FAILED),
        "processing_orders": _count(OrderStatus.PROCESSING),
        "queued_orders": _count(OrderStatus.QUEUED),
    }


def count_orders(db: Session) -> int:
    return db.query(func.count(models.Order.id)).scalar() or 0


def reset_demo(db: Session) -> None:
    db.query(models.OrderHistory).delete()
    db.query(models.Order).delete()
    db.commit()


# --- Bot Automation CRUD ---

import random
import string
from datetime import datetime

def get_campaigns(db: Session, limit: int = 100):
    campaigns = db.query(models.Campaign).all()
    
    def parse_time(c):
        try:
            # Handle new format: "11 Jun, 02:06 PM"
            return datetime.strptime(c.created, "%d %b, %I:%M %p")
        except ValueError:
            try:
                # Fallback for old format: "02:06 PM"
                return datetime.strptime(c.created, "%I:%M %p")
            except ValueError:
                return datetime.min
            
    campaigns.sort(key=parse_time, reverse=True)
    return campaigns[:limit]

def create_campaign(db: Session, campaign_in: schemas.CampaignCreate):
    campaign_id = "".join(random.choices(string.ascii_uppercase + string.digits, k=9))
    now_str = datetime.now().strftime("%d %b, %I:%M %p")
    
    db_campaign = models.Campaign(
        id=campaign_id,
        created=now_str,
        platform=campaign_in.platform,
        isMock=campaign_in.isMock,
        product=campaign_in.product,
        url=campaign_in.url,
        quantityTotal=campaign_in.quantityTotal,
        quantityPerOrder=campaign_in.quantityPerOrder,
        unitsTotal=campaign_in.quantityTotal,
        ordersPending=campaign_in.quantityTotal,
        cardType=campaign_in.cardType,
        addressLabel=campaign_in.addressLabel,
        gstLabel=campaign_in.gstLabel,
        cod=campaign_in.cod,
        parentCards="[\"40XX...1234\"]",
        phone=campaign_in.phone,
        pincode=campaign_in.pincode,
        flat=campaign_in.flat,
        area=campaign_in.area,
        gstNo=campaign_in.gstNo,
        excludeOutOfStock=campaign_in.excludeOutOfStock,
        maxOrdersPerAccount=campaign_in.maxOrdersPerAccount
    )
    db.add(db_campaign)
    db.commit()
    db.refresh(db_campaign)
    return db_campaign

def cancel_campaign(db: Session, campaign_id: str):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if campaign and campaign.status == "Processing":
        campaign.status = "Cancelled"
        db.commit()
        db.refresh(campaign)
    return campaign

def get_alerts(db: Session, limit: int = 50):
    return db.query(models.Alert).order_by(models.Alert.created.desc()).limit(limit).all()

def resolve_alert(db: Session, alert_id: str):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if alert and alert.status == "Active":
        alert.status = "Resolved"
        db.commit()
        db.refresh(alert)
    return alert

def get_history_units(db: Session, limit: int = 100):
    return db.query(models.HistoryUnit).order_by(models.HistoryUnit.date.desc()).limit(limit).all()

def get_platform_metrics(db: Session):
    metric = db.query(models.PlatformMetric).first()
    if not metric:
        metric = models.PlatformMetric()
        db.add(metric)
        db.commit()
        db.refresh(metric)
    return metric
