import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postApi, Reaction, ReactionType } from '@/api/postApi';

export interface UseReactionsReturn {
  isLoading: boolean;
  error: string | null;
  reactions: Reaction[];
  reactionsByType: Record<ReactionType, Reaction[]>;
  totalCount: number;
  addReaction: (type: ReactionType) => Promise<void>;
  isAddingReaction: boolean;
}

/**
 * Custom hook to fetch and manage reactions for a post using React Query
 */
export const useReactions = (postId: string): UseReactionsReturn => {
  const queryClient = useQueryClient();

  // Query for fetching reactions
  const { data, isLoading, error } = useQuery({
    queryKey: ['post-reactions', postId],
    queryFn: () => postApi.getPostReactions(postId),
    enabled: !!postId,
  });

  // Mutation for adding reactions with optimistic updates
  const { mutate: addReaction, isPending: isAddingReaction } = useMutation({
    mutationFn: (type: ReactionType) => postApi.addReaction(postId, type),
    onMutate: async (newReactionType) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['post-reactions', postId] });

      // Snapshot the previous value
      const previousReactions = queryClient.getQueryData(['post-reactions', postId]);

      // Optimistically update to the new value
      queryClient.setQueryData(['post-reactions', postId], (old: any) => {
        const currentReactions = old?.data?.reactions || [];
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        
        // Remove any existing reaction from the current user
        const filteredReactions = currentReactions.filter(
          (r: Reaction) => r.user._id !== currentUser._id && r.user.id !== currentUser._id
        );

        // Add the new reaction
        return {
          ...old,
          data: {
            ...old?.data,
            reactions: [
              ...filteredReactions,
              {
                type: newReactionType,
                user: currentUser,
                createdAt: new Date().toISOString()
              }
            ]
          }
        };
      });

      return { previousReactions };
    },
    onError: (_err, _newReactionType, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousReactions) {
        queryClient.setQueryData(['post-reactions', postId], context.previousReactions);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we're in sync with the server
      queryClient.invalidateQueries({ queryKey: ['post-reactions', postId] });
    },
  });

  // Create a default reactionsByType object with empty arrays for each reaction type
  const defaultReactionsByType: Record<ReactionType, Reaction[]> = {
    like: [],
    love: [],
    haha: [],
    wow: [],
    sad: [],
    angry: []
  };

  return {
    isLoading,
    error: error ? (error as Error).message : null,
    reactions: data?.data?.reactions || [],
    reactionsByType: data?.data?.byType || defaultReactionsByType,
    totalCount: data?.data?.totalCount || 0,
    addReaction: async (type: ReactionType) => {
      return new Promise((resolve, reject) => {
        addReaction(type, {
          onSuccess: () => resolve(),
          onError: (error) => reject(error)
        });
      });
    },
    isAddingReaction
  };
}; 