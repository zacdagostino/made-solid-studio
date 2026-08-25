import {
  ArrowUpRight,
  CheckCircle2,
  Code2,
  GitBranch,
  Globe2,
  LoaderCircle,
  RefreshCw,
  Rocket,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { studioRuntimeFetch } from '../lib/studio-runtime';
import { developmentStudioUrl, isDevelopmentStudio } from '../lib/studio-surface';
import { Button, ButtonGroup, ButtonLink, Eyebrow, StatusBadge } from './ui';
import './DevelopmentPage.css';

type ProjectChange = { path: string; status: string };
type ProjectRelease = {
  commit: string;
  shortCommit: string;
  title: string;
  createdAt: string;
};
type DevelopmentProject = {
  branch: string;
  changes: ProjectChange[];
  developmentConfigured: boolean;
  developmentUrl: string;
  directory: string;
  dirty: boolean;
  head: string;
  id: 'studio' | 'website';
  name: string;
  productionUrl: string;
  releases: ProjectRelease[];
};

type ProjectResponse = {
  detail?: unknown;
  projects?: unknown;
  status?: unknown;
};

type PreviewResponse = {
  clientPreviewUrl?: unknown;
  detail?: unknown;
  directory?: unknown;
};

function validProjects(value: unknown): value is DevelopmentProject[] {
  return (
    Array.isArray(value) &&
    value.every(
      (project) =>
        project &&
        typeof project === 'object' &&
        (project.id === 'studio' || project.id === 'website') &&
        typeof project.name === 'string' &&
        typeof project.directory === 'string' &&
        typeof project.developmentUrl === 'string' &&
        typeof project.productionUrl === 'string' &&
        typeof project.branch === 'string' &&
        typeof project.head === 'string' &&
        typeof project.dirty === 'boolean' &&
        typeof project.developmentConfigured === 'boolean' &&
        Array.isArray(project.changes) &&
        Array.isArray(project.releases),
    )
  );
}

function projectPurpose(project: DevelopmentProject) {
  return project.id === 'studio'
    ? 'Develop the private operating system without changing the reviewed production Studio.'
    : 'Develop the public Made Solid website with production data, payments, email, and handoffs blocked.';
}

function changeLabel(status: string) {
  if (status.includes('?')) return 'New';
  if (status.includes('D')) return 'Deleted';
  if (status.includes('R')) return 'Renamed';
  if (status.includes('A')) return 'Added';
  return 'Changed';
}

function releaseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Saved version'
    : new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium' }).format(date);
}

