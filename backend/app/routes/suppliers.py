"""
Supplier routes: list suppliers, search products, place orders.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import crud, schemas
from app.services.supplier_adapter import get_adapter

router = APIRouter(prefix="/api/suppliers", tags=["suppliers"])


@router.get("", response_model=List[schemas.SupplierResponse])
def list_suppliers(db: Session = Depends(get_db)):
    """List all suppliers."""
    suppliers = crud.get_suppliers(db)
    return [
        schemas.SupplierResponse(
            id=s.id,
            name=s.name,
            code=s.code,
            website_url=s.website_url,
            created_at=s.created_at,
        )
        for s in suppliers
    ]


@router.post("/{supplier_id}/search")
async def search_supplier_product(supplier_id: int, query: str, db: Session = Depends(get_db)):
    """Search a supplier's catalog for a product."""
    supplier = crud.get_supplier(db, supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    adapter = get_adapter(supplier.code)
    if not adapter:
        raise HTTPException(status_code=400, detail="No adapter for this supplier")

    result = await adapter.search_product(query)
    return result


@router.post("/{supplier_id}/order")
async def place_supplier_order(
    supplier_id: int, product_id: str, quantity: int = 1,
    db: Session = Depends(get_db),
):
    """Place an order with a supplier via their adapter."""
    supplier = crud.get_supplier(db, supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    adapter = get_adapter(supplier.code)
    if not adapter:
        raise HTTPException(status_code=400, detail="No adapter for this supplier")

    result = await adapter.place_order(product_id, quantity)
    return result
