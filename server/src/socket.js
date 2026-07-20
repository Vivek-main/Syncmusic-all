/**
 * Socket.IO Event Handlers
 * All real-time communication logic lives here.
 * 
 * Event Flow:
 *   Host action → Server validates → Broadcast to all in room → Clients sync
 */

const { roomManager } = require('./roomManager');
const { nanoid } = require('nanoid');

/**
 * Initialize all Socket.IO event handlers
 * @param {import('socket.io').Server} io
 */
function initializeSocket(io) {
    io.on('connection', (socket) => {
        console.log(`[Socket] Client connected: ${socket.id}`);

        // ─── Room Management ─────────────────────────────────────────────────────

        /**
         * Create a new room
         * Emits: room-created (to creator), error (on failure)
         */
        socket.on('create-room', ({ username }) => {
            try {
                if (!username || typeof username !== 'string') {
                    socket.emit('error', { message: 'Invalid username' });
                    return;
                }

                const sanitizedUsername = username.trim().slice(0, 30) || 'Anonymous';
                const room = roomManager.createRoom(socket.id, sanitizedUsername);

                // Join the Socket.IO room channel
                socket.join(room.id);

                socket.emit('room-created', {
                    roomId: room.id,
                    room: serializeRoom(room),
                });

                console.log(`[Socket] Room ${room.id} created by ${sanitizedUsername}`);
            } catch (err) {
                console.error('[Socket] create-room error:', err);
                socket.emit('error', { message: 'Failed to create room' });
            }
        });

        /**
         * Join an existing room
         * Emits: room-joined (to joiner), user-joined (to all in room), error (on failure)
         */
        socket.on('join-room', ({ roomId, username }) => {
            try {
                if (!roomId || !username) {
                    socket.emit('error', { message: 'Room ID and username are required' });
                    return;
                }

                const sanitizedUsername = username.trim().slice(0, 30) || 'Anonymous';
                const { room, error } = roomManager.joinRoom(
                    roomId.toUpperCase(),
                    socket.id,
                    sanitizedUsername
                );

                if (error) {
                    socket.emit('error', { message: error });
                    return;
                }

                // Join the Socket.IO channel
                socket.join(room.id);

                // Send current room state to the new user (for late-join sync)
                socket.emit('room-joined', {
                    roomId: room.id,
                    room: serializeRoom(room),
                    // Include current playback state for immediate sync
                    syncState: {
                        videoId: room.videoId,
                        videoTitle: room.videoTitle,
                        playing: room.playing,
                        currentTime: roomManager.getCurrentTime(room.id),
                        serverTime: Date.now(),
                    },
                });

                // Notify everyone else in the room
                socket.to(room.id).emit('user-joined', {
                    user: room.users.find((u) => u.id === socket.id),
                    users: room.users,
                    userCount: room.users.length,
                });

                console.log(`[Socket] ${sanitizedUsername} joined room ${room.id}`);
            } catch (err) {
                console.error('[Socket] join-room error:', err);
                socket.emit('error', { message: 'Failed to join room' });
            }
        });

        // ─── Queue Management ────────────────────────────────────────────────────

        socket.on('add-to-queue', ({ roomId, video }) => {
            const room = roomManager.getRoom(roomId);
            if (!room || !video) return;

            room.queue.push({
                ...video,
                id: nanoid(10), // unique id for queue item
                addedBy: socket.id,
                addedAt: Date.now()
            });

            io.to(roomId).emit('queue-updated', { queue: room.queue });
            console.log(`[Queue] Added ${video.videoId} to room ${roomId}`);
        });

        socket.on('remove-from-queue', ({ roomId, queueItemId }) => {
            const room = roomManager.getRoom(roomId);
            if (!room || (room.hostId !== socket.id && !room.controllers.has(socket.id))) return;

            room.queue = room.queue.filter(item => item.id !== queueItemId);
            io.to(roomId).emit('queue-updated', { queue: room.queue });
            console.log(`[Queue] Removed item ${queueItemId} from room ${roomId}`);
        });

        socket.on('play-next', ({ roomId }) => {
            const room = roomManager.getRoom(roomId);
            if (!room || (room.hostId !== socket.id && !room.controllers.has(socket.id))) return;
            if (room.queue.length === 0) return;

            const nextVideo = room.queue.shift();
            
            roomManager.updateRoomState(roomId, {
                videoId: nextVideo.videoId,
                videoTitle: nextVideo.title || null,
                playing: false,
                currentTime: 0,
            });

            // Broadcast video change
            io.to(roomId).emit('change-video', {
                videoId: nextVideo.videoId,
                videoTitle: nextVideo.title || null,
                serverTime: Date.now(),
            });
            
            // Broadcast new queue state
            io.to(roomId).emit('queue-updated', { queue: room.queue });
            console.log(`[Queue] Played next video ${nextVideo.videoId} in room ${roomId}`);
        });

        // ─── Chat & Reactions ────────────────────────────────────────────────────

        socket.on('send-chat', ({ roomId, text, username }) => {
            const room = roomManager.getRoom(roomId);
            if (!room || !text || text.trim() === '') return;

            const message = {
                id: nanoid(10),
                userId: socket.id,
                username: username || 'Anonymous',
                text: text.trim().slice(0, 200), // Max 200 chars
                timestamp: Date.now()
            };

            room.chat.push(message);
            
            // Keep only last 50 messages
            if (room.chat.length > 50) {
                room.chat.shift();
            }

            io.to(roomId).emit('chat-message', message);
        });

        socket.on('send-reaction', ({ roomId, emoji }) => {
            const room = roomManager.getRoom(roomId);
            if (!room || !emoji) return;

            io.to(roomId).emit('room-reaction', {
                emoji,
                userId: socket.id,
                timestamp: Date.now()
            });
        });

        // ─── Latency / Connection Health ──────────────────────────────────────────────────────

        socket.on('grant-control', ({ roomId, userId }) => {
            const room = roomManager.getRoom(roomId);
            if (!room || room.hostId !== socket.id) return;
            room.controllers.add(userId);
            io.to(roomId).emit('access-updated', { controllers: Array.from(room.controllers) });
            console.log(`[Access] Granted to ${userId} in room ${roomId}`);
        });

        socket.on('revoke-control', ({ roomId, userId }) => {
            const room = roomManager.getRoom(roomId);
            if (!room || room.hostId !== socket.id) return;
            room.controllers.delete(userId);
            io.to(roomId).emit('access-updated', { controllers: Array.from(room.controllers) });
            console.log(`[Access] Revoked from ${userId} in room ${roomId}`);
        });

        // ─── Playback Control ────────────────────────────────────────────────────

        /**
         * Host plays the video
         * Emits: play (to all in room except sender)
         */
        socket.on('play', ({ roomId, currentTime }) => {
            const room = roomManager.getRoom(roomId);
            if (!room || (room.hostId !== socket.id && !room.controllers.has(socket.id))) return;

            roomManager.updateRoomState(roomId, {
                playing: true,
                currentTime: currentTime || 0,
            });

            const serverTime = Date.now();
            socket.to(roomId).emit('play', {
                currentTime: currentTime || 0,
                serverTime,
                hostId: socket.id,
            });

            console.log(`[Sync] Room ${roomId}: PLAY at ${currentTime?.toFixed(2)}s`);
        });

        /**
         * Host pauses the video
         * Emits: pause (to all in room except sender)
         */
        socket.on('pause', ({ roomId, currentTime }) => {
            const room = roomManager.getRoom(roomId);
            if (!room || (room.hostId !== socket.id && !room.controllers.has(socket.id))) return;

            roomManager.updateRoomState(roomId, {
                playing: false,
                currentTime: currentTime || 0,
            });

            socket.to(roomId).emit('pause', {
                currentTime: currentTime || 0,
                serverTime: Date.now(),
            });

            console.log(`[Sync] Room ${roomId}: PAUSE at ${currentTime?.toFixed(2)}s`);
        });

        /**
         * Host seeks to a new position
         * Emits: seek (to all in room except sender)
         */
        socket.on('seek', ({ roomId, currentTime }) => {
            const room = roomManager.getRoom(roomId);
            if (!room || (room.hostId !== socket.id && !room.controllers.has(socket.id))) return;

            roomManager.updateRoomState(roomId, {
                currentTime: currentTime || 0,
            });

            socket.to(roomId).emit('seek', {
                currentTime: currentTime || 0,
                serverTime: Date.now(),
            });

            console.log(`[Sync] Room ${roomId}: SEEK to ${currentTime?.toFixed(2)}s`);
        });

        /**
         * Host changes the video
         * Emits: change-video (to all in room)
         */
        socket.on('change-video', ({ roomId, videoId, videoTitle }) => {
            const room = roomManager.getRoom(roomId);
            if (!room || (room.hostId !== socket.id && !room.controllers.has(socket.id))) return;

            if (!videoId || typeof videoId !== 'string') {
                socket.emit('error', { message: 'Invalid video ID' });
                return;
            }

            roomManager.updateRoomState(roomId, {
                videoId,
                videoTitle: videoTitle || null,
                playing: false,
                currentTime: 0,
            });

            // Broadcast to ALL in room including host (for UI confirmation)
            io.to(roomId).emit('change-video', {
                videoId,
                videoTitle: videoTitle || null,
                serverTime: Date.now(),
            });

            console.log(`[Sync] Room ${roomId}: VIDEO CHANGED to ${videoId}`);
        });

        /**
         * Host skips to the next video in the queue (or player auto-advances)
         * Emits: change-video, queue-updated
         */
        socket.on('play-next', ({ roomId }) => {
            const room = roomManager.getRoom(roomId);
            if (!room || (room.hostId !== socket.id && !room.controllers.has(socket.id))) return;

            if (room.queue.length > 0) {
                const nextVideo = room.queue.shift(); // Remove first video from queue
                
                roomManager.updateRoomState(roomId, {
                    videoId: nextVideo.videoId,
                    videoTitle: nextVideo.title,
                    playing: true,
                    currentTime: 0,
                });

                // Broadcast change to everyone
                io.to(roomId).emit('change-video', {
                    videoId: nextVideo.videoId,
                    videoTitle: nextVideo.title,
                    serverTime: Date.now(),
                });

                // Force play command
                io.to(roomId).emit('play', {
                    currentTime: 0,
                    serverTime: Date.now(),
                });

                // Send updated queue
                io.to(roomId).emit('queue-updated', { queue: room.queue });
                
                console.log(`[Sync] Room ${roomId}: Auto-playing NEXT video ${nextVideo.videoId}`);
            } else {
                // End of queue
                roomManager.updateRoomState(roomId, {
                    playing: false,
                    currentTime: 0,
                });
                io.to(roomId).emit('pause', {
                    currentTime: 0,
                    serverTime: Date.now(),
                });
                console.log(`[Sync] Room ${roomId}: Reached end of queue`);
            }
        });

        /**
         * Client requests current sync state (used for re-sync button)
         * Emits: sync-state (to requesting client only)
         */
        socket.on('request-sync', ({ roomId }) => {
            const room = roomManager.getRoom(roomId);
            if (!room) return;

            socket.emit('sync-state', {
                videoId: room.videoId,
                videoTitle: room.videoTitle,
                playing: room.playing,
                currentTime: roomManager.getCurrentTime(roomId),
                serverTime: Date.now(),
            });
        });

        /**
         * Periodic sync broadcast from host
         * Host sends its current time every second; server relays to all clients
         * This allows the server to maintain accurate state
         */
        socket.on('host-heartbeat', ({ roomId, currentTime, playing }) => {
            const room = roomManager.getRoom(roomId);
            if (!room || (room.hostId !== socket.id && !room.controllers.has(socket.id))) return;

            // Update server state
            roomManager.updateRoomState(roomId, { currentTime, playing });

            // Broadcast sync state to all non-host clients
            socket.to(roomId).emit('sync-state', {
                videoId: room.videoId,
                videoTitle: room.videoTitle,
                playing,
                currentTime,
                serverTime: Date.now(),
            });
        });

        // ─── Latency Measurement (Ping/Pong) ─────────────────────────────────────

        /**
         * Ping-pong for latency measurement
         * Client sends ping with timestamp, server echoes back
         */
        socket.on('ping', ({ timestamp }) => {
            socket.emit('pong', { timestamp, serverTime: Date.now() });
        });

        /**
         * Client reports its measured latency to update user list display
         */
        socket.on('report-latency', ({ latency }) => {
            roomManager.updateUserLatency(socket.id, latency);

            // Update the room's user list for all clients
            const room = roomManager.getRoomBySocket(socket.id);
            if (room) {
                io.to(room.id).emit('users-updated', { users: room.users });
            }
        });

        // ─── Disconnect Handling ──────────────────────────────────────────────────

        /**
         * Handle user disconnection
         * - Remove from room
         * - Transfer host if needed
         * - Notify remaining users
         */
        socket.on('disconnect', (reason) => {
            console.log(`[Socket] Client disconnected: ${socket.id} (${reason})`);

            const { room, wasHost, newHost, roomDeleted } = roomManager.leaveRoom(socket.id);

            if (!room || roomDeleted) return;

            // Notify remaining users
            io.to(room.id).emit('user-left', {
                userId: socket.id,
                users: room.users,
                userCount: room.users.length,
            });

            // If host changed, notify everyone
            if (wasHost && newHost) {
                io.to(room.id).emit('host-changed', {
                    newHostId: newHost.id,
                    newHostUsername: newHost.username,
                    users: room.users,
                });

                console.log(`[Socket] Host transferred to ${newHost.username} in room ${room.id}`);
            }
        });

        /**
         * Explicit leave room event
         */
        socket.on('leave-room', ({ roomId }) => {
            socket.leave(roomId);
            const { room, wasHost, newHost, roomDeleted } = roomManager.leaveRoom(socket.id);

            if (!room || roomDeleted) {
                socket.emit('left-room', { success: true });
                return;
            }

            socket.emit('left-room', { success: true });

            io.to(roomId).emit('user-left', {
                userId: socket.id,
                users: room.users,
                userCount: room.users.length,
            });

            if (wasHost && newHost) {
                io.to(roomId).emit('host-changed', {
                    newHostId: newHost.id,
                    newHostUsername: newHost.username,
                    users: room.users,
                });
            }
        });
    });

    // Server stats logging every 5 minutes
    setInterval(() => {
        const stats = roomManager.getStats();
        console.log(`[Stats] Active rooms: ${stats.totalRooms}, Total users: ${stats.totalUsers}`);
    }, 5 * 60 * 1000);
}

/**
 * Serialize room data for client consumption (remove sensitive fields)
 * @param {import('./roomManager').Room} room
 */
function serializeRoom(room) {
    return {
        id: room.id,
        hostId: room.hostId,
        videoId: room.videoId,
        videoTitle: room.videoTitle,
        playing: room.playing,
        currentTime: room.currentTime,
        users: room.users,
        userCount: room.users.length,
        controllers: Array.from(room.controllers),
        queue: room.queue,
        chat: room.chat,
    };
}

module.exports = { initializeSocket };