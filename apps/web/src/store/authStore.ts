import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@finanzapp/types';

const ACCESS_KEY = 'fa-at';
const REFRESH_KEY = 'fa-rt';

function ss(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(key);
}

interface AuthState {
  user: User | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setAuth: (user, accessToken, refreshToken) => {
        sessionStorage.setItem(ACCESS_KEY, accessToken);
        sessionStorage.setItem(REFRESH_KEY, refreshToken);
        set({ user });
      },
      clearAuth: () => {
        sessionStorage.removeItem(ACCESS_KEY);
        sessionStorage.removeItem(REFRESH_KEY);
        set({ user: null });
      },
    }),
    // Only persist user display info — tokens live in sessionStorage (cleared on tab close, not disk-persistent)
    { name: 'finanzapp-auth', partialize: (s) => ({ user: s.user }) },
  ),
);

export const getAccessToken = () => ss(ACCESS_KEY);
export const getRefreshToken = () => ss(REFRESH_KEY);
export const storeTokens = (at: string, rt: string) => {
  sessionStorage.setItem(ACCESS_KEY, at);
  sessionStorage.setItem(REFRESH_KEY, rt);
};
