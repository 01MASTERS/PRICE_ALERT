import sys
import asyncio
import json

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import logging
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from typing import List

from app import models, schemas
from app.database import SessionLocal, engine, get_db
from app.notifier import send_telegram_alert
from app.scheduler import SCHEDULER_JOB_ID, calculate_next_check_at, scheduler
from app.scraper import get_price_and_name

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)
logging.getLogger("apscheduler").setLevel(logging.WARNING)

models.Base.metadata.create_all(bind=engine)


def ensure_alert_columns():
    existing_columns = {column["name"] for column in inspect(engine).get_columns("alerts")}
    statements = []

    if "schedule_mode" not in existing_columns:
        statements.append("ALTER TABLE alerts ADD COLUMN schedule_mode VARCHAR NOT NULL DEFAULT 'period'")
    if "custom_times" not in existing_columns:
        statements.append("ALTER TABLE alerts ADD COLUMN custom_times VARCHAR")
    if "next_check_at" not in existing_columns:
        statements.append("ALTER TABLE alerts ADD COLUMN next_check_at DATETIME")

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


ensure_alert_columns()


def backfill_next_check_at():
    db = SessionLocal()
    try:
        alerts = db.query(models.Alert).filter(models.Alert.next_check_at == None).all()
        if not alerts:
            return

        for alert in alerts:
            alert.next_check_at = calculate_next_check_at(alert)

        db.commit()
        logger.info(f"Backfilled next_check_at for {len(alerts)} alert(s).")
    finally:
        db.close()


backfill_next_check_at()


def send_initial_notification(alert: models.Alert):
    if alert.current_price is None or alert.current_price > alert.target_price or alert.notified:
        return

    try:
        asyncio.run(
            send_telegram_alert(
                product_name=alert.product_name or "Unknown Product",
                current_price=alert.current_price,
                target_price=alert.target_price,
                url=alert.product_url,
            )
        )
        alert.notified = True
    except Exception as exc:
        logger.warning(f"Initial notification failed for alert {alert.id or 'new'}: {exc}")


def update_alert_price(alert: models.Alert, notify_if_target_hit: bool = False):
    try:
        current_price, product_name = get_price_and_name(alert.product_url)
    except Exception as exc:
        logger.warning(f"Price check failed for alert {alert.id or 'new'}: {exc}")
        return False

    if current_price is None:
        logger.warning(f"Price check did not return a valid price for alert {alert.id or 'new'}.")
        return False

    alert.current_price = current_price
    alert.last_checked_at = datetime.utcnow()
    alert.next_check_at = calculate_next_check_at(alert, alert.last_checked_at)

    if product_name:
        alert.product_name = product_name

    if notify_if_target_hit:
        send_initial_notification(alert)

    return True


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up APScheduler...")
    scheduler.start()
    logger.info(f"Scheduler job {SCHEDULER_JOB_ID} created; it reloads alerts from DB every minute.")
    for job in scheduler.get_jobs():
        logger.info(f"Scheduler job active: id={job.id}, trigger={job.trigger}, next_run={job.next_run_time}")
    yield
    logger.info("Shutting down APScheduler...")
    scheduler.shutdown()

app = FastAPI(title="Price Alert API", lifespan=lifespan)

@app.middleware("http")
async def debug_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Debug-Test"] = "working"
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/alerts", response_model=schemas.AlertResponse, status_code=201)
def create_alert(alert: schemas.AlertCreate, db: Session = Depends(get_db)):
    db_alert = models.Alert(
        product_url=alert.product_url,
        target_price=alert.target_price,
        interval_minutes=alert.interval_minutes,
        schedule_mode=alert.schedule_mode,
        custom_times=json.dumps(alert.custom_times) if alert.custom_times else None,
    )
    update_alert_price(db_alert, notify_if_target_hit=True)
    if db_alert.next_check_at is None:
        db_alert.next_check_at = calculate_next_check_at(db_alert)

    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert


@app.put("/alerts/{alert_id}", response_model=schemas.AlertResponse)
def update_alert(alert_id: int, alert: schemas.AlertCreate, db: Session = Depends(get_db)):
    db_alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not db_alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    product_url_changed = db_alert.product_url != alert.product_url

    db_alert.product_url = alert.product_url
    db_alert.target_price = alert.target_price
    db_alert.interval_minutes = alert.interval_minutes
    db_alert.schedule_mode = alert.schedule_mode
    db_alert.custom_times = json.dumps(alert.custom_times) if alert.custom_times else None
    db_alert.notified = False
    db_alert.next_check_at = calculate_next_check_at(db_alert)

    if product_url_changed:
        db_alert.product_name = None
        db_alert.current_price = None
        db_alert.last_checked_at = None

    if product_url_changed or db_alert.current_price is None:
        update_alert_price(db_alert, notify_if_target_hit=True)

    db.commit()
    db.refresh(db_alert)
    return db_alert


@app.get("/alerts", response_model=List[schemas.AlertResponse])
def get_alerts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Alert).offset(skip).limit(limit).all()

@app.delete("/alerts/{alert_id}", status_code=204)
def delete_alert(alert_id: int, db: Session = Depends(get_db)):
    db_alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not db_alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    db.delete(db_alert)
    db.commit()
    return None
