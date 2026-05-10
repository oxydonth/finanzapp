import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Theme = 'light' | 'dark' | 'girly';
interface ThemeState { theme: Theme; setTheme: (t: Theme) => void; }

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({ theme: 'light', setTheme: (theme) => set({ theme }) }),
    { name: 'finanzapp-theme', storage: createJSONStorage(() => AsyncStorage) }
  )
);
