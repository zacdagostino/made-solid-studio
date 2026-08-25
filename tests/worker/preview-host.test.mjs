import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  handlePreviewRequest,
  parseWorkspaceFramePath,
  parsePreviewPath,
  preparePreviewHtml,
  prepareWorkspaceFrameHtml,
  prepareWorkspaceFrameResponseBody,
  previewHostRequestListener,
  previewHostConfiguration,
  previewRouteMatchesBuildMode,
  rewritePreviewRootReferences,
  rewriteNextWorkspaceFrameRuntimeReferences,
  rewritePreviewRuntimeReferences,
  rewriteWorkspaceFrameRuntimeReferences,
} from '../../preview-host/server.mjs';
import { createWorkspacePreviewToken } from '../../scripts/workspace-preview-access.mjs';

const runId = '12345678-1234-1234-1234-123456789abc';
const token = 'a'.repeat(64);
const previewOrigin = 'https://preview.example.com';
const previewRoot = `${previewOrigin}/site/${runId}/${token}/`;
const configuration = {
  publicOrigin: previewOrigin,
  serviceRoleKey: 'server-only-key',
  supabaseUrl: 'https://project.supabase.co',
};
const workspaceSecret = 'workspace-preview-secret-longer-than-thirty-two-characters';

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
    routePrefix: '/site/',
    runId,
    token,
  });
  assert.deepEqual(parsePreviewPath(`/site/${runId}/${token}/__draft__/`), {
    filePath: 'index.html',
    previewMode: 'draft',
    routePrefix: '/site/',
    runId,
    token,
  });
  assert.deepEqual(parsePreviewPath(`/test/${runId}/${token}/services/`), {
    filePath: 'services',
    previewMode: 'ready',
    routePrefix: '/test/',
    runId,
    token,
  });
  assert.deepEqual(parsePreviewPath(`/build/${runId}/${token}/`), {
    filePath: 'index.html',
    previewMode: 'ready',
    routePrefix: '/build/',
    runId,
    token,
  });
  assert.equal(parsePreviewPath(`/site/${runId}/${token}/../private.txt`), undefined);
  assert.equal(parsePreviewPath(`/site/not-a-run/${token}/`), undefined);
});

test('keeps test and complete-build capability routes tied to their build modes', () => {
  for (const mode of ['homepage_test', 'page_test', 'site_test']) {
    assert.equal(previewRouteMatchesBuildMode('/test/', mode), true);
    assert.equal(previewRouteMatchesBuildMode('/build/', mode), false);
  }
  assert.equal(previewRouteMatchesBuildMode('/build/', 'full_site'), true);
  assert.equal(previewRouteMatchesBuildMode('/test/', 'full_site'), false);
  assert.equal(previewRouteMatchesBuildMode('/site/', 'full_site'), true);
  assert.equal(previewRouteMatchesBuildMode('/site/', 'page_test'), true);
});

