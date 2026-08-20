/* global chrome */

const allowedLocalHosts = new Set(['localhost', '127.0.0.1']);

function isAllowedStudioUrl(value) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'http:' && allowedLocalHosts.has(url.hostname)) ||
      (url.protocol === 'https:' && url.hostname.endsWith('-5173.app.github.dev'))
    );
  } catch {
    return false;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'capture-visible-tab' || !isAllowedStudioUrl(sender.url)) return false;
  if (!Number.isInteger(sender.tab?.windowId)) {
    sendResponse({ detail: 'The active Made Solid Studio tab could not be identified.' });
    return false;
  }
  chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' }, (screenshot) => {
    const detail = chrome.runtime.lastError?.message;
    if (detail || !screenshot) {
      sendResponse({ detail: detail || 'Chrome could not capture this tab.' });
      return;
    }
    sendResponse({ screenshot });
  });
  return true;
});
