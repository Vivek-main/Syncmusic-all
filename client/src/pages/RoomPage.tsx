/**
 * Room Page
 * Main room view with YouTube player and all controls
 */

import React, { useCallback } from 'react';
import { Room, SyncStatus, ConnectionStatus } from '@/types';
import { Socket } from 'socket.io-client';
import { YouTubePlayer } from '@/components/YouTubePlayer';
import { VideoSearch } from '@/components/VideoSearch';
import { UserList } from '@/components/UserList';
import { PlaybackControls } from '@/components/PlaybackControls';
import { RoomHeader } from '@/components/RoomHeader';
import { VideoInfo } from '@/components/VideoInfo';
import { SuggestedVideos } from '@/components/SuggestedVideos';
import { VideoQueue } from '@/components/VideoQueue';
import { ChatBox } from '@/components/ChatBox';
import { ReactionsOverlay } from '@/components/ReactionsOverlay';
import { useYouTubePlayer } from '@/hooks/useYouTubePlayer';
import { Crown, SlidersHorizontal, Headphones, Radio } from 'lucide-react';

const PLAYER_CONTAINER_ID = 'youtube-player';

interface RoomPageProps {
    room: Room;
    socket: Socket | null;
    currentUserId: string;
    isHost: boolean;
    connectionStatus: ConnectionStatus;
    latency: number;
    onLeave: () => void;
    grantControl: (userId: string) => void;
    revokeControl: (userId: string) => void;
}

