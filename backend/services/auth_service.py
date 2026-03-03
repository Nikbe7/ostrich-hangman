import os
import json
import secrets
import uuid
from passlib.context import CryptContext
from ..core.supabase import supabase
from typing import Dict, Any, Optional
from datetime import datetime

# Setup passlib CryptContext for bcrypt hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# In-memory cache to prevent Supabase rate-limits during rapid socket events
_session_cache: Dict[str, Dict[str, Any]] = {}

class AuthManager:
    """
    Supabase authentication manager with in-memory caching.
    Stores users in app_users and sessions in app_sessions.
    """

    @staticmethod
    def _hash_password(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def _verify_password(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def register(username: str, password: str) -> Dict[str, Any]:
        # Check if username exists (case insensitive)
        existing = supabase.table('app_users').select('id').ilike('username', username.strip()).execute()
        if existing.data and len(existing.data) > 0:
            return {"success": False, "error": "Användarnamnet är upptaget."}

        # Create new user
        user_id = str(uuid.uuid4())
        password_hash = AuthManager._hash_password(password)
        
        new_user = {
            "id": user_id,
            "username": username.strip(), # Keep original casing for display
            "password_hash": password_hash,
            "games": [] # Persistent list of joined games
        }
        
        # Insert into Supabase
        try:
            supabase.table('app_users').insert(new_user).execute()
        except Exception as e:
            return {"success": False, "error": str(e)}

        # Auto-login after register
        return AuthManager.login(username, password)

    @staticmethod
    def login(username: str, password: str) -> Dict[str, Any]:
        result = supabase.table('app_users').select('*').ilike('username', username.strip()).execute()
        if not result.data or len(result.data) == 0:
            return {"success": False, "error": "Användarnamnet finns inte."}
            
        user = result.data[0]

        # Verify password using passlib
        stored_hash = user['password_hash']
        
        if not AuthManager._verify_password(password, stored_hash):
            return {"success": False, "error": "Fel lösenord."}

        # Create session
        token = secrets.token_urlsafe(32)
        
        session_data = {
            "token": token,
            "user_id": user['id']
        }
        
        try:
            supabase.table('app_sessions').insert(session_data).execute()
        except Exception as e:
            return {"success": False, "error": "Sessionsfel: " + str(e)}

        cache_user = {
            "id": user['id'],
            "username": user['username'],
            "email": f"{user['username']}@local"
        }
        
        # Add to local cache immediately
        _session_cache[token] = cache_user

        return {
            "success": True,
            "user": cache_user,
            "session": {
                "access_token": token,
                "refresh_token": token # Simple reuse for now
            }
        }

    @staticmethod
    def get_user_by_token(token: str) -> Optional[Dict[str, Any]]:
        # Extremely fast cache hit for active game connections
        if token in _session_cache:
            return _session_cache[token]
            
        # Fallback to Supabase if not in cache (e.g. server restart)
        try:
            result = supabase.table('app_sessions').select('user_id').eq('token', token).execute()
            if not result.data or len(result.data) == 0:
                return None
                
            user_id = result.data[0]['user_id']
            
            user_res = supabase.table('app_users').select('id, username').eq('id', user_id).execute()
            if not user_res.data or len(user_res.data) == 0:
                return None
                
            user = user_res.data[0]
            cache_user = {
                "id": user['id'],
                "username": user['username'],
                "email": f"{user['username']}@local"
            }
            
            # Cache it for next time
            _session_cache[token] = cache_user
            return cache_user
        except Exception as e:
            print(f"Error fetching session from Supabase: {e}")
            return None

    @staticmethod
    def add_game_to_user(user_id: str, game_id: str):
        try:
            res = supabase.table('app_users').select('games').eq('id', user_id).execute()
            if res.data and len(res.data) > 0:
                games = res.data[0].get('games') or []
                if game_id not in games:
                    games.insert(0, game_id)
                    supabase.table('app_users').update({'games': games}).eq('id', user_id).execute()
        except Exception as e:
            print(f"Failed to add game to user: {e}")

    @staticmethod
    def remove_game_from_user(user_id: str, game_id: str):
        try:
            res = supabase.table('app_users').select('games').eq('id', user_id).execute()
            if res.data and len(res.data) > 0:
                games = res.data[0].get('games') or []
                if game_id in games:
                    games.remove(game_id)
                    supabase.table('app_users').update({'games': games}).eq('id', user_id).execute()
        except Exception as e:
            print(f"Failed to remove game from user: {e}")

    @staticmethod
    def get_user_games(user_id: str) -> list[str]:
        try:
            res = supabase.table('app_users').select('games').eq('id', user_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0].get('games') or []
        except Exception as e:
            print(f"Failed to get user games: {e}")
        return []
