import sys
import asyncio
import json

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import logging
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from typing import List

from app import models, schemas
from app.auth import create_access_token, get_current_user, hash_password, verify_password
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
    if "user_id" not in existing_columns:
        statements.append("ALTER TABLE alerts ADD COLUMN user_id INTEGER")
    if "active" not in existing_columns:
        statements.append("ALTER TABLE alerts ADD COLUMN active BOOLEAN NOT NULL DEFAULT 1")

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


ensure_alert_columns()


def ensure_legacy_user():
    db = SessionLocal()
    try:
        legacy_user = db.query(models.User).filter(models.User.username == "Legacy User").first()
        if not legacy_user:
            legacy_user = models.User(
                username="Legacy User",
                hashed_password=hash_password("change-this-password"),
            )
            db.add(legacy_user)
            db.commit()
            db.refresh(legacy_user)

        updated = db.query(models.Alert).filter(models.Alert.user_id == None).update(
            {"user_id": legacy_user.id}
        )
        if updated:
            db.commit()
            logger.info(f"Assigned {updated} existing alert(s) to the legacy user.")
    finally:
        db.close()


ensure_legacy_user()


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


def send_initial_notification(alert: models.Alert, user: models.User):
    if alert.current_price is None or alert.current_price > alert.target_price or alert.notified:
        return
    if not user.telegram_chat_id:
        logger.warning(f"Alert {alert.id or 'new'} hit target, but user {user.id} has no Telegram chat ID.")
        return

    try:
        asyncio.run(
            send_telegram_alert(
                chat_id=user.telegram_chat_id,
                product_name=alert.product_name or "Unknown Product",
                current_price=alert.current_price,
                target_price=alert.target_price,
                url=alert.product_url,
            )
        )
        alert.notified = True
    except Exception as exc:
        logger.warning(f"Initial notification failed for alert {alert.id or 'new'}: {exc}")


def update_alert_price(alert: models.Alert, user: models.User, notify_if_target_hit: bool = False):
    try:
        current_price, product_name = get_price_and_name(alert.product_url, apify_token=user.apify_token)
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
        send_initial_notification(alert, user)

    return True


polling_task = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global polling_task
    logger.info("Starting up APScheduler...")
    scheduler.start()
    logger.info(f"Scheduler job {SCHEDULER_JOB_ID} created; it reloads alerts from DB every minute.")
    for job in scheduler.get_jobs():
        logger.info(f"Scheduler job active: id={job.id}, trigger={job.trigger}, next_run={job.next_run_time}")
    
    from app.telegram_bot import start_polling
    polling_task = asyncio.create_task(start_polling())
    
    yield
    
    if polling_task:
        polling_task.cancel()
    logger.info("Shutting down APScheduler...")
    scheduler.shutdown()

app = FastAPI(title="Price Alert API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/telegram/link-token")
def get_telegram_link_token(current_user: models.User = Depends(get_current_user)):
    from app.telegram_bot import create_link_code
    
    code = create_link_code(current_user.id)
    bot_username = os.getenv("TELEGRAM_BOT_USERNAME")
    if not bot_username:
        raise HTTPException(status_code=500, detail="Telegram bot username not configured on server")
    return {"token": code, "bot_url": f"https://t.me/{bot_username}?start={code}"}


@app.post("/telegram/disconnect", status_code=200, response_model=schemas.UserResponse)
def disconnect_telegram(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    current_user.telegram_chat_id = None
    current_user.telegram_connected_at = None
    db.commit()
    db.refresh(current_user)
    return current_user


@app.get("/check-username")
def check_username(username: str, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.username == username.strip()).first()
    return {"available": existing_user is None}


@app.post("/register", response_model=schemas.TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.username == user.username.strip()).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username is already registered")

    db_user = models.User(
        username=user.username.strip(),
        hashed_password=hash_password(user.password),
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {"access_token": create_access_token(db_user), "user": db_user}


@app.post("/login", response_model=schemas.TokenResponse)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == credentials.username).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    return {"access_token": create_access_token(user), "user": user}


@app.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@app.put("/me/settings", response_model=schemas.UserResponse)
def update_settings(
    settings: schemas.UserSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Only update fields that were explicitly included in the request body.
    # This prevents e.g. saving apify_token from wiping telegram_chat_id.
    provided = settings.model_fields_set

    if "telegram_chat_id" in provided:
        current_user.telegram_chat_id = settings.telegram_chat_id.strip() if settings.telegram_chat_id else None
        if not settings.telegram_chat_id:
            current_user.telegram_connected_at = None

    if "apify_token" in provided:
        current_user.apify_token = settings.apify_token.strip() if settings.apify_token else None

    db.commit()
    db.refresh(current_user)
    return current_user


from pydantic import BaseModel

class ApifyTokenVerifyReq(BaseModel):
    token: str

@app.post("/verify-apify-token")
async def verify_apify_token(req: ApifyTokenVerifyReq):
    token = req.token.strip()
    if not token:
        return {"valid": False}
    import httpx
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                "https://api.apify.com/v2/users/me",
                headers={"Authorization": f"Bearer {token}"},
            )
            if response.status_code == 200:
                data = response.json()
                return {"valid": True, "username": data.get("data", {}).get("username", "")}
            return {"valid": False}
    except Exception as e:
        print(f"Error verifying apify token: {e}")
        return {"valid": False}


@app.delete("/account", status_code=204)
def delete_account(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db.delete(current_user)
    db.commit()
    return None


@app.post("/alerts", response_model=schemas.AlertResponse, status_code=201)
def create_alert(
    alert: schemas.AlertCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Auto-pause if user hasn't configured apify token or telegram
    is_configured = bool(current_user.apify_token and current_user.telegram_chat_id)

    db_alert = models.Alert(
        user_id=current_user.id,
        product_url=alert.product_url,
        target_price=alert.target_price,
        interval_minutes=alert.interval_minutes,
        schedule_mode=alert.schedule_mode,
        custom_times=json.dumps(alert.custom_times) if alert.custom_times else None,
        active=is_configured,
    )
    update_alert_price(db_alert, current_user, notify_if_target_hit=True)
    if db_alert.next_check_at is None:
        db_alert.next_check_at = calculate_next_check_at(db_alert)

    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert


@app.patch("/alerts/{alert_id}/toggle", response_model=schemas.AlertResponse)
def toggle_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_alert = (
        db.query(models.Alert)
        .filter(models.Alert.id == alert_id, models.Alert.user_id == current_user.id)
        .first()
    )
    if not db_alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    db_alert.active = not db_alert.active
    db.commit()
    db.refresh(db_alert)
    return db_alert


@app.put("/alerts/{alert_id}", response_model=schemas.AlertResponse)
def update_alert(
    alert_id: int,
    alert: schemas.AlertCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_alert = (
        db.query(models.Alert)
        .filter(models.Alert.id == alert_id, models.Alert.user_id == current_user.id)
        .first()
    )
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
        update_alert_price(db_alert, current_user, notify_if_target_hit=True)

    db.commit()
    db.refresh(db_alert)
    return db_alert


@app.get("/alerts", response_model=List[schemas.AlertResponse])
def get_alerts(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Alert)
        .filter(models.Alert.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
        .all()
    )

@app.delete("/alerts/{alert_id}", status_code=204)
def delete_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db_alert = (
        db.query(models.Alert)
        .filter(models.Alert.id == alert_id, models.Alert.user_id == current_user.id)
        .first()
    )
    if not db_alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    db.delete(db_alert)
    db.commit()
    return None
