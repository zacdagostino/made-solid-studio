import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';

function codespaceName(hostname: string) {
  return /^(.+)-\d+\.app\.github\.dev$/.exec(hostname)?.[1];
}

function isWorkspaceCapabilityPreview(url: URL) {
  const configuredOrigin =
    import.meta.env.VITE_SITEFORGE_PREVIEW_ORIGIN?.trim() || 'https://preview.madesolid.com.au';
  try {
    const expectedOrigin = new URL(configuredOrigin);
    const parts = url.pathname.split('/').filter(Boolean);
    return (
      expectedOrigin.protocol === 'https:' &&
      expectedOrigin.href === `${expectedOrigin.origin}/` &&
      url.origin === expectedOrigin.origin &&
      !url.username &&
      !url.password &&
      parts[0] === '__made-solid' &&
      parts[1] === 'workspace-frame' &&
      /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(parts[2] || '') &&
      /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(parts[3] || '')
    );
  } catch {
    return false;
  }
}

function isAllowedDevelopmentPreview(url: URL) {
  if (isWorkspaceCapabilityPreview(url)) return true;
  if (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
    return true;
  }
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.app.github.dev')) return false;
  const sourceCodespace = codespaceName(url.hostname);
  const studioCodespace = codespaceName(window.location.hostname);
  return Boolean(sourceCodespace && studioCodespace && sourceCodespace === studioCodespace);
}

function previewRoute() {
  return new URLSearchParams(window.location.hash.slice('#/preview?'.length));
}

function isSavedPreview(url: URL) {
  return (
    url.protocol === 'https:' &&
    url.hostname.endsWith('.supabase.co') &&
    url.pathname.startsWith('/functions/v1/siteforge-preview/')
  );
}

function previewSourceUrl() {
  const source = previewRoute().get('source');
  if (!source) return undefined;
  try {
    const url = new URL(source);
    if (!isSavedPreview(url) && !isAllowedDevelopmentPreview(url)) {
      return undefined;
    }
    return url;
  } catch {
    return undefined;
  }
}

export function previewReturnRoute() {
  const route = previewRoute().get('return');
  if (!route?.startsWith('/') || route.startsWith('//') || route.length > 2_000) {
    return '/prospects';
  }
  return route;
}

export function previewWorkspaceDirectory() {
  const directory = previewRoute().get('workspace') ?? '';
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(directory) ? directory : undefined;
}

function shellUrl(source: URL, returnRoute: string, workspaceDirectory?: string) {
  const query = new URLSearchParams({ source: source.href, return: returnRoute });
  if (workspaceDirectory) query.set('workspace', workspaceDirectory);
  return `#/preview?${query.toString()}`;
}

function previewDocumentUrl(source: URL) {
  const url = new URL(source);
  url.searchParams.set('render', 'srcdoc');
  return url;
}

function previewDocumentFromResponse(payload: unknown) {
  if (typeof payload !== 'object' || payload === null) return undefined;
  const html = (payload as { html?: unknown }).html;
  return typeof html === 'string' && html.length ? html : undefined;
}

export function preparePreviewFrameDocument(html: string, source: URL) {
  const sourceHref = JSON.stringify(source.href).replaceAll('<', '\\u003c');
  const runtimeBootstrap = `<script data-siteforge-preview-runtime-bootstrap>
    (() => {
      if (window.__siteforgePreviewNativeUrl) return;
      const NativeUrl = window.URL;
      window.__siteforgePreviewNativeUrl = NativeUrl;
      window.URL = new Proxy(NativeUrl, {
        construct(Target, argumentsList) {
          const [input, base] = argumentsList;
          const resolvedBase =
            typeof base === 'string' && base.startsWith('about:srcdoc') ? ${sourceHref} : base;
          return Reflect.construct(
            Target,
            resolvedBase === undefined ? [input] : [input, resolvedBase],
          );
        },
      });
      for (const method of ['pushState', 'replaceState']) {
        const nativeMethod = window.history[method].bind(window.history);
        window.history[method] = (state, unused, url) => {
          try {
            return nativeMethod(state, unused, url);
          } catch (error) {
            if (!window.location.href.startsWith('about:srcdoc')) throw error;
            return nativeMethod(state, unused);
          }
        };
      }
    })();
  </script>`;
  if (/<head(\s[^>]*)?>/i.test(html)) {
    return html.replace(/<head(\s[^>]*)?>/i, (head) => `${head}${runtimeBootstrap}`);
  }
  return `${runtimeBootstrap}${html}`;
}

function previewCapabilityRoot(source: URL) {
  const parts = source.pathname.split('/').filter(Boolean);
  const previewIndex = parts.indexOf('siteforge-preview');
  if (previewIndex === -1 || !parts[previewIndex + 1] || !parts[previewIndex + 2]) return undefined;
  const includesDraftPrefix = parts[previewIndex + 3] === '__draft__';
  const rootParts = parts.slice(0, previewIndex + (includesDraftPrefix ? 4 : 3));
  return `/${rootParts.join('/')}/`;
}

