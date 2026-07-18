/**
 * Shared TypeScript types for SyncMusic
 */

export interface RoomUser {
    id: string;
    username: string;
    isHost: boolean;
    joinedAt: number;
    latency: number;
}

export interface Room {
    id: string;
    hostId: string;
    videoId: string | null;
    videoTitle: string | null;
    playing: boolean;
    currentTime: number;
    users: RoomUser[];
    userCount: number;
    controllers: string[];
}

export interface SyncState {
    videoId: string | null;
    videoTitle: string | null;
    playing: boolean;
    currentTime: number;
    serverTime: number;
}

export interface PlaybackEvent {
    currentTime: number;
    serverTime: number;
    hostId?: string;
}

export interface ChangeVideoEvent {
    videoId: string;
    videoTitle: string | null;
    serverTime: number;
}

export interface HostChangedEvent {
    newHostId: string;
    newHostUsername: string;
    users: RoomUser[];
}

export interface UserJoinedEvent {
    user: RoomUser;
    users: RoomUser[];
    userCount: number;
}

export interface UserLeftEvent {
    userId: string;
    users: RoomUser[];
    userCount: number;
}

// YouTube Player States (from YouTube IFrame API)
export enum YTPlayerState {
    UNSTARTED = -1,
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5,
}

export interface YouTubePlayerInstance {
    playVideo: () => void;
    pauseVideo: () => void;
    seekTo: (seconds: number, allowSeekAhead: boolean) => void;
    getCurrentTime: () => number;
    getDuration: () => number;
    getVideoData: () => { title: string; video_id: string };
    getPlayerState: () => YTPlayerState;
    setPlaybackRate: (rate: number) => void;
    getPlaybackRate: () => number;
    loadVideoById: (videoId: string) => void;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
export type SyncStatus = 'synced' | 'syncing' | 'desynced' | 'idle';