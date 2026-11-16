import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Code2,
  GitMerge,
  GitBranch,
  Globe2,
  LayoutDashboard,
  LoaderCircle,
  MessageSquareText,
  PackageCheck,
  Pencil,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UsersRound,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { studioRuntimeFetch } from '../lib/studio-runtime';
import { Button, ButtonGroup, ConfirmationDialog, StatusBadge } from './ui';

export type FeatureImplementation = {
  id: string;
  threadId: string;
  turnId: string;
  threadScope: 'client' | 'universal';
  prompt: string;
  summary: string;
  completedAt: string;
};

type FeatureEnvironment = {
  status: 'failed' | 'not_deployed' | 'queued' | 'verified';
  updatedAt?: string | null;
  detail?: string;
  url?: string;
  sourceCommit?: string | null;
};

type FeatureTarget = {
  repositoryId: 'studio' | 'website' | string;
  product: 'studio' | 'website' | string;
  label: string;
  repository: string;
  paths: string[];
  sourceCommit?: string | null;
  sourceState: 'committed' | 'local_changes' | 'unknown';
  environments: {
    development: FeatureEnvironment;
    production: FeatureEnvironment;
  };
};

export type FeatureRelease = {
  id: string;
  title: string;
  summary: string;
  status: 'live' | 'local_changes' | 'ready_development' | 'ready_production' | string;
  createdAt: string;
  updatedAt: string;
  implementations: FeatureImplementation[];
  linkedThreadIds?: string[];
  targets: FeatureTarget[];
  metadata?: { source: 'generated' | 'manual'; version: number; updatedAt: string };
};

type DeploymentRequest = { feature: FeatureRelease; environment: 'development' | 'production' };
type ProductSurfaceId = 'studio' | 'website' | 'clientspace' | 'clientspace_admin' | 'internal';
type ReleaseStatus = { label: string; tone: 'danger' | 'neutral' | 'success' | 'warning' };
type ReconciledFeature = { feature: FeatureRelease; records: FeatureRelease[] };

const productSurfaces: Array<{
  id: Exclude<ProductSurfaceId, 'internal'>;
  label: string;
  description: string;
  icon: typeof Code2;
}> = [
  {
    id: 'studio',
    label: 'Made Solid Studio',
    description: 'Owner workspace, Codex runtime and build tools',
    icon: Code2,
  },
  {
    id: 'website',
    label: 'Made Solid website',
    description: 'Public website and shared presentation shell',
    icon: Globe2,
  },
  {
    id: 'clientspace',
    label: 'Clientspace',
    description: 'Client portal, approvals, billing and review',
    icon: UsersRound,
  },
  {
    id: 'clientspace_admin',
    label: 'Clientspace admin',
    description: 'Private intake, handoff and client management',
    icon: ShieldCheck,
  },
];

function targetSurfaces(target: FeatureTarget): ProductSurfaceId[] {
  if (target.paths.length && target.paths.every((path) => /^(?:docs\/|README\.md$)/i.test(path))) {
    return ['internal'];
  }
  if (target.repositoryId === 'studio' || target.product === 'studio') return ['studio'];

  const surfaces = new Set<ProductSurfaceId>();
  for (const path of target.paths) {
    if (/^(?:app\/admin\/|components\/admin\/|app\/api\/admin\/)/i.test(path)) {
      surfaces.add('clientspace_admin');
    }
    if (
      /^(?:app\/portal\/|components\/portal\/|app\/api\/projects\/|app\/api\/integrations\/studio\/|lib\/(?:rehearsal|studio-pricing|payment-preflight|stripe-runtime|website-preview))/i.test(
        path,
      )
    ) {
      surfaces.add('clientspace');
    }
    if (
      /^(?:app\/(?!admin\/|portal\/|api\/)|components\/(?!admin\/|portal\/)|public\/)/i.test(path)
    ) {
      surfaces.add('website');
    }
  }
  if (!surfaces.size) surfaces.add('website');
  return [...surfaces];
}

function featureSurfaces(feature: FeatureRelease) {
  return new Set(feature.targets.flatMap(targetSurfaces));
}

function deploymentIsCurrent(target: FeatureTarget, environment: FeatureEnvironment) {
  if (environment.status !== 'verified' || target.sourceState !== 'committed') return false;
  return !environment.sourceCommit || environment.sourceCommit === target.sourceCommit;
}

function targetEnvironmentState(target: FeatureTarget, environment: 'development' | 'production') {
  if (environment === 'development' && target.repositoryId === 'studio') return 'workspace_live';
  const deployment = target.environments[environment];
  if (deploymentIsCurrent(target, deployment)) return 'current';
  if (deployment.status === 'verified') return 'earlier';
  return deployment.status;
}

function targetsForSurface(feature: FeatureRelease, surface: ProductSurfaceId) {
  return feature.targets.filter((target) => targetSurfaces(target).includes(surface));
}

