'use client';

import { motion } from 'framer-motion';

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } }
};

export default function Hero() {
    return (
        <motion.div variants={itemVariants} className="text-center space-y-4 sm:space-y-5 relative z-20">
            <motion.div
                initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="relative inline-block mb-3"
            >
                {/* Pulsing ring behind avatar */}
                <motion.div
                    className="absolute inset-[-8px] rounded-full border-2 border-brand-primary/40"
                    animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute inset-[-16px] rounded-full border border-brand-primary/20"
                    animate={{ scale: [1, 1.25, 1], opacity: [0.2, 0.05, 0.2] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                />
                <div className="p-1 rounded-full bg-brand-primary/10 border border-brand-primary/30 shadow-[0_0_40px_rgba(5,150,105,0.3)] overflow-hidden w-24 h-24 relative">
                    <img src="/ostrich.png" alt="Ostrich Hangman" className="object-cover w-full h-full rounded-full bg-black" />
                </div>
            </motion.div>

            {/* Animated title with staggered word reveal */}
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                {'Välkommen till'.split(' ').map((word, i) => (
                    <motion.span
                        key={i}
                        initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        transition={{ delay: 0.3 + i * 0.12, duration: 0.6, ease: "easeOut" }}
                        className="inline-block mr-3 text-gray-300"
                    >
                        {word}
                    </motion.span>
                ))}
                <br />
                <motion.span
                    initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ delay: 0.6, duration: 0.6, ease: "easeOut" }}
                    className="inline-block mr-3 text-white"
                >
                    Team Ostrich
                </motion.span>
                <br />
                <motion.span
                    initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    transition={{ delay: 0.9, duration: 0.7, type: "spring", stiffness: 120 }}
                    className="inline-block bg-gradient-to-r from-brand-primary via-emerald-300 to-teal-400 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(5,150,105,0.5)] text-4xl sm:text-6xl pb-2"
                >
                    Hänga Gubbe
                </motion.span>
            </h1>
        </motion.div>
    );
}
