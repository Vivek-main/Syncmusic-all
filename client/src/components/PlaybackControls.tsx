import React, { useState } from 'react';
import { cn } from '@/utils/cn';
import { RefreshCw, Volume2, SkipForward, Play, Pause } from 'lucide-react';
import { Socket } from 'socket.io-client';

interface PlaybackControlsProps {
    currentTime: number;
    duration: number;
    playing: boolean;
    isHost: boolean;
    syncStatus: string;
    onRequestSync: () => void;
    setVolume: (volume: number) => void;
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

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
    currentTime,
    duration,
    playing,
    isHost,
    syncStatus,
    onRequestSync,
    setVolume,
    seekTo,
    togglePlay,
    socket,
    roomId,
}) => {
    const [localVolume, setLocalVolume] = useState(100);
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

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
                <div className="relative h-2 bg-slate-200 rounded-full flex items-center shadow-inner">
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
            <div className="flex items-center justify-between">
                
                {/* Left: Playback State & Volume */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        {isHost ? (
                            <button 
                                onClick={togglePlay}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-primary-100 text-primary-600 hover:bg-primary-200 transition-colors"
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
                        <span className="text-slate-600 text-xs font-medium w-12 hidden sm:block">
                            {playing ? 'Playing' : 'Paused'}
                        </span>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 bg-dark-600/30 px-3 py-1.5 rounded-full">
                        <Volume2 className="w-3.5 h-3.5 text-gray-400" />
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={localVolume}
                            onChange={handleVolumeChange}
                            className="w-20 h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-primary-500"
                        />
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
                            className="text-xs px-3 py-1.5 rounded-lg bg-dark-600 hover:bg-dark-500 text-white transition-colors flex items-center gap-1 font-medium shadow-sm"
                        >
                            <SkipForward className="w-3 h-3" /> Next
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};