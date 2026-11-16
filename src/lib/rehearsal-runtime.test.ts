import { describe, expect, it, vi } from 'vitest';
import { requestRehearsal } from './rehearsal-runtime';

describe('requestRehearsal', () => {
  it('recovers from a blank response by repeating the idempotent request once', async () => {
    const runtimeFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 502 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'rehearsal-id' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

    await expect(
      requestRehearsal<{ id: string }>({ action: 'create', id: 'rehearsal-id' }, runtimeFetch),
    ).resolves.toEqual({ id: 'rehearsal-id' });
    expect(runtimeFetch).toHaveBeenCalledTimes(2);
    expect(runtimeFetch.mock.calls[0][1]).toEqual(runtimeFetch.mock.calls[1][1]);
  });

  it('preserves a useful server validation message without retrying it', async () => {
    const runtimeFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Enter your email for the test.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(requestRehearsal({}, runtimeFetch)).rejects.toThrow(
      'Enter your email for the test.',
    );
    expect(runtimeFetch).toHaveBeenCalledTimes(1);
  });

  it('replaces malformed responses with a clear recoverable error', async () => {
    const runtimeFetch = vi.fn().mockResolvedValue(new Response('', { status: 502 }));

    await expect(requestRehearsal({}, runtimeFetch)).rejects.toThrow(
      'Try again; your email and any rehearsal already created are safe.',
    );
    expect(runtimeFetch).toHaveBeenCalledTimes(2);
  });
});
