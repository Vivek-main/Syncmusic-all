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

// Search YouTube videos via yt-search
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Search query is required' });
        }
        
        const ytSearch = require('yt-search');
        const results = await ytSearch(query);
        const videos = results.videos.slice(0, 5).map(v => ({
            videoId: v.videoId,
            title: v.title,
            thumbnail: v.thumbnail,
            duration: v.timestamp,
            author: v.author.name
        }));
        
        res.json({ results: videos });
    } catch (err) {
        console.error('[Search] error:', err);
        res.status(500).json({ error: 'Failed to search YouTube' });
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