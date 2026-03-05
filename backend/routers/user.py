from fastapi import APIRouter, HTTPException, Header
from ..services.auth_service import AuthManager

router = APIRouter(prefix="/api/user", tags=["user"])

@router.get("/games")
async def get_user_games(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ")[1]
    user = AuthManager.get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    games = AuthManager.get_user_games(user["id"])
    from ..services.game_service import game_lobby
    metadata = game_lobby.get_games_metadata(games)
    return {"success": True, "games": metadata}

@router.delete("/games/{game_id}")
async def remove_user_game(game_id: str, authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ")[1]
    user = AuthManager.get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    AuthManager.remove_game_from_user(user["id"], game_id)

    # Completely remove player from the active game and broadcast if loaded in memory
    from ..services.game_service import game_lobby
    if game_id in game_lobby.games:
        game = game_lobby.games[game_id]
        game.remove_player_completely(user["id"])
        
        # Remove from the reverse tracking set
        if user["id"] in game_lobby.user_games:
            game_lobby.user_games[user["id"]].discard(game_id)
            if not game_lobby.user_games[user["id"]]:
                del game_lobby.user_games[user["id"]]

        # Broadcast the change using socketio
        try:
            from ..main import sio
            await sio.emit('update_game', game.get_state_for_frontend(), room=game_id)
        except Exception as e:
            # Avoid breaking standard REST flow if socket emission fails (e.g. during tests without event loop)
            pass

    return {"success": True}
