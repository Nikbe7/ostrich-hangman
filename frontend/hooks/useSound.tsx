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
    // Initialize state from localStorage if available, otherwise default to false (sound on)
    const [isMuted, setIsMuted] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('ostrich_muted');
            return saved === 'true';
        }
        return false;
    });

    const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);

    // Save to localStorage whenever mute state changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('ostrich_muted', String(isMuted));
        }
    }, [isMuted]);

    // Lazy initialization for AudioContext. Unlocks reliably upon first user interaction function call
    const getAudioContext = useCallback(() => {
        if (typeof window === 'undefined') return null;

        let ctx = audioCtx;
        if (!ctx) {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            if (Ctx) {
                ctx = new Ctx();
                setAudioCtx(ctx);
            }
        }

        // Browsers put AudioContext in 'suspended' state until a user interacts
        if (ctx && ctx.state === 'suspended') {
            ctx.resume().catch(err => console.warn("Could not resume AudioContext:", err));
        }
        return ctx;
    }, [audioCtx]);

    const playTone = useCallback((freq: number, type: OscillatorType, duration: number, volume: number = 0.1) => {
        if (isMuted) return;

        const ctx = getAudioContext();
        if (!ctx) return;

        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);

            gain.gain.setValueAtTime(volume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch (e) {
            console.error("Audio playback failed:", e);
        }
    }, [isMuted, getAudioContext]);

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

    const toggleMute = () => {
        // If unmuting, try to prime the audio context immediately
        if (isMuted) {
            getAudioContext();
        }
        setIsMuted(prev => !prev);
    };

    return (
        <SoundContext.Provider value={{ isMuted, toggleMute, playCorrect, playWrong, playWin, playLoss }}>
            {children}
        </SoundContext.Provider>
    );
};
