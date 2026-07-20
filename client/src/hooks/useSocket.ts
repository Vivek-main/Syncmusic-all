/**
 * Custom hook for Socket.IO connection management
 * Provides connection status, latency, and socket instance
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket } from '@/services/socket';
import { ConnectionStatus } from '@/types';

interface UseSocketReturn {
    socket: Socket | null;
    connectionStatus: ConnectionStatus;
    latency: number;
    isConnected: boolean;
    serverTimeOffset: number;
}

export function useSocket(): UseSocketReturn {
    const socketRef = useRef<Socket | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
    const [latency, setLatency] = useState<number>(0);
    const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);

    /**
     * Measure round-trip latency using ping/pong
     */
    const measureLatency = useCallback(() => {
        if (!socketRef.current?.connected) return;

        const startTime = Date.now();
        socketRef.current.emit('measure-latency', { timestamp: startTime });

        const handler = ({ timestamp, serverTime }: { timestamp: number, serverTime?: number }) => {
            const rtt = Date.now() - timestamp;
            const oneWayLatency = Math.round(rtt / 2);
            setLatency(oneWayLatency);

            if (serverTime) {
                // Clock offset: how far ahead the local clock is compared to the server
                // The server sent the event at `serverTime`. We received it `oneWayLatency` later.
                // So right now, the server's estimated time is `serverTime + oneWayLatency`.
                const estimatedServerTimeNow = serverTime + oneWayLatency;
                const offset = Date.now() - estimatedServerTimeNow;
                setServerTimeOffset(offset);
            }

            // Report latency to server for display in user list
            socketRef.current?.emit('report-latency', { latency: oneWayLatency });
        };

        socketRef.current.once('latency-pong', handler);
    }, []);

    useEffect(() => {
        const socket = getSocket();
        socketRef.current = socket;

        // Set initial status
        setConnectionStatus(socket.connected ? 'connected' : 'connecting');

        // ─── Event Listeners ───────────────────────────────────────────────────
        const onConnect = () => {
            setConnectionStatus('connected');
            measureLatency(); // Measure immediately on connect
        };

        const onDisconnect = () => {
            setConnectionStatus('disconnected');
        };

        const onReconnecting = () => {
            setConnectionStatus('reconnecting');
        };

        const onReconnect = () => {
            setConnectionStatus('connected');
            measureLatency();
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('reconnecting', onReconnecting);
        socket.on('reconnect', onReconnect);

        // Measure latency every 5 seconds
        pingIntervalRef.current = setInterval(measureLatency, 5000);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('reconnecting', onReconnecting);
            socket.off('reconnect', onReconnect);

            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
            }
        };
    }, [measureLatency]);

    return {
        socket: socketRef.current,
        connectionStatus,
        latency,
        isConnected: connectionStatus === 'connected',
        serverTimeOffset,
    };
}