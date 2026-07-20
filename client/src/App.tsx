/**
 * Main App Component
 * Handles routing between Home and Room pages
 * Manages top-level socket, room, and navigation state
 */

import { useEffect, useCallback } from 'react';
import { BrowserRouter, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useSocket } from '@/hooks/useSocket';
import { useRoom } from '@/hooks/useRoom';
import { HomePage } from '@/pages/HomePage';
import { RoomPage } from '@/pages/RoomPage';
import { ConnectionBanner } from '@/components/ConnectionBanner';
import { Room } from '@/types';

// ─── App Router Wrapper ───────────────────────────────────────────────────────
export function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<AppContent />} />
                <Route path="/join/:roomId" element={<AppContent />} />
                <Route path="/room/:roomId" element={<AppContent />} />
                <Route path="*" element={<AppContent />} />
            </Routes>
        </BrowserRouter>
    );
}

// ─── Main App Logic ───────────────────────────────────────────────────────────
function AppContent() {
    const navigate = useNavigate();
    const params = useParams<{ roomId?: string }>();

    const { socket, connectionStatus, latency, isConnected } = useSocket();

    const handleRoomJoined = useCallback(
        (room: Room) => {
            navigate(`/room/${room.id}`, { replace: true });
        },
        [navigate]
    );

    const {
        room,
        currentUser,
        isHost,
        isInRoom,
        isLoading,
        createRoom,
        joinRoom,
        leaveRoom,
        grantControl,
        revokeControl,
    } = useRoom({
        socket,
        onRoomJoined: handleRoomJoined,
    });

    // Auto-join room from URL params (for QR code / shared links)
    useEffect(() => {
        const urlRoomId = params.roomId;
        if (urlRoomId && !isInRoom && isConnected && !isLoading) {
            // Show home page with room ID pre-filled (handled in HomePage)
        }
    }, [params.roomId, isInRoom, isConnected, isLoading]);

    const handleLeave = useCallback(() => {
        leaveRoom();
        navigate('/', { replace: true });
    }, [leaveRoom, navigate]);

    return (
        <div className="min-h-screen bg-[#f9f9f9]">
            <ConnectionBanner status={connectionStatus} />

            {isInRoom && room ? (
                <RoomPage
                    room={room}
                    socket={socket}
                    currentUserId={currentUser?.id || ''}
                    isHost={isHost}
                    connectionStatus={connectionStatus}
                    latency={latency}
                    onLeave={handleLeave}
                    grantControl={grantControl}
                    revokeControl={revokeControl}
                />
            ) : (
                <HomePage
                    onCreateRoom={createRoom}
                    onJoinRoom={joinRoom}
                    isLoading={isLoading}
                />
            )}

            <Toaster
                position="bottom-right"
                toastOptions={{
                    style: {
                        background: '#fff',
                        color: '#1f2937',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        fontSize: '14px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    },
                    duration: 3000,
                }}
            />
        </div>
    );
}