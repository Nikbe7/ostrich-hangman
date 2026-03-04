import pytest
from unittest.mock import patch, MagicMock
import sys
import os

# Add backend directory to module search path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(backend_dir, "backend"))

# Important: Mock supabase client before importing manage_db functions
# otherwise it will try to connect to actual DB during import
with patch('core.supabase.supabase'):
    from manage_db import get_all_users, delete_user, clear_user_games, reset_all_data, main

@pytest.fixture
def mock_supabase():
    with patch('manage_db.supabase') as mock_client:
        yield mock_client

def test_get_all_users_success(mock_supabase):
    mock_response = MagicMock()
    mock_response.data = [
        {"id": "1", "username": "test1", "games": []},
        {"id": "2", "username": "test2", "games": ["game1"]}
    ]
    mock_supabase.table().select().execute.return_value = mock_response

    users = get_all_users()
    
    assert len(users) == 2
    assert users[0]["username"] == "test1"
    assert users[1]["username"] == "test2"
    mock_supabase.table.assert_called_with("app_users")

def test_get_all_users_empty(mock_supabase):
    mock_response = MagicMock()
    mock_response.data = []
    mock_supabase.table().select().execute.return_value = mock_response

    users = get_all_users()
    
    assert len(users) == 0

def test_get_all_users_exception(mock_supabase):
    mock_supabase.table().select().execute.side_effect = Exception("DB Error")

    users = get_all_users()
    
    assert len(users) == 0

def test_delete_user_success(mock_supabase):
    # Mock user query to return user_id
    mock_user_query = MagicMock()
    mock_user_query.data = [{"id": "user-uuid"}]
    mock_supabase.table().select().eq().execute.return_value = mock_user_query
    
    # Mock delete
    mock_delete_query = MagicMock()
    mock_delete_query.data = [{"id": "user-uuid"}]
    mock_supabase.table().delete().eq().execute.return_value = mock_delete_query

    result = delete_user("testuser")
    
    assert result is True
    # Initial query
    mock_supabase.table().select().eq.assert_called_with("username", "testuser")
    # Delete query
    mock_supabase.table().delete().eq.assert_called_with("id", "user-uuid")

def test_delete_user_not_found(mock_supabase):
    mock_user_query = MagicMock()
    mock_user_query.data = []
    mock_supabase.table().select().eq().execute.return_value = mock_user_query

    result = delete_user("nosuchuser")
    
    assert result is False

def test_clear_user_games_success(mock_supabase):
    # Mock user query to return user_id
    mock_user_query = MagicMock()
    mock_user_query.data = [{"id": "user-uuid"}]
    mock_supabase.table().select().eq().execute.return_value = mock_user_query
    
    # Mock update
    mock_update_query = MagicMock()
    mock_update_query.data = [{"id": "user-uuid", "games": []}]
    mock_supabase.table().update().eq().execute.return_value = mock_update_query

    result = clear_user_games("testuser")
    
    assert result is True
    mock_supabase.table().update.assert_called_with({"games": []})
    mock_supabase.table().update().eq.assert_called_with("id", "user-uuid")

def test_clear_user_games_not_found(mock_supabase):
    mock_user_query = MagicMock()
    mock_user_query.data = []
    mock_supabase.table().select().eq().execute.return_value = mock_user_query

    result = clear_user_games("nosuchuser")
    
    assert result is False

def test_reset_all_data_success(mock_supabase):
    # Mock get_all_users inside reset_all_data
    with patch('manage_db.get_all_users') as mock_get_users:
        mock_get_users.return_value = [{"id": "id1"}, {"id": "id2"}]
        
        # Mock delete logic
        mock_delete_query = MagicMock()
        mock_delete_query.data = [{"id": "id1"}]
        # Set return value without calling the mock functions to avoid incrementing call_count
        mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value = mock_delete_query

        result = reset_all_data()

        assert result is True
        assert mock_supabase.table().delete().eq.call_count == 2
        mock_supabase.table().delete().eq.assert_any_call("id", "id1")
        mock_supabase.table().delete().eq.assert_any_call("id", "id2")

def test_reset_all_data_empty(mock_supabase):
    with patch('manage_db.get_all_users') as mock_get_users:
        mock_get_users.return_value = []

        result = reset_all_data()

        assert result is True
        mock_supabase.table().delete.assert_not_called()

# Test the main CLI interactive flow (Menu choice 6 to exit initially)
def test_main_exit():
    with patch('builtins.input', return_value='6'):
        with patch('builtins.print') as mock_print:
            main()
            mock_print.assert_any_call("Exiting...")

def test_main_list_users():
    # Simulate user choosing 1, then forcing exit by exception or patching another choice
    with patch('builtins.input', side_effect=['1', '6']):
        with patch('manage_db.get_all_users') as mock_get_users:
            mock_get_users.return_value = [{"id": "1", "username": "u1", "games": []}]
            with patch('builtins.print') as mock_print:
                main()
                mock_print.assert_any_call(" - u1 (ID: 1, Games: 0)")