function surfaceEnvironmentStatus(
  features: FeatureRelease[],
  surface: ProductSurfaceId,
  environment: 'development' | 'production',
) {
  const targets = features.flatMap((feature) => targetsForSurface(feature, surface));
  const states = targets.map((target) => targetEnvironmentState(target, environment));
  if (!states.length) return { label: 'No recorded changes', tone: 'neutral' as const };
  if (targets.some((target) => target.sourceState !== 'committed' || !target.sourceCommit)) {
    return {
      label: environment === 'development' ? 'Not ready' : 'No release candidate',
      tone: 'neutral' as const,
    };
  }
  if (states.every((state) => ['current', 'workspace_live'].includes(state))) {
    return { label: 'Up to date', tone: 'success' as const };
  }
  if (states.some((state) => state === 'failed')) {
    return { label: 'Release failed', tone: 'danger' as const };
  }
  if (states.some((state) => state === 'queued')) {
    return { label: 'Deploying', tone: 'warning' as const };
  }
  if (states.some((state) => state === 'earlier')) {
    return { label: 'Earlier revision live', tone: 'warning' as const };
  }
  if (environment === 'production') {
    const developmentStates = targets.map((target) =>
      targetEnvironmentState(target, 'development'),
    );
    if (!developmentStates.every((state) => ['current', 'workspace_live'].includes(state))) {
      return { label: 'Waiting for development', tone: 'neutral' as const };
    }
  }
  return {
    label: environment === 'development' ? 'Ready to deploy' : 'Ready to promote',
    tone: 'warning' as const,
  };
}

function surfaceWorkspaceStatus(
  features: FeatureRelease[],
  surface: ProductSurfaceId,
): ReleaseStatus {
  const targets = features.flatMap((feature) => targetsForSurface(feature, surface));
  if (!targets.length) return { label: 'No recorded changes', tone: 'neutral' };
  const local = targets.filter(
    (target) => target.sourceState !== 'committed' || !target.sourceCommit,
  ).length;
  if (local) {
    return {
      label: `${local} ${local === 1 ? 'change set' : 'change sets'} need review`,
      tone: 'warning',
    };
  }
  return { label: 'Clean release candidate', tone: 'success' };
}

function surfaceOverallStatus(
  features: FeatureRelease[],
  surface: ProductSurfaceId,
): ReleaseStatus {
  const targets = features.flatMap((feature) => targetsForSurface(feature, surface));
  if (!targets.length) return { label: 'No recorded changes', tone: 'neutral' };
  if (targets.some((target) => target.sourceState !== 'committed' || !target.sourceCommit)) {
    return { label: 'Review local changes', tone: 'warning' };
  }
  const environments = targets.flatMap((target) => Object.values(target.environments));
  if (environments.some((environment) => environment.status === 'failed')) {
    return { label: 'Release failed', tone: 'danger' };
  }
  if (environments.some((environment) => environment.status === 'queued')) {
    return { label: 'Deployment in progress', tone: 'warning' };
  }
  const developmentCurrent = targets.every((target) =>
    ['current', 'workspace_live'].includes(targetEnvironmentState(target, 'development')),
  );
  const productionCurrent = targets.every(
    (target) => targetEnvironmentState(target, 'production') === 'current',
  );
  if (!developmentCurrent) return { label: 'Ready for development', tone: 'neutral' };
  if (!productionCurrent) return { label: 'Ready for production', tone: 'warning' };
  return { label: 'Up to date', tone: 'success' };
}

function normalizedFeatureTitle(title: string) {
  return title
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ');
}

function reconcileFeatures(features: FeatureRelease[]): ReconciledFeature[] {
  const records = new Map<string, FeatureRelease[]>();
  for (const feature of features) {
    const key = normalizedFeatureTitle(feature.title) || feature.id;
    records.set(key, [...(records.get(key) ?? []), feature]);
  }
  return [...records.values()].map((matching) => {
    const newestFirst = [...matching].sort((left, right) =>
      String(right.updatedAt).localeCompare(String(left.updatedAt)),
    );
    return { feature: newestFirst[0], records: newestFirst };
  });
}

function featureEnvironmentSummary(
  feature: FeatureRelease,
  surface: ProductSurfaceId,
  environment: 'development' | 'production',
) {
  const targets = targetsForSurface(feature, surface);
  const states = targets.map((target) => targetEnvironmentState(target, environment));
  if (states.length && states.every((state) => ['current', 'workspace_live'].includes(state))) {
    return states.includes('workspace_live') ? 'Live workspace' : 'Live';
  }
  if (states.some((state) => state === 'failed')) return 'Failed';
  if (states.some((state) => state === 'queued')) return 'Deploying';
  if (states.some((state) => state === 'earlier')) return 'New revision pending';
  return 'Not deployed';
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Recently'
    : new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium' }).format(date);
}

function featureStatus(feature: FeatureRelease) {
  if (feature.status === 'live') return { label: 'Live', tone: 'success' as const };
  if (feature.status === 'ready_production') {
    return { label: 'Production ready', tone: 'success' as const };
  }
  if (feature.status === 'ready_development') {
    return { label: 'Development ready', tone: 'neutral' as const };
  }
  return { label: 'Local changes', tone: 'warning' as const };
}

