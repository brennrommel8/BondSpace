import { create } from 'zustand';
import { chatApi } from '../api/chatApi';

interface MessageStore {
  unreadCount: number;
  unreadConversations: Set<string>;
  unreadMessages: Set<string>;
  conversationUnreadCounts: Record<string, number>;
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
  decrementUnreadCount: () => void;
  resetUnreadCount: () => void;
  addUnreadConversation: (conversationId: string) => void;
  removeUnreadConversation: (conversationId: string) => void;
  clearUnreadConversations: () => void;
  addUnreadMessage: (messageId: string, conversationId: string) => void;
  removeUnreadMessage: (messageId: string, conversationId: string) => void;
  clearUnreadMessages: () => void;
  fetchUnreadCount: () => Promise<void>;
  updateConversationUnreadCount: (conversationId: string, count: number) => void;
}

export const useMessageStore = create<MessageStore>((set) => ({
  unreadCount: 0,
  unreadConversations: new Set<string>(),
  unreadMessages: new Set<string>(),
  conversationUnreadCounts: {},

  setUnreadCount: (count) => set({ unreadCount: count }),

  incrementUnreadCount: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),

  decrementUnreadCount: () => set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),

  resetUnreadCount: () => set({ unreadCount: 0 }),

  addUnreadConversation: (conversationId) => set((state) => {
    const newUnreadConversations = new Set(state.unreadConversations);
    newUnreadConversations.add(conversationId);
    return { unreadConversations: newUnreadConversations };
  }),

  removeUnreadConversation: (conversationId) => set((state) => {
    const newUnreadConversations = new Set(state.unreadConversations);
    newUnreadConversations.delete(conversationId);
    return { unreadConversations: newUnreadConversations };
  }),

  clearUnreadConversations: () => set({ unreadConversations: new Set() }),

  addUnreadMessage: (messageId, conversationId) => set((state) => {
    const newUnreadMessages = new Set(state.unreadMessages);
    newUnreadMessages.add(messageId);
    
    const newConversationUnreadCounts = { ...state.conversationUnreadCounts };
    newConversationUnreadCounts[conversationId] = (newConversationUnreadCounts[conversationId] || 0) + 1;
    
    return { 
      unreadMessages: newUnreadMessages,
      conversationUnreadCounts: newConversationUnreadCounts,
      unreadCount: state.unreadCount + 1
    };
  }),

  removeUnreadMessage: (messageId, conversationId) => set((state) => {
    const newUnreadMessages = new Set(state.unreadMessages);
    newUnreadMessages.delete(messageId);
    
    const newConversationUnreadCounts = { ...state.conversationUnreadCounts };
    if (newConversationUnreadCounts[conversationId]) {
      newConversationUnreadCounts[conversationId] = Math.max(0, newConversationUnreadCounts[conversationId] - 1);
      if (newConversationUnreadCounts[conversationId] === 0) {
        delete newConversationUnreadCounts[conversationId];
      }
    }
    
    return { 
      unreadMessages: newUnreadMessages,
      conversationUnreadCounts: newConversationUnreadCounts,
      unreadCount: Math.max(0, state.unreadCount - 1)
    };
  }),

  clearUnreadMessages: () => set({ 
    unreadMessages: new Set(),
    conversationUnreadCounts: {},
    unreadCount: 0
  }),

  updateConversationUnreadCount: (conversationId: string, count: number) => set((state) => {
    const newConversationUnreadCounts = { ...state.conversationUnreadCounts };
    if (count > 0) {
      newConversationUnreadCounts[conversationId] = count;
    } else {
      delete newConversationUnreadCounts[conversationId];
    }
    return { conversationUnreadCounts: newConversationUnreadCounts };
  }),

  fetchUnreadCount: async () => {
    try {
      const response = await chatApi.getConversations();
      if (response.success && response.conversations) {
        let totalUnread = 0;
        const conversationUnreadCounts: Record<string, number> = {};
        const unreadConversations = new Set<string>();

        response.conversations.forEach((conversation: any) => {
          if (conversation.unreadCount > 0) {
            totalUnread += conversation.unreadCount;
            conversationUnreadCounts[conversation._id] = conversation.unreadCount;
            unreadConversations.add(conversation._id);
          }
        });

        set({ 
          unreadCount: totalUnread,
          conversationUnreadCounts,
          unreadConversations
        });
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }
})); 