import { create } from 'zustand'
import { UserProfile } from '@/api/authApi'
import { normalizeProfilePicture } from '@/utils/profileUtils'

interface UserState {
  user: UserProfile | null
  setUser: (user: UserProfile | null) => void
  getProfilePicture: () => string
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  setUser: (user) => set({ user }),
  getProfilePicture: () => {
    const { user } = get();
    if (!user) return '';
    return normalizeProfilePicture(user.profilePicture, user.username);
  }
})) 