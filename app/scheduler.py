import asyncio
import json
import logging
import os
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Alert
from app.notifier import send_telegram_alert
from app.scraper import get_price_and_name

logger = logging.getLogger(__name__)
APP_TIMEZONE = ZoneInfo(os.getenv("APP_TIMEZONE", "Asia/Kolkata"))
SCHEDULER_JOB_ID = "price-alert-db-poll"


def utc_now() -> datetime:
    return datetime.utcnow()


def local_now() -> datetime:
    return datetime.now(APP_TIMEZONE)


def stored_utc_to_local(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc).astimezone(APP_TIMEZONE)


def should_check_alert(alert: Alert, now_utc: datetime, now_local: datetime) -> bool:
    if alert.schedule_mode == "custom_times":
        try:
            custom_times = json.loads(alert.custom_times or "[]")
        except json.JSONDecodeError:
            logger.warning(f"Alert ID {alert.id} has invalid custom time data.")
            return False

        current_time = now_local.strftime("%H:%M")
        if current_time not in custom_times:
            return False

        if not alert.last_checked_at:
            return True

        last_checked_slot = stored_utc_to_local(alert.last_checked_at).strftime("%Y-%m-%d %H:%M")
        current_slot = now_local.strftime("%Y-%m-%d %H:%M")
        return last_checked_slot != current_slot

    if not alert.last_checked_at:
        return True

    time_since_check = now_utc - alert.last_checked_at
    return time_since_check >= timedelta(minutes=alert.interval_minutes)


async def apply_alert_result(alert: Alert, current_price: float, product_name: str | None):
    alert.current_price = current_price
    alert.last_checked_at = utc_now()

    if product_name:
        alert.product_name = product_name

    if current_price <= alert.target_price:
        logger.info(f"TARGET HIT for Alert ID {alert.id}: Rs. {current_price} <= Rs. {alert.target_price}.")
        await send_telegram_alert(
            product_name=alert.product_name or "Unknown Product",
            current_price=current_price,
            target_price=alert.target_price,
            url=alert.product_url,
        )
        alert.notified = True
        logger.info(f"Notification flow completed for Alert ID {alert.id}; alert remains scheduled.")
    else:
        logger.info(f"Alert ID {alert.id} checked: Rs. {current_price} is above target Rs. {alert.target_price}.")


async def check_database_alerts():
    logger.info("Scheduler execution started; reloading alerts from DB.")
    db: Session = SessionLocal()

    try:
        alerts = db.query(Alert).all()
        logger.info(f"Scheduler loaded {len(alerts)} alert(s) from DB.")
        now_utc = utc_now()
        now_local = local_now()

        for alert in alerts:
            if not should_check_alert(alert, now_utc, now_local):
                continue

            logger.info(
                f"Schedule reached for Alert ID {alert.id} "
                f"(mode={alert.schedule_mode}, interval={alert.interval_minutes}, custom_times={alert.custom_times})."
            )
            current_price, product_name = await asyncio.to_thread(
                get_price_and_name,
                alert.product_url,
            )

            if current_price is None:
                continue

            await apply_alert_result(alert, current_price, product_name)
            db.commit()
            logger.info(f"Alert ID {alert.id} saved; next eligibility will be calculated from last_checked_at.")

    except Exception as exc:
        logger.error(f"Error in scheduler check logic: {exc}")
    finally:
        db.close()


def log_scheduler_event(event):
    job = scheduler.get_job(event.job_id)
    next_run_time = job.next_run_time if job else None

    if event.exception:
        logger.error(f"Scheduler job {event.job_id} failed: {event.exception}. Next run: {next_run_time}")
    else:
        logger.info(f"Scheduler job {event.job_id} completed. Next run: {next_run_time}")


scheduler = AsyncIOScheduler(timezone=APP_TIMEZONE)
scheduler.add_listener(log_scheduler_event, EVENT_JOB_EXECUTED | EVENT_JOB_ERROR)
scheduler.add_job(
    check_database_alerts,
    "interval",
    minutes=1,
    id=SCHEDULER_JOB_ID,
    replace_existing=True,
    max_instances=1,
    coalesce=True,
)
