import { hostname } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const pollMs = Math.max(1_000, Number(process.env.SITEFORGE_BALANCE_SYNC_POLL_MS || 5_000));
const once = process.argv.includes('--once');
const workerId =
  process.env.SITEFORGE_WORKER_ID || `clientspace-balance-${hostname()}-${process.pid}`;

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the Clientspace balance worker.`);
  return value;
}

export function balanceRevisionUrl(environment = process.env) {
  const configured = environment.MADE_SOLID_BALANCE_SYNC_URL?.trim();
  const handoff = environment.MADE_SOLID_HANDOFF_URL?.trim();
  const value = configured || handoff?.replace(/\/handoffs\/?$/, '/balance-revisions');
  if (!value) {
    throw new Error(
      'MADE_SOLID_BALANCE_SYNC_URL or MADE_SOLID_HANDOFF_URL is required for balance sync.',
    );
  }
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    !url.pathname.endsWith('/api/integrations/studio/balance-revisions')
  ) {
    throw new Error('The Clientspace balance-sync URL must use the protected HTTPS endpoint.');
  }
  return url.toString();
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function balanceRevisionAction(url, secret, body, fetcher = fetch) {
  const response = await fetcher(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      typeof payload?.message === 'string'
        ? payload.message
        : 'Clientspace did not accept the balance-sync action.',
    );
  }
  return payload;
}

export async function syncBalanceRevision(supabase, revision) {
  const { error } = await supabase.rpc('sync_clientspace_balance_revision', {
    target_revision: revision,
    target_pricing_snapshot: revision.pricingSnapshot,
  });
  if (error) throw error;
}

export async function runBalanceSyncOnce({ endpoint, secret, studioSupabase, fetcher = fetch }) {
  const claimed = await balanceRevisionAction(
    endpoint,
    secret,
    { action: 'claim', workerId },
    fetcher,
  );
  const revision = claimed?.revision;
  if (!revision) return false;
  try {
    await syncBalanceRevision(studioSupabase, revision);
    await balanceRevisionAction(
      endpoint,
      secret,
      { action: 'complete', revisionId: revision.id, workerId },
      fetcher,
    );
  } catch (error) {
    const failureSummary =
      error instanceof Error ? error.message : 'Studio could not import the balance revision.';
    await balanceRevisionAction(
      endpoint,
      secret,
      {
        action: 'fail',
        revisionId: revision.id,
        workerId,
        failureSummary: failureSummary.slice(0, 1_000),
      },
      fetcher,
    ).catch(() => undefined);
  }
  return true;
}

export async function startBalanceSyncWorker(environment = process.env) {
  const studioSupabase = createClient(
    requiredEnvironment('SITEFORGE_SUPABASE_URL'),
    requiredEnvironment('SITEFORGE_SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const endpoint = balanceRevisionUrl(environment);
  const secret = requiredEnvironment('MADE_SOLID_HANDOFF_SECRET');
  let stopping = false;
  process.once('SIGINT', () => {
    stopping = true;
  });
  process.once('SIGTERM', () => {
    stopping = true;
  });
  do {
    try {
      const processed = await runBalanceSyncOnce({ endpoint, secret, studioSupabase });
      if (!processed && !once && !stopping) await wait(pollMs);
    } catch (error) {
      console.error(
        '[clientspace-balance-worker] sync unavailable:',
        error instanceof Error ? error.message : error,
      );
      if (!once && !stopping) await wait(pollMs);
    }
  } while (!once && !stopping);
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === fileURLToPath(new URL(process.argv[1], 'file:'))
) {
  await startBalanceSyncWorker();
}
