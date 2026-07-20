/**
 * Home Page
 * Landing page with create/join room functionality
 */

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Music, RefreshCw, Users, Smartphone, Zap, Rocket, Target } from 'lucide-react';

interface HomePageProps {
    onCreateRoom: (username: string) => void;
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
    // const navigate = useNavigate(); // unused

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
        onCreateRoom(username.trim());
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
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-secondary-600/10 rounded-full blur-[120px]" />
            </div>

            {/* Logo & Title */}
            <div className="text-center mb-10 animate-slide-up">
                <div className="flex justify-center mb-4">
                    <Music className="w-16 h-16 text-primary-600" />
                </div>
                <h1 className="text-5xl font-display font-bold text-slate-900 mb-3 tracking-tight">
                    Love<span className="text-transparent bg-clip-text  bg-pink-500 from-primary-500 to-secondary-500"> Music</span>
                </h1>
                <p className="text-slate-600 text-lg max-w-md mx-auto font-light">
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
                        <span key={idx} className="flex items-center gap-1.5 text-xs bg-white/60 text-slate-700 px-3 py-1.5 rounded-full border border-white/50 shadow-sm backdrop-blur-sm">
                            {f.icon} {f.text}
                        </span>
                    ))}
                </div>
            </div>

            {/* Main Card */}
            <div className="w-full max-w-md animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="glass-card p-6">
                    {/* Username Input (shared between tabs) */}
                    <div className="mb-5">
                        <label className="block text-slate-700 text-sm mb-2 font-medium">Your Name</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your display name..."
                            maxLength={30}
                            className="w-full bg-white/80 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition-all shadow-sm"
                        />
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-slate-100/80 rounded-xl p-1 mb-5 border border-white/50 shadow-inner">
                        <button
                            onClick={() => setActiveTab('create')}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'create'
                                ? 'bg-white text-primary-600 shadow-sm border border-slate-200/50'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Create Room
                        </button>
                        <button
                            onClick={() => setActiveTab('join')}
                            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'join'
                                ? 'bg-white text-secondary-600 shadow-sm border border-slate-200/50'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Join Room
                        </button>
                    </div>

                    {/* Create Room Form */}
                    {activeTab === 'create' && (
                        <form onSubmit={handleCreate} className="animate-fade-in">
                            <p className="text-slate-500 text-sm mb-4">
                                Create a new room and invite friends to watch together.
                            </p>
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
                                <label className="block text-slate-700 text-sm mb-2 font-medium">Room Code</label>
                                <input
                                    type="text"
                                    value={roomId}
                                    onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                                    placeholder="Enter room code..."
                                    maxLength={8}
                                    className="w-full bg-white/80 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-secondary-500 focus:ring-2 focus:ring-secondary-500/20 font-mono text-lg tracking-widest uppercase transition-all shadow-sm focus:bg-white"
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

                {/* Footer */}

            </div>
        </div>
    );
};