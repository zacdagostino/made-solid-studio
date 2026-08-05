import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for private previews.');
}

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function response(status: number, body = 'Not found') {
  return new Response(body, {
    status,
    headers: { 'cache-control': 'no-store' },
  });
}

async function tokenHash(token: string) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function parseRequest(request: Request) {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean);
  const functionIndex = parts.indexOf('siteforge-preview');
  if (functionIndex === -1) return undefined;
  const runId = parts[functionIndex + 1];
  const token = parts[functionIndex + 2];
  const requestedPath = parts.slice(functionIndex + 3);
  const previewMode = requestedPath[0] === '__draft__' ? 'draft' : 'ready';
  const filePath =
    (previewMode === 'draft' ? requestedPath.slice(1) : requestedPath).join('/') || 'index.html';
  if (!runId || !token || !/^[a-f0-9]{64}$/i.test(token)) return undefined;
  if (filePath.includes('..') || filePath.startsWith('/') || !/^[a-zA-Z0-9._/-]+$/.test(filePath)) {
    return undefined;
  }
  return { runId, token, filePath, previewMode };
}

function wantsSandboxedDocument(request: Request) {
  return new URL(request.url).searchParams.get('render') === 'srcdoc';
}

function previewCsp() {
  const previewOrigin = new URL(supabaseUrl).origin;
  return [
    "default-src 'self' data: blob:",
    "img-src 'self' data: blob:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    `connect-src ${previewOrigin}`,
    "form-action 'none'",
    "base-uri 'self'",
  ].join('; ');
}

function isLockedStarterDocument(html: string) {
  return (
    /private preview/i.test(html) &&
    /this route is replaced by the made solid studio builder\./i.test(html)
  );
}

const previewNavigationScript = `
  (() => {
    window.__siteforgePreviewNavigator = true;
    const revealDocument = () => {
      document.querySelector('[data-siteforge-preview-loading]')?.remove();
      document.documentElement.style.removeProperty('visibility');
    };
    if (document.readyState === 'complete') revealDocument();
    else window.addEventListener('load', revealDocument, { once: true });
    window.setTimeout(revealDocument, 5000);
    const base = new URL(document.baseURI);
    const root = base.pathname.endsWith('/') ? base.pathname : base.pathname + '/';
    document.addEventListener('click', async (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!target || target.target || target.hasAttribute('download')) return;
      const rawHref = target.getAttribute('href') || '';
      if (rawHref.startsWith('#')) {
        event.preventDefault();
        const targetId = decodeURIComponent(rawHref.slice(1));
        const section = targetId ? document.getElementById(targetId) : document.documentElement;
        section?.scrollIntoView({ block: 'start' });
        return;
      }
      const next = rawHref.startsWith('/')
        ? new URL(rawHref.replace(/^\\/+/, ''), base)
        : new URL(target.href, document.baseURI);
      if (next.origin !== base.origin || !next.pathname.startsWith(root)) return;
      event.preventDefault();
      document.documentElement.setAttribute('aria-busy', 'true');
      try {
        const documentUrl = new URL(next);
        documentUrl.searchParams.set('render', 'srcdoc');
        const response = await fetch(documentUrl);
        if (!response.ok) throw new Error('The requested preview page is unavailable.');
        const payload = await response.json();
        if (!payload || typeof payload.html !== 'string' || !payload.html) {
          throw new Error('The requested preview page is invalid.');
        }
        if (window.parent !== window) {
          window.parent.postMessage(
            { type: 'siteforge-preview:navigated', href: next.href },
            '*',
          );
        }
        document.open();
        document.write(payload.html);
        document.close();
      } catch (error) {
        document.documentElement.removeAttribute('aria-busy');
        console.error(
          error instanceof Error ? error.message : 'The requested preview page could not be loaded.',
        );
      }
    }, true);
  })();
`;

// Artifact metadata is user-worker supplied and may be absent or stale for an
// existing frozen draft. The path is the authoritative source for the browser
// MIME type, otherwise a valid HTML document can be served as plain text.
function contentTypeFor(filePath: string) {
  const extension = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  return (
    {
      '.avif': 'image/avif',
      '.css': 'text/css; charset=utf-8',
      '.gif': 'image/gif',
      '.html': 'text/html; charset=utf-8',
      '.ico': 'image/x-icon',
      '.jpeg': 'image/jpeg',
      '.jpg': 'image/jpeg',
      '.js': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.md': 'text/markdown; charset=utf-8',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
      '.txt': 'text/plain; charset=utf-8',
      '.webp': 'image/webp',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
    }[extension] || 'application/octet-stream'
  );
}

function previewFileCandidates(filePath: string) {
  const normalized = filePath.replace(/\/+$/, '') || 'index.html';
  const candidates = [normalized];
  if (!normalized.includes('.')) {
    candidates.push(`${normalized}/index.html`);
    candidates.push(`${normalized}.html`);
    if (normalized.includes('/')) candidates.push(`${normalized.replaceAll('/', '--')}.html`);
  }
  return candidates.filter((candidate, index) => candidates.indexOf(candidate) === index);
}

