import logging
import time
from typing import Tuple, Optional
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def get_price_and_name(product_url: str, retries: int = 3) -> Tuple[Optional[float], Optional[str]]:
    for attempt in range(retries):
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                context = browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                )
                page = context.new_page()

                logger.info(f"Attempt {attempt + 1}: Navigating to pricehistory.app")
                page.goto("https://pricehistory.app", timeout=60000)

                search_input = page.locator('input[type="text"], input[name="url"], input[placeholder*="link" i]')
                search_input.first.wait_for(state="visible", timeout=15000)
                search_input.first.fill(product_url)
                
                logger.info("Triggering search...")
                page.keyboard.press("Enter")

                logger.info("Waiting for results to render (this can take up to 60 seconds)...")
                
                price_locator = page.locator('.ph-pricing-pricing')
                price_locator.first.wait_for(state="visible", timeout=60000)

                # Extract Product Name
                product_name = None
                name_locator = page.locator('.ph-title h1, .ph-title, h1')
                if name_locator.count() > 0:
                    raw_name = name_locator.first.inner_text()
                    product_name = raw_name.split('\n')[0].strip()

                # Extract Current Price
                current_price = None
                if price_locator.count() > 0:
                    raw_price = price_locator.first.inner_text()
                    clean_price = raw_price.replace('₹', '').replace(',', '').strip()
                    if clean_price:
                        current_price = float(clean_price)

                browser.close()

                if current_price:
                    logger.info(f"Success! Found: {product_name} at ₹{current_price}")
                    return current_price, product_name
                else:
                    logger.warning("Price element '.ph-pricing-pricing' not found.")

        except PlaywrightTimeoutError:
            logger.warning(f"Timeout error on attempt {attempt + 1}. The site took too long to respond.")
        except Exception as e:
            logger.error(f"Unexpected error on attempt {attempt + 1}: {str(e)}")

        if attempt < retries - 1:
            logger.info("Retrying in 3 seconds...")
            time.sleep(3)

    logger.error("All scraper retries failed for this URL.")
    return None, None
