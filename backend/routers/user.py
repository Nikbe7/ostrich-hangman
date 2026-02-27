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
    return {"success": True, "games": games}

@router.delete("/games/{game_id}")
async def remove_user_game(game_id: str, authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ")[1]
    user = AuthManager.get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    AuthManager.remove_game_from_user(user["id"], game_id)
    return {"success": True}
