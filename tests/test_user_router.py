"""
Tests for backend/routers/user.py (GET /games and DELETE /games/{game_id}).
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from backend.main import app
from backend.services.auth_service import _session_cache


def _inject_session(token: str, user: dict):
    _session_cache[token] = user


def _cleanup_session(token: str):
    _session_cache.pop(token, None)


client = TestClient(app)
TEST_TOKEN = "test_user_router_token"
TEST_USER = {"id": "user_router_test", "username": "routeruser", "email": "r@local"}


def setup_function():
    _inject_session(TEST_TOKEN, TEST_USER)


def teardown_function():
    _cleanup_session(TEST_TOKEN)


# ── GET /api/user/games ───────────────────────────────────────────────────

def test_get_games_unauthenticated():
    resp = client.get("/api/user/games")
    assert resp.status_code == 401


def test_get_games_invalid_token():
    resp = client.get("/api/user/games", headers={"Authorization": "Bearer invalid_token"})
    assert resp.status_code == 401


def test_get_games_success():
    with patch('backend.services.auth_service.supabase') as sb:
        sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {'games': ['G1', 'G2']}
        ]
        # Also mock the metadata lookup
        sb.table.return_value.select.return_value.in_.return_value.execute.return_value.data = [
            {'id': 'G1', 'last_activity': '2024-01-01T00:00:00'},
            {'id': 'G2', 'last_activity': '2024-01-02T00:00:00'},
        ]

        resp = client.get("/api/user/games", headers={"Authorization": f"Bearer {TEST_TOKEN}"})

    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "games" in data


# ── DELETE /api/user/games/{game_id} ─────────────────────────────────────

def test_delete_game_unauthenticated():
    resp = client.delete("/api/user/games/G1")
    assert resp.status_code == 401


def test_delete_game_success():
    with patch('backend.services.auth_service.supabase') as sb:
        sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {'games': ['G1', 'G2']}
        ]
        sb.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()

        resp = client.delete("/api/user/games/G1", headers={"Authorization": f"Bearer {TEST_TOKEN}"})

    assert resp.status_code == 200
    assert resp.json()["success"] is True


def test_delete_game_not_in_memory():
    """Deleting a game that isn't loaded in memory should still succeed."""
    with patch('backend.services.auth_service.supabase') as sb, \
         patch('backend.services.game_service.game_lobby') as lobby_mock:
        sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {'games': ['G1']}
        ]
        sb.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()
        lobby_mock.games = {}  # Game not in memory

        resp = client.delete("/api/user/games/G1", headers={"Authorization": f"Bearer {TEST_TOKEN}"})

    assert resp.status_code == 200
    assert resp.json()["success"] is True
