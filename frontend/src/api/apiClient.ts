import axios from 'axios';
import Cookies from 'js-cookie';

// Create axios instance
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://socmed-backend-8q7a.onrender.com',
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    // Try multiple sources for the token
    const cookieToken = Cookies.get('token');
    const localToken = localStorage.getItem('token');
    const token = cookieToken || localToken;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Adding auth token to request:', config.url);
    } else {
      console.warn('No auth token found for request:', config.url);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;
    
    // Handle authentication errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Could implement token refresh logic here if needed
      
      // For now, we'll just handle basic unauthorized errors
      console.error('Unauthorized request:', error);
    }
    
    return Promise.reject(error);
  }
); 