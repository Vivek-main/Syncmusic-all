/**
 * YouTube IFrame Player API Service
 * Handles loading the API and extracting video IDs from URLs.
 * 
 * IMPORTANT: This only uses the official YouTube IFrame Player API.
 * No video content is downloaded, cached, or restreamed.
 */

/**
 * Extract YouTube video ID from various URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - Just a plain video ID (11 characters)
 */
export function extractVideoId(input: string): string | null {
    if (!input || typeof input !== 'string') return null;

    const trimmed = input.trim();

    // Plain video ID (11 alphanumeric chars)
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
        return trimmed;
    }

    // Various YouTube URL patterns
    const patterns = [
        /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
        const match = trimmed.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
}

/**
 * Extract YouTube Playlist ID from URL
 * Supports:
 * - https://www.youtube.com/playlist?list=PLAYLIST_ID
 * - https://www.youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID
 */
export function extractPlaylistId(input: string): string | null {
    if (!input || typeof input !== 'string') return null;

    const trimmed = input.trim();

    // Plain Playlist ID (PL..., RD..., FL..., UU..., OL...)
    if (/^(PL|RD|FL|UU|OL)[a-zA-Z0-9_-]+$/.test(trimmed)) {
        return trimmed;
    }

    const match = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        return match[1];
    }

    return null;
}

/**
 * Load the YouTube IFrame Player API script
 * Returns a promise that resolves when the API is ready
 */
export function loadYouTubeAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
        // Already loaded
        if (window.YT && window.YT.Player) {
            resolve();
            return;
        }

        // API is being loaded
        if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
            const checkReady = setInterval(() => {
                if (window.YT && window.YT.Player) {
                    clearInterval(checkReady);
                    resolve();
                }
            }, 100);

            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkReady);
                reject(new Error('YouTube API failed to load'));
            }, 10000);
            return;
        }

        // Set up the callback before loading the script
        const previousCallback = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            if (previousCallback) previousCallback();
            resolve();
        };

        // Load the YouTube IFrame API
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.onerror = () => reject(new Error('Failed to load YouTube API script'));
        document.head.appendChild(script);
    });
}

/**
 * Get YouTube thumbnail URL for a video ID
 */
export function getThumbnailUrl(videoId: string, quality: 'default' | 'hq' | 'mq' | 'sd' | 'maxres' = 'hq'): string {
    return `https://img.youtube.com/vi/${videoId}/${quality}default.jpg`;
}

// Extend Window type for YouTube API
declare global {
    interface Window {
        YT: {
            Player: new (
                elementId: string,
                options: {
                    height?: string | number;
                    width?: string | number;
                    videoId?: string;
                    playerVars?: Record<string, string | number>;
                    events?: {
                        onReady?: (event: { target: any }) => void;
                        onStateChange?: (event: { data: number; target: any }) => void;
                        onError?: (event: { data: number }) => void;
                    };
                }
            ) => any;
            PlayerState: {
                UNSTARTED: -1;
                ENDED: 0;
                PLAYING: 1;
                PAUSED: 2;
                BUFFERING: 3;
                CUED: 5;
            };
        };
        onYouTubeIframeAPIReady: () => void;
    }
}