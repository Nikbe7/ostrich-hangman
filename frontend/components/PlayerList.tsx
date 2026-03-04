import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Player {
    sessionId: string;
    name: string;
    isOnline: boolean;
    lastSeen: string; // ISO date string
    score: number;
}

interface PlayerListProps {
    players: Player[];
    currentPlayerId: string;
    wordChooser?: string;
}

export default function PlayerList({ players, currentPlayerId, wordChooser }: PlayerListProps) {
    if (!players || players.length === 0) return null;

    // Sort players by score (descending)
    const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

    return (
        <div className="bg-brand-card/50 p-4 rounded-xl backdrop-blur-md border border-white/5 shadow-xl flex flex-col flex-shrink-0 min-h-0 max-h-[45vh]">
            <h2 className="text-sm font-bold mb-3 flex items-center justify-between shrink-0">
                Spelare
                <span className="bg-black/40 text-xs px-2 py-0.5 rounded-full text-brand-primary">{players.length}</span>
            </h2>
            <ul className="space-y-1.5 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
                <AnimatePresence mode="popLayout">
                    {sortedPlayers.map((player) => {
                        const isCurrent = player.sessionId === currentPlayerId;
                        const isChooser = player.sessionId === wordChooser;

                        // Determine medal based on score (allowing ties)
                        let medal = null;
                        if (player.score > 0) {
                            // Find all unique scores sorted descending
                            const uniqueScores = Array.from(new Set(sortedPlayers.map(p => p.score))).sort((a, b) => b - a);
                            const rank = uniqueScores.indexOf(player.score);

                            if (rank === 0) medal = '🥇';
                            else if (rank === 1) medal = '🥈';
                            else if (rank === 2) medal = '🥉';
                        }

                        return (
                            <motion.li
                                key={player.sessionId}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={`flex items-center justify-between p-2 rounded-lg transition-colors border ${isCurrent ? 'bg-white/10 border-white/20' : 'bg-black/20 border-white/5 hover:bg-white/5'
                                    }`}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <div className="relative shrink-0">
                                        <div className={`w-3 h-3 rounded-full border-2 border-brand-card ${player.isOnline ? 'bg-brand-primary' : 'bg-gray-500'}`} />
                                    </div>
                                    {medal && <span className="text-sm shrink-0 drop-shadow-md">{medal}</span>}
                                    <span className={`text-sm truncate font-medium ${isCurrent ? 'text-white' : 'text-gray-300'}`}>
                                        {player.name} {isCurrent && '(Du)'}
                                    </span>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                    <div className="text-[10px] text-gray-500 mb-0.5">
                                        {player.isOnline ? (isChooser ? 'Väljer...' : 'Online') : 'Offline'}
                                    </div>
                                    <div className="flex items-center justify-end gap-1">
                                        <span className="text-[10px] text-gray-400">Poäng:</span>
                                        <span className="font-bold text-xs text-brand-primary transition-all duration-300 transform">
                                            {player.score || 0}
                                        </span>
                                    </div>
                                </div>
                            </motion.li>
                        );
                    })}
                </AnimatePresence>
            </ul>
        </div>
    );
}
