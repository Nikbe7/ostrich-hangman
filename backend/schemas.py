from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class JoinEvent(BaseModel):
    uuid: str
    name: str

class GuessEvent(BaseModel):
    uuid: str
    letter: str

class ChooseWordEvent(BaseModel):
    uuid: str
    word: str

class ResetEvent(BaseModel):
    uuid: str

class AuthRequest(BaseModel):
    username: str
    password: str

# Response Models (mostly for documentation/structure, though we usually emit dicts)
class PlayerState(BaseModel):
    id: str
    name: str
    score: int
    online: bool
    is_chooser: bool

class GameStateModel(BaseModel):
    word: str # Masked or full depending on state
    word_length: int
    guessed: List[str]
    wrong_guesses: int
    max_wrong: int
    players: Dict[str, PlayerState]
    chooser_id: Optional[str]
    history: List[str]
    status: str
    winner_id: Optional[str]
    message: str
