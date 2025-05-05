import { useState, useCallback } from 'react';
import { postApi, Reaction, ReactionType } from '@/api/postApi';

export interface UseReactionsReturn {
  isLoading: boolean;
  error: string | null;
  reactions: Reaction[];
  reactionsByType: Record<ReactionType, Reaction[]>;
  totalCount: number;
  fetchReactions: (postId: string) => Promise<void>;
}

/**
 * Custom hook to fetch and manage reactions for a post
 */
export const useReactions = (): UseReactionsReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [reactionsByType, setReactionsByType] = useState<Record<ReactionType, Reaction[]>>({} as Record<ReactionType, Reaction[]>);
  const [totalCount, setTotalCount] = useState(0);

  /**
   * Fetch reactions for a specific post
   */
  const fetchReactions = useCallback(async (postId: string): Promise<void> => {
    if (!postId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching reactions for post: ${postId}`);
      const response = await postApi.getPostReactions(postId);
      
      if (response.success && response.data) {
        // Store reaction data
        setReactionsByType(response.data.byType as Record<ReactionType, Reaction[]>);
        setReactions(response.data.reactions);
        setTotalCount(response.data.totalCount);
      } else {
        setError("Failed to fetch reactions");
      }
    } catch (err) {
      console.error("Error fetching reactions:", err);
      setError(err instanceof Error ? err.message : "Error loading reactions");
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
    fetchReactions
  };
}; 