function environmentLabel(
  target: FeatureTarget,
  environment: FeatureEnvironment,
  environmentName: 'development' | 'production',
) {
  if (environmentName === 'development' && target.repositoryId === 'studio') {
    return 'Live workspace';
  }
  if (target.sourceState !== 'committed' || !target.sourceCommit) {
    return environmentName === 'development' ? 'Waiting for clean commit' : 'No release candidate';
  }
  if (deploymentIsCurrent(target, environment)) return 'Current revision';
  if (environment.status === 'verified') return 'Earlier revision live';
  if (environment.status === 'queued') return 'Deploying';
  if (environment.status === 'failed') return 'Failed';
  return 'Not deployed';
}

function environmentTone(
  target: FeatureTarget,
  environment: FeatureEnvironment,
  environmentName: 'development' | 'production',
) {
  if (environmentName === 'development' && target.repositoryId === 'studio')
    return 'success' as const;
  if (deploymentIsCurrent(target, environment)) return 'success' as const;
  if (environment.status === 'verified') return 'warning' as const;
  if (environment.status === 'failed') return 'danger' as const;
  if (environment.status === 'queued') return 'warning' as const;
  return 'neutral' as const;
}

function featureGroup(feature: FeatureRelease) {
  if (featureSurfaces(feature).size === 1 && featureSurfaces(feature).has('internal')) {
    return 'internal';
  }
  const products = new Set(feature.targets.map((target) => target.product));
  if (products.size > 1) return 'cross-product';
  return products.has('website') ? 'website' : 'studio';
}

function cardSourceStatus(feature: FeatureRelease) {
  const committed = feature.targets.filter(
    (target) => target.sourceState === 'committed' && target.sourceCommit,
  ).length;
  if (committed === feature.targets.length) return { label: 'Committed', tone: 'success' as const };
  if (committed) {
    return { label: `${committed}/${feature.targets.length} committed`, tone: 'warning' as const };
  }
  return { label: 'Needs commit', tone: 'warning' as const };
}

function cardEnvironmentStatus(feature: FeatureRelease, environment: 'development' | 'production') {
  if (
    feature.targets.some((target) => target.sourceState !== 'committed' || !target.sourceCommit)
  ) {
    return {
      label: environment === 'development' ? 'Not ready' : 'No release candidate',
      tone: 'neutral' as const,
    };
  }
  const states = feature.targets.map((target) => targetEnvironmentState(target, environment));
  const verified = states.filter((state) => ['current', 'workspace_live'].includes(state)).length;
  if (verified === states.length) {
    return {
      label: states.includes('workspace_live') ? 'Live workspace' : 'Current',
      tone: 'success' as const,
    };
  }
  if (states.some((state) => state === 'earlier')) {
    return { label: 'Earlier revision live', tone: 'warning' as const };
  }
  if (states.some((state) => state === 'queued')) {
    return { label: 'Deploying', tone: 'warning' as const };
  }
  if (states.some((state) => state === 'failed')) {
    return { label: 'Failed', tone: 'danger' as const };
  }
  if (verified) {
    return { label: `${verified}/${states.length} current`, tone: 'warning' as const };
  }
  return { label: 'Not deployed', tone: 'neutral' as const };
}

