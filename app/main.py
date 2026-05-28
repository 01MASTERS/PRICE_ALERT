import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from app import models, schemas
from app.database import engine, get_db
from app.scheduler import scheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

models.Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up APScheduler...")
    scheduler.start()
    yield
    logger.info("Shutting down APScheduler...")
    scheduler.shutdown()

app = FastAPI(title="Price Alert API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/alerts", response_model=schemas.AlertResponse, status_code=201)
def create_alert(alert: schemas.AlertCreate, db: Session = Depends(get_db)):
    db_alert = models.Alert(
        product_url=alert.product_url,
        target_price=alert.target_price,
        interval_minutes=alert.interval_minutes
    )
    db.add(db_alert)
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
