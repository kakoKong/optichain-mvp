# backend/app/routes/inventory.py
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from uuid import UUID

from app.models import Product, ProductCreate, InventoryTransaction, TransactionCreate
from app.services.inventory_service import inventory_service
from app.utils.auth import get_current_user

router = APIRouter(prefix="/inventory", tags=["inventory"])

@router.post("/products", response_model=Product)
async def create_product(
    product_data: ProductCreate,
    current_user = Depends(get_current_user)
):
    try:
        return await inventory_service.create_product(product_data, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/businesses/{business_id}/products", response_model=List[Product])
async def get_business_products(
    business_id: UUID,
    current_user = Depends(get_current_user)
):
    try:
        return await inventory_service.get_products_by_business(business_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/businesses/{business_id}/products/barcode/{barcode}", response_model=Product)
async def find_product_by_barcode(
    business_id: UUID,
    barcode: str,
    current_user = Depends(get_current_user)
):
    try:
        product = await inventory_service.find_product_by_barcode(business_id, barcode, current_user.id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return product
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/transactions", response_model=InventoryTransaction)
async def record_inventory_transaction(
    transaction_data: TransactionCreate,
    current_user = Depends(get_current_user)
):
    try:
        return await inventory_service.record_transaction(transaction_data, current_user.id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
