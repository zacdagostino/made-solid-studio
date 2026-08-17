(() => {
  const frame = document.querySelector('[data-made-solid-codex-panel]');
  if (!(frame instanceof HTMLIFrameElement)) return;
  const trustedOrigin = new URL(frame.src).origin;
  frame.dataset.bridgeReady = 'true';
  let contextFrame;
  function shareWorkspaceContext() {
    cancelAnimationFrame(contextFrame);
    contextFrame = requestAnimationFrame(() => {
      frame.contentWindow?.postMessage(
        {
          source: 'made-solid-codex-host',
          url: window.location.href,
          title: document.title,
          scrollX: window.scrollX,
          scrollY: window.scrollY,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        },
        trustedOrigin,
      );
    });
  }
  frame.addEventListener('load', shareWorkspaceContext);
  window.addEventListener('resize', shareWorkspaceContext);
  window.addEventListener('scroll', shareWorkspaceContext, { passive: true });
  shareWorkspaceContext();
  window.addEventListener('message', (event) => {
    if (
      event.origin !== trustedOrigin ||
      event.source !== frame.contentWindow ||
      event.data?.source !== 'made-solid-codex-panel'
    )
      return;
    const open = event.data.open === true;
    const expanded = event.data.expanded === true;
    frame.style.width = expanded ? '100vw' : open ? 'min(444px, 100vw)' : '68px';
    frame.style.height = expanded ? '100dvh' : open ? 'min(744px, 100dvh)' : '68px';
  });
})();
