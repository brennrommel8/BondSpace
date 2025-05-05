import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { format } from 'date-fns';
import { Send, Paperclip, Smile, Image, X, Play, Users, ChevronLeft, Menu, Trash2, Video, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getProfileImageUrl } from '@/utils/profileImageUtils';
import { chatApi, Conversation, Message as ApiMessage, Media } from '@/api/chatApi';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { 
  joinConversation, 
  leaveConversation, 
  onNewMessage, 
  sendPrivateMessage,
  sendTypingIndicator,
  onTypingIndicator,
  onMessageRead,
  onMessageDeleted,
  sendMessageDeletionNotification,
  onIncomingCall,
  respondToCall,
  callUser,
  initializeSocket
} from '@/utils/socketUtils';
import { videoCallApi } from '@/api/videoCallApi';
import useSocket from '@/hooks/useSocket';
import TypingIndicator from './TypingIndicator';
import VideoCall from './VideoCall';
import IncomingCallNotification from './IncomingCallNotification';

// Local interface for structured message data after transformation
interface Message {
  _id: string;
  content?: string;
  media?: Media[];
  sender: {
    _id: string;
    name: string;
    username: string;
    profilePicture?: string | { url: string };
  };
  createdAt: string;
  read: boolean;
  deleted?: boolean; // Track if message was deleted
}

interface ConversationParticipant {
  _id: string;
  name: string;
  username: string;
  profilePicture?: string | { url: string };
}

interface ConversationData {
  _id: string;
  participants: ConversationParticipant[];
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
}

interface ConversationPanelProps {
  conversationId?: string;
  userId: string; // Current user's ID
}

