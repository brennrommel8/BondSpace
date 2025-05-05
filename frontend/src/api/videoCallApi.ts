import axios from 'axios';
import { API_ENDPOINTS } from '@/config/api';

export interface VideoCallData {
  _id: string;
  initiator: string;
  recipient: string;
  roomId: string;
  startTime: string;
  endTime?: string;
  status: 'pending' | 'active' | 'ended' | 'rejected';
}

export const videoCallApi = {
  /**
   * Initiate a video call with another user
   * @param recipientId ID of the user to call
   * @returns The created call data with room ID
   */
  initiateCall: async (recipientId: string): Promise<{ success: boolean; call?: VideoCallData; roomId?: string; message?: string }> => {
    try {
      console.log('Initiating call to user:', recipientId);
      const response = await axios.post<{ 
        success: boolean; 
        call?: VideoCallData; 
        roomId?: string; 
        message?: string 
      }>(
        API_ENDPOINTS.CALLS.INITIATE,
        { recipientId },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      console.log('Initiate call response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error initiating call:', error);
      console.error('Response data:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to initiate call'
      };
    }
  },
  
  /**
   * Answer an incoming call
   * @param callId ID of the call to answer
   * @returns Success status and updated call data
   */
  answerCall: async (callId: string): Promise<{ success: boolean; call?: VideoCallData; message?: string }> => {
    try {
      console.log('Answering call:', callId);
      const response = await axios.post<{ success: boolean; call?: VideoCallData; message?: string }>(
        API_ENDPOINTS.CALLS.ANSWER(callId),
        {},
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      console.log('Answer call response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error answering call:', error);
      console.error('Response data:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to answer call'
      };
    }
  },
  
  /**
   * Reject an incoming call
   * @param callId ID of the call to reject
   * @returns Success status
   */
  rejectCall: async (callId: string): Promise<{ success: boolean; message?: string }> => {
    try {
      console.log('Rejecting call:', callId);
      const response = await axios.post<{ success: boolean; message?: string }>(
        API_ENDPOINTS.CALLS.REJECT(callId),
        {},
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      console.log('Reject call response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error rejecting call:', error);
      console.error('Response data:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to reject call'
      };
    }
  },
  
  /**
   * End an active call
   * @param callId ID of the call to end
   * @returns Success status
   */
  endCall: async (callId: string): Promise<{ success: boolean; message?: string }> => {
    try {
      console.log('Ending call:', callId);
      const response = await axios.post<{ success: boolean; message?: string }>(
        API_ENDPOINTS.CALLS.END(callId),
        {},
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      console.log('End call response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error ending call:', error);
      console.error('Response data:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to end call'
      };
    }
  }
}; 