from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from playwright.sync_api import sync_playwright
import logging

router = APIRouter(prefix="/api/scrape", tags=["Scraping"])
logger = logging.getLogger(__name__)

class ScrapeRequest(BaseModel):
    url: str

@router.post("/live")
def scrape_live_url(request: ScrapeRequest):
    """
    Spins up a headless browser using Playwright to extract the exact
    Title, Price, and other details directly from the live URL.
    Uses synchronous Playwright to avoid asyncio event loop conflicts on Windows.
    """
    url = request.url
    if not url.startswith('http'):
        url = 'https://' + url

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            page = context.new_page()
            
            page.goto(url, wait_until="domcontentloaded", timeout=45000)
            
            title = page.title()
            price_text = ""
            original_price_text = ""
            discount_text = ""
            rating_text = ""
            seller_name = ""

            # Detect platform
            if "amazon" in url.lower():
                try:
                    price_element = page.locator(".a-price-whole").first.text_content(timeout=3000)
                    if price_element:
                        price_text = "₹" + price_element.strip()
                except Exception:
                    pass
                
                try:
                    title_element = page.locator("#productTitle").first.text_content(timeout=2000)
                    if title_element:
                        title = title_element.strip()
                except Exception:
                    pass
                
                try:
                    op_el = page.locator(".a-text-price span[aria-hidden='true']").first.text_content(timeout=2000)
                    if op_el:
                        original_price_text = op_el.strip()
                except Exception:
                    pass

                try:
                    disc_el = page.locator(".savingsPercentage").first.text_content(timeout=2000)
                    if disc_el:
                        discount_text = disc_el.strip()
                except Exception:
                    pass

                try:
                    rating_el = page.locator("#acrPopover").first.get_attribute("title", timeout=2000)
                    if not rating_el:
                        rating_el = page.locator("span[data-hook='rating-out-of-text']").first.text_content(timeout=2000)
                    if rating_el:
                        rating_text = rating_el.split(" out of ")[0].strip() if " out of " in rating_el else rating_el.strip()
                except Exception:
                    pass

                try:
                    seller_el = page.locator("#merchant-info a, #tabular-buybox-truncate-1 .tabular-buybox-text span.a-size-small a, #sellerProfileTriggerId").first.text_content(timeout=2000)
                    if seller_el:
                        seller_name = seller_el.strip()
                except Exception:
                    seller_name = "Amazon.in Retail"

            elif "flipkart" in url.lower():
                seller_name = "Flipkart Retail"
                try:
                    price_element = page.locator("div[class*='Nx9bqj']").first.text_content(timeout=3000)
                    if price_element:
                        price_text = price_element.strip()
                except Exception:
                    pass

                try:
                    title_element = page.locator("span.VU-Tz5").first.text_content(timeout=2000)
                    if not title_element:
                        title_element = page.locator("span.B_NuCI").first.text_content(timeout=2000)
                    if title_element:
                        title = title_element.strip()
                except Exception:
                    pass

                try:
                    op_el = page.locator("div[class*='yRaY8j']").first.text_content(timeout=2000)
                    if op_el:
                        original_price_text = op_el.strip()
                except Exception:
                    pass

                try:
                    disc_el = page.locator("div[class*='UkUFwK']").first.text_content(timeout=2000)
                    if disc_el:
                        discount_text = disc_el.strip()
                except Exception:
                    pass

                try:
                    rating_el = page.locator("div[class*='XQDdHH']").first.text_content(timeout=2000)
                    if rating_el:
                        rating_text = rating_el.strip()
                except Exception:
                    pass
                    
                try:
                    seller_el = page.locator("#sellerName span span").first.text_content(timeout=2000)
                    if seller_el:
                        seller_name = seller_el.strip()
                except Exception:
                    seller_name = "Flipkart Retail"

            browser.close()

            if title:
                title = title.replace("|", "").replace("Amazon.in", "").replace("Flipkart.com", "").strip()

            # Calculate GST breakdown if we have a valid price
            base_price_text = None
            gst_amount_text = None
            if price_text:
                try:
                    # Clean the price string: remove ₹ and commas, then convert to float
                    clean_price = float(price_text.replace("₹", "").replace(",", "").strip())
                    base_price = round(clean_price / 1.18, 2)
                    gst_amount = round(clean_price - base_price, 2)
                    
                    # Format back to Indian Rupee style string
                    base_price_text = f"₹{base_price:,.2f}"
                    gst_amount_text = f"₹{gst_amount:,.2f}"
                except Exception as e:
                    logger.warning(f"Failed to calculate GST: {e}")

            return {
                "success": True,
                "title": title,
                "price": price_text if price_text else None,
                "originalPrice": original_price_text if original_price_text else None,
                "discount": discount_text if discount_text else None,
                "rating": rating_text if rating_text else None,
                "seller": seller_name if seller_name else "Unknown Retailer",
                "basePrice": base_price_text,
                "gstAmount": gst_amount_text
            }

    except Exception as e:
        logger.error(f"Playwright scrape failed: {e}")
        # Return success=False instead of 500 to let UI handle it gracefully
        return {
            "success": False,
            "title": "Unknown Product",
            "price": None,
            "error": str(e)
        }
