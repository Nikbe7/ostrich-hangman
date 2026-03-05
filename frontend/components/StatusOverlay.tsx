import { motion, AnimatePresence } from 'framer-motion';
import { Game } from '@/types/game';
import { useState, useEffect } from 'react';

interface StatusOverlayProps {
    game: Game | null;
    sessionId: string;
    error: string;
    notification: string;
    showConfetti: boolean;
    onNewGame: () => void;
    onCancelStart: () => void;
    onForceReset: () => void;
}

export default function StatusOverlay({
    game,
    sessionId,
    error,
    notification,
    showConfetti,
    onNewGame,
    onCancelStart,
    onForceReset,
}: StatusOverlayProps) {
    if (!game) return null;

    const isMyTurnToChoose = game.wordChooser === sessionId && game.status === 'choosing';
    const chooserName = game.players.find((p: any) => p.sessionId === game.wordChooser)?.name || 'Någon';
    const isChooser = game.players.find((p: any) => p.sessionId === sessionId)?.sessionId === game.wordChooser;

    // Live countdown for the choosing phase
    const [secsLeft, setSecsLeft] = useState<number | null>(null);
    useEffect(() => {
        if (game.status !== 'choosing' || !game.chooserDeadline) {
            setSecsLeft(null);
            return;
        }
        const update = () => {
            const remaining = Math.max(0, Math.ceil(game.chooserDeadline! - Date.now() / 1000));
            setSecsLeft(remaining);
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [game.status, game.chooserDeadline]);

    const mins = secsLeft != null ? Math.floor(secsLeft / 60) : null;
    const secs = secsLeft != null ? String(secsLeft % 60).padStart(2, '0') : null;

    return (
        <>
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

            {/* Notifications & Errors */}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none">
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, x: 20, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.9 }}
                            className="bg-red-500/90 text-white p-3 rounded shadow-lg pointer-events-auto"
                        >
                            {error}
                        </motion.div>
                    )}
                    {notification && (
                        <motion.div
                            initial={{ opacity: 0, x: 20, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.9 }}
                            className="bg-blue-500/90 text-white p-3 rounded shadow-lg pointer-events-auto"
                        >
                            {notification}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* AI Validation Overlay */}
            {game.dynamic_ai_status && (
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

            {/* Status Bar */}
            <div className="game-status-bar text-center relative z-30">
                {game.status === 'waiting' && (
                    <div className="status-slide-in inline-flex flex-col items-center gap-2 bg-indigo-500/10 backdrop-blur-xl rounded-xl px-4 py-3 border border-indigo-400/25 shadow-lg shadow-indigo-500/10">
                        <h2 className="text-sm md:text-base font-bold text-indigo-200 tracking-wide text-center">⏳ Väntar på att spelet ska börja...</h2>
                        <div className="relative group w-full md:w-auto mt-1">
                            <button
                                onClick={onNewGame}
                                className="status-bounce bg-brand-primary hover:bg-brand-primaryHover text-white font-bold py-2.5 px-8 rounded-xl transition-all transform active:scale-95 shadow-lg shadow-brand-primary/30 w-full md:w-auto"
                            >
                                Starta Spelet
                            </button>
                            <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-50">
                                Du får välja nästa ord
                            </div>
                        </div>
                    </div>
                )}
                {game.status === 'choosing' && (
                    <div className="status-slide-in">
                        {isMyTurnToChoose ? (
                            <div className="flex flex-col items-center gap-2">
                                <div className="status-glow-pulse inline-flex items-center gap-1.5 bg-amber-500/15 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-amber-400/40 text-amber-300">
                                    <span className="text-lg">👑</span>
                                    <span className="font-bold text-xs">Din tur att välja ord!</span>
                                    {secsLeft != null && (
                                        <span className={`ml-1 text-xs font-mono tabular-nums ${secsLeft < 60 ? 'text-red-300 animate-pulse' : 'text-amber-200/70'
                                            }`}>
                                            {mins}:{secs}
                                        </span>
                                    )}
                                </div>
                                <div className="relative group w-full flex justify-center mt-1">
                                    <button
                                        onClick={() => onCancelStart()}
                                        className="text-xs text-red-300 hover:text-red-200 underline decoration-red-400/50 underline-offset-2 transition-colors"
                                    >
                                        Ångra och gå tillbaka
                                    </button>
                                    <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-50">
                                        Låt någon annan välja ord
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2">
                                <div className="status-slide-in inline-flex items-center gap-1.5 bg-purple-500/10 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-purple-400/25 text-purple-200 shadow-lg shadow-purple-500/5">
                                    <span>⏳</span>
                                    <span className="text-xs">Väntar på <span className="text-purple-100 font-bold">{chooserName}</span>...</span>
                                    {secsLeft != null && (
                                        <span className={`ml-1 text-xs font-mono tabular-nums ${secsLeft < 60 ? 'text-red-300 animate-pulse' : 'text-purple-300/70'
                                            }`}>
                                            {mins}:{secs}
                                        </span>
                                    )}
                                </div>
                                {game.chooserTimedOut && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        onClick={onForceReset}
                                        className="mt-1 bg-red-500/80 hover:bg-red-500 text-white text-xs font-bold py-1.5 px-4 rounded-lg transition-all shadow-lg shadow-red-500/30 active:scale-95"
                                    >
                                        ⚡ Tvinga nytt spel
                                    </motion.button>
                                )}
                            </div>
                        )}
                    </div>
                )}
                {game.status === 'playing' && (
                    <div className="status-slide-in inline-flex items-center gap-1.5 bg-emerald-500/10 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-emerald-400/25 shadow-lg shadow-emerald-500/5">
                        <span className="text-xs">
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
                                    {game.winnerId === sessionId ? '🏆 Du Vann!' : `🏆 ${game.players.find((p: any) => p.sessionId === game.winnerId)?.name || 'Någon'} Vann!`}
                                </h2>
                                <p className="text-xs text-gray-300">Ordet var: <span className="font-bold text-white">{game.word}</span></p>
                                <div className="relative group mx-auto w-max mt-2">
                                    <button
                                        onClick={onNewGame}
                                        className="bg-brand-primary hover:bg-brand-primaryHover text-white font-bold py-2 px-6 rounded-xl text-sm transition-all transform active:scale-95 shadow-lg shadow-brand-primary/30 w-full"
                                    >
                                        🔄 Nytt Spel
                                    </button>
                                    <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-50">
                                        Du får välja nästa ord
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="backdrop-blur-xl bg-red-500/8 px-5 py-3 rounded-2xl border border-red-400/20 text-red-200 space-y-2 text-sm shadow-lg shadow-red-500/5">
                                <h2 className="text-lg font-bold">💀 Spelet är slut!</h2>
                                <p className="text-xs text-gray-300">Ordet var: <span className="font-bold text-white">{game.word}</span></p>
                                <div className="relative group mx-auto w-max mt-2">
                                    <button
                                        onClick={onNewGame}
                                        className="bg-brand-primary hover:bg-brand-primaryHover text-white font-bold py-2 px-6 rounded-xl text-sm transition-all transform active:scale-95 shadow-lg shadow-brand-primary/30 w-full"
                                    >
                                        🔄 Nytt Spel
                                    </button>
                                    <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-50">
                                        Du får välja nästa ord
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
