import { getSupabaseClient } from './supabase';

async function studioRuntimeAccessToken() {
  const client = getSupabaseClient();
  if (!client) return undefined;
  const { data, error } = await client.auth.getSession();
  if (error) throw new Error('Made Solid Studio could not read the signed-in session.');
  let session = data.session;
  if (session && session.expires_at && session.expires_at * 1_000 - Date.now() < 60_000) {
    const refreshed = await client.auth.refreshSession();
    if (refreshed.error) throw new Error('Your Made Solid Studio session has expired.');
    session = refreshed.data.session;
  }
  return session?.access_token;
}

export async function studioRuntimeFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const accessToken = await studioRuntimeAccessToken();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  return fetch(input, {
    ...init,
    credentials: 'same-origin',
    headers,
  });
}
