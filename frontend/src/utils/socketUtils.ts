import { io, Socket } from 'socket.io-client';

import { getAuthToken } from './authUtils';
import { Message } from '@/api/chatApi';

// Socket connection options
const SOCKET_OPTIONS = {
  reconnectionAttempts: Infinity,  // Keep trying to reconnect indefinitely
  reconnectionDelay: 1000,         // Start with 1 second delay
  reconnectionDelayMax: 5000,      // Max 5 seconds between attempts
  timeout: 20000,                  // Longer timeout for better connection chance
  autoConnect: true,               // Enable automatic connection
  path: '/socket.io',              // Socket.IO default path
  forceNew: true,                  // Force a new connection on each attempt
  withCredentials: true,           // Send cookies for cross-site requests
  transports: ['websocket', 'polling']  // Try websocket first, then fall back to polling
};

// Hardcoded socket URL that matches the API URL
const SOCKET_URL = 'https://socmed-backend-8q7a.onrender.com';

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
    // Check if we already have a socket instance
    if (socket?.connected) {
      console.log('Using existing socket connection');
      return socket;
    }

    // Get the auth token
    const token = getAuthToken();
    if (!token) {
      console.error('No auth token available for socket connection');
      return null;
    }
    
    try {
      // Create socket with exact format expected by the backend
      socket = io(SOCKET_URL, {
        ...SOCKET_OPTIONS,
        auth: { token }, // Backend looks for socket.handshake.auth.token
        query: { token }, // Some backends look for token in query params
      });

      // Connect immediately
      socket.connect();
      
      // Set up event listeners
      socket.on('connect', () => {
        console.log('Socket connected successfully!', new Date().toISOString());
        isConnectivityAvailable = true;
        saveSocketAvailability(true);
        
        // Log socket info for debugging
        console.log('Socket connection details:', {
          id: socket?.id,
          connected: socket?.connected,
          url: SOCKET_URL
        });
        
        // Join user's personal room for direct messages
        if (token && socket) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const userId = payload.id || payload._id;
            
            // Join user's personal room
            socket.emit('join', userId);
            
            // Explicitly request online users list
            socket.emit('requestOnlineUsers');
            
            // Also join any active conversation if the ID is in localStorage
            const activeConversationId = localStorage.getItem('activeConversationId');
            if (activeConversationId) {
              console.log('Rejoining conversation room from localStorage:', activeConversationId);
              socket.emit('joinConversation', activeConversationId);
            }
          } catch (error) {
            console.error('Error decoding token:', error);
          }
        }
      });
      
      socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message, new Date().toISOString());
        console.log('Socket connection details:', {
          url: SOCKET_URL,
          path: SOCKET_OPTIONS.path,
          token: 'exists: ' + (!!getAuthToken()),
          reconnectionAttempts: socket?.io?.reconnectionAttempts
        });
        
        // Check if this is a 401 error (unauthorized)
        if (err.message.includes('401') || err.message.includes('unauthorized')) {
          console.warn('Socket authentication failed. The token may be invalid or expired.');
        }
        
        // Check if this is a 404 error which means Socket.IO is not available on the server
        if (err.message.includes('404')) {
          console.warn('Socket.IO endpoint not found (404). The server does not support Socket.IO.');
          // Don't set isConnectivityAvailable to false yet, allow reconnection attempts
        }
      });
      
      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`Socket reconnection attempt ${attemptNumber}...`, new Date().toISOString());
      });
      
      socket.on('reconnect', (attemptNumber) => {
        console.log(`Socket reconnected after ${attemptNumber} attempts!`, new Date().toISOString());
        
        // Request a list of online users after reconnection
        if (socket) {
          socket.emit('requestOnlineUsers');
          
          // Rejoin any active conversation
          const activeConversationId = localStorage.getItem('activeConversationId');
          if (activeConversationId) {
            console.log('Rejoining conversation after reconnect:', activeConversationId);
            socket.emit('joinConversation', activeConversationId);
          }
        }
      });
      
      socket.on('reconnect_error', (err) => {
        console.error('Socket reconnection error:', err.message, new Date().toISOString());
      });
      
      socket.on('reconnect_failed', () => {
        console.error('Socket reconnection failed after all attempts', new Date().toISOString());
        isConnectivityAvailable = false; // Now we can set this to false
        saveSocketAvailability(false);
      });
      
      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason, new Date().toISOString());
        
        // Leave user's personal room
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const userId = payload.id || payload._id;
            socket?.emit('leave', userId);
          } catch (error) {
            console.error('Error decoding token:', error);
          }
        }
        
        // If server disconnected us, try to reconnect
        if (reason === 'io server disconnect') {
          console.log('Server disconnected the socket, attempting reconnection...');
          socket?.connect();
        }
      });

      // Listen for online users list when requested
      socket.on('onlineUsers', (users: string[]) => {
        console.log('Received online users list:', users);
        // Update the online users state in the hook
        socket?.emit('onlineUsersReceived', users);
      });

      // Listen for user online status changes
      socket.on('userOnline', (userId: string) => {
        console.log('User came online:', userId);
        // Update the online users state in the hook
        socket?.emit('userOnlineReceived', userId);
      });

      // Listen for user offline status changes
      socket.on('userOffline', (userId: string) => {
        console.log('User went offline:', userId);
        // Update the online users state in the hook
        socket?.emit('userOfflineReceived', userId);
      });

      // Listen for broadcast events
      socket.on('broadcastOnlineUsers', (users: string[]) => {
        console.log('Received broadcast online users:', users);
        socket?.emit('onlineUsersReceived', users);
      });

      socket.on('broadcastUserOnline', (userId: string) => {
        console.log('Received broadcast user online:', userId);
        socket?.emit('userOnlineReceived', userId);
      });

      socket.on('broadcastUserOffline', (userId: string) => {
        console.log('Received broadcast user offline:', userId);
        socket?.emit('userOfflineReceived', userId);
      });
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
  
  // If socket exists and is connected, return it
  if (socket && socket.connected) {
    return socket;
  }
  
  // If socket exists but isn't connected, try to connect it
  if (socket && !socket.connected) {
    socket.connect();
    return socket;
  }
  
  // If no socket exists, initialize a new one
  return initializeSocket();
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
    console.log('Joining conversation room:', conversationId, new Date().toISOString());
    
    // Store the active conversation ID in localStorage for recovery after reconnects
    localStorage.setItem('activeConversationId', conversationId);
    
    // Emit multiple event formats to ensure compatibility with different server implementations
    s.emit('joinConversation', conversationId);
    s.emit('join', conversationId);
    s.emit('join-room', conversationId);
    
    // Also try with different payload formats
    s.emit('joinConversation', { conversationId });
    s.emit('join', { roomId: conversationId });
  } else {
    console.error('Cannot join conversation: Socket connection not available');
  }
};

