import { createHmac, timingSafeEqual } from 'node:crypto';

const defaultLifetimeMs = 60 * 60 * 1_000;

function base64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function signature(payload, secret) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createWorkspacePreviewToken(
  directory,
  secret,
  { now = Date.now(), lifetimeMs = defaultLifetimeMs } = {},
) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(directory)) {
    throw new Error('A valid workspace directory is required for preview access.');
  }
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new Error('SITEFORGE_WORKSPACE_PREVIEW_SECRET must contain at least 32 characters.');
  }
  const payload = base64Url(
    JSON.stringify({ directory, expiresAt: now + Math.max(60_000, lifetimeMs) }),
  );
  return `${payload}.${signature(payload, secret)}`;
}

export function verifyWorkspacePreviewToken(token, secret, { now = Date.now() } = {}) {
  if (typeof token !== 'string' || token.length > 2_048 || typeof secret !== 'string') {
    return undefined;
  }
  const [payload, suppliedSignature, extra] = token.split('.');
  if (!payload || !suppliedSignature || extra) return undefined;
  const expectedSignature = signature(payload, secret);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return undefined;
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (
      !/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(value.directory) ||
      !Number.isFinite(value.expiresAt) ||
      value.expiresAt <= now()
    ) {
      return undefined;
    }
    return { directory: value.directory, expiresAt: value.expiresAt };
  } catch {
    return undefined;
  }
}

export function workspacePreviewUrl(origin, directory, secret, options) {
  const url = new URL(origin);
  url.pathname = '/';
  url.search = '';
  url.hash = '';
  url.searchParams.set('access', createWorkspacePreviewToken(directory, secret, options));
  return url.href;
}
