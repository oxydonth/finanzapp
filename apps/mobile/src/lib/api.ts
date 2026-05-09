import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../store/authStore';

const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

async function tryRefresh(): Promise<boolean> {
  const rt = await SecureStore.getItemAsync('refreshToken');
  if (!rt) return false;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) return false;
    const json = await res.json();
    await SecureStore.setItemAsync('accessToken', json.data.accessToken);
    await SecureStore.setItemAsync('refreshToken', json.data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const token = await SecureStore.getItemAsync('accessToken');
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    if (retry && await tryRefresh()) {
      return request<T>(path, options, false);
    }
    await useAuthStore.getState().clearAuth();
    throw new Error('Session expired');
  }

  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Request failed');
  return json.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
