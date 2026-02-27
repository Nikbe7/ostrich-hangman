import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GuessLogEntry {
    name: string;
    letter: string;
    correct: boolean;
}

interface ActivityFeedProps {
    guessLog: GuessLogEntry[];
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ guessLog }) => {
    // Show all guesses (or a very large limit) ordered newest to oldest
    const recentGuesses = [...guessLog].reverse();

    return (
        <div className="flex flex-col gap-2 w-full mt-2 h-full min-h-0">
            <h3 className="text-gray-400 text-xs uppercase tracking-wider font-semibold text-center mb-1 shrink-0">Gissningar</h3>
            <div className="flex flex-col gap-2 overflow-y-auto px-1 flex-1 min-h-0 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
                <AnimatePresence mode="popLayout">
                    {recentGuesses.map((entry, index) => {
                        // Use the original index from the full array + letter as the unique key
                        const originalIndex = guessLog.length - 1 - index;
                        return (
                            <motion.div
                                key={`${originalIndex}-${entry.letter}`}
                                layout
                                initial={{ opacity: 0, x: 20, height: 0 }}
                                animate={{ opacity: 1, x: 0, height: 'auto' }}
                                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                className={`
                                    flex items-center gap-2.5 p-2 rounded-lg backdrop-blur-md border shadow-sm
                                    ${entry.correct
                                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-100 shadow-emerald-500/10'
                                        : 'bg-red-500/15 border-red-500/30 text-red-100 shadow-red-500/10'
                                    }
                                `}
                            >
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${entry.correct ? 'bg-emerald-500/30 shadow-[inset_0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500/30 shadow-[inset_0_0_8px_rgba(239,68,68,0.5)]'}`}>
                                    {entry.correct ? '✅' : '❌'}
                                </div>
                                <div className="flex-1 min-w-0 flex items-center justify-between">
                                    <p className="text-[10px] text-white/80 truncate pr-2">
                                        <span className="font-bold text-white">{entry.name}</span> gissade
                                    </p>
                                    <p className="font-bold text-sm leading-none uppercase">{entry.letter}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ActivityFeed;
