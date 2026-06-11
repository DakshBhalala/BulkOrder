"""
Automation routes: trigger Playwright automation for orders.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import crud, schemas
from app.models import OrderStatus
from app.services.automation import run_supplier_automation

router = APIRouter(prefix="/api/automation", tags=["automation"])


@router.post("/run/{order_id}", response_model=schemas.AutomationResult)
async def run_automation_for_order(order_id: int, db: Session = Depends(get_db)):
    """Run Playwright automation for a single order."""
    order = crud.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status not in [OrderStatus.MATCHED, OrderStatus.QUEUED]:
        raise HTTPException(
            status_code=400,
            detail=f"Order must be in 'matched' or 'queued' status. Current: {order.status.value}"
        )

    # Update status to processing
    crud.update_order_status(db, order.id, OrderStatus.QUEUED, "Queued for automation")
    crud.update_order_status(db, order.id, OrderStatus.PROCESSING, "Automation started")

    # Run automation
    product_name = order.matched_product_name or order.product_name
    result = await run_supplier_automation(product_name, order.quantity)

    if result["success"]:
        crud.update_order_status(db, order.id, OrderStatus.ORDERED, "Order placed via automation")
        crud.update_order_tracking(
            db, order.id,
            result["supplier_order_ref"] or "",
            result["tracking_number"] or "",
        )
        crud.update_order_status(db, order.id, OrderStatus.COMPLETED, "Order completed")
    else:
        crud.update_order_status(db, order.id, OrderStatus.FAILED, result.get("message", "Automation failed"))

    return schemas.AutomationResult(
        order_id=order.order_id,
        success=result["success"],
        supplier_order_ref=result.get("supplier_order_ref"),
        tracking_number=result.get("tracking_number"),
        message=result.get("message", ""),
    )


@router.post("/run-all", response_model=schemas.AutomationBatchResponse)
async def run_automation_for_all(db: Session = Depends(get_db)):
    """Run Playwright automation for all matched/queued orders."""
    orders = crud.get_orders(db, status=OrderStatus.MATCHED, limit=500)
    orders += crud.get_orders(db, status=OrderStatus.QUEUED, limit=500)

    results = []
    successful = 0
    failed = 0

    for order in orders:
        # Update to processing
        crud.update_order_status(db, order.id, OrderStatus.QUEUED, "Queued for automation")
        crud.update_order_status(db, order.id, OrderStatus.PROCESSING, "Automation started")

        product_name = order.matched_product_name or order.product_name
        result = await run_supplier_automation(product_name, order.quantity)

        if result["success"]:
            crud.update_order_status(db, order.id, OrderStatus.ORDERED, "Order placed via automation")
            crud.update_order_tracking(
                db, order.id,
                result["supplier_order_ref"] or "",
                result["tracking_number"] or "",
            )
            crud.update_order_status(db, order.id, OrderStatus.COMPLETED, "Order completed")
            successful += 1
        else:
            crud.update_order_status(db, order.id, OrderStatus.FAILED, result.get("message", ""))
            failed += 1

        results.append(schemas.AutomationResult(
            order_id=order.order_id,
            success=result["success"],
            supplier_order_ref=result.get("supplier_order_ref"),
            tracking_number=result.get("tracking_number"),
            message=result.get("message", ""),
        ))

    return schemas.AutomationBatchResponse(
        total=len(results),
        successful=successful,
        failed=failed,
        results=results,
    )
