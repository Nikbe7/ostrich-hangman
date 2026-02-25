import React from 'react';

interface HistoryEntry {
    word: string;
    winner: string | null;
    chooser: string | null;
    total_guesses?: number;
}

interface GameHistoryProps {
    history: HistoryEntry[];
    players: { sessionId: string; name: string }[];
}

const GameHistory: React.FC<GameHistoryProps> = ({ history, players }) => {
    if (!history || history.length === 0) return null;

    const getPlayerName = (id: string | null) => {
        if (!id) return 'Ingen';
        return players.find(p => p.sessionId === id)?.name || 'Okänd';
    };

    return (
        <div className="bg-brand-card/50 p-6 rounded-2xl backdrop-blur-md border border-white/5 shadow-xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-300">
                <span className="text-brand-primary">📜</span> Historik
            </h3>
            <ul className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
                {history.map((entry, i) => (
                    <li key={i} className="flex flex-col p-3 rounded-xl bg-black/30 border border-white/5 hover:border-brand-primary/20 transition-colors text-sm">
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-mono text-gray-200 tracking-wider font-bold">{entry.word}</span>
                            <span className={entry.winner ? 'text-brand-primary font-medium' : 'text-brand-danger font-medium'}>
                                {entry.winner ? `🏆 ${getPlayerName(entry.winner)}` : '💀 Förlust'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-500">
                            <span>{(entry.winner && entry.total_guesses) ? `${entry.total_guesses} gissningar` : ''}</span>
                            {entry.chooser && (
                                <span>Valt av: <span className="text-gray-400">{getPlayerName(entry.chooser)}</span></span>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default GameHistory;