export const RoomPage: React.FC<RoomPageProps> = ({
    room,
    socket,
    currentUserId,
    isHost,
    connectionStatus,
    latency,
    onLeave,
    grantControl,
    revokeControl,
}) => {
    const [audioOnly, setAudioOnly] = React.useState(false);

    const canControl = isHost || (room.controllers && room.controllers.includes(currentUserId));

    const {
        playerReady,
        videoId,
        videoTitle,
        playing,
        currentTime,
        duration,
        syncStatus,
        loadVideo,
        requestSync,
        setVolume,
        seekTo,
        togglePlay,
    } = useYouTubePlayer({
        containerId: PLAYER_CONTAINER_ID,
        socket,
        roomId: room.id,
        isHost,
        canControl,
        latency,
        initialVideoId: room.videoId,
        initialVideoTitle: room.videoTitle,
    });

    const hostUser = room.users.find((u) => u.id === room.hostId);

    const handleVideoSelect = useCallback(
        (newVideoId: string, title: string) => {
            loadVideo(newVideoId, title);
        },
        [loadVideo]
    );

    const handleAddToQueue = useCallback(
        (video: any) => {
            if (!socket) return;
            socket.emit('add-to-queue', { roomId: room.id, video });
        },
        [socket, room.id]
    );

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input or textarea
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            if (e.code === 'Space') {
                e.preventDefault();
                togglePlay();
            } else if (e.code === 'ArrowRight') {
                e.preventDefault();
                seekTo(Math.min(duration, currentTime + 5));
            } else if (e.code === 'ArrowLeft') {
                e.preventDefault();
                seekTo(Math.max(0, currentTime - 5));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlay, seekTo, currentTime, duration]);

    return (
        <div className="min-h-screen flex flex-col p-4 lg:p-6 relative">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-secondary-500/10 rounded-full blur-[120px]" />
            </div>
            
            <ReactionsOverlay socket={socket} />

            <div className="max-w-7xl mx-auto space-y-4">
                {/* Room Header */}
                <RoomHeader
                    roomId={room.id}
                    connectionStatus={connectionStatus}
                    latency={latency}
                    userCount={room.userCount}
                    onLeave={onLeave}
                />

                {/* Main Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-3 space-y-4">
                        {/* Video Search (Host Only) */}
                        <VideoSearch
                            onVideoSelect={handleVideoSelect}
                            onAddToQueue={handleAddToQueue}
                            isHost={canControl}
                            currentVideoId={videoId}
                        />
                        {/* YouTube Player */}
                        <YouTubePlayer
                            containerId={PLAYER_CONTAINER_ID}
                            playerReady={playerReady}
                            videoId={videoId}
                            syncStatus={syncStatus as SyncStatus}
                            isHost={canControl}
                            audioOnly={audioOnly}
                        />

                        {/* Video Info and Audio Mode Toggle */}
                        {videoId && (
                            <div className="flex items-center justify-between glass-card p-4">
                                <VideoInfo
                                    videoId={videoId}
                                    videoTitle={videoTitle}
                                    hostUsername={hostUser?.username || 'Host'}
                                />
                                <button
                                    onClick={() => setAudioOnly(!audioOnly)}
                                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                                        audioOnly
                                            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                                            : 'bg-dark-600 text-gray-300 hover:bg-dark-500'
                                    }`}
                                >
                                    <Headphones className="w-4 h-4" />
                                    {audioOnly ? 'Audio Mode: ON' : 'Audio Mode: OFF'}
                                </button>
                            </div>
                        )}

                        {/* Playback Controls */}
                        <PlaybackControls
                            currentTime={currentTime}
                            duration={duration}
                            playing={playing}
                            isHost={canControl}
                            syncStatus={syncStatus}
                            onRequestSync={requestSync}
                            setVolume={setVolume}
                            seekTo={seekTo}
                            togglePlay={togglePlay}
                            socket={socket}
                            roomId={room.id}
                        />

                        {/* Suggested Videos (Only visible to hosts/co-hosts) */}
                        <SuggestedVideos
                            currentVideoId={videoId}
                            currentVideoTitle={videoTitle}
                            isHost={canControl}
                            onVideoSelect={handleVideoSelect}
                            onAddToQueue={handleAddToQueue}
                        />

                        {/* Video Queue */}
                        <VideoQueue 
                            queue={room.queue || []}
                            isHost={canControl}
                            socket={socket}
                            roomId={room.id}
                        />
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* Role Badge */}
                        <div className={`glass-card p-4 text-center ${isHost ? 'border-yellow-400/50 shadow-sm' : canControl ? 'border-secondary-400/50 shadow-sm' : ''}`}>
                            {isHost ? (
                                <>
                                    <div className="flex justify-center mb-2 text-yellow-600"><Crown className="w-8 h-8" /></div>
                                    <p className="text-yellow-600 font-semibold text-sm">You are the Host</p>
                                    <p className="text-slate-500 text-xs mt-1">You control playback for everyone</p>
                                </>
                            ) : canControl ? (
                                <>
                                    <div className="flex justify-center mb-2 text-secondary-600"><SlidersHorizontal className="w-8 h-8" /></div>
                                    <p className="text-secondary-600 font-semibold text-sm">Co-Host Access</p>
                                    <p className="text-slate-500 text-xs mt-1">You can control playback</p>
                                </>
                            ) : (
                                <>
                                    <div className="flex justify-center mb-2 text-primary-600"><Headphones className="w-8 h-8" /></div>
                                    <p className="text-primary-600 font-semibold text-sm">Listening</p>
                                    <p className="text-slate-500 text-xs mt-1">
                                        Synced with <span className="text-slate-900 font-medium">{hostUser?.username || 'Host'}</span>
                                    </p>
                                </>
                            )}
                        </div>

                        {/* User List */}
                        <UserList
                            users={room.users}
                            currentUserId={currentUserId}
                            hostId={room.hostId}
                            controllers={room.controllers || []}
                            isHost={isHost}
                            onGrantControl={grantControl}
                            onRevokeControl={revokeControl}
                        />

                        {/* Sync Status Details */}
                        <div className="glass-card p-4">
                            <h3 className="text-slate-900 font-semibold mb-3 text-sm flex items-center gap-2">
                                <Radio className="w-4 h-4 text-slate-500" /> Sync Status
                            </h3>
                            <div className="space-y-2">
                                <StatusRow
                                    label="Connection"
                                    value={connectionStatus === 'connected' ? 'Online' : connectionStatus}
                                    color={connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'}
                                />
                                <StatusRow
                                    label="Latency"
                                    value={latency > 0 ? `${latency}ms` : 'Measuring...'}
                                    color={
                                        latency < 50 ? 'text-green-600' :
                                            latency < 150 ? 'text-yellow-600' : 'text-red-600'
                                    }
                                />
                                <StatusRow
                                    label="Playback"
                                    value={syncStatus === 'idle' ? 'No video' : syncStatus}
                                    color={
                                        syncStatus === 'synced' ? 'text-green-600' :
                                            syncStatus === 'syncing' ? 'text-yellow-600' :
                                                'text-slate-500'
                                    }
                                />
                                <StatusRow
                                    label="Your Role"
                                    value={
                                        <div className="flex items-center gap-1">
                                            {isHost ? <Crown className="w-3.5 h-3.5" /> : canControl ? <SlidersHorizontal className="w-3.5 h-3.5" /> : <Headphones className="w-3.5 h-3.5" />}
                                            {isHost ? 'Host' : canControl ? 'Co-Host' : 'Listener'}
                                        </div>
                                    }
                                    color={isHost ? 'text-yellow-600' : canControl ? 'text-secondary-600' : 'text-primary-600'}
                                />
                            </div>
                        </div>

                        {/* Chat Box */}
                        <ChatBox 
                            socket={socket}
                            roomId={room.id}
                            chatHistory={room.chat || []}
                            username={room.users.find(u => u.id === currentUserId)?.username || 'User'}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

interface StatusRowProps {
    label: string;
    value: React.ReactNode;
    color: string;
}

const StatusRow: React.FC<StatusRowProps> = ({ label, value, color }) => (
    <div className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
        <span className="text-slate-500 text-xs font-medium">{label}</span>
        <span className={`text-xs font-semibold capitalize ${color}`}>{value}</span>
    </div>
);