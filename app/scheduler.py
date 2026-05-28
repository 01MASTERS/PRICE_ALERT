import asyncio
import logging
from datetime import datetime, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Alert
from app.notifier import send_telegram_alert
from app.scraper import get_price_and_name

logger = logging.getLogger(__name__)


async def check_database_alerts():
    logger.info("Running background scheduler check...")
    db: Session = SessionLocal()

    try:
        active_alerts = db.query(Alert).filter(Alert.notified == False).all()
        now = datetime.utcnow()

        for alert in active_alerts:
            if alert.last_checked_at:
                time_since_check = now - alert.last_checked_at
                if time_since_check < timedelta(minutes=alert.interval_minutes):
                    continue

            logger.info(f"Interval reached. Checking price for Alert ID {alert.id}")
            current_price, product_name = await asyncio.to_thread(
                get_price_and_name,
                alert.product_url,
            )

            if current_price is None:
                continue

            alert.current_price = current_price
            alert.last_checked_at = datetime.utcnow()

            if product_name:
                alert.product_name = product_name

            if current_price <= alert.target_price:
                logger.info(f"TARGET HIT! Rs. {current_price} <= Rs. {alert.target_price}. Triggering alert.")
                await send_telegram_alert(
                    product_name=alert.product_name or "Unknown Product",
                    current_price=current_price,
                    target_price=alert.target_price,
                    url=alert.product_url,
                )
                alert.notified = True

            db.commit()

    except Exception as exc:
        logger.error(f"Error in scheduler check logic: {exc}")
    finally:
        db.close()


scheduler = AsyncIOScheduler()
scheduler.add_job(check_database_alerts, "interval", minutes=1)
