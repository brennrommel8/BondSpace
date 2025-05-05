import { X, MessageSquare, UserPlus, Users } from 'lucide-react';
import { Button } from './button';
import { useState, useEffect } from 'react';
import { chatApi, Conversation, IUser } from '../../api/chatApi';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';
import { useNavigate } from 'react-router-dom';
import { useFriendStore } from '@/store/friendStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { getProfileImageUrl } from '@/utils/profileImageUtils';
import { toast } from 'sonner';

interface ChatDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChatDropdown({ isOpen, onClose }: ChatDropdownProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { operationsStatus, fetchOperationsStatus } = useFriendStore();
  
  useEffect(() => {
    if (isOpen) {
      fetchConversations();
      fetchOperationsStatus();
    }
  }, [isOpen, fetchOperationsStatus]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await chatApi.getConversations();
      if (response.success && response.conversations) {
        setConversations(response.conversations);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const createOrOpenConversation = async (userId: string) => {
    try {
      setLoading(true);
      const response = await chatApi.createOrGetConversation(userId);
      if (response.success && response.conversation) {
        // Add the new conversation to the list if it's not already there
        const existingConversation = conversations.find(
          (conv) => conv._id === response.conversation?._id
        );
        
        if (!existingConversation && response.conversation) {
          setConversations([response.conversation, ...conversations]);
        }
        
        // Navigate to the conversation page
        navigate(`/messages/${response.conversation._id}`);
        
        // Close the dropdown after creating the conversation
        onClose();
      } else {
        toast.error(response.message || 'Failed to create conversation');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Error creating conversation');
    } finally {
      setLoading(false);
    }
  };

  // Get other user from conversation (not current user)
  const getOtherParticipant = (participants: IUser[]) => {
    // In a real app, would compare with current user ID
    // For now, just return the first participant
    return participants[0];
  };

  const friendsList = operationsStatus?.friends?.list || [];
  const hasFriends = friendsList.length > 0;

  return (
    <div className="absolute right-0 w-80 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
      {/* Header */}
      <div className="p-3 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center">
        <h3 className="font-semibold text-emerald-800">Messages</h3>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center p-8 h-60">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      ) : conversations.length > 0 ? (
        <Tabs defaultValue="conversations" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="conversations" className="text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />
              Conversations
            </TabsTrigger>
            <TabsTrigger value="friends" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              Friends
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="conversations" className="max-h-80 overflow-y-auto">
            {conversations.map((conversation) => {
              const otherUser = getOtherParticipant(conversation.participants);
              return (
                <div 
                  key={conversation._id} 
                  className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 flex items-center"
                  onClick={() => {
                    navigate(`/messages/${conversation._id}`);
                    onClose();
                  }}
                >
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={getProfileImageUrl(otherUser.profilePicture)} alt={otherUser.name} />
                    <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{otherUser.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {conversation.latestMessage ? conversation.latestMessage.content : 'No messages yet'}
                    </p>
                  </div>
                </div>
              );
            })}
          </TabsContent>
          
          <TabsContent value="friends" className="max-h-80 overflow-y-auto">
            {hasFriends ? (
              friendsList.map((friend) => (
                <div 
                  key={friend._id} 
                  className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 flex items-center"
                  onClick={() => createOrOpenConversation(friend._id)}
                >
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={getProfileImageUrl(friend.profilePicture)} alt={friend.name} />
                    <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{friend.name}</p>
                    <p className="text-xs text-gray-500 truncate">@{friend.username}</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 p-0 text-emerald-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      createOrOpenConversation(friend._id);
                    }}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center h-40">
                <p className="text-sm text-gray-600 mb-2">No friends yet</p>
                <Button 
                  onClick={() => navigate('/friends')}
                  variant="outline" 
                  size="sm" 
                  className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Find Friends
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="conversations" className="text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />
              Conversations
            </TabsTrigger>
            <TabsTrigger value="friends" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              Friends
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="conversations">
            <div className="flex flex-col items-center justify-center p-6 text-center h-40">
              <div className="bg-gray-100 p-3 rounded-full mb-3">
                <MessageSquare className="h-6 w-6 text-gray-500" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">No Messages Yet</h3>
              <p className="text-sm text-gray-600 mb-2">
                Start a conversation with one of your friends.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="friends" className="max-h-80 overflow-y-auto">
            {hasFriends ? (
              friendsList.map((friend) => (
                <div 
                  key={friend._id} 
                  className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 flex items-center"
                  onClick={() => createOrOpenConversation(friend._id)}
                >
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={getProfileImageUrl(friend.profilePicture)} alt={friend.name} />
                    <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{friend.name}</p>
                    <p className="text-xs text-gray-500 truncate">@{friend.username}</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 w-8 p-0 text-emerald-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      createOrOpenConversation(friend._id);
                    }}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center h-40">
                <p className="text-sm text-gray-600 mb-2">No friends yet</p>
                <Button 
                  onClick={() => navigate('/friends')}
                  variant="outline" 
                  size="sm" 
                  className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Find Friends
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}