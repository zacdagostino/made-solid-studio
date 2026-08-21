import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSupabaseClient } from './supabase';
import { studioRuntimeFetch } from './studio-runtime';

vi.mock('./supabase', () => ({ getSupabaseClient: vi.fn() }));

const session = (token: string, expiresAt = Date.now() / 1_000 + 3_600) => ({
  access_token: token,
  expires_at: expiresAt,
});

type TestSession = ReturnType<typeof session>;

function mockClient({
  current = session('current-token'),
  refreshed = session('refreshed-token'),
  refreshError = null,
}: {
  current?: TestSession | null;
  refreshed?: TestSession | null;
  refreshError?: Error | null;
} = {}) {
  const client = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: current }, error: null }),
      refreshSession: vi
        .fn()
        .mockResolvedValue({ data: { session: refreshed }, error: refreshError }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  };
  vi.mocked(getSupabaseClient).mockReturnValue(client as never);
  return client;
}

describe('studioRuntimeFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the current session without refreshing a successful request', async () => {
    const client = mockClient();
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await studioRuntimeFetch('/__made-solid/status');
    expect(client.auth.refreshSession).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer current-token');
  });

  it('refreshes and retries exactly once after a rejected runtime token', async () => {
    const client = mockClient();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const response = await studioRuntimeFetch('/__made-solid/status', {
      body: JSON.stringify({ action: 'status' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    expect(response.status).toBe(200);
    expect(client.auth.refreshSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].headers.get('Authorization')).toBe('Bearer refreshed-token');
  });

  it('clears an unrecoverable local session instead of remaining stuck', async () => {
    const client = mockClient({ refreshed: null, refreshError: new Error('expired') });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    await expect(studioRuntimeFetch('/__made-solid/status')).rejects.toThrow('session has expired');
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('stops after a second 401 and returns the app to sign-in', async () => {
    const client = mockClient();
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(studioRuntimeFetch('/__made-solid/status')).rejects.toThrow('session has expired');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
