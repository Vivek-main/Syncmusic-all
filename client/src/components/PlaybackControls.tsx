/**
 * Playback Controls Component
 * Shows playback progress and current time
 * Host sees a message about using YouTube controls
 */

import React from 'react';
import { cn } from '@/utils/cn';
import { RefreshCw } from 'lucide-react';

interface PlaybackControlsProps {
    currentTime: number;
    duration: number;
    playing: boolean;
    isHost: boolean;
    syncStatus: string;
    onRequestSync: () => void;
}

function formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
    currentTime,
    duration,
    playing,
    isHost,
    syncStatus,
    onRequestSync,
}) => {
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="glass-card p-4 space-y-3">
            {/* Progress Bar */}
            <div className="space-y-1">
                <div className="relative h-1.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                    <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(139,92,246,0.3)]"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Time Display */}
                <div className="flex justify-between text-xs text-slate-500 font-mono font-medium">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            {/* Status Bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div
                        className={cn(
                            'w-2.5 h-2.5 rounded-full shadow-sm',
                            playing ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-slate-300'
                        )}
                    />
                    <span className="text-slate-600 text-xs font-medium">
                        {playing ? 'Playing' : 'Paused'}
                    </span>
                </div>

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
                        <span className="text-xs text-gray-500">
                            Use player controls above
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};