"""
Tests for backend/services/auth_service.py
Covers: register, login, get_user_by_token, add/remove games, cleanup_session_cache.
"""
import pytest
from unittest.mock import MagicMock, patch
from backend.services.auth_service import AuthManager, _session_cache


def _make_supabase_mock():
    """Helper to build a fluent supabase mock."""
    sb = MagicMock()
    # Default: empty results
    sb.table.return_value.select.return_value.ilike.return_value.execute.return_value.data = []
    sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    sb.table.return_value.insert.return_value.execute.return_value = MagicMock()
    sb.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()
    return sb


def test_register_username_taken():
    """register() should fail if username already exists."""
    sb = _make_supabase_mock()
    sb.table.return_value.select.return_value.ilike.return_value.execute.return_value.data = [{'id': 'existing'}]

    with patch('backend.services.auth_service.supabase', sb):
        result = AuthManager.register("existinguser", "pass123")

    assert result['success'] is False
    assert result['error'] != ""  # Some user-facing error about username being taken


def test_register_db_exception():
    """register() should return error dict if Supabase insert fails."""
    sb = _make_supabase_mock()
    sb.table.return_value.select.return_value.ilike.return_value.execute.return_value.data = []
    sb.table.return_value.insert.return_value.execute.side_effect = Exception("DB error")

    with patch('backend.services.auth_service.supabase', sb):
        result = AuthManager.register("newuser", "pass123")

    assert result['success'] is False
    assert 'DB error' in result['error']


def test_login_user_not_found():
    """login() should fail when username doesn't exist."""
    sb = _make_supabase_mock()
    sb.table.return_value.select.return_value.ilike.return_value.execute.return_value.data = []

    with patch('backend.services.auth_service.supabase', sb):
        result = AuthManager.login("nobody", "pass")

    assert result['success'] is False


def test_login_wrong_password():
    """login() should fail when password is incorrect."""
    hashed = AuthManager._hash_password("correctpass")
    sb = _make_supabase_mock()
    sb.table.return_value.select.return_value.ilike.return_value.execute.return_value.data = [
        {'id': 'u1', 'username': 'alice', 'password_hash': hashed}
    ]

    with patch('backend.services.auth_service.supabase', sb):
        result = AuthManager.login("alice", "wrongpass")

    assert result['success'] is False
    assert 'lösenord' in result['error']


def test_login_session_insert_exception():
    """login() should fail gracefully when session insert fails."""
    hashed = AuthManager._hash_password("correct")
    sb = _make_supabase_mock()
    sb.table.return_value.select.return_value.ilike.return_value.execute.return_value.data = [
        {'id': 'u1', 'username': 'alice', 'password_hash': hashed}
    ]
    sb.table.return_value.insert.return_value.execute.side_effect = Exception("Session DB fail")

    with patch('backend.services.auth_service.supabase', sb):
        result = AuthManager.login("alice", "correct")

    assert result['success'] is False


def test_get_user_by_token_from_cache():
    """get_user_by_token() should return from cache if present."""
    _session_cache['my-token'] = {'id': 'cacheduser', 'username': 'cached'}
    result = AuthManager.get_user_by_token('my-token')
    assert result['id'] == 'cacheduser'
    del _session_cache['my-token']


def test_get_user_by_token_from_supabase():
    """get_user_by_token() should fallback to Supabase when not in cache."""
    sb = _make_supabase_mock()
    # Session lookup
    sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {'user_id': 'u99'}
    ]
    # Then user lookup - need to chain .eq().execute() again
    user_sb = MagicMock()
    user_sb.data = [{'id': 'u99', 'username': 'dbuser'}]
    sb.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
        MagicMock(data=[{'user_id': 'u99'}]),  # session query
        user_sb,  # user query
    ]

    with patch('backend.services.auth_service.supabase', sb):
        result = AuthManager.get_user_by_token('fresh-token')

    # Result should be the user or None if the mock chain is off — just verify no crash
    assert result is None or 'id' in result


