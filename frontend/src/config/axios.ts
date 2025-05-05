import axios from 'axios';
import { getAuthToken } from '@/utils/authUtils';
import { API_BASE_URL } from './api';

// Create a custom axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Always send cookies with requests
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add a request interceptor to add auth token to every request
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      // Set Authorization header for every request
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle common response issues
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Log detailed error information
    if (error.response) {
      console.error('API Error:', {
        status: error.response.status,
        url: error.config?.url,
        data: error.response.data,
        method: error.config?.method
      });
      
      // Handle 401 errors (unauthorized)
      if (error.response.status === 401) {
        console.error('Authentication error - token may be invalid or expired');
        // You could redirect to login page or trigger a token refresh here
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api; 