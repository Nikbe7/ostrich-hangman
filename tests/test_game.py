import pytest
import asyncio
from unittest.mock import patch
from backend.services.game_service import GameLobby, GameManager

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
