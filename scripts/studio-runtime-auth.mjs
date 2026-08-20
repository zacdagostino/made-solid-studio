import { createHash } from 'node:crypto';

const successfulAuthorizations = new Map();
const authorizationCacheMs = 30_000;
const maximumAuthorizationLength = 8_192;

function requiredEnvironment(name, environment) {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required when Studio runtime authentication is enabled.`);
  return value;
}

function requiredUuidEnvironment(name, environment) {
  const value = requiredEnvironment(name, environment);
  if (!/^[0-9a-f-]{36}$/i.test(value)) {
    throw new Error(`${name} must be a UUID when Studio runtime authentication is enabled.`);
  }
  return value.toLowerCase();
}

export function studioRuntimeAuthenticationRequired(environment = process.env) {
  return environment.SITEFORGE_RUNTIME_AUTH_REQUIRED?.trim() === '1';
}

function bearerToken(request) {
  const authorization = String(request.headers.authorization || '').trim();
  if (!authorization || authorization.length > maximumAuthorizationLength) return undefined;
  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
  return match?.[1];
}

function cacheKey(token) {
  return createHash('sha256').update(token).digest('hex');
}

function serviceHeaders(serviceRoleKey) {
  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
  };
}

export async function authorizeStudioRuntimeRequest(
  request,
  { environment = process.env, fetchImplementation = fetch, now = Date.now } = {},
) {
  if (!studioRuntimeAuthenticationRequired(environment)) {
    return { authorized: true, source: 'disabled' };
  }

  const token = bearerToken(request);
  if (!token) {
    return {
      authorized: false,
      status: 401,
      detail: 'Sign in to Made Solid Studio to use this private runtime action.',
    };
  }

  const tokenKey = cacheKey(token);
  const cached = successfulAuthorizations.get(tokenKey);
  if (cached && cached.expiresAt > now()) {
    return {
      authorized: true,
      source: 'cache',
      userId: cached.userId,
      organizationId: cached.organizationId,
    };
  }

  const supabaseUrl = requiredEnvironment('SITEFORGE_SUPABASE_URL', environment).replace(
    /\/+$/,
    '',
  );
  const serviceRoleKey = requiredEnvironment('SITEFORGE_SUPABASE_SERVICE_ROLE_KEY', environment);
  const ownerUserId = requiredUuidEnvironment('SITEFORGE_RUNTIME_OWNER_USER_ID', environment);
  const ownerOrganizationId = requiredUuidEnvironment(
    'SITEFORGE_RUNTIME_OWNER_ORGANIZATION_ID',
    environment,
  );

  try {
    const userResponse = await fetchImplementation(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(5_000),
    });
    if (!userResponse.ok) {
      return {
        authorized: false,
        status: 401,
        detail: 'Your Made Solid Studio session has expired. Sign in again and retry.',
      };
    }

    const user = await userResponse.json();
    const userId = typeof user?.id === 'string' ? user.id : '';
    if (!/^[0-9a-f-]{36}$/i.test(userId)) {
      return {
        authorized: false,
        status: 401,
        detail: 'Made Solid Studio could not verify this account.',
      };
    }
    if (userId.toLowerCase() !== ownerUserId) {
      return {
        authorized: false,
        status: 403,
        detail: 'This account is not authorized to use the private Made Solid Studio runtime.',
      };
    }

    const membershipUrl = new URL(`${supabaseUrl}/rest/v1/organization_members`);
    membershipUrl.searchParams.set('user_id', `eq.${userId}`);
    membershipUrl.searchParams.set('organization_id', `eq.${ownerOrganizationId}`);
    membershipUrl.searchParams.set('role', 'eq.owner');
    membershipUrl.searchParams.set('select', 'organization_id,role');
    membershipUrl.searchParams.set('limit', '1');
    const membershipResponse = await fetchImplementation(membershipUrl, {
      headers: serviceHeaders(serviceRoleKey),
      signal: AbortSignal.timeout(5_000),
    });
    const memberships = membershipResponse.ok ? await membershipResponse.json() : [];
    if (!Array.isArray(memberships) || !memberships.length) {
      return {
        authorized: false,
        status: 403,
        detail: 'This account is not the owner of the private Made Solid Studio workspace.',
      };
    }

    successfulAuthorizations.set(tokenKey, {
      expiresAt: now() + authorizationCacheMs,
      userId,
      organizationId: ownerOrganizationId,
    });
    if (successfulAuthorizations.size > 100) {
      const oldestKey = successfulAuthorizations.keys().next().value;
      if (oldestKey) successfulAuthorizations.delete(oldestKey);
    }
    return {
      authorized: true,
      source: 'supabase',
      userId,
      organizationId: ownerOrganizationId,
    };
  } catch {
    return {
      authorized: false,
      status: 503,
      detail: 'Made Solid Studio could not verify this private runtime request. Retry shortly.',
    };
  }
}

export function clearStudioRuntimeAuthorizationCache() {
  successfulAuthorizations.clear();
}
