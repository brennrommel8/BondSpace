/**
 * API Configuration
 * Central place to manage API URLs and endpoints
 */

// Base API URL - can be changed based on environment
export const API_BASE_URL = 'http://localhost:3000';

// API endpoints
export const API_ENDPOINTS = {
  // Main API prefix
  API: `${API_BASE_URL}/api`,
  
  // Socket.IO endpoint (same as base URL in this case)
  SOCKET: API_BASE_URL,
  
  // Auth endpoints
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    REGISTER: `${API_BASE_URL}/api/auth/register`,
    LOGOUT: `${API_BASE_URL}/api/auth/logout`,
    VERIFY: `${API_BASE_URL}/api/auth/verify`,
    REFRESH: `${API_BASE_URL}/api/auth/refresh`,
  },
  
  // User endpoints
  USER: {
    PROFILE: `${API_BASE_URL}/api/users/profile`,
    BY_ID: (id: string) => `${API_BASE_URL}/api/users/${id}`,
    SEARCH: `${API_BASE_URL}/api/users/search`,
  },
  
  // Chat endpoints
  CHAT: {
    CONVERSATIONS: `${API_BASE_URL}/api/chat/conversations`,
    CONVERSATION_BY_ID: (id: string) => `${API_BASE_URL}/api/chat/conversations/${id}`,
    MESSAGES: `${API_BASE_URL}/api/chat/messages`,
    MESSAGES_BY_CONVERSATION: (id: string) => `${API_BASE_URL}/api/chat/conversations/${id}/messages`,
    READ_MESSAGES: (id: string) => `${API_BASE_URL}/api/chat/conversations/${id}/messages/read`,
    DELETE_MESSAGE: (id: string) => `${API_BASE_URL}/api/chat/messages/${id}`,
  },
  
  // Video call endpoints
  CALLS: {
    INITIATE: `${API_BASE_URL}/api/calls/initiate`,
    ANSWER: (id: string) => `${API_BASE_URL}/api/calls/${id}/answer`,
    REJECT: (id: string) => `${API_BASE_URL}/api/calls/${id}/reject`,
    END: (id: string) => `${API_BASE_URL}/api/calls/${id}/end`,
  }
};

export default API_ENDPOINTS; 