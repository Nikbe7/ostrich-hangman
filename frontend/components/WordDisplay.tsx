import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WordDisplayProps {
    word: string; // The full word
    guessedLetters: string[];
    status: string;
}

const WordDisplay: React.FC<WordDisplayProps> = ({ word, guessedLetters, status }) => {
    const isFinished = status === 'finished';

    return (
        <div className="word-display">
            <AnimatePresence>
                {word.split('').map((char, index) => {
                    if (char === ' ') {
                        return <span key={`space-${index}`} className="w-6" />;
                    }

                    const isRevealed = isFinished || guessedLetters.includes(char.toUpperCase());

                    return (
                        <div key={index} className="word-letter relative flex flex-col items-center justify-end">
                            {/* The text character */}
                            <AnimatePresence>
                                {isRevealed && (
                                    <motion.span
                                        initial={{ opacity: 0, y: 20, scale: 0.5, filter: "blur(10px)" }}
                                        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                        className={`word-letter-text absolute bottom-2 font-mono font-bold uppercase z-10
                                            ${isFinished && !guessedLetters.includes(char.toUpperCase()) ? 'text-brand-danger' : 'text-white'}`}
                                    >
                                        {char}
                                    </motion.span>
                                )}
                            </AnimatePresence>

                            {/* The underline */}
                            <motion.div
                                animate={(status === 'playing' && !isRevealed) ? {
                                    boxShadow: ["0 0 4px rgba(255,255,255,0.4)", "0 0 20px rgba(255,255,255,1)", "0 0 4px rgba(255,255,255,0.4)"],
                                    opacity: [0.6, 1, 0.6]
                                } : { opacity: 1 }}
                                transition={(status === 'playing' && !isRevealed) ? {
                                    duration: 1.5,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                    delay: index * 0.15
                                } : { duration: 0.3 }}
                                className={`w-full h-1 rounded-full bg-white
                                    ${isRevealed ? 'shadow-[0_0_10px_rgba(255,255,255,0.8)]' : ''}`}
                            />
                        </div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};

export default WordDisplay;
