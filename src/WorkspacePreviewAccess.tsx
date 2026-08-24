import { useEffect, useState } from 'react';
import { studioRuntimeFetch } from './lib/studio-runtime';

type WorkspacePreviewAccessResponse = {
  detail?: unknown;
  directory?: unknown;
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

export function workspacePreviewStudioRoute(hash = window.location.hash) {
  if (!hash.startsWith('#/workspace-preview-access')) return '/prospects';
  const query = new URLSearchParams(hash.slice('#/workspace-preview-access?'.length));
  const value = query.get('return') ?? '/prospects';
  return value.startsWith('/') && !value.startsWith('//') && value.length <= 2_000
    ? value
    : '/prospects';
}

export function workspacePreviewDirectory(hash = window.location.hash) {
  if (!hash.startsWith('#/workspace-preview-access')) return undefined;
  const query = new URLSearchParams(hash.slice('#/workspace-preview-access?'.length));
  const value = query.get('workspace') ?? '';
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(value) ? value : undefined;
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

export function workspaceEditorDestination(
  previewUrl: string,
  returnPath: string,
  studioRoute = '/prospects',
  workspaceDirectory?: string,
) {
  const destination = new URL(previewDestination(previewUrl, returnPath));
  if (workspaceDirectory) {
    destination.searchParams.set('__made_solid_workspace', workspaceDirectory);
  }
  destination.searchParams.set('__made_solid_return', studioRoute);
  return destination.href;
}

export function WorkspacePreviewAccess() {
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const requestedDirectory = workspacePreviewDirectory();
    if (!requestedDirectory) {
      window.location.replace('/#/prospects');
      return () => {
        active = false;
      };
    }
    const accessUrl = new URL('/__made-solid/workspace-preview-access', window.location.origin);
    accessUrl.searchParams.set('directory', requestedDirectory);
    void studioRuntimeFetch(`${accessUrl.pathname}${accessUrl.search}`)
      .then(async (response) => {
        const payload = (await response.json()) as WorkspacePreviewAccessResponse;
        if (!response.ok || typeof payload.previewUrl !== 'string') {
          throw new Error(
            typeof payload.detail === 'string'
              ? payload.detail
              : 'The workspace preview could not be opened.',
          );
        }
        const directory =
          typeof payload.directory === 'string' &&
          /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(payload.directory)
            ? payload.directory
            : undefined;
        if (directory !== requestedDirectory) {
          throw new Error('The workspace access response did not match the requested client.');
        }
        if (active) {
          window.location.replace(
            workspaceEditorDestination(
              payload.previewUrl,
              workspacePreviewReturnPath(),
              workspacePreviewStudioRoute(),
              directory,
            ),
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
