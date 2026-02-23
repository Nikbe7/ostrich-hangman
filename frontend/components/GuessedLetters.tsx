import React from 'react';

interface GuessedLettersProps {
    guessedLetters: string[];
    word: string;
    guessLog?: { name: string; letter: string; correct: boolean }[];
}

const GuessedLetters: React.FC<GuessedLettersProps> = ({ guessedLetters, word, guessLog }) => {
    if (guessedLetters.length === 0) return null;

    // Sort to keep order consistent or just show in order of guess?
    // Usually order of guess is interesting, but alphabetical is cleaner.
    // Let's stick to order of guess for now (history).

    // Use guessLog if available, otherwise fallback to guessedLetters
    const lettersToDisplay = guessLog || guessedLetters.map(letter => ({
        name: '',
        letter,
        correct: word.toUpperCase().includes(letter.toUpperCase())
    }));

    return (
        <div className="flex flex-col items-center gap-2 my-4">
            <h3 className="text-gray-400 text-sm uppercase tracking-wider font-semibold">Gissade bokstäver</h3>
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                {lettersToDisplay.map((item, index) => (
                    <div key={index} className="flex flex-col items-center">
                        <span
                            className={`
                                w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm shadow-sm
                                ${item.correct
                                    ? 'bg-green-600 text-white border border-green-400'
                                    : 'bg-red-600/80 text-white border border-red-400'
                                }
                            `}
                        >
                            {item.letter}
                        </span>
                        {item.name && (
                            <span className="text-[10px] text-gray-400 mt-1 max-w-[60px] truncate">{item.name}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GuessedLetters;
