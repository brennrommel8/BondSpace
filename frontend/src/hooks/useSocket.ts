import { useEffect, useState, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { 
  initializeSocket, 
  disconnectSocket, 
  getSocket,
  onUserOnline,
  onUserOffline,
  
} from '@/utils/socketUtils';
import { useUserStore } from '@/store/userStore';

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Set<string>;
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

  // Clear socketio_available on first run to ensure a fresh connection attempt
  useEffect(() => {
    // Don't automatically reset availability - this was causing refresh loops
    // if (!initialized.current && typeof localStorage !== 'undefined') {
    //   resetSocketAvailability();
    // }
  }, []);

  useEffect(() => {
    if (!user || initialized.current) return;

    // Initialize and get socket instance
    const socketInstance = initializeSocket();
    setSocket(socketInstance);
    
    if (socketInstance) {
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
  }, [user]);

  // Reconnect when user changes or when the component re-renders if we lost connection
  useEffect(() => {
    if (user && !socket) {
      const socketInstance = getSocket();
      setSocket(socketInstance);
      
      if (socketInstance) {
        setIsConnected(socketInstance.connected);
        console.log('Socket reconnected, connected status:', socketInstance.connected);
      }
    }
  }, [user, socket]);

  // Update isConnected when socket connects/disconnects
  useEffect(() => {
    if (socket) {
      setIsConnected(socket.connected);
    }
  }, [socket]);

  return { socket, isConnected, onlineUsers };
};

export default useSocket; 