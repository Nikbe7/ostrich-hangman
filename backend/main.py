import socketio
from fastapi import FastAPI, HTTPException, Header
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from .game_manager import game_lobby
from .auth import AuthManager
from .schemas import AuthRequest
import os

# Create Socket.IO server (Async)
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
app = FastAPI()

# Mount Socket.IO app
socket_app = socketio.ASGIApp(sio, app)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- REST API (Auth) ---

@app.post("/api/auth/register")
async def register(request: AuthRequest):
    result = AuthManager.register(request.username, request.password)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@app.post("/api/auth/login")
async def login(request: AuthRequest):
    result = AuthManager.login(request.username, request.password)
    if not result["success"]:
        raise HTTPException(status_code=401, detail=result["error"])
    return result

@app.get("/api/user/games")
async def get_user_games(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ")[1]
    user = AuthManager.get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    games = AuthManager.get_user_games(user["id"])
    return {"success": True, "games": games}

@app.delete("/api/user/games/{game_id}")
async def remove_user_game(game_id: str, authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ")[1]
    user = AuthManager.get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    AuthManager.remove_game_from_user(user["id"], game_id)
    return {"success": True}

# --- Socket.IO Events ---

@sio.event
async def connect(sid, environ, auth=None):
    print(f"[CONNECT] sid={sid}, auth={auth}")
    user = None
    if auth and 'token' in auth:
        token = auth['token']
        user = AuthManager.get_user_by_token(token)
        if user:
            print(f"[CONNECT] Authenticated user: {user['username']} ({user['id']})")
            # Store user info in session
            await sio.save_session(sid, {'user': user})
    
    if not user:
        print("[CONNECT] Anonymous connection")

@sio.event
async def join_game(sid, data):
    print(f"[JOIN_GAME] sid={sid}, data={data}")
    try:
        game_id = data.get('gameId', 'global')
        
        # Check if authenticated
        session = await sio.get_session(sid)
        user = session.get('user')
        
        if user:
            # Use authenticated user data
            uuid = user['id']
            name = user['username']
        else:
            # Fallback to provided session/name (anonymous)
            uuid = data.get('sessionId')
            name = data.get('playerName')

        if uuid and name:
            # Join the Socket.IO room for this game
            await sio.enter_room(sid, game_id)
            game = game_lobby.get_game(game_id)
            game.add_player(uuid, name, sid)
            
            # Persist game if authenticated user
            if user:
                AuthManager.add_game_to_user(uuid, game_id)

            state = game.get_state_for_frontend()
            print(f"[JOIN_GAME] Emitting update_game to room={game_id}, players={len(state['players'])}")
            await sio.emit('update_game', state, room=game_id)
            response = {'status': 'ok', 'message': 'Joined successfully'}
            print(f"[JOIN_GAME] Returning: {response}")
            return response
        else:
            print(f"[JOIN_GAME] Missing uuid or name, ignoring")
            return {'status': 'error', 'message': 'Missing uuid or name'}
    except Exception as e:
        print(f"[JOIN_GAME] Error: {e}")
        return {'status': 'error', 'message': str(e)}

@sio.event
async def guess_letter(sid, data):
    game_id = data.get('gameId', 'global')
    
    # Check if authenticated/session matches
    session = await sio.get_session(sid)
    user = session.get('user')
    uuid = user['id'] if user else data.get('sessionId')

    letter = data.get('letter')
    if uuid and letter:
        game = game_lobby.get_game(game_id)
        game.process_guess(uuid, letter)
        await sio.emit('update_game', game.get_state_for_frontend(), room=game_id)

@sio.event
async def submit_word(sid, data):
    game_id = data.get('gameId', 'global')
    
    session = await sio.get_session(sid)
    user = session.get('user')
    uuid = user['id'] if user else data.get('sessionId')
    
    word = data.get('word')

    if uuid and word:
        game = game_lobby.get_game(game_id)
        success, message = await game.choose_word(uuid, word)
        if not success:
            await sio.emit('error', message, room=sid)
        else:
            await sio.emit('update_game', game.get_state_for_frontend(), room=game_id)

@sio.event
async def reset_game(sid, data):
    game_id = data.get('gameId', 'global')
    
    session = await sio.get_session(sid)
    user = session.get('user')
    uuid = user['id'] if user else data.get('sessionId')
    
    game = game_lobby.get_game(game_id)
    game.start_new_round(uuid)
    await sio.emit('update_game', game.get_state_for_frontend(), room=game_id)

@sio.event
async def disconnect(sid):
    print(f"[DISCONNECT] sid={sid}")
    for game_id, game in game_lobby.games.items():
        game.remove_player_by_sid(sid)
        await sio.emit('update_game', game.get_state_for_frontend(), room=game_id)
