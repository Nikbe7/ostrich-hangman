import os
import pytest
from unittest.mock import MagicMock

# Set required env vars for Supabase client creation
os.environ["SUPABASE_URL"] = "http://localhost:8000"
os.environ["SUPABASE_KEY"] = "fake_key_for_testing"

# Mock the supabase client globally
@pytest.fixture(autouse=True)
def mock_supabase(monkeypatch):
    from backend.core.supabase import supabase
    
    # Create a chainable mock for Supabase
    # supabase.table('...').select('...').eq('...').execute()
    mock_client = MagicMock()
    
    # We replace the global supabase object's methods
    monkeypatch.setattr(supabase, "table", mock_client.table)
    
    # We can yield the mock client if tests need to assert calls
    yield mock_client
