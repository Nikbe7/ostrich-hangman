import React from 'react';

interface HangmanProps {
    wrongGuesses: number;
}

const Hangman: React.FC<HangmanProps> = ({ wrongGuesses }) => {
    const partStyle = (index: number) => ({
        opacity: wrongGuesses > index ? 1 : 0,
        transition: 'opacity 0.4s ease-in',
    });

    return (
        <div className="flex justify-center mb-8 relative">
            <svg width="300" height="300" viewBox="0 0 300 300">
                {/* GHOST LAYER (All parts visible but faint) */}
                <g opacity="0.1">
                    <line x1="10" y1="250" x2="150" y2="250" stroke="white" strokeWidth="4" />
                    <line x1="80" y1="250" x2="80" y2="20" stroke="white" strokeWidth="4" />
                    <line x1="80" y1="20" x2="200" y2="20" stroke="white" strokeWidth="4" />
                    <line x1="200" y1="20" x2="200" y2="50" stroke="white" strokeWidth="4" />
                    <circle cx="200" cy="80" r="30" stroke="white" strokeWidth="4" fill="transparent" />
                    <line x1="200" y1="110" x2="200" y2="170" stroke="white" strokeWidth="4" />
                    <line x1="200" y1="130" x2="170" y2="160" stroke="white" strokeWidth="4" />
                    <line x1="200" y1="130" x2="230" y2="160" stroke="white" strokeWidth="4" />
                    <line x1="200" y1="170" x2="170" y2="220" stroke="white" strokeWidth="4" />
                    <line x1="200" y1="170" x2="230" y2="220" stroke="white" strokeWidth="4" />
                </g>

                {/* ACTIVE LAYER (Parts appear based on wrongGuesses) */}
                <line x1="10" y1="250" x2="150" y2="250" stroke="white" strokeWidth="4" style={partStyle(0)} />
                <line x1="80" y1="250" x2="80" y2="20" stroke="white" strokeWidth="4" style={partStyle(1)} />
                <line x1="80" y1="20" x2="200" y2="20" stroke="white" strokeWidth="4" style={partStyle(2)} />
                <line x1="200" y1="20" x2="200" y2="50" stroke="white" strokeWidth="4" style={partStyle(3)} />
                <circle cx="200" cy="80" r="30" stroke="white" strokeWidth="4" fill="transparent" style={partStyle(4)} />
                <line x1="200" y1="110" x2="200" y2="170" stroke="white" strokeWidth="4" style={partStyle(5)} />
                <line x1="200" y1="130" x2="170" y2="160" stroke="white" strokeWidth="4" style={partStyle(6)} />
                <line x1="200" y1="130" x2="230" y2="160" stroke="white" strokeWidth="4" style={partStyle(7)} />
                <line x1="200" y1="170" x2="170" y2="220" stroke="white" strokeWidth="4" style={partStyle(8)} />
                <line x1="200" y1="170" x2="230" y2="220" stroke="white" strokeWidth="4" style={partStyle(9)} />
            </svg>
        </div>
    );
};

export default Hangman;
