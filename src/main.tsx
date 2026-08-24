import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { PreviewFrame, previewWorkspaceDirectory } from './PreviewFrame';
import { restoreLegacyWorkspacePreviewRoute } from './WorkspacePreviewAccess';
import { AuthenticatedCodexFeedbackPanel } from './components/AuthenticatedCodexFeedbackPanel';
import { installStudioHotUpdateNotifications } from './lib/studio-hot-update';
import { restoreWorkspaceRouteQuery } from './lib/studio-surface';
import './styles.css';

restoreWorkspaceRouteQuery();
restoreLegacyWorkspacePreviewRoute();

const removeStudioHotUpdateNotifications = installStudioHotUpdateNotifications();
if (import.meta.hot) {
  import.meta.hot.dispose(removeStudioHotUpdateNotifications);
}

const isPreviewRoute = window.location.hash.startsWith('#/preview?');
const isCodexPanelRoute = window.location.hash.startsWith('#/codex-panel');
const codexPanelDirectory = (() => {
  if (!isCodexPanelRoute) return undefined;
  const query = new URLSearchParams(window.location.hash.slice('#/codex-panel?'.length));
  const directory = query.get('workspace') ?? '';
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(directory) ? directory : undefined;
})();
const workspaceDirectory = isCodexPanelRoute
  ? codexPanelDirectory
  : isPreviewRoute
    ? previewWorkspaceDirectory()
    : undefined;

if (isCodexPanelRoute) {
  document.documentElement.dataset.codexPanel = 'embedded';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isCodexPanelRoute ? null : isPreviewRoute ? <PreviewFrame /> : <App />}
    {isCodexPanelRoute || isPreviewRoute ? (
      <AuthenticatedCodexFeedbackPanel
        embedded={isCodexPanelRoute}
        workspaceDirectory={workspaceDirectory}
      />
    ) : null}
  </StrictMode>,
);
