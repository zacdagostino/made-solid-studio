import { fileURLToPath } from 'node:url';

const intervalMs = 60_000;
const once = process.argv.includes('--once');

export function clientEmailInboxUrl(environment = process.env) {
  const handoff = environment.MADE_SOLID_HANDOFF_URL?.trim();
  if (!handoff) throw new Error('MADE_SOLID_HANDOFF_URL is required for inbox monitoring.');
  const url = new URL(handoff);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    !url.pathname.endsWith('/api/integrations/studio/handoffs')
  ) {
    throw new Error('Inbox monitoring requires the protected Clientspace HTTPS origin.');
  }
  url.pathname = '/api/integrations/studio/client-email-inbox';
  url.search = '';
  return url.toString();
}

export async function checkClientEmailInbox(endpoint, secret, fetcher = fetch) {
  const response = await fetcher(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || `Clientspace inbox returned ${response.status}.`);
  }
  return response.json();
}

export async function startClientEmailInboxWorker(environment = process.env) {
  const endpoint = clientEmailInboxUrl(environment);
  const secret = environment.MADE_SOLID_HANDOFF_SECRET?.trim();
  if (!secret) throw new Error('MADE_SOLID_HANDOFF_SECRET is required for inbox monitoring.');
  let stopping = false;
  process.once('SIGINT', () => {
    stopping = true;
  });
  process.once('SIGTERM', () => {
    stopping = true;
  });
  do {
    try {
      const result = await checkClientEmailInbox(endpoint, secret);
      if (result.saved || result.draftFailures?.length) {
        console.log(
          `[client-email-inbox-worker] saved ${result.saved} email(s), prepared ${result.drafted} draft(s), ${result.draftFailures?.length || 0} draft failure(s).`,
        );
      }
    } catch (error) {
      console.error(
        '[client-email-inbox-worker] check unavailable:',
        error instanceof Error ? error.message : error,
      );
    }
    if (!once && !stopping) await new Promise((resolve) => setTimeout(resolve, intervalMs));
  } while (!once && !stopping);
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === fileURLToPath(new URL(process.argv[1], 'file:'))
) {
  await startClientEmailInboxWorker();
}
