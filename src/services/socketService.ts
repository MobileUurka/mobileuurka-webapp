import { io, Socket } from 'socket.io-client';
import { authService } from './authServices';

const SOCKET_URL = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace('/api/v1', '')
    : 'http://localhost:5500';

let socket: Socket | null = null;

export const socketService = {
    connect(): Socket | null {
        // Reuse existing connected socket
        if (socket?.connected) return socket;

        // If socket exists but is disconnected, clean it up first
        if (socket) {
            socket.removeAllListeners();
            socket.disconnect();
            socket = null;
        }

        const token = authService.getAccessToken();
        if (!token) return null;

        socket = io(SOCKET_URL, {
            auth: { token },
            path: '/socket.io',
            // polling first — always works, then upgrades to WebSocket
            // This avoids the CSP/WebSocket-upgrade race that causes transport close
            transports: ['polling', 'websocket'],
            reconnection: true,
            reconnectionDelay: 2000,
            reconnectionAttempts: 10,
            reconnectionDelayMax: 10000,
            timeout: 20000,
        });

        socket.on('connect', () => {
            console.log('🔌 Socket connected:', socket?.id);
        });

        socket.on('connect_error', (err) => {
            console.warn('🔌 Socket connection error:', err.message);
        });

        socket.on('disconnect', (reason) => {
            console.log('🔌 Socket disconnected:', reason);
        });

        // Before each reconnect attempt, refresh the token so the auth
        // middleware on the server doesn't reject an expired JWT
        socket.io.on('reconnect_attempt', async () => {
            console.log('🔌 Socket reconnecting — refreshing token...');
            await authService.validateAndRefreshToken();
            const freshToken = authService.getAccessToken();
            if (freshToken && socket) {
                socket.auth = { token: freshToken };
            }
        });

        socket.io.on('reconnect', () => {
            console.log('🔌 Socket reconnected');
        });

        socket.io.on('reconnect_failed', () => {
            console.warn('🔌 Socket failed to reconnect after all attempts');
        });

        return socket;
    },

    disconnect() {
        if (socket) {
            socket.removeAllListeners();
            socket.disconnect();
            socket = null;
        }
    },

    getSocket(): Socket | null {
        return socket;
    },

    on(event: string, handler: (...args: any[]) => void) {
        socket?.on(event, handler);
    },

    off(event: string, handler?: (...args: any[]) => void) {
        if (handler) {
            socket?.off(event, handler);
        } else {
            socket?.off(event);
        }
    },
};

// Socket event constants (mirror backend)
export const SOCKET_EVENTS = {
    PATIENT_CREATED: 'patient:created',
    PATIENT_UPDATED: 'patient:updated',
    PATIENT_DELETED: 'patient:deleted',
    PATIENT_RECORD_CREATED: 'patient:record:created',
    PATIENT_RECORD_UPDATED: 'patient:record:updated',
    PATIENT_RECORD_DELETED: 'patient:record:deleted',
    HOSPITAL_LINKED: 'hospital:linked',
    HOSPITAL_UNLINKED: 'hospital:unlinked',
    HOSPITAL_CREATED: 'hospital:created',
    STAFF_ADDED: 'staff:added',
    STAFF_UPDATED: 'staff:updated',
    STAFF_DELETED: 'staff:deleted',
} as const;
