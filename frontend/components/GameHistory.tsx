import React from 'react';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HistoryEntry {
    word: string;
    winner: string | null;
    chooser: string | null;
    total_guesses?: number;
    guessedLetters?: string[];
    wrongGuesses?: number;
    guessLog?: any[];
}

interface Player {
    sessionId: string;
    name: string;
}

interface GameHistoryProps {
    history: HistoryEntry[];
    players: Player[];
    onItemClick?: (entry: HistoryEntry) => void;
    selectedIndex?: number;
}

export default function GameHistory({ history, players, onItemClick, selectedIndex }: GameHistoryProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    if (!history || history.length === 0) return null;

    const getPlayerName = (id: string | null) => {
        if (!id) return 'Någon';
        return players.find(p => p.sessionId === id)?.name || 'Spelare';
    };

    const hasMore = history.length > 5; // Show button if more than 5, but let the list scroll all of them

    const HistoryItem = ({ entry, i }: { entry: HistoryEntry, i: number }) => {
        const isSelected = selectedIndex === i;
        const isInteractive = !!onItemClick && !!entry.guessedLetters;

        return (
            <li
                key={i}
                onClick={() => isInteractive && onItemClick(entry)}
                className={`flex flex-col p-2 rounded-lg transition-colors text-xs shrink-0 
                    ${isSelected ? 'bg-brand-primary/20 border-brand-primary/50' : 'bg-black/30 border-white/5'} 
                    ${isInteractive ? 'cursor-pointer hover:border-brand-primary/40 hover:bg-white/5' : ''} 
                    border`}
                title={isInteractive ? "Klicka för att se hur spelet såg ut" : ""}
            >
                <div className="flex justify-between items-center mb-1">
                    <span className="font-bold tracking-widest uppercase text-white drop-shadow-md flex items-center gap-2">
                        {entry.word}
                        {isSelected && <span className="text-[10px] text-brand-primary">Visar</span>}
                    </span>
                    <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded shrink-0">
                        {entry.winner
                            ? `🏆 ${entry.wrongGuesses !== undefined ? `${entry.wrongGuesses} fel` : (entry.total_guesses ? `${entry.total_guesses} gissningar` : 'Vann')}`
                            : '💀 Hängd'}
                    </span>
                </div>
                <div className="flex justify-between items-end text-[10px] text-gray-400">
                    <span className="truncate pr-2">
                        Valt av: <span className="font-medium text-gray-300">{getPlayerName(entry.chooser)}</span>
                    </span>
                    {entry.winner && (
                        <span className="shrink-0 text-brand-primary font-medium">
                            {getPlayerName(entry.winner)}
                        </span>
                    )}
                </div>
            </li>
        );
    };

    return (
        <>
            <div className="bg-brand-card/50 p-4 rounded-xl backdrop-blur-md border border-white/5 shadow-xl flex-1 min-h-0 flex flex-col">
                <h3 className="text-sm font-bold mb-2 flex items-center gap-2 text-gray-300 shrink-0">Historik</h3>
                <ul className="space-y-1.5 overflow-y-auto pr-1 flex-1 min-h-0 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
                    {history.map((entry, i) => (
                        <HistoryItem key={i} entry={entry} i={i} />
                    ))}
                </ul>

                {hasMore && (
                    <div className="mt-2 pt-2 border-t border-white/10 shrink-0">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="w-full text-xs font-semibold py-1.5 px-3 bg-white/5 hover:bg-white/10 text-brand-primary rounded-lg transition-colors border border-brand-primary/20"
                        >
                            Visa alla tidigare ord
                        </button>
                    </div>
                )}
            </div>

            {/* Full Screen History Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
                    >
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsModalOpen(false)}
                        />

                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md bg-brand-card/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl flex flex-col max-h-[85vh] overflow-hidden"
                        >
                            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">Historik</h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                </button>
                            </div>

                            <div className="p-4 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/30">
                                <ul className="space-y-2">
                                    {history.map((entry, i) => (
                                        <HistoryItem key={i} entry={entry} i={i} />
                                    ))}
                                </ul>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
