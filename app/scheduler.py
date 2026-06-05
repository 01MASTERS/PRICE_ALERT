import asyncio
import json
import logging
import os
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session, joinedload

from app.database import SessionLocal
from app.models import Alert
from app.notifier import send_telegram_alert
from app.scraper import get_price_and_name

logger = logging.getLogger(__name__)
APP_TIMEZONE = ZoneInfo(os.getenv("APP_TIMEZONE", "Asia/Kolkata"))
SCHEDULER_JOB_ID = "price-alert-db-poll"
DEFAULT_DAILY_CHECK_TIME = os.getenv("DEFAULT_DAILY_CHECK_TIME", "08:00")


def utc_now() -> datetime:
    return datetime.utcnow()


def local_now() -> datetime:
    return datetime.now(APP_TIMEZONE)


def stored_utc_to_local(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc).astimezone(APP_TIMEZONE)


def parse_hhmm(value: str) -> time:
    hour, minute = value.split(":", 1)
    return time(hour=int(hour), minute=int(minute))


def local_to_utc_naive(value: datetime) -> datetime:
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def next_daily_check(now_local: datetime | None = None) -> datetime:
    now_local = now_local or local_now()
    daily_time = parse_hhmm(DEFAULT_DAILY_CHECK_TIME)
    next_local = now_local.replace(
        hour=daily_time.hour,
        minute=daily_time.minute,
        second=0,
        microsecond=0,
    )
    if next_local <= now_local:
        next_local += timedelta(days=1)
    return local_to_utc_naive(next_local)


def parse_custom_times(raw_value: str | None) -> list[time]:
    try:
        values = json.loads(raw_value or "[]")
    except json.JSONDecodeError:
        return []

    parsed_times = []
    for value in values:
        try:
            parsed_times.append(parse_hhmm(value))
        except (AttributeError, TypeError, ValueError):
            continue

    return sorted(parsed_times)


def next_custom_time_check(alert: Alert, now_local: datetime | None = None) -> datetime:
    now_local = now_local or local_now()
    custom_times = parse_custom_times(alert.custom_times)
    if not custom_times:
        logger.warning(f"Alert ID {alert.id} has no valid custom times; using daily default.")
        return next_daily_check(now_local)

    for custom_time in custom_times:
        candidate = now_local.replace(
            hour=custom_time.hour,
            minute=custom_time.minute,
            second=0,
            microsecond=0,
        )
        if candidate > now_local:
            return local_to_utc_naive(candidate)

    first_time = custom_times[0]
    next_day = now_local + timedelta(days=1)
    return local_to_utc_naive(
        next_day.replace(
            hour=first_time.hour,
            minute=first_time.minute,
            second=0,
            microsecond=0,
        )
    )


def calculate_next_check_at(alert: Alert, now_utc: datetime | None = None) -> datetime:
    now_utc = now_utc or utc_now()
    now_local = now_utc.replace(tzinfo=timezone.utc).astimezone(APP_TIMEZONE)
    daily_next = next_daily_check(now_local)

    if alert.schedule_mode == "period":
        interval_minutes = max(alert.interval_minutes or 1440, 1)
        return min(now_utc + timedelta(minutes=interval_minutes), daily_next)

    if alert.schedule_mode == "custom_times":
        return min(next_custom_time_check(alert, now_local), daily_next)

    return daily_next


def should_check_alert(alert: Alert, now_utc: datetime) -> bool:
    return alert.next_check_at is None or alert.next_check_at <= now_utc


async def apply_alert_result(alert: Alert, current_price: float, product_name: str | None):
    alert.current_price = current_price
    alert.last_checked_at = utc_now()
    alert.next_check_at = calculate_next_check_at(alert, alert.last_checked_at)

    if product_name:
        alert.product_name = product_name

    if current_price <= alert.target_price:
        logger.info(f"TARGET HIT for Alert ID {alert.id}: Rs. {current_price} <= Rs. {alert.target_price}.")
        await send_telegram_alert(
            chat_id=alert.user.telegram_chat_id if alert.user else None,
            product_name=alert.product_name or "Unknown Product",
            current_price=current_price,
            target_price=alert.target_price,
            url=alert.product_url,
        )
        alert.notified = True
        logger.info(f"Notification attempted for Alert ID {alert.id}. Next check at {alert.next_check_at}.")
        # logger.info(f"Notification flow completed for Alert ID {alert.id}; alert remains scheduled.")
    else:
        logger.info(f"Alert ID {alert.id} checked: Rs. {current_price} is above target Rs. {alert.target_price}.")


async def check_database_alerts():
    # logger.info("Scheduler execution started; reloading alerts from DB.")
    db: Session = SessionLocal()

    try:
        now_utc = utc_now()
        due_alerts = (
            db.query(Alert)
            .options(joinedload(Alert.user))
            .filter(Alert.active == True)
            .filter((Alert.next_check_at == None) | (Alert.next_check_at <= now_utc))
            .all()
        )
        logger.info(f"Scheduler loaded {len(due_alerts)} due alert(s) from DB.")

        for alert in due_alerts:
            if not should_check_alert(alert, now_utc):
                continue

            logger.info(
                f"Executing price check for Alert ID {alert.id}; "
                f"mode={alert.schedule_mode}, next_check_at={alert.next_check_at}."
            )
            current_price, product_name = await asyncio.to_thread(
                get_price_and_name,
                alert.product_url,
                3,
                alert.user.apify_token if alert.user else None,
            )

            if current_price is None:
                alert.next_check_at = calculate_next_check_at(alert, now_utc)
                db.commit()
                logger.warning(f"Alert ID {alert.id} price check failed; rescheduled for {alert.next_check_at}.")
                continue

            await apply_alert_result(alert, current_price, product_name)
            db.commit()
            logger.info(f"Alert ID {alert.id} saved and rescheduled for {alert.next_check_at}.")

    except Exception as exc:
        logger.error(f"Error in scheduler check logic: {exc}")
    finally:
        db.close()


def log_scheduler_event(event):
    job = scheduler.get_job(event.job_id)
    next_run_time = job.next_run_time if job else None

    # if event.exception:
    #     logger.error(f"Scheduler job {event.job_id} failed: {event.exception}. Next run: {next_run_time}")
    # else:
    #     logger.info(f"Scheduler job {event.job_id} completed. Next run: {next_run_time}")


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
