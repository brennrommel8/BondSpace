import axios from 'axios'
import api from '@/config/axios'
import { API_ENDPOINTS } from '@/config/api'

// Store failed user IDs temporarily
let tempFailedUserIds: string[] = [];

// Initialize failed users cache from localStorage
try {
  const failedUsersJson = localStorage.getItem('failedUserIds');
  if (failedUsersJson) {
    const failedUsers = JSON.parse(failedUsersJson);
    if (Array.isArray(failedUsers)) {
      console.log(`Loaded ${failedUsers.length} failed user IDs from localStorage`);
      tempFailedUserIds = failedUsers.filter(userId => typeof userId === 'string');
    }
  }
} catch (e) {
  console.error('Error loading failed user IDs from localStorage:', e);
}

export interface User {
  _id: string
  id?: string
  name: string
  username: string
  profilePicture?: string | { url: string; publicId: string } | { type: null; url: string }
}

export interface Comment {
  _id: string
  id?: string
  content: string
  user: User
  createdAt: string
  replies?: Comment[]
  data?: {
    user: User
  }
  reactions?: Reaction[]
}

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export interface Reaction {
  _id?: string;
  id?: string;
  user: User;
  type: ReactionType;
  createdAt?: string;
}

export interface Post {
  _id: string
  id?: string
  content: string
  user: User
  likes: User[]
  reactions?: Reaction[]
  comments: Comment[]
  createdAt: string
  updatedAt?: string
  media?: Array<{
    type: string
    url: string
  }>
  visibility?: 'public' | 'friends'
}

export interface PostsResponse {
  success: boolean
  count: number
  data: Post[]
}

export interface PostResponse {
  success: boolean
  data: Post
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  reactionType?: ReactionType
  data?: T
  error?: string
}

export interface ReactionsByTypeResponse {
  success: boolean;
  data: {
    totalCount: number;
    reactions: Reaction[];
    byType: Record<ReactionType, Reaction[]>;
  }
}

// Add a realtimeUpdates interface
export interface RealtimeUpdateInfo {
  enabled: boolean;
  socketEvent?: string;
  shouldJoinRoom?: boolean;
  roomToJoin?: string;
}

// Update the reaction response type to include realtimeUpdates
export interface ReactionResponse {
  totalCount: number;
  reactions: Reaction[];
  byType: Record<ReactionType, Reaction[]>;
  realtimeUpdates?: RealtimeUpdateInfo;
}

// Helper function to normalize profile picture
export const normalizeProfilePicture = (profilePicture: any): string => {
  if (!profilePicture) return '';
  
  // If it's a string, return directly
  if (typeof profilePicture === 'string') return profilePicture;
  
  // If it has a url property, return that
  if (profilePicture.url) return profilePicture.url;
  
  // Default fallback
  return '';
};

// Helper function to normalize user object
export const normalizeUser = (user: any): User => {
  if (!user) return { _id: '', name: '', username: '' };

  // If user is just a string ID, return an object with just the ID
  if (typeof user === 'string') {
    return {
      _id: user,
      id: user,
      name: '',
      username: '',
    };
  }

  return {
    _id: user._id || user.id || '',
    id: user.id || user._id || '',
    name: user.name || '',
    username: user.username || '',
    profilePicture: user.profilePicture ? normalizeProfilePicture(user.profilePicture) : ''
  };
};

interface MediaFile {
  file: File;
  preview: string;
  type: 'image' | 'video';
}

