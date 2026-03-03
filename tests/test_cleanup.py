import pytest
import time
from backend.services.game_service import GameLobby, GameManager

def test_cleanup_inactive_games():
    lobby = GameLobby()
    
    # Create a fresh game (recent)
    game_fresh = lobby.get_game("FRESH")
    
    # Create an old game and manually override its activity timestamp
    game_old = lobby.get_game("OLD")
    # 31 days ago
    game_old.last_activity = time.time() - (31 * 24 * 60 * 60)
    
    # Verify both exist
    assert "FRESH" in lobby.games
    assert "OLD" in lobby.games
    
    # Run cleanup
    removed_count = lobby.cleanup_inactive_games(max_idle_days=30)
    
    # Verify results
    assert removed_count == 1
    assert "FRESH" in lobby.games
    assert "OLD" not in lobby.games

def test_cleanup_refreshes_on_activity():
    lobby = GameLobby()
    game = lobby.get_game("ACTIVE")
    
    # Set to 29 days ago
    game.last_activity = time.time() - (29 * 24 * 60 * 60)
    
    # Update activity (simulates a guess or join)
    game._update_activity()
    
    # Run cleanup
    removed_count = lobby.cleanup_inactive_games(max_idle_days=30)
    
    # Should NOT be removed
    assert removed_count == 0
    assert "ACTIVE" in lobby.games
