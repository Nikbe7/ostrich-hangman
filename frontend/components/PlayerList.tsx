import React from 'react';

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

const PlayerList: React.FC<PlayerListProps> = ({ players, currentPlayerId, wordChooser }) => {
    const formatLastSeen = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'nyligen';
        return `${mins} min sedan`;
    };

    return (
        <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
            <h3 className="text-xl font-bold mb-4 text-white">Spelare</h3>
            <ul className="space-y-2">
                {players.map((p, i) => (
                    <li key={`${p.sessionId}-${i}`} className="flex items-center justify-between p-2 rounded bg-black/20">
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${p.isOnline ? 'bg-brand-primary shadow-[0_0_8px_rgba(5,150,105,0.6)]' : 'bg-gray-500'}`} />
                            <span className={`font-medium ${p.sessionId === currentPlayerId ? 'text-yellow-300' : 'text-white'}`}>
                                {p.sessionId === wordChooser && '👑 '}
                                {p.name} {p.sessionId === currentPlayerId && '(Du)'}
                            </span>
                        </div>
                        <div className="text-xs text-gray-300 text-right">
                            <div>{p.isOnline ? 'Online' : formatLastSeen(p.lastSeen)}</div>
                            <div>Poäng: {p.score}</div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default PlayerList;
