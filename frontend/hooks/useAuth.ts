'use client';

import { useState, useEffect, useCallback } from 'react';
import { getToken, getUser, logout as apiLogout, fetchUserGames, removeUserGame } from '@/utils/auth';
import { getGameHistory, removeGameFromHistory as removeLocalGame } from '@/utils/session';
import { User, GameMetadata } from '@/types/game';

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [gameHistory, setGameHistory] = useState<GameMetadata[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
            setIsLoading(false);
        };

        loadInitialData();
    }, []);

    const login = (userData: User, games: GameMetadata[]) => {
        setUser(userData);
        setGameHistory(games);
    };

    const logout = () => {
        apiLogout();
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
        isLoading,
        login,
        logout,
        removeGame,
        setGameHistory
    };
}
