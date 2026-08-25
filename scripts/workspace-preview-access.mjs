import { createHmac, timingSafeEqual } from 'node:crypto';

const defaultLifetimeMs = 60 * 60 * 1_000;
const workspaceStudioExchangePurpose = 'studio-development-exchange';
const workspaceStudioSessionPurpose = 'studio-development-session';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const workspaceRevisionPattern = /^(?:working|[0-9a-f]{40})$/i;

function base64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function signature(payload, secret) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createWorkspacePreviewToken(
  directory,
  secret,
  { now = Date.now(), lifetimeMs = defaultLifetimeMs, revision = 'working' } = {},
) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(directory)) {
    throw new Error('A valid workspace directory is required for preview access.');
  }
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new Error('SITEFORGE_WORKSPACE_PREVIEW_SECRET must contain at least 32 characters.');
  }
  if (!workspaceRevisionPattern.test(revision)) {
    throw new Error('A working or exact Git revision is required for preview access.');
  }
  const payload = base64Url(
    JSON.stringify({
      directory,
      expiresAt: now + Math.max(60_000, lifetimeMs),
      revision: revision.toLowerCase(),
    }),
  );
  return `${payload}.${signature(payload, secret)}`;
}

export function verifyWorkspacePreviewToken(token, secret, { now = Date.now } = {}) {
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
      (value.revision !== undefined && !workspaceRevisionPattern.test(value.revision)) ||
      !Number.isFinite(value.expiresAt) ||
      value.expiresAt <= now()
    ) {
      return undefined;
    }
    return {
      directory: value.directory,
      expiresAt: value.expiresAt,
      revision: String(value.revision || 'working').toLowerCase(),
    };
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

export function workspaceFrameUrl(origin, directory, secret, options = {}) {
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.href !== `${url.origin}/`) {
    throw new Error('The Workspace frame origin must be an exact HTTPS origin.');
  }
  const token = createWorkspacePreviewToken(directory, secret, options);
  const requestedPath =
    typeof options.path === 'string' &&
    options.path.startsWith('/') &&
    !options.path.startsWith('//')
      ? options.path
      : '/';
  url.pathname = `/__made-solid/workspace-frame/${directory}/${encodeURIComponent(token)}${requestedPath}`;
  return url.href;
}

export function createWorkspaceStudioToken(
  secret,
  ownerUserId,
  {
    now = Date.now(),
    lifetimeMs = defaultLifetimeMs,
    purpose = workspaceStudioExchangePurpose,
  } = {},
) {
  if (!uuidPattern.test(ownerUserId || '')) {
    throw new Error('A valid Workspace owner user ID is required.');
  }
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new Error('SITEFORGE_WORKSPACE_PREVIEW_SECRET must contain at least 32 characters.');
  }
  if (purpose !== workspaceStudioExchangePurpose && purpose !== workspaceStudioSessionPurpose) {
    throw new Error('A valid Workspace Studio token purpose is required.');
  }
  const payload = base64Url(
    JSON.stringify({
      expiresAt: now + Math.max(60_000, lifetimeMs),
      ownerUserId: ownerUserId.toLowerCase(),
      purpose,
    }),
  );
  return `${payload}.${signature(payload, secret)}`;
}

export function verifyWorkspaceStudioToken(
  token,
  secret,
  ownerUserId,
  { now = Date.now, purpose = workspaceStudioExchangePurpose } = {},
) {
  if (
    typeof token !== 'string' ||
    token.length > 2_048 ||
    typeof secret !== 'string' ||
    !uuidPattern.test(ownerUserId || '')
  ) {
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
      value.purpose !== purpose ||
      value.ownerUserId !== ownerUserId.toLowerCase() ||
      !Number.isFinite(value.expiresAt) ||
      value.expiresAt <= now()
    ) {
      return undefined;
    }
    return {
      expiresAt: value.expiresAt,
      ownerUserId: value.ownerUserId,
      purpose,
    };
  } catch {
    return undefined;
  }
}
