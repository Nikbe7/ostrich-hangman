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
                const serverGames = await fetchUserGames(token);
                const localGameIds = getGameHistory();

                // One-time migration/merge: if local games exist that aren't on server, 
                // we include them in the state. Joining them will persist them to DB.
                const merged = [...serverGames];
                localGameIds.forEach(id => {
                    if (!merged.find(g => g.id === id)) {
                        merged.push({ id, last_activity: Date.now() / 1000 });
                    }
                });

                setGameHistory(merged);
            } else {
                setGameHistory([]);
            }
            setIsLoading(false);
        };

        loadInitialData();
    }, []);

    const login = (userData: User, serverGames: GameMetadata[]) => {
        setUser(userData);
        setGameHistory(serverGames);
    };

    const logout = () => {
        apiLogout();
        setUser(null);
        setGameHistory([]);
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
