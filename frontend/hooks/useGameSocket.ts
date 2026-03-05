import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Game } from '@/types/game';
import { useToast } from '@/components/Toast';
import { useSound } from '@/hooks/useSound';

export function useGameSocket(gameId: string, sessionId: string, name: string) {
    const { socket, isConnected } = useSocket();
    const [game, setGame] = useState<Game | null>(null);
    const [error, setError] = useState('');
    const [notification, setNotification] = useState('');
    const [showConfetti, setShowConfetti] = useState(false);
    const { showToast } = useToast();
    const { playCorrect, playWrong, playWin, playLoss } = useSound();

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const prevGameRef = useRef<Game | null>(null);

    useEffect(() => {
        if (!game) return;

        const prev = prevGameRef.current;
        if (prev) {
            if (game.status === 'finished' && prev.status === 'playing') {
                const latestHistory = game.history?.[0];
                if (latestHistory?.winner) {
                    setShowConfetti(true);
                    playWin();
                    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
                    setTimeout(() => setShowConfetti(false), 4000);
                } else {
                    playLoss();
                    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([300]);
                }
            } else if (game.status === 'playing' && prev.status === 'playing') {
                if (game.guessedLetters.length > prev.guessedLetters.length) {
                    const lastGuess = game.guessedLetters[game.guessedLetters.length - 1];
                    if (game.word.includes(lastGuess)) {
                        playCorrect();
                        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50); // Short buzz for correct
                    } else {
                        playWrong();
                        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([50, 100, 50]); // Two short buzzes for wrong
                    }
                }
            }
        }
        prevGameRef.current = game;
    }, [game, playWin, playLoss, playCorrect, playWrong]);

    useEffect(() => {
        if (!socket) return;

        const handleUpdate = (updatedGame: Game) => {
            setGame(updatedGame);
            setError('');
        };

        const handleError = (msg: string) => {
            setError(msg);
            showToast(msg, 'error');
            setTimeout(() => setError(''), 5000);
        };

        const handleNotification = (msg: string) => {
            setNotification(msg);
            showToast(msg, 'info');
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

    const cancelStart = () => {
        socket?.emit('cancel_start', { gameId, sessionId });
    };

    const forceReset = () => {
        socket?.emit('force_reset', { gameId, sessionId });
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
        cancelStart,
        forceReset,
        setNotification,
        setError
    };
}
