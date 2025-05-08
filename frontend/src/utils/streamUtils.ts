import { StreamChat } from 'stream-chat';
import { chatApi } from '@/api/chatApi';
import { toast } from 'sonner';

const streamClient = StreamChat.getInstance('4jn8epjtj47y');

export const generateStreamToken = async (userId: string, userName: string) => {
  try {
    console.log('Starting Stream token generation for:', { userId, userName });
    
    // Get token from server
    const { token } = await chatApi.getStreamToken(userId, userName);
    console.log('Received token from server');
    
    if (!token) {
      console.error('No token received from server');
      toast.error('Failed to initialize video call');
      throw new Error('No token received from server');
    }

    console.log('Connecting user to Stream...');
    // Connect the user to Stream
    await streamClient.connectUser(
      {
        id: userId,
        name: userName,
      },
      token
    );
    console.log('Successfully connected user to Stream');

    return token;
  } catch (error: any) {
    console.error('Error in generateStreamToken:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });

    // Show user-friendly error message
    if (error.message.includes('Authentication required')) {
      toast.error('Please log in again to make video calls');
    } else if (error.message.includes('Server error')) {
      toast.error('Unable to start video call. Please try again later.');
    } else {
      toast.error('Failed to start video call');
    }

    throw error;
  }
}; 