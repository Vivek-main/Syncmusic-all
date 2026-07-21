/**
 * SyncMusic Server Entry Point
 * Sets up Express server with Socket.IO for real-time synchronization
 */

require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { initializeSocket } = require('./socket');

const app = express();
const server = http.createServer(app);

// ─── CORS Configuration ───────────────────────────────────────────────────────
const corsOptions = {
    origin: function (origin, callback) {
        // Allow all origins dynamically (fixes local IP testing)
        callback(null, true);
    },
    methods: ['GET', 'POST'],
    credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());

// ─── Socket.IO Setup ──────────────────────────────────────────────────────────
const io = new Server(server, {
    cors: corsOptions,
    pingTimeout: 60000,
    pingInterval: 25000,
});

// Initialize all socket event handlers
initializeSocket(io);

// ─── REST API Routes ──────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// Get room info via REST (useful for initial page load / QR code scanning)
app.get('/api/rooms/:roomId', (req, res) => {
    const { roomManager } = require('./roomManager');
    const room = roomManager.getRoom(req.params.roomId);

    if (!room) {
        return res.status(404).json({ error: 'Room not found' });
    }

    // Return safe public room data
    res.json({
        id: room.id,
        userCount: room.users.length,
        videoId: room.videoId,
        playing: room.playing,
        currentTime: room.currentTime,
    });
});

// Simple in-memory search cache (10 minute TTL)
const searchCache = new Map();
const SEARCH_CACHE_TTL = 10 * 60 * 1000;

// Ultra-Fast Direct YouTube HTML Scraper (<200ms response time)
async function fastYouTubeSearch(query) {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9'
        },
        signal: controller.signal
    });
    clearTimeout(timeout);

    const html = await response.text();
    const match = html.match(/var ytInitialData = ({.*?});<\/script>/s) || html.match(/window\["ytInitialData"\] = ({.*?});/s);
    if (!match) throw new Error('ytInitialData not found');

    const data = JSON.parse(match[1]);
    const sections = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

    const videos = [];
    for (const section of sections) {
        const contents = section?.itemSectionRenderer?.contents || [];
        for (const item of contents) {
            const render = item.videoRenderer;
            if (!render || !render.videoId) continue;

            const videoId = render.videoId;
            const title = render.title?.runs?.[0]?.text || render.title?.accessibility?.accessibilityData?.label || 'YouTube Video';
            const thumbnail = render.thumbnail?.thumbnails?.slice(-1)?.[0]?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            const duration = render.lengthText?.simpleText || '3:30';
            const author = render.ownerText?.runs?.[0]?.text || render.shortBylineText?.runs?.[0]?.text || 'YouTube';

            videos.push({ videoId, title, thumbnail, duration, author });
            if (videos.length >= 25) break;
        }
        if (videos.length >= 25) break;
    }

    if (videos.length === 0) throw new Error('No videos parsed from fast search');
    return videos;
}

// Search YouTube videos via Fast Direct Scraper + yt-search fallback (cached 10m)
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Search query is required' });
        }
        
        const cacheKey = query.trim().toLowerCase();
        const cached = searchCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < SEARCH_CACHE_TTL)) {
            return res.json({ results: cached.results });
        }

        let videos = [];
        try {
            // Try ultra-fast direct search (<200ms)
            videos = await fastYouTubeSearch(query);
        } catch (fastErr) {
            console.warn('[Search] Fast search fallback triggered:', fastErr.message);
            // Fallback to yt-search package
            const ytSearch = require('yt-search');
            const results = await ytSearch(query);
            
            const blockedKeywords = ['vevo', 't-series', 'zee music', 'sony music', 'speed records', 'yash raj films'];
            const safeVideos = (results.videos || []).filter(v => {
                const name = (v.author ? v.author.name : '').toLowerCase();
                return !blockedKeywords.some(keyword => name.includes(keyword));
            });
            const videosToUse = safeVideos.length > 0 ? safeVideos : (results.videos || []);

            videos = videosToUse.slice(0, 25).map(v => ({
                videoId: v.videoId,
                title: v.title,
                thumbnail: v.thumbnail,
                duration: v.timestamp || (v.duration ? v.duration.toString() : '3:30'),
                author: v.author ? v.author.name : 'YouTube'
            }));
        }
        
        searchCache.set(cacheKey, { timestamp: Date.now(), results: videos });
        res.json({ results: videos });
    } catch (err) {
        console.error('Search API error:', err);
        res.status(500).json({ error: 'Search failed' });
    }
});

// GET /api/public-rooms - Get list of active public rooms
app.get('/api/public-rooms', (req, res) => {
    try {
        const publicRooms = roomManager.getPublicRooms();
        res.json({ rooms: publicRooms });
    } catch (err) {
        console.error('Public rooms API error:', err);
        res.status(500).json({ error: 'Failed to fetch public rooms' });
    }
});

// Fetch videos from YouTube Playlist
app.get('/api/playlist', async (req, res) => {
    try {
        const listId = req.query.list;
        if (!listId || typeof listId !== 'string') {
            return res.status(400).json({ error: 'Playlist ID is required' });
        }

        const ytSearch = require('yt-search');
        const playlist = await ytSearch({ listId });

        if (!playlist || !playlist.videos) {
            return res.status(404).json({ error: 'Playlist not found or empty' });
        }

        const videos = playlist.videos.map(v => ({
            videoId: v.videoId,
            title: v.title,
            thumbnail: v.thumbnail || `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`,
            duration: v.duration ? v.duration.toString() : '3:30',
            author: v.author ? v.author.name : (playlist.author ? playlist.author.name : 'YouTube Playlist')
        }));

        res.json({
            title: playlist.title || 'YouTube Playlist',
            videos
        });
    } catch (err) {
        console.error('[Playlist] error:', err);
        res.status(500).json({ error: 'Failed to load YouTube playlist' });
    }
});

// Fetch Synced Karaoke Lyrics via LRCLIB API
app.get('/api/lyrics', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Song title is required' });
        }

        // Clean up title (remove (Official Video), lyrics, ft, etc.)
        const cleanTitle = query
            .replace(/\(official video\)/gi, '')
            .replace(/official music video/gi, '')
            .replace(/\(lyrics\)/gi, '')
            .replace(/\[.*\]/g, '')
            .trim();

        const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(cleanTitle)}`;
        const response = await fetch(searchUrl);
        if (!response.ok) throw new Error('Failed to fetch from LRCLIB');

        const results = await response.json();
        if (Array.isArray(results) && results.length > 0) {
            // Find item with syncedLyrics
            const synced = results.find(item => item.syncedLyrics) || results[0];
            return res.json({
                trackName: synced.trackName || cleanTitle,
                artistName: synced.artistName || 'Unknown Artist',
                plainLyrics: synced.plainLyrics || null,
                syncedLyrics: synced.syncedLyrics || null
            });
        }

        res.status(404).json({ error: 'Lyrics not found' });
    } catch (err) {
        console.error('[Lyrics] error:', err);
        res.status(500).json({ error: 'Failed to fetch lyrics' });
    }
});

// Fast autocomplete suggestions via Google API
app.get('/api/suggestions', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Query is required' });
        }
        
        // Use client=firefox for a simple JSON array response: ["query", ["sugg1", "sugg2"]]
        const url = `http://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch from Google');
        
        const data = await response.json();
        // data[1] contains the array of suggestions
        res.json({ suggestions: data[1] || [] });
    } catch (err) {
        console.error('[Suggestions] error:', err);
        res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`\n🎵 SyncMusic Server running on port ${PORT}`);
    console.log(`📡 Socket.IO ready for connections\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = { app, server, io };