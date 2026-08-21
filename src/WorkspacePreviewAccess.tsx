import { useEffect, useState } from 'react';
import { studioRuntimeFetch } from './lib/studio-runtime';

type WorkspacePreviewAccessResponse = {
  detail?: unknown;
  previewUrl?: unknown;
};

export function workspacePreviewReturnPath(hash = window.location.hash) {
  if (!hash.startsWith('#/workspace-preview-access')) return '/';
  const query = new URLSearchParams(hash.slice('#/workspace-preview-access?'.length));
  const value = query.get('path') ?? '/';
  if (!value.startsWith('/') || value.startsWith('//') || value.length > 2_000) return '/';
  const parsed = new URL(value, 'https://workspace.madesolid.invalid');
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

function previewDestination(previewUrl: string, returnPath: string) {
  const destination = new URL(previewUrl);
  const access = destination.searchParams.get('access');
  const requested = new URL(returnPath, destination.origin);
  if (requested.origin !== destination.origin) return destination.href;
  destination.pathname = requested.pathname;
  destination.search = requested.search;
  if (access) destination.searchParams.set('access', access);
  destination.hash = requested.hash;
  return destination.href;
}

export function WorkspacePreviewAccess() {
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void studioRuntimeFetch('/__made-solid/workspace-preview-access')
      .then(async (response) => {
        const payload = (await response.json()) as WorkspacePreviewAccessResponse;
        if (!response.ok || typeof payload.previewUrl !== 'string') {
          throw new Error(
            typeof payload.detail === 'string'
              ? payload.detail
              : 'The workspace preview could not be opened.',
          );
        }
        if (active) {
          window.location.replace(
            previewDestination(payload.previewUrl, workspacePreviewReturnPath()),
          );
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : 'The workspace preview could not be opened.',
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="preview-message">
      {error ? (
        <>
          <h1>Workspace preview unavailable</h1>
          <p>{error}</p>
          <a href="/#/prospects">Return to Made Solid Studio</a>
        </>
      ) : (
        <p role="status">Opening your private workspace preview…</p>
      )}
    </main>
  );
}
