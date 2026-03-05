/**
 * Shared Type Definitions for Ostrich Hangman
 * These should align with backend/schemas.py and backend/services/game_service.py
 */

export interface Player {
    sessionId: string;
    name: string;
    isOnline: boolean;
    lastSeen: string;
    score: number;
}

export interface HistoryEntry {
    word: string;
    winner: string | null;
    chooser: string | null;
    total_guesses?: number;
    guessedLetters?: string[];
    wrongGuesses?: number;
    guessLog?: GuessLogEntry[];
}

export interface GuessLogEntry {
    name: string;
    letter: string;
    correct: boolean;
}

export interface Game {
    gameId: string;
    word: string;
    guessedLetters: string[];
    wrongGuesses: number;
    status: 'waiting' | 'choosing' | 'playing' | 'finished';
    players: Player[];
    wordChooser: string; // sessionId
    history: HistoryEntry[];
    guessLog: GuessLogEntry[];
    winnerId: string | null;
    message: string;
    dynamic_ai_status?: string | null;
}

export interface User {
    id: string;
    username: string;
    created_at?: string;
}

export interface GameMetadata {
    id: string;
    last_activity: number;
}

export interface AuthResponse {
    success: boolean;
    user?: User;
    token?: string;
    session?: {
        access_token: string;
        refresh_token: string;
    };
    error?: string;
}

export interface UserGamesResponse {
    success: boolean;
    games: GameMetadata[];
}
