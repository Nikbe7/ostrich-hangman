'use client';

import { useState, useEffect } from 'react';
import { User, GameItem, getToken, getUser, logout as authLogout, fetchUserGames, removeUserGame } from '@/utils/auth';
import { getGameHistory, removeGameFromHistory as removeLocalGame } from '@/utils/session';

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [gameHistory, setGameHistory] = useState<GameItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadInitialData = async () => {
            const token = getToken();
            const storedUser = getUser();

            if (token && storedUser) {
                setUser(storedUser);
                const games = await fetchUserGames(token);
                setGameHistory(games);
            } else {
                const localGames = getGameHistory();
                setGameHistory(localGames.map(id => ({ id, last_activity: Date.now() / 1000 })));
            }
            setLoading(false);
        };

        loadInitialData();
    }, []);

    const login = (userData: User, games: GameItem[]) => {
        setUser(userData);
        setGameHistory(games);
    };

    const logout = () => {
        authLogout();
        setUser(null);
        setGameHistory([]);
    };

    const removeGame = async (gameId: string) => {
        const token = getToken();
        if (user && token) {
            const success = await removeUserGame(token, gameId);
            if (success) {
                setGameHistory(prev => prev.filter(g => g.id !== gameId));
                return true;
            }
            return false;
        } else {
            removeLocalGame(gameId);
            setGameHistory(prev => prev.filter(g => g.id !== gameId));
            return true;
        }
    };

    return {
        user,
        gameHistory,
        loading,
        login,
        logout,
        removeGame,
        setGameHistory
    };
}
