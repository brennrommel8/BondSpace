// Export all API modules from a central location
import { authApi } from './authApi';
import { chatApi } from './chatApi';
import { videoCallApi } from './videoCallApi';
import { postApi } from './postApi';
import { searchUsers, getUserProfile } from './searchApi';
import api from '@/config/axios';

// Re-export everything
export {
  authApi,
  chatApi,
  videoCallApi,
  postApi,
  searchUsers,
  getUserProfile,
  api // Export the configured axios instance
};

// This makes it easier to import all API functionality
// with a single import: import { authApi, chatApi } from '@/api';
