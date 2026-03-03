import socketio
from fastapi import FastAPI, HTTPException, Header
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from .services.game_service import game_lobby, MAX_GAMES_PER_USER
from .services.auth_service import AuthManager
from .routers import auth, user
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


# --- Base Route for Health Checks ---
@app.get("/")
@app.head("/")
async def root():
    return {"status": "ok", "message": "Ostrich Hangman API is running"}

# --- REST API Routers ---
app.include_router(auth.router)
app.include_router(user.router)

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
            # Limit active games for authenticated users creating a new room
            is_new_game = game_id not in game_lobby.games
            if user and is_new_game:
                current_game_count = game_lobby.count_games_for_user(uuid)
                if current_game_count >= MAX_GAMES_PER_USER:
                    return {
                        'status': 'error',
                        'message': f'Du har redan {current_game_count} aktiva spel. Max {MAX_GAMES_PER_USER} spel per användare.'
                    }

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
