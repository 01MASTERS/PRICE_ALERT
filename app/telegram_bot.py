import asyncio
import logging
import secrets
from datetime import datetime, timedelta

import httpx

from app.database import SessionLocal
from app.models import User
from app.notifier import TELEGRAM_BOT_TOKEN

logger = logging.getLogger(__name__)

# ── In-memory store for short link codes ──────────────────────────
# Maps short_code -> {"user_id": int, "expires_at": datetime}
# Telegram deep links have a 64-char limit for the start parameter,
# so we cannot pass a full JWT (~180+ chars). Instead we generate a
# short random code, store the mapping here, and look it up when the
# bot receives /start <code>.
pending_links: dict[str, dict] = {}

LINK_CODE_LENGTH = 16          # 16 url-safe chars → well within 64-char limit
LINK_CODE_EXPIRY_MINUTES = 15  # same window as the old JWT


def create_link_code(user_id: int) -> str:
    """Create a short random code that maps to the given user_id."""
    # Purge expired entries first
    now = datetime.utcnow()
    expired_keys = [k for k, v in pending_links.items() if v["expires_at"] < now]
    for k in expired_keys:
        del pending_links[k]

    code = secrets.token_urlsafe(LINK_CODE_LENGTH)[:LINK_CODE_LENGTH]
    pending_links[code] = {
        "user_id": user_id,
        "expires_at": now + timedelta(minutes=LINK_CODE_EXPIRY_MINUTES),
    }
    logger.info(f"Created Telegram link code for user_id={user_id} (code length={len(code)})")
    return code


async def start_polling():
    if not TELEGRAM_BOT_TOKEN:
        logger.warning("No TELEGRAM_BOT_TOKEN set. Telegram polling disabled.")
        return

    logger.info("Telegram bot polling started.")
    offset = 0
    timeout = 30
    api_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getUpdates"

    async with httpx.AsyncClient(timeout=timeout + 10) as client:
        while True:
            try:
                response = await client.get(
                    api_url,
                    params={"offset": offset, "timeout": timeout, "allowed_updates": ["message"]},
                )
                response.raise_for_status()
                data = response.json()

                if data.get("ok"):
                    for update in data.get("result", []):
                        offset = update["update_id"] + 1
                        message = update.get("message")
                        if not message or "text" not in message:
                            continue

                        text = message["text"].strip()
                        chat_id = str(message["chat"]["id"])
                        logger.info(f"Received Telegram message from chat {chat_id}: {text[:80]}")

                        if text.startswith("/start"):
                            parts = text.split(None, 1)
                            if len(parts) == 2:
                                code = parts[1].strip()
                                await process_link_code(chat_id, code)
                            else:
                                await send_telegram_reply(
                                    chat_id,
                                    "Welcome! To connect your account, please use the link from the Price Alert app settings page.",
                                )
            except asyncio.CancelledError:
                logger.info("Telegram polling cancelled.")
                break
            except httpx.ReadTimeout:
                continue
            except Exception as exc:
                logger.error(f"Telegram polling error: {exc}")
                await asyncio.sleep(5)


async def process_link_code(chat_id: str, code: str):
    """Look up a short link code and connect the Telegram chat to the user."""
    entry = pending_links.pop(code, None)

    if entry is None:
        logger.warning(f"Link code not found (may have expired): code={code[:20]}…")
        await send_telegram_reply(
            chat_id,
            "❌ Invalid or expired link code. Please go back to the app and click 'Connect Telegram' again.",
        )
        return

    if entry["expires_at"] < datetime.utcnow():
        logger.warning(f"Link code expired for user_id={entry['user_id']}")
        await send_telegram_reply(
            chat_id,
            "❌ This link has expired. Please go back to the app and click 'Connect Telegram' again.",
        )
        return

    user_id = entry["user_id"]

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            # Unlink any other accounts that share this chat_id
            existing_users = db.query(User).filter(User.telegram_chat_id == chat_id).all()
            for eu in existing_users:
                eu.telegram_chat_id = None
                eu.telegram_connected_at = None

            user.telegram_chat_id = chat_id
            user.telegram_connected_at = datetime.utcnow()
            db.commit()
            await send_telegram_reply(
                chat_id,
                "✅ Successfully connected! You will now receive price alerts here.",
            )
            logger.info(f"User {user.username} (id={user.id}) linked Telegram chat {chat_id}")
        else:
            await send_telegram_reply(chat_id, "User not found. Please try again.")
    except Exception as exc:
        logger.error(f"Error linking telegram chat: {exc}")
        db.rollback()
    finally:
        db.close()


async def send_telegram_reply(chat_id: str, text: str):
    api_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    async with httpx.AsyncClient() as client:
        try:
            await client.post(api_url, json={"chat_id": chat_id, "text": text})
        except Exception as exc:
            logger.error(f"Failed to send reply to chat {chat_id}: {exc}")