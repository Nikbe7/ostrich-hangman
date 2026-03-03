import { motion, AnimatePresence } from 'framer-motion';
import PlayerList from '@/components/PlayerList';
import GameHistory from '@/components/GameHistory';
import { Game } from '@/types/game';

interface MobileSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    gameId: string;
    game: Game | null;
    sessionId: string;
    onLeave: () => void;
}

export default function MobileSidebar({
    isOpen,
    onClose,
    gameId,
    game,
    sessionId,
    onLeave
}: MobileSidebarProps) {
    return (
        <AnimatePresence>
            {isOpen && (
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
                        onClick={onClose}
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
                                onClose();
                            }
                        }}
                        className="mobile-sidebar-panel bg-brand-card/95 backdrop-blur-xl p-4 flex flex-col gap-4 border-r border-white/10"
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold">Rum: {gameId}</h2>
                            <button
                                onClick={onClose}
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
                            onClick={onLeave}
                            className="w-full flex items-center justify-center gap-2 text-gray-300 text-sm border border-white/10 hover:bg-white/5 p-2.5 rounded transition-colors mt-auto"
                        >
                            ← Tillbaka
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
