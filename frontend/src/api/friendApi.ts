import axios from 'axios'

const API_URL = 'http://localhost:3000/api'

export interface FriendResponse {
  success: boolean
  message?: string
  data?: any
  count?: number
}

export interface Friend {
  _id: string
  name: string
  username: string
  profilePicture: string | { url: string; publicId: string }
}

export interface FriendOperationsStatus {
  friendRequests: {
    received: Friend[];
    sent: Friend[];
    count: {
      received: number;
      sent: number;
    };
  };
  friends: {
    list: Friend[];
    count: number;
  };
  operations: {
    canSendRequest: boolean;
    canAcceptRequest: boolean;
    canRejectRequest: boolean;
    canRemoveFriend: boolean;
  };
}

// Create a custom axios instance for friend request operations
const friendRequestAxios = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  validateStatus: function (status) {
    return status < 500; // Accept all status codes less than 500
  }
});

// Add this helper function at the top
const handleApiError = (error: unknown, defaultMessage: string) => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message || defaultMessage;
    console.error('API Error:', {
      status: error.response?.status,
      message,
      url: error.config?.url,
      method: error.config?.method
    });
    return message;
  }
  console.error('Unknown error:', error);
  return defaultMessage;
};

// Add a response interceptor to handle 404s
friendRequestAxios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 404) {
      return {
        data: {
          success: true,
          message: 'Friend request not found, updating UI state'
        },
        status: 200,
        statusText: 'OK',
        headers: error.response.headers,
        config: error.config
      };
    }
    return Promise.reject(error);
  }
);

export const friendApi = {
  sendFriendRequest: async (userId: string): Promise<FriendResponse> => {
    try {
      if (!userId) {
        console.error('Send friend request error: userId is required')
        throw new Error('userId is required')
      }

      console.log('Sending friend request to userId:', userId)
      const response = await axios.post<FriendResponse>(
        `${API_URL}/friends/friend-requests`,
        { userId },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
      console.log('Friend request response:', response.data)
      return response.data
    } catch (error) {
      console.error('Friend request error:', error)
      if (axios.isAxiosError(error)) {
        console.error('Error details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        })
        if (error.response?.status === 400) {
          if (error.response?.data?.message === 'Friend request already sent') {
            return {
              success: true,
              message: 'Friend request already sent'
            }
          }
          if (error.response?.data?.message === 'Cannot send friend request to yourself') {
            throw new Error('Cannot send friend request to yourself')
          }
          throw new Error(error.response?.data?.message || 'Failed to send friend request')
        }
        throw new Error(error.response?.data?.message || 'Failed to send friend request')
      }
      throw error
    }
  },

  acceptFriendRequest: async (userId: string): Promise<FriendResponse> => {
    try {
      if (!userId) {
        console.error('Accept friend request error: userId is required')
        throw new Error('userId is required')
      }

      console.log('Accepting friend request from userId:', userId)
      const response = await axios.post<FriendResponse>(
        `${API_URL}/friends/friend-requests/${userId}`,
        { userId },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
      console.log('Accept friend request response:', response.data)
      return response.data
    } catch (error) {
      console.error('Accept friend request error:', error)
      if (axios.isAxiosError(error)) {
        console.error('Error details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        })
        if (error.response?.status === 400 && error.response?.data?.message === 'userId is required') {
          throw new Error('Invalid user ID')
        }
        throw new Error(error.response?.data?.message || 'Failed to accept friend request')
      }
      throw error
    }
  },

  // Then update the rejectFriendRequest method
rejectFriendRequest: async (userId: string): Promise<FriendResponse> => {
  try {
    if (!userId) throw new Error('userId is required');

    const response = await axios.delete<FriendResponse>(
      `${API_URL}/friends/friend-requests/${userId}`,
      { withCredentials: true }
    );

    // Handle cases where request was already removed
    if (response.status === 404) {
      return {
        success: true,
        message: 'Request already cancelled',
        data: { rejectedUser: { id: userId, username: '' } }
      };
    }

    return response.data;
  } catch (error) {
    const message = handleApiError(error, 'Failed to reject friend request');
    
    // Special case for 404 - treat as success (idempotent operation)
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return {
        success: true,
        message: 'Request already cancelled',
        data: { rejectedUser: { id: userId, username: '' } }
      };
    }

    throw new Error(message);
  }
},

  removeFriend: async (userId: string): Promise<FriendResponse> => {
    try {
      if (!userId) {
        console.error('Remove friend error: userId is required')
        throw new Error('userId is required')
      }

      console.log('Remove friend - userId:', userId)
      console.log('Remove friend - URL:', `${API_URL}/friends/${userId}`)
      
      const response = await axios.delete<FriendResponse>(
        `${API_URL}/friends/${userId}`,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          },
          params: {
            id: userId
          }
        }
      )
      console.log('Remove friend response:', response.data)
      return response.data
    } catch (error) {
      console.error('Remove friend error:', error)
      if (axios.isAxiosError(error)) {
        console.error('Error details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers,
            data: error.config?.data
          }
        })
        if (error.response?.status === 400) {
          if (error.response?.data?.message === 'userId is required') {
            throw new Error('Invalid user ID')
          }
          throw new Error(error.response?.data?.message || 'Failed to remove friend')
        }
        throw new Error(error.response?.data?.message || 'Failed to remove friend')
      }
      throw error
    }
  },

  getFriendRequests: async (): Promise<FriendResponse & { data: Friend[] }> => {
    try {
      console.log('Fetching friend requests')
      const response = await axios.get<FriendResponse & { data: Friend[] }>(
        `${API_URL}/friends/friend-requests`,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
      console.log('Friend requests response:', response.data)
      return response.data
    } catch (error) {
      console.error('Get friend requests error:', error)
      if (axios.isAxiosError(error)) {
        console.error('Error details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        })
        throw new Error(error.response?.data?.message || 'Failed to fetch friend requests')
      }
      throw error
    }
  },

  getFriends: async (): Promise<FriendResponse & { data: Friend[] }> => {
    try {
      console.log('Fetching friends')
      const response = await axios.get<FriendResponse & { data: Friend[] }>(
        `${API_URL}/friends`,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
      console.log('Friends response:', response.data)
      return response.data
    } catch (error) {
      console.error('Get friends error:', error)
      if (axios.isAxiosError(error)) {
        console.error('Error details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        })
        throw new Error(error.response?.data?.message || 'Failed to fetch friends')
      }
      throw error
    }
  },

  getFriendOperationsStatus: async (): Promise<FriendResponse & { data: FriendOperationsStatus }> => {
    try {
      console.log('Fetching friend operations status')
      const response = await axios.get<FriendResponse & { data: FriendOperationsStatus }>(
        `${API_URL}/friends/operations/status`,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
      console.log('Friend operations status response:', response.data)
      return response.data
    } catch (error) {
      console.error('Get friend operations status error:', error)
      if (axios.isAxiosError(error)) {
        console.error('Error details:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        })
        throw new Error(error.response?.data?.message || 'Failed to fetch friend operations status')
      }
      throw error
    }
  }
} 