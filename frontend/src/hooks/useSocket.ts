import { useEffect, useState, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { 
  initializeSocket, 
  disconnectSocket, 
  getSocket,
  onUserOnline,
  onUserOffline,
  forceReconnect as forceSocketReconnect
} from '@/utils/socketUtils';
import { useUserStore } from '@/store/userStore';

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Set<string>;
  forceReconnect: () => Promise<boolean>;
  initializeSocketConnection: () => void;
}

/**
 * Custom hook for managing socket connection
 * @returns Object containing socket instance and connection status
 */
export const useSocket = (): UseSocketReturn => {
  const { user } = useUserStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const initialized = useRef<boolean>(false);

  // Only initialize socket when explicitly requested
  const initializeSocketConnection = () => {
    if (!user || initialized.current) return;

    const socketInstance = getSocket() || initializeSocket();
    if (socketInstance) {
      setSocket(socketInstance);
      setIsConnected(socketInstance.connected);
      initialized.current = true;

      // Set up connection status listeners
      socketInstance.on('connect', () => {
        console.log('Socket connected in hook');
        setIsConnected(true);
      });

      socketInstance.on('disconnect', () => {
        console.log('Socket disconnected in hook');
        setIsConnected(false);
      });

      // Track online users
      const cleanupOnline = onUserOnline((userId: string) => {
        setOnlineUsers(prev => {
          const updated = new Set(prev);
          updated.add(userId);
          return updated;
        });
      });

      const cleanupOffline = onUserOffline((userId: string) => {
        setOnlineUsers(prev => {
          const updated = new Set(prev);
          updated.delete(userId);
          return updated;
        });
      });

      return () => {
        cleanupOnline();
        cleanupOffline();
        disconnectSocket();
        initialized.current = false;
      };
    }
  };

  // Update connection status when socket state changes
  useEffect(() => {
    if (socket) {
      setIsConnected(socket.connected);
    }
  }, [socket]);

  // Force reconnect function
  const handleForceReconnect = async (): Promise<boolean> => {
    const success = await forceSocketReconnect();
    if (success) {
      const socketInstance = getSocket();
      setSocket(socketInstance);
      setIsConnected(!!socketInstance?.connected);
    }
    return success;
  };

  return { 
    socket, 
    isConnected, 
    onlineUsers,
    forceReconnect: handleForceReconnect,
    initializeSocketConnection
  };
};

export default useSocket; 