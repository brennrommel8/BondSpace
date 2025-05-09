import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postApi, Reaction, ReactionType } from '@/api/postApi';

export interface UseReplyReactionsReturn {
  isLoading: boolean;
  error: string | null;
  reactions: Reaction[];
  reactionsByType: Record<ReactionType, Reaction[]>;
  totalCount: number;
  addReaction: (type: ReactionType) => Promise<void>;
  isAddingReaction: boolean;
}

/**
 * Custom hook to fetch and manage reactions for a reply using React Query
 */
export const useReplyReactions = (
  postId: string,
  commentId: string,
  replyId: string
): UseReplyReactionsReturn => {
  const queryClient = useQueryClient();

  // Query for fetching reactions
  const { data, isLoading, error } = useQuery({
    queryKey: ['reply-reactions', postId, commentId, replyId],
    queryFn: () => postApi.getReplyReactions(postId, commentId, replyId),
    enabled: !!(postId && commentId && replyId),
  });

  // Mutation for adding reactions with optimistic updates
  const { mutate: addReaction, isPending: isAddingReaction } = useMutation({
    mutationFn: (type: ReactionType) => postApi.addReplyReaction(postId, commentId, replyId, type),
    onMutate: async (newReactionType) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: ['reply-reactions', postId, commentId, replyId] 
      });

      // Snapshot the previous value
      const previousReactions = queryClient.getQueryData([
        'reply-reactions', 
        postId, 
        commentId, 
        replyId
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData(
        ['reply-reactions', postId, commentId, replyId],
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
          ['reply-reactions', postId, commentId, replyId],
          context.previousReactions
        );
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we're in sync with the server
      queryClient.invalidateQueries({ 
        queryKey: ['reply-reactions', postId, commentId, replyId] 
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