import { getSupabaseClient } from './supabase';

const sessionExpiredMessage = 'Your Made Solid Studio session has expired. Sign in again.';

async function clearLocalSession() {
  const client = getSupabaseClient();
  if (!client) return;
  await client.auth.signOut({ scope: 'local' }).catch(() => undefined);
}

async function refreshRuntimeAccessToken() {
  const client = getSupabaseClient();
  if (!client) return undefined;
  const refreshed = await client.auth.refreshSession();
  const token = refreshed.data.session?.access_token;
  if (refreshed.error || !token) {
    await clearLocalSession();
    throw new Error(sessionExpiredMessage);
  }
  return token;
}

async function studioRuntimeAccessToken() {
  const client = getSupabaseClient();
  if (!client) return undefined;
  const { data, error } = await client.auth.getSession();
  if (error) throw new Error('Made Solid Studio could not read the signed-in session.');
  const session = data.session;
  if (session && session.expires_at && session.expires_at * 1_000 - Date.now() < 60_000) {
    return refreshRuntimeAccessToken();
  }
  return session?.access_token;
}

function embeddedWorkspaceCodexDirectory() {
  if (window.location.pathname !== '/__made-solid/workspace-codex') return undefined;
  const directory = new URLSearchParams(window.location.search).get('workspace') ?? '';
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(directory) ? directory : undefined;
}

export async function studioRuntimeFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const requestHeaders = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init.headers).forEach((value, name) => requestHeaders.set(name, value));
  const performFetch = (accessToken?: string) => {
    const headers = new Headers(requestHeaders);
    const embeddedWorkspace = embeddedWorkspaceCodexDirectory();
    if (embeddedWorkspace) headers.set('X-Made-Solid-Workspace-Codex', embeddedWorkspace);
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    else headers.delete('Authorization');
    return fetch(input instanceof Request ? input.clone() : input, {
      ...init,
      credentials: 'same-origin',
      headers,
    });
  };

  const response = await performFetch(await studioRuntimeAccessToken());
  if (response.status !== 401 || !getSupabaseClient()) return response;

  const retried = await performFetch(await refreshRuntimeAccessToken());
  if (retried.status !== 401) return retried;
  await clearLocalSession();
  throw new Error(sessionExpiredMessage);
}
