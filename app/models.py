from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    telegram_chat_id = Column(String, nullable=True)
    telegram_connected_at = Column(DateTime(timezone=True), nullable=True)
    apify_token = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    product_url = Column(String, index=True, nullable=False)
    product_name = Column(String, nullable=True)
    target_price = Column(Float, nullable=False)
    current_price = Column(Float, nullable=True)
    interval_minutes = Column(Integer, nullable=False)
    schedule_mode = Column(String, nullable=False, default="period")
    custom_times = Column(String, nullable=True)
    notified = Column(Boolean, default=False)
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_checked_at = Column(DateTime(timezone=True), nullable=True)
    next_check_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="alerts")
