import pytest
import asyncio
from unittest.mock import patch
from backend.services.game_service import GameLobby, GameManager, MAX_GAMES_PER_USER
from backend.services.auth_service import AuthManager

def test_game_manager_creation():
    lobby = GameLobby()
    game = lobby.get_game("TEST1")
    assert game.game_id == "TEST1"
    
    game2 = lobby.get_game("TEST1")
    assert game == game2

def test_game_add_player():
    game = GameManager("LOBBY1")
    game.add_player("uuid1", "Player One", "sid1")
    
    assert "uuid1" in game.players
    assert game.players["uuid1"]["name"] == "Player One"
    assert game.players["uuid1"]["sid"] == "sid1"

@pytest.mark.asyncio
async def test_game_choose_word_success():
    game = GameManager("LOBBY1")
    game.add_player("uuid1", "Player One", "sid1")
    game.start_new_round("uuid1")
    
    # Mock AI validator so we don't hit Gemini
    with patch("backend.ai_validator.validate_word_with_ai", return_value=True):
        success, msg = await game.choose_word("uuid1", "HACKER")
        
    assert success is True
    assert game.word == "HACKER"
    assert game.status == "playing"

def test_process_guess():
    game = GameManager("LOBBY1")
    game.add_player("uuid1", "Player One", "sid1")
    game.word = "TEST"
    game.status = "playing"
    game.guessed = []
    
    game.process_guess("uuid1", "T")
    assert "T" in game.guessed

def test_process_guess_win():
    """Guessing all letters in a 2-letter word should end the game."""
    game = GameManager("WIN1")
    game.add_player("uuid1", "Player One", "sid1")
    game.word = "AB"
    game.status = "playing"
    game.guessed = []

    game.process_guess("uuid1", "A")
    assert game.status == "playing"  # Not finished yet

    game.process_guess("uuid1", "B")
    assert game.status == "finished"
    assert game.winner_id == "uuid1"

def test_count_games_for_user():
    """count_games_for_user returns the correct number of active games."""
    lobby = GameLobby()
    for i in range(3):
        game = lobby.get_game(f"GAME_{i}")
        game.add_player("user1", "User One", f"sid_{i}")

    assert lobby.count_games_for_user("user1") == 3
    assert lobby.count_games_for_user("user_unknown") == 0

def test_game_limit_enforced():
    """A user in MAX_GAMES_PER_USER games should be considered at the limit."""
    lobby = GameLobby()
    for i in range(MAX_GAMES_PER_USER):
        game = lobby.get_game(f"LIMIT_GAME_{i}")
        game.add_player("limited_user", "Limited", f"sid_{i}")

    count = lobby.count_games_for_user("limited_user")
    assert count >= MAX_GAMES_PER_USER

def test_password_hash_verify_roundtrip():
    """Hashing a password and then verifying it should return True."""
    password = "MySuperSecret123"
    hashed = AuthManager._hash_password(password)

    # Hash should not be the plaintext password
    assert hashed != password
    assert hashed.startswith("$2b$")  # bcrypt format

    # Correct password should verify
    assert AuthManager._verify_password(password, hashed) is True

    # Wrong password should NOT verify
    assert AuthManager._verify_password("WrongPassword", hashed) is False

