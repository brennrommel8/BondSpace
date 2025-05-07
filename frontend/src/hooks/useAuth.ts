import { useEffect, useState, useCallback } from 'react';
import { useUserStore } from '@/store/userStore';
import { authApi } from '@/api/authApi';
import { toast } from 'sonner';
import { initializeSocket, getSocket } from '@/utils/socketUtils';

export const useAuth = () => {
  const { user, setUser } = useUserStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Handle socket connection and online status
  useEffect(() => {
    let socket: any = null;
    let onlineStatusInterval: NodeJS.Timeout;

    const setupSocket = () => {
      if (user?._id) {
        socket = getSocket();
        
        if (socket) {
          // Set up socket connection and online status
          const handleConnect = () => {
            console.log('Socket connected, setting up online status');
            // Join user's personal room
            socket.emit('join', user._id);
            // Set online status
            socket.emit('userOnline', user._id);
            // Get list of online users
            socket.emit('requestOnlineUsers');
          };

          // Handle initial connection
          if (socket.connected) {
            handleConnect();
          } else {
            socket.once('connect', handleConnect);
          }

          // Set up periodic online status refresh
          onlineStatusInterval = setInterval(() => {
            if (socket.connected) {
              socket.emit('userOnline', user._id);
            }
          }, 30000); // Refresh every 30 seconds

          // Handle reconnection
          socket.on('reconnect', () => {
            console.log('Socket reconnected, restoring online status');
            handleConnect();
          });

          // Handle disconnection
          socket.on('disconnect', () => {
            console.log('Socket disconnected, attempting to reconnect...');
          });
        }
      }
    };

    // Initial setup
    setupSocket();

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && socket?.connected) {
        console.log('Page visible, refreshing online status');
        socket.emit('userOnline', user?._id);
        socket.emit('requestOnlineUsers');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle beforeunload
    const handleBeforeUnload = () => {
      if (socket?.connected && user?._id) {
        socket.emit('userOffline', user._id);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Clean up
    return () => {
      if (onlineStatusInterval) {
        clearInterval(onlineStatusInterval);
      }
      if (socket?.connected && user?._id) {
        socket.emit('userOffline', user._id);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?._id]);

  // Use useCallback to memoize the checkAuthStatus function
  const checkAuthStatus = useCallback(async () => {
    // Don't check again if we've already checked and have a user
    if (authChecked && user) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('Checking authentication status...');
      const response = await authApi.getMe();
      
      if (response.success && response.user) {
        console.log('User is authenticated:', response.user);
        setUser(response.user);
        
        // Initialize the socket connection
        console.log('Initializing socket connection after auth check');
        initializeSocket();
      } else {
        console.log('No authenticated user found');
        setUser(null);
      }
      
      // Mark that we've checked auth status
      setAuthChecked(true);
    } catch (err: any) {
      console.error('Auth check error:', err);
      setError(err.message || 'Failed to check authentication status');
      setUser(null);
      // Still mark as checked even on error
      setAuthChecked(true);
    } finally {
      setLoading(false);
    }
  }, [user, authChecked, setUser]);

  // Only run once on mount
  useEffect(() => {
    if (!authChecked) {
      checkAuthStatus();
    }
  }, [authChecked, checkAuthStatus]);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authApi.login({ email, password });
      
      if (response.success && response.user) {
        setUser(response.user);
        setAuthChecked(true);
        
        // Initialize socket connection
        console.log('Setting up socket connection after login');
        const socket = initializeSocket();
        
        if (socket) {
          // Ensure immediate connection and online status
          const userId = response.user?._id;
          if (socket.connected && userId) {
            socket.emit('join', userId);
            socket.emit('userOnline', userId);
            socket.emit('requestOnlineUsers');
          } else if (userId) {
            socket.once('connect', () => {
              socket.emit('join', userId);
              socket.emit('userOnline', userId);
              socket.emit('requestOnlineUsers');
            });
          }
        }
        
        toast.success('Logged in successfully');
        return true;
      } else {
        setError(response.message || 'Login failed');
        toast.error(response.message || 'Login failed');
        return false;
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed');
      toast.error(err.message || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Set offline status before logging out
      const socket = getSocket();
      if (socket && user?._id) {
        socket.emit('userOffline', user._id);
      }
      
      await authApi.logout();
      setUser(null);
      toast.success('Logged out successfully');
      return true;
    } catch (err: any) {
      console.error('Logout error:', err);
      setError(err.message || 'Logout failed');
      toast.error(err.message || 'Logout failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    checkAuthStatus,
    login,
    logout,
    isAuthenticated: !!user,
    authChecked
  };
}; 