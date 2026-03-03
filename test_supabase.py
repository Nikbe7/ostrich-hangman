import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('backend/.env')

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

print(f"URL: {url}")
print(f"Key exists: {bool(key)}")

try:
    supabase = create_client(url, key)
    res = supabase.table('app_users').select('count', count='exact').limit(0).execute()
    print(f"Connection successful. Row count check: {res}")
except Exception as e:
    print(f"Connection failed: {e}")
