# backend/app/models/product.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal
import uuid

class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    barcode: Optional[str] = None
    sku: Optional[str] = None
    cost_price: Optional[Decimal] = None
    selling_price: Optional[Decimal] = None
    unit: str = "piece"
    category: Optional[str] = None

class ProductCreate(ProductBase):
    business_id: uuid.UUID

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    cost_price: Optional[Decimal] = None
    selling_price: Optional[Decimal] = None
    category: Optional[str] = None

class Product(ProductBase):
    id: uuid.UUID
    business_id: uuid.UUID
    image_url: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
