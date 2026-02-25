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
        <div className="flex gap-2 sm:gap-3 justify-center my-10 flex-wrap px-4">
            <AnimatePresence>
                {word.split('').map((char, index) => {
                    if (char === ' ') {
                        return <span key={`space-${index}`} className="w-8" />;
                    }

                    const isRevealed = isFinished || guessedLetters.includes(char.toUpperCase());

                    return (
                        <div key={index} className="relative flex flex-col items-center justify-end w-10 sm:w-14 h-16 sm:h-20">
                            {/* The text character */}
                            <AnimatePresence>
                                {isRevealed && (
                                    <motion.span
                                        initial={{ opacity: 0, y: 20, scale: 0.5, filter: "blur(10px)" }}
                                        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                        className={`absolute bottom-3 text-4xl sm:text-5xl font-mono font-bold uppercase z-10
                                            ${isFinished && !guessedLetters.includes(char.toUpperCase()) ? 'text-brand-danger' : 'text-white'}`}
                                    >
                                        {char}
                                    </motion.span>
                                )}
                            </AnimatePresence>

                            {/* The underline */}
                            <motion.div
                                className={`w-full h-1.5 rounded-full transition-colors duration-300
                                    ${isRevealed ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'bg-white/20'}`}
                            />
                        </div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};

export default WordDisplay;
