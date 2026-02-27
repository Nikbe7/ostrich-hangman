import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.auth_service import AuthManager

client = TestClient(app)

@pytest.fixture
def mock_supabase_client():
    with patch("backend.services.auth_service.supabase") as mock_supa:
        yield mock_supa

def test_register_success(mock_supabase_client):
    mock_select = MagicMock()
    mock_select.ilike.return_value.execute.return_value = MagicMock(data=[])
    mock_insert = MagicMock()
    mock_insert.execute.return_value = MagicMock(data=[{"id": "123"}])
    
    def table_side_effect(name):
        mock_table = MagicMock()
        if name == "app_users":
            mock_table.select.return_value = mock_select
            mock_table.insert.return_value = mock_insert
        elif name == "app_sessions":
            mock_table.insert.return_value = MagicMock()
        return mock_table
    mock_supabase_client.table.side_effect = table_side_effect
    
    with patch.object(AuthManager, "_hash_password", return_value=("salt", "hash")):
        mock_select.ilike.return_value.execute.side_effect = [
            MagicMock(data=[]), # register check
            MagicMock(data=[{"id": "123", "username": "testuser", "salt": "salt", "password_hash": "hash"}]) # login fetch
        ]
        response = client.post("/api/auth/register", json={"username": "testuser", "password": "password123"})
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

def test_register_duplicate(mock_supabase_client):
    mock_select = MagicMock()
    mock_select.ilike.return_value.execute.return_value = MagicMock(data=[{"id": "exist1", "username": "testuser"}])
    mock_table = MagicMock()
    mock_table.select.return_value = mock_select
    mock_supabase_client.table.return_value = mock_table

    response = client.post("/api/auth/register", json={"username": "testuser", "password": "password123"})
    assert response.status_code == 400
    assert "upptaget" in response.json()["detail"].lower() or "användarnamnet" in response.json()["detail"].lower()

def test_login_success(mock_supabase_client):
    mock_select = MagicMock()
    mock_select.ilike.return_value.execute.return_value = MagicMock(data=[
        {"id": "123", "username": "testuser", "salt": "salt", "password_hash": "hash"}
    ])
    
    def table_side_effect(name):
        mock_table = MagicMock()
        if name == "app_users":
            mock_table.select.return_value = mock_select
        elif name == "app_sessions":
            mock_table.insert.return_value = MagicMock()
        return mock_table
    mock_supabase_client.table.side_effect = table_side_effect

    with patch.object(AuthManager, "_hash_password", return_value=("salt", "hash")):
        response = client.post("/api/auth/login", json={"username": "testuser", "password": "password123"})
        assert response.status_code == 200
        assert response.json()["success"] is True

def test_login_invalid(mock_supabase_client):
    mock_select = MagicMock()
    mock_select.ilike.return_value.execute.return_value = MagicMock(data=[
        {"id": "123", "username": "testuser", "salt": "salt", "password_hash": "correct-hash"}
    ])
    mock_supabase_client.table.return_value.select.return_value = mock_select

    with patch.object(AuthManager, "_hash_password", return_value=("salt", "wrong-hash")):
        response = client.post("/api/auth/login", json={"username": "testuser", "password": "wrongpassword"})
        assert response.status_code == 401
