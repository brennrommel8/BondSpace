import { StreamChat } from 'stream-chat';
import { chatApi } from '@/api/chatApi';

const streamClient = StreamChat.getInstance('4jn8epjtj47y');

export const generateStreamToken = async (userId: string, userName: string) => {
  try {
    // Get token from server
    const { token } = await chatApi.getStreamToken(userId, userName);
    
    if (!token) {
      throw new Error('No token received from server');
    }

    // Connect the user to Stream
    await streamClient.connectUser(
      {
        id: userId,
        name: userName,
      },
      token
    );

    return token;
  } catch (error) {
    console.error('Error generating Stream token:', error);
    throw error;
  }
}; 