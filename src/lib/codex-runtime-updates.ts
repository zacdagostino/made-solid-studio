import { studioRuntimeFetch } from './studio-runtime';

const codexUpdatesEndpoint = '/__made-solid/codex-updates';

export type CodexReleaseSection = { title: string; items: string[] };
export type CodexRelease = {
  date?: string;
  sections: CodexReleaseSection[];
  version: string;
};
export type CodexUpdateStatus = {
  checkedAt: string | null;
  currentVersion: string;
  failureSummary: string | null;
  latestVersion: string;
  releases: CodexRelease[];
  status:
    | 'checking'
    | 'current'
    | 'downloading'
    | 'failed'
    | 'restart_pending'
    | 'restarting'
    | 'rollback'
    | 'unavailable'
    | 'updated'
    | 'waiting_for_idle';
  updateAvailable: boolean;
  updatedAt: string | null;
};

async function codexUpdateRequest(init?: RequestInit): Promise<CodexUpdateStatus> {
  const response = await studioRuntimeFetch(codexUpdatesEndpoint, {
    headers: { Accept: 'application/json' },
    ...init,
  });
  const text = await response.text();
  const value: Partial<CodexUpdateStatus> & { detail?: string } = (() => {
    try {
      return text.trim() ? JSON.parse(text) : {};
    } catch {
      return {};
    }
  })();
  if (!response.ok || !value.currentVersion) {
    throw new Error(value.detail || 'Codex update status is unavailable. Refresh and try again.');
  }
  return value as CodexUpdateStatus;
}

export function readCodexUpdateStatus(): Promise<CodexUpdateStatus> {
  return codexUpdateRequest();
}

export function checkCodexUpdatesNow(): Promise<CodexUpdateStatus> {
  return codexUpdateRequest({
    body: JSON.stringify({ action: 'check' }),
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    method: 'POST',
  });
}
