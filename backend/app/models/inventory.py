from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, Literal
from datetime import datetime
from decimal import Decimal
import uuid

TransactionType = Literal["stock_in", "stock_out", "adjustment", "count"]

class Inventory(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    product_id: uuid.UUID
    current_stock: int = 0
    reserved_stock: int = 0
    min_stock_level: int = 0
    max_stock_level: Optional[int] = None
    location: str = "main"
    last_counted_at: Optional[datetime] = None
    updated_at: datetime

    class Config:
        from_attributes = True

class InventoryTransaction(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    product_id: uuid.UUID
    user_id: uuid.UUID
    transaction_type: TransactionType
    quantity: int
    previous_stock: int
    new_stock: int
    unit_cost: Optional[Decimal] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    reference_number: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    class Config:
        from_attributes = True

class TransactionCreate(BaseModel):
    business_id: uuid.UUID
    product_id: uuid.UUID
    user_id: uuid.UUID
    transaction_type: TransactionType
    quantity: int
    unit_cost: Optional[Decimal] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    reference_number: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
