'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getSessionId, setPlayerName, getPlayerName } from '../utils/session';

export default function Home() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [gameIdInput, setGameIdInput] = useState('');

    useEffect(() => {
        // Initialize session
        getSessionId();
        setName(getPlayerName());
    }, []);

    const handleCreateGame = () => {
        if (!name) return alert('Vänligen ange ditt namn först');
        setPlayerName(name);
        const newGameId = Math.random().toString(36).substring(2, 8).toUpperCase();
        router.push(`/game/${newGameId}`);
    };

    const handleJoinGame = () => {
        if (!name) return alert('Vänligen ange ditt namn först');
        if (!gameIdInput) return alert('Vänligen ange ett Spel-ID');
        setPlayerName(name);
        router.push(`/game/${gameIdInput.toUpperCase()}`);
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h1 className="text-5xl font-bold mb-2">Struts Hänga 🦢</h1>
                    <p className="text-gray-400">Det bästa hänga gubbe spelet på svenska</p>
                </div>

                <div className="bg-white/10 p-8 rounded-xl backdrop-blur-lg shadow-2xl space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">Ditt Namn</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-3 rounded bg-black/30 border border-gray-600 focus:border-blue-500 outline-none transition-colors"
                            placeholder="Skriv ditt namn..."
                        />
                    </div>

                    <div className="pt-4 border-t border-gray-700">
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
            </div>
        </main>
    );
}
