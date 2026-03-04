import { User, AuthResponse, GameMetadata } from '@/types/game';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export const registerUser = async (username: string, password: string): Promise<AuthResponse> => {
    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        if (!response.ok) {
            return { success: false, error: data.detail || 'Något gick fel.' };
        }
        return data;
    } catch (error) {
        return { success: false, error: 'Kunde inte ansluta till servern.' };
    }
};

export const loginUser = async (username: string, password: string): Promise<AuthResponse> => {
    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        if (!response.ok) {
            return { success: false, error: data.detail || 'Något gick fel.' };
        }
        return data;
    } catch (error) {
        return { success: false, error: 'Kunde inte ansluta till servern.' };
    }
};

export const fetchUserGames = async (token: string): Promise<GameMetadata[]> => {
    try {
        const response = await fetch(`${API_URL}/api/user/games`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        if (data.success && data.games) {
            return data.games;
        }
        return [];
    } catch (error) {
        console.error('Error fetching user games:', error);
        return [];
    }
};

export const removeUserGame = async (token: string, gameId: string): Promise<boolean> => {
    try {
        const response = await fetch(`${API_URL}/api/user/games/${gameId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        return data.success === true;
    } catch (error) {
        console.error('Error removing user game:', error);
        return false;
    }
};

export const getToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('ostrich_auth_token');
};

export const setToken = (token: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('ostrich_auth_token', token);
};

export const removeToken = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('ostrich_auth_token');
};

export const getUser = (): User | null => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('ostrich_user');
    return userStr ? JSON.parse(userStr) : null;
}

export const setUser = (user: User) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('ostrich_user', JSON.stringify(user));
}

export const removeUser = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('ostrich_user');
}

export const logout = () => {
    removeToken();
    removeUser();
    if (typeof window !== 'undefined') {
        localStorage.removeItem('ostrich_game_history');
        localStorage.removeItem('ostrich_last_game_id');
        localStorage.removeItem('ostrich_player_name');
        localStorage.removeItem('ostrich_session_id'); // Completely reset
    }
    window.location.reload();
}