export function PreviewFrame() {
  const [source, setSource] = useState(previewSourceUrl);
  const [returnRoute] = useState(previewReturnRoute);
  const [workspaceDirectory] = useState(previewWorkspaceDirectory);
  const [isLoading, setIsLoading] = useState(Boolean(source));
  const [error, setError] = useState<string>();
  const [document, setDocument] = useState<string>();

  function returnToStudio() {
    if (window.top && window.top !== window) {
      window.top.location.href = new URL(`#${returnRoute}`, window.location.origin).href;
      return;
    }
    window.history.replaceState(null, '', `#${returnRoute}`);
    window.location.reload();
  }

  useEffect(() => {
    if (!source) {
      setError(
        'This private preview link is invalid. Return to Made Solid Studio and open it again.',
      );
    } else {
      setError(undefined);
      setIsLoading(true);
      setDocument(undefined);
    }
  }, [source]);

  useEffect(() => {
    if (!source) return;
    if (isAllowedDevelopmentPreview(source)) {
      setDocument(undefined);
      setIsLoading(true);
      return;
    }
    const controller = new AbortController();
    void fetch(previewDocumentUrl(source), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('The private preview is unavailable or has expired.');
        const payload = previewDocumentFromResponse(await response.json());
        if (!payload) throw new Error('The private preview document could not be loaded.');
        return payload;
      })
      .then((html) => {
        if (!controller.signal.aborted) setDocument(preparePreviewFrameDocument(html, source));
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          cause instanceof Error ? cause.message : 'The private preview could not be loaded.',
        );
        setIsLoading(false);
      });
    return () => controller.abort();
  }, [source]);

  useEffect(() => {
    if (!source) return;
    const root = previewCapabilityRoot(source);
    if (!root) return;
    const navigate = (event: MessageEvent<unknown>) => {
      if (typeof event.data !== 'object' || event.data === null) return;
      const message = event.data as { type?: unknown; href?: unknown };
      if (
        message.type !== 'siteforge-preview:navigate' &&
        message.type !== 'siteforge-preview:navigated'
      )
        return;
      if (typeof message.href !== 'string') return;
      try {
        const next = new URL(message.href);
        if (next.origin !== source.origin || !next.pathname.startsWith(root)) return;
        next.hash = '';
        window.history.replaceState(null, '', `#/preview?source=${encodeURIComponent(next.href)}`);
        if (message.type === 'siteforge-preview:navigated') return;
        setIsLoading(true);
        setError(undefined);
        setSource(next);
      } catch {
        // Ignore malformed messages from the sandboxed preview document.
      }
    };
    window.addEventListener('message', navigate);
    return () => window.removeEventListener('message', navigate);
  }, [source]);

  if (error)
    return (
      <main className="preview-message">
        <h1>Preview unavailable</h1>
        <p>{error}</p>
        <a
          href={`#${returnRoute}`}
          onClick={(event) => {
            event.preventDefault();
            returnToStudio();
          }}
        >
          Return to Made Solid Studio
        </a>
      </main>
    );
  if (!source)
    return (
      <main className="preview-message">
        <h1>Preview unavailable</h1>
        <p>This private preview link is invalid. Return to Made Solid Studio and open it again.</p>
      </main>
    );
  return (
    <main
      aria-busy={isLoading}
      aria-label="Client website workspace"
      className="private-preview-shell"
    >
      <header className="private-preview-toolbar">
        <a
          className="private-preview-toolbar__return"
          href={`#${returnRoute}`}
          onClick={(event) => {
            event.preventDefault();
            returnToStudio();
          }}
        >
          <ArrowLeft aria-hidden="true" size={18} />
          Back to Studio
        </a>
        <span>Client website workspace</span>
      </header>
      {isLoading ? (
        <div className="private-preview-loader" role="status">
          <p>Loading private preview…</p>
        </div>
      ) : null}
      {document ? (
        <iframe
          className="private-preview-frame"
          onError={() => setError('The private preview is unavailable or has expired.')}
          onLoad={() => setIsLoading(false)}
          sandbox="allow-scripts allow-top-navigation-by-user-activation"
          srcDoc={document}
          title="Private website preview"
        />
      ) : isAllowedDevelopmentPreview(source) ? (
        <iframe
          className="private-preview-frame"
          onError={() => setError('The development website preview is unavailable.')}
          onLoad={() => {
            setIsLoading(false);
            if (!source.searchParams.has('access')) return;
            const cleanSource = new URL(source);
            cleanSource.searchParams.delete('access');
            window.history.replaceState(
              null,
              '',
              shellUrl(cleanSource, returnRoute, workspaceDirectory),
            );
            setSource(cleanSource);
          }}
          sandbox="allow-forms allow-modals allow-popups allow-same-origin allow-scripts"
          src={source.href}
          title="Prospect development website preview"
        />
      ) : null}
    </main>
  );
}
