import { Request, Response } from 'express';
import { StreamChat } from 'stream-chat';

// Initialize Stream client
const streamClient = StreamChat.getInstance(process.env.STREAM_API_KEY || '');

export const generateStreamToken = async (req: Request, res: Response): Promise<void> => {
    try {
        // The user is already authenticated by the protect middleware
        const { userId, userName } = req.body;

        if (!userId || !userName) {
            res.status(400).json({ 
                success: false, 
                message: "User ID and name are required" 
            });
            return;
        }

        // Create a token for the user
        const token = streamClient.createToken(userId);

        // Connect the user to Stream
        await streamClient.upsertUser({
            id: userId,
            name: userName,
        });

        res.status(200).json({
            success: true,
            token
        });
    } catch (error) {
        console.error("Error generating Stream token:", error);
        res.status(500).json({ 
            success: false, 
            message: error instanceof Error ? error.message : 'Server error' 
        });
    }
}; 