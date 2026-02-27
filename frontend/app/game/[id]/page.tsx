'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '@/hooks/useSocket';
import { getSessionId, getPlayerName, setPlayerName, setLastGameId, clearLastGameId, addGameToHistory } from '@/utils/session';
import PlayerList from '@/components/PlayerList';
import GuessedLetters from '@/components/GuessedLetters';
import WordDisplay from '@/components/WordDisplay';
import Keyboard from '@/components/Keyboard';
import Hangman from '@/components/Hangman';
import GameHistory from '@/components/GameHistory';
import ActivityFeed from '@/components/ActivityFeed';

const FUN_FACTS = [
    "Strutsar kan springa snabbare än hästar och hanarna kan ryta som lejon.",
    "En struts öga är större än dess hjärna.",
    "Världens längsta parti Hänga Gubbe varade i 3 dagar (kanske).",
    "Strutsar har bara två tår på varje fot, till skillnad från de flesta andra fåglar.",
    "Ordet 'Hangman' har anor från 1800-talets viktorianska England.",
    "Strutsar gömmer inte huvudet i sanden – det är en myt!",
    "En struts spark kan vara tillräckligt kraftig för att döda ett lejon."
];

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
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);
    const [funFactIndex, setFunFactIndex] = useState(0);

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

    // Fun facts timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (game?.status === 'waiting') {
            interval = setInterval(() => {
                setFunFactIndex(prev => (prev + 1) % FUN_FACTS.length);
            }, 8000);
        }
        return () => clearInterval(interval);
    }, [game?.status]);

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

    // Track if this player was the chooser for the current round
    const [hideKeyboard, setHideKeyboard] = useState(true);
    useEffect(() => {
        if (game?.status === 'playing') {
            setHideKeyboard(!!isChooser);
        } else if (game?.status === 'choosing' || game?.status === 'waiting') {
            setHideKeyboard(true);
        }
        // 'finished' → keep previous value (chooser stays hidden, guesser stays visible)
    }, [game?.status, isChooser]);

    return (
        <div className="game-layout bg-transparent text-white relative">
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

            {/* Notifications & Errors (fixed overlays, outside layout flow) */}
            {error && (
                <div className="bg-red-500/90 text-white p-3 rounded fixed top-4 right-4 animate-bounce z-50 shadow-lg">
                    {error}
                </div>
            )}
            {notification && (
                <div className="bg-blue-500/90 text-white p-3 rounded fixed top-4 right-4 z-50 shadow-lg">
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

            {/* Mobile Top Bar – visible only on small screens */}
            <div className="md:hidden flex items-center justify-between px-3 py-2 bg-brand-card/80 backdrop-blur-md border-b border-white/5 shrink-0 z-20">
                <button
                    onClick={handleLeaveGame}
                    className="text-gray-300 text-sm p-1.5 rounded hover:bg-white/10 transition-colors"
                >
                    ←
                </button>
                <span className="text-sm font-bold truncate mx-2">Rum: {gameId}</span>
                <button
                    onClick={() => setShowMobileSidebar(true)}
                    className="text-gray-300 p-1.5 rounded hover:bg-white/10 transition-colors"
                    title="Visa info"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
                </button>
            </div>

            {/* Mobile Sidebar Overlay with Animations */}
            <AnimatePresence>
                {showMobileSidebar && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mobile-sidebar-overlay md:hidden"
                    >
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="mobile-sidebar-backdrop backdrop-blur-sm"
                            onClick={() => setShowMobileSidebar(false)}
                        />
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.2}
                            onDragEnd={(e, { offset, velocity }) => {
                                if (offset.x < -50 || velocity.x < -500) {
                                    setShowMobileSidebar(false);
                                }
                            }}
                            className="mobile-sidebar-panel bg-brand-card/95 backdrop-blur-xl p-4 flex flex-col gap-4 border-r border-white/10"
                        >
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold">Rum: {gameId}</h2>
                                <button
                                    onClick={() => setShowMobileSidebar(false)}
                                    className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10"
                                >
                                    ✕
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
                            <div className="text-xs text-gray-500 text-center mt-2 flex items-center justify-center gap-2">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m11 17-5-5 5-5" /><path d="m18 17-5-5 5-5" /></svg>
                                Svep vänster för att stänga
                            </div>
                            <button
                                onClick={() => { setShowMobileSidebar(false); handleLeaveGame(); }}
                                className="w-full flex items-center justify-center gap-2 text-gray-300 text-sm border border-white/10 hover:bg-white/5 p-2.5 rounded transition-colors mt-auto"
                            >
                                ← Tillbaka
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Left Sidebar */}
            <aside className="game-sidebar bg-brand-card/50 backdrop-blur-md p-3 border-r border-white/5 flex flex-col gap-3 z-10">
                <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold flex-1 truncate">Rum: {gameId}</h1>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(gameId);
                            setNotification('Spel-ID kopierat!');
                            setTimeout(() => setNotification(''), 2000);
                        }}
                        className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 shrink-0"
                        title="Kopiera Spel-ID"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                    </button>
                </div>

                {game && (
                    <div className="flex-1 overflow-hidden flex flex-col gap-3 min-h-0">
                        <PlayerList players={game.players} currentPlayerId={sessionId} wordChooser={game.wordChooser} />
                        {game.history && game.history.length > 0 && (
                            <GameHistory history={game.history} players={game.players} />
                        )}
                    </div>
                )}

                <div className="border-t border-white/5 pt-3 shrink-0">
                    <button
                        onClick={handleLeaveGame}
                        className="w-full flex items-center justify-center gap-2 text-gray-300 text-sm border border-white/10 hover:bg-white/5 p-2 rounded transition-colors"
                    >
                        ← Tillbaka
                    </button>
                </div>
            </aside>

            {/* Main Game Area */}
            <main className="flex-1 min-w-0 p-2 md:p-3">
                {!game ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
                        <div className="w-8 h-8 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
                        <p>{isConnected ? 'Ansluter till spelet...' : 'Ansluter till servern...'}</p>
                    </div>
                ) : (
                    <div className="game-main-area">
                        {/* Status / Result – absolutely positioned, never affects game grid */}
                        <div className="game-status-bar text-center relative z-30">
                            {game.status === 'waiting' && (
                                <div className="status-slide-in inline-flex flex-col items-center gap-3 bg-indigo-500/10 backdrop-blur-xl rounded-2xl px-8 py-4 border border-indigo-400/25 shadow-lg shadow-indigo-500/10">
                                    <h2 className="text-sm font-medium text-indigo-200">⏳ Väntar på att spelet ska börja...</h2>
                                    <button
                                        onClick={handleNewGame}
                                        className="status-bounce bg-brand-primary hover:bg-brand-primaryHover text-white font-bold py-2.5 px-8 rounded-xl transition-all transform active:scale-95 shadow-lg shadow-brand-primary/30"
                                    >
                                        Starta Spelet
                                    </button>
                                </div>
                            )}
                            {game.status === 'choosing' && (
                                <div className="status-slide-in">
                                    {isMyTurnToChoose ? (
                                        <div className="status-glow-pulse inline-flex items-center gap-2.5 bg-amber-500/15 backdrop-blur-xl px-6 py-3 rounded-2xl border border-amber-400/40 text-amber-300">
                                            <span className="text-lg">👑</span>
                                            <span className="font-bold text-sm md:text-base">Din tur att välja ord!</span>
                                        </div>
                                    ) : (
                                        <div className="inline-flex items-center gap-2.5 bg-purple-500/10 backdrop-blur-xl px-6 py-3 rounded-2xl border border-purple-400/25 text-purple-200 shadow-lg shadow-purple-500/5">
                                            <span>⏳</span>
                                            <span className="text-sm md:text-base">Väntar på <span className="text-purple-100 font-bold">{chooserName}</span>...</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            {game.status === 'playing' && (
                                <div className="status-slide-in inline-flex items-center gap-2.5 bg-emerald-500/10 backdrop-blur-xl px-6 py-3 rounded-2xl border border-emerald-400/25 shadow-lg shadow-emerald-500/5">
                                    <span className="text-sm md:text-base">
                                        {isChooser
                                            ? <span className="text-emerald-200">De andra spelarna gissar ordet!</span>
                                            : <>Gissa ordet som <span className="font-bold text-amber-300">{chooserName}</span> valde!</>
                                        }
                                    </span>
                                </div>
                            )}
                            {game.status === 'finished' && (
                                <div className="status-slide-in max-w-md mx-auto">
                                    {game.winnerId ? (
                                        <div className={`status-shimmer backdrop-blur-xl px-5 py-3 rounded-2xl border space-y-2 text-sm shadow-lg ${game.winnerId === sessionId ? 'bg-gradient-to-r from-amber-500/15 via-yellow-400/20 to-amber-500/15 border-amber-400/40 text-amber-200 shadow-amber-500/10' : 'bg-gradient-to-r from-yellow-600/10 via-yellow-500/15 to-yellow-600/10 border-yellow-500/30 text-yellow-200 shadow-yellow-500/5'}`}>
                                            <h2 className="text-lg font-bold">
                                                {game.winnerId === sessionId ? '🏆 Du Vann!' : `🏆 ${game.players.find(p => p.sessionId === game.winnerId)?.name || 'Någon'} Vann!`}
                                            </h2>
                                            <p className="text-xs text-gray-300">Ordet var: <span className="font-bold text-white">{game.word}</span></p>
                                            <button
                                                onClick={handleNewGame}
                                                className="bg-brand-primary hover:bg-brand-primaryHover text-white font-bold py-2 px-6 rounded-xl text-sm transition-all transform active:scale-95 shadow-lg shadow-brand-primary/30"
                                            >
                                                🔄 Nytt Spel
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="backdrop-blur-xl bg-red-500/8 px-5 py-3 rounded-2xl border border-red-400/20 text-red-200 space-y-2 text-sm shadow-lg shadow-red-500/5">
                                            <h2 className="text-lg font-bold">💀 Spelet är slut!</h2>
                                            <p className="text-xs text-gray-300">Ordet var: <span className="font-bold text-white">{game.word}</span></p>
                                            <button
                                                onClick={handleNewGame}
                                                className="bg-brand-primary hover:bg-brand-primaryHover text-white font-bold py-2 px-6 rounded-xl text-sm transition-all transform active:scale-95 shadow-lg shadow-brand-primary/30"
                                            >
                                                🔄 Nytt Spel
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Game content grid */}
                        <div className="game-content-grid">
                            {/* Row 1: Hangman / Choose Word */}
                            <div className="flex items-center justify-center">
                                {game.status === 'waiting' && (
                                    <div className="flex flex-col items-center justify-center w-full max-w-sm p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden mt-[130px] mb-4 animate-fadeIn">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/20 blur-[50px] rounded-full mix-blend-screen pointer-events-none"></div>
                                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/20 blur-[50px] rounded-full mix-blend-screen pointer-events-none"></div>

                                        <div className="text-5xl mb-6 relative z-10 animate-bounce" style={{ animationDuration: '3s' }}>🦩</div>

                                        <div className="relative h-28 w-full z-10">
                                            <AnimatePresence mode="wait">
                                                <motion.div
                                                    key={funFactIndex}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    transition={{ duration: 0.5 }}
                                                    className="absolute inset-0 text-center bg-black/30 p-4 rounded-xl border border-white/5 flex flex-col justify-center items-center"
                                                >
                                                    <p className="text-[10px] text-brand-primary/80 uppercase font-bold tracking-wider mb-2">🎲 Visste du att...</p>
                                                    <p className="text-gray-300 text-sm italic">"{FUN_FACTS[funFactIndex]}"</p>
                                                </motion.div>
                                            </AnimatePresence>
                                        </div>

                                        <div className="text-xs text-gray-500 mt-6 text-center z-10 flex flex-col items-center gap-1">
                                            <span>Bjud in vänner med spel-ID:</span>
                                            <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 shadow-inner group">
                                                <span className="font-mono text-white/90 text-sm font-bold">{gameId}</span>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(gameId);
                                                        setNotification('Spel-ID kopierat!');
                                                        setTimeout(() => setNotification(''), 2000);
                                                    }}
                                                    className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10 opacity-75 group-hover:opacity-100"
                                                    title="Kopiera Spel-ID"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {isMyTurnToChoose && (
                                    <div className="w-full max-w-md bg-brand-card/80 backdrop-blur-md p-5 rounded-xl shadow-xl border border-brand-primary/30 animate-fadeIn">
                                        <form onSubmit={handleSubmitWord} className="flex flex-col gap-4">
                                            <label className="text-sm font-medium text-gray-300 text-center">Skriv ett ord för de andra att gissa:</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={wordInput}
                                                    onChange={(e) => setWordInput(e.target.value.replace(/[^a-zA-ZåäöÅÄÖ]/g, ''))}
                                                    className="w-full p-3 pl-4 pr-12 rounded-lg bg-black/50 border border-white/10 text-white font-mono text-lg tracking-[0.2em] uppercase focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-colors"
                                                    placeholder="HEMLIGT..."
                                                    autoFocus
                                                    maxLength={25}
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-mono">
                                                    {wordInput.length}
                                                </span>
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={wordInput.length < 2}
                                                className="bg-brand-primary hover:bg-brand-primaryHover disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed py-3 rounded-lg font-bold transition-all transform active:scale-95 shadow-lg relative overflow-hidden group"
                                            >
                                                <span className="relative z-10 flex items-center justify-center gap-2">
                                                    ✅ Välj Ord
                                                </span>
                                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                                            </button>
                                        </form>
                                    </div>
                                )}
                                {(game.status === 'playing' || game.status === 'finished') && (
                                    <Hangman
                                        wrongGuesses={game.wrongGuesses}
                                        status={game.status}
                                        isWin={game.status === 'finished' && game.winnerId !== null}
                                    />
                                )}
                            </div>

                            {/* Row 2: Word Display */}
                            {(game.status === 'playing' || game.status === 'finished') && (
                                <div className="flex items-center justify-center">
                                    <WordDisplay word={game.word || '______'} guessedLetters={game.guessedLetters || []} status={game.status} />
                                </div>
                            )}

                            {/* Row 3: Mobile Guessed Letters (compact inline, md:hidden) */}
                            {game && game.guessedLetters && game.guessedLetters.length > 0 && (
                                <div className="md:hidden flex flex-wrap justify-center gap-1 px-2">
                                    {(game.guessLog || game.guessedLetters.map((l: string) => ({ letter: l, correct: game.word?.toUpperCase().includes(l.toUpperCase()), name: '' }))).map((item: any, i: number) => (
                                        <span
                                            key={i}
                                            className={`w-6 h-6 flex items-center justify-center rounded-full font-bold text-[10px] ${item.correct ? 'bg-brand-primary text-white border border-brand-primaryHover' : 'bg-brand-danger/80 text-white border border-brand-danger'}`}
                                        >
                                            {item.letter}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Row 4: Keyboard – hidden for chooser, visible for guessers */}
                            <div className={`flex items-start justify-center ${hideKeyboard ? 'invisible' : ''}`}>
                                <Keyboard
                                    guessedLetters={game.guessedLetters || []}
                                    onGuess={handleGuess}
                                    disabled={game.status !== 'playing' || hideKeyboard}
                                    word={game.word || ''}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Right Sidebar - Live Activity Feed */}
            <aside className="game-sidebar-right bg-brand-card/50 backdrop-blur-md p-3 border-l border-white/5 flex flex-col gap-3 z-10 overflow-hidden">
                {game && (
                    <>
                        {/* Integrated Activity Feed */}
                        {game.guessLog && (game.status === 'playing' || game.status === 'finished') ? (
                            <ActivityFeed guessLog={game.guessLog} />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
                            </div>
                        )}
                    </>
                )}
            </aside>
        </div>
    );
}
