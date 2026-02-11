import React from 'react';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzåäö'.split('');

interface KeyboardProps {
    guessedLetters: string[];
    onGuess: (letter: string) => void;
    disabled: boolean;
}

const Keyboard: React.FC<KeyboardProps> = ({ guessedLetters, onGuess, disabled }) => {
    return (
        <div className="grid grid-cols-7 gap-2 max-w-lg mx-auto">
            {ALPHABET.map((letter) => {
                const isGuessed = guessedLetters.includes(letter);
                return (
                    <button
                        key={letter}
                        onClick={() => onGuess(letter)}
                        disabled={disabled || isGuessed}
                        className={`
              p-3 rounded font-bold uppercase text-lg transition-colors
              ${isGuessed
                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg active:translate-y-1'
                            }
              ${disabled && !isGuessed ? 'opacity-50 cursor-not-allowed' : ''}
            `}
                    >
                        {letter}
                    </button>
                );
            })}
        </div>
    );
};

export default Keyboard;
