import { X, MessageSquare, UserPlus, Users } from 'lucide-react';
import { Button } from './button';
import { useState, useEffect, useRef } from 'react';
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
  const [activeTab, setActiveTab] = useState<string>("conversations");
  const navigate = useNavigate();
  const { operationsStatus, fetchOperationsStatus } = useFriendStore();
  const isMobile = window.innerWidth < 768;
  const tabsRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (isOpen) {
      fetchConversations();
      fetchOperationsStatus();
    }
  }, [isOpen, fetchOperationsStatus]);

  // Detect if screen size changes
  useEffect(() => {
    const handleResize = () => {
      const newIsMobile = window.innerWidth < 768;
      if (newIsMobile !== isMobile) {
        // Force re-render when mobile status changes
        setConversations([...conversations]);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [conversations, isMobile]);

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
        
        // Only close dropdown in desktop view
        if (!isMobile) {
          onClose();
        }
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

  // Function to navigate without closing dropdown
  const navigateWithoutClosing = (path: string) => {
    navigate(path);
    // Only close dropdown in desktop view
    if (!isMobile) {
      onClose();
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

  // Update dropdown classes to ensure proper sizing on all mobile devices
  const dropdownClasses = isMobile 
    ? "fixed left-0 right-0 top-14 max-h-[70vh] overflow-y-auto z-50 chat-dropdown-content w-full" 
    : "absolute right-0 w-80 mt-2 max-h-[500px] overflow-y-auto z-50 chat-dropdown-content";

  // Handle tab changes
  const handleTabChange = (tab: string) => {
    console.log("Changing tab to:", tab);
    setActiveTab(tab);
  };

  return (
    <div className={`${dropdownClasses} bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden`}>
      {/* Header */}
      <div className="sticky top-0 p-3 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center z-10">
        <h3 className="font-semibold text-emerald-800">Messages</h3>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-100" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center p-8 h-60">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      ) : conversations.length > 0 ? (
        <div ref={tabsRef}>
          <Tabs defaultValue={activeTab} value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="sticky top-[57px] grid w-full grid-cols-2 bg-white z-10">
              <TabsTrigger value="conversations" className="text-xs text-emerald-600 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                <MessageSquare className="h-3 w-3 mr-1" />
                Conversations
              </TabsTrigger>
              <TabsTrigger value="friends" className="text-xs text-emerald-600 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                <Users className="h-3 w-3 mr-1" />
                Friends
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="conversations" className="max-h-[calc(70vh-120px)] overflow-y-auto">
              {conversations.map(conversation => {
                const otherUser = getOtherParticipant(conversation.participants);
                return (
                  <div 
                    key={conversation._id} 
                    className="p-3 hover:bg-emerald-50 cursor-pointer border-b border-gray-100 flex items-center"
                    onClick={() => {
                      navigateWithoutClosing(`/messages/${conversation._id}`);
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
            
            <TabsContent value="friends" className="max-h-[calc(70vh-120px)] overflow-y-auto">
              {hasFriends ? (
                friendsList.map((friend) => (
                  <div 
                    key={friend._id} 
                    className="p-3 hover:bg-emerald-50 cursor-pointer border-b border-gray-100 flex items-center"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      createOrOpenConversation(friend._id);
                    }}
                  >
                    <Avatar className="h-10 w-10 flex-shrink-0 mr-2">
                      <AvatarImage src={getProfileImageUrl(friend.profilePicture)} alt={friend.name} />
                      <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="font-medium text-sm text-gray-900 truncate">{friend.name}</p>
                      <p className="text-xs text-gray-500 truncate">@{friend.username}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50 flex-shrink-0"
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
                <div className="flex flex-col items-center justify-center p-6 text-center h-40 space-y-3">
                  <p className="text-sm text-gray-600">No friends yet</p>
                  <Button 
                    onClick={() => navigateWithoutClosing('/friends')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white w-full max-w-[200px]"
                    size="sm"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Find Friends
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div ref={tabsRef}>
          <Tabs defaultValue={activeTab} value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="sticky top-[57px] grid w-full grid-cols-2 bg-white z-10">
              <TabsTrigger value="conversations" className="text-xs text-emerald-600 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                <MessageSquare className="h-3 w-3 mr-1" />
                Conversations
              </TabsTrigger>
              <TabsTrigger value="friends" className="text-xs text-emerald-600 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
                <Users className="h-3 w-3 mr-1" />
                Friends
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="conversations">
              <div className="flex flex-col items-center justify-center p-6 text-center h-40">
                <div className="bg-emerald-100 p-3 rounded-full mb-3">
                  <MessageSquare className="h-6 w-6 text-emerald-500" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">No Messages Yet</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Start a conversation with one of your friends.
                </p>
                <Button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleTabChange("friends");
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="sm"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Start a Conversation
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="friends" className="max-h-[calc(70vh-120px)] overflow-y-auto">
              {hasFriends ? (
                friendsList.map((friend) => (
                  <div 
                    key={friend._id} 
                    className="p-3 hover:bg-emerald-50 cursor-pointer border-b border-gray-100 flex items-center"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      createOrOpenConversation(friend._id);
                    }}
                  >
                    <Avatar className="h-10 w-10 flex-shrink-0 mr-2">
                      <AvatarImage src={getProfileImageUrl(friend.profilePicture)} alt={friend.name} />
                      <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="font-medium text-sm text-gray-900 truncate">{friend.name}</p>
                      <p className="text-xs text-gray-500 truncate">@{friend.username}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50 flex-shrink-0"
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
                <div className="flex flex-col items-center justify-center p-6 text-center h-40 space-y-3">
                  <p className="text-sm text-gray-600">No friends yet</p>
                  <Button 
                    onClick={() => navigateWithoutClosing('/friends')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white w-full max-w-[200px]"
                    size="sm"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Find Friends
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
      
      {/* Fixed footer with "See all" button */}
      <div className="sticky bottom-0 p-2 bg-white border-t border-gray-100 text-center">
        <Button 
          className="bg-emerald-600 hover:bg-emerald-700 text-white w-full"
          size="sm" 
          onClick={() => navigateWithoutClosing('/messages')}
        >
          See All Messages
        </Button>
      </div>
    </div>
  );
}