/**
 * Room Header Component
 * Displays room code, connection status, latency, and action buttons
 */

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { ConnectionStatus } from '@/types';
import { cn } from '@/utils/cn';
import { Copy, Link, Users, QrCode, Sun, Moon, Heart } from 'lucide-react';

interface RoomHeaderProps {
    roomId: string;
    connectionStatus: ConnectionStatus;
    latency: number;
    userCount: number;
    onLeave: () => void;
    onOpenFavorites?: () => void;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
    roomId,
    connectionStatus,
    latency,
    userCount,
    onLeave,
    onOpenFavorites,
}) => {
    const [showQR, setShowQR] = useState(false);
    const joinUrl = `${window.location.origin}/join/${roomId}`;

    const copyRoomId = async () => {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID copied!', { icon: <Copy className="w-4 h-4 text-green-500" /> });
        } catch {
            toast.error('Failed to copy');
        }
    };

    const copyJoinLink = async () => {
        try {
            await navigator.clipboard.writeText(joinUrl);
            toast.success('Join link copied!', { icon: <Link className="w-4 h-4 text-green-500" /> });
        } catch {
            toast.error('Failed to copy');
        }
    };

    const statusConfig = {
        connected: { color: 'text-green-600', dot: 'bg-green-500', label: 'Connected' },
        connecting: { color: 'text-yellow-600', dot: 'bg-yellow-500', label: 'Connecting...' },
        disconnected: { color: 'text-red-600', dot: 'bg-red-500', label: 'Disconnected' },
        reconnecting: { color: 'text-orange-600', dot: 'bg-orange-500', label: 'Reconnecting...' },
    };

    const status = statusConfig[connectionStatus];

    const [isDark, setIsDark] = useState<boolean>(() => {
        return document.documentElement.classList.contains('dark');
    });

    const toggleTheme = () => {
        const nextDark = !isDark;
        setIsDark(nextDark);
        if (nextDark) {
            document.documentElement.classList.add('dark');
            document.body.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            document.body.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    return (
        <div className="glass-card p-4">
            <div className="flex flex-wrap items-center gap-3 justify-between">
                {/* Room Code */}
                <div className="flex items-center gap-3">
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Room Code</p>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-900 dark:text-white font-bold text-2xl font-mono tracking-widest drop-shadow-sm">
                                {roomId}
                            </span>
                            <button
                                onClick={copyRoomId}
                                className="text-primary-600 hover:text-primary-700 transition-colors p-1"
                                title="Copy Room ID"
                            >
                                <Copy className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Status & Actions */}
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Favorites Button */}
                    {onOpenFavorites && (
                        <button
                            onClick={onOpenFavorites}
                            className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 font-medium border border-red-500/20"
                            title="Open Favorite Tracks"
                        >
                            <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                            <span>Favorites</span>
                        </button>
                    )}

                    {/* Theme Switcher Button */}
                    <button
                        onClick={toggleTheme}
                        className="text-xs bg-slate-100 dark:bg-dark-700 hover:bg-slate-200 dark:hover:bg-dark-600 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 font-medium border border-slate-200 dark:border-slate-700"
                        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {isDark ? (
                            <>
                                <Sun className="w-3.5 h-3.5 text-amber-500" />
                                <span>Light</span>
                            </>
                        ) : (
                            <>
                                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Dark</span>
                            </>
                        )}
                    </button>

                    {/* Connection Status */}
                    <div className="flex items-center gap-1.5">
                        <div className={cn('w-2 h-2 rounded-full animate-pulse-slow', status.dot)} />
                        <span className={cn('text-xs font-medium', status.color)}>
                            {status.label}
                        </span>
                    </div>

                    {/* Latency */}
                    {latency > 0 && connectionStatus === 'connected' && (
                        <div className={cn(
                            'text-xs font-mono font-medium px-2 py-0.5 rounded-full border',
                            latency < 50 ? 'text-green-700 bg-green-50 border-green-200' :
                                latency < 150 ? 'text-yellow-700 bg-yellow-50 border-yellow-200' :
                                    'text-red-700 bg-red-50 border-red-200'
                        )}>
                            {latency}ms
                        </div>
                    )}

                    {/* User Count */}
                    <div className="text-xs text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> {userCount}
                    </div>

                    {/* QR Code Button */}
                    <button
                        onClick={() => setShowQR(!showQR)}
                        className="text-xs bg-slate-100 dark:bg-dark-700 hover:bg-slate-200 dark:hover:bg-dark-600 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-medium border border-slate-200 dark:border-slate-700"
                    >
                        <QrCode className="w-3.5 h-3.5" /> QR
                    </button>

                    {/* Share Link */}
                    <button
                        onClick={copyJoinLink}
                        className="text-xs bg-slate-100 dark:bg-dark-700 hover:bg-slate-200 dark:hover:bg-dark-600 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-medium border border-slate-200 dark:border-slate-700"
                    >
                        <Link className="w-3.5 h-3.5" /> Share
                    </button>

                    {/* Leave Room */}
                    <button
                        onClick={onLeave}
                        className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg transition-colors font-medium border border-red-200"
                    >
                        Leave
                    </button>
                </div>
            </div>

            {/* QR Code Modal */}
            {showQR && (
                <div className="mt-4 flex flex-col items-center gap-3 animate-fade-in p-4 bg-white/80 rounded-xl border border-slate-200 backdrop-blur-xl shadow-lg">
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                        <QRCodeSVG value={joinUrl} size={150} />
                    </div>
                    <p className="text-slate-500 text-xs text-center font-medium">
                        Scan to join this room
                    </p>
                    <button
                        onClick={() => setShowQR(false)}
                        className="text-xs text-slate-500 hover:text-slate-700 font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            )}
        </div>
    );
};