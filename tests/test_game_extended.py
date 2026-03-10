"""
Extended tests for backend/services/game_service.py
Covers: game state, guess loss, mask_word, state_for_frontend, choose_word failures, load_from_db, save_to_db.
"""
import pytest
import time
from unittest.mock import patch, MagicMock
from backend.services.game_service import GameManager, GameLobby


# ── mask_word ──────────────────────────────────────────────────────────────

def test_mask_word_playing():
    gm = GameManager("G")
    gm.word = "AB"
    gm.guessed = ["A"]
    gm.status = "playing"
    assert gm.mask_word() == "A_"


def test_mask_word_choosing():
    gm = GameManager("G")
    gm.word = "SECRET"
    gm.status = "choosing"
    assert gm.mask_word() == "VÄLJER..."


def test_mask_word_no_word():
    gm = GameManager("G")
    gm.word = ""
    assert gm.mask_word() == ""


# ── process_guess ─────────────────────────────────────────────────────────

def test_process_guess_not_playing():
    """Guesses when status != playing should be silently ignored."""
    gm = GameManager("G")
    gm.add_player("p1", "Alice", "s1")
    gm.word = "ABC"
    gm.status = "finished"
    gm.process_guess("p1", "A")
    assert "A" not in gm.guessed


def test_process_guess_chooser_blocked():
    """The word chooser should not be allowed to guess."""
    gm = GameManager("G")
    gm.add_player("p1", "Alice", "s1")
    gm.add_player("p2", "Bob", "s2")
    gm.word = "CAT"
    gm.status = "playing"
    gm.chooser_id = "p1"
    gm.process_guess("p1", "C")
    assert "C" not in gm.guessed


def test_process_guess_duplicate():
    """Already-guessed letters should be silently ignored."""
    gm = GameManager("G")
    gm.add_player("p1", "Alice", "s1")
    gm.word = "CAT"
    gm.status = "playing"
    gm.guessed = ["C"]
    gm.process_guess("p1", "C")
    assert gm.guessed.count("C") == 1


def test_process_guess_invalid_char():
    """Non-alpha or multi-char inputs should be ignored."""
    gm = GameManager("G")
    gm.add_player("p1", "Alice", "s1")
    gm.word = "CAT"
    gm.status = "playing"
    gm.process_guess("p1", "1")
    gm.process_guess("p1", "AB")
    assert len(gm.guessed) == 0


def test_process_guess_loss():
    """Exceeding max_wrong guesses should finish the game with no winner."""
    gm = GameManager("G")
    gm.add_player("p1", "Alice", "s1")
    gm.word = "ZZ"
    gm.status = "playing"
    gm.max_wrong = 1
    gm.process_guess("p1", "X")  # Wrong, triggers loss
    assert gm.status == "finished"
    assert gm.winner_id is None
    assert len(gm.history) == 1
    assert gm.history[0]["winner"] is None


def test_process_guess_winner_not_in_players():
    """Win by unknown player (edge case) should still finish the game."""
    gm = GameManager("G")
    gm.word = "A"
    gm.status = "playing"
    # No players added — p1 is unknown
    gm.process_guess("p1_unknown", "A")
    assert gm.status == "finished"
    assert gm.winner_id == "p1_unknown"


# ── start_new_round ───────────────────────────────────────────────────────

def test_start_new_round_no_chooser():
    """If uuid is None, should fall back to picking a random word."""
    gm = GameManager("G")
    gm.add_player("p1", "Alice", "s1")
    with patch.object(gm, 'pick_random_word') as mock:
        gm.start_new_round(None)
    mock.assert_called_once()


def test_start_new_round_unknown_player():
    """Chooser not in players dict should fall back to random word."""
    gm = GameManager("G")
    gm.add_player("p1", "Alice", "s1")
    with patch.object(gm, 'pick_random_word') as mock:
        gm.start_new_round("nobody_known")
    mock.assert_called_once()


# ── choose_word ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_choose_word_not_choosing_status():
    gm = GameManager("G")
    gm.add_player("p1", "Alice", "s1")
    gm.status = "playing"
    gm.chooser_id = "p1"
    success, msg = await gm.choose_word("p1", "HUND")
    assert success is False


@pytest.mark.asyncio
async def test_choose_word_wrong_chooser():
    gm = GameManager("G")
    gm.add_player("p1", "Alice", "s1")
    gm.add_player("p2", "Bob", "s2")
    gm.status = "choosing"
    gm.chooser_id = "p1"
    success, msg = await gm.choose_word("p2", "HUND")
    assert success is False


