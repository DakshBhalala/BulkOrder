"""
Dashboard routes: metrics and recent orders.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app import crud, schemas

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/metrics", response_model=schemas.DashboardMetrics)
def get_metrics(db: Session = Depends(get_db)):
    """Get dashboard metrics: totals, matched, completed, failed."""
    metrics = crud.get_dashboard_metrics(db)
    return schemas.DashboardMetrics(**metrics)


@router.get("/recent")
def get_recent_orders(db: Session = Depends(get_db)):
    """Get the 10 most recent orders."""
    orders = crud.get_orders(db, limit=10)
    result = []
    for o in orders:
        result.append(schemas.OrderResponse(
            id=o.id,
            order_id=o.order_id,
            product_name=o.product_name,
            quantity=o.quantity,
            customer_name=o.customer_name,
            status=o.status,
            matched_product_name=o.matched_product_name,
            match_score=o.match_score,
            supplier_id=o.supplier_id,
            supplier_name=o.supplier.name if o.supplier else None,
            supplier_order_ref=o.supplier_order_ref,
            tracking_number=o.tracking_number,
            created_at=o.created_at,
            updated_at=o.updated_at,
        ))
    return result


@router.delete("/reset")
def reset_demo(db: Session = Depends(get_db)):
    """Reset the demo by clearing all orders and history."""
    crud.reset_demo(db)
    return {"message": "Demo reset successfully"}
