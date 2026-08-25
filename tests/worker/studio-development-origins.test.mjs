import assert from 'node:assert/strict';
import test from 'node:test';
import {
  studioDevelopmentOriginForRequest,
  studioDevelopmentOrigins,
} from '../../scripts/studio-development-origins.mjs';

test('keeps Workspace as the default and compatibility origin', () => {
  assert.deepEqual(studioDevelopmentOrigins({}), {
    canonicalOrigin: 'https://workspace.madesolid.com.au',
    origins: ['https://workspace.madesolid.com.au'],
  });
  assert.deepEqual(
    studioDevelopmentOrigins({
      SITEFORGE_DEVELOPMENT_ORIGIN: 'https://dev.studio.madesolid.com.au',
      SITEFORGE_DEVELOPMENT_COMPATIBILITY_ORIGINS:
        'https://workspace.madesolid.com.au, https://legacy.example.com',
    }),
    {
      canonicalOrigin: 'https://dev.studio.madesolid.com.au',
      origins: [
        'https://dev.studio.madesolid.com.au',
        'https://workspace.madesolid.com.au',
        'https://legacy.example.com',
      ],
    },
  );
});

test('rejects malformed development origins and unrecognised request hosts', () => {
  assert.throws(
    () => studioDevelopmentOrigins({ SITEFORGE_DEVELOPMENT_ORIGIN: 'http://dev.example.com' }),
    /exact HTTPS origin/,
  );
  const origins = ['https://dev.studio.madesolid.com.au', 'https://workspace.madesolid.com.au'];
  assert.equal(
    studioDevelopmentOriginForRequest(
      { headers: { host: 'dev.studio.madesolid.com.au' } },
      origins,
    ),
    'https://dev.studio.madesolid.com.au',
  );
  assert.equal(
    studioDevelopmentOriginForRequest(
      {
        headers: {
          host: 'attacker.example',
          'x-forwarded-host': 'dev.studio.madesolid.com.au',
        },
      },
      origins,
    ),
    undefined,
  );
});
