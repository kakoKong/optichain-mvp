from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid

class TrialCodeBase(BaseModel):
    code: str
    is_used: bool = False
    used_by: Optional[uuid.UUID] = None
    used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_by: Optional[uuid.UUID] = None

class TrialCodeCreate(TrialCodeBase):
    pass

class TrialCodeUpdate(BaseModel):
    is_used: Optional[bool] = None
    used_by: Optional[uuid.UUID] = None
    used_at: Optional[datetime] = None

class TrialCode(TrialCodeBase):
    id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True
