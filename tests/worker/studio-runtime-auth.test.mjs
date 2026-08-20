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
  SITEFORGE_RUNTIME_OWNER_USER_ID: '763647ba-7e4e-493e-a7ab-24a7eed96c40',
  SITEFORGE_RUNTIME_OWNER_ORGANIZATION_ID: '5d1439f7-509f-46c2-ac39-d4bc29d29b74',
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

test('accepts only the configured organization owner and caches the verification', async () => {
  let calls = 0;
  const fetchImplementation = async (url) => {
    calls += 1;
    if (String(url).includes('/auth/v1/user')) {
      return Response.json({ id: '763647ba-7e4e-493e-a7ab-24a7eed96c40' });
    }
    const membershipUrl = new URL(url);
    assert.equal(
      membershipUrl.searchParams.get('organization_id'),
      'eq.5d1439f7-509f-46c2-ac39-d4bc29d29b74',
    );
    assert.equal(membershipUrl.searchParams.get('role'), 'eq.owner');
    return Response.json([
      { organization_id: '5d1439f7-509f-46c2-ac39-d4bc29d29b74', role: 'owner' },
    ]);
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
  assert.equal(first.userId, '763647ba-7e4e-493e-a7ab-24a7eed96c40');
  assert.equal(first.organizationId, '5d1439f7-509f-46c2-ac39-d4bc29d29b74');
  assert.equal(cached.authorized, true);
  assert.equal(cached.source, 'cache');
  assert.equal(cached.organizationId, '5d1439f7-509f-46c2-ac39-d4bc29d29b74');
  assert.equal(calls, 2);
});

test('rejects a valid user who is not the configured runtime owner', async () => {
  let calls = 0;
  const fetchImplementation = async () => {
    calls += 1;
    return Response.json({ id: 'e4a86575-2831-41e8-a3af-98eed9b55f68' });
  };
  const result = await authorizeStudioRuntimeRequest(request('Bearer signed-session-token'), {
    environment,
    fetchImplementation,
  });
  assert.equal(result.authorized, false);
  assert.equal(result.status, 403);
  assert.equal(calls, 1);
});

test('rejects the configured owner without the configured owner membership', async () => {
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
