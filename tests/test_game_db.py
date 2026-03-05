"""
Tests for DB interaction paths in game_service (save_to_db, load_from_db, get_games_metadata).
"""
import pytest
import time
from unittest.mock import patch, MagicMock
from backend.services.game_service import GameManager, GameLobby


def _make_sb():
    sb = MagicMock()
    sb.table.return_value.upsert.return_value.execute.return_value = MagicMock()
    sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    sb.table.return_value.select.return_value.in_.return_value.execute.return_value.data = []
    return sb


# ── save_to_db ─────────────────────────────────────────────────────────────

def test_save_to_db_success():
    """save_to_db should call supabase upsert without raising."""
    sb = _make_sb()
    gm = GameManager("SAVE_TEST")
    with patch('backend.services.game_service.supabase', sb):
        gm.save_to_db()
    sb.table.return_value.upsert.assert_called_once()


def test_save_to_db_exception():
    """save_to_db should log and swallow exceptions."""
    sb = _make_sb()
    sb.table.return_value.upsert.return_value.execute.side_effect = Exception("DB down")
    gm = GameManager("SAVE_ERR")
    with patch('backend.services.game_service.supabase', sb):
        gm.save_to_db()  # Should not raise


# ── load_from_db ───────────────────────────────────────────────────────────

def test_load_from_db_returns_none_when_empty():
    """load_from_db should return None if no records in DB."""
    sb = _make_sb()
    sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    with patch('backend.services.game_service.supabase', sb):
        result = GameManager.load_from_db("MISSING_GAME")
    assert result is None


def test_load_from_db_restores_state():
    """load_from_db should reconstruct game state from DB record."""
    state = {
        'real_word': 'STRUTS',
        'guessedLetters': ['S', 'T'],
        'wrongGuesses': 2,
        'status': 'playing',
        'wordChooser': 'p1',
        'winnerId': None,
        'message': 'Guess!',
        'guessLog': [{'name': 'Alice', 'letter': 'S', 'correct': True}],
        'history': [],
        'players': [
            {'sessionId': 'p1', 'name': 'Alice', 'score': 1, 'isOnline': True}
        ]
    }
    sb = _make_sb()
    sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{'state': state}]

    with patch('backend.services.game_service.supabase', sb):
        gm = GameManager.load_from_db("EXISTING_GAME")

    assert gm is not None
    assert gm.word == 'STRUTS'
    assert gm.wrong_guesses == 2
    assert 'p1' in gm.players
    assert gm.players['p1']['name'] == 'Alice'


def test_load_from_db_exception_returns_none():
    """load_from_db should return None on Supabase error."""
    sb = MagicMock()
    sb.table.return_value.select.return_value.eq.return_value.execute.side_effect = Exception("fail")

    with patch('backend.services.game_service.supabase', sb):
        result = GameManager.load_from_db("BAD_GAME")

    assert result is None


# ── GameLobby.get_games_metadata ───────────────────────────────────────────

def test_get_games_metadata_empty():
    """Should return empty list for empty input."""
    lobby = GameLobby()
    result = lobby.get_games_metadata([])
    assert result == []


def test_get_games_metadata_from_memory():
    """Should return data from in-memory games without hitting DB."""
    lobby = GameLobby()
    game = lobby.get_game("MEMGAME")
    game.last_activity = 12345.0

    with patch('backend.services.game_service.supabase') as sb:
        result = lobby.get_games_metadata(["MEMGAME"])

    # Supabase should not have been queried at all
    sb.table.assert_not_called()
    assert result[0]["id"] == "MEMGAME"
    assert result[0]["last_activity"] == 12345.0


def test_get_games_metadata_from_db():
    """Should fallback to DB for games not in memory."""
    lobby = GameLobby()
    sb = _make_sb()
    sb.table.return_value.select.return_value.in_.return_value.execute.return_value.data = [
        {'id': 'DBGAME', 'last_activity': '2024-01-15T10:00:00+00:00'}
    ]

    with patch('backend.services.game_service.supabase', sb):
        result = lobby.get_games_metadata(["DBGAME"])

    assert len(result) == 1
    assert result[0]["id"] == "DBGAME"


def test_get_games_metadata_fallback_for_unknown():
    """Unknown games not in memory or DB should get a current timestamp fallback."""
    lobby = GameLobby()
    sb = _make_sb()
    sb.table.return_value.select.return_value.in_.return_value.execute.return_value.data = []

    with patch('backend.services.game_service.supabase', sb):
        result = lobby.get_games_metadata(["UNKNOWN_GAME"])

    assert len(result) == 1
    assert result[0]["id"] == "UNKNOWN_GAME"


def test_get_games_metadata_db_exception():
    """DB exception during metadata fetch should not crash, returning fallback."""
    lobby = GameLobby()
    sb = MagicMock()
    sb.table.return_value.select.return_value.in_.return_value.execute.side_effect = Exception("DB down")

    with patch('backend.services.game_service.supabase', sb):
        result = lobby.get_games_metadata(["ANY_GAME"])

    assert result[0]["id"] == "ANY_GAME"


# ── GameLobby.get_game (load from DB) ────────────────────────────────────

def test_get_game_loads_from_db_when_not_in_memory():
    """get_game() should load from DB for unknown game IDs and register players."""
    state = {
        'real_word': 'KATT',
        'guessedLetters': [],
        'wrongGuesses': 0,
        'status': 'playing',
        'wordChooser': 'p1',
        'winnerId': None,
        'message': '',
        'guessLog': [],
        'history': [],
        'players': [{'sessionId': 'p1', 'name': 'Alice', 'score': 0, 'isOnline': False}]
    }
    sb = _make_sb()
    sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{'state': state}]
    sb.table.return_value.upsert.return_value.execute.return_value = MagicMock()

    lobby = GameLobby()
    with patch('backend.services.game_service.supabase', sb):
        game = lobby.get_game("DBLOADED")

    assert game.word == "KATT"
    # Players should be registered in reverse mapping
    assert "DBLOADED" in lobby.user_games.get("p1", set())
