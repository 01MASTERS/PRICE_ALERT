from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.sql import func
from app.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    product_url = Column(String, index=True, nullable=False)
    product_name = Column(String, nullable=True)
    target_price = Column(Float, nullable=False)
    current_price = Column(Float, nullable=True)
    interval_minutes = Column(Integer, nullable=False)
    schedule_mode = Column(String, nullable=False, default="period")
    custom_times = Column(String, nullable=True)
    notified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_checked_at = Column(DateTime(timezone=True), nullable=True)
