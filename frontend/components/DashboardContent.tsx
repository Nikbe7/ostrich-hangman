'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, GameMetadata } from '@/types/game';

interface DashboardContentProps {
    user: User;
    gameHistory: GameMetadata[];
    onLogout: () => void;
    onCreateGame: () => void;
    onJoinGame: (gameId: string) => void;
    onRejoinGame: (gameId: string) => void;
    onRemoveGame: (gameId: string) => void;
}

export default function DashboardContent({
    user,
    gameHistory,
    onLogout,
    onCreateGame,
    onJoinGame,
    onRejoinGame,
    onRemoveGame
}: DashboardContentProps) {
    const [gameIdInput, setGameIdInput] = useState('');

    const handleJoinSubmit = () => {
        if (!gameIdInput) return alert('Vänligen ange ett Spel-ID');
        onJoinGame(gameIdInput.toUpperCase());
    };

    return (
        <div className="space-y-6 sm:space-y-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 100 }}
                className="bg-brand-card/80 p-5 sm:p-8 rounded-2xl backdrop-blur-xl border border-white/5 shadow-2xl space-y-6 sm:space-y-8"
            >
                <div className="flex justify-between items-center pb-6 border-b border-brand-primary/20">
                    <div>
                        <p className="text-sm text-gray-500 font-medium tracking-wide uppercase">Inloggad som</p>
                        <p className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primaryHover to-white">{user.username}</p>
                    </div>
                    <button
                        onClick={onLogout}
                        className="text-sm text-gray-400 hover:text-brand-primary transition-colors font-medium border border-transparent hover:border-brand-primary/30 px-3 py-1.5 rounded-lg"
                    >
                        Logga ut
                    </button>
                </div>

                <div className="space-y-4">
                    <motion.button
                        whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(5, 150, 105, 0.4)" }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onCreateGame}
                        className="w-full bg-brand-primary hover:bg-brand-primaryHover text-white font-bold py-4 px-4 rounded-xl transition-all shadow-lg text-sm sm:text-base"
                    >
                        Starta Nytt Spel
                    </motion.button>

                    <div className="flex flex-col sm:flex-row gap-3 relative">
                        <input
                            id="gameId"
                            name="gameId"
                            type="text"
                            value={gameIdInput}
                            onChange={(e) => setGameIdInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleJoinSubmit()}
                            className="flex-1 p-4 rounded-xl bg-black/40 border border-white/10 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none uppercase font-mono tracking-widest text-lg transition-all"
                            placeholder="SPEL-ID"
                        />
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleJoinSubmit}
                            className="w-full sm:w-auto bg-brand-card hover:bg-white/5 border border-white/10 text-white font-bold py-4 px-6 rounded-xl transition-all backdrop-blur-sm text-sm sm:text-base"
                        >
                            Gå Med
                        </motion.button>
                    </div>
                </div>
            </motion.div>

            {/* Game History */}
            {gameHistory.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 100 }}
                    className="bg-brand-card/50 p-4 sm:p-6 rounded-2xl backdrop-blur-md border border-white/5 shadow-xl"
                >
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-300">Dina Aktiva Spel</h2>
                    <ul className="space-y-3">
                        <AnimatePresence>
                            {gameHistory.map((game) => {
                                const daysInactive = (Date.now() / 1000 - game.last_activity) / (24 * 3600);
                                const isOld = daysInactive > 25;

                                return (
                                    <motion.li
                                        key={game.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 bg-black/30 p-4 rounded-xl border border-white/5 hover:border-brand-primary/30 transition-colors"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                            <span className="font-mono font-bold text-gray-200 tracking-wider text-center sm:text-left">{game.id}</span>
                                            {isOld && (
                                                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] uppercase font-bold tracking-tight animate-pulse">
                                                    <span className="text-sm">⚠️</span>
                                                    Rensas snart p.g.a inaktivitet
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => onRejoinGame(game.id)}
                                                className="flex-1 sm:flex-none px-4 py-2 bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white border border-brand-primary/30 rounded-lg text-sm font-bold transition-all"
                                            >
                                                Spela
                                            </motion.button>
                                            <button
                                                onClick={() => onRemoveGame(game.id)}
                                                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                title="Ta bort från lista"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </motion.li>
                                );
                            })}
                        </AnimatePresence>
                    </ul>
                </motion.div>
            )}
        </div>
    );
}
