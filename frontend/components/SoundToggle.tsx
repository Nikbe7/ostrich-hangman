'use client';

import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSound } from '@/hooks/useSound';

export default function SoundToggle() {
    const { isMuted, toggleMute } = useSound();

    return (
        <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleMute}
            className="p-2 rounded-lg bg-black/20 hover:bg-black/40 border border-white/10 text-gray-400 hover:text-white transition-all shadow-sm"
            title={isMuted ? "Ljud av" : "Ljud på"}
        >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </motion.button>
    );
}
