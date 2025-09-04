from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
import uuid

class BusinessBase(BaseModel):
    name: str
    description: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    business_type: str = "retail"
    logo_url: Optional[str] = None
    website: Optional[str] = None
    email: Optional[str] = None
    business_category: Optional[str] = None
    business_size: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    timezone: str = "UTC"
    currency: str = "USD"
    trial_code_used: Optional[str] = None
    trial_expires_at: Optional[datetime] = None
    is_trial_active: bool = True
    settings: Dict[str, Any] = Field(default_factory=dict)

class BusinessCreate(BusinessBase):
    owner_id: uuid.UUID
    trial_code: str

class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    business_type: Optional[str] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None
    email: Optional[str] = None
    business_category: Optional[str] = None
    business_size: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    timezone: Optional[str] = None
    currency: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

class Business(BusinessBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
