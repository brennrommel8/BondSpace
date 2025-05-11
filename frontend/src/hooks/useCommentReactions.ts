import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postApi, Reaction, ReactionType } from '@/api/postApi';

export interface UseCommentReactionsReturn {
  isLoading: boolean;
  error: string | null;
  reactions: Reaction[];
  reactionsByType: Record<ReactionType, Reaction[]>;
  totalCount: number;
  addReaction: (type: ReactionType) => Promise<void>;
  isAddingReaction: boolean;
}

/**
 * Custom hook to fetch and manage reactions for a comment using React Query
 */
export const useCommentReactions = (
  postId: string,
  commentId: string
): UseCommentReactionsReturn => {
  const queryClient = useQueryClient();

  // Query for fetching reactions
  const { data, isLoading, error } = useQuery({
    queryKey: ['comment-reactions', postId, commentId],
    queryFn: () => postApi.getCommentReactions(postId, commentId),
    enabled: !!(postId && commentId),
  });

  // Mutation for adding reactions with optimistic updates
  const { mutate: addReaction, isPending: isAddingReaction } = useMutation({
    mutationFn: (type: ReactionType) => postApi.reactToComment(postId, commentId, type),
    onMutate: async (newReactionType) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: ['comment-reactions', postId, commentId] 
      });

      // Snapshot the previous value
      const previousReactions = queryClient.getQueryData([
        'comment-reactions', 
        postId, 
        commentId
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData(
        ['comment-reactions', postId, commentId],
        (old: any) => {
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
        }
      );

      return { previousReactions };
    },
    onError: (_err, _newReactionType, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousReactions) {
        queryClient.setQueryData(
          ['comment-reactions', postId, commentId],
          context.previousReactions
        );
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we're in sync with the server
      queryClient.invalidateQueries({ 
        queryKey: ['comment-reactions', postId, commentId] 
      });
    },
  });

  return {
    isLoading,
    error: error ? (error as Error).message : null,
    reactions: data?.data?.reactions || [],
    reactionsByType: data?.data?.byType || {} as Record<ReactionType, Reaction[]>,
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