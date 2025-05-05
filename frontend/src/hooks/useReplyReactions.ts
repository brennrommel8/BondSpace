import { useState, useCallback } from 'react';
import { postApi, Reaction, ReactionType } from '@/api/postApi';

export interface UseReplyReactionsReturn {
  isLoading: boolean;
  error: string | null;
  reactions: Reaction[];
  reactionsByType: Record<ReactionType, Reaction[]>;
  totalCount: number;
  fetchReplyReactions: (postId: string, commentId: string, replyId: string) => Promise<void>;
}

/**
 * Custom hook to fetch and manage reactions for a reply
 */
export const useReplyReactions = (): UseReplyReactionsReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [reactionsByType, setReactionsByType] = useState<Record<ReactionType, Reaction[]>>({} as Record<ReactionType, Reaction[]>);
  const [totalCount, setTotalCount] = useState(0);

  /**
   * Fetch reactions for a specific reply
   */
  const fetchReplyReactions = useCallback(async (postId: string, commentId: string, replyId: string): Promise<void> => {
    if (!postId || !commentId || !replyId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching reactions for reply: ${replyId} in comment: ${commentId} of post: ${postId}`);
      const response = await postApi.getReplyReactions(postId, commentId, replyId);
      
      if (response.success && response.data) {
        console.log('Raw API response for reply reactions:', response.data);
        
        // Validate and fix reaction data before setting state
        if (response.data.reactions && Array.isArray(response.data.reactions)) {
          // Ensure all reactions have a valid type
          const validatedReactions = response.data.reactions.map(reaction => {
            if (!reaction.type) {
              console.warn('Found reaction with undefined type in API response, defaulting to "like"', reaction);
              return { ...reaction, type: 'like' as ReactionType };
            }
            
            // Handle inconsistent reaction types (such as 'heart' vs 'love')
            if (reaction.type.toLowerCase() === 'heart') {
              console.log('Normalizing "heart" reaction to "love"');
              return { ...reaction, type: 'love' as ReactionType };
            }
            
            // Ensure the type is lowercase to match our enum
            return { ...reaction, type: reaction.type.toLowerCase() as ReactionType };
          });
          
          // Update the response data with validated reactions
          response.data.reactions = validatedReactions;
          
          // Rebuild the byType grouping with validated reactions
          const validatedByType: Record<ReactionType, Reaction[]> = {} as Record<ReactionType, Reaction[]>;
          validatedReactions.forEach(reaction => {
            const type = reaction.type || 'like';
            if (!validatedByType[type]) {
              validatedByType[type] = [];
            }
            validatedByType[type].push(reaction);
          });
          
          // Update the response data with validated byType
          response.data.byType = validatedByType;
          
          console.log('Normalized reaction types:', validatedReactions.map(r => r.type));
          console.log('Normalized byType keys:', Object.keys(validatedByType));
        }
        
        // Store reaction data
        setReactionsByType(response.data.byType as Record<ReactionType, Reaction[]>);
        setReactions(response.data.reactions);
        setTotalCount(response.data.totalCount);
        
        // Debug reaction types
        const reactionTypes = response.data.reactions.map(r => r.type);
        console.log('Reaction types in response:', reactionTypes);
        console.log('Reaction by type in response:', Object.keys(response.data.byType));
      } else {
        setError("Failed to fetch reply reactions");
      }
    } catch (err) {
      console.error("Error fetching reply reactions:", err);
      setError(err instanceof Error ? err.message : "Error loading reply reactions");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    reactions,
    reactionsByType,
    totalCount,
    fetchReplyReactions
  };
}; 