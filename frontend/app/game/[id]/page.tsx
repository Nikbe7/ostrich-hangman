'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { getSessionId, getPlayerName, setPlayerName } from '@/utils/session';
import PlayerList from '@/components/PlayerList';
import WordDisplay from '@/components/WordDisplay';
import Keyboard from '@/components/Keyboard';
import Hangman from '@/components/Hangman';

// Types (should remain consistent with backend)
interface Player {
    sessionId: string;
    name: string;
    isOnline: boolean;
    lastSeen: string;
    score: number;
}

interface Game {
    gameId: string;
    word: string;
    guessedLetters: string[];
    wrongGuesses: number;
    status: 'waiting' | 'playing' | 'finished';
    players: Player[];
    wordChooser: string; // sessionId
    history: any[];
}

export default function GamePage() {
    const params = useParams();
    const router = useRouter();
    const gameId = typeof params.id === 'string' ? params.id.toUpperCase() : '';
    const { socket, isConnected } = useSocket();

    const [sessionId, setSessionId] = useState('');
    const [name, setName] = useState('');
    const [game, setGame] = useState<Game | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notification, setNotification] = useState('');
    const [wordInput, setWordInput] = useState('');

    // Initial Setup
    useEffect(() => {
        const id = getSessionId();
        setSessionId(id);
        const savedName = getPlayerName();

        if (!savedName) {
            // Prompt for name if missing (simple prompt for now, could be modal)
            const inputName = prompt('Ange ditt namn för att gå med:');
            if (inputName) {
                setPlayerName(inputName);
                setName(inputName);
            } else {
                router.push('/'); // Redirect to home if no name
                return;
            }
        } else {
            setName(savedName);
        }
    }, [router]);

    // Socket Events
    useEffect(() => {
        if (!socket || !isConnected || !gameId || !sessionId || !name) return;

        // Join Game
        socket.emit('join_game', { gameId, sessionId, playerName: name });

        // Listeners
        socket.on('update_game', (updatedGame: Game) => {
            setGame(updatedGame);
            setLoading(false);
            setError('');
        });

        socket.on('error', (msg: string) => {
            setError(msg);
            setTimeout(() => setError(''), 5000);
        });

        socket.on('notification', (msg: string) => {
            setNotification(msg);
            setTimeout(() => setNotification(''), 3000);
        });

        return () => {
            socket.off('update_game');
            socket.off('error');
            socket.off('notification');
        };
    }, [socket, isConnected, gameId, sessionId, name]);

    // Actions
    const handleSubmitWord = (e: React.FormEvent) => {
        e.preventDefault();
        if (!wordInput) return;
        socket?.emit('submit_word', { gameId, word: wordInput, sessionId });
        setWordInput('');
    };

    const handleGuess = (letter: string) => {
        if (game?.status !== 'playing') return;
        socket?.emit('guess_letter', { gameId, letter, sessionId });
    };

    const handleReset = () => {
        if (confirm('Är du säker på att du vill återställa spelet för alla?')) {
            socket?.emit('reset_game', { gameId, sessionId });
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center text-white bg-slate-900">Laddar spel...</div>;
    if (!game) return <div className="text-white bg-slate-900 h-screen p-8">Kunde inte hitta spelet.</div>;

    const isMyTurnToChoose = game.wordChooser === sessionId && game.status === 'waiting';
    const myPlayer = game.players.find(p => p.sessionId === sessionId);
    const chooserName = game.players.find(p => p.sessionId === game.wordChooser)?.name || 'Någon';
    const winnerName = game.status === 'finished' && game.history.length > 0
        ? game.players.find(p => p.sessionId === game.history[game.history.length - 1].winner)?.name
        : null;

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col md:flex-row">
            {/* Sidebar - Player List */}
            <aside className="w-full md:w-64 bg-slate-800 p-4 border-r border-slate-700">
                <div className="mb-6">
                    <h1 className="text-xl font-bold">Rum: {gameId}</h1>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(gameId);
                            setNotification('Spel-ID kopierat!');
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 underline mt-1"
                    >
                        Kopiera Spel-ID
                    </button>
                </div>
                <PlayerList players={game.players} currentPlayerId={sessionId} />

                <div className="mt-8 border-t border-slate-700 pt-4">
                    <button onClick={handleReset} className="w-full text-red-400 text-xs border border-red-900 hover:bg-red-900/30 p-2 rounded">
                        Återställ Spel (Varning)
                    </button>
                </div>
            </aside>

            {/* Main Game Area */}
            <main className="flex-1 p-4 md:p-8 flex flex-col items-center max-w-4xl mx-auto w-full">
                {/* Notifications & Errors */}
                {error && <div className="bg-red-500/90 text-white p-3 rounded mb-4 absolute top-4 right-4 animate-bounce z-50">{error}</div>}
                {notification && <div className="bg-blue-500/90 text-white p-3 rounded mb-4 absolute top-4 right-4 z-50">{notification}</div>}

                {/* Game Status Header */}
                <div className="mb-8 text-center h-16">
                    {game.status === 'waiting' && (
                        <div>
                            {isMyTurnToChoose ? (
                                <div className="bg-green-600/20 p-4 rounded border border-green-500 text-green-300 animate-pulse">
                                    <h2 className="text-xl font-bold">Det är din tur att välja ord!</h2>
                                </div>
                            ) : (
                                <div className="text-gray-400">
                                    <h2 className="text-xl">Väntar på att <span className="text-white font-bold">{chooserName}</span> ska välja ett ord...</h2>
                                </div>
                            )}
                        </div>
                    )}
                    {game.status === 'playing' && (
                        <h2 className="text-xl">Gissa ordet som <span className="font-bold">{chooserName}</span> valde!</h2>
                    )}
                    {game.status === 'finished' && (
                        <div className="bg-yellow-600/20 p-4 rounded border border-yellow-500 text-yellow-300">
                            <h2 className="text-2xl font-bold">
                                {winnerName ? `${winnerName} Vann!` : 'Spelet är slut!'}
                            </h2>
                            <p>Klicka på Återställ eller vänta på att {winnerName} väljer nytt ord.</p>
                        </div>
                    )}
                </div>

                {/* Action Area: Choose Word */}
                {isMyTurnToChoose && (
                    <div className="w-full max-w-md bg-slate-800 p-6 rounded-xl shadow-xl border border-slate-600">
                        <form onSubmit={handleSubmitWord} className="flex flex-col gap-4">
                            <label className="text-sm font-medium text-gray-300">Skriv ett svenskt ord för de andra att gissa:</label>
                            <input
                                type="password" // Hides word from shoulder surfers 
                                value={wordInput}
                                onChange={(e) => setWordInput(e.target.value)}
                                className="p-3 rounded bg-black/50 border border-gray-600 text-white focus:border-blue-500 outline-none"
                                placeholder="Hemligt ord..."
                                autoFocus
                            />
                            <button type="submit" className="bg-blue-600 hover:bg-blue-500 py-3 rounded font-bold transition-colors">
                                Välj Ord
                            </button>
                        </form>
                    </div>
                )}

                {/* Gameplay Area */}
                {(game.status === 'playing' || game.status === 'finished') && (
                    <div className="w-full flex flex-col items-center animate-in fade-in duration-500">
                        <Hangman wrongGuesses={game.wrongGuesses} />
                        <WordDisplay word={game.word} guessedLetters={game.guessedLetters} status={game.status} />

                        <div className="mt-8 w-full">
                            <Keyboard
                                guessedLetters={game.guessedLetters}
                                onGuess={handleGuess}
                                disabled={game.status !== 'playing'}
                            />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