@pytest.mark.asyncio
async def test_choose_word_non_alpha():
    gm = GameManager("G")
    gm.add_player("p1", "Alice", "s1")
    gm.status = "choosing"
    gm.chooser_id = "p1"
    success, msg = await gm.choose_word("p1", "123")
    assert success is False


@pytest.mark.asyncio
async def test_choose_word_too_short():
    gm = GameManager("G")
    gm.add_player("p1", "Alice", "s1")
    gm.status = "choosing"
    gm.chooser_id = "p1"
    success, msg = await gm.choose_word("p1", "A")
    assert success is False


@pytest.mark.asyncio
async def test_choose_word_ai_invalid():
    """Word not in dict and rejected by AI should fail."""
    gm = GameManager("G")
    gm.add_player("p1", "Alice", "s1")
    gm.status = "choosing"
    gm.chooser_id = "p1"
    with patch("backend.ai_validator.validate_word_with_ai", return_value=False):
        success, msg = await gm.choose_word("p1", "XYZXYZ")
    assert success is False


@pytest.mark.asyncio
async def test_choose_word_ai_rate_limited_fallback():
    """Rate-limited AI response should accept the word via the grace fallback."""
    gm = GameManager("G")
    gm.add_player("p1", "Alice", "s1")
    gm.status = "choosing"
    gm.chooser_id = "p1"
    with patch("backend.ai_validator.validate_word_with_ai", return_value="RATE_LIMITED"), \
         patch('backend.services.game_service._valid_words_set', set()):
        success, msg = await gm.choose_word("p1", "RAREWORD")
    assert success is True


# ── get_state_for_frontend ─────────────────────────────────────────────────

def test_get_state_for_frontend_choosing():
    gm = GameManager("G")
    gm.word = "SECRET"
    gm.status = "choosing"
    state = gm.get_state_for_frontend()
    assert state["word"] == "VÄLJER..."


def test_get_state_for_frontend_finished():
    gm = GameManager("G")
    gm.word = "SECRET"
    gm.status = "finished"
    gm.guessed = ["S", "E", "C", "R", "T"]
    state = gm.get_state_for_frontend()
    assert state["word"] == "SECRET"


def test_get_state_for_frontend_legacy_string_history():
    """Legacy string history entries should be sanitized to dicts."""
    gm = GameManager("G")
    gm.history = ["OLDWORD"]
    state = gm.get_state_for_frontend()
    assert isinstance(state["history"][0], dict)
    assert state["history"][0]["word"] == "OLDWORD"


def test_get_state_for_frontend_playing_with_space():
    """Words with spaces should show spaces openly in mask."""
    gm = GameManager("G")
    gm.word = "A B"
    gm.status = "playing"
    gm.guessed = ["A"]
    state = gm.get_state_for_frontend()
    assert " " in state["word"]


# ── add_player ─────────────────────────────────────────────────────────────

def test_add_player_updates_existing():
    """add_player() should update name and sid for returning players."""
    gm = GameManager("G")
    gm.add_player("p1", "Alice", "sid_old")
    gm.add_player("p1", "Alice Updated", "sid_new")
    assert gm.players["p1"]["name"] == "Alice Updated"
    assert gm.players["p1"]["sid"] == "sid_new"
    assert gm.players["p1"]["online"] is True


# ── remove_player_completely ───────────────────────────────────────────────

def test_remove_player_completely_nonexistent():
    """Removing a player who is not in the game should be a no-op."""
    gm = GameManager("G")
    gm.add_player("p1", "Alice", "s1")
    gm.remove_player_completely("p_nobody")  # Should not raise
    assert "p1" in gm.players  # p1 should still be there


# ── remove_player_by_sid ───────────────────────────────────────────────────

def test_remove_player_by_sid_unknown():
    """remove_player_by_sid() with unknown sid should be a no-op."""
    gm = GameManager("G")
    gm.add_player("p1", "Alice", "sid1")
    gm.remove_player_by_sid("unknown_sid")  # Should not raise
    assert gm.players["p1"]["online"] is True


# ── GameLobby ─────────────────────────────────────────────────────────────

def test_game_lobby_loads_new_game():
    lobby = GameLobby()
    game = lobby.get_game("NEW_GAME")
    assert game.game_id == "NEW_GAME"
    # Second call returns same instance
    assert lobby.get_game("NEW_GAME") is game


