import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Define the socket URL. 
// In dev: localhost:3001
// In prod: env var NEXT_PUBLIC_BACKEND_URL
const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export const useSocket = (namespace = '/game') => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Prevent multiple connections
        const socketInstance = io(`${SOCKET_URL}${namespace}`, {
            autoConnect: true,
            reconnection: true,
        });

        socketInstance.on('connect', () => {
            console.log('Connected to socket');
            setIsConnected(true);
        });

        socketInstance.on('disconnect', () => {
            console.log('Disconnected from socket');
            setIsConnected(false);
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, [namespace]);

    return { socket, isConnected };
};