export function FeatureReleasesPanel({
  active,
  onContinue,
  onFeaturesChange,
  onOpenChat,
}: {
  active: boolean;
  onContinue: (
    feature: FeatureRelease,
    implementation: FeatureImplementation,
    draftPrompt?: string,
  ) => void;
  onFeaturesChange?: (features: FeatureRelease[]) => void;
  onOpenChat: (implementation: FeatureImplementation) => void;
}) {
  const [features, setFeatures] = useState<FeatureRelease[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deployment, setDeployment] = useState<DeploymentRequest>();
  const [deploymentError, setDeploymentError] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [editingMetadata, setEditingMetadata] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftSummary, setDraftSummary] = useState('');
  const [metadataBusy, setMetadataBusy] = useState(false);
  const [metadataError, setMetadataError] = useState('');
  const [mergeSourceId, setMergeSourceId] = useState('');
  const [mergeConfirmed, setMergeConfirmed] = useState(false);
  const deployTriggerRef = useRef<HTMLButtonElement>(null);
  const mergeTriggerRef = useRef<HTMLButtonElement>(null);
  const latestFeatureRequestRef = useRef(0);

  const loadFeatures = useCallback(
    async (background = false) => {
      const requestId = latestFeatureRequestRef.current + 1;
      latestFeatureRequestRef.current = requestId;
      if (!background) setLoading(true);
      setError('');
      try {
        const response = await studioRuntimeFetch('/__made-solid/feature-releases', {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });
        const payload = (await response.json().catch(() => undefined)) as
          { detail?: string; features?: FeatureRelease[] } | undefined;
        if (!response.ok || !Array.isArray(payload?.features)) {
          throw new Error(payload?.detail || 'Feature releases are unavailable.');
        }
        if (requestId !== latestFeatureRequestRef.current) return;
        setFeatures(payload.features);
        onFeaturesChange?.(payload.features);
      } catch (cause) {
        if (requestId !== latestFeatureRequestRef.current) return;
        setError(cause instanceof Error ? cause.message : 'Feature releases are unavailable.');
      } finally {
        if (requestId === latestFeatureRequestRef.current) setLoading(false);
      }
    },
    [onFeaturesChange],
  );

  useEffect(() => {
    if (active) void loadFeatures();
  }, [active, loadFeatures]);

  useEffect(() => {
    if (!active) return;
    const refresh = () => void loadFeatures(true);
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const timer = window.setInterval(refresh, 3_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [active, loadFeatures]);

  const selected = features.find((feature) => feature.id === selectedId);
  const grouped = useMemo(
    () =>
      [
        { id: 'cross-product', label: 'Across Studio and website' },
        { id: 'studio', label: 'Made Solid Studio' },
        { id: 'website', label: 'Made Solid website & Clientspace' },
        { id: 'internal', label: 'Internal research & documentation' },
      ].map((group) => ({
        ...group,
        features: reconcileFeatures(
          features.filter((feature) => featureGroup(feature) === group.id),
        ),
      })),
    [features],
  );
  const reconciledProductFeatures = useMemo(
    () =>
      reconcileFeatures(features.filter((feature) => !featureSurfaces(feature).has('internal'))),
    [features],
  );

  async function startDeployment() {
    if (!deployment) return;
    setDeploying(true);
    setDeploymentError('');
    try {
      const response = await studioRuntimeFetch('/__made-solid/feature-releases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          action: 'deploy',
          featureId: deployment.feature.id,
          environment: deployment.environment,
          confirmed: deployment.environment === 'production',
        }),
      });
      const payload = (await response.json().catch(() => undefined)) as
        { detail?: string } | undefined;
      if (!response.ok) throw new Error(payload?.detail || 'The deployment could not start.');
      setDeployment(undefined);
      await loadFeatures();
    } catch (cause) {
      setDeploymentError(
        cause instanceof Error ? cause.message : 'The deployment could not start.',
      );
    } finally {
      setDeploying(false);
    }
  }

  async function updateFeatureMetadata(action: 'update-metadata' | 'regenerate-metadata') {
    if (!selected) return;
    setMetadataBusy(true);
    setMetadataError('');
    try {
      const response = await studioRuntimeFetch('/__made-solid/feature-releases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          action,
          featureId: selected.id,
          title: draftTitle,
          summary: draftSummary,
        }),
      });
      const payload = (await response.json().catch(() => undefined)) as
        { detail?: string; feature?: FeatureRelease } | undefined;
      if (!response.ok || !payload?.feature) {
        throw new Error(payload?.detail || 'The feature wording could not be saved.');
      }
      setFeatures((current) =>
        current.map((feature) => (feature.id === payload.feature?.id ? payload.feature : feature)),
      );
      await loadFeatures();
      setDraftTitle(payload.feature.title);
      setDraftSummary(payload.feature.summary);
      setEditingMetadata(false);
    } catch (cause) {
      setMetadataError(
        cause instanceof Error ? cause.message : 'The feature wording could not be saved.',
      );
    } finally {
      setMetadataBusy(false);
    }
  }

  async function mergeFeature() {
    if (!selected || !mergeSourceId) return;
    setMetadataBusy(true);
    setMetadataError('');
    try {
      const response = await studioRuntimeFetch('/__made-solid/feature-releases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          action: 'merge-features',
          featureId: selected.id,
          sourceFeatureId: mergeSourceId,
        }),
      });
      const payload = (await response.json().catch(() => undefined)) as
        { detail?: string; feature?: FeatureRelease } | undefined;
      if (!response.ok || !payload?.feature) {
        throw new Error(payload?.detail || 'The features could not be merged.');
      }
      setFeatures((current) => [
        payload.feature as FeatureRelease,
        ...current.filter((feature) => feature.id !== selected.id && feature.id !== mergeSourceId),
      ]);
      await loadFeatures();
      setMergeSourceId('');
      setMergeConfirmed(false);
    } catch (cause) {
      setMetadataError(
        cause instanceof Error ? cause.message : 'The features could not be merged.',
      );
    } finally {
      setMetadataBusy(false);
    }
  }

  if (selected) {
    const latest = selected.implementations.at(-1);
    const allCommitted = selected.targets.every(
      (target) => target.sourceState === 'committed' && target.sourceCommit,
    );
    const developmentVerified = selected.targets.every((target) =>
      ['current', 'workspace_live'].includes(targetEnvironmentState(target, 'development')),
    );
    const productionVerified = selected.targets.every(
      (target) => targetEnvironmentState(target, 'production') === 'current',
    );
    const releaseBusy = selected.targets.some((target) =>
      Object.values(target.environments).some((environment) => environment.status === 'queued'),
    );
    const localTargets = selected.targets.filter(
      (target) => target.sourceState !== 'committed' || !target.sourceCommit,
    );
    const prepareReleasePrompt = `Prepare “${selected.title}” as a clean release candidate. Inspect only its recorded files, reconcile duplicate or stale feature records, run the relevant checks, isolate unrelated workspace changes, and create an exact commit only when the scope is safe. Do not deploy production.`;
    return (
      <section className="feature-release-detail" aria-labelledby="feature-release-title">
        <header className="feature-release-detail__header">
          <Button onClick={() => setSelectedId('')} size="small" variant="quiet">
            <ArrowLeft aria-hidden="true" size={16} /> Back to features
          </Button>
          <StatusBadge tone={featureStatus(selected).tone}>
            {featureStatus(selected).label}
          </StatusBadge>
        </header>
        <div className="feature-release-detail__intro">
          <span aria-hidden="true">
            <PackageCheck size={20} />
          </span>
          <div>
            {editingMetadata ? (
              <div className="feature-release-metadata-form">
                <h3 id="feature-release-title">Edit feature wording</h3>
                <label htmlFor="feature-release-name">Feature title</label>
                <input
                  id="feature-release-name"
                  maxLength={96}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  value={draftTitle}
                />
                <small>Name the capability so it is recognisable later.</small>
                <label htmlFor="feature-release-description">What changed and why</label>
                <textarea
                  id="feature-release-description"
                  maxLength={700}
                  onChange={(event) => setDraftSummary(event.target.value)}
                  rows={4}
                  value={draftSummary}
                />
                <small>
                  Include what it does, where it works and why it matters. {draftSummary.length}/700
                  characters
                </small>
                <ButtonGroup>
                  <Button
                    disabled={metadataBusy}
                    onClick={() => void updateFeatureMetadata('update-metadata')}
                    size="small"
                  >
                    Save wording
                  </Button>
                  <Button
                    disabled={metadataBusy}
                    onClick={() => setEditingMetadata(false)}
                    size="small"
                    variant="quiet"
                  >
                    Cancel
                  </Button>
                </ButtonGroup>
              </div>
            ) : (
              <>
                <h3 id="feature-release-title">{selected.title}</h3>
                <small className="feature-release-detail__description-label">What changed</small>
                <p>{selected.summary}</p>
                <ButtonGroup className="feature-release-metadata-actions">
                  <Button
                    onClick={() => {
                      setDraftTitle(selected.title);
                      setDraftSummary(selected.summary);
                      setMetadataError('');
                      setEditingMetadata(true);
                    }}
                    size="small"
                    variant="quiet"
                  >
                    <Pencil aria-hidden="true" size={14} /> Edit wording
                  </Button>
                  <Button
                    disabled={metadataBusy}
                    onClick={() => void updateFeatureMetadata('regenerate-metadata')}
                    size="small"
                    variant="quiet"
                  >
                    <Sparkles aria-hidden="true" size={14} /> Improve wording
                  </Button>
                </ButtonGroup>
              </>
            )}
          </div>
        </div>

        {features.length > 1 ? (
          <div className="feature-release-merge">
            <label htmlFor="feature-release-merge-source">Merge related feature</label>
            <div>
              <select
                id="feature-release-merge-source"
                onChange={(event) => setMergeSourceId(event.target.value)}
                value={mergeSourceId}
              >
                <option value="">Choose another feature</option>
                {features
                  .filter((feature) => feature.id !== selected.id)
                  .map((feature) => (
                    <option key={feature.id} value={feature.id}>
                      {feature.title}
                    </option>
                  ))}
              </select>
              <Button
                disabled={!mergeSourceId || metadataBusy}
                onClick={() => setMergeConfirmed(true)}
                ref={mergeTriggerRef}
                size="small"
                variant="secondary"
              >
                <GitMerge aria-hidden="true" size={15} /> Merge
              </Button>
            </div>
            <small>Combines chat history and changed files into this feature.</small>
          </div>
        ) : null}

        {metadataError ? (
          <p className="feature-releases__error" role="alert">
            <TriangleAlert aria-hidden="true" size={17} /> {metadataError}
          </p>
        ) : null}

        <div className="feature-release-targets">
          {selected.targets.map((target) => (
            <article className="feature-release-target" key={target.repositoryId}>
              <header>
                {target.product === 'website' ? (
                  <Globe2 aria-hidden="true" size={17} />
                ) : (
                  <Code2 aria-hidden="true" size={17} />
                )}
                <strong>{target.label}</strong>
                <StatusBadge tone={target.sourceState === 'committed' ? 'success' : 'warning'}>
                  {target.sourceState === 'committed' ? 'Committed' : 'Local changes'}
                </StatusBadge>
              </header>
              <div className="feature-release-target__revision">
                <GitBranch aria-hidden="true" size={14} />
                <code>{target.sourceCommit?.slice(0, 8) || 'Commit required'}</code>
                <span>
                  {target.paths.length} changed {target.paths.length === 1 ? 'file' : 'files'}
                </span>
              </div>
              <div className="feature-release-target__surfaces" aria-label="Affected products">
                {targetSurfaces(target).map((surface) => (
                  <span key={surface}>
                    {surface === 'clientspace_admin'
                      ? 'Clientspace admin'
                      : surface === 'clientspace'
                        ? 'Clientspace'
                        : surface === 'website'
                          ? 'Website'
                          : surface === 'studio'
                            ? 'Studio'
                            : 'Internal'}
                  </span>
                ))}
              </div>
              <dl className="feature-release-environments">
                {(['development', 'production'] as const).map((environment) => (
                  <div key={environment}>
                    <dt>{environment === 'development' ? 'Development' : 'Production'}</dt>
                    <dd>
                      <StatusBadge
                        tone={environmentTone(
                          target,
                          target.environments[environment],
                          environment,
                        )}
                      >
                        {environmentLabel(target, target.environments[environment], environment)}
                      </StatusBadge>
                      {target.environments[environment].url ? (
                        <a
                          href={target.environments[environment].url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Open <ArrowUpRight aria-hidden="true" size={13} />
                        </a>
                      ) : null}
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>

        <section className="feature-release-history" aria-labelledby="feature-history-title">
          <div>
            <h4 id="feature-history-title">Implementation history</h4>
            <span>
              {selected.implementations.length}{' '}
              {selected.implementations.length === 1 ? 'chat turn' : 'chat turns'}
            </span>
          </div>
          <ol>
            {[...selected.implementations].reverse().map((implementation) => (
              <li key={implementation.id}>
                <span aria-hidden="true">
                  <CheckCircle2 size={15} />
                </span>
                <div>
                  <strong>{implementation.summary}</strong>
                  <small>{formatDate(implementation.completedAt)}</small>
                </div>
                <Button onClick={() => onOpenChat(implementation)} size="small" variant="quiet">
                  Open chat
                </Button>
              </li>
            ))}
          </ol>
        </section>

        {!allCommitted ? (
          <p className="feature-release-gate" role="status">
            <TriangleAlert aria-hidden="true" size={17} /> Not ready to deploy:{' '}
            {localTargets.length}{' '}
            {localTargets.length === 1 ? 'change set has' : 'change sets have'} uncommitted or
            unresolved files. Prepare a clean release candidate first; development deploys
            automatically once its exact commit is ready.
          </p>
        ) : null}
        <ButtonGroup className="feature-release-detail__actions">
          {latest ? (
            <Button onClick={() => onOpenChat(latest)} variant="secondary">
              <MessageSquareText aria-hidden="true" size={16} /> Open source chat
            </Button>
          ) : null}
          {latest ? (
            <Button onClick={() => onContinue(selected, latest)} variant="secondary">
              <GitBranch aria-hidden="true" size={16} /> Start follow-up
            </Button>
          ) : null}
          {latest && !allCommitted ? (
            <Button
              onClick={() => onContinue(selected, latest, prepareReleasePrompt)}
              variant="primary"
            >
              <Sparkles aria-hidden="true" size={16} /> Prepare release with Codex
            </Button>
          ) : !developmentVerified ? (
            <Button
              disabled={releaseBusy}
              onClick={() => setDeployment({ feature: selected, environment: 'development' })}
              ref={deployTriggerRef}
              variant="primary"
            >
              {releaseBusy ? (
                <LoaderCircle aria-hidden="true" className="is-spinning" size={16} />
              ) : (
                <Rocket aria-hidden="true" size={16} />
              )}
              {releaseBusy ? 'Deploying' : 'Deploy to development'}
            </Button>
          ) : !productionVerified ? (
            <Button
              disabled={!allCommitted || releaseBusy}
              onClick={() => setDeployment({ feature: selected, environment: 'production' })}
              ref={deployTriggerRef}
              variant="primary"
            >
              <Rocket aria-hidden="true" size={16} /> Promote to production
            </Button>
          ) : null}
        </ButtonGroup>

        <ConfirmationDialog
          confirmLabel={
            deployment?.environment === 'production'
              ? 'Promote exact version'
              : 'Deploy exact version'
          }
          confirmVariant="primary"
          confirmingLabel="Starting deployment"
          detail={
            deployment
              ? `${deployment.feature.title} will deploy its exact committed revision to ${deployment.environment}. Cross-product releases deploy the receiving website service before Studio.`
              : ''
          }
          error={deploymentError}
          isConfirming={deploying}
          onConfirm={() => void startDeployment()}
          onOpenChange={(open) => {
            if (!open && !deploying) {
              setDeployment(undefined);
              setDeploymentError('');
            }
          }}
          open={Boolean(deployment)}
          returnFocusRef={deployTriggerRef}
          title={
            deployment?.environment === 'production'
              ? 'Promote this feature to production?'
              : 'Deploy this feature to development?'
          }
        />
        <ConfirmationDialog
          confirmLabel="Merge features"
          confirmingLabel="Merging features"
          detail="The selected feature’s source chats, changed files and lineage will move into this feature. Verified environment status is reset whenever the recorded revisions differ."
          error={metadataError}
          isConfirming={metadataBusy}
          onConfirm={() => void mergeFeature()}
          onOpenChange={(open) => {
            if (!open && !metadataBusy) setMergeConfirmed(false);
          }}
          open={mergeConfirmed}
          returnFocusRef={mergeTriggerRef}
          title="Merge these feature records?"
        />
      </section>
    );
  }

  return (
    <section className="feature-releases" aria-labelledby="feature-releases-title">
      <header className="feature-releases__header">
        <div>
          <h3 id="feature-releases-title">Feature releases</h3>
          <p>Trace each Codex change from implementation chat to verified release.</p>
        </div>
        <Button disabled={loading} onClick={() => void loadFeatures()} size="small" variant="quiet">
          {loading ? (
            <LoaderCircle aria-hidden="true" className="is-spinning" size={16} />
          ) : (
            <RefreshCw aria-hidden="true" size={16} />
          )}
          Refresh
        </Button>
      </header>
      {error ? (
        <p className="feature-releases__error" role="alert">
          <TriangleAlert aria-hidden="true" size={17} /> {error}
        </p>
      ) : null}
      {loading && !features.length ? (
        <div className="feature-releases__loading" role="status">
          <LoaderCircle aria-hidden="true" className="is-spinning" size={18} /> Reading feature
          evidence…
        </div>
      ) : !features.length ? (
        <div className="feature-releases__empty">
          <PackageCheck aria-hidden="true" size={24} />
          <strong>No implemented features recorded yet</strong>
          <p>
            The next completed Codex turn with saved file changes will appear here automatically.
          </p>
        </div>
      ) : (
        <>
          <section className="feature-release-overview" aria-labelledby="release-overview-title">
            <header>
              <span aria-hidden="true">
                <LayoutDashboard size={18} />
              </span>
              <div>
                <h4 id="release-overview-title">Release overview</h4>
                <p>
                  Clean exact revisions deploy to development automatically; production stays
                  confirmed.
                </p>
              </div>
            </header>
            <div className="feature-release-products">
              {productSurfaces.map((surface) => {
                const surfaceFeatures = features.filter((feature) =>
                  featureSurfaces(feature).has(surface.id),
                );
                const reconciledFeatures = reconcileFeatures(surfaceFeatures);
                const duplicateCount = reconciledFeatures.reduce(
                  (count, entry) => count + Math.max(0, entry.records.length - 1),
                  0,
                );
                const workspaceStatus = surfaceWorkspaceStatus(surfaceFeatures, surface.id);
                const developmentStatus = surfaceEnvironmentStatus(
                  surfaceFeatures,
                  surface.id,
                  'development',
                );
                const productionStatus = surfaceEnvironmentStatus(
                  surfaceFeatures,
                  surface.id,
                  'production',
                );
                const overallStatus = surfaceOverallStatus(surfaceFeatures, surface.id);
                const surfaceRecords = reconciledFeatures.flatMap((entry) => entry.records);
                const firstLocalFeature = surfaceRecords.find((feature) =>
                  targetsForSurface(feature, surface.id).some(
                    (target) => target.sourceState !== 'committed' || !target.sourceCommit,
                  ),
                );
                const failedFeature = surfaceRecords.find((feature) =>
                  targetsForSurface(feature, surface.id).some((target) =>
                    Object.values(target.environments).some(
                      (environment) => environment.status === 'failed',
                    ),
                  ),
                );
                const developmentFeature = surfaceRecords.find((feature) => {
                  const targets = targetsForSurface(feature, surface.id);
                  return targets.some(
                    (target) =>
                      target.sourceState === 'committed' &&
                      !['current', 'workspace_live'].includes(
                        targetEnvironmentState(target, 'development'),
                      ),
                  );
                });
                const productionFeature = surfaceRecords.find((feature) => {
                  const targets = targetsForSurface(feature, surface.id);
                  return (
                    targets.length > 0 &&
                    targets.every((target) =>
                      ['current', 'workspace_live'].includes(
                        targetEnvironmentState(target, 'development'),
                      ),
                    ) &&
                    targets.some(
                      (target) => targetEnvironmentState(target, 'production') !== 'current',
                    )
                  );
                });
                const nextAction = firstLocalFeature
                  ? {
                      feature: firstLocalFeature,
                      label: 'Review local changes',
                      detail: 'Review scope before creating an exact release commit.',
                    }
                  : failedFeature
                    ? {
                        feature: failedFeature,
                        label: 'Review release failure',
                        detail: 'Read the verified failure before retrying the exact revision.',
                      }
                    : developmentFeature
                      ? {
                          feature: developmentFeature,
                          label: 'Review development release',
                          detail: 'Confirm the clean revision before deploying to development.',
                        }
                      : productionFeature
                        ? {
                            feature: productionFeature,
                            label: 'Review production release',
                            detail: 'Confirm the development evidence before production.',
                          }
                        : undefined;
                const SurfaceIcon = surface.icon;
                return (
                  <details
                    className="feature-release-product"
                    data-product-surface={surface.id}
                    key={surface.id}
                  >
                    <summary>
                      <span className="feature-release-product__icon" aria-hidden="true">
                        <SurfaceIcon size={17} />
                      </span>
                      <span className="feature-release-product__identity">
                        <strong>{surface.label}</strong>
                        <small>{surface.description}</small>
                      </span>
                      <span className="feature-release-product__production">
                        <small>Release status</small>
                        <StatusBadge tone={overallStatus.tone}>{overallStatus.label}</StatusBadge>
                      </span>
                      <span className="feature-release-product__count">
                        <strong>{reconciledFeatures.length}</strong>
                        <small>
                          {reconciledFeatures.length === 1
                            ? 'affected feature'
                            : 'affected features'}
                        </small>
                      </span>
                      <span className="feature-release-product__chevron" aria-hidden="true">
                        <ArrowUpRight size={15} />
                      </span>
                    </summary>
                    <div className="feature-release-product__content">
                      <dl
                        className="feature-release-product__environments"
                        aria-label={`${surface.label} release pipeline`}
                      >
                        <div>
                          <dt>Workspace</dt>
                          <dd>
                            <StatusBadge tone={workspaceStatus.tone}>
                              {workspaceStatus.label}
                            </StatusBadge>
                          </dd>
                        </div>
                        <div>
                          <dt>Development</dt>
                          <dd>
                            <StatusBadge tone={developmentStatus.tone}>
                              {developmentStatus.label}
                            </StatusBadge>
                          </dd>
                        </div>
                        <div>
                          <dt>Production</dt>
                          <dd>
                            <StatusBadge tone={productionStatus.tone}>
                              {productionStatus.label}
                            </StatusBadge>
                          </dd>
                        </div>
                      </dl>
                      {nextAction ? (
                        <div className="feature-release-product__action">
                          <span>
                            <strong>Next action</strong>
                            <small>{nextAction.detail}</small>
                          </span>
                          <Button
                            onClick={() => setSelectedId(nextAction.feature.id)}
                            size="small"
                            variant="primary"
                          >
                            {nextAction.label}
                          </Button>
                        </div>
                      ) : null}
                      {duplicateCount ? (
                        <p className="feature-release-product__duplicates" role="status">
                          <GitMerge aria-hidden="true" size={14} /> {duplicateCount} possible
                          duplicate {duplicateCount === 1 ? 'record needs' : 'records need'}{' '}
                          reconciliation.
                        </p>
                      ) : null}
                      {reconciledFeatures.length ? (
                        <ul aria-label={`${surface.label} features`}>
                          {reconciledFeatures.map(({ feature, records }) => (
                            <li key={feature.id}>
                              <span>
                                <strong>{feature.title}</strong>
                                <small>
                                  {records.length > 1
                                    ? `${records.length} records · reconciliation needed`
                                    : `Production · ${featureEnvironmentSummary(feature, surface.id, 'production')}`}
                                </small>
                              </span>
                              <Button
                                aria-label={`View ${feature.title}`}
                                onClick={() => setSelectedId(feature.id)}
                                size="small"
                                variant="quiet"
                              >
                                View
                              </Button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="feature-release-product__empty">
                          No pending features are recorded for this product.
                        </p>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
            <p className="feature-release-overview__note">
              Internal research and documentation are listed below but do not count as product
              releases.
            </p>
          </section>
          <div className="feature-releases__summary" aria-label="Feature release summary">
            <div>
              <strong>{reconciledProductFeatures.length}</strong>
              <span>Product features</span>
            </div>
            <div>
              <strong>
                {
                  reconciledProductFeatures.filter((entry) =>
                    entry.records.some((feature) =>
                      feature.targets.some(
                        (target) => target.sourceState !== 'committed' || !target.sourceCommit,
                      ),
                    ),
                  ).length
                }
              </strong>
              <span>Need review</span>
            </div>
            <div>
              <strong>
                {
                  reconciledProductFeatures.filter((entry) =>
                    entry.records.some((feature) => feature.status === 'ready_production'),
                  ).length
                }
              </strong>
              <span>Production ready</span>
            </div>
          </div>
          <div className="feature-release-groups">
            {grouped
              .filter((group) => group.features.length)
              .map((group) => (
                <section key={group.id} aria-labelledby={`feature-group-${group.id}`}>
                  <div className="feature-release-group__heading">
                    <h4 id={`feature-group-${group.id}`}>{group.label}</h4>
                    <span>{group.features.length}</span>
                  </div>
                  <div className="feature-release-list">
                    {group.features.map(({ feature, records }) => {
                      const status = featureStatus(feature);
                      const sourceStatus = cardSourceStatus(feature);
                      const developmentStatus = cardEnvironmentStatus(feature, 'development');
                      const productionStatus = cardEnvironmentStatus(feature, 'production');
                      return (
                        <article className="feature-release-card" key={feature.id}>
                          <div className="feature-release-card__body">
                            <strong>{feature.title}</strong>
                            <p>{feature.summary}</p>
                            {records.length > 1 ? (
                              <span className="feature-release-card__duplicate-count">
                                <GitMerge aria-hidden="true" size={13} /> {records.length} records ·
                                merge recommended
                              </span>
                            ) : null}
                            <dl className="feature-release-card__statuses">
                              <div>
                                <dt>Source</dt>
                                <dd>
                                  <StatusBadge tone={sourceStatus.tone}>
                                    {sourceStatus.label}
                                  </StatusBadge>
                                </dd>
                              </div>
                              <div>
                                <dt>Development</dt>
                                <dd>
                                  <StatusBadge tone={developmentStatus.tone}>
                                    {developmentStatus.label}
                                  </StatusBadge>
                                </dd>
                              </div>
                              <div>
                                <dt>Production</dt>
                                <dd>
                                  <StatusBadge tone={productionStatus.tone}>
                                    {productionStatus.label}
                                  </StatusBadge>
                                </dd>
                              </div>
                            </dl>
                            <div>
                              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                              <span>Updated {formatDate(feature.updatedAt)}</span>
                            </div>
                          </div>
                          <Button
                            onClick={() => setSelectedId(feature.id)}
                            size="small"
                            variant="quiet"
                          >
                            View details <ArrowUpRight aria-hidden="true" size={15} />
                          </Button>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
          </div>
        </>
      )}
    </section>
  );
}
