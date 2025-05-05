import axios from 'axios'
import api from '@/config/axios'

// Hardcoded API URL
const API_URL = 'https://socmed-backend-8q7a.onrender.com/api'

export interface UserSearchResult {
  id: string
  name: string
  username: string
  profilePicture: string
}

export interface SearchResponse {
  success: boolean
  data: {
    users: UserSearchResult[]
  }
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
}

export interface Post {
  id: string
  content: string
  createdAt: string
  user: {
    name: string
    username: string
    profilePicture: string
  }
  likes: Array<{
    name: string
    username: string
    profilePicture: string
  }>
  comments: Array<{
    id: string
    content: string
    user: {
      name: string
      username: string
      profilePicture: string
    }
    replies: Array<{
      id: string
      content: string
      user: {
        name: string
        username: string
        profilePicture: string
      }
    }>
  }>
}

export interface UserProfileResponse {
  success: boolean
  data: {
    user: UserProfile
    posts: Post[]
    isFriend: boolean
    isOwnProfile: boolean
  }
}

export const searchUsers = async (query: string): Promise<SearchResponse> => {
  try {
    const response = await api.get(`${API_URL}/users/search?query=${query}`)
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Failed to search users')
    }
    throw error
  }
}

export const getUserProfile = async (username: string): Promise<UserProfileResponse> => {
  try {
    console.log(`Fetching profile for username: ${username}`);
    const response = await api.get(`${API_URL}/users/${username}`)
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Profile fetch error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        url: error.config?.url
      });
      
      if (error.response?.status === 500) {
        throw new Error(`Server error: ${error.response?.data?.message || 'The user profile could not be loaded'}`);
      }
      throw new Error(error.response?.data?.message || 'Failed to fetch user profile');
    }
    console.error('Unknown error during profile fetch:', error);
    throw new Error('Failed to fetch user profile');
  }
}
