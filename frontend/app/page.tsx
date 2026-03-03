'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getLastGameId } from '@/utils/session';
import { getToken, getUser, fetchUserGames } from '@/utils/auth';
import { User, GameMetadata } from '@/types/game';
import { useAuth } from '@/hooks/useAuth';
import AuthForm from '@/components/AuthForm';
import OstrichAnimation from '@/components/OstrichAnimation';
import Hero from '@/components/Hero';
import DashboardContent from '@/components/DashboardContent';
import SoundToggle from '@/components/SoundToggle';
import { useSound } from '@/hooks/useSound';

const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

export default function Home() {
    const router = useRouter();
    const { user, gameHistory, isLoading, login, logout, removeGame } = useAuth();
    const [ready, setReady] = useState(false);
    const [loginAnimating, setLoginAnimating] = useState(false);
    const [pendingUser, setPendingUser] = useState<{ user: User; games: GameMetadata[] } | null>(null);

    useEffect(() => {
        if (!isLoading) {
            const lastGameId = getLastGameId();
            if (lastGameId) {
                // Use replace instead of push to avoid history warnings and maintain a clean back-button experience
                router.replace(`/game/${lastGameId}`);
                return;
            }
            setReady(true);
        }
    }, [isLoading, router]);

    const handleLoginSuccess = async () => {
        const storedUser = getUser();
        const token = getToken();
        if (storedUser && token) {
            const games = await fetchUserGames(token);
            setPendingUser({ user: storedUser, games });
            setLoginAnimating(true);
        }
    };

    const handleAnimationComplete = () => {
        if (pendingUser) {
            login(pendingUser.user, pendingUser.games);
            setPendingUser(null);
        }
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setLoginAnimating(false);
            });
        });
    };

    const handleCreateGame = () => {
        const newGameId = Math.random().toString(36).substring(2, 8).toUpperCase();
        router.push(`/game/${newGameId}`);
    };

    if (!ready || isLoading) {
        return (
            <div className="flex h-screen flex-col items-center justify-center text-white bg-brand-dark gap-6">
                <div className="relative">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        className="w-16 h-16 rounded-full border-2 border-brand-primary/20 border-t-brand-primary shadow-[0_0_15px_rgba(5,150,105,0.3)]"
                    />
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute inset-0 bg-brand-primary rounded-full blur-xl"
                    />
                </div>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-gray-400 font-medium tracking-widest text-xs uppercase animate-pulse"
                >
                    Laddar Ostrich Hangman...
                </motion.p>
            </div>
        );
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-8 bg-brand-dark text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(5,150,105,0.15),rgba(0,0,0,1)_60%)] pointer-events-none" />

            <div className="absolute top-6 right-6 z-50">
                <SoundToggle />
            </div>

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
                <Hero />

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
                        <DashboardContent
                            user={user}
                            gameHistory={gameHistory}
                            onLogout={logout}
                            onCreateGame={handleCreateGame}
                            onJoinGame={(id) => router.push(`/game/${id}`)}
                            onRejoinGame={(id) => router.push(`/game/${id}`)}
                            onRemoveGame={removeGame}
                        />
                    )}
                </AnimatePresence>
            </motion.div >
        </main >
    );
}
