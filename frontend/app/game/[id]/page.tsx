'use client';

import React, { useEffect, useState, use } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getSessionId, getPlayerName, setPlayerName, setLastGameId, clearLastGameId, addGameToHistory } from '@/utils/session';
import PlayerList from '@/components/PlayerList';
import GuessedLetters from '@/components/GuessedLetters';
import WordDisplay from '@/components/WordDisplay';
import Keyboard from '@/components/Keyboard';
import Hangman from '@/components/Hangman';
import GameHistory from '@/components/GameHistory';
import ActivityFeed from '@/components/ActivityFeed';
import MobileSidebar from '@/components/MobileSidebar';
import StatusOverlay from '@/components/StatusOverlay';
import SoundToggle from '@/components/SoundToggle';
import { useGameSocket } from '@/hooks/useGameSocket';
import { Player, HistoryEntry, Game } from '@/types/game';

const FUN_FACTS = [
    "Strutsar kan springa snabbare än hästar och hanarna kan ryta som lejon.",
    "En struts öga är större än dess hjärna.",
    "Världens längsta parti Hänga Gubbe varade i 3 dagar (kanske).",
    "Strutsar har bara två tår på varje fot, till skillnad från de flesta andra fåglar.",
    "Ordet 'Hangman' har anor från 1800-talets viktorianska England.",
    "Strutsar gömmer inte huvudet i sanden – det är en myt!",
    "En struts spark kan vara tillräckligt kraftig för att döda ett lejon."
];

import { useToast } from '@/components/Toast';

