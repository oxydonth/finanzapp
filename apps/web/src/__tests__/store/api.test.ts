import { describe, it, expect, vi, beforeEach } from 'vitest';

const store: Record<string, string> = {};
Object.defineProperty(global, 'sessionStorage', {
  value: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => Object.keys(store).forEach(k => delete store[k]),
  },
  writable: true,
});

Object.defineProperty(global, 'window', {
  value: { location: { href: '' } },
  writable: true,
});

const fetchMock = vi.fn();
global.fetch = fetchMock;

const { api } = await import('@/lib/api');

describe('api client', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    Object.keys(store).forEach(k => delete store[k]);
  });

  it('GET makes fetch with Content-Type header', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { result: 42 } }),
    });

    const result = await api.get('/test');
    expect(result).toEqual({ result: 42 });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, opts] = fetchMock.mock.calls[0];
    expect((opts.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('GET includes Authorization when token in sessionStorage', async () => {
    store['fa-at'] = 'my-access-token';
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: {} }),
    });

    await api.get('/secured');
    const [, opts] = fetchMock.mock.calls[0];
    expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer my-access-token');
  });

  it('POST sends JSON body', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { id: '1' } }),
    });

    await api.post('/resource', { name: 'Test' });
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ name: 'Test' });
  });

  it('PATCH sends JSON body with PATCH method', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: {} }),
    });

    await api.patch('/resource/1', { name: 'Updated' });
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.method).toBe('PATCH');
    expect(JSON.parse(opts.body)).toEqual({ name: 'Updated' });
  });

  it('throws on non-ok response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Bad request' }),
    });

    await expect(api.get('/bad')).rejects.toThrow('Bad request');
  });

  it('attempts token refresh on 401', async () => {
    store['fa-at'] = 'expired-token';
    store['fa-rt'] = 'valid-refresh';

    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { accessToken: 'new-access', refreshToken: 'new-refresh' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { result: 'ok' } }),
      });

    const result = await api.get('/protected');
    expect(result).toEqual({ result: 'ok' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
