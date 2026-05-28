from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime

class AlertCreate(BaseModel):
    product_url: str
    target_price: float = Field(gt=0)
    interval_minutes: int = Field(default=30, ge=15)

class AlertResponse(BaseModel):
    id: int
    product_url: str
    product_name: Optional[str]
    target_price: float
    current_price: Optional[float]
    interval_minutes: int
    notified: bool
    created_at: datetime
    last_checked_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)
