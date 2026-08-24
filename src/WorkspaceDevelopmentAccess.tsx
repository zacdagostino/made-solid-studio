import { useEffect, useState } from 'react';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { ButtonLink } from './components/ui';
import { studioRuntimeFetch } from './lib/studio-runtime';
import { developmentStudioUrl } from './lib/studio-surface';

type WorkspaceDevelopmentAccessResponse = {
  detail?: unknown;
  status?: unknown;
  workspaceUrl?: unknown;
};

export function workspaceDevelopmentReturnPath(hash = window.location.hash) {
  if (!hash.startsWith('#/workspace-development-access?')) return '/';
  const query = new URLSearchParams(hash.slice('#/workspace-development-access?'.length));
  const value = query.get('path') ?? '/';
  if (!value.startsWith('/') || value.startsWith('//') || value.length > 2_000) return '/';
  try {
    const requested = new URL(value, 'https://workspace.madesolid.com.au');
    if (requested.origin !== 'https://workspace.madesolid.com.au') return '/';
    return `${requested.pathname}${requested.search}${requested.hash}`;
  } catch {
    return '/';
  }
}

export function workspaceDevelopmentDestination(workspaceUrl: unknown, returnPath: string) {
  if (typeof workspaceUrl !== 'string') return undefined;
  try {
    const expectedOrigin = new URL(developmentStudioUrl('#/prospects')).origin;
    const access = new URL(workspaceUrl);
    if (
      access.protocol !== 'https:' ||
      access.origin !== expectedOrigin ||
      access.pathname !== '/' ||
      access.hash ||
      access.username ||
      access.password ||
      !access.searchParams.get('access') ||
      [...access.searchParams.keys()].some((key) => key !== 'access')
    ) {
      return undefined;
    }
    const requested = new URL(returnPath, expectedOrigin);
    if (requested.origin !== expectedOrigin) return undefined;
    const token = access.searchParams.get('access');
    access.pathname = requested.pathname;
    access.search = requested.search;
    if (token) access.searchParams.set('access', token);
    access.hash = requested.hash;
    return access.href;
  } catch {
    return undefined;
  }
}

export function WorkspaceDevelopmentAccess({ returnPath }: { returnPath: string }) {
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void studioRuntimeFetch('/__made-solid/workspace-development-access', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => undefined)) as
          WorkspaceDevelopmentAccessResponse | undefined;
        if (!response.ok || !payload) {
          throw new Error(
            typeof payload?.detail === 'string'
              ? payload.detail
              : 'Development Workspace access is unavailable.',
          );
        }
        const destination = workspaceDevelopmentDestination(payload.workspaceUrl, returnPath);
        if (!destination) {
          throw new Error('Studio did not return a valid Development Workspace destination.');
        }
        if (active) window.location.replace(destination);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error ? cause.message : 'Development Workspace access is unavailable.',
          );
        }
      });
    return () => {
      active = false;
    };
  }, [returnPath]);

  return (
    <section className="workspace-development-access" aria-labelledby="workspace-access-title">
      {error ? (
        <>
          <h1 id="workspace-access-title">Development Workspace unavailable</h1>
          <p role="alert">{error}</p>
          <ButtonLink href="#/prospects" variant="secondary">
            <ArrowLeft aria-hidden="true" size={17} />
            Return to prospects
          </ButtonLink>
        </>
      ) : (
        <>
          <LoaderCircle aria-hidden="true" className="spin" size={22} />
          <h1 id="workspace-access-title">Opening Development Workspace</h1>
          <p role="status">Verifying owner access and returning to the same Studio route…</p>
        </>
      )}
    </section>
  );
}
