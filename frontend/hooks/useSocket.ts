import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken } from '../utils/auth';

// Define the socket URL. 
// In dev: localhost:8000
// In prod: env var NEXT_PUBLIC_BACKEND_URL
const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

let globalSocket: Socket | null = null;

export const useSocket = (namespace = '') => {
    const [socket, setSocket] = useState<Socket | null>(globalSocket);
    const [isConnected, setIsConnected] = useState(globalSocket?.connected || false);

    useEffect(() => {
        const token = getToken();

        if (!globalSocket) {
            globalSocket = io(`${SOCKET_URL}${namespace}`, {
                autoConnect: true,
                reconnection: true,
                transports: ['websocket'], // Force WebSocket for speed
                upgrade: false,             // Skip HTTP long-polling upgrade
                auth: {
                    token: token
                }
            });
        }

        const onConnect = () => {
            console.log('Connected to socket');
            setIsConnected(true);
        };

        const onDisconnect = () => {
            console.log('Disconnected from socket');
            setIsConnected(false);
        };

        globalSocket.on('connect', onConnect);
        globalSocket.on('disconnect', onDisconnect);

        // Ensure state is synced if already connected
        if (globalSocket.connected) {
            setIsConnected(true);
        }

        setSocket(globalSocket);

        return () => {
            if (globalSocket) {
                globalSocket.off('connect', onConnect);
                globalSocket.off('disconnect', onDisconnect);
            }
        };
    }, [namespace]);

    return { socket, isConnected };
};
