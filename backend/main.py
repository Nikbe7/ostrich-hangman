import socketio
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Header
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from .services.game_service import game_lobby, MAX_GAMES_PER_USER
from .services.auth_service import AuthManager
from .routers import auth, user
import os

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("main")

# Create Socket.IO server (Async)
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    task = asyncio.create_task(cleanup_task())
    yield
    # Shutdown
    task.cancel()

app = FastAPI(title="Ostrich Hangman API", lifespan=lifespan)

# Mount Socket.IO app
socket_app = socketio.ASGIApp(sio, app)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://ostrich-hangman.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Background Cleanup Task ---
async def cleanup_task():
    """Background task that runs every hour to prune inactive resources."""
    while True:
        await asyncio.sleep(3600)  # Run every hour
        logger.info("Starting scheduled resource pruning...")
        try:
            # Prune inactive games (1 day / 24 hours) from memory
            removed_games = game_lobby.cleanup_inactive_games(max_idle_days=1)
            
            # Prune session cache
            AuthManager.cleanup_session_cache()
            
            if removed_games > 0:
                logger.info("Successfully removed %d inactive games.", removed_games)
        except Exception as e:
            logger.error("Error in background task: %s", e)

# Removed old on_event startup handler


# --- Base Route for Health Checks ---
@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    return {"status": "ok", "message": "Ostrich Hangman API is running"}

# --- REST API Routers ---
app.include_router(auth.router)
app.include_router(user.router)

# --- Socket.IO Events ---

@sio.event
async def connect(sid, environ, auth=None):
    logger.info("Socket connected: sid=%s, auth=%s", sid, auth)
    user = None
    if auth and 'token' in auth:
        token = auth['token']
        user = AuthManager.get_user_by_token(token)
        if user:
            logger.info("Authenticated user: %s (%s)", user['username'], user['id'])
            # Store user info in session
            sio.save_session(sid, {'user': user})
            return True # Indicate successful authentication
    
    logger.info("Anonymous connection: sid=%s", sid)
    return True # Allow anonymous connections for now

@sio.event
async def join_game(sid, data):
    logger.info("join_game: sid=%s, data=%s", sid, data)
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

            # Emit current state to everyone in the room (including the new joiner)
            state = game.get_state_for_frontend()
            logger.info("Emitting update_game to room=%s, players=%d", game_id, len(state['players']))
            await sio.emit('update_game', state, room=game_id)
            
            response = {"success": True, "game_id": game_id, "state": state}
            logger.info("Returning join_game response for sid=%s", sid)
            return response
        else:
            logger.warning("join_game failed: Missing uuid or name")
            return {"success": False, "error": "Missing uuid or name"}
    except Exception as e:
        logger.error("Error in join_game: %s", e)
        return {"success": False, "error": str(e)}

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
