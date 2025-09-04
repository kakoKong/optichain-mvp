from typing import Optional
from datetime import datetime, timedelta
import uuid
from app.models import Business, BusinessCreate, TrialCode
from app.utils.supabase_client import get_supabase_client

class BusinessService:
    def __init__(self):
        self.supabase = get_supabase_client()

    async def validate_trial_code(self, code: str) -> bool:
        """Validate if a trial code is valid and not expired"""
        try:
            result = await self.supabase.table('trial_codes').select('*').eq('code', code).eq('is_used', False).single()
            
            if not result.data:
                return False
            
            trial_code = result.data
            now = datetime.utcnow()
            
            # Check if code is expired
            if trial_code.get('expires_at') and datetime.fromisoformat(trial_code['expires_at'].replace('Z', '+00:00')) < now:
                return False
            
            return True
        except Exception as e:
            print(f"Error validating trial code: {e}")
            return False

    async def mark_trial_code_used(self, code: str, user_id: uuid.UUID) -> bool:
        """Mark a trial code as used"""
        try:
            await self.supabase.table('trial_codes').update({
                'is_used': True,
                'used_by': str(user_id),
                'used_at': datetime.utcnow().isoformat()
            }).eq('code', code)
            return True
        except Exception as e:
            print(f"Error marking trial code as used: {e}")
            return False

    async def create_business(self, business_data: BusinessCreate, user_id: uuid.UUID) -> Business:
        """Create a new business with trial code validation"""
        try:
            # Validate trial code
            if not await self.validate_trial_code(business_data.trial_code):
                raise ValueError("Invalid or expired trial code")
            
            # Calculate trial expiration (30 days from now)
            trial_expires_at = datetime.utcnow() + timedelta(days=30)
            
            # Prepare business data
            business_dict = business_data.dict()
            business_dict['owner_id'] = str(user_id)
            business_dict['trial_code_used'] = business_data.trial_code
            business_dict['trial_expires_at'] = trial_expires_at.isoformat()
            business_dict['is_trial_active'] = True
            business_dict.pop('trial_code', None)  # Remove trial_code from business data
            
            # Create business
            result = await self.supabase.table('businesses').insert(business_dict).execute()
            
            if not result.data:
                raise ValueError("Failed to create business")
            
            # Mark trial code as used
            await self.mark_trial_code_used(business_data.trial_code, user_id)
            
            # Create owner membership
            await self.supabase.table('business_members').insert({
                'business_id': result.data[0]['id'],
                'user_id': str(user_id),
                'role': 'owner'
            }).execute()
            
            return Business(**result.data[0])
            
        except Exception as e:
            print(f"Error creating business: {e}")
            raise e

    async def get_business_by_id(self, business_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Business]:
        """Get business by ID if user has access"""
        try:
            # Check if user is owner or member
            membership_result = await self.supabase.table('business_members').select('*').eq('business_id', str(business_id)).eq('user_id', str(user_id)).execute()
            
            if not membership_result.data:
                return None
            
            result = await self.supabase.table('businesses').select('*').eq('id', str(business_id)).single()
            
            if not result.data:
                return None
            
            return Business(**result.data)
            
        except Exception as e:
            print(f"Error getting business: {e}")
            return None

    async def create_trial_code(self, code: str, created_by: Optional[uuid.UUID] = None, expires_days: int = 30) -> TrialCode:
        """Create a new trial code (admin function)"""
        try:
            expires_at = datetime.utcnow() + timedelta(days=expires_days)
            
            trial_code_data = {
                'code': code,
                'is_used': False,
                'expires_at': expires_at.isoformat(),
                'created_by': str(created_by) if created_by else None
            }
            
            result = await self.supabase.table('trial_codes').insert(trial_code_data).execute()
            
            if not result.data:
                raise ValueError("Failed to create trial code")
            
            return TrialCode(**result.data[0])
            
        except Exception as e:
            print(f"Error creating trial code: {e}")
            raise e

# Create service instance
business_service = BusinessService()
