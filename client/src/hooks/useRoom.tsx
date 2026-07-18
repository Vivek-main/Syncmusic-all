/**
 * Custom hook for room management
 * Handles all room-related socket events and state
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import React from 'react';
import { Music, PartyPopper, Hand, Crown } from 'lucide-react';
import {
    Room,
    RoomUser,
    HostChangedEvent,
    UserJoinedEvent,
    UserLeftEvent,
} from '@/types';

interface UseRoomOptions {
    socket: Socket | null;
    onRoomJoined?: (room: Room) => void;
    onError?: (message: string) => void;
}

interface UseRoomReturn {
    room: Room | null;
    currentUser: RoomUser | null;
    isHost: boolean;
    isInRoom: boolean;
    isLoading: boolean;
    createRoom: (username: string) => void;
    joinRoom: (roomId: string, username: string) => void;
    leaveRoom: () => void;
    grantControl: (userId: string) => void;
    revokeControl: (userId: string) => void;
}

export function useRoom({ socket, onRoomJoined, onError }: UseRoomOptions): UseRoomReturn {
    const [room, setRoom] = useState<Room | null>(null);
    const [socketId, setSocketId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const usernameRef = useRef<string>('');

    // Derive current user from room state
    const currentUser = room?.users.find((u) => u.id === socketId) ?? null;
    const isHost = currentUser?.isHost ?? false;
    const isInRoom = room !== null;

    // Keep track of socket ID
    useEffect(() => {
        if (socket) {
            setSocketId(socket.id || '');

            const onConnect = () => setSocketId(socket.id || '');
            socket.on('connect', onConnect);
            return () => { socket.off('connect', onConnect); };
        }
    }, [socket]);

    // ─── Socket Event Listeners ───────────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;

        const handleRoomCreated = ({ roomId, room }: { roomId: string; room: Room }) => {
            setRoom(room);
            setIsLoading(false);
            onRoomJoined?.(room);
            toast.success(`Room ${roomId} created!`, { icon: <Music className="w-4 h-4 text-green-500" /> });
        };

        const handleRoomJoined = ({ room }: { roomId: string; room: Room }) => {
            setRoom(room);
            setIsLoading(false);
            onRoomJoined?.(room);
            toast.success(`Joined room ${room.id}!`, { icon: <PartyPopper className="w-4 h-4 text-green-500" /> });
        };

        const handleUserJoined = ({ user, users }: UserJoinedEvent) => {
            setRoom((prev) => prev ? { ...prev, users, userCount: users.length } : prev);
            if (user.id !== socketId) {
                toast(`${user.username} joined`, { icon: <Hand className="w-4 h-4" /> });
            }
        };

        const handleUserLeft = ({ userId, users }: UserLeftEvent) => {
            const leavingUser = room?.users.find((u) => u.id === userId);
            setRoom((prev) => prev ? { ...prev, users, userCount: users.length } : prev);
            if (leavingUser && userId !== socketId) {
                toast(`${leavingUser.username} left`, { icon: <Hand className="w-4 h-4" /> });
            }
        };

        const handleHostChanged = ({ newHostId, newHostUsername, users }: HostChangedEvent) => {
            setRoom((prev) => prev ? { ...prev, hostId: newHostId, users } : prev);

            if (newHostId === socket.id) {
                toast.success("You're now the host!", { icon: <Crown className="w-4 h-4 text-yellow-500" />, duration: 4000 });
            } else {
                toast(`${newHostUsername} is now the host`, { icon: <Crown className="w-4 h-4 text-yellow-500" /> });
            }
        };

        const handleUsersUpdated = ({ users }: { users: RoomUser[] }) => {
            setRoom((prev) => prev ? { ...prev, users } : prev);
        };

        const handleLeftRoom = () => {
            setRoom(null);
        };

        const handleAccessUpdated = ({ controllers }: { controllers: string[] }) => {
            setRoom((prev) => prev ? { ...prev, controllers } : prev);
        };

        const handleError = ({ message }: { message: string }) => {
            setIsLoading(false);
            onError?.(message);
            toast.error(message);
        };

        socket.on('room-created', handleRoomCreated);
        socket.on('room-joined', handleRoomJoined);
        socket.on('user-joined', handleUserJoined);
        socket.on('user-left', handleUserLeft);
        socket.on('host-changed', handleHostChanged);
        socket.on('users-updated', handleUsersUpdated);
        socket.on('access-updated', handleAccessUpdated);
        socket.on('left-room', handleLeftRoom);
        socket.on('error', handleError);

        return () => {
            socket.off('room-created', handleRoomCreated);
            socket.off('room-joined', handleRoomJoined);
            socket.off('user-joined', handleUserJoined);
            socket.off('user-left', handleUserLeft);
            socket.off('host-changed', handleHostChanged);
            socket.off('users-updated', handleUsersUpdated);
            socket.off('access-updated', handleAccessUpdated);
            socket.off('left-room', handleLeftRoom);
            socket.off('error', handleError);
        };
    }, [socket, socketId, room, onRoomJoined, onError]);

    // ─── Actions ──────────────────────────────────────────────────────────────

    const createRoom = useCallback((username: string) => {
        if (!socket?.connected) {
            toast.error('Not connected to server');
            return;
        }
        usernameRef.current = username;
        setIsLoading(true);
        socket.emit('create-room', { username });
    }, [socket]);

    const joinRoom = useCallback((roomId: string, username: string) => {
        if (!socket?.connected) {
            toast.error('Not connected to server');
            return;
        }
        usernameRef.current = username;
        setIsLoading(true);
        socket.emit('join-room', { roomId: roomId.toUpperCase(), username });
    }, [socket]);

    const leaveRoom = useCallback(() => {
        if (!socket || !room) return;
        socket.emit('leave-room', { roomId: room.id });
        setRoom(null);
    }, [socket, room]);

    const grantControl = useCallback((userId: string) => {
        if (!socket || !room) return;
        socket.emit('grant-control', { roomId: room.id, userId });
    }, [socket, room]);

    const revokeControl = useCallback((userId: string) => {
        if (!socket || !room) return;
        socket.emit('revoke-control', { roomId: room.id, userId });
    }, [socket, room]);

    return {
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
    };
}