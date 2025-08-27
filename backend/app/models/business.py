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
    settings: Dict[str, Any] = Field(default_factory=dict)

class BusinessCreate(BusinessBase):
    owner_id: uuid.UUID

class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    business_type: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

class Business(BusinessBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
