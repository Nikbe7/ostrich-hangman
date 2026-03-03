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
                router.push(`/game/${lastGameId}`);
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
        return <div className="flex h-screen items-center justify-center text-white bg-brand-dark">
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-12 h-12 rounded-full border-4 border-brand-primary border-t-transparent animate-spin" />
        </div>;
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-8 bg-brand-dark text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(5,150,105,0.15),rgba(0,0,0,1)_60%)] pointer-events-none" />

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
