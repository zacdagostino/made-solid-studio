import { useEffect, useState } from 'react';

function previewSourceUrl() {
  const query = window.location.hash.slice('#/preview?'.length);
  const source = new URLSearchParams(query).get('source');
  if (!source) return undefined;
  try {
    const url = new URL(source);
    if (
      url.protocol !== 'https:' ||
      !url.hostname.endsWith('.supabase.co') ||
      !url.pathname.startsWith('/functions/v1/siteforge-preview/')
    ) {
      return undefined;
    }
    return url;
  } catch {
    return undefined;
  }
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

export function PreviewFrame() {
  const [source, setSource] = useState(previewSourceUrl);
  const [isLoading, setIsLoading] = useState(Boolean(source));
  const [error, setError] = useState<string>();
  const [document, setDocument] = useState<string>();

  useEffect(() => {
    if (!source) {
      setError('This private preview link is invalid. Return to SiteForge and open it again.');
    } else {
      setError(undefined);
      setIsLoading(true);
      setDocument(undefined);
    }
  }, [source]);

  useEffect(() => {
    if (!source) return;
    const controller = new AbortController();
    void fetch(previewDocumentUrl(source), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('The private preview is unavailable or has expired.');
        const payload = previewDocumentFromResponse(await response.json());
        if (!payload) throw new Error('The private preview document could not be loaded.');
        return payload;
      })
      .then((html) => {
        if (!controller.signal.aborted) setDocument(html);
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
    const root = source.pathname.slice(0, source.pathname.lastIndexOf('/') + 1);
    const navigate = (event: MessageEvent<unknown>) => {
      if (typeof event.data !== 'object' || event.data === null) return;
      const message = event.data as { type?: unknown; href?: unknown };
      if (message.type !== 'siteforge-preview:navigate' || typeof message.href !== 'string') return;
      try {
        const next = new URL(message.href);
        if (next.origin !== source.origin || !next.pathname.startsWith(root)) return;
        next.hash = '';
        window.history.replaceState(null, '', `#/preview?source=${encodeURIComponent(next.href)}`);
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
      </main>
    );
  if (!source)
    return (
      <main className="preview-message">
        <h1>Preview unavailable</h1>
        <p>This private preview link is invalid. Return to SiteForge and open it again.</p>
      </main>
    );
  return (
    <main aria-busy={isLoading} className="private-preview-shell">
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
      ) : null}
    </main>
  );
}
