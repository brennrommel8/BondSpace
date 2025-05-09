import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { format } from 'date-fns';
import { Send, Paperclip, X, Users, ChevronLeft, Trash2, MessageSquare, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
  sendMessageDeletionNotification
} from '@/utils/socketUtils';
import useSocket from '@/hooks/useSocket';
import { getProfileImageUrl, preloadProfilePictures } from '@/utils/profileImageUtils';
import { useMessageStore } from '@/store/messageStore';

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
  profilePicture?: string | { url: string; publicId: string };
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

interface MessageReadData {
  conversationId: string;
  messageIds: string[];
}

interface MessageDeletedData {
  conversationId: string;
  messageId: string;
}

const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-2 w-16">
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
    </div>
  );
};

const ConversationPanel: React.FC<ConversationPanelProps> = ({ conversationId, userId }) => {
  const { user } = useUserStore();
  const { isConnected, onlineUsers, forceReconnect, initializeSocketConnection } = useSocket();
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversation, setActiveConversation] = useState<ConversationData | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const [showConversationList, setShowConversationList] = useState(true);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const { 
    resetUnreadCount, 
    removeUnreadConversation, 
    updateConversationUnreadCount,
  } = useMessageStore();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Preload profile pictures for all participants
  useEffect(() => {
    conversations.forEach(conversation => {
      conversation.participants.forEach(participant => {
        if (participant.profilePicture) {
          getProfileImageUrl(participant.profilePicture);
        }
      });
    });
  }, [conversations]);

  // Preload profile pictures for messages
  useEffect(() => {
    messages.forEach(message => {
      if (message.sender.profilePicture) {
        getProfileImageUrl(message.sender.profilePicture);
      }
    });
  }, [messages]);

  // Join/leave conversation room using sockets
  useEffect(() => {
    if (activeConversation) {
      console.log('Joining conversation room:', activeConversation._id);
      
      // If socket is not connected, try to reconnect
      if (!isConnected) {
        console.log('Socket not connected, attempting to reconnect...');
        forceReconnect().then(success => {
          if (success) {
            console.log('Socket reconnected successfully');
            // Join the conversation after successful reconnection
            joinConversation(activeConversation._id);
            // Fetch messages to ensure we're up to date
            fetchMessages(activeConversation._id);
          } else {
            console.error('Failed to reconnect socket');
            toast.error('Failed to connect to chat service. Please try again.');
          }
        });
      } else {
        // If already connected, just join the conversation
        joinConversation(activeConversation._id);
      }
      
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
          // Update that conversation's unread count
          const conversation = conversations.find(c => c._id === messageConversationId);
          if (conversation) {
            const newUnreadCount = (conversation.unreadCount || 0) + 1;
            setConversations(prev => prev.map(c => 
              c._id === messageConversationId 
                ? { ...c, unreadCount: newUnreadCount }
                : c
            ));
            updateConversationUnreadCount(messageConversationId, newUnreadCount);
          }
          // Show notification
          toast.info('New message in another conversation');
          // Refresh conversations list
          fetchConversations();
        } else {
          console.log('Could not determine conversation for message:', data);
        }
      });
      
      // Setup listener for message read updates
      const readReceiptCleanup = onMessageRead((data: MessageReadData) => {
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
      const messageDeletionCleanup = onMessageDeleted((data: MessageDeletedData) => {
        console.log('Message deletion event received:', data);
        
        if (data.conversationId === activeConversation._id) {
          console.log('Updating UI for deleted message:', data.messageId);
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
        newMessageCleanup();
        readReceiptCleanup();
        messageDeletionCleanup();
        if (activeConversation) {
          leaveConversation(activeConversation._id);
        }
      };
    }
  }, [activeConversation, isConnected, conversations, updateConversationUnreadCount]);

  // Preload all images immediately
  const preloadAllImages = (conversations: ConversationData[], messages: Message[]) => {
    // Create arrays for profile pictures and usernames
    const conversationProfilePictures: unknown[] = [];
    const conversationUsernames: string[] = [];
    const messageProfilePictures: unknown[] = [];
    const messageUsernames: string[] = [];

    // Add profile pictures from conversations
    conversations.forEach(conversation => {
      conversation.participants.forEach(participant => {
        if (participant.profilePicture) {
          conversationProfilePictures.push(participant.profilePicture);
          conversationUsernames.push(participant.username);
        }
      });
    });

    // Add profile pictures from messages
    messages.forEach(message => {
      if (message.sender.profilePicture) {
        messageProfilePictures.push(message.sender.profilePicture);
        messageUsernames.push(message.sender.username);
      }
      // Add message media images
      if (message.media) {
        message.media.forEach(media => {
          if (media.mediaType === 'image') {
            conversationProfilePictures.push(media.url);
          }
          if (media.thumbnail) {
            conversationProfilePictures.push(media.thumbnail);
          }
        });
      }
    });

    // Preload all profile pictures efficiently
    preloadProfilePictures(conversationProfilePictures, conversationUsernames);
    preloadProfilePictures(messageProfilePictures, messageUsernames);
  };

  // Preload images whenever conversations or messages change
  useEffect(() => {
    preloadAllImages(conversations, messages);
  }, [conversations, messages]);

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
      senderObj = {
        _id: apiMsg.sender._id,
        name: apiMsg.sender.name,
        username: apiMsg.sender.username,
        profilePicture: apiMsg.sender.profilePicture
      };
    }
    
    // Determine if message has been read by checking readBy array
    const isRead = Array.isArray(apiMsg.readBy) && 
                  apiMsg.readBy.some(readerId => readerId !== userId);
    
    return {
      _id: apiMsg._id,
      content: apiMsg.content,
      media: apiMsg.media,
      sender: senderObj,
      createdAt: apiMsg.createdAt,
      read: isRead,
      deleted: apiMsg.content === undefined && (!apiMsg.media || apiMsg.media.length === 0)
    };
  };

  // Transform API conversation to local format
  const transformConversation = (apiConv: Conversation): ConversationData => {
    return {
      _id: apiConv._id,
      participants: apiConv.participants.map(p => ({
        _id: p._id,
        name: p.name,
        username: p.username,
        profilePicture: p.profilePicture
      })),
      lastMessage: apiConv.lastMessage ? transformMessage(apiConv.lastMessage) : undefined,
      unreadCount: apiConv.unreadCount || 0,
      updatedAt: apiConv.updatedAt
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
    const files = Array.from(e.target.files || []);
    
    // Check if any file is too large (50MB limit)
    const hasLargeFile = files.some(file => file.size > 50 * 1024 * 1024);
    if (hasLargeFile) {
      toast.error('Files must be smaller than 50MB');
      return;
    }
    
    // Check if any file is not an image or video
    const hasInvalidFile = files.some(file => 
      !file.type.startsWith('image/') && !file.type.startsWith('video/')
    );
    if (hasInvalidFile) {
      toast.error('Only image and video files are allowed');
      return;
    }
    
    // Create preview URLs for images only
    const newPreviewUrls = files.map(file => {
      if (file.type.startsWith('image/')) {
        return URL.createObjectURL(file);
      }
      return null;
    }).filter((url): url is string => url !== null);
    
    // Update state
    setSelectedFiles(prev => {
      // Limit total to 3 files
      const combined = [...prev, ...files].slice(0, 3);
      return combined;
    });
    
    setPreviewUrls(prev => {
      // Limit total to 3 previews
      const combined = [...prev, ...newPreviewUrls].slice(0, 3);
      return combined;
    });
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

  // Cleanup preview URLs on unmount or when files change
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

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
        // Initialize socket connection when opening a conversation
        initializeSocketConnection();
        fetchMessages(selected._id);
      } else {
        console.log('Conversation not found in list');
      }
    } else if (conversations.length > 0 && !activeConversation) {
      console.log('Setting first conversation as active');
      setActiveConversation(conversations[0]);
      // Initialize socket connection when opening a conversation
      initializeSocketConnection();
      fetchMessages(conversations[0]._id);
    } else {
      console.log('No conversations available or already have active conversation');
    }
  }, [conversationId, conversations]);

  // Scroll to bottom of message list when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      console.log('Fetching conversations...');
      const response = await chatApi.getConversations();
      console.log('API response for conversations:', response);
      
      if (response.success && response.conversations) {
        // Transform API conversations to local format
        const transformedConvs = response.conversations.map(transformConversation);
        console.log('Transformed conversations:', transformedConvs);
        setConversations(transformedConvs);
        // Preload images immediately after setting conversations
        preloadAllImages(transformedConvs, messages);
      } else {
        console.warn('No conversations returned from API:', response);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const response = await chatApi.getMessages(convId);
      if (response.success && response.messages) {
        // Transform API messages to local format
        const transformedMsgs = response.messages.map(transformMessage);
        
        // Preload all profile pictures before setting messages
        const profilePictures = transformedMsgs.map(msg => msg.sender.profilePicture);
        const usernames = transformedMsgs.map(msg => msg.sender.username);
        preloadProfilePictures(profilePictures, usernames);
        
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
    // Get the sender ID from the message
    const senderId = typeof message.sender === 'string' ? message.sender : message.sender._id;
    
    // Get the current user's ID from props or store
    const currentUserId = userId || user?._id || user?.id;
    
    // Compare the IDs
    return senderId === currentUserId;
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
    // Initialize socket connection when opening a conversation
    initializeSocketConnection();
    fetchMessages(conversation._id);
    
    // Mark conversation as read when selected
    if (conversation.unreadCount > 0) {
      markConversationAsRead(conversation._id);
      // Clear any existing notifications for this conversation
      toast.dismiss();
      // Reset the global unread count
      resetUnreadCount();
      // Remove from unread conversations
      removeUnreadConversation(conversation._id);
      // Update the conversation's unread count
      updateConversationUnreadCount(conversation._id, 0);
    }
    
    // Hide conversation list on mobile when a conversation is selected
    if (window.innerWidth < 768) {
      setShowConversationList(false);
    }
  };

  // Add ImageModal component
  const ImageModal: React.FC<{ imageUrl: string | null; onClose: () => void }> = ({ imageUrl, onClose }) => {
    if (!imageUrl) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
          <img 
            src={imageUrl} 
            alt="Full size" 
            className="max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button 
            className="absolute top-4 right-4 bg-white rounded-full p-2 hover:bg-gray-100"
            onClick={onClose}
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>
      </div>
    );
  };

  // Update renderMediaAttachments to handle videos better
  const renderMediaAttachments = (media: Media[]) => {
    return (
      <div className={`flex flex-wrap gap-2 mt-2 max-w-full`}>
        {media.map((item, index) => (
          <div key={index} className="relative">
            {item.mediaType === 'image' ? (
              <img 
                src={item.url} 
                alt="Attachment" 
                className="rounded-lg max-h-32 sm:max-h-48 max-w-full object-cover border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setSelectedImage(item.url)}
              />
            ) : (
              <div className="relative rounded-lg overflow-hidden border border-gray-200">
                <video 
                  src={item.url}
                  className="max-h-32 sm:max-h-48 max-w-full object-cover"
                  controls
                  preload="metadata"
                  playsInline
                >
                  <source src={item.url} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                {item.thumbnail && (
                  <img 
                    src={item.thumbnail} 
                    alt="Video thumbnail" 
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
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
      const isUnread = !isActive && conversation.unreadCount > 0;
      const unreadCount = conversation.unreadCount || 0;

      // Format the last message preview
      const getLastMessagePreview = () => {
        if (!conversation.lastMessage) {
          return 'No messages yet';
        }

        if (conversation.lastMessage.deleted) {
          return 'This message was deleted';
        }

        if (conversation.lastMessage.media && conversation.lastMessage.media.length > 0) {
          const mediaCount = conversation.lastMessage.media.length;
          const mediaType = conversation.lastMessage.media[0].mediaType;
          return `${mediaCount} ${mediaType}${mediaCount > 1 ? 's' : ''}`;
        }

        if (conversation.lastMessage.content) {
          // Truncate long messages
          return conversation.lastMessage.content.length > 30
            ? conversation.lastMessage.content.substring(0, 30) + '...'
            : conversation.lastMessage.content;
        }

        return 'No messages yet';
      };

      // Format the last message time
      const getLastMessageTime = () => {
        if (!conversation.lastMessage) {
          return '';
        }

        const messageDate = new Date(conversation.lastMessage.createdAt);
        const now = new Date();
        const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 24) {
          return formatTime(conversation.lastMessage.createdAt);
        } else if (diffInHours < 48) {
          return 'Yesterday';
        } else {
          return format(messageDate, 'MMM d');
        }
      };

      // Get the sender prefix for the last message
      const getLastMessagePrefix = () => {
        if (!conversation.lastMessage) return '';
        
        const isOwnMessage = conversation.lastMessage.sender._id === userId;
        return isOwnMessage ? 'You: ' : '';
      };

      return (
        <div 
          key={conversation._id}
          className={`flex items-center p-3 cursor-pointer border-b border-gray-100 hover:bg-gray-50 ${
            isActive ? 'bg-emerald-50' : ''
          } ${isUnread ? 'bg-blue-50' : ''}`}
          onClick={() => selectConversation(conversation)}
        >
          <div className="relative">
            <Avatar className="h-12 w-12 mr-3">
              <AvatarImage 
                src={getProfileImageUrl(otherUser.profilePicture, otherUser.username)} 
                username={otherUser.username}
                alt={otherUser.name} 
              />
              <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
            </Avatar>
            {isUnread && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            {isOnline && (
              <span className="absolute bottom-0 right-1 bg-emerald-500 w-3 h-3 rounded-full border-2 border-white"></span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
              <p className={`font-medium truncate ${isUnread ? 'text-blue-600' : 'text-gray-900'}`}>
                {otherUser.name}
              </p>
              <p className={`text-xs ${isUnread ? 'text-blue-500' : 'text-gray-500'} ml-2 whitespace-nowrap`}>
                {getLastMessageTime()}
              </p>
            </div>
            <div className="flex items-center">
              <p className={`text-sm truncate ${isUnread ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                <span className="text-gray-500">{getLastMessagePrefix()}</span>
                {getLastMessagePreview()}
              </p>
              {isUnread && (
                <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full"></span>
              )}
            </div>
          </div>
        </div>
      );
    });
  };

  // Update handleInputChange
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessageInput(value);
    
    // Send typing status
    if (activeConversation && isConnected) {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Send typing status
      sendTypingIndicator(activeConversation._id, true);
      
      // Set timeout to stop typing status
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(activeConversation._id, false);
      }, 2000);
    }
  };

  // Update typing indicator listener
  useEffect(() => {
    if (!activeConversation || !isConnected) return;

    const handleTypingIndicator = (data: { userId: string; isTyping: boolean }) => {
      if (data.userId !== userId) {
        setOtherUserTyping(data.isTyping);
      }
    };

    onTypingIndicator(handleTypingIndicator);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [activeConversation, isConnected, userId]);

  // Clean up typing indicator timeout on unmount or conversation change
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [activeConversation]);

  // Delete a message
  const handleDeleteMessage = async (messageId: string) => {
    try {
      console.log('Deleting message:', messageId);
      const response = await chatApi.deleteMessage(messageId);
      
      if (response.success) {
        // Mark the message as deleted in the UI immediately
        setMessages(prevMessages => prevMessages.map(msg => 
          msg._id === messageId 
            ? { ...msg, deleted: true, content: undefined, media: [] } 
            : msg
        ));
        
        // Send socket notification about deleted message
        if (activeConversation) {
          console.log('Sending deletion notification for message:', messageId);
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

  // Update the markConversationAsRead function to handle unread counts
  const markConversationAsRead = async (conversationId: string) => {
    try {
      await chatApi.markConversationAsRead(conversationId);
      setConversations(prev => 
        prev.map(conv => 
          conv._id === conversationId 
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
      resetUnreadCount();
      removeUnreadConversation(conversationId);
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-gray-50 overflow-hidden">
      {/* Add ImageModal */}
      <ImageModal 
        imageUrl={selectedImage} 
        onClose={() => setSelectedImage(null)} 
      />
      
      {/* Conversation List Panel */}
      <div 
        className={`${
          showConversationList ? 'flex' : 'hidden'
        } md:flex flex-col w-full md:w-1/3 lg:w-1/4 border-r border-gray-200 bg-white`}
      >
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-emerald-50">
          <h2 className="text-lg font-semibold text-emerald-800">Messages</h2>
        </div>

        {/* Search and filter options could go here */}
        {conversations.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <div>
              <div className="mx-auto bg-emerald-100 p-3 rounded-full mb-3 inline-block">
                <MessageSquare className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="text-gray-600">No conversations yet</p>
              <Button 
                variant="outline" 
                className="mt-3 border-emerald-500 text-emerald-500 hover:bg-emerald-50"
                onClick={() => navigate('/friends')}
              >
                <Users className="mr-2 h-4 w-4" />
                Find Friends
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {renderConversations()}
          </div>
        )}
      </div>

      {/* Message Panel */}
      <div className={`${
        !showConversationList ? 'flex' : 'hidden'
      } md:flex flex-col w-full md:w-2/3 lg:w-3/4 bg-white`}>
        {activeConversation ? (
          <>
            {/* Conversation Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-emerald-50">
              <div className="flex items-center">
                {/* Back button on mobile */}
                {!showConversationList && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mr-2 md:hidden h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-100 rounded-full"
                    onClick={() => setShowConversationList(true)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                )}
                
                {/* User info */}
                <div 
                  className="flex items-center cursor-pointer"
                  onClick={() => {
                    const otherUser = getOtherParticipant(activeConversation);
                    // Only navigate if there are no unread messages
                    if (activeConversation.unreadCount === 0) {
                      navigate(`/profile/${otherUser._id}`);
                    }
                  }}
                >
                  <Avatar className="h-9 w-9 mr-2">
                    <AvatarImage 
                      src={getProfileImageUrl(getOtherParticipant(activeConversation).profilePicture)} 
                      alt={getOtherParticipant(activeConversation).name} 
                    />
                    <AvatarFallback>
                      {getOtherParticipant(activeConversation).name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-sm flex items-center">
                      {getOtherParticipant(activeConversation).name}
                      {isUserOnline(getOtherParticipant(activeConversation)._id) && (
                        <span className="ml-2 h-2 w-2 rounded-full bg-emerald-500"></span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {isUserOnline(getOtherParticipant(activeConversation)._id) 
                        ? 'Online' 
                        : 'Offline'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto bg-white">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <div className="mx-auto bg-emerald-100 p-3 rounded-full mb-3 inline-block">
                      <MessageSquare className="h-6 w-6 text-emerald-500" />
                    </div>
                    <p className="text-gray-600">No messages yet</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Send a message to start the conversation
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => {
                    const isOwn = isOwnMessage(message);
                    const showDate = index === 0 || 
                      new Date(message.createdAt).toDateString() !== 
                      new Date(messages[index - 1].createdAt).toDateString();
                    const isUnread = !isOwn && !message.read;
                    
                    return (
                      <React.Fragment key={message._id}>
                        {showDate && (
                          <div className="text-center my-4">
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                              {format(new Date(message.createdAt), 'MMMM d, yyyy')}
                            </span>
                          </div>
                        )}
                        
                        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-start gap-2`}>
                          {!isOwn && (
                            <Avatar className="h-8 w-8">
                              <AvatarImage 
                                src={getProfileImageUrl(message.sender.profilePicture)} 
                                alt={message.sender.name} 
                              />
                              <AvatarFallback>{message.sender.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                          )}
                          
                          {/* Three dots menu for own messages */}
                          {isOwn && !message.deleted && (
                            <div className="relative">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Toggle dropdown menu
                                  const menu = e.currentTarget.nextElementSibling;
                                  if (menu) {
                                    menu.classList.toggle('hidden');
                                  }
                                }}
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                              
                              {/* Dropdown menu */}
                              <div className="absolute right-0 top-full mt-1 hidden bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10">
                                <button
                                  className="w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteMessage(message._id);
                                    // Hide the menu after clicking
                                    const menu = e.currentTarget.parentElement;
                                    if (menu) {
                                      menu.classList.add('hidden');
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                          
                          <div 
                            className={`relative ${
                              isOwn 
                                ? 'bg-emerald-600 text-white rounded-tl-lg rounded-tr-2xl rounded-bl-lg' 
                                : isUnread
                                  ? 'bg-blue-100 text-blue-900 rounded-tr-lg rounded-tl-2xl rounded-br-lg'
                                  : 'bg-gray-100 text-gray-800 rounded-tr-lg rounded-tl-2xl rounded-br-lg'
                            } p-3 ${message.deleted ? 'italic opacity-60' : ''}`}
                          >
                            {message.deleted ? (
                              <p className="text-sm">This message was deleted</p>
                            ) : (
                              <>
                                {message.content && <p className="text-sm">{message.content}</p>}
                                
                                {message.media && message.media.length > 0 && (
                                  <div className="mt-2">
                                    {renderMediaAttachments(message.media)}
                                  </div>
                                )}
                                
                                <div className={`text-xs mt-1 ${isOwn ? 'text-emerald-100' : isUnread ? 'text-blue-600' : 'text-gray-500'}`}>
                                  {formatTime(message.createdAt)}
                                  {isUnread && (
                                    <span className="ml-1">• New</span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                  
                  {/* Add typing indicator */}
                  {otherUserTyping && (
                    <div className="flex items-start gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage 
                          src={getProfileImageUrl(getOtherParticipant(activeConversation!).profilePicture)} 
                          alt={getOtherParticipant(activeConversation!).name} 
                        />
                        <AvatarFallback>
                          {getOtherParticipant(activeConversation!).name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-gray-100 rounded-lg p-3">
                        <TypingIndicator />
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input Area */}
            <div className="p-3 border-t border-gray-200 bg-white">
              {/* Preview selected files */}
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative h-16 w-16 rounded overflow-hidden">
                      {file.type.startsWith('image/') ? (
                        <img 
                          src={previewUrls[index]} 
                          alt={`Upload preview ${index + 1}`} 
                          className="h-16 w-16 object-cover"
                        />
                      ) : file.type.startsWith('video/') ? (
                        <div className="h-16 w-16 bg-gray-100 flex items-center justify-center">
                          <video 
                            src={URL.createObjectURL(file)}
                            className="h-16 w-16 object-cover"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-white bg-opacity-50 flex items-center justify-center">
                              <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      ) : null}
                      <button 
                        className="absolute top-0 right-0 bg-black bg-opacity-50 rounded-full h-5 w-5 flex items-center justify-center text-white"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 text-emerald-600 hover:bg-emerald-50 rounded-full"
                  onClick={openFileSelector}
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                />
                
                <Input
                  type="text"
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={handleInputChange}
                  className="flex-1"
                />
                
                <Button
                  type="submit"
                  size="sm"
                  disabled={sendingMessage && messageInput.trim() === '' && selectedFiles.length === 0}
                  className={`h-9 w-9 p-0 rounded-full ${
                    sendingMessage 
                      ? 'bg-gray-300 cursor-not-allowed' 
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {sendingMessage ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </> 
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-6">
              <div className="mx-auto bg-emerald-100 p-4 rounded-full mb-4 inline-block">
                <MessageSquare className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Your Messagess</h3>
              <p className="text-gray-600 max-w-md mb-4">
                Select a conversation from the sidebar or start a new one with your friends.
              </p>
              <Button
                onClick={() => navigate('/friends')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Users className="mr-2 h-4 w-4" />
                Find Friends
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationPanel; 