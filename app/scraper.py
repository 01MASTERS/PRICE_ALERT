import logging
import re
import time
from typing import Optional, Tuple

from playwright.sync_api import Page, TimeoutError as PlaywrightTimeoutError, sync_playwright

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

DIRECT_PRICE_CLASSES = ("v1zwn21l", "v1zwn20", "_1psv1zeb9", "_1psv1ze0")
DIRECT_PRICE_SELECTOR = ".v1zwn21l.v1zwn20._1psv1zeb9._1psv1ze0"
DIRECT_PRICE_XPATH = (
    "//*"
    "[contains(concat(' ', normalize-space(@class), ' '), ' v1zwn21l ')]"
    "[contains(concat(' ', normalize-space(@class), ' '), ' v1zwn20 ')]"
    "[contains(concat(' ', normalize-space(@class), ' '), ' _1psv1zeb9 ')]"
    "[contains(concat(' ', normalize-space(@class), ' '), ' _1psv1ze0 ')]"
)
DIRECT_PRICE_SELECTORS = (
    DIRECT_PRICE_SELECTOR,
    f"xpath={DIRECT_PRICE_XPATH}",
    ".Nx9bqj.CxhGGd",
    "._30jeq3._16Jk6d",
    "._30jeq3",
)


def parse_price(raw_price: str) -> Optional[float]:
    match = re.search(r"(\d[\d,]*(?:\.\d+)?)", raw_price or "")
    if not match:
        return None

    try:
        price = float(match.group(1).replace(",", ""))
    except ValueError:
        return None

    return price if price > 0 else None


def extract_page_title(page: Page) -> Optional[str]:
    for selector in ("h1", "title"):
        locator = page.locator(selector)
        if locator.count() == 0:
            continue

        name = locator.first.inner_text().strip()
        if name:
            return name.split("\n")[0].strip()

    title = page.title().strip()
    return title or None


def find_price_from_locators(page: Page) -> Tuple[Optional[float], Optional[str]]:
    for selector in DIRECT_PRICE_SELECTORS:
        locator = page.locator(selector)
        count = locator.count()
        logger.info(f"Direct selector {selector!r} matched {count} element(s).")

        for index in range(count):
            item = locator.nth(index)
            try:
                if not item.is_visible():
                    continue
                raw_price = item.inner_text(timeout=3000).strip()
            except Exception as exc:
                logger.debug(f"Could not read direct price candidate {selector}[{index}]: {exc}")
                continue

            current_price = parse_price(raw_price)
            if current_price is not None:
                return current_price, raw_price

            logger.warning(f"Direct price candidate could not be parsed: {raw_price!r}")

    return None, None


def extract_direct_price(page: Page, product_url: str) -> Tuple[Optional[float], Optional[str]]:
    logger.info("Trying direct product page price extraction.")
    page.goto(product_url, timeout=60000, wait_until="domcontentloaded")
    page.wait_for_load_state("networkidle", timeout=20000)

    page.wait_for_timeout(2000)

    current_price, raw_price = find_price_from_locators(page)
    if current_price is None:
        class_query = ".".join(DIRECT_PRICE_CLASSES)
        logger.warning(f"Direct extraction did not find a valid price for class tokens: {class_query}")
        return None, None

    product_name = extract_page_title(page)
    logger.info(f"Direct extraction succeeded at Rs. {current_price} from {raw_price!r}")
    return current_price, product_name


def get_price_and_name(product_url: str, retries: int = 3) -> Tuple[Optional[float], Optional[str]]:
    for attempt in range(retries):
        try:
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(headless=True)
                try:
                    context = browser.new_context(
                        user_agent=(
                            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                            "AppleWebKit/537.36 (KHTML, like Gecko) "
                            "Chrome/120.0.0.0 Safari/537.36"
                        )
                    )
                    page = context.new_page()

                    logger.info(f"Attempt {attempt + 1}: checking product price.")
                    current_price, product_name = extract_direct_price(page, product_url)
                    if current_price is not None:
                        return current_price, product_name
                finally:
                    browser.close()

        except PlaywrightTimeoutError:
            logger.warning(f"Timeout error on attempt {attempt + 1}. The site took too long to respond.")
        except Exception as exc:
            logger.error(f"Unexpected error on attempt {attempt + 1}: {exc}")

        if attempt < retries - 1:
            logger.info("Retrying in 3 seconds...")
            time.sleep(3)

    logger.error("All scraper retries failed for this URL.")
    return None, None