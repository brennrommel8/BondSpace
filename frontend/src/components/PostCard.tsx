import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { MessageCircle, Send, ThumbsUp } from 'lucide-react';
import { Post, User, ReactionType, postApi } from '@/api/postApi';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { normalizeProfilePicture } from '@/utils/profileUtils';
import { ReactionPopover } from '@/components/ui/reaction-popover';
import { ReactionDisplay } from '@/components/ui/reaction-display';
import { ReactionUsersDialog } from './ui/reaction-users-dialog';
import { ReplyReactionButton } from './ui/reply-reaction-button';
import { ReplyReactionBadge } from './ui/reply-reaction-badge';
import { useReactions } from '@/hooks/useReactions';
import { CommentReactionButton } from './ui/comment-reaction-button';
import { useQueryClient } from '@tanstack/react-query';
import { ImageSlider } from '@/components/ui/image-slider';

interface PostCardProps {
  post: Post;
  currentUser: User | null;
  onLike: (postId: string) => void;
  onComment: (postId: string, content: string) => void;
  onReply: (postId: string, commentId: string, content: string) => void;
  isLiking?: boolean;
  isCommenting?: boolean;
}

export const PostCard = ({
  post,
  currentUser,
  onLike,
  onComment,
  onReply,
  isLiking,
  isCommenting
}: PostCardProps) => {
  // Remove unused variables and functions
  const [comment, setComment] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [showReactionPopover, setShowReactionPopover] = useState(false);
  const [showReactionDialog, setShowReactionDialog] = useState(false);
  
  // Use the useReactions hook at the top level
  const { 
    reactions: postReactions,
    addReaction: addPostReaction,
    isAddingReaction: isAddingPostReaction 
  } = useReactions(post._id || post.id || '');

  // Store locally known users for display
  const [commentUsers, setCommentUsers] = useState<Record<string, User>>({});

  // Prefetch comment reactions when comments are shown
  const queryClient = useQueryClient();

  // Helper function to create a fallback user
  const createFallbackUser = (userId: string): User => {
    return { 
      _id: userId, 
      id: userId, 
      name: 'User', 
      username: 'user' 
    };
  };
  
  // Helper function to fetch user data for comments
  const fetchCommentUser = async (userId: string) => {
    if (!userId) return;
    
    // If we already have this user in our state with a real name, don't fetch again
    if (commentUsers[userId] && 
        commentUsers[userId].name !== 'User' && 
        commentUsers[userId].name !== 'Loading...') {
      return;
    }
    
    // If this is not our first attempt, add a slight delay to avoid hammering the API
    if (commentUsers[userId] && commentUsers[userId].name === 'Loading...') {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Show loading state if we don't already have one
    if (!commentUsers[userId] || commentUsers[userId].name !== 'Loading...') {
      setCommentUsers(prev => ({
        ...prev,
        [userId]: { ...createFallbackUser(userId), name: 'Loading...', username: 'loading' }
      }));
    }
    
    try {
      console.log(`Fetching user data for comment user: ${userId}`);
      const userData = await postApi.getUserById(userId);
      
      if (userData && userData.name && userData.name !== 'User') {
        console.log(`Successfully fetched user data for ${userId}:`, userData);
        
        // Update our state
        setCommentUsers(prev => ({
          ...prev,
          [userId]: userData
        }));
        
        // Also update our localStorage cache
        try {
          const cachedUsersJson = localStorage.getItem('cachedUsers') || '{}';
          const cachedUsers = JSON.parse(cachedUsersJson);
          cachedUsers[userId] = userData;
          localStorage.setItem('cachedUsers', JSON.stringify(cachedUsers));
        } catch (e) {
          console.error('Error caching user data to localStorage:', e);
        }
      } else {
        // If we didn't get useful user data, set a fallback
        setCommentUsers(prev => ({
          ...prev,
          [userId]: createFallbackUser(userId)
        }));
      }
    } catch (error) {
      console.error(`Failed to fetch user data for ${userId}:`, error);
      
      // Set a fallback in case of error
      setCommentUsers(prev => ({
        ...prev,
        [userId]: createFallbackUser(userId)
      }));
    }
  };
  
  // Process comments to fetch user data when needed
  useEffect(() => {
    const processComments = async () => {
      if (!post.comments) return;
      
      for (const comment of post.comments) {
        if (comment.user) {
          // If user is a string ID
          if (typeof comment.user === 'string') {
            fetchCommentUser(comment.user);
          }
          // If it's an object but missing name/username
          else if (!comment.user.name || !comment.user.username || 
                  comment.user.name === 'User' || comment.user.username === 'user') {
            const userId = comment.user._id || comment.user.id;
            if (userId) {
              fetchCommentUser(userId);
            }
          }
        }
        
        // Also process replies
        if (comment.replies && comment.replies.length > 0) {
          for (const reply of comment.replies) {
            if (reply.user) {
              // If user is a string ID
              if (typeof reply.user === 'string') {
                fetchCommentUser(reply.user);
              }
              // If it's an object but missing name/username
              else if (!reply.user.name || !reply.user.username || 
                      reply.user.name === 'User' || reply.user.username === 'user') {
                const userId = reply.user._id || reply.user.id;
                if (userId) {
                  fetchCommentUser(userId);
                }
              }
            }
          }
        }
      }
    };
    
    processComments();
  }, [post.comments]);

  // Load cached users from localStorage on component mount
  useEffect(() => {
    try {
      // Load cached users
      const cachedUsersJson = localStorage.getItem('cachedUsers');
      if (cachedUsersJson) {
        const cachedUsers = JSON.parse(cachedUsersJson);
        if (cachedUsers && typeof cachedUsers === 'object') {
          console.log(`Loaded ${Object.keys(cachedUsers).length} cached users from localStorage`);
          
          // Update our state with all cached users
          setCommentUsers(prev => ({
            ...prev,
            ...cachedUsers
          }));
        }
      }
    } catch (error) {
      console.error('Error loading cached users from localStorage:', error);
    }
  }, []);

  // Load current user from localStorage on component mount
  useEffect(() => {
    try {
      const currentUserJson = localStorage.getItem('currentUser');
      if (currentUserJson) {
        const userData = JSON.parse(currentUserJson);
        console.log('Found user in localStorage:', userData);
        
        if (userData && (userData._id || userData.id)) {
          // Add this user to our cache
          setCommentUsers(prev => {
            const update = { ...prev };
            if (userData._id) update[userData._id] = userData;
            if (userData.id) update[userData.id] = userData;
            return update;
          });
        }
      }
    } catch (error) {
      console.error('Error loading user from localStorage:', error);
    }
  }, []);

  // Store any users found in the post data
  useEffect(() => {
    const storeAvailableUsers = () => {
      const usersMap: Record<string, User> = {};
      
      // Store post owner
      if (post.user && post.user._id) {
        usersMap[post.user._id] = post.user;
      }
      
      // Store users from likes
      if (post.likes && post.likes.length > 0) {
        post.likes.forEach(user => {
          if (user && user._id) {
            usersMap[user._id] = user;
          }
        });
      }
      
      // Store users from reactions
      if (post.reactions && post.reactions.length > 0) {
        post.reactions.forEach(reaction => {
          if (reaction.user && reaction.user._id) {
            usersMap[reaction.user._id] = reaction.user;
          }
        });
      }
      
      // Extract users from comments
      if (post.comments && post.comments.length > 0) {
        post.comments.forEach(comment => {
          // Store comment user if it's a complete object
          if (comment.user && typeof comment.user !== 'string' && 
              comment.user._id && comment.user.name && comment.user.username) {
            usersMap[comment.user._id] = comment.user;
          }
          
          // Also check for user data in comment.data.user (sometimes the API nests it)
          if (comment.data && comment.data.user && 
              comment.data.user._id && comment.data.user.name && comment.data.user.username) {
            usersMap[comment.data.user._id] = comment.data.user;
          }
          
          // Store users from replies too
          if (comment.replies && comment.replies.length > 0) {
            comment.replies.forEach(reply => {
              if (reply.user && typeof reply.user !== 'string' && 
                  reply.user._id && reply.user.name && reply.user.username) {
                usersMap[reply.user._id] = reply.user;
              }
              
              // Check for nested user data in replies too
              if (reply.data && reply.data.user && 
                  reply.data.user._id && reply.data.user.name && reply.data.user.username) {
                usersMap[reply.data.user._id] = reply.data.user;
              }
            });
          }
        });
      }
      
      // Map user IDs to other IDs if needed (some comments might use .id instead of ._id)
      const enhancedUsersMap = { ...usersMap };
      Object.values(usersMap).forEach(user => {
        if (user.id && user.id !== user._id) {
          enhancedUsersMap[user.id] = user;
        }
        if (user._id && !enhancedUsersMap[user._id]) {
          enhancedUsersMap[user._id] = user;
        }
      });
      
      // Also check for current user in localStorage
      try {
        const currentUserJson = localStorage.getItem('currentUser');
        if (currentUserJson) {
          const currentUserData = JSON.parse(currentUserJson);
          if (currentUserData && currentUserData._id) {
            enhancedUsersMap[currentUserData._id] = currentUserData;
            if (currentUserData.id && currentUserData.id !== currentUserData._id) {
              enhancedUsersMap[currentUserData.id] = currentUserData;
            }
          }
        }
      } catch (error) {
        console.error('Error parsing currentUser from localStorage:', error);
      }
      
      // Update our state with all found users
      setCommentUsers(prev => ({
        ...prev,
        ...enhancedUsersMap
      }));
    };
    
    storeAvailableUsers();
  }, [post]);

  // Watch for changes to comments and update user data
  useEffect(() => {
    if (post.comments && post.comments.length > 0) {
      const lastComment = post.comments[post.comments.length - 1];
      
      if (lastComment && lastComment.user) {
        // Process user data in the most recent comment
        const userId = typeof lastComment.user === 'string' 
          ? lastComment.user 
          : (lastComment.user._id || lastComment.user.id);
          
        if (userId) {
          // If this is the current user's comment
          if (currentUser && (userId === currentUser._id || userId === currentUser.id)) {
            console.log('Updating user data for new comment by current user');
            
            // Ensure the current user data is in the cache
            setCommentUsers(prev => {
              const update = { ...prev };
              if (currentUser._id) update[currentUser._id] = currentUser;
              if (currentUser.id) update[currentUser.id] = currentUser;
              return update;
            });
          }
          
          // If the comment has full user data, update our cache
          if (typeof lastComment.user !== 'string' && 
              lastComment.user.name && 
              lastComment.user.username) {
            console.log('Updating user data from new comment:', lastComment.user);
            
            setCommentUsers(prev => {
              const update = { ...prev };
              if (lastComment.user._id) update[lastComment.user._id] = lastComment.user;
              if (lastComment.user.id) update[lastComment.user.id] = lastComment.user;
              return update;
            });
          }
        }
      }
    }
  }, [post.comments?.length, currentUser]);

  // Refresh user data when comments are shown
  useEffect(() => {
    if (showComments && post.comments && post.comments.length > 0) {
      console.log('Comments shown, refreshing user data for any missing users');
      
      // Look for comments with generic user data and retry fetching
      for (const comment of post.comments) {
        if (comment.user) {
          // If user is just an ID, fetch the data
          if (typeof comment.user === 'string') {
            fetchCommentUser(comment.user);
          }
          // If it has generic data, retry fetch
          else if (comment.user.name === 'User' || comment.user.username === 'user') {
            const userId = comment.user._id || comment.user.id;
            if (userId) {
              fetchCommentUser(userId);
            }
          }
        }
        
        // Also process replies
        if (comment.replies && comment.replies.length > 0) {
          for (const reply of comment.replies) {
            if (reply.user) {
              // If user is just an ID, fetch the data
              if (typeof reply.user === 'string') {
                fetchCommentUser(reply.user);
              }
              // If it has generic data, retry fetch
              else if (reply.user.name === 'User' || reply.user.username === 'user') {
                const userId = reply.user._id || reply.user.id;
                if (userId) {
                  fetchCommentUser(userId);
                }
              }
            }
          }
        }
      }
    }
  }, [showComments]);

  // Fetch comments with user data when the comments are shown
  useEffect(() => {
    const fetchCommentsWithUserData = async () => {
      if (!showComments) return;
      
      try {
        const postId = (post._id || post.id || '').toString();
        console.log(`Fetching user data for comments on post ${postId}`);
        
        // First try to get just the post data (we already have the post object, but 
        // this ensures we get the most up-to-date version with populated user data)
        let response = await postApi.getCommentsWithUserData(postId);
        
        // If getting all comments didn't work or didn't return user data,
        // fall back to getting current user's comments if available
        if (!response || !response.success || !response.data || 
            !response.data.comments || !response.data.comments.length) {
          if (currentUser && currentUser._id) {
            console.log(`Trying to get comments by current user ${currentUser._id}`);
            response = await postApi.getCommentsWithUserData(postId, currentUser._id);
          }
        }
        
        if (response && response.success && response.data) {
          console.log('Received data with comments:', response.data);
          
          // Process the comments to update our user cache
          const newCommentUsers: Record<string, User> = {};
          
          // Add post owner if available
          if (response.data.post && response.data.post.user) {
            const postUser = response.data.post.user;
            if (postUser && typeof postUser !== 'string' && postUser._id) {
              newCommentUsers[postUser._id] = postUser;
              
              // Also add using id if different
              if (postUser.id && postUser.id !== postUser._id) {
                newCommentUsers[postUser.id] = postUser;
              }
            }
          }
          
          // Process comments array
          if (response.data.comments && Array.isArray(response.data.comments)) {
            response.data.comments.forEach((comment: any) => {
              if (comment.user && typeof comment.user !== 'string' && comment.user._id) {
                newCommentUsers[comment.user._id] = comment.user;
                
                // Also add using id if different
                if (comment.user.id && comment.user.id !== comment.user._id) {
                  newCommentUsers[comment.user.id] = comment.user;
                }
              }
              
              // Process replies too
              if (comment.replies && Array.isArray(comment.replies)) {
                comment.replies.forEach((reply: any) => {
                  if (reply.user && typeof reply.user !== 'string' && reply.user._id) {
                    newCommentUsers[reply.user._id] = reply.user;
                    
                    // Also add using id if different
                    if (reply.user.id && reply.user.id !== reply.user._id) {
                      newCommentUsers[reply.user.id] = reply.user;
                    }
                  }
                });
              }
            });
          }
          
          // Update our comment users state
          if (Object.keys(newCommentUsers).length > 0) {
            console.log(`Adding ${Object.keys(newCommentUsers).length} users to comment users cache`);
            setCommentUsers(prev => ({
              ...prev,
              ...newCommentUsers
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching comments with user data:', error);
      }
    };
    
    fetchCommentsWithUserData();
  }, [showComments, post._id, currentUser]);

  // Prefetch comment reactions when comments are shown
  useEffect(() => {
    if (showComments && post.comments) {
      const postId = post._id || post.id || '';
      if (!postId) return;

      post.comments.forEach(comment => {
        const commentId = (comment._id || comment.id || '').toString();
        if (commentId) {
          // Prefetch reactions for each comment
          queryClient.prefetchQuery({
            queryKey: ['comment-reactions', postId, commentId],
            queryFn: () => postApi.getCommentReactions(postId, commentId)
          });
        }
      });
    }
  }, [showComments, post.comments, post._id, post.id, queryClient]);

  const handleLike = () => {
    const postId = (post._id || post.id || '').toString();
    
    // Debug: Log attempt to like post
    console.log('Attempting to like/unlike post:', postId);
    console.log('Current user:', currentUser?._id || currentUser?.id);
    console.log('Post owner:', post.user?._id || post.user?.id);
    console.log('Is own post:', currentUser && post.user && (currentUser._id === post.user._id || currentUser.id === post.user.id));
    
    onLike(postId);
  };

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim()) {
      const postId = (post._id || post.id || '').toString();
      onComment(postId, comment);
      
      // Debug the current user when commenting
      console.log('Adding comment as current user:', currentUser);
      
      // Ensure comments are visible after adding a comment
      if (!showComments) {
        setShowComments(true);
      }
      
      // If the current user is available, use it to immediately display the comment
      if (currentUser) {
        // Add current user to commentUsers cache to ensure proper display
        const userId = currentUser._id || currentUser.id || '';
        console.log('Adding current user to commentUsers:', userId, currentUser);
        
        // Add to both ID types to ensure we catch all references
        setCommentUsers(prev => {
          const update = { ...prev };
          if (currentUser._id) update[currentUser._id] = currentUser;
          if (currentUser.id) update[currentUser.id] = currentUser;
          return update;
        });
        
        // Also immediately update localStorage for this user to ensure future comments work too
        try {
          localStorage.setItem('currentUser', JSON.stringify(currentUser));
        } catch (error) {
          console.error('Failed to save current user to localStorage:', error);
        }
      }
      
      setComment('');
    }
  };

  const handleReply = (commentId: string) => {
    if (replyContent.trim()) {
      const postId = (post._id || post.id || '').toString();
      onReply(postId, commentId, replyContent);
      
      // Debug the current user when replying
      console.log('Adding reply as current user:', currentUser);
      
      // If the current user is available, use it to immediately display the reply
      if (currentUser) {
        // Add current user to commentUsers cache to ensure proper display
        console.log('Adding current user to commentUsers for reply:', currentUser);
        
        // Add to both ID types to ensure we catch all references
        setCommentUsers(prev => {
          const update = { ...prev };
          if (currentUser._id) update[currentUser._id] = currentUser;
          if (currentUser.id) update[currentUser.id] = currentUser;
          return update;
        });
        
        // Also immediately update localStorage for this user to ensure future replies work too
        try {
          localStorage.setItem('currentUser', JSON.stringify(currentUser));
        } catch (error) {
          console.error('Failed to save current user to localStorage for reply:', error);
        }
      }
      
      setReplyContent('');
      setReplyingTo(null);
    }
  };

  // Find the current user's reaction
  const userReaction = postReactions?.find(r => 
    r.user._id === currentUser?._id || 
    r.user.id === currentUser?._id
  );

  // Helper function to get reaction emoji
  const getReactionEmoji = (type: ReactionType) => {
    switch (type) {
      case 'like':
        return '👍';
      case 'love':
        return '❤️';
      case 'haha':
        return '😂';
      case 'wow':
        return '😮';
      case 'sad':
        return '😢';
      case 'angry':
        return '😡';
      default:
        return '👍';
    }
  };

  // Helper function to get reaction label
  const getReactionLabel = (type: ReactionType) => {
    switch (type) {
      case 'like':
        return 'Like';
      case 'love':
        return 'Love';
      case 'haha':
        return 'Haha';
      case 'wow':
        return 'Wow';
      case 'sad':
        return 'Sad';
      case 'angry':
        return 'Angry';
      default:
        return 'Like';
    }
  };

  // Helper function to get profile picture URL
  const getProfilePictureUrl = (user: User | undefined) => {
    // If user is undefined or null
    if (!user) {
      return 'https://api.dicebear.com/7.x/identicon/svg?seed=unknown';
    }
    
    // Always pass the username to ensure we get a consistent fallback
    return normalizeProfilePicture(user.profilePicture, user.username);
  };
  
  // Helper to get user for comments
  const getCommentUserData = (user: any): User => {
    // If it's a string ID, check if we have the enhanced user data
    if (typeof user === 'string') {
      const enhancedUser = commentUsers[user];
      if (enhancedUser) {
        return enhancedUser;
      }
      
      // Look through all comments to see if we can find this user
      if (post.comments) {
        for (const comment of post.comments) {
          // Check if this comment is from the user we're looking for
          if (comment.user && 
              (typeof comment.user !== 'string') && 
              (comment.user._id === user || comment.user.id === user) &&
              comment.user.name && 
              comment.user.username) {
            return comment.user;
          }
          
          // Check in replies too
          if (comment.replies) {
            for (const reply of comment.replies) {
              if (reply.user && 
                  (typeof reply.user !== 'string') && 
                  (reply.user._id === user || reply.user.id === user) &&
                  reply.user.name && 
                  reply.user.username) {
                return reply.user;
              }
            }
          }
        }
      }
      
      // If we don't have enhanced data, return a fallback
      return createFallbackUser(user);
    }
    
    // If it's an object but missing name or username
    if (user && (!user.name || !user.username)) {
      const userId = user._id || user.id;
      
      // Check our cache first
      if (userId && commentUsers[userId]) {
        return commentUsers[userId];
      }
      
      // Also check if this user is the post owner
      if (post.user && 
          userId && 
          (post.user._id === userId || post.user.id === userId) && 
          post.user.name && 
          post.user.username) {
        return post.user;
      }
      
      // Check if this user appears in likes
      if (userId && post.likes) {
        const likeUser = post.likes.find(like => 
          like._id === userId || like.id === userId
        );
        if (likeUser && likeUser.name && likeUser.username) {
          return likeUser;
        }
      }
      
      // Check if this user appears in reactions
      if (userId && post.reactions) {
        const reactionUser = post.reactions.find(reaction => 
          reaction.user._id === userId || reaction.user.id === userId
        );
        if (reactionUser && reactionUser.user.name && reactionUser.user.username) {
          return reactionUser.user;
        }
      }
      
      // Try to find this user in currentUser
      if (currentUser && userId && 
          (currentUser._id === userId || currentUser.id === userId)) {
        return currentUser;
      }
      
      // If no enhanced data, return the original with defaults
      return { 
        ...user, 
        name: user.name || 'User', 
        username: user.username || 'user' 
      };
    }
    
    // Otherwise use what we have
    return user;
  };

  return (
    <Card className="mb-4 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarImage
              src={getProfilePictureUrl(post.user)}
              alt={post.user?.name || 'User'}
            />
            <AvatarFallback>
              {post.user?.name 
                ? post.user.name.substring(0, 2).toUpperCase()
                : 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{post.user?.name || 'User'}</div>
            <div className="text-sm text-gray-500">
              @{post.user?.username || 'user'} • {format(new Date(post.createdAt || new Date()), 'MMM d, yyyy h:mm a')}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-2">
        <div className="whitespace-pre-wrap mb-2">{post.content || ''}</div>
        {post.media && post.media.length > 0 && (
          <div className="mb-4">
            {post.media[0].type === 'image' ? (
              <ImageSlider
                images={post.media.filter((item: { type: string; url: string }) => 
                  item.type === 'image'
                )}
                className="w-full"
              />
            ) : post.media[0].type === 'video' ? (
              <video
                src={post.media[0].url}
                controls
                className="w-full h-auto rounded-lg"
                playsInline
              >
                Your browser does not support the video tag.
              </video>
            ) : null}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-start border-t pt-3">
        {/* Display reactions if any */}
        {postReactions && postReactions.length > 0 && (
          <div 
            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded-full transition-colors"
            onClick={() => setShowReactionDialog(true)}
          >
            <ReactionDisplay reactions={postReactions} />
          </div>
        )}
        
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Button
                size="sm"
                variant="ghost"
                className={`px-2 py-1 h-auto min-h-0 ${userReaction ? "text-emerald-600 hover:text-emerald-700" : ""}`}
                onMouseEnter={() => setShowReactionPopover(true)}
                onClick={handleLike}
                disabled={isLiking || isAddingPostReaction}
              >
                {userReaction ? (
                  <span className="mr-1">{getReactionEmoji(userReaction.type)}</span>
                ) : (
                  <ThumbsUp className="mr-1 h-4 w-4" />
                )}
                <span className="text-xs">{userReaction ? getReactionLabel(userReaction.type) : "Like"}</span>
              </Button>
              
              <ReactionPopover 
                isOpen={showReactionPopover}
                onClose={() => setShowReactionPopover(false)}
                onReaction={(type) => addPostReaction(type)}
              />
            </div>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowComments(!showComments)}
              className="text-emerald-600 hover:bg-emerald-50 px-2 py-1 h-auto min-h-0"
            >
              <MessageCircle className="mr-1 h-4 w-4" />
              <span className="text-xs">{post.comments?.length || 0}</span>
            </Button>
          </div>
        </div>

        {showComments && (
          <div className="w-full mt-3">
            {/* Comments list */}
            {post.comments && post.comments.length > 0 && (
              <div className="space-y-3 my-3">
                {/* Show all comments */}
                {post.comments.map((comment) => {
                  const commentId = (comment._id || comment.id || '').toString();
                  // Get enhanced user data if available
                  const commentUser = getCommentUserData(comment.user);
                  
                  return (
                    <div key={commentId} className="bg-gray-50 p-3 rounded-md">
                      <div className="flex items-start space-x-2">
                        <Avatar className="h-8 w-8 ring-2 ring-emerald-100">
                          <AvatarImage 
                            src={getProfilePictureUrl(commentUser)} 
                            alt={commentUser?.name || ''} 
                          />
                          <AvatarFallback>
                            {commentUser?.name 
                              ? commentUser.name.substring(0, 2).toUpperCase() 
                              : '..'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="bg-gray-100 p-2 rounded-md">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="font-semibold text-emerald-700">
                                {commentUser?.name || ''}
                              </div>
                              {commentUser?.username && (
                                <div className="text-xs text-gray-500">@{commentUser.username}</div>
                              )}
                            </div>
                            <div className="text-sm">{comment.content}</div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 flex items-center space-x-2">
                            <span>{format(new Date(comment.createdAt), 'MMM d, yyyy h:mm a')}</span>
                            <button 
                              className="text-emerald-600 hover:text-emerald-700 font-medium"
                              onClick={() => setReplyingTo(commentId)}
                            >
                              Reply
                            </button>
                            
                            {/* Add Comment Reaction Button */}
                            <CommentReactionButton
                              postId={post._id || post.id || ''}
                              commentId={commentId}
                              reactions={comment.reactions}
                              userReaction={comment.reactions?.find(r => 
                                r.user._id === currentUser?._id || 
                                r.user.id === currentUser?._id
                              )}
                              reactionCount={comment.reactions?.length || 0}
                            />
                          </div>

                          {/* Replies */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="ml-6 mt-2 space-y-2">
                              {comment.replies.map((reply) => {
                                const replyId = (reply._id || reply.id || '').toString();
                                // Get enhanced user data if available
                                const replyUser = getCommentUserData(reply.user);
                                
                                return (
                                  <div key={replyId} className="flex items-start space-x-2">
                                    <Avatar className="h-6 w-6 ring-1 ring-emerald-50">
                                      <AvatarImage 
                                        src={getProfilePictureUrl(replyUser)} 
                                        alt={replyUser?.name || ''} 
                                      />
                                      <AvatarFallback>
                                        {replyUser?.name
                                          ? replyUser.name.substring(0, 2).toUpperCase() 
                                          : '..'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <div className="bg-gray-100 p-2 rounded-md">
                                        <div className="flex items-center gap-2 mb-1">
                                          <div className="font-semibold text-emerald-700">
                                            {replyUser?.name || ''}
                                          </div>
                                          {replyUser?.username && (
                                            <div className="text-xs text-gray-500">@{replyUser.username}</div>
                                          )}
                                        </div>
                                        <div className="text-sm">{reply.content}</div>
                                      </div>
                                      <div className="text-xs text-gray-500 mt-1 flex items-center space-x-2">
                                        <span>{format(new Date(reply.createdAt), 'MMM d, yyyy h:mm a')}</span>
                                        
                                        {/* Display reply reactions badge */}
                                        {reply.reactions && reply.reactions.length > 0 && (
                                          <ReplyReactionBadge 
                                            postId={post._id || post.id || ''}
                                            commentId={comment._id || comment.id || ''}
                                            replyId={reply._id || reply.id || ''}
                                            reactions={reply.reactions} 
                                            showCount={true}
                                          />
                                        )}
                                        
                                        {/* Reply Reaction Button */}
                                        <ReplyReactionButton
                                          postId={post._id || post.id || ''}
                                          commentId={comment._id || comment.id || ''}
                                          replyId={reply._id || reply.id || ''}
                                          userReaction={reply.reactions?.find(r => 
                                            r.user._id === currentUser?._id || 
                                            r.user.id === currentUser?._id
                                          )}
                                          reactionCount={reply.reactions?.length || 0}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Reply form */}
                          {replyingTo === commentId && (
                            <div className="mt-2 ml-6 flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                {currentUser && (
                                  <>
                                    <AvatarImage
                                      src={getProfilePictureUrl(currentUser)}
                                      alt={currentUser.name}
                                    />
                                    <AvatarFallback>
                                      {currentUser.name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </>
                                )}
                              </Avatar>
                              <Textarea
                                className="min-h-10 flex-1 text-sm"
                                placeholder="Write a reply..."
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                              />
                              <Button
                                size="sm"
                                onClick={() => handleReply(commentId)}
                                disabled={!replyContent.trim()}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add comment form */}
            <form onSubmit={handleComment} className="flex items-center gap-2 mt-2">
              {currentUser && (
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={getProfilePictureUrl(currentUser)}
                    alt={currentUser.name}
                  />
                  <AvatarFallback>
                    {currentUser.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <Textarea
                className="min-h-10 flex-1"
                placeholder="Write a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <Button 
                type="submit" 
                disabled={!comment.trim() || isCommenting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isCommenting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
                ) : (
                <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        )}
      </CardFooter>

      {/* Reaction Users Dialog */}
      <ReactionUsersDialog
        postId={post._id || post.id || ''}
        isOpen={showReactionDialog}
        onClose={() => setShowReactionDialog(false)}
      />
    </Card>
  );
}; 