def test_game_lobby_cleanup():
    """Cleanup removes games that are idle past the threshold."""
    current_time = 1_000_000.0
    with patch('time.time', return_value=current_time):
        lobby = GameLobby()
        game = lobby.get_game("OLD")
        game.last_activity = current_time - (31 * 24 * 3600)  # 31 days idle

        removed = lobby.cleanup_inactive_games(max_idle_days=30)
        assert removed == 1
        assert "OLD" not in lobby.games


def test_game_lobby_cleanup_removes_user_mapping():
    """Cleanup should prune user_games mapping too."""
    current_time = 1_000_000.0
    with patch('time.time', return_value=current_time):
        lobby = GameLobby()
        game = lobby.get_game("OLDGAME")
        game.add_player("u1", "Alice", "s1")
        lobby.register_player_game("u1", "OLDGAME")
        game.last_activity = current_time - (31 * 24 * 3600)

        lobby.cleanup_inactive_games(max_idle_days=30)
        assert "u1" not in lobby.user_games


# ── Chooser timeout ────────────────────────────────────────────────────────

def test_chooser_timed_out_false_when_waiting():
    """chooser_timed_out should be False when status is not 'choosing'."""
    gm = GameManager("G")
    gm.status = "waiting"
    assert gm.chooser_timed_out is False


def test_chooser_timed_out_false_before_deadline():
    """chooser_timed_out should be False if time hasn't elapsed yet."""
    gm = GameManager("G")
    gm.add_player("p1", "Alice", "s1")
    with patch('time.time', return_value=1_000_000.0):
        gm.start_new_round("p1")
    # 1 second later — well within 5-minute window
    with patch('time.time', return_value=1_000_001.0):
        assert gm.chooser_timed_out is False


def test_chooser_timed_out_true_after_deadline():
    """chooser_timed_out should be True after CHOOSER_TIMEOUT_SECONDS."""
    gm = GameManager("G")
    gm.add_player("p1", "Alice", "s1")
    with patch('time.time', return_value=1_000_000.0):
        gm.start_new_round("p1")
    # 5 minutes + 1 second later
    with patch('time.time', return_value=1_000_000.0 + GameManager.CHOOSER_TIMEOUT_SECONDS + 1):
        assert gm.chooser_timed_out is True


def test_start_new_round_sets_choosing_started_at():
    """start_new_round should set choosing_started_at."""
    gm = GameManager("G")
    gm.add_player("p1", "Alice", "s1")
    gm.choosing_started_at = None
    with patch('time.time', return_value=9999.0):
        gm.start_new_round("p1")
    assert gm.choosing_started_at == 9999.0


def test_cancel_start_clears_choosing_started_at():
    """cancel_start_game should clear choosing_started_at."""
    gm = GameManager("G")
    gm.add_player("p1", "Alice", "s1")
    gm.start_new_round("p1")
    gm.cancel_start_game("p1")
    assert gm.choosing_started_at is None
    assert gm.status == "waiting"


def test_force_cancel_choosing():
    """force_cancel_choosing should reset state without auth check."""
    gm = GameManager("G")
    gm.add_player("p1", "Alice", "s1")
    gm.start_new_round("p1")
    assert gm.status == "choosing"

    gm.force_cancel_choosing()
    assert gm.status == "waiting"
    assert gm.chooser_id is None
    assert gm.choosing_started_at is None
    assert gm.players["p1"]["is_chooser"] is False


def test_force_cancel_choosing_no_op_when_not_choosing():
    """force_cancel_choosing should be a no-op if not in 'choosing' state."""
    gm = GameManager("G")
    gm.add_player("p1", "Alice", "s1")
    gm.status = "waiting"
    gm.force_cancel_choosing()  # Should not raise or change status
    assert gm.status == "waiting"


def test_choose_word_clears_choosing_started_at():
    """Successfully choosing a word should clear choosing_started_at."""
    import asyncio

    async def _run():
        gm = GameManager("G")
        gm.add_player("p1", "Alice", "s1")
        gm.start_new_round("p1")
        assert gm.choosing_started_at is not None
        with patch("backend.ai_validator.validate_word_with_ai", return_value=True):
            success, _ = await gm.choose_word("p1", "HACKER")
        assert success is True
        assert gm.choosing_started_at is None

    asyncio.get_event_loop().run_until_complete(_run())