// Leave a conversation room
export const leaveConversation = (conversationId: string): void => {
  const s = getSafeSocket();
  if (s) {
    console.log('Leaving conversation room:', conversationId, new Date().toISOString());
    
    // Clear the active conversation ID from localStorage
    const storedConversationId = localStorage.getItem('activeConversationId');
    if (storedConversationId === conversationId) {
      localStorage.removeItem('activeConversationId');
    }
    
    // Emit multiple event formats to ensure compatibility with different server implementations
    s.emit('leaveConversation', conversationId);
    s.emit('leave', conversationId);
    s.emit('leave-room', conversationId);
    
    // Also try with different payload formats
    s.emit('leaveConversation', { conversationId });
    s.emit('leave', { roomId: conversationId });
  } else {
    console.error('Cannot leave conversation: Socket connection not available');
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
    console.log('Sending private message via socket:', {
      recipientId,
      conversationId,
      messageLength: message?.length || 0,
      hasMessageObj: !!messageObj
    });
    
    // Make sure socket is connected
    if (!s.connected) {
      console.log('Socket not connected, attempting to connect...');
      s.connect();
    }
    
    s.emit('privateMessage', {
      recipientId,
      message,
      conversationId,
      messageObj
    });
    
    // Also emit a backup event for servers that might use a different event name
    s.emit('message', {
      to: recipientId,
      content: message,
      conversationId,
      messageData: messageObj
    });
  } else {
    console.error('Cannot send private message: Socket connection not available');
  }
};

// Listen for new messages
export const onNewMessage = (callback: (data: any) => void): () => void => {
  const s = getSafeSocket();
  if (s) {
    // Listen for multiple possible event names that the server might use
    s.on('newMessage', callback);
    s.on('message', callback);
    s.on('privateMessage', callback);
    s.on('receiveMessage', callback);
    
    // Return a cleanup function that removes all listeners
    return () => {
      s.off('newMessage', callback);
      s.off('message', callback);
      s.off('privateMessage', callback);
      s.off('receiveMessage', callback);
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
  
  console.log('Refreshing socket connection, token provided:', !!token);
  
  // If a new token is provided, we'll attempt to connect even if backend was unavailable
  if (token) {
    isConnectivityAvailable = true; // Reset this flag when we have a new token
    saveSocketAvailability(true);
    
    // We don't need to manually set cookies/localStorage here
    // This is handled by authUtils.setAuthToken
  }
  
  // Disconnect existing socket
  if (socket) {
    console.log('Disconnecting existing socket for refresh');
    socket.disconnect();
    socket = null;
  }
  
  // Try to initialize a new connection
  console.log('Initializing new socket connection after refresh');
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