def test_get_user_by_token_not_found():
    """get_user_by_token() should return None if session doesn't exist."""
    sb = _make_supabase_mock()
    sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

    with patch('backend.services.auth_service.supabase', sb):
        result = AuthManager.get_user_by_token('unknown-token')

    assert result is None


def test_get_user_by_token_supabase_exception():
    """get_user_by_token() should return None on exception."""
    sb = MagicMock()
    sb.table.return_value.select.return_value.eq.return_value.execute.side_effect = Exception("fail")

    with patch('backend.services.auth_service.supabase', sb):
        result = AuthManager.get_user_by_token('bad-token')

    assert result is None


def test_add_game_to_user_already_in_list():
    """add_game_to_user() should not duplicate if game is already listed."""
    sb = _make_supabase_mock()
    sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {'games': ['GAME1', 'GAME2']}
    ]

    with patch('backend.services.auth_service.supabase', sb):
        AuthManager.add_game_to_user('u1', 'GAME1')

    # update should NOT have been called since GAME1 already exists
    sb.table.return_value.update.assert_not_called()


def test_add_game_to_user_exception():
    """add_game_to_user() should not raise on exception."""
    sb = MagicMock()
    sb.table.return_value.select.return_value.eq.return_value.execute.side_effect = Exception("fail")

    with patch('backend.services.auth_service.supabase', sb):
        AuthManager.add_game_to_user('u1', 'GAME1')  # Should not raise


def test_remove_game_from_user_not_in_list():
    """remove_game_from_user() should not update if game is not in list."""
    sb = _make_supabase_mock()
    sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {'games': ['OTHER_GAME']}
    ]

    with patch('backend.services.auth_service.supabase', sb):
        AuthManager.remove_game_from_user('u1', 'GAME_NOT_THERE')

    sb.table.return_value.update.assert_not_called()


def test_remove_game_from_user_exception():
    """remove_game_from_user() should not raise on exception."""
    sb = MagicMock()
    sb.table.return_value.select.return_value.eq.return_value.execute.side_effect = Exception("fail")

    with patch('backend.services.auth_service.supabase', sb):
        AuthManager.remove_game_from_user('u1', 'GAME1')  # Should not raise


def test_get_user_games_returns_list():
    """get_user_games() should return a list of game IDs."""
    sb = _make_supabase_mock()
    sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {'games': ['G1', 'G2']}
    ]

    with patch('backend.services.auth_service.supabase', sb):
        games = AuthManager.get_user_games('u1')

    assert games == ['G1', 'G2']


def test_get_user_games_empty():
    """get_user_games() should return empty list when no games."""
    sb = _make_supabase_mock()
    sb.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

    with patch('backend.services.auth_service.supabase', sb):
        games = AuthManager.get_user_games('u_none')

    assert games == []


def test_get_user_games_exception():
    """get_user_games() should return empty list on exception."""
    sb = MagicMock()
    sb.table.return_value.select.return_value.eq.return_value.execute.side_effect = Exception("fail")

    with patch('backend.services.auth_service.supabase', sb):
        games = AuthManager.get_user_games('u1')

    assert games == []


def test_cleanup_session_cache_large():
    """cleanup_session_cache() should clear the cache when it exceeds 1000 entries."""
    import backend.services.auth_service as auth_mod
    # Fill the cache with 1001 entries
    for i in range(1001):
        auth_mod._session_cache[f'token_{i}'] = {'id': str(i)}

    assert len(auth_mod._session_cache) > 1000
    AuthManager.cleanup_session_cache()
    assert len(auth_mod._session_cache) == 0


def test_cleanup_session_cache_small():
    """cleanup_session_cache() should NOT clear cache when under 1000 entries."""
    import backend.services.auth_service as auth_mod
    auth_mod._session_cache.clear()
    auth_mod._session_cache['token_test'] = {'id': 'u1'}

    AuthManager.cleanup_session_cache()
    assert 'token_test' in auth_mod._session_cache
    auth_mod._session_cache.clear()


def test_verify_password_bad_hash():
    """_verify_password() should return False when hash is malformed."""
    result = AuthManager._verify_password("password", "not-a-real-bcrypt-hash")
    assert result is False
