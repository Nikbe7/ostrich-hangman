'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

interface SoundContextType {
    isMuted: boolean;
    toggleMute: () => void;
    playCorrect: () => void;
    playWrong: () => void;
    playWin: () => void;
    playLoss: () => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export const useSound = () => {
    const context = useContext(SoundContext);
    if (!context) {
        throw new Error('useSound must be used within a SoundProvider');
    }
    return context;
};

export const SoundProvider = ({ children }: { children: ReactNode }): JSX.Element => {
    const [isMuted, setIsMuted] = useState(false);
    const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);

    useEffect(() => {
        const initCtx = () => {
            if (!audioCtx && typeof window !== 'undefined') {
                const Ctx = window.AudioContext || (window as any).webkitAudioContext;
                if (Ctx) setAudioCtx(new Ctx());
            }
        };
        window.addEventListener('click', initCtx, { once: true });
        return () => window.removeEventListener('click', initCtx);
    }, [audioCtx]);

    const playTone = useCallback((freq: number, type: OscillatorType, duration: number, volume: number = 0.1) => {
        if (isMuted || !audioCtx) return;

        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

        gain.gain.setValueAtTime(volume, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    }, [isMuted, audioCtx]);

    const playCorrect = useCallback(() => {
        playTone(660, 'sine', 0.1, 0.1);
        setTimeout(() => playTone(880, 'sine', 0.2, 0.1), 100);
    }, [playTone]);

    const playWrong = useCallback(() => {
        playTone(220, 'triangle', 0.3, 0.15);
    }, [playTone]);

    const playWin = useCallback(() => {
        [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
            setTimeout(() => playTone(f, 'sine', 0.4, 0.1), i * 150);
        });
    }, [playTone]);

    const playLoss = useCallback(() => {
        playTone(196, 'sawtooth', 0.5, 0.1);
        setTimeout(() => playTone(146, 'sawtooth', 0.6, 0.1), 200);
    }, [playTone]);

    const toggleMute = () => setIsMuted(prev => !prev);

    return (
        <SoundContext.Provider value= {{ isMuted, toggleMute, playCorrect, playWrong, playWin, playLoss }
}>
    { children }
    </SoundContext.Provider>
    );
};
