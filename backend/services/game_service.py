import random
import time
import os
import asyncio
from typing import Dict, List, Optional, Set, Any, Union, cast, Tuple
from datetime import datetime
import logging
from ..schemas import GameStateModel, PlayerState

logger = logging.getLogger("game_service")

# Constants
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BACKEND_DIR, 'data')
WORDS_FILE = os.path.join(DATA_DIR, 'words.txt')

# Load words ONCE at module level (shared across all games)
_valid_words_list: List[str] = []
_valid_words_set: Set[str] = set()

# Initialize from Supabase
from ..core.supabase import supabase

def _load_words():
    global _valid_words_list, _valid_words_set
    try:
        response = supabase.table('app_words').select('word').execute()
        if response.data:
            _valid_words_list = [row['word'].upper() for row in response.data]
            _valid_words_set = set(_valid_words_list)
        else:
            # Fallback if db is empty
            _valid_words_list = ["OSTRICH", "HANGMAN", "SWEDEN"]
            _valid_words_set = set(_valid_words_list)
            
        logger.info("Loaded %d words from database.", len(_valid_words_list))
    except Exception as e:
        logger.error("Error loading words from database: %s", e)
        _valid_words_list = ["OSTRICH", "HANGMAN", "PYTHON", "FASTAPI"]
        _valid_words_set = {"ERROR"}

_load_words()


