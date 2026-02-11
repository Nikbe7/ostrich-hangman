import React from 'react';

interface HangmanProps {
    wrongGuesses: number;
}

const Hangman: React.FC<HangmanProps> = ({ wrongGuesses }) => {
    // SVG parts for each stage of the hangman
    // 10 stages typically
    const parts = [
        // 1. Base
        <line key="1" x1="10" y1="250" x2="150" y2="250" stroke="white" strokeWidth="4" />,
        // 2. Pole
        <line key="2" x1="80" y1="250" x2="80" y2="20" stroke="white" strokeWidth="4" />,
        // 3. Top
        <line key="3" x1="80" y1="20" x2="200" y2="20" stroke="white" strokeWidth="4" />,
        // 4. Rope
        <line key="4" x1="200" y1="20" x2="200" y2="50" stroke="white" strokeWidth="4" />,
        // 5. Head
        <circle key="5" cx="200" cy="80" r="30" stroke="white" strokeWidth="4" fill="transparent" />,
        // 6. Body
        <line key="6" x1="200" y1="110" x2="200" y2="170" stroke="white" strokeWidth="4" />,
        // 7. Left Arm
        <line key="7" x1="200" y1="130" x2="170" y2="160" stroke="white" strokeWidth="4" />,
        // 8. Right Arm
        <line key="8" x1="200" y1="130" x2="230" y2="160" stroke="white" strokeWidth="4" />,
        // 9. Left Leg
        <line key="9" x1="200" y1="170" x2="170" y2="220" stroke="white" strokeWidth="4" />,
        // 10. Right Leg
        <line key="10" x1="200" y1="170" x2="230" y2="220" stroke="white" strokeWidth="4" />,
    ];

    return (
        <div className="flex justify-center mb-8">
            <svg width="300" height="300" viewBox="0 0 300 300">
                {parts.slice(0, wrongGuesses)}
            </svg>
        </div>
    );
};

export default Hangman;
