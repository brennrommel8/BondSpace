import { useEffect, useState, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { 
  initializeSocket, 
  disconnectSocket, 
  getSocket,
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

      // Listen for online users list updates
      socketInstance.on('onlineUsers', (users: string[]) => {
        console.log('Received online users list:', users);
        setOnlineUsers(new Set(users));
      });

      // Listen for broadcast online users list
      socketInstance.on('broadcastOnlineUsers', (users: string[]) => {
        console.log('Received broadcast online users list:', users);
        setOnlineUsers(new Set(users));
      });

      // Track online users
      socketInstance.on('userOnline', (userId: string) => {
        console.log('User came online:', userId);
        setOnlineUsers(prev => {
          const updated = new Set(prev);
          updated.add(userId);
          return updated;
        });
      });

      socketInstance.on('broadcastUserOnline', (userId: string) => {
        console.log('Received broadcast user online:', userId);
        setOnlineUsers(prev => {
          const updated = new Set(prev);
          updated.add(userId);
          return updated;
        });
      });

      socketInstance.on('userOffline', (userId: string) => {
        console.log('User went offline:', userId);
        setOnlineUsers(prev => {
          const updated = new Set(prev);
          updated.delete(userId);
          return updated;
        });
      });

      socketInstance.on('broadcastUserOffline', (userId: string) => {
        console.log('Received broadcast user offline:', userId);
        setOnlineUsers(prev => {
          const updated = new Set(prev);
          updated.delete(userId);
          return updated;
        });
      });

      return () => {
        socketInstance.off('connect');
        socketInstance.off('disconnect');
        socketInstance.off('onlineUsers');
        socketInstance.off('broadcastOnlineUsers');
        socketInstance.off('userOnline');
        socketInstance.off('broadcastUserOnline');
        socketInstance.off('userOffline');
        socketInstance.off('broadcastUserOffline');
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