class GameManager:
    """Manages a single game room."""

    def __init__(self, game_id: str):
        self.game_id = game_id
        self.word = ""
        self.guessed: List[str] = []
        self.wrong_guesses = 0
        self.max_wrong = 10
        self.players: Dict[str, Any] = {}
        self.chooser_id: Optional[str] = None
        self.history: List[Union[Dict[str, Any], str]] = []
        self.status = "waiting"
        self.message = "Välkommen till Ostrich Hangman!"
        self.winner_id: Optional[str] = None
        self.guess_log: List[Dict[str, Any]] = []
        self.dynamic_ai_status: Optional[str] = None
        self.last_activity = time.time()

    def _update_activity(self):
        self.last_activity = time.time()
        self.save_to_db()

    def save_to_db(self):
        """Saves current state to Supabase"""
        state = self.get_state_for_frontend()
        # Ensure we save the REAL word to DB for recovery, because frontend might just get '____'
        state['real_word'] = self.word
        try:
            # We don't want to block the socket loop, so we'll do this "best effort" using asyncio background task
            # Or normally save it directly via synchronous SDK. For simplicity, we'll use synchronous supabase SDK.
            data = {"id": self.game_id, "state": state, "last_activity": datetime.utcnow().isoformat()}
            supabase.table('app_games').upsert(data).execute()
        except Exception as e:
            logger.error("Failed to save game %s to db: %s", self.game_id, e)

    @classmethod
    def load_from_db(cls, game_id: str) -> Optional['GameManager']:
        try:
            res = supabase.table('app_games').select('state').eq('id', game_id).execute()
            if res.data and len(res.data) > 0:
                gm = cls(game_id)
                state = res.data[0]['state']
                
                # Restore state mapping
                gm.word = state.get('real_word', state.get('word', '')) # 'real_word' is our custom db key
                gm.guessed = state.get('guessedLetters', [])
                gm.wrong_guesses = state.get('wrongGuesses', 0)
                gm.status = state.get('status', 'waiting')
                gm.chooser_id = state.get('wordChooser')
                gm.winner_id = state.get('winnerId')
                gm.message = state.get('message', '')
                gm.guess_log = state.get('guessLog', [])
                gm.history = state.get('history', [])
                
                # Restore players
                players_list = state.get('players', [])
                for p in players_list:
                    gm.players[p['sessionId']] = {
                        'id': p['sessionId'],
                        'sid': '', # offline initially
                        'name': p['name'],
                        'score': p['score'],
                        'online': False,
                        'last_seen': time.time() if p.get('isOnline') else 0, # approximation
                        'is_chooser': (p['sessionId'] == gm.chooser_id)
                    }
                return gm
        except Exception as e:
            logger.error("Failed to load game %s from db: %s", game_id, e)
        return None

    def mask_word(self) -> str:
        if not self.word: return ""
        if self.status == 'choosing':
            return "VÄLJER..."
        return "".join([c if c in self.guessed or c == ' ' else '_' for c in self.word])

    def add_player(self, uuid: str, name: str, sid: str):
        self._update_activity()
        if uuid in self.players:
            # Update existing player info
            self.players[uuid]['online'] = True
            self.players[uuid]['sid'] = sid
            # Only update name if it's different and not empty (though usually it comes from auth source of truth now)
            if name:
                self.players[uuid]['name'] = name
        else:
            self.players[uuid] = {
                'id': uuid,
                'sid': sid,
                'name': name,
                'score': 0,
                'online': True,
                'last_seen': time.time(),
                'is_chooser': False
            }

    def remove_player_by_sid(self, sid: str):
        for uuid, p in self.players.items():
            if p['sid'] == sid:
                p['online'] = False
                p['last_seen'] = time.time()
                break

    def start_new_round(self, instigator_id: str):
        self.word = ""
        self.guessed = []
        self.wrong_guesses = 0
        self.winner_id = None
        self.status = 'choosing'
        self.guess_log = []

        if instigator_id and instigator_id in self.players:
            current_chooser = self.chooser_id
            if current_chooser and current_chooser in self.players:
                self.players[current_chooser]['is_chooser'] = False

            self.chooser_id = instigator_id
            self.players[instigator_id]['is_chooser'] = True
            self.message = f"{self.players[instigator_id]['name']} väljer ord..."
        else:
            self.pick_random_word()

    def pick_random_word(self):
        if _valid_words_list:
            self.word = random.choice(_valid_words_list)
        else:
            self.word = "ERROR"
        self.guessed = []
        self.wrong_guesses = 0
        self.status = 'waiting' # waiting, choosing, playing, finished
        self.chooser_id = None
        self.message = ""
        self.guess_log = [] # List of {name, letter, correct}

    def process_guess(self, uuid: str, letter: str):
        self._update_activity()
        if self.status != 'playing': return
        if self.chooser_id == uuid: return

        letter = letter.upper()
        if not letter.isalpha() or len(letter) != 1: return
        if letter in self.guessed: return

        self.guessed.append(letter)
        
        is_correct = letter in self.word
        player_name = self.players[uuid]['name'] if uuid in self.players else "Okänd"
        self.guess_log.append({
            'name': player_name,
            'letter': letter,
            'correct': is_correct
        })

        if is_correct:
            all_guessed = all(c in self.guessed or c == ' ' for c in self.word)
            if all_guessed:
                self.status = 'finished'
                self.winner_id = uuid
                
                winner_name = "Okänd"
                if uuid in self.players:
                    winner_name = self.players[uuid]['name']
                    self.players[uuid]['score'] += 1
                
                self.message = f"{winner_name} gissade rätt!"

                self.history.insert(0, {
                    'word': self.word, 
                    'winner': uuid, 
                    'chooser': self.chooser_id,
                    'total_guesses': len(self.guessed)
                })

                current_chooser = self.chooser_id
                if current_chooser and current_chooser in self.players:
                    self.players[current_chooser]['is_chooser'] = False
                
                if uuid in self.players:
                    self.chooser_id = uuid
                    self.players[uuid]['is_chooser'] = True
                else:
                    self.chooser_id = None
        else:
            self.wrong_guesses += 1
            if self.wrong_guesses >= self.max_wrong:
                self.status = 'finished'
                self.message = f"Tyvärr! Ordet var {self.word}."
                self.history.insert(0, {
                    'word': self.word, 
                    'winner': None, 
                    'chooser': self.chooser_id,
                    'total_guesses': len(self.guessed)
                })

    async def choose_word(self, uuid: str, word: str) -> Tuple[bool, str]:
        """
        Allows the chooser to pick the word for this round.
        Returns (success: bool, message: str)
        """
        self._update_activity()
        from ..ai_validator import validate_word_with_ai
        
        if self.status != 'choosing':
            return False, "Spelet väntar inte på ett ordval just nu."
            
        if self.chooser_id != uuid:
            return False, "Det är inte din tur att välja ord."
            
        word_upper = word.upper().strip()
        
        # 1. Validation 1: Letters only
        if not word_upper.isalpha():
             return False, "Ordet får bara innehålla bokstäver."
             
        # 2. Validation 2: Word length
        if len(word_upper) < 2:
            return False, "Ordet är för kort."
            
        # 3. Validation 3: Dictionary & AI Fallback
        is_valid = False
        
        global _valid_words_list, _valid_words_set # Ensure we modify the global set
        if word_upper in _valid_words_set:
            is_valid = True
        else:
            # Word not in SAOL local text file! Let's ask Gemini.
            logger.info("Word '%s' not in local list. Asking AI...", word_upper)
            self.dynamic_ai_status = f"Validerar '{word_upper}' med AI..."
            
            # Since choose_word is now async, we can await the AI validation
            is_valid = await validate_word_with_ai(word_upper)
            
            # Clear UI status message
            self.dynamic_ai_status = None
            
            if is_valid:
                logger.info("AI verified '%s'! Adding to dictionary.", word_upper)
                # Add to instance memory
                _valid_words_set.add(word_upper)
                _valid_words_list.append(word_upper) # Also add to list for random choice
                
                # Append to persistent DB
                try:
                    supabase.table('app_words').insert({'word': word_upper}).execute()
                except Exception as e:
                    logger.error("Failed to save new AI word to DB: %s", e)
                    
        if not is_valid:
            if is_valid == "RATE_LIMITED":
                # GRACE FALLBACK: If AI is rate limited, we allow the word but log it.
                # This prevents the game from being stuck if the API quota is hit.
                logger.warning("AI Rate Limited. Allowing word '%s' by fallback grace.", word_upper)
                is_valid = True
            else:
                return False, f"Ordet '{word_upper}' finns inte i ordlistan eller godkändes inte av AI."

        self.word = word_upper
        self.guessed = []
        self.wrong_guesses = 0
        self.status = 'playing'
        self.winner_id = None
        self.message = f"{self.players[uuid]['name']} har valt ett ord!"
        return True, "Ord valt!"

    def get_state_for_frontend(self):
        display_word = self.word
        if self.status == 'playing':
            display_word = "".join([c if c in self.guessed or c == ' ' else '_' for c in self.word])
        elif self.status == 'choosing':
            display_word = "VÄLJER..."

        player_list = []
        for uuid, p in self.players.items():
            player_list.append({
                'sessionId': p['id'],
                'name': p['name'],
                'score': p['score'],
                'isOnline': p.get('online', False),
                'lastSeen': datetime.fromtimestamp(p.get('last_seen', 0)).isoformat()
            })

        sanitized_history: List[Dict[str, Any]] = []
        for h in self.history:
            if isinstance(h, str):
                sanitized_history.append({'word': h, 'winner': None, 'chooser': None, 'total_guesses': 0})
            else:
                sanitized_history.append(cast(Dict[str, Any], h))

        return {
            'gameId': self.game_id,
            'word': display_word,
            'guessedLetters': self.guessed,
            'wrongGuesses': self.wrong_guesses,
            'status': self.status,
            'players': player_list,
            'wordChooser': self.chooser_id,
            'history': sanitized_history,
            'guessLog': self.guess_log,
            'winnerId': self.winner_id,
            'message': self.message,
            'dynamic_ai_status': self.dynamic_ai_status # Added dynamic_ai_status
        }


