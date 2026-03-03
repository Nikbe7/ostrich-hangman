import os
from supabase import create_client, Client
from dotenv import load_dotenv
import logging

logger = logging.getLogger("supabase")

# Load .env from backend directory
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dotenv_path = os.path.join(backend_dir, '.env')
load_dotenv(dotenv_path)

url: str = os.environ.get("SUPABASE_URL", "")
key: str = os.environ.get("SUPABASE_KEY", "")

if not url or not key:
    logger.warning("SUPABASE_URL or SUPABASE_KEY not found in environment variables. Checked: %s", dotenv_path)

supabase: Client = create_client(url, key)
