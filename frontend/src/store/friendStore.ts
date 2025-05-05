import { create } from 'zustand'
import { friendApi, FriendOperationsStatus } from '@/api/friendApi'
import { toast } from 'sonner'

interface FriendState {
  operationsStatus: FriendOperationsStatus | null
  isLoading: boolean
  error: string | null
  setOperationsStatus: (status: FriendOperationsStatus | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  fetchOperationsStatus: () => Promise<void>
  sendFriendRequest: (userId: string) => Promise<void>
  acceptFriendRequest: (userId: string) => Promise<void>
  rejectFriendRequest: (userId: string) => Promise<void>
  removeFriend: (userId: string) => Promise<void>
}

export const useFriendStore = create<FriendState>((set, get) => ({
  operationsStatus: null,
  isLoading: false,
  error: null,

  setOperationsStatus: (status) => set({ operationsStatus: status }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  fetchOperationsStatus: async () => {
    try {
      set({ isLoading: true, error: null })
      const response = await friendApi.getFriendOperationsStatus()
      if (response.success && response.data) {
        set({ operationsStatus: response.data })
      }
    } catch (error) {
      set({ error: 'Failed to fetch friend operations status' })
      toast.error('Failed to fetch friend operations status')
    } finally {
      set({ isLoading: false })
    }
  },

  sendFriendRequest: async (userId: string) => {
    try {
      set({ isLoading: true, error: null })
      const response = await friendApi.sendFriendRequest(userId)
      if (response.success) {
        await get().fetchOperationsStatus()
        if (response.message === 'Friend request already sent') {
          toast.info('Friend request already sent')
        } else {
          toast.success('Friend request sent')
        }
      }
    } catch (error) {
      set({ error: 'Failed to send friend request' })
      toast.error('Failed to send friend request')
    } finally {
      set({ isLoading: false })
    }
  },

  acceptFriendRequest: async (userId: string) => {
    try {
      set({ isLoading: true, error: null })
      const response = await friendApi.acceptFriendRequest(userId)
      if (response.success) {
        await get().fetchOperationsStatus()
        toast.success('Friend request accepted')
      }
    } catch (error) {
      set({ error: 'Failed to accept friend request' })
      toast.error('Failed to accept friend request')
    } finally {
      set({ isLoading: false })
    }
  },

  rejectFriendRequest: async (userId: string) => {
    try {
      set({ isLoading: true, error: null })
      const response = await friendApi.rejectFriendRequest(userId)
      if (response.success) {
        await get().fetchOperationsStatus()
        toast.success('Friend request cancelled')
      }
    } catch (error) {
      set({ error: 'Failed to cancel friend request' })
      toast.error('Failed to cancel friend request')
    } finally {
      set({ isLoading: false })
    }
  },

  removeFriend: async (userId: string) => {
    try {
      set({ isLoading: true, error: null })
      const response = await friendApi.removeFriend(userId)
      if (response.success) {
        await get().fetchOperationsStatus()
        toast.success('Unfriended successfully')
      }
    } catch (error) {
      set({ error: 'Failed to remove friend' })
      toast.error('Failed to remove friend')
    } finally {
      set({ isLoading: false })
    }
  }
})) 