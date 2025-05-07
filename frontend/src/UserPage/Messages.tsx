import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import ConversationPanel from '@/components/ConversationPanel';
import { toast } from 'sonner';
import { useFriendStore } from '@/store/friendStore';
import { chatApi, IUser } from '@/api/chatApi';
import { Button } from '@/components/ui/button';
import { Users, LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Messages: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { user } = useUserStore();
  const { loading: authLoading, authChecked } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { operationsStatus, fetchOperationsStatus } = useFriendStore();
  
  // Scroll to top on mount and fetch friends list only
  useEffect(() => {
    window.scrollTo(0, 0);
    
    // Fetch friends list
    fetchOperationsStatus();
  }, [fetchOperationsStatus]);

  // Log debugging information without triggering re-renders
  useEffect(() => {
    console.log("Messages component rendered with:", {
      user: user ? `ID: ${user._id}, Name: ${user.name}` : "Not logged in",
      conversationId: conversationId || "No conversation ID",
      authLoading,
      authChecked
    });
  }, [user, conversationId, authLoading, authChecked]);

  // Create conversation with a friend
  const createConversation = async (friendId: string) => {
    try {
      const response = await chatApi.createOrGetConversation(friendId);
      if (response.success && response.conversations?.[0]) {
        navigate(`/messages/${response.conversations[0]._id}`);
        toast.success(`Started conversation with ${response.conversations[0].participants.find((p: IUser) => p._id !== user?._id)?.name}`);
      } else {
        toast.error(response.message || 'Failed to create conversation');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Could not start conversation');
    }
  };

  // If loading authentication status
  if (authLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="w-10 h-10 border-4 border-t-emerald-500 border-emerald-200 rounded-full animate-spin mx-auto mb-4"></div>
          <p>Checking authentication status...</p>
        </div>
      </div>
    );
  }

  // If there's an issue with the user not being authenticated
  if (!user) {
    console.warn("User not logged in, rendering login prompt");
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <div className="bg-emerald-100 p-3 rounded-full mb-3 inline-block">
            <LogIn className="h-6 w-6 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Sign in Required</h2>
          <p className="text-gray-600 mb-6">
            Please sign in to view and send messages. Create an account to connect with friends and start conversations.
          </p>
          <div className="space-y-3">
            <Button 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
              onClick={() => navigate('/SignIn')}
            >
              Sign In
            </Button>
            <Button 
              variant="outline" 
              className="w-full border-emerald-600 text-emerald-600 hover:bg-emerald-50"
              onClick={() => navigate('/SignUp')}
            >
              Create Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Display error if there is one
  if (error) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <p className="text-red-500">{error}</p>
          <button 
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded"
            onClick={() => setError(null)}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // If no conversation is selected and we have friends, show a friends list
  if (!conversationId && operationsStatus?.friends?.list && operationsStatus.friends.list.length > 0) {
    return (
      <div className="max-w-4xl mx-auto p-6 h-[calc(100vh-3.5rem)] bg-white rounded-lg shadow-sm overflow-auto">
        <h2 className="text-2xl font-bold mb-6">Start a Conversation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {operationsStatus?.friends?.list?.map(friend => (
            <div 
              key={friend._id} 
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => createConversation(friend._id)}
            >
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full bg-gray-200 mr-3">
                  {friend.profilePicture && (
                    <img 
                      src={typeof friend.profilePicture === 'string' 
                        ? friend.profilePicture 
                        : friend.profilePicture.url
                      } 
                      alt={friend.name} 
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">{friend.name}</h3>
                  <p className="text-sm text-gray-500">@{friend.username}</p>
                </div>
              </div>
              <Button className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Users className="mr-2 h-4 w-4" />
                Start Chat
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // If user is authenticated but has no friends
  if (!conversationId && (!operationsStatus?.friends?.list || operationsStatus.friends.list.length === 0)) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <div className="bg-emerald-100 p-3 rounded-full mb-3 inline-block">
            <Users className="h-6 w-6 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No Friends Yet</h2>
          <p className="text-gray-600 mb-6">
            Add friends to start conversations with them. Connect with people you know to message them.
          </p>
          <Button 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
            onClick={() => navigate('/UserAccount')}
          >
            Find Friends
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ConversationPanel 
      conversationId={conversationId} 
      userId={user._id}
    />
  );
};

export default Messages; 