test('parses exact client frame routes without traversal', () => {
  assert.deepEqual(
    parseWorkspaceFramePath(
      '/__made-solid/workspace-frame/prospect-site/payload.signature/_next/app.js',
    ),
    {
      directory: 'prospect-site',
      token: 'payload.signature',
      upstreamPath: '/_next/app.js',
    },
  );
  assert.equal(
    parseWorkspaceFramePath(
      '/__made-solid/workspace-frame/prospect-site/payload.signature/%2e%2e/private',
    ),
    undefined,
  );
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

test('does not rewrite embedded JavaScript source strings as client paths', () => {
  const frameBase = '/__made-solid/workspace-frame/client-a/payload.signature/';
  const embeddedSource = 'eval(__webpack_require__.ts("/**\\n * @license React\\n */"));';

  assert.equal(rewriteWorkspaceFrameRuntimeReferences(embeddedSource, frameBase), embeddedSource);
  const nextRuntime =
    'const nextIndex = pathname.indexOf("/_next/"); const CHUNK_BASE_PATH = "/_next/"; const RUNTIME_PUBLIC_PATH = "/_next/"; __webpack_require__.p = "/_next/"; eval(__webpack_require__.ts("/**\\n * @license React\\n */"));';
  const expectedNextRuntime = nextRuntime
    .replace('const CHUNK_BASE_PATH = "/_next/"', `const CHUNK_BASE_PATH = "${frameBase}_next/"`)
    .replace(
      'const RUNTIME_PUBLIC_PATH = "/_next/"',
      `const RUNTIME_PUBLIC_PATH = "${frameBase}_next/"`,
    )
    .replace('__webpack_require__.p = "/_next/"', `__webpack_require__.p = "${frameBase}_next/"`);
  assert.equal(
    prepareWorkspaceFrameResponseBody(
      nextRuntime,
      'application/javascript',
      '/_next/static/chunks/main-app.js',
      frameBase,
    ),
    expectedNextRuntime,
  );
  assert.equal(
    rewriteNextWorkspaceFrameRuntimeReferences(nextRuntime, frameBase),
    expectedNextRuntime,
  );
  assert.equal(
    rewriteNextWorkspaceFrameRuntimeReferences(
      `const SUSPENSE_END_DATA = '/$'; const SUSPENSE_PENDING_START_DATA = '/$?';`,
      frameBase,
    ),
    `const SUSPENSE_END_DATA = '/$'; const SUSPENSE_PENDING_START_DATA = '/$?';`,
  );
});

test('keeps Vite and Next live runtime requests inside an exact frame route', () => {
  const frameBase = '/__made-solid/workspace-frame/prospect-site/payload.signature/';
  const html = prepareWorkspaceFrameHtml(
    '<!doctype html><html><head><script type="module" src="/@vite/client"></script><link rel="stylesheet" href="/_next/app.css"></head><body><img src="/hero.png" srcset="/small.png 1x, /large.png 2x"><script id="__NEXT_DATA__" type="application/json">{"assetPrefix":""}</script></body></html>',
    frameBase,
  );
  assert.match(html, new RegExp(`<base href="${frameBase}">`));
  assert.match(html, new RegExp(`src="${frameBase}@vite/client"`));
  assert.match(html, new RegExp(`href="${frameBase}_next/app\\.css"`));
  assert.match(html, new RegExp(`src="${frameBase}hero\\.png"`));
  assert.match(html, new RegExp(`srcset="${frameBase}small\\.png 1x, ${frameBase}large\\.png 2x"`));
  assert.match(html, new RegExp(`"assetPrefix":"${frameBase.slice(0, -1)}"`));
  assert.match(html, /data-made-solid-opaque-runtime/);
  assert.doesNotMatch(html, /data-siteforge-preview-navigation/);

  const viteClient = rewriteWorkspaceFrameRuntimeReferences(
    'const base$1 = "/" || "/";const socketHost = `${null || importMetaUrl.hostname}:${hmrPort || importMetaUrl.port}${"/"}`;const base = "/" || "/";',
    frameBase,
  );
  assert.match(viteClient, new RegExp(`const base\\$1 = "${frameBase}"`));
  assert.match(viteClient, new RegExp(`\\$\\{"${frameBase}"\\}`));
  assert.match(viteClient, new RegExp(`const base = "${frameBase}"`));
});

test('proxies a live frame through an exact preview-origin capability', async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'siteforge-preview-frame-'));
  const activeWorkspacePreviewPath = join(fixtureRoot, 'active.json');
  const upstreamRequests = [];
  const upstream = createServer((request, response) => {
    upstreamRequests.push({
      cookie: request.headers.cookie,
      origin: request.headers.origin,
      referrer: request.headers.referer,
      secFetchMode: request.headers['sec-fetch-mode'],
      secFetchSite: request.headers['sec-fetch-site'],
      url: request.url,
    });
    if (
      request.headers.origin ||
      request.headers['sec-fetch-mode'] ||
      request.headers['sec-fetch-site']
    ) {
      response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Unauthorized');
      return;
    }
    if (request.url === '/styles.css') {
      response.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
      response.end('.hero{background:url("/hero.png")}');
      return;
    }
    if (request.url === '/app.js') {
      response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
      response.end('window.loaded=true;const chunk="/_next/chunk.js";');
      return;
    }
    if (request.url === '/hero.png') {
      response.writeHead(200, { 'Content-Type': 'image/png' });
      response.end(Buffer.from([137, 80, 78, 71]));
      return;
    }
    response.writeHead(200, {
      'Content-Security-Policy': "default-src 'self'; frame-ancestors *; sandbox allow-scripts",
      'Content-Type': 'text/html; charset=utf-8',
      Location: '/welcome',
      'Set-Cookie': 'client-global=unsafe; Path=/',
    });
    response.end(
      '<!doctype html><html><head><link rel="stylesheet" href="/styles.css"></head><body><img src="/hero.png"><script src="/app.js"></script></body></html>',
    );
  });
  upstream.listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  const upstreamAddress = upstream.address();
  assert.ok(upstreamAddress && typeof upstreamAddress !== 'string');
  await writeFile(
    activeWorkspacePreviewPath,
    JSON.stringify({ directory: 'prospect-site', port: upstreamAddress.port }),
  );
  const frameConfiguration = {
    activeWorkspacePreviewPath,
    publicOrigin: 'https://preview.madesolid.com.au',
    serviceRoleKey: 'not-used',
    supabaseUrl: 'https://project.supabase.co',
    workspaceOrigin: 'https://workspace.madesolid.com.au',
    workspaceOrigins: ['https://dev.studio.madesolid.com.au', 'https://workspace.madesolid.com.au'],
    workspacePreviewSecret: workspaceSecret,
  };
  const proxy = createServer(previewHostRequestListener(frameConfiguration));
  proxy.listen(0, '127.0.0.1');
  await once(proxy, 'listening');
  const proxyAddress = proxy.address();
  assert.ok(proxyAddress && typeof proxyAddress !== 'string');
  const localOrigin = `http://127.0.0.1:${proxyAddress.port}`;
  const token = createWorkspacePreviewToken('prospect-site', workspaceSecret);
  const frameRoot = `/__made-solid/workspace-frame/prospect-site/${token}/`;
  try {
    const documentResponse = await fetch(`${localOrigin}${frameRoot}`, {
      redirect: 'manual',
    });
    assert.equal(documentResponse.status, 200);
    assert.equal(documentResponse.headers.get('location'), `${frameRoot}welcome`);
    assert.equal(documentResponse.headers.get('set-cookie'), null);
    assert.match(
      documentResponse.headers.get('content-security-policy') || '',
      /default-src 'self'/,
    );
    assert.match(
      documentResponse.headers.get('content-security-policy') || '',
      /frame-ancestors https:\/\/dev\.studio\.madesolid\.com\.au https:\/\/workspace\.madesolid\.com\.au/,
    );
    assert.match(
      documentResponse.headers.get('content-security-policy') || '',
      /sandbox allow-scripts/,
    );
    assert.equal(documentResponse.headers.get('cache-control'), 'private, no-store');
    assert.equal(documentResponse.headers.get('referrer-policy'), 'no-referrer');
    const document = await documentResponse.text();
    assert.match(document, new RegExp(`href="${frameRoot}styles\\.css"`));
    assert.match(document, new RegExp(`src="${frameRoot}app\\.js"`));

    const [css, script, image] = await Promise.all(
      ['styles.css', 'app.js', 'hero.png'].map((path) =>
        fetch(`${localOrigin}${frameRoot}${path}`, {
          headers: {
            Origin: 'null',
            'Sec-Fetch-Mode': 'no-cors',
            'Sec-Fetch-Site': 'cross-site',
          },
        }),
      ),
    );
    assert.equal(css.status, 200);
    assert.match(await css.text(), new RegExp(`url\\("${frameRoot}hero\\.png"\\)`));
    assert.equal(script.status, 200);
    assert.match(await script.text(), new RegExp(`${frameRoot}_next/chunk\\.js`));
    assert.equal(image.status, 200);
    assert.ok(upstreamRequests.every((request) => request.cookie === undefined));
    assert.ok(upstreamRequests.every((request) => request.origin === undefined));
    assert.ok(upstreamRequests.every((request) => request.referrer === undefined));
    assert.ok(upstreamRequests.every((request) => request.secFetchMode === undefined));
    assert.ok(upstreamRequests.every((request) => request.secFetchSite === undefined));

    const wrongFrame = await fetch(
      `${localOrigin}/__made-solid/workspace-frame/prospect-site/payload.invalid/styles.css`,
    );
    assert.equal(wrongFrame.status, 404);
    const expiredToken = createWorkspacePreviewToken('prospect-site', workspaceSecret, { now: 0 });
    const expiredFrame = await fetch(
      `${localOrigin}/__made-solid/workspace-frame/prospect-site/${expiredToken}/styles.css`,
    );
    assert.equal(expiredFrame.status, 404);
    const crossClientFrame = await fetch(
      `${localOrigin}/__made-solid/workspace-frame/another-client/${token}/styles.css`,
    );
    assert.equal(crossClientFrame.status, 404);
  } finally {
    proxy.closeAllConnections();
    upstream.closeAllConnections();
    await Promise.all([
      new Promise((resolve) => proxy.close(resolve)),
      new Promise((resolve) => upstream.close(resolve)),
    ]);
    await rm(fixtureRoot, { recursive: true, force: true });
  }
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
      return Response.json([
        { build_mode: 'full_site', organization_id: 'organisation', status: 'ready' },
      ]);
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

test('rejects a valid preview token when its route prefix misrepresents the build mode', async () => {
  const originalFetch = globalThis.fetch;
  let buildMode = 'full_site';
  globalThis.fetch = async (url) => {
    const target = String(url);
    if (target.includes('/rest/v1/builder_preview_access')) {
      return Response.json([{ expires_at: '2999-01-01T00:00:00.000Z', preview_mode: 'ready' }]);
    }
    if (target.includes('/rest/v1/builder_runs')) {
      return Response.json([
        { build_mode: buildMode, organization_id: 'organisation', status: 'ready' },
      ]);
    }
    throw new Error(`Unexpected lookup: ${target}`);
  };
  try {
    const fullSiteOnTest = await handlePreviewRequest(
      new Request(`${previewOrigin}/test/${runId}/${token}/`),
      configuration,
    );
    assert.equal(fullSiteOnTest.status, 404);

    buildMode = 'site_test';
    const testOnBuild = await handlePreviewRequest(
      new Request(`${previewOrigin}/build/${runId}/${token}/`),
      configuration,
    );
    assert.equal(testOnBuild.status, 404);
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
