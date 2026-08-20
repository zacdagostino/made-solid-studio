const frameId = 'made-solid-codex-panel';

export function WorkspaceCodexPanel() {
  const configuredOrigin = process.env.MADE_SOLID_STUDIO_ORIGIN;
  if (!configuredOrigin) return null;
  let source: URL;
  try {
    source = new URL(configuredOrigin);
    if (source.protocol !== 'http:' && source.protocol !== 'https:') return null;
  } catch {
    return null;
  }
  source.hash = '/codex-panel';
  return (
    <iframe
      allow="display-capture"
      aria-label="Made Solid Codex chat"
      data-made-solid-codex-panel
      id={frameId}
      src={source.href}
      style={{
        background: 'transparent',
        border: 0,
        bottom: 0,
        colorScheme: 'dark',
        height: 68,
        maxWidth: '100vw',
        position: 'fixed',
        right: 0,
        width: 68,
        zIndex: 2147483647,
      }}
      title="Made Solid Codex chat"
    />
  );
}
