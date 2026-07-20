/**
 * Custom hook for YouTube IFrame Player management
 * Handles player initialization, sync logic, and host controls
 * 
 * Sync Strategy:
 * - Host sends heartbeat every second with current time
 * - Clients compare their time with server time
 * - If diff > 300ms: seek immediately
 * - If diff > 100ms: adjust playback speed
 * - Host heartbeat accounts for network latency
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';
import { loadYouTubeAPI } from '@/services/youtube';
import { PlaybackEvent, SyncState, SyncStatus, YouTubePlayerInstance, YTPlayerState } from '@/types';

// Sync thresholds
const HARD_SYNC_THRESHOLD = 1.0;   // Seek if diff > 1 seconds (tighter)
const SOFT_SYNC_THRESHOLD = 0.15;  // Adjust speed if diff > 150ms (microsync)
const SYNC_INTERVAL = 1000;         // Check sync every 1 second
const HEARTBEAT_INTERVAL = 1000;    // Host sends state every 1 second
// YouTube only accepts specific playback rates: 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2
const SPEED_UP_RATE = 1.25;
const SLOW_DOWN_RATE = 0.75;
const NORMAL_SPEED = 1.0;

interface UseYouTubePlayerOptions {
    containerId: string;
    socket: Socket | null;
    roomId: string | null;
    isHost: boolean;
    canControl: boolean;
    latency: number;
    initialVideoId?: string | null;
    initialVideoTitle?: string | null;
}

interface UseYouTubePlayerReturn {
    playerReady: boolean;
    videoId: string | null;
    videoTitle: string | null;
    playing: boolean;
    currentTime: number;
    duration: number;
    syncStatus: SyncStatus;
    loadVideo: (videoId: string, title?: string) => void;
    requestSync: () => void;
}

export function useYouTubePlayer({
    containerId,
    socket,
    roomId,
    isHost,
    canControl,
    latency,
    initialVideoId,
    initialVideoTitle,
}: UseYouTubePlayerOptions): UseYouTubePlayerReturn {
    const playerRef = useRef<YouTubePlayerInstance | null>(null);
    const [playerReady, setPlayerReady] = useState(false);
    const lastRemoteActionTimeRef = useRef<number>(0);
    const [videoId, setVideoId] = useState<string | null>(initialVideoId || null);
    const [videoTitle, setVideoTitle] = useState<string | null>(initialVideoTitle || null);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

    // Refs to avoid stale closures in intervals
    const isHostRef = useRef(isHost);
    const canControlRef = useRef(canControl);
    const latencyRef = useRef(latency);
    const roomIdRef = useRef(roomId);
    const syncStatusRef = useRef(syncStatus);
    const playingRef = useRef(playing);
    const videoIdRef = useRef(videoId);

    // Keep refs in sync with state
    useEffect(() => { isHostRef.current = isHost; }, [isHost]);
    useEffect(() => { canControlRef.current = canControl; }, [canControl]);
    useEffect(() => { latencyRef.current = latency; }, [latency]);
    useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
    useEffect(() => { syncStatusRef.current = syncStatus; }, [syncStatus]);
    useEffect(() => { playingRef.current = playing; }, [playing]);
    useEffect(() => { videoIdRef.current = videoId; }, [videoId]);

    // ─── Initialize YouTube Player ────────────────────────────────────────────
    useEffect(() => {
        let isMounted = true;

        async function initPlayer() {
            try {
                await loadYouTubeAPI();
                if (!isMounted) return;

                new window.YT.Player(containerId, {
                    height: '100%',
                    width: '100%',
                    playerVars: {
                        autoplay: 0,
                        controls: canControlRef.current ? 1 : 0, // Controllers see controls
                        rel: 0,
                        modestbranding: 1,
                        playsinline: 1,
                        enablejsapi: 1,
                    },
                    events: {
                        onReady: (event) => {
                            if (!isMounted) return;
                            playerRef.current = event.target;
                            setPlayerReady(true);
                            console.log('[YouTube] Player ready');
                            
                            // Late joiner sync
                            if (!isHostRef.current && initialVideoId) {
                                socket?.emit('request-sync', { roomId: roomIdRef.current });
                            }
                        },
                        onStateChange: (event) => {
                            if (!isMounted) return;
                            handlePlayerStateChange(event.data, event.target);
                        },
                        onError: (event) => {
                            console.error('[YouTube] Player error:', event.data);
                            if (event.data === 101 || event.data === 150) {
                                toast.error('This video does not allow embedding. Please try a different video.');
                            } else {
                                toast.error('Video error. Please try another URL.');
                            }
                        },
                    },
                });
            } catch (err) {
                console.error('[YouTube] Failed to initialize player:', err);
                toast.error('Failed to load YouTube player');
            }
        }

        initPlayer();

        return () => {
            isMounted = false;
        };
    }, [containerId]); // Only run once

    /**
     * Handle YouTube player state changes
     * Host: broadcast events to all clients
     * Client: update local state (don't broadcast)
     */
    const handlePlayerStateChange = useCallback(
        (state: YTPlayerState, player: YouTubePlayerInstance) => {
            const currentVideoTime = player.getCurrentTime?.() || 0;
            const isCurrentlyControlling = canControlRef.current;
            const currentRoomId = roomIdRef.current;

            if (!socket || !currentRoomId) return;

            switch (state) {
                case YTPlayerState.PLAYING:
                    setPlaying(true);
                    playingRef.current = true;
                    // Only emit if this state change wasn't triggered by a recent remote command
                    if (isCurrentlyControlling && (Date.now() - lastRemoteActionTimeRef.current > 1000)) {
                        socket.emit('play', { roomId: currentRoomId, currentTime: currentVideoTime });
                    }
                    break;

                case YTPlayerState.PAUSED:
                    setPlaying(false);
                    playingRef.current = false;
                    if (isCurrentlyControlling && (Date.now() - lastRemoteActionTimeRef.current > 1000)) {
                        socket.emit('pause', { roomId: currentRoomId, currentTime: currentVideoTime });
                    }
                    break;

                case YTPlayerState.ENDED:
                    setPlaying(false);
                    playingRef.current = false;
                    break;

                case YTPlayerState.BUFFERING:
                    setSyncStatus('syncing');
                    break;
            }
        },
        [socket]
    );

    // ─── Controller: Periodic Seek Detection ────────────────────────────────────────
    // Detect when a controller seeks (position jumps)
    useEffect(() => {
        if (!canControl || !socket || !roomId || !playerReady) return;

        let lastKnownTime = 0;
        let lastCheckTime = Date.now();

        const checkForSeek = setInterval(() => {
            if (!playerRef.current || !playingRef.current) return;

            const currentPlayerTime = playerRef.current.getCurrentTime();
            const elapsed = (Date.now() - lastCheckTime) / 1000;
            const expectedTime = lastKnownTime + elapsed;
            const diff = Math.abs(currentPlayerTime - expectedTime);

            // If time jumped more than 2 seconds, it's a seek
            if (diff > 2 && elapsed < 3) {
                socket.emit('seek', { roomId, currentTime: currentPlayerTime });
                console.log('[Host] Seek detected:', currentPlayerTime);
            }

            lastKnownTime = currentPlayerTime;
            lastCheckTime = Date.now();
            setCurrentTime(currentPlayerTime);

            // Update duration if available
            const d = playerRef.current.getDuration?.() || 0;
            if (d > 0) setDuration(d);
        }, 500);

        return () => clearInterval(checkForSeek);
    }, [isHost, socket, roomId, playerReady]);

    // ─── Host: Send Heartbeat ─────────────────────────────────────────────────
    useEffect(() => {
        if (!isHost || !socket || !roomId || !playerReady) return;

        const heartbeat = setInterval(() => {
            if (!playerRef.current) return;

            const currentPlayerTime = playerRef.current.getCurrentTime();
            const state = playerRef.current.getPlayerState?.();
            const isPlaying = state === YTPlayerState.PLAYING;

            socket.emit('host-heartbeat', {
                roomId,
                currentTime: currentPlayerTime,
                playing: isPlaying,
            });
        }, HEARTBEAT_INTERVAL);

        return () => clearInterval(heartbeat);
    }, [isHost, socket, roomId, playerReady]);

    // ─── Client: Sync State From Server ───────────────────────────────────────
    useEffect(() => {
        if (!socket) return;

        const handleSyncState = ({ videoId: vId, playing: shouldPlay, currentTime: serverTime, serverTime: timestamp }: SyncState) => {
            if (isHostRef.current && !initialVideoId) return; // Only host skips sync (unless late joining which shouldn't happen for host but just in case)
            if (!playerRef.current) return;

            // Load video if not loaded (late joiner)
            if (vId && videoIdRef.current !== vId) {
                setVideoId(vId);
                playerRef.current.loadVideoById(vId);
            } else if (vId && playerRef.current.getPlayerState?.() === -1) {
                playerRef.current.loadVideoById(vId);
            }

            // Account for network latency: add half the RTT
            const latencyOffset = (latencyRef.current * 2) / 1000;
            const elapsed = (Date.now() - timestamp) / 1000;
            const adjustedServerTime = serverTime + elapsed + latencyOffset;

            const clientTime = playerRef.current.getCurrentTime();
            const diff = Math.abs(clientTime - adjustedServerTime);

            // Hard sync: seek immediately
            if (diff > HARD_SYNC_THRESHOLD) {
                playerRef.current.seekTo(adjustedServerTime, true);
                setSyncStatus('syncing');
                console.log(`[Sync] Hard sync: diff=${diff.toFixed(2)}s, seeking to ${adjustedServerTime.toFixed(2)}s`);
            }
            // Soft sync: adjust playback speed
            else if (diff > SOFT_SYNC_THRESHOLD) {
                if (clientTime < adjustedServerTime) {
                    playerRef.current.setPlaybackRate?.(SPEED_UP_RATE);
                } else {
                    playerRef.current.setPlaybackRate?.(SLOW_DOWN_RATE);
                }
                setSyncStatus('syncing');
                console.log(`[Sync] Soft sync: diff=${diff.toFixed(2)}s, adjusting speed`);
            }
            // In sync
            else {
                playerRef.current.setPlaybackRate?.(NORMAL_SPEED);
                setSyncStatus('synced');
            }

            // Handle play/pause sync
            const playerState = playerRef.current.getPlayerState?.();
            if (shouldPlay && playerState !== YTPlayerState.PLAYING) {
                playerRef.current.playVideo();
            } else if (!shouldPlay && playerState === YTPlayerState.PLAYING) {
                playerRef.current.pauseVideo();
            }

            setCurrentTime(clientTime);
        };

        socket.on('sync-state', handleSyncState);
        return () => { socket.off('sync-state', handleSyncState); };
    }, [socket]);

    // ─── Client: Handle Play/Pause/Seek Events ────────────────────────────────
    useEffect(() => {
        if (!socket) return;

        const handlePlay = ({ currentTime: serverTime, serverTime: timestamp }: PlaybackEvent) => {
            if (!playerRef.current) return;
            lastRemoteActionTimeRef.current = Date.now();

            // Compensate for latency
            const elapsed = (Date.now() - timestamp) / 1000;
            const adjustedTime = serverTime + elapsed;
            
            const currentTime = playerRef.current.getCurrentTime();
            // Only seek if we are out of sync by more than half a second
            if (Math.abs(currentTime - adjustedTime) > 0.5) {
                playerRef.current.seekTo(adjustedTime, true);
            }
            
            playerRef.current.playVideo();
            setPlaying(true);
            setSyncStatus('synced');
            console.log('[Client] Play at', adjustedTime.toFixed(2), 's');
        };

        const handlePause = ({ currentTime: serverTime }: PlaybackEvent) => {
            if (!playerRef.current) return;
            lastRemoteActionTimeRef.current = Date.now();

            playerRef.current.pauseVideo();
            
            const currentTime = playerRef.current.getCurrentTime();
            // Only seek on pause if significantly out of sync
            if (Math.abs(currentTime - serverTime) > 0.5) {
                playerRef.current.seekTo(serverTime, true);
            }
            
            setPlaying(false);
            setSyncStatus('synced');
        };

        const handleSeek = ({ currentTime: serverTime, serverTime: timestamp }: PlaybackEvent) => {
            if (!playerRef.current) return;
            lastRemoteActionTimeRef.current = Date.now();

            const elapsed = (Date.now() - timestamp) / 1000;
            const adjustedTime = serverTime + elapsed;
            playerRef.current.seekTo(adjustedTime, true);
            setSyncStatus('syncing');
        };

        const handleChangeVideo = ({ videoId: newVideoId, videoTitle: newTitle }: { videoId: string; videoTitle: string | null }) => {
            setVideoId(newVideoId);
            setVideoTitle(newTitle);
            setCurrentTime(0);
            setDuration(0);
            setPlaying(false);

            if (playerRef.current) {
                playerRef.current.loadVideoById(newVideoId);
                // Allow auto-play to occur immediately when video changes
                setTimeout(() => {
                    playerRef.current?.playVideo();
                }, 200);
            }
        };

        socket.on('play', handlePlay);
        socket.on('pause', handlePause);
        socket.on('seek', handleSeek);
        socket.on('change-video', handleChangeVideo);

        return () => {
            socket.off('play', handlePlay);
            socket.off('pause', handlePause);
            socket.off('seek', handleSeek);
            socket.off('change-video', handleChangeVideo);
        };
    }, [socket]);

    // ─── Late Join Sync ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;

        const handleRoomJoined = ({ syncState }: { syncState: SyncState }) => {
            if (!syncState?.videoId) return;

            setVideoId(syncState.videoId);
            setVideoTitle(syncState.videoTitle);

            // Wait for player to be ready then sync
            const attemptSync = () => {
                if (!playerRef.current) {
                    setTimeout(attemptSync, 500);
                    return;
                }

                const elapsed = (Date.now() - syncState.serverTime) / 1000;
                const adjustedTime = syncState.currentTime + elapsed;

                playerRef.current.loadVideoById(syncState.videoId!);

                setTimeout(() => {
                    playerRef.current?.seekTo(adjustedTime, true);
                    if (syncState.playing) {
                        playerRef.current?.playVideo();
                        setPlaying(true);
                    } else {
                        playerRef.current?.pauseVideo();
                    }
                    setSyncStatus('synced');
                }, 1500); // Wait for video to load
            };

            attemptSync();
        };

        socket.on('room-joined', handleRoomJoined);
        return () => { socket.off('room-joined', handleRoomJoined); };
    }, [socket]);

    // ─── Update current time for non-host clients ─────────────────────────────
    useEffect(() => {
        if (isHost) return;

        const updateTime = setInterval(() => {
            if (playerRef.current) {
                setCurrentTime(playerRef.current.getCurrentTime());
                const d = playerRef.current.getDuration?.() || 0;
                if (d > 0) setDuration(d);
            }
        }, SYNC_INTERVAL);

        return () => clearInterval(updateTime);
    }, [isHost]);

    // ─── Actions ──────────────────────────────────────────────────────────────

    const loadVideo = useCallback(
        (newVideoId: string, title?: string) => {
            if (!playerRef.current || !socket || !roomId) return;

            setVideoId(newVideoId);
            setVideoTitle(title || null);
            setCurrentTime(0);
            setDuration(0);
            setPlaying(false);

            playerRef.current.loadVideoById(newVideoId);

            socket.emit('change-video', {
                roomId,
                videoId: newVideoId,
                videoTitle: title || null,
            });
        },
        [socket, roomId]
    );

    const requestSync = useCallback(() => {
        if (!socket || !roomId) return;
        setSyncStatus('syncing');
        socket.emit('request-sync', { roomId });
        toast('Requesting sync...', { icon: <RefreshCw className="w-4 h-4 text-primary-500 animate-spin" /> });
    }, [socket, roomId]);

    return {
        playerReady,
        videoId,
        videoTitle,
        playing,
        currentTime,
        duration,
        syncStatus,
        loadVideo,
        requestSync,
    };
}