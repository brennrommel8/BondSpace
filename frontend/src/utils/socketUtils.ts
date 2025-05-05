import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';
import { getAuthToken } from './authUtils';
import { Message } from '@/api/chatApi';
import { API_ENDPOINTS } from '@/config/api';

// Socket connection options
const SOCKET_OPTIONS = {
  reconnectionAttempts: 5,      // Increase retry attempts
  reconnectionDelay: 1000,      // Shorter delay between attempts
  timeout: 10000,               // Longer timeout for better connection chance
  autoConnect: false,           // Don't connect automatically - we'll do it manually
  path: '/socket.io',           // Socket.IO default path
  forceNew: true,               // Force a new connection on each attempt
  withCredentials: true,        // Send cookies for cross-site requests
  transports: ['websocket']     // Try only websocket to avoid polling issues
};

// Socket instance
let socket: Socket | null = null;

// Helper functions for managing socket availability in localStorage
const saveSocketAvailability = (available: boolean): void => {
  localStorage.setItem('socketio_available', available.toString());
};

const loadSocketAvailability = (): boolean => {
  const saved = localStorage.getItem('socketio_available');
  if (saved !== null) {
    return saved === 'true';
  }
  return true; // Default to true for first run
};

// Initialize availability
let isConnectivityAvailable = loadSocketAvailability();

/**
 * Check if user is authenticated by verifying token existence
 * @returns boolean indicating if user has an auth token
 */
export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

/**
 * Check if socket.io should be skipped entirely
 */
export const shouldSkipSocketIO = (): boolean => {
  // Use the connectivity availability flag to determine if we should skip
  return !isConnectivityAvailable;
};

// Reset the Socket.IO availability to force a retry
export const resetSocketAvailability = (): void => {
  isConnectivityAvailable = true;
  saveSocketAvailability(true);
  console.log('Socket.IO availability has been reset - will try to connect on next action');
};

// Initialize the socket connection
export const initializeSocket = (): Socket | null => {
  try {
    // Skip if we know Socket.IO connectivity is unavailable
    if (shouldSkipSocketIO()) {
      console.log('Socket.IO connectivity unavailable - skipping connection attempt');
      return null;
    }

    // Get the token using our consistent method
    console.log('Initializing socket connection...');
    const token = getAuthToken();
    
    if (!token) {
      console.warn('No authentication token found - Please ensure you are logged in');
      return null;
    }

    // Close existing connection if exists
    if (socket) {
      console.log('Closing existing socket connection');
      socket.disconnect();
    }
    
    // Create new socket connection with auth token
    console.log('Creating new socket connection');
    
    try {
      // Create socket with exact format expected by the backend
      socket = io(API_ENDPOINTS.SOCKET, {
        ...SOCKET_OPTIONS,
        auth: { token } // Backend looks for socket.handshake.auth.token
      });
      
      // Set up event listeners
      socket.on('connect', () => {
        console.log('Socket connected successfully');
        isConnectivityAvailable = true;
        saveSocketAvailability(true);
        
        // Log socket info for debugging
        console.log('Socket connection details:', {
          id: socket?.id,
          connected: socket?.connected
        });
        
        // Request a list of online users (with null check)
        if (socket) {
          socket.emit('requestOnlineUsers');
        }
      });
      
      socket.on('connect_error', (err) => {
        // Less verbose error logging
        console.error('Socket connection error:', err.message);
        console.log('Socket connection details:', {
          url: API_ENDPOINTS.SOCKET,
          path: SOCKET_OPTIONS.path,
          token: 'exists: ' + (!!getAuthToken())
        });
        
        // Check if this is a 404 error which means Socket.IO is not available on the server
        if (err.message.includes('404')) {
          console.warn('Socket.IO endpoint not found (404). The server does not support Socket.IO.');
          isConnectivityAvailable = false; // Prevent further attempts
          saveSocketAvailability(false);
        }
      });
      
      socket.on('disconnect', (reason) => {
        if (reason !== 'io client disconnect') {
          console.log('Socket disconnected:', reason);
        }
      });

      // Listen for online users list when requested
      if (socket) {
        socket.on('onlineUsers', (users: string[]) => {
          console.log('Received online users list:', users);
        });
      }
      
      // Connect manually
      socket.connect();
    } catch (err) {
      console.error('Error creating socket connection:', err);
      socket = null;
    }
    
    return socket;
  } catch (error) {
    console.error('Socket initialization error:', error);
    return null;
  }
};

