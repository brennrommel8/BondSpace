import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postApi, Post, ReactionType, User } from '@/api/postApi';
import { toast } from 'sonner';

export const usePostQueries = () => {
  const queryClient = useQueryClient();

  // Get all posts
  const { 
    data: postsData, 
    isLoading: isLoadingPosts, 
    error: postsError,
    refetch: refetchPosts
  } = useQuery({
    queryKey: ['posts'],
    queryFn: postApi.getPosts,
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: ({ content, mediaFile }: { content: string; mediaFile?: File }) => 
      postApi.createPost(content, mediaFile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Post created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create post: ${error.message}`);
    }
  });

  // Toggle like mutation
  const toggleLikeMutation = useMutation({
    mutationFn: (postId: string) => postApi.toggleLike(postId),
    onSuccess: (_data, postId) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      
      // Optimistic update
      queryClient.setQueryData(['posts'], (oldData: any) => {
        if (!oldData) return oldData;
        
        const updatedPosts = oldData.data.map((post: Post) => {
          if (post._id === postId || post.id === postId) {
            // This is just a placeholder - the real data will come from the refetch
            return post;
          }
          return post;
        });
        
        return {
          ...oldData,
          data: updatedPosts
        };
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to like/unlike post: ${error.message}`);
    }
  });

  // Add reaction mutation
  const addReactionMutation = useMutation({
    mutationFn: ({ postId, reactionType }: { postId: string; reactionType: ReactionType }) => 
      postApi.addReaction(postId, reactionType),
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      
      // Immediately refetch post data
      refetchPosts();
    },
    onError: (_error) => {
      // Remove toast error message for reaction
    }
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) => 
      postApi.addComment(postId, content),
    onMutate: async ({ postId, content }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['posts'] });
      
      // Get the current user from auth query
      const currentUser = queryClient.getQueryData(['currentUser']) as User | undefined;
      
      // Snapshot the previous value
      const previousPosts = queryClient.getQueryData(['posts']);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['posts'], (oldData: any) => {
        if (!oldData) return oldData;
        
        const updatedPosts = oldData.data.map((post: Post) => {
          if (post._id === postId || post.id === postId) {
            // Add optimistic comment with current user data
            return {
              ...post,
              comments: [
                ...post.comments,
                {
                  _id: `temp-${Date.now()}`,
                  id: `temp-${Date.now()}`,
                  content,
                  createdAt: new Date().toISOString(),
                  user: currentUser || {
                    _id: 'currentUser',
                    name: 'You',
                    username: 'you',
                  }
                }
              ]
            };
          }
          return post;
        });
        
        return {
          ...oldData,
          data: updatedPosts
        };
      });
      
      return { previousPosts, currentUser };
    },
    onSuccess: (response, { postId }, context) => {
      // Update the received data with proper user information
      if (response && response.data && Array.isArray(response.data.comments) && 
          response.data.comments.length > 0 && context?.currentUser) {
        
        // The latest comment is usually the one we just added
        const latestComment = response.data.comments[response.data.comments.length - 1];
        
        // Make sure we have a comment and it has a user property that's incomplete
        if (latestComment && latestComment.user && 
            (typeof latestComment.user === 'string' || 
             !latestComment.user.name || 
             latestComment.user.name === 'User')) {
          
          // Update with current user data from context (which should be complete)
          latestComment.user = context.currentUser;
          
          // Custom update to immediately reflect the change
          queryClient.setQueryData(['posts'], (oldData: any) => {
            if (!oldData) return oldData;
            
            const updatedPosts = oldData.data.map((post: Post) => {
              if (post._id === postId || post.id === postId) {
                // Find the comment by content and update its user data
                const updatedComments = post.comments.map(comment => {
                  if (comment.content === latestComment.content) {
                    return {
                      ...comment,
                      user: context.currentUser
                    };
                  }
                  return comment;
                });
                
                return {
                  ...post,
                  comments: updatedComments
                };
              }
              return post;
            });
            
            return {
              ...oldData,
              data: updatedPosts
            };
          });
        }
      }
      
      // Force refetch to get the latest data including all user details
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      // Remove toast success for comment
    },
    onError: (_error: Error, _variables, context) => {
      // Rollback to the previous state on error
      if (context?.previousPosts) {
        queryClient.setQueryData(['posts'], context.previousPosts);
      }
      // Remove toast error for comment
    },
    onSettled: () => {
      // Always refetch after error or success to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    }
  });

  // Reply to comment mutation
  const replyToCommentMutation = useMutation({
    mutationFn: ({ postId, commentId, content }: { postId: string; commentId: string; content: string }) => 
      postApi.replyToComment(postId, commentId, content),
    onMutate: async ({ postId, commentId, content }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['posts'] });
      
      // Get the current user from auth query
      const currentUser = queryClient.getQueryData(['currentUser']) as User | undefined;
      
      // Snapshot the previous value
      const previousPosts = queryClient.getQueryData(['posts']);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['posts'], (oldData: any) => {
        if (!oldData) return oldData;
        
        const updatedPosts = oldData.data.map((post: Post) => {
          if (post._id === postId || post.id === postId) {
            // Add optimistic reply with current user data
            const updatedComments = post.comments.map(comment => {
              if (comment._id === commentId || comment.id === commentId) {
                return {
                  ...comment,
                  replies: [
                    ...(comment.replies || []),
                    {
                      _id: `temp-reply-${Date.now()}`,
                      id: `temp-reply-${Date.now()}`,
                      content,
                      createdAt: new Date().toISOString(),
                      user: currentUser || {
                        _id: 'currentUser',
                        name: 'You',
                        username: 'you',
                      }
                    }
                  ]
                };
              }
              return comment;
            });
            
            return {
              ...post,
              comments: updatedComments
            };
          }
          return post;
        });
        
        return {
          ...oldData,
          data: updatedPosts
        };
      });
      
      return { previousPosts, currentUser };
    },
    onSuccess: (_response, _variables, _context) => {
      // Force refetch to get the latest data including all user details
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      // Remove toast success for reply
    },
    onError: (_error: Error, _variables, context) => {
      // Rollback to the previous state on error
      if (context?.previousPosts) {
        queryClient.setQueryData(['posts'], context.previousPosts);
      }
      // Remove toast error for reply
    },
    onSettled: () => {
      // Always refetch after error or success to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    }
  });

  // Add reaction to a reply mutation
  const replyReactionMutation = useMutation({
    mutationFn: ({
      postId,
      commentId,
      replyId,
      reactionType
    }: {
      postId: string;
      commentId: string;
      replyId: string;
      reactionType: ReactionType;
    }) => postApi.addReplyReaction(postId, commentId, replyId, reactionType),
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      
      // Immediately refetch post data
      refetchPosts();
    },
    onError: (_error) => {
      // Handle error if needed
    }
  });

  return {
    posts: postsData?.data || [],
    isLoadingPosts,
    postsError,
    refetchPosts,
    createPost: createPostMutation.mutate,
    isCreatingPost: createPostMutation.isPending,
    toggleLike: toggleLikeMutation.mutate,
    isTogglingLike: toggleLikeMutation.isPending,
    addReaction: addReactionMutation.mutate,
    isAddingReaction: addReactionMutation.isPending,
    addComment: addCommentMutation.mutate,
    isAddingComment: addCommentMutation.isPending,
    replyToComment: replyToCommentMutation.mutate,
    isReplyingToComment: replyToCommentMutation.isPending,
    replyReaction: replyReactionMutation.mutate,
    isReplyingToReaction: replyReactionMutation.isPending
  };
}; 