import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HangmanProps {
    wrongGuesses: number;
    status?: 'waiting' | 'choosing' | 'playing' | 'finished';
    isWin?: boolean;
}

const Hangman: React.FC<HangmanProps> = ({ wrongGuesses, status = 'playing', isWin = false }) => {
    // Sequence states for win animation
    const [winPhase, setWinPhase] = useState<'none' | 'smile' | 'drop' | 'dance'>('none');

    const isFinished = status === 'finished';
    const isLoss = isFinished && !isWin;

    useEffect(() => {
        if (isFinished && isWin) {
            setWinPhase('smile');
            const timer1 = setTimeout(() => setWinPhase('drop'), 1500); // 1.5s to smile before drop
            const timer2 = setTimeout(() => setWinPhase('dance'), 3000); // 1.5s to drop/say thanks before dancing
            return () => { clearTimeout(timer1); clearTimeout(timer2); };
        } else {
            setWinPhase('none');
        }
    }, [isFinished, isWin]);

    // Shared transition for drawing parts
    const drawTransition = { duration: 0.6, ease: "easeOut" as const };

    // Helper to calculate animation state based on index
    const getAnimState = (index: number) => {
        const isVisible = (isFinished && isWin) || wrongGuesses > index;
        return {
            pathLength: isVisible ? 1 : 0,
            opacity: isVisible ? 1 : 0,
        };
    };

    const isDropped = winPhase === 'drop' || winPhase === 'dance';
    const isDancing = winPhase === 'dance';

    // Body animation variants
    const bodyVariants = {
        normal: { y: 0, rotate: 0 },
        drop: {
            y: 80, // Drop down 80px to stand on the ground
            rotate: 0,
            transition: { type: "spring" as const, bounce: 0.3, duration: 1 }
        },
        dance: {
            y: [80, 70, 80, 70, 80], // Bouncing while remaining at dropped height
            rotate: [0, -10, 10, -10, 10, 0],
            transition: {
                y: { repeat: Infinity, duration: 0.5, ease: "easeInOut" as const },
                rotate: { repeat: Infinity, duration: 1.5, ease: "easeInOut" as const }
            }
        },
        loss: {
            y: 0,
            rotate: [0, 8, -6, 4, -2, 0], // More pendulum-like decay
            transition: {
                rotate: { repeat: Infinity, duration: 4, ease: "easeInOut" as const }
            }
        }
    };

    // Determine current variant state
    let bodyState = "normal";
    if (isLoss) bodyState = "loss";
    if (winPhase === 'drop') bodyState = "drop";
    if (winPhase === 'dance') bodyState = "dance";

    const transformOrigin = isLoss ? "200px 60px" : "200px 150px";

    return (
        <div className="flex justify-center mb-10 relative mt-4">
            {/* Soft background glow - changes to red pulse on loss */}
            <motion.div
                className="absolute inset-0 blur-[50px] rounded-full"
                animate={{
                    backgroundColor: isLoss ? "rgba(239, 68, 68, 0.2)" : "rgba(20, 184, 166, 0.05)",
                    scale: isLoss ? [1, 1.2, 1] : 1
                }}
                transition={{
                    backgroundColor: { duration: 1 },
                    scale: isLoss ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : { duration: 0 }
                }}
            />

            <svg width="320" height="320" viewBox="0 0 350 350" className="drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] relative z-10 overflow-visible">
                {/* Disco lights for win - Only active during dance phase - SVG based strobes */}
                <AnimatePresence>
                    {isDancing && (
                        <motion.g
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            {/* Left purple strobe */}
                            <motion.polygon
                                points="100,-20 160,280 40,280"
                                fill="url(#strobe-purple)"
                                animate={{ opacity: [0.1, 0.6, 0.1, 0.8, 0.2] }}
                                transition={{ repeat: Infinity, duration: 0.5 }}
                                style={{ mixBlendMode: 'screen' }}
                            />
                            {/* Center green strobe */}
                            <motion.polygon
                                points="175,-20 235,280 115,280"
                                fill="url(#strobe-green)"
                                animate={{ opacity: [0.4, 0.8, 0.3, 0.9, 0.2] }}
                                transition={{ repeat: Infinity, duration: 0.7 }}
                                style={{ mixBlendMode: 'screen' }}
                            />
                            {/* Right pink strobe */}
                            <motion.polygon
                                points="250,-20 310,280 190,280"
                                fill="url(#strobe-pink)"
                                animate={{ opacity: [0.2, 0.7, 0.1, 0.6, 0.3] }}
                                transition={{ repeat: Infinity, duration: 0.6 }}
                                style={{ mixBlendMode: 'screen' }}
                            />
                        </motion.g>
                    )}
                </AnimatePresence>

                {/* Definitions for gradient lights */}
                <defs>
                    <linearGradient id="strobe-purple" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#c084fc" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="strobe-green" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="strobe-pink" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f472b6" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#f472b6" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* GHOST LAYER */}
                <motion.g animate={{ opacity: (isFinished && isWin) ? 0 : 0.05 }} stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="20" y1="280" x2="140" y2="280" />
                    <line x1="80" y1="280" x2="80" y2="20" />
                    <line x1="80" y1="20" x2="200" y2="20" />
                    <line x1="200" y1="20" x2="200" y2="60" />
                    <circle cx="200" cy="90" r="30" fill="transparent" />
                    <line x1="200" y1="120" x2="200" y2="180" />
                    <line x1="200" y1="135" x2="160" y2="175" />
                    <line x1="200" y1="135" x2="240" y2="175" />
                    <line x1="200" y1="180" x2="165" y2="240" />
                    <line x1="200" y1="180" x2="235" y2="240" />
                </motion.g>

                {/* ACTIVE ANIMATED LAYER - Gallows */}
                <g stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="transparent">
                    {/* Base */}
                    <motion.line x1="20" y1="280" x2="140" y2="280" initial={{ pathLength: 0, opacity: 0 }} animate={getAnimState(0)} transition={drawTransition} />
                    {/* Pole */}
                    <motion.line x1="80" y1="280" x2="80" y2="20" initial={{ pathLength: 0, opacity: 0 }} animate={getAnimState(1)} transition={drawTransition} />
                    {/* Top */}
                    <motion.line x1="80" y1="20" x2="200" y2="20" initial={{ pathLength: 0, opacity: 0 }} animate={getAnimState(2)} transition={drawTransition} />

                    {/* Rope (disappears when dropping) */}
                    <motion.line
                        x1="200" y1="20" x2="200" y2="60"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={isDropped ? { opacity: 0 } : getAnimState(3)}
                        transition={drawTransition}
                        stroke="#ffffff" strokeWidth="4"
                    />

                    {/* Figure Group (animates on win/loss) */}
                    <motion.g
                        variants={bodyVariants}
                        initial="normal"
                        animate={bodyState}
                        style={{ transformOrigin }}
                    >
                        {/* Head */}
                        <motion.circle cx="200" cy="90" r="30" initial={{ pathLength: 0, opacity: 0 }} animate={getAnimState(4)} transition={drawTransition} />

                        {/* Eyes & Mouth (Dead vs Alive) */}
                        <AnimatePresence>
                            {((wrongGuesses > 4) || (isFinished && isWin)) && (
                                <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                                    {isLoss ? (
                                        <>
                                            {/* Dead eyes (X) */}
                                            <line x1="185" y1="80" x2="195" y2="90" strokeWidth="3" />
                                            <line x1="195" y1="80" x2="185" y2="90" strokeWidth="3" />
                                            <line x1="205" y1="80" x2="215" y2="90" strokeWidth="3" />
                                            <line x1="215" y1="80" x2="205" y2="90" strokeWidth="3" />
                                            {/* Frown */}
                                            <path d="M 190 105 Q 200 95 210 105" strokeWidth="3" />
                                        </>
                                    ) : (
                                        <>
                                            {/* Alive / Win eyes and smile. Shown immediately on win. */}
                                            {winPhase !== 'none' ? (
                                                <>
                                                    <path d="M 185 85 Q 190 75 195 85" strokeWidth="3" />
                                                    <path d="M 205 85 Q 210 75 215 85" strokeWidth="3" />
                                                    <path d="M 190 100 Q 200 115 210 100" strokeWidth="3" />
                                                </>
                                            ) : (
                                                <>
                                                    <circle cx="190" cy="85" r="2" fill="white" strokeWidth="0" />
                                                    <circle cx="210" cy="85" r="2" fill="white" strokeWidth="0" />
                                                </>
                                            )}
                                        </>
                                    )}
                                </motion.g>
                            )}
                        </AnimatePresence>

                        {/* Body */}
                        <motion.line x1="200" y1="120" x2="200" y2="180" initial={{ pathLength: 0, opacity: 0 }} animate={getAnimState(5)} transition={drawTransition} />

                        {/* Left Arm : Raise arms while jumping / dancing */}
                        <motion.line
                            x1="200" y1="135"
                            x2={isDropped ? 160 : 160} y2={isDropped ? 100 : 175}
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={getAnimState(6)}
                            transition={drawTransition}
                        />
                        {/* Right Arm */}
                        <motion.line
                            x1="200" y1="135"
                            x2={isDropped ? 240 : 240} y2={isDropped ? 100 : 175}
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={getAnimState(7)}
                            transition={drawTransition}
                        />
                        {/* Left Leg */}
                        <motion.line x1="200" y1="180" x2={isDropped ? 170 : 165} y2={isDropped ? 260 : 240} initial={{ pathLength: 0, opacity: 0 }} animate={getAnimState(8)} transition={drawTransition} />
                        {/* Right Leg */}
                        <motion.line x1="200" y1="180" x2={isDropped ? 230 : 235} y2={isDropped ? 260 : 240} initial={{ pathLength: 0, opacity: 0 }} animate={getAnimState(9)} transition={drawTransition} />

                        {/* Speech Bubble on Win (appears on 'drop', stays for 'dance') */}
                        <AnimatePresence>
                            {isDropped && (
                                <motion.g
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ type: "spring" as const }}
                                >
                                    {/* Position absolute relative to the figure's root, made smaller and moved higher up */}
                                    <path d="M 230 40 Q 230 20 250 20 L 270 20 Q 290 20 290 40 L 290 55 Q 290 75 270 75 L 250 75 L 240 90 L 245 75 Q 230 75 230 55 Z" fill="white" stroke="none" />
                                    <text x="260" y="52" fill="black" fontSize="16" fontWeight="bold" textAnchor="middle" stroke="none">Tack!</text>
                                </motion.g>
                            )}
                        </AnimatePresence>
                    </motion.g>
                </g>
            </svg>
        </div>
    );
};

export default Hangman;
