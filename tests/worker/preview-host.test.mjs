import assert from 'node:assert/strict';
import test from 'node:test';
import {
  handlePreviewRequest,
  parsePreviewPath,
  preparePreviewHtml,
  previewHostConfiguration,
  rewritePreviewRootReferences,
  rewritePreviewRuntimeReferences,
} from '../../preview-host/server.mjs';

const runId = '12345678-1234-1234-1234-123456789abc';
const token = 'a'.repeat(64);
const previewOrigin = 'https://preview.example.com';
const previewRoot = `${previewOrigin}/site/${runId}/${token}/`;
const configuration = {
  publicOrigin: previewOrigin,
  serviceRoleKey: 'server-only-key',
  supabaseUrl: 'https://project.supabase.co',
};

test('requires HTTPS for a deployed preview origin', () => {
  assert.throws(
    () =>
      previewHostConfiguration({
        PREVIEW_PUBLIC_ORIGIN: 'http://preview.example.com',
        SUPABASE_SERVICE_ROLE_KEY: 'secret',
        SUPABASE_URL: 'https://project.supabase.co',
      }),
    /must use HTTPS/,
  );
});

test('parses visitor and working-draft capability routes without path traversal', () => {
  assert.deepEqual(parsePreviewPath(`/site/${runId}/${token}/services/`), {
    filePath: 'services',
    previewMode: 'ready',
    runId,
    token,
  });
  assert.deepEqual(parsePreviewPath(`/site/${runId}/${token}/__draft__/`), {
    filePath: 'index.html',
    previewMode: 'draft',
    runId,
    token,
  });
  assert.equal(parsePreviewPath(`/site/${runId}/${token}/../private.txt`), undefined);
  assert.equal(parsePreviewPath(`/site/not-a-run/${token}/`), undefined);
});

test('keeps the compiled Next runtime and roots site resources inside the capability', () => {
  const source = [
    '<!doctype html><html><head>',
    '<link rel="stylesheet" href="/_next/static/site.css">',
    '<script src="/_next/static/runtime.js" async></script>',
    '</head><body>',
    '<a href="/services/">Services</a>',
    '<script>self.__next_f.push([1,\\"/_next/static/runtime.js\\"])</script>',
    '</body></html>',
  ].join('');
  const html = preparePreviewHtml(source, previewRoot);

  assert.match(html, new RegExp(`<base href="${previewRoot}">`));
  assert.match(html, new RegExp(`href="${previewRoot}_next/static/site\\.css"`));
  assert.match(html, new RegExp(`src="${previewRoot}_next/static/runtime\\.js"`));
  assert.match(html, /self\.__next_f\.push/);
  assert.match(html, /data-siteforge-preview-navigation/);
  assert.match(html, /window\.location\.assign/);
});

test('rewrites CSS asset roots without changing data or remote URLs', () => {
  const css = rewritePreviewRootReferences(
    '.hero{background:url("/assets/hero.avif")}.icon{background:url(data:image/png;base64,x)}',
    previewRoot,
  );
  assert.match(css, new RegExp(`url\\("${previewRoot}assets/hero\\.avif"`));
  assert.match(css, /url\(data:image\/png/);
});

test('keeps lazy Next chunks inside the capability at runtime', () => {
  const runtime = rewritePreviewRuntimeReferences(
    'self.webpackChunk_N_E=self.webpackChunk_N_E||[];s.p="/_next/";const marker="/_next/";const logo="/assets/logo.png";',
    previewRoot,
  );
  assert.match(runtime, new RegExp(`s\\.p="${previewRoot}_next/"`));
  assert.match(runtime, /marker="\/_next\/"/);
  assert.match(runtime, new RegExp(`logo="${previewRoot}assets/logo\\.png"`));
});

test('serves a complete hydrated HTML artifact with private visitor protections', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url) => {
    const target = String(url);
    calls.push(target);
    if (target.includes('/rest/v1/builder_preview_access')) {
      return Response.json([{ expires_at: '2999-01-01T00:00:00.000Z', preview_mode: 'ready' }]);
    }
    if (target.includes('/rest/v1/builder_runs')) {
      return Response.json([{ organization_id: 'organisation', status: 'ready' }]);
    }
    if (target.includes('/rest/v1/builder_artifacts')) {
      return Response.json([{ id: 'artifact' }]);
    }
    if (target.includes('/storage/v1/object/authenticated/') && target.endsWith('runtime.js')) {
      return new Response('self.webpackChunk_N_E=[];s.p="/_next/";');
    }
    if (target.includes('/storage/v1/object/authenticated/')) {
      return new Response(
        '<!doctype html><html><head></head><body><main>Visitor site</main><script src="/_next/static/app.js"></script></body></html>',
      );
    }
    return new Response('Not found', { status: 404 });
  };

  try {
    const response = await handlePreviewRequest(new Request(`${previewRoot}`), configuration);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
    assert.match(response.headers.get('content-security-policy') ?? '', /form-action 'none'/);
    assert.match(response.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
    assert.match(html, /Visitor site/);
    assert.match(html, new RegExp(`${previewRoot}_next/static/app\\.js`));
    assert.doesNotMatch(html, /server-only-key/);

    const runtimeResponse = await handlePreviewRequest(
      new Request(`${previewRoot}_next/static/runtime.js`),
      configuration,
    );
    const runtime = await runtimeResponse.text();
    assert.equal(runtimeResponse.headers.get('content-type'), 'text/javascript; charset=utf-8');
    assert.match(runtime, new RegExp(`s\\.p="${previewRoot}_next/"`));
    assert.equal(calls.length, 8);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('does not serve an expired preview capability', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json([{ expires_at: '2000-01-01T00:00:00.000Z', preview_mode: 'ready' }]);
  try {
    const response = await handlePreviewRequest(new Request(previewRoot), configuration);
    assert.equal(response.status, 404);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
