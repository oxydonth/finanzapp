import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User } from '@finanzapp/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setAuth: (user: User, token: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  loadAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  setAuth: async (user, token) => {
    await SecureStore.setItemAsync('accessToken', token);
    await SecureStore.setItemAsync('user', JSON.stringify(user));
    set({ user });
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('user');
    set({ user: null });
  },

  loadAuth: async () => {
    try {
      const userJson = await SecureStore.getItemAsync('user');
      set({ user: userJson ? JSON.parse(userJson) : null, isLoading: false });
    } catch {
      set({ user: null, isLoading: false });
    }
  },
}));