const ConversationPanel: React.FC<ConversationPanelProps> = ({ conversationId, userId }) => {
  const { user } = useUserStore(); // Get current user from store
  const { isConnected, onlineUsers, setIsConnected, forceReconnect } = useSocket(); // Use our socket hook
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationData | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<{[key: string]: { userId: string, username: string, timer: any }}>({}); 
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const navigate = useNavigate();
  const [showConversationList, setShowConversationList] = useState(true);
  
  // Video call states
  const [isInCall, setIsInCall] = useState(false);
  const [callRoomId, setCallRoomId] = useState<string | null>(null);
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState<{
    callerId: string;
    callerName: string;
    roomId: string;
  } | null>(null);
  const [initiatingCall, setInitiatingCall] = useState(false);

  // Transform API conversation to local format
  const transformConversation = (apiConv: Conversation): ConversationData => {
    return {
      _id: apiConv._id,
      participants: apiConv.participants,
      lastMessage: apiConv.latestMessage ? transformMessage(apiConv.latestMessage) : undefined,
      unreadCount: 0, // Default to 0 if not provided by API
      updatedAt: apiConv.updatedAt
    };
  };

  // Transform API message to local format
  const transformMessage = (apiMsg: ApiMessage): Message => {
    // Handle case where sender could be a string ID or a full user object
    let senderObj;
    
    if (typeof apiMsg.sender === 'string') {
      // If sender is just a string ID
      senderObj = { 
        _id: apiMsg.sender, 
        name: 'Unknown User', 
        username: 'unknown'
      };
    } else {
      // If sender is a user object
      senderObj = apiMsg.sender;
    }
    
    // Determine if message has been read by checking readBy array
    // For own messages, check if any other participant has read it
    // For others' messages, doesn't matter as we show read status only for own messages
    const isRead = Array.isArray(apiMsg.readBy) && 
                  apiMsg.readBy.some(readerId => readerId !== userId);
    
    return {
      _id: apiMsg._id,
      content: apiMsg.content,
      media: apiMsg.media,
      sender: senderObj,
      createdAt: apiMsg.createdAt,
      read: isRead, // Set based on readBy array
      deleted: apiMsg.content === undefined && (!apiMsg.media || apiMsg.media.length === 0) // Message with no content or media is considered deleted
    };
  };

  // Debug helper to print simplified conversation 
  const logConversationFlow = () => {
    if (messages.length === 0) return;
    
    console.log("=== CONVERSATION FLOW ===");
    console.log(`Current user ID: ${userId}`);
    console.log(`User from store: ${user?._id || user?.id || 'unknown'}`);
    
    const simplifiedMessages = messages.map(msg => ({
      sender: msg.sender._id,
      isCurrentUser: isOwnMessage(msg),
      content: msg.content,
      time: formatTime(msg.createdAt)
    }));
    
    console.table(simplifiedMessages);
    console.log("=========================");
  };

  // Call this function after setting messages
  useEffect(() => {
    if (messages.length > 0) {
      logConversationFlow();
    }
  }, [messages]);

  // File handling functions
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Convert FileList to array and limit to 3 files
      const newFiles = Array.from(e.target.files).slice(0, 3);
      
      // Generate preview URLs for the files
      const urls = newFiles.map(file => URL.createObjectURL(file));
      
      setSelectedFiles(prev => {
        // Limit total to 3 files
        const combined = [...prev, ...newFiles].slice(0, 3);
        return combined;
      });
      
      setPreviewUrls(prev => {
        const combined = [...prev, ...urls].slice(0, 3);
        return combined;
      });
    }
  };
  
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      // Revoke the URL to avoid memory leaks
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };
  
  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  // Set default view based on screen size and handle resizing
  useEffect(() => {
    // On mount, set appropriate view based on screen width and conversation
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        // On desktop, always show conversation list
        setShowConversationList(true);
      } else if (window.innerWidth < 768 && activeConversation) {
        // On mobile with active conversation, hide list
        setShowConversationList(false);
      }
    };

    // Call once on mount
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, [activeConversation]);

  // Notify user about socket connection status
  useEffect(() => {
    if (isConnected) {
      console.log('Socket connected to real-time messaging service');
    } else {
      console.log('Socket disconnected from real-time messaging service');
    }
  }, [isConnected]);

  // Fetch all conversations
  useEffect(() => {
    fetchConversations();
  }, []);

  // Set active conversation
  useEffect(() => {
    console.log('Conversations data:', conversations);
    console.log('Conversation ID from props:', conversationId);
    
    if (conversationId && conversations.length > 0) {
      const selected = conversations.find(conv => conv._id === conversationId);
      console.log('Selected conversation:', selected);
      
      if (selected) {
        setActiveConversation(selected);
        fetchMessages(selected._id);
      } else {
        console.log('Conversation not found in list');
      }
    } else if (conversations.length > 0 && !activeConversation) {
      console.log('Setting first conversation as active');
      setActiveConversation(conversations[0]);
      fetchMessages(conversations[0]._id);
    } else {
      console.log('No conversations available or already have active conversation');
    }
  }, [conversationId, conversations]);

  // Join/leave conversation room using sockets
  useEffect(() => {
    if (activeConversation && isConnected) {
      console.log('Joining conversation room:', activeConversation._id);
      joinConversation(activeConversation._id);
      
      // Setup listener for new messages
      const newMessageCleanup = onNewMessage((data) => {
        console.log('New message received via socket:', data);
        
        // Handle different possible data formats
        const messageSenderId = data.senderId || (data.sender && (data.sender._id || data.sender));
        const messageConversationId = data.conversationId || data.conversation;
        const receivedMessageObj = data.messageObj || data.messageData || data;
        
        // If we have a valid conversation ID match
        if (messageConversationId === activeConversation._id) {
          console.log('Message is for current conversation');
          
          // Check if this is a complete message object we can use directly
          if (receivedMessageObj && typeof receivedMessageObj === 'object' && 
              (receivedMessageObj._id || receivedMessageObj.id)) {
            console.log('Adding message from complete message object');
            const newMessage = transformMessage(receivedMessageObj);
            
            // Only add if message doesn't already exist
            setMessages(prev => {
              const messageExists = prev.some(m => m._id === newMessage._id);
              if (messageExists) {
                console.log('Message already exists, skipping');
                return prev;
              }
              return [...prev, newMessage];
            });
          } 
          // If we received basic message info but not a complete object
          else if (messageSenderId) {
            console.log('Fetching complete message data from server');
            // This is a notification that a new message was created
            // We should fetch the latest messages to get the full message
            fetchMessages(activeConversation._id);
          }
        } else if (messageConversationId) {
          // Message is for a different conversation
          console.log('Message is for different conversation:', messageConversationId);
          // Update that conversation's unread count or refresh the conversations list
          toast.info('New message in another conversation');
          fetchConversations();
        } else {
          console.log('Could not determine conversation for message:', data);
        }
      });
      
      // Setup listener for message read updates
      const readReceiptCleanup = onMessageRead((data) => {
        console.log('Message read status update received:', data);
        
        if (data.conversationId === activeConversation._id) {
          // Update read status of messages in the current conversation
          setMessages(prev => prev.map(msg => {
            // If this message ID is in the read messages list
            if (data.messageIds.includes(msg._id)) {
              return { ...msg, read: true };
            }
            return msg;
          }));
        } else {
          // Update for a different conversation - refresh conversation list
          fetchConversations();
        }
      });
      
      // Setup listener for message deletion events
      const messageDeletionCleanup = onMessageDeleted((data) => {
        console.log('Message deletion event received:', data);
        
        if (data.conversationId === activeConversation._id) {
          // Mark the message as deleted in the current conversation
          setMessages(prev => prev.map(msg => {
            if (msg._id === data.messageId) {
              return { ...msg, deleted: true, content: undefined, media: [] };
            }
            return msg;
          }));
        } else {
          // Update for a different conversation - refresh conversation list
          fetchConversations();
        }
      });
      
      return () => {
        // Clean up listeners when unmounting or changing conversations
        newMessageCleanup();
        readReceiptCleanup();
        messageDeletionCleanup();
        leaveConversation(activeConversation._id);
      };
    }
  }, [activeConversation, isConnected]);

  // Scroll to bottom of message list when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      console.log('Fetching conversations...');
      const response = await chatApi.getConversations();
      console.log('API response for conversations:', response);
      
      if (response.success && response.conversations) {
        // Transform API conversations to local format
        const transformedConvs = response.conversations.map(transformConversation);
        console.log('Transformed conversations:', transformedConvs);
        setConversations(transformedConvs);
      } else {
        console.warn('No conversations returned from API:', response);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      setLoading(true);
      const response = await chatApi.getMessages(convId);
      if (response.success && response.messages) {
        // Transform API messages to local format
        const transformedMsgs = response.messages.map(transformMessage);
        console.log("Fetched Messages:", response.messages);
        console.log("Transformed Messages:", transformedMsgs);
        console.log("Current User ID:", userId);
        console.log("User from store:", user);
        setMessages(transformedMsgs);
      } else {
        console.log('No messages returned from API:', response);
        setMessages([]); // Ensure empty array for no messages
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  // Send message handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((!messageInput || messageInput.trim() === '') && selectedFiles.length === 0) {
      return; // Don't send empty messages
    }
    
    if (!activeConversation) {
      toast.error('No active conversation selected');
      return;
    }
    
    try {
      setSendingMessage(true);
      
      console.log('Sending message:', messageInput, 'Files:', selectedFiles.length);
      
      // Call the API to send the message
      const response = await chatApi.sendMessage(
        activeConversation._id,
        messageInput,
        selectedFiles
      );
      
      if (response.success && response.message) {
        // Transform and add the message optimistically
        const newMessage = transformMessage(response.message);
        setMessages(prev => [...prev, newMessage]);
        
        // Also send message via socket for real-time delivery
        try {
          const otherParticipant = getOtherParticipant(activeConversation);
          if (otherParticipant) {
            sendPrivateMessage(
              otherParticipant._id,
              messageInput,
              activeConversation._id,
              response.message
            );
          }
        } catch (socketError) {
          // Don't worry if the socket fails, the message was saved via the API
          console.log('Socket delivery skipped or failed, message still sent via API');
        }
        
        // Clear input and files
        setMessageInput('');
        setSelectedFiles([]);
        setPreviewUrls(prev => {
          prev.forEach(url => URL.revokeObjectURL(url));
          return [];
        });
        
        // Scroll to bottom
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        toast.error(response.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error sending message, please try again');
    } finally {
      setSendingMessage(false);
    }
  };

  const isOwnMessage = (message: Message) => {
    const senderId = typeof message.sender === 'string' ? message.sender : message.sender._id;
    
    // Collect all possible current user IDs
    const possibleUserIds = [
      userId,              // ID passed as prop
      user?._id,           // ID from user store (_id format)
      user?.id,            // ID from user store (id format)
    ].filter(Boolean);     // Remove any undefined/null values
    
    // Check if sender ID matches any of our possible IDs
    const isOwn = possibleUserIds.some(id => id === senderId);
    
    return isOwn;
  };

  const getOtherParticipant = (conversation: ConversationData) => {
    // Try to find a participant that is not the current user
    const otherUser = conversation.participants.find(p => p._id !== userId);
    
    // If found, return that user
    if (otherUser) {
      return otherUser;
    }
    
    // Fallback: return the first participant (even if it's the current user)
    // or a default object if no participants exist
    return conversation.participants[0] || { 
      _id: 'unknown', 
      name: 'Unknown User', 
      username: 'unknown',
      profilePicture: undefined
    };
  };

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'h:mm a');
    } catch (error) {
      return '';
    }
  };

  const selectConversation = (conversation: ConversationData) => {
    setActiveConversation(conversation);
    fetchMessages(conversation._id);
    // Hide conversation list on mobile when a conversation is selected
    if (window.innerWidth < 768) {
      setShowConversationList(false);
    }
  };

  // Render media attachments for a message
  const renderMediaAttachments = (media: Media[]) => {
    return (
      <div className={`flex flex-wrap gap-2 mt-2 max-w-full`}>
        {media.map((item, index) => (
          <div key={index} className="relative">
            {item.mediaType === 'image' ? (
              <img 
                src={item.url} 
                alt="Attachment" 
                className="rounded-lg max-h-32 sm:max-h-48 max-w-full object-cover border border-gray-200"
              />
            ) : (
              <div className="relative rounded-lg overflow-hidden">
                <video 
                  src={item.url}
                  className="max-h-32 sm:max-h-48 max-w-full object-cover"
                  controls={false}
                />
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                  <Play className="h-8 w-8 text-white" />
                </div>
                {item.thumbnail && (
                  <img 
                    src={item.thumbnail} 
                    alt="Video thumbnail" 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Check if user is online
  const isUserOnline = (userId: string): boolean => {
    console.log('Checking if user is online:', userId, 'Online users:', Array.from(onlineUsers));
    return onlineUsers.has(userId);
  };

  // Check for online status changes
  useEffect(() => {
    console.log('Online users changed:', Array.from(onlineUsers));
  }, [onlineUsers]);

  // Render conversation list with online status indicators
  const renderConversations = () => {
    return conversations.map(conversation => {
      const otherUser = getOtherParticipant(conversation);
      const isActive = activeConversation?._id === conversation._id;
      const isOnline = isUserOnline(otherUser._id);
      
      return (
        <div 
          key={conversation._id}
          className={`flex items-center p-3 cursor-pointer border-b border-gray-100 hover:bg-gray-50 ${
            isActive ? 'bg-emerald-50' : ''
          }`}
          onClick={() => selectConversation(conversation)}
        >
          <div className="relative">
            <Avatar className="h-12 w-12 mr-3">
              <AvatarImage src={getProfileImageUrl(otherUser.profilePicture)} alt={otherUser.name} />
              <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
            </Avatar>
            {conversation.unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                {conversation.unreadCount}
              </span>
            )}
            {isOnline && (
              <span className="absolute bottom-0 right-1 bg-emerald-500 w-3 h-3 rounded-full border-2 border-white"></span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between">
              <p className="font-medium text-gray-900 truncate">{otherUser.name}</p>
              <p className="text-xs text-gray-500">
                {conversation.lastMessage ? formatTime(conversation.lastMessage.createdAt) : ''}
              </p>
            </div>
            <p className="text-sm text-gray-500 truncate">
              {conversation.lastMessage ? conversation.lastMessage.content : 'No messages yet'}
            </p>
          </div>
        </div>
      );
    });
  };

  // Handle typing indicator events
  useEffect(() => {
    if (activeConversation && isConnected) {
      const cleanup = onTypingIndicator((data) => {
        if (data.conversationId === activeConversation._id && data.userId !== userId) {
          // Find the user's name from conversation participants
          const typingUser = activeConversation.participants.find(p => p._id === data.userId);
          const username = typingUser ? typingUser.name : 'Someone';
          
          if (data.isTyping) {
            // Clear any existing timeout for this user
            if (typingUsers[data.userId] && typingUsers[data.userId].timer) {
              clearTimeout(typingUsers[data.userId].timer);
            }
            
            // Set a timeout to auto-remove typing indicator after 3 seconds of no updates
            const timer = setTimeout(() => {
              setTypingUsers(prev => {
                const updated = { ...prev };
                delete updated[data.userId];
                return updated;
              });
            }, 3000);
            
            // Add or update the typing user
            setTypingUsers(prev => ({
              ...prev,
              [data.userId]: { userId: data.userId, username, timer }
            }));
          } else {
            // Remove the typing indicator for this user
            setTypingUsers(prev => {
              const updated = { ...prev };
              if (updated[data.userId] && updated[data.userId].timer) {
                clearTimeout(updated[data.userId].timer);
              }
              delete updated[data.userId];
              return updated;
            });
          }
        }
      });
      
      return cleanup;
    }
  }, [activeConversation, isConnected, userId]);

  // Handle input changes and send typing indicators
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessageInput(value);
    
    // Only send typing indicators if we have an active conversation and socket connection
    if (activeConversation && isConnected) {
      // If we're starting to type, send typing indicator immediately
      if (value && !messageInput) {
        sendTypingIndicator(activeConversation._id, true);
      }
      
      // Clear any existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      if (value) {
        // Reset the timeout - user is still typing
        typingTimeoutRef.current = setTimeout(() => {
          // After 2 seconds of no typing, send stopped typing
          if (activeConversation) {
            sendTypingIndicator(activeConversation._id, false);
          }
        }, 2000);
      } else {
        // If input is now empty, send stopped typing right away
        sendTypingIndicator(activeConversation._id, false);
      }
    }
  };

  // Clean up typing indicator timeout on unmount or conversation change
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Also clear any timers in the typingUsers state
      Object.values(typingUsers).forEach(user => {
        if (user.timer) {
          clearTimeout(user.timer);
        }
      });
    };
  }, [activeConversation]);

  // Render user typing indicators
  const renderTypingIndicators = () => {
    const typingUsersArray = Object.values(typingUsers);
    
    if (typingUsersArray.length === 0) return null;
    
    if (typingUsersArray.length === 1) {
      return (
        <TypingIndicator 
          isTyping={true} 
          username={typingUsersArray[0].username} 
        />
      );
    } else {
      return (
        <TypingIndicator 
          isTyping={true} 
          username={`${typingUsersArray.length} people`} 
        />
      );
    }
  };

  // Delete a message
  const handleDeleteMessage = async (messageId: string) => {
    try {
      console.log('Deleting message:', messageId);
      const response = await chatApi.deleteMessage(messageId);
      
      if (response.success) {
        // Mark the message as deleted in the UI
        setMessages(prevMessages => prevMessages.map(msg => 
          msg._id === messageId 
            ? { ...msg, deleted: true, content: undefined, media: [] } 
            : msg
        ));
        
        // Send socket notification about deleted message
        if (activeConversation) {
          sendMessageDeletionNotification(activeConversation._id, messageId);
        }
        
        toast.success('Message deleted');
      } else {
        toast.error(response.message || 'Failed to delete message');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  // Mark messages as read
  const markMessagesAsRead = async () => {
    if (!activeConversation) return;
    
    try {
      const response = await chatApi.markMessagesAsRead(activeConversation._id);
      
      if (response.success) {
        // Update read status in the UI
        setMessages(prevMessages => prevMessages.map(msg => {
          // Only mark other user's messages as read
          if (!isOwnMessage(msg)) {
            return { ...msg, read: true };
          }
          return msg;
        }));
      } else {
        console.error('Failed to mark messages as read:', response.message);
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Mark messages as read when a conversation becomes active
  useEffect(() => {
    if (activeConversation) {
      markMessagesAsRead();
    }
  }, [activeConversation]);

  // Periodically mark messages as read while user is active in the conversation
  useEffect(() => {
    if (!activeConversation) return;
    
    // Initial mark as read
    markMessagesAsRead();
    
    // Then set up an interval to periodically mark messages as read
    const interval = setInterval(() => {
      markMessagesAsRead();
    }, 5000); // Check every 5 seconds
    
    return () => {
      clearInterval(interval);
    };
  }, [activeConversation?._id]);

  // Video call handlers
  const initiateVideoCall = async () => {
    if (!activeConversation) return;
    
    try {
      setInitiatingCall(true);
      const otherParticipant = getOtherParticipant(activeConversation);
      
      // Check if recipient is online
      if (!isUserOnline(otherParticipant._id)) {
        toast.error(`${otherParticipant.name} is offline`);
        setInitiatingCall(false);
        return;
      }
      
      // Call the API to initiate the call
      const response = await videoCallApi.initiateCall(otherParticipant._id);
      
      if (response.success && response.roomId) {
        // Set the call room ID
        setCallRoomId(response.roomId);
        
        // Notify the recipient through socket
        callUser(otherParticipant._id, response.roomId);
        
        // Show the video call UI
        setIsInCall(true);
        
        toast.success(`Calling ${otherParticipant.name}...`);
      } else {
        toast.error(response.message || 'Failed to initiate call');
      }
    } catch (error) {
      console.error('Error initiating call:', error);
      toast.error('Failed to initiate call');
    } finally {
      setInitiatingCall(false);
    }
  };
  
  const handleAcceptCall = async () => {
    if (!incomingCallData) return;
    
    try {
      // Accept the call through socket
      respondToCall(incomingCallData.callerId, true, incomingCallData.roomId);
      
      // Set call states
      setCallRoomId(incomingCallData.roomId);
      setIsInCall(true);
      setShowIncomingCall(false);
      
      toast.success(`Connected to ${incomingCallData.callerName}`);
    } catch (error) {
      console.error('Error accepting call:', error);
      toast.error('Failed to accept call');
    }
  };
  
  const handleRejectCall = () => {
    if (!incomingCallData) return;
    
    // Reject the call through socket
    respondToCall(incomingCallData.callerId, false, incomingCallData.roomId);
    
    // Reset incoming call states
    setShowIncomingCall(false);
    setIncomingCallData(null);
    
    toast.info('Call rejected');
  };
  
  const handleEndCall = () => {
    // End the call
    setIsInCall(false);
    setCallRoomId(null);
  };

  // Listen for incoming calls
  useEffect(() => {
    if (!isConnected) return;
    
    const cleanup = onIncomingCall((data) => {
      console.log('Incoming call:', data);
      
      // Find the caller's information
      let callerName = data.fromUsername || 'Unknown User';
      let callerId = data.from;
      
      // If we have the conversation with this user, use their name from there
      const conversationWithCaller = conversations.find(conv => 
        conv.participants.some(p => p._id === data.from)
      );
      
      if (conversationWithCaller) {
        const caller = conversationWithCaller.participants.find(p => p._id === data.from);
        if (caller) {
          callerName = caller.name;
        }
      }
      
      // Set the incoming call data
      setIncomingCallData({
        callerId,
        callerName,
        roomId: data.roomId
      });
      
      // Show the incoming call notification
      setShowIncomingCall(true);
      
      // Play a sound (optional)
      // const audio = new Audio('/sounds/incoming-call.mp3');
      // audio.play();
    });
    
    return cleanup;
  }, [isConnected, conversations]);

  // Ensure socket connection is initialized
  useEffect(() => {
    if (!isConnected && user) {
      console.log('Socket not connected - attempting to initialize');
      const socketInstance = initializeSocket();
      console.log('Socket initialization result:', !!socketInstance);
    }
  }, [isConnected, user]);

  // Add a socket reconnection button in the UI
  const handleReconnectSocket = () => {
    console.log('User manually triggered socket reconnection');
    setIsConnected(false); // Show reconnecting state
    
    // Force socket reconnection
    forceReconnect().then(success => {
      console.log('Socket reconnection attempt result:', success);
      setIsConnected(success);
      
      if (success && activeConversation) {
        // Rejoin the conversation room
        joinConversation(activeConversation._id);
        // Fetch messages to ensure we're up to date
        fetchMessages(activeConversation._id);
        toast.success('Reconnected successfully');
      } else {
        toast.error('Failed to reconnect. Please try again.');
      }
    });
  };

  // Add this to the rendering of the conversations list (sidebar)
  const renderSocketStatus = () => {
    return (
      <div className="flex items-center space-x-2 py-2 px-4 border-t">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-xs text-gray-500">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
        {!isConnected && (
          <button
            onClick={handleReconnectSocket}
            className="ml-auto text-xs bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded"
          >
            Reconnect
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-100">
      {/* Video Call UI - shown when in a call */}
      {isInCall && callRoomId && (
        <VideoCall
          roomId={callRoomId}
          recipientId={incomingCallData?.callerId || (activeConversation ? getOtherParticipant(activeConversation)._id : '')}
          recipientName={incomingCallData?.callerName || (activeConversation ? getOtherParticipant(activeConversation).name : '')}
          onEndCall={handleEndCall}
          isIncoming={!!incomingCallData}
          isAnswered={true}
        />
      )}
      
      {/* Incoming Call Notification */}
      {showIncomingCall && incomingCallData && (
        <IncomingCallNotification
          callerName={incomingCallData.callerName}
          callerProfilePicture={
            conversations.find(conv => 
              conv.participants.some(p => p._id === incomingCallData.callerId)
            )?.participants.find(p => p._id === incomingCallData.callerId)?.profilePicture
          }
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}
      
      {/* Conversations List */}
      <div className={`${showConversationList ? 'flex' : 'hidden md:flex'} w-full md:w-1/3 md:max-w-xs bg-white border-r border-gray-200 flex-col`}>
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Messages</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading && conversations.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <div className="bg-emerald-100 p-3 rounded-full mb-3">
                <MessageSquare className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="text-gray-600 mb-3">No conversations yet</p>
              <Button 
                variant="outline"
                size="sm"
                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                onClick={() => navigate('/messages')}
              >
                Start a New Conversation
              </Button>
            </div>
          ) : (
            renderConversations()
          )}
        </div>
        
        {/* Add socket status indicator at the bottom of the sidebar */}
        {renderSocketStatus()}
      </div>
      
      {/* Right side with active conversation */}
      <div className={`${showConversationList ? 'hidden md:flex' : 'flex'} flex-1 flex-col`}>
        {activeConversation ? (
          <>
            {/* Conversation Header */}
            <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden mr-2 text-emerald-600"
                onClick={() => setShowConversationList(true)}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Avatar className="h-10 w-10 mr-3">
                <AvatarImage 
                  src={getProfileImageUrl(getOtherParticipant(activeConversation).profilePicture)} 
                  alt={getOtherParticipant(activeConversation).name} 
                />
                <AvatarFallback>{getOtherParticipant(activeConversation).name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-gray-900">{getOtherParticipant(activeConversation).name}</h3>
                <p className="text-xs text-gray-500">@{getOtherParticipant(activeConversation).username}</p>
              </div>
              
              {/* Video Call Button */}
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto text-emerald-600"
                onClick={() => {
                  console.log('Initiating video call, isConnected:', isConnected);
                  console.log('Recipient online status:', isUserOnline(getOtherParticipant(activeConversation)._id));
                  console.log('Online users:', Array.from(onlineUsers));
                  initiateVideoCall();
                }}
                disabled={initiatingCall} // Temporarily enable the button regardless of online status
                title="Start video call"
              >
                <Video className="h-5 w-5" />
                {initiatingCall && <span className="absolute top-0 right-0 h-2 w-2 bg-emerald-500 rounded-full animate-ping"></span>}
              </Button>
              
              <Button
                type="button"
                className="md:hidden ml-2 text-emerald-600"
                variant="ghost"
                size="icon"
                onClick={() => setShowConversationList(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="bg-emerald-100 p-3 rounded-full mb-3">
                    <Send className="h-6 w-6 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-1">No messages yet</h3>
                  <p className="text-gray-600 max-w-xs">
                    Send a message to start the conversation
                  </p>
                </div>
              ) : (
                <div className="space-y-4 pb-4">
                  {messages.map((message, index) => {
                    // Determine if message is from current user
                    const own = isOwnMessage(message);
                    
                    // Format the timestamp
                    const messageTime = formatTime(message.createdAt);

                    // Find the last read message using a more sophisticated approach:
                    // 1. It must be a user's own message that has been read
                    // 2. It must be either:
                    //    - The last message in the conversation, or
                    //    - The last read message in a sequence of user's own messages
                    const isLastReadMessage = (() => {
                      // Must be user's own message and read
                      if (!own || !message.read) return false;
                      
                      // Check if this is the last message in the entire conversation
                      if (index === messages.length - 1) return true;
                      
                      // Check the next message
                      const nextMessage = messages[index + 1];
                      
                      // If the next message is from the other user, this is the last read message in the sequence
                      if (!isOwnMessage(nextMessage)) return true;
                      
                      // If the next message is from the user but not read, this is the last read message
                      if (!nextMessage.read) return true;
                      
                      // Otherwise, this is not the last read message
                      return false;
                    })();
                    
                    return (
                      <div key={message._id} className="w-full flex flex-col">
                        {/* Message container with proper alignment */}
                        <div className={`flex w-full ${own ? 'justify-end' : 'justify-start'} mb-1`}>
                          {/* For received messages - show avatar on left */}
                          {!own && (
                            <Avatar className="h-8 w-8 mr-2 self-end flex-shrink-0">
                              <AvatarImage 
                                src={getProfileImageUrl(message.sender.profilePicture)} 
                                alt={message.sender.name} 
                              />
                              <AvatarFallback>{message.sender.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                          )}
                          
                          {/* Message bubble content */}
                          <div 
                            className={`relative px-3 py-2 rounded-lg max-w-[85%] sm:max-w-[70%] ${
                              own 
                                ? 'bg-emerald-600 text-white rounded-tr-none' 
                                : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                            } ${message.deleted ? 'opacity-70' : ''}`}
                          >
                            {/* Message header with sender name and delete option */}
                            <div className="flex justify-between text-xs opacity-75 mb-1">
                              <span>{own ? 'You' : message.sender.name}</span>
                              {own && !message.deleted && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteMessage(message._id);
                                  }}
                                  className="ml-2 opacity-70 hover:opacity-100"
                                  aria-label="Delete message"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                            
                            {/* Message content */}
                            {message.deleted ? (
                              <p className="text-xs italic break-words opacity-75">
                                This message was deleted
                              </p>
                            ) : (
                              <>
                                {message.content && <p className="break-words text-sm">{message.content}</p>}
                                
                                {/* Media attachments */}
                                {message.media && message.media.length > 0 && 
                                  renderMediaAttachments(message.media)
                                }
                              </>
                            )}
                            
                            {/* Message timestamp */}
                            <div className={`text-xs mt-1 ${own ? 'text-emerald-100' : 'text-gray-500'}`}>
                              {messageTime}
                            </div>
                          </div>
                          
                          {/* For sent messages - show avatar on right */}
                          {own && (
                            <Avatar className="h-8 w-8 ml-2 self-end flex-shrink-0">
                              <AvatarImage 
                                src={user?.profilePicture ? getProfileImageUrl(user.profilePicture) : undefined} 
                                alt="You" 
                              />
                              <AvatarFallback>{user?.name?.charAt(0) || 'Y'}</AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                        
                        {/* Read receipt with messenger-style avatar (below message) - only for last read message */}
                        {isLastReadMessage && (
                          <div className="flex justify-end mr-10 mt-0.5">
                            <div className="h-4 w-4 rounded-full overflow-hidden border border-white shadow-sm bg-emerald-100 flex items-center justify-center">
                              {getOtherParticipant(activeConversation!)?.profilePicture ? (
                                <img 
                                  src={getProfileImageUrl(getOtherParticipant(activeConversation!)?.profilePicture)} 
                                  alt="Read"
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    // If image fails to load, show the first letter of name as fallback
                                    e.currentTarget.style.display = 'none';
                                    const parent = e.currentTarget.parentElement;
                                    if (parent) {
                                      parent.textContent = getOtherParticipant(activeConversation!)?.name.charAt(0) || '';
                                    }
                                  }}
                                />
                              ) : (
                                <span className="text-[8px] text-emerald-600 font-bold">
                                  {getOtherParticipant(activeConversation!)?.name.charAt(0) || ''}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {renderTypingIndicators()}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
            
            {/* Message Input */}
            <form 
              className="p-3 bg-white border-t border-gray-200"
              onSubmit={handleSendMessage}
            >
              {/* File previews */}
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 p-2 bg-gray-50 rounded-lg">
                  {previewUrls.map((url, i) => (
                    <div key={i} className="relative">
                      <img 
                        src={url} 
                        alt={`Preview ${i}`} 
                        className="h-16 w-16 object-cover rounded"
                      />
                      <button
                        type="button"
                        className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center"
                        onClick={() => removeFile(i)}
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex items-center">
                <div className="flex space-x-1 mr-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept="image/*,video/*"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="ghost" 
                    className="text-emerald-500 p-2"
                    onClick={openFileSelector}
                    disabled={selectedFiles.length >= 3}
                  >
                    <Paperclip className="h-5 w-5" />
                  </Button>
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="ghost" 
                    className="text-emerald-500 p-2"
                    onClick={openFileSelector}
                    disabled={selectedFiles.length >= 3}
                  >
                    <Image className="h-5 w-5" />
                  </Button>
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="ghost" 
                    className="text-emerald-500 p-2"
                  >
                    <Smile className="h-5 w-5" />
                  </Button>
                </div>
                <Input
                  type="text"
                  value={messageInput}
                  onChange={handleInputChange}
                  placeholder={selectedFiles.length > 0 ? "Add message..." : "Type a message..."}
                  className="flex-1 focus-visible:ring-emerald-500"
                  disabled={sendingMessage}
                />
                <Button 
                  type="submit" 
                  className="ml-2 bg-emerald-600 hover:bg-emerald-700"
                  disabled={(messageInput.trim() === '' && selectedFiles.length === 0) || sendingMessage}
                >
                  {sendingMessage ? (
                    <div className="h-5 w-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full bg-gray-50">
            <div className="text-center max-w-md p-8">
              <div className="p-4 rounded-full bg-emerald-100 inline-flex mb-4">
                <Send className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Your Messages</h2>
              <p className="text-gray-600 mb-6">
                Select a conversation from the list or start a new one.
              </p>
              <div className="flex flex-col space-y-3">
                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    // Example of showing friends
                    toast.info('Friend selection feature coming soon');
                    
                    // You could open a modal to select a friend here
                    // or navigate to a friends list page
                  }}
                >
                  <Users className="h-5 w-5 mr-2" />
                  Start New Conversation with Friend
                </Button>
                <Button
                  variant="outline"
                  className="w-full" 
                  onClick={() => {
                    // Refresh conversations list
                    fetchConversations();
                    toast.info('Refreshing conversations list');
                  }}
                >
                  Refresh Conversations
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationPanel; 