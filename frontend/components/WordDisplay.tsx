import React from 'react';

interface WordDisplayProps {
    word: string; // The full word
    guessedLetters: string[];
    status: string;
}

const WordDisplay: React.FC<WordDisplayProps> = ({ word, guessedLetters, status }) => {
    // If game is finished, show full word. If playing, show underscores for unguessed.
    // Wait, backend sends full word? Yes, per my design.
    // Ideally backend sends masks, but for simplicity here we mask in frontend.

    const displayWord = word.split('').map((char) => {
        if (status === 'finished') return char;
        return guessedLetters.includes(char.toLowerCase()) ? char : '_';
    });

    return (
        <div className="flex gap-2 justify-center my-8 flex-wrap">
            {displayWord.map((char, index) => (
                <span key={index} className="text-4xl font-mono border-b-4 border-white min-w-[40px] text-center pb-2 mx-1">
                    {char}
                </span>
            ))}
        </div>
    );
};

export default WordDisplay;
