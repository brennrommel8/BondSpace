import api from '@/config/axios'
import axios from 'axios'
import { API_ENDPOINTS } from '@/config/api'

interface ProfilePictureResponse {
  success: boolean;
  message?: string;
  data?: {
    url: string;
    publicId: string;
  };
}

interface UpdateVisibilityResponse {
  success: boolean;
  message?: string;
  data?: {
    visibility: 'public' | 'friends';
  };
}

export const profileApi = {
  uploadProfilePicture: async (file: File): Promise<ProfilePictureResponse> => {
    try {
      console.log('Uploading profile picture...');
      
      // Create form data
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await api.post<ProfilePictureResponse>(
        `${API_ENDPOINTS.API}/profile/upload-profile-picture`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          }
        }
      );
      
      console.log('Upload response:', response.data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Upload error details:', error.response?.data);
        throw new Error(error.response?.data?.message || 'Failed to upload profile picture');
      }
      throw error;
    }
  },

  updatePostVisibility: async (visibility: 'public' | 'friends'): Promise<UpdateVisibilityResponse> => {
    try {
      console.log(`Making API request to update visibility to: ${visibility}`)
      const response = await api.put<UpdateVisibilityResponse>(
        `${API_ENDPOINTS.API}/users/posts/visibility`,
        { visibility },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      console.log('Update visibility response:', response.data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Update visibility error details:', error.response?.data);
        throw new Error(error.response?.data?.message || 'Failed to update post visibility');
      }
      throw error;
    }
  },
};


