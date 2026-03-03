import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.auth_service import AuthManager
from backend.services.game_service import game_lobby

client = TestClient(app)

def test_get_user_games_metadata(monkeypatch):
    # Setup: Mock AuthManager to avoid Supabase sync issues
    mock_user = {"id": "test_user_id", "username": "testuser"}
    mock_games = ["META_TEST"]
    
    monkeypatch.setattr(AuthManager, "get_user_by_token", lambda token: mock_user if token == "fake_token" else None)
    monkeypatch.setattr(AuthManager, "get_user_games", lambda user_id: mock_games if user_id == "test_user_id" else [])
    
    game_id = "META_TEST"
    game_lobby.get_game(game_id) # Ensure game exists in memory
    
    # Action: Fetch games
    response = client.get("/api/user/games", headers={"Authorization": "Bearer fake_token"})
    
    # Verify
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["games"]) == 1
    game_item = data["games"][0]
    assert game_item["id"] == game_id
    assert "last_activity" in game_item
    assert isinstance(game_item["last_activity"], float)

    # Cleanup (optional for in-memory, but good for DB if persistent)
    # AuthManager.delete_user(username) # If we had this helper in tests
