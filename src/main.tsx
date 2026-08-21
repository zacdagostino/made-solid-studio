import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { PreviewFrame } from './PreviewFrame';
import { WorkspacePreviewAccess } from './WorkspacePreviewAccess';
import { CodexFeedbackPanel } from './components/CodexFeedbackPanel';
import './styles.css';

const isPreviewRoute = window.location.hash.startsWith('#/preview?');
const isWorkspacePreviewAccessRoute = window.location.hash.startsWith('#/workspace-preview-access');
const isCodexPanelRoute = window.location.hash === '#/codex-panel';

if (isCodexPanelRoute) {
  document.documentElement.dataset.codexPanel = 'embedded';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isCodexPanelRoute ? null : isPreviewRoute ? (
      <PreviewFrame />
    ) : isWorkspacePreviewAccessRoute ? (
      <WorkspacePreviewAccess />
    ) : (
      <App />
    )}
    <CodexFeedbackPanel embedded={isCodexPanelRoute} />
  </StrictMode>,
);
