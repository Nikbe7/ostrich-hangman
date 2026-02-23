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
        <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
            <h3 className="text-lg font-bold mb-3 text-white flex items-center gap-2">
                📜 Historik
            </h3>
            <ul className="space-y-1.5">
                {history.map((entry, i) => (
                    <li key={i} className="flex flex-col p-2 rounded bg-black/20 text-sm">
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-mono text-blue-300 tracking-wider font-bold">{entry.word}</span>
                            <span className={entry.winner ? 'text-green-400' : 'text-red-400'}>
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
