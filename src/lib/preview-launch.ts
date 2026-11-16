function previewLaunchDocument(websiteName: string) {
  const escapedName = websiteName
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
    <title>Preparing ${escapedName}</title>
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #171717;
        background: #f7f7f5;
      }
      * { box-sizing: border-box; }
      body {
        min-height: 100dvh;
        margin: 0;
        display: grid;
        place-items: center;
        padding: 24px;
      }
      main {
        width: min(100%, 32rem);
        display: grid;
        justify-items: center;
        gap: 12px;
        text-align: center;
      }
      .preview-launch__mark {
        width: 40px;
        height: 40px;
        border: 3px solid #d7d7d2;
        border-top-color: #171717;
        border-radius: 50%;
        animation: preview-launch-spin 0.8s linear infinite;
      }
      h1 { margin: 4px 0 0; font-size: 1.25rem; line-height: 1.3; }
      p { margin: 0; color: #5d5d58; line-height: 1.55; }
      @keyframes preview-launch-spin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) {
        .preview-launch__mark { animation: none; border-top-color: #d7d7d2; }
      }
    </style>
  </head>
  <body>
    <main>
      <span aria-hidden="true" class="preview-launch__mark"></span>
      <h1>Preparing device preview</h1>
      <p aria-live="polite" role="status">Creating secure private access for ${escapedName}…</p>
    </main>
  </body>
</html>`;
}

export function openPreviewTab(websiteName: string) {
  const documentUrl = URL.createObjectURL(
    new Blob([previewLaunchDocument(websiteName)], { type: 'text/html' }),
  );
  const previewTab = window.open(documentUrl, '_blank');
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    URL.revokeObjectURL(documentUrl);
  };
  if (!previewTab) release();
  return { previewTab, release };
}
