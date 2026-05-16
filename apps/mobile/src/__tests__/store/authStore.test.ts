import { useAuthStore } from '../../store/authStore';

jest.mock('expo-secure-store', () => {
  const store: Record<string, string> = {};
  return {
    setItemAsync: jest.fn(async (key: string, value: string) => { store[key] = value; }),
    getItemAsync: jest.fn(async (key: string) => store[key] ?? null),
    deleteItemAsync: jest.fn(async (key: string) => { delete store[key]; }),
  };
});

const mockUser = {
  id: '1',
  email: 'test@test.com',
  firstName: 'Test',
  lastName: 'User',
  currency: 'EUR',
  locale: 'de-DE',
  isEmailVerified: false,
  mfaEnabled: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('authStore', () => {
  beforeEach(async () => {
    await useAuthStore.getState().clearAuth();
  });

  it('starts with null user', () => {
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('setAuth sets user', async () => {
    await useAuthStore.getState().setAuth(mockUser as never, 'at', 'rt');
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });

  it('clearAuth removes user', async () => {
    await useAuthStore.getState().setAuth(mockUser as never, 'at', 'rt');
    await useAuthStore.getState().clearAuth();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('loadAuth restores user from SecureStore', async () => {
    const SecureStore = require('expo-secure-store');
    SecureStore.getItemAsync.mockImplementation(async (key: string) => {
      if (key === 'user') return JSON.stringify(mockUser);
      return null;
    });
    await useAuthStore.getState().loadAuth();
    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('loadAuth handles missing user gracefully', async () => {
    const SecureStore = require('expo-secure-store');
    SecureStore.getItemAsync.mockResolvedValue(null);
    await useAuthStore.getState().loadAuth();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});
