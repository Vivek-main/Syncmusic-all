/**
 * Room Manager
 * In-memory store for all active rooms and their state.
 * Handles room creation, joining, leaving, and state updates.
 */

const { nanoid } = require('nanoid');

/**
 * @typedef {Object} RoomUser
 * @property {string} id - Socket ID
 * @property {string} username - Display name
 * @property {boolean} isHost - Whether this user is the host
 * @property {number} joinedAt - Timestamp when user joined
 * @property {number} latency - Current network latency in ms
 */

/**
 * @typedef {Object} Room
 * @property {string} id - Unique room identifier
 * @property {string} hostId - Socket ID of the current host
 * @property {string|null} videoId - Current YouTube video ID
 * @property {string|null} videoTitle - Current video title
 * @property {boolean} playing - Whether video is currently playing
 * @property {number} currentTime - Current playback position in seconds
 * @property {number} lastUpdate - Server timestamp of last state update (ms)
 * @property {RoomUser[]} users - List of connected users
 * @property {number} createdAt - Room creation timestamp
 */

class RoomManager {
    constructor() {
        /** @type {Map<string, Room>} */
        this.rooms = new Map();

        // Cleanup inactive rooms every 30 minutes
        setInterval(() => this.cleanupInactiveRooms(), 30 * 60 * 1000);
    }

    /**
     * Create a new room with a unique ID
     * @param {string} hostSocketId - Socket ID of the host
     * @param {string} hostUsername - Display name of the host
     * @returns {Room} The newly created room
     */
    createRoom(hostSocketId, hostUsername) {
        const roomId = nanoid(8).toUpperCase(); // Short, readable room codes like "AB3X9K2P"

        /** @type {Room} */
        const room = {
            id: roomId,
            hostId: hostSocketId,
            videoId: null,
            videoTitle: null,
            playing: false,
            currentTime: 0,
            lastUpdate: Date.now(),
            users: [
                {
                    id: hostSocketId,
                    username: hostUsername,
                    isHost: true,
                    joinedAt: Date.now(),
                    latency: 0,
                },
            ],
            controllers: new Set(),
            createdAt: Date.now(),
        };

        this.rooms.set(roomId, room);
        console.log(`[Room] Created room ${roomId} by ${hostUsername} (${hostSocketId})`);
        return room;
    }

    /**
     * Add a user to an existing room
     * @param {string} roomId - Room to join
     * @param {string} socketId - Socket ID of the joining user
     * @param {string} username - Display name
     * @returns {{ room: Room, error: string|null }}
     */
    joinRoom(roomId, socketId, username) {
        const room = this.rooms.get(roomId);

        if (!room) {
            return { room: null, error: 'Room not found' };
        }

        // Check if user is already in room (reconnection case)
        const existingUser = room.users.find((u) => u.id === socketId);
        if (existingUser) {
            return { room, error: null };
        }

        // Add new user
        room.users.push({
            id: socketId,
            username,
            isHost: false,
            joinedAt: Date.now(),
            latency: 0,
        });

        console.log(`[Room] User ${username} (${socketId}) joined room ${roomId}`);
        return { room, error: null };
    }

    /**
     * Remove a user from their room
     * @param {string} socketId - Socket ID of the leaving user
     * @returns {{ room: Room|null, wasHost: boolean, newHost: RoomUser|null }}
     */
    leaveRoom(socketId) {
        let targetRoom = null;
        let wasHost = false;
        let newHost = null;

        // Find which room this socket belongs to
        for (const [roomId, room] of this.rooms.entries()) {
            const userIndex = room.users.findIndex((u) => u.id === socketId);

            if (userIndex !== -1) {
                targetRoom = room;
                wasHost = room.hostId === socketId;

                // Remove the user
                room.users.splice(userIndex, 1);
                console.log(`[Room] User ${socketId} left room ${roomId}`);

                // If room is empty, delete it
                if (room.users.length === 0) {
                    this.rooms.delete(roomId);
                    console.log(`[Room] Room ${roomId} deleted (empty)`);
                    return { room: targetRoom, wasHost, newHost: null, roomDeleted: true };
                }

                // Transfer host if needed
                if (wasHost && room.users.length > 0) {
                    newHost = room.users[0]; // Assign to first connected user
                    newHost.isHost = true;
                    room.hostId = newHost.id;
                    console.log(`[Room] Host transferred to ${newHost.username} (${newHost.id}) in room ${roomId}`);
                }

                break;
            }
        }

        return { room: targetRoom, wasHost, newHost, roomDeleted: false };
    }

    /**
     * Update the playback state of a room
     * @param {string} roomId
     * @param {Partial<Pick<Room, 'playing' | 'currentTime' | 'videoId' | 'videoTitle'>>} update
     */
    updateRoomState(roomId, update) {
        const room = this.rooms.get(roomId);
        if (!room) return null;

        Object.assign(room, update, { lastUpdate: Date.now() });
        return room;
    }

    /**
     * Get the current playback time accounting for time elapsed since last update
     * @param {string} roomId
     * @returns {number} Current estimated playback position
     */
    getCurrentTime(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return 0;

        if (!room.playing) return room.currentTime;

        // Calculate how much time has passed since last update
        const elapsed = (Date.now() - room.lastUpdate) / 1000;
        return room.currentTime + elapsed;
    }

    /**
     * Update a user's latency measurement
     * @param {string} socketId
     * @param {number} latency - Latency in milliseconds
     */
    updateUserLatency(socketId, latency) {
        for (const room of this.rooms.values()) {
            const user = room.users.find((u) => u.id === socketId);
            if (user) {
                user.latency = latency;
                break;
            }
        }
    }

    /**
     * Get a room by ID
     * @param {string} roomId
     * @returns {Room|undefined}
     */
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    /**
     * Find which room a socket belongs to
     * @param {string} socketId
     * @returns {Room|null}
     */
    getRoomBySocket(socketId) {
        for (const room of this.rooms.values()) {
            if (room.users.find((u) => u.id === socketId)) {
                return room;
            }
        }
        return null;
    }

    /**
     * Remove rooms that have been inactive for more than 2 hours
     */
    cleanupInactiveRooms() {
        const TWO_HOURS = 2 * 60 * 60 * 1000;
        const now = Date.now();

        for (const [roomId, room] of this.rooms.entries()) {
            if (now - room.lastUpdate > TWO_HOURS && room.users.length === 0) {
                this.rooms.delete(roomId);
                console.log(`[Room] Cleaned up inactive room ${roomId}`);
            }
        }
    }

    /**
     * Get public stats for monitoring
     */
    getStats() {
        return {
            totalRooms: this.rooms.size,
            totalUsers: Array.from(this.rooms.values()).reduce((sum, r) => sum + r.users.length, 0),
        };
    }
}

// Singleton instance
const roomManager = new RoomManager();

module.exports = { roomManager, RoomManager };