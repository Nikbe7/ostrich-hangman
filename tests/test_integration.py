import pytest
import os
from supabase import create_client, Client

@pytest.mark.integration
def test_supabase_connection():
    """
    Test that we can actually connect to the real Supabase instance.
    This requires a real .env file with valid credentials.
    """
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    
    # Om variablerna är falska från conftest, skippa testet
    if url == "http://localhost:8000" or key == "fake_key_for_testing":
        pytest.skip("Integration tests require real SUPABASE_URL and SUPABASE_KEY locally.")
        
    client: Client = create_client(url, key)
    
    # Try fetching a row from a table we know should exist
    response = client.table("app_users").select("id").limit(1).execute()
    
    assert response is not None
    # We just want to ensure the connection and table exists. 
    # Not asserting data length because test DB varies.
    assert isinstance(response.data, list)
