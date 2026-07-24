/**
 * Home Page
 * Landing page with create/join room functionality
 */

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Music, RefreshCw, Users, Smartphone, Zap, Rocket, Target, Shuffle, Radio } from 'lucide-react';

interface HomePageProps {
    onCreateRoom: (username: string, isPublic?: boolean) => void;
    onJoinRoom: (roomId: string, username: string) => void;
    isLoading: boolean;
}

export const HomePage: React.FC<HomePageProps> = ({
    onCreateRoom,
    onJoinRoom,
    isLoading,
}) => {
    const [username, setUsername] = useState(() => {
        return localStorage.getItem('musicsync_username') || '';
    });
    const [roomId, setRoomId] = useState('');
    const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
    const [isPublicRoom, setIsPublicRoom] = useState(true);
    const [publicRooms, setPublicRooms] = useState<any[]>([]);

    // Fetch public rooms
    useEffect(() => {
        const fetchPublicRooms = async () => {
            try {
                const localBackendUrl = `${window.location.protocol}//${window.location.hostname}:3001`;
                const API_URL = import.meta.env.VITE_SOCKET_URL || localBackendUrl;
                const res = await fetch(`${API_URL}/api/public-rooms`);
                if (res.ok) {
                    const data = await res.json();
                    setPublicRooms(data.rooms || []);
                }
            } catch (err) {
                console.warn('[HomePage] Failed to fetch public rooms');
            }
        };

        fetchPublicRooms();
        const interval = setInterval(fetchPublicRooms, 5000);
        return () => clearInterval(interval);
    }, []);

    // Pre-fill room ID from URL if navigated to /join/:roomId
    React.useEffect(() => {
        const path = window.location.pathname;
        const match = path.match(/\/join\/([A-Z0-9]+)/i);
        if (match) {
            setRoomId(match[1].toUpperCase());
            setActiveTab('join');
        }
    }, []);

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) {
            toast.error('Please enter a username');
            return;
        }
        localStorage.setItem('musicsync_username', username.trim());
        onCreateRoom(username.trim(), isPublicRoom);
    };

    const handleQuickJoin = () => {
        if (!username.trim()) {
            toast.error('Enter your name first to quick join!');
            return;
        }
        if (publicRooms.length === 0) {
            toast.error('No public parties live right now. Create one!');
            return;
        }
        // Pick a random public room
        const randomRoom = publicRooms[Math.floor(Math.random() * publicRooms.length)];
        localStorage.setItem('musicsync_username', username.trim());
        toast.success(`🎲 Jumping into a live party!`);
        onJoinRoom(randomRoom.id, username.trim());
    };

    const handleJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) {
            toast.error('Please enter a username');
            return;
        }
        if (!roomId.trim()) {
            toast.error('Please enter a Room ID');
            return;
        }
        localStorage.setItem('musicsync_username', username.trim());
        onJoinRoom(roomId.trim().toUpperCase(), username.trim());
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative py-12">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-secondary-600/10 rounded-full blur-[120px]" />
            </div>

            {/* Logo & Title */}
            <div className="text-center mb-8 animate-slide-up">
                <div className="flex justify-center mb-4">
                    <Music className="w-16 h-16 text-primary-600" />
                </div>
                <h1 className="text-5xl font-display font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
                    Love<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-secondary-500"> Music</span>
                </h1>
                <p className="text-slate-600 dark:text-slate-300 text-lg max-w-md mx-auto font-light">
                    Watch YouTube videos in perfect sync with friends across any device
                </p>

                {/* Features */}
                <div className="flex flex-wrap justify-center gap-3 mt-6">
                    {[
                        { icon: <RefreshCw className="w-3.5 h-3.5" />, text: 'Real-time sync' },
                        { icon: <Users className="w-3.5 h-3.5" />, text: 'Multiple users' },
                        { icon: <Smartphone className="w-3.5 h-3.5" />, text: 'Mobile friendly' },
                        { icon: <Zap className="w-3.5 h-3.5" />, text: 'Low latency' }
                    ].map((f, idx) => (
                        <span key={idx} className="flex items-center gap-1.5 text-xs bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-full border border-white/50 dark:border-slate-700/50 shadow-sm backdrop-blur-sm">
                            {f.icon} {f.text}
                        </span>
                    ))}
                </div>

                {/* Quick Join Random Party Button */}
                <div className="mt-6">
                    <button
                        onClick={handleQuickJoin}
                        className={`group relative inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-300 ${
                            publicRooms.length > 0
                                ? 'bg-gradient-to-r from-primary-600 to-secondary-500 text-white shadow-[0_4px_20px_rgba(139,92,246,0.35)] hover:shadow-[0_6px_28px_rgba(139,92,246,0.5)] hover:scale-105 cursor-pointer'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                        }`}
                    >
                        <Shuffle className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                        🎲 Quick Join Random Party
                        {publicRooms.length > 0 && (
                            <span className="flex items-center gap-1 bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                                <Radio className="w-3 h-3 animate-pulse" />
                                {publicRooms.length} Live
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Main Card */}
            <div className="w-full max-w-md animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="glass-card p-6">
                    {/* Username Input */}
                    <div className="mb-5">
                        <label className="block text-slate-700 dark:text-slate-200 text-sm mb-2 font-medium">Your Name</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your display name..."
                            maxLength={30}
                            className="w-full bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:bg-white dark:focus:bg-slate-800 transition-all shadow-sm"
                        />
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-slate-100/80 dark:bg-slate-800/80 rounded-xl p-1 mb-5 border border-white/50 dark:border-slate-700/50 shadow-inner">
                        <button
                            onClick={() => setActiveTab('create')}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'create'
                                ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                        >
                            Create Room
                        </button>
                        <button
                            onClick={() => setActiveTab('join')}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'join'
                                ? 'bg-white dark:bg-slate-700 text-secondary-600 dark:text-secondary-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                        >
                            Join Room
                        </button>
                    </div>

                    {/* Create Room Form */}
                    {activeTab === 'create' && (
                        <form onSubmit={handleCreate} className="space-y-4 animate-fade-in">
                            {/* Privacy Selector */}
                            <div>
                                <label className="block text-slate-700 dark:text-slate-200 text-xs mb-2 font-semibold uppercase tracking-wider">Room Privacy</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsPublicRoom(true)}
                                        className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                                            isPublicRoom
                                                ? 'bg-primary-500/15 border-primary-500 text-primary-600 dark:text-primary-400 shadow-sm'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                        }`}
                                    >
                                        🌐 Public Party
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsPublicRoom(false)}
                                        className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                                            !isPublicRoom
                                                ? 'bg-secondary-500/15 border-secondary-500 text-secondary-600 dark:text-secondary-400 shadow-sm'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                        }`}
                                    >
                                        🔒 Private Room
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !username.trim()}
                                className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 text-base shadow-md hover:shadow-lg"
                            >
                                {isLoading ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Rocket className="w-4 h-4" /> Create Room
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Join Room Form */}
                    {activeTab === 'join' && (
                        <form onSubmit={handleJoin} className="space-y-4 animate-fade-in">
                            <div>
                                <label className="block text-slate-700 dark:text-slate-200 text-sm mb-2 font-medium">Room Code</label>
                                <input
                                    type="text"
                                    value={roomId}
                                    onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                                    placeholder="Enter room code..."
                                    maxLength={8}
                                    className="w-full bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-secondary-500 focus:ring-2 focus:ring-secondary-500/20 font-mono text-lg tracking-widest uppercase transition-all shadow-sm focus:bg-white"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading || !username.trim() || !roomId.trim()}
                                className="w-full bg-gradient-to-r from-secondary-500 to-secondary-400 hover:from-secondary-400 hover:to-secondary-300 text-white font-semibold py-3.5 rounded-full transition-all flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(6,182,212,0.39)] hover:shadow-[0_6px_20px_rgba(6,182,212,0.23)] disabled:opacity-50 disabled:cursor-not-allowed text-base"
                            >
                                {isLoading ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Joining...
                                    </>
                                ) : (
                                    <>
                                        <Target className="w-4 h-4" /> Join Room
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>

            {/* Explore Live Public Parties */}
            {publicRooms.length > 0 && (
                <div className="w-full max-w-4xl mt-10 animate-slide-up">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>🌐 Explore Live Parties</span>
                            <span className="px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-600 dark:text-primary-400 text-xs font-mono">
                                {publicRooms.length} Live
                            </span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {publicRooms.map((r) => (
                            <div
                                key={r.id}
                                className="glass-card p-4 flex flex-col justify-between gap-3 border border-slate-200/80 dark:border-slate-700/60 hover:border-primary-500/50 transition-all shadow-sm hover:shadow-md"
                            >
                                <div className="flex items-start gap-3">
                                    {r.thumbnail ? (
                                        <img
                                            src={r.thumbnail}
                                            alt=""
                                            className="w-20 h-14 object-cover rounded-lg bg-black shrink-0 border border-slate-200 dark:border-slate-700"
                                        />
                                    ) : (
                                        <div className="w-20 h-14 rounded-lg bg-gradient-to-br from-primary-600 to-secondary-600 flex items-center justify-center shrink-0">
                                            <Music className="w-6 h-6 text-white" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                            {r.videoTitle || 'Music Room'}
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                                            <span>Host: {r.hostUsername}</span>
                                            <span>•</span>
                                            <span className="text-green-500 font-medium flex items-center gap-1">
                                                <Users className="w-3 h-3" /> {r.userCount}
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        if (!username.trim()) {
                                            toast.error('Please enter your name above first');
                                            return;
                                        }
                                        onJoinRoom(r.id, username.trim());
                                    }}
                                    className="w-full py-2 px-3 rounded-xl bg-primary-500/10 hover:bg-primary-500 text-primary-600 dark:text-primary-400 hover:text-white text-xs font-semibold transition-all border border-primary-500/20 flex items-center justify-center gap-1.5"
                                >
                                    <span>Join Party</span> 🎧
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};