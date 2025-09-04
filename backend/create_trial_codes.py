#!/usr/bin/env python3
"""
Script to create trial codes for testing
Run this script to generate trial codes that can be used for business creation
"""

import asyncio
import os
from datetime import datetime, timedelta
from supabase import create_client, Client

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Supabase configuration
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_ANON_KEY")

if not url or not key:
    print("Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables")
    exit(1)

supabase: Client = create_client(url, key)

def generate_trial_code(length=8):
    """Generate a random trial code"""
    import string
    import random
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

async def create_trial_codes(count=5):
    """Create multiple trial codes"""
    codes = []
    
    for i in range(count):
        code = generate_trial_code()
        expires_at = datetime.utcnow() + timedelta(days=30)
        
        try:
            result = supabase.table('trial_codes').insert({
                'code': code,
                'is_used': False,
                'expires_at': expires_at.isoformat(),
                'created_by': None  # Admin created
            }).execute()
            
            if result.data:
                codes.append(code)
                print(f"Created trial code: {code}")
            else:
                print(f"Failed to create trial code: {code}")
                
        except Exception as e:
            print(f"Error creating trial code {code}: {e}")
    
    return codes

async def main():
    print("Creating trial codes...")
    codes = await create_trial_codes(5)
    
    print(f"\nCreated {len(codes)} trial codes:")
    for code in codes:
        print(f"  - {code}")
    
    print(f"\nYou can use any of these codes to create a business.")
    print("Note: These codes expire in 30 days.")

if __name__ == "__main__":
    asyncio.run(main())
