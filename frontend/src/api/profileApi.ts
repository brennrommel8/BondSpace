import axios from 'axios';
import { UserProfile } from './authApi';

const API_URL = 'https://socmed-backend-8q7a.onrender.com/api';

interface ProfilePictureResponse {
  success: boolean;
  user?: UserProfile;
  message?: string;
}

interface UpdateVisibilityResponse {
  success: boolean;
  message?: string;
}

export const profileApi = {
  uploadProfilePicture: async (file: File): Promise<ProfilePictureResponse> => {
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await axios.post<ProfilePictureResponse>(
        `${API_URL}/profile/upload-profile-picture`,
        formData,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data',
          }
        }
      );
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
      const response = await axios.put<UpdateVisibilityResponse>(
        `${API_URL}/users/posts/visibility`,
        { visibility },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      console.log('API response for visibility update:', response.data)
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