// Manually check if the backend is available
export const checkBackendAvailability = async (): Promise<boolean> => {
  try {
    // For Socket.IO, let's assume the backend is available and let Socket.IO itself
    // handle connection errors. This avoids unnecessary HTTP requests that may fail.
    console.log('Assuming backend is available for Socket.IO connections');
    isConnectivityAvailable = true;
    saveSocketAvailability(true);
    return true;
  } catch (error) {
    console.log('Backend server check failed:', error);
    isConnectivityAvailable = false;
    saveSocketAvailability(false);
    return false;
  }
};

// Get current socket instance or initialize if not exists
export const getSocket = (): Socket | null => {
  // If we know connectivity is unavailable, don't try to connect
  if (shouldSkipSocketIO()) {
    console.log('Socket.IO connectivity unavailable - skipping connection attempt');
    return null;
  }
  
  if (!socket || !socket.connected) {
    return initializeSocket();
  }
  return socket;
};

// Add a function to check if the Socket.IO server is available
export const checkSocketServerStatus = async (): Promise<boolean> => {
  if (shouldSkipSocketIO()) return false;
  
  return await checkBackendAvailability();
};

// Get socket without noisy logs or reconnection attempts
const getSafeSocket = (): Socket | null => {
  // If socket exists and is connected, return it
  if (socket && socket.connected) {
    return socket;
  }
  
  // Check if socket exists but isn't connected yet
  if (socket && !socket.connected) {
    // Try to connect if not already connected
    socket.connect();
    // Still return the socket so the event handlers get registered
    return socket;
  }
  
  // If no socket exists, try to initialize one
  return getSocket();
};

// Disconnect socket
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Join a conversation room
export const joinConversation = (conversationId: string): void => {
  const s = getSafeSocket();
  if (s) {
    s.emit('joinConversation', conversationId);
  }
};

// Leave a conversation room
export const leaveConversation = (conversationId: string): void => {
  const s = getSafeSocket();
  if (s) {
    s.emit('leaveConversation', conversationId);
  }
};

// Send a private message
export const sendPrivateMessage = (
  recipientId: string,
  message: string | undefined,
  conversationId: string,
  messageObj?: Message
): void => {
  const s = getSafeSocket();
  if (s) {
    s.emit('privateMessage', {
      recipientId,
      message,
      conversationId,
      messageObj
    });
  }
};

// Listen for new messages
export const onNewMessage = (callback: (data: any) => void): () => void => {
  const s = getSafeSocket();
  if (s) {
    s.on('newMessage', callback);
    return () => {
      s.off('newMessage', callback);
    };
  }
  return () => {};
};

// Listen for user online status changes
export const onUserOnline = (callback: (userId: string) => void): () => void => {
  const s = getSafeSocket();
  if (s) {
    s.on('userOnline', callback);
    return () => {
      s.off('userOnline', callback);
    };
  }
  return () => {};
};

// Listen for user offline status changes
export const onUserOffline = (callback: (userId: string) => void): () => void => {
  const s = getSafeSocket();
  if (s) {
    s.on('userOffline', callback);
    return () => {
      s.off('userOffline', callback);
    };
  }
  return () => {};
};

// Send typing indicator
export const sendTypingIndicator = (
  conversationId: string,
  isTyping: boolean
): void => {
  const s = getSafeSocket();
  if (s) {
    s.emit('userTyping', {
      conversationId,
      isTyping
    });
  }
};

// Listen for typing indicators
export const onTypingIndicator = (callback: (data: { userId: string, conversationId: string, isTyping: boolean }) => void): () => void => {
  const s = getSafeSocket();
  if (s) {
    s.on('userTyping', callback);
    return () => {
      s.off('userTyping', callback);
    };
  }
  return () => {};
};

// Listen for message read status updates
export const onMessageRead = (callback: (data: { conversationId: string, messageIds: string[] }) => void): () => void => {
  const s = getSafeSocket();
  if (s) {
    s.on('messageRead', callback);
    return () => {
      s.off('messageRead', callback);
    };
  }
  return () => {};
};

