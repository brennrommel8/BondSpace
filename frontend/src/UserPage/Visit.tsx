import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getUserProfile } from '@/api/searchApi'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { UserPlus, UserMinus, X, Check, MessageSquare } from 'lucide-react'
import { useFriendStore } from '@/store/friendStore'
import { chatApi } from '@/api/chatApi'
import { getProfileImageUrl } from '@/utils/profileImageUtils'

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
    user: {
      name: string;
      username: string;
      profilePicture: string | { url: string; publicId: string };
    };
    replies: Array<{
      id: string;
      content: string;
      user: {
        name: string;
        username: string;
        profilePicture: string | { url: string; publicId: string };
      };
    }>;
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
        toast.error('Profile not available')
        return
      }
      
      setMessagingLoading(true)
      const userId = profile.data.user._id
      
      const response = await chatApi.createOrGetConversation(userId)
      
      if (response.success && response.conversation) {
        toast.success(`Started conversation with ${profile.data.user.name}`)
      } else {
        toast.error(response.message || 'Failed to start conversation')
      }
    } catch (error) {
      console.error('Error starting conversation:', error)
      toast.error('Failed to start conversation')
    } finally {
      setMessagingLoading(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative w-24 h-24">
              <img
                src={getProfileImageUrl(profile.data.user.profilePicture)}
                alt={profile.data.user.name}
                className="w-full h-full rounded-full object-cover"
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
          
          <div className="flex space-x-2">
            {/* Message Button */}
            <Button
              onClick={handleStartConversation}
              disabled={messagingLoading}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
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
                className="flex items-center space-x-2"
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
            
            {post.media && post.media.type === 'image' && (
              <div className="mb-4">
                <img
                  src={post.media.url}
                  alt="Post media"
                  className="w-full h-auto rounded-lg object-cover"
                />
              </div>
            )}

            <div className="text-sm text-gray-500">
              {new Date(post.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Visit