import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken } from '../utils/auth';

// Define the socket URL. 
// In dev: localhost:8000
// In prod: env var NEXT_PUBLIC_BACKEND_URL
const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export const useSocket = (namespace = '') => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const token = getToken();

        // Prevent multiple connections
        const socketInstance = io(`${SOCKET_URL}${namespace}`, {
            autoConnect: true,
            reconnection: true,
            auth: {
                token: token
            }
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
