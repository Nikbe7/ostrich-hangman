import React from 'react';
import { motion } from 'framer-motion';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzåäö'.split('');

interface KeyboardProps {
    guessedLetters: string[];
    onGuess: (letter: string) => void;
    disabled: boolean;
}

const Keyboard: React.FC<KeyboardProps> = ({ guessedLetters, onGuess, disabled }) => {
    return (
        <div className="grid grid-cols-7 sm:grid-cols-9 gap-2 max-w-2xl mx-auto p-4 bg-black/20 rounded-2xl border border-white/5 backdrop-blur-sm">
            {ALPHABET.map((letter, index) => {
                const isGuessed = guessedLetters.includes(letter.toUpperCase());
                return (
                    <motion.button
                        key={letter}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.01 }}
                        whileHover={!disabled && !isGuessed ? { scale: 1.1, boxShadow: "0 0 15px rgba(20,184,166,0.5)" } : {}}
                        whileTap={!disabled && !isGuessed ? { scale: 0.9 } : {}}
                        onClick={() => onGuess(letter)}
                        disabled={disabled || isGuessed}
                        className={`
                            relative overflow-hidden aspect-square flex items-center justify-center rounded-xl font-bold uppercase text-lg transition-colors border
                            ${isGuessed
                                ? 'bg-black/40 text-gray-700 border-white/5 cursor-not-allowed shadow-inner'
                                : 'bg-brand-card hover:bg-white/10 text-white border-white/10 shadow-lg'
                            }
                            ${disabled && !isGuessed ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    >
                        {/* Interactive glow effect for unguessed keys */}
                        {!isGuessed && !disabled && (
                            <div className="absolute inset-0 bg-gradient-to-br from-teal-400/20 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
                        )}
                        <span className="relative z-10">{letter}</span>
                    </motion.button>
                );
            })}
        </div>
    );
};

export default Keyboard;
