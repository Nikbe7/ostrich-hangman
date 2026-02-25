'use client';

import { motion } from 'framer-motion';

interface OstrichAnimationProps {
    onComplete: () => void;
}

/**
 * A polished animated SVG ostrich with gradients, detailed feathers,
 * sunglasses, and a multi-phase fly-away animation.
 */
export default function OstrichAnimation({ onComplete }: OstrichAnimationProps) {
    const dur = 4.2; // Longer duration — more idle time before flight

    return (
        <motion.div
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
        >
            {/* Subtle radial glow behind the bird */}
            <motion.div
                className="absolute w-[400px] h-[400px] rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(5,150,105,0.15) 0%, transparent 70%)' }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: [0, 0.8, 0.8, 0], scale: [0.5, 1.2, 1.2, 2] }}
                transition={{ duration: dur, times: [0, 0.15, 0.55, 0.85] }}
            />

            {/* Feather particles */}
            {[...Array(18)].map((_, i) => (
                <motion.div
                    key={`f-${i}`}
                    className="absolute rounded-full"
                    style={{
                        width: `${3 + Math.random() * 5}px`,
                        height: `${3 + Math.random() * 5}px`,
                        background: ['#059669', '#7c3aed', '#3b82f6', '#dc2626', '#fbbf24'][i % 5],
                    }}
                    initial={{ opacity: 0, x: 0, y: 0 }}
                    animate={{
                        opacity: [0, 0, 0.9, 0],
                        x: (Math.random() - 0.5) * 700,
                        y: [0, 0, -(80 + Math.random() * 300), 200 + Math.random() * 200],
                        rotate: Math.random() * 900 - 450,
                    }}
                    transition={{
                        duration: dur,
                        times: [0, 0.58, 0.72, 0.95],
                        delay: Math.random() * 0.4,
                        ease: 'easeOut',
                    }}
                />
            ))}

            {/* Entire bird — global position: idle → bounce → fly off */}
            <motion.div
                className="relative"
                initial={{ x: 0, y: 60 }}
                animate={{
                    //       idle............  wobble..... hop......  hop2..... LAUNCH............
                    x: [0, 0, 0, 0, 3, -3, 8, -5, 15, 60, 300, 800],
                    y: [60, 60, 60, 60, 50, 60, 20, 60, -10, -120, -550, -1500],
                }}
                transition={{
                    duration: dur,
                    times: [0, 0.12, 0.24, 0.36, 0.42, 0.48, 0.54, 0.58, 0.63, 0.70, 0.82, 1],
                    ease: 'easeIn',
                }}
                onAnimationComplete={onComplete}
            >
                <svg
                    width="280"
                    height="320"
                    viewBox="0 0 280 320"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="drop-shadow-[0_0_40px_rgba(5,150,105,0.4)]"
                >
                    <defs>
                        {/* Body gradient */}
                        <radialGradient id="bodyGrad" cx="50%" cy="40%" r="60%">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="60%" stopColor="#059669" />
                            <stop offset="100%" stopColor="#065f46" />
                        </radialGradient>
                        {/* Wing gradient */}
                        <linearGradient id="wingGradL" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#7c3aed" />
                            <stop offset="40%" stopColor="#3b82f6" />
                            <stop offset="70%" stopColor="#059669" />
                            <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                        <linearGradient id="wingGradR" x1="100%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#7c3aed" />
                            <stop offset="40%" stopColor="#3b82f6" />
                            <stop offset="70%" stopColor="#059669" />
                            <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                        {/* Lens gradient */}
                        <linearGradient id="lensGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#1a1a2e" />
                            <stop offset="100%" stopColor="#0d0d1a" />
                        </linearGradient>
                        {/* Sunlight reflection */}
                        <linearGradient id="sunReflect" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
                            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.3" />
                        </linearGradient>
                    </defs>

                    {/* ===== TAIL FEATHERS ===== */}
                    <motion.g
                        style={{ transformOrigin: '140px 235px' }}
                        animate={{ rotate: [0, 0, 0, 0, 4, -4, 6, -6, 8, -3, 0] }}
                        transition={{ duration: dur, times: [0, 0.24, 0.36, 0.40, 0.46, 0.52, 0.56, 0.62, 0.68, 0.78, 1], ease: 'linear' }}
                    >
                        <ellipse cx="120" cy="245" rx="14" ry="25" fill="#7c3aed" opacity="0.8" transform="rotate(-25 120 245)" />
                        <ellipse cx="130" cy="248" rx="12" ry="28" fill="#3b82f6" opacity="0.8" transform="rotate(-12 130 248)" />
                        <ellipse cx="140" cy="250" rx="11" ry="30" fill="#059669" opacity="0.9" />
                        <ellipse cx="150" cy="248" rx="12" ry="28" fill="#3b82f6" opacity="0.8" transform="rotate(12 150 248)" />
                        <ellipse cx="160" cy="245" rx="14" ry="25" fill="#7c3aed" opacity="0.8" transform="rotate(25 160 245)" />
                    </motion.g>

                    {/* ===== LEFT WING ===== */}
                    <motion.g
                        style={{ transformOrigin: '130px 175px' }}
                        animate={{
                            rotate: [
                                0, 0, 0, 0,        // idle (0–0.36)
                                -25, 10,             // first flap
                                -40, 15,             // second
                                -55, 20,             // third
                                -70, 25,             // frantic
                                -80, -50,            // flight lean
                            ],
                        }}
                        transition={{
                            duration: dur,
                            times: [0, 0.12, 0.24, 0.36, 0.42, 0.46, 0.50, 0.54, 0.58, 0.62, 0.66, 0.70, 0.80, 1],
                            ease: 'linear',
                        }}
                    >
                        {/* Outer feather layer */}
                        <ellipse cx="78" cy="168" rx="58" ry="16" fill="#7c3aed" transform="rotate(-18 78 168)" />
                        <ellipse cx="82" cy="163" rx="52" ry="14" fill="#3b82f6" transform="rotate(-12 82 163)" />
                        <ellipse cx="88" cy="170" rx="48" ry="13" fill="url(#wingGradL)" transform="rotate(-22 88 170)" />
                        {/* Inner feather detail */}
                        <ellipse cx="95" cy="165" rx="40" ry="11" fill="#10b981" transform="rotate(-15 95 165)" />
                        <ellipse cx="100" cy="168" rx="32" ry="9" fill="#34d399" opacity="0.5" transform="rotate(-10 100 168)" />
                        {/* Feather line details */}
                        <line x1="60" y1="163" x2="110" y2="170" stroke="#065f46" strokeWidth="0.5" opacity="0.4" />
                        <line x1="65" y1="168" x2="108" y2="173" stroke="#065f46" strokeWidth="0.5" opacity="0.3" />
                    </motion.g>

                    {/* ===== RIGHT WING ===== */}
                    <motion.g
                        style={{ transformOrigin: '150px 175px' }}
                        animate={{
                            rotate: [
                                0, 0, 0, 0,
                                25, -10,
                                40, -15,
                                55, -20,
                                70, -25,
                                80, 50,
                            ],
                        }}
                        transition={{
                            duration: dur,
                            times: [0, 0.12, 0.24, 0.36, 0.42, 0.46, 0.50, 0.54, 0.58, 0.62, 0.66, 0.70, 0.80, 1],
                            ease: 'linear',
                        }}
                    >
                        <ellipse cx="202" cy="168" rx="58" ry="16" fill="#7c3aed" transform="rotate(18 202 168)" />
                        <ellipse cx="198" cy="163" rx="52" ry="14" fill="#3b82f6" transform="rotate(12 198 163)" />
                        <ellipse cx="192" cy="170" rx="48" ry="13" fill="url(#wingGradR)" transform="rotate(22 192 170)" />
                        <ellipse cx="185" cy="165" rx="40" ry="11" fill="#10b981" transform="rotate(15 185 165)" />
                        <ellipse cx="180" cy="168" rx="32" ry="9" fill="#34d399" opacity="0.5" transform="rotate(10 180 168)" />
                        <line x1="220" y1="163" x2="170" y2="170" stroke="#065f46" strokeWidth="0.5" opacity="0.4" />
                        <line x1="215" y1="168" x2="172" y2="173" stroke="#065f46" strokeWidth="0.5" opacity="0.3" />
                    </motion.g>

                    {/* ===== BODY ===== */}
                    <ellipse cx="140" cy="195" rx="48" ry="58" fill="url(#bodyGrad)" />
                    {/* Chest highlight */}
                    <ellipse cx="140" cy="185" rx="30" ry="38" fill="#34d399" opacity="0.15" />
                    {/* Belly shading */}
                    <ellipse cx="140" cy="215" rx="35" ry="30" fill="#065f46" opacity="0.3" />
                    {/* Subtle feather texture lines on body */}
                    <path d="M118 180 Q130 175 140 180 Q150 175 162 180" stroke="#065f46" strokeWidth="0.8" fill="none" opacity="0.3" />
                    <path d="M115 195 Q130 190 140 195 Q150 190 165 195" stroke="#065f46" strokeWidth="0.8" fill="none" opacity="0.25" />
                    <path d="M118 210 Q130 205 140 210 Q150 205 162 210" stroke="#065f46" strokeWidth="0.8" fill="none" opacity="0.2" />

                    {/* ===== LEGS ===== */}
                    <motion.g
                        style={{ transformOrigin: '125px 248px' }}
                        animate={{ rotate: [0, 0, 0, 0, 18, -18, 25, -25, 30, -12, 0] }}
                        transition={{ duration: dur, times: [0, 0.24, 0.36, 0.40, 0.46, 0.52, 0.56, 0.62, 0.68, 0.78, 1], ease: 'linear' }}
                    >
                        <line x1="125" y1="248" x2="112" y2="298" stroke="#f97316" strokeWidth="5" strokeLinecap="round" />
                        <line x1="112" y1="298" x2="100" y2="304" stroke="#f97316" strokeWidth="4" strokeLinecap="round" />
                        <line x1="112" y1="298" x2="108" y2="308" stroke="#f97316" strokeWidth="3.5" strokeLinecap="round" />
                        <line x1="112" y1="298" x2="120" y2="306" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
                    </motion.g>
                    <motion.g
                        style={{ transformOrigin: '155px 248px' }}
                        animate={{ rotate: [0, 0, 0, 0, -18, 18, -25, 25, -30, 12, 0] }}
                        transition={{ duration: dur, times: [0, 0.24, 0.36, 0.40, 0.46, 0.52, 0.56, 0.62, 0.68, 0.78, 1], ease: 'linear' }}
                    >
                        <line x1="155" y1="248" x2="168" y2="298" stroke="#f97316" strokeWidth="5" strokeLinecap="round" />
                        <line x1="168" y1="298" x2="180" y2="304" stroke="#f97316" strokeWidth="4" strokeLinecap="round" />
                        <line x1="168" y1="298" x2="172" y2="308" stroke="#f97316" strokeWidth="3.5" strokeLinecap="round" />
                        <line x1="168" y1="298" x2="160" y2="306" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
                    </motion.g>

                    {/* ===== NECK + HEAD ===== */}
                    <motion.g
                        style={{ transformOrigin: '140px 155px' }}
                        animate={{ rotate: [0, 0, 0, 0, 4, -3, 6, -4, 10, -6, -18] }}
                        transition={{ duration: dur, times: [0, 0.12, 0.24, 0.36, 0.42, 0.48, 0.54, 0.60, 0.66, 0.75, 1], ease: 'linear' }}
                    >
                        {/* Neck */}
                        <path
                            d="M140 160 Q138 125 136 95 Q134 72 138 58"
                            stroke="#059669"
                            strokeWidth="20"
                            strokeLinecap="round"
                            fill="none"
                        />
                        <path
                            d="M140 160 Q138 125 136 95 Q134 72 138 58"
                            stroke="#10b981"
                            strokeWidth="13"
                            strokeLinecap="round"
                            fill="none"
                            opacity="0.35"
                        />
                        {/* Neck highlight stripe */}
                        <path
                            d="M140 155 Q139 130 137 105 Q136 85 137 68"
                            stroke="#34d399"
                            strokeWidth="4"
                            strokeLinecap="round"
                            fill="none"
                            opacity="0.2"
                        />

                        {/* === HEAD === */}
                        <motion.g
                            style={{ transformOrigin: '138px 52px' }}
                            animate={{ rotate: [0, 0, 2, -2, 0, -4, 4, -6, 6, -4, -8] }}
                            transition={{ duration: dur, times: [0, 0.20, 0.28, 0.34, 0.40, 0.46, 0.52, 0.58, 0.64, 0.74, 1], ease: 'linear' }}
                        >
                            {/* Head shape */}
                            <ellipse cx="138" cy="52" rx="24" ry="20" fill="#059669" />
                            <ellipse cx="138" cy="49" rx="20" ry="16" fill="#10b981" opacity="0.25" />

                            {/* Crest / hair feathers */}
                            <ellipse cx="126" cy="34" rx="4" ry="13" fill="#065f46" transform="rotate(-20 126 34)" />
                            <ellipse cx="132" cy="30" rx="3.5" ry="14" fill="#7c3aed" transform="rotate(-10 132 30)" />
                            <ellipse cx="138" cy="28" rx="3" ry="15" fill="#059669" />
                            <ellipse cx="144" cy="30" rx="3.5" ry="14" fill="#3b82f6" transform="rotate(10 144 30)" />
                            <ellipse cx="150" cy="34" rx="4" ry="13" fill="#065f46" transform="rotate(20 150 34)" />
                            {/* Extra wispy feather */}
                            <ellipse cx="135" cy="32" rx="2.5" ry="11" fill="#10b981" opacity="0.6" transform="rotate(-5 135 32)" />
                            <ellipse cx="141" cy="31" rx="2.5" ry="12" fill="#06b6d4" opacity="0.4" transform="rotate(5 141 31)" />

                            {/* Beak */}
                            <path d="M160 53 L182 49 L165 62 Z" fill="#f97316" />
                            <path d="M160 56 L178 52 L165 62 Z" fill="#ea580c" />
                            {/* Beak nostril */}
                            <circle cx="168" cy="54" r="1.2" fill="#c2410c" opacity="0.5" />

                            {/* === SUNGLASSES === */}
                            {/* Left lens */}
                            <rect x="119" y="44" width="19" height="14" rx="4" fill="url(#lensGrad)" stroke="#222" strokeWidth="2" />
                            {/* Right lens */}
                            <rect x="142" y="44" width="19" height="14" rx="4" fill="url(#lensGrad)" stroke="#222" strokeWidth="2" />
                            {/* Bridge */}
                            <path d="M138 50 Q140 48 142 50" stroke="#222" strokeWidth="2.5" fill="none" />
                            {/* Left temple arm */}
                            <line x1="119" y1="49" x2="110" y2="47" stroke="#222" strokeWidth="2" strokeLinecap="round" />
                            {/* Right temple curve (follows head) */}
                            <path d="M161 49 Q164 48 166 50" stroke="#222" strokeWidth="2" fill="none" strokeLinecap="round" />

                            {/* Sunlight reflections on lenses */}
                            <rect x="123" y="47" width="7" height="4" rx="1.5" fill="url(#sunReflect)" />
                            <rect x="146" y="47" width="7" height="4" rx="1.5" fill="url(#sunReflect)" />
                            {/* Small secondary glint */}
                            <circle cx="132" cy="54" r="1.5" fill="#fbbf24" opacity="0.3" />
                            <circle cx="155" cy="54" r="1.5" fill="#fbbf24" opacity="0.3" />

                            {/* Sun ray glints — twinkling */}
                            <motion.g
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ repeat: Infinity, duration: 0.6 }}
                            >
                                <line x1="127" y1="42" x2="128" y2="38" stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round" />
                                <line x1="131" y1="42" x2="131" y2="37" stroke="#fbbf24" strokeWidth="1" strokeLinecap="round" />
                                <line x1="135" y1="43" x2="134" y2="39" stroke="#fbbf24" strokeWidth="0.8" strokeLinecap="round" />
                                <line x1="150" y1="42" x2="151" y2="38" stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round" />
                                <line x1="154" y1="42" x2="154" y2="37" stroke="#fbbf24" strokeWidth="1" strokeLinecap="round" />
                                <line x1="158" y1="43" x2="157" y2="39" stroke="#fbbf24" strokeWidth="0.8" strokeLinecap="round" />
                            </motion.g>
                        </motion.g>
                    </motion.g>
                </svg>
            </motion.div>

            {/* Emerald flash at takeoff */}
            <motion.div
                className="absolute inset-0 bg-brand-primary/15"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0, 0.5, 0] }}
                transition={{ duration: dur, times: [0, 0.62, 0.72, 0.88] }}
            />
        </motion.div>
    );
}
