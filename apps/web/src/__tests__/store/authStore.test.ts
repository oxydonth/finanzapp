import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock sessionStorage
const store: Record<string, string> = {};
const sessionStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => Object.keys(store).forEach(k => delete store[k]),
};

Object.defineProperty(global, 'sessionStorage', { value: sessionStorageMock, writable: true });

// Must import after sessionStorage mock is set up
const { useAuthStore, getAccessToken, getRefreshToken, storeTokens } = await import('@/store/authStore');

const mockUser = {
  id: '1',
  email: 'test@test.com',
  firstName: 'Test',
  lastName: 'User',
  currency: 'EUR',
  locale: 'de-DE',
  isEmailVerified: true,
  mfaEnabled: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('authStore', () => {
  beforeEach(() => {
    sessionStorageMock.clear();
    useAuthStore.getState().clearAuth();
  });

  it('initial state has no user', () => {
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('setAuth stores user and tokens', () => {
    useAuthStore.getState().setAuth(mockUser as never, 'access-token', 'refresh-token');
    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(getAccessToken()).toBe('access-token');
    expect(getRefreshToken()).toBe('refresh-token');
  });

  it('clearAuth removes user and tokens', () => {
    useAuthStore.getState().setAuth(mockUser as never, 'access-token', 'refresh-token');
    useAuthStore.getState().clearAuth();
    expect(useAuthStore.getState().user).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it('storeTokens updates sessionStorage', () => {
    storeTokens('new-access', 'new-refresh');
    expect(getAccessToken()).toBe('new-access');
    expect(getRefreshToken()).toBe('new-refresh');
  });

  it('getAccessToken returns null when not set', () => {
    expect(getAccessToken()).toBeNull();
  });
});
