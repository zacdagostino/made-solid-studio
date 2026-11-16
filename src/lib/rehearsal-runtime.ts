import { studioRuntimeFetch } from './studio-runtime';

type RuntimeFetch = typeof studioRuntimeFetch;

const incompleteResponseMessage =
  'Studio could not confirm the rehearsal. Try again; your email and any rehearsal already created are safe.';

function responseDetail(value: unknown) {
  if (!value || typeof value !== 'object') return undefined;
  const detail = 'detail' in value ? value.detail : undefined;
  return typeof detail === 'string' && detail.trim() ? detail : undefined;
}

async function readJson(response: Response) {
  const body = await response.text();
  if (!body.trim()) return undefined;
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return undefined;
  }
}

export async function requestRehearsal<T>(
  input: Record<string, unknown>,
  runtimeFetch: RuntimeFetch = studioRuntimeFetch,
): Promise<T> {
  const request = () =>
    runtimeFetch('/__made-solid/rehearsal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response: Response;
    try {
      response = await request();
    } catch (error) {
      if (attempt === 0) continue;
      if (error instanceof Error && error.message && error.message !== 'Failed to fetch') {
        throw error;
      }
      throw new Error(incompleteResponseMessage, { cause: error });
    }

    let data: unknown;
    try {
      data = await readJson(response);
    } catch (error) {
      if (attempt === 0) continue;
      throw new Error(incompleteResponseMessage, { cause: error });
    }
    if (response.ok && data) return data as T;

    const canRetry = attempt === 0 && (response.ok || response.status >= 500);
    if (canRetry) continue;
    if (!response.ok) throw new Error(responseDetail(data) || incompleteResponseMessage);
    throw new Error(incompleteResponseMessage);
  }

  throw new Error(incompleteResponseMessage);
}
