import axios from 'axios'

const API_URL = 'https://socmed-backend-8q7a.onrender.com/api'

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

export const authApi = {
  signUp: async (data: SignUpData): Promise<SignUpResponse> => {
    try {
      console.log('Sending signup request with data:', data)
      const response = await axios.post<SignUpResponse>(`${API_URL}/auth/register`, data, {
        withCredentials: true // Important for cookies
      })
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
      const response = await axios.post<LoginResponse>(`${API_URL}/auth/login`, credentials, {
        withCredentials: true // Important for cookies
      })
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
      const response = await axios.get(`${API_URL}/auth/logout`, {
        withCredentials: true
      })
      return response.data
    } catch (error) {
      throw error
    }
  },

  getMe: async (): Promise<ApiResponse<UserProfile>> => {
    try {
      // Get token from both cookie and localStorage to ensure we have it
      const token = localStorage.getItem('token') || document.cookie.replace(/(?:(?:^|.*;\s*)token\s*\=\s*([^;]*).*$)|^.*$/, "$1");
      
      console.log('Auth token used for getMe request:', token ? 'Present' : 'Missing');
      
      const response = await axios.get<ApiResponse<UserProfile>>(`${API_URL}/auth/me`, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
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
      const response = await axios.put(
        `${API_URL}/auth/profile`,
        {
          name: data.name,
          username: data.username,
          email: data.email
        },
        { 
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
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
      const response = await axios.put(
        `${API_URL}/auth/password`,
        {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
          confirmNewPassword: data.confirmNewPassword
        },
        { 
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
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
}
