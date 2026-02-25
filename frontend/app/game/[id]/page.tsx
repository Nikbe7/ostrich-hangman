'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { getSessionId, getPlayerName, setPlayerName, setLastGameId, clearLastGameId, addGameToHistory } from '@/utils/session';
import PlayerList from '@/components/PlayerList';
import GuessedLetters from '@/components/GuessedLetters';
import WordDisplay from '@/components/WordDisplay';
import Keyboard from '@/components/Keyboard';
import Hangman from '@/components/Hangman';


import GameHistory from '@/components/GameHistory';

// Types (should remain consistent with backend)
interface Player {
    sessionId: string;
    name: string;
    isOnline: boolean;
    lastSeen: string;
    score: number;
}

interface HistoryEntry {
    word: string;
    winner: string | null;
    chooser: string | null;
    total_guesses?: number;
}

interface Game {
    gameId: string;
    word: string;
    guessedLetters: string[];
    wrongGuesses: number;
    status: 'waiting' | 'choosing' | 'playing' | 'finished';
    players: Player[];
    wordChooser: string; // sessionId
    history: HistoryEntry[];
    guessLog: { name: string; letter: string; correct: boolean }[];
    winnerId: string | null;
    message: string;
    dynamic_ai_status?: string | null;
}

export default function GamePage() {
    const params = useParams();
    const router = useRouter();
    const gameId = typeof params.id === 'string' ? params.id.toUpperCase() : '';
    const { socket, isConnected } = useSocket();

    const [sessionId, setSessionId] = useState('');
    const [name, setName] = useState('');
    const [game, setGame] = useState<Game | null>(null);
    const [error, setError] = useState('');
    const [notification, setNotification] = useState('');
    const [wordInput, setWordInput] = useState('');
    const [showConfetti, setShowConfetti] = useState(false);

    // Initial Setup
    useEffect(() => {
        const id = getSessionId();
        setSessionId(id);
        const savedName = getPlayerName();

        if (!savedName) {
            const inputName = prompt('Ange ditt namn för att gå med:');
            if (inputName) {
                setPlayerName(inputName);
                setName(inputName);
            } else {
                router.push('/');
                return;
            }
        } else {
            setName(savedName);
        }

        // Save gameId for auto-rejoin and history
        if (gameId) {
            setLastGameId(gameId);
            addGameToHistory(gameId);
        }
    }, [router, gameId]);

    // Socket Listeners - register once when socket is available
    useEffect(() => {
        if (!socket) return;

        const handleUpdate = (updatedGame: Game) => {
            setGame(prev => {
                // Detect win for confetti
                if (updatedGame.status === 'finished' && prev?.status === 'playing') {
                    const latestHistory = updatedGame.history?.[0];
                    if (latestHistory?.winner) {
                        setShowConfetti(true);
                        setTimeout(() => setShowConfetti(false), 4000);
                    }
                }
                return updatedGame;
            });
            setError('');
        };

        const handleError = (msg: string) => {
            setError(msg);
            setTimeout(() => setError(''), 5000);
        };

        const handleNotification = (msg: string) => {
            setNotification(msg);
            setTimeout(() => setNotification(''), 3000);
        };

        socket.on('update_game', handleUpdate);
        socket.on('error', handleError);
        socket.on('notification', handleNotification);

        return () => {
            socket.off('update_game', handleUpdate);
            socket.off('error', handleError);
            socket.off('notification', handleNotification);
        };
    }, [socket]);

    // Join Game - emit when all state is ready
    useEffect(() => {
        if (!socket || !isConnected || !gameId || !sessionId || !name) {
            console.log('[JOIN] Waiting for state:', { socket: !!socket, isConnected, gameId, sessionId, name });
            return;
        }
        console.log('[JOIN] Emitting join_game', { gameId, sessionId, playerName: name });
        socket.emit('join_game', { gameId, sessionId, playerName: name }, (response: any) => {
            console.log('[JOIN] Response from server:', response);
            if (response?.status === 'error') {
                setError(`Join failed: ${response.message}`);
            }
        });
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

    const handleNewGame = () => {
        socket?.emit('reset_game', { gameId, sessionId });
    };

    const handleLeaveGame = () => {
        clearLastGameId();
        router.push('/');
    };


    const isMyTurnToChoose = game?.wordChooser === sessionId && game?.status === 'choosing';
    const chooserName = game?.players.find(p => p.sessionId === game.wordChooser)?.name || 'Någon';
    const latestWinner = game?.status === 'finished' && game.history.length > 0
        ? game.players.find(p => p.sessionId === game.history[0]?.winner)?.name
        : null;

    const isChooser = game?.players.find(p => p.sessionId === sessionId)?.sessionId === game?.wordChooser;

    return (
        <div className="min-h-screen bg-transparent text-white flex flex-col md:flex-row relative">
            {/* Confetti overlay */}
            {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
                    {Array.from({ length: 60 }).map((_, i) => (
                        <div
                            key={i}
                            className="confetti-piece"
                            style={{
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 2}s`,
                                backgroundColor: ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#00bcd4', '#4caf50', '#ffeb3b', '#ff9800'][i % 10],
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Sidebar */}
            <aside className="w-full md:w-72 bg-brand-card/50 backdrop-blur-md p-4 border-r border-white/5 flex flex-col gap-4 z-10">
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold flex-1">Rum: {gameId}</h1>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(gameId);
                            setNotification('Spel-ID kopierat!');
                            setTimeout(() => setNotification(''), 2000);
                        }}
                        className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
                        title="Kopiera Spel-ID"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                    </button>
                </div>

                {game && (
                    <>
                        <PlayerList players={game.players} currentPlayerId={sessionId} wordChooser={game.wordChooser} />
                        {game.history && game.history.length > 0 && (
                            <GameHistory history={game.history} players={game.players} />
                        )}
                    </>
                )}

                <div className="mt-auto border-t border-white/5 pt-4 space-y-2">
                    <button
                        onClick={handleLeaveGame}
                        className="w-full flex items-center justify-center gap-2 text-gray-300 text-sm border border-white/10 hover:bg-white/5 p-2.5 rounded transition-colors"
                    >
                        ← Tillbaka till startsidan
                    </button>
                </div>
            </aside>

            {/* Main Game Area */}
            <main className="flex-1 p-2 md:p-4 flex flex-col items-center max-w-4xl mx-auto w-full">
                {/* Notifications & Errors */}
                {error && (
                    <div className="bg-red-500/90 text-white p-3 rounded mb-4 fixed top-4 right-4 animate-bounce z-50 shadow-lg">
                        {error}
                    </div>
                )}
                {notification && (
                    <div className="bg-blue-500/90 text-white p-3 rounded mb-4 fixed top-4 right-4 z-50 shadow-lg">
                        {notification}
                    </div>
                )}

                {game?.dynamic_ai_status && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                        <div className="bg-brand-card border border-brand-primary/50 rounded-2xl p-8 flex flex-col items-center shadow-2xl max-w-sm w-full mx-4">
                            <div className="w-12 h-12 border-4 border-white/10 border-t-brand-primary rounded-full animate-spin mb-6" />
                            <h3 className="text-xl font-bold bg-gradient-to-r from-brand-primary to-brand-primaryHover bg-clip-text text-transparent text-center mb-2">
                                AI Validering
                            </h3>
                            <p className="text-gray-300 text-center animate-pulse">
                                {game.dynamic_ai_status}
                            </p>
                        </div>
                    </div>
                )}

                {!game ? (
                    /* Connecting state - shown while waiting for socket */
                    <div className="flex flex-col items-center justify-center flex-1 gap-4 text-gray-400">
                        <div className="w-8 h-8 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
                        <p>{isConnected ? 'Ansluter till spelet...' : 'Ansluter till servern...'}</p>
                    </div>
                ) : (
                    <>
                        {/* Game Status Header */}
                        <div className="mb-4 text-center min-h-[64px] flex items-center justify-center">
                            {game.status === 'waiting' && (
                                <div className="text-gray-400">
                                    <h2 className="text-xl">Väntar på att spelet ska börja...</h2>
                                    <button
                                        onClick={handleNewGame}
                                        className="mt-4 bg-brand-primary hover:bg-brand-primaryHover text-white font-bold py-3 px-8 rounded-lg transition-all transform active:scale-95 shadow-lg shadow-brand-primary/30"
                                    >
                                        Starta Spelet
                                    </button>
                                </div>
                            )}
                            {game.status === 'choosing' && (
                                <div>
                                    {isMyTurnToChoose ? (
                                        <div className="bg-brand-primary/20 p-4 rounded-lg border border-brand-primary text-brand-primary animate-pulse">
                                            <h2 className="text-xl font-bold">Det är din tur att välja ord! 👑</h2>
                                        </div>
                                    ) : (
                                        <div className="text-gray-400">
                                            <h2 className="text-xl">Väntar på att <span className="text-white font-bold">{chooserName}</span> ska välja ett ord...</h2>
                                        </div>
                                    )}
                                </div>
                            )}
                            {game.status === 'playing' && (
                                <h2 className="text-xl">
                                    {isChooser
                                        ? "De andra spelarna gissar ordet!"
                                        : <>Gissa ordet som <span className="font-bold text-yellow-300">{chooserName}</span> valde!</>
                                    }
                                </h2>
                            )}
                            {game.status === 'finished' && (
                                <div className="w-full">
                                    {game.winnerId ? (
                                        <div className={`p-5 rounded-lg border space-y-3 ${game.winnerId === sessionId ? 'bg-brand-primary/20 border-brand-primary text-brand-primary' : 'bg-yellow-600/20 border-yellow-500 text-yellow-300'}`}>
                                            <h2 className="text-2xl font-bold">
                                                {game.winnerId === sessionId ? '🏆 Du Vann!' : `🏆 ${game.players.find(p => p.sessionId === game.winnerId)?.name || 'Någon'} Vann!`}
                                            </h2>
                                            <p className="text-sm text-gray-300">Ordet var: <span className="font-bold text-white">{game.word}</span></p>
                                            <button
                                                onClick={handleNewGame}
                                                className="bg-brand-primary hover:bg-brand-primaryHover text-white font-bold py-3 px-8 rounded-lg transition-all transform active:scale-95 shadow-lg shadow-brand-primary/30"
                                            >
                                                🔄 Nytt Spel
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="bg-brand-danger/20 p-5 rounded-lg border border-brand-danger text-red-300 space-y-3">
                                            <h2 className="text-2xl font-bold">💀 Spelet är slut!</h2>
                                            <p className="text-sm text-gray-300">Ordet var: <span className="font-bold text-white">{game.word}</span></p>
                                            <button
                                                onClick={handleNewGame}
                                                className="bg-brand-primary hover:bg-brand-primaryHover text-white font-bold py-3 px-8 rounded-lg transition-all transform active:scale-95 shadow-lg shadow-brand-primary/30"
                                            >
                                                🔄 Nytt Spel
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Action Area: Choose Word */}
                        {isMyTurnToChoose && (
                            <div className="w-full max-w-md bg-brand-card/80 backdrop-blur-md p-6 rounded-xl shadow-xl border border-brand-primary/30 animate-fadeIn">
                                <form onSubmit={handleSubmitWord} className="flex flex-col gap-4">
                                    <label className="text-sm font-medium text-gray-300">Skriv ett svenskt ord för de andra att gissa:</label>
                                    <input
                                        type="text"
                                        value={wordInput}
                                        onChange={(e) => setWordInput(e.target.value)}
                                        className="p-3 rounded bg-black/50 border border-white/10 text-white focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-colors"
                                        placeholder="Hemligt ord..."
                                        autoFocus
                                    />
                                    <button type="submit" className="bg-brand-primary hover:bg-brand-primaryHover py-3 rounded font-bold transition-colors shadow-lg">
                                        ✅ Välj Ord
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Gameplay Area */}
                        {(game.status === 'playing' || game.status === 'finished') && (
                            <div className="w-full flex flex-col items-center animate-fadeIn">
                                <Hangman
                                    wrongGuesses={game.wrongGuesses}
                                    status={game.status}
                                    isWin={game.status === 'finished' && game.winnerId !== null}
                                />
                                <WordDisplay word={game.word} guessedLetters={game.guessedLetters} status={game.status} />

                                {/* GuessedLetters moved to right sidebar */}

                                <div className="mt-4 w-full">
                                    {!isChooser && (
                                        <Keyboard
                                            guessedLetters={game.guessedLetters}
                                            onGuess={handleGuess}
                                            disabled={game.status !== 'playing'}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Right Sidebar - Guessed Letters */}
            <aside className="w-full md:w-64 bg-brand-card/50 backdrop-blur-md p-4 border-l border-white/5 flex flex-col gap-4 overflow-y-auto z-10">
                {game && (
                    <GuessedLetters guessedLetters={game.guessedLetters} word={game.word} guessLog={game.guessLog} />
                )}
            </aside>
        </div>
    );
}
