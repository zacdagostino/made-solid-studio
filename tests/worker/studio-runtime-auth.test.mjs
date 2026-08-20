import assert from 'node:assert/strict';
import test from 'node:test';
import {
  authorizeStudioRuntimeRequest,
  clearStudioRuntimeAuthorizationCache,
} from '../../scripts/studio-runtime-auth.mjs';

const environment = {
  SITEFORGE_RUNTIME_AUTH_REQUIRED: '1',
  SITEFORGE_SUPABASE_URL: 'https://example.supabase.co',
  SITEFORGE_SUPABASE_SERVICE_ROLE_KEY: 'server-only-service-role-key',
};

function request(authorization) {
  return { headers: authorization ? { authorization } : {} };
}

test.beforeEach(() => clearStudioRuntimeAuthorizationCache());

test('allows local development when protected runtime authentication is disabled', async () => {
  const result = await authorizeStudioRuntimeRequest(request(), { environment: {} });
  assert.equal(result.authorized, true);
  assert.equal(result.source, 'disabled');
});

test('rejects a protected runtime request without a Studio session', async () => {
  const result = await authorizeStudioRuntimeRequest(request(), { environment });
  assert.equal(result.authorized, false);
  assert.equal(result.status, 401);
});

test('accepts an authenticated organization member and caches the verification', async () => {
  let calls = 0;
  const fetchImplementation = async (url) => {
    calls += 1;
    if (String(url).includes('/auth/v1/user')) {
      return Response.json({ id: '763647ba-7e4e-493e-a7ab-24a7eed96c40' });
    }
    return Response.json([{ organization_id: '5d1439f7-509f-46c2-ac39-d4bc29d29b74' }]);
  };
  const first = await authorizeStudioRuntimeRequest(request('Bearer signed-session-token'), {
    environment,
    fetchImplementation,
    now: () => 100,
  });
  const cached = await authorizeStudioRuntimeRequest(request('Bearer signed-session-token'), {
    environment,
    fetchImplementation,
    now: () => 200,
  });
  assert.equal(first.authorized, true);
  assert.equal(first.source, 'supabase');
  assert.equal(cached.authorized, true);
  assert.equal(cached.source, 'cache');
  assert.equal(calls, 2);
});

test('rejects a valid user who has no Made Solid organization membership', async () => {
  const fetchImplementation = async (url) =>
    String(url).includes('/auth/v1/user')
      ? Response.json({ id: '763647ba-7e4e-493e-a7ab-24a7eed96c40' })
      : Response.json([]);
  const result = await authorizeStudioRuntimeRequest(request('Bearer signed-session-token'), {
    environment,
    fetchImplementation,
  });
  assert.equal(result.authorized, false);
  assert.equal(result.status, 403);
});
