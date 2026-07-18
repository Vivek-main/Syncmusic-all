/**
 * Socket.IO Client Service
 * Singleton socket connection with auto-reconnect and event management
 */

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socket: Socket | null = null;

/**
 * Get or create the singleton socket connection
 */
export function getSocket(): Socket {
    if (!socket || !socket.connected) {
        socket = io(SOCKET_URL, {
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            transports: ['websocket', 'polling'],
        });

        // Global connection logging
        socket.on('connect', () => {
            console.log('[Socket] Connected:', socket?.id);
        });

        socket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
        });

        socket.on('reconnect', (attempt) => {
            console.log('[Socket] Reconnected after', attempt, 'attempts');
        });

        socket.on('connect_error', (error) => {
            console.error('[Socket] Connection error:', error.message);
        });
    }

    return socket;
}

/**
 * Disconnect and cleanup socket
 */
export function disconnectSocket(): void {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

export { socket };