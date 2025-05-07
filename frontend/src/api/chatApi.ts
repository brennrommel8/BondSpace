import api from '@/config/axios'
import { API_ENDPOINTS } from '@/config/api'
import axios from 'axios'

export interface IUser {
  _id: string;
  name: string;
  username: string;
  profilePicture?: string | { url: string; publicId: string };
}

export interface Media {
  url: string;
  publicId: string;
  mediaType: 'image' | 'video';
  thumbnail?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface Message {
  _id: string;
  sender: string | IUser;
  content?: string;
  media?: Media[];
  conversation: string;
  readBy?: string[];
  deleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  _id: string;
  participants: IUser[];
  lastMessage?: Message;
  unreadCount: number;
  notifications?: Notification[];
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface ConversationResponse {
  success: boolean;
  conversations?: Conversation[];
  pagination?: PaginationInfo;
  message?: string;
}

export const chatApi = {
  /**
   * Create or get a conversation with another user
   * @param participantId ID of the user to start a conversation with
   * @returns The new or existing conversation
   */
  createOrGetConversation: async (participantId: string): Promise<ConversationResponse> => {
    try {
      console.log('Creating/getting conversation with participant:', participantId);
      // Using configured axios instance
      const response = await api.post<ConversationResponse>(
        `${API_ENDPOINTS.API}/chat/conversations`,
        { participantId }
      );
      console.log('Create/get conversation response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating or getting conversation:', error);
      console.error('Response data:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create or get conversation'
      };
    }
  },
  
  /**
   * Get all conversations for the current user
   * @returns List of user conversations with pagination
   */
  getConversations: async (page: number = 1, limit: number = 20): Promise<ConversationResponse> => {
    try {
      console.log('Fetching conversations...');
      const response = await api.get(`${API_ENDPOINTS.API}/chat/conversations`, {
        params: { page, limit }
      });
      console.log('Get conversations response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error getting conversations:', error);
      console.error('Response data:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get conversations'
      };
    }
  },
  
  /**
   * Get messages for a specific conversation
   * @param conversationId ID of the conversation to get messages for
   * @returns List of messages in the conversation
   */
  getMessages: async (conversationId: string): Promise<{ success: boolean; messages?: Message[]; message?: string }> => {
    try {
      console.log('Fetching messages for conversation:', conversationId);
      // Using configured axios instance
      const response = await api.get(`${API_ENDPOINTS.API}/chat/conversations/${conversationId}/messages`);
      console.log('Get messages response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error getting messages:', error);
      console.error('Response data:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get messages'
      };
    }
  },
  
  /**
   * Send a message in a conversation
   * @param conversationId ID of the conversation
   * @param content Message content (optional if files are provided)
   * @param files Optional files to upload (images only, max 3)
   * @returns The created message
   */
  sendMessage: async (
    conversationId: string, 
    content?: string, 
    files?: File[]
  ): Promise<{ success: boolean; message?: Message; error?: string }> => {
    try {
      console.log('Sending message to conversation:', conversationId, 'Content:', content, 'Files:', files?.length || 0);
      
      // Must have either content or files
      if ((!content || !content.trim()) && (!files || files.length === 0)) {
        return {
          success: false,
          error: 'Message content or files are required'
        };
      }
      
      // Using FormData to support file uploads
      const formData = new FormData();
      formData.append('conversationId', conversationId);
      
      if (content) {
        formData.append('content', content);
      }
      
      // Add files if present (limit to 3 files)
      if (files && files.length > 0) {
        if (files.length > 3) {
          return {
            success: false,
            error: 'Maximum 3 attachments allowed'
          };
        }
        
        // Make sure all files are images
        const allImages = files.every(file => file.type.startsWith('image/'));
        if (!allImages) {
          return {
            success: false,
            error: 'Only image files are allowed'
          };
        }
        
        // Add each file to the form data using "media" as the field name
        files.forEach(file => {
          formData.append('media', file);
        });
      }
      
      // We need a custom config for the FormData content type
      const response = await api.post(
        `${API_ENDPOINTS.API}/chat/messages`, 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          }
        }
      );
      
      console.log('Send message response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error sending message:', error);
      console.error('Response data:', error.response?.data);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to send message'
      };
    }
  },

  /**
   * Delete a message
   * @param messageId ID of the message to delete
   * @returns Success status
   */
  deleteMessage: async (messageId: string): Promise<{ success: boolean; message?: string }> => {
    try {
      console.log('Deleting message:', messageId);
      const response = await api.delete(`${API_ENDPOINTS.API}/chat/messages/${messageId}`);
      console.log('Delete message response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting message:', error);
      console.error('Response data:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete message'
      };
    }
  },

  /**
   * Mark all messages in a conversation as read
   * @param conversationId ID of the conversation
   * @returns Success status
   */
  markMessagesAsRead: async (conversationId: string): Promise<{ success: boolean; message?: string }> => {
    try {
      console.log('Marking messages as read in conversation:', conversationId);
      const response = await api.patch(`${API_ENDPOINTS.API}/chat/conversations/${conversationId}/messages/read`, {});
      console.log('Mark messages as read response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error marking messages as read:', error);
      console.error('Response data:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to mark messages as read'
      };
    }
  },

  markConversationAsRead: async (conversationId: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await api.put(`${API_ENDPOINTS.CHAT}/conversations/${conversationId}/read`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to mark conversation as read');
      }
      throw error;
    }
  }
};
