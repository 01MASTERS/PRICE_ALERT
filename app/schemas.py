import json
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class AlertCreate(BaseModel):
    product_url: str
    target_price: float = Field(gt=0)
    interval_minutes: int = Field(default=30, ge=1)
    schedule_mode: Literal["period", "custom_times"] = "period"
    custom_times: Optional[list[str]] = None

    @field_validator("custom_times")
    @classmethod
    def validate_custom_times(cls, value: Optional[list[str]]):
        if value is None:
            return value

        cleaned_times = []
        for item in value:
            try:
                datetime.strptime(item, "%H:%M")
            except ValueError as exc:
                raise ValueError("Custom times must use HH:MM format") from exc
            if item not in cleaned_times:
                cleaned_times.append(item)

        return cleaned_times

    @model_validator(mode="after")
    def validate_schedule(self):
        if self.schedule_mode == "custom_times" and not self.custom_times:
            raise ValueError("At least one custom time is required")
        return self

class AlertResponse(BaseModel):
    id: int
    product_url: str
    product_name: Optional[str]
    target_price: float
    current_price: Optional[float]
    interval_minutes: int
    schedule_mode: str
    custom_times: Optional[list[str]]
    notified: bool
    active: bool
    created_at: datetime
    last_checked_at: Optional[datetime]
    next_check_at: Optional[datetime]

    @field_validator("custom_times", mode="before")
    @classmethod
    def parse_custom_times(cls, value):
        if value in (None, ""):
            return None
        if isinstance(value, list):
            return value
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return None

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    username: str = Field(min_length=2, max_length=80)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str):
        return value.strip()


class UserLogin(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def normalize_login_username(cls, value: str):
        return value.strip()


class UserResponse(BaseModel):
    id: int
    username: str
    telegram_chat_id: Optional[str]
    telegram_connected_at: Optional[datetime]
    apify_token: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class UserSettingsUpdate(BaseModel):
    telegram_chat_id: Optional[str] = None
    apify_token: Optional[str] = None
