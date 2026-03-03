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

def _load_words():
    global _valid_words_list, _valid_words_set
    if not os.path.exists(WORDS_FILE):
        _valid_words_list = ["OSTRICH", "HANGMAN", "SWEDEN"]
        _valid_words_set = set(_valid_words_list)
        return
    try:
        with open(WORDS_FILE, 'r', encoding='utf-8') as f:
            _valid_words_list = [line.strip().upper() for line in f if line.strip()]
            _valid_words_set = set(_valid_words_list)
        logger.info("Loaded %d words into memory.", len(_valid_words_list))
    except Exception as e:
        logger.error("Error loading words: %s", e)
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
                
                # Append to permanent file
                # Use the global WORDS_FILE constant
                try:
                    with open(WORDS_FILE, 'a', encoding='utf-8') as f:
                        f.write(word_upper + "\n")
                except Exception as e:
                    logger.error("Failed to save new AI word to file: %s", e)
                    
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

    def get_game(self, game_id: str) -> GameManager:
        if game_id not in self.games:
            self.games[game_id] = GameManager(game_id)
        return self.games[game_id]

    def cleanup_inactive_games(self, max_idle_days: int = 30) -> int:
        """Removes games that have been inactive for more than max_idle_days."""
        now = time.time()
        max_idle_seconds = max_idle_days * 24 * 60 * 60
        
        to_remove = []
        for game_id, game in self.games.items():
            if now - game.last_activity > max_idle_seconds:
                to_remove.append(game_id)
                
        for game_id in to_remove:
            logger.info("Removing inactive game: %s", game_id)
            del self.games[game_id]
            
        return len(to_remove)

    def get_games_metadata(self, game_ids: List[str]) -> List[Dict[str, Any]]:
        """Returns metadata (id, last_activity) for a list of game IDs."""
        result = []
        now = time.time()
        for g_id in game_ids:
            if g_id in self.games:
                result.append({
                    "id": g_id,
                    "last_activity": self.games[g_id].last_activity
                })
            else:
                # Still return the ID so it shows up in history, 
                # even if it's not currently 'active' in memory.
                result.append({
                    "id": g_id,
                    "last_activity": now # Fallback to now if unknown
                })
        return result

    def count_games_for_user(self, user_id: str) -> int:
        """Count how many active games in the lobby have the given user as a player."""
        count = 0
        for game in self.games.values():
            if user_id in game.players:
                count += 1
        return count


# Maximum number of active games an authenticated user can be the creator of
MAX_GAMES_PER_USER = 10

# Global lobby instance
game_lobby = GameLobby()

