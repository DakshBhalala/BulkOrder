"""
Matching routes: trigger matching and view results.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import MatchResult, MatchingResponse
from app.services.matcher import run_matching_for_imported_orders

router = APIRouter(prefix="/api/matching", tags=["matching"])


@router.post("/run", response_model=MatchingResponse)
def run_matching(db: Session = Depends(get_db)):
    """Run product matching for all imported orders."""
    results = run_matching_for_imported_orders(db)

    match_results = [
        MatchResult(
            order_id=r["order_id"],
            product_name=r["product_name"],
            matched_product=r["matched_product"],
            match_score=r["match_score"],
            supplier_name=r["supplier_name"],
            auto_matched=r["auto_matched"],
        )
        for r in results
    ]

    matched_count = sum(1 for r in results if r["auto_matched"])

    return MatchingResponse(
        total=len(results),
        matched=matched_count,
        results=match_results,
    )
