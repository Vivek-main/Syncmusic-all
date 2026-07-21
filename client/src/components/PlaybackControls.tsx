import React, { useState, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { RefreshCw, Volume2, SkipForward, Play, Pause, Sliders } from 'lucide-react';
import { Socket } from 'socket.io-client';

interface PlaybackControlsProps {
    currentTime: number;
    duration: number;
    playing: boolean;
    isHost: boolean;
    syncStatus: string;
    onRequestSync: () => void;
    setVolume: (volume: number) => void;
    setQuality?: (quality: string) => void;
    seekTo: (time: number) => void;
    togglePlay: () => void;
    socket: Socket | null;
    roomId: string;
}

function formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

const REACTIONS = ['💖', '🔥', '🎉', '💯'];
const QUALITIES = ['auto', 'hd1080', 'hd720', 'large', 'medium', 'small', 'tiny'];
const QUALITY_LABELS: Record<string, string> = {
    auto: 'Auto Quality',
    hd1080: '1080p HD',
    hd720: '720p HD',
    large: '480p',
    medium: '360p',
    small: '240p',
    tiny: '144p',
};

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
    currentTime,
    duration,
    playing,
    isHost,
    syncStatus,
    onRequestSync,
    setVolume,
    setQuality,
    seekTo,
    togglePlay,
    socket,
    roomId,
}) => {
    const [localVolume, setLocalVolume] = useState(100);
    const [selectedQuality, setSelectedQuality] = useState('auto');
    const [audioFx, setAudioFx] = useState('normal');
    const [skipVotes, setSkipVotes] = useState({ votes: 0, required: 1, userVoted: false });
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    // Listen to vote skip updates
    useEffect(() => {
        if (!socket) return;

        const handleSkipVotesUpdated = (data: { votes: number; required: number; userVoted?: boolean }) => {
            setSkipVotes(prev => ({
                votes: data.votes,
                required: data.required,
                userVoted: data.userVoted !== undefined ? data.userVoted : prev.userVoted
            }));
        };

        socket.on('skip-votes-updated', handleSkipVotesUpdated);
        return () => {
            socket.off('skip-votes-updated', handleSkipVotesUpdated);
        };
    }, [socket]);

    const handleVoteSkip = () => {
        if (!socket || !roomId) return;
        socket.emit('vote-skip', { roomId });
    };

    // ─── Global Keyboard Hotkeys ──────────────────────────────────────────────
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing inside input or textarea
            const target = e.target as HTMLElement;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return;
            }

            if (e.code === 'Space') {
                e.preventDefault();
                if (isHost) togglePlay();
            } else if (e.code === 'KeyM') {
                e.preventDefault();
                const newVol = localVolume > 0 ? 0 : 100;
                setLocalVolume(newVol);
                setVolume(newVol);
            } else if (e.code === 'ArrowLeft') {
                e.preventDefault();
                if (isHost) seekTo(Math.max(0, currentTime - 5));
            } else if (e.code === 'ArrowRight') {
                e.preventDefault();
                if (isHost) seekTo(Math.min(duration, currentTime + 5));
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [isHost, playing, currentTime, duration, localVolume, togglePlay, seekTo, setVolume]);

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isHost) return;
        const newTime = parseFloat(e.target.value);
        seekTo(newTime);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const vol = parseInt(e.target.value, 10);
        setLocalVolume(vol);
        setVolume(vol);
    };

    const handleQualityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const q = e.target.value;
        setSelectedQuality(q);
        if (setQuality) setQuality(q);
    };

    const handleReaction = (emoji: string) => {
        if (!socket) return;
        socket.emit('send-reaction', { roomId, emoji });
    };

    const handlePlayNext = () => {
        if (!isHost || !socket) return;
        socket.emit('play-next', { roomId });
    };

    return (
        <div className="glass-card p-4 space-y-4">
            {/* Progress Bar */}
            <div className="space-y-1 group">
                <div className="relative h-2 bg-slate-200 dark:bg-dark-700 rounded-full flex items-center shadow-inner">
                    <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.3)] pointer-events-none"
                        style={{ width: `${progress}%` }}
                    />
                    <input
                        type="range"
                        min="0"
                        max={duration || 100}
                        step="0.1"
                        value={currentTime}
                        onChange={handleSeek}
                        disabled={!isHost}
                        className={cn(
                            "absolute inset-0 w-full h-full opacity-0 cursor-pointer",
                            !isHost && "cursor-not-allowed"
                        )}
                        title={isHost ? "Seek" : "Only host can seek"}
                    />
                </div>

                {/* Time Display */}
                <div className="flex justify-between text-xs text-slate-500 font-mono font-medium">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                
                {/* Left: Playback State, Volume, Quality & Audio FX */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        {isHost ? (
                            <button 
                                onClick={togglePlay}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 hover:bg-primary-200 transition-colors shadow-sm"
                                title={playing ? "Pause (Space)" : "Play (Space)"}
                            >
                                {playing ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                            </button>
                        ) : (
                            <div
                                className={cn(
                                    'w-2.5 h-2.5 rounded-full shadow-sm',
                                    playing ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-slate-300'
                                )}
                            />
                        )}
                        <span className="text-slate-600 dark:text-slate-300 text-xs font-medium w-12 hidden sm:block">
                            {playing ? 'Playing' : 'Paused'}
                        </span>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 bg-slate-100 dark:bg-dark-700/60 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                        <Volume2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={localVolume}
                            onChange={handleVolumeChange}
                            className="w-16 h-1 bg-slate-300 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-primary-500"
                        />
                    </div>

                    {/* Quality Selector */}
                    {setQuality && (
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-dark-700/60 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                            <Sliders className="w-3.5 h-3.5 text-slate-500" />
                            <select
                                value={selectedQuality}
                                onChange={handleQualityChange}
                                className="bg-transparent text-slate-700 dark:text-slate-200 font-medium focus:outline-none cursor-pointer text-xs"
                            >
                                {QUALITIES.map(q => (
                                    <option key={q} value={q} className="dark:bg-dark-800 text-slate-900 dark:text-white">
                                        {QUALITY_LABELS[q] || q}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Audio FX Presets */}
                    <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-dark-700/60 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                        <span className="text-slate-500 font-medium">EQ:</span>
                        <select
                            value={audioFx}
                            onChange={(e) => setAudioFx(e.target.value)}
                            className="bg-transparent text-slate-700 dark:text-slate-200 font-medium focus:outline-none cursor-pointer text-xs"
                        >
                            <option value="normal" className="dark:bg-dark-800 text-slate-900 dark:text-white">Normal</option>
                            <option value="bass" className="dark:bg-dark-800 text-slate-900 dark:text-white">Bass Boost</option>
                            <option value="vocal" className="dark:bg-dark-800 text-slate-900 dark:text-white">Vocal Boost</option>
                            <option value="concert" className="dark:bg-dark-800 text-slate-900 dark:text-white">Concert Reverb</option>
                        </select>
                    </div>
                </div>

                {/* Center: Reactions */}
                <div className="flex items-center gap-2">
                    {REACTIONS.map(emoji => (
                        <button
                            key={emoji}
                            onClick={() => handleReaction(emoji)}
                            className="text-xl hover:scale-125 hover:-translate-y-1 transition-transform duration-200"
                            title={`Send ${emoji} reaction`}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    {/* Democracy Vote to Skip */}
                    <button
                        onClick={handleVoteSkip}
                        className={cn(
                            'text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 font-medium shadow-sm border',
                            skipVotes.userVoted
                                ? 'bg-primary-500 text-white border-primary-600 shadow-md'
                                : 'bg-slate-100 dark:bg-dark-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-dark-600 border-slate-200 dark:border-slate-700'
                        )}
                        title="Vote to skip current song"
                    >
                        🗳️ Vote Skip ({skipVotes.votes}/{skipVotes.required})
                    </button>

                    {!isHost && (
                        <button
                            onClick={onRequestSync}
                            className={cn(
                                'text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-medium shadow-sm border',
                                syncStatus === 'synced'
                                    ? 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200'
                                    : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-200'
                            )}
                        >
                            <RefreshCw className="w-3 h-3" /> Re-sync
                        </button>
                    )}

                    {isHost && (
                        <button
                            onClick={handlePlayNext}
                            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 dark:bg-dark-700 dark:hover:bg-dark-600 text-white transition-colors flex items-center gap-1 font-medium shadow-sm"
                        >
                            <SkipForward className="w-3 h-3" /> Next
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};