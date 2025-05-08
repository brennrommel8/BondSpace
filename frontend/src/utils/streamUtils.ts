import { StreamChat } from 'stream-chat';

const streamClient = StreamChat.getInstance('4jn8epjtj47y');

export const generateStreamToken = async (userId: string, userName: string) => {
  try {
    // Create a token for the user using the Stream secret
    const token = streamClient.createToken(userId);
    
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