class GameLobby:
    """Manages multiple game rooms."""

    def __init__(self):
        self.games: Dict[str, GameManager] = {}
        self.user_games: Dict[str, Set[str]] = {}

    def register_player_game(self, user_id: str, game_id: str):
        if user_id not in self.user_games:
            self.user_games[user_id] = set()
        self.user_games[user_id].add(game_id)

    def get_game(self, game_id: str) -> GameManager:
        if game_id not in self.games:
            # Try to load from DB first
            game = GameManager.load_from_db(game_id)                
            if not game:
                game = GameManager(game_id)
            else:
                # Register loaded players in the reverse mapping
                for player_id in game.players.keys():
                    self.register_player_game(player_id, game_id)
            self.games[game_id] = game
        return self.games[game_id]

    def cleanup_inactive_games(self, max_idle_days: int = 30) -> int:
        """Removes games that have been inactive for more than max_idle_days."""
        now = time.time()
        max_idle_seconds = max_idle_days * 24 * 60 * 60
        
        to_remove = []
        for game_id, game in list(self.games.items()):
            if now - game.last_activity > max_idle_seconds:
                to_remove.append(game_id)
                
        for game_id in to_remove:
            logger.info("Removing inactive game from memory: %s", game_id)
            if game_id in self.games:
                # Remove from reverse mapping
                for player_id in self.games[game_id].players.keys():
                    if player_id in self.user_games:
                        self.user_games[player_id].discard(game_id)
                        if not self.user_games[player_id]:
                            del self.user_games[player_id]
                del self.games[game_id]
            # Since DB is persistent, we can leave it in the DB indefinitely,
            # or add logic to delete very old games from Supabase.
            try:
                # Option: Delete from DB after 30 days to save space
                supabase.table('app_games').delete().lt('last_activity', datetime.fromtimestamp(now - max_idle_seconds).isoformat()).execute()
            except Exception as e:
                logger.error("Failed to prune old games from DB: %s", e)
                
        return len(to_remove)

    def get_games_metadata(self, game_ids: List[str]) -> List[Dict[str, Any]]:
        """Returns metadata (id, last_activity) for a list of game IDs."""
        if not game_ids:
            return []
            
        result_map = {}
        missing_ids = []
        
        # 1. Get from memory
        for g_id in game_ids:
            if g_id in self.games:
                result_map[g_id] = {
                    "id": g_id,
                    "last_activity": self.games[g_id].last_activity
                }
            else:
                missing_ids.append(g_id)
                
        # 2. Get from DB for missing ones
        if missing_ids:
            try:
                db_res = supabase.table('app_games').select('id', 'last_activity').in_('id', missing_ids).execute()
                for item in db_res.data:
                    # Convert ISO string to timestamp if needed
                    last_act = item['last_activity']
                    if isinstance(last_act, str):
                        try:
                            last_act = datetime.fromisoformat(last_act.replace('Z', '+00:00')).timestamp()
                        except:
                            last_act = time.time()
                    
                    result_map[item['id']] = {
                        "id": item['id'],
                        "last_activity": last_act
                    }
            except Exception as e:
                logger.error("Failed to fetch games metadata from DB: %s", e)
                
        # 3. Handle remaining unknown IDs (fallback)
        now = time.time()
        final_result = []
        for g_id in game_ids:
            if g_id in result_map:
                final_result.append(result_map[g_id])
            else:
                final_result.append({
                    "id": g_id,
                    "last_activity": now
                })
                
        return final_result

    def count_games_for_user(self, user_id: str) -> int:
        """Count how many active games in the lobby have the given user as a player."""
        return len(self.user_games.get(user_id, set()))


# Maximum number of active games an authenticated user can be the creator of
MAX_GAMES_PER_USER = 10

# Global lobby instance
game_lobby = GameLobby()

