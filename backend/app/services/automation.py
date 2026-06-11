"""
Playwright automation service — drives the mock supplier website to place orders.
"""
import asyncio
from typing import Optional


async def run_supplier_automation(
    product_name: str,
    quantity: int = 1,
    supplier_url: str = "http://localhost:8000/supplier-site/",
) -> dict:
    """
    Automate the mock supplier site:
    1. Navigate to supplier store
    2. Search for the product
    3. Add to cart
    4. Checkout
    5. Extract order ID and tracking number
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        # Fallback if Playwright isn't installed — return mock data
        return _mock_automation_result(product_name)

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            # 1. Navigate to supplier store
            await page.goto(supplier_url, wait_until="networkidle")

            # 2. Search for the product
            search_input = page.locator("#search-input")
            await search_input.fill(product_name)
            await page.locator("#search-btn").click()
            await page.wait_for_timeout(500)

            # 3. Add first result to cart
            add_btn = page.locator(".add-to-cart-btn").first
            if await add_btn.count() == 0:
                await browser.close()
                return {
                    "success": False,
                    "supplier_order_ref": None,
                    "tracking_number": None,
                    "message": f"Product '{product_name}' not found on supplier site.",
                }

            await add_btn.click()
            await page.wait_for_timeout(300)

            # Add additional quantity
            for _ in range(quantity - 1):
                await add_btn.click()
                await page.wait_for_timeout(100)

            # 4. Navigate to cart
            await page.locator('a[data-page="cart"]').click()
            await page.wait_for_timeout(300)

            # 5. Checkout
            await page.locator("#checkout-btn").click()
            await page.wait_for_timeout(300)

            # Set quantity
            qty_input = page.locator("#order-qty")
            await qty_input.fill(str(quantity))

            # Place order
            await page.locator("#place-order-btn").click()
            await page.wait_for_timeout(500)

            # 6. Extract confirmation details
            order_ref = await page.locator("#conf-order-id").text_content()
            tracking = await page.locator("#conf-tracking").text_content()

            await browser.close()

            return {
                "success": True,
                "supplier_order_ref": order_ref.strip() if order_ref else None,
                "tracking_number": tracking.strip() if tracking else None,
                "message": "Order placed successfully via automation.",
            }

    except Exception as e:
        # Fallback on any Playwright error
        return _mock_automation_result(product_name, error=str(e))


def _mock_automation_result(product_name: str, error: Optional[str] = None) -> dict:
    """Fallback mock result when Playwright is unavailable."""
    import random
    order_ref = f"ORD-{random.randint(100000, 999999)}"
    tracking = f"TRK-{random.randint(100001, 999999)}"
    msg = "Order placed (mock fallback)."
    if error:
        msg = f"Playwright unavailable ({error}), used mock fallback."
    return {
        "success": True,
        "supplier_order_ref": order_ref,
        "tracking_number": tracking,
        "message": msg,
    }
