import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, AuthStore } from '../types'

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      isFirstRun: true,
      setSession: (session: string, user: User) => set({ session, user }),
      clearSession: () => set({ session: null, user: null }),
      setFirstRun: (v: boolean) => set({ isFirstRun: v })
    }),
    {
      name: 'od-ims-auth',
      partialize: (state) => ({ session: state.session, user: state.user })
    }
  )
)
