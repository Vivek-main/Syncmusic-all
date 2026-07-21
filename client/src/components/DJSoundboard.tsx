import React, { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { Radio, Volume2, Sparkles, Disc } from 'lucide-react';

interface DJSoundboardProps {
    socket: Socket | null;
    roomId: string;
}

const EFFECTS = [
    { id: 'airhorn', name: 'Airhorn', icon: Volume2, color: 'from-amber-500 to-red-500' },
    { id: 'applause', name: 'Cheer', icon: Sparkles, color: 'from-green-500 to-emerald-600' },
    { id: 'scratch', name: 'Scratch', icon: Disc, color: 'from-blue-500 to-indigo-600' },
    { id: 'drumroll', name: 'Drumroll', icon: Radio, color: 'from-purple-500 to-pink-600' },
];

export const DJSoundboard: React.FC<DJSoundboardProps> = ({ socket, roomId }) => {
    const audioCtxRef = useRef<AudioContext | null>(null);

    const getAudioCtx = () => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
        return audioCtxRef.current;
    };

    // Web Audio Synthesizer for 4 DJ Sound Effects
    const playLocalEffect = (effectId: string) => {
        try {
            const ctx = getAudioCtx();
            const now = ctx.currentTime;

            if (effectId === 'airhorn') {
                // Classic Airhorn Synth (Frequency sweeps)
                const freqs = [466.16, 466.16, 466.16, 466.16, 622.25];
                const times = [0, 0.12, 0.24, 0.36, 0.48];
                freqs.forEach((f, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(f, now + times[i]);
                    osc.frequency.exponentialRampToValueAtTime(f * 1.05, now + times[i] + 0.08);
                    gain.gain.setValueAtTime(0.3, now + times[i]);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + times[i] + 0.1);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + times[i]);
                    osc.stop(now + times[i] + 0.1);
                });
            } else if (effectId === 'applause') {
                // White noise applause simulation
                const bufferSize = ctx.sampleRate * 1.5;
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                const noise = ctx.createBufferSource();
                noise.buffer = buffer;
                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(1000, now);
                filter.Q.setValueAtTime(1, now);
                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.25, now + 0.2);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 1.4);
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                noise.start(now);
                noise.stop(now + 1.5);
            } else if (effectId === 'scratch') {
                // Vinyl Scratch Pitch Glide
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.linearRampToValueAtTime(1200, now + 0.1);
                osc.frequency.linearRampToValueAtTime(150, now + 0.25);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.3);
            } else if (effectId === 'drumroll') {
                // Rapid Drumroll Burst
                for (let i = 0; i < 12; i++) {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    const t = now + i * 0.06;
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(120 - i * 3, t);
                    gain.gain.setValueAtTime(0.4, t);
                    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(t);
                    osc.stop(t + 0.06);
                }
            }
        } catch (err) {
            console.warn('[DJSoundboard] Web Audio error:', err);
        }
    };

    // Listen to live socket soundboard triggers
    useEffect(() => {
        if (!socket) return;

        const handleRemoteSoundboard = ({ effect }: { effect: string; userId: string }) => {
            playLocalEffect(effect);
        };

        socket.on('room-soundboard', handleRemoteSoundboard);
        return () => {
            socket.off('room-soundboard', handleRemoteSoundboard);
        };
    }, [socket]);

    const triggerEffect = (effectId: string) => {
        playLocalEffect(effectId);
        if (socket && roomId) {
            socket.emit('send-soundboard', { roomId, effect: effectId });
        }
    };

    return (
        <div className="glass-card p-4">
            <h3 className="text-slate-900 dark:text-white font-semibold mb-3 text-sm flex items-center gap-2">
                <Radio className="w-4 h-4 text-primary-500" /> Live DJ Soundboard
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {EFFECTS.map((fx) => {
                    const IconComponent = fx.icon;
                    return (
                        <button
                            key={fx.id}
                            onClick={() => triggerEffect(fx.id)}
                            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r ${fx.color} text-white font-medium text-xs shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer`}
                        >
                            <IconComponent className="w-4 h-4" />
                            <span>{fx.name}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
