import { useEffect, useState } from 'react';
import { usePostQueries } from '@/hooks/usePostQueries';
import { PostCard } from '@/components/PostCard';
import { CreatePostForm } from '@/components/CreatePostForm';
import { User } from '@/api/postApi';
import { authApi } from '@/api/authApi';
import { useQueryClient } from '@tanstack/react-query';

const Feed = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const {
    posts,
    isLoadingPosts,
    postsError,
    createPost,
    isCreatingPost,
    toggleLike,
    isTogglingLike,
    addComment,
    isAddingComment,
    replyToComment,
    refetchPosts
  } = usePostQueries();

  // Debug: Log the posts and comments structure
  useEffect(() => {
    if (posts.length > 0) {
      console.log('Posts data structure:', posts);
      posts.forEach((post, index) => {
        if (post.comments && post.comments.length > 0) {
          console.log(`Post ${index} comments:`, post.comments);
          console.log(`First comment user data:`, post.comments[0].user);
        }
      });
    }
  }, [posts]);

  // Fetch current user directly
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await authApi.getMe();
        if (response.success && response.user) {
          const { id, _id, name, username, profilePicture } = response.user;
          
          const userData = {
            id: id || _id,
            _id: _id || id,
            name,
            username,
            profilePicture
          };
          
          // Save to localStorage for use in comment user identification
          localStorage.setItem('currentUser', JSON.stringify(userData));
          
          setCurrentUser(userData);
          
          // Store in React Query cache for optimistic updates
          queryClient.setQueryData(['currentUser'], userData);
        }
      } catch (error) {
        console.error('Failed to fetch current user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, [queryClient]);

  const handleCreatePost = (content: string, mediaFile?: File) => {
    createPost({ content, mediaFile });
  };

  const handleLike = (postId: string) => {
    if (!currentUser) {
      return;
    }
    toggleLike(postId);
  };

  const handleComment = (postId: string, content: string) => {
    if (!currentUser) {
      return;
    }
    
    // Add the user data directly to React Query cache to ensure it's available
    // for optimistic updates and post-request handling
    queryClient.setQueryData(['currentUser'], currentUser);
    
    // Make the API call with user data already in the cache
    addComment({ postId, content });
  };

  const handleReply = (postId: string, commentId: string, content: string) => {
    if (!currentUser) {
      return;
    }
    
    // Add the user data directly to React Query cache to ensure it's available
    // for optimistic updates and post-request handling
    queryClient.setQueryData(['currentUser'], currentUser);
    
    // Make the API call with user data already in the cache
    replyToComment({ postId, commentId, content });
  };

  if (loading || isLoadingPosts) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
        </div>
      </div>
    );
  }

  if (postsError) {
    console.error('Error loading posts:', postsError);
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="bg-red-50 text-red-600 p-6 rounded-md flex flex-col items-center">
          <h2 className="text-xl font-semibold mb-2">Error loading posts</h2>
          <p className="mb-4">{postsError instanceof Error ? postsError.message : 'Please try again later.'}</p>
          <button 
            onClick={() => refetchPosts()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-emerald-700 mb-6">Your Feed</h1>
      
      <CreatePostForm
        currentUser={currentUser}
        onSubmit={handleCreatePost}
        isSubmitting={isCreatingPost}
      />
      
      {posts.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No posts to show. Start by creating a post or connecting with friends!</p>
        </div>
      ) : (
        <div>
          {posts.map((post) => {
            // Create a modified post object with client-side reaction if needed
            let displayPost = { ...post };
            
            // Add optimistic updates for reply reactions
            if (currentUser && post.comments && post.comments.length > 0) {
              const updatedComments = post.comments.map(comment => {
                if (comment.replies && comment.replies.length > 0) {
                  const updatedReplies = comment.replies.map(reply => {
                    if (currentUser && reply.reactions && reply.reactions.length > 0) {
                      const hasExistingReaction = reply.reactions.some(
                        r => (r.user._id === currentUser._id || r.user.id === currentUser.id)
                      );
                      
                      if (!hasExistingReaction) {
                        return {
                          ...reply,
                          reactions: [
                            ...reply.reactions,
                            {
                              user: currentUser,
                              type: reply.reactions[0].type
                            }
                          ]
                        };
                      }
                    }
                    return reply;
                  });
                  
                  return {
                    ...comment,
                    replies: updatedReplies
                  };
                }
                return comment;
              });
              
              displayPost = {
                ...displayPost,
                comments: updatedComments
              };
            }
            
            return (
              <PostCard
                key={post._id || post.id}
                post={displayPost}
                currentUser={currentUser}
                onLike={handleLike}
                onComment={handleComment}
                onReply={handleReply}
                isLiking={isTogglingLike}
                isCommenting={isAddingComment}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Feed;