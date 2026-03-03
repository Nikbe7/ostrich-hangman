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
            const localGameIds = getGameHistory();

            if (token && storedUser) {
                setUser(storedUser);
                const serverGames = await fetchUserGames(token);

                // Merge server games with local history for robustness (especially after DB resets)
                const merged = [...serverGames];
                localGameIds.forEach(id => {
                    if (!merged.find(g => g.id === id)) {
                        merged.push({ id, last_activity: Date.now() / 1000 });
                    }
                });
                setGameHistory(merged);
            } else {
                setGameHistory(localGameIds.map(id => ({ id, last_activity: Date.now() / 1000 })));
            }
            setIsLoading(false);
        };

        loadInitialData();
    }, []);

    const login = (userData: User, serverGames: GameMetadata[]) => {
        setUser(userData);
        const localGameIds = getGameHistory();

        const merged = [...serverGames];
        localGameIds.forEach(id => {
            if (!merged.find(g => g.id === id)) {
                merged.push({ id, last_activity: Date.now() / 1000 });
            }
        });
        setGameHistory(merged);
    };

    const logout = () => {
        apiLogout();
        setUser(null);
        // Clear history on logout to show fresh local history on next load
        const localGames = getGameHistory();
        setGameHistory(localGames.map(id => ({ id, last_activity: Date.now() / 1000 })));
    };

    const removeGame = async (gameId: string) => {
        const token = getToken();

        // Always remove locally first for instant UI response
        removeLocalGame(gameId);
        setGameHistory(prev => prev.filter(g => g.id !== gameId));

        if (user && token) {
            // Also remove from server if logged in
            await removeUserGame(token, gameId);
        }
        return true;
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
