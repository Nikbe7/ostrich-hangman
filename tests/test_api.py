import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.auth import AuthManager

client = TestClient(app)

@pytest.fixture(autouse=True)
def wipe_db():
    # Simple fixture to clear in-memory auth before each test
    AuthManager.users = {}
    AuthManager.user_games = {}

def test_register_success():
    response = client.post(
        "/api/auth/register",
        json={"username": "testuser", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "user" in data
    assert data["user"]["username"] == "testuser"
    assert "session" in data
    assert "access_token" in data["session"]

def test_register_duplicate():
    client.post("/api/auth/register", json={"username": "testuser", "password": "password123"})
    response = client.post(
        "/api/auth/register",
        json={"username": "testuser", "password": "password123"}
    )
    assert response.status_code == 400
    assert "Användarnamnet" in response.json()["detail"] or "Username" in response.json()["detail"]

def test_login_success():
    client.post("/api/auth/register", json={"username": "testuser", "password": "password123"})
    response = client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "password123"}
    )
    assert response.status_code == 200
    assert response.json()["success"] is True

def test_login_invalid():
    client.post("/api/auth/register", json={"username": "testuser", "password": "password123"})
    response = client.post(
        "/api/auth/login",
        json={"username": "testuser", "password": "wrongpassword"}
    )
    assert response.status_code == 401

def test_get_user_games():
    # Register and get token
    reg_res = client.post("/api/auth/register", json={"username": "gameuser", "password": "password123"})
    token = reg_res.json()["session"]["access_token"]
    user_id = reg_res.json()["user"]["id"]
    
    # Add a game manually
    AuthManager.add_game_to_user(user_id, "GAME123")
    
    # Fetch games via API
    response = client.get("/api/user/games", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "GAME123" in data["games"]
