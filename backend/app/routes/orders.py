"""
Order routes: CSV upload, list, detail, status update.
"""
import io
import pandas as pd
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db
from app import crud, schemas
from app.models import OrderStatus

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.post("/upload", response_model=schemas.UploadResponse)
async def upload_orders(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a CSV file of orders, validate, and store them."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

    required_cols = {"order_id", "product_name", "quantity", "customer_name"}
    missing = required_cols - set(df.columns.str.strip().str.lower())
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns: {', '.join(missing)}"
        )

    # Normalize column names
    df.columns = df.columns.str.strip().str.lower()

    errors = []
    created_orders = []
    valid_count = 0
    invalid_count = 0

    for idx, row in df.iterrows():
        row_num = idx + 2  # 1-indexed + header row
        try:
            oid = str(row["order_id"]).strip()
            product = str(row["product_name"]).strip()
            qty = int(row["quantity"])
            customer = str(row["customer_name"]).strip()

            if not oid or not product or not customer:
                raise ValueError("Empty required field")
            if qty < 1:
                raise ValueError("Quantity must be >= 1")

            # Check duplicate
            existing = crud.get_order_by_order_id(db, oid)
            if existing:
                errors.append(f"Row {row_num}: Duplicate order_id '{oid}'")
                invalid_count += 1
                continue

            order = crud.create_order(db, oid, product, qty, customer)
            created_orders.append(order)
            valid_count += 1

        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
            invalid_count += 1

    # Build response
    order_responses = []
    for o in created_orders:
        order_responses.append(schemas.OrderResponse(
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
            tracking_number=o.tracking_number,
            created_at=o.created_at,
            updated_at=o.updated_at,
        ))

    return schemas.UploadResponse(
        success=invalid_count == 0,
        total_rows=len(df),
        valid_rows=valid_count,
        invalid_rows=invalid_count,
        errors=errors,
        orders=order_responses,
    )


@router.get("", response_model=List[schemas.OrderResponse])
def list_orders(
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """List all orders with optional status filter."""
    status_filter = None
    if status:
        try:
            status_filter = OrderStatus(status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    orders = crud.get_orders(db, status=status_filter, skip=skip, limit=limit)
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


@router.get("/{order_id}", response_model=schemas.OrderDetailResponse)
def get_order_detail(order_id: int, db: Session = Depends(get_db)):
    """Get full order details including history."""
    order = crud.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    history = [
        schemas.OrderHistoryResponse(
            id=h.id,
            from_status=h.from_status,
            to_status=h.to_status,
            timestamp=h.timestamp,
            notes=h.notes,
        )
        for h in order.history
    ]

    matched_product = None
    if order.matched_product:
        matched_product = schemas.ProductResponse(
            id=order.matched_product.id,
            supplier_id=order.matched_product.supplier_id,
            name=order.matched_product.name,
            sku=order.matched_product.sku,
            price=order.matched_product.price,
            in_stock=order.matched_product.in_stock,
            created_at=order.matched_product.created_at,
        )

    return schemas.OrderDetailResponse(
        id=order.id,
        order_id=order.order_id,
        product_name=order.product_name,
        quantity=order.quantity,
        customer_name=order.customer_name,
        status=order.status,
        matched_product_name=order.matched_product_name,
        match_score=order.match_score,
        supplier_id=order.supplier_id,
        supplier_name=order.supplier.name if order.supplier else None,
        supplier_order_ref=order.supplier_order_ref,
        tracking_number=order.tracking_number,
        created_at=order.created_at,
        updated_at=order.updated_at,
        history=history,
        matched_product=matched_product,
    )
