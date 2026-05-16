import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore } from '@/store/themeStore';
import type { Theme } from '@/store/themeStore';

describe('themeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({ theme: 'light' });
  });

  it('defaults to light theme', () => {
    expect(useThemeStore.getState().theme).toBe('light');
  });

  it('setTheme updates to dark', () => {
    useThemeStore.getState().setTheme('dark');
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('setTheme updates to girly', () => {
    useThemeStore.getState().setTheme('girly');
    expect(useThemeStore.getState().theme).toBe('girly');
  });

  it('setTheme updates back to light', () => {
    useThemeStore.getState().setTheme('dark');
    useThemeStore.getState().setTheme('light');
    expect(useThemeStore.getState().theme).toBe('light');
  });

  it('accepts all valid theme values', () => {
    const themes: Theme[] = ['light', 'dark', 'girly'];
    for (const theme of themes) {
      useThemeStore.getState().setTheme(theme);
      expect(useThemeStore.getState().theme).toBe(theme);
    }
  });
});
