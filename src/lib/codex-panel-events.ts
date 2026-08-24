export const openCodexPanelEvent = 'made-solid:open-codex-panel';

export function openCodexPanel() {
  window.dispatchEvent(new Event(openCodexPanelEvent));
}
