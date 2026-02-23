'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
    getLastGameId, clearLastGameId,
    getGameHistory, removeGameFromHistory
} from '@/utils/session';
import { getToken, getUser, User, logout, fetchUserGames, removeUserGame } from '@/utils/auth';
import AuthForm from '@/components/AuthForm';

export default function Home() {
    const router = useRouter();
    const [user, setUserState] = useState<User | null>(null);
    const [gameIdInput, setGameIdInput] = useState('');
    const [gameHistory, setGameHistory] = useState<string[]>([]);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const loadInitialData = async () => {
            // Check for token and user
            const token = getToken();
            const storedUser = getUser();

            if (token && storedUser) {
                setUserState(storedUser);
                // Fetch games from backend for authenticated users
                const games = await fetchUserGames(token);
                setGameHistory(games);
            } else {
                // Fallback to local storage for anonymous users
                setGameHistory(getGameHistory());
            }

            // Auto-redirect to active game
            const lastGameId = getLastGameId();
            if (lastGameId) {
                router.push(`/game/${lastGameId}`);
                return;
            }

            setReady(true);
        };

        loadInitialData();
    }, [router]);

    const handleLoginSuccess = async () => {
        const storedUser = getUser();
        const token = getToken();
        if (storedUser && token) {
            setUserState(storedUser);
            const games = await fetchUserGames(token);
            setGameHistory(games);
        }
    };

    const handleLogout = () => {
        logout();
        setUserState(null);
    };

    const handleCreateGame = () => {
        if (!user) return;
        const newGameId = Math.random().toString(36).substring(2, 8).toUpperCase();
        router.push(`/game/${newGameId}`);
    };

    const handleJoinGame = () => {
        if (!user) return;
        if (!gameIdInput) return alert('Vänligen ange ett Spel-ID');
        router.push(`/game/${gameIdInput.toUpperCase()}`);
    };

    const handleRejoinGame = (gameId: string) => {
        if (!user) return;
        router.push(`/game/${gameId}`);
    };

    const handleRemoveGame = async (gameId: string) => {
        const token = getToken();
        if (user && token) {
            // Remove from backend
            const success = await removeUserGame(token, gameId);
            if (success) {
                setGameHistory(prev => prev.filter(id => id !== gameId));
            } else {
                alert("Kunde inte ta bort spelet från servern.");
            }
        } else {
            // Remove from local storage (anonymous)
            removeGameFromHistory(gameId);
            setGameHistory(prev => prev.filter(id => id !== gameId));
        }
    };

    if (!ready) {
        return <div className="flex h-screen items-center justify-center text-white bg-slate-900">Laddar...</div>;
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h1 className="text-5xl font-bold mb-2">Struts Hänga 🦢</h1>
                    <p className="text-gray-400">Det bästa hänga gubbe spelet på svenska</p>
                </div>

                {!user ? (
                    <div className="flex justify-center">
                        <AuthForm onLogin={handleLoginSuccess} />
                    </div>
                ) : (
                    <div className="bg-white/10 p-8 rounded-xl backdrop-blur-lg shadow-2xl space-y-6">
                        <div className="flex justify-between items-center pb-4 border-b border-gray-700">
                            <div>
                                <p className="text-sm text-gray-400">Inloggad som</p>
                                <p className="text-xl font-bold text-blue-300">{user.username}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="text-sm text-red-400 hover:text-red-300 underline"
                            >
                                Logga ut
                            </button>
                        </div>

                        <div>
                            <button
                                onClick={handleCreateGame}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded transition-all transform active:scale-95 mb-4 shadow-lg shadow-blue-500/30"
                            >
                                Starta Nytt Spel
                            </button>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={gameIdInput}
                                    onChange={(e) => setGameIdInput(e.target.value)}
                                    className="flex-1 p-3 rounded bg-black/30 border border-gray-600 focus:border-green-500 outline-none uppercase"
                                    placeholder="SPEL-ID"
                                />
                                <button
                                    onClick={handleJoinGame}
                                    className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded transition-all transform active:scale-95 shadow-lg shadow-green-500/30"
                                >
                                    Gå Med
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Game History */}
                {user && gameHistory.length > 0 && (
                    <div className="bg-white/10 p-6 rounded-xl backdrop-blur-lg shadow-2xl">
                        <h2 className="text-lg font-bold mb-3">📜 Dina Spel</h2>
                        <ul className="space-y-2">
                            {gameHistory.map((gId) => (
                                <li key={gId} className="flex items-center justify-between bg-black/20 p-3 rounded">
                                    <span className="font-mono text-blue-300">{gId}</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleRejoinGame(gId)}
                                            className="text-sm bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded transition-colors"
                                        >
                                            Gå in
                                        </button>
                                        <button
                                            onClick={() => handleRemoveGame(gId)}
                                            className="text-sm bg-red-600/50 hover:bg-red-500 text-white px-3 py-1.5 rounded transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </main>
    );
}
