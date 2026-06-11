"""
Order processing workflow — orchestrates the full pipeline.
"""
from sqlalchemy.orm import Session
from app import crud
from app.models import OrderStatus
from app.services.matcher import run_matching_for_imported_orders
from app.services.automation import run_supplier_automation


async def process_full_pipeline(db: Session) -> dict:
    """
    Run the full order processing pipeline:
    1. Match imported orders
    2. Queue matched orders
    3. Run automation for queued orders
    4. Assign tracking
    5. Mark complete

    Returns summary of results.
    """
    # Step 1: Match imported orders
    match_results = run_matching_for_imported_orders(db)
    matched_count = sum(1 for r in match_results if r["auto_matched"])

    # Step 2: Queue matched orders for processing
    matched_orders = crud.get_orders(db, status=OrderStatus.MATCHED, limit=500)
    for order in matched_orders:
        crud.update_order_status(db, order.id, OrderStatus.QUEUED, "Queued for processing")

    # Step 3–5: Process queued orders
    queued_orders = crud.get_orders(db, status=OrderStatus.QUEUED, limit=500)
    processed = 0
    failed = 0

    for order in queued_orders:
        crud.update_order_status(db, order.id, OrderStatus.PROCESSING, "Automation started")

        product_name = order.matched_product_name or order.product_name
        result = await run_supplier_automation(product_name, order.quantity)

        if result["success"]:
            crud.update_order_status(db, order.id, OrderStatus.ORDERED, "Order placed")
            crud.update_order_tracking(
                db, order.id,
                result["supplier_order_ref"] or "",
                result["tracking_number"] or "",
            )
            crud.update_order_status(db, order.id, OrderStatus.COMPLETED, "Order completed")
            processed += 1
        else:
            crud.update_order_status(db, order.id, OrderStatus.FAILED, result.get("message", ""))
            failed += 1

    return {
        "matched": matched_count,
        "processed": processed,
        "failed": failed,
        "total_in_pipeline": len(match_results) + len(queued_orders),
    }
