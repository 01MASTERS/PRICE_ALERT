import logging
import os

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")


async def send_telegram_alert(product_name: str, current_price: float, target_price: float, url: str):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        logger.error("Telegram credentials missing in .env file.")
        return

    message = (
        "<b>Price Drop Alert!</b>\n\n"
        f"<b>Product:</b> {product_name}\n"
        f"<b>Current Price:</b> Rs. {current_price}\n"
        f"<b>Target Price:</b> Rs. {target_price}\n\n"
        f"<b>Product URL:</b>\n{url}"
    )

    api_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "HTML",
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(api_url, json=payload)
            response.raise_for_status()
            logger.info("Telegram notification sent successfully.")
        except httpx.HTTPStatusError as exc:
            logger.error(f"Telegram API rejected the request: {exc.response.text}")
        except Exception as exc:
            logger.error(f"Failed to send Telegram message: {exc}")
