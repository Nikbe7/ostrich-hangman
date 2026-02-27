from fastapi import APIRouter, HTTPException
from ..schemas import AuthRequest
from ..services.auth_service import AuthManager

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register")
async def register(request: AuthRequest):
    result = AuthManager.register(request.username, request.password)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.post("/login")
async def login(request: AuthRequest):
    result = AuthManager.login(request.username, request.password)
    if not result["success"]:
        raise HTTPException(status_code=401, detail=result["error"])
    return result
