import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getUserProfile } from '@/api/searchApi'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { UserPlus, UserMinus, X, Check, MessageSquare, ThumbsUp, Send } from 'lucide-react'
import { useFriendStore } from '@/store/friendStore'
import { chatApi } from '@/api/chatApi'
import { getProfileImageUrl } from '@/utils/profileImageUtils'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ReactionPopover } from '@/components/ui/reaction-popover'
import { ReactionDisplay } from '@/components/ui/reaction-display'
import { ReactionUsersDialog } from '@/components/ui/reaction-users-dialog'
import { format } from 'date-fns'
import { postApi } from '@/api/postApi'
import { ReactionType } from '@/api/postApi'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog"

interface ExtendedPost {
  id: string;
  content: string;
  createdAt: string;
  user: {
    name: string;
    username: string;
    profilePicture: string | { url: string; publicId: string };
  };
  likes: Array<{
    name: string;
    username: string;
    profilePicture: string | { url: string; publicId: string };
  }>;
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
    user: {
      name: string;
      username: string;
      profilePicture: string | { url: string; publicId: string };
    };
    replies: Array<{
      id: string;
      content: string;
      createdAt: string;
      user: {
        name: string;
        username: string;
        profilePicture: string | { url: string; publicId: string };
      };
    }>;
  }>;
  reactions?: Array<{
    type: ReactionType;
    user: {
      _id: string;
      id: string;
      name: string;
      username: string;
      profilePicture: string | { url: string; publicId: string };
    };
  }>;
  media?: {
    type: string;
    url: string;
  };
}

interface ExtendedUserProfileResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      name: string;
      username: string;
      email: string;
      profilePicture: string | { url: string; publicId: string };
      friends: string[];
      friendRequests: string[];
      role: string;
      _id: string;
    };
    posts: ExtendedPost[];
    isFriend: boolean;
    isOwnProfile: boolean;
  };
}

