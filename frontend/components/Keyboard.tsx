import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzåäö'.split('');

interface KeyboardProps {
    guessedLetters: string[];
    onGuess: (letter: string) => void;
    disabled: boolean;
    word?: string;
}

const Keyboard: React.FC<KeyboardProps> = ({ guessedLetters, onGuess, disabled, word = '' }) => {
    const [activeKey, setActiveKey] = useState<string | null>(null);

    const handleGuess = useCallback((letter: string) => {
        const upperLetter = letter.toUpperCase();
        if (disabled || guessedLetters.includes(upperLetter)) return;

        setActiveKey(letter);
        setTimeout(() => setActiveKey(null), 150);

        onGuess(letter);
    }, [disabled, guessedLetters, onGuess]);

    useEffect(() => {
        // Only attach listener if not disabled (i.e. if it's playing and user is guesser)
        // Note: we should prevent keydown acting when user is typing in chat or input fields in future,
        // but currently there's only the 'choose word' input which hides keyboard, so it's safe.
        const handleKeyDown = (e: KeyboardEvent) => {
            // Give up if typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (disabled) return;
            const key = e.key.toLowerCase();
            if (ALPHABET.includes(key)) {
                handleGuess(key);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleGuess, disabled]);

    return (
        <div className="keyboard-grid bg-black/20 rounded-xl border border-white/5 backdrop-blur-sm w-full">
            {ALPHABET.map((letter, index) => {
                const upperLetter = letter.toUpperCase();
                const isGuessed = guessedLetters.includes(upperLetter);
                const isCorrect = isGuessed && word && word.toUpperCase().includes(upperLetter);
                const isIncorrect = isGuessed && word && !word.toUpperCase().includes(upperLetter);
                const isActive = activeKey === letter;

                return (
                    <motion.button
                        key={letter}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{
                            opacity: 1,
                            scale: isActive ? 0.85 : 1,
                            x: isIncorrect ? [0, -4, 4, -4, 4, 0] : 0 // Shake on incorrect
                        }}
                        transition={{
                            duration: isIncorrect ? 0.3 : 0.15,
                            delay: isIncorrect ? 0 : (index * 0.01) // Only delay initial mount, not shake
                        }}
                        whileHover={!disabled && !isGuessed ? { scale: 1.1 } : {}}
                        whileTap={!disabled && !isGuessed ? { scale: 0.9 } : {}}
                        onClick={() => handleGuess(letter)}
                        disabled={disabled || isGuessed}
                        className={`
                            keyboard-key relative overflow-hidden flex items-center justify-center rounded-lg font-bold uppercase transition-colors border
                            ${isCorrect ? 'bg-brand-primary text-white border-brand-primaryHover shadow-[inset_0_0_10px_rgba(0,0,0,0.2)]' : ''}
                            ${isIncorrect ? 'bg-brand-danger/80 text-white border-brand-danger shadow-[inset_0_0_10px_rgba(0,0,0,0.2)]' : ''}
                            ${!isGuessed && isActive ? 'bg-white/30 text-white border-white/40' : ''}
                            ${!isGuessed && !isActive ? 'bg-brand-card hover:bg-white/10 text-white border-white/10 shadow-lg' : ''}
                            ${disabled && !isGuessed ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    >
                        <span className="relative z-10">{letter}</span>
                    </motion.button>
                );
            })}
        </div>
    );
};

export default Keyboard;
