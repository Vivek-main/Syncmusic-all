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

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`\n🎵 SyncMusic Server running on port ${PORT}`);
    console.log(`📡 Socket.IO ready for connections`);
    console.log(`🌐 Allowing origins: ${allowedOrigins.join(', ')}\n`);
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