export function DevelopmentPage() {
  const [projects, setProjects] = useState<DevelopmentProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openingWebsite, setOpeningWebsite] = useState(false);
  const [websitePreviewUrl, setWebsitePreviewUrl] = useState('');
  const onDevelopmentSurface = isDevelopmentStudio();

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await studioRuntimeFetch('/__made-solid/development-projects', {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      const payload = (await response.json().catch(() => undefined)) as ProjectResponse | undefined;
      if (!response.ok || !payload || !validProjects(payload.projects)) {
        throw new Error(
          typeof payload?.detail === 'string'
            ? payload.detail
            : 'Development project status is unavailable.',
        );
      }
      setProjects(payload.projects);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Development project status is unavailable.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  async function openWebsiteWorkspace(project: DevelopmentProject) {
    setOpeningWebsite(true);
    setError('');
    try {
      const access = new URL('/__made-solid/workspace-preview-access', window.location.origin);
      access.searchParams.set('directory', project.directory);
      const response = await studioRuntimeFetch(`${access.pathname}${access.search}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      const payload = (await response.json().catch(() => undefined)) as PreviewResponse | undefined;
      if (!response.ok || !payload || payload.directory !== project.directory) {
        throw new Error(
          typeof payload?.detail === 'string'
            ? payload.detail
            : 'The Made Solid website development server could not be opened.',
        );
      }
      const source = new URL(String(payload.clientPreviewUrl || ''));
      const configuredOrigin =
        import.meta.env.VITE_SITEFORGE_PREVIEW_ORIGIN?.trim() || 'https://preview.madesolid.com.au';
      if (
        source.origin !== new URL(configuredOrigin).origin ||
        !source.pathname.startsWith(
          `/__made-solid/workspace-frame/${encodeURIComponent(project.directory)}/`,
        )
      ) {
        throw new Error('The runtime returned an invalid development preview.');
      }
      setWebsitePreviewUrl(source.href);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'The Made Solid website development server could not be opened.',
      );
    } finally {
      setOpeningWebsite(false);
    }
  }

  return (
    <section aria-labelledby="development-page-title" className="development-page">
      <header className="development-page__header">
        <div>
          <Eyebrow>Development and releases</Eyebrow>
          <h1 id="development-page-title">Websites</h1>
          <p>
            Develop each product in its own repository, review exact versions, then promote a tested
            release without editing production in place.
          </p>
        </div>
        <Button disabled={loading} onClick={() => void loadProjects()} variant="secondary">
          {loading ? (
            <LoaderCircle aria-hidden="true" className="spin" size={16} />
          ) : (
            <RefreshCw aria-hidden="true" size={16} />
          )}
          Refresh status
        </Button>
      </header>

      <div className="development-page__safety" role="status">
        <ShieldCheck aria-hidden="true" size={19} />
        <div>
          <strong>Production remains isolated</strong>
          <span>
            workspace.madesolid.com.au stays available during migration. A development preview never
            becomes a public release automatically.
          </span>
        </div>
      </div>

      {error ? (
        <div className="development-page__error" role="alert">
          <TriangleAlert aria-hidden="true" size={19} />
          <span>{error}</span>
        </div>
      ) : null}

      {loading && projects.length === 0 ? (
        <div className="development-page__loading" role="status">
          <LoaderCircle aria-hidden="true" className="spin" size={19} />
          Reading the two repositories and their saved versions…
        </div>
      ) : (
        <div className="development-page__projects">
          {projects.map((project) => (
            <article className="development-project" key={project.id}>
              <header className="development-project__header">
                <span className="development-project__icon" aria-hidden="true">
                  {project.id === 'studio' ? <Code2 size={21} /> : <Globe2 size={21} />}
                </span>
                <div>
                  <h2>{project.name}</h2>
                  <p>{projectPurpose(project)}</p>
                </div>
                <StatusBadge tone={project.dirty ? 'warning' : 'success'}>
                  {project.dirty ? `${project.changes.length} unreleased` : 'Working tree clean'}
                </StatusBadge>
              </header>

              <dl className="development-project__urls">
                <div>
                  <dt>Development</dt>
                  <dd>
                    {project.developmentConfigured ? (
                      <a href={project.developmentUrl} rel="noreferrer" target="_blank">
                        {project.developmentUrl.replace(/^https:\/\//, '')}
                        <ArrowUpRight aria-hidden="true" size={14} />
                      </a>
                    ) : (
                      <span>{project.developmentUrl.replace(/^https:\/\//, '')}</span>
                    )}
                    <small>
                      {project.developmentConfigured
                        ? 'Connected development hostname'
                        : 'Planned hostname · external connection pending'}
                    </small>
                  </dd>
                </div>
                <div>
                  <dt>Production</dt>
                  <dd>
                    <a href={project.productionUrl} rel="noreferrer" target="_blank">
                      {project.productionUrl.replace(/^https:\/\//, '')}
                      <ArrowUpRight aria-hidden="true" size={14} />
                    </a>
                    <small>Exact reviewed release</small>
                  </dd>
                </div>
                <div>
                  <dt>Source</dt>
                  <dd>
                    <span>
                      <GitBranch aria-hidden="true" size={14} /> {project.branch}
                    </span>
                    <small>{project.head.slice(0, 8)}</small>
                  </dd>
                </div>
              </dl>

              <ButtonGroup className="development-project__actions">
                {project.id === 'studio' ? (
                  onDevelopmentSurface ? (
                    <ButtonLink href={developmentStudioUrl('#/development')} variant="secondary">
                      <CheckCircle2 aria-hidden="true" size={16} />
                      Development Studio open
                    </ButtonLink>
                  ) : (
                    <ButtonLink href={developmentStudioUrl('#/development')} variant="primary">
                      Open Development Studio <ArrowUpRight aria-hidden="true" size={16} />
                    </ButtonLink>
                  )
                ) : onDevelopmentSurface ? (
                  <Button
                    disabled={openingWebsite}
                    onClick={() => void openWebsiteWorkspace(project)}
                    variant="primary"
                  >
                    {openingWebsite ? (
                      <LoaderCircle aria-hidden="true" className="spin" size={16} />
                    ) : (
                      <Globe2 aria-hidden="true" size={16} />
                    )}
                    {openingWebsite ? 'Starting website' : 'Open live development'}
                  </Button>
                ) : (
                  <ButtonLink href={developmentStudioUrl('#/development')} variant="primary">
                    Open through Development Studio <ArrowUpRight aria-hidden="true" size={16} />
                  </ButtonLink>
                )}
                <ButtonLink
                  href={project.productionUrl}
                  rel="noreferrer"
                  target="_blank"
                  variant="secondary"
                >
                  View production <ArrowUpRight aria-hidden="true" size={16} />
                </ButtonLink>
              </ButtonGroup>

              <div className="development-project__ledger">
                <section aria-label={`${project.name} unreleased changes`}>
                  <div className="development-project__section-heading">
                    <h3 id={`${project.id}-changes-title`}>Unreleased changes</h3>
                    <span>{project.changes.length} files</span>
                  </div>
                  {project.changes.length ? (
                    <ul className="development-project__changes">
                      {project.changes.slice(0, 12).map((change) => (
                        <li key={`${change.status}:${change.path}`}>
                          <StatusBadge tone="warning">{changeLabel(change.status)}</StatusBadge>
                          <code>{change.path}</code>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="development-project__empty">No working changes.</p>
                  )}
                  {project.changes.length > 12 ? (
                    <p className="development-project__more">
                      And {project.changes.length - 12} more changed files.
                    </p>
                  ) : null}
                </section>

                <section aria-label={`${project.name} saved feature versions`}>
                  <div className="development-project__section-heading">
                    <h3 id={`${project.id}-versions-title`}>Saved feature versions</h3>
                    <Rocket aria-hidden="true" size={16} />
                  </div>
                  <ol className="development-project__versions">
                    {project.releases.slice(0, 5).map((release) => (
                      <li key={release.commit}>
                        <div>
                          <strong>{release.title}</strong>
                          <small>{releaseDate(release.createdAt)}</small>
                        </div>
                        <code>{release.shortCommit}</code>
                      </li>
                    ))}
                  </ol>
                </section>
              </div>

              <footer className="development-project__promotion">
                <div>
                  <strong>Production promotion</strong>
                  <span>
                    Promotion stays locked until this exact version passes checks and the deployment
                    connection is authenticated.
                  </span>
                </div>
                <Button disabled title="Deployment connection required" variant="primary">
                  <Rocket aria-hidden="true" size={16} />
                  Promote exact version
                </Button>
              </footer>
            </article>
          ))}
        </div>
      )}

      {websitePreviewUrl ? (
        <section className="development-preview" aria-labelledby="made-solid-preview-title">
          <header>
            <div>
              <Eyebrow>Live development</Eyebrow>
              <h2 id="made-solid-preview-title">Made Solid website</h2>
              <p>Private owner-only preview from the editable website repository.</p>
            </div>
            <ButtonLink
              href={websitePreviewUrl}
              rel="noreferrer"
              target="_blank"
              variant="secondary"
            >
              Open full screen <ArrowUpRight aria-hidden="true" size={16} />
            </ButtonLink>
          </header>
          <iframe
            allow="clipboard-read; clipboard-write"
            referrerPolicy="no-referrer"
            sandbox="allow-forms allow-modals allow-popups allow-scripts"
            src={websitePreviewUrl}
            title="Made Solid website live development preview"
          />
        </section>
      ) : null}
    </section>
  );
}
