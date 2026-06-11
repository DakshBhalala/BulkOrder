"""
Product matching service using RapidFuzz for fuzzy string matching.
"""
from rapidfuzz import fuzz, process
from sqlalchemy.orm import Session
from typing import List, Tuple, Optional
from app import models, crud


MATCH_THRESHOLD = 60.0  # Minimum score for auto-match


def match_product_to_catalog(
    product_name: str,
    products: List[models.Product],
) -> Optional[Tuple[models.Product, float]]:
    """
    Match a product name against the supplier catalog using fuzzy matching.
    Returns (best_match_product, score) or None if no match above threshold.
    """
    if not products:
        return None

    choices = {p.id: p.name for p in products}
    result = process.extractOne(
        product_name,
        choices,
        scorer=fuzz.token_sort_ratio,
        score_cutoff=MATCH_THRESHOLD,
    )

    if result is None:
        return None

    matched_name, score, product_id = result
    matched_product = next((p for p in products if p.id == product_id), None)
    if matched_product is None:
        return None

    return matched_product, score


def run_matching_for_imported_orders(db: Session) -> List[dict]:
    """
    Match all orders with 'imported' status against the full product catalog.
    Returns list of match results.
    """
    orders = crud.get_orders(db, status=models.OrderStatus.IMPORTED, limit=500)
    all_products = crud.get_products(db)

    if not all_products:
        return []

    results = []
    for order in orders:
        match = match_product_to_catalog(order.product_name, all_products)

        if match:
            product, score = match
            crud.update_order_matching(
                db,
                order_id=order.id,
                matched_product_id=product.id,
                matched_product_name=product.name,
                match_score=score,
                supplier_id=product.supplier_id,
            )
            supplier = crud.get_supplier(db, product.supplier_id)
            results.append({
                "order_id": order.order_id,
                "product_name": order.product_name,
                "matched_product": product.name,
                "match_score": round(score, 1),
                "supplier_name": supplier.name if supplier else "Unknown",
                "auto_matched": score >= MATCH_THRESHOLD,
            })
        else:
            results.append({
                "order_id": order.order_id,
                "product_name": order.product_name,
                "matched_product": "No match found",
                "match_score": 0.0,
                "supplier_name": "N/A",
                "auto_matched": False,
            })

    return results
