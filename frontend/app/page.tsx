'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    getLastGameId, clearLastGameId,
    getGameHistory, removeGameFromHistory
} from '@/utils/session';
import { getToken, getUser, User, logout, fetchUserGames, removeUserGame, GameItem } from '@/utils/auth';
import AuthForm from '@/components/AuthForm';
import OstrichAnimation from '@/components/OstrichAnimation';

const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } }
};

export default function Home() {
    const router = useRouter();
    const [user, setUserState] = useState<User | null>(null);
    const [gameIdInput, setGameIdInput] = useState('');
    const [gameHistory, setGameHistory] = useState<GameItem[]>([]);
    const [ready, setReady] = useState(false);
    const [loginAnimating, setLoginAnimating] = useState(false);
    const [pendingUser, setPendingUser] = useState<{ user: User; games: GameItem[] } | null>(null);

    useEffect(() => {
        const loadInitialData = async () => {
            const token = getToken();
            const storedUser = getUser();

            if (token && storedUser) {
                setUserState(storedUser);
                const games = await fetchUserGames(token);
                setGameHistory(games);
            } else {
                const localGames = getGameHistory();
                setGameHistory(localGames.map(id => ({ id, last_activity: Date.now() / 1000 })));
            }

            const lastGameId = getLastGameId();
            if (lastGameId) {
                router.push(`/game/${lastGameId}`);
                return;
            }

            setReady(true);
        };

        loadInitialData();
    }, [router]);

    const handleLoginSuccess = async () => {
        const storedUser = getUser();
        const token = getToken();
        if (storedUser && token) {
            const games = await fetchUserGames(token);
            // Store the data but don't show dashboard yet — trigger animation first
            setPendingUser({ user: storedUser, games });
            setLoginAnimating(true);
        }
    };

    const handleAnimationComplete = () => {
        if (pendingUser) {
            // Step 1: Update user state so the dashboard renders BEHIND the still-opaque overlay
            setUserState(pendingUser.user);
            setGameHistory(pendingUser.games);
            setPendingUser(null);
        }
        // Step 2: Wait for React to paint the dashboard behind the overlay,
        // then remove the overlay (triggering its fade-out exit)
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setLoginAnimating(false);
            });
        });
    };

    const handleLogout = () => {
        logout();
        setUserState(null);
    };

    const handleCreateGame = () => {
        if (!user) return;
        const newGameId = Math.random().toString(36).substring(2, 8).toUpperCase();
        router.push(`/game/${newGameId}`);
    };

    const handleJoinGame = () => {
        if (!user) return;
        if (!gameIdInput) return alert('Vänligen ange ett Spel-ID');
        router.push(`/game/${gameIdInput.toUpperCase()}`);
    };

    const handleRejoinGame = (gameId: string) => {
        if (!user) return;
        router.push(`/game/${gameId}`);
    };

    const handleRemoveGame = async (gameId: string) => {
        const token = getToken();
        if (user && token) {
            const success = await removeUserGame(token, gameId);
            if (success) {
                setGameHistory(prev => prev.filter(g => g.id !== gameId));
            } else {
                alert("Kunde inte ta bort spelet från servern.");
            }
        } else {
            removeGameFromHistory(gameId);
            setGameHistory(prev => prev.filter(g => g.id !== gameId));
        }
    };

    if (!ready) {
        return <div className="flex h-screen items-center justify-center text-white bg-brand-dark">
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-12 h-12 rounded-full border-4 border-brand-primary border-t-transparent animate-spin" />
        </div>;
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-8 bg-brand-dark text-white relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(5,150,105,0.15),rgba(0,0,0,1)_60%)] pointer-events-none" />

            {/* Ostrich fly-away login animation overlay */}
            <AnimatePresence>
                {loginAnimating && (
                    <OstrichAnimation onComplete={handleAnimationComplete} />
                )}
            </AnimatePresence>

            <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="max-w-xl w-full space-y-6 sm:space-y-8 relative z-10"
            >
                <motion.div variants={itemVariants} className="text-center space-y-4 sm:space-y-5 relative z-20">
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        className="relative inline-block mb-3"
                    >
                        {/* Pulsing ring behind avatar */}
                        <motion.div
                            className="absolute inset-[-8px] rounded-full border-2 border-brand-primary/40"
                            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.1, 0.4] }}
                            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                        />
                        <motion.div
                            className="absolute inset-[-16px] rounded-full border border-brand-primary/20"
                            animate={{ scale: [1, 1.25, 1], opacity: [0.2, 0.05, 0.2] }}
                            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                        />
                        <div className="p-1 rounded-full bg-brand-primary/10 border border-brand-primary/30 shadow-[0_0_40px_rgba(5,150,105,0.3)] overflow-hidden w-24 h-24 relative">
                            <img src="/ostrich.png" alt="Ostrich Hangman" className="object-cover w-full h-full rounded-full bg-black" />
                        </div>
                    </motion.div>

                    {/* Animated title with staggered word reveal */}
                    <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                        {'Välkommen till'.split(' ').map((word, i) => (
                            <motion.span
                                key={i}
                                initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
                                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                transition={{ delay: 0.3 + i * 0.12, duration: 0.6, ease: "easeOut" }}
                                className="inline-block mr-3 text-gray-300"
                            >
                                {word}
                            </motion.span>
                        ))}
                        <br />
                        <motion.span
                            initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            transition={{ delay: 0.6, duration: 0.6, ease: "easeOut" }}
                            className="inline-block mr-3 text-white"
                        >
                            Team Ostrich
                        </motion.span>
                        <br />
                        <motion.span
                            initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                            transition={{ delay: 0.9, duration: 0.7, type: "spring", stiffness: 120 }}
                            className="inline-block bg-gradient-to-r from-brand-primary via-emerald-300 to-teal-400 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(5,150,105,0.5)] text-4xl sm:text-6xl pb-2"
                        >
                            Hänga Gubbe
                        </motion.span>
                    </h1>

                </motion.div>

                <AnimatePresence mode="wait">
                    {!user ? (
                        <motion.div
                            key="login"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex justify-center"
                        >
                            <AuthForm onLogin={handleLoginSuccess} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="dashboard"
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
                                    onClick={handleLogout}
                                    className="text-sm text-gray-400 hover:text-brand-primary transition-colors font-medium border border-transparent hover:border-brand-primary/30 px-3 py-1.5 rounded-lg"
                                >
                                    Logga ut
                                </button>
                            </div>

                            <div className="space-y-4">
                                <motion.button
                                    whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(5, 150, 105, 0.4)" }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleCreateGame}
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
                                        className="flex-1 p-4 rounded-xl bg-black/40 border border-white/10 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none uppercase font-mono tracking-widest text-lg transition-all"
                                        placeholder="SPEL-ID"
                                    />
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleJoinGame}
                                        className="w-full sm:w-auto bg-brand-card hover:bg-white/5 border border-white/10 text-white font-bold py-4 px-6 rounded-xl transition-all backdrop-blur-sm text-sm sm:text-base"
                                    >
                                        Gå Med
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Game History */}
                {
                    user && gameHistory.length > 0 && (
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
                                                        onClick={() => handleRejoinGame(game.id)}
                                                        className="flex-1 sm:flex-none px-4 py-2 bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white border border-brand-primary/30 rounded-lg text-sm font-bold transition-all"
                                                    >
                                                        Spela
                                                    </motion.button>
                                                    <button
                                                        onClick={() => handleRemoveGame(game.id)}
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
                    )
                }
            </motion.div >
        </main >
    );
}
