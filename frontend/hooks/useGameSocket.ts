'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';

interface Player {
    sessionId: string;
    name: string;
    isOnline: boolean;
    lastSeen: string;
    score: number;
}

interface HistoryEntry {
    word: string;
    winner: string | null;
    chooser: string | null;
    total_guesses?: number;
}

interface Game {
    gameId: string;
    word: string;
    guessedLetters: string[];
    wrongGuesses: number;
    status: 'waiting' | 'choosing' | 'playing' | 'finished';
    players: Player[];
    wordChooser: string;
    history: HistoryEntry[];
    guessLog: { name: string; letter: string; correct: boolean }[];
    winnerId: string | null;
    message: string;
    dynamic_ai_status?: string | null;
}

export function useGameSocket(gameId: string, sessionId: string, name: string) {
    const { socket, isConnected } = useSocket();
    const [game, setGame] = useState<Game | null>(null);
    const [error, setError] = useState('');
    const [notification, setNotification] = useState('');
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        if (!socket) return;

        const handleUpdate = (updatedGame: Game) => {
            setGame(prev => {
                if (updatedGame.status === 'finished' && prev?.status === 'playing') {
                    const latestHistory = updatedGame.history?.[0];
                    if (latestHistory?.winner) {
                        setShowConfetti(true);
                        setTimeout(() => setShowConfetti(false), 4000);
                    }
                }
                return updatedGame;
            });
            setError('');
        };

        const handleError = (msg: string) => {
            setError(msg);
            setTimeout(() => setError(''), 5000);
        };

        const handleNotification = (msg: string) => {
            setNotification(msg);
            setTimeout(() => setNotification(''), 3000);
        };

        socket.on('update_game', handleUpdate);
        socket.on('error', handleError);
        socket.on('notification', handleNotification);

        return () => {
            socket.off('update_game', handleUpdate);
            socket.off('error', handleError);
            socket.off('notification', handleNotification);
        };
    }, [socket]);

    useEffect(() => {
        if (!socket || !isConnected || !gameId || !sessionId || !name) return;

        socket.emit('join_game', { gameId, sessionId, playerName: name }, (response: any) => {
            if (response?.status === 'error') {
                setError(`Join failed: ${response.message}`);
            }
        });
    }, [socket, isConnected, gameId, sessionId, name]);

    const guessLetter = (letter: string) => {
        if (game?.status !== 'playing') return;
        socket?.emit('guess_letter', { gameId, letter, sessionId });
    };

    const submitWord = (word: string) => {
        socket?.emit('submit_word', { gameId, word, sessionId });
    };

    const resetGame = () => {
        socket?.emit('reset_game', { gameId, sessionId });
    };

    return {
        game,
        isConnected,
        error,
        notification,
        showConfetti,
        guessLetter,
        submitWord,
        resetGame,
        setNotification,
        setError
    };
}
