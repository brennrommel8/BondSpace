import Cookies from 'js-cookie';
import { refreshSocketConnection } from './socketUtils';

// Token storage keys
const TOKEN_COOKIE_KEY = 'token';
const TOKEN_LOCAL_STORAGE_KEY = 'token';
const TOKEN_EXPIRY_DAYS = 7;

/**
 * Set authentication token across multiple storage mechanisms
 * @param token JWT token string
 */
export const setAuthToken = (token: string): void => {
  try {
    // Store in cookies with expiration
    Cookies.set(TOKEN_COOKIE_KEY, token, { expires: TOKEN_EXPIRY_DAYS });
    
    // Store in localStorage for backup
    localStorage.setItem(TOKEN_LOCAL_STORAGE_KEY, token);
    
    // Initialize socket with the new token
    refreshSocketConnection(token);
    
    console.log('Auth token stored successfully');
  } catch (error) {
    console.error('Failed to store auth token:', error);
  }
};

/**
 * Get the authentication token from available sources
 * @returns Token string or undefined if not found
 */
export const getAuthToken = (): string | undefined => {
  try {
    // Try to get from cookie first
    let token = Cookies.get(TOKEN_COOKIE_KEY);
    
    // If not in cookie, try localStorage
    if (!token) {
      token = localStorage.getItem(TOKEN_LOCAL_STORAGE_KEY);
    }
    
    return token || undefined;
  } catch (error) {
    console.error('Error retrieving auth token:', error);
    return undefined;
  }
};

/**
 * Clear authentication token from all storage
 */
export const clearAuthToken = (): void => {
  try {
    // Remove from cookies
    Cookies.remove(TOKEN_COOKIE_KEY);
    
    // Remove from localStorage
    localStorage.removeItem(TOKEN_LOCAL_STORAGE_KEY);
    
    // Disconnect socket
    refreshSocketConnection();
    
    console.log('Auth token cleared successfully');
  } catch (error) {
    console.error('Failed to clear auth token:', error);
  }
};

/**
 * Check if user is authenticated
 * @returns Boolean indicating if valid token exists
 */
export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

/**
 * Parse JWT token payload
 * @param token JWT token string
 * @returns Decoded token payload or null if invalid
 */
export const parseToken = (token: string): any | null => {
  try {
    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // The second part is the payload, which is base64 encoded
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch (error) {
    console.error('Error parsing JWT token:', error);
    return null;
  }
};

/**
 * Check if token is expired
 * @param token JWT token string
 * @returns Boolean indicating if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  const payload = parseToken(token);
  if (!payload || !payload.exp) return true;
  
  // exp is in seconds, Date.now() is in milliseconds
  const expiry = payload.exp * 1000;
  return Date.now() >= expiry;
}; 