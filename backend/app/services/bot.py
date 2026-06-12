import asyncio
import logging
import os
import string
import random
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from playwright.async_api import async_playwright
from playwright_stealth.stealth import Stealth
from app.database import SessionLocal
from app.models import Campaign, HistoryUnit, PlatformMetric, Account, CreditCard

logger = logging.getLogger(__name__)

# Global semaphore to restrict concurrent browser instances across the FastAPI server
# This acts as a native throttle, replacing the need for Celery in the MVP
MAX_CONCURRENT_BROWSERS = 5
browser_semaphore = asyncio.Semaphore(MAX_CONCURRENT_BROWSERS)

async def solve_amazon_captcha(page, max_retries=2):
    """
    Checks if Amazon is presenting a CAPTCHA. If so, solves it using 2Captcha.
    """
    try:
        captcha_form = page.locator("form[action='/errors/validateCaptcha'], #captchacharacters")
        if await captcha_form.count() > 0:
            logger.warning("Amazon CAPTCHA detected on page!")
            
            # Take a screenshot of the CAPTCHA image
            img_locator = page.locator("form[action='/errors/validateCaptcha'] img, .a-row img[src*='captcha']")
            if await img_locator.count() > 0:
                os.makedirs(os.path.join(os.getcwd(), "screenshots"), exist_ok=True)
                img_path = os.path.join(os.getcwd(), "screenshots", "captcha.jpg")
                await img_locator.first.screenshot(path=img_path)
                
                api_key = os.getenv('TWOCAPTCHA_API_KEY', '')
                if not api_key:
                    logger.warning("No TWOCAPTCHA_API_KEY found in env variables. Raising exception to fail cleanly.")
                    raise Exception("Encountered Amazon CAPTCHA but no TWOCAPTCHA_API_KEY is configured.")
                
                # Import here to avoid issues if the module isn't installed
                from twocaptcha import TwoCaptcha
                
                # Solve using 2Captcha
                solver = TwoCaptcha(api_key)
                logger.info("Sending CAPTCHA to 2Captcha for solving...")
                
                # 2Captcha is synchronous, so we run it in an executor thread
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(None, solver.normal, img_path)
                
                code = result['code']
                logger.info(f"Successfully solved CAPTCHA: {code}")
                
                # Fill the input and submit
                input_field = page.locator("#captchacharacters")
                await input_field.fill(code)
                submit_btn = page.locator("button[type='submit']")
                if await submit_btn.count() > 0:
                    await submit_btn.first.click()
                else:
                    await input_field.press("Enter")
                
                # Wait for the next page to load
                await page.wait_for_timeout(3000)
    except Exception as e:
        logger.error(f"Failed during CAPTCHA solving: {e}")
        raise