const Visit = () => {
  const { username } = useParams<{ username: string }>()
  const [profile, setProfile] = useState<ExtendedUserProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [messagingLoading, setMessagingLoading] = useState(false)
  const [comment, setComment] = useState('')
  const [showComments, setShowComments] = useState<Record<string, boolean>>({})
  const [showReactionPopover, setShowReactionPopover] = useState<Record<string, boolean>>({})
  const [showReactionDialog, setShowReactionDialog] = useState<Record<string, boolean>>({})
  const [isLiking, setIsLiking] = useState(false)
  const [isCommenting, setIsCommenting] = useState(false)
  const [isReacting, setIsReacting] = useState(false)
  const [showProfileImage, setShowProfileImage] = useState(false)
  
  // Get friend store state and actions
  const {
    operationsStatus,
    isLoading: isLoadingAction,
    fetchOperationsStatus,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend
  } = useFriendStore()

  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!username) return
        
        // Fetch profile data
        const profileResponse = await getUserProfile(username)
        if (profileResponse?.success && profileResponse?.data?.user) {
          setProfile(profileResponse as ExtendedUserProfileResponse)
        } else {
          throw new Error('Invalid profile response')
        }

        // Fetch operations status
        await fetchOperationsStatus()
        
        setLoading(false)
      } catch (error) {
        console.error('Data fetch error:', error)
        let errorMessage = 'Failed to fetch user profile';
        
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        
        toast.error(errorMessage)
        setLoading(false)
      }
    }

    fetchData()
  }, [username, fetchOperationsStatus])

  const getButtonState = () => {
    if (!operationsStatus || !profile) return null

    const isFriend = operationsStatus.friends.list.some(
      friend => friend._id === profile.data.user._id
    )

    const hasSentRequest = operationsStatus.friendRequests.sent.some(
      request => request._id === profile.data.user._id
    )

    const hasReceivedRequest = operationsStatus.friendRequests.received.some(
      request => request._id === profile.data.user._id
    )

    return {
      isFriend,
      hasSentRequest,
      hasReceivedRequest,
      canSendRequest: !isFriend && !hasSentRequest && !hasReceivedRequest,
      canAcceptRequest: hasReceivedRequest,
      canRejectRequest: hasSentRequest || hasReceivedRequest,
      canRemoveFriend: isFriend
    }
  }

  const handleFriendAction = async () => {
    try {
      if (!profile || !operationsStatus) {
        toast.error('Profile or operations status not available')
        return
      }
      
      const buttonState = getButtonState()
      if (!buttonState) {
        toast.error('Unable to determine friend status')
        return
      }

      const targetUserId = profile.data.user._id
      if (!targetUserId) {
        toast.error('Invalid user ID')
        return
      }

      if (buttonState.isFriend) {
        await removeFriend(targetUserId)
      } else if (buttonState.hasSentRequest) {
        await rejectFriendRequest(targetUserId)
      } else if (buttonState.hasReceivedRequest) {
        await acceptFriendRequest(targetUserId)
      } else {
        await sendFriendRequest(targetUserId)
      }
    } catch (error) {
      console.error('Friend action error:', error)
      toast.error('Failed to update friend status')
    }
  }

  const handleStartConversation = async () => {
    try {
      if (!profile) {
        toast.error('Profile not available');
        return;
      }
      
      setMessagingLoading(true);
      const response = await chatApi.createOrGetConversation(profile.data.user._id);
      
      if (response.success && response.conversation) {
        // Navigate to the conversation with the conversation ID
        navigate(`/messages/${response.conversation._id}`);
      } else {
        toast.error(response.message || 'Failed to start conversation');
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    } finally {
      setMessagingLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      setIsLiking(true)
      const response = await postApi.toggleLike(postId)
      if (response.success) {
        // Refresh profile data to get updated likes
        const profileResponse = await getUserProfile(username!)
        if (profileResponse?.success) {
          setProfile(profileResponse as ExtendedUserProfileResponse)
        }
      } else {
        toast.error('Failed to like post')
      }
    } catch (error) {
      console.error('Error liking post:', error)
      toast.error('Failed to like post')
    } finally {
      setIsLiking(false)
    }
  }

  const handleComment = async (postId: string, content: string) => {
    try {
      setIsCommenting(true)
      const response = await postApi.addComment(postId, content)
      if (response.success) {
        // Refresh profile data to get updated comments
        const profileResponse = await getUserProfile(username!)
        if (profileResponse?.success) {
          setProfile(profileResponse as ExtendedUserProfileResponse)
        }
        setComment('')
      } else {
        toast.error('Failed to add comment')
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Failed to add comment')
    } finally {
      setIsCommenting(false)
    }
  }

  const handleReaction = async (postId: string, type: ReactionType) => {
    try {
      setIsReacting(true)
      const response = await postApi.addReaction(postId, type)
      if (response.success) {
        // Refresh profile data to get updated reactions
        const profileResponse = await getUserProfile(username!)
        if (profileResponse?.success) {
          setProfile(profileResponse as ExtendedUserProfileResponse)
        }
      } else {
        toast.error(response.message || 'Failed to add reaction')
      }
    } catch (error) {
      console.error('Error adding reaction:', error)
      toast.error('Failed to add reaction')
    } finally {
      setIsReacting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Profile Header Skeleton */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Skeleton className="w-24 h-24 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="flex space-x-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>

        {/* Posts Skeleton */}
        {[1, 2, 3].map((index) => (
          <div key={index} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center space-x-2 mb-4">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-4" />
            
            <Skeleton className="h-48 w-full rounded-lg mb-4" />
            
            <div className="flex items-center justify-between mt-4">
              <div className="flex space-x-4">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!profile || !operationsStatus) {
    return <div className="flex justify-center items-center h-screen">Profile not found</div>
  }

  const buttonState = getButtonState()
  if (!buttonState) return null

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div 
              className="relative w-24 h-24 cursor-pointer"
              onClick={() => setShowProfileImage(true)}
            >
              <img
                src={getProfileImageUrl(profile.data.user.profilePicture)}
                alt={profile.data.user.name}
                className="w-full h-full rounded-full object-cover hover:opacity-90 transition-opacity"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{profile.data.user.name}</h1>
              <p className="text-gray-600">@{profile.data.user.username}</p>
              {buttonState.isFriend && (
                <span className="text-sm text-emerald-600">Friends</span>
              )}
              {buttonState.hasSentRequest && !buttonState.isFriend && (
                <span className="text-sm text-gray-600">Friend request sent</span>
              )}
              {buttonState.hasReceivedRequest && !buttonState.isFriend && (
                <span className="text-sm text-blue-600">Friend request received</span>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
            {/* Message Button - Only show for friends */}
            {!profile.data.isOwnProfile && buttonState.isFriend && (
              <Button
                onClick={handleStartConversation}
                disabled={messagingLoading}
                className="bg-emerald-500 hover:bg-emerald-600 text-white flex-1 sm:flex-none"
              >
                {messagingLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </span>
                ) : (
                  <>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Message
                  </>
                )}
              </Button>
            )}
            
            {!profile.data.isOwnProfile && (
              <Button
                variant={
                  buttonState.isFriend 
                    ? "destructive" 
                    : buttonState.hasSentRequest 
                      ? "outline" 
                      : buttonState.hasReceivedRequest
                        ? "default"
                        : "default"
                }
                className="flex items-center space-x-2 flex-1 sm:flex-none"
                onClick={handleFriendAction}
                disabled={isLoadingAction}
              >
                {isLoadingAction ? (
                  <span>Loading...</span>
                ) : buttonState.isFriend ? (
                  <>
                    <UserMinus className="h-4 w-4" />
                    <span>Unfriend</span>
                  </>
                ) : buttonState.hasSentRequest ? (
                  <>
                    <X className="h-4 w-4" />
                    <span>Cancel Request</span>
                  </>
                ) : buttonState.hasReceivedRequest ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Accept Request</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>Add Friend</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Image Dialog */}
      <Dialog open={showProfileImage} onOpenChange={setShowProfileImage}>
        <DialogContent className="max-w-3xl">
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <div className="flex justify-center items-center p-4">
            <img
              src={getProfileImageUrl(profile.data.user.profilePicture)}
              alt={profile.data.user.name}
              className="max-h-[80vh] max-w-full object-contain rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Posts */}
      <div className="space-y-4">
        {profile.data.posts.map((post) => (
          <div key={post.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative w-10 h-10">
                <img
                  src={getProfileImageUrl(post.user.profilePicture)}
                  alt={post.user.name}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <div>
                <p className="font-medium">{post.user.name}</p>
                <p className="text-sm text-gray-500">@{post.user.username}</p>
              </div>
            </div>
            
            <p className="text-gray-800 mb-4">{post.content}</p>
            
            {post.media && (
              <div className="mb-4">
                {post.media.type === 'image' ? (
                  <img
                    src={post.media.url}
                    alt="Post media"
                    className="w-full h-auto rounded-lg object-cover"
                  />
                ) : post.media.type === 'video' ? (
                  <video
                    src={post.media.url}
                    controls
                    className="w-full h-auto rounded-lg"
                    playsInline
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : null}
              </div>
            )}

            <div className="text-sm text-gray-500 mb-4">
              {format(new Date(post.createdAt), 'MMM d, yyyy h:mm a')}
            </div>

            {/* Reactions and Comments Section */}
            <div className="border-t pt-3">
              {/* Display reactions if any */}
              {post.reactions && post.reactions.length > 0 && (
                <div className="flex justify-start mb-2">
                  <div
                    className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded-full transition-colors"
                    onClick={() => setShowReactionDialog(prev => ({ ...prev, [post.id]: true }))}
                  >
                    <ReactionDisplay reactions={post.reactions} />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Button
                      size="sm"
                      variant="ghost"
                      onMouseEnter={() => setShowReactionPopover(prev => ({ ...prev, [post.id]: true }))}
                      onClick={() => handleLike(post.id)}
                      disabled={isLiking || isReacting}
                    >
                      <ThumbsUp className="mr-1 h-4 w-4" />
                      <span>Like</span>
                    </Button>
                    
                    <ReactionPopover 
                      isOpen={showReactionPopover[post.id] || false}
                      onClose={() => setShowReactionPopover(prev => ({ ...prev, [post.id]: false }))}
                      onReaction={(type) => handleReaction(post.id, type)}
                    />
                  </div>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                    className="text-emerald-600 hover:bg-emerald-50"
                  >
                    <MessageSquare className="mr-1 h-4 w-4" />
                    {post.comments?.length || 0}
                  </Button>
                </div>
              </div>

              {/* Comments Section */}
              {showComments[post.id] && (
                <div className="mt-4">
                  {/* Comments List */}
                  {post.comments && post.comments.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {post.comments.map((comment) => (
                        <div key={comment.id} className="bg-gray-50 p-3 rounded-md">
                          <div className="flex items-start space-x-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage 
                                src={getProfileImageUrl(comment.user.profilePicture)} 
                                alt={comment.user.name} 
                              />
                              <AvatarFallback>
                                {comment.user.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{comment.user.name}</span>
                                <span className="text-sm text-gray-500">
                                  {format(new Date(comment.createdAt), 'MMM d, yyyy h:mm a')}
                                </span>
                              </div>
                              <p className="text-gray-800 mt-1">{comment.content}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Comment Form */}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (comment.trim()) {
                        handleComment(post.id, comment)
                      }
                    }} 
                    className="flex items-center gap-2"
                  >
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
            </div>

            {/* Reaction Users Dialog */}
            <ReactionUsersDialog
              postId={post.id}
              isOpen={showReactionDialog[post.id] || false}
              onClose={() => setShowReactionDialog(prev => ({ ...prev, [post.id]: false }))}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default Visit