# backend/app/routes/business.py
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from uuid import UUID

from app.models import Business, BusinessCreate, BusinessUpdate, TrialCode, TrialCodeCreate
from app.services.business_service import business_service
from app.utils.auth import get_current_user

router = APIRouter(prefix="/business", tags=["business"])

@router.post("/create", response_model=Business)
async def create_business(
    business_data: BusinessCreate,
    current_user = Depends(get_current_user)
):
    """Create a new business with trial code validation"""
    try:
        return await business_service.create_business(business_data, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{business_id}", response_model=Business)
async def get_business(
    business_id: UUID,
    current_user = Depends(get_current_user)
):
    """Get business by ID"""
    try:
        business = await business_service.get_business_by_id(business_id, current_user.id)
        if not business:
            raise HTTPException(status_code=404, detail="Business not found")
        return business
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/{business_id}", response_model=Business)
async def update_business(
    business_id: UUID,
    business_data: BusinessUpdate,
    current_user = Depends(get_current_user)
):
    """Update business information"""
    try:
        # Check if user has access to business
        business = await business_service.get_business_by_id(business_id, current_user.id)
        if not business:
            raise HTTPException(status_code=404, detail="Business not found")
        
        # Update business
        update_data = business_data.dict(exclude_unset=True)
        result = await business_service.supabase.table('businesses').update(update_data).eq('id', str(business_id)).execute()
        
        if not result.data:
            raise HTTPException(status_code=400, detail="Failed to update business")
        
        return Business(**result.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/trial-codes", response_model=TrialCode)
async def create_trial_code(
    trial_code_data: TrialCodeCreate,
    current_user = Depends(get_current_user)
):
    """Create a new trial code (admin function)"""
    try:
        # For now, allow any authenticated user to create trial codes
        # In production, you might want to add admin role checking
        return await business_service.create_trial_code(
            trial_code_data.code,
            current_user.id,
            expires_days=30
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/trial-codes/validate/{code}")
async def validate_trial_code(
    code: str,
    current_user = Depends(get_current_user)
):
    """Validate a trial code"""
    try:
        is_valid = await business_service.validate_trial_code(code)
        return {"valid": is_valid}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")