// Listen for message deletion events
export const onMessageDeleted = (callback: (data: { conversationId: string, messageId: string }) => void): () => void => {
  const s = getSafeSocket();
  if (s) {
    s.on('messageDeleted', callback);
    return () => {
      s.off('messageDeleted', callback);
    };
  }
  return () => {};
};

// Send a message deletion notification
export const sendMessageDeletionNotification = (conversationId: string, messageId: string): void => {
  const s = getSafeSocket();
  if (s) {
    s.emit('messageDeleted', {
      conversationId,
      messageId
    });
  }
};

// Force refresh the socket connection with a new token
export const refreshSocketConnection = (token?: string): void => {
  // If backend is not available, don't try to reconnect
  if (shouldSkipSocketIO() && !token) return;
  
  // If a new token is provided, we'll attempt to connect even if backend was unavailable
  if (token) {
    isConnectivityAvailable = true; // Reset this flag when we have a new token
    saveSocketAvailability(true);
    Cookies.set('token', token, { expires: 7 });
    localStorage.setItem('token', token);
  }
  
  // Disconnect existing socket
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  
  // Try to initialize a new connection
  initializeSocket();
};

// Manually force reconnection attempt - call this from UI when user clicks "Retry connection"
export const forceReconnect = async (): Promise<boolean> => {
  console.log('Forcing socket reconnection attempt...');
  resetSocketAvailability();
  
  // Check if backend is available
  await checkBackendAvailability();
  
  // Try to initialize socket
  const newSocket = initializeSocket();
  return !!newSocket;
};

// Socket.IO event types for video calls

interface IncomingCallData {
  from: string;
  fromUsername: string;
  roomId: string;
}

interface CallResponseData {
  from: string;
  accepted: boolean;
  roomId: string;
}

interface UserCallData {
  userId: string;
}

interface CallSignalData {
  from: string;
  type: 'offer' | 'answer' | 'ice-candidate';
  payload: any;
  roomId: string;
}

interface CallEndedData {
  by: string;
  roomId?: string;
}

// Listen for incoming calls
export const onIncomingCall = (callback: (data: IncomingCallData) => void): () => void => {
  const s = getSafeSocket();
  if (s) {
    s.on('incomingCall', callback);
    return () => {
      s.off('incomingCall', callback);
    };
  }
  return () => {};
};

// Listen for call responses (accepted/rejected)
export const onCallResponse = (callback: (data: CallResponseData) => void): () => void => {
  const s = getSafeSocket();
  if (s) {
    s.on('callResponseReceived', callback);
    return () => {
      s.off('callResponseReceived', callback);
    };
  }
  return () => {};
};

// Listen for when a user joins the call
export const onUserJoinedCall = (callback: (data: UserCallData) => void): () => void => {
  const s = getSafeSocket();
  if (s) {
    s.on('userJoinedCall', callback);
    return () => {
      s.off('userJoinedCall', callback);
    };
  }
  return () => {};
};

// Listen for when a user leaves the call
export const onUserLeftCall = (callback: (data: UserCallData) => void): () => void => {
  const s = getSafeSocket();
  if (s) {
    s.on('userLeftCall', callback);
    return () => {
      s.off('userLeftCall', callback);
    };
  }
  return () => {};
};

// Listen for signal data (WebRTC)
export const onSignalReceived = (callback: (data: CallSignalData) => void): () => void => {
  const s = getSafeSocket();
  if (s) {
    s.on('signalReceived', callback);
    return () => {
      s.off('signalReceived', callback);
    };
  }
  return () => {};
};

// Listen for call ended event
export const onCallEnded = (callback: (data: CallEndedData) => void): () => void => {
  const s = getSafeSocket();
  if (s) {
    s.on('callEnded', callback);
    return () => {
      s.off('callEnded', callback);
    };
  }
  return () => {};
};

// Call a user
export const callUser = (to: string, roomId: string): void => {
  const s = getSafeSocket();
  if (s) {
    s.emit('callUser', { to, roomId });
  }
};

// Respond to a call (accept or reject)
export const respondToCall = (to: string, accepted: boolean, roomId: string): void => {
  const s = getSafeSocket();
  if (s) {
    s.emit('callResponse', { to, accepted, roomId });
  }
}; 