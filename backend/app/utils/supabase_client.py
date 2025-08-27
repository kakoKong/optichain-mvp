# backend/app/utils/supabase_client.py
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
print(key)
supabase: Client = create_client(url, key)

def get_supabase_client():
    return supabase