export default function GamePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const gameId = id.toUpperCase();
    const { showToast } = useToast();
    // Assuming `user` is provided by a `useAuth` hook or similar context,
    // which is not fully included in the provided snippet but implied by `user?.id`.
    // For now, `sessionId` will be initialized based on `getSessionId()` as before,
    // and the `user?.id` part is commented out to avoid an undefined `user` error.
    // If `useAuth` is intended, it should be imported and initialized.
    // const sessionId = user?.id || '';
    const [sessionId, setSessionId] = useState('');


    const [name, setName] = useState('');
    const [wordInput, setWordInput] = useState('');
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);
    const [funFactIndex, setFunFactIndex] = useState(0);
    const [viewingHistory, setViewingHistory] = useState<HistoryEntry | null>(null);

    const {
        game,
        isConnected,
        error,
        notification,
        showConfetti,
        guessLetter,
        submitWord,
        resetGame,
        cancelStart,
        setNotification
    } = useGameSocket(gameId, sessionId, name);

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

        if (gameId) {
            setLastGameId(gameId);
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

    // Clear history view if a new game starts
    useEffect(() => {
        if (game?.status === 'waiting' || game?.status === 'choosing') {
            setViewingHistory(null);
        }
    }, [game?.status]);

    const displayGame = React.useMemo(() => {
        if (!game) return null;
        if (!viewingHistory) return game;
        return {
            ...game,
            status: 'finished' as const,
            word: viewingHistory.word,
            guessedLetters: viewingHistory.guessedLetters || [],
            wrongGuesses: viewingHistory.wrongGuesses || 0,
            winnerId: viewingHistory.winner,
            wordChooser: viewingHistory.chooser || '',
            guessLog: viewingHistory.guessLog || []
        };
    }, [game, viewingHistory]);

    const isChooser = game?.players.find(p => p.sessionId === sessionId)?.sessionId === game?.wordChooser;
    const isMyTurnToChoose = game?.wordChooser === sessionId && game?.status === 'choosing';

    // Track if this player was the chooser for the current round
    const [hideKeyboard, setHideKeyboard] = useState(true);
    useEffect(() => {
        if (game?.status === 'playing') {
            setHideKeyboard(!!isChooser);
        } else if (game?.status === 'choosing' || game?.status === 'waiting') {
            setHideKeyboard(true);
        }
    }, [game?.status, isChooser]);

    const handleLeaveGame = () => {
        clearLastGameId();
        router.push('/');
    };

    return (
        <div className="game-layout bg-transparent text-white relative">
            <StatusOverlay
                game={game}
                sessionId={sessionId}
                error={error}
                notification={notification}
                showConfetti={showConfetti}
                onNewGame={resetGame}
                onCancelStart={cancelStart}
            />

            {/* Mobile Top Bar */}
            <div className="md:hidden flex items-center justify-between px-3 py-2 bg-brand-card/80 backdrop-blur-md border-b border-white/5 shrink-0 z-20">
                <button
                    onClick={handleLeaveGame}
                    className="text-gray-300 text-sm p-1.5 rounded hover:bg-white/10 transition-colors"
                >
                    ←
                </button>
                <span className="text-sm font-bold truncate mx-2">Rum: {gameId}</span>
                <div className="flex items-center gap-1">
                    <SoundToggle />
                    <button
                        onClick={() => setShowMobileSidebar(true)}
                        className="text-gray-300 p-1.5 rounded hover:bg-white/10 transition-colors"
                        title="Visa info"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
                    </button>
                </div>
            </div>

            <MobileSidebar
                isOpen={showMobileSidebar}
                onClose={() => setShowMobileSidebar(false)}
                gameId={gameId}
                game={game}
                sessionId={sessionId}
                onLeave={handleLeaveGame}
            />

            {/* Left Sidebar */}
            <aside className="game-sidebar bg-brand-card/50 backdrop-blur-md p-3 border-r border-white/5 flex flex-col gap-3 z-10">
                <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold flex-1 truncate">Rum: {gameId}</h1>
                    <div className="flex items-center gap-1">
                        <SoundToggle />
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(gameId);
                                showToast('Spel-ID kopierat!', 'info');
                            }}
                            className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 shrink-0"
                            title="Kopiera Spel-ID"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                        </button>
                    </div>
                </div>

                {game && (
                    <div className="flex-1 overflow-hidden flex flex-col gap-3 min-h-0">
                        <PlayerList players={game.players} currentPlayerId={sessionId} wordChooser={displayGame?.wordChooser || game.wordChooser} />
                        {game.history && game.history.length > 0 && (
                            <GameHistory
                                history={game.history}
                                players={game.players}
                                onItemClick={setViewingHistory}
                                selectedIndex={viewingHistory ? game.history.indexOf(viewingHistory) : -1}
                            />
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
            <main className="flex-1 min-w-0 p-2 md:p-3 relative">
                {viewingHistory && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-brand-primary text-white px-4 py-2 rounded-full font-bold shadow-xl flex items-center gap-3 animate-statusSlideIn border border-white/20">
                        <span>Visar historik</span>
                        <button onClick={() => setViewingHistory(null)} className="bg-black/30 hover:bg-black/50 px-3 py-1 rounded-full text-sm transition-colors">
                            Tillbaka till aktuellt spel
                        </button>
                    </div>
                )}
                {!displayGame ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
                        <div className="w-8 h-8 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
                        <p>{isConnected ? 'Ansluter till spelet...' : 'Ansluter till servern...'}</p>
                    </div>
                ) : (
                    <div className="game-main-area">
                        <div className="game-content-grid">
                            {/* Row 1: Hangman / Choose Word */}
                            <div className="flex items-center justify-center">
                                {displayGame.status === 'waiting' && !viewingHistory && (
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
                                                        showToast('Spel-ID kopierat!', 'info');
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
                                        <form onSubmit={(e) => { e.preventDefault(); submitWord(wordInput); setWordInput(''); }} className="flex flex-col gap-4">
                                            <label className="text-sm font-medium text-gray-300 text-center">Skriv ett ord för de andra att gissa:</label>
                                            <div className="relative">
                                                <input
                                                    id="wordInput"
                                                    name="wordInput"
                                                    type="text"
                                                    value={wordInput}
                                                    onChange={(e) => setWordInput(e.target.value.replace(/[^a-zA-ZåäöÅÄÖ]/g, ''))}
                                                    className="w-full p-3 pl-4 pr-12 rounded-lg bg-black/50 border border-white/10 text-white font-mono text-lg tracking-[0.2em] uppercase focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-colors"
                                                    placeholder="HEMLIGT..."
                                                    autoFocus
                                                    maxLength={25}
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-mono">{wordInput.length}</span>
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={wordInput.length < 2}
                                                className="bg-brand-primary hover:bg-brand-primaryHover disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed py-3 rounded-lg font-bold transition-all transform active:scale-95 shadow-lg relative overflow-hidden group"
                                            >
                                                <span className="relative z-10 flex items-center justify-center gap-2">✅ Välj Ord</span>
                                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                                            </button>
                                        </form>
                                    </div>
                                )}
                                {(displayGame.status === 'playing' || displayGame.status === 'finished') && (
                                    <Hangman
                                        wrongGuesses={displayGame.wrongGuesses}
                                        status={displayGame.status}
                                        isWin={displayGame.status === 'finished' && displayGame.winnerId !== null}
                                    />
                                )}
                            </div>

                            {/* Row 2: Word Display */}
                            {(displayGame.status === 'playing' || displayGame.status === 'finished') && (
                                <div className="flex items-center justify-center">
                                    <WordDisplay word={displayGame.word || '______'} guessedLetters={displayGame.guessedLetters || []} status={displayGame.status} />
                                </div>
                            )}

                            {/* Row 3: Mobile Guessed Letters – always rendered to prevent layout shift */}
                            <div className="md:hidden flex flex-wrap justify-center gap-1 px-2 min-h-[1.75rem]">
                                {displayGame && displayGame.guessedLetters && (displayGame.guessLog || displayGame.guessedLetters.map((l: string) => ({ letter: l, correct: displayGame.word?.toUpperCase().includes(l.toUpperCase()), name: '' }))).map((item: any, i: number) => (
                                    <span
                                        key={i}
                                        className={`w-6 h-6 flex items-center justify-center rounded-full font-bold text-[10px] ${item.correct ? 'bg-brand-primary text-white border border-brand-primaryHover' : 'bg-brand-danger/80 text-white border border-brand-danger'}`}
                                    >
                                        {item.letter}
                                    </span>
                                ))}
                            </div>

                            {/* Row 4: Keyboard */}
                            <div className={`flex items-start justify-center ${hideKeyboard || viewingHistory ? 'invisible' : ''}`}>
                                <Keyboard
                                    guessedLetters={displayGame.guessedLetters || []}
                                    onGuess={guessLetter}
                                    disabled={displayGame.status !== 'playing' || hideKeyboard || !!viewingHistory}
                                    word={displayGame.word || ''}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Right Sidebar - Live Activity Feed */}
            <aside className="game-sidebar-right bg-brand-card/50 backdrop-blur-md p-3 border-l border-white/5 flex flex-col gap-3 z-10 overflow-hidden">
                {displayGame && (
                    <>
                        {displayGame.guessLog && (displayGame.status === 'playing' || displayGame.status === 'finished') ? (
                            <ActivityFeed guessLog={displayGame.guessLog} />
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