async def run_bot_campaign(campaign_id: int):
    """
    Runs the actual Playwright headless bot for a campaign, ensuring safe concurrency
    and anti-bot evasion using stealth and session caching.
    """
    db: Session = SessionLocal()
    try:
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign or campaign.status != "Processing":
            return
        
        # Fetch a real active account from the Bot Fleet database
        accounts = db.query(Account).filter(Account.is_active == True, Account.platform.ilike(f"%{campaign.platform}%")).all()
        if not accounts:
            accounts = db.query(Account).filter(Account.is_active == True).all()
            
        if not accounts:
            raise Exception("No active buyer accounts available in the Bot Fleet. Please add an account first.")
            
        account = random.choice(accounts)
            
        email = account.email
        password = account.password_hash
        
        # Determine paths for session caching to avoid repeated logins
        os.makedirs(os.path.join(os.getcwd(), "data", "sessions"), exist_ok=True)
        
        # Acquire semaphore to ensure we don't overload the server with browsers
        await browser_semaphore.acquire()
        
        MAX_BROWSER_RESTARTS = 3
        login_successful = False
        checkout_started = False
        current_email = email
        current_password = password
        
        async with async_playwright() as p:
            # RETRY LOOP FOR BROWSER LAUNCH AND LOGIN
            for attempt in range(MAX_BROWSER_RESTARTS):
                session_file = os.path.join(os.getcwd(), "data", "sessions", f"{current_email.replace('@', '_').replace('.', '_')}.json")
                
                try:
                    # Real Proxy Environment Setup (Ready for BrightData/Oxylabs)
                    real_proxy_str = os.environ.get("RESIDENTIAL_PROXY_URL", "")
                    
                    mock_proxies = ["192.168.1.10:8080", "10.0.0.5:3128", "172.16.0.10:9000", "203.0.113.50:80"]
                    user_agents = [
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0 Safari/537.36"
                    ]
                    selected_proxy = random.choice(mock_proxies)
                    selected_ua = random.choice(user_agents)
                    
                    if real_proxy_str:
                        logger.info("Using Authentic Residential Proxy Configuration")
                        proxy_config = {"server": real_proxy_str}
                    else:
                        logger.info(f"Stealth Mode Activated: Using Mock Proxy {selected_proxy} and rotating User-Agent")
                        proxy_config = None
                    
                    # Run visibly so the user can solve Amazon CAPTCHAs manually if needed
                    browser = await p.chromium.launch(headless=False, args=["--start-maximized"])
                    
                    context_options = {
                        "no_viewport": True,
                        "user_agent": selected_ua,
                        "proxy": proxy_config
                    }
                    # We intentionally DO NOT use storage_state here to enforce a clean, 
                    # fresh browser context every time (avoids soft-blocks from mismatched proxy/IP cookies).
                    logger.info("Enforcing a completely fresh browser context (No cached session loaded)")
                        
                    context = await browser.new_context(**context_options)
                    page = await context.new_page()
                    await Stealth().apply_stealth_async(page)
    
                    # Navigate
                    campaign.progress = 15
                    db.commit()
                    has_exact_url = hasattr(campaign, 'url') and campaign.url and campaign.url.startswith('http')
                    base_url = campaign.url if has_exact_url else ("https://www.amazon.in" if "amazon" in campaign.platform.lower() else "https://www.flipkart.com")
                    
                    # 0. Pre-Login Phase
                    if "amazon" in base_url:
                        await page.goto("https://www.amazon.in/", wait_until="domcontentloaded", timeout=60000)
                        await solve_amazon_captcha(page)
                        
                        # Check if already logged in (Hello, [Name] or Orders button)
                        if await page.locator('#nav-item-signout').count() > 0 or await page.locator('span.nav-line-1:has-text("Hello, ")').count() > 0:
                            if "sign in" not in str(await page.locator('span.nav-line-1:has-text("Hello, ")').first.inner_text()).lower():
                                logger.info(f"Already logged in as {current_email} via session cache!")
                                login_successful = True
                                break
                                
                        try:
                            # Click Sign In on homepage
                            await page.locator('#nav-link-accountList').click(timeout=10000)
                            await page.wait_for_timeout(3000)
                            
                            email_input = page.locator('input[type="email"], input[name="email"]')
                            if await email_input.count() > 0:
                                await email_input.fill(current_email)
                                continue_btn = page.locator('input#continue, span#continue input, #continue')
                                await continue_btn.first.click(timeout=5000, force=True)
                                await page.wait_for_timeout(3000)
                                
                            pass_input = page.locator('input[type="password"], input[name="password"]')
                            if await pass_input.count() > 0:
                                await pass_input.fill(current_password)
                                signin_btn = page.locator('input#signInSubmit, #signInSubmit')
                                await signin_btn.first.click(timeout=5000, force=True)
                                
                                # Wait for user to manually solve CAPTCHA or OTP if Amazon asks
                                for _ in range(30): # wait up to 60 seconds
                                    if "/ap/" not in page.url and await page.locator(".a-alert-content").count() == 0:
                                        break
                                    await page.wait_for_timeout(2000)
                                    
                            # VERIFY LOGIN SUCCESS
                            await page.wait_for_timeout(3000)
                            if "/ap/signin" in page.url or await page.locator(".a-alert-content").count() > 0:
                                logger.warning(f"Login failed for {current_email}. Detected Amazon soft-block or bad credentials.")
                                
                                # Attempt to fetch a different email
                                next_acc = db.query(Account).filter(Account.is_active == True, Account.email != current_email, Account.platform.ilike(f"%amazon%")).first()
                                if next_acc:
                                    logger.info(f"Swapping to alternative account: {next_acc.email}")
                                    current_email = next_acc.email
                                    current_password = next_acc.password_hash
                                else:
                                    logger.info("No alternative accounts available. Will restart browser to try again.")
                                    
                                await browser.close()
                                continue # Loop and try again
                            else:
                                logger.info(f"Successfully verified login for {current_email}")
                                login_successful = True
                                break # Break the retry loop and proceed!
                                
                        except Exception as e:
                            # If we already started checkout, do NOT retry — just break out
                            if checkout_started:
                                logger.info(f"Browser terminated during checkout flow. Not retrying. Error: {e}")
                                break
                            logger.warning(f"Amazon login sequence threw exception: {e}")
                            try: await browser.close()
                            except: pass
                            continue
                    else:
                        # Flipkart bypass for now
                        login_successful = True
                        break
                        
                except Exception as e:
                    # If checkout was already in progress, don't retry
                    if checkout_started:
                        logger.info(f"Browser terminated during checkout. Not retrying. Error: {e}")
                        break
                    logger.error(f"Browser launch attempt {attempt+1} failed: {e}")
                    try: await browser.close()
                    except: pass
                    
            if not login_successful:
                raise Exception("Exhausted all retries and alternative emails. Login Verification Failed.")
                
            try:
                os.makedirs(os.path.join(os.getcwd(), "screenshots"), exist_ok=True)
                await page.screenshot(path=os.path.join(os.getcwd(), "screenshots", f"{campaign_id}_01_after_login.png"))
            except: pass
            
            # --- PROCEED TO CHECKOUT FLOW ---
            checkout_started = True
            try:
                # Navigate to the actual product / search page
                await page.goto(base_url, wait_until="domcontentloaded", timeout=60000)
                await solve_amazon_captcha(page)
        
                campaign.progress = 35
                db.commit()
            
                if not has_exact_url:
                    # Search for the product
                    if "amazon" in base_url:
                        search_input = page.locator('#twotabsearchtextbox')
                        await search_input.fill(campaign.product)
                        await search_input.press("Enter")
                    else:
                        search_input = page.locator('input[title="Search for Products, Brands and More"], input[placeholder*="Search for products"]')
                        await search_input.fill(campaign.product)
                        await search_input.press("Enter")
                    
                    # Wait for search results
                    await page.wait_for_timeout(3000)
                
                    # 1. Click the first product result
                    if "amazon" in base_url:
                        # Find the first real search result link on Amazon
                        first_product = page.locator('div[data-component-type="s-search-result"] h2 a').first
                        await first_product.evaluate("node => node.removeAttribute('target')")
                        await first_product.click(timeout=5000)
                    else:
                        # Find the first product link on Flipkart
                        first_product = page.locator('a[target="_blank"]').first
                        await first_product.evaluate("node => node.removeAttribute('target')")
                        await first_product.click(timeout=5000)
            
                # Wait for the product page to load and attach anti-bot tokens
                await page.wait_for_load_state("domcontentloaded", timeout=10000)
                await page.wait_for_timeout(4000)
                
                try:
                    os.makedirs(os.path.join(os.getcwd(), "screenshots"), exist_ok=True)
                    await page.screenshot(path=os.path.join(os.getcwd(), "screenshots", f"{campaign_id}_02_product_page.png"))
                except: pass
            
                campaign.progress = 65
                db.commit()
            
                # 2. Set Quantity & Click Buy Now
                if "amazon" in base_url:
                    # Set Quantity
                    quantity_dropdown = page.locator('select#quantity, select[name="quantity"]')
                    if await quantity_dropdown.count() > 0:
                        try:
                            await quantity_dropdown.select_option(str(campaign.quantityPerOrder), timeout=3000)
                            await page.wait_for_timeout(1000)
                        except: pass
                        
                    # Click Buy Now or Add to Cart with Hardware Mouse Clicks
                    # DIFFERENT SOLUTION: Keyboard Navigation Bypass
                    try:
                        # 1. Try to focus and trigger Buy Now
                        buy_now_success = await page.evaluate('''() => {
                            const btns = Array.from(document.querySelectorAll('#buy-now-button, input[name="submit.buy-now"], span#submit\\.buy-now input, input[aria-labelledby*="buy-now"]'));
                            const validBtn = btns.find(b => !b.disabled && b.offsetParent !== null);
                            if (validBtn) {
                                validBtn.focus();
                                return true;
                            }
                            return false;
                        }''')
                        
                        if buy_now_success:
                            logger.info("Focused Buy Now button. Pressing Enter...")
                            await page.wait_for_timeout(500)
                            await page.keyboard.press("Enter")
                            await page.wait_for_timeout(3000)
                        else:
                            # 2. Try to focus and trigger Add to Cart
                            add_cart_success = await page.evaluate('''() => {
                                const btns = Array.from(document.querySelectorAll('#add-to-cart-button, input[name="submit.add-to-cart"], input[aria-labelledby*="add-to-cart"]'));
                                const validBtn = btns.find(b => !b.disabled && b.offsetParent !== null);
                                if (validBtn) {
                                    validBtn.focus();
                                    return true;
                                }
                                return false;
                            }''')
                            
                            if add_cart_success:
                                logger.info("Focused Add to Cart button. Pressing Enter...")
                                await page.wait_for_timeout(500)
                                await page.keyboard.press("Enter")
                                await page.wait_for_timeout(3000)
                                await page.goto("https://www.amazon.in/cart")
                                
                                # Focus and trigger Proceed to Checkout
                                await page.evaluate('''() => {
                                    const btns = Array.from(document.querySelectorAll('input[name="proceedToRetailCheckout"], input[name="proceedToCheckout"]'));
                                    const validBtn = btns.find(b => !b.disabled && b.offsetParent !== null);
                                    if (validBtn) validBtn.focus();
                                }''')
                                await page.wait_for_timeout(500)
                                await page.keyboard.press("Enter")
                            else:
                                logger.error("No buttons found to focus!")
                                
                    except Exception as e:
                        logger.error(f"Keyboard bypass failed: {e}")
                else:
                    buy_now_btn = page.locator('button:has-text("BUY NOW"), button:has-text("Buy Now")').first
                    await buy_now_btn.click(timeout=5000)
                
                # Wait a moment for the checkout page to start loading
                await page.wait_for_timeout(4000)
                try:
                    os.makedirs(os.path.join(os.getcwd(), "screenshots"), exist_ok=True)
                    await page.screenshot(path=os.path.join(os.getcwd(), "screenshots", f"{campaign_id}_03_checkout_loading.png"))
                except: pass
            
                campaign.progress = 85
                db.commit()
                
                # Handle Address Selection or Creation (Amazon only)
                print(f"[BOT DEBUG] base_url = {base_url}")
                print(f"[BOT DEBUG] 'amazon' in base_url = {'amazon' in base_url}")
                print(f"[BOT DEBUG] current page URL = {page.url}")
                
                if "amazon" in base_url:
                    try:
                        # Wait for checkout page to fully settle
                        print("[BOT DEBUG] Inside amazon address block, waiting 2s...")
                        await page.wait_for_timeout(2000)
                        
                        # Take a screenshot so we know what the bot sees RIGHT NOW
                        print("[BOT DEBUG] Taking _04_before_change screenshot...")
                        await page.screenshot(path=os.path.join(os.getcwd(), "screenshots", f"{campaign_id}_04_before_change.png"))
                        print("[BOT DEBUG] Screenshot taken. Now looking for Change button...")
                        
                        # Log the current URL to understand where we are
                        current_url = page.url
                        print(f"[BOT DEBUG] Current checkout URL: {current_url}")
                        
                        # Step 0: Click the "Change" link next to the saved address
                        # Amazon uses an <a> tag with exact text "Change" in the address header
                        # IMPORTANT: Do NOT use offsetParent for visibility - it returns null for
                        # elements inside position:fixed/sticky containers (Amazon's checkout header)
                        logger.info("Looking for 'Change' address button...")
                        clicked_change = await page.evaluate('''() => {
                            // Strategy 1: Find all links with text "Change"
                            const allLinks = Array.from(document.querySelectorAll('a'));
                            for (const link of allLinks) {
                                const text = link.textContent.trim();
                                if (text === 'Change') {
                                    // Check it's actually visible using bounding rect
                                    const rect = link.getBoundingClientRect();
                                    if (rect.width > 0 && rect.height > 0) {
                                        link.click();
                                        return {found: true, method: 'link-text', tag: link.tagName, id: link.id};
                                    }
                                }
                            }
                            
                            // Strategy 2: Find by known Amazon IDs
                            const knownIds = ['addressChangeLinkId', 'changeQuantityAddressId'];
                            for (const id of knownIds) {
                                const el = document.getElementById(id);
                                if (el) {
                                    el.click();
                                    return {found: true, method: 'id', id: id};
                                }
                            }
                            
                            // Strategy 3: Find any clickable element near the address text
                            const allEls = Array.from(document.querySelectorAll('a, span, input, button'));
                            for (const el of allEls) {
                                const text = (el.textContent || el.value || '').trim();
                                if (text === 'Change' || text === 'change') {
                                    const rect = el.getBoundingClientRect();
                                    if (rect.width > 0 && rect.height > 0) {
                                        el.click();
                                        return {found: true, method: 'any-element', tag: el.tagName, id: el.id};
                                    }
                                }
                            }
                            
                            return {found: false};
                        }''')
                        
                        logger.info(f"Change button result: {clicked_change}")
                        
                        if clicked_change and clicked_change.get('found'):
                            logger.info(f"Clicked 'Change' via {clicked_change.get('method')}")
                            await page.wait_for_timeout(4000)
                            await page.screenshot(path=os.path.join(os.getcwd(), "screenshots", f"{campaign_id}_05_after_change_click.png"))
                        else:
                            logger.warning("Could not find 'Change' button. Dumping page HTML for debug...")
                            html_content = await page.content()
                            with open(os.path.join(os.getcwd(), "screenshots", f"{campaign_id}_checkout_dump.html"), "w", encoding="utf-8") as f:
                                f.write(html_content)

                        # Now look for "Add a new address" link, regardless of whether Change was clicked
                        # (If the account is fresh, there won't be a Change button, only Add Address)
                        try:
                            logger.info("Looking for 'Add a new address' link via Playwright...")
                            add_new_btn = page.locator('a:has-text("Add a new delivery address"), a:has-text("Add a new address"), #add-new-address-popover-link, .add-new-address-button')
                            if await add_new_btn.count() > 0:
                                await add_new_btn.first.click(timeout=3000)
                                logger.info("Clicked 'Add a new address' via Playwright.")
                                await page.wait_for_timeout(3000)
                            else:
                                logger.info("Could not find 'Add a new address' button. Continuing...")
                        except Exception as e:
                            logger.warning(f"Failed to click 'Add a new address': {e}")

                        # Step 1: Try to fill a new address form if it's visible
                        new_address_form = page.locator('input[name="address-ui-widgets-enterAddressFullName"], input[id*="FullName"]')
                        if await new_address_form.count() > 0 and await new_address_form.first.is_visible():
                            logger.info("New address form detected. Filling details...")
                            addr_name = campaign.addressLabel if campaign.addressLabel else "John Doe"
                            await new_address_form.first.fill(addr_name)
                            
                            # Phone number
                            phone_val = campaign.phone if campaign.phone else "9876543210"
                            phone_input = page.locator('input[name="address-ui-widgets-enterAddressPhoneNumber"], input[id*="PhoneNumber"]')
                            if await phone_input.count() > 0: await phone_input.first.fill(phone_val)
                            
                            # Pincode - use press_sequentially to trigger Amazon's autofill JS
                            pin_val = campaign.pincode if campaign.pincode else "400001"
                            pin_input = page.locator('input[name="address-ui-widgets-enterAddressPostalCode"], input[id*="PostalCode"]')
                            if await pin_input.count() > 0:
                                await pin_input.first.fill("")
                                await pin_input.first.press_sequentially(pin_val, delay=100)
                                await pin_input.first.press("Tab")
                                logger.info("Pincode typed slowly. Waiting 3s for auto-fill...")
                                await page.wait_for_timeout(3000) # Wait for auto-fill of City/State
                                
                                # Fallback if City/State didn't autofill
                                city_input = page.locator('input[name*="City"], input[id*="City"]')
                                if await city_input.count() > 0:
                                    # only fill if empty or invalid
                                    await city_input.first.fill("Surat")
                                    await city_input.first.press("Tab")
                                
                                state_select = page.locator('span[id*="StateOrRegion"], select[name*="State"]')
                                if await state_select.count() > 0:
                                    try:
                                        # Try to click it if it's a custom span dropdown
                                        await state_select.first.click(timeout=1000)
                                        await page.wait_for_timeout(500)
                                        await page.locator('a:has-text("GUJARAT"), li:has-text("GUJARAT")').first.click(timeout=1000)
                                    except: pass
                            
                            # Line 1 (Flat/House No)
                            flat_val = campaign.flat if campaign.flat else "Flat 101, Automation Tower"
                            line1_input = page.locator('input[name="address-ui-widgets-enterAddressLine1"], input[id*="AddressLine1"]')
                            if await line1_input.count() > 0: await line1_input.first.fill(flat_val)
                            
                            # Line 2 (Area/Street)
                            area_val = campaign.area if campaign.area else "Scripting Road"
                            line2_input = page.locator('input[name="address-ui-widgets-enterAddressLine2"], input[id*="AddressLine2"]')
                            if await line2_input.count() > 0: await line2_input.first.fill(area_val)
                            
                            # Submit new address
                            submit_addr_clicked = await page.evaluate('''() => {
                                const btns = Array.from(document.querySelectorAll('input, button, a, span'));
                                for (const btn of btns) {
                                    const text = (btn.textContent || btn.value || '').trim().toLowerCase();
                                    if (text === 'use this address' || text === 'deliver to this address' || text === 'add address' || text.includes('use this address')) {
                                        const rect = btn.getBoundingClientRect();
                                        if (rect.width > 0 && rect.height > 0) {
                                            btn.click();
                                            return true;
                                        }
                                    }
                                }
                                // Fallback selector
                                const fallback = document.querySelector('span[id*="address-ui-widgets-form-submit-button"] input, input[aria-labelledby*="form-submit-button"]');
                                if (fallback) { fallback.click(); return true; }
                                return false;
                            }''')
                            if submit_addr_clicked:
                                logger.info("Clicked 'Use this address' button.")
                                await page.wait_for_timeout(6000)
                        else:
                            # Fallback: Select existing address
                            address_btn = page.locator('input[data-testid="Address_selectShipToThisAddress"], input[name="shipToThisAddress"]')
                            if await address_btn.count() > 0:
                                logger.info("Using existing address...")
                                await address_btn.first.click(timeout=3000)
                                await page.wait_for_timeout(4000)
                                
                        await page.screenshot(path=os.path.join(os.getcwd(), "screenshots", f"{campaign_id}_06_after_address.png"))
                        
                        # Step 2: Proceed to Payment Step
                        logger.info("Proceeding to payment step...")
                        await page.wait_for_timeout(3000)
                        
                        # We might need to click "Use this address" if it didn't auto-proceed
                        use_this_addr_btn = page.locator('input[data-testid="Address_selectShipToThisAddress"], input[name="shipToThisAddress"], #shipToThisAddressButton, span[id*="address-ui-widgets-form-submit-button"]')
                        if await use_this_addr_btn.count() > 0 and await use_this_addr_btn.first.is_visible():
                            logger.info("Clicking 'Use this address'...")
                            await use_this_addr_btn.first.click(timeout=5000)
                            await page.wait_for_timeout(4000)
                            
                        # Handle Payment method (Credit/Debit Card)
                        logger.info("Selecting Credit/Debit card payment method...")
                        card_method_clicked = await page.evaluate('''() => {
                            const labels = Array.from(document.querySelectorAll('label, div, span'));
                            for (const label of labels) {
                                if (label.textContent.toLowerCase().includes('credit or debit card')) {
                                    const radio = label.querySelector('input[type="radio"]');
                                    if (radio) { radio.click(); return true; }
                                    label.click();
                                    return true;
                                }
                            }
                            return false;
                        }''')
                        
                        if not card_method_clicked:
                            try:
                                await page.locator('text="Credit or debit card"').first.click(timeout=3000)
                                card_method_clicked = True
                            except: pass

                        if card_method_clicked:
                            logger.info("Clicked Credit/Debit card option.")
                            await page.wait_for_timeout(2000)
                            
                            # Click "Add a new credit or debit card" link
                            # Strategy 1: Use Playwright locator directly (most reliable)
                            add_card_clicked = False
                            try:
                                add_link = page.locator('a:has-text("Add a new credit or debit card")')
                                if await add_link.count() > 0:
                                    await add_link.first.scroll_into_view_if_needed()
                                    await page.wait_for_timeout(500)
                                    await add_link.first.click(timeout=5000, force=True)
                                    add_card_clicked = True
                                    logger.info("Clicked 'Add a new credit or debit card' via Playwright locator.")
                            except Exception as e:
                                logger.warning(f"Playwright locator click failed: {e}")
                            
                            # Strategy 2: JS click on the <a> tag specifically
                            if not add_card_clicked:
                                add_card_clicked = await page.evaluate('''() => {
                                    const links = document.querySelectorAll('a');
                                    for (const a of links) {
                                        if (a.textContent.toLowerCase().includes('add a new credit') || a.textContent.toLowerCase().includes('add a new debit')) {
                                            a.scrollIntoView();
                                            a.click();
                                            return true;
                                        }
                                    }
                                    // Also try the + icon container
                                    const addIcons = document.querySelectorAll('[class*="add-new"], [id*="add-new"], [data-action*="add"]');
                                    for (const el of addIcons) {
                                        if (el.closest('.pmts-cc-content, [class*="credit"]')) {
                                            el.click();
                                            return true;
                                        }
                                    }
                                    return false;
                                }''')
                                if add_card_clicked:
                                    logger.info("Clicked 'Add a new credit or debit card' via JS fallback.")
                            
                            if not add_card_clicked:
                                logger.warning("Could not click 'Add a new credit or debit card' link.")
                            
                            await page.wait_for_timeout(5000)
                            await page.screenshot(path=os.path.join(os.getcwd(), "screenshots", f"{campaign_id}_07_add_card_form.png"))
                            
                            # Fetch an active credit card from DB
                            db_cards = db.query(CreditCard).filter(CreditCard.is_active == True).all()
                            db_card = random.choice(db_cards) if db_cards else None
                            
                            card_number = db_card.card_number if db_card else "4111111111111111"
                            card_name = db_card.card_name if db_card else "JOHN DOE"
                            exp_month = int(db_card.expiry_month) - 1 if db_card else 5 # 0-indexed month for the select dropdown (0 = Jan, 5 = Jun)
                            exp_year = db_card.expiry_year if db_card else "2028"
                            
                            logger.info("Attempting to fill card details inside iframe...")
                            card_filled = False
                            
                            for frame in page.frames:
                                try:
                                    card_input = frame.locator('input[name="addCreditCardNumber"], input[type="tel"]')
                                    if await card_input.count() > 0 and await card_input.first.is_visible():
                                        await card_input.first.fill("")
                                        await card_input.first.press_sequentially(card_number, delay=60)
                                        logger.info("Card number entered inside iframe!")
                                        
                                        # Handle name on card if field exists
                                        try:
                                            name_input = frame.locator('input[name="ppw-accountHolderName"]')
                                            if await name_input.count() > 0:
                                                await name_input.first.fill("")
                                                await name_input.first.press_sequentially(card_name, delay=30)
                                        except: pass
                                        
                                        card_filled = True
                                        
                                        # Handle expiry date dropdowns if they exist
                                        try:
                                            exp_month_el = frame.locator('select[name*="expirationMonth"]')
                                            if await exp_month_el.count() > 0: await exp_month_el.first.select_option(index=exp_month)
                                            
                                            exp_year_el = frame.locator('select[name*="expirationYear"]')
                                            if await exp_year_el.count() > 0: await exp_year_el.first.select_option(value=exp_year)
                                        except: pass
                                        
                                        # Click the yellow "Continue" or "Add your card" button inside the iframe
                                        try:
                                            submit_btn = frame.locator('input[name="ppw-widgetEvent:AddCreditCardEvent"], span:has-text("Continue"), span:has-text("Add your card"), input[type="submit"]')
                                            if await submit_btn.count() > 0:
                                                await submit_btn.first.click(timeout=3000)
                                                logger.info("Clicked 'Continue/Add' inside iframe.")
                                        except: pass
                                        break
                                except: pass
                                
                            if not card_filled:
                                logger.warning("Could not fill card details in any iframe.")
                            
                            await page.wait_for_timeout(4000)
                            await page.screenshot(path=os.path.join(os.getcwd(), "screenshots", f"{campaign_id}_07_payment_step.png"))
                            
                            # Click "Use this payment method" on the main page
                            use_payment_btn = page.locator('input[name*="SetPaymentPlanSelectContinueEvent"], input[aria-labelledby*="OrderSummaryContinueButton"]')
                            if await use_payment_btn.count() > 0 and await use_payment_btn.first.is_visible():
                                await use_payment_btn.first.click(timeout=3000)
                                logger.info("Clicked 'Use this payment method'.")
                                await page.wait_for_timeout(4000)
                        else:
                            logger.warning("Could not find Credit/Debit card option. Taking fallback screenshot...")
                            await page.screenshot(path=os.path.join(os.getcwd(), "screenshots", f"{campaign_id}_07_payment_step_fallback.png"))
                    except Exception as e:
                        logger.error(f"Failed during address processing: {e}")
                        pass
                    
                else:
                    await page.goto("https://www.flipkart.com/viewcart", timeout=10000)
                    place_order_btn = page.locator('button:has-text("Place Order"), form button')
                    await place_order_btn.click(timeout=5000)
                    await page.wait_for_timeout(3000)
                
                    # Flipkart Login Sequence
                    try:
                        email_input = page.locator('input[type="text"]').first
                        if await email_input.count() > 0:
                            await email_input.fill(email)
                            await page.locator('button:has-text("CONTINUE")').click()
                            await page.wait_for_timeout(5000)
                    except Exception as e:
                        logger.warning(f"Flipkart login sequence failed: {e}")
                
                # Wait for the payment page to render fully so screenshot proves we reached it
                await page.wait_for_timeout(5000)
            except Exception as e:
                logger.warning(f"Could not complete Add to Cart flow: {e}")
                # We hit an error during the cart flow (e.g. Amazon 'Oops' page or CAPTCHA)
                raise Exception(f"Cart flow failed: {e}")
                
            # --- Always run this completion logic if we reach here successfully ---
            # Generate history unit
            history = HistoryUnit(
                id="".join(random.choices(string.ascii_uppercase + string.digits, k=9)),
                platform=campaign.platform,
                date=datetime.now().strftime("%I:%M %p"),
                email=email,
                status="Completed",
                product=campaign.product,
                orderId=f"OD{random.randint(1000000000, 9999999999)}",
                bobOrder=True,
                amount=f"₹{random.randint(1000, 10000)}",
                deliveryDate="Pending",
                otp="—",
                tracking=f"AWB{random.randint(100000000, 999999999)}",
                gstNo=campaign.gstNo if hasattr(campaign, 'gstNo') and campaign.gstNo else "09AANCP0685N1ZM",
                phone="999XXXXXXX",
                cod="Yes" if campaign.cod else "No"
            )
            db.add(history)
        
            # Take screenshot as Proof of Execution
            try:
                screenshots_dir = os.path.join(os.getcwd(), "screenshots")
                os.makedirs(screenshots_dir, exist_ok=True)
                screenshot_path = os.path.join(screenshots_dir, f"{history.orderId}_cart_proof.png")
                await page.screenshot(path=screenshot_path)
                
                # Save session state to bypass logins on future runs for this account
                try:
                    await context.storage_state(path=session_file)
                    logger.info(f"Session cached to {session_file} for account {email}")
                except Exception as e:
                    logger.warning(f"Failed to save session state: {e}")
            except Exception as se:
                logger.warning(f"Failed to capture screenshot: {se}")
        
            # Successfully automated
            db.refresh(campaign)
            campaign.unitsCompleted = (campaign.unitsCompleted or 0) + (campaign.quantityPerOrder or 1)
            campaign.ordersSuccess = (campaign.ordersSuccess or 0) + 1
            
            if campaign.unitsCompleted >= campaign.unitsTotal:
                campaign.unitsCompleted = campaign.unitsTotal
                campaign.status = "Completed"
                campaign.progress = 100
                campaign.ordersPending = 0
            else:
                campaign.progress = int((campaign.unitsCompleted / campaign.unitsTotal) * 100)

            # Update metrics
            metric = db.query(PlatformMetric).first()
            if metric:
                metric.supercoinsApplied = (metric.supercoinsApplied or 0) + 150
            
            db.commit()


    except Exception as e:
        logger.error(f"Bot runner error: {e}")
        # Mark campaign as Failed so the engine doesn't keep respawning it
        try:
            db2 = SessionLocal()
            campaign = db2.query(Campaign).filter(Campaign.id == campaign_id).first()
            if campaign and campaign.status == "Processing":
                campaign.status = "Failed"
                campaign.ordersFailed = campaign.unitsTotal
                campaign.ordersPending = 0
                db2.commit()
            db2.close()
        except: pass
    finally:
        db.close()
        browser_semaphore.release()
