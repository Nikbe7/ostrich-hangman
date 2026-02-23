import { getUser } from './auth';

export const getSessionId = (): string => {
    if (typeof window === 'undefined') return '';

    // Prioritize authenticated user ID
    const user = getUser();
    if (user && user.id) {
        return user.id;
    }

    // Fallback to anonymous local session ID
    let id = localStorage.getItem('ostrich_session_id');
    if (!id) {
        id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('ostrich_session_id', id);
    }
    return id;
};

export const getPlayerName = (): string => {
    if (typeof window === 'undefined') return '';

    // Prioritize authenticated user name
    const user = getUser();
    if (user && user.username) {
        return user.username;
    }

    return localStorage.getItem('ostrich_player_name') || '';
};

export const setPlayerName = (name: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('ostrich_player_name', name);
};

// --- Active game (for auto-redirect) ---

export const getLastGameId = (): string => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('ostrich_last_game_id') || '';
};

export const setLastGameId = (gameId: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('ostrich_last_game_id', gameId);
};

export const clearLastGameId = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('ostrich_last_game_id');
};

// --- Game history (list of all games user has joined) ---

export const getGameHistory = (): string[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem('ostrich_game_history');
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

export const addGameToHistory = (gameId: string) => {
    if (typeof window === 'undefined') return;
    const history = getGameHistory();
    // Add to front, deduplicate
    const updated = [gameId, ...history.filter(id => id !== gameId)];
    localStorage.setItem('ostrich_game_history', JSON.stringify(updated));
};

export const removeGameFromHistory = (gameId: string) => {
    if (typeof window === 'undefined') return;
    const history = getGameHistory().filter(id => id !== gameId);
    localStorage.setItem('ostrich_game_history', JSON.stringify(history));
    // If removing the active game, clear it too
    if (getLastGameId() === gameId) {
        clearLastGameId();
    }
};
