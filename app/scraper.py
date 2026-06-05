import logging
import os
import re
import time
from typing import Any, Optional, Tuple

import httpx
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

APIFY_TOKEN = os.getenv("APIFY_TOKEN")
APIFY_ACTOR = os.getenv("APIFY_ACTOR", "codingfrontend/flipkart-product-scraper-pro")
APIFY_BASE = "https://api.apify.com/v2/acts"
APIFY_PINCODE = int(os.getenv("PINCODE", "823003"))
APIFY_TIMEOUT = float(os.getenv("APIFY_TIMEOUT", "180"))


def parse_price(raw_price: str) -> Optional[float]:
    match = re.search(r"(\d[\d,]*(?:\.\d+)?)", str(raw_price or ""))
    if not match:
        return None

    try:
        price = float(match.group(1).replace(",", ""))
    except ValueError:
        return None

    return price if price > 0 else None


def _coerce_price(value: Any) -> Optional[float]:
    if value is None:
        return None

    if isinstance(value, (int, float)):
        return float(value) if value > 0 else None

    if isinstance(value, dict):
        for key in ("value", "finalPrice", "fsp", "minPrice", "price"):
            price = _coerce_price(value.get(key))
            if price is not None:
                return price
        return None

    return parse_price(str(value))


def _extract_title_from_record(record: Any) -> Optional[str]:
    if not isinstance(record, dict):
        return None

    product = record.get("product") or {}
    if isinstance(product, dict):
        for key in ("title",):
            val = product.get(key)
            if isinstance(val, str) and val.strip():
                return val.strip()

        titles = product.get("titles") or {}
        if isinstance(titles, dict):
            for key in ("title", "newTitle", "superTitle"):
                val = titles.get(key)
                if isinstance(val, str) and val.strip():
                    return val.strip()

    for key in ("title", "name"):
        val = record.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()

    return None


def extract_page_title(page: Any) -> Optional[str]:
    return _extract_title_from_record(page)


def _extract_price_from_record(record: Any) -> Tuple[Optional[float], Optional[str]]:
    if not isinstance(record, dict):
        return None, None

    pricing = record.get("pricing") or {}
    if not isinstance(pricing, dict):
        return None, None

    for key in ("finalPrice", "fsp", "minPrice"):
        raw = pricing.get(key)
        price = _coerce_price(raw)
        if price is not None:
            return price, str(raw)

    price_breakup = pricing.get("priceBreakup")
    if isinstance(price_breakup, list):
        for item in price_breakup:
            if not isinstance(item, dict):
                continue
            if item.get("priceType") in {"FSP", "SELLING_PRICE", "FINAL_PRICE"}:
                raw = item.get("value") or item.get("decimalValue")
                price = _coerce_price(raw)
                if price is not None:
                    return price, str(raw)

    return None, None


def find_price_from_locators(page: Any) -> Tuple[Optional[float], Optional[str]]:
    return _extract_price_from_record(page)


def _normalize_items(data: Any) -> list[dict]:
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in ("items", "data", "results"):
            val = data.get(key)
            if isinstance(val, list):
                return val
        return [data]
    return []


def _fetch_apify_record(product_url: str, apify_token: Optional[str] = None) -> Optional[dict]:
    token = apify_token or APIFY_TOKEN
    if not token:
        raise RuntimeError("APIFY_TOKEN is not set")

    actor_id = APIFY_ACTOR.replace("/", "~")
    url = f"{APIFY_BASE}/{actor_id}/run-sync-get-dataset-items"

    run_input = {
        "mode": "productUrl",
        "productUrls": [product_url],
        "maxItems": 1,
        "pincode": APIFY_PINCODE,
    }

    params = {"token": token}

    with httpx.Client(timeout=APIFY_TIMEOUT) as client:
        resp = client.post(url, params=params, json=run_input)
        resp.raise_for_status()
        data = resp.json()

    items = _normalize_items(data)
    if not items:
        return None

    first = items[0]
    return first if isinstance(first, dict) else None


def extract_direct_price(
    page: Any,
    product_url: str,
    apify_token: Optional[str] = None,
) -> Tuple[Optional[float], Optional[str]]:
    logger.info("Trying Apify product price extraction.")
    record = _fetch_apify_record(product_url, apify_token=apify_token)
    if not record:
        logger.warning("Apify returned no product data.")
        return None, None

    current_price, raw_price = _extract_price_from_record(record)
    if current_price is None:
        logger.warning("Could not extract price from Apify response.")
        return None, None

    product_name = _extract_title_from_record(record)
    logger.info(f"Extraction succeeded at Rs. {current_price} from {raw_price!r}")
    return current_price, product_name


def get_price_and_name(
    product_url: str,
    retries: int = 3,
    apify_token: Optional[str] = None,
) -> Tuple[Optional[float], Optional[str]]:
    last_error = None

    for attempt in range(retries):
        try:
            logger.info(f"Attempt {attempt + 1}: checking product price.")
            current_price, product_name = extract_direct_price(None, product_url, apify_token=apify_token)
            if current_price is not None:
                return current_price, product_name

        except httpx.HTTPStatusError as exc:
            last_error = exc
            logger.error(f"Apify HTTP error on attempt {attempt + 1}: {exc}")
        except httpx.RequestError as exc:
            last_error = exc
            logger.error(f"Network error on attempt {attempt + 1}: {exc}")
        except Exception as exc:
            last_error = exc
            logger.error(f"Unexpected error on attempt {attempt + 1}: {exc}")

        if attempt < retries - 1:
            logger.info("Retrying in 3 seconds...")
            time.sleep(3)

    logger.error(f"All scraper retries failed for this URL. Last error: {last_error}")
    return None, None