function rewritePreviewRootReferences(source: string, base: string) {
  return source
    .replace(
      /(\b(?:href|src|action)=["'])\/(?!\/)/gi,
      (_match, prefix: string) => `${prefix}${base}`,
    )
    .replace(
      /(\\"|\\')\/(?=(?:_next|assets)\b)/g,
      (_match, escapedQuote: string) => `${escapedQuote}${base}`,
    )
    .replace(/url\(\s*(["']?)\/(?!\/)/gi, (_match, quote: string) => `url(${quote}${base}`);
}

function rewritePreviewRuntimeReferences(source: string, base: string) {
  return rewritePreviewRootReferences(source, base)
    .replace(
      /(\.p\s*=\s*["'])\/_next\//g,
      (_match, assignment: string) => `${assignment}${base}_next/`,
    )
    .replace(/(["'])\/assets\//g, (_match, quote: string) => `${quote}${base}assets/`);
}

Deno.serve(async (request) => {
  if (request.method !== 'GET' && request.method !== 'HEAD')
    return response(405, 'Method not allowed');
  const parsed = parseRequest(request);
  if (!parsed) return response(404);

  const hash = await tokenHash(parsed.token);
  const { data: access, error: accessError } = await client
    .from('builder_preview_access')
    .select('expires_at, revoked_at, builder_run_id, preview_mode')
    .eq('builder_run_id', parsed.runId)
    .eq('token_hash', hash)
    .is('revoked_at', null)
    .maybeSingle();
  if (
    accessError ||
    !access ||
    access.preview_mode !== parsed.previewMode ||
    new Date(access.expires_at).getTime() <= Date.now()
  )
    return response(404);

  const { data: run, error: runError } = await client
    .from('builder_runs')
    .select('organization_id, status')
    .eq('id', parsed.runId)
    .maybeSingle();
  if (
    runError ||
    !run ||
    (parsed.previewMode === 'ready' &&
      run.status !== 'ready' &&
      run.status !== 'review_required') ||
    (parsed.previewMode === 'draft' &&
      run.status !== 'running' &&
      run.status !== 'paused' &&
      run.status !== 'failed' &&
      run.status !== 'cancelled')
  ) {
    return response(404);
  }

  if (parsed.filePath === '__siteforge_preview_navigation__.js') {
    return new Response(previewNavigationScript, {
      headers: {
        'access-control-allow-origin': '*',
        'cache-control': 'no-store, private',
        'content-type': 'text/javascript; charset=utf-8',
        'content-security-policy': previewCsp(),
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'no-referrer',
      },
    });
  }

  const artifactKind = parsed.previewMode === 'draft' ? 'draft_file' : 'site_file';
  const artifactPrefix = parsed.previewMode === 'draft' ? 'draft' : 'site';
  let resolvedFilePath: string | undefined;
  let storagePath: string | undefined;
  for (const candidate of previewFileCandidates(parsed.filePath)) {
    const candidateStoragePath = `${run.organization_id}/builder-runs/${parsed.runId}/${artifactPrefix}/${candidate}`;
    const { data: artifact, error: artifactError } = await client
      .from('builder_artifacts')
      .select('id')
      .eq('builder_run_id', parsed.runId)
      .eq('kind', artifactKind)
      .eq('storage_path', candidateStoragePath)
      .maybeSingle();
    if (artifactError) return response(404);
    if (artifact) {
      resolvedFilePath = candidate;
      storagePath = candidateStoragePath;
      break;
    }
  }
  if (!resolvedFilePath || !storagePath) return response(404);

  const { data: file, error: downloadError } = await client.storage
    .from('siteforge-artifacts')
    .download(storagePath);
  if (downloadError || !file) return response(404);

  const headers = new Headers({
    'access-control-allow-origin': '*',
    'cache-control': 'no-store, private',
    'content-security-policy': previewCsp(),
    'content-type': contentTypeFor(resolvedFilePath),
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
  });
  if (request.method === 'HEAD') return new Response(null, { headers });

  if (resolvedFilePath.toLowerCase().endsWith('.html')) {
    const draftPrefix = parsed.previewMode === 'draft' ? '__draft__/' : '';
    const base = `${supabaseUrl}/functions/v1/siteforge-preview/${parsed.runId}/${parsed.token}/${draftPrefix}`;
    const navigationScript = `<script src="${base}__siteforge_preview_navigation__.js" defer></script>`;
    const loadingStyle =
      '<style data-siteforge-preview-loading="true">html{visibility:hidden}</style>';
    const source = await file.text();
    if (isLockedStarterDocument(source)) {
      return response(
        409,
        'This test saved the locked starter document instead of generated website output. Run a fresh test build before opening its private preview.',
      );
    }
    const rootedSource = rewritePreviewRootReferences(source, base);
    const htmlWithHead = rootedSource.replace(
      /<head(\s[^>]*)?>/i,
      (match) => `${match}${loadingStyle}<base href="${base}">${navigationScript}`,
    );
    const html =
      htmlWithHead === rootedSource
        ? `${loadingStyle}${navigationScript}${rootedSource}`
        : htmlWithHead;
    // Supabase Edge Functions intentionally rewrite HTML GET responses to
    // text/plain. The SiteForge shell requests this JSON representation and
    // renders it into its already-sandboxed iframe via srcDoc instead.
    if (wantsSandboxedDocument(request)) {
      headers.set('content-type', 'application/json; charset=utf-8');
      return new Response(JSON.stringify({ html }), { headers });
    }
    headers.set('content-type', 'text/plain; charset=utf-8');
    return new Response(html, { headers });
  }
  if (resolvedFilePath.toLowerCase().endsWith('.css')) {
    const draftPrefix = parsed.previewMode === 'draft' ? '__draft__/' : '';
    const base = `${supabaseUrl}/functions/v1/siteforge-preview/${parsed.runId}/${parsed.token}/${draftPrefix}`;
    return new Response(rewritePreviewRootReferences(await file.text(), base), { headers });
  }
  if (resolvedFilePath.toLowerCase().endsWith('.js')) {
    const draftPrefix = parsed.previewMode === 'draft' ? '__draft__/' : '';
    const base = `${supabaseUrl}/functions/v1/siteforge-preview/${parsed.runId}/${parsed.token}/${draftPrefix}`;
    return new Response(rewritePreviewRuntimeReferences(await file.text(), base), { headers });
  }
  return new Response(file.stream(), { headers });
});
