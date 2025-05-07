import { useEffect, useState, useCallback } from 'react';
import { useUserStore } from '@/store/userStore';
import { authApi } from '@/api/authApi';
import { toast } from 'sonner';
import { initializeSocket } from '@/utils/socketUtils';

export const useAuth = () => {
  const { user, setUser } = useUserStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

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
        
        // Initialize socket connection and set online status immediately
        console.log('Setting up socket connection and online status');
        const socket = initializeSocket();
        
        if (socket) {
          // Get user ID from the response
          const userId = response.user._id;
          
          // Set up socket connection and online status
          socket.once('connect', () => {
            // Join user's personal room
            socket.emit('join', userId);
            // Set online status
            socket.emit('userOnline', userId);
            // Get list of online users
            socket.emit('requestOnlineUsers');
          });
          
          // Connect the socket
          socket.connect();
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