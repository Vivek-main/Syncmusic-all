/**
 * YouTube Player Component
 * Renders the YouTube IFrame Player container and overlays
 */

import React from 'react';
import { SyncStatus } from '@/types';
import { cn } from '@/utils/cn';
import { Music, Check, RefreshCw, X, Circle } from 'lucide-react';

interface YouTubePlayerProps {
    containerId: string;
    playerReady: boolean;
    videoId: string | null;
    syncStatus: SyncStatus;
    isHost: boolean;
    audioOnly?: boolean;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
    containerId,
    playerReady,
    videoId,
    syncStatus,
    isHost,
    audioOnly = false,
}) => {
    return (
        <div className="relative w-full overflow-hidden rounded-xl" style={{ paddingBottom: '56.25%' /* 16:9 */ }}>
            {/* YouTube IFrame Container - API injects iframe here */}
            <div
                id={containerId}
                className="absolute inset-0 w-full h-full bg-black"
                style={{ opacity: audioOnly ? 0 : 1 }}
            />

            {/* Audio Only Overlay */}
            {audioOnly && videoId && playerReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-dark-800 z-20">
                    <div className="text-center px-6">
                        <div className="flex justify-center mb-4">
                            <div className="w-20 h-20 bg-primary-500/20 rounded-full flex items-center justify-center animate-pulse-slow">
                                <Music className="w-10 h-10 text-primary-500" />
                            </div>
                        </div>
                        <h3 className="text-white font-semibold text-xl mb-2">Audio Only Mode</h3>
                        <p className="text-gray-400 text-sm">Video is hidden to save bandwidth and battery</p>
                    </div>
                </div>
            )}

            {/* Loading Overlay */}
            {!playerReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-dark-800 z-20">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-400 text-sm">Loading player...</p>
                    </div>
                </div>
            )}

            {/* No Video Overlay */}
            {playerReady && !videoId && (
                <div className="absolute inset-0 flex items-center justify-center bg-dark-800 z-20">
                    <div className="text-center px-6">
                        <div className="flex justify-center mb-4">
                            <Music className="w-16 h-16 text-gray-400" />
                        </div>
                        <h3 className="text-white font-semibold text-lg mb-2">
                            {isHost ? 'No video selected' : 'Waiting for host...'}
                        </h3>
                        <p className="text-gray-400 text-sm">
                            {isHost
                                ? 'Paste a YouTube URL below to get started'
                                : 'The host will select a video shortly'}
                        </p>
                    </div>
                </div>
            )}

            {/* Sync Status Badge */}
            {videoId && playerReady && (
                <div className="absolute top-3 right-3 z-30 pointer-events-none">
                    <SyncBadge status={syncStatus} />
                </div>
            )}

            {/* Protection Overlay - completely prevents clicking suggested videos and redirects for EVERYONE */}
            {videoId && playerReady && !audioOnly && (
                <div
                    className="absolute top-0 left-0 right-0 h-[80%] z-10"
                    title="Video interaction disabled to maintain sync"
                />
            )}

            {/* Client Overlay - prevents manual scrubbing on the bottom 20% by non-hosts */}
            {!isHost && videoId && !audioOnly && (
                <div
                    className="absolute bottom-0 left-0 right-0 h-[20%] cursor-not-allowed z-10"
                    title="Only the host can control playback"
                />
            )}
        </div>
    );
};

interface SyncBadgeProps {
    status: SyncStatus;
}

const SyncBadge: React.FC<SyncBadgeProps> = ({ status }) => {
    const config = {
        synced: { color: 'bg-green-500/80', text: 'Synced', icon: <Check className="w-3.5 h-3.5" />, pulse: false },
        syncing: { color: 'bg-yellow-500/80', text: 'Syncing', icon: <RefreshCw className="w-3.5 h-3.5" />, pulse: true },
        desynced: { color: 'bg-red-500/80', text: 'Desynced', icon: <X className="w-3.5 h-3.5" />, pulse: true },
        idle: { color: 'bg-gray-500/80', text: 'Idle', icon: <Circle className="w-3.5 h-3.5" />, pulse: false },
    };

    const { color, text, icon, pulse } = config[status];

    return (
        <div
            className={cn(
                'px-2 py-1 rounded-full text-xs font-medium text-white backdrop-blur-sm flex items-center gap-1',
                color,
                pulse && 'animate-pulse-slow'
            )}
        >
            {icon}
            {text}
        </div>
    );
};