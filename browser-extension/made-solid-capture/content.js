/* global chrome, window */

const source = 'made-solid-browser-capture';
const localHosts = new Set(['localhost', '127.0.0.1']);
const isStudio =
  (window.location.protocol === 'http:' && localHosts.has(window.location.hostname)) ||
  (window.location.protocol === 'https:' &&
    window.location.hostname.endsWith('-5173.app.github.dev'));

if (isStudio) {
  window.addEventListener('message', (event) => {
    if (event.source !== window || event.data?.source !== source) return;
    const { requestId, type } = event.data;
    if (type === 'ping') {
      window.postMessage({ source, type: 'ping-result', requestId }, window.location.origin);
      return;
    }
    if (type !== 'capture') return;
    chrome.runtime.sendMessage({ type: 'capture-visible-tab' }, (result) => {
      window.postMessage(
        {
          source,
          type: 'capture-result',
          requestId,
          screenshot: result?.screenshot,
          detail: chrome.runtime.lastError?.message || result?.detail,
        },
        window.location.origin,
      );
    });
  });
}