export const postApi = {
  // Track users that failed to load (to avoid repeated 404 requests)
  _failedUserIds: new Set<string>(tempFailedUserIds),
  
  // Get user by ID (to retrieve user information for comments)
  getUserById: async (userId: string): Promise<User> => {
    try {
      // Check if this user ID has already failed to load
      if (postApi._failedUserIds.has(userId)) {
        console.log(`Skipping already failed user ID: ${userId}`);
        return { 
          _id: userId, 
          id: userId, 
          name: 'User', 
          username: 'user' 
        };
      }
      
      console.log(`Fetching user details for ID ${userId}`);
      
      // First, try to get the current user from localStorage
      const currentUserJson = localStorage.getItem('currentUser');
      if (currentUserJson) {
        try {
          const currentUser = JSON.parse(currentUserJson);
          if (currentUser._id === userId || currentUser.id === userId) {
            console.log('Using current user data from localStorage');
            return currentUser;
          }
        } catch (e) {
          console.error('Error parsing currentUser from localStorage:', e);
        }
      }
      
      // Try to get from localStorage users cache
      const cachedUsersJson = localStorage.getItem('cachedUsers');
      if (cachedUsersJson) {
        try {
          const cachedUsers = JSON.parse(cachedUsersJson);
          if (cachedUsers[userId]) {
            console.log(`Using cached data for user ${userId}`);
            return cachedUsers[userId];
          }
        } catch (e) {
          console.error('Error parsing cachedUsers from localStorage:', e);
        }
      }
      
      // Make an API call to get the user data
      const response = await api.get<{success: boolean; data: User}>(
        API_ENDPOINTS.USER.BY_ID(userId)
      );
      
      if (response.data && response.data.success && response.data.data) {
        const userData = normalizeUser(response.data.data);
        console.log(`Got user data for ${userId}:`, userData);
        
        // Cache the user data in localStorage
        try {
          const cachedUsersJson = localStorage.getItem('cachedUsers') || '{}';
          const cachedUsers = JSON.parse(cachedUsersJson);
          cachedUsers[userId] = userData;
          localStorage.setItem('cachedUsers', JSON.stringify(cachedUsers));
        } catch (e) {
          console.error('Error caching user data to localStorage:', e);
        }
        
        return userData;
      }
      
      // If no user data found, return a default user and cache the failure
      console.warn(`No user data found for ID ${userId}`);
      postApi._failedUserIds.add(userId);
      return { 
        _id: userId, 
        id: userId, 
        name: 'User', 
        username: 'user' 
      };
    } catch (error) {
      console.error(`Failed to fetch user details for ${userId}:`, error);
      
      // Add to the failed users set to prevent repeated requests
      postApi._failedUserIds.add(userId);
      
      // Try to persist failed user IDs to localStorage
      try {
        const failedUsersJson = localStorage.getItem('failedUserIds') || '[]';
        const failedUsers = JSON.parse(failedUsersJson);
        if (!failedUsers.includes(userId)) {
          failedUsers.push(userId);
          localStorage.setItem('failedUserIds', JSON.stringify(failedUsers));
        }
      } catch (e) {
        console.error('Error saving failed user ID to localStorage:', e);
      }
      
      return { 
        _id: userId, 
        id: userId, 
        name: 'User', 
        username: 'user' 
      };
    }
  },

  // Get all posts for news feed
  getPosts: async (): Promise<PostsResponse> => {
    try {
      console.log('Fetching posts from API...');
      const response = await api.get<PostsResponse>(
        `${API_ENDPOINTS.API}/posts`,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error fetching posts:', error);
      
      // Better error message based on error type
      if (axios.isAxiosError(error)) {
        // Check for network issues
        if (!error.response) {
          throw new Error('Network error. Please check your connection to the server.');
        }
        
        // Check for specific status codes
        const status = error.response.status;
        if (status === 401) {
          throw new Error('Authentication error. Please sign in again.');
        } else if (status === 403) {
          throw new Error('You do not have permission to view these posts.');
        } else if (status === 404) {
          throw new Error('Posts not found.');
        } else if (status >= 500) {
          throw new Error('Server error. Please try again later.');
        }
        
        // Use server error message if available
        throw new Error(error.response.data?.message || 'Failed to fetch posts');
      }
      
      // For non-Axios errors
      throw new Error('Error loading posts. Please try again.');
    }
  },

  // Get a single post by ID
  getPost: async (postId: string): Promise<PostResponse> => {
    try {
      const response = await api.get<PostResponse>(
        `${API_ENDPOINTS.API}/posts/${postId}`,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Get post error details:', error.response?.data);
        throw new Error(error.response?.data?.message || 'Failed to fetch post');
      }
      throw error;
    }
  },

  // Create a new post
  createPost: async (content: string, mediaFiles: MediaFile[]): Promise<PostResponse> => {
    try {
      let response;
      
      if (mediaFiles && mediaFiles.length > 0) {
        // If there are media files, use FormData
        const formData = new FormData();
        formData.append('content', content);
        
        // Append each media file with its type
        mediaFiles.forEach((mediaFile) => {
          formData.append(`media`, mediaFile.file);
          formData.append(`mediaTypes`, mediaFile.type);
        });
        
        response = await api.post<PostResponse>(
          `${API_ENDPOINTS.API}/posts`,
          formData,
          {
            withCredentials: true,
            headers: {
              'Content-Type': 'multipart/form-data',
            }
          }
        );
      } else {
        // Otherwise just send JSON
        response = await api.post<PostResponse>(
          `${API_ENDPOINTS.API}/posts`,
          { content },
          {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );
      }
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Create post error details:', error.response?.data);
        throw new Error(error.response?.data?.message || 'Failed to create post');
      }
      throw error;
    }
  },

  // Like/unlike a post
  toggleLike: async (postId: string): Promise<ApiResponse<ReactionResponse>> => {
    try {
      const response = await api.put<ApiResponse<ReactionResponse>>(
        `${API_ENDPOINTS.API}/posts/${postId}/like`,
        {},
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Toggle like error details:', error.response?.data)
        throw new Error(error.response?.data?.message || 'Failed to like/unlike post')
      }
      throw error
    }
  },

  // Add a comment to a post
  addComment: async (postId: string, content: string): Promise<PostResponse> => {
    try {
      const response = await api.post<PostResponse>(
        `${API_ENDPOINTS.API}/posts/${postId}/comments`,
        { content },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Add comment error details:', error.response?.data);
        throw new Error(error.response?.data?.message || 'Failed to add comment');
      }
      throw error;
    }
  },

  // Reply to a comment
  replyToComment: async (postId: string, commentId: string, content: string): Promise<PostResponse> => {
    try {
      const response = await api.post<PostResponse>(
        `${API_ENDPOINTS.API}/posts/${postId}/comments/${commentId}/replies`,
        { content },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Reply to comment error details:', error.response?.data);
        throw new Error(error.response?.data?.message || 'Failed to reply to comment');
      }
      throw error;
    }
  },

  // Add a reaction to a post
  addReaction: async (postId: string, reactionType: ReactionType): Promise<ApiResponse<ReactionResponse>> => {
    try {
      console.log(`Adding ${reactionType} reaction to post ${postId}`);
      
      // Use the like endpoint directly with the reactionType
      const likeResponse = await api.put<ApiResponse<ReactionResponse>>(
        `${API_ENDPOINTS.API}/posts/${postId}/like`,
        { reactionType }, // Pass the reaction type in the request body
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      return {
        ...likeResponse.data,
        reactionType // Include the reaction type in the response
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Add reaction error details:', error.response?.data);
        throw new Error(error.response?.data?.message || 'Failed to add reaction');
      }
      throw error;
    }
  },

  // Add a reaction to a reply
  addReplyReaction: async (postId: string, commentId: string, replyId: string, reactionType: ReactionType): Promise<ApiResponse<ReactionResponse>> => {
    try {
      console.log(`Adding ${reactionType} reaction to reply ${replyId}`);
      
      // Make sure we're explicitly sending the correct reaction type
      console.log('Reaction payload:', { reactionType });
      
      const response = await api.put<ApiResponse<ReactionResponse>>(
        `${API_ENDPOINTS.API}/posts/${postId}/comments/${commentId}/replies/${replyId}/react`,
        { reactionType },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      // Debug the response to see if the reaction type is preserved
      console.log('Reply reaction response:', response.data);
      
      return {
        ...response.data,
        reactionType // Include the reaction type in the response
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Add reply reaction error:', error.response?.data);
        throw new Error(error.response?.data?.message || 'Failed to add reaction to reply');
      }
      throw error;
    }
  },

  // Get comments for a post with user data
  // If userId is provided, it will fetch only comments by that user
  // Otherwise, it will try to fetch all comments with user data
  getCommentsWithUserData: async (postId: string, userId?: string): Promise<any> => {
    try {
      // Use the exact endpoint format from the backend code
      let url = `${API_ENDPOINTS.API}/posts/${postId}`;
      
      console.log(`Fetching ${userId ? 'user comments' : 'post data'} for post ${postId}`);
      
      // If we want to get comments for a specific user
      if (userId) {
        url = `${url}/comments/user/${userId}`;
        console.log(`Fetching comments by user ${userId} for post ${postId}`);
      }
      
      const response = await api.get(
        url,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (response.data && response.data.success) {
        // Handle different response formats
        // When fetching a specific user's comments vs fetching a post with comments
        let commentsData;
        if (userId && response.data.data?.comments) {
          // For user-specific comments endpoint
          commentsData = response.data.data;
        } else if (response.data.data) {
          // For regular post endpoint
          commentsData = {
            post: response.data.data,
            comments: response.data.data.comments || []
          };
        }
        
        if (commentsData) {
          console.log('Successfully fetched data:', commentsData);
          
          // Cache user data
          try {
            const cachedUsersJson = localStorage.getItem('cachedUsers') || '{}';
            const cachedUsers = JSON.parse(cachedUsersJson);
            
            // Cache post owner
            if (commentsData.post && commentsData.post.user) {
              const postUser = commentsData.post.user;
              if (postUser && typeof postUser !== 'string' && postUser._id) {
                cachedUsers[postUser._id] = normalizeUser(postUser);
              }
            }
            
            // Cache comment users
            if (commentsData.comments && Array.isArray(commentsData.comments)) {
              commentsData.comments.forEach((comment: any) => {
                if (comment.user && typeof comment.user !== 'string' && comment.user._id) {
                  cachedUsers[comment.user._id] = normalizeUser(comment.user);
                }
                
                // Also cache users from replies
                if (comment.replies && Array.isArray(comment.replies)) {
                  comment.replies.forEach((reply: any) => {
                    if (reply.user && typeof reply.user !== 'string' && reply.user._id) {
                      cachedUsers[reply.user._id] = normalizeUser(reply.user);
                    }
                  });
                }
              });
            }
            
            localStorage.setItem('cachedUsers', JSON.stringify(cachedUsers));
          } catch (e) {
            console.error('Error caching user data:', e);
          }
          
          return { success: true, data: commentsData };
        }
        
        return response.data;
      }
      
      // Return the raw response if not successful
      return response.data;
    } catch (error) {
      // Add better error logging
      if (axios.isAxiosError(error)) {
        console.error('Error details:', error.response?.data);
        console.error('Error status:', error.response?.status);
      }
      console.error('Error fetching data:', error);
      
      // Fall back to just getting the post data directly
      if (userId) {
        console.log('Falling back to fetching just the post data');
        try {
          return await postApi.getPost(postId);
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        }
      }
      
      throw new Error('Failed to fetch comments with user data');
    }
  },

  // Get users who reacted to a post
  getPostReactions: async (postId: string): Promise<ApiResponse<ReactionResponse>> => {
    try {
      console.log(`Fetching reactions for post ${postId}`);
      
      const response = await api.get<ApiResponse<ReactionResponse>>(
        `${API_ENDPOINTS.API}/posts/${postId}/reactions`,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Get reactions error details:', error.response?.data);
        throw new Error(error.response?.data?.message || 'Failed to fetch reactions');
      }
      throw error;
    }
  },

  // Get users who reacted to a reply
  getReplyReactions: async (postId: string, commentId: string, replyId: string): Promise<ApiResponse<ReactionResponse>> => {
    try {
      console.log(`Fetching reactions for reply ${replyId}`);
      
      const response = await api.get<ApiResponse<ReactionResponse>>(
        `${API_ENDPOINTS.API}/posts/${postId}/comments/${commentId}/replies/${replyId}/reactions`,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      // Debug the response
      console.log('Raw API response data for reply reactions:', {
        success: response.data.success,
        totalCount: response.data.data?.totalCount,
        reactionCount: response.data.data?.reactions?.length,
        byTypeKeys: response.data.data?.byType ? Object.keys(response.data.data.byType) : []
      });
      
      if (response.data?.data?.reactions?.[0]) {
        console.log('First reaction example:', response.data.data.reactions[0]);
      }
      
      // Map and fix reaction types if needed
      if (response.data?.data?.reactions) {
        response.data.data.reactions = response.data.data.reactions.map(reaction => {
          // Check for specific issues with reaction types
          if (!reaction.type) {
            console.warn('Found reaction with undefined type, fixing to "like"');
            return { ...reaction, type: 'like' as ReactionType };
          }
          
          // Ensure consistent type across the app
          // Some backends might return numeric IDs or different strings
          console.log(`Fixing reaction type: ${reaction.type}`);
          
          // Create a new object with the properly typed reaction
          return { 
            ...reaction,
            // Ensure it's one of our valid types
            type: (reaction.type.toLowerCase() === 'heart' || reaction.type.toLowerCase() === 'love') 
              ? 'love' as ReactionType 
              : (reaction.type.toLowerCase() as ReactionType)
          };
        });
        
        // Rebuild the byType grouping with fixed reaction types
        if (response.data.data.byType) {
          const fixedByType: Record<string, any[]> = {};
          
          response.data.data.reactions.forEach(reaction => {
            const type = reaction.type || 'like';
            if (!fixedByType[type]) {
              fixedByType[type] = [];
            }
            fixedByType[type].push(reaction);
          });
          
          response.data.data.byType = fixedByType;
          
          console.log('Fixed byType object:', Object.keys(fixedByType));
        }
      }
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Get reply reactions error details:', error.response?.data);
        throw new Error(error.response?.data?.message || 'Failed to fetch reply reactions');
      }
      throw error;
    }
  },

  // Add or update a reaction to a comment
  reactToComment: async (postId: string, commentId: string, reactionType: ReactionType) => {
    try {
      console.log(`Adding reaction ${reactionType} to comment ${commentId} on post ${postId}`);
      const response = await api.put<ApiResponse<Comment>>(
        `${API_ENDPOINTS.API}/posts/${postId}/comments/${commentId}/reactions`,
        { reactionType },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      console.log('Reaction response:', response.data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error adding reaction to comment:', error.response?.data);
        throw new Error(error.response?.data?.message || 'Failed to add reaction to comment');
      }
      throw error;
    }
  },

  // Get reactions for a comment
  getCommentReactions: async (postId: string, commentId: string) => {
    try {
      console.log(`Fetching reactions for comment ${commentId} on post ${postId}`);
      const response = await api.get<ReactionsByTypeResponse>(
        `${API_ENDPOINTS.API}/posts/${postId}/comments/${commentId}/reactions`,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      console.log('Comment reactions response:', response.data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Error fetching comment reactions:', error.response?.data);
        throw new Error(error.response?.data?.message || 'Failed to fetch comment reactions');
      }
      throw error;
    }
  },
} 