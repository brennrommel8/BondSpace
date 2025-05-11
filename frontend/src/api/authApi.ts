import api from '@/config/axios';
import axios from 'axios';
import { API_ENDPOINTS } from '@/config/api';


export interface SignUpData {
  name: string
  username: string
  email: string
  password: string
  confirmPassword: string
}

export interface SignUpResponse {
  success: boolean
  token?: string
  user?: {
    id: string
    name: string
    username: string
    email: string
    role: string
  }
  errors?: Record<string, string>
  message?: string
}

export interface UserProfile {
  id: string
  _id: string
  name: string
  username: string
  email: string
  profilePicture: string
  friends: string[]
  friendRequests: string[]
  role: string
  profileVisibility: 'public' | 'friends'
  postVisibility: 'public' | 'friends'
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  user?: T
}

export interface LoginResponse {
  success: boolean
  token?: string
  user?: UserProfile
  message?: string
}

export interface LoginInput {
  email: string
  password: string
}

interface UpdateProfileInput {
  name?: string;
  username?: string;
  email?: string;
}

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

// Interface for user status response
interface UserStatusResponse {
  success: boolean;
  status: {
    userId: string;
    isOnline: boolean;
    lastActive: string;
  };
}

// Interface for online users response
interface OnlineUsersResponse {
  success: boolean;
  users: Array<{
    id: string;
    name: string;
    username: string;
  }>;
}

export const authApi = {
  signUp: async (data: SignUpData): Promise<SignUpResponse> => {
    try {
      console.log('Sending signup request with data:', data)
      const response = await api.post<SignUpResponse>(`${API_ENDPOINTS.API}/auth/register`, data)
      console.log('Signup response:', response.data)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Signup error details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        })
        // Return the error response data directly
        return error.response?.data as SignUpResponse
      }
      console.error('Unexpected error:', error)
      throw error
    }
  },

  login: async (credentials: LoginInput): Promise<LoginResponse> => {
    try {
      const response = await api.post<LoginResponse>(`${API_ENDPOINTS.API}/auth/login`, credentials)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Login failed')
      }
      throw error
    }
  },

  logout: async () => {
    try {
      const response = await api.get(`${API_ENDPOINTS.API}/auth/logout`)
      return response.data
    } catch (error) {
      throw error
    }
  },

  getMe: async (): Promise<ApiResponse<UserProfile>> => {
    try {
      console.log('Fetching current user profile');
      const response = await api.get<ApiResponse<UserProfile>>(`${API_ENDPOINTS.API}/auth/me`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.error('Authentication error in getMe:', error.response.data);
        throw new Error('Please sign in to view your profile');
      }
      throw error;
    }
  },

  updateProfile: async (data: UpdateProfileInput) => {
    try {
      console.log('Sending update request with data:', data)
      const response = await api.put(
        `${API_ENDPOINTS.API}/auth/profile`,
        {
          name: data.name,
          username: data.username,
          email: data.email
        }
      );
      console.log('Update response:', response.data)
      return response.data;
    } catch (error) {
      console.error('Update profile error:', error)
      if (axios.isAxiosError(error)) {
        console.error('Error details:', error.response?.data)
        throw new Error(error.response?.data?.message || 'Failed to update profile');
      }
      throw error;
    }
  },

  changePassword: async (data: ChangePasswordInput) => {
    try {
      console.log('Sending change password request with data:', data)
      const response = await api.put(
        `${API_ENDPOINTS.API}/auth/password`,
        {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
          confirmNewPassword: data.confirmNewPassword
        }
      );
      console.log('Change password response:', response.data)
      return response.data;
    } catch (error) {
      console.error('Change password error:', error)
      if (axios.isAxiosError(error)) {
        console.error('Error details:', error.response?.data)
        throw new Error(error.response?.data?.message || 'Failed to change password');
      }
      throw error;
    }
  },

  // You can add more authentication-related methods here
  // For example:
  // logout: async () => { ... },
  // refreshToken: async () => { ... },
  // forgotPassword: async (email: string) => { ... },

  // Get user's online status
  getUserStatus: async (userId: string): Promise<UserStatusResponse> => {
    try {
      const response = await api.get(API_ENDPOINTS.AUTH.USER_STATUS(userId));
      return response.data;
    } catch (error) {
      console.error('Error fetching user status:', error);
      throw error;
    }
  },

  // Get all online users
  getOnlineUsers: async (): Promise<OnlineUsersResponse> => {
    try {
      const response = await api.get(API_ENDPOINTS.AUTH.ONLINE_USERS);
      return response.data;
    } catch (error) {
      console.error('Error fetching online users:', error);
      throw error;
    }
  },
}

export default authApi;
