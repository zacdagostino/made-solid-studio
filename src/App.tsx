import {
  ArrowLeft,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Ban,
  Bot,
  Check,
  CheckCheck,
  ChevronDown,
  CircleAlert,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  Download,
  ExternalLink,
  FileCode2,
  FilePenLine,
  FileImage,
  FileText,
  FolderTree,
  FormInput,
  Globe2,
  ListChecks,
  LayoutDashboard,
  LoaderCircle,
  PackageCheck,
  Play,
  Plus,
  RotateCcw,
  Save,
  Search,
  SearchCheck,
  Settings,
  ShieldAlert,
  Sparkles,
  SlidersHorizontal,
  Trash2,
  UsersRound,
  WalletCards,
  Wrench,
  X,
} from 'lucide-react';
import {
  Component,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ErrorInfo,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import * as Dialog from '@radix-ui/react-dialog';
import builderContractSource from '../worker/codex-builder-contract.md?raw';
import builderInstructionsSource from '../worker/builder-template/AGENTS.md?raw';
import componentArchitectureContractSource from '../worker/builder-template/feature-contracts/component-architecture.md?raw';
import mobileNavigationContractSource from '../worker/builder-template/feature-contracts/mobile-navigation.md?raw';
import runtimeProfilesContractSource from '../worker/builder-template/feature-contracts/runtime-profiles.md?raw';
import siteNavigationArchitectureContractSource from '../worker/builder-template/feature-contracts/site-navigation-architecture.md?raw';
import semanticContentRecoveryContractSource from '../worker/builder-template/feature-contracts/semantic-content-recovery.md?raw';
import builderPackageSource from '../worker/builder-template/package.json?raw';
import motionRuntimeSource from '../worker/builder-template/src/components/foundation/site-runtime.tsx?raw';
import builderWorkerSource from '../worker/builder-worker.mjs?raw';
import buildManifestSource from './lib/build-manifest.ts?raw';
import { AppShell, type AppPage } from './components/AppShell';
import { AgentArchitectureOverview } from './components/AgentArchitectureOverview';
import {
  Button,
  ButtonGroup,
  ButtonLink,
  Card,
  ConfirmationDialog,
  Eyebrow,
  IconButton,
  IndeterminateProgress,
  StatusBadge,
  ToastRegion,
  type ToastNotice,
} from './components/ui';
import {
  isOpenTask,
  stageLabels,
  type Audit,
  type Business,
  type AuditFinding,
  type AssetAnnotation,
  type AiUsageRecord,
  type AgentPackage,
  type AgentPackageProposal,
  type BrandKit,
  type BrandPalette,
  type BuildManifest,
  type CapabilityDecision,
  type BriefSourceSelections,
  type BuilderArtifact,
  type BuildManifestPage,
  type BuilderPreviewMode,
  type BuilderRunEvidence,
  type BuilderRunMode,
  type BuilderRun,
  type BuilderEvent,
  type CapturedPage,
  type ProspectStage,
  type ProspectWorkspace,
  type RedesignBrief,
  type RedesignBriefDraft,
  type ResearchArtifact,
  type Task,
  type StructuredVisualContent,
  type VisualContentCandidate,
} from './lib/domain';
import { SupabaseWorkspaceRepository } from './lib/cloud-repository';
import { manifestSourceMatchesBrief } from './lib/build-manifest';
import { brandColourEvidenceSummary, rankBrandColourEvidence } from './lib/brand-colours';
import { detectCapabilities } from './lib/capability-inventory';
import { siteforgeRepository, type WorkspaceRepository } from './lib/repository';
import { getSupabaseClient, isSupabaseConfigured, usesLocalStorage } from './lib/supabase';

type WorkspaceTab =
  | 'overview'
  | 'research'
  | 'packet'
  | 'assets'
  | 'brief'
  | 'audit'
  | 'redesign'
  | 'report'
  | 'activity';
type AgentStudioSection = 'refine' | 'agent' | 'versions';
type Route =
  | { page: 'today' }
  | { page: 'data' }
  | { page: 'usage'; builderRunId?: string }
  | { page: 'settings' }
  | { page: 'agent-studio'; section?: AgentStudioSection; businessId?: string }
  | { page: 'prospects'; businessId?: string; versionId?: string; tab?: WorkspaceTab };

const lastRouteStorageKey = 'siteforge-os.last-route';

const workspaceTabs = [
  { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
  { id: 'research' as const, label: 'Research', icon: Search },
  { id: 'packet' as const, label: 'Packet', icon: ClipboardCheck },
  { id: 'assets' as const, label: 'Assets', icon: FileImage },
  { id: 'brief' as const, label: 'Brief', icon: FilePenLine },
  { id: 'redesign' as const, label: 'Build & preview', icon: Wrench },
  { id: 'audit' as const, label: 'Audit', icon: ShieldAlert },
  { id: 'report' as const, label: 'Report', icon: FileText },
  { id: 'activity' as const, label: 'Activity', icon: Clock3 },
];

function isWorkspaceTab(value: string | undefined): value is WorkspaceTab {
  return workspaceTabs.some((tab) => tab.id === value);
}

function isAgentStudioSection(value: string | undefined): value is AgentStudioSection {
  return value === 'refine' || value === 'agent' || value === 'versions';
}

function routeFromHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'prospects') {
    return {
      page: 'prospects',
      businessId: parts[1],
      versionId: parts[2] === 'versions' ? parts[3] : undefined,
      tab: isWorkspaceTab(parts[2]) ? parts[2] : isWorkspaceTab(parts[4]) ? parts[4] : undefined,
    };
  }
  if (parts[0] === 'settings') return { page: 'settings' };
  if (parts[0] === 'usage') return { page: 'usage', builderRunId: parts[1] };
  if (parts[0] === 'data') return { page: 'data' };
  if (parts[0] === 'agent-studio') {
    if (isAgentStudioSection(parts[1])) {
      return {
        page: 'agent-studio',
        section: parts[1],
        businessId: parts[2],
      };
    }
    // Preserve direct links created before Agent Studio had its two dedicated pages.
    return { page: 'agent-studio', section: 'refine', businessId: parts[1] };
  }
  return { page: 'today' };
}

function hrefForRoute(route: Route) {
  if (route.page === 'today') return '#/today';
  if (route.page === 'settings') return '#/settings';
  if (route.page === 'data') return '#/data';
  if (route.page === 'usage') return `#/usage${route.builderRunId ? `/${route.builderRunId}` : ''}`;
  if (route.page === 'agent-studio') {
    const section = route.section ?? 'refine';
    return `#/agent-studio/${section}${route.businessId ? `/${route.businessId}` : ''}`;
  }
  return `#/prospects${route.businessId ? `/${route.businessId}${route.versionId ? `/versions/${route.versionId}` : ''}${route.tab ? `/${route.tab}` : ''}` : ''}`;
}

function storedRouteHash() {
  try {
    return window.localStorage.getItem(lastRouteStorageKey);
  } catch {
    return null;
  }
}

function persistRouteHash(hash: string) {
  try {
    window.localStorage.setItem(lastRouteStorageKey, hash);
  } catch {
    // Route persistence is a convenience; navigation must still work when storage is unavailable.
  }
}

function initialRoute() {
  const hash = window.location.hash || storedRouteHash() || '#/today';
  persistRouteHash(hash);
  if (!window.location.hash && hash) window.history.replaceState(null, '', hash);
  return routeFromHash(hash);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatStorageSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const imageExtensionByContentType: Record<string, string> = {
  'image/avif': 'AVIF',
  'image/gif': 'GIF',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/svg+xml': 'SVG',
  'image/webp': 'WEBP',
};

function imageFileExtension({
  contentType,
  path,
  sourceUrl,
}: {
  contentType?: string;
  path?: string;
  sourceUrl?: string;
}) {
  const fromContentType = contentType ? imageExtensionByContentType[contentType.toLowerCase()] : '';
  if (fromContentType) return fromContentType;
  const candidate = path || sourceUrl || '';
  const extension = candidate.split(/[?#]/)[0].match(/\.([a-z0-9]+)$/i)?.[1];
  return extension ? extension.toUpperCase() : 'IMAGE';
}

function ImageFileType({
  contentType,
  path,
  sourceUrl,
}: {
  contentType?: string;
  path?: string;
  sourceUrl?: string;
}) {
  return (
    <span className="image-file-type">{imageFileExtension({ contentType, path, sourceUrl })}</span>
  );
}

function EditableSvgLogo({
  asset,
  src,
  palette,
}: {
  asset: ResearchArtifact;
  src: string;
  palette: BrandPalette;
}) {
  const [open, setOpen] = useState(false);
  const [svg, setSvg] = useState('');
  const [selected, setSelected] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!open || !src) return;
    void fetch(src)
      .then((response) => response.text())
      .then((text) => {
        const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
        doc
          .querySelectorAll('script,foreignObject,animate,animateTransform,set')
          .forEach((node) => node.remove());
        doc.querySelectorAll('*').forEach((node) => {
          [...node.attributes].forEach((attribute) => {
            if (/^on/i.test(attribute.name) || /(?:href|url)\(/i.test(attribute.value))
              node.removeAttribute(attribute.name);
          });
        });
        doc
          .querySelectorAll('path,rect,circle,ellipse,polygon,polyline')
          .forEach((node, index) => node.setAttribute('data-logo-shape', String(index)));
        setSvg(new XMLSerializer().serializeToString(doc.documentElement));
      })
      .catch(() => setMessage('The SVG could not be loaded.'));
  }, [open, src]);
  function setColour(colour: string) {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const node = doc.querySelector(`[data-logo-shape="${selected}"]`);
    if (!node) return;
    node.setAttribute('fill', colour);
    setSvg(new XMLSerializer().serializeToString(doc.documentElement));
  }
  async function save() {
    const client = getSupabaseClient();
    if (!client) return setMessage('A connected workspace is required to save this SVG.');
    setSaving(true);
    const { error } = await client.storage
      .from(asset.storageBucket)
      .upload(asset.storagePath, new Blob([svg], { type: 'image/svg+xml' }), {
        contentType: 'image/svg+xml',
        upsert: true,
      });
    setSaving(false);
    setMessage(error ? error.message : 'SVG saved.');
  }
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Edit SVG
      </Button>
      <Dialog.Portal>
        <Dialog.Overlay className="image-lightbox-overlay" />
        <Dialog.Content className="image-lightbox">
          <Dialog.Title>Editable SVG logo</Dialog.Title>
          <div
            className="svg-editor"
            onClick={(event) => {
              const target = event.target as Element;
              setSelected(target.getAttribute('data-logo-shape') ?? '');
            }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          {selected ? (
            <input
              aria-label="Selected shape colour"
              type="color"
              onChange={(event) => setColour(event.target.value)}
            />
          ) : (
            <p>Select a shape to edit its colour.</p>
          )}
          <div>
            {[palette.primary, palette.accent].filter(Boolean).map((colour) => (
              <button
                key={colour}
                type="button"
                style={{ background: colour }}
                onClick={() => setColour(colour!)}
              >
                {colour}
              </button>
            ))}
          </div>
          <Button disabled={saving} onClick={() => void save()} type="button">
            {saving ? 'Saving' : 'Save SVG'}
          </Button>
          {message ? <p role="status">{message}</p> : null}
          <Dialog.Close asChild>
            <Button type="button" variant="quiet">
              Close
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function EditableLogoConversionProgress({
  asset,
  sourceUrl,
  enhancedAsset,
  enhancedUrl,
  alphaMatteAsset,
  alphaMatteUrl,
  job,
  logoVersions,
  requesting,
  versionUrls,
}: {
  asset: ResearchArtifact;
  sourceUrl?: string;
  enhancedAsset?: ResearchArtifact;
  enhancedUrl?: string;
  alphaMatteAsset?: ResearchArtifact;
  alphaMatteUrl?: string;
  job?: ProspectWorkspace['assetAnalysis'];
  logoVersions: ResearchArtifact[];
  requesting: boolean;
  versionUrls: Record<string, string>;
}) {
  const phase = job?.progressPhase ?? '';
  const enhancementRejected = phase === 'ai_enhancement_rejected';
  const enhancementUnavailable = phase === 'ai_cleanup_unavailable';
  const enhancementActive = [
    'preparing_logo_enhancement',
    'enhancing_logo',
    'enhancing_logo_and_alpha_matte',
    'validating_logo_enhancement',
    'reusing_ai_enhanced_logo',
  ].includes(phase);
  const alphaMatteActive = [
    'enhancing_logo_and_alpha_matte',
    'creating_alpha_matte',
    'retrying_alpha_matte',
  ].includes(phase);
  const logoVersionsActive =
    phase === 'creating_logo_versions' ||
    phase === 'saving_logo_version' ||
    phase === 'vectorising_logo' ||
    phase === 'fitting_logo_geometry' ||
    phase === 'ai_enhanced_logo_ready' ||
    phase === 'retaining_source_svg';
  const enhancementState = enhancedUrl
    ? 'complete'
    : enhancementActive || requesting
      ? 'active'
      : enhancementRejected || enhancementUnavailable
        ? 'fallback'
        : 'pending';
  const message = requesting
    ? 'Submitting the conversion request…'
    : job?.status === 'queued'
      ? 'Queued — waiting for the protected conversion worker.'
      : job?.progressDetail ||
        'Preparing transparent, reusable logo versions from the selected source.';

  return (
    <section
      aria-describedby="editable-logo-conversion-status"
      aria-label="High-fidelity logo version generation in progress"
      className="brand-kit__conversion"
    >
      <div className="brand-kit__conversion-step" data-state="complete">
        <span className="brand-kit__conversion-label">Selected original</span>
        {sourceUrl ? (
          <ExpandableImage
            alt="Selected original logo"
            className="brand-kit__conversion-artwork brand-kit__asset-preview"
            label={asset.label || 'selected original logo'}
            src={sourceUrl}
          >
            <img alt="Selected original logo" src={sourceUrl} />
          </ExpandableImage>
        ) : (
          <div className="brand-kit__conversion-artwork">
            <span>Loading logo</span>
          </div>
        )}
        <strong>{asset.label || 'Organisation logo'}</strong>
        <ImageFileType contentType={asset.contentType} path={asset.storagePath} />
      </div>
      <ArrowRight aria-hidden="true" className="brand-kit__conversion-arrow" size={24} />
      <ArrowDown aria-hidden="true" className="brand-kit__conversion-arrow-mobile" size={24} />
      <div className="brand-kit__conversion-step" data-state={enhancementState}>
        <span className="brand-kit__conversion-label">AI clean-up</span>
        {enhancedUrl && enhancedAsset ? (
          <ExpandableImage
            alt="AI-cleaned private logo tracing source"
            className="brand-kit__conversion-artwork brand-kit__asset-preview"
            label={enhancedAsset.label || 'AI-cleaned logo tracing source'}
            src={enhancedUrl}
          >
            <img alt="AI-cleaned private logo tracing source" src={enhancedUrl} />
          </ExpandableImage>
        ) : (
          <div
            aria-hidden="true"
            className="brand-kit__conversion-artwork brand-kit__conversion-artwork--loading"
          >
            {enhancementRejected || enhancementUnavailable ? (
              <Check aria-hidden="true" size={28} />
            ) : (
              <Sparkles
                className={enhancementActive || requesting ? 'spin' : undefined}
                size={28}
              />
            )}
            <span>{enhancementRejected || enhancementUnavailable ? 'Source kept' : 'AI'}</span>
          </div>
        )}
        <strong>
          {enhancedUrl
            ? 'Private clean-up ready'
            : enhancementRejected
              ? 'Original shape retained'
              : enhancementUnavailable
                ? 'Using original source'
                : 'Cleaning logo details'}
        </strong>
        <span className="image-file-type">{enhancedUrl ? 'PNG' : 'Reviewable'}</span>
      </div>
      <ArrowRight aria-hidden="true" className="brand-kit__conversion-arrow" size={24} />
      <ArrowDown aria-hidden="true" className="brand-kit__conversion-arrow-mobile" size={24} />
      <div
        className="brand-kit__conversion-step"
        data-state={alphaMatteUrl ? 'complete' : alphaMatteActive ? 'active' : 'pending'}
      >
        <span className="brand-kit__conversion-label">Alpha matte</span>
        {alphaMatteUrl && alphaMatteAsset ? (
          <ExpandableImage
            alt="AI-assisted black and white alpha matte"
            className="brand-kit__conversion-artwork brand-kit__asset-preview"
            label={alphaMatteAsset.label || 'AI-assisted alpha matte'}
            src={alphaMatteUrl}
          >
            <img alt="AI-assisted black and white alpha matte" src={alphaMatteUrl} />
          </ExpandableImage>
        ) : (
          <div
            aria-hidden="true"
            className="brand-kit__conversion-artwork brand-kit__conversion-artwork--loading"
          >
            <LoaderCircle className={alphaMatteActive ? 'spin' : undefined} size={28} />
            <span>Mask</span>
          </div>
        )}
        <strong>
          {alphaMatteUrl
            ? alphaMatteAsset?.metadata.rawAiOutput
              ? 'Raw ChatGPT matte saved'
              : 'Saved alpha matte'
            : alphaMatteActive
              ? 'Building soft edges'
              : 'Awaiting clean-up'}
        </strong>
        <span className="image-file-type">PNG</span>
      </div>
      <ArrowRight aria-hidden="true" className="brand-kit__conversion-arrow" size={24} />
      <ArrowDown aria-hidden="true" className="brand-kit__conversion-arrow-mobile" size={24} />
      <div
        className="brand-kit__conversion-step brand-kit__conversion-step--pending"
        data-state={logoVersions.length ? 'complete' : logoVersionsActive ? 'active' : 'pending'}
      >
        <span className="brand-kit__conversion-label">Logo versions</span>
        {logoVersions.length ? (
          <div className="brand-kit__conversion-version-list" aria-live="polite">
            {logoVersions.map((logoVersion) =>
              versionUrls[logoVersion.id] ? (
                <ExpandableImage
                  alt={logoVersion.label || 'Transparent logo version'}
                  className="brand-kit__conversion-version"
                  key={logoVersion.id}
                  label={logoVersion.label || 'transparent logo version'}
                  src={versionUrls[logoVersion.id]}
                >
                  <img alt="" src={versionUrls[logoVersion.id]} />
                </ExpandableImage>
              ) : (
                <span
                  aria-label={`Loading ${logoVersion.label || 'transparent logo version'}`}
                  className="brand-kit__conversion-version brand-kit__conversion-version--loading"
                  key={logoVersion.id}
                >
                  <LoaderCircle className="spin" size={16} />
                </span>
              ),
            )}
          </div>
        ) : (
          <div
            aria-hidden="true"
            className="brand-kit__conversion-artwork brand-kit__conversion-artwork--loading"
          >
            <LoaderCircle className="spin" size={28} />
            <span>PNG</span>
          </div>
        )}
        <strong>
          {logoVersions.length
            ? 'Saved versions appear as they finish'
            : 'Saving transparent versions'}
        </strong>
        <span className="image-file-type">PNG</span>
      </div>
      <p
        className="brand-kit__conversion-status"
        id="editable-logo-conversion-status"
        role="status"
      >
        {message}
      </p>
    </section>
  );
}

function storedMetadataSize(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function stageTone(stage: ProspectStage) {
  if (stage === 'lost' || stage === 'paused') return 'danger' as const;
  if (stage === 'outreach_pending' || stage === 'responded' || stage === 'proposal') {
    return 'success' as const;
  }
  if (stage === 'audit_ready' || stage === 'concept_ready' || stage === 'awaiting_approval') {
    return 'warning' as const;
  }
  return 'neutral' as const;
}

function StatusPill({ stage }: { stage: ProspectStage }) {
  return <StatusBadge tone={stageTone(stage)}>{stageLabels[stage]}</StatusBadge>;
}

function businessInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function businessLogo(workspace: ProspectWorkspace) {
  const logos = workspace.artifacts.filter(
    (artifact) =>
      artifact.kind === 'asset' &&
      artifact.metadata.assetType === 'logo' &&
      artifact.metadata.privateAiSuggestion !== true,
  );
  return logos.find((artifact) => artifact.metadata.preferredOrganisationLogo === true) ?? logos[0];
}

function BusinessIdentity({
  workspace,
  title = false,
  websiteUrl,
  websiteDomain,
}: {
  workspace: ProspectWorkspace;
  title?: boolean;
  websiteUrl?: string;
  websiteDomain?: string;
}) {
  const logo = businessLogo(workspace);
  const sourceUrl =
    typeof logo?.metadata.sourceUrl === 'string' ? logo.metadata.sourceUrl : undefined;
  const name = workspace.business.name;
  return (
    <span className={title ? 'business-identity business-identity--title' : 'business-identity'}>
      {sourceUrl ? (
        title ? (
          <ExpandableImage
            alt={`${name} logo`}
            className="business-identity__logo-button"
            label={`${name} logo`}
            src={sourceUrl}
          >
            <img alt="" className="business-identity__logo" src={sourceUrl} />
          </ExpandableImage>
        ) : (
          <img alt="" className="business-identity__logo" src={sourceUrl} />
        )
      ) : (
        <span aria-hidden="true" className="business-identity__fallback">
          {businessInitials(name)}
        </span>
      )}
      {title ? (
        <span className="business-identity__title-content">
          <h1>{name}</h1>
          {websiteUrl && websiteDomain ? (
            <a
              aria-label={`Open ${websiteDomain}`}
              className="business-identity__website-link"
              href={websiteUrl}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink aria-hidden="true" size={17} />
            </a>
          ) : null}
        </span>
      ) : (
        <strong title={name}>{name}</strong>
      )}
    </span>
  );
}

function EmptyState({
  icon: Icon,
  title,
  detail,
  action,
  headingLevel = 3,
}: {
  icon: typeof ClipboardCheck;
  title: string;
  detail: string;
  action?: ReactNode;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';

  return (
    <div className="empty-state">
      <Icon aria-hidden="true" size={22} />
      <div>
        <Heading>{title}</Heading>
        <p>{detail}</p>
        {action}
      </div>
    </div>
  );
}

function PageHeader({
  eyebrow,
  title,
  detail,
  action,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1>{title}</h1>
        <p>{detail}</p>
      </div>
      {action ? <div className="page-header__action">{action}</div> : null}
    </header>
  );
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <article className="metric metric--operational">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function TodayPage({
  businesses,
  workspaces,
  openWorkspace,
}: {
  businesses: Business[];
  workspaces: ProspectWorkspace[];
  openWorkspace: (businessId: string) => void;
}) {
  const openTasks = workspaces.flatMap((workspace) =>
    workspace.tasks.filter(isOpenTask).map((task) => ({ task, business: workspace.business })),
  );
  const waitingReview = businesses.filter((business) => business.reviewState === 'needs_review');
  const nextActions = [...openTasks]
    .sort((left, right) => right.business.updatedAt.localeCompare(left.business.updatedAt))
    .slice(0, 5);

  return (
    <>
      <PageHeader
        detail="A focused view of the work that needs your judgment today."
        eyebrow="Operations"
        title="Today"
      />

      <section aria-label="Today metrics" className="metric-grid metric-grid--operational">
        <Metric detail="potential clients" label="Prospects" value={businesses.length} />
        <Metric detail="need human review" label="Review queue" value={waitingReview.length} />
        <Metric detail="across all records" label="Open tasks" value={openTasks.length} />
        <Metric
          detail="ready for outreach"
          label="Approved"
          value={businesses.filter((business) => business.stage === 'outreach_pending').length}
        />
      </section>

      <div className="today-grid">
        <section aria-labelledby="next-actions-title" className="work-panel">
          <div className="section-heading">
            <div>
              <Eyebrow>Next actions</Eyebrow>
              <h2 id="next-actions-title">Work requiring attention</h2>
            </div>
            <ListChecks aria-hidden="true" size={19} />
          </div>
          {nextActions.length ? (
            <div className="action-list">
              {nextActions.map(({ task, business }) => (
                <button
                  className="action-row"
                  key={task.id}
                  onClick={() => openWorkspace(business.id)}
                  type="button"
                >
                  <span className="action-row__icon">
                    <CircleAlert aria-hidden="true" size={17} />
                  </span>
                  <span>
                    <strong>{task.body}</strong>
                    <small>
                      {business.name} · {stageLabels[business.stage]}
                    </small>
                  </span>
                  <ArrowUpRight aria-hidden="true" size={17} />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              detail="Create a prospect to generate its first review tasks."
              icon={ListChecks}
              title="No open actions"
            />
          )}
        </section>

        <section aria-labelledby="recent-title" className="work-panel">
          <div className="section-heading">
            <div>
              <Eyebrow>Recent activity</Eyebrow>
              <h2 id="recent-title">Pipeline movement</h2>
            </div>
            <Clock3 aria-hidden="true" size={19} />
          </div>
          <div className="activity-list activity-list--compact">
            {workspaces
              .flatMap((workspace) =>
                workspace.activity
                  .slice(0, 1)
                  .map((activity) => ({ activity, business: workspace.business })),
              )
              .sort((left, right) =>
                right.activity.createdAt.localeCompare(left.activity.createdAt),
              )
              .slice(0, 5)
              .map(({ activity, business }) => (
                <button
                  className="activity-row"
                  key={activity.id}
                  onClick={() => openWorkspace(business.id)}
                  type="button"
                >
                  <span>
                    <strong>{business.name}</strong>
                    <small>{activity.message}</small>
                  </span>
                  <time dateTime={activity.createdAt}>{formatDate(activity.createdAt)}</time>
                </button>
              ))}
          </div>
        </section>
      </div>
    </>
  );
}

function IntakeForm({
  createProspect,
  onCreated,
}: {
  createProspect: (url: string) => Promise<ProspectWorkspace | undefined>;
  onCreated: (workspace: ProspectWorkspace) => void;
}) {
  const [url, setUrl] = useState('');
  const [state, setState] = useState<'idle' | 'running' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!url.trim()) return;
    setState('running');
    setMessage('Creating a prospect workspace and research queue...');
    try {
      const workspace = await createProspect(url.trim());
      if (!workspace) throw new Error('The prospect workspace could not be created.');
      setUrl('');
      setState('idle');
      setMessage('');
      onCreated(workspace);
    } catch (error) {
      setState('error');
      setMessage(
        error instanceof Error && error.message === 'You already have this website as a prospect.'
          ? error.message
          : 'Enter a valid public website URL to create a prospect.',
      );
    }
  }

  return (
    <Card aria-labelledby="new-prospect-title" className="intake-panel">
      <div>
        <Eyebrow>New prospect</Eyebrow>
        <h2 id="new-prospect-title">Start from the public website</h2>
        <p>
          Creates a private prospect workspace and a review queue. It does not crawl or contact the
          business.
        </p>
      </div>
      <form className="url-form" onSubmit={submit}>
        <label htmlFor="websiteUrl">Public website URL</label>
        <div className="input-row">
          <Globe2 aria-hidden="true" size={18} />
          <input
            autoComplete="url"
            id="websiteUrl"
            name="websiteUrl"
            onChange={(event) => setUrl(event.target.value)}
            placeholder="example-business.com"
            value={url}
          />
          <Button disabled={state === 'running' || !url.trim()} type="submit">
            {state === 'running' ? (
              <Sparkles aria-hidden="true" className="spin" size={17} />
            ) : (
              <Play aria-hidden="true" size={17} />
            )}
            {state === 'running' ? 'Creating' : 'Create'}
          </Button>
        </div>
        {message ? (
          <p
            className={state === 'error' ? 'form-message form-message--error' : 'form-message'}
            role={state === 'error' ? 'alert' : 'status'}
          >
            {message}
          </p>
        ) : null}
      </form>
    </Card>
  );
}

function ProspectsPage({
  businesses,
  workspaces,
  createProspect,
  createWorkspace,
  openWorkspace,
}: {
  businesses: Business[];
  workspaces: ProspectWorkspace[];
  createProspect: (url: string) => Promise<ProspectWorkspace | undefined>;
  createWorkspace: (workspace: ProspectWorkspace) => void;
  openWorkspace: (businessId: string) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'active' | 'outreach'>('all');
  const visibleBusinesses = businesses.filter((business) => {
    if (filter === 'active')
      return !['outreach_pending', 'lost', 'paused'].includes(business.stage);
    if (filter === 'outreach') return business.stage === 'outreach_pending';
    return true;
  });

  return (
    <>
      <PageHeader
        detail="Businesses before they become clients. Keep research, decisions, and outreach approval in one place."
        eyebrow="Pipeline"
        title="Prospects"
      />
      <IntakeForm createProspect={createProspect} onCreated={createWorkspace} />

      <section aria-labelledby="prospect-list-title" className="prospect-section">
        <div className="section-heading section-heading--controls">
          <div>
            <Eyebrow>Pipeline</Eyebrow>
            <h2 id="prospect-list-title">Potential clients</h2>
          </div>
          <label className="filter-control">
            <span>Show</span>
            <select
              onChange={(event) => setFilter(event.target.value as typeof filter)}
              value={filter}
            >
              <option value="all">All prospects</option>
              <option value="active">Research and review</option>
              <option value="outreach">Approved for outreach</option>
            </select>
          </label>
        </div>

        {visibleBusinesses.length ? (
          <div className="prospect-table" role="list">
            {visibleBusinesses.map((business) => {
              const workspace = workspaces.find((item) => item.business.id === business.id);
              return (
                <button
                  className="prospect-row"
                  key={business.id}
                  onClick={() => openWorkspace(business.id)}
                  type="button"
                >
                  <span className="prospect-row__identity">
                    {workspace ? (
                      <BusinessIdentity workspace={workspace} />
                    ) : (
                      <strong title={business.name}>{business.name}</strong>
                    )}
                    <small>{business.kind === 'prospect' ? 'Prospect' : 'Client'}</small>
                  </span>
                  <StatusPill stage={business.stage} />
                  <span className="prospect-row__updated">
                    Updated {formatDate(business.updatedAt)}
                  </span>
                  <ArrowUpRight aria-hidden="true" size={18} />
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState
            detail="Change the filter or create a prospect from a public website URL."
            icon={UsersRound}
            title="No prospects in this view"
          />
        )}
      </section>
    </>
  );
}

function WorkspaceHeader({
  workspace,
  onBack,
  onApprove,
  onOpenSettings,
  onVersionChange,
  settingsButtonRef,
}: {
  workspace: ProspectWorkspace;
  onBack: () => void;
  onApprove: () => void;
  onOpenSettings: () => void;
  onVersionChange?: (versionId: string) => void;
  settingsButtonRef: RefObject<HTMLButtonElement>;
}) {
  const { business, website } = workspace;
  const isApproved = business.reviewState === 'approved';
  const canApprove = workspace.audit?.status === 'ready' && workspace.concept?.status === 'ready';
  return (
    <>
      <Button className="back-button" onClick={onBack} variant="quiet">
        <ArrowLeft aria-hidden="true" size={16} /> All prospects
      </Button>
      <header className="workspace-header">
        <div className="workspace-header__identity-row">
          <BusinessIdentity
            title
            websiteDomain={website?.domain}
            websiteUrl={website?.url}
            workspace={workspace}
          />
          <div className="workspace-header__identity-actions">
            <IconButton
              className="workspace-header__settings-button"
              label="Open prospect settings"
              onClick={onOpenSettings}
              ref={settingsButtonRef}
              variant="quiet"
            >
              <Settings aria-hidden="true" size={18} />
            </IconButton>
          </div>
        </div>
        {canApprove && !isApproved ? (
          <div className="workspace-header__actions">
            <Button onClick={onApprove} variant="primary">
              <Check aria-hidden="true" size={16} /> Approve for outreach
            </Button>
          </div>
        ) : null}
      </header>
      {workspace.redesignBriefs.length > 1 ? (
        <label className="workspace-version-picker">
          <span className="workspace-version-picker__label">Workspace version</span>
          <span className="workspace-version-picker__control">
            <select
              aria-label="Workspace version"
              onChange={(event) => onVersionChange?.(event.target.value)}
              value={workspace.redesignBrief?.id ?? ''}
            >
              {workspace.redesignBriefs.map((brief) => (
                <option key={brief.id} value={brief.id}>
                  Version {brief.version} · {brief.status}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" className="workspace-version-picker__icon" size={16} />
          </span>
        </label>
      ) : null}
      {(isApproved || canApprove) && (
        <div className="approval-note" role="status">
          <ShieldAlert aria-hidden="true" size={17} />
          <span>
            {isApproved
              ? 'Approved for a human-controlled outreach step. Publishing remains blocked.'
              : 'A human review is required before outreach can begin. Publishing remains blocked.'}
          </span>
        </div>
      )}
    </>
  );
}

function WorkspaceSettingsDialog({
  workspace,
  onDelete,
  open,
  onOpenChange,
}: {
  workspace: ProspectWorkspace;
  onDelete: () => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="workspace-settings-overlay" />
        <Dialog.Content className="workspace-settings-dialog">
          <Dialog.Title className="sr-only">Prospect settings</Dialog.Title>
          <Dialog.Close asChild>
            <IconButton label="Close prospect settings" variant="quiet">
              <X aria-hidden="true" size={18} />
            </IconButton>
          </Dialog.Close>
          <ProspectSettingsPanel onDelete={onDelete} workspace={workspace} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function LoadingBrand() {
  return (
    <span aria-label="Made Solid Studio" className="workspace-loading__brand">
      <span aria-hidden="true" className="workspace-loading__mark" />
      <strong aria-hidden="true" className="workspace-loading__wordmark">
        <span>Made Solid</span> <span className="brand__studio">Studio</span>
      </strong>
    </span>
  );
}

function WorkspaceLoadingOverlay({
  loading,
  onComplete,
}: {
  loading: boolean;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<'entering' | 'departing'>('entering');

  useEffect(() => {
    if (loading) return;
    const departure = window.setTimeout(() => setPhase('departing'), 650);
    const complete = window.setTimeout(onComplete, 1_750);
    return () => {
      window.clearTimeout(departure);
      window.clearTimeout(complete);
    };
  }, [loading, onComplete]);

  return (
    <div
      aria-label="Loading Made Solid Studio workspace"
      aria-live="polite"
      className="workspace-loading"
      data-phase={phase}
      role="status"
    >
      <LoadingBrand />
      <p>{phase === 'entering' ? 'Preparing your workspace' : 'Workspace ready'}</p>
    </div>
  );
}

function WorkspaceErrorOverlay({
  message,
  onSignOut,
}: {
  message: string;
  onSignOut?: () => Promise<void>;
}) {
  return (
    <div aria-live="assertive" className="workspace-loading workspace-loading--error" role="alert">
      <LoadingBrand />
      <p>{message}</p>
      <div className="workspace-loading__error-actions">
        <Button onClick={() => window.location.reload()} variant="secondary">
          Try again
        </Button>
        {onSignOut ? (
          <Button onClick={() => void onSignOut()} variant="quiet">
            Sign out
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ProspectSettingsPanel({
  workspace,
  onDelete,
}: {
  workspace: ProspectWorkspace;
  onDelete: () => Promise<void>;
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function confirmDeletion() {
    setIsDeleting(true);
    setDeleteError('');
    try {
      await onDelete();
      setDeleteDialogOpen(false);
    } catch {
      setDeleteError('The prospect could not be deleted. Check your connection and try again.');
    } finally {
      setIsDeleting(false);
    }
  }

  if (workspace.business.kind !== 'prospect') {
    return (
      <Card className="workspace-panel">
        <Eyebrow>Settings</Eyebrow>
        <h2>Client settings</h2>
        <p className="muted-copy">No client-level settings are available yet.</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="workspace-panel">
        <Eyebrow>Settings</Eyebrow>
        <h2>Prospect settings</h2>
        <p className="muted-copy">Manage irreversible actions separately from day-to-day work.</p>
        <section aria-labelledby="danger-zone-title" className="danger-zone">
          <div>
            <h3 id="danger-zone-title">Delete prospect</h3>
            <p>
              Permanently remove {workspace.business.name} and its research, tasks, and generated
              records.
            </p>
          </div>
          <Button onClick={() => setDeleteDialogOpen(true)} variant="danger">
            <Trash2 aria-hidden="true" size={16} /> Delete prospect
          </Button>
        </section>
      </Card>
      <ConfirmationDialog
        confirmLabel="Delete prospect"
        detail={`Delete ${workspace.business.name} and all of its research, tasks, and generated records? This cannot be undone.`}
        error={deleteError}
        isConfirming={isDeleting}
        onConfirm={() => void confirmDeletion()}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setDeleteError('');
        }}
        open={deleteDialogOpen}
        title="Delete this prospect?"
      />
    </>
  );
}

function TaskList({ tasks, onToggle }: { tasks: Task[]; onToggle: (task: Task) => Promise<void> }) {
  const [optimisticStates, setOptimisticStates] = useState<Record<string, Task['state']>>({});

  async function toggle(task: Task) {
    const nextState = task.state === 'done' ? 'open' : 'done';
    setOptimisticStates((current) => ({ ...current, [task.id]: nextState }));
    await onToggle(task);
    setOptimisticStates((current) => {
      const remaining = { ...current };
      delete remaining[task.id];
      return remaining;
    });
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <label className="task-row" key={task.id}>
          <input
            checked={(optimisticStates[task.id] ?? task.state) === 'done'}
            onChange={() => void toggle(task)}
            type="checkbox"
          />
          <span>{task.body}</span>
        </label>
      ))}
    </div>
  );
}

function captureTone(
  status: NonNullable<ProspectWorkspace['latestCapture']>['status'] | undefined,
) {
  if (status === 'ready') return 'success' as const;
  if (status === 'failed') return 'danger' as const;
  if (status === 'cancelled') return 'warning' as const;
  if (status === 'queued' || status === 'running') return 'warning' as const;
  return 'neutral' as const;
}

function captureLabel(
  status: NonNullable<ProspectWorkspace['latestCapture']>['status'] | undefined,
) {
  if (status === 'queued') return 'Capture queued';
  if (status === 'running') return 'Capture running';
  if (status === 'ready') return 'Capture complete';
  if (status === 'failed') return 'Capture failed';
  if (status === 'cancelled') return 'Capture cancelled';
  return 'Not requested';
}

function captureIsActive(capture: ProspectWorkspace['latestCapture']) {
  return (
    capture?.status === 'queued' ||
    capture?.status === 'running' ||
    (Boolean(capture?.cancelRequestedAt) && !capture?.completedAt)
  );
}

function captureProgressLabel(capture: NonNullable<ProspectWorkspace['latestCapture']>) {
  if (capture.progressDetail) return capture.progressDetail;
  return capture.status === 'queued'
    ? 'Waiting for the protected worker to begin.'
    : 'Discovering public pages and saving private responsive evidence.';
}

function captureFailureStage(phase?: string) {
  if (phase === 'saving_page') return 'Saving page evidence';
  if (phase === 'saving_asset') return 'Saving visual asset';
  if (phase === 'capturing_assets') return 'Collecting visual assets';
  if (phase === 'finalizing') return 'Preparing Research Packet';
  if (phase === 'discovering') return 'Discovering public pages';
  return 'Capturing public page';
}

function evidenceStateLabel(state: ProspectWorkspace['facts'][number]['verificationState']) {
  if (state === 'captured' || state === 'not_collected') return 'Captured from website';
  if (state === 'inferred') return 'Uncertain';
  if (state === 'verified') return 'Confirmed';
  return 'Rejected';
}

function evidenceStateTone(state: ProspectWorkspace['facts'][number]['verificationState']) {
  if (state === 'verified') return 'success' as const;
  if (state === 'inferred' || state === 'rejected') return 'warning' as const;
  return 'neutral' as const;
}

function ResearchCapturePanel({
  workspace,
  onRequestCapture,
  onContinueCapture,
  onCancelCapture,
  onRequestAssetRefresh,
}: {
  workspace: ProspectWorkspace;
  onRequestCapture: () => Promise<void>;
  onContinueCapture: () => Promise<void>;
  onCancelCapture: () => Promise<void>;
  onRequestAssetRefresh: () => Promise<void>;
}) {
  const [state, setState] = useState<'idle' | 'requesting' | 'error'>('idle');
  const [continuing, setContinuing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState('');
  const [refreshingAssets, setRefreshingAssets] = useState(false);
  const capture = workspace.latestCapture;
  const isActive = captureIsActive(capture);

  async function requestCapture() {
    setState('requesting');
    setMessage('');
    try {
      await onRequestCapture();
      setState('idle');
    } catch {
      setState('error');
      setMessage('The website capture could not be queued. Check the connection and try again.');
    }
  }

  async function cancelCapture() {
    setCancelling(true);
    setMessage('');
    try {
      await onCancelCapture();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'The website capture could not be cancelled.',
      );
    } finally {
      setCancelling(false);
    }
  }

  async function continueCapture() {
    setContinuing(true);
    setMessage('');
    try {
      await onContinueCapture();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'The website capture could not be continued.',
      );
    } finally {
      setContinuing(false);
    }
  }

  async function refreshImages() {
    setRefreshingAssets(true);
    setMessage('');
    try {
      await onRequestAssetRefresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'The image-only refresh could not be queued.',
      );
    } finally {
      setRefreshingAssets(false);
    }
  }

  return (
    <section aria-labelledby="website-capture-title" className="research-capture">
      <div className="research-capture__header">
        <div>
          <Eyebrow>Private capture</Eyebrow>
          <h2 id="website-capture-title">Website capture</h2>
          <p>
            Discover and save crawlable public-page structure, content, forms, metadata, and
            original assets as private evidence. Visual screenshots are deferred to pitch and report
            work. It does not publish, contact the business, or treat extracted text as fact.
          </p>
        </div>
        <div className="research-capture__actions">
          <StatusBadge tone={captureTone(capture?.status)}>
            {captureLabel(capture?.status)}
          </StatusBadge>
          <Button
            disabled={state === 'requesting' || isActive || !workspace.website}
            onClick={() => void requestCapture()}
            type="button"
          >
            <Play aria-hidden="true" size={16} />
            {state === 'requesting'
              ? 'Queueing capture'
              : isActive
                ? capture?.status === 'running'
                  ? 'Capture running'
                  : 'Capture queued'
                : capture
                  ? 'Capture website again'
                  : 'Start website capture'}
          </Button>
          {capture?.status === 'failed' && !capture.cancelRequestedAt ? (
            <Button
              disabled={continuing}
              onClick={() => void continueCapture()}
              type="button"
              variant="secondary"
            >
              <RotateCcw aria-hidden="true" size={16} />
              {continuing ? 'Continuing scrape' : 'Continue scraping'}
            </Button>
          ) : null}
          {isActive ? (
            <Button
              disabled={cancelling || Boolean(capture?.cancelRequestedAt)}
              onClick={() => void cancelCapture()}
              type="button"
              variant="secondary"
            >
              <Ban aria-hidden="true" size={16} />
              {cancelling || capture?.cancelRequestedAt ? 'Stopping capture' : 'Cancel capture'}
            </Button>
          ) : null}
        </div>
      </div>
      {workspace.latestCapture?.status === 'ready' ? (
        <details className="asset-refresh-control">
          <summary>Advanced image refresh</summary>
          <p className="muted-copy">
            Rescan the already captured public pages for images only. Existing source URLs are
            skipped; pages, facts, and asset analysis are unchanged.
          </p>
          <Button
            disabled={
              refreshingAssets ||
              workspace.assetRefresh?.status === 'queued' ||
              workspace.assetRefresh?.status === 'running'
            }
            onClick={() => void refreshImages()}
            type="button"
            variant="secondary"
          >
            <RotateCcw aria-hidden="true" size={16} />
            {refreshingAssets ||
            workspace.assetRefresh?.status === 'queued' ||
            workspace.assetRefresh?.status === 'running'
              ? 'Image refresh running'
              : 'Refresh images only'}
          </Button>
          {workspace.assetRefresh ? (
            <p className="muted-copy" role="status">
              {workspace.assetRefresh.progressDetail || workspace.assetRefresh.status}
            </p>
          ) : null}
        </details>
      ) : null}

      {capture ? (
        <>
          {isActive ? (
            <div className={`capture-progress capture-progress--${capture.status}`}>
              <div
                aria-label="Website capture progress"
                aria-valuetext={captureProgressLabel(capture)}
                className="capture-progress__track"
                role="progressbar"
              >
                <span className="capture-progress__bar" />
              </div>
              <span>{captureProgressLabel(capture)}</span>
            </div>
          ) : null}
          <p className="research-capture__status" role="status">
            {capture.status === 'queued'
              ? 'The website capture is queued for the protected worker. No website data has been stored yet.'
              : capture.status === 'running'
                ? 'The protected worker is discovering and capturing public pages. Results will appear here when it completes.'
                : capture.status === 'cancelled'
                  ? 'Cancellation has been requested. The worker will stop after its current safe capture step; any saved evidence below is partial and remains private.'
                  : capture.status === 'ready'
                    ? 'The capture is complete. Captured source material is ready for research; only uncertain information and external decisions need approval.'
                    : capture.errorSummary ||
                      'The last capture failed. Review the website URL, then request another website capture.'}
          </p>
          {capture.status === 'failed' ? (
            <dl className="research-capture__failure" aria-label="Capture failure details">
              <div>
                <dt>Stopped during</dt>
                <dd>{captureFailureStage(capture.failurePhase)}</dd>
              </div>
              <div>
                <dt>Recovery</dt>
                <dd>
                  Continue scraping retries this step first, then continues with saved pending
                  pages.
                </dd>
              </div>
              {capture.failureDetail ? (
                <div>
                  <dt>Worker detail</dt>
                  <dd>{capture.failureDetail}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </>
      ) : (
        <p className="research-capture__status" role="status">
          No capture has been requested. Start with a public key-page capture before creating an
          audit or redesign brief.
        </p>
      )}
      {message ? (
        <p className="form-message form-message--error" role="alert">
          {message}
        </p>
      ) : null}
    </section>
  );
}

function EvidenceFactList({
  facts,
  pages = [],
}: {
  facts: ProspectWorkspace['facts'];
  pages?: CapturedPage[];
}) {
  const contacts = facts.filter(
    (fact) => fact.label === 'Contact email' || fact.label === 'Contact phone',
  );
  const contentFacts = facts.filter((fact) =>
    ['Page title', 'Primary heading', 'Meta description'].includes(fact.label),
  );
  const technicalFacts = facts.filter(
    (fact) => !contacts.includes(fact) && !contentFacts.includes(fact),
  );
  const uniqueContacts = [
    ...new Map(
      contacts.map((fact) => [`${fact.label}:${fact.value.toLowerCase()}`, fact]),
    ).values(),
  ];
  const factsByPage = new Map<string, ProspectWorkspace['facts']>();
  contentFacts.forEach((fact) => {
    const source = fact.sourceUrl ?? 'captured-source';
    factsByPage.set(source, [...(factsByPage.get(source) ?? []), fact]);
  });
  const pageGroups = [...factsByPage.entries()];
  const visiblePageGroups = pageGroups.slice(0, 4);
  const remainingPageGroups = pageGroups.slice(4);

  return (
    <div className="evidence-facts">
      {uniqueContacts.length ? (
        <section aria-labelledby="business-details-title" className="evidence-facts__contacts">
          <h4 id="business-details-title">Business details</h4>
          <div>
            {uniqueContacts.map((fact) => {
              const isEmail = fact.label === 'Contact email';
              return (
                <a href={`${isEmail ? 'mailto' : 'tel'}:${fact.value}`} key={fact.id}>
                  <small>{isEmail ? 'Email' : 'Phone'}</small>
                  <strong>{fact.value}</strong>
                </a>
              );
            })}
          </div>
        </section>
      ) : null}
      {pageGroups.length ? (
        <section aria-labelledby="page-content-title" className="evidence-facts__pages">
          <div>
            <Eyebrow>Page content</Eyebrow>
            <h4 id="page-content-title">Captured messaging by page</h4>
          </div>
          <div className="evidence-facts__page-list">
            {visiblePageGroups.map(([source, pageFacts], index) => (
              <EvidencePageFacts
                facts={pageFacts}
                key={source}
                open={index === 0}
                pages={pages}
                source={source}
              />
            ))}
          </div>
          {remainingPageGroups.length ? (
            <ListOverflow label="page records" remainingCount={remainingPageGroups.length}>
              <div className="evidence-facts__page-list">
                {remainingPageGroups.map(([source, pageFacts]) => (
                  <EvidencePageFacts facts={pageFacts} key={source} pages={pages} source={source} />
                ))}
              </div>
            </ListOverflow>
          ) : null}
        </section>
      ) : null}
      {technicalFacts.length ? (
        <details className="evidence-facts__technical">
          <summary>
            <span>
              <strong>Technical evidence</strong>
              <small>{technicalFacts.length} captured records</small>
            </span>
          </summary>
          <div>
            {technicalFacts.map((fact) => (
              <EvidenceFactRow fact={fact} key={fact.id} />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function EvidencePageFacts({
  source,
  facts,
  pages,
  open = false,
}: {
  source: string;
  facts: ProspectWorkspace['facts'];
  pages: CapturedPage[];
  open?: boolean;
}) {
  const page = pages.find((candidate) => candidate.url === source);
  const title = page?.title || facts.find((fact) => fact.label === 'Page title')?.value || source;
  const path = source === 'captured-source' ? 'Captured source' : new URL(source).pathname || '/';
  return (
    <details className="evidence-facts__page" open={open}>
      <summary>
        <span>
          <strong>{title}</strong>
          <small>{path}</small>
        </span>
        <b>{facts.length} facts</b>
      </summary>
      <div>
        {facts.map((fact) => (
          <EvidenceFactRow fact={fact} key={fact.id} />
        ))}
      </div>
    </details>
  );
}

function EvidenceFactRow({ fact }: { fact: ProspectWorkspace['facts'][number] }) {
  return (
    <div className="fact-row">
      <span>
        <strong>{fact.label}</strong>
        <b>{fact.value}</b>
        <small>{fact.evidence}</small>
      </span>
      <StatusBadge tone={evidenceStateTone(fact.verificationState)}>
        {evidenceStateLabel(fact.verificationState)}
      </StatusBadge>
    </div>
  );
}

function ListOverflow({
  remainingCount,
  label,
  children,
}: {
  remainingCount: number;
  label: string;
  children: ReactNode;
}) {
  return (
    <details className="list-overflow">
      <summary>
        View {remainingCount} more {label}
      </summary>
      <div className="list-overflow__content">{children}</div>
    </details>
  );
}

function ExpandableImage({
  src,
  alt,
  label,
  className,
  style,
  children,
}: {
  src: string;
  alt: string;
  label: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        aria-label={`Expand ${label}`}
        className={className}
        onClick={() => setOpen(true)}
        style={style}
        type="button"
      >
        {children}
      </button>
      <Dialog.Root onOpenChange={setOpen} open={open}>
        <Dialog.Portal>
          <Dialog.Overlay className="image-lightbox-overlay" />
          <Dialog.Content aria-describedby={undefined} className="image-lightbox">
            <Dialog.Title className="sr-only">{label}</Dialog.Title>
            <img alt={alt} src={src} />
            <ImageFileType sourceUrl={src} />
            <Dialog.Close asChild>
              <IconButton label={`Close ${label}`} variant="quiet">
                <X aria-hidden="true" size={18} />
              </IconButton>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function EvidenceLoadingState() {
  return (
    <section aria-busy="true" aria-label="Refreshing website evidence" className="evidence-loading">
      <p className="sr-only" role="status">
        Capturing the next page. New evidence appears here as soon as it is safely stored.
      </p>
      <div aria-hidden="true" className="fact-box evidence-loading__facts">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="fact-row evidence-loading__fact" key={index}>
            <span>
              <i className="evidence-skeleton evidence-skeleton--label" />
              <i className="evidence-skeleton evidence-skeleton--value" />
              <i className="evidence-skeleton evidence-skeleton--detail" />
            </span>
            <i className="evidence-skeleton evidence-skeleton--badge" />
          </div>
        ))}
      </div>
      <div
        aria-hidden="true"
        className="capture-evidence__screenshots evidence-loading__screenshots"
      >
        {Array.from({ length: 3 }, (_, index) => (
          <div className="evidence-loading__screenshot" key={index}>
            <i className="evidence-skeleton" />
            <i className="evidence-skeleton evidence-skeleton--caption" />
          </div>
        ))}
      </div>
    </section>
  );
}

function CapturedSiteMap({
  pages,
  artifacts,
  facts,
  capture,
}: {
  pages: CapturedPage[];
  artifacts: ResearchArtifact[];
  facts: ProspectWorkspace['facts'];
  capture?: ProspectWorkspace['latestCapture'];
}) {
  const [mapOpen, setMapOpen] = useState(false);
  if (!pages.length) return null;
  const pageGroups = new Map<string, CapturedPage[]>();
  for (const page of pages) {
    const segments = new URL(page.url).pathname.split('/').filter(Boolean);
    const group = segments[0] ?? 'Home';
    pageGroups.set(group, [...(pageGroups.get(group) ?? []), page]);
  }
  const orderedGroups = [...pageGroups.entries()].sort(([left], [right]) =>
    left === 'Home' ? -1 : right === 'Home' ? 1 : left.localeCompare(right),
  );
  const assetCount = artifacts.filter((artifact) => artifact.kind === 'asset').length;
  const formCount = pages.reduce(
    (total, page) => total + metadataNumber(page.metadata, 'formCount'),
    0,
  );
  const previewPages = pages.slice(0, 4);

  return (
    <section aria-labelledby="captured-site-map-title" className="captured-site-map">
      <div className="captured-site-map__header">
        <div>
          <Eyebrow>Capture map</Eyebrow>
          <h3 id="captured-site-map-title">Public site hierarchy and evidence</h3>
          <p className="muted-copy">
            An observed URL hierarchy from this capture. It is source evidence, not the proposed
            redesign navigation.
          </p>
        </div>
        <StatusBadge tone="neutral">{pages.length} pages observed</StatusBadge>
      </div>
      <dl className="research-summary__metrics">
        <div>
          <dt>Scope</dt>
          <dd>
            {capture?.scope === 'all_pages'
              ? 'All public pages'
              : capture?.scope === 'key_pages'
                ? 'Key pages'
                : 'Homepage'}
          </dd>
        </div>
        <div>
          <dt>Captured</dt>
          <dd>
            {capture ? (
              <time dateTime={capture.requestedAt}>{formatDateTime(capture.requestedAt)}</time>
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div>
          <dt>Pages</dt>
          <dd>{pages.length}</dd>
        </div>
        <div>
          <dt>Forms</dt>
          <dd>{formCount}</dd>
        </div>
        <div>
          <dt>Images</dt>
          <dd>{assetCount}</dd>
        </div>
        <div>
          <dt>Facts</dt>
          <dd>{facts.length}</dd>
        </div>
      </dl>
      <button
        aria-haspopup="dialog"
        className="captured-site-map__preview"
        onClick={() => setMapOpen(true)}
        type="button"
      >
        <span className="captured-site-map__root">
          <FolderTree aria-hidden="true" size={18} />
          <span>{new URL(pages[0].url).hostname}</span>
        </span>
        <span className="captured-site-map__preview-list">
          {previewPages.map((page) => {
            const path = new URL(page.url).pathname || '/';
            return <span key={page.id}>{path}</span>;
          })}
        </span>
        <span className="captured-site-map__preview-action">
          View full URL map ({pages.length} {pages.length === 1 ? 'page' : 'pages'})
        </span>
      </button>
      <Dialog.Root onOpenChange={setMapOpen} open={mapOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="image-preview-overlay" />
          <Dialog.Content className="captured-site-map__dialog">
            <div className="captured-site-map__dialog-header">
              <div>
                <Dialog.Title>Full URL map</Dialog.Title>
                <Dialog.Description>
                  Captured public-page hierarchy and the source evidence available for review.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <IconButton label="Close full URL map" variant="quiet">
                  <X aria-hidden="true" size={18} />
                </IconButton>
              </Dialog.Close>
            </div>
            <div className="captured-site-map__body">
              <div className="captured-site-map__tree" aria-label="Captured URL hierarchy">
                <div className="captured-site-map__root">
                  <FolderTree aria-hidden="true" size={18} />
                  <span>{new URL(pages[0].url).hostname}</span>
                </div>
                <ol>
                  {orderedGroups.map(([group, groupPages]) => (
                    <li key={group}>
                      <details open={group === 'Home' || groupPages.length <= 4}>
                        <summary>
                          <span>{group === 'Home' ? '/' : `/${group}`}</span>
                          <small>
                            {groupPages.length} {groupPages.length === 1 ? 'page' : 'pages'}
                          </small>
                        </summary>
                        <ul>
                          {groupPages.map((page) => {
                            const path = new URL(page.url).pathname || '/';
                            return (
                              <li key={page.id}>
                                <a href={page.url} rel="noreferrer" target="_blank">
                                  <span>{page.title || path}</span>
                                  <small>{path}</small>
                                </a>
                                <StatusBadge
                                  tone={
                                    page.statusCode && page.statusCode < 400 ? 'success' : 'warning'
                                  }
                                >
                                  {page.statusCode ?? '—'}
                                </StatusBadge>
                              </li>
                            );
                          })}
                        </ul>
                      </details>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="captured-site-map__legend">
                <h4>What this capture contains</h4>
                <ul>
                  <li>
                    <Globe2 aria-hidden="true" size={17} />
                    <span>
                      <b>Pages and paths</b>
                      <small>
                        Response, title, canonical URL, headings, navigation, and content structure.
                      </small>
                    </span>
                  </li>
                  <li>
                    <FormInput aria-hidden="true" size={17} />
                    <span>
                      <b>Actions and forms</b>
                      <small>
                        Observed calls to action, forms, fields, and public contact signals.
                      </small>
                    </span>
                  </li>
                  <li>
                    <FileImage aria-hidden="true" size={17} />
                    <span>
                      <b>Visual material</b>
                      <small>
                        Saved page images and optional responsive screenshots, grouped below by
                        source page.
                      </small>
                    </span>
                  </li>
                  <li>
                    <FileText aria-hidden="true" size={17} />
                    <span>
                      <b>Source records</b>
                      <small>
                        Private HTML, extracted text, metadata, and capture artifacts for review.
                      </small>
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}

function PageInventory({ pages, assets }: { pages: CapturedPage[]; assets: ResearchArtifact[] }) {
  const [query, setQuery] = useState('');
  const [previewAsset, setPreviewAsset] = useState<ResearchArtifact>();
  const { urls, loadError } = usePrivateArtifactUrls(
    assets,
    'Private page images could not be loaded. Refresh and check storage access.',
  );
  if (!pages.length) return null;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matchingPages = normalizedQuery
    ? pages.filter((page) =>
        [page.title, page.url, page.pageType]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase()
          .includes(normalizedQuery),
      )
    : pages;
  const visiblePages = normalizedQuery ? matchingPages : matchingPages.slice(0, 4);
  const remainingPages = normalizedQuery ? [] : matchingPages.slice(4);
  return (
    <section aria-labelledby="page-inventory-title" className="page-inventory">
      <div>
        <Eyebrow>Page inventory</Eyebrow>
        <h3 id="page-inventory-title">Captured public pages</h3>
      </div>
      <details className="page-inventory__disclosure">
        <summary>
          Browse {pages.length} captured page{pages.length === 1 ? '' : 's'}
        </summary>
        <label className="input-row page-inventory__search">
          <Search aria-hidden="true" size={16} />
          <span className="sr-only">Search captured public pages</span>
          <input
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search pages by title, URL, or type"
            type="search"
            value={query}
          />
        </label>
        {normalizedQuery ? (
          <p aria-live="polite" className="muted-copy">
            {matchingPages.length
              ? `${matchingPages.length} ${matchingPages.length === 1 ? 'page' : 'pages'} found.`
              : 'No captured pages match this search.'}
          </p>
        ) : null}
        {visiblePages.length ? (
          <div className="page-inventory__list">
            {visiblePages.map((page) => (
              <PageInventoryItem
                assets={assets}
                key={page.id}
                onPreview={setPreviewAsset}
                page={page}
                urls={urls}
              />
            ))}
          </div>
        ) : null}
        {remainingPages.length ? (
          <ListOverflow label="captured pages" remainingCount={remainingPages.length}>
            <div className="page-inventory__list page-inventory__list--overflow">
              {remainingPages.map((page) => (
                <PageInventoryItem
                  assets={assets}
                  key={page.id}
                  onPreview={setPreviewAsset}
                  page={page}
                  urls={urls}
                />
              ))}
            </div>
          </ListOverflow>
        ) : null}
      </details>
      {loadError ? <p className="form-message form-message--error">{loadError}</p> : null}
      <Dialog.Root
        onOpenChange={(open) => !open && setPreviewAsset(undefined)}
        open={Boolean(previewAsset)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="image-preview-overlay" />
          <Dialog.Content className="image-preview-dialog">
            <div className="image-preview-dialog__header">
              <div>
                <Dialog.Title>{previewAsset?.label || 'Captured image'}</Dialog.Title>
                <Dialog.Description>
                  {previewAsset ? recordValue(previewAsset.metadata, 'pageUrl') : ''}
                </Dialog.Description>
                {previewAsset ? (
                  <ImageFileType
                    contentType={previewAsset.contentType}
                    path={previewAsset.storagePath}
                  />
                ) : null}
              </div>
              <Dialog.Close asChild>
                <IconButton label="Close image preview" variant="quiet">
                  <X aria-hidden="true" size={18} />
                </IconButton>
              </Dialog.Close>
            </div>
            {previewAsset && urls[previewAsset.id] ? (
              <img alt="" src={urls[previewAsset.id]} />
            ) : (
              <div className="image-preview-dialog__loading">Loading image...</div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}

function PageInventoryItem({
  page,
  assets,
  urls,
  onPreview,
}: {
  page: CapturedPage;
  assets: ResearchArtifact[];
  urls: Record<string, string>;
  onPreview: (asset: ResearchArtifact) => void;
}) {
  const [imagesOpen, setImagesOpen] = useState(false);
  const pageKeys = new Set(
    [page.url, page.canonicalUrl].filter((url): url is string => Boolean(url)).map(pageUrlKey),
  );
  const pageAssets = assets.filter((asset) =>
    [recordValue(asset.metadata, 'pageUrl'), ...recordList(asset.metadata, 'pageUrls')]
      .filter((url): url is string => typeof url === 'string')
      .some((url) => pageKeys.has(pageUrlKey(url))),
  );
  const imageCount = metadataNumber(page.metadata, 'imageCount');
  const hasImageInventory = Boolean(pageAssets.length || imageCount);
  return (
    <article className="page-inventory__item">
      <div className="page-inventory__page-header">
        <button
          aria-controls={`page-images-${page.id}`}
          aria-expanded={imagesOpen}
          className="page-inventory__page-toggle"
          disabled={!hasImageInventory}
          onClick={() => setImagesOpen((open) => !open)}
          type="button"
        >
          <span>
            <strong>{page.title || page.url}</strong>
            <small>{new URL(page.url).pathname || '/'}</small>
          </span>
          <span className="page-inventory__meta">
            <b>{page.pageType ?? 'page'}</b>
            <small>{page.statusCode ?? 'No'} response</small>
            <small>{pageSummary(page)}</small>
            {hasImageInventory ? (
              <small>
                {imageCount || pageAssets.length} {imageCount === 1 ? 'image' : 'images'}
              </small>
            ) : null}
          </span>
        </button>
        <ButtonLink
          aria-label={`Open captured page: ${page.title || page.url}`}
          className="page-inventory__external"
          href={page.url}
          rel="noreferrer"
          size="icon"
          target="_blank"
          variant="quiet"
        >
          <ArrowUpRight aria-hidden="true" size={17} />
        </ButtonLink>
      </div>
      {hasImageInventory ? (
        <div className="page-inventory__images" hidden={!imagesOpen} id={`page-images-${page.id}`}>
          <div>
            {pageAssets.length ? (
              pageAssets.map((asset) => (
                <button
                  aria-label={`Preview ${asset.label || 'captured image'}`}
                  key={asset.id}
                  onClick={() => onPreview(asset)}
                  type="button"
                >
                  {urls[asset.id] ? (
                    <>
                      <img alt="" src={urls[asset.id]} />
                      <ImageFileType contentType={asset.contentType} path={asset.storagePath} />
                    </>
                  ) : (
                    <span>Loading image</span>
                  )}
                </button>
              ))
            ) : (
              <p className="muted-copy">
                No private image files were saved for this page in this capture. Run a new capture
                to collect them.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function pageUrlKey(value: string) {
  try {
    const url = new URL(value);
    url.hash = '';
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url.toString();
  } catch {
    return value.replace(/\/+$/, '');
  }
}

function pageSummary(page: CapturedPage) {
  const formCount = metadataNumber(page.metadata, 'formCount');
  const missingAlt = metadataNumber(page.metadata, 'imagesWithoutAlt');
  const signals = [];
  if (formCount) signals.push(`${formCount} ${formCount === 1 ? 'form' : 'forms'}`);
  if (missingAlt) signals.push(`${missingAlt} images without alt text`);
  return signals.join(' · ') || 'Page captured';
}

function metadataNumber(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function screenshotViewport(artifact: ResearchArtifact) {
  const viewport = artifact.metadata.viewport;
  if (
    typeof viewport === 'object' &&
    viewport !== null &&
    typeof (viewport as Record<string, unknown>).width === 'number' &&
    typeof (viewport as Record<string, unknown>).height === 'number'
  ) {
    return viewport as { width: number; height: number };
  }
  return undefined;
}

function artifactSourceUrl(artifact: ResearchArtifact) {
  return typeof artifact.metadata.sourceUrl === 'string' ? artifact.metadata.sourceUrl : undefined;
}

function artifactPageTitle(artifact: ResearchArtifact) {
  return typeof artifact.metadata.title === 'string' && artifact.metadata.title.trim()
    ? artifact.metadata.title
    : (artifactSourceUrl(artifact) ?? artifact.label ?? 'Captured page');
}

function previewWidth(viewport?: { width: number; height: number }) {
  if (!viewport || viewport.width >= 1200) return '100%';
  if (viewport.width >= 600) return '68%';
  return '42%';
}

function groupScreenshotsByPage(artifacts: ResearchArtifact[]) {
  const pages = new Map<string, ResearchArtifact[]>();
  artifacts.forEach((artifact) => {
    const sourceUrl = artifactSourceUrl(artifact) ?? artifact.id;
    pages.set(sourceUrl, [...(pages.get(sourceUrl) ?? []), artifact]);
  });
  return [...pages.entries()];
}

function CaptureArtifacts({
  artifacts,
  eyebrow = 'Responsive views',
  title = 'Screenshots by captured page',
  titleId = 'capture-evidence-title',
}: {
  artifacts: ResearchArtifact[];
  eyebrow?: string;
  title?: string;
  titleId?: string;
}) {
  const { urls, loadError } = usePrivateArtifactUrls(
    artifacts,
    'Private previews could not be loaded. Refresh and check storage access.',
  );
  const screenshots = artifacts.filter((artifact) => artifact.kind === 'screenshot');
  const documents = artifacts.filter((artifact) => artifact.kind !== 'screenshot');
  const screenshotPages = groupScreenshotsByPage(screenshots);

  if (!artifacts.length) return null;

  return (
    <section aria-labelledby={titleId} className="capture-evidence">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3 id={titleId}>{title}</h3>
      </div>
      {screenshots.length ? (
        <div className="capture-evidence__pages">
          {screenshotPages.map(([sourceUrl, pageScreenshots], index) => (
            <details className="capture-evidence__page" key={sourceUrl} open={index === 0}>
              <summary>
                <span>
                  <strong>{artifactPageTitle(pageScreenshots[0])}</strong>
                  <small>{sourceUrl ? new URL(sourceUrl).pathname || '/' : 'Captured page'}</small>
                </span>
                <b>{pageScreenshots.length} views</b>
              </summary>
              <div className="capture-evidence__screenshots">
                {pageScreenshots.map((artifact) => {
                  const viewport = screenshotViewport(artifact);
                  return (
                    <ExpandableImage
                      alt={`${artifact.label ?? 'Page'} captured preview`}
                      className="capture-evidence__screenshot"
                      key={artifact.id}
                      label={artifact.label ?? 'screenshot'}
                      src={urls[artifact.id] ?? ''}
                      style={{ '--capture-preview-width': previewWidth(viewport) } as CSSProperties}
                    >
                      <span className="capture-evidence__device">
                        {urls[artifact.id] ? (
                          <img
                            alt={`${artifact.label ?? 'Page'} captured preview`}
                            src={urls[artifact.id]}
                          />
                        ) : (
                          <span>Loading preview...</span>
                        )}
                      </span>
                      <strong>{artifact.label ?? 'Screenshot'}</strong>
                      <ImageFileType
                        contentType={artifact.contentType}
                        path={artifact.storagePath}
                      />
                      {viewport ? (
                        <small>
                          {viewport.width} x {viewport.height}
                        </small>
                      ) : null}
                    </ExpandableImage>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      ) : null}
      {documents.length ? (
        <details className="technical-evidence">
          <summary>
            <span>Technical source files</span>
            <small>{documents.length} saved files</small>
          </summary>
          <p className="muted-copy">
            Raw HTML, extracted text, timing data, and automated-check output for detailed analysis.
          </p>
          <div className="capture-evidence__documents">
            {documents.map((artifact) => (
              <a href={urls[artifact.id]} key={artifact.id} rel="noreferrer" target="_blank">
                {artifact.label ?? 'Capture file'}
              </a>
            ))}
          </div>
        </details>
      ) : null}
      {loadError ? <p className="form-message form-message--error">{loadError}</p> : null}
    </section>
  );
}

function recordValue(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

function recordList(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return Array.isArray(value) ? value : [];
}

type PrivateArtifactReference = Pick<ResearchArtifact, 'id' | 'storageBucket' | 'storagePath'>;

function usePrivateArtifactUrls(artifacts: PrivateArtifactReference[], errorMessage: string) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState('');
  const client = getSupabaseClient();
  const artifactKey = artifacts
    .map((artifact) => `${artifact.id}:${artifact.storageBucket}:${artifact.storagePath}`)
    .join('|');
  const stableArtifacts = useMemo(() => artifacts, [artifactKey]);

  useEffect(() => {
    if (!client || stableArtifacts.length === 0) {
      setUrls({});
      return;
    }
    let active = true;
    setLoadError('');
    void Promise.allSettled(
      stableArtifacts.map(async (artifact) => {
        const { data, error } = await client.storage
          .from(artifact.storageBucket)
          .createSignedUrl(artifact.storagePath, 60 * 30);
        if (error || !data?.signedUrl) throw new Error('Could not load a private artifact.');
        return [artifact.id, data.signedUrl] as const;
      }),
    ).then((results) => {
      if (!active) return;
      const entries = results.flatMap((result) =>
        result.status === 'fulfilled' ? [result.value] : [],
      );
      setUrls(Object.fromEntries(entries));
      if (entries.length !== stableArtifacts.length) setLoadError(errorMessage);
    });
    return () => {
      active = false;
    };
  }, [client, errorMessage, stableArtifacts]);

  return { urls, loadError };
}

function isImagePreviewFile(file: BuilderArtifact) {
  return (
    file.contentType?.startsWith('image/') === true ||
    /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(file.storagePath)
  );
}

function isTextPreviewFile(file: BuilderArtifact) {
  return (
    file.contentType?.startsWith('text/') === true ||
    /\.(css|csv|html?|js|json|jsx|md|mjs|svg|ts|tsx|txt|xml|ya?ml)$/i.test(file.storagePath)
  );
}

function isWorkingSourceArtifact(file: BuilderArtifact) {
  return (
    file.kind === 'draft_file' &&
    file.metadata.state !== 'compiled_working_draft' &&
    isTextPreviewFile(file)
  );
}

function latestArtifactsByLabel(files: BuilderArtifact[]) {
  const latest = new Map<string, BuilderArtifact>();
  for (const file of files) {
    const current = latest.get(file.label);
    if (!current || current.createdAt < file.createdAt) latest.set(file.label, file);
  }
  return [...latest.values()];
}

function changedLineNumbers(previous: string, current: string) {
  const before = previous.split('\n');
  const after = current.split('\n');
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start])
    start += 1;
  if (start === before.length && start === after.length) return [];

  let beforeEnd = before.length - 1;
  let afterEnd = after.length - 1;
  while (beforeEnd >= start && afterEnd >= start && before[beforeEnd] === after[afterEnd]) {
    beforeEnd -= 1;
    afterEnd -= 1;
  }
  return Array.from({ length: afterEnd - start + 1 }, (_, index) => start + index + 1);
}

function SourcePreview({
  content,
  highlightedLines = [],
  startLine = 1,
}: {
  content: string;
  highlightedLines?: number[];
  startLine?: number;
}) {
  const highlighted = new Set(highlightedLines);
  if (!highlighted.size)
    return (
      <pre className="builder-file-preview-dialog__source" tabIndex={0}>
        {content}
      </pre>
    );
  return (
    <pre
      className="builder-file-preview-dialog__source builder-file-preview-dialog__source--diff"
      tabIndex={0}
    >
      {content.split('\n').map((line, index) => (
        <span
          className={highlighted.has(index + startLine) ? 'is-changed' : undefined}
          key={`${index}-${line}`}
        >
          <span aria-hidden="true" className="builder-file-preview-dialog__line-number">
            {index + startLine}
          </span>
          {line}
          {'\n'}
        </span>
      ))}
    </pre>
  );
}

type BuilderExplorerEntry = {
  artifact: BuilderArtifact;
  path: string;
};

type BuilderRunEvidenceState =
  | { status: 'loading' }
  | { status: 'ready'; evidence: BuilderRunEvidence }
  | { status: 'error'; message: string };

type BuilderExplorerFolder = {
  name: string;
  path: string;
  folders: Map<string, BuilderExplorerFolder>;
  files: BuilderExplorerEntry[];
};

function latestBuilderExplorerEntries(
  artifacts: BuilderArtifact[],
  pathFor: (artifact: BuilderArtifact) => string,
) {
  const latest = new Map<string, BuilderExplorerEntry>();
  artifacts.forEach((artifact) => {
    const path = pathFor(artifact).replace(/^\/+/, '');
    const current = latest.get(path);
    if (!current || current.artifact.createdAt < artifact.createdAt) {
      latest.set(path, { artifact, path });
    }
  });
  return [...latest.values()].sort((left, right) => left.path.localeCompare(right.path));
}

function builderSourceExplorerEntries(artifacts: BuilderArtifact[]) {
  const finalSource = artifacts.filter(
    (artifact) => artifact.kind === 'draft_file' && artifact.metadata.state === 'final_source',
  );
  const sourceArtifacts = finalSource.length
    ? finalSource
    : artifacts.filter((artifact) => isWorkingSourceArtifact(artifact));
  return latestBuilderExplorerEntries(sourceArtifacts, (artifact) =>
    artifact.metadata.state === 'final_source' || artifact.label.startsWith('src/')
      ? artifact.label
      : `src/${artifact.label}`,
  );
}

function builderOutputExplorerEntries(artifacts: BuilderArtifact[]) {
  return latestBuilderExplorerEntries(
    artifacts.filter((artifact) => artifact.kind === 'site_file'),
    (artifact) => artifact.label,
  );
}

function buildBuilderExplorerTree(entries: BuilderExplorerEntry[]): BuilderExplorerFolder {
  const root: BuilderExplorerFolder = {
    name: 'Project',
    path: '',
    folders: new Map(),
    files: [],
  };
  entries.forEach((entry) => {
    const segments = entry.path.split('/').filter(Boolean);
    const fileName = segments.pop();
    if (!fileName) return;
    let folder = root;
    segments.forEach((segment) => {
      const childPath = [folder.path, segment].filter(Boolean).join('/');
      const child = folder.folders.get(segment) ?? {
        name: segment,
        path: childPath,
        folders: new Map(),
        files: [],
      };
      folder.folders.set(segment, child);
      folder = child;
    });
    folder.files.push(entry);
  });
  return root;
}

function builderExplorerFolderFileCount(folder: BuilderExplorerFolder): number {
  return (
    folder.files.length +
    [...folder.folders.values()].reduce(
      (total, child) => total + builderExplorerFolderFileCount(child),
      0,
    )
  );
}

function BuilderExplorerTree({
  folder,
  selectedPath,
  onSelect,
  expandAll = false,
  depth = 0,
}: {
  folder: BuilderExplorerFolder;
  selectedPath?: string;
  onSelect: (entry: BuilderExplorerEntry) => void;
  expandAll?: boolean;
  depth?: number;
}) {
  const [folderOpen, setFolderOpen] = useState(depth === 1);
  const childFolders = [...folder.folders.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  const files = [...folder.files].sort((left, right) => left.path.localeCompare(right.path));
  const contents = (
    <div className="builder-file-explorer__branch">
      {childFolders.map((child) => (
        <BuilderExplorerTree
          depth={depth + 1}
          folder={child}
          key={child.path}
          onSelect={onSelect}
          expandAll={expandAll}
          selectedPath={selectedPath}
        />
      ))}
      {files.map((entry) => {
        const fileName = entry.path.split('/').pop() ?? entry.path;
        return (
          <Button
            aria-current={entry.path === selectedPath ? 'true' : undefined}
            className={entry.path === selectedPath ? 'is-selected' : undefined}
            key={entry.artifact.id}
            onClick={() => onSelect(entry)}
            title={entry.path}
            variant="tree"
          >
            {isImagePreviewFile(entry.artifact) ? (
              <FileImage aria-hidden="true" size={16} />
            ) : isTextPreviewFile(entry.artifact) ? (
              <FileCode2 aria-hidden="true" size={16} />
            ) : (
              <FileText aria-hidden="true" size={16} />
            )}
            <span>{fileName}</span>
          </Button>
        );
      })}
    </div>
  );

  if (depth === 0) return contents;
  return (
    <details
      className="builder-file-explorer__folder"
      onToggle={(event) => !expandAll && setFolderOpen(event.currentTarget.open)}
      open={expandAll || folderOpen}
    >
      <summary>
        <FolderTree aria-hidden="true" size={16} />
        <span>{folder.name}</span>
        <small>{builderExplorerFolderFileCount(folder)}</small>
      </summary>
      {contents}
    </details>
  );
}

function BuilderFileExplorer({
  artifacts,
  onViewWebsite,
}: {
  artifacts: BuilderArtifact[];
  onViewWebsite?: () => Promise<void>;
}) {
  const sourceEntries = useMemo(() => builderSourceExplorerEntries(artifacts), [artifacts]);
  const outputEntries = useMemo(() => builderOutputExplorerEntries(artifacts), [artifacts]);
  const sourceBundle = artifacts.find((artifact) => artifact.kind === 'source_bundle');
  const initialCollection = sourceEntries.length ? 'source' : 'output';
  const [collection, setCollection] = useState<'source' | 'output'>(initialCollection);
  const [query, setQuery] = useState('');
  const sourceTabRef = useRef<HTMLButtonElement>(null);
  const outputTabRef = useRef<HTMLButtonElement>(null);
  const explorerId = useId();
  const sourceTabId = `${explorerId}-source-tab`;
  const outputTabId = `${explorerId}-output-tab`;
  const panelId = `${explorerId}-panel`;
  const [selectedEntry, setSelectedEntry] = useState<BuilderExplorerEntry | undefined>(
    sourceEntries[0] ?? outputEntries[0],
  );
  const availableEntries = collection === 'source' ? sourceEntries : outputEntries;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleEntries = normalizedQuery
    ? availableEntries.filter((entry) => entry.path.toLocaleLowerCase().includes(normalizedQuery))
    : availableEntries;
  const tree = useMemo(() => buildBuilderExplorerTree(visibleEntries), [visibleEntries]);
  const signedArtifacts = [
    ...(selectedEntry ? [selectedEntry.artifact] : []),
    ...(sourceBundle ? [sourceBundle] : []),
  ];
  const { urls, loadError } = usePrivateArtifactUrls(
    signedArtifacts,
    'The selected private build file could not be loaded.',
  );
  const selectedUrl = selectedEntry ? urls[selectedEntry.artifact.id] : undefined;
  const [content, setContent] = useState('');
  const [contentError, setContentError] = useState('');
  const [isOpeningWebsite, setIsOpeningWebsite] = useState(false);
  const [websiteError, setWebsiteError] = useState('');
  const selectedIsCompiledHtml =
    collection === 'output' &&
    Boolean(selectedEntry && /(?:^|\/)index\.html$/i.test(selectedEntry.path));

  useEffect(() => {
    const nextEntries = collection === 'source' ? sourceEntries : outputEntries;
    if (selectedEntry && nextEntries.some((entry) => entry.path === selectedEntry.path)) return;
    setSelectedEntry(nextEntries[0]);
  }, [collection, outputEntries, selectedEntry, sourceEntries]);

  useEffect(() => {
    if (!selectedEntry || !selectedUrl || !isTextPreviewFile(selectedEntry.artifact)) {
      setContent('');
      setContentError('');
      return;
    }
    const controller = new AbortController();
    setContent('');
    setContentError('');
    void fetch(selectedUrl, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('The private file could not be loaded.');
        const source = await response.text();
        return source.length > 500_000
          ? `${source.slice(0, 500_000)}\n\n… Preview truncated.`
          : source;
      })
      .then(setContent)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setContentError(
          error instanceof Error ? error.message : 'The private file could not be loaded.',
        );
      });
    return () => controller.abort();
  }, [selectedEntry, selectedUrl]);

  function selectCollection(nextCollection: 'source' | 'output') {
    setCollection(nextCollection);
    setQuery('');
    setSelectedEntry((nextCollection === 'source' ? sourceEntries : outputEntries)[0]);
  }

  function handleCollectionKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const nextCollection = collection === 'source' ? 'output' : 'source';
    selectCollection(nextCollection);
    window.requestAnimationFrame(() =>
      (nextCollection === 'source' ? sourceTabRef.current : outputTabRef.current)?.focus(),
    );
  }

  async function viewWebsite() {
    if (!onViewWebsite || isOpeningWebsite) return;
    setIsOpeningWebsite(true);
    setWebsiteError('');
    try {
      await onViewWebsite();
    } catch (error) {
      setWebsiteError(
        error instanceof Error ? error.message : 'The visitor preview could not be opened.',
      );
    } finally {
      setIsOpeningWebsite(false);
    }
  }

  return (
    <div className="builder-file-explorer">
      <div className="builder-file-explorer__toolbar">
        <div
          aria-label="Build file collection"
          className="builder-file-explorer__tabs"
          role="tablist"
        >
          <Button
            aria-controls={panelId}
            aria-selected={collection === 'source'}
            id={sourceTabId}
            onKeyDown={handleCollectionKeyDown}
            onClick={() => selectCollection('source')}
            ref={sourceTabRef}
            role="tab"
            variant="segmented"
          >
            Source
            <span>{sourceEntries.length}</span>
          </Button>
          <Button
            aria-controls={panelId}
            aria-selected={collection === 'output'}
            id={outputTabId}
            onKeyDown={handleCollectionKeyDown}
            onClick={() => selectCollection('output')}
            ref={outputTabRef}
            role="tab"
            variant="segmented"
          >
            Compiled site
            <span>{outputEntries.length}</span>
          </Button>
        </div>
        <ButtonGroup>
          {onViewWebsite && outputEntries.length ? (
            <Button
              disabled={isOpeningWebsite}
              onClick={() => void viewWebsite()}
              type="button"
              variant="primary"
            >
              <ArrowUpRight aria-hidden="true" size={16} />
              {isOpeningWebsite ? 'Opening preview' : 'Preview website'}
            </Button>
          ) : null}
          {sourceBundle && urls[sourceBundle.id] ? (
            <ButtonLink
              className="builder-file-explorer__download"
              href={urls[sourceBundle.id]}
              rel="noreferrer"
              target="_blank"
              variant="secondary"
            >
              <Download aria-hidden="true" size={16} />
              Download source
            </ButtonLink>
          ) : null}
        </ButtonGroup>
      </div>
      {websiteError ? (
        <p className="form-message form-message--error" role="alert">
          {websiteError}
        </p>
      ) : null}
      <label className="builder-file-explorer__search">
        <span>{collection === 'source' ? 'Search source files' : 'Search compiled site'}</span>
        <span>
          <Search aria-hidden="true" size={17} />
          <input
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search folders and files"
            type="search"
            value={query}
          />
        </span>
      </label>
      {availableEntries.length ? (
        <div className="builder-file-explorer__workspace">
          <nav
            aria-label={
              collection === 'source' ? 'Generated source files' : 'Compiled website files'
            }
            className="builder-file-explorer__tree"
          >
            {visibleEntries.length ? (
              <BuilderExplorerTree
                expandAll={Boolean(normalizedQuery)}
                folder={tree}
                onSelect={setSelectedEntry}
                selectedPath={selectedEntry?.path}
              />
            ) : (
              <p>No files match “{query}”.</p>
            )}
          </nav>
          <section
            aria-live="polite"
            aria-label="Selected build file"
            className={`builder-file-explorer__preview${selectedIsCompiledHtml ? ' builder-file-explorer__preview--website' : ''}`}
            id={panelId}
            role="tabpanel"
          >
            {selectedEntry ? (
              <>
                <header>
                  <div>
                    <Eyebrow>
                      {collection === 'source' ? 'Project source' : 'Compiled site file'}
                    </Eyebrow>
                    <h3>{selectedEntry.path.split('/').pop()}</h3>
                    <p>{selectedEntry.path}</p>
                  </div>
                  {!selectedIsCompiledHtml && selectedUrl ? (
                    <ButtonLink
                      aria-label={`Open ${selectedEntry.path} in a new tab`}
                      href={selectedUrl}
                      rel="noreferrer"
                      target="_blank"
                      variant="quiet"
                    >
                      <ExternalLink aria-hidden="true" size={16} />
                      <span>Open file</span>
                    </ButtonLink>
                  ) : null}
                </header>
                {selectedIsCompiledHtml ? (
                  <p className="builder-file-explorer__website-note">
                    This pane shows the saved HTML source. Use Preview website above—or the direct
                    Preview website action on the Test card—to run navigation, animations, styles,
                    and compiled JavaScript together.
                  </p>
                ) : null}
                {loadError || contentError ? (
                  <p className="form-message form-message--error" role="alert">
                    {loadError || contentError}
                  </p>
                ) : !selectedUrl ? (
                  <div className="builder-file-explorer__loading" role="status">
                    <LoaderCircle aria-hidden="true" className="spin" size={20} />
                    Loading private file…
                  </div>
                ) : isImagePreviewFile(selectedEntry.artifact) ? (
                  <div className="builder-file-explorer__image">
                    <img alt={selectedEntry.path} src={selectedUrl} />
                  </div>
                ) : isTextPreviewFile(selectedEntry.artifact) ? (
                  content ? (
                    <SourcePreview content={content} />
                  ) : (
                    <div className="builder-file-explorer__loading" role="status">
                      <LoaderCircle aria-hidden="true" className="spin" size={20} />
                      Reading file…
                    </div>
                  )
                ) : (
                  <div className="builder-file-explorer__binary">
                    <FileText aria-hidden="true" size={28} />
                    <strong>Preview unavailable</strong>
                    <p>Open the private file to inspect or download it.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="builder-file-explorer__binary">
                <FolderTree aria-hidden="true" size={28} />
                <strong>Select a file</strong>
                <p>Choose a file from the project tree to inspect it.</p>
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="builder-file-explorer__empty">
          <FolderTree aria-hidden="true" size={28} />
          <strong>
            {collection === 'source' ? 'No browsable source files' : 'No compiled website files'}
          </strong>
          <p>
            {collection === 'source' && sourceBundle
              ? 'This older build has a downloadable source archive but no individual source-file records.'
              : 'Files appear here as the private builder saves them.'}
          </p>
        </div>
      )}
    </div>
  );
}

function BuilderFileExplorerDialog({
  artifacts,
  label = 'Browse files',
  loadStatus = 'ready',
  loadError,
  onLoad,
  onViewWebsite,
}: {
  artifacts: BuilderArtifact[];
  label?: string;
  loadStatus?: 'idle' | BuilderRunEvidenceState['status'];
  loadError?: string;
  onLoad?: () => void;
  onViewWebsite?: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const sourceCount = builderSourceExplorerEntries(artifacts).length;
  const outputCount = builderOutputExplorerEntries(artifacts).length;
  return (
    <Dialog.Root
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen && onLoad && loadStatus !== 'loading' && loadStatus !== 'ready') {
          onLoad();
        }
      }}
      open={open}
    >
      <Dialog.Trigger asChild>
        <Button type="button" variant="secondary">
          <FolderTree aria-hidden="true" size={16} />
          {label}
          {loadStatus === 'ready' && sourceCount + outputCount > 0 ? (
            <span className="builder-file-explorer__trigger-count">
              {sourceCount + outputCount}
            </span>
          ) : null}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="builder-file-preview-overlay" />
        <Dialog.Content
          aria-describedby="builder-file-explorer-dialog-description"
          className="builder-file-explorer-dialog"
        >
          <div className="builder-file-preview-dialog__header">
            <div>
              <Eyebrow>Private build workspace</Eyebrow>
              <Dialog.Title>Generated files</Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <IconButton label="Close generated files" variant="quiet">
                <X aria-hidden="true" size={18} />
              </IconButton>
            </Dialog.Close>
          </div>
          <Dialog.Description className="muted-copy" id="builder-file-explorer-dialog-description">
            Source is the editable Next.js project. Compiled site contains the browser-ready files
            produced from that source. Preview website opens the complete interactive result;
            selecting a file is only for inspection.
          </Dialog.Description>
          {loadStatus === 'error' ? (
            <div className="builder-file-explorer__empty">
              <CircleAlert aria-hidden="true" size={28} />
              <strong>Build files could not be loaded</strong>
              <p className="form-message form-message--error" role="alert">
                {loadError || 'This test’s private files are temporarily unavailable.'}
              </p>
              {onLoad ? (
                <Button onClick={onLoad} variant="secondary">
                  <RotateCcw aria-hidden="true" size={16} />
                  Try again
                </Button>
              ) : null}
            </div>
          ) : loadStatus === 'loading' || loadStatus === 'idle' ? (
            <div className="builder-file-explorer__loading" role="status">
              <LoaderCircle aria-hidden="true" className="spin" size={22} />
              Loading this test’s private files…
            </div>
          ) : (
            <BuilderFileExplorer artifacts={artifacts} onViewWebsite={onViewWebsite} />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function BuilderRunFileExplorerDialog({
  artifacts,
  label = 'Browse files',
  onLoad,
  onViewWebsite,
  state,
}: {
  artifacts: BuilderArtifact[];
  label?: string;
  onLoad: () => void;
  onViewWebsite?: () => Promise<void>;
  state?: BuilderRunEvidenceState;
}) {
  const loadedArtifacts = state?.status === 'ready' ? state.evidence.artifacts : artifacts;
  const loadStatus = artifacts.length ? 'ready' : (state?.status ?? 'idle');
  return (
    <BuilderFileExplorerDialog
      artifacts={loadedArtifacts}
      label={label}
      loadError={state?.status === 'error' ? state.message : undefined}
      loadStatus={loadStatus}
      onLoad={onLoad}
      onViewWebsite={onViewWebsite}
    />
  );
}

function sourceExcerpt(content: string, highlightedLines: number[]) {
  const lines = content.split('\n');
  if (!highlightedLines.length) return { content, highlightedLines, startLine: 1 };
  const startLine = Math.max(1, Math.min(...highlightedLines) - 6);
  const endLine = Math.min(lines.length, startLine + 27);
  return {
    content: lines.slice(startLine - 1, endLine).join('\n'),
    highlightedLines,
    startLine,
  };
}

function BuilderPreviewFileEntry({
  file,
  previousFile,
  changeKind,
}: {
  file: BuilderArtifact;
  previousFile?: BuilderArtifact;
  changeKind?: 'added' | 'edited';
}) {
  const image = isImagePreviewFile(file);
  const textFile = isTextPreviewFile(file);
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [contentError, setContentError] = useState('');
  const signedArtifacts = image || open ? [file, ...(previousFile ? [previousFile] : [])] : [];
  const { urls, loadError } = usePrivateArtifactUrls(
    signedArtifacts,
    'This private preview file could not be loaded.',
  );
  const fileUrl = urls[file.id];
  const previousFileUrl = previousFile ? urls[previousFile.id] : undefined;
  const [previousContent, setPreviousContent] = useState('');

  useEffect(() => {
    if (!open || !textFile || !fileUrl) return;
    const controller = new AbortController();
    setContent('');
    setContentError('');
    void fetch(fileUrl, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('The private file could not be loaded.');
        const source = await response.text();
        return source.length > 500_000
          ? `${source.slice(0, 500_000)}\n\n… Preview truncated.`
          : source;
      })
      .then(setContent)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setContentError(
          error instanceof Error ? error.message : 'The private file could not be loaded.',
        );
      });
    return () => controller.abort();
  }, [fileUrl, open, textFile]);

  useEffect(() => {
    if (!open || !textFile || !previousFileUrl) {
      setPreviousContent('');
      return;
    }
    const controller = new AbortController();
    void fetch(previousFileUrl, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('The earlier private file could not be loaded.');
        return response.text();
      })
      .then(setPreviousContent)
      .catch(() => {
        if (!controller.signal.aborted) setPreviousContent('');
      });
    return () => controller.abort();
  }, [open, previousFileUrl, textFile]);

  if (image) {
    return (
      <li>
        {fileUrl ? (
          <ExpandableImage
            alt={file.label}
            className="builder-run-inspector__file-button builder-run-inspector__file-button--image"
            label={file.label}
            src={fileUrl}
          >
            <img alt="" src={fileUrl} />
            <span>
              <strong>{file.label}</strong>
              <ImageFileType contentType={file.contentType} path={file.storagePath} />
              <small>{file.storagePath}</small>
            </span>
          </ExpandableImage>
        ) : (
          <span className="builder-run-inspector__file-button">
            <FileImage aria-hidden="true" size={18} />
            <span>
              <strong>{file.label}</strong>
              <small>
                {loadError ? 'Image preview could not be loaded.' : 'Loading image preview…'}
              </small>
            </span>
          </span>
        )}
      </li>
    );
  }

  return (
    <li>
      <button
        aria-label={`View ${file.label}`}
        className="builder-run-inspector__file-button"
        onClick={() => setOpen(true)}
        type="button"
      >
        {image ? (
          <FileImage aria-hidden="true" size={18} />
        ) : (
          <FileText aria-hidden="true" size={18} />
        )}
        <span>
          <strong>{file.label}</strong>
          <small>
            {file.storagePath}
            {file.byteSize ? ` · ${formatStorageSize(file.byteSize)}` : ''}
          </small>
          {changeKind ? (
            <small>
              {changeKind === 'added' ? 'Whole new file' : 'Edited for this refinement'}
            </small>
          ) : null}
        </span>
      </button>
      <Dialog.Root onOpenChange={setOpen} open={open}>
        <Dialog.Portal>
          <Dialog.Overlay className="builder-file-preview-overlay" />
          <Dialog.Content
            aria-describedby="builder-file-preview-description"
            className="builder-file-preview-dialog"
          >
            <div className="builder-file-preview-dialog__header">
              <div>
                <Eyebrow>Private preview file</Eyebrow>
                <Dialog.Title>{file.label}</Dialog.Title>
              </div>
              <Dialog.Close asChild>
                <IconButton label={`Close ${file.label}`} variant="quiet">
                  <X aria-hidden="true" size={18} />
                </IconButton>
              </Dialog.Close>
            </div>
            <Dialog.Description className="muted-copy" id="builder-file-preview-description">
              {file.storagePath}
            </Dialog.Description>
            {changeKind ? (
              <p className="builder-file-preview-dialog__change-note">
                {changeKind === 'added'
                  ? 'New file in this refinement. Its full source is shown without line highlights.'
                  : 'Changed lines compared with the previous saved test are highlighted.'}
              </p>
            ) : null}
            {loadError || contentError ? (
              <p className="form-message form-message--error" role="alert">
                {loadError || contentError}
              </p>
            ) : !fileUrl ? (
              <p className="muted-copy" role="status">
                Loading private file…
              </p>
            ) : textFile ? (
              content ? (
                <SourcePreview
                  content={content}
                  highlightedLines={
                    changeKind === 'edited' && previousContent
                      ? changedLineNumbers(previousContent, content)
                      : []
                  }
                />
              ) : (
                <p className="muted-copy" role="status">
                  Reading private file…
                </p>
              )
            ) : (
              <iframe
                className="builder-file-preview-dialog__frame"
                sandbox=""
                src={fileUrl}
                title={`Private preview of ${file.label}`}
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </li>
  );
}

function TestDirectionResults({
  run,
  artifacts,
  previousArtifacts = [],
  onOpen,
}: {
  run: BuilderRun;
  artifacts: BuilderArtifact[];
  previousArtifacts?: BuilderArtifact[];
  onOpen?: () => void;
}) {
  const directions = (run.buildInstruction ?? '')
    .split(/\n\s*\n/)
    .map((direction) => direction.trim())
    .filter(Boolean);
  const sourceFiles = latestArtifactsByLabel(
    artifacts.filter((artifact) => isWorkingSourceArtifact(artifact)),
  );
  const previousByPath = new Map(
    latestArtifactsByLabel(
      previousArtifacts.filter((artifact) => isWorkingSourceArtifact(artifact)),
    ).map((artifact) => [artifact.label, artifact]),
  );

  if (!directions.length) return null;
  return (
    <section className="builder-direction-results" aria-label="Applied test directions">
      <Eyebrow>Applied test directions</Eyebrow>
      {directions.map((direction, index) => (
        <details
          key={`${run.id}-${index}`}
          onToggle={(event) => event.currentTarget.open && onOpen?.()}
        >
          <summary>
            <span>
              <strong>Direction {index + 1}</strong>
              <small>{direction}</small>
            </span>
            <span>
              {sourceFiles.length} changed source file{sourceFiles.length === 1 ? '' : 's'}
            </span>
          </summary>
          <div>
            <p>
              These files are the saved result of this test run. When a run has multiple directions,
              Made Solid Studio shows the run&apos;s resulting changes rather than claiming a file
              came from one sentence alone.
            </p>
            {sourceFiles.length ? (
              <ul className="builder-run-inspector__files">
                {sourceFiles.map((file) => {
                  const previousFile = previousByPath.get(file.label);
                  return (
                    <BuilderPreviewFileEntry
                      changeKind={previousFile ? 'edited' : 'added'}
                      file={file}
                      key={file.id}
                      previousFile={previousFile}
                    />
                  );
                })}
              </ul>
            ) : (
              <p className="muted-copy">
                No saved source-file changes are available yet. Files appear after the private build
                has written and saved its draft.
              </p>
            )}
          </div>
        </details>
      ))}
    </section>
  );
}

function VisualAssetCatalog({ assets }: { assets: ResearchArtifact[] }) {
  const { urls, loadError } = usePrivateArtifactUrls(
    assets,
    'Private visual assets could not be loaded. Refresh and check storage access.',
  );

  if (!assets.length) return null;
  return (
    <details className="asset-catalog">
      <summary>
        <span>
          <span className="asset-catalog__eyebrow">Captured source material</span>
          <strong>Browse all {assets.length} visual assets</strong>
        </span>
      </summary>
      <div className="asset-catalog__content">
        <p className="muted-copy">
          Private source material and generated brand files. Transparent logo versions are added
          here automatically as each one finishes, but still require human approval before any
          external use.
        </p>
        <div className="packet-assets__grid">
          {assets.map((asset) => {
            const type =
              asset.metadata.logoVariant === 'appearance'
                ? `transparent ${String(asset.metadata.logoAppearance || 'brand')} logo`
                : asset.metadata.vectorSuggestion
                  ? 'derived vector suggestion'
                  : recordValue(asset.metadata, 'assetType') || 'image';
            const pageUrl = recordValue(asset.metadata, 'pageUrl');
            const width = recordValue(asset.metadata, 'width');
            const height = recordValue(asset.metadata, 'height');
            return (
              <ExpandableImage
                alt={`Captured ${type} asset`}
                className="packet-assets__item"
                key={asset.id}
                label={asset.label ?? `captured ${type} asset`}
                src={urls[asset.id] ?? ''}
              >
                {urls[asset.id] ? (
                  <img alt="" src={urls[asset.id]} />
                ) : (
                  <span>Loading asset...</span>
                )}
                <strong>{type}</strong>
                <ImageFileType contentType={asset.contentType} path={asset.storagePath} />
                <small>
                  {pageUrl
                    ? new URL(pageUrl).pathname || '/'
                    : asset.metadata.logoVariant === 'appearance'
                      ? 'Generated from the selected organisation logo'
                      : 'Captured website asset'}
                </small>
                {width && height ? <small>{`${width} x ${height}`}</small> : null}
              </ExpandableImage>
            );
          })}
        </div>
      </div>
      {loadError ? <p className="form-message form-message--error">{loadError}</p> : null}
    </details>
  );
}

function ResearchPacketPanel({ workspace }: { workspace: ProspectWorkspace }) {
  const packet = workspace.researchPacket;
  if (!packet) {
    return (
      <Card className="workspace-panel">
        <Eyebrow>Research packet</Eyebrow>
        <h2>Awaiting an asset-aware capture</h2>
        <EmptyState
          detail="Run another website capture to create a private packet containing page structure, factual context, and the captured logo and website-image catalogue."
          icon={Sparkles}
          title="No research packet yet"
        />
      </Card>
    );
  }
  const packetData = packet.data;
  const capture =
    typeof packetData.sourceCapture === 'object' && packetData.sourceCapture !== null
      ? (packetData.sourceCapture as Record<string, unknown>)
      : {};
  const business =
    typeof packetData.business === 'object' && packetData.business !== null
      ? (packetData.business as Record<string, unknown>)
      : {};
  const pages = recordList(packetData, 'pages').filter(
    (page): page is Record<string, unknown> => typeof page === 'object' && page !== null,
  );
  const notes =
    typeof packetData.sourceManifest === 'object' && packetData.sourceManifest !== null
      ? recordList(packetData.sourceManifest as Record<string, unknown>, 'notes')
      : [];
  const assets = useMemo(
    () => workspace.artifacts.filter((artifact) => artifact.kind === 'asset'),
    [workspace.artifacts],
  );
  const visiblePages = pages.slice(0, 4);
  const remainingPages = pages.slice(4);

  return (
    <Card className="workspace-panel">
      <div className="packet-header">
        <div>
          <Eyebrow>Research packet</Eyebrow>
          <h2>Strategy context, grounded in the captured website</h2>
          <p className="muted-copy">
            This is the bounded handoff for the future strategist and builder agents. Full page
            text, HTML, and assets remain private source material they can load on demand.
          </p>
        </div>
        <StatusBadge tone="success">Packet v{packet.schemaVersion}</StatusBadge>
      </div>
      <dl className="packet-metrics">
        <div>
          <dt>Business</dt>
          <dd>{recordValue(business, 'name') || workspace.business.name}</dd>
        </div>
        <div>
          <dt>Captured pages</dt>
          <dd>{recordValue(capture, 'pageCount') || workspace.capturedPages.length}</dd>
        </div>
        <div>
          <dt>Visual assets</dt>
          <dd>{assets.length}</dd>
        </div>
        <div>
          <dt>Generated</dt>
          <dd>{formatDateTime(packet.generatedAt)}</dd>
        </div>
      </dl>
      <section aria-labelledby="packet-pages-title" className="packet-pages">
        <div>
          <Eyebrow>Page context</Eyebrow>
          <h3 id="packet-pages-title">Structure supplied to agents</h3>
        </div>
        <details className="page-inventory__disclosure">
          <summary>
            View {pages.length} captured page context{pages.length === 1 ? '' : 's'}
          </summary>
          <div className="packet-pages__list">
            {visiblePages.map((page) => (
              <PacketPageItem key={recordValue(page, 'url')} page={page} />
            ))}
          </div>
          {remainingPages.length ? (
            <ListOverflow label="page contexts" remainingCount={remainingPages.length}>
              <div className="packet-pages__list packet-pages__list--overflow">
                {remainingPages.map((page) => (
                  <PacketPageItem key={recordValue(page, 'url')} page={page} />
                ))}
              </div>
            </ListOverflow>
          ) : null}
        </details>
      </section>
      <VisualAssetCatalog assets={assets} />
      <section aria-labelledby="packet-boundaries-title" className="packet-boundaries">
        <Eyebrow>Agent boundaries</Eyebrow>
        <h3 id="packet-boundaries-title">What stays under human control</h3>
        <ul>
          {notes.map((note) => (
            <li key={String(note)}>{String(note)}</li>
          ))}
        </ul>
      </section>
    </Card>
  );
}

function PacketPageItem({ page }: { page: Record<string, unknown> }) {
  return (
    <article>
      <strong>{recordValue(page, 'title') || recordValue(page, 'url')}</strong>
      <small>{recordValue(page, 'pageType') || 'page'}</small>
      {recordValue(page, 'primaryHeading') ? <p>{recordValue(page, 'primaryHeading')}</p> : null}
    </article>
  );
}

function briefStatusLabel(status: RedesignBrief['status']) {
  return status === 'approved' ? 'Brief approved' : 'Draft brief';
}

function briefStatusTone(status: RedesignBrief['status']) {
  return status === 'approved' ? ('success' as const) : ('warning' as const);
}

function normaliseBriefSourceSelections(
  selections?: Partial<BriefSourceSelections>,
): BriefSourceSelections {
  return {
    pageUrls: Array.isArray(selections?.pageUrls) ? selections.pageUrls : [],
    assetIds: Array.isArray(selections?.assetIds) ? selections.assetIds : [],
    autoSelectedAssetIds: Array.isArray(selections?.autoSelectedAssetIds)
      ? selections.autoSelectedAssetIds
      : [],
    uncertainties: Array.isArray(selections?.uncertainties) ? selections.uncertainties : [],
  };
}

function normaliseBriefDraft(draft?: Partial<RedesignBriefDraft>): RedesignBriefDraft {
  const brandKit = draft?.brandKit;
  return {
    strategy: typeof draft?.strategy === 'string' ? draft.strategy : '',
    proposedSitemap: Array.isArray(draft?.proposedSitemap) ? draft.proposedSitemap : [],
    pagePlans: Array.isArray(draft?.pagePlans) ? draft.pagePlans : [],
    assetGuidance: Array.isArray(draft?.assetGuidance) ? draft.assetGuidance : [],
    assumptions: Array.isArray(draft?.assumptions) ? draft.assumptions : [],
    openQuestions: Array.isArray(draft?.openQuestions) ? draft.openQuestions : [],
    capabilityInventory: Array.isArray(draft?.capabilityInventory) ? draft.capabilityInventory : [],
    brandKit:
      brandKit &&
      typeof brandKit.id === 'string' &&
      typeof brandKit.version === 'number' &&
      typeof brandKit.primaryLogoAssetId === 'string'
        ? {
            id: brandKit.id,
            version: brandKit.version,
            primaryLogoAssetId: brandKit.primaryLogoAssetId,
            approvedAssetIds: Array.isArray(brandKit.approvedAssetIds)
              ? brandKit.approvedAssetIds.filter(
                  (assetId): assetId is string => typeof assetId === 'string',
                )
              : [],
            palette: {
              primary:
                typeof brandKit.palette?.primary === 'string'
                  ? brandKit.palette.primary
                  : undefined,
              accent:
                typeof brandKit.palette?.accent === 'string' ? brandKit.palette.accent : undefined,
            },
          }
        : undefined,
  };
}

function sourceUrlLabel(url: string, fallback: string) {
  try {
    return new URL(url).pathname || fallback;
  } catch {
    return fallback;
  }
}

function assetAnalysisLabel(status: NonNullable<ProspectWorkspace['assetAnalysis']>['status']) {
  if (status === 'queued') return 'Analysis queued';
  if (status === 'running') return 'Analysis running';
  if (status === 'ready') return 'Suggestions ready';
  if (status === 'failed') return 'Analysis failed';
  if (status === 'cancelled') return 'Analysis cancelled';
  return 'Not analysed';
}

function AssetAnnotationEditor({
  annotation,
  asset,
  assetUrl,
  onUpdate,
}: {
  annotation: AssetAnnotation;
  asset?: ResearchArtifact;
  assetUrl?: string;
  onUpdate: (
    annotation: AssetAnnotation,
    patch: Pick<
      AssetAnnotation,
      'suggestedRole' | 'businessAssociation' | 'reviewState' | 'humanNotes'
    >,
  ) => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    suggestedRole: annotation.suggestedRole,
    businessAssociation: annotation.businessAssociation,
    reviewState: annotation.reviewState,
    humanNotes: annotation.humanNotes,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setDraft({
      suggestedRole: annotation.suggestedRole,
      businessAssociation: annotation.businessAssociation,
      reviewState: annotation.reviewState,
      humanNotes: annotation.humanNotes,
    });
  }, [annotation]);

  async function save() {
    setSaving(true);
    setMessage('');
    try {
      await onUpdate(annotation, draft);
      setMessage('Review saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The asset review could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="audit-finding asset-suggestion">
      <div className="audit-finding__header">
        <div>
          <Eyebrow>
            {asset?.metadata.assetType ? String(asset.metadata.assetType) : 'Asset'}
          </Eyebrow>
          <h4>{asset?.label || 'Captured visual asset'}</h4>
        </div>
        <StatusBadge
          tone={
            annotation.reviewState === 'approved'
              ? 'success'
              : annotation.reviewState === 'blocked'
                ? 'danger'
                : 'warning'
          }
        >
          {annotation.reviewState === 'approved'
            ? 'Approved'
            : annotation.reviewState === 'blocked'
              ? 'Excluded'
              : 'Needs review'}
        </StatusBadge>
      </div>
      {assetUrl ? (
        <ExpandableImage
          alt={asset?.label || 'Captured visual asset'}
          className="asset-suggestion__image"
          label={asset?.label || 'captured visual asset'}
          src={assetUrl}
        >
          <img alt="" src={assetUrl} />
          {asset ? (
            <ImageFileType contentType={asset.contentType} path={asset.storagePath} />
          ) : null}
        </ExpandableImage>
      ) : asset ? (
        <div aria-label="Loading captured visual asset" className="asset-suggestion__image">
          <span>Loading asset...</span>
        </div>
      ) : null}
      <details className="asset-suggestion__evidence">
        <summary>View evidence and reuse guidance</summary>
        <div>
          <p>{annotation.observedDescription}</p>
          {annotation.visibleText.length ? (
            <div className="audit-finding__recommendation">
              <strong>Visible text</strong>
              <p>{annotation.visibleText.join(' · ')}</p>
            </div>
          ) : null}
          <div className="audit-finding__recommendation">
            <strong>Safe reuse guidance</strong>
            <p>{annotation.safeReuseNote}</p>
          </div>
          {annotation.cautions.length ? <p>Review: {annotation.cautions.join(' ')}</p> : null}
        </div>
      </details>
      <details className="audit-finding__edit">
        <summary>Review asset context</summary>
        <div className="asset-review-form">
          <label>
            Suggested role
            <select
              onChange={(event) =>
                setDraft({
                  ...draft,
                  suggestedRole: event.target.value as typeof draft.suggestedRole,
                })
              }
              value={draft.suggestedRole}
            >
              {[
                'primary_logo',
                'secondary_mark',
                'worksite_photo',
                'team_photo',
                'project_photo',
                'partner_logo',
                'supplier_logo',
                'decorative',
                'unknown',
                'exclude',
              ].map((role) => (
                <option key={role} value={role}>
                  {role.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          <label>
            Business association
            <select
              onChange={(event) =>
                setDraft({
                  ...draft,
                  businessAssociation: event.target.value as typeof draft.businessAssociation,
                })
              }
              value={draft.businessAssociation}
            >
              <option value="target_business">Target business</option>
              <option value="third_party">Third party</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
          <label>
            Reuse decision
            <select
              onChange={(event) =>
                setDraft({ ...draft, reviewState: event.target.value as typeof draft.reviewState })
              }
              value={draft.reviewState}
            >
              <option value="needs_review">Needs review</option>
              <option value="approved">Approved for reuse</option>
              <option value="blocked">Exclude from reuse</option>
            </select>
          </label>
          <label>
            Human notes
            <textarea
              onChange={(event) => setDraft({ ...draft, humanNotes: event.target.value })}
              value={draft.humanNotes}
            />
          </label>
          <Button disabled={saving} onClick={() => void save()} type="button">
            <Save aria-hidden="true" size={16} />
            {saving ? 'Saving' : 'Save review'}
          </Button>
          {message ? (
            <p
              className={
                message === 'Review saved.'
                  ? 'form-message form-message--success'
                  : 'form-message form-message--error'
              }
              role="status"
            >
              {message}
            </p>
          ) : null}
        </div>
      </details>
    </article>
  );
}

function AssetReviewPanel({
  workspace,
  onRequestAnalysis,
  onCancelAnalysis,
  onSetAssetAnalysisSelected,
  onUpdateAnnotation,
}: {
  workspace: ProspectWorkspace;
  onRequestAnalysis: () => Promise<void>;
  onCancelAnalysis: () => Promise<void>;
  onSetAssetAnalysisSelected: (asset: ResearchArtifact, selected: boolean) => Promise<void>;
  onUpdateAnnotation: (
    annotation: AssetAnnotation,
    patch: Pick<
      AssetAnnotation,
      'suggestedRole' | 'businessAssociation' | 'reviewState' | 'humanNotes'
    >,
  ) => Promise<void>;
}) {
  const [requesting, setRequesting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [selectionOverrides, setSelectionOverrides] = useState<Record<string, boolean>>({});
  const [pendingSelectionUpdates, setPendingSelectionUpdates] = useState(0);
  const [message, setMessage] = useState('');
  const selectionQueuesRef = useRef<Record<string, Promise<void>>>({});
  const job = workspace.assetAnalysis;
  const assets = workspace.artifacts.filter((artifact) => artifact.kind === 'asset');
  const { urls, loadError } = usePrivateArtifactUrls(
    assets,
    'Private suggestion images could not be loaded. Refresh and check storage access.',
  );
  const active = job?.status === 'queued' || job?.status === 'running';
  const reviewAnnotations = active
    ? workspace.assetAnnotations.filter((annotation) => annotation.analysisJobId === job?.id)
    : workspace.assetAnnotations;
  const pendingAnnotations = reviewAnnotations.filter(
    (annotation) => annotation.reviewState === 'needs_review',
  );
  const reviewedAnnotations = reviewAnnotations.filter(
    (annotation) => annotation.reviewState !== 'needs_review',
  );
  const approvedCount = reviewAnnotations.filter(
    (annotation) => annotation.reviewState === 'approved',
  ).length;
  const analysedAssetIds = new Set(
    workspace.assetAnnotations.map((annotation) => annotation.assetId),
  );
  const analyzableAssets = assets.filter(
    (asset) => asset.metadata.vectorSuggestion !== true && !analysedAssetIds.has(asset.id),
  );
  const isAssetSelected = (asset: ResearchArtifact) =>
    selectionOverrides[asset.id] ?? asset.metadata.analysisSelected !== false;
  const selectedAssets = analyzableAssets.filter(isAssetSelected);
  const selectedAssetCount = selectedAssets.length;
  const visiblePendingAnnotations = pendingAnnotations.slice(0, 2);
  const hiddenPendingAnnotations = pendingAnnotations.slice(2);
  const reviewLoaderCount = active
    ? Math.max(0, Math.min(Math.max(job?.totalItems || 2, 1), 2) - visiblePendingAnnotations.length)
    : 0;

  useEffect(() => {
    setSelectionOverrides((current) => {
      let changed = false;
      const next = { ...current };
      for (const asset of analyzableAssets) {
        const persisted = asset.metadata.analysisSelected !== false;
        if (next[asset.id] === persisted) {
          delete next[asset.id];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [analyzableAssets]);

  function setAssetAnalysisSelected(asset: ResearchArtifact, selected: boolean) {
    const persisted = asset.metadata.analysisSelected !== false;
    setSelectionOverrides((current) => ({ ...current, [asset.id]: selected }));
    setPendingSelectionUpdates((count) => count + 1);
    setMessage('');
    const previous = selectionQueuesRef.current[asset.id] ?? Promise.resolve();
    const update = previous
      .catch(() => undefined)
      .then(() => onSetAssetAnalysisSelected(asset, selected));
    selectionQueuesRef.current[asset.id] = update;
    void update
      .catch((error) => {
        setSelectionOverrides((current) =>
          current[asset.id] === selected ? { ...current, [asset.id]: persisted } : current,
        );
        setMessage(
          error instanceof Error ? error.message : 'The asset selection could not be saved.',
        );
      })
      .finally(() => {
        setPendingSelectionUpdates((count) => Math.max(0, count - 1));
        if (selectionQueuesRef.current[asset.id] === update) {
          delete selectionQueuesRef.current[asset.id];
        }
      });
  }

  async function requestAnalysis() {
    setRequesting(true);
    setMessage('');
    try {
      await onRequestAnalysis();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Asset analysis could not be queued.');
    } finally {
      setRequesting(false);
    }
  }

  async function cancelAnalysis() {
    setCancelling(true);
    setMessage('');
    try {
      await onCancelAnalysis();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Asset analysis could not be cancelled.');
    } finally {
      setCancelling(false);
    }
  }

  const assetSelectionGrid = (
    <fieldset className="brief-assets" disabled={active || requesting || cancelling}>
      <legend className="sr-only">Assets selected for private AI analysis</legend>
      {analyzableAssets.map((asset) => {
        const type = recordValue(asset.metadata, 'assetType') || 'image';
        const pageUrl = recordValue(asset.metadata, 'pageUrl');
        return (
          <label className="brief-source-option brief-source-option--asset" key={asset.id}>
            <input
              checked={isAssetSelected(asset)}
              onChange={(event) =>
                void setAssetAnalysisSelected(asset, event.currentTarget.checked)
              }
              type="checkbox"
            />
            {urls[asset.id] ? (
              <img alt="" className="brief-source-option__preview" src={urls[asset.id]} />
            ) : (
              <span className="brief-source-option__preview" aria-hidden="true">
                Loading image
              </span>
            )}
            <span className="brief-source-option__content">
              <strong>{type}</strong>
              <ImageFileType contentType={asset.contentType} path={asset.storagePath} />
              <small>{pageUrl ? new URL(pageUrl).pathname || '/' : 'Captured asset'}</small>
            </span>
          </label>
        );
      })}
    </fieldset>
  );

  return (
    <Card className="workspace-panel">
      <div className="brief-panel__header">
        <div>
          <Eyebrow>Private asset enrichment</Eyebrow>
          <h2>Asset review</h2>
          <p className="muted-copy">
            AI suggestions describe visible imagery. The same job also collects reviewable logo and
            interface colour evidence. Neither output verifies business claims, ownership,
            partnerships, or qualifications.
          </p>
        </div>
        <div className="brief-panel__actions">
          <StatusBadge
            tone={
              job?.status === 'ready' ? 'success' : job?.status === 'failed' ? 'danger' : 'warning'
            }
          >
            {assetAnalysisLabel(job?.status ?? 'not_started')}
          </StatusBadge>
          <Button
            disabled={!selectedAssets.length || active || requesting || pendingSelectionUpdates > 0}
            onClick={() => void requestAnalysis()}
            type="button"
          >
            <Sparkles aria-hidden="true" size={16} />
            {requesting
              ? 'Queueing analysis'
              : active
                ? 'Analysis in progress'
                : 'Analyse selected assets'}
          </Button>
          {active ? (
            <Button
              disabled={cancelling || Boolean(job?.cancelRequestedAt)}
              onClick={() => void cancelAnalysis()}
              type="button"
              variant="secondary"
            >
              <Ban aria-hidden="true" size={16} />
              {cancelling || job?.cancelRequestedAt ? 'Stopping analysis' : 'Cancel analysis'}
            </Button>
          ) : null}
        </div>
      </div>
      {!assets.length ? (
        <EmptyState
          detail="Run an asset-aware website capture before analysing visual material."
          icon={Sparkles}
          title="No captured assets"
        />
      ) : null}
      {job?.status === 'failed' ? (
        <p className="form-message form-message--error">
          {job.errorSummary ||
            'Asset analysis failed. Confirm the server-only model key, then try again.'}
        </p>
      ) : null}
      {assets.length && !analyzableAssets.length && !active ? (
        <p className="form-message form-message--success" role="status">
          All captured images have been analysed. New images will appear here after an image
          refresh.
        </p>
      ) : null}
      {active ? (
        <div className="capture-progress capture-progress--running">
          <div
            aria-label="Visual asset analysis progress"
            aria-valuetext={job?.progressDetail || 'Preparing private visual-asset suggestions.'}
            className="capture-progress__track"
            role="progressbar"
          >
            <span className="capture-progress__bar" />
          </div>
          <span>
            {job?.progressDetail || 'Preparing private visual-asset suggestions.'}
            {job?.totalItems ? ` ${job.completedItems} of ${job.totalItems} assets complete.` : ''}
          </span>
        </div>
      ) : null}
      {analyzableAssets.length ? (
        <section
          className="asset-analysis-selection"
          aria-labelledby="asset-analysis-selection-title"
        >
          <div className="brief-panel__header">
            <div>
              <h3 id="asset-analysis-selection-title">Assets to analyse</h3>
            </div>
            <span className="muted-copy">
              {selectedAssetCount} of {analyzableAssets.length} selected
            </span>
          </div>
          <details className="asset-selection-disclosure">
            <summary>
              Browse {analyzableAssets.length} captured image
              {analyzableAssets.length === 1 ? '' : 's'} for analysis
            </summary>
            {assetSelectionGrid}
          </details>
        </section>
      ) : null}
      {active || workspace.assetAnnotations.length ? (
        <section className="asset-review-queue" aria-labelledby="asset-suggestions-title">
          <div>
            <Eyebrow>AI suggestions</Eyebrow>
            <h3 id="asset-suggestions-title">Review before brief use</h3>
          </div>
          {active ? (
            <div className="asset-review-loader">
              <p aria-live="polite" role="status">
                {job?.progressDetail ||
                  'Preparing the next private review cards. Earlier suggestions are hidden while this analysis runs.'}
              </p>
              {visiblePendingAnnotations.length ? (
                <div className="asset-review-queue__grid">
                  {visiblePendingAnnotations.map((annotation) => (
                    <AssetAnnotationEditor
                      annotation={annotation}
                      asset={assets.find((asset) => asset.id === annotation.assetId)}
                      assetUrl={urls[annotation.assetId]}
                      key={annotation.id}
                      onUpdate={onUpdateAnnotation}
                    />
                  ))}
                </div>
              ) : null}
              {hiddenPendingAnnotations.length ? (
                <details className="asset-review-overflow">
                  <summary>
                    View {hiddenPendingAnnotations.length} more asset review
                    {hiddenPendingAnnotations.length === 1 ? '' : 's'}
                  </summary>
                  <div className="asset-review-queue__grid">
                    {hiddenPendingAnnotations.map((annotation) => (
                      <AssetAnnotationEditor
                        annotation={annotation}
                        asset={assets.find((asset) => asset.id === annotation.assetId)}
                        assetUrl={urls[annotation.assetId]}
                        key={annotation.id}
                        onUpdate={onUpdateAnnotation}
                      />
                    ))}
                  </div>
                </details>
              ) : null}
              {reviewLoaderCount ? (
                <div aria-hidden="true" className="asset-review-queue__grid">
                  {Array.from({ length: reviewLoaderCount }, (_, index) => (
                    <article className="asset-review-loader__card" key={index}>
                      <span className="asset-review-loader__image evidence-skeleton" />
                      <span className="evidence-skeleton evidence-skeleton--value" />
                      <span className="evidence-skeleton evidence-skeleton--detail" />
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <dl className="asset-review-summary" aria-label="Asset review progress">
                <div>
                  <dt>Needs review</dt>
                  <dd>{pendingAnnotations.length}</dd>
                </div>
                <div>
                  <dt>Approved</dt>
                  <dd>{approvedCount}</dd>
                </div>
                <div>
                  <dt>Excluded</dt>
                  <dd>{reviewedAnnotations.length - approvedCount}</dd>
                </div>
              </dl>
              {pendingAnnotations.length ? (
                <div className="asset-review-queue__grid">
                  {visiblePendingAnnotations.map((annotation) => (
                    <AssetAnnotationEditor
                      annotation={annotation}
                      asset={assets.find((asset) => asset.id === annotation.assetId)}
                      assetUrl={urls[annotation.assetId]}
                      key={annotation.id}
                      onUpdate={onUpdateAnnotation}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  detail="All analysed assets now have a reuse decision. Use the reviewed history below to revisit one."
                  icon={CheckCheck}
                  title="Review queue clear"
                />
              )}
              {hiddenPendingAnnotations.length ? (
                <details className="asset-review-overflow">
                  <summary>
                    View {hiddenPendingAnnotations.length} more asset review
                    {hiddenPendingAnnotations.length === 1 ? '' : 's'}
                  </summary>
                  <div className="asset-review-queue__grid">
                    {hiddenPendingAnnotations.map((annotation) => (
                      <AssetAnnotationEditor
                        annotation={annotation}
                        asset={assets.find((asset) => asset.id === annotation.assetId)}
                        assetUrl={urls[annotation.assetId]}
                        key={annotation.id}
                        onUpdate={onUpdateAnnotation}
                      />
                    ))}
                  </div>
                </details>
              ) : null}
              {reviewedAnnotations.length ? (
                <details className="asset-reviewed-history">
                  <summary>
                    View {reviewedAnnotations.length} reviewed asset decision
                    {reviewedAnnotations.length === 1 ? '' : 's'}
                  </summary>
                  <div className="asset-review-queue__grid">
                    {reviewedAnnotations.map((annotation) => (
                      <AssetAnnotationEditor
                        annotation={annotation}
                        asset={assets.find((asset) => asset.id === annotation.assetId)}
                        assetUrl={urls[annotation.assetId]}
                        key={annotation.id}
                        onUpdate={onUpdateAnnotation}
                      />
                    ))}
                  </div>
                </details>
              ) : null}
            </>
          )}
        </section>
      ) : null}
      {assets.length ? <VisualAssetCatalog assets={assets} /> : null}
      {message ? (
        <p className="form-message form-message--error" role="alert">
          {message}
        </p>
      ) : null}
      {loadError ? <p className="form-message form-message--error">{loadError}</p> : null}
    </Card>
  );
}

const visualContentTypeLabels: Record<VisualContentCandidate['contentType'], string> = {
  testimonial: 'Testimonial or feedback',
  service: 'Service information',
  contact: 'Contact information',
  pricing: 'Pricing',
  faq: 'Question and answer',
  process: 'Process',
  table: 'Table',
  list: 'List',
  general: 'General content',
};

function hasStructuredVisualContent(
  value: StructuredVisualContent | Record<string, never>,
): value is StructuredVisualContent {
  return value.schemaVersion === 1 && typeof value.kind === 'string';
}

function StructuredContentPreview({ content }: { content: StructuredVisualContent }) {
  if (content.kind === 'testimonial' && content.testimonial.quote) {
    const attribution = [
      content.testimonial.person,
      content.testimonial.role,
      content.testimonial.organisation,
    ].filter(Boolean);
    return (
      <blockquote className="structured-preview__quote">
        <p>{content.testimonial.quote}</p>
        {attribution.length ? <footer>{attribution.join(' · ')}</footer> : null}
      </blockquote>
    );
  }
  if (content.kind === 'table' && content.table.columns.length) {
    return (
      <div className="structured-preview__table-wrap">
        <table>
          {content.table.caption ? <caption>{content.table.caption}</caption> : null}
          <thead>
            <tr>
              {content.table.columns.map((column, index) => (
                <th key={`${column}-${index}`} scope="col">
                  {column || `Column ${index + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {content.table.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {content.table.columns.map((_, cellIndex) => (
                  <td key={cellIndex}>
                    {row[cellIndex] || <span aria-label="Empty cell">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {content.table.footnotes.map((footnote, index) => (
          <small key={index}>{footnote}</small>
        ))}
      </div>
    );
  }
  if (content.kind === 'faq' && content.faqs.length) {
    return (
      <dl className="structured-preview__faqs">
        {content.faqs.map((item, index) => (
          <div key={index}>
            <dt>{item.question}</dt>
            <dd>{item.answer}</dd>
          </div>
        ))}
      </dl>
    );
  }
  if (content.items.length) {
    return (
      <dl className="structured-preview__items">
        {content.items.map((item, index) => (
          <div key={index}>
            <dt>{item.label || item.value || `Item ${index + 1}`}</dt>
            {item.label && item.value ? <dd>{item.value}</dd> : null}
            {item.detail ? <dd className="muted-copy">{item.detail}</dd> : null}
          </div>
        ))}
      </dl>
    );
  }
  return <p className="structured-preview__body">{content.body}</p>;
}

function VisualContentCandidateEditor({
  candidate,
  assetUrl,
  onUpdate,
}: {
  candidate: VisualContentCandidate;
  assetUrl?: string;
  onUpdate: (
    candidate: VisualContentCandidate,
    patch: Pick<
      VisualContentCandidate,
      | 'contentType'
      | 'reviewState'
      | 'humanTitle'
      | 'humanBody'
      | 'humanAttribution'
      | 'humanNotes'
      | 'humanStructuredContent'
    >,
  ) => Promise<void>;
}) {
  const [contentType, setContentType] = useState(candidate.contentType);
  const [title, setTitle] = useState(candidate.humanTitle || candidate.title);
  const [body, setBody] = useState(candidate.humanBody || candidate.body);
  const [attribution, setAttribution] = useState(
    candidate.humanAttribution || candidate.attribution,
  );
  const [notes, setNotes] = useState(candidate.humanNotes);
  const sourceStructure = hasStructuredVisualContent(candidate.humanStructuredContent)
    ? candidate.humanStructuredContent
    : candidate.structuredContent;
  const [structuredJson, setStructuredJson] = useState(
    hasStructuredVisualContent(sourceStructure) ? JSON.stringify(sourceStructure, null, 2) : '',
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const fieldId = `visual-content-${candidate.id}`;

  async function save(reviewState = candidate.reviewState) {
    setSaving(true);
    setMessage('');
    try {
      let humanStructuredContent: StructuredVisualContent | Record<string, never> = {};
      if (structuredJson.trim()) {
        const parsed = JSON.parse(structuredJson) as StructuredVisualContent;
        if (!hasStructuredVisualContent(parsed)) {
          throw new Error('Structured data must retain schemaVersion 1 and a content kind.');
        }
        humanStructuredContent = { ...parsed, kind: contentType };
      }
      await onUpdate(candidate, {
        contentType,
        reviewState,
        humanTitle: title,
        humanBody: body,
        humanAttribution: attribution,
        humanNotes: notes,
        humanStructuredContent,
      });
      setMessage(
        reviewState === 'approved'
          ? 'Approved for the next brief.'
          : reviewState === 'blocked'
            ? 'Excluded from builder use.'
            : 'Draft changes saved.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'This content review could not be saved.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="visual-content-card">
      <header className="visual-content-card__header">
        <div>
          <Eyebrow>{visualContentTypeLabels[candidate.contentType]}</Eyebrow>
          <h4>{candidate.sectionHeading || 'Recovered image content'}</h4>
        </div>
        <div className="visual-content-card__meta">
          <StatusBadge
            tone={
              candidate.reviewState === 'approved'
                ? 'success'
                : candidate.reviewState === 'blocked'
                  ? 'danger'
                  : 'warning'
            }
          >
            {candidate.reviewState.replaceAll('_', ' ')}
          </StatusBadge>
          <StatusBadge tone={candidate.structureStatus === 'ready' ? 'success' : 'warning'}>
            {candidate.structureStatus === 'ready' ? 'Structured' : candidate.structureStatus}
          </StatusBadge>
        </div>
      </header>
      <div className="visual-content-card__body">
        <div className="visual-content-card__comparison">
          {assetUrl ? (
            <figure>
              <figcaption>Captured source</figcaption>
              <img
                alt="Captured source containing information proposed for recovery"
                className="visual-content-card__source"
                src={assetUrl}
              />
            </figure>
          ) : null}
          <section className="structured-preview" aria-label="Recovered structured content">
            <div className="structured-preview__heading">
              <span>Recovered structure</span>
              <small>
                {candidate.confidence} confidence · {candidate.sourcePresentation} source
              </small>
            </div>
            {candidate.structureStatus === 'ready' &&
            hasStructuredVisualContent(sourceStructure) ? (
              <>
                {sourceStructure.heading ? <h5>{sourceStructure.heading}</h5> : null}
                <StructuredContentPreview content={sourceStructure} />
                {sourceStructure.uncertainties.length ? (
                  <p className="structured-preview__uncertainty">
                    {sourceStructure.uncertainties.length} uncertain value
                    {sourceStructure.uncertainties.length === 1 ? '' : 's'} need review.
                  </p>
                ) : null}
              </>
            ) : candidate.structureStatus === 'failed' ? (
              <p className="form-message form-message--error">
                {candidate.structureError || 'This image could not be structured automatically.'}
              </p>
            ) : (
              <div className="structured-preview__pending" role="status">
                <span className="evidence-skeleton evidence-skeleton--value" />
                <span className="evidence-skeleton evidence-skeleton--detail" />
                <span>Waiting for structured analysis</span>
              </div>
            )}
          </section>
        </div>
        <details className="visual-content-card__editor">
          <summary>Edit recovered information</summary>
          <div className="visual-content-card__fields">
            <label htmlFor={`${fieldId}-type`}>Information type</label>
            <select
              id={`${fieldId}-type`}
              onChange={(event) =>
                setContentType(event.currentTarget.value as VisualContentCandidate['contentType'])
              }
              value={contentType}
            >
              {Object.entries(visualContentTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <label htmlFor={`${fieldId}-title`}>Optional title</label>
            <input
              id={`${fieldId}-title`}
              onChange={(event) => setTitle(event.currentTarget.value)}
              value={title}
            />
            <label htmlFor={`${fieldId}-body`}>Plain-text fallback</label>
            <textarea
              id={`${fieldId}-body`}
              onChange={(event) => setBody(event.currentTarget.value)}
              rows={4}
              value={body}
            />
            <label htmlFor={`${fieldId}-attribution`}>Plain-text attribution</label>
            <input
              id={`${fieldId}-attribution`}
              onChange={(event) => setAttribution(event.currentTarget.value)}
              value={attribution}
            />
            <label htmlFor={`${fieldId}-structure`}>Structured data</label>
            <textarea
              className="visual-content-card__json"
              id={`${fieldId}-structure`}
              onChange={(event) => setStructuredJson(event.currentTarget.value)}
              rows={12}
              spellCheck={false}
              value={structuredJson}
            />
            <small>
              Preserve the data meaning and uncertainty paths. This does not control the final
              component.
            </small>
            <label htmlFor={`${fieldId}-notes`}>Review notes</label>
            <textarea
              id={`${fieldId}-notes`}
              onChange={(event) => setNotes(event.currentTarget.value)}
              rows={2}
              value={notes}
            />
            <Button disabled={saving} onClick={() => void save()} variant="secondary">
              {saving ? 'Saving changes' : 'Save draft changes'}
            </Button>
          </div>
        </details>
        <footer className="visual-content-card__actions">
          <Button
            disabled={
              saving ||
              candidate.structureStatus !== 'ready' ||
              (!body.trim() && !hasStructuredVisualContent(sourceStructure))
            }
            onClick={() => void save('approved')}
          >
            <CheckCheck aria-hidden="true" size={16} />
            Approve information
          </Button>
          <Button disabled={saving} onClick={() => void save('blocked')} variant="secondary">
            Exclude
          </Button>
          {message ? <p role="status">{message}</p> : null}
        </footer>
      </div>
    </article>
  );
}

function VisualContentRecoveryPanel({
  workspace,
  onExtract,
  onCancel,
  onApproveAll,
  onUpdate,
}: {
  workspace: ProspectWorkspace;
  onExtract: () => Promise<void>;
  onCancel: () => Promise<void>;
  onApproveAll: () => Promise<void>;
  onUpdate: (
    candidate: VisualContentCandidate,
    patch: Pick<
      VisualContentCandidate,
      | 'contentType'
      | 'reviewState'
      | 'humanTitle'
      | 'humanBody'
      | 'humanAttribution'
      | 'humanNotes'
      | 'humanStructuredContent'
    >,
  ) => Promise<void>;
}) {
  const [extracting, setExtracting] = useState(false);
  const [message, setMessage] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [approvingAll, setApprovingAll] = useState(false);
  const assets = workspace.artifacts.filter((artifact) => artifact.kind === 'asset');
  const { urls } = usePrivateArtifactUrls(
    assets,
    'Captured source images could not be loaded. Refresh and check storage access.',
  );
  const candidates = workspace.visualContentCandidates;
  const job = workspace.visualContentJob;
  const active = job?.status === 'queued' || job?.status === 'running';
  const approvedCount = candidates.filter(
    (candidate) => candidate.reviewState === 'approved',
  ).length;
  const pendingCount = candidates.filter(
    (candidate) => candidate.reviewState === 'needs_review',
  ).length;
  const approvableCount = candidates.filter(
    (candidate) =>
      candidate.reviewState === 'needs_review' &&
      candidate.structureStatus === 'ready' &&
      (hasStructuredVisualContent(candidate.structuredContent) ||
        hasStructuredVisualContent(candidate.humanStructuredContent) ||
        Boolean(candidate.humanBody || candidate.body)),
  ).length;
  const contentGroups = new Map<
    string,
    { pageUrl: string; sectionHeading: string; candidates: VisualContentCandidate[] }
  >();
  for (const candidate of candidates) {
    const pageUrl = candidate.sourcePageUrl || 'Captured page';
    const sectionHeading = candidate.sectionHeading || 'Content found on this page';
    const key = `${pageUrl}\n${sectionHeading}`;
    const group = contentGroups.get(key);
    if (group) group.candidates.push(candidate);
    else contentGroups.set(key, { pageUrl, sectionHeading, candidates: [candidate] });
  }
  const sourcePageCount = new Set(candidates.map((candidate) => candidate.sourcePageUrl)).size;

  async function extract() {
    setExtracting(true);
    setMessage('');
    try {
      await onExtract();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Visual content could not be recovered.');
    } finally {
      setExtracting(false);
    }
  }

  async function cancel() {
    setCancelling(true);
    setMessage('');
    try {
      await onCancel();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Recovery could not be cancelled.');
    } finally {
      setCancelling(false);
    }
  }

  async function approveAll() {
    setApprovingAll(true);
    setMessage('');
    try {
      await onApproveAll();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'The recovered information could not be approved for builds.',
      );
    } finally {
      setApprovingAll(false);
    }
  }

  return (
    <Card className="workspace-panel visual-content-panel">
      <div className="visual-content-panel__hero">
        <div>
          <Eyebrow>Captured information recovery</Eyebrow>
          <h2>Recover image-based information</h2>
          <p className="muted-copy">
            Turn saved screenshots, tables, testimonials and text graphics into editable semantic
            information. The current capture is reused; the website is not visited again.
          </p>
          <div className="visual-content-panel__contract">
            <span>Page and section provenance retained</span>
            <span>Tables and lists keep their structure</span>
            <span>Builder chooses the final component</span>
          </div>
        </div>
        <div className="visual-content-panel__actions">
          {approvableCount ? (
            <Button
              disabled={approvingAll || active}
              onClick={() => void approveAll()}
              type="button"
            >
              <CheckCheck aria-hidden="true" size={16} />
              {approvingAll
                ? 'Preparing builder handoff'
                : `Approve all ${approvableCount} for builds`}
            </Button>
          ) : null}
          <Button
            disabled={extracting || active || !workspace.assetAnnotations.length}
            onClick={() => void extract()}
            type="button"
            variant={approvableCount ? 'secondary' : 'primary'}
          >
            <Sparkles aria-hidden="true" size={16} />
            {extracting
              ? 'Queueing recovery'
              : active
                ? 'Recovery in progress'
                : candidates.length
                  ? 'Analyse saved images again'
                  : 'Recover structured content'}
          </Button>
          {active ? (
            <Button
              disabled={cancelling || Boolean(job?.cancelRequestedAt)}
              onClick={() => void cancel()}
              type="button"
              variant="secondary"
            >
              <Ban aria-hidden="true" size={16} />
              {cancelling || job?.cancelRequestedAt ? 'Stopping recovery' : 'Cancel'}
            </Button>
          ) : null}
          {approvableCount ? (
            <small>
              Approves the saved recovered information and refreshes the Brief and Build Manifest
              for both Agent Studio tests and complete prospect builds.
            </small>
          ) : null}
        </div>
      </div>
      {candidates.length ? (
        <dl className="visual-content-panel__summary">
          <div>
            <dt>Recovered</dt>
            <dd>{candidates.length}</dd>
          </div>
          <div>
            <dt>Needs review</dt>
            <dd>{pendingCount}</dd>
          </div>
          <div>
            <dt>Approved</dt>
            <dd>{approvedCount}</dd>
          </div>
          <div>
            <dt>Source pages</dt>
            <dd>{sourcePageCount}</dd>
          </div>
        </dl>
      ) : null}
      {active ? (
        <div className="visual-content-progress" role="status" aria-live="polite">
          <div>
            <Sparkles aria-hidden="true" size={18} />
            <strong>{job?.progressDetail || 'Preparing saved images for interpretation.'}</strong>
          </div>
          <span>
            {job?.totalItems
              ? `${job.completedItems} of ${job.totalItems} images structured`
              : 'Loading candidate images'}
          </span>
        </div>
      ) : null}
      {job?.status === 'failed' && job.progressPhase !== 'cancelled' ? (
        <p className="form-message form-message--error">
          {job.errorSummary || 'Structured content recovery failed. Try the saved images again.'}
        </p>
      ) : null}
      {!workspace.assetAnnotations.length ? (
        <EmptyState
          detail="Analyse the saved images first. That vision pass reads visible text; it still does not require another website capture."
          icon={Sparkles}
          title="Image analysis is needed"
        />
      ) : !candidates.length ? (
        <EmptyState
          detail="Run recovery to find and structure useful information in the saved images. Decorative images and logos are ignored."
          icon={FileText}
          title="No recovered content yet"
        />
      ) : (
        <div className="visual-content-pages">
          {[...contentGroups.values()].map(
            ({ pageUrl, sectionHeading, candidates: groupItems }) => (
              <section className="visual-content-page" key={`${pageUrl}-${sectionHeading}`}>
                <header>
                  <div>
                    <Eyebrow>Captured page</Eyebrow>
                    <h3>{sectionHeading}</h3>
                  </div>
                  <StatusBadge tone="neutral">
                    {groupItems.length} item{groupItems.length === 1 ? '' : 's'}
                  </StatusBadge>
                  <a href={pageUrl} rel="noreferrer" target="_blank">
                    {pageUrl}
                  </a>
                </header>
                <div className="visual-content-grid">
                  {groupItems.map((candidate) => (
                    <VisualContentCandidateEditor
                      assetUrl={urls[candidate.assetId]}
                      candidate={candidate}
                      key={candidate.id}
                      onUpdate={onUpdate}
                    />
                  ))}
                </div>
              </section>
            ),
          )}
        </div>
      )}
      {message ? (
        <p className="form-message form-message--error" role="alert">
          {message}
        </p>
      ) : null}
    </Card>
  );
}

function isHexColour(value?: string) {
  return /^#[0-9a-f]{6}$/i.test(value ?? '');
}

function EditableLogoConversionControls({
  conversionActive,
  conversionMessage,
  conversionRequesting,
  hasExistingSvg,
  onConvert,
  onSimplifyGeometryChange,
  onVectorizerProviderChange,
  progressDetail,
  simplifyGeometry,
  vectorizerProvider,
}: {
  conversionActive: boolean;
  conversionMessage: string;
  conversionRequesting: boolean;
  hasExistingSvg: boolean;
  onConvert: () => void;
  onSimplifyGeometryChange: (enabled: boolean) => void;
  onVectorizerProviderChange: (provider: 'vtracer' | 'vectorizer_ai') => void;
  progressDetail?: string;
  simplifyGeometry: boolean;
  vectorizerProvider: 'vtracer' | 'vectorizer_ai';
}) {
  const converting = conversionActive || conversionRequesting;
  return (
    <div className="brand-kit__conversion-controls">
      <label className="brand-kit__conversion-option">
        <input
          checked={simplifyGeometry}
          disabled={converting}
          onChange={(event) => onSimplifyGeometryChange(event.target.checked)}
          type="checkbox"
        />
        <span>
          <strong>Fit straight lines, corners and curves</strong>
          <small>
            Uses geometry fitting to replace pixel wobble with straight lines and a small number of
            smooth Bézier curves. Recommended for clean logos and wordmarks such as LECE.
          </small>
        </span>
      </label>
      <fieldset className="brand-kit__vectorizer-choice" disabled={converting}>
        <legend>SVG conversion engine</legend>
        <label>
          <input
            checked={vectorizerProvider === 'vtracer'}
            name="svg-vectorizer-provider"
            onChange={() => onVectorizerProviderChange('vtracer')}
            type="radio"
          />
          Current tracer
        </label>
        <label>
          <input
            checked={vectorizerProvider === 'vectorizer_ai'}
            name="svg-vectorizer-provider"
            onChange={() => onVectorizerProviderChange('vectorizer_ai')}
            type="radio"
          />
          Vectorizer.AI
        </label>
        <small>
          Vectorizer.AI traces the original captured logo directly, without ChatGPT remastering.
        </small>
      </fieldset>
      <Button disabled={converting} onClick={onConvert} type="button" variant="secondary">
        <FileCode2 aria-hidden="true" size={16} />
        {converting
          ? 'Converting to SVG'
          : hasExistingSvg
            ? 'Try another AI-assisted conversion'
            : 'Convert to SVG'}
      </Button>
      {converting ? (
        <p role="status">
          {progressDetail || conversionMessage || 'Preparing the editable SVG logo.'}
        </p>
      ) : null}
      {conversionMessage && !converting ? <p role="status">{conversionMessage}</p> : null}
    </div>
  );
}

function BrandKitPanel({
  workspace,
  onSave,
  onPushLogoVersions,
  onCreateRevision,
  onConvertLogo,
  onDeleteLogo,
}: {
  workspace: ProspectWorkspace;
  onSave: (
    draft: Pick<
      BrandKit,
      'primaryLogoAssetId' | 'editableLogoAssetId' | 'approvedAssetIds' | 'palette' | 'notes'
    >,
    approve?: boolean,
    silent?: boolean,
  ) => Promise<void>;
  onPushLogoVersions: (
    draft: Pick<
      BrandKit,
      'primaryLogoAssetId' | 'editableLogoAssetId' | 'approvedAssetIds' | 'palette' | 'notes'
    >,
  ) => Promise<void>;
  onCreateRevision: () => Promise<void>;
  onConvertLogo: (
    asset: ResearchArtifact,
    options: { simplifyGeometry: boolean; vectorizerProvider: 'vtracer' | 'vectorizer_ai' },
  ) => Promise<void>;
  onDeleteLogo: (asset: ResearchArtifact, onUndo: () => void) => void;
}) {
  const existing = workspace.brandKit;
  const assets = workspace.artifacts.filter((artifact) => artifact.kind === 'asset');
  const annotationsByAsset = new Map(
    workspace.assetAnnotations.map((annotation) => [annotation.assetId, annotation]),
  );
  const logoAssets = assets.filter(
    (asset) =>
      asset.metadata.privateAiSuggestion !== true &&
      (asset.metadata.assetType === 'logo' ||
        ['primary_logo', 'secondary_mark'].includes(
          annotationsByAsset.get(asset.id)?.suggestedRole ?? '',
        )),
  );
  const supportingAssets = assets.filter(
    (asset) =>
      asset.metadata.assetType === 'image' ||
      ['worksite_photo', 'team_photo', 'project_photo'].includes(
        annotationsByAsset.get(asset.id)?.suggestedRole ?? '',
      ),
  );
  const editableSvgAssets = assets.filter(
    (asset) => asset.contentType === 'image/svg+xml' && asset.metadata.logoVariant === 'editable',
  );
  const aiEnhancedLogoAssets = assets.filter(
    (asset) => asset.metadata.logoVariant === 'ai_enhanced',
  );
  const alphaMatteAssets = assets.filter((asset) => asset.metadata.logoVariant === 'alpha_matte');
  const logoAppearanceAssets = assets.filter(
    (asset) =>
      asset.metadata.logoVariant === 'appearance' && asset.metadata.transparentBackground === true,
  );
  const visibleAssets = [
    ...new Map(
      [
        ...logoAssets,
        ...supportingAssets,
        ...editableSvgAssets,
        ...aiEnhancedLogoAssets,
        ...alphaMatteAssets,
        ...logoAppearanceAssets,
      ].map((asset) => [asset.id, asset]),
    ).values(),
  ];
  const { urls, loadError } = usePrivateArtifactUrls(
    visibleAssets,
    'Private brand assets could not be loaded. Refresh and check storage access.',
  );
  const colourSuggestions = useMemo(
    () => rankBrandColourEvidence(workspace.brandColourEvidence),
    [workspace.brandColourEvidence],
  );
  const [draft, setDraft] = useState({
    primaryLogoAssetId: existing?.primaryLogoAssetId ?? '',
    editableLogoAssetId: existing?.editableLogoAssetId ?? '',
    approvedAssetIds: existing?.approvedAssetIds ?? [],
    palette: existing?.palette ?? {},
    notes: existing?.notes ?? '',
  });
  // A source logo and its private derivatives are deleted as one group. Keep that relationship
  // reflected locally during the short undo window, rather than leaving a stale SVG selectable.
  const [hiddenLogoIds, setHiddenLogoIds] = useState<string[]>([]);
  const [hiddenLogoVersionIds, setHiddenLogoVersionIds] = useState<string[]>([]);
  const editableLogoCandidates = editableSvgAssets
    .filter(
      (asset) =>
        !hiddenLogoIds.includes(asset.id) &&
        asset.contentType === 'image/svg+xml' &&
        asset.metadata.logoVariant === 'editable' &&
        (asset.metadata.derivedFromAssetId === draft.primaryLogoAssetId ||
          asset.metadata.sourceLogoAssetId === draft.primaryLogoAssetId),
    )
    .sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  const newestEditableLogoId = editableLogoCandidates[0]?.id;
  const selectedEditableLogo = assets.find((asset) => asset.id === existing?.editableLogoAssetId);
  const [saving, setSaving] = useState(false);
  const [pushingLogoVersions, setPushingLogoVersions] = useState(false);
  const [pushError, setPushError] = useState('');
  const [autosaving, setAutosaving] = useState(false);
  const [message, setMessage] = useState('');
  const [conversionMessage, setConversionMessage] = useState('');
  const [conversionRequesting, setConversionRequesting] = useState(false);
  const [simplifyGeometry, setSimplifyGeometry] = useState(false);
  const [vectorizerProvider, setVectorizerProvider] = useState<'vtracer' | 'vectorizer_ai'>(
    'vtracer',
  );
  const draftRef = useRef(draft);
  const autosaveQueueRef = useRef(Promise.resolve());
  const pendingAutosavesRef = useRef(0);
  const locked = existing?.status === 'approved';
  const conversionActive =
    workspace.assetAnalysis?.status === 'queued' || workspace.assetAnalysis?.status === 'running';
  const selectedPrimaryLogo = assets.find((asset) => asset.id === draft.primaryLogoAssetId);
  const activeRetryToken = workspace.assetAnalysis?.editableLogoRetryToken;
  const savedAiEnhancedLogo = aiEnhancedLogoAssets
    .filter((asset) => asset.metadata.derivedFromAssetId === selectedPrimaryLogo?.id)
    .sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )[0];
  const savedAlphaMatte = alphaMatteAssets
    .filter((asset) => asset.metadata.derivedFromAssetId === selectedPrimaryLogo?.id)
    .sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )[0];
  const logoVersions = [
    ...new Map(
      logoAppearanceAssets
        .filter(
          (asset) =>
            !hiddenLogoIds.includes(asset.id) &&
            !hiddenLogoVersionIds.includes(asset.id) &&
            asset.metadata.derivedFromAssetId === selectedPrimaryLogo?.id,
        )
        .sort(
          (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        )
        .map((asset) => [String(asset.metadata.logoAppearance), asset]),
    ).values(),
  ].sort((left, right) => {
    const order = ['original', 'black', 'black-accent', 'white', 'white-accent'];
    return (
      order.indexOf(String(left.metadata.logoAppearance)) -
      order.indexOf(String(right.metadata.logoAppearance))
    );
  });
  const activeAiEnhancedLogo = activeRetryToken
    ? (aiEnhancedLogoAssets.find(
        (asset) =>
          asset.metadata.derivedFromAssetId === selectedPrimaryLogo?.id &&
          asset.metadata.retryToken === activeRetryToken,
      ) ?? savedAiEnhancedLogo)
    : undefined;
  const conversionInProgress = conversionRequesting || conversionActive;
  const logoConversionFailure =
    workspace.assetAnalysis?.status === 'failed' &&
    workspace.assetAnalysis.editableLogoRetryAssetId === selectedPrimaryLogo?.id;

  useEffect(() => {
    if (pendingAutosavesRef.current) return;
    const nextDraft = {
      primaryLogoAssetId: existing?.primaryLogoAssetId ?? '',
      editableLogoAssetId: existing?.editableLogoAssetId ?? '',
      approvedAssetIds: existing?.approvedAssetIds ?? [],
      palette: existing?.palette ?? {},
      notes: existing?.notes ?? '',
    };
    draftRef.current = nextDraft;
    setDraft(nextDraft);
  }, [existing?.id, existing?.updatedAt]);

  useEffect(() => {
    if (locked || !colourSuggestions.primary) return;
    const current = draftRef.current;
    const palette = {
      ...current.palette,
      ...(current.palette.primary ? {} : { primary: colourSuggestions.primary?.colour }),
      ...(current.palette.accent || !colourSuggestions.accent
        ? {}
        : { accent: colourSuggestions.accent.colour }),
    };
    if (palette.primary === current.palette.primary && palette.accent === current.palette.accent) {
      return;
    }
    const nextDraft = { ...current, palette };
    draftRef.current = nextDraft;
    setDraft(nextDraft);
  }, [colourSuggestions.accent?.colour, colourSuggestions.primary?.colour, locked]);

  useEffect(() => {
    if (workspace.assetAnalysis?.status !== 'failed') return;
    setConversionMessage(
      workspace.assetAnalysis.errorSummary ||
        'SVG conversion failed before an editable file could be saved. Retry the conversion to try again.',
    );
  }, [
    workspace.assetAnalysis?.errorSummary,
    workspace.assetAnalysis?.id,
    workspace.assetAnalysis?.status,
  ]);

  function toggleAsset(assetId: string) {
    updateDraft({
      ...draftRef.current,
      approvedAssetIds: draftRef.current.approvedAssetIds.includes(assetId)
        ? draftRef.current.approvedAssetIds.filter((candidate) => candidate !== assetId)
        : [...draftRef.current.approvedAssetIds, assetId],
    });
  }

  function normalisedDraft(nextDraft: typeof draft) {
    return {
      ...nextDraft,
      approvedAssetIds: [
        ...new Set([
          ...nextDraft.approvedAssetIds,
          nextDraft.primaryLogoAssetId,
          nextDraft.editableLogoAssetId,
        ]),
      ].filter(Boolean),
    };
  }

  function updateDraft(nextDraft: typeof draft) {
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    if (locked) return;
    setAutosaving(true);
    pendingAutosavesRef.current += 1;
    const snapshot = normalisedDraft(nextDraft);
    autosaveQueueRef.current = autosaveQueueRef.current
      .catch(() => undefined)
      .then(() => onSave(snapshot, false, true))
      .catch((error) => {
        setMessage(
          error instanceof Error ? error.message : 'The Brand Kit draft could not be saved.',
        );
      })
      .finally(() => {
        pendingAutosavesRef.current -= 1;
        if (draftRef.current === nextDraft) setAutosaving(false);
      });
  }

  function applySuggestedColours() {
    if (!colourSuggestions.primary) {
      setMessage('Run asset analysis to collect enough brand-colour evidence first.');
      return;
    }
    updateDraft({
      ...draftRef.current,
      palette: {
        ...draftRef.current.palette,
        primary: colourSuggestions.primary?.colour,
        accent: colourSuggestions.accent?.colour ?? draftRef.current.palette.accent,
      },
    });
    setMessage(
      'Evidence-backed primary and accent suggestions applied. Review them before approval.',
    );
  }

  async function save(approve = false) {
    setSaving(true);
    setMessage('');
    try {
      await autosaveQueueRef.current;
      await onSave(
        {
          ...normalisedDraft(draftRef.current),
        },
        approve,
      );
      if (approve) {
        await onCreateRevision();
        setMessage(
          'Brand Kit approved. A new draft Brief now carries its permitted assets; review and approve that Brief before building.',
        );
      } else {
        setMessage('Brand Kit saved.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The Brand Kit could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  async function createBrandKitRevision() {
    if (!existing) return;
    setSaving(true);
    setMessage('');
    try {
      const selectedAssetIds = assets
        .filter((asset) => asset.metadata.analysisSelected !== false)
        .map((asset) => asset.id);
      const suggestedAssetIds = workspace.assetAnnotations
        .filter(
          (annotation) =>
            annotation.suggestedRole !== 'exclude' &&
            annotation.businessAssociation !== 'third_party',
        )
        .map((annotation) => annotation.assetId);
      await onSave(
        {
          primaryLogoAssetId: existing.primaryLogoAssetId,
          editableLogoAssetId: existing.editableLogoAssetId,
          approvedAssetIds: [
            ...new Set([...existing.approvedAssetIds, ...selectedAssetIds, ...suggestedAssetIds]),
          ],
          palette: existing.palette,
          notes: existing.notes,
        },
        false,
      );
      setMessage(
        'Editable Brand Kit revision created with selected and AI-suggested asset candidates. Review it before approval.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'The Brand Kit revision could not be created.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function convertSelectedLogo() {
    const logo = assets.find((asset) => asset.id === draftRef.current.primaryLogoAssetId);
    if (!logo) {
      setConversionMessage(
        'Choose the organisation logo before creating its high-fidelity versions.',
      );
      return;
    }
    const previousVersionIds = logoAppearanceAssets
      .filter((asset) => asset.metadata.derivedFromAssetId === logo.id)
      .map((asset) => asset.id);
    const previousMatteIds = alphaMatteAssets
      .filter((asset) => asset.metadata.derivedFromAssetId === logo.id)
      .map((asset) => asset.id);
    const hiddenIds = [...previousVersionIds, ...previousMatteIds];
    setHiddenLogoVersionIds((current) => [...new Set([...current, ...hiddenIds])]);
    setConversionRequesting(true);
    setConversionMessage('Queueing high-fidelity logo versions…');
    try {
      await onConvertLogo(logo, { simplifyGeometry, vectorizerProvider });
      setConversionMessage(
        'Logo versions queued. This section updates when the worker saves them.',
      );
    } catch (error) {
      setHiddenLogoVersionIds((current) =>
        current.filter((assetId) => !hiddenIds.includes(assetId)),
      );
      setConversionMessage(
        error instanceof Error
          ? error.message
          : 'The high-fidelity logo versions could not be queued.',
      );
    } finally {
      setConversionRequesting(false);
    }
  }

  async function pushLogoVersions() {
    if (!logoVersions.length) return;
    setPushingLogoVersions(true);
    setPushError('');
    try {
      await autosaveQueueRef.current;
      const alphaMatteIds = new Set(alphaMatteAssets.map((asset) => asset.id));
      const nextDraft = normalisedDraft({
        ...draftRef.current,
        approvedAssetIds: [
          ...new Set([
            ...draftRef.current.approvedAssetIds.filter((assetId) => !alphaMatteIds.has(assetId)),
            ...logoVersions.map((asset) => asset.id),
          ]),
        ],
      });
      draftRef.current = nextDraft;
      setDraft(nextDraft);
      await onPushLogoVersions(nextDraft);
    } catch (error) {
      setPushError(
        error instanceof Error
          ? error.message
          : 'The generated logo versions could not be pushed into the builder handoff.',
      );
    } finally {
      setPushingLogoVersions(false);
    }
  }

  function deleteLogo(asset: ResearchArtifact) {
    const deletionIds = new Set(
      assets
        .filter(
          (candidate) =>
            candidate.id === asset.id ||
            candidate.metadata.derivedFromAssetId === asset.id ||
            candidate.metadata.sourceLogoAssetId === asset.id,
        )
        .map((candidate) => candidate.id),
    );
    const previousDraft = draftRef.current;
    const nextDraft = {
      ...previousDraft,
      primaryLogoAssetId: deletionIds.has(previousDraft.primaryLogoAssetId)
        ? ''
        : previousDraft.primaryLogoAssetId,
      editableLogoAssetId: deletionIds.has(previousDraft.editableLogoAssetId)
        ? ''
        : previousDraft.editableLogoAssetId,
      approvedAssetIds: previousDraft.approvedAssetIds.filter((id) => !deletionIds.has(id)),
    };
    const affectsDraft =
      deletionIds.has(previousDraft.primaryLogoAssetId) ||
      deletionIds.has(previousDraft.editableLogoAssetId) ||
      nextDraft.approvedAssetIds.length !== previousDraft.approvedAssetIds.length;
    setHiddenLogoIds((current) => [...new Set([...current, ...deletionIds])]);
    if (affectsDraft) {
      draftRef.current = nextDraft;
      setDraft(nextDraft);
    }
    onDeleteLogo(asset, () => {
      setHiddenLogoIds((current) => current.filter((id) => !deletionIds.has(id)));
      if (affectsDraft && draftRef.current === nextDraft) {
        draftRef.current = previousDraft;
        setDraft(previousDraft);
      }
    });
  }

  return (
    <Card className="workspace-panel brand-kit">
      <div className="brief-panel__header">
        <div>
          <Eyebrow>Brand control</Eyebrow>
          <h2>Brand Kit</h2>
          <p className="muted-copy">
            Approve the organisation logo, permitted captured visual assets, and reviewed colour
            tokens before they can guide a private redesign.
          </p>
        </div>
        <StatusBadge tone={locked ? 'success' : 'warning'}>
          {locked ? `Approved v${existing?.version}` : 'Needs approval'}
        </StatusBadge>
      </div>
      {locked ? (
        <div className="brand-kit__approved">
          <p>
            This kit locks the visual identity used by future build revisions. The existing preview
            remains unchanged as a historical record.
          </p>
          <section
            className="brand-kit__editable-logo"
            aria-labelledby="approved-editable-logo-title"
          >
            <div>
              <Eyebrow>Editable vector variant</Eyebrow>
              <h3 id="approved-editable-logo-title">Editable SVG logo</h3>
            </div>
            {selectedEditableLogo ? (
              <div className="brand-kit__asset brand-kit__asset--approved">
                {urls[selectedEditableLogo.id] ? (
                  <ExpandableImage
                    alt={selectedEditableLogo.label || 'Editable SVG logo'}
                    className="brand-kit__asset-preview"
                    label={selectedEditableLogo.label || 'editable SVG logo'}
                    src={urls[selectedEditableLogo.id]}
                  >
                    <img alt="" src={urls[selectedEditableLogo.id]} />
                  </ExpandableImage>
                ) : (
                  <span>Loading SVG</span>
                )}
                <span>
                  {selectedEditableLogo.label || 'Editable SVG logo'}
                  <ImageFileType
                    contentType={selectedEditableLogo.contentType}
                    path={selectedEditableLogo.storagePath}
                  />
                  <small>Approved SVG with editable fill and stroke tokens</small>
                </span>
              </div>
            ) : (
              <p className="brand-kit__editable-logo-empty">
                No editable SVG is included in this approved Brand Kit. Create an editable revision
                to add one.
              </p>
            )}
          </section>
          {colourSuggestions.primary ? (
            <section className="brand-kit__evidence" aria-labelledby="brand-evidence-current-title">
              <div>
                <Eyebrow>Current capture evidence</Eyebrow>
                <h3 id="brand-evidence-current-title">Suggested brand colours</h3>
              </div>
              <div className="brand-kit__evidence-colours">
                {[
                  { label: 'Primary', suggestion: colourSuggestions.primary },
                  { label: 'Accent', suggestion: colourSuggestions.accent },
                ].map(({ label, suggestion }) =>
                  suggestion ? (
                    <div key={label}>
                      <span
                        aria-hidden="true"
                        className="brand-kit__colour-swatch"
                        style={{ background: suggestion.colour }}
                      />
                      <strong>{label}</strong>
                      <code>{suggestion.colour}</code>
                      <small>{brandColourEvidenceSummary(suggestion.evidence)}</small>
                    </div>
                  ) : null,
                )}
              </div>
              <p>
                These observations belong to the latest capture. They do not change the approved
                Brand Kit until you create and approve a deliberate revision.
              </p>
            </section>
          ) : null}
          <div className="button-row">
            <Button disabled={saving} onClick={() => void createBrandKitRevision()} type="button">
              <RotateCcw aria-hidden="true" size={16} />
              {saving ? 'Creating revision' : 'Create editable Brand Kit revision'}
            </Button>
            <Button
              disabled={saving}
              onClick={() => void onCreateRevision()}
              type="button"
              variant="secondary"
            >
              <FilePenLine aria-hidden="true" size={16} />
              Update Brief from this Brand Kit
            </Button>
          </div>
        </div>
      ) : (
        <>
          {!logoAssets.filter((asset) => !hiddenLogoIds.includes(asset.id)).length ? (
            <EmptyState
              detail="No logo candidates are available yet. Run asset analysis, then classify the organisation logo before approving a Brand Kit."
              icon={ShieldAlert}
              title="Logo evidence required"
            />
          ) : conversionInProgress && selectedPrimaryLogo ? (
            <EditableLogoConversionProgress
              asset={selectedPrimaryLogo}
              alphaMatteAsset={savedAlphaMatte}
              alphaMatteUrl={savedAlphaMatte ? urls[savedAlphaMatte.id] : undefined}
              enhancedAsset={activeAiEnhancedLogo}
              enhancedUrl={activeAiEnhancedLogo ? urls[activeAiEnhancedLogo.id] : undefined}
              job={workspace.assetAnalysis}
              logoVersions={logoVersions}
              requesting={conversionRequesting}
              sourceUrl={urls[selectedPrimaryLogo.id]}
              versionUrls={urls}
            />
          ) : (
            <>
              <fieldset className="brand-kit__logos" disabled={saving}>
                <legend>Organisation logo</legend>
                {logoAssets
                  .filter((asset) => !hiddenLogoIds.includes(asset.id))
                  .map((asset) => (
                    <div className="brand-kit__asset" key={asset.id}>
                      <input
                        checked={draft.primaryLogoAssetId === asset.id}
                        name="primary-logo"
                        onChange={() =>
                          updateDraft({
                            ...draftRef.current,
                            primaryLogoAssetId: asset.id,
                            editableLogoAssetId: '',
                            approvedAssetIds: [
                              ...new Set(
                                draftRef.current.approvedAssetIds.filter(
                                  (candidate) => candidate !== draftRef.current.editableLogoAssetId,
                                ),
                              ),
                              asset.id,
                            ],
                          })
                        }
                        type="radio"
                      />
                      {urls[asset.id] ? (
                        <ExpandableImage
                          alt={asset.label || 'Logo candidate'}
                          className="brand-kit__asset-preview"
                          label={asset.label || 'logo candidate'}
                          src={urls[asset.id]}
                        >
                          <img alt="" src={urls[asset.id]} />
                        </ExpandableImage>
                      ) : (
                        <span>Loading logo</span>
                      )}
                      <span className="brand-kit__asset-details">
                        {asset.label || 'Logo candidate'}
                        <ImageFileType contentType={asset.contentType} path={asset.storagePath} />
                        {asset.metadata.vectorSuggestion ? (
                          <small>Derived vector suggestion — review before selecting</small>
                        ) : null}
                      </span>
                      <IconButton
                        className="brand-kit__logo-delete"
                        label={`Permanently delete ${asset.label || 'logo candidate'}`}
                        onClick={() => deleteLogo(asset)}
                        title="Delete logo permanently"
                        variant="danger"
                      >
                        <Trash2 aria-hidden="true" size={16} />
                      </IconButton>
                    </div>
                  ))}
              </fieldset>
              {draft.primaryLogoAssetId ? (
                <>
                  <section
                    className="brand-kit__logo-versions"
                    aria-labelledby="logo-versions-title"
                  >
                    <div>
                      <Eyebrow>Normal logo workflow</Eyebrow>
                      <h3 id="logo-versions-title">High-fidelity logo versions</h3>
                      <p className="muted-copy">
                        ChatGPT creates the high-resolution black-and-white alpha matte. That exact
                        matte is saved for review and used for every transparent version.
                      </p>
                    </div>
                    {logoConversionFailure ? (
                      <div className="brand-kit__conversion-failure" role="alert">
                        <div>
                          <strong>Logo conversion stopped</strong>
                          <p>
                            {workspace.assetAnalysis?.errorSummary ||
                              'The conversion stopped before every logo version could be saved. Your original logo and any earlier saved versions are safe.'}
                          </p>
                        </div>
                        <Button
                          disabled={conversionInProgress || saving}
                          onClick={() => void convertSelectedLogo()}
                          type="button"
                          variant="secondary"
                        >
                          <RotateCcw aria-hidden="true" size={16} />
                          Retry logo conversion
                        </Button>
                      </div>
                    ) : null}
                    {savedAlphaMatte && !hiddenLogoVersionIds.includes(savedAlphaMatte.id) ? (
                      <div className="brand-kit__alpha-matte">
                        {urls[savedAlphaMatte.id] ? (
                          <ExpandableImage
                            alt="Saved black and white alpha matte"
                            className="brand-kit__logo-version-preview"
                            label={savedAlphaMatte.label || 'saved alpha matte'}
                            src={urls[savedAlphaMatte.id]}
                          >
                            <img
                              alt="Saved black and white alpha matte"
                              src={urls[savedAlphaMatte.id]}
                            />
                          </ExpandableImage>
                        ) : (
                          <div className="brand-kit__logo-version-preview">Loading</div>
                        )}
                        <span>
                          <strong>Saved alpha matte</strong>
                          <small>
                            {savedAlphaMatte.metadata.rawAiOutput
                              ? 'Raw ChatGPT PNG with no resizing or reconstructed mask. Click to inspect.'
                              : 'Black is logo coverage; white is removed background. Click to inspect.'}
                          </small>
                        </span>
                      </div>
                    ) : null}
                    {logoVersions.length ? (
                      <>
                        {logoConversionFailure ? (
                          <p className="brand-kit__logo-history-label">
                            Previously saved versions — these are from the failed attempt, not the
                            current conversion.
                          </p>
                        ) : null}
                        <div className="brand-kit__logo-version-grid">
                          {logoVersions.map((asset) => (
                            <article className="brand-kit__logo-version" key={asset.id}>
                              {urls[asset.id] ? (
                                <ExpandableImage
                                  alt={asset.label || 'Transparent logo version'}
                                  className="brand-kit__logo-version-preview"
                                  label={asset.label || 'transparent logo version'}
                                  src={urls[asset.id]}
                                >
                                  <img alt="" src={urls[asset.id]} />
                                </ExpandableImage>
                              ) : (
                                <div className="brand-kit__logo-version-preview">Loading</div>
                              )}
                              <strong>
                                {asset.label?.replace(/ transparent logo.*$/i, '') || 'Logo'}
                              </strong>
                              <span>
                                Transparent PNG
                                <ImageFileType
                                  contentType={asset.contentType}
                                  path={asset.storagePath}
                                />
                              </span>
                            </article>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="brand-kit__logo-versions-empty">
                        <p>
                          Create an original-colour, black, white, and—when the source has a second
                          brand colour—accent version with transparent backgrounds.
                        </p>
                        <Button
                          disabled={conversionInProgress || saving}
                          onClick={() => void convertSelectedLogo()}
                          type="button"
                        >
                          <Sparkles aria-hidden="true" size={16} />
                          {conversionInProgress
                            ? 'Preparing logo versions'
                            : 'Create high-fidelity logo versions'}
                        </Button>
                        {conversionMessage && !conversionInProgress ? (
                          <p role="status">{conversionMessage}</p>
                        ) : null}
                      </div>
                    )}
                    {logoVersions.length ? (
                      <div className="brand-kit__logo-version-actions">
                        <div>
                          <Button
                            disabled={conversionInProgress || saving || pushingLogoVersions}
                            onClick={() => void pushLogoVersions()}
                            type="button"
                          >
                            {pushingLogoVersions ? (
                              <LoaderCircle aria-hidden="true" className="spin" size={16} />
                            ) : (
                              <PackageCheck aria-hidden="true" size={16} />
                            )}
                            {pushingLogoVersions
                              ? 'Updating builder handoff'
                              : 'Push & update build assets'}
                          </Button>
                          <p className="muted-copy">
                            Approves these transparent logo versions and refreshes the Brand Kit,
                            Brief, and Build Manifest in one step. The alpha matte is never
                            included.
                          </p>
                          {pushError ? (
                            <p className="form-message form-message--error" role="alert">
                              {pushError}
                            </p>
                          ) : null}
                        </div>
                        <Button
                          disabled={conversionInProgress || saving || pushingLogoVersions}
                          onClick={() => void convertSelectedLogo()}
                          type="button"
                          variant="secondary"
                        >
                          <RotateCcw aria-hidden="true" size={16} />
                          Refresh logo versions
                        </Button>
                      </div>
                    ) : null}
                  </section>
                  <details className="brand-kit__svg-beta">
                    <summary>
                      <span>Experimental SVG converter</span>
                      <span className="brand-kit__beta-tag">Beta</span>
                    </summary>
                    <fieldset className="brand-kit__editable-logo" disabled={saving}>
                      <legend>Editable SVG logo</legend>
                      <p className="muted-copy">
                        This optional derived version remains separate from the captured logo. Its
                        SVG preserves the traced logo colours as editable fill and stroke tokens.
                      </p>
                      {savedAiEnhancedLogo ? (
                        <div className="brand-kit__asset brand-kit__asset--approved brand-kit__saved-ai">
                          {urls[savedAiEnhancedLogo.id] ? (
                            <ExpandableImage
                              alt={savedAiEnhancedLogo.label || 'Saved AI-cleaned logo output'}
                              className="brand-kit__asset-preview"
                              label={savedAiEnhancedLogo.label || 'saved AI-cleaned logo output'}
                              src={urls[savedAiEnhancedLogo.id]}
                            >
                              <img alt="" src={urls[savedAiEnhancedLogo.id]} />
                            </ExpandableImage>
                          ) : (
                            <span>Loading AI output</span>
                          )}
                          <span>
                            Saved AI clean-up output
                            <ImageFileType
                              contentType={savedAiEnhancedLogo.contentType}
                              path={savedAiEnhancedLogo.storagePath}
                            />
                            <small>
                              Saved privately for comparison. The approved captured logo remains the
                              source of truth.
                            </small>
                          </span>
                        </div>
                      ) : null}
                      {editableLogoCandidates.length ? (
                        <>
                          {editableLogoCandidates.map((asset) => (
                            <div className="brand-kit__asset" key={asset.id}>
                              <input
                                checked={draft.editableLogoAssetId === asset.id}
                                name="editable-logo"
                                onChange={() =>
                                  updateDraft({
                                    ...draftRef.current,
                                    editableLogoAssetId: asset.id,
                                  })
                                }
                                type="radio"
                              />
                              {urls[asset.id] ? (
                                <ExpandableImage
                                  alt={asset.label || 'Editable SVG logo'}
                                  className="brand-kit__asset-preview"
                                  label={asset.label || 'editable SVG logo'}
                                  src={urls[asset.id]}
                                >
                                  <img alt="" src={urls[asset.id]} />
                                </ExpandableImage>
                              ) : (
                                <span>Loading SVG</span>
                              )}
                              <span>
                                {asset.label || 'Editable SVG logo'}
                                <ImageFileType
                                  contentType={asset.contentType}
                                  path={asset.storagePath}
                                />
                                {asset.id === newestEditableLogoId ? (
                                  <span className="brand-kit__new-svg-tag">New SVG</span>
                                ) : null}
                                <small>Fill and stroke colours remain editable</small>
                                <small>
                                  {asset.metadata.aiEnhancement
                                    ? 'AI clean-up passed a source-shape check; source colours are locked'
                                    : asset.metadata.vectorizer === 'vtracer'
                                      ? 'Current source-colour trace'
                                      : 'Legacy trace — compare carefully before selecting'}
                                </small>
                                <EditableSvgLogo
                                  asset={asset}
                                  palette={draft.palette}
                                  src={urls[asset.id] ?? ''}
                                />
                              </span>
                            </div>
                          ))}
                          <div className="brand-kit__editable-logo-empty">
                            <p>
                              Your editable SVG is ready. You can optionally run another AI-assisted
                              conversion if you want a separate version to compare.
                            </p>
                            <EditableLogoConversionControls
                              conversionActive={conversionActive}
                              conversionMessage={conversionMessage}
                              conversionRequesting={conversionRequesting}
                              hasExistingSvg
                              onConvert={() => void convertSelectedLogo()}
                              onSimplifyGeometryChange={setSimplifyGeometry}
                              onVectorizerProviderChange={setVectorizerProvider}
                              progressDetail={workspace.assetAnalysis?.progressDetail}
                              simplifyGeometry={simplifyGeometry}
                              vectorizerProvider={vectorizerProvider}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="brand-kit__editable-logo-empty">
                          <p>No editable SVG is ready yet.</p>
                          <EditableLogoConversionControls
                            conversionActive={conversionActive}
                            conversionMessage={conversionMessage}
                            conversionRequesting={conversionRequesting}
                            hasExistingSvg={false}
                            onConvert={() => void convertSelectedLogo()}
                            onSimplifyGeometryChange={setSimplifyGeometry}
                            onVectorizerProviderChange={setVectorizerProvider}
                            progressDetail={workspace.assetAnalysis?.progressDetail}
                            simplifyGeometry={simplifyGeometry}
                            vectorizerProvider={vectorizerProvider}
                          />
                        </div>
                      )}
                    </fieldset>
                  </details>
                </>
              ) : null}
            </>
          )}
          {supportingAssets.length ? (
            <details className="brand-kit__asset-disclosure">
              <summary>Permitted supporting imagery ({supportingAssets.length})</summary>
              <fieldset className="brand-kit__assets" disabled={saving}>
                <legend className="sr-only">Permitted supporting imagery</legend>
                {supportingAssets.map((asset) => (
                  <label className="brand-kit__asset" key={asset.id}>
                    <input
                      checked={draft.approvedAssetIds.includes(asset.id)}
                      onChange={() => toggleAsset(asset.id)}
                      type="checkbox"
                    />
                    {urls[asset.id] ? (
                      <img alt="" src={urls[asset.id]} />
                    ) : (
                      <span>Loading image</span>
                    )}
                    <span>
                      {asset.label || 'Captured image'}
                      <ImageFileType contentType={asset.contentType} path={asset.storagePath} />
                    </span>
                  </label>
                ))}
              </fieldset>
            </details>
          ) : null}
          {colourSuggestions.primary ? (
            <section className="brand-kit__evidence" aria-labelledby="brand-evidence-title">
              <div>
                <Eyebrow>Automatic evidence</Eyebrow>
                <h3 id="brand-evidence-title">Suggested brand colours</h3>
              </div>
              <div className="brand-kit__evidence-colours">
                {[
                  { label: 'Primary', suggestion: colourSuggestions.primary },
                  { label: 'Accent', suggestion: colourSuggestions.accent },
                ].map(({ label, suggestion }) =>
                  suggestion ? (
                    <div key={label}>
                      <span
                        aria-hidden="true"
                        className="brand-kit__colour-swatch"
                        style={{ background: suggestion.colour }}
                      />
                      <strong>{label}</strong>
                      <code>{suggestion.colour}</code>
                      <small>{brandColourEvidenceSummary(suggestion.evidence)}</small>
                    </div>
                  ) : null,
                )}
              </div>
              <p>
                These are private suggestions from captured logo and interface evidence. They are
                not approved brand facts.
              </p>
              <Button onClick={applySuggestedColours} type="button" variant="secondary">
                <Sparkles aria-hidden="true" size={15} />
                Use suggested colours
              </Button>
            </section>
          ) : null}
          <div className="brand-kit__palette" aria-label="Reviewed brand colours">
            {(['primary', 'accent'] as const).map((role) => (
              <label key={role}>
                {role}
                <span className="brand-kit__colour-input">
                  <input
                    aria-label={`${role} colour`}
                    onChange={(event) =>
                      updateDraft({
                        ...draftRef.current,
                        palette: {
                          ...draftRef.current.palette,
                          [role]: event.target.value.trim(),
                        },
                      })
                    }
                    placeholder="#112233"
                    spellCheck="false"
                    value={draft.palette[role] ?? ''}
                  />
                  <span
                    aria-hidden="true"
                    className="brand-kit__colour-swatch"
                    style={
                      isHexColour(draft.palette[role])
                        ? ({ background: draft.palette[role] } as CSSProperties)
                        : undefined
                    }
                  />
                </span>
              </label>
            ))}
          </div>
          <label className="brand-kit__notes">
            Brand review notes
            <textarea
              onChange={(event) => updateDraft({ ...draftRef.current, notes: event.target.value })}
              placeholder="Record what this logo and palette are verified to represent."
              value={draft.notes}
            />
          </label>
          <div className="brief-panel__actions">
            <Button
              disabled={saving}
              onClick={() => void save(false)}
              type="button"
              variant="secondary"
            >
              <Save aria-hidden="true" size={16} />
              {saving ? 'Saving' : 'Save Brand Kit'}
            </Button>
            <Button
              disabled={saving || !draft.primaryLogoAssetId}
              onClick={() => void save(true)}
              type="button"
            >
              <Check aria-hidden="true" size={16} /> Approve Brand Kit
            </Button>
          </div>
          {autosaving ? (
            <p className="form-message form-message--success" role="status">
              Saving Brand Kit draft
            </p>
          ) : null}
        </>
      )}
      {message ? (
        <p
          className={
            message.endsWith('.') && !message.includes('could not')
              ? 'form-message form-message--success'
              : 'form-message form-message--error'
          }
          role="status"
        >
          {message}
        </p>
      ) : null}
      {loadError ? <p className="form-message form-message--error">{loadError}</p> : null}
    </Card>
  );
}

function BriefAssetChoices({
  assets,
  selectedAssetIds,
  disabled,
  onToggle,
}: {
  assets: ResearchArtifact[];
  selectedAssetIds: string[];
  disabled: boolean;
  onToggle: (assetId: string) => void;
}) {
  const { urls, loadError } = usePrivateArtifactUrls(
    assets,
    'Private asset previews could not be loaded. Refresh and check storage access.',
  );

  return (
    <>
      <details className="asset-selection-disclosure">
        <summary>
          Browse {assets.length} visual asset{assets.length === 1 ? '' : 's'} (
          {selectedAssetIds.length} selected)
        </summary>
        <fieldset className="brief-assets" disabled={disabled}>
          <legend className="sr-only">Approved visual source assets</legend>
          {assets.map((asset) => (
            <label className="brief-source-option brief-source-option--asset" key={asset.id}>
              <input
                checked={selectedAssetIds.includes(asset.id)}
                onChange={() => onToggle(asset.id)}
                type="checkbox"
              />
              {urls[asset.id] ? (
                <img alt="" className="brief-source-option__preview" src={urls[asset.id]} />
              ) : (
                <span className="brief-source-option__preview" aria-hidden="true">
                  Loading image
                </span>
              )}
              <span className="brief-source-option__content">
                <strong>
                  {asset.metadata.assetType ? String(asset.metadata.assetType) : 'Image'}
                </strong>
                <ImageFileType contentType={asset.contentType} path={asset.storagePath} />
                <small>{asset.label || 'Captured visual asset'}</small>
              </span>
            </label>
          ))}
        </fieldset>
      </details>
      {loadError ? <p className="form-message form-message--error">{loadError}</p> : null}
    </>
  );
}

function BriefPanel({
  workspace,
  onCreate,
  onRefreshArchitecture,
  onUpdate,
  onApprove,
}: {
  workspace: ProspectWorkspace;
  onCreate: () => Promise<void>;
  onRefreshArchitecture: (brief: RedesignBrief) => Promise<void>;
  onUpdate: (
    brief: RedesignBrief,
    patch: Pick<RedesignBrief, 'sourceSelections' | 'draft'>,
  ) => Promise<void>;
  onApprove: (brief: RedesignBrief) => Promise<void>;
}) {
  const packet = workspace.researchPacket;
  const brief = workspace.redesignBrief;
  const assets = useMemo(
    () => workspace.artifacts.filter((artifact) => artifact.kind === 'asset'),
    [workspace.artifacts],
  );
  const capturedAssetIds = useMemo(() => assets.map((asset) => asset.id), [assets]);
  const [sourceSelections, setSourceSelections] = useState<BriefSourceSelections>(
    normaliseBriefSourceSelections(brief?.sourceSelections),
  );
  const [draft, setDraft] = useState<RedesignBriefDraft>(normaliseBriefDraft(brief?.draft));
  const [isCreating, setIsCreating] = useState(false);
  const [isRefreshingArchitecture, setIsRefreshingArchitecture] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [message, setMessage] = useState('');
  const hasCapabilityInventory = Array.isArray(brief?.draft.capabilityInventory);
  const unresolvedCapabilities = (draft.capabilityInventory ?? []).filter(
    (capability) => capability.decision === 'needs_review',
  );
  const capturedCapabilities = packet ? detectCapabilities(packet, workspace.capturedPages) : [];
  const guidedAssets = workspace.artifacts.filter(
    (artifact) =>
      artifact.kind === 'asset' && draft.assetGuidance.some((item) => item.assetId === artifact.id),
  );
  const guidedAssetsById = new Map(guidedAssets.map((asset) => [asset.id, asset]));
  const { urls: guidedAssetUrls } = usePrivateArtifactUrls(
    guidedAssets,
    'Approved asset previews could not be loaded. Refresh and check storage access.',
  );

  useEffect(() => {
    if (!brief) return;
    const saved = normaliseBriefSourceSelections(brief.sourceSelections);
    if (brief.status !== 'draft') {
      setSourceSelections(saved);
      setDraft(normaliseBriefDraft(brief.draft));
      return;
    }
    const knownAutoSelections = new Set(saved.autoSelectedAssetIds);
    const newlyCapturedAssetIds = capturedAssetIds.filter(
      (assetId) => !knownAutoSelections.has(assetId),
    );
    setSourceSelections({
      ...saved,
      assetIds: [...new Set([...saved.assetIds, ...newlyCapturedAssetIds])],
      autoSelectedAssetIds: [...new Set([...saved.autoSelectedAssetIds, ...capturedAssetIds])],
    });
    setDraft(normaliseBriefDraft(brief.draft));
  }, [brief?.id, brief?.updatedAt, capturedAssetIds]);

  async function createBrief() {
    setIsCreating(true);
    setMessage('');
    try {
      await onCreate();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'The redesign brief could not be created.',
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function refreshArchitecture() {
    if (!brief) return;
    setIsRefreshingArchitecture(true);
    setMessage('');
    try {
      await onRefreshArchitecture(brief);
      setMessage(
        'Architecture regenerated from the selected captured pages. Review the updated navigation groups and page plans before approval.',
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'The proposed architecture could not be regenerated.',
      );
    } finally {
      setIsRefreshingArchitecture(false);
    }
  }

  function toggleSelection(key: 'pageUrls' | 'assetIds', value: string) {
    setSourceSelections((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((item) => item !== value)
        : [...current[key], value],
    }));
  }

  function setCapabilityDecision(id: string, decision: CapabilityDecision) {
    setDraft((current) => ({
      ...current,
      capabilityInventory: (current.capabilityInventory ?? []).map((capability) =>
        capability.id === id ? { ...capability, decision } : capability,
      ),
    }));
  }

  async function saveBrief() {
    if (!brief) return;
    setIsSaving(true);
    setMessage('');
    try {
      await onUpdate(brief, { sourceSelections, draft });
      setMessage('Brief saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The brief could not be saved.');
    } finally {
      setIsSaving(false);
    }
  }

  async function approveBrief() {
    if (!brief) return;
    if (!hasCapabilityInventory) {
      setMessage('Generate the capability inventory from this saved capture before approving.');
      return;
    }
    if (unresolvedCapabilities.length) {
      setMessage(
        `Review ${unresolvedCapabilities.length} detected ${unresolvedCapabilities.length === 1 ? 'capability' : 'capabilities'} before approving the brief.`,
      );
      return;
    }
    setIsApproving(true);
    setMessage('');
    const pendingBrief = { ...brief, sourceSelections, draft };
    try {
      await onUpdate(brief, { sourceSelections, draft });
      await onApprove(pendingBrief);
      setMessage('Brief approved. The redesign builder can now use this strategy.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The brief could not be approved.');
    } finally {
      setIsApproving(false);
    }
  }

  if (!packet) {
    return (
      <Card className="workspace-panel">
        <Eyebrow>Redesign brief</Eyebrow>
        <h2>Research Packet required</h2>
        <EmptyState
          detail="Complete a private website capture first. The brief is grounded in captured structure, content, verified business context, and selected original assets."
          icon={FileText}
          title="No Research Packet yet"
        />
      </Card>
    );
  }

  if (!brief) {
    return (
      <Card className="workspace-panel brief-empty-state">
        <Eyebrow>Strategy handoff</Eyebrow>
        <h2>Turn research into a redesign brief</h2>
        <p className="muted-copy">
          Create a private draft from this Research Packet. It preserves the source capture and
          holds your visual selections, uncertainties, sitemap, and page plan before build work.
        </p>
        {capturedCapabilities.length ? (
          <section aria-labelledby="captured-capabilities-title" className="brief-capabilities">
            <div>
              <Eyebrow>Capability scope</Eyebrow>
              <h3 id="captured-capabilities-title">
                {capturedCapabilities.length} detected capability{' '}
                {capturedCapabilities.length === 1 ? 'needs' : 'need'} a decision
              </h3>
              <p className="muted-copy">
                These candidates were generated automatically when the saved website capture
                completed. Creating the brief lets you include or exclude each one.
              </p>
            </div>
            <ul className="brief-capabilities__preview">
              {capturedCapabilities.map((capability) => (
                <li key={capability.id}>
                  <strong>{capability.title}</strong>
                  <span>{capability.description}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <Button disabled={isCreating} onClick={() => void createBrief()} type="button">
          <FileText aria-hidden="true" size={16} />
          {isCreating ? 'Creating brief' : 'Create redesign brief'}
        </Button>
        {message ? (
          <p className="form-message form-message--error" role="alert">
            {message}
          </p>
        ) : null}
      </Card>
    );
  }

  const editable = brief.status === 'draft';
  const sourceChanged =
    brief.status === 'approved' && !manifestSourceMatchesBrief(workspace, brief);

  return (
    <Card className="workspace-panel brief-panel">
      <div className="brief-panel__header">
        <div>
          <Eyebrow>Strategy handoff</Eyebrow>
          <h2>Redesign brief</h2>
          <p className="muted-copy">
            This is a private, source-bound instruction set for the future builder. It is not a
            client-facing report and does not create new business claims.
          </p>
        </div>
        <div className="brief-panel__actions">
          <StatusBadge tone={briefStatusTone(brief.status)}>
            {briefStatusLabel(brief.status)}
          </StatusBadge>
          {editable ? (
            <>
              {!hasCapabilityInventory ? (
                <Button
                  disabled={isCreating}
                  onClick={() => void createBrief()}
                  type="button"
                  variant="secondary"
                >
                  <ListChecks aria-hidden="true" size={16} />
                  {isCreating ? 'Reading saved evidence' : 'Generate capability inventory'}
                </Button>
              ) : null}
              <Button
                disabled={isSaving || isApproving || isRefreshingArchitecture}
                onClick={() => void saveBrief()}
                type="button"
                variant="secondary"
              >
                <Save aria-hidden="true" size={16} />
                {isSaving ? 'Saving brief' : 'Save brief'}
              </Button>
              <Button
                disabled={isSaving || isApproving || isRefreshingArchitecture}
                onClick={() => void refreshArchitecture()}
                type="button"
                variant="secondary"
              >
                <RotateCcw aria-hidden="true" size={16} />
                {isRefreshingArchitecture ? 'Regenerating architecture' : 'Regenerate architecture'}
              </Button>
              <Button
                disabled={
                  isSaving ||
                  isApproving ||
                  isRefreshingArchitecture ||
                  !hasCapabilityInventory ||
                  Boolean(unresolvedCapabilities.length)
                }
                onClick={() => void approveBrief()}
                type="button"
              >
                <Check aria-hidden="true" size={16} />
                {isApproving ? 'Approving brief' : 'Approve brief'}
              </Button>
            </>
          ) : null}
          {!editable && !hasCapabilityInventory ? (
            <Button
              disabled={isCreating}
              onClick={() => void createBrief()}
              type="button"
              variant="secondary"
            >
              <ListChecks aria-hidden="true" size={16} />
              {isCreating ? 'Reading saved evidence' : 'Create capability review version'}
            </Button>
          ) : null}
          {sourceChanged ? (
            <Button disabled={isCreating} onClick={() => void createBrief()} type="button">
              <FileText aria-hidden="true" size={16} />
              {isCreating ? 'Creating brief' : 'Create new brief version'}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="brief-panel__source-summary">
        <span>{sourceSelections.pageUrls.length} page sources selected</span>
        <span>{sourceSelections.assetIds.length} visual assets selected</span>
        <span>
          {hasCapabilityInventory
            ? `${unresolvedCapabilities.length} capability decisions pending`
            : 'Capability inventory not generated'}
        </span>
        <span>{sourceSelections.uncertainties.length} uncertainties flagged</span>
      </div>

      {draft.assetGuidance.length ? (
        <section className="brief-asset-guidance" aria-labelledby="brief-asset-guidance-title">
          <div>
            <Eyebrow>Approved asset context</Eyebrow>
            <h3 id="brief-asset-guidance-title">Visual guidance for the builder</h3>
            <p className="muted-copy">
              These are the specific captured images approved for use. Each card states what it is
              and how it may be used.
            </p>
          </div>
          <details className="brief-asset-guidance__disclosure">
            <summary>
              View {draft.assetGuidance.length} approved visual guide
              {draft.assetGuidance.length === 1 ? '' : 's'}
            </summary>
            <ul>
              {draft.assetGuidance.map((guidance) => {
                const asset = guidedAssetsById.get(guidance.assetId);
                const pageUrl = asset ? recordValue(asset.metadata, 'pageUrl') : '';
                return (
                  <li key={guidance.assetId}>
                    {asset && guidedAssetUrls[asset.id] ? (
                      <img alt="" src={guidedAssetUrls[asset.id]} />
                    ) : (
                      <span className="brief-asset-guidance__preview">Preview unavailable</span>
                    )}
                    <span className="brief-asset-guidance__content">
                      <strong>{guidance.role.replaceAll('_', ' ')}</strong>
                      <b>{asset?.label || 'Approved captured image'}</b>
                      {asset ? (
                        <ImageFileType contentType={asset.contentType} path={asset.storagePath} />
                      ) : null}
                      {pageUrl ? (
                        <small>Captured from {sourceUrlLabel(pageUrl, 'source page')}</small>
                      ) : null}
                      <span>{guidance.observedDescription}</span>
                      <small>{guidance.safeReuseNote}</small>
                    </span>
                  </li>
                );
              })}
            </ul>
          </details>
        </section>
      ) : null}

      <section className="brief-generated-context" aria-labelledby="brief-generated-context-title">
        <Eyebrow>Generated context</Eyebrow>
        <h3 id="brief-generated-context-title">Builder boundaries and unresolved evidence</h3>
        <p>{draft.strategy}</p>
        <div>
          <h4>Open questions</h4>
          {draft.openQuestions.length ? (
            <ul>
              {draft.openQuestions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          ) : (
            <p className="muted-copy">No generated open questions.</p>
          )}
        </div>
        <div>
          <h4>Uncertainties kept out of the build</h4>
          {sourceSelections.uncertainties.length ? (
            <ul>
              {sourceSelections.uncertainties.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="muted-copy">No uncertainties are currently flagged.</p>
          )}
        </div>
      </section>

      {hasCapabilityInventory ? (
        <section aria-labelledby="brief-capabilities-title" className="brief-capabilities">
          <div>
            <Eyebrow>Capability scope</Eyebrow>
            <h3 id="brief-capabilities-title">Detected website capabilities</h3>
            <p className="muted-copy">
              These are evidence-led candidates from the saved capture, not claims about hidden
              systems. Decide what the replacement should include before the builder starts.
            </p>
          </div>
          {(draft.capabilityInventory ?? []).length ? (
            <div className="brief-capabilities__list">
              {(draft.capabilityInventory ?? []).map((capability) => (
                <article className="brief-capability" key={capability.id}>
                  <div className="brief-capability__header">
                    <div>
                      <h4>{capability.title}</h4>
                      <p>{capability.description}</p>
                    </div>
                    <StatusBadge
                      tone={
                        capability.decision === 'include'
                          ? 'success'
                          : capability.decision === 'exclude'
                            ? 'neutral'
                            : 'warning'
                      }
                    >
                      {capability.decision.replaceAll('_', ' ')}
                    </StatusBadge>
                  </div>
                  <dl className="brief-capability__details">
                    <div>
                      <dt>Proposed delivery</dt>
                      <dd>{capability.delivery.replaceAll('_', ' ')}</dd>
                    </div>
                    <div>
                      <dt>Evidence confidence</dt>
                      <dd>{capability.confidence}</dd>
                    </div>
                  </dl>
                  <p className="brief-capability__question">{capability.decisionQuestion}</p>
                  <ul className="brief-capability__evidence">
                    {capability.evidence.map((item) => (
                      <li key={`${capability.id}-${item.sourceUrl}`}>
                        <strong>{sourceUrlLabel(item.sourceUrl, 'Captured page')}</strong>
                        <span>{item.detail}</span>
                      </li>
                    ))}
                  </ul>
                  <label className="brief-capability__decision">
                    <span>Replacement decision</span>
                    <select
                      disabled={!editable}
                      onChange={(event) =>
                        setCapabilityDecision(
                          capability.id,
                          event.target.value as CapabilityDecision,
                        )
                      }
                      value={capability.decision}
                    >
                      <option value="needs_review">Needs review</option>
                      <option value="include">Include in replacement</option>
                      <option value="exclude">Do not include</option>
                    </select>
                  </label>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              detail="No dynamic or workflow capability signals were found in the saved capture. Selected pages remain part of the replacement scope."
              icon={ListChecks}
              title="No additional capability decisions"
            />
          )}
        </section>
      ) : null}

      <section aria-labelledby="brief-pages-title" className="brief-sources">
        <div>
          <Eyebrow>Source selection</Eyebrow>
          <h3 id="brief-pages-title">Captured pages to use</h3>
          <p className="muted-copy">Only selected sources should guide the future builder.</p>
        </div>
        <details className="asset-selection-disclosure">
          <summary>
            Browse {workspace.capturedPages.length} captured page
            {workspace.capturedPages.length === 1 ? '' : 's'} ({sourceSelections.pageUrls.length}{' '}
            selected)
          </summary>
          <fieldset disabled={!editable}>
            <legend className="sr-only">Captured pages to include</legend>
            {workspace.capturedPages.map((page) => (
              <label className="brief-source-option" key={page.id}>
                <input
                  checked={sourceSelections.pageUrls.includes(page.url)}
                  onChange={() => toggleSelection('pageUrls', page.url)}
                  type="checkbox"
                />
                <span>
                  <strong>{page.title || sourceUrlLabel(page.url, 'Captured page')}</strong>
                  <small>{sourceUrlLabel(page.url, '/')}</small>
                </span>
              </label>
            ))}
          </fieldset>
        </details>
      </section>

      <section aria-labelledby="brief-assets-title" className="brief-sources">
        <div>
          <Eyebrow>Visual selection</Eyebrow>
          <h3 id="brief-assets-title">Captured source assets</h3>
          <p className="muted-copy">
            Selected assets provide source context. Only approved asset guidance may direct reuse.
          </p>
        </div>
        {assets.length ? (
          <BriefAssetChoices
            assets={assets}
            disabled={!editable}
            onToggle={(assetId) => toggleSelection('assetIds', assetId)}
            selectedAssetIds={sourceSelections.assetIds}
          />
        ) : (
          <p className="muted-copy">No visual assets were available in this capture.</p>
        )}
      </section>

      <section aria-labelledby="brief-sitemap-title" className="brief-architecture">
        <Eyebrow>Proposed architecture</Eyebrow>
        <h3 id="brief-sitemap-title">Sitemap and page plan</h3>
        <p className="muted-copy">
          The sitemap models the primary information hierarchy. The page plan preserves the full
          selected-page scope, including articles, tools, and utility routes that do not belong in
          primary navigation.
        </p>
        <div className="brief-architecture__grid">
          <div>
            <h4>Suggested sitemap</h4>
            <ol>
              {draft.proposedSitemap.map((entry) => (
                <li key={`${entry.label}-${entry.sourceUrl}`}>
                  <strong>{entry.label}</strong>
                  <span>{entry.purpose}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h4>Page structures</h4>
            <details className="brief-architecture__plans">
              <summary>
                View {draft.pagePlans.length} selected page plan
                {draft.pagePlans.length === 1 ? '' : 's'}
              </summary>
              <ul>
                {draft.pagePlans.map((plan) => (
                  <li key={`${plan.title}-${plan.sourceUrl}`}>
                    <strong>{plan.title}</strong>
                    <span>{plan.structure.join(' · ')}</span>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </div>
      </section>

      <section aria-labelledby="brief-assumptions-title" className="brief-assumptions">
        <Eyebrow>Boundaries</Eyebrow>
        <h3 id="brief-assumptions-title">Builder constraints</h3>
        <ul>
          {draft.assumptions.map((assumption) => (
            <li key={assumption}>{assumption}</li>
          ))}
        </ul>
      </section>
      {message ? (
        <p className="form-message" role="status">
          {message}
        </p>
      ) : null}
    </Card>
  );
}

function builderRunTone(status: BuilderRun['status']) {
  if (status === 'ready') return 'success' as const;
  if (status === 'failed') return 'danger' as const;
  if (
    status === 'review_required' ||
    status === 'cancelled' ||
    status === 'queued' ||
    status === 'running' ||
    status === 'paused'
  )
    return 'warning' as const;
  return 'neutral' as const;
}

function builderRunLabel(status: BuilderRun['status']) {
  if (status === 'queued') return 'Preview queued';
  if (status === 'running') return 'Building preview';
  if (status === 'paused') return 'Automatic retry queued';
  if (status === 'ready') return 'Preview ready';
  if (status === 'review_required') return 'Quality review required';
  if (status === 'failed') return 'Build failed';
  return 'Build cancelled';
}

function builderRunModeLabel(mode: BuilderRunMode) {
  if (mode === 'homepage_test') return 'Homepage test';
  if (mode === 'page_test') return 'Page test';
  if (mode === 'site_test') return 'Multi-page feature test';
  return 'Complete prospect build';
}

function builderProgressPhaseLabel(phase: string) {
  const labels: Record<string, string> = {
    queued: 'Waiting for a builder worker',
    preparing_workspace: 'Preparing the private workspace',
    building_website: 'Codex is building the website',
    building_output: 'Compiling the private preview',
    quality_checks: 'Running browser quality checks',
    capturing_preview: 'Capturing responsive previews',
    saving_outputs: 'Saving private build outputs',
    retry_wait: 'Waiting to retry',
  };
  return labels[phase] ?? phase.replaceAll('_', ' ');
}

function testBuildChangeSummary(run: BuilderRun, previousRun?: BuilderRun) {
  if (!previousRun)
    return 'Baseline test. This is the first completed agent contract in this series.';

  const changes: string[] = [];
  if (run.templateVersion !== previousRun.templateVersion) {
    changes.push(`Builder contract ${previousRun.templateVersion} → ${run.templateVersion}`);
  }
  if (run.buildInstruction !== previousRun.buildInstruction) {
    changes.push(
      run.buildInstruction
        ? 'Agent refinement directions updated'
        : 'Agent refinement directions removed',
    );
  }
  if (
    run.buildMode !== previousRun.buildMode ||
    run.targetSourceUrl !== previousRun.targetSourceUrl ||
    JSON.stringify(run.targetSourceUrls ?? []) !==
      JSON.stringify(previousRun.targetSourceUrls ?? [])
  ) {
    changes.push(`Test target changed to ${builderRunModeLabel(run.buildMode).toLowerCase()}`);
  }

  return changes.length
    ? changes.join(' · ')
    : `No agent-contract change from the previous test (${run.templateVersion}).`;
}

function buildManifestSelectedPages(manifest?: BuildManifest): BuildManifestPage[] {
  return Array.isArray(manifest?.data.selectedPages)
    ? manifest.data.selectedPages.filter(
        (page): page is BuildManifestPage => Boolean(page) && typeof page === 'object',
      )
    : [];
}

function buildManifestPageOutputPath(page: BuildManifestPage) {
  if (typeof page.outputPath === 'string' && page.outputPath.trim()) {
    return page.outputPath.replace(/^\/+/, '');
  }
  let publicPath =
    typeof page.publicPath === 'string' && page.publicPath.trim()
      ? page.publicPath
      : typeof page.routePath === 'string' && page.routePath.trim()
        ? page.routePath
        : '/';
  if (publicPath === '/' && typeof page.url === 'string') {
    try {
      publicPath = new URL(page.url).pathname;
    } catch {
      publicPath = '/';
    }
  }
  const normalized = publicPath.replace(/^\/+|\/+$/g, '');
  return normalized ? `${normalized}/index.html` : 'index.html';
}

function builderRunPageCount(workspace: ProspectWorkspace, run: BuilderRun) {
  if (run.buildMode === 'homepage_test') return 1;
  if (run.buildMode === 'page_test') return run.targetSourceUrls?.length || 1;
  const manifest = workspace.buildManifests.find(
    (candidate) => candidate.id === run.buildManifestId,
  );
  return buildManifestSelectedPages(manifest ?? workspace.buildManifest).length;
}

type BuilderRunPageSummary = {
  name: string;
  path: string;
};

function isVisitorPageOutput(path: string) {
  const normalized = path.replace(/^\/+/, '');
  return (
    /\.html$/i.test(normalized) && !/(?:^|\/)(?:404|_not-found)(?:\/|\.html$)/i.test(normalized)
  );
}

function builderRunPageSummaries(
  workspace: ProspectWorkspace,
  run: BuilderRun,
  artifacts: BuilderArtifact[],
): BuilderRunPageSummary[] {
  const manifest =
    workspace.buildManifests.find((candidate) => candidate.id === run.buildManifestId) ??
    workspace.buildManifest;
  const plannedPages = buildManifestSelectedPages(manifest);
  const plannedByOutput = new Map(
    plannedPages.map((page) => [buildManifestPageOutputPath(page), page]),
  );
  const actualOutputs = builderOutputExplorerEntries(artifacts)
    .map((entry) => entry.path.replace(/^\/+/, ''))
    .filter(
      (path) => isVisitorPageOutput(path) && (!plannedByOutput.size || plannedByOutput.has(path)),
    );
  const targetedPageOutputs = plannedPages
    .filter((page) =>
      (run.targetSourceUrls?.length
        ? run.targetSourceUrls
        : run.targetSourceUrl
          ? [run.targetSourceUrl]
          : []
      ).includes(page.url),
    )
    .map(buildManifestPageOutputPath);
  const outputPaths = actualOutputs.length
    ? actualOutputs
    : run.buildMode === 'homepage_test'
      ? ['index.html']
      : run.buildMode === 'page_test'
        ? targetedPageOutputs.length
          ? targetedPageOutputs
          : plannedPages.slice(0, 1).map(buildManifestPageOutputPath)
        : plannedPages.map(buildManifestPageOutputPath);
  return [...new Set(outputPaths)].map((outputPath) => {
    const planned = plannedByOutput.get(outputPath);
    const publicPath =
      planned?.publicPath ??
      (outputPath === 'index.html' ? '/' : `/${outputPath.replace(/\/index\.html$/i, '')}/`);
    const fallbackName =
      publicPath === '/'
        ? 'Home'
        : publicPath
            .split('/')
            .filter(Boolean)
            .at(-1)
            ?.replaceAll('-', ' ')
            .replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Page';
    return { name: planned?.title || fallbackName, path: publicPath };
  });
}

function BuilderRunPageDisclosure({
  workspace,
  run,
  artifacts,
  state,
  onLoad,
}: {
  workspace: ProspectWorkspace;
  run: BuilderRun;
  artifacts: BuilderArtifact[];
  state?: BuilderRunEvidenceState;
  onLoad: () => void;
}) {
  const [open, setOpen] = useState(false);
  const disclosureId = useId();
  const pages = builderRunPageSummaries(workspace, run, artifacts);
  const count = artifacts.length ? pages.length : builderRunPageCount(workspace, run);
  function toggle() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && !artifacts.length && !state) onLoad();
  }
  return (
    <div className="builder-run-pages">
      <Button
        aria-controls={disclosureId}
        aria-expanded={open}
        onClick={toggle}
        type="button"
        variant="quiet"
      >
        <FileText aria-hidden="true" size={16} />
        {count} {count === 1 ? 'page' : 'pages'} built
        <ChevronDown aria-hidden="true" className={open ? 'is-open' : undefined} size={16} />
      </Button>
      {open ? (
        <div className="builder-run-pages__content" id={disclosureId}>
          {state?.status === 'loading' && !artifacts.length ? (
            <small role="status">Loading page names…</small>
          ) : state?.status === 'error' && !artifacts.length ? (
            <small role="alert">{state.message}</small>
          ) : (
            <ul aria-label="Built pages">
              {pages.map((page) => (
                <li key={page.path}>
                  <strong>{page.name}</strong>
                  <code>{page.path}</code>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function buildProgressMilestones(run: BuilderRun, screenshots: BuilderArtifact[]) {
  if (!run.totalItems) return [];

  const initialMilestones = [
    'Prepare private workspace',
    'Stage approved inputs',
    'Build website with Codex',
    'Run browser quality checks',
  ];
  if (run.totalItems <= initialMilestones.length) {
    return initialMilestones.slice(0, run.totalItems);
  }

  const captureCount = Math.max(0, run.totalItems - initialMilestones.length - 1);
  const captureMilestones = Array.from({ length: captureCount }, (_, index) => {
    const screenshot = screenshots[index];
    return screenshot
      ? `Capture ${screenshot.label.toLowerCase()}`
      : `Capture responsive preview ${index + 1}`;
  });

  return [...initialMilestones, ...captureMilestones, 'Save outputs and finalise preview'];
}

function builderEventContext(event: BuilderEvent) {
  const context = [`Recorded as step ${event.sequence}.`];
  const page = typeof event.metadata.page === 'string' ? event.metadata.page : undefined;
  const viewport =
    typeof event.metadata.viewport === 'string' ? event.metadata.viewport : undefined;
  const stage = typeof event.metadata.stage === 'string' ? event.metadata.stage : undefined;
  const code = typeof event.metadata.code === 'string' ? event.metadata.code : undefined;

  if (page) context.push(`Page: ${page}`);
  if (viewport) context.push(`Viewport: ${viewport.replaceAll('_', ' ')}`);
  if (stage) context.push(`Worker stage: ${stage.replaceAll('_', ' ')}`);
  if (code) context.push(`Failure code: ${code.replaceAll('_', ' ')}`);

  return context;
}

function isCodexStreamEvent(event: BuilderEvent) {
  return event.metadata.stream === 'codex';
}

function diagnosticMetadata(event: BuilderEvent, key: string) {
  const value = event.metadata[key];
  return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
}

function diagnosticTone(event: BuilderEvent) {
  const status = diagnosticMetadata(event, 'status');
  if (status === 'failed') return 'danger' as const;
  if (status === 'warning') return 'warning' as const;
  return 'neutral' as const;
}

function BuilderActivityWaiting({ detail, label }: { detail: string; label: string }) {
  return (
    <div className="builder-activity-waiting" role="status">
      <Bot aria-hidden="true" className="builder-activity-waiting__icon" size={20} />
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <span aria-hidden="true" className="builder-activity-waiting__dots">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

function formatBuildElapsedTime(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  if (hours) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function builderRunElapsedTime(run: BuilderRun, now: number) {
  const startedAt = Date.parse(run.startedAt ?? '');
  if (!Number.isFinite(startedAt)) return undefined;
  const active = run.status === 'queued' || run.status === 'running';
  const completedAt = Date.parse(run.completedAt ?? run.updatedAt);
  const finishedAt = Number.isFinite(completedAt) ? completedAt : startedAt;
  return Math.max(0, (active ? now : (finishedAt ?? startedAt)) - startedAt);
}

function useBuildElapsedNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    if (!active) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [active]);

  return now;
}

function buildUsageSummary(records: AiUsageRecord[], builderRunId: string) {
  const buildRecords = records.filter(
    (record) => record.builderRunId === builderRunId && record.source === 'codex_build',
  );
  const pricedRecords = buildRecords.filter((record) => typeof record.costUsd === 'number');

  return {
    operationCount: buildRecords.length,
    totalTokens: buildRecords.reduce((total, record) => total + record.totalTokens, 0),
    recordedCost: pricedRecords.reduce((total, record) => total + (record.costUsd ?? 0), 0),
    unpricedCount: buildRecords.length - pricedRecords.length,
  };
}

function useAnimatedBuildUsageValue(value: number, active: boolean) {
  const initialValue = active ? 0 : value;
  const [displayedValue, setDisplayedValue] = useState(initialValue);
  const [isAnimating, setIsAnimating] = useState(false);
  const displayedValueRef = useRef(initialValue);

  useEffect(() => {
    const startValue = displayedValueRef.current;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!active || reducedMotion || startValue === value) {
      displayedValueRef.current = value;
      setDisplayedValue(value);
      setIsAnimating(false);
      return;
    }

    const startedAt = performance.now();
    const duration = Math.min(900, Math.max(360, Math.abs(value - startValue) / 25));
    let frame = 0;
    setIsAnimating(true);
    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      const nextValue = startValue + (value - startValue) * eased;
      displayedValueRef.current = nextValue;
      setDisplayedValue(nextValue);
      if (progress < 1) {
        frame = window.requestAnimationFrame(animate);
      } else {
        displayedValueRef.current = value;
        setDisplayedValue(value);
        setIsAnimating(false);
      }
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [active, value]);

  return { displayedValue, isAnimating };
}

function AnimatedBuildUsageValue({
  active,
  format,
  value,
}: {
  active: boolean;
  format: (value: number) => string;
  value: number;
}) {
  const { displayedValue, isAnimating } = useAnimatedBuildUsageValue(value, active);
  return (
    <span className={`builder-run-usage__counter${isAnimating ? ' is-counting' : ''}`}>
      {format(displayedValue)}
    </span>
  );
}

function BuilderRunUsage({ records, run }: { records: AiUsageRecord[]; run: BuilderRun }) {
  const active = run.status === 'queued' || run.status === 'running';
  const elapsedNow = useBuildElapsedNow(active);
  const elapsed = builderRunElapsedTime(run, elapsedNow);
  const usage = buildUsageSummary(records, run.id);

  return (
    <dl className="builder-run-usage" aria-label="Build usage and time for this test">
      <div>
        <dt>{active ? 'Working time' : 'Recorded build time'}</dt>
        <dd>
          {elapsed === undefined
            ? active
              ? 'Waiting to start'
              : 'Not recorded'
            : formatBuildElapsedTime(elapsed)}
        </dd>
      </div>
      <div>
        <dt>Tokens used</dt>
        <dd>
          {usage.operationCount ? (
            <AnimatedBuildUsageValue
              active={active}
              format={(value) => formatTokens(Math.round(value))}
              value={usage.totalTokens}
            />
          ) : (
            'Pending'
          )}
        </dd>
      </div>
      <div>
        <dt>Recorded cost</dt>
        <dd>
          {usage.operationCount ? (
            usage.unpricedCount ? (
              usage.recordedCost > 0 ? (
                <>
                  <AnimatedBuildUsageValue
                    active={active}
                    format={formatUsd}
                    value={usage.recordedCost}
                  />{' '}
                  + {usage.unpricedCount} unpriced
                </>
              ) : (
                'Unpriced'
              )
            ) : (
              <AnimatedBuildUsageValue
                active={active}
                format={formatUsd}
                value={usage.recordedCost}
              />
            )
          ) : (
            'Pending'
          )}
        </dd>
      </div>
    </dl>
  );
}

function AgentPackageDetailsDialog({
  agentPackages,
  run,
}: {
  agentPackages: AgentPackage[];
  run: BuilderRun;
}) {
  const agentPackage = agentPackages.find(
    (candidate) =>
      candidate.id === run.agentPackageId ||
      (!run.agentPackageId && candidate.version === run.agentPackageVersion),
  );
  const basePackage = agentPackage?.basePackageId
    ? agentPackages.find((candidate) => candidate.id === agentPackage.basePackageId)
    : undefined;
  const packageVersion = agentPackage?.version ?? run.agentPackageVersion;
  const packageLabel = agentPackageVersionLabel(packageVersion);

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button aria-label={`Open package ${packageLabel} details for this test`} variant="inline">
          <PackageCheck aria-hidden="true" size={15} />
          {packageVersion === undefined ? 'Package details' : `Package ${packageLabel}`}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="confirmation-overlay" />
        <Dialog.Content
          aria-describedby={`agent-package-detail-description-${run.id}`}
          className="agent-package-detail-dialog"
        >
          <header className="agent-package-detail-dialog__header">
            <div>
              <Eyebrow>Immutable test package</Eyebrow>
              <Dialog.Title>
                {packageVersion === undefined
                  ? 'Legacy build package'
                  : `Build package ${packageLabel}`}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <IconButton label="Close package details" variant="quiet">
                <X aria-hidden="true" size={18} />
              </IconButton>
            </Dialog.Close>
          </header>
          <Dialog.Description
            className="muted-copy"
            id={`agent-package-detail-description-${run.id}`}
          >
            The package and foundation pinned to this exact test run. Package versions and manifest
            contract versions have separate release histories.
          </Dialog.Description>

          {agentPackage ? (
            <>
              <div className="agent-package-detail-dialog__summary">
                <StatusBadge
                  tone={
                    agentPackage.status === 'published' ||
                    agentPackage.status === 'production_ready'
                      ? 'success'
                      : agentPackage.status === 'superseded'
                        ? 'neutral'
                        : 'warning'
                  }
                >
                  {agentPackage.status.replaceAll('_', ' ')}
                </StatusBadge>
                <p>{agentPackage.summary}</p>
              </div>
              <dl className="agent-package-detail-grid">
                <div>
                  <dt>Package version</dt>
                  <dd>{agentPackageVersionLabel(agentPackage.version)}</dd>
                </div>
                <div>
                  <dt>Package ID</dt>
                  <dd>{agentPackage.id}</dd>
                </div>
                <div>
                  <dt>Based on</dt>
                  <dd>
                    {basePackage
                      ? `Package ${agentPackageVersionLabel(basePackage.version)}`
                      : 'Original lineage'}
                  </dd>
                </div>
                <div>
                  <dt>Builder contract</dt>
                  <dd>{agentPackage.builderContractVersion}</dd>
                </div>
                <div>
                  <dt>Builder foundation</dt>
                  <dd>{agentPackage.foundationVersion}</dd>
                </div>
                <div>
                  <dt>Run template</dt>
                  <dd>{run.templateVersion}</dd>
                </div>
                <div>
                  <dt>Capability assessment</dt>
                  <dd>{agentPackage.capabilityAssessment.replaceAll('_', ' ')}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{formatDateTime(agentPackage.createdAt)}</dd>
                </div>
                <div>
                  <dt>Approved</dt>
                  <dd>
                    {agentPackage.approvedAt
                      ? formatDateTime(agentPackage.approvedAt)
                      : 'Not recorded'}
                  </dd>
                </div>
                <div>
                  <dt>Published</dt>
                  <dd>
                    {agentPackage.publishedAt
                      ? formatDateTime(agentPackage.publishedAt)
                      : 'Not published'}
                  </dd>
                </div>
              </dl>

              <section className="agent-package-detail-dialog__section">
                <h3>Included behaviours</h3>
                {agentPackage.stagedBehaviourIds?.length ? (
                  <ul className="agent-package-detail-dialog__behaviours">
                    {agentPackage.stagedBehaviourIds.map((behaviourId) => (
                      <li key={behaviourId}>
                        <Check aria-hidden="true" size={15} />
                        <span>{agentBehaviourTitle(behaviourId)}</span>
                        <code>{behaviourId}</code>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted-copy">No staged behaviour identifiers were recorded.</p>
                )}
              </section>

              {agentPackage.capabilityProposal ? (
                <section className="agent-package-detail-dialog__section">
                  <h3>Capability proposal</h3>
                  <p>{agentPackage.capabilityProposal}</p>
                </section>
              ) : null}
              <section className="agent-package-detail-dialog__section">
                <h3>Contract addendum</h3>
                <pre>
                  {agentPackage.contractAddendum.trim() ||
                    'No package-specific contract addendum. The base builder contract applied unchanged.'}
                </pre>
              </section>
              <section className="agent-package-detail-dialog__section">
                <h3>Implementation guidance</h3>
                <pre>
                  {agentPackage.instructionsAddendum.trim() ||
                    'No package-specific implementation addendum. The base builder instructions applied unchanged.'}
                </pre>
              </section>
            </>
          ) : (
            <div className="agent-package-detail-dialog__missing">
              <CircleAlert aria-hidden="true" size={22} />
              <div>
                <strong>The package record is unavailable</strong>
                <p>
                  This run retained template <code>{run.templateVersion}</code>
                  {packageLabel ? ` and package version v${packageLabel}` : ''}, but its complete
                  package release record is not present in this workspace.
                </p>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function BuilderTimelineItem({ event }: { event: BuilderEvent }) {
  const expandable = event.kind !== 'activity';
  const tone = event.kind === 'error' ? 'danger' : event.kind === 'quality' ? 'success' : 'neutral';

  if (!expandable) {
    return (
      <div className="builder-timeline__activity">
        <StatusBadge tone="neutral">live update</StatusBadge>
        <span>{event.message}</span>
        <time dateTime={event.createdAt}>{formatDate(event.createdAt)}</time>
      </div>
    );
  }

  return (
    <details className="builder-timeline__step">
      <summary>
        <StatusBadge tone={tone}>{event.kind}</StatusBadge>
        <span className="builder-timeline__step-copy">
          <strong>{event.message}</strong>
          <small>Completed {formatDate(event.createdAt)}</small>
        </span>
      </summary>
      <div className="builder-timeline__context">
        <p>Step context</p>
        <ul>
          {builderEventContext(event).map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      </div>
    </details>
  );
}

function useNewBuilderActivityIds(events: BuilderEvent[], runId?: string) {
  const knownRunId = useRef<string>();
  const knownEventIds = useRef(new Set<string>());
  const [newEventIds, setNewEventIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (knownRunId.current !== runId) {
      knownRunId.current = runId;
      knownEventIds.current = new Set(events.map((event) => event.id));
      setNewEventIds(new Set());
      return;
    }

    const additions = events.filter((event) => !knownEventIds.current.has(event.id));
    if (!additions.length) return;
    additions.forEach((event) => knownEventIds.current.add(event.id));
    setNewEventIds((current) => new Set([...current, ...additions.map((event) => event.id)]));
  }, [events, runId]);

  return newEventIds;
}

function BuilderNewActivityItem({ children, isNew }: { children: ReactNode; isNew: boolean }) {
  const itemRef = useRef<HTMLLIElement>(null);
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false);

  useEffect(() => {
    const item = itemRef.current;
    if (!isNew || !item || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setHasEnteredViewport(true);
        observer.disconnect();
      },
      { threshold: 0.25 },
    );
    observer.observe(item);
    return () => observer.disconnect();
  }, [isNew]);

  return (
    <li
      className={`builder-new-activity${isNew ? ' is-new' : ''}${hasEnteredViewport ? ' is-shining' : ''}`}
      ref={itemRef}
    >
      {children}
    </li>
  );
}

function BuilderHistoryEntry({
  run,
  state,
  previousState,
  onLoad,
  onLoadPrevious,
  onViewWebsite,
}: {
  run: BuilderRun;
  state?: BuilderRunEvidenceState;
  previousState?: BuilderRunEvidenceState;
  onLoad: (builderRunId: string) => Promise<void>;
  onLoadPrevious?: () => void;
  onViewWebsite?: () => Promise<void>;
}) {
  const screenshots =
    state?.status === 'ready'
      ? state.evidence.artifacts.filter((artifact) => artifact.kind === 'screenshot')
      : [];
  const { urls, loadError } = usePrivateArtifactUrls(
    screenshots,
    'Private screenshots from this earlier build could not be loaded.',
  );

  return (
    <details
      className="builder-history__entry"
      onToggle={(event) => {
        if (event.currentTarget.open && (!state || state.status === 'error')) void onLoad(run.id);
      }}
    >
      <summary>
        <span>
          <strong>{builderRunModeLabel(run.buildMode)}</strong>
          <small>{formatDateTime(run.createdAt)}</small>
        </span>
        <StatusBadge tone={builderRunTone(run.status)}>{builderRunLabel(run.status)}</StatusBadge>
      </summary>
      {!state || state.status === 'loading' ? (
        <p className="muted-copy" role="status">
          Loading this private build&apos;s logs and captures…
        </p>
      ) : state.status === 'error' ? (
        <p className="form-message form-message--error" role="alert">
          {state.message}
        </p>
      ) : (
        <div className="builder-history__evidence">
          <p className="muted-copy">
            {state.evidence.events.length} log entries · {screenshots.length} responsive captures
          </p>
          <BuilderFileExplorerDialog
            artifacts={state.evidence.artifacts}
            label="Browse this build’s files"
            onViewWebsite={onViewWebsite}
          />
          {state.evidence.events.length ? (
            <ol className="builder-history__logs">
              {[...state.evidence.events].reverse().map((event) => (
                <li key={event.id}>
                  <strong>{event.kind}</strong>
                  <span>{event.message}</span>
                  <time dateTime={event.createdAt}>{formatDateTime(event.createdAt)}</time>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted-copy">No saved build logs are available for this test.</p>
          )}
          {run.buildMode !== 'full_site' ? (
            <TestDirectionResults
              artifacts={state.evidence.artifacts}
              onOpen={onLoadPrevious}
              previousArtifacts={
                previousState?.status === 'ready' ? previousState.evidence.artifacts : []
              }
              run={run}
            />
          ) : null}
          {screenshots.length ? (
            <div className="builder-screenshots__history" aria-label="Earlier build captures">
              {screenshots.map((screenshot) =>
                urls[screenshot.id] ? (
                  <ExpandableImage
                    alt={`${screenshot.label} of the earlier private preview`}
                    className="builder-screenshots__image"
                    key={screenshot.id}
                    label={screenshot.label}
                    src={urls[screenshot.id]}
                  >
                    <img alt="" src={urls[screenshot.id]} />
                    <span>{screenshot.label}</span>
                    <ImageFileType
                      contentType={screenshot.contentType}
                      path={screenshot.storagePath}
                    />
                  </ExpandableImage>
                ) : null,
              )}
              {loadError ? <p className="form-message form-message--error">{loadError}</p> : null}
            </div>
          ) : null}
        </div>
      )}
    </details>
  );
}

function BuilderRunPanel({
  workspace,
  buildKind,
  agentPackages = [],
  onRequestBuild,
  onResumeBuild,
  onCancelBuild,
  onDeleteBuild,
  onOpenPreview,
  onOpenUsageAnalysis,
  onLoadBuildEvidence,
  onMoveToAgentStudio,
  onRequestSiteTest,
  onStageBehaviours,
  onRequestProposal,
}: {
  workspace: ProspectWorkspace;
  buildKind: 'test' | 'prospect';
  agentPackages?: AgentPackage[];
  onRequestBuild: (
    mode: BuilderRunMode,
    targetSourceUrl?: string,
    buildInstruction?: string,
    agentPackageId?: string,
    sourceBuilderRunId?: string,
    targetSourceUrls?: string[],
  ) => Promise<void>;
  onResumeBuild?: (builderRunId: string) => Promise<void>;
  onCancelBuild: () => Promise<void>;
  onDeleteBuild: (businessId: string) => Promise<void>;
  onOpenPreview: (builderRunId: string, mode?: BuilderPreviewMode) => Promise<string>;
  onOpenUsageAnalysis?: (builderRunId: string) => void;
  onLoadBuildEvidence: (builderRunId: string) => Promise<BuilderRunEvidence>;
  onMoveToAgentStudio?: (builderRunId: string) => Promise<void>;
  onRequestSiteTest?: (
    sourceBuilderRunId: string,
    buildInstruction: string,
    agentPackageId: string,
    featureId: string,
  ) => Promise<void>;
  onStageBehaviours?: (packageId: string, behaviourIds: string[]) => Promise<void>;
  onRequestProposal?: (basePackageId: string, direction: string) => Promise<void>;
}) {
  const isTestBuild = buildKind === 'test';
  const runs = workspace.builderRuns.filter((candidate) =>
    isTestBuild ? candidate.buildMode !== 'full_site' : candidate.buildMode === 'full_site',
  );
  const run = runs[0];
  const runHasUsage = Boolean(
    run &&
    workspace.aiUsageRecords.some(
      (record) => record.builderRunId === run.id && record.source === 'codex_build',
    ),
  );
  const runIsLatest = run?.id === workspace.latestBuilderRun?.id;
  const [isRequesting, setIsRequesting] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpeningPreview, setIsOpeningPreview] = useState(false);
  const [movingRunId, setMovingRunId] = useState<string>();
  const [isRequestingSiteTest, setIsRequestingSiteTest] = useState(false);
  const [message, setMessage] = useState('');
  const [targetSourceUrls, setTargetSourceUrls] = useState<string[]>([]);
  const [pageSearchQuery, setPageSearchQuery] = useState('');
  const pageSelectionManifestIdRef = useRef<string>();
  const pendingPageSelectionFocusUrlRef = useRef<string>();
  const pageSelectionInputRefs = useRef(new Map<string, HTMLInputElement>());
  const [testPageAction, setTestPageAction] = useState<'create' | 'revise' | 'website'>('create');
  const [sourceBuilderRunId, setSourceBuilderRunId] = useState('');
  const [studioSourceBuilderRunId, setStudioSourceBuilderRunId] = useState('');
  const [siteFeatureDirection, setSiteFeatureDirection] = useState(
    'Repair the multi-page navigation architecture. Keep primary destinations consistent on every page, link them to real generated routes instead of homepage section shortcuts, use the exact generated HTML output paths, organise deeper pages beneath meaningful parent routes, and ensure every generated page is reachable from the homepage. Preserve all unrelated content, styling, and interactions.',
  );
  const [retainedTestContextId, setRetainedTestContextId] = useState<string>();
  const [dismissedStoppedTestId, setDismissedStoppedTestId] = useState<string>();
  const [buildDirections, setBuildDirections] = useState<string[]>([]);
  const [selectedBehaviourIds, setSelectedBehaviourIds] = useState<string[]>([]);
  const [isStagingBehaviours, setIsStagingBehaviours] = useState(false);
  const [leavingBehaviourIds, setLeavingBehaviourIds] = useState<string[]>([]);
  const [optimisticallyStagedBehaviourIds, setOptimisticallyStagedBehaviourIds] = useState<
    string[]
  >([]);
  const [workshopFeature, setWorkshopFeature] = useState<AgentFeature>();
  const [workshopDirection, setWorkshopDirection] = useState('');
  const [isSendingWorkshop, setIsSendingWorkshop] = useState(false);
  const testPackages = agentPackages.filter(
    (agentPackage) => agentPackage.status === 'published' || agentPackage.status === 'test_ready',
  );
  const publishedPackage = agentPackages.find(
    (agentPackage) => agentPackage.status === 'published',
  );
  const pendingProductionFeatureCount = pendingProductionFeatureIds(agentPackages).length;
  const [selectedAgentPackageId, setSelectedAgentPackageId] = useState<string>();
  const selectedAgentPackage = agentPackages.find(
    (agentPackage) => agentPackage.id === selectedAgentPackageId,
  );
  const inheritedAgentPackage = selectedAgentPackage?.basePackageId
    ? agentPackages.find((agentPackage) => agentPackage.id === selectedAgentPackage.basePackageId)
    : undefined;
  const inheritedPackageLabel = inheritedAgentPackage
    ? `Inherited from package ${agentPackageVersionLabel(inheritedAgentPackage.version)}`
    : `Package ${agentPackageVersionLabel(selectedAgentPackage?.version ?? publishedPackage?.version ?? 4)} baseline`;
  const includesBrandIntroduction = Boolean(
    selectedAgentPackage &&
    /brand[-\s]introduction/i.test(
      `${selectedAgentPackage.summary}\n${selectedAgentPackage.capabilityProposal ?? ''}`,
    ),
  );
  const includesResponsiveSidebar = Boolean(
    selectedAgentPackage &&
    /sidebar|drawer|responsive navigation|scroll.*header/i.test(
      `${selectedAgentPackage.summary}\n${selectedAgentPackage.capabilityProposal ?? ''}`,
    ),
  );
  const testingBehaviours =
    selectedAgentPackage?.status === 'test_ready'
      ? [
          {
            id: includesBrandIntroduction
              ? 'brand-introduction'
              : includesResponsiveSidebar
                ? 'responsive-sidebar'
                : 'package-behaviour',
            title: `Package ${agentPackageVersionLabel(selectedAgentPackage.version)} testing behaviour`,
            detail: selectedAgentPackage.capabilityProposal || selectedAgentPackage.summary,
            revision: `v${selectedAgentPackage.version}.0.10`,
            change:
              'Latest edit: opening a non-homepage test now enters through its first selected generated route instead of the capability root’s framework not-found page.',
          },
          {
            id: 'hero-handoff',
            title: 'Visible hero entrance after the logo handoff',
            detail:
              'After the logo has reached the real navigation mark, the hero heading, supporting copy, and visual media reveal separately. The entrance no longer plays behind the loading overlay, so visitors can see it happen.',
            revision: `v${selectedAgentPackage.version}.38`,
            change:
              'Latest edit: the loading logo now uses top-left geometry against a visible settled header, preventing an offset endpoint or upward shot before the page reveal.',
          },
          {
            id: 'responsive-sidebar',
            title: 'Mobile & tablet sidebar navigation',
            detail:
              'Below desktop width, the header links become a leading-edge sidebar that reuses the real logo and header palette and opens from the trigger side. On motion-enabled visits, the header slides away after a downward scroll and returns on any upward scroll. It supports close, backdrop, Escape, keyboard focus, route selection, and reduced-motion users; desktop navigation stays visible.',
            revision: `v${selectedAgentPackage.version}.15`,
            change:
              'Latest edit: compact navigation now uses the slower smooth timing vocabulary while retaining full enter/exit travel and ordered logo, route, and action reveals.',
          },
          {
            id: 'contextual-logo-selection',
            title: 'Context-aware logo selection',
            detail:
              'The builder treats the approved source logo and its transparent versions as one family. It chooses white or white-with-accent on dark surfaces, and original, black-with-accent, or black on light surfaces, with a stable protective surface for photography or mixed backgrounds.',
            revision: `v${selectedAgentPackage.version}.5`,
            change:
              'Latest edit: approved logo-family files now use framework-safe public asset paths while retaining exact appearance and light/dark surface verification.',
          },
          {
            id: 'visual-content-recovery',
            title: 'Semantic recovery from image-based content',
            detail:
              'Human-approved text recovered from captured images keeps its source page and section provenance, while the source image is excluded from reuse and the builder creates a new accessible component or section.',
            revision: `v${selectedAgentPackage.version}.15`,
            change:
              'Latest edit: an image that has been converted into approved semantic content is now excluded from reusable manifest assets and the staged builder workspace, so only the reviewed structured information can appear in the redesign.',
          },
          {
            id: 'site-navigation-architecture',
            title: 'Multi-page navigation architecture',
            detail:
              'Every selected output remains a real page. Primary destinations stay consistent while deeper pages are organised through meaningful parent pages, nested navigation, breadcrumbs, cards, or contextual links, and every page remains reachable from the homepage.',
            revision: `v${selectedAgentPackage.version}.35`,
            change:
              'Latest edit: metadata, H1s, navigation, breadcrumbs, cards, and contextual links must use consistent content-derived page names while immutable route paths stay unchanged.',
          },
          {
            id: 'next-component-architecture',
            title: 'Next.js generated component architecture',
            detail:
              'The agent creates each business’s visual tokens, UI primitives, patterns, sections, site components, layouts, and pages on a pinned strict TypeScript, Tailwind, Base UI, and Lucide foundation.',
            revision: `v${selectedAgentPackage.version}.39`,
            change:
              'Latest edit: every route now uses gap-token text stacks that reveal direct children sequentially and includes a bounded scroll-depth composition without changing its spacing geometry.',
          },
          {
            id: 'runtime-profiles',
            title: 'Production runtime and capability profiles',
            detail:
              'Every manifest selects static marketing, managed forms, or a managed Next.js runtime and records typed production adapters without pretending a private static preview is a live backend.',
            revision: `v${selectedAgentPackage.version}.19`,
            change:
              'Latest edit: approved capabilities now carry explicit preview, production service, secret, configuration, and BUILD_NOTES handoff requirements.',
          },
          {
            id: 'framework-quality-gates',
            title: 'Framework and responsive quality gates',
            detail:
              'Generated source must pass formatting, lint, strict typing, production build, route and provenance checks, browser interactions, accessibility, and exact responsive evidence.',
            revision: `v${selectedAgentPackage.version}.36`,
            change:
              'Latest edit: package v6.9 resolves the preview entry from the immutable selected-page mapping so every completed page-set test opens on built output.',
          },
        ]
      : [];
  const stagedBehaviourIds = [
    ...(selectedAgentPackage?.stagedBehaviourIds ?? []),
    ...optimisticallyStagedBehaviourIds,
  ].filter((id, index, ids) => ids.indexOf(id) === index);
  const visibleStagedBehaviourIds = stagedBehaviourIds.filter(
    (id) => !leavingBehaviourIds.includes(id),
  );
  const pendingTestingBehaviours = testingBehaviours.filter(
    (behaviour) => !visibleStagedBehaviourIds.includes(behaviour.id),
  );
  const testOnlyFeatures = [
    agentPackageFeatures.find((feature) => feature.id === 'motion-runtime'),
    agentPackageFeatures.find((feature) => feature.id === 'responsive-sidebar'),
    agentPackageFeatures.find((feature) => feature.id === 'contextual-logo-selection'),
    agentPackageFeatures.find((feature) => feature.id === 'visual-content-recovery'),
    agentPackageFeatures.find((feature) => feature.id === 'site-navigation-architecture'),
    agentPackageFeatures.find((feature) => feature.id === 'next-component-architecture'),
    agentPackageFeatures.find((feature) => feature.id === 'runtime-profiles'),
    agentPackageFeatures.find((feature) => feature.id === 'framework-quality-gates'),
    ...(includesBrandIntroduction
      ? [agentPackageFeatures.find((feature) => feature.id === 'brand-introduction')]
      : []),
  ].filter((feature): feature is AgentFeature => Boolean(feature));
  const workshopFeatureForBehaviour = (behaviourId: string) =>
    testOnlyFeatures.find((feature) =>
      behaviourId === 'hero-handoff' ? feature.id === 'motion-runtime' : feature.id === behaviourId,
    );
  const featureHasWorkshopSource = (feature?: AgentFeature) =>
    agentFeatureHasWorkshopSource(feature);

  async function sendWorkshopToTesting() {
    if (!publishedPackage || !workshopFeature || !workshopDirection.trim() || !onRequestProposal)
      return;
    setIsSendingWorkshop(true);
    setMessage('');
    try {
      await onRequestProposal(
        publishedPackage.id,
        `Foundation workshop · ${workshopFeature.title}\n\n${workshopDirection.trim()}`,
      );
      setWorkshopDirection('');
      setWorkshopFeature(undefined);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'The workshop handoff could not be created.',
      );
    } finally {
      setIsSendingWorkshop(false);
    }
  }
  const [pendingBuild, setPendingBuild] = useState<{ previousRunId?: string }>();
  const [inspector, setInspector] = useState<'steps' | 'files'>();
  const [historyEvidence, setHistoryEvidence] = useState<
    Record<string, BuilderRunEvidenceState | undefined>
  >({});
  const allPageTestOptions = buildManifestSelectedPages(workspace.buildManifest);
  const homepageTestOption = allPageTestOptions.find((page) => {
    try {
      return new URL(page.url).pathname.replace(/\/+$/, '') === '';
    } catch {
      return false;
    }
  });
  const pageTestOptions = allPageTestOptions.filter((page) => {
    try {
      return new URL(page.url).pathname.replace(/\/+$/, '') !== '';
    } catch {
      return false;
    }
  });
  const initialPageTestUrl = homepageTestOption?.url ?? allPageTestOptions[0]?.url;
  const normalizedPageSearchQuery = pageSearchQuery.trim().toLocaleLowerCase();
  const selectedPageTestOptions = allPageTestOptions.filter((page) =>
    targetSourceUrls.includes(page.url),
  );
  const availablePageTestOptions = allPageTestOptions.filter((page) => {
    if (targetSourceUrls.includes(page.url)) return false;
    if (!normalizedPageSearchQuery) return true;
    return [page.title, page.publicPath, page.url].some(
      (value) =>
        typeof value === 'string' && value.toLocaleLowerCase().includes(normalizedPageSearchQuery),
    );
  });
  useEffect(() => {
    if (pageSelectionManifestIdRef.current === workspace.buildManifest?.id) return;
    pageSelectionManifestIdRef.current = workspace.buildManifest?.id;
    setTargetSourceUrls(initialPageTestUrl ? [initialPageTestUrl] : []);
    setPageSearchQuery('');
  }, [initialPageTestUrl, workspace.buildManifest?.id]);
  useEffect(() => {
    const sourceUrl = pendingPageSelectionFocusUrlRef.current;
    if (!sourceUrl) return;
    const frame = window.requestAnimationFrame(() => {
      pageSelectionInputRefs.current.get(sourceUrl)?.focus();
      pendingPageSelectionFocusUrlRef.current = undefined;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [targetSourceUrls]);
  function renderPageSetOption(page: BuildManifestPage) {
    const checked = targetSourceUrls.includes(page.url);
    let pathname = page.publicPath;
    try {
      pathname = new URL(page.url).pathname || '/';
    } catch {
      // The immutable manifest URL remains the useful fallback label.
    }
    return (
      <label key={page.url}>
        <input
          checked={checked}
          disabled={isRequesting || isRequestingSiteTest}
          onChange={() => {
            pendingPageSelectionFocusUrlRef.current = page.url;
            setTargetSourceUrls((current) =>
              checked
                ? current.filter((sourceUrl) => sourceUrl !== page.url)
                : allPageTestOptions
                    .filter(
                      (candidate) => current.includes(candidate.url) || candidate.url === page.url,
                    )
                    .map((candidate) => candidate.url),
            );
          }}
          ref={(element) => {
            if (element) pageSelectionInputRefs.current.set(page.url, element);
            else pageSelectionInputRefs.current.delete(page.url);
          }}
          type="checkbox"
        />
        <span>
          <strong>{page.title || pathname}</strong>
          <small>{pathname}</small>
        </span>
        {page.url === homepageTestOption?.url ? <em>Homepage</em> : null}
      </label>
    );
  }
  const studioSourceRuns = workspace.builderRuns
    .filter(
      (candidate) =>
        Boolean(candidate.agentStudioSourceAt) &&
        candidate.sourceCheckpointAvailable !== false &&
        (candidate.status === 'ready' || candidate.status === 'review_required'),
    )
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  const studioMultiPageSourceRuns = studioSourceRuns.filter(
    (candidate) =>
      (candidate.buildMode === 'full_site' ||
        candidate.buildMode === 'site_test' ||
        Boolean(candidate.targetSourceUrls?.length)) &&
      builderRunPageCount(workspace, candidate) > 1,
  );
  const studioSourceById = new Map(studioSourceRuns.map((candidate) => [candidate.id, candidate]));
  function studioLineageRootId(candidate: BuilderRun) {
    let current = candidate;
    const visited = new Set([current.id]);
    while (current.parentBuilderRunId) {
      const parent = studioSourceById.get(current.parentBuilderRunId);
      if (!parent || visited.has(parent.id)) break;
      visited.add(parent.id);
      current = parent;
    }
    return current.id;
  }
  const studioVersionGroupsByRoot = new Map<string, BuilderRun[]>();
  studioSourceRuns.forEach((candidate) => {
    const rootId = studioLineageRootId(candidate);
    studioVersionGroupsByRoot.set(rootId, [
      ...(studioVersionGroupsByRoot.get(rootId) ?? []),
      candidate,
    ]);
  });
  const studioVersionGroups = [...studioVersionGroupsByRoot.values()]
    .map((group) => group.sort((first, second) => second.createdAt.localeCompare(first.createdAt)))
    .sort((first, second) => second[0]!.createdAt.localeCompare(first[0]!.createdAt));
  const selectedStudioSource = studioMultiPageSourceRuns.find(
    (candidate) => candidate.id === studioSourceBuilderRunId,
  );
  useEffect(() => {
    if (
      studioSourceBuilderRunId &&
      studioMultiPageSourceRuns.some((candidate) => candidate.id === studioSourceBuilderRunId)
    ) {
      return;
    }
    setStudioSourceBuilderRunId(studioMultiPageSourceRuns[0]?.id ?? '');
  }, [studioMultiPageSourceRuns, studioSourceBuilderRunId]);
  useEffect(() => {
    if (selectedAgentPackageId && testPackages.some((item) => item.id === selectedAgentPackageId)) {
      return;
    }
    setSelectedAgentPackageId(
      testPackages.find((item) => item.status === 'test_ready')?.id ??
        publishedPackage?.id ??
        testPackages[0]?.id,
    );
  }, [publishedPackage?.id, selectedAgentPackageId, testPackages]);
  useEffect(() => {
    setSelectedBehaviourIds(stagedBehaviourIds);
    setOptimisticallyStagedBehaviourIds([]);
    setLeavingBehaviourIds([]);
  }, [selectedAgentPackage?.id]);
  const requiredHomepageAgentPackageId = isTestBuild
    ? selectedAgentPackageId
    : publishedPackage?.id;
  const currentManifest = workspace.buildManifest;
  const compatibleManifestIds = new Set(
    workspace.buildManifests
      .filter(
        (manifest) =>
          manifest.id === currentManifest?.id ||
          (manifest.crawlRunId === currentManifest?.crawlRunId &&
            manifest.researchPacketId === currentManifest?.researchPacketId),
      )
      .map((manifest) => manifest.id),
  );
  if (currentManifest) compatibleManifestIds.add(currentManifest.id);
  const completedHomepageTests = workspace.builderRuns.filter(
    (candidate) =>
      candidate.buildMode === 'homepage_test' &&
      (candidate.status === 'ready' || candidate.status === 'review_required'),
  );
  const exactHomepageTestReady = completedHomepageTests.some(
    (candidate) =>
      candidate.buildManifestId === workspace.buildManifest?.id &&
      (!requiredHomepageAgentPackageId ||
        candidate.agentPackageId === requiredHomepageAgentPackageId),
  );
  const compatibleHomepageTestReady =
    !isTestBuild &&
    completedHomepageTests.some(
      (candidate) =>
        compatibleManifestIds.has(candidate.buildManifestId) &&
        candidate.agentPackageId === requiredHomepageAgentPackageId,
    );
  const homepageTestReady = exactHomepageTestReady || compatibleHomepageTestReady;
  const homepageTestForDifferentPackage = completedHomepageTests.find(
    (candidate) =>
      compatibleManifestIds.has(candidate.buildManifestId) &&
      candidate.agentPackageId !== requiredHomepageAgentPackageId,
  );
  const homepageRequirementDetail = exactHomepageTestReady
    ? 'A homepage test for this Build Manifest is ready. The complete prospect build remains private until separately approved for sharing.'
    : compatibleHomepageTestReady
      ? `A compatible homepage test is ready. The complete build will automatically rebase its design direction onto the current Build Manifest, production package ${agentPackageVersionLabel(publishedPackage?.version)}, approved logos, and recovered content.`
      : homepageTestForDifferentPackage
        ? `The homepage test for this Build Manifest used agent package ${agentPackageVersionLabel(homepageTestForDifferentPackage.agentPackageVersion)}. Run and review the homepage test with the current production package ${agentPackageVersionLabel(publishedPackage?.version)} before starting the complete website.`
        : 'Complete and review a homepage test in Agent Studio for this Build Manifest before starting the complete prospect build.';
  const loadedRunEvidence = run ? historyEvidence[run.id] : undefined;
  const currentRunEvidenceLoading = !runIsLatest && loadedRunEvidence?.status === 'loading';
  const currentRunEvidenceError =
    !runIsLatest && loadedRunEvidence?.status === 'error' ? loadedRunEvidence.message : undefined;
  const currentArtifacts = runIsLatest
    ? workspace.builderArtifacts.filter((artifact) => artifact.builderRunId === run?.id)
    : loadedRunEvidence?.status === 'ready'
      ? loadedRunEvidence.evidence.artifacts
      : [];
  const currentEvents = runIsLatest
    ? workspace.builderEvents.filter((event) => event.builderRunId === run?.id)
    : loadedRunEvidence?.status === 'ready'
      ? loadedRunEvidence.evidence.events
      : [];
  const previewFiles = currentArtifacts.filter((artifact) => artifact.kind === 'site_file');
  const sourceFiles = builderSourceExplorerEntries(currentArtifacts);
  const screenshots = currentArtifacts.filter((artifact) => artifact.kind === 'screenshot');
  const progressMilestones = run ? buildProgressMilestones(run, screenshots) : [];
  const { urls: screenshotUrls, loadError } = usePrivateArtifactUrls(
    screenshots,
    'Private preview screenshots could not be loaded. Refresh and check storage access.',
  );
  const active = run?.status === 'queued' || run?.status === 'running' || run?.status === 'paused';
  const runId = run?.id;
  useEffect(() => {
    if (!pendingBuild || !runId || runId === pendingBuild.previousRunId) return;
    setPendingBuild(undefined);
  }, [pendingBuild, runId]);

  const showCurrentRunLogs = Boolean(!pendingBuild && run);
  const frozenDraft =
    run?.status === 'paused' || run?.status === 'failed' || run?.status === 'cancelled';
  const retainedTestContext =
    isTestBuild && frozenDraft && Boolean(run) && dismissedStoppedTestId !== run?.id;
  useEffect(() => {
    if (!isTestBuild || !run || (!active && !frozenDraft) || retainedTestContextId === run.id)
      return;
    if (run.agentPackageId && testPackages.some((item) => item.id === run.agentPackageId)) {
      setSelectedAgentPackageId(run.agentPackageId);
    }
    setTestPageAction(
      run.buildMode === 'site_test' ? 'website' : run.parentBuilderRunId ? 'revise' : 'create',
    );
    setSourceBuilderRunId(run.parentBuilderRunId ?? '');
    if (run.targetSourceUrls?.length) setTargetSourceUrls(run.targetSourceUrls);
    setRetainedTestContextId(run.id);
  }, [active, frozenDraft, isTestBuild, retainedTestContextId, run, testPackages]);
  useEffect(() => {
    if (active && dismissedStoppedTestId) setDismissedStoppedTestId(undefined);
  }, [active, dismissedStoppedTestId]);
  const draftAvailable = currentArtifacts.some(
    (artifact) => artifact.kind === 'draft_file' && artifact.label === 'index.html',
  );
  const checkpointAvailable = currentArtifacts.some(
    (artifact) =>
      artifact.kind === 'checkpoint' && artifact.label === 'Latest private source checkpoint',
  );
  const savedSourceAvailable =
    checkpointAvailable || currentArtifacts.some((artifact) => isWorkingSourceArtifact(artifact));
  const homepageSelected =
    targetSourceUrls.length === 1 && targetSourceUrls[0] === homepageTestOption?.url;
  const selectedPageCanBuild = targetSourceUrls.length > 0;
  const currentSelectedPageUrls = new Set(
    buildManifestSelectedPages(currentManifest).map((page) => page.url),
  );
  const completedTestPages = workspace.builderRuns
    .filter(
      (candidate) =>
        compatibleManifestIds.has(candidate.buildManifestId) &&
        candidate.buildMode !== 'full_site' &&
        !candidate.targetSourceUrls?.length &&
        (!candidate.targetSourceUrl || currentSelectedPageUrls.has(candidate.targetSourceUrl)) &&
        (candidate.status === 'ready' || candidate.status === 'review_required'),
    )
    .sort((first, second) => first.createdAt.localeCompare(second.createdAt));
  const previousTestPages = completedTestPages.filter(
    (candidate) => candidate.sourceCheckpointAvailable !== false,
  );
  const unavailableTestPageIds = new Set(
    completedTestPages
      .filter((candidate) => candidate.sourceCheckpointAvailable === false)
      .map((candidate) => candidate.id),
  );
  const selectedSourceRun = previousTestPages.find(
    (candidate) => candidate.id === sourceBuilderRunId,
  );
  const codexStreamEvents = currentEvents.filter(isCodexStreamEvent);
  const diagnosticEvents = currentEvents.filter((event) => event.kind === 'diagnostic');
  const timelineEvents = currentEvents.filter(
    (event) => !isCodexStreamEvent(event) && event.kind !== 'diagnostic',
  );
  const newActivityIds = useNewBuilderActivityIds(currentEvents, runId);
  const latestSavedWorkerEvent = currentEvents[currentEvents.length - 1];
  const failedOutputPath =
    typeof run?.failureContext.path === 'string' ? run.failureContext.path : undefined;
  const failedStorageOperation =
    typeof run?.failureContext.operation === 'string'
      ? run.failureContext.operation.replaceAll('_', ' ')
      : undefined;
  const failedQualityPage =
    typeof run?.failureContext.page === 'string' ? run.failureContext.page : undefined;
  const failedQualityViewport =
    typeof run?.failureContext.viewport === 'string'
      ? run.failureContext.viewport.replaceAll('_', ' ')
      : undefined;
  const failedDiagnostic =
    typeof run?.failureContext.detail === 'string' ? run.failureContext.detail : undefined;
  const historyRuns = runs.filter((candidate) => !showCurrentRunLogs || candidate.id !== run?.id);
  const latestHistoryState = historyRuns[0] ? historyEvidence[historyRuns[0].id] : undefined;
  const completedTestRuns = isTestBuild
    ? runs.filter(
        (candidate) =>
          !candidate.agentStudioSourceAt &&
          (candidate.status === 'ready' || candidate.status === 'review_required'),
      )
    : [];

  async function moveToAgentStudio(builderRunId: string) {
    if (!onMoveToAgentStudio) return;
    setMovingRunId(builderRunId);
    setMessage('');
    try {
      await onMoveToAgentStudio(builderRunId);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'This build could not move into Agent Studio.',
      );
    } finally {
      setMovingRunId(undefined);
    }
  }

  async function requestSiteTest() {
    if (
      !onRequestSiteTest ||
      !selectedStudioSource ||
      !selectedAgentPackageId ||
      !siteFeatureDirection.trim()
    )
      return;
    setIsRequestingSiteTest(true);
    setMessage('');
    try {
      await onRequestSiteTest(
        selectedStudioSource.id,
        siteFeatureDirection.trim(),
        selectedAgentPackageId,
        'site-navigation-architecture',
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'The multi-page feature test could not be queued.',
      );
    } finally {
      setIsRequestingSiteTest(false);
    }
  }

  async function loadHistoryEvidence(builderRunId: string) {
    if (historyEvidence[builderRunId]?.status === 'loading') return;
    setHistoryEvidence((current) => ({ ...current, [builderRunId]: { status: 'loading' } }));
    try {
      const evidence = await onLoadBuildEvidence(builderRunId);
      setHistoryEvidence((current) => ({
        ...current,
        [builderRunId]: { status: 'ready', evidence },
      }));
    } catch (error) {
      setHistoryEvidence((current) => ({
        ...current,
        [builderRunId]: {
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'This private build history could not be loaded.',
        },
      }));
    }
  }

  function artifactsForCompletedRun(completedRun: BuilderRun) {
    if (workspace.latestBuilderRun?.id === completedRun.id) {
      return workspace.builderArtifacts.filter(
        (artifact) => artifact.builderRunId === completedRun.id,
      );
    }
    const evidenceState = historyEvidence[completedRun.id];
    return evidenceState?.status === 'ready' ? evidenceState.evidence.artifacts : [];
  }

  useEffect(() => {
    if (!run || runIsLatest || loadedRunEvidence) return;
    void loadHistoryEvidence(run.id);
  }, [loadedRunEvidence, run, runIsLatest]);

  async function requestBuild(
    mode: BuilderRunMode,
    targetSourceUrl?: string,
    sourceBuilderRunId?: string,
    selectedTargetSourceUrls?: string[],
  ) {
    setIsRequesting(true);
    setMessage('');
    setPendingBuild({ previousRunId: run?.id });
    try {
      await onRequestBuild(
        mode,
        targetSourceUrl,
        buildDirections
          .map((direction) => direction.trim())
          .filter(Boolean)
          .join('\n\n'),
        isTestBuild ? selectedAgentPackageId : publishedPackage?.id,
        sourceBuilderRunId,
        selectedTargetSourceUrls,
      );
    } catch (error) {
      setPendingBuild(undefined);
      setMessage(
        error instanceof Error ? error.message : 'The private preview could not be queued.',
      );
    } finally {
      setIsRequesting(false);
    }
  }

  async function stageSelectedBehaviours() {
    if (!onStageBehaviours || !selectedAgentPackage || !selectedBehaviourIds.length) return;
    const newlyStagedIds = selectedBehaviourIds.filter((id) => !stagedBehaviourIds.includes(id));
    if (!newlyStagedIds.length) return;
    setIsStagingBehaviours(true);
    setMessage('');
    try {
      await onStageBehaviours(selectedAgentPackage.id, selectedBehaviourIds);
      setLeavingBehaviourIds(newlyStagedIds);
      window.setTimeout(() => {
        setOptimisticallyStagedBehaviourIds((current) => [
          ...new Set([...current, ...newlyStagedIds]),
        ]);
        setLeavingBehaviourIds((current) => current.filter((id) => !newlyStagedIds.includes(id)));
      }, 260);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'The selected behaviours could not be staged.',
      );
    } finally {
      setIsStagingBehaviours(false);
    }
  }

  async function cancelBuild() {
    setIsCancelling(true);
    setMessage('');
    try {
      await onCancelBuild();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'The private preview could not be cancelled.',
      );
    } finally {
      setIsCancelling(false);
    }
  }

  async function resumeBuild(builderRunId: string) {
    if (!onResumeBuild) return;
    setIsResuming(true);
    setMessage('');
    try {
      await onResumeBuild(builderRunId);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'This private test could not be continued.',
      );
    } finally {
      setIsResuming(false);
    }
  }

  async function deleteBuild() {
    if (
      !run ||
      !window.confirm(
        'Delete every private test and prospect build, draft, screenshot, log, and preview link for this prospect? Research and the Build Manifest are kept. This cannot be undone.',
      )
    )
      return;
    setIsDeleting(true);
    setMessage('');
    try {
      await onDeleteBuild(workspace.business.id);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'The private build could not be deleted.',
      );
    } finally {
      setIsDeleting(false);
    }
  }

  async function openPreview(builderRunId: string, mode: BuilderPreviewMode) {
    const previewTab = window.open('about:blank', '_blank');
    if (previewTab) previewTab.opener = null;
    setIsOpeningPreview(true);
    setMessage('');
    try {
      const previewUrl = await onOpenPreview(builderRunId, mode);
      if (previewTab && !previewTab.closed) {
        previewTab.location.replace(previewUrl);
      } else {
        // A popup can be blocked in browser-hosted environments such as
        // Codespaces. This runs after the asynchronous access-token request,
        // so attempting a second popup would be blocked as well. Navigating
        // the current tab keeps the private preview accessible.
        window.location.assign(previewUrl);
      }
    } catch (error) {
      previewTab?.close();
      setMessage(
        error instanceof Error ? error.message : 'The private preview could not be opened.',
      );
    } finally {
      setIsOpeningPreview(false);
    }
  }

  return (
    <section className="builder-run" aria-labelledby="builder-run-title">
      <div className="brief-panel__header">
        <div>
          <Eyebrow>{isTestBuild ? 'Private test build' : 'Private prospect build'}</Eyebrow>
          <h3 id="builder-run-title">
            {isTestBuild ? 'Codex test builder' : 'Complete prospect website'}
          </h3>
          <p className="muted-copy">
            {isTestBuild
              ? 'Tests one approved page or one feature across a moved whole-site source, then saves a private draft and logs for agent refinement. It does not publish or contact anyone.'
              : 'Builds this prospect’s complete private website from its immutable Build Manifest, then saves source, responsive captures, and automated checks for review. It does not publish or contact anyone.'}
          </p>
        </div>
        {run ? (
          <StatusBadge tone={builderRunTone(run.status)}>{builderRunLabel(run.status)}</StatusBadge>
        ) : null}
      </div>

      <div className="builder-run__actions">
        {isTestBuild && (active || retainedTestContext) ? (
          <section className="builder-active-test" aria-labelledby="builder-active-test-title">
            <div className="builder-active-test__header">
              <div>
                <Eyebrow>Current private test</Eyebrow>
                <h4 id="builder-active-test-title">
                  {active
                    ? `${run ? usageBuildLabel({ builderRunId: run.id }, workspace).split(' · ')[0] : 'Test'} is building`
                    : `${run ? usageBuildLabel({ builderRunId: run.id }, workspace).split(' · ')[0] : 'Test'} needs attention`}
                </h4>
              </div>
              <StatusBadge tone={active ? 'warning' : 'danger'}>
                {active ? 'Live' : 'Paused on this test'}
              </StatusBadge>
            </div>
            <dl className="builder-active-test__context">
              <div>
                <dt>Test package</dt>
                <dd>
                  {run ? (
                    <AgentPackageDetailsDialog agentPackages={agentPackages} run={run} />
                  ) : (
                    'Not assigned'
                  )}
                </dd>
              </div>
              <div>
                <dt>Test approach</dt>
                <dd>
                  {run?.buildMode === 'site_test'
                    ? 'Whole-site feature revision'
                    : run?.targetSourceUrls?.length
                      ? `Create ${run.targetSourceUrls.length} pages from scratch`
                      : run?.parentBuilderRunId
                        ? 'Revise previous page (scoped)'
                        : 'Create page from scratch'}
                </dd>
              </div>
            </dl>
            {run ? <BuilderRunUsage records={workspace.aiUsageRecords} run={run} /> : null}
            {active ? (
              <>
                <BuilderActivityWaiting
                  detail={
                    run?.progressDetail ||
                    'Waiting for the worker to save the first activity update.'
                  }
                  label={builderProgressPhaseLabel(run?.progressPhase || 'queued')}
                />
                <div aria-hidden="true" className="builder-active-test__skeleton">
                  <span className="evidence-skeleton evidence-skeleton--value" />
                  <span className="evidence-skeleton evidence-skeleton--detail" />
                </div>
              </>
            ) : (
              <>
                <p className="muted-copy">
                  This failed test remains selected with its original package and test approach.
                  Continue it from the saved private source, open its frozen draft below, or keep
                  testing with a different package or page.
                </p>
                <ButtonGroup>
                  {onResumeBuild && savedSourceAvailable ? (
                    <Button
                      disabled={isResuming}
                      onClick={() => run && void resumeBuild(run.id)}
                      type="button"
                      variant="secondary"
                    >
                      <RotateCcw aria-hidden="true" size={16} />
                      {isResuming ? 'Continuing test' : 'Continue this test'}
                    </Button>
                  ) : null}
                  <Button
                    disabled={isResuming}
                    onClick={() => run && setDismissedStoppedTestId(run.id)}
                    type="button"
                    variant="quiet"
                  >
                    <Play aria-hidden="true" size={16} />
                    Test something else
                  </Button>
                </ButtonGroup>
              </>
            )}
          </section>
        ) : null}
        {isTestBuild && !active && !retainedTestContext ? (
          <div className="builder-run__tests">
            <label className="builder-run__package-picker">
              <span className="agent-production-version-label">
                Test package
                <AgentProductionNotification count={pendingProductionFeatureCount} />
              </span>
              <select
                aria-label="Test agent package"
                disabled={isRequesting || isRequestingSiteTest || !testPackages.length}
                onChange={(event) => setSelectedAgentPackageId(event.target.value)}
                value={selectedAgentPackageId ?? ''}
              >
                {testPackages.map((agentPackage) => (
                  <option key={agentPackage.id} value={agentPackage.id}>
                    {agentPackageVersionLabel(agentPackage.version)} ·{' '}
                    {agentPackage.status === 'published' ? 'Current production' : 'Approved test'}
                  </option>
                ))}
              </select>
              <small>
                {selectedAgentPackageId === publishedPackage?.id
                  ? 'This test uses the current production package.'
                  : 'This test is pinned to a derived package and cannot change the production package.'}
              </small>
            </label>
            <p className="builder-run__action-label">Test</p>
            <div className="builder-page-test">
              <fieldset className="builder-page-test__actions">
                <legend>Test approach</legend>
                <label>
                  <input
                    checked={testPageAction === 'create'}
                    disabled={isRequesting || isRequestingSiteTest}
                    name="test-page-action"
                    onChange={() => setTestPageAction('create')}
                    type="radio"
                  />
                  <span>Create page from scratch</span>
                </label>
                <label>
                  <input
                    checked={testPageAction === 'revise'}
                    disabled={isRequesting || isRequestingSiteTest}
                    name="test-page-action"
                    onChange={() => setTestPageAction('revise')}
                    type="radio"
                  />
                  <span>Revise previous page</span>
                </label>
                <label>
                  <input
                    checked={testPageAction === 'website'}
                    disabled={isRequesting || isRequestingSiteTest}
                    name="test-page-action"
                    onChange={() => setTestPageAction('website')}
                    type="radio"
                  />
                  <span>Revise a website</span>
                </label>
              </fieldset>
              {testPageAction === 'create' ? (
                <fieldset aria-describedby="builder-page-set-help" className="builder-page-set">
                  <legend>
                    <span>Approved pages</span>
                    <strong aria-live="polite">{targetSourceUrls.length} selected</strong>
                  </legend>
                  <div className="builder-page-set__toolbar">
                    <p>Select any combination to build together from a clean foundation.</p>
                    <ButtonGroup>
                      <Button
                        disabled={
                          isRequesting ||
                          isRequestingSiteTest ||
                          targetSourceUrls.length === allPageTestOptions.length
                        }
                        onClick={() =>
                          setTargetSourceUrls(allPageTestOptions.map((page) => page.url))
                        }
                        type="button"
                        variant="quiet"
                      >
                        Select all
                      </Button>
                      <Button
                        disabled={isRequesting || isRequestingSiteTest || !targetSourceUrls.length}
                        onClick={() => setTargetSourceUrls([])}
                        type="button"
                        variant="quiet"
                      >
                        Clear
                      </Button>
                    </ButtonGroup>
                  </div>
                  <label className="builder-page-set__search">
                    <span>Search approved pages</span>
                    <span className="builder-page-set__search-control">
                      <Search aria-hidden="true" size={18} />
                      <input
                        autoComplete="off"
                        disabled={isRequesting || isRequestingSiteTest}
                        onChange={(event) => setPageSearchQuery(event.target.value)}
                        placeholder="Search name, path, or URL"
                        type="search"
                        value={pageSearchQuery}
                      />
                      {pageSearchQuery ? (
                        <IconButton
                          disabled={isRequesting || isRequestingSiteTest}
                          label="Clear page search"
                          onClick={() => setPageSearchQuery('')}
                          type="button"
                          variant="quiet"
                        >
                          <X aria-hidden="true" size={16} />
                        </IconButton>
                      ) : null}
                    </span>
                  </label>
                  <div className="builder-page-set__options">
                    {selectedPageTestOptions.length ? (
                      <section
                        aria-labelledby="builder-page-set-selected-title"
                        className="builder-page-set__group builder-page-set__group--selected"
                      >
                        <div className="builder-page-set__group-heading">
                          <strong id="builder-page-set-selected-title">Selected pages</strong>
                          <span>Pinned at top</span>
                        </div>
                        <div className="builder-page-set__grid">
                          {selectedPageTestOptions.map(renderPageSetOption)}
                        </div>
                      </section>
                    ) : null}
                    <section
                      aria-labelledby="builder-page-set-results-title"
                      className="builder-page-set__group"
                    >
                      <div className="builder-page-set__group-heading">
                        <strong id="builder-page-set-results-title">
                          {normalizedPageSearchQuery ? 'Search results' : 'Available pages'}
                        </strong>
                        <span>
                          {availablePageTestOptions.length}{' '}
                          {availablePageTestOptions.length === 1 ? 'page' : 'pages'}
                        </span>
                      </div>
                      {availablePageTestOptions.length ? (
                        <div className="builder-page-set__grid">
                          {availablePageTestOptions.map(renderPageSetOption)}
                        </div>
                      ) : (
                        <p className="builder-page-set__empty" role="status">
                          {normalizedPageSearchQuery
                            ? 'No unselected pages match this search. Selected pages remain pinned above.'
                            : 'Every approved page is selected and pinned above.'}
                        </p>
                      )}
                    </section>
                  </div>
                </fieldset>
              ) : testPageAction === 'revise' ? (
                <>
                  <label>
                    <span>Previous private page</span>
                    <select
                      aria-describedby="builder-revision-help"
                      aria-label="Previous built page"
                      disabled={isRequesting || isRequestingSiteTest || !previousTestPages.length}
                      onChange={(event) => setSourceBuilderRunId(event.target.value)}
                      value={sourceBuilderRunId}
                    >
                      <option value="">
                        {previousTestPages.length
                          ? 'Choose a private test page'
                          : 'No private test page is available'}
                      </option>
                      {completedTestPages.map((candidate, index) => {
                        const sourcePage = pageTestOptions.find(
                          (page) => page.url === candidate.targetSourceUrl,
                        );
                        const usesPriorManifest =
                          candidate.buildManifestId !== workspace.buildManifest?.id;
                        const sourceUnavailable = unavailableTestPageIds.has(candidate.id);
                        return (
                          <option
                            disabled={sourceUnavailable}
                            key={candidate.id}
                            value={candidate.id}
                          >
                            Test {index + 1} —{' '}
                            {sourcePage?.title ??
                              (candidate.targetSourceUrl ? 'Selected page' : 'Homepage')}{' '}
                            · package {agentPackageVersionLabel(candidate.agentPackageVersion ?? 4)}
                            {usesPriorManifest ? ' · apply current assets' : ''}
                            {sourceUnavailable ? ' · source checkpoint unavailable' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                  {!previousTestPages.length ? (
                    <p
                      className="form-message form-message--error"
                      id="builder-revision-help"
                      role="alert"
                    >
                      {completedTestPages.length
                        ? 'The completed tests shown here do not have a saved source checkpoint, so they cannot be revised safely. Create a new test from scratch; completed new tests preserve revisable source.'
                        : 'There are no completed private tests to revise yet. Create a test page from scratch first, then return here to select it.'}
                    </p>
                  ) : !selectedSourceRun ? (
                    <p
                      className="form-message form-message--error"
                      id="builder-revision-help"
                      role="alert"
                    >
                      Select a test version before starting a revision.
                    </p>
                  ) : selectedSourceRun.buildManifestId !== workspace.buildManifest?.id ? (
                    <p className="muted-copy" id="builder-revision-help">
                      This completed page uses the same captured research as the current manifest.
                      The revision will keep its design baseline while replacing its prior asset set
                      with the current approved Brand Kit and logo versions.
                    </p>
                  ) : (
                    <p className="muted-copy" id="builder-revision-help">
                      The revision will restore this completed page and use the current approved
                      assets.
                    </p>
                  )}
                </>
              ) : (
                <section
                  aria-labelledby="agent-studio-site-test-title"
                  className="builder-page-test__website"
                >
                  <div className="agent-studio-site-test__header">
                    <div>
                      <Eyebrow>Whole-site source</Eyebrow>
                      <h4 id="agent-studio-site-test-title">Revise a website</h4>
                      <p>
                        Keep the complete generated website intact, change one agent feature, and
                        save the result as the newest linked test version.
                      </p>
                    </div>
                    {selectedStudioSource ? (
                      <StatusBadge tone="success">
                        {builderRunPageCount(workspace, selectedStudioSource)} pages
                      </StatusBadge>
                    ) : null}
                  </div>
                  {studioMultiPageSourceRuns.length ? (
                    <div className="agent-studio-site-test__controls">
                      <label>
                        <span>Website version to revise</span>
                        <select
                          disabled={isRequestingSiteTest}
                          onChange={(event) => setStudioSourceBuilderRunId(event.target.value)}
                          value={studioSourceBuilderRunId}
                        >
                          {studioMultiPageSourceRuns.map((sourceRun, index) => (
                            <option key={sourceRun.id} value={sourceRun.id}>
                              {index === 0
                                ? 'Newest'
                                : `Earlier version ${studioMultiPageSourceRuns.length - index}`}
                              {' · '}
                              {builderRunPageCount(workspace, sourceRun)} page
                              {builderRunPageCount(workspace, sourceRun) === 1 ? '' : 's'}
                              {' · '}
                              {agentPackageVersionLabel(sourceRun.agentPackageVersion)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <article className="agent-studio-site-test__feature">
                        <FolderTree aria-hidden="true" size={20} />
                        <span>
                          <strong>Multi-page navigation architecture</strong>
                          <small>
                            Exact routes, consistent primary links, nested child pages, and
                            reachability from the homepage.
                          </small>
                        </span>
                      </article>
                      <label className="agent-studio-site-test__direction">
                        <span>Feature direction</span>
                        <textarea
                          disabled={isRequestingSiteTest}
                          maxLength={4000}
                          onChange={(event) => setSiteFeatureDirection(event.target.value)}
                          rows={4}
                          value={siteFeatureDirection}
                        />
                      </label>
                      <Button
                        disabled={
                          isRequestingSiteTest ||
                          !selectedStudioSource ||
                          !selectedAgentPackageId ||
                          !siteFeatureDirection.trim()
                        }
                        onClick={() => void requestSiteTest()}
                        type="button"
                      >
                        <Play aria-hidden="true" size={16} />
                        {isRequestingSiteTest ? 'Creating linked version' : 'Revise website'}
                      </Button>
                    </div>
                  ) : (
                    <p className="form-message form-message--error" role="alert">
                      No whole-site source is available yet. Move a completed multi-page prospect
                      build into Agent Studio, then return here to revise it.
                    </p>
                  )}
                </section>
              )}
              {testPageAction !== 'website' ? (
                <>
                  <Button
                    disabled={
                      isRequesting ||
                      !selectedAgentPackageId ||
                      (testPageAction === 'create' ? !selectedPageCanBuild : !selectedSourceRun)
                    }
                    onClick={() =>
                      void requestBuild(
                        testPageAction === 'revise'
                          ? selectedSourceRun?.targetSourceUrl
                            ? 'page_test'
                            : 'homepage_test'
                          : homepageSelected
                            ? 'homepage_test'
                            : 'page_test',
                        testPageAction === 'revise'
                          ? selectedSourceRun?.targetSourceUrl
                          : undefined,
                        testPageAction === 'revise' ? selectedSourceRun?.id : undefined,
                        testPageAction === 'create' && !homepageSelected
                          ? targetSourceUrls
                          : undefined,
                      )
                    }
                    type="button"
                    variant="secondary"
                  >
                    <Play aria-hidden="true" size={16} />
                    {isRequesting
                      ? 'Queueing builder'
                      : testPageAction === 'revise'
                        ? 'Revise private page'
                        : 'Build test page'}
                  </Button>
                  <small id="builder-page-set-help">
                    {testPageAction === 'revise'
                      ? previousTestPages.length
                        ? 'Test numbers match the private previews in Test versions. The selected test becomes this revision’s private source; it never reads or changes the prospect’s public website.'
                        : completedTestPages.length
                          ? 'These completed tests predate a usable saved source checkpoint. Create a fresh test to establish a revisable private source.'
                          : 'Complete a private homepage or page test first. Only completed private previews can be revised.'
                      : homepageSelected
                        ? 'Creates a new private homepage test from the approved manifest. It does not read, continue, or change an earlier private draft or the prospect’s public website.'
                        : `Creates ${targetSourceUrls.length} selected page${
                            targetSourceUrls.length === 1 ? '' : 's'
                          } together from the clean locked foundation. It does not inherit an earlier test or change the prospect’s public website.`}
                  </small>
                </>
              ) : null}
              {message ? (
                <p className="form-message form-message--error" role="alert">
                  {message}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {isTestBuild && !active && !retainedTestContext ? (
          <section className="builder-workflow" aria-labelledby="builder-workflow-title">
            <div className="builder-workflow__header">
              <Eyebrow>Test-only refinement</Eyebrow>
              <h4 id="builder-workflow-title">Package capabilities &amp; test directions</h4>
              <p>
                Built-in capabilities come from the selected builder agent package. Directions below
                are saved with this test run and passed to Codex as scoped refinement guidance; they
                do not change the package.
              </p>
            </div>
            <details className="builder-workflow__motion">
              <summary>
                <Sparkles aria-hidden="true" size={18} />
                <span>
                  <strong>Inherited package behaviour</strong>
                  <small>
                    {inheritedPackageLabel} · 1 built-in capability already in this package
                  </small>
                </span>
                <ChevronDown aria-hidden="true" size={18} />
              </summary>
              <div className="builder-workflow__capability">
                <strong>Built-in capability · motion runtime</strong>
                <p>
                  A tested builder-foundation capability: the local runtime reveals headings and
                  content containers as they enter view, and uses counters only for genuine metrics.
                  It respects reduced motion on every generated preview. A direction can request a
                  different use of it, but cannot alter or create a shared capability.
                </p>
              </div>
            </details>
            {testingBehaviours.length ? (
              <section
                className="builder-workflow__testing-behaviour"
                aria-labelledby="builder-testing-behaviour-title"
              >
                <Eyebrow>Testing behaviour</Eyebrow>
                <h5 id="builder-testing-behaviour-title">
                  Select behaviours to stage for the next production draft
                </h5>
                <p>
                  Staged behaviours stay recorded with this package but are removed from the next
                  private test’s behaviour list. Only the behaviours left below remain under test.
                </p>
                <div className="builder-workflow__testing-behaviour-list">
                  {pendingTestingBehaviours.map((behaviour) => (
                    <article
                      className={
                        leavingBehaviourIds.includes(behaviour.id) ? 'is-staging-out' : undefined
                      }
                      key={behaviour.id}
                    >
                      <label>
                        <input
                          checked={selectedBehaviourIds.includes(behaviour.id)}
                          disabled={
                            isStagingBehaviours || leavingBehaviourIds.includes(behaviour.id)
                          }
                          onChange={(event) =>
                            setSelectedBehaviourIds((current) =>
                              event.target.checked
                                ? [...new Set([...current, behaviour.id])]
                                : current.filter((id) => id !== behaviour.id),
                            )
                          }
                          type="checkbox"
                        />
                        <strong>{behaviour.title}</strong>
                      </label>
                      <span className="builder-workflow__behaviour-revision">
                        Behaviour revision · {behaviour.revision}
                      </span>
                      <p className="builder-workflow__behaviour-change">{behaviour.change}</p>
                      <p>{behaviour.detail}</p>
                      {onRequestProposal &&
                      featureHasWorkshopSource(workshopFeatureForBehaviour(behaviour.id)) ? (
                        <Button
                          className="builder-workflow__workshop"
                          onClick={() =>
                            setWorkshopFeature(workshopFeatureForBehaviour(behaviour.id))
                          }
                          size="small"
                          type="button"
                          variant="secondary"
                        >
                          <Wrench aria-hidden="true" size={15} />
                          Workshop behaviour
                        </Button>
                      ) : null}
                    </article>
                  ))}
                </div>
                {stagedBehaviourIds.length ? (
                  <p className="builder-workflow__staged-behaviours">
                    <strong>Already staged:</strong>{' '}
                    {testingBehaviours
                      .filter((behaviour) => visibleStagedBehaviourIds.includes(behaviour.id))
                      .map((behaviour) => behaviour.title)
                      .join(', ')}
                  </p>
                ) : null}
                {pendingTestingBehaviours.length ? (
                  <Button
                    disabled={
                      !onStageBehaviours ||
                      isStagingBehaviours ||
                      !selectedBehaviourIds.some((id) => !stagedBehaviourIds.includes(id))
                    }
                    onClick={() => void stageSelectedBehaviours()}
                    type="button"
                    variant="secondary"
                  >
                    <CheckCheck aria-hidden="true" size={16} />
                    {isStagingBehaviours
                      ? 'Staging behaviours'
                      : 'Stage selected for production draft'}
                  </Button>
                ) : (
                  <p className="muted-copy">
                    Every behaviour in this package is staged for production.
                  </p>
                )}
                {leavingBehaviourIds.length ? (
                  <p aria-live="polite" className="builder-workflow__staging-status" role="status">
                    Moving selected behaviours into the production draft…
                  </p>
                ) : null}
              </section>
            ) : null}
            <FeatureImplementationFiles
              collapsible
              compact
              detail="Open a file to see the exact lines that enable each behaviour for this private test."
              features={testOnlyFeatures}
              heading="Files behind this test"
              onOpenWorkshop={onRequestProposal ? setWorkshopFeature : undefined}
            />
            <Dialog.Root
              onOpenChange={(open) => {
                if (!open) {
                  setWorkshopFeature(undefined);
                  setWorkshopDirection('');
                }
              }}
              open={Boolean(workshopFeature)}
            >
              <Dialog.Portal>
                <Dialog.Overlay className="builder-file-preview-overlay" />
                <Dialog.Content className="foundation-workshop-dialog">
                  <div className="foundation-workshop-dialog__header">
                    <div>
                      <Eyebrow>Foundation workshop</Eyebrow>
                      <Dialog.Title>{workshopFeature?.title}</Dialog.Title>
                      <p>
                        Workshop revision v
                        {selectedAgentPackage?.version ?? publishedPackage?.version ?? 4}.2
                      </p>
                    </div>
                    <StatusBadge tone="success">
                      <Wrench aria-hidden="true" size={14} /> Workshoped
                    </StatusBadge>
                    <Dialog.Close asChild>
                      <IconButton label="Close foundation workshop" variant="quiet">
                        <X aria-hidden="true" size={18} />
                      </IconButton>
                    </Dialog.Close>
                  </div>
                  <p className="muted-copy">
                    Refine this hard-coded JavaScript feature with Codex, then send only the agreed
                    behaviour to a private test package. The page-building agent does not recreate
                    it.
                  </p>
                  <label className="foundation-workshop-dialog__direction">
                    <span>Workshop change for the next test behaviour</span>
                    <textarea
                      maxLength={4000}
                      onChange={(event) => setWorkshopDirection(event.target.value)}
                      placeholder="Describe the agreed change for this feature."
                      rows={5}
                      value={workshopDirection}
                    />
                  </label>
                  <ButtonGroup className="foundation-workshop-dialog__actions">
                    <Button
                      disabled={!workshopDirection.trim() || isSendingWorkshop}
                      onClick={() => void sendWorkshopToTesting()}
                      type="button"
                    >
                      <CheckCheck aria-hidden="true" size={16} />
                      {isSendingWorkshop ? 'Sending to test' : 'Approve & send to test feature'}
                    </Button>
                  </ButtonGroup>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
            <details className="builder-workflow__directions">
              <summary>
                <span>
                  <strong>Advanced · saved test directions</strong>
                  <small>Prefer a conversation with Codex for agent refinements.</small>
                </span>
                <ChevronDown aria-hidden="true" size={18} />
              </summary>
              <div className="builder-workflow__directions-content">
                <div className="builder-workflow__directions-header">
                  <div>
                    <h5 id="builder-directions-title">Add a direction to this test run</h5>
                    <p>
                      Optional guidance stored on this one build run and sent to Codex. It can
                      refine hierarchy, visuals, or interactions, and can identify a capability
                      worth proposing, but it never overrides approved facts, scope, assets, or the
                      locked builder rules.
                    </p>
                  </div>
                  <Button
                    disabled={isRequesting}
                    onClick={() => setBuildDirections((current) => [...current, ''])}
                    type="button"
                    variant="secondary"
                  >
                    <Plus aria-hidden="true" size={16} />
                    {buildDirections.length ? 'Add another' : 'Add direction'}
                  </Button>
                </div>
                {buildDirections.length ? (
                  <div className="builder-workflow__direction-list">
                    {buildDirections.map((direction, index) => (
                      <div className="builder-workflow__direction" key={index}>
                        <label htmlFor={`builder-direction-${index}`}>Direction {index + 1}</label>
                        <span className="builder-workflow__direction-input">
                          <textarea
                            aria-label={`Build direction ${index + 1}`}
                            disabled={isRequesting}
                            id={`builder-direction-${index}`}
                            maxLength={4000}
                            onChange={(event) =>
                              setBuildDirections((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index ? event.target.value : item,
                                ),
                              )
                            }
                            placeholder="For example: make the hero calmer and foreground the booking flow."
                            rows={2}
                            value={direction}
                          />
                          <IconButton
                            disabled={isRequesting}
                            label={`Remove direction ${index + 1}`}
                            onClick={() =>
                              setBuildDirections((current) =>
                                current.filter((_, itemIndex) => itemIndex !== index),
                              )
                            }
                            variant="quiet"
                          >
                            <X aria-hidden="true" size={16} />
                          </IconButton>
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </details>
          </section>
        ) : null}

        {!isTestBuild && !active ? (
          <div className="builder-run__tests">
            <p className="builder-run__action-label">Prospect build</p>
            <div className="builder-page-test">
              <p>
                Build the complete private website for this prospect from its approved Build
                Manifest. This is separate from Agent Studio test runs.
              </p>
              {publishedPackage ? (
                <p className="builder-page-test__production-version">
                  <span>Production version</span>
                  <strong className="agent-production-version-value">
                    {agentPackageVersionLabel(publishedPackage.version)}
                    <AgentProductionNotification count={pendingProductionFeatureCount} />
                  </strong>
                  <small>This exact published version will be pinned to the build.</small>
                </p>
              ) : (
                <p className="form-message form-message--error" role="alert">
                  No production builder version is available. Publish a production package before
                  starting this build.
                </p>
              )}
              <Button
                disabled={isRequesting || !homepageTestReady || !publishedPackage}
                onClick={() => void requestBuild('full_site')}
                type="button"
              >
                <Play aria-hidden="true" size={16} />
                {isRequesting ? 'Queueing prospect build' : 'Build complete prospect website'}
              </Button>
              <small>{homepageRequirementDetail}</small>
            </div>
          </div>
        ) : null}

        <div className="builder-run__primary-actions">
          {!isTestBuild && (run?.status === 'ready' || run?.status === 'review_required') ? (
            <Button
              disabled={isOpeningPreview}
              onClick={() => run && void openPreview(run.id, 'ready')}
              type="button"
            >
              <ArrowUpRight aria-hidden="true" size={16} />
              {isOpeningPreview ? 'Opening preview' : 'Open private prospect preview'}
            </Button>
          ) : null}
          {!isTestBuild &&
          run &&
          (run.status === 'ready' || run.status === 'review_required') &&
          onMoveToAgentStudio ? (
            run.agentStudioSourceAt ? (
              <Button disabled type="button" variant="secondary">
                <Check aria-hidden="true" size={16} />
                Available in Agent Studio
              </Button>
            ) : (
              <Button
                disabled={movingRunId === run.id}
                onClick={() => void moveToAgentStudio(run.id)}
                type="button"
                variant="secondary"
              >
                <FolderTree aria-hidden="true" size={16} />
                {movingRunId === run.id ? 'Moving into Agent Studio' : 'Move to Agent Studio'}
              </Button>
            )
          ) : null}
          {active ? (
            <Button
              disabled={isCancelling || Boolean(run?.cancelRequestedAt)}
              onClick={() => void cancelBuild()}
              type="button"
              variant="secondary"
            >
              <Ban aria-hidden="true" size={16} />
              {isCancelling ? 'Cancelling build' : 'Cancel build'}
            </Button>
          ) : null}
        </div>

        {((run?.status === 'running' || frozenDraft) && draftAvailable) ||
        (run && !active) ||
        (run && runHasUsage && onOpenUsageAnalysis) ? (
          <div className="builder-run__utility-actions">
            {(run?.status === 'running' || frozenDraft) && draftAvailable ? (
              <Button
                disabled={isOpeningPreview}
                onClick={() => run && void openPreview(run.id, 'draft')}
                type="button"
                variant="quiet"
              >
                <ClipboardCheck aria-hidden="true" size={18} />
                {isOpeningPreview
                  ? 'Opening draft'
                  : frozenDraft
                    ? 'Open frozen draft'
                    : 'View working draft'}
              </Button>
            ) : null}
            {run && runHasUsage && onOpenUsageAnalysis ? (
              <Button onClick={() => onOpenUsageAnalysis(run.id)} type="button" variant="quiet">
                <WalletCards aria-hidden="true" size={16} />
                Open usage analysis
              </Button>
            ) : null}
            {run && !active && !isTestBuild ? (
              <Button
                disabled={isDeleting}
                onClick={() => void deleteBuild()}
                type="button"
                variant="quiet"
              >
                <Trash2 aria-hidden="true" size={16} />
                {isDeleting ? 'Deleting builds' : 'Delete test and prospect builds'}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {isTestBuild && studioSourceRuns.length ? (
        <section
          className="test-build-versions test-build-versions--lineage"
          aria-labelledby="agent-studio-version-lineage-title"
        >
          <div className="test-build-versions__header">
            <Eyebrow>Linked whole-site tests</Eyebrow>
            <h4 id="agent-studio-version-lineage-title">Feature test versions</h4>
            <p className="muted-copy">
              Newest first. Each version keeps its source link so another focused feature test can
              continue from any completed point.
            </p>
          </div>
          {studioVersionGroups.map((group, groupIndex) => (
            <ol
              aria-label={`Whole-site test lineage ${studioVersionGroups.length - groupIndex}`}
              key={studioLineageRootId(group[0]!)}
            >
              {group.map((sourceRun, index) => (
                <li
                  className={sourceRun.id === studioSourceBuilderRunId ? 'is-selected' : undefined}
                  key={sourceRun.id}
                >
                  <div className="test-build-versions__summary">
                    <div>
                      <div className="test-build-versions__labels">
                        <strong>
                          {sourceRun.buildMode === 'site_test'
                            ? `Version ${group.length - index}`
                            : 'Original build'}
                        </strong>
                        {index === 0 ? <StatusBadge tone="success">Newest</StatusBadge> : null}
                      </div>
                      <small>
                        {builderRunModeLabel(sourceRun.buildMode)} ·{' '}
                        {formatDateTime(sourceRun.createdAt)}
                      </small>
                      <AgentPackageDetailsDialog agentPackages={agentPackages} run={sourceRun} />
                      <BuilderRunPageDisclosure
                        artifacts={artifactsForCompletedRun(sourceRun)}
                        onLoad={() => void loadHistoryEvidence(sourceRun.id)}
                        run={sourceRun}
                        state={historyEvidence[sourceRun.id]}
                        workspace={workspace}
                      />
                      <p>
                        {sourceRun.agentStudioFeatureId
                          ? `Feature tested: ${agentBehaviourTitle(sourceRun.agentStudioFeatureId)}`
                          : 'Immutable source moved from the prospect build workspace.'}
                      </p>
                      <BuilderRunUsage records={workspace.aiUsageRecords} run={sourceRun} />
                    </div>
                    <ButtonGroup>
                      <Button
                        disabled={isOpeningPreview}
                        onClick={() => void openPreview(sourceRun.id, 'ready')}
                        type="button"
                        variant="primary"
                      >
                        <ArrowUpRight aria-hidden="true" size={16} />
                        Preview website
                      </Button>
                      <BuilderRunFileExplorerDialog
                        artifacts={artifactsForCompletedRun(sourceRun)}
                        label="Browse files"
                        onLoad={() => void loadHistoryEvidence(sourceRun.id)}
                        onViewWebsite={() => openPreview(sourceRun.id, 'ready')}
                        state={historyEvidence[sourceRun.id]}
                      />
                      {onOpenUsageAnalysis &&
                      workspace.aiUsageRecords.some(
                        (record) =>
                          record.builderRunId === sourceRun.id && record.source === 'codex_build',
                      ) ? (
                        <Button
                          onClick={() => onOpenUsageAnalysis(sourceRun.id)}
                          type="button"
                          variant="quiet"
                        >
                          <WalletCards aria-hidden="true" size={16} />
                          Open usage analysis
                        </Button>
                      ) : null}
                      <Button
                        onClick={() => setStudioSourceBuilderRunId(sourceRun.id)}
                        type="button"
                        variant="quiet"
                      >
                        <Check aria-hidden="true" size={16} />
                        Use as source
                      </Button>
                    </ButtonGroup>
                  </div>
                </li>
              ))}
            </ol>
          ))}
        </section>
      ) : null}

      {isTestBuild && completedTestRuns.length ? (
        active || retainedTestContext ? (
          <section className="test-build-versions test-build-versions--collapsed">
            <Eyebrow>Earlier private tests</Eyebrow>
            <h4>Test versions are collapsed while this test is active</h4>
            <p className="muted-copy">
              {completedTestRuns.length} completed test
              {completedTestRuns.length === 1 ? '' : 's'} remain available after this test is
              continued or finished.
            </p>
          </section>
        ) : (
          <section className="test-build-versions" aria-labelledby="test-build-versions-title">
            <div className="test-build-versions__header">
              <div>
                <Eyebrow>Private previews</Eyebrow>
                <h4 id="test-build-versions-title">Test versions</h4>
                <p className="muted-copy">
                  Each completed test is a private preview of the agent contract used for that run.
                </p>
              </div>
            </div>
            <ol>
              {completedTestRuns.map((testRun, index) => (
                <li key={testRun.id}>
                  <div className="test-build-versions__summary">
                    <div>
                      <div className="test-build-versions__labels">
                        <strong>
                          {usageBuildLabel({ builderRunId: testRun.id }, workspace).split(' · ')[0]}
                        </strong>
                        {index === 0 ? (
                          <StatusBadge tone="success">Newest build</StatusBadge>
                        ) : null}
                      </div>
                      <small>
                        {builderRunModeLabel(testRun.buildMode)} ·{' '}
                        {formatDateTime(testRun.createdAt)}
                      </small>
                      <AgentPackageDetailsDialog agentPackages={agentPackages} run={testRun} />
                      <BuilderRunPageDisclosure
                        artifacts={artifactsForCompletedRun(testRun)}
                        onLoad={() => void loadHistoryEvidence(testRun.id)}
                        run={testRun}
                        state={historyEvidence[testRun.id]}
                        workspace={workspace}
                      />
                      <p>{testBuildChangeSummary(testRun, completedTestRuns[index + 1])}</p>
                      <BuilderRunUsage records={workspace.aiUsageRecords} run={testRun} />
                    </div>
                    <ButtonGroup>
                      <Button
                        disabled={isOpeningPreview}
                        onClick={() => void openPreview(testRun.id, 'ready')}
                        type="button"
                        variant="primary"
                      >
                        <ArrowUpRight aria-hidden="true" size={16} />
                        {isOpeningPreview ? 'Opening preview' : 'Preview website'}
                      </Button>
                      <BuilderRunFileExplorerDialog
                        artifacts={artifactsForCompletedRun(testRun)}
                        label="Browse files"
                        onLoad={() => void loadHistoryEvidence(testRun.id)}
                        onViewWebsite={() => openPreview(testRun.id, 'ready')}
                        state={historyEvidence[testRun.id]}
                      />
                      {onOpenUsageAnalysis &&
                      workspace.aiUsageRecords.some(
                        (record) =>
                          record.builderRunId === testRun.id && record.source === 'codex_build',
                      ) ? (
                        <Button
                          onClick={() => onOpenUsageAnalysis(testRun.id)}
                          type="button"
                          variant="quiet"
                        >
                          <WalletCards aria-hidden="true" size={16} />
                          Open usage analysis
                        </Button>
                      ) : null}
                      {onMoveToAgentStudio ? (
                        <Button
                          disabled={movingRunId === testRun.id}
                          onClick={() => void moveToAgentStudio(testRun.id)}
                          type="button"
                          variant="quiet"
                        >
                          <FolderTree aria-hidden="true" size={16} />
                          {movingRunId === testRun.id
                            ? 'Moving into Agent Studio'
                            : 'Move to Agent Studio'}
                        </Button>
                      ) : null}
                    </ButtonGroup>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )
      ) : null}

      {run ? (
        <>
          {run.status === 'failed' ? (
            <>
              <dl className="builder-failure-summary" aria-label="Build failure summary">
                <div>
                  <dt>Stopped during</dt>
                  <dd>{run.progressPhase.replaceAll('_', ' ')}</dd>
                </div>
                <div>
                  <dt>Progress saved</dt>
                  <dd>
                    {run.totalItems > 0 ? `${run.completedItems} of ${run.totalItems} steps` : '—'}
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <>
              {active ? (
                <section
                  aria-live="polite"
                  aria-labelledby="builder-current-step-title"
                  className="builder-current-step"
                >
                  <div>
                    <Eyebrow>Live worker status</Eyebrow>
                    <h4 id="builder-current-step-title">Current step</h4>
                  </div>
                  <StatusBadge tone="warning">Live updates</StatusBadge>
                  <strong>{builderProgressPhaseLabel(run.progressPhase)}</strong>
                  <p>
                    {run.progressDetail || 'Waiting for the builder worker to save its first step.'}
                  </p>
                  <small>
                    {latestSavedWorkerEvent
                      ? `Last saved worker update: ${latestSavedWorkerEvent.message}`
                      : 'Listening for the first saved worker update.'}
                  </small>
                  <small>Live stream checks for new saved worker activity every second.</small>
                </section>
              ) : null}
              <section
                className="builder-run-overview"
                aria-labelledby="builder-run-overview-title"
              >
                <div className="builder-run-overview__header">
                  <Eyebrow>Current run</Eyebrow>
                  <h4 id="builder-run-overview-title">Build status</h4>
                </div>
                <dl className="builder-run-summary" aria-label="Private preview build progress">
                  <div>
                    <dt>Build stage</dt>
                    <dd>{builderProgressPhaseLabel(run.progressPhase)}</dd>
                  </div>
                  <div>
                    <dt>Completed milestones</dt>
                    <dd>
                      <Button
                        aria-label="Open build milestones"
                        className="builder-run-summary__action"
                        onClick={() => setInspector('steps')}
                        variant="inline"
                      >
                        {run.totalItems > 0 ? `${run.completedItems}/${run.totalItems}` : '—'}
                      </Button>
                    </dd>
                  </div>
                  <div>
                    <dt>Quality status</dt>
                    <dd>{run.qualitySummary.status.replaceAll('_', ' ')}</dd>
                  </div>
                  {!isTestBuild ? (
                    <div>
                      <dt>Production version</dt>
                      <dd className="agent-production-version-value">
                        {agentPackageVersionLabel(run.agentPackageVersion)}
                        {run.agentPackageVersion === publishedPackage?.version ? (
                          <AgentProductionNotification count={pendingProductionFeatureCount} />
                        ) : null}
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>Build files</dt>
                    <dd>
                      <Button
                        aria-label={`Browse ${sourceFiles.length + previewFiles.length} generated build files`}
                        className="builder-run-summary__action"
                        onClick={() => setInspector('files')}
                        variant="inline"
                      >
                        <FolderTree aria-hidden="true" size={16} />
                        Browse files · {sourceFiles.length + previewFiles.length}
                      </Button>
                    </dd>
                  </div>
                </dl>
              </section>
            </>
          )}
          <p className="builder-run__detail" role={active ? 'status' : undefined}>
            {run.progressDetail || 'Waiting for the builder worker.'}
          </p>
          {isTestBuild && !active ? (
            <TestDirectionResults
              artifacts={currentArtifacts}
              onOpen={
                historyRuns[0] ? () => void loadHistoryEvidence(historyRuns[0].id) : undefined
              }
              previousArtifacts={
                latestHistoryState?.status === 'ready' ? latestHistoryState.evidence.artifacts : []
              }
              run={run}
            />
          ) : null}
          {showCurrentRunLogs ? (
            <div className="builder-activity-heading">
              <Eyebrow>Current run</Eyebrow>
              <h3>Build activity</h3>
              <p className="muted-copy">
                Saved Codex updates, diagnostics, and completed build stages for this run only.
                While a build is active, this refreshes automatically as the worker saves each
                update.
              </p>
              {active && !currentEvents.length ? (
                <BuilderActivityWaiting
                  detail="The build is queued or preparing. This panel will populate as the worker saves activity."
                  label="Waiting for the builder to report activity"
                />
              ) : currentRunEvidenceLoading ? (
                <BuilderActivityWaiting
                  detail="Loading the saved activity, files, diagnostics, and responsive evidence for this prospect build."
                  label="Loading prospect build activity"
                />
              ) : null}
              {currentRunEvidenceError ? (
                <p className="form-message form-message--error" role="alert">
                  {currentRunEvidenceError}
                </p>
              ) : null}
            </div>
          ) : null}
          {showCurrentRunLogs ? (
            <section className="builder-codex-stream" aria-labelledby="builder-codex-stream-title">
              <div className="builder-codex-stream__header">
                <div>
                  <Eyebrow>Codex activity</Eyebrow>
                  <h4 id="builder-codex-stream-title">
                    {active ? 'Live build stream' : 'Latest completed build'}
                  </h4>
                </div>
                {active ? <StatusBadge tone="warning">Live</StatusBadge> : null}
              </div>
              {codexStreamEvents.length ? (
                <ol aria-live="polite" aria-relevant="additions text" role="log">
                  {codexStreamEvents
                    .slice(0, 24)
                    .reverse()
                    .map((event) => (
                      <BuilderNewActivityItem isNew={newActivityIds.has(event.id)} key={event.id}>
                        <strong>Codex</strong>
                        <span>{event.message}</span>
                        <time dateTime={event.createdAt}>{formatDate(event.createdAt)}</time>
                      </BuilderNewActivityItem>
                    ))}
                </ol>
              ) : active || currentRunEvidenceLoading ? (
                <BuilderActivityWaiting
                  detail={
                    active
                      ? 'The working preview appears after Codex saves its first private draft.'
                      : 'Loading the saved Codex stream for this prospect build.'
                  }
                  label={active ? 'Codex is preparing its first update' : 'Loading Codex activity'}
                />
              ) : (
                <p className="muted-copy">No visible Codex activity was recorded for this build.</p>
              )}
            </section>
          ) : null}
          {showCurrentRunLogs ? (
            <section className="builder-diagnostics" aria-labelledby="builder-diagnostics-title">
              <div className="builder-diagnostics__header">
                <div>
                  <Eyebrow>Build diagnostics</Eyebrow>
                  <h4 id="builder-diagnostics-title">Worker, terminal, and browser output</h4>
                </div>
                <StatusBadge tone="neutral">Private</StatusBadge>
              </div>
              {diagnosticEvents.length ? (
                <ol aria-live={active ? 'polite' : 'off'}>
                  {diagnosticEvents
                    .slice(0, 32)
                    .reverse()
                    .map((event) => {
                      const scope = diagnosticMetadata(event, 'scope');
                      const detail = diagnosticMetadata(event, 'detail');
                      const command = diagnosticMetadata(event, 'command');
                      const stdout = diagnosticMetadata(event, 'stdout');
                      const stderr = diagnosticMetadata(event, 'stderr');
                      const duration = diagnosticMetadata(event, 'durationMs');
                      return (
                        <BuilderNewActivityItem isNew={newActivityIds.has(event.id)} key={event.id}>
                          <details>
                            <summary>
                              <StatusBadge tone={diagnosticTone(event)}>
                                {diagnosticMetadata(event, 'status') || 'completed'}
                              </StatusBadge>
                              <span>
                                <strong>{event.message}</strong>
                                <small>
                                  {[scope, duration ? `${duration} ms` : undefined]
                                    .filter(Boolean)
                                    .join(' - ')}
                                </small>
                              </span>
                              <time dateTime={event.createdAt}>{formatDate(event.createdAt)}</time>
                            </summary>
                            {detail || command || stdout || stderr ? (
                              <div className="builder-diagnostics__body">
                                {detail ? <p>{detail}</p> : null}
                                {command ? <code>{command}</code> : null}
                                {stdout ? (
                                  <details>
                                    <summary>Standard output</summary>
                                    <pre>{stdout}</pre>
                                  </details>
                                ) : null}
                                {stderr ? (
                                  <details>
                                    <summary>Standard error</summary>
                                    <pre>{stderr}</pre>
                                  </details>
                                ) : null}
                              </div>
                            ) : null}
                          </details>
                        </BuilderNewActivityItem>
                      );
                    })}
                </ol>
              ) : (
                <p className="muted-copy">
                  {active || currentRunEvidenceLoading
                    ? 'Waiting for the worker to record its first diagnostic.'
                    : 'No private diagnostics were recorded for this build.'}
                </p>
              )}
            </section>
          ) : null}
          {showCurrentRunLogs && timelineEvents.length ? (
            <section className="builder-timeline" aria-labelledby="builder-timeline-title">
              <Eyebrow>{active ? 'Live build timeline' : 'Latest build timeline'}</Eyebrow>
              <h4 id="builder-timeline-title">What the builder has completed</h4>
              <ol>
                {timelineEvents
                  .slice(-16)
                  .reverse()
                  .map((event) => (
                    <BuilderNewActivityItem isNew={newActivityIds.has(event.id)} key={event.id}>
                      <BuilderTimelineItem event={event} />
                    </BuilderNewActivityItem>
                  ))}
              </ol>
            </section>
          ) : null}
          {run.errorSummary ? (
            <p className="form-message form-message--error" role="alert">
              {run.errorSummary}
            </p>
          ) : null}
          {run.failureCode ? (
            <section className="builder-recovery" aria-labelledby="builder-recovery-title">
              <Eyebrow>Build recovery</Eyebrow>
              <h4 id="builder-recovery-title">What needs attention</h4>
              <dl>
                <div>
                  <dt>Failed stage</dt>
                  <dd>{run.failureStage?.replaceAll('_', ' ') || 'builder runtime'}</dd>
                </div>
                <div>
                  <dt>Failure code</dt>
                  <dd>{run.failureCode.replaceAll('_', ' ')}</dd>
                </div>
                <div>
                  <dt>Saved output</dt>
                  <dd>
                    {draftAvailable
                      ? 'A private draft was preserved.'
                      : checkpointAvailable
                        ? 'A private source checkpoint was preserved for resume.'
                        : savedSourceAvailable
                          ? 'Saved private source files were preserved for resume.'
                          : 'No viewable draft was saved before the build stopped.'}
                  </dd>
                </div>
                <div>
                  <dt>Attempts</dt>
                  <dd>
                    {typeof run.failureContext.attempt === 'number'
                      ? run.failureContext.attempt
                      : 'Not recorded'}
                  </dd>
                </div>
                {failedOutputPath ? (
                  <div>
                    <dt>Affected output</dt>
                    <dd>
                      {failedOutputPath}
                      {failedStorageOperation ? ` (${failedStorageOperation})` : ''}
                    </dd>
                  </div>
                ) : null}
                {!failedOutputPath && failedStorageOperation ? (
                  <div>
                    <dt>Failed operation</dt>
                    <dd>{failedStorageOperation}</dd>
                  </div>
                ) : null}
                {failedQualityPage ? (
                  <div>
                    <dt>Quality target</dt>
                    <dd>
                      {failedQualityPage}
                      {failedQualityViewport ? ` (${failedQualityViewport})` : ''}
                      {failedStorageOperation ? ` - ${failedStorageOperation}` : ''}
                    </dd>
                  </div>
                ) : null}
                {failedDiagnostic ? (
                  <div>
                    <dt>Diagnostic</dt>
                    <dd>{failedDiagnostic}</dd>
                  </div>
                ) : null}
              </dl>
              <p>{run.failureAction || 'Review the timeline, then start a clean build.'}</p>
              {run.retryAfter ? (
                <p className="muted-copy">
                  One automatic retry is scheduled for {formatDate(run.retryAfter)}.
                </p>
              ) : null}
            </section>
          ) : null}

          {run.qualitySummary.checks.length ? (
            <section className="builder-quality" aria-labelledby="builder-quality-title">
              <Eyebrow>Quality checks</Eyebrow>
              <h4 id="builder-quality-title">Generated preview review</h4>
              <ul>
                {run.qualitySummary.checks.map((check) => (
                  <li key={check.id}>
                    <strong>{check.label}</strong>
                    <span>{check.detail}</span>
                    <StatusBadge
                      tone={
                        check.status === 'passed'
                          ? 'success'
                          : check.status === 'failed'
                            ? 'danger'
                            : 'warning'
                      }
                    >
                      {check.status.replaceAll('_', ' ')}
                    </StatusBadge>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {screenshots.length ? (
            <section className="builder-screenshots" aria-labelledby="builder-screenshots-title">
              <Eyebrow>Responsive captures</Eyebrow>
              <h4 id="builder-screenshots-title">Generated website</h4>
              {loadError ? (
                <p className="form-message form-message--error" role="alert">
                  {loadError}
                </p>
              ) : null}
              <div>
                {screenshots.map((screenshot) =>
                  screenshotUrls[screenshot.id] ? (
                    <ExpandableImage
                      alt={`${screenshot.label} of the generated private preview`}
                      className="builder-screenshots__image"
                      key={screenshot.id}
                      label={screenshot.label}
                      src={screenshotUrls[screenshot.id]}
                    >
                      <img
                        alt={`${screenshot.label} of the generated private preview`}
                        src={screenshotUrls[screenshot.id]}
                      />
                      <span>{screenshot.label}</span>
                      <ImageFileType
                        contentType={screenshot.contentType}
                        path={screenshot.storagePath}
                      />
                    </ExpandableImage>
                  ) : null,
                )}
              </div>
            </section>
          ) : null}
          <Dialog.Root
            onOpenChange={(open) => !open && setInspector(undefined)}
            open={Boolean(inspector)}
          >
            <Dialog.Portal>
              <Dialog.Overlay className="builder-settings-overlay" />
              <Dialog.Content
                aria-describedby="builder-run-inspector-description"
                className={`builder-settings-panel builder-run-inspector${
                  inspector === 'files' ? ' builder-run-inspector--files' : ''
                }`}
              >
                <div className="builder-settings-panel__header">
                  <div>
                    <Eyebrow>Current run</Eyebrow>
                    <Dialog.Title>
                      {inspector === 'steps' ? 'Build milestones' : 'Generated files'}
                    </Dialog.Title>
                  </div>
                  <Dialog.Close asChild>
                    <IconButton label="Close build inspector" variant="quiet">
                      <X aria-hidden="true" size={20} />
                    </IconButton>
                  </Dialog.Close>
                </div>
                <Dialog.Description className="muted-copy" id="builder-run-inspector-description">
                  {inspector === 'steps'
                    ? 'The same counted milestones shown in Build status. Detailed worker events remain in Build activity.'
                    : 'Browse the saved project source and compiled website output from this build only.'}
                </Dialog.Description>
                {inspector === 'steps' ? (
                  progressMilestones.length ? (
                    <ol className="builder-run-inspector__steps">
                      {progressMilestones.map((milestone, index) => {
                        const completed = index < run.completedItems;
                        return (
                          <li key={milestone}>
                            <StatusBadge tone={completed ? 'success' : 'neutral'}>
                              {completed ? 'completed' : 'pending'}
                            </StatusBadge>
                            <span>
                              <strong>{milestone}</strong>
                              <small>
                                Milestone {index + 1} of {progressMilestones.length}
                              </small>
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <p className="muted-copy">No build milestones have been recorded yet.</p>
                  )
                ) : (
                  <BuilderFileExplorer
                    artifacts={currentArtifacts}
                    onViewWebsite={
                      run.status === 'ready' || run.status === 'review_required'
                        ? () => openPreview(run.id, 'ready')
                        : undefined
                    }
                  />
                )}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </>
      ) : (
        <p className="muted-copy">
          {isTestBuild
            ? 'No test build has been generated from this manifest yet.'
            : 'No prospect build has been generated from this manifest yet.'}
        </p>
      )}

      {historyRuns.length ? (
        <section className="builder-history" aria-labelledby="builder-history-title">
          <Eyebrow>{isTestBuild ? 'Test build history' : 'Prospect build history'}</Eyebrow>
          <h4 id="builder-history-title">Open a run to inspect its private logs</h4>
          <p className="muted-copy">
            Stored {isTestBuild ? 'test' : 'prospect'} build evidence stays out of the current
            workspace. Open a run only when you need to inspect its private logs or responsive
            captures.
          </p>
          <div>
            {historyRuns.map((earlierRun, index) => {
              const previousRun = historyRuns[index + 1];
              return (
                <BuilderHistoryEntry
                  key={earlierRun.id}
                  onLoad={loadHistoryEvidence}
                  onLoadPrevious={
                    previousRun ? () => void loadHistoryEvidence(previousRun.id) : undefined
                  }
                  onViewWebsite={
                    earlierRun.status === 'ready' || earlierRun.status === 'review_required'
                      ? () => openPreview(earlierRun.id, 'ready')
                      : undefined
                  }
                  previousState={previousRun ? historyEvidence[previousRun.id] : undefined}
                  run={earlierRun}
                  state={historyEvidence[earlierRun.id]}
                />
              );
            })}
          </div>
        </section>
      ) : null}

      {message && !(isTestBuild && !active && !retainedTestContext) ? (
        <p className="form-message form-message--error" role="alert">
          {message}
        </p>
      ) : null}
    </section>
  );
}

function BuilderSettingsControl({
  compact = false,
  iconOnly = false,
}: {
  compact?: boolean;
  iconOnly?: boolean;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        {iconOnly ? (
          <IconButton label="Builder settings" variant="secondary">
            <Settings aria-hidden="true" size={18} />
          </IconButton>
        ) : (
          <Button size={compact ? 'small' : 'default'} variant="secondary">
            <SlidersHorizontal aria-hidden="true" size={16} /> Builder settings
          </Button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="builder-settings-overlay" />
        <Dialog.Content
          aria-describedby="builder-settings-description"
          className="builder-settings-panel"
        >
          <div className="builder-settings-panel__header">
            <div>
              <Eyebrow>Protected runtime</Eyebrow>
              <Dialog.Title>Builder settings</Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <IconButton label="Close builder settings" variant="quiet">
                <X aria-hidden="true" size={20} />
              </IconButton>
            </Dialog.Close>
          </div>
          <Dialog.Description className="muted-copy" id="builder-settings-description">
            These settings describe the protected environment used for every private website build.
            They are managed on the worker, not in the browser.
          </Dialog.Description>
          <dl className="builder-settings-list">
            <div>
              <dt>Codex model</dt>
              <dd>gpt-5.6</dd>
            </div>
            <div>
              <dt>Workspace access</dt>
              <dd>Workspace write only</dd>
            </div>
            <div>
              <dt>Preview access</dt>
              <dd>Private, expiring links</dd>
            </div>
            <div>
              <dt>Quality checks</dt>
              <dd>Build, responsive capture, and axe</dd>
            </div>
          </dl>
          <section
            className="builder-settings-package"
            aria-labelledby="builder-settings-package-title"
          >
            <div>
              <Eyebrow>Shared builder package</Eyebrow>
              <h3 id="builder-settings-package-title">What every build receives</h3>
              <p className="muted-copy">
                These source-controlled foundation files are locked during a build. Codex creates
                each prospect’s visual system and site components inside that boundary.
              </p>
            </div>
            <dl>
              <div>
                <dt>Builder contract</dt>
                <dd>
                  <code>worker/codex-builder-contract.md</code>
                  <span>Evidence, brand, page coverage, accessibility, and motion boundaries.</span>
                </dd>
              </div>
              <div>
                <dt>Template guidance</dt>
                <dd>
                  <code>worker/builder-template/AGENTS.md</code>
                  <span>
                    Mobile-first Next.js architecture and site-specific component-system rules.
                  </span>
                </dd>
              </div>
              <div>
                <dt>Built-in motion</dt>
                <dd>
                  <code>worker/builder-template/src/components/foundation/site-runtime.tsx</code>
                  <span>Viewport reveals, factual counters, and reduced-motion support.</span>
                </dd>
              </div>
              <div>
                <dt>Quality gate</dt>
                <dd>
                  <code>worker/builder-worker.mjs</code>
                  <span>
                    Framework verification, route coverage, responsive interactions, captures, and
                    axe.
                  </span>
                </dd>
              </div>
            </dl>
          </section>
          <section
            className="builder-settings-panel__notice"
            aria-label="Runtime configuration notice"
          >
            <ShieldAlert aria-hidden="true" size={18} />
            <p>
              To change the model, update <code>SITEFORGE_CODEX_MODEL</code> in the builder worker
              environment, then restart the worker. That prevents a workspace member from changing a
              protected runtime setting for other builds.
            </p>
          </section>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type ManagedRecordKind = 'capture' | 'asset_analysis' | 'brief' | 'manifest' | 'build';

type ManagedRecord = {
  id: string;
  kind: ManagedRecordKind;
  label: string;
  date: string;
  size: number;
  sizeIsEstimated?: boolean;
  tab: WorkspaceTab;
  versionId?: string;
  workspace: ProspectWorkspace;
};

function DataManagementPanel({
  workspaces,
  onOpen,
  onDelete,
  onDeletePackage,
}: {
  workspaces: ProspectWorkspace[];
  onOpen: (workspace: ProspectWorkspace, tab: WorkspaceTab, versionId?: string) => void;
  onDelete: (kind: ManagedRecordKind, id: string) => Promise<void>;
  onDeletePackage: (businessId: string, redesignBriefId: string) => Promise<void>;
}) {
  const [pending, setPending] = useState<{
    kind: ManagedRecordKind;
    id: string;
    name: string;
  }>();
  const [pendingPackage, setPendingPackage] = useState<{
    businessId: string;
    redesignBriefId: string;
    name: string;
    recordCount: number;
  }>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<ManagedRecord>();
  const records = workspaces.flatMap((workspace) => {
    const entries: Array<Omit<ManagedRecord, 'workspace'>> = [];
    for (const capture of workspace.captures) {
      entries.push({
        id: capture.id,
        kind: 'capture',
        label: `Capture · ${capture.status}`,
        date: capture.requestedAt,
        size: workspace.artifacts
          .filter((artifact) => artifact.crawlRunId === capture.id)
          .reduce((total, artifact) => total + (artifact.byteSize ?? 0), 0),
        tab: 'research',
      });
    }
    for (const analysis of workspace.assetAnalysisJobs) {
      entries.push({
        id: analysis.id,
        kind: 'asset_analysis',
        label: `Asset analysis · ${analysis.status}`,
        date: analysis.createdAt,
        size: workspace.artifacts
          .filter(
            (artifact) => artifact.kind === 'asset' && artifact.crawlRunId === analysis.crawlRunId,
          )
          .reduce((total, artifact) => total + (artifact.byteSize ?? 0), 0),
        tab: 'assets',
      });
    }
    for (const brief of workspace.redesignBriefs) {
      entries.push({
        id: brief.id,
        kind: 'brief',
        label: `Brief v${brief.version} · ${brief.status}`,
        date: brief.updatedAt,
        size: storedMetadataSize(brief),
        sizeIsEstimated: true,
        tab: 'brief',
        versionId: brief.id,
      });
    }
    for (const manifest of workspace.buildManifests) {
      const brief = workspace.redesignBriefs.find((item) => item.id === manifest.redesignBriefId);
      entries.push({
        id: manifest.id,
        kind: 'manifest',
        label: `Build Manifest${brief ? ` · Version ${brief.version}` : ''}`,
        date: manifest.generatedAt,
        size: storedMetadataSize(manifest),
        sizeIsEstimated: true,
        tab: 'redesign',
        versionId: manifest.redesignBriefId,
      });
    }
    for (const run of workspace.builderRuns) {
      const manifest = workspace.buildManifests.find((item) => item.id === run.buildManifestId);
      entries.push({
        id: run.id,
        kind: 'build',
        label: `Build · ${run.status}`,
        date: run.updatedAt,
        size: workspace.builderArtifacts.reduce(
          (total, artifact) => total + (artifact.byteSize ?? 0),
          0,
        ),
        tab: 'redesign',
        versionId: manifest?.redesignBriefId,
      });
    }
    return entries.map((entry) => ({ ...entry, workspace }));
  });
  const prospectGroups = records.reduce<
    Map<
      string,
      {
        workspace: ProspectWorkspace;
        sourceRecords: ManagedRecord[];
        versions: Map<string, ManagedRecord[]>;
      }
    >
  >((groups, record) => {
    const existing = groups.get(record.workspace.business.id) ?? {
      workspace: record.workspace,
      sourceRecords: [],
      versions: new Map<string, ManagedRecord[]>(),
    };
    if (record.versionId) {
      existing.versions.set(record.versionId, [
        ...(existing.versions.get(record.versionId) ?? []),
        record,
      ]);
    } else {
      existing.sourceRecords.push(record);
    }
    groups.set(record.workspace.business.id, existing);
    return groups;
  }, new Map());

  async function confirmDelete() {
    if (!pending && !pendingPackage) return;
    setIsDeleting(true);
    setError('');
    try {
      if (pendingPackage) {
        await onDeletePackage(pendingPackage.businessId, pendingPackage.redesignBriefId);
      } else if (pending) {
        await onDelete(pending.kind, pending.id);
      }
      setPending(undefined);
      setPendingPackage(undefined);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? `${caught.message} Delete dependent builds, manifests, or briefs first.`
          : 'This record has dependent data. Delete those records first.',
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="workspace-panel data-management" aria-labelledby="data-management-title">
      <div>
        <Eyebrow>Saved workspace data</Eyebrow>
        <h2 id="data-management-title">Data management</h2>
        <p className="muted-copy">
          Open a record in its prospect workspace or delete it permanently. Source records stay
          protected while a brief, manifest, or build still depends on them.
        </p>
      </div>
      {records.length ? (
        <div className="data-management__list">
          {[...prospectGroups.values()].map(({ workspace, sourceRecords, versions }) => (
            <section className="data-management__prospect" key={workspace.business.id}>
              <div className="data-management__prospect-title">
                <div>
                  <strong>{workspace.business.name}</strong>
                  <span>
                    {versions.size} {versions.size === 1 ? 'brief version' : 'brief versions'} ·{' '}
                    {sourceRecords.length}{' '}
                    {sourceRecords.length === 1 ? 'source record' : 'source records'}
                  </span>
                </div>
              </div>
              {sourceRecords.length ? (
                <section className="data-management__record-set" aria-label="Source records">
                  <h3>Source records</h3>
                  {sourceRecords.map((record) => (
                    <DataManagementRecord
                      key={`${record.kind}-${record.id}`}
                      onDelete={() =>
                        setPending({ kind: record.kind, id: record.id, name: record.label })
                      }
                      onOpen={() => setSelected(record)}
                      record={record}
                    />
                  ))}
                </section>
              ) : null}
              {[...versions.entries()]
                .sort(([, left], [, right]) => right[0].date.localeCompare(left[0].date))
                .map(([versionId, versionRecords]) => {
                  const brief = versionRecords.find((record) => record.kind === 'brief');
                  const versionLabel = brief?.label.match(/Brief v(\d+)/)?.[1] ?? 'workspace';
                  return (
                    <section
                      className="data-management__version"
                      key={versionId}
                      aria-label={`Build package for brief version ${versionLabel}`}
                    >
                      <div className="data-management__version-title">
                        <div>
                          <h3>Build package · Brief v{versionLabel}</h3>
                          <span>{versionRecords.length} linked records</span>
                        </div>
                        <Button
                          onClick={() =>
                            setPendingPackage({
                              businessId: workspace.business.id,
                              redesignBriefId: versionId,
                              name: `${workspace.business.name} build package`,
                              recordCount: versionRecords.length,
                            })
                          }
                          variant="quiet"
                        >
                          <Trash2 aria-hidden="true" size={16} /> Delete package
                        </Button>
                      </div>
                      {versionRecords.map((record) => (
                        <DataManagementRecord
                          key={`${record.kind}-${record.id}`}
                          onDelete={() =>
                            setPending({ kind: record.kind, id: record.id, name: record.label })
                          }
                          onOpen={() => setSelected(record)}
                          record={record}
                        />
                      ))}
                    </section>
                  );
                })}
            </section>
          ))}
        </div>
      ) : (
        <p className="muted-copy">No saved captures, analyses, briefs, manifests, or builds yet.</p>
      )}
      <ConfirmationDialog
        confirmLabel="Delete permanently"
        detail={
          pendingPackage
            ? `Delete ${pendingPackage.name}, including its brief, Build Manifest, ${pendingPackage.recordCount} linked records, and any private build output? This cannot be undone.`
            : `Delete ${pending?.name ?? 'this record'} permanently? This cannot be undone.`
        }
        error={error}
        isConfirming={isDeleting}
        onConfirm={() => void confirmDelete()}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setPending(undefined);
            setPendingPackage(undefined);
            setError('');
          }
        }}
        open={Boolean(pending || pendingPackage)}
        title={pendingPackage ? 'Delete build package' : 'Delete saved record'}
      />
      <Dialog.Root
        onOpenChange={(open) => !open && setSelected(undefined)}
        open={Boolean(selected)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="builder-settings-overlay" />
          <Dialog.Content className="data-record-dialog">
            <div className="data-record-dialog__header">
              <div>
                <Eyebrow>Saved record</Eyebrow>
                <Dialog.Title>{selected?.label}</Dialog.Title>
                <Dialog.Description>{selected?.workspace.business.name}</Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <IconButton label="Close record details" variant="quiet">
                  <X aria-hidden="true" size={18} />
                </IconButton>
              </Dialog.Close>
            </div>
            <dl className="data-record-dialog__details">
              <div>
                <dt>Prospect</dt>
                <dd>{selected?.workspace.business.name}</dd>
              </div>
              <div>
                <dt>Saved</dt>
                <dd>{selected ? formatDateTime(selected.date) : '—'}</dd>
              </div>
              <div>
                <dt>Storage</dt>
                <dd>
                  {selected?.sizeIsEstimated ? 'Metadata ' : ''}
                  {selected ? formatStorageSize(selected.size) : '—'}
                </dd>
              </div>
            </dl>
            <div className="data-record-dialog__actions">
              <Dialog.Close asChild>
                <Button variant="secondary">Close</Button>
              </Dialog.Close>
              <Button
                onClick={() => {
                  if (selected) onOpen(selected.workspace, selected.tab, selected.versionId);
                }}
                variant="primary"
              >
                Open prospect <ArrowUpRight aria-hidden="true" size={16} />
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}

function DataManagementRecord({
  record,
  onOpen,
  onDelete,
}: {
  record: ManagedRecord;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="data-management__record">
      <div className="data-management__record-summary">
        <strong>{record.label}</strong>
        <small>Saved {formatDateTime(record.date)}</small>
      </div>
      <span className="data-management__size">
        {record.sizeIsEstimated ? 'Metadata ' : ''}
        {formatStorageSize(record.size)}
      </span>
      <div className="data-management__actions">
        <Button aria-label={`Open ${record.label}`} onClick={onOpen} variant="secondary">
          Open <ArrowUpRight aria-hidden="true" size={15} />
        </Button>
        <IconButton
          className="data-management__delete"
          label={`Delete ${record.label} for ${record.workspace.business.name}`}
          onClick={onDelete}
          title={`Delete ${record.label}`}
          variant="quiet"
        >
          <Trash2 aria-hidden="true" size={17} />
        </IconButton>
      </div>
    </div>
  );
}

function DataManagementPage({
  workspaces,
  onOpenWorkspace,
  onDeleteRecord,
  onDeletePackage,
}: {
  workspaces: ProspectWorkspace[];
  onOpenWorkspace: (workspace: ProspectWorkspace, tab: WorkspaceTab, versionId?: string) => void;
  onDeleteRecord: (kind: ManagedRecordKind, id: string) => Promise<void>;
  onDeletePackage: (businessId: string, redesignBriefId: string) => Promise<void>;
}) {
  return (
    <section className="settings-page" aria-labelledby="data-page-title">
      <Eyebrow>Workspace records</Eyebrow>
      <h1 id="data-page-title">Data</h1>
      <DataManagementPanel
        onDelete={onDeleteRecord}
        onDeletePackage={onDeletePackage}
        onOpen={onOpenWorkspace}
        workspaces={workspaces}
      />
    </section>
  );
}

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value > 0 && value < 0.01 ? 4 : 2,
    maximumFractionDigits: value > 0 && value < 0.01 ? 4 : 2,
  }).format(value);
}

function formatTokens(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: value >= 10_000 ? 'compact' : 'standard',
  }).format(value);
}

function UsageMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="usage-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function usageSourceLabel(source: AiUsageRecord['source']) {
  if (source === 'codex_build') return 'Codex build';
  if (source === 'asset_analysis') return 'Asset analysis';
  return 'Capability analysis';
}

function usageBuildLabel(
  record: Pick<AiUsageRecord, 'builderRunId'>,
  workspace: ProspectWorkspace,
) {
  if (!record.builderRunId) return 'Not a build run';
  const run = workspace.builderRuns.find((candidate) => candidate.id === record.builderRunId);
  if (!run) return 'Archived build';
  if (run.buildMode === 'full_site') return 'Complete prospect build';
  const testRuns = workspace.builderRuns
    .filter((candidate) => candidate.buildMode !== 'full_site')
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const testNumber = testRuns.findIndex((candidate) => candidate.id === run.id) + 1;
  return `${testNumber ? `Test ${testNumber} · ` : ''}${builderRunModeLabel(run.buildMode)}`;
}

function serializedByteSize(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function formatByteSize(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(value >= 100 * 1024 ? 0 : 1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function usagePercentage(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

type BuildUsageAnalysisRow = {
  builderRunId: string;
  workspace: ProspectWorkspace;
  run?: BuilderRun;
  manifest?: BuildManifest;
  agentPackage?: AgentPackage;
  records: AiUsageRecord[];
  events: BuilderEvent[];
  models: string[];
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  recordedCost: number;
  unpricedCount: number;
  recordedAt: string;
};

function BuildUsageAnalysis({
  row,
  onOpenWorkspace,
}: {
  row: BuildUsageAnalysisRow;
  onOpenWorkspace: (businessId: string) => void;
}) {
  const buildContext = [...row.records]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((record) => record.metadata.buildContext)
    .find(
      (value): value is Record<string, unknown> =>
        typeof value === 'object' && value !== null && !Array.isArray(value),
    );
  const contextNumber = (key: string) => {
    const value = buildContext?.[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  };
  const contextStringList = (key: string) => {
    const value = buildContext?.[key];
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  };
  const contextCountRecord = (key: string) => {
    const value = buildContext?.[key];
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter(
        (entry): entry is [string, number] =>
          typeof entry[1] === 'number' && Number.isFinite(entry[1]),
      ),
    );
  };
  const freshInputTokens = Math.max(row.inputTokens - row.cachedInputTokens, 0);
  const cachedInputRate = usagePercentage(row.cachedInputTokens, row.inputTokens);
  const outputRate = usagePercentage(row.outputTokens, row.totalTokens);
  const manifestBytes = row.manifest ? serializedByteSize(row.manifest.data) : 0;
  const manifestSections = row.manifest
    ? Object.entries(row.manifest.data)
        .map(([label, value]) => ({
          label,
          bytes: serializedByteSize(value),
          items: Array.isArray(value) ? value.length : undefined,
        }))
        .sort((left, right) => right.bytes - left.bytes)
        .slice(0, 6)
    : [];
  const selectedRouteCount =
    row.run?.buildMode === 'homepage_test'
      ? 1
      : row.run?.targetSourceUrls?.length ||
        (row.run?.targetSourceUrl ? 1 : buildManifestSelectedPages(row.manifest).length);
  const stagedManifestBytes = contextNumber('stagedManifestBytes');
  const fullManifestBytes = contextNumber('fullManifestBytes') ?? manifestBytes;
  const contextReduction = contextNumber('reductionPercent');
  const stagedAssetCount = contextNumber('stagedAssetCount');
  const applicableContracts = contextStringList('applicableContracts');
  const fullSectionCounts = contextCountRecord('fullSectionCounts');
  const stagedSectionCounts = contextCountRecord('stagedSectionCounts');
  const projectedSections = Object.keys(fullSectionCounts)
    .map((label) => ({
      label,
      full: fullSectionCounts[label],
      staged: stagedSectionCounts[label] ?? 0,
    }))
    .filter((section) => section.full !== section.staged)
    .sort((left, right) => right.full - right.staged - (left.full - left.staged))
    .slice(0, 6);
  const reusedCheckpoint = row.events.some(
    (event) =>
      event.metadata.codexInvocationSkipped === true ||
      /without another Codex pass/i.test(event.message),
  );
  const failedCodexToolEvents = row.events.filter(
    (event) =>
      event.kind === 'diagnostic' &&
      event.metadata.status === 'failed' &&
      event.metadata.scope === 'codex_tool',
  );
  const relevantEvents = row.events
    .filter(
      (event) =>
        event.kind === 'error' ||
        event.kind === 'diagnostic' ||
        event.metadata.status === 'failed' ||
        /retry|restart|resume|requeue|checkpoint|rejected|locked|foundation|storage|prettier|failed/i.test(
          event.message,
        ),
    )
    .sort((left, right) => left.sequence - right.sequence);
  const findings = [
    row.records.length > 1
      ? {
          title: `${row.records.length} separate Codex passes`,
          detail:
            'Repeated passes are the strongest usage multiplier because each pass reloads build context. Review the worker events below for retry or compatibility failures.',
          tone: 'warning' as const,
        }
      : {
          title: 'One Codex pass',
          detail:
            'This run did not multiply usage through a full model restart. Its token total came from context and tool activity within one pass.',
          tone: 'success' as const,
        },
    failedCodexToolEvents.length
      ? {
          title: `${failedCodexToolEvents.length} failed agent tool ${failedCodexToolEvents.length === 1 ? 'call' : 'calls'}`,
          detail:
            'Failed inspections or verification commands add another model turn with the accumulated context. These are a direct sign of avoidable agent-loop usage.',
          tone: 'warning' as const,
        }
      : {
          title: 'No failed agent tool calls',
          detail:
            'The saved diagnostic stream does not show command failures that forced the model to inspect or verify the same work again.',
          tone: 'success' as const,
        },
    stagedManifestBytes !== undefined && contextReduction !== undefined
      ? {
          title:
            contextReduction > 0
              ? `${contextReduction}% of unrelated manifest context removed`
              : 'Full manifest intentionally retained',
          detail:
            contextReduction > 0
              ? `${formatByteSize(fullManifestBytes)} was projected to ${formatByteSize(stagedManifestBytes)} for ${selectedRouteCount ?? 'the selected'} route scope before the agent ran.`
              : `${formatByteSize(stagedManifestBytes)} was staged because this run needs whole-site context.`,
          tone: contextReduction > 0 ? ('success' as const) : ('neutral' as const),
        }
      : manifestBytes >= 200 * 1024 && selectedRouteCount && selectedRouteCount <= 2
        ? {
            title: 'Large manifest for a narrow test',
            detail: `${formatByteSize(manifestBytes)} of manifest data was available while the run targeted ${selectedRouteCount} ${selectedRouteCount === 1 ? 'route' : 'routes'}. Unselected pages, facts, and asset guidance can create avoidable context churn.`,
            tone: 'warning' as const,
          }
        : {
            title: 'Manifest and route scope',
            detail: row.manifest
              ? `${formatByteSize(manifestBytes)} of immutable manifest data supported ${selectedRouteCount ?? 'the selected'} route scope.`
              : 'The immutable manifest is no longer available in this workspace, so its contribution cannot be measured.',
            tone: 'neutral' as const,
          },
    reusedCheckpoint
      ? {
          title: 'Saved source reused without another model pass',
          detail:
            'The worker validated the post-Codex checkpoint, then continued compilation, storage, and quality checks without paying to regenerate the source.',
          tone: 'success' as const,
        }
      : {
          title: 'No post-Codex continuation recorded',
          detail:
            'If a safe storage or foundation handoff fails after generation, future runs can reuse validated saved source instead of invoking Codex again.',
          tone: 'neutral' as const,
        },
    cachedInputRate >= 75
      ? {
          title: `${cachedInputRate}% of input was cached`,
          detail:
            'Most input was reused context rather than newly supplied text. Cached tokens still appear in the total and indicate repeated context processing.',
          tone: 'neutral' as const,
        }
      : {
          title: `${formatTokens(freshInputTokens)} fresh input tokens`,
          detail: `${cachedInputRate}% of input was cached. The uncached portion is the clearest measure of newly introduced context.`,
          tone: 'neutral' as const,
        },
    outputRate <= 5 && row.totalTokens >= 200_000
      ? {
          title: 'Context-heavy, not output-heavy',
          detail: `Only ${outputRate}% of recorded tokens were model output. The large total was driven primarily by input context and repeated tool/model turns.`,
          tone: 'warning' as const,
        }
      : {
          title: `${outputRate}% model output`,
          detail: `${formatTokens(row.outputTokens)} output tokens were recorded across the run.`,
          tone: 'neutral' as const,
        },
  ];

  return (
    <div className="usage-build-analysis">
      <section aria-label="Token composition" className="usage-build-analysis__section">
        <div className="usage-build-analysis__heading">
          <div>
            <Eyebrow>Token composition</Eyebrow>
            <h3>What the total contains</h3>
          </div>
          <span>
            {row.records.length} model {row.records.length === 1 ? 'pass' : 'passes'}
          </span>
        </div>
        <div
          aria-label={`${formatTokens(freshInputTokens)} fresh input, ${formatTokens(row.cachedInputTokens)} cached input, and ${formatTokens(row.outputTokens)} output tokens`}
          className="usage-token-bar"
          role="img"
        >
          <span
            className="usage-token-bar__fresh"
            style={{ width: `${usagePercentage(freshInputTokens, row.totalTokens)}%` }}
          />
          <span
            className="usage-token-bar__cached"
            style={{ width: `${usagePercentage(row.cachedInputTokens, row.totalTokens)}%` }}
          />
          <span
            className="usage-token-bar__output"
            style={{ width: `${usagePercentage(row.outputTokens, row.totalTokens)}%` }}
          />
        </div>
        <dl className="usage-token-breakdown">
          <div>
            <dt>
              <span className="usage-token-key usage-token-key--fresh" />
              Fresh input
            </dt>
            <dd>{formatTokens(freshInputTokens)}</dd>
          </div>
          <div>
            <dt>
              <span className="usage-token-key usage-token-key--cached" />
              Cached input
            </dt>
            <dd>
              {formatTokens(row.cachedInputTokens)} · {cachedInputRate}% of input
            </dd>
          </div>
          <div>
            <dt>
              <span className="usage-token-key usage-token-key--output" />
              Model output
            </dt>
            <dd>{formatTokens(row.outputTokens)}</dd>
          </div>
          <div>
            <dt>Reasoning subset</dt>
            <dd>{formatTokens(row.reasoningTokens)}</dd>
          </div>
        </dl>
      </section>

      <section
        aria-labelledby={`usage-findings-${row.builderRunId}`}
        className="usage-build-analysis__section"
      >
        <div className="usage-build-analysis__heading">
          <div>
            <Eyebrow>Interpretation</Eyebrow>
            <h3 id={`usage-findings-${row.builderRunId}`}>What likely drove usage</h3>
          </div>
        </div>
        <ul className="usage-findings">
          {findings.map((finding) => (
            <li className={`usage-finding usage-finding--${finding.tone}`} key={finding.title}>
              <strong>{finding.title}</strong>
              <p>{finding.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby={`usage-context-${row.builderRunId}`}
        className="usage-build-analysis__section"
      >
        <div className="usage-build-analysis__heading">
          <div>
            <Eyebrow>Build context</Eyebrow>
            <h3 id={`usage-context-${row.builderRunId}`}>Scope and version lineage</h3>
          </div>
        </div>
        <dl className="usage-context-grid">
          <div>
            <dt>Test scope</dt>
            <dd>{row.run ? builderRunModeLabel(row.run.buildMode) : 'Archived build'}</dd>
          </div>
          <div>
            <dt>Selected routes</dt>
            <dd>{selectedRouteCount ?? 'Not recorded'}</dd>
          </div>
          <div>
            <dt>Stored immutable manifest</dt>
            <dd>{fullManifestBytes ? formatByteSize(fullManifestBytes) : 'Unavailable'}</dd>
          </div>
          <div>
            <dt>Staged agent manifest</dt>
            <dd>
              {stagedManifestBytes === undefined
                ? 'Not recorded on this run'
                : formatByteSize(stagedManifestBytes)}
            </dd>
          </div>
          <div>
            <dt>Context reduction</dt>
            <dd>{contextReduction === undefined ? 'Legacy run' : `${contextReduction}%`}</dd>
          </div>
          <div>
            <dt>Staged assets</dt>
            <dd>{stagedAssetCount ?? 'Not recorded'}</dd>
          </div>
          <div>
            <dt>Agent package</dt>
            <dd>
              {row.agentPackage
                ? `${agentPackageVersionLabel(row.agentPackage.version)} · ${row.agentPackage.status.replaceAll('_', ' ')}`
                : row.run?.agentPackageVersion
                  ? agentPackageVersionLabel(row.run.agentPackageVersion)
                  : 'Legacy or unrecorded'}
            </dd>
          </div>
          <div>
            <dt>Package contract</dt>
            <dd>{row.agentPackage?.builderContractVersion ?? 'Not recorded'}</dd>
          </div>
          <div>
            <dt>Manifest contract</dt>
            <dd>
              {row.manifest?.builderContractVersion ?? row.run?.templateVersion ?? 'Not recorded'}
            </dd>
          </div>
          <div>
            <dt>Foundation</dt>
            <dd>
              {row.agentPackage?.foundationVersion ?? row.run?.templateVersion ?? 'Not recorded'}
            </dd>
          </div>
          <div>
            <dt>Parent checkpoint</dt>
            <dd>
              {row.run?.parentBuilderRunId ? 'Restored scoped source' : 'Clean foundation build'}
            </dd>
          </div>
        </dl>
        {buildContext ? (
          <div className="usage-context-projection">
            <div className="usage-context-projection__heading">
              <div>
                <h4>What the agent actually received</h4>
                <p>
                  The immutable record stays complete. Narrow tests receive a route-scoped working
                  copy so unrelated pages and assets do not consume the model window.
                </p>
              </div>
              <strong>{contextReduction ?? 0}% smaller</strong>
            </div>
            <div
              aria-label={`${formatByteSize(stagedManifestBytes ?? 0)} staged from ${formatByteSize(fullManifestBytes)}`}
              className="usage-context-projection__bar"
              role="img"
            >
              <span
                style={{
                  width: `${Math.max(
                    usagePercentage(stagedManifestBytes ?? 0, fullManifestBytes),
                    stagedManifestBytes ? 2 : 0,
                  )}%`,
                }}
              />
            </div>
            {applicableContracts.length ? (
              <div className="usage-context-contracts">
                <span>Loaded contracts</span>
                <ul>
                  {applicableContracts.map((contract) => (
                    <li key={contract}>{contract.replace(/\.md$/, '').replaceAll('-', ' ')}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {projectedSections.length ? (
              <div className="usage-context-sections">
                <span>Route-scoped sections</span>
                <ul>
                  {projectedSections.map((section) => (
                    <li key={section.label}>
                      <span>{section.label}</span>
                      <strong>
                        {section.full} → {section.staged}
                      </strong>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
        {manifestSections.length ? (
          <div className="usage-manifest-sections">
            <h4>Largest manifest sections</h4>
            <ol>
              {manifestSections.map((section) => (
                <li key={section.label}>
                  <span>
                    {section.label}
                    {section.items === undefined ? '' : ` · ${section.items} items`}
                  </span>
                  <strong>{formatByteSize(section.bytes)}</strong>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
        {row.run?.buildInstruction ? (
          <div className="usage-build-direction">
            <h4>Workspace test direction</h4>
            <p>{row.run.buildInstruction}</p>
          </div>
        ) : null}
      </section>

      <section
        aria-labelledby={`usage-passes-${row.builderRunId}`}
        className="usage-build-analysis__section"
      >
        <div className="usage-build-analysis__heading">
          <div>
            <Eyebrow>Model passes</Eyebrow>
            <h3 id={`usage-passes-${row.builderRunId}`}>Per-call breakdown</h3>
          </div>
        </div>
        <div className="usage-table-wrap">
          <table className="usage-table usage-table--passes">
            <thead>
              <tr>
                <th scope="col">Pass</th>
                <th scope="col">Recorded</th>
                <th scope="col">Model</th>
                <th scope="col">Events</th>
                <th scope="col">Fresh input</th>
                <th scope="col">Cached input</th>
                <th scope="col">Output</th>
                <th scope="col">Total</th>
                <th scope="col">Cost</th>
              </tr>
            </thead>
            <tbody>
              {[...row.records]
                .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
                .map((record, index) => (
                  <tr key={record.id}>
                    <th scope="row">Pass {index + 1}</th>
                    <td>{formatDateTime(record.createdAt)}</td>
                    <td>{record.model}</td>
                    <td>
                      {typeof record.metadata.eventCount === 'number'
                        ? record.metadata.eventCount
                        : 'Not recorded'}
                    </td>
                    <td>
                      {formatTokens(Math.max(record.inputTokens - record.cachedInputTokens, 0))}
                    </td>
                    <td>{formatTokens(record.cachedInputTokens)}</td>
                    <td>{formatTokens(record.outputTokens)}</td>
                    <td>{formatTokens(record.totalTokens)}</td>
                    <td>
                      {typeof record.costUsd === 'number' ? formatUsd(record.costUsd) : 'Unpriced'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <section
        aria-labelledby={`usage-events-${row.builderRunId}`}
        className="usage-build-analysis__section"
      >
        <div className="usage-build-analysis__heading">
          <div>
            <Eyebrow>Worker evidence</Eyebrow>
            <h3 id={`usage-events-${row.builderRunId}`}>Retry and diagnostic signals</h3>
          </div>
        </div>
        {relevantEvents.length ? (
          <ol className="usage-diagnostic-events">
            {relevantEvents.map((event) => (
              <li key={event.id}>
                <StatusBadge tone={event.kind === 'error' ? 'danger' : 'warning'}>
                  {event.kind}
                </StatusBadge>
                <span>{event.message}</span>
                <time dateTime={event.createdAt}>{formatDateTime(event.createdAt)}</time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted-copy">
            No retry, restart, or worker-error signal was saved for this test.
          </p>
        )}
      </section>

      <div className="usage-build-analysis__actions">
        <Button onClick={() => onOpenWorkspace(row.workspace.business.id)} variant="secondary">
          Open build workspace <ArrowUpRight aria-hidden="true" size={16} />
        </Button>
      </div>
    </div>
  );
}

function UsagePage({
  agentPackages,
  initialBuildId,
  workspaces,
  onOpenWorkspace,
}: {
  agentPackages: AgentPackage[];
  initialBuildId?: string;
  workspaces: ProspectWorkspace[];
  onOpenWorkspace: (businessId: string) => void;
}) {
  const [usageView, setUsageView] = useState<'overview' | 'prospect' | 'build'>('overview');
  const [selectedProspectId, setSelectedProspectId] = useState('all');
  const [selectedBuildId, setSelectedBuildId] = useState('all');
  const [openBuildId, setOpenBuildId] = useState<string>();
  const records = useMemo(
    () =>
      workspaces.flatMap((workspace) =>
        workspace.aiUsageRecords.map((record) => ({ record, workspace })),
      ),
    [workspaces],
  );
  const prospectOptions = workspaces
    .filter((workspace) => workspace.aiUsageRecords.length)
    .sort((left, right) => left.business.name.localeCompare(right.business.name));
  const buildOptions = useMemo(
    () =>
      records
        .filter(
          ({ record, workspace }) =>
            record.builderRunId &&
            (selectedProspectId === 'all' || workspace.business.id === selectedProspectId),
        )
        .reduce<Array<{ id: string; label: string; workspace: ProspectWorkspace }>>(
          (options, { record, workspace }) => {
            if (
              !record.builderRunId ||
              options.some((option) => option.id === record.builderRunId)
            ) {
              return options;
            }
            options.push({
              id: record.builderRunId,
              label: `${workspace.business.name} · ${usageBuildLabel(record, workspace)}`,
              workspace,
            });
            return options;
          },
          [],
        )
        .sort((left, right) => left.label.localeCompare(right.label)),
    [records, selectedProspectId],
  );
  useEffect(() => {
    if (!initialBuildId) return;
    const selectedBuild = buildOptions.find((option) => option.id === initialBuildId);
    if (!selectedBuild) return;
    setUsageView('build');
    setSelectedProspectId(selectedBuild.workspace.business.id);
    setSelectedBuildId(initialBuildId);
    setOpenBuildId(initialBuildId);
  }, [buildOptions, initialBuildId]);
  const scopedRecords = records.filter(({ record, workspace }) => {
    if (usageView === 'overview') return true;
    if (usageView === 'prospect') return workspace.business.id === selectedProspectId;
    return record.builderRunId === selectedBuildId;
  });
  const pricedRecords = scopedRecords.filter(({ record }) => typeof record.costUsd === 'number');
  const totalCost = pricedRecords.reduce((total, { record }) => total + (record.costUsd ?? 0), 0);
  const totalTokens = scopedRecords.reduce((total, { record }) => total + record.totalTokens, 0);
  const unpricedCount = scopedRecords.filter(
    ({ record }) => record.costSource === 'unavailable',
  ).length;
  const prospectRows = workspaces
    .map((workspace) => {
      const usage = scopedRecords
        .filter((entry) => entry.workspace.business.id === workspace.business.id)
        .map((entry) => entry.record);
      return {
        workspace,
        totalTokens: usage.reduce((total, record) => total + record.totalTokens, 0),
        cost: usage.reduce((total, record) => total + (record.costUsd ?? 0), 0),
        unpriced: usage.filter((record) => record.costSource === 'unavailable').length,
        operations: usage.length,
        providers: [...new Set(usage.map((record) => record.provider))].join(', '),
      };
    })
    .filter((row) => row.operations)
    .sort((left, right) => right.cost - left.cost || right.totalTokens - left.totalTokens);
  const buildRows = [...scopedRecords]
    .filter(({ record }) => record.builderRunId && record.source === 'codex_build')
    .reduce<BuildUsageAnalysisRow[]>((rows, { record, workspace }) => {
      const builderRunId = record.builderRunId;
      if (!builderRunId) return rows;
      const row = rows.find((candidate) => candidate.builderRunId === builderRunId);
      if (row) {
        row.records.push(record);
        row.inputTokens += record.inputTokens;
        row.cachedInputTokens += record.cachedInputTokens;
        row.outputTokens += record.outputTokens;
        row.reasoningTokens += record.reasoningTokens;
        row.totalTokens += record.totalTokens;
        row.recordedCost += record.costUsd ?? 0;
        row.unpricedCount += typeof record.costUsd === 'number' ? 0 : 1;
        if (!row.models.includes(record.model)) row.models.push(record.model);
        if (record.createdAt > row.recordedAt) row.recordedAt = record.createdAt;
        return rows;
      }
      const run = workspace.builderRuns.find((candidate) => candidate.id === builderRunId);
      rows.push({
        builderRunId,
        workspace,
        run,
        manifest: run
          ? workspace.buildManifests.find((manifest) => manifest.id === run.buildManifestId)
          : undefined,
        agentPackage: run
          ? agentPackages.find(
              (agentPackage) =>
                agentPackage.id === run.agentPackageId ||
                (!run.agentPackageId && agentPackage.version === run.agentPackageVersion),
            )
          : undefined,
        records: [record],
        events: workspace.builderEvents.filter((event) => event.builderRunId === builderRunId),
        models: [record.model],
        inputTokens: record.inputTokens,
        cachedInputTokens: record.cachedInputTokens,
        outputTokens: record.outputTokens,
        reasoningTokens: record.reasoningTokens,
        totalTokens: record.totalTokens,
        recordedCost: record.costUsd ?? 0,
        unpricedCount: typeof record.costUsd === 'number' ? 0 : 1,
        recordedAt: record.createdAt,
      });
      return rows;
    }, [])
    .sort((left, right) => right.recordedAt.localeCompare(left.recordedAt));
  const usageTimeline = [...scopedRecords]
    .sort((left, right) => left.record.createdAt.localeCompare(right.record.createdAt))
    .reduce<
      Array<{
        date: string;
        tokens: number;
        recordedCost: number;
        unpricedCount: number;
        operations: number;
      }>
    >((days, { record }) => {
      const date = record.createdAt.slice(0, 10);
      const current = days.at(-1);
      if (!current || current.date !== date) {
        days.push({
          date,
          tokens: record.totalTokens,
          recordedCost: record.costUsd ?? 0,
          unpricedCount: typeof record.costUsd === 'number' ? 0 : 1,
          operations: 1,
        });
        return days;
      }
      current.tokens += record.totalTokens;
      current.recordedCost += record.costUsd ?? 0;
      current.unpricedCount += typeof record.costUsd === 'number' ? 0 : 1;
      current.operations += 1;
      return days;
    }, [])
    .slice(-30);
  const maxTimelineValue = Math.max(
    ...usageTimeline.map((day) => (day.recordedCost > 0 ? day.recordedCost : day.tokens)),
    1,
  );
  const recordChart = [...scopedRecords].sort((left, right) =>
    left.record.createdAt.localeCompare(right.record.createdAt),
  );
  const maxRecordChartValue = Math.max(
    ...recordChart.map(({ record }) =>
      record.costUsd && record.costUsd > 0 ? record.costUsd : record.totalTokens,
    ),
    1,
  );

  return (
    <section className="usage-page" aria-labelledby="usage-page-title">
      <PageHeader
        eyebrow="Operations finance"
        title="AI usage & spend"
        detail="Live provider usage grouped by prospect and build. Dollar totals include only calls with a recorded cost; unpriced usage remains visible instead of being estimated silently."
      />

      <section aria-labelledby="usage-filter-title" className="usage-filters">
        <div>
          <Eyebrow>Explore the ledger</Eyebrow>
          <h2 id="usage-filter-title">Usage scope</h2>
        </div>
        <div className="usage-filters__controls">
          <label>
            View
            <select
              onChange={(event) => {
                const nextView = event.target.value as 'overview' | 'prospect' | 'build';
                setUsageView(nextView);
                if (nextView === 'overview') {
                  setSelectedProspectId('all');
                  setSelectedBuildId('all');
                }
                if (nextView === 'prospect') setSelectedBuildId('all');
              }}
              value={usageView}
            >
              <option value="overview">Overview</option>
              <option value="prospect">One prospect</option>
              <option value="build">One build</option>
            </select>
          </label>
          <label>
            Prospect
            <select
              onChange={(event) => {
                const nextProspectId = event.target.value;
                setSelectedProspectId(nextProspectId);
                setSelectedBuildId('all');
                setUsageView(nextProspectId === 'all' ? 'overview' : 'prospect');
              }}
              value={selectedProspectId}
            >
              <option value="all">All prospects</option>
              {prospectOptions.map((workspace) => (
                <option key={workspace.business.id} value={workspace.business.id}>
                  {workspace.business.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Build
            <select
              disabled={!buildOptions.length}
              onChange={(event) => {
                const nextBuildId = event.target.value;
                setSelectedBuildId(nextBuildId);
                if (nextBuildId !== 'all') {
                  const build = buildOptions.find((option) => option.id === nextBuildId);
                  if (build) setSelectedProspectId(build.workspace.business.id);
                  setOpenBuildId(nextBuildId);
                  setUsageView('build');
                }
              }}
              value={selectedBuildId}
            >
              <option value="all">All builds</option>
              {buildOptions.map((build) => (
                <option key={build.id} value={build.id}>
                  {build.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="muted-copy">
          {usageView === 'overview'
            ? 'See every recorded operation across the workspace.'
            : scopedRecords.length
              ? `${scopedRecords.length} matching ${scopedRecords.length === 1 ? 'operation' : 'operations'} in this view.`
              : 'Choose a saved prospect or build to inspect its recorded operations.'}
        </p>
      </section>

      <section aria-label="AI usage totals" className="usage-metric-grid">
        <UsageMetric
          detail={
            pricedRecords.length ? 'recorded or configured-rate calls' : 'no priced calls yet'
          }
          label="Recorded spend"
          value={formatUsd(totalCost)}
        />
        <UsageMetric
          detail={`${scopedRecords.length} tracked AI ${scopedRecords.length === 1 ? 'operation' : 'operations'}`}
          label="Tokens used"
          value={formatTokens(totalTokens)}
        />
        <UsageMetric
          detail={
            unpricedCount
              ? 'needs provider billing or a rate configuration'
              : 'every tracked call is priced'
          }
          label="Unpriced operations"
          value={String(unpricedCount)}
        />
      </section>

      <section className="usage-panel" aria-labelledby="usage-by-prospect-title">
        <div className="section-heading">
          <div>
            <Eyebrow>Prospects</Eyebrow>
            <h2 id="usage-by-prospect-title">Spend by prospect</h2>
          </div>
          <WalletCards aria-hidden="true" size={19} />
        </div>
        {prospectRows.length ? (
          <div className="usage-table-wrap">
            <table className="usage-table">
              <thead>
                <tr>
                  <th scope="col">Prospect</th>
                  <th scope="col">AI services</th>
                  <th scope="col">Operations</th>
                  <th scope="col">Tokens</th>
                  <th scope="col">Spend</th>
                  <th scope="col">Coverage</th>
                </tr>
              </thead>
              <tbody>
                {prospectRows.map((row) => (
                  <tr key={row.workspace.business.id}>
                    <th scope="row">
                      <button
                        onClick={() => onOpenWorkspace(row.workspace.business.id)}
                        type="button"
                      >
                        {row.workspace.business.name} <ArrowUpRight aria-hidden="true" size={14} />
                      </button>
                    </th>
                    <td>{row.providers}</td>
                    <td>{row.operations}</td>
                    <td>{formatTokens(row.totalTokens)}</td>
                    <td>{formatUsd(row.cost)}</td>
                    <td>{row.unpriced ? `${row.unpriced} unpriced` : 'Fully priced'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            detail="Usage will appear after an AI analysis or Codex build runs through the protected workers."
            icon={WalletCards}
            title="No AI usage recorded yet"
          />
        )}
      </section>

      <section className="usage-panel" aria-labelledby="usage-timeline-title">
        <div className="section-heading">
          <div>
            <Eyebrow>Ledger timeline</Eyebrow>
            <h2 id="usage-timeline-title">Daily AI use</h2>
          </div>
          <Clock3 aria-hidden="true" size={19} />
        </div>
        {usageTimeline.length ? (
          <>
            <p className="muted-copy">
              Recorded spend by day. When a day has no priced operation, token volume keeps the
              activity visible without inventing a dollar amount.
            </p>
            <div className="usage-timeline-wrap">
              <ol className="usage-timeline" aria-label="Daily AI spend timeline">
                {usageTimeline.map((day) => {
                  const barValue = day.recordedCost > 0 ? day.recordedCost : day.tokens;
                  const height = Math.max(8, (barValue / maxTimelineValue) * 100);
                  const costLabel = day.unpricedCount
                    ? day.recordedCost > 0
                      ? `${formatUsd(day.recordedCost)} plus ${day.unpricedCount} unpriced`
                      : `${day.unpricedCount} unpriced`
                    : formatUsd(day.recordedCost);
                  return (
                    <li key={day.date}>
                      <div
                        aria-hidden="true"
                        className="usage-timeline__track"
                        title={`${formatDate(day.date)}: ${costLabel}, ${formatTokens(day.tokens)} tokens, ${day.operations} operations`}
                      >
                        <span style={{ height: `${height}%` }} />
                      </div>
                      <strong>{costLabel}</strong>
                      <small>{formatDate(day.date)}</small>
                      <span className="usage-timeline__cost">
                        {formatTokens(day.tokens)} tokens · {day.operations} ops
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </>
        ) : (
          <p className="muted-copy">
            The timeline will appear when the first AI operation is recorded.
          </p>
        )}
      </section>

      <section className="usage-panel" aria-labelledby="usage-by-build-title">
        <div className="section-heading">
          <div>
            <Eyebrow>Builds</Eyebrow>
            <h2 id="usage-by-build-title">Codex build usage</h2>
          </div>
          <Sparkles aria-hidden="true" size={19} />
        </div>
        {buildRows.length ? (
          <div className="usage-build-list">
            {buildRows.map((row) => {
              const isOpen = openBuildId === row.builderRunId;
              const analysisId = `usage-build-analysis-${row.builderRunId}`;
              const freshInputTokens = Math.max(row.inputTokens - row.cachedInputTokens, 0);
              return (
                <article
                  className={`usage-build${isOpen ? ' is-open' : ''}`}
                  key={row.builderRunId}
                >
                  <Button
                    aria-controls={analysisId}
                    aria-expanded={isOpen}
                    className="usage-build__trigger"
                    onClick={() => setOpenBuildId(isOpen ? undefined : row.builderRunId)}
                    variant="quiet"
                  >
                    <span className="usage-build__identity">
                      <span>
                        <strong>
                          {row.run
                            ? usageBuildLabel({ builderRunId: row.run.id }, row.workspace)
                            : 'Archived build'}
                        </strong>
                        <small>{row.workspace.business.name}</small>
                      </span>
                      {row.run ? (
                        <StatusBadge tone={builderRunTone(row.run.status)}>
                          {builderRunLabel(row.run.status)}
                        </StatusBadge>
                      ) : null}
                    </span>
                    <span className="usage-build__summary">
                      <span>
                        <small>Total tokens</small>
                        <strong>{formatTokens(row.totalTokens)}</strong>
                      </span>
                      <span>
                        <small>Fresh / cached input</small>
                        <strong>
                          {formatTokens(freshInputTokens)} / {formatTokens(row.cachedInputTokens)}
                        </strong>
                      </span>
                      <span>
                        <small>Codex passes</small>
                        <strong>{row.records.length}</strong>
                      </span>
                      <span>
                        <small>Spend</small>
                        <strong>
                          {row.unpricedCount
                            ? row.recordedCost > 0
                              ? `${formatUsd(row.recordedCost)} + unpriced`
                              : 'Unpriced'
                            : formatUsd(row.recordedCost)}
                        </strong>
                      </span>
                    </span>
                    <span className="usage-build__open-label">
                      {isOpen ? 'Close analysis' : 'Open analysis'}
                      <ChevronDown aria-hidden="true" size={18} />
                    </span>
                  </Button>
                  {isOpen ? (
                    <div className="usage-build__content" id={analysisId}>
                      <BuildUsageAnalysis onOpenWorkspace={onOpenWorkspace} row={row} />
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="muted-copy">No completed or stopped Codex build has reported usage yet.</p>
        )}
      </section>

      <section className="usage-panel" aria-labelledby="usage-record-chart-title">
        <div className="section-heading">
          <div>
            <Eyebrow>Per operation</Eyebrow>
            <h2 id="usage-record-chart-title">AI cost by recorded operation</h2>
          </div>
          <Sparkles aria-hidden="true" size={19} />
        </div>
        {recordChart.length ? (
          <div className="usage-record-chart-wrap">
            <ol className="usage-record-chart" aria-label="AI cost for every recorded operation">
              {recordChart.map(({ record, workspace }) => {
                const chartValue =
                  record.costUsd && record.costUsd > 0 ? record.costUsd : record.totalTokens;
                const costLabel =
                  typeof record.costUsd === 'number' ? formatUsd(record.costUsd) : 'Unpriced';
                return (
                  <li key={record.id}>
                    <div
                      aria-hidden="true"
                      className="usage-record-chart__track"
                      title={`${formatDateTime(record.createdAt)}: ${usageSourceLabel(record.source)}, ${costLabel}, ${formatTokens(record.totalTokens)} tokens`}
                    >
                      <span
                        style={{
                          height: `${Math.max(8, (chartValue / maxRecordChartValue) * 100)}%`,
                        }}
                      />
                    </div>
                    <strong>{costLabel}</strong>
                    <small>{usageSourceLabel(record.source)}</small>
                    <span>{usageBuildLabel(record, workspace)}</span>
                    <time dateTime={record.createdAt}>{formatDateTime(record.createdAt)}</time>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : (
          <p className="muted-copy">No recorded operations match this view.</p>
        )}
      </section>

      <section className="usage-panel" aria-labelledby="usage-operations-title">
        <div className="section-heading">
          <div>
            <Eyebrow>Operation ledger</Eyebrow>
            <h2 id="usage-operations-title">Every recorded AI operation</h2>
          </div>
          <ListChecks aria-hidden="true" size={19} />
        </div>
        {scopedRecords.length ? (
          <div className="usage-table-wrap">
            <table className="usage-table usage-table--operations">
              <thead>
                <tr>
                  <th scope="col">Recorded</th>
                  <th scope="col">Prospect</th>
                  <th scope="col">Operation</th>
                  <th scope="col">Build</th>
                  <th scope="col">Model</th>
                  <th scope="col">Input / output</th>
                  <th scope="col">Tokens</th>
                  <th scope="col">Cost</th>
                </tr>
              </thead>
              <tbody>
                {[...scopedRecords]
                  .sort((left, right) =>
                    right.record.createdAt.localeCompare(left.record.createdAt),
                  )
                  .map(({ record, workspace }) => (
                    <tr key={record.id}>
                      <td>{formatDateTime(record.createdAt)}</td>
                      <th scope="row">
                        <button
                          onClick={() => onOpenWorkspace(workspace.business.id)}
                          type="button"
                        >
                          {workspace.business.name} <ArrowUpRight aria-hidden="true" size={14} />
                        </button>
                      </th>
                      <td>{usageSourceLabel(record.source)}</td>
                      <td>{usageBuildLabel(record, workspace)}</td>
                      <td>{record.model}</td>
                      <td>
                        {formatTokens(record.inputTokens)} / {formatTokens(record.outputTokens)}
                        {record.cachedInputTokens
                          ? ` (${formatTokens(record.cachedInputTokens)} cached)`
                          : ''}
                      </td>
                      <td>{formatTokens(record.totalTokens)}</td>
                      <td>
                        {typeof record.costUsd === 'number'
                          ? formatUsd(record.costUsd)
                          : 'Unpriced'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted-copy">
            No recorded operations match this view. Choose Overview to see the complete ledger.
          </p>
        )}
      </section>

      <p className="usage-note">
        Costs are shown in USD. The worker stores API token usage after each call. To turn
        token-only records into priced totals, set a reviewed <code>SITEFORGE_AI_PRICING_JSON</code>{' '}
        rate card in the protected worker environment; subscriptions and provider invoice
        adjustments remain unpriced.
      </p>
    </section>
  );
}

function BuilderSettingsPage() {
  return (
    <section className="settings-page" aria-labelledby="settings-page-title">
      <Eyebrow>Workspace settings</Eyebrow>
      <h1 id="settings-page-title">Settings</h1>
      <Card className="workspace-panel settings-page__card">
        <div>
          <Eyebrow>Website builder</Eyebrow>
          <h2>Protected builder runtime</h2>
          <p className="muted-copy">
            Review the Codex model, access boundary, and checks used for private website previews.
          </p>
        </div>
        <BuilderSettingsControl />
      </Card>
    </section>
  );
}

const currentAgentPackageFiles = [
  {
    group: 'Agent policy',
    path: 'worker/codex-builder-contract.md',
    label: 'Builder contract',
    detail: 'Global safety, evidence, accessibility, and motion rules.',
    content: builderContractSource,
  },
  {
    group: 'Agent policy',
    path: 'worker/builder-template/AGENTS.md',
    label: 'Template instructions',
    detail: 'Codex instructions for implementing a private website.',
    content: builderInstructionsSource,
  },
  {
    group: 'Feature contract',
    path: 'worker/builder-template/feature-contracts/component-architecture.md',
    label: 'Component architecture contract',
    detail:
      'Generated tokens, primitives, patterns, sections, site components, layouts, and pages.',
    content: componentArchitectureContractSource,
  },
  {
    group: 'Feature contract',
    path: 'worker/builder-template/feature-contracts/mobile-navigation.md',
    label: 'Mobile navigation contract',
    detail: 'Markdown requirements and creative freedom for generated mobile navigation.',
    content: mobileNavigationContractSource,
  },
  {
    group: 'Feature contract',
    path: 'worker/builder-template/feature-contracts/runtime-profiles.md',
    label: 'Runtime profiles contract',
    detail:
      'Static marketing, managed forms, and managed Next.js production capability boundaries.',
    content: runtimeProfilesContractSource,
  },
  {
    group: 'Feature contract',
    path: 'worker/builder-template/feature-contracts/site-navigation-architecture.md',
    label: 'Site navigation architecture',
    detail:
      'Exact routes, nested page relationships, consistent primary destinations, and whole-site reachability.',
    content: siteNavigationArchitectureContractSource,
  },
  {
    group: 'Feature contract',
    path: 'worker/builder-template/feature-contracts/semantic-content-recovery.md',
    label: 'Semantic recovery contract',
    detail:
      'Required source-page coverage and accessible component rules for approved image-based information.',
    content: semanticContentRecoveryContractSource,
  },
  {
    group: 'Builder handoff',
    path: 'src/lib/build-manifest.ts',
    label: 'Semantic content grouping',
    detail:
      'Deterministically groups approved items by source page, section context, and semantic role for every build manifest.',
    content: buildManifestSource,
  },
  {
    group: 'Builder foundation',
    path: 'worker/builder-template/src/components/foundation/site-runtime.tsx',
    label: 'Motion runtime',
    detail:
      'Locked React word, staggered, directional, scale, fade, factual-counter, and approved-logo handoff behaviour.',
    content: motionRuntimeSource,
  },
  {
    group: 'Builder foundation',
    path: 'worker/builder-template/package.json',
    label: 'Template packages',
    detail: 'Pinned framework, component, styling, icon, and verification boundary.',
    content: builderPackageSource,
  },
  {
    group: 'Protected delivery',
    path: 'worker/builder-worker.mjs',
    label: 'Builder worker',
    detail: 'Stages private inputs, scopes revisions, runs Codex, and saves live build events.',
    content: builderWorkerSource,
  },
] as const;

type AgentPackageFile = (typeof currentAgentPackageFiles)[number];

type AgentFeature = {
  id: string;
  title: string;
  detail: string;
  files: Array<{
    label: AgentPackageFile['label'];
    detail: string;
    terms: string[];
  }>;
};

function agentPackageFilePresentation(file: AgentPackageFile) {
  if (file.label === 'Builder contract') {
    return { Icon: ShieldAlert, label: 'Contract policy', tone: 'contract' } as const;
  }
  if (file.label === 'Template instructions') {
    return { Icon: FilePenLine, label: 'Template guide', tone: 'instructions' } as const;
  }
  if (file.path.endsWith('.md')) {
    return { Icon: FileText, label: 'Markdown policy', tone: 'markdown' } as const;
  }
  if (file.path.endsWith('.json')) {
    return { Icon: FileCode2, label: 'JSON config', tone: 'config' } as const;
  }
  if (file.path.endsWith('.ts') || file.path.endsWith('.tsx')) {
    return { Icon: FileCode2, label: 'TypeScript handoff', tone: 'javascript' } as const;
  }
  return { Icon: FileCode2, label: 'JavaScript runtime', tone: 'javascript' } as const;
}

const agentPackageFeatures: AgentFeature[] = [
  {
    id: 'next-component-architecture',
    title: 'Next.js generated component architecture',
    detail:
      'Builds strict TypeScript App Router sites from clean routes while letting Codex create each business’s typography, spacing rhythm, tokens, primitives, patterns, content-led responsive compositions, distinctive service routes, site components, layouts, and pages.',
    files: [
      {
        label: 'Component architecture contract',
        detail:
          'Defines the generated layers, creative ownership, content-led composition repertoire, native HTML boundary, Base UI behaviour boundary, and abstraction discipline.',
        terms: [
          'The foundation locks dependencies',
          'Creative ownership',
          'Content-led composition',
          'Mobile is a distinct composition opportunity',
          'Behaviour boundary',
        ],
      },
      {
        label: 'Template instructions',
        detail:
          'Requires strict TypeScript, Tailwind and semantic tokens, native HTML first, and site-specific generated components.',
        terms: ['Architecture', 'agent owns the visual system', 'component system'],
      },
      {
        label: 'Template packages',
        detail:
          'Pins Next.js, React, TypeScript, Tailwind, Base UI, component variants, class composition, icons, lint, and formatting.',
        terms: ['next', '@base-ui/react', 'tailwindcss', 'typescript', 'verify'],
      },
      {
        label: 'Builder worker',
        detail:
          'Stages the immutable foundation, locks framework files, restores typed checkpoints, and compiles static App Router output.',
        terms: [
          'builderFoundationVersion',
          'templateDependenciesDirectory',
          'compiledOutputDirectoryName',
        ],
      },
    ],
  },
  {
    id: 'runtime-profiles',
    title: 'Production runtime & capability profiles',
    detail:
      'Classifies builds as static marketing, managed forms, or managed Next.js runtime and keeps production integrations behind explicit reviewed adapters.',
    files: [
      {
        label: 'Runtime profiles contract',
        detail:
          'Defines preview honesty and the production service boundary for static, form, booking, account, commerce, and integration capabilities.',
        terms: ['static-marketing', 'managed-forms', 'managed-next-runtime'],
      },
      {
        label: 'Semantic content grouping',
        detail:
          'Adds the typed architecture, capability adapters, component layers, and required quality profile to every immutable manifest.',
        terms: ['buildArchitecture', 'productionRuntime', 'capabilityAdapters', 'qualityProfile'],
      },
      {
        label: 'Template instructions',
        detail:
          'Requires complete visitor states and a BUILD_NOTES production handoff without fabricated backend behaviour.',
        terms: ['Capabilities and production honesty', 'BUILD_NOTES.md'],
      },
    ],
  },
  {
    id: 'framework-quality-gates',
    title: 'Framework, interaction & responsive quality gates',
    detail:
      'Runs formatting, ESLint, strict type checks, production compilation, route validation, exact responsive captures, compact-navigation interaction and motion checks, image-loading checks, overflow checks, browser errors, and axe.',
    files: [
      {
        label: 'Template packages',
        detail: 'Defines the deterministic verify command executed by Codex and the worker.',
        terms: ['format:check', 'lint', 'typecheck', 'verify'],
      },
      {
        label: 'Builder worker',
        detail:
          'Runs responsive quality checks, then saves a safe browsable source tree, compiled output, and downloadable source archive for every test.',
        terms: [
          'previewViewports',
          'responsiveInteractionEvidence',
          'refreshLockedFoundation',
          'meaningfulPageNamingProblems',
          'Open frozen draft',
          'Test something else',
          'responsive-interactions',
          'browser-console',
          'collectBrowsableSourceFiles',
          'source_bundle',
          'final_source',
        ],
      },
      {
        label: 'Builder contract',
        detail:
          'Makes framework verification and responsive interaction evidence release requirements.',
        terms: ['Quality and delivery', 'Required viewports'],
      },
    ],
  },
  {
    id: 'site-navigation-architecture',
    title: 'Multi-page navigation architecture',
    detail:
      'Keeps primary destinations stable, maps links to exact generated outputs, and makes every selected page reachable through meaningful nested navigation without crowding the header.',
    files: [
      {
        label: 'Site navigation architecture',
        detail:
          'Defines exact route targets, parent and child navigation, responsive hierarchy, and whole-site reachability.',
        terms: [
          'Every generated page must be reachable',
          'Do not satisfy this by placing every page',
          'parent landing page',
          'Feature-only Agent Studio revisions',
        ],
      },
      {
        label: 'Builder contract',
        detail: 'Makes multi-page navigation architecture a required generated feature.',
        terms: ['Multi-page navigation architecture is a required generated feature'],
      },
      {
        label: 'Template instructions',
        detail: 'Requires the feature contract for every multi-page build.',
        terms: ['feature-contracts/site-navigation-architecture.md'],
      },
      {
        label: 'Builder worker',
        detail:
          'Preserves the full restored site during a feature-only revision and checks exact targets, stable headers, and transitive reachability.',
        terms: [
          'feature-only multi-page Agent Studio revision',
          'nested-page-reachability',
          'unreachableSelectedPageProblems',
        ],
      },
    ],
  },
  {
    id: 'motion-runtime',
    title: 'Entrance motion & factual counters',
    detail:
      'Lets the agent compose slower eased word, stacked-text, staggered, directional, scale, fade, and reversible scroll-depth sequences after the route logo handoff, while animating only explicitly marked factual metrics.',
    files: [
      {
        label: 'Motion runtime',
        detail: 'The browser-side reveal and counter implementation.',
        terms: [
          'data-sf-reveal',
          'data-reveal="words"',
          'data-reveal="sequence"',
          'data-reveal="stagger"',
          'data-scroll-zoom',
          'siteforge:route-transition-complete',
          'function animateCounter',
          'function prepareWordReveal',
        ],
      },
      {
        label: 'Builder contract',
        detail: 'The rule that asks for creative but restrained composition and real metrics.',
        terms: [
          'Use motion to support hierarchy',
          'data-counter',
          'at least two fitting treatments',
        ],
      },
    ],
  },
  {
    id: 'brand-introduction',
    title: 'Brand introduction',
    detail:
      'On every route, the approved logo fades in at centre, rises and scales, then its live clone moves into the measured navigation-logo position before page motion begins.',
    files: [
      {
        label: 'Motion runtime',
        detail:
          'Creates the route loading surface, centre logo, status message, measured navigation transfer, then starts the visible page entrance.',
        terms: [
          'sf-brand-intro',
          'function runRouteBrandTransition',
          'siteforge:route-transition-complete',
          'Preparing your site',
          'is-handing-off',
        ],
      },
      {
        label: 'Builder contract',
        detail: 'Keeps the intro short, factual, accessible, and reduced-motion safe.',
        terms: ['Brand introduction is another built-in capability', 'status copy only'],
      },
      {
        label: 'Template instructions',
        detail: 'Requires generated pages to mark their actual navigation logo.',
        terms: ['data-siteforge-brand-logo', 'preparation message'],
      },
    ],
  },
  {
    id: 'responsive-sidebar',
    title: 'Mobile & tablet sidebar navigation',
    detail:
      'Keeps the logo and menu control together in the header, then animates the branded trigger-side surface fully in and out while sequencing its approved logo, primary routes, and actions below desktop width.',
    files: [
      {
        label: 'Mobile navigation contract',
        detail:
          'Defines the required accessible behaviour while leaving the generated visual and motion design to Codex.',
        terms: [
          'Creative ownership',
          'Required behaviour',
          'data-siteforge-menu-trigger',
          'icon-only',
          'icon choreography',
          'scroll behaviour',
        ],
      },
      {
        label: 'Builder contract',
        detail: 'Requires Codex to create this page-specific feature from the Markdown contract.',
        terms: ['Navigation is a required generated feature', 'creative ownership'],
      },
      {
        label: 'Template instructions',
        detail: 'Makes the feature contract a required step in every generated page.',
        terms: ['feature-contracts/mobile-navigation.md', 'creative, page-specific feature'],
      },
    ],
  },
  {
    id: 'contextual-logo-selection',
    title: 'Context-aware logo selection',
    detail:
      'Chooses an approved logo-family member for each direct surface and records the light/dark decision for quality review.',
    files: [
      {
        label: 'Builder worker',
        detail:
          'Stages explicit logo-family metadata and verifies declared context against the selected file.',
        terms: ['approvedAssetDescriptor', 'logoFamilyPrimaryAssetId', 'contextualLogoProblems'],
      },
      {
        label: 'Builder contract',
        detail: 'Makes contextual logo selection part of the generated-site contract.',
        terms: ['Contextual logo selection is a required generated feature'],
      },
      {
        label: 'Template instructions',
        detail: 'Requires the builder to inspect the logo inventory before choosing an asset.',
        terms: ['feature-contracts/contextual-logo-selection.md'],
      },
    ],
  },
  {
    id: 'visual-content-recovery',
    title: 'Semantic recovery from image-based content',
    detail:
      'Groups approved recovered information by source context and semantic role, excludes each source image from reuse, requires complete traceable coverage, and leaves integration, composition, and styling to the builder.',
    files: [
      {
        label: 'Semantic content grouping',
        detail:
          'Creates stable source-page and semantic-role groups while retaining every approved item.',
        terms: [
          'groupApprovedVisualContent',
          'coverageInstruction',
          'integrationInstruction',
          'approvedVisualContentGroups',
          'recoveredContentAssetIds',
        ],
      },
      {
        label: 'Semantic recovery contract',
        detail:
          'Defines mandatory group and item coverage, builder design ownership, semantic fidelity, and provenance annotations.',
        terms: [
          'Required group and item coverage',
          'Builder design decision',
          'data-siteforge-recovered-group-id',
          'data-siteforge-recovered-content-id',
        ],
      },
      {
        label: 'Builder contract',
        detail:
          'Makes grouped semantic coverage mandatory while leaving layout and styling decisions to the builder.',
        terms: [
          'Semantic content recovery is a required generated feature',
          'quality review verifies coverage and semantic fidelity',
        ],
      },
      {
        label: 'Template instructions',
        detail:
          'Requires the builder to decide how each group integrates into the page and annotate every recovered composition.',
        terms: ['feature-contracts/semantic-content-recovery.md'],
      },
      {
        label: 'Builder worker',
        detail:
          'Passes grouped content to Codex and validates complete, content-specific design decisions and semantic coverage.',
        terms: [
          'semanticContentCoverageCheck',
          'semanticCompositionDecisionCheck',
          'must name its actual',
          'contentShape',
          'semanticElementRules',
          'semantic-content-coverage',
          'omits approved recovered group',
        ],
      },
    ],
  },
  {
    id: 'scoped-revision',
    title: 'Scoped page refinement',
    detail:
      'A revision restores the selected private page and prevents unrelated source files from changing.',
    files: [
      {
        label: 'Builder worker',
        detail: 'Creates the compact revision input and enforces the selected-file boundary.',
        terms: ['stageRevisionScope', 'assertScopedRevisionFiles', 'scoped refinement'],
      },
      {
        label: 'Template instructions',
        detail: 'Tells Codex to use the revision scope instead of rebuilding unrelated pages.',
        terms: ['revision-scope.json', 'allowedSourcePaths'],
      },
    ],
  },
];

const lockedFoundationWorkshopFeatureIds = new Set([
  'next-component-architecture',
  'framework-quality-gates',
]);

function agentFeatureHasWorkshopSource(feature?: AgentFeature) {
  if (!feature || lockedFoundationWorkshopFeatureIds.has(feature.id)) return false;
  return feature.files.some((featureFile) => {
    const file = currentAgentPackageFiles.find(
      (candidate) => candidate.label === featureFile.label,
    );
    return file?.path.endsWith('.js') || file?.path.endsWith('.mjs');
  });
}

const agentBehaviourTitles: Record<string, string> = {
  'motion-runtime': 'Entrance motion & factual counters',
  'scoped-revision': 'Scoped page refinement',
  'package-behaviour': 'Package testing behaviour',
  'brand-introduction': 'Brand introduction',
  'hero-handoff': 'Visible hero entrance after the logo handoff',
  'responsive-sidebar': 'Mobile & tablet sidebar navigation',
  'contextual-logo-selection': 'Context-aware logo selection',
  'visual-content-recovery': 'Semantic recovery from image-based content',
  'site-navigation-architecture': 'Multi-page navigation architecture',
  'next-component-architecture': 'Next.js generated component architecture',
  'runtime-profiles': 'Production runtime and capability profiles',
  'framework-quality-gates': 'Framework and responsive quality gates',
};

const legacyProductionBehaviourIds = ['motion-runtime', 'scoped-revision'];

function productionBehaviourInventory(
  agentPackage: AgentPackage,
  packages: AgentPackage[],
  visited = new Set<string>(),
): string[] {
  if (visited.has(agentPackage.id)) return [];
  const nextVisited = new Set(visited).add(agentPackage.id);
  const basePackage = agentPackage.basePackageId
    ? packages.find((candidate) => candidate.id === agentPackage.basePackageId)
    : undefined;
  const inheritedBehaviourIds = basePackage
    ? productionBehaviourInventory(basePackage, packages, nextVisited)
    : legacyProductionBehaviourIds;
  return [...inheritedBehaviourIds, ...(agentPackage.stagedBehaviourIds ?? [])].filter(
    (behaviourId, index, behaviourIds) => behaviourIds.indexOf(behaviourId) === index,
  );
}

function pendingProductionFeatureIds(packages: AgentPackage[]) {
  const publishedPackage = packages.find((candidate) => candidate.status === 'published');
  if (!publishedPackage) return [];
  const publishedFeatures = new Set(productionBehaviourInventory(publishedPackage, packages));
  const developedBehaviourIds = [
    'hero-handoff',
    ...agentPackageFeatures
      .map((feature) => feature.id)
      .filter((featureId) => !legacyProductionBehaviourIds.includes(featureId)),
  ];
  const packageById = new Map(packages.map((candidate) => [candidate.id, candidate]));
  const descendsFromPublished = (candidate: AgentPackage) => {
    let basePackageId = candidate.basePackageId;
    const visited = new Set<string>();
    while (basePackageId && !visited.has(basePackageId)) {
      if (basePackageId === publishedPackage.id) return true;
      visited.add(basePackageId);
      basePackageId = packageById.get(basePackageId)?.basePackageId;
    }
    return false;
  };
  return [
    ...new Set(
      [
        ...developedBehaviourIds,
        ...packages
          .filter(
            (candidate) =>
              (candidate.status === 'test_ready' || candidate.status === 'production_ready') &&
              descendsFromPublished(candidate),
          )
          .flatMap((candidate) => candidate.stagedBehaviourIds ?? []),
      ].filter((featureId) => !publishedFeatures.has(featureId)),
    ),
  ];
}

const semanticRecoveryBehaviourRevision = 16;
const semanticRecoveryLatestEdit =
  'The current semantic-recovery safeguard and its production-release status now appear with the build package version they belong to on Package versions.';

function SemanticRecoverySourceUpdate({
  packageVersion,
  pending,
}: {
  packageVersion: number;
  pending: boolean;
}) {
  return (
    <section
      aria-labelledby="pending-semantic-recovery-title"
      className="agent-studio__source-update"
    >
      <div>
        <Eyebrow>Current source update</Eyebrow>
        <h2 id="pending-semantic-recovery-title">
          Semantic recovery safeguard · v{packageVersion}.{semanticRecoveryBehaviourRevision}
        </h2>
      </div>
      <StatusBadge tone="success">Active in source</StatusBadge>
      <p>{semanticRecoveryLatestEdit}</p>
      <small>
        Production feature status:{' '}
        {pending ? 'awaiting package release.' : `included in package v${packageVersion}.`}
      </small>
    </section>
  );
}

function AgentProductionNotification({ count }: { count: number }) {
  if (!count) return null;
  const label = `${count} new agent feature${count === 1 ? '' : 's'} awaiting production approval`;
  return (
    <span aria-label={label} className="agent-production-notification" title={label}>
      {count}
    </span>
  );
}

function implementationFeatureId(behaviourId: string) {
  if (behaviourId === 'hero-handoff') return 'motion-runtime';
  return behaviourId;
}

function agentBehaviourTitle(behaviourId: string) {
  const knownTitle = agentBehaviourTitles[behaviourId];
  if (knownTitle) return knownTitle;
  return behaviourId
    .split('-')
    .filter(Boolean)
    .map((part, index) => (index === 0 ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : part))
    .join(' ');
}

function agentPackageContractVersion(agentPackage?: AgentPackage) {
  return agentPackage
    ? `made-solid-studio-builder-agent-${agentPackageVersionLabel(agentPackage.version)}`
    : 'made-solid-studio-builder-agent';
}

function agentPackageVersionLabel(version?: number) {
  return typeof version === 'number' && Number.isFinite(version)
    ? `v${version.toFixed(1)}`
    : 'Version unavailable';
}

function brandedFoundationVersion(version: string) {
  return version.replace(/^siteforge-/, 'made-solid-studio-');
}

function brandedBuilderContractVersion(version: string) {
  return version.replace(/^siteforge-/, 'made-solid-studio-');
}

function AgentPackageFeatureList({
  behaviourIds,
  version,
  heading = `Features included in ${agentPackageVersionLabel(version)}`,
  ariaLabel = `Features included in agent package ${agentPackageVersionLabel(version)}`,
}: {
  behaviourIds: string[];
  version: number;
  heading?: string;
  ariaLabel?: string;
}) {
  if (!behaviourIds.length) return null;
  return (
    <div className="agent-package-feature-list">
      <strong>{heading}</strong>
      <ul aria-label={ariaLabel}>
        {behaviourIds.map((behaviourId) => (
          <li key={behaviourId}>
            <Check aria-hidden="true" size={15} />
            <span>{agentBehaviourTitle(behaviourId)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function highlightedFeatureLines(content: string, terms: string[]) {
  const normalizedTerms = terms.map((term) => term.toLowerCase());
  const matches = content
    .split('\n')
    .flatMap((line, index) =>
      normalizedTerms.some((term) => line.toLowerCase().includes(term)) ? [index + 1] : [],
    );
  return [
    ...new Set(matches.flatMap((line) => [line - 1, line, line + 1]).filter((line) => line > 0)),
  ];
}

function FeatureImplementationFiles({
  features,
  heading = 'Feature implementation files',
  detail,
  compact = false,
  collapsible = false,
  onOpenWorkshop,
}: {
  features: AgentFeature[];
  heading?: string;
  detail: string;
  compact?: boolean;
  collapsible?: boolean;
  onOpenWorkshop?: (feature: AgentFeature) => void;
}) {
  const [selection, setSelection] = useState<{
    feature: AgentFeature;
    file: AgentPackageFile;
    terms: string[];
  }>();
  const [showFullFile, setShowFullFile] = useState(false);

  if (!features.length) return null;

  const className = `feature-implementation-files${compact ? ' feature-implementation-files--compact' : ''}${collapsible ? ' feature-implementation-files--collapsible' : ''}`;
  const sourceIntro = (
    <div>
      <Eyebrow>Feature source</Eyebrow>
      <h4>{heading}</h4>
      <p>{detail}</p>
    </div>
  );
  const sourceList = (
    <div className="feature-implementation-files__list">
      {features.map((feature) => (
        <article key={feature.id}>
          <div>
            <strong>{feature.title}</strong>
            <p>{feature.detail}</p>
          </div>
          {onOpenWorkshop && agentFeatureHasWorkshopSource(feature) ? (
            <Button
              className="feature-implementation-files__workshop"
              onClick={() => onOpenWorkshop(feature)}
              size="small"
              type="button"
              variant="secondary"
            >
              <Wrench aria-hidden="true" size={15} />
              Workshop feature
            </Button>
          ) : null}
          <ul>
            {feature.files.map((featureFile) => {
              const file = currentAgentPackageFiles.find(
                (candidate) => candidate.label === featureFile.label,
              );
              if (!file) return null;
              const presentation = agentPackageFilePresentation(file);
              return (
                <li key={`${feature.id}-${file.path}`}>
                  <button
                    onClick={() => {
                      setShowFullFile(false);
                      setSelection({ feature, file, terms: featureFile.terms });
                    }}
                    type="button"
                  >
                    <presentation.Icon
                      aria-hidden="true"
                      className={`agent-package-file-icon agent-package-file-icon--${presentation.tone}`}
                      size={15}
                    />
                    <span>
                      <strong>{file.label}</strong>
                      <code>{file.path}</code>
                      <small
                        className={`agent-package-file-type agent-package-file-type--${presentation.tone}`}
                      >
                        {presentation.label}
                      </small>
                      <small>{featureFile.detail}</small>
                    </span>
                    <ArrowUpRight aria-hidden="true" size={15} />
                  </button>
                  {onOpenWorkshop &&
                  agentFeatureHasWorkshopSource(feature) &&
                  (file.path.endsWith('.js') || file.path.endsWith('.mjs')) ? (
                    <Button
                      aria-label={`Workshop JavaScript: ${file.label}`}
                      className="feature-implementation-files__file-workshop"
                      onClick={() => onOpenWorkshop(feature)}
                      size="small"
                      type="button"
                      variant="quiet"
                    >
                      <Wrench aria-hidden="true" size={14} />
                      Workshop JS
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </article>
      ))}
    </div>
  );

  return (
    <>
      {collapsible ? (
        <details className={className} aria-label={heading}>
          <summary>
            <span>
              <Eyebrow>Feature source</Eyebrow>
              <strong>{heading}</strong>
              <small>Open implementation files and highlighted source.</small>
            </span>
            <ChevronDown aria-hidden="true" size={18} />
          </summary>
          <div className="feature-implementation-files__content">
            {sourceIntro}
            {sourceList}
          </div>
        </details>
      ) : (
        <section className={className} aria-label={heading}>
          {sourceIntro}
          {sourceList}
        </section>
      )}
      <Dialog.Root
        onOpenChange={(open) => {
          if (!open) {
            setSelection(undefined);
            setShowFullFile(false);
          }
        }}
        open={Boolean(selection)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="builder-file-preview-overlay" />
          <Dialog.Content className="builder-file-preview-dialog">
            <div className="builder-file-preview-dialog__header">
              <div>
                <Dialog.Title>{selection?.file.label}</Dialog.Title>
              </div>
              {selection ? (
                <Button
                  aria-pressed={showFullFile}
                  className="builder-file-preview-dialog__source-toggle"
                  onClick={() => setShowFullFile((current) => !current)}
                  size="small"
                  title={
                    showFullFile
                      ? 'Show the focused implementation excerpt'
                      : 'Show the complete file'
                  }
                  type="button"
                  variant="secondary"
                >
                  {showFullFile ? 'Excerpt' : 'Full file'}
                </Button>
              ) : null}
              <Dialog.Close asChild>
                <IconButton label="Close feature file" variant="quiet">
                  <X aria-hidden="true" size={18} />
                </IconButton>
              </Dialog.Close>
            </div>
            {selection
              ? (() => {
                  const highlightedLines = highlightedFeatureLines(
                    selection.file.content,
                    selection.terms,
                  );
                  const excerpt = sourceExcerpt(selection.file.content, highlightedLines);
                  return (
                    <SourcePreview
                      content={showFullFile ? selection.file.content : excerpt.content}
                      highlightedLines={highlightedLines}
                      startLine={showFullFile ? 1 : excerpt.startLine}
                    />
                  );
                })()
              : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

const agentPackageBaseline = [
  {
    label: 'Policy',
    detail:
      'The builder contract treats restrained viewport motion and factual metric counters as built-in behaviour, with accessibility and evidence boundaries.',
  },
  {
    label: 'Foundation',
    detail:
      'The template pins Next.js, TypeScript, Tailwind, Base UI, static export, and a locked React runtime while leaving generated visual components editable.',
  },
  {
    label: 'Quality gate',
    detail:
      'The worker runs format, lint, strict type checks, production compilation, clean-route validation, browser interactions, accessibility, and exact responsive evidence.',
  },
  {
    label: 'Studio workflow',
    detail:
      'Homepage and page tests keep their own directions, previews, files, diagnostics, and history instead of changing a prospect’s full-site build in place.',
  },
] as const;

const agentArchitectureLayers = [
  {
    name: 'Builder foundation',
    purpose:
      'The tested template code and locked package boundary every generated site starts from.',
    behaviour:
      'It provides the pinned Next.js compiler, TypeScript and Tailwind toolchain, Base UI behaviour layer, static export, React runtime, and quality commands.',
    files: ['Motion runtime', 'Template packages', 'Component architecture contract'],
  },
  {
    name: 'Built-in capabilities',
    purpose: 'Reusable behaviours the foundation can safely provide to every appropriate build.',
    behaviour:
      'The foundation supplies difficult mechanics; Codex generates each site’s tokens, primitives, patterns, sections, navigation, layouts, pages, and approved capability interfaces.',
    files: ['Motion runtime', 'Component architecture contract', 'Runtime profiles contract'],
  },
  {
    name: 'Agent package',
    purpose:
      'An immutable, versioned release: the foundation plus its Markdown contract and instructions.',
    behaviour:
      'A prospect build is pinned to the current published package. A derived package can be tested and deliberately promoted without changing earlier runs.',
    files: ['Builder contract', 'Template instructions'],
  },
  {
    name: 'Build direction',
    purpose: 'Optional guidance for one private test or prospect build.',
    behaviour:
      'It can refine a single result or propose a future capability, but it cannot rewrite the published package, foundation, approved facts, or other builds.',
    files: [],
  },
  {
    name: 'Protected delivery',
    purpose:
      'The worker that creates the isolated workspace, applies a selected revision, and saves observable build events.',
    behaviour:
      'It keeps page revisions scoped to their selected private source and persists the worker timeline that the Studio streams live.',
    files: ['Builder worker'],
  },
] as const;

function AgentStudioSectionNavigation({
  section,
  onSelectSection,
}: {
  section: AgentStudioSection;
  onSelectSection: (section: AgentStudioSection) => void;
}) {
  return (
    <nav aria-label="Agent Studio sections" className="agent-studio__section-nav">
      <Button
        aria-current={section === 'refine' ? 'page' : undefined}
        className={section === 'refine' ? 'agent-studio__section-link--active' : undefined}
        onClick={() => onSelectSection('refine')}
        type="button"
        variant="secondary"
      >
        <SlidersHorizontal aria-hidden="true" size={17} />
        Refine
      </Button>
      <Button
        aria-current={section === 'agent' ? 'page' : undefined}
        className={section === 'agent' ? 'agent-studio__section-link--active' : undefined}
        onClick={() => onSelectSection('agent')}
        type="button"
        variant="secondary"
      >
        <FolderTree aria-hidden="true" size={17} />
        Agent architecture
      </Button>
      <Button
        aria-current={section === 'versions' ? 'page' : undefined}
        className={section === 'versions' ? 'agent-studio__section-link--active' : undefined}
        onClick={() => onSelectSection('versions')}
        type="button"
        variant="secondary"
      >
        <PackageCheck aria-hidden="true" size={17} />
        Package versions
      </Button>
    </nav>
  );
}

function agentPackageStatusPresentation(status: AgentPackage['status']) {
  if (status === 'published') {
    return {
      label: 'Current production',
      note: 'Used by every new complete private prospect build.',
      tone: 'success' as const,
    };
  }
  if (status === 'superseded') {
    return {
      label: 'Previous production',
      note: 'Kept as immutable history for builds that were pinned to this release.',
      tone: 'neutral' as const,
    };
  }
  if (status === 'production_ready') {
    return {
      label: 'Production draft',
      note: 'An immutable release candidate. It does not reach new builds until it is published.',
      tone: 'warning' as const,
    };
  }
  if (status === 'test_ready') {
    return {
      label: 'Approved test',
      note: 'Available only to private package tests; complete prospect builds cannot use it.',
      tone: 'success' as const,
    };
  }
  return {
    label: 'Draft',
    note: 'A working package proposal that must be reviewed before private testing.',
    tone: 'warning' as const,
  };
}

function AgentPackageVersionLedger({
  packages,
  pendingProductionFeatureCount,
}: {
  packages: AgentPackage[];
  pendingProductionFeatureCount: number;
}) {
  const packageById = new Map(packages.map((agentPackage) => [agentPackage.id, agentPackage]));
  const orderedPackages = [...packages].sort(
    (left, right) => right.version - left.version || right.createdAt.localeCompare(left.createdAt),
  );

  return (
    <section aria-labelledby="agent-package-ledger-title" className="agent-package-version-ledger">
      <header>
        <div>
          <Eyebrow>Complete version register</Eyebrow>
          <h2 id="agent-package-ledger-title">Every saved build package</h2>
          <p>
            Each package keeps its own release role, parent version, builder contract, foundation,
            and recorded feature notes. Newest exact release first; earlier builds stay pinned to
            the version they used.
          </p>
        </div>
        <strong>
          {orderedPackages.length} saved version{orderedPackages.length === 1 ? '' : 's'}
        </strong>
      </header>
      {orderedPackages.length ? (
        <div className="agent-package-version-ledger__list">
          {orderedPackages.map((agentPackage) => {
            const presentation = agentPackageStatusPresentation(agentPackage.status);
            const basePackage = agentPackage.basePackageId
              ? packageById.get(agentPackage.basePackageId)
              : undefined;
            const behaviourIds = agentPackage.stagedBehaviourIds ?? [];
            return (
              <article key={agentPackage.id}>
                <div className="agent-package-version-ledger__title">
                  <div>
                    <span className="agent-production-version-label">
                      Build package
                      {agentPackage.status === 'published' ? (
                        <AgentProductionNotification count={pendingProductionFeatureCount} />
                      ) : null}
                    </span>
                    <h3>{agentPackageVersionLabel(agentPackage.version)}</h3>
                  </div>
                  <StatusBadge tone={presentation.tone}>{presentation.label}</StatusBadge>
                </div>
                <p>{agentPackage.summary}</p>
                <p className="agent-package-version-ledger__system-note">
                  <strong>System use:</strong> {presentation.note}
                </p>
                <dl>
                  <div>
                    <dt>Based on</dt>
                    <dd>
                      {basePackage ? agentPackageVersionLabel(basePackage.version) : 'Lineage root'}
                    </dd>
                  </div>
                  <div>
                    <dt>Builder contract</dt>
                    <dd>{agentPackageContractVersion(agentPackage)}</dd>
                  </div>
                  <div>
                    <dt>Foundation</dt>
                    <dd>{brandedFoundationVersion(agentPackage.foundationVersion)}</dd>
                  </div>
                </dl>
                {behaviourIds.length ? (
                  <AgentPackageFeatureList
                    ariaLabel={`Recorded changes for build package ${agentPackageVersionLabel(agentPackage.version)}`}
                    behaviourIds={behaviourIds}
                    heading={`${behaviourIds.length} recorded change${behaviourIds.length === 1 ? '' : 's'} in this version`}
                    version={agentPackage.version}
                  />
                ) : (
                  <p className="muted-copy">No version-level feature changes were recorded.</p>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="muted-copy">No build package versions have been saved yet.</p>
      )}
    </section>
  );
}

function AgentPackageConfiguration({
  view,
  architectureMapOpen,
  packages,
  proposals,
  testedPackageIds,
  onArchitectureMapCloseAutoFocus,
  onArchitectureMapOpenChange,
  onRequestProposal,
  onApproveForTesting,
  onApproveForProduction,
  onPromote,
}: {
  view: 'architecture' | 'versions';
  architectureMapOpen: boolean;
  packages: AgentPackage[];
  proposals: AgentPackageProposal[];
  testedPackageIds: Set<string>;
  onArchitectureMapCloseAutoFocus: () => void;
  onArchitectureMapOpenChange: (open: boolean) => void;
  onRequestProposal: (basePackageId: string, direction: string) => Promise<void>;
  onApproveForTesting: (packageId: string) => Promise<void>;
  onApproveForProduction: (packageId: string) => Promise<void>;
  onPromote: (packageId: string) => Promise<void>;
}) {
  const [selectedFile, setSelectedFile] = useState<(typeof currentAgentPackageFiles)[number]>();
  const selectedFileTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [actionPackageId, setActionPackageId] = useState<string>();
  const [packageAction, setPackageAction] = useState<'approve' | 'ready' | 'promote'>();
  const [message, setMessage] = useState('');
  const [workshopFeature, setWorkshopFeature] = useState<AgentFeature>();
  const [workshopDirection, setWorkshopDirection] = useState('');
  const [isSendingWorkshop, setIsSendingWorkshop] = useState(false);
  const [inspectedProductionPackageId, setInspectedProductionPackageId] = useState('');
  const publishedPackage = packages.find((item) => item.status === 'published');
  const draftPackages = packages.filter((item) =>
    ['draft', 'test_ready', 'production_ready'].includes(item.status),
  );
  const releaseCandidate = [...draftPackages]
    .filter(
      (item) =>
        item.basePackageId === publishedPackage?.id &&
        ['test_ready', 'production_ready'].includes(item.status) &&
        (item.stagedBehaviourIds?.length ?? 0) > 0,
    )
    .sort((left, right) => right.version - left.version)[0];
  const releaseFeatureCount = releaseCandidate?.stagedBehaviourIds?.length ?? 0;
  const pendingProductionFeatureCount = pendingProductionFeatureIds(packages).length;
  const releaseHasTestEvidence = releaseCandidate
    ? testedPackageIds.has(releaseCandidate.id)
    : false;
  const releaseIsProductionDraft = releaseCandidate?.status === 'production_ready';
  const isCreatingReleaseDraft =
    actionPackageId === releaseCandidate?.id && packageAction === 'ready';
  const isPublishingRelease =
    actionPackageId === releaseCandidate?.id && packageAction === 'promote';
  const productionVersions = [...packages]
    .filter((item) => ['published', 'superseded', 'production_ready'].includes(item.status))
    .sort((left, right) => right.version - left.version);
  const inspectedProductionPackage =
    productionVersions.find((item) => item.id === inspectedProductionPackageId) ??
    productionVersions[0];
  const inspectedProductionBase = inspectedProductionPackage?.basePackageId
    ? packages.find((item) => item.id === inspectedProductionPackage.basePackageId)
    : undefined;
  const inspectedBehaviourIds = inspectedProductionPackage
    ? productionBehaviourInventory(inspectedProductionPackage, packages)
    : [];
  const inspectedImplementationFeatureIds = inspectedBehaviourIds
    .map(implementationFeatureId)
    .filter((featureId, index, featureIds) => featureIds.indexOf(featureId) === index);
  const inspectedImplementationFeatures = inspectedImplementationFeatureIds
    .map((featureId) => agentPackageFeatures.find((feature) => feature.id === featureId))
    .filter((feature): feature is AgentFeature => Boolean(feature));
  const publishedImplementationFeatures = publishedPackage
    ? productionBehaviourInventory(publishedPackage, packages)
        .map(implementationFeatureId)
        .filter((featureId, index, featureIds) => featureIds.indexOf(featureId) === index)
        .map((featureId) => agentPackageFeatures.find((feature) => feature.id === featureId))
        .filter((feature): feature is AgentFeature => Boolean(feature))
    : [];

  async function runPackageAction(packageId: string, action: 'approve' | 'ready' | 'promote') {
    setActionPackageId(packageId);
    setPackageAction(action);
    setMessage('');
    try {
      if (action === 'approve') await onApproveForTesting(packageId);
      else if (action === 'ready') await onApproveForProduction(packageId);
      else await onPromote(packageId);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'The package state could not be updated.',
      );
    } finally {
      setActionPackageId(undefined);
      setPackageAction(undefined);
    }
  }

  async function sendWorkshopToTesting() {
    if (!publishedPackage || !workshopFeature || !workshopDirection.trim()) return;
    setIsSendingWorkshop(true);
    setMessage('');
    try {
      await onRequestProposal(
        publishedPackage.id,
        `Foundation workshop · ${workshopFeature.title}\n\n${workshopDirection.trim()}`,
      );
      setWorkshopDirection('');
      setWorkshopFeature(undefined);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'The workshop handoff could not be created.',
      );
    } finally {
      setIsSendingWorkshop(false);
    }
  }

  return (
    <div className={`agent-package-config agent-package-config--${view}`}>
      {view === 'versions' ? (
        <>
          <AgentPackageVersionLedger
            packages={packages}
            pendingProductionFeatureCount={pendingProductionFeatureCount}
          />
          <div className="agent-package-config__header">
            <div>
              <div className="agent-package-config__published-row">
                <Eyebrow>Published builder agent</Eyebrow>
                <StatusBadge tone="success">Published</StatusBadge>
              </div>
              <h2 className="agent-production-version-value" id="agent-package-config-title">
                <span>
                  Builder agent package · {agentPackageVersionLabel(publishedPackage?.version ?? 4)}
                </span>
                <AgentProductionNotification count={pendingProductionFeatureCount} />
              </h2>
              <p className="muted-copy">
                This is the source-controlled package used by every private prospect build. It
                combines the agent policy with the tested builder foundation; it is not a single
                test direction.
              </p>
              {publishedPackage?.stagedBehaviourIds?.length ? (
                <AgentPackageFeatureList
                  behaviourIds={publishedPackage.stagedBehaviourIds}
                  version={publishedPackage.version}
                />
              ) : null}
            </div>
          </div>

          {releaseCandidate ? (
            <section
              aria-labelledby="agent-production-release-title"
              aria-busy={isCreatingReleaseDraft || isPublishingRelease}
              className="agent-package-config__release-callout"
            >
              <div className="agent-package-config__release-icon" aria-hidden="true">
                <PackageCheck size={24} />
              </div>
              <div>
                <Eyebrow>Production release</Eyebrow>
                <h3 id="agent-production-release-title">
                  {releaseIsProductionDraft
                    ? `Production draft ${agentPackageVersionLabel(releaseCandidate.version)}`
                    : `Create production ${agentPackageVersionLabel(releaseCandidate.version)}`}
                </h3>
                <p>
                  {releaseFeatureCount} tested feature{releaseFeatureCount === 1 ? '' : 's'}{' '}
                  {releaseIsProductionDraft
                    ? 'are saved in this immutable production draft. Publishing makes it the package used by future complete prospect builds.'
                    : releaseHasTestEvidence
                      ? `are staged and ready. Create the immutable production draft from the current ${agentPackageVersionLabel(publishedPackage?.version ?? 4)} package; publishing remains a separate confirmation.`
                      : 'are staged. Complete a private homepage test with this package before creating its production draft.'}
                </p>
                <AgentPackageFeatureList
                  behaviourIds={releaseCandidate.stagedBehaviourIds ?? []}
                  version={releaseCandidate.version}
                />
              </div>
              <div className="agent-package-config__release-action">
                <StatusBadge
                  tone={releaseHasTestEvidence || releaseIsProductionDraft ? 'success' : 'warning'}
                >
                  {releaseIsProductionDraft
                    ? 'Unpublished draft'
                    : releaseHasTestEvidence
                      ? `${releaseFeatureCount} ready`
                      : 'Test required'}
                </StatusBadge>
                <Button
                  disabled={
                    actionPackageId === releaseCandidate.id ||
                    (!releaseIsProductionDraft && !releaseHasTestEvidence)
                  }
                  onClick={() =>
                    void runPackageAction(
                      releaseCandidate.id,
                      releaseIsProductionDraft ? 'promote' : 'ready',
                    )
                  }
                  type="button"
                >
                  <PackageCheck aria-hidden="true" size={17} />
                  {isCreatingReleaseDraft
                    ? `Creating production draft ${agentPackageVersionLabel(releaseCandidate.version)}`
                    : isPublishingRelease
                      ? `Publishing ${agentPackageVersionLabel(releaseCandidate.version)}`
                      : releaseIsProductionDraft
                        ? `Publish ${agentPackageVersionLabel(releaseCandidate.version)} to production`
                        : releaseHasTestEvidence
                          ? `Create production ${agentPackageVersionLabel(releaseCandidate.version)} draft`
                          : 'Complete homepage test first'}
                </Button>
              </div>
              {isCreatingReleaseDraft || isPublishingRelease ? (
                <IndeterminateProgress
                  className="agent-package-config__release-progress"
                  detail={
                    isCreatingReleaseDraft
                      ? `Saving ${agentPackageVersionLabel(releaseCandidate.version)} as an unpublished production draft. This can take a few minutes; you can leave this page open.`
                      : `Publishing ${agentPackageVersionLabel(releaseCandidate.version)}. Future complete builds will use it after this finishes.`
                  }
                  label={
                    isCreatingReleaseDraft
                      ? `Creating production draft ${agentPackageVersionLabel(releaseCandidate.version)}`
                      : `Publishing production package ${agentPackageVersionLabel(releaseCandidate.version)}`
                  }
                />
              ) : null}
            </section>
          ) : null}

          <dl className="agent-package-config__identity">
            <div>
              <dt>Published version</dt>
              <dd>
                <strong className="agent-production-version-value">
                  {agentPackageVersionLabel(publishedPackage?.version ?? 4)} · Current production
                  package
                  <AgentProductionNotification count={pendingProductionFeatureCount} />
                </strong>
                <code>{agentPackageContractVersion(publishedPackage)}</code>
              </dd>
            </div>
            <div>
              <dt>Used by</dt>
              <dd>Every complete private prospect website build.</dd>
            </div>
            <div>
              <dt>Studio state</dt>
              <dd>
                {draftPackages.length
                  ? `${draftPackages.length} unpublished package${draftPackages.length === 1 ? '' : 's'} derived from this production package.`
                  : 'No unpublished package exists yet. Test directions are per-run input until you create a package proposal.'}
              </dd>
            </div>
          </dl>
        </>
      ) : null}

      {view === 'architecture' ? (
        <>
          <h2 className="sr-only">Published builder architecture</h2>
          <AgentArchitectureOverview
            contractVersion={agentPackageContractVersion(publishedPackage)}
            foundationVersion={brandedFoundationVersion(
              publishedPackage?.foundationVersion ?? 'made-solid-studio-next-builder-v2',
            )}
            onOpenSource={(label, trigger) => {
              const file = currentAgentPackageFiles.find((candidate) => candidate.label === label);
              if (file) {
                selectedFileTriggerRef.current = trigger;
                setSelectedFile(file);
              }
            }}
            packageVersion={publishedPackage?.version ?? 6}
          />
          <FeatureImplementationFiles
            detail="These source-controlled files implement the capabilities and quality boundaries shown in the architecture above."
            features={publishedImplementationFeatures}
            heading="Built-in feature implementation"
          />

          <Dialog.Root onOpenChange={onArchitectureMapOpenChange} open={architectureMapOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="builder-file-preview-overlay" />
              <Dialog.Content
                aria-describedby="agent-architecture-map-description"
                className="agent-architecture-map-dialog"
                onCloseAutoFocus={(event) => {
                  event.preventDefault();
                  onArchitectureMapCloseAutoFocus();
                }}
              >
                <header className="agent-architecture-map-dialog__header">
                  <div>
                    <Eyebrow>Architecture map</Eyebrow>
                    <Dialog.Title>How a website build is assembled</Dialog.Title>
                  </div>
                  <Dialog.Close asChild>
                    <IconButton label="Close architecture map" variant="quiet">
                      <X aria-hidden="true" size={20} />
                    </IconButton>
                  </Dialog.Close>
                </header>
                <Dialog.Description className="muted-copy" id="agent-architecture-map-description">
                  These layers have different jobs. A build direction uses a package; a package uses
                  tested capabilities and its foundation.
                </Dialog.Description>
                <ol className="agent-package-config__architecture-map">
                  {agentArchitectureLayers.map((layer, index) => (
                    <li key={layer.name}>
                      <span
                        aria-hidden="true"
                        className="agent-package-config__architecture-number"
                      >
                        {index + 1}
                      </span>
                      <div>
                        <strong>{layer.name}</strong>
                        <p>{layer.purpose}</p>
                        <small>{layer.behaviour}</small>
                        {layer.files.length ? (
                          <div className="agent-package-config__layer-files">
                            {layer.files.map((label) => {
                              const file = currentAgentPackageFiles.find(
                                (item) => item.label === label,
                              );
                              return file ? (
                                <button
                                  key={file.path}
                                  onClick={() => {
                                    onArchitectureMapOpenChange(false);
                                    setSelectedFile(file);
                                  }}
                                  type="button"
                                >
                                  <FileText aria-hidden="true" size={14} />
                                  View {file.label}
                                </button>
                              ) : null;
                            })}
                          </div>
                        ) : (
                          <span className="agent-package-config__run-scoped">
                            Stored with each run
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </>
      ) : null}

      {view === 'versions' ? (
        <>
          <section
            aria-labelledby="production-feature-versions-title"
            className="production-feature-versions"
          >
            <div className="production-feature-versions__overview">
              <header className="production-feature-versions__header">
                <div>
                  <Eyebrow>Production feature history</Eyebrow>
                  <h3 id="production-feature-versions-title">Built-in features by version</h3>
                  <p>
                    Select a production release or unpublished production draft to inspect its
                    complete feature inventory and the changes recorded against its base version.
                  </p>
                </div>
                <label>
                  <span className="agent-production-version-label">
                    Production version
                    <AgentProductionNotification count={pendingProductionFeatureCount} />
                  </span>
                  <select
                    onChange={(event) => setInspectedProductionPackageId(event.currentTarget.value)}
                    value={inspectedProductionPackage?.id ?? ''}
                  >
                    {productionVersions.map((agentPackage) => (
                      <option key={agentPackage.id} value={agentPackage.id}>
                        {agentPackageVersionLabel(agentPackage.version)} ·{' '}
                        {agentPackage.status === 'published'
                          ? `Published${
                              pendingProductionFeatureCount
                                ? ` · ${pendingProductionFeatureCount} awaiting approval`
                                : ''
                            }`
                          : agentPackage.status === 'production_ready'
                            ? 'Unpublished production draft'
                            : 'Previous production'}
                      </option>
                    ))}
                  </select>
                </label>
              </header>

              {inspectedProductionPackage ? (
                <>
                  <div className="production-feature-versions__summary">
                    <div>
                      <StatusBadge
                        tone={
                          inspectedProductionPackage.status === 'published' ? 'success' : 'neutral'
                        }
                      >
                        {inspectedProductionPackage.status === 'published'
                          ? 'Current production'
                          : inspectedProductionPackage.status === 'production_ready'
                            ? 'Unpublished draft'
                            : 'Previous production'}
                      </StatusBadge>
                      <h4 className="agent-production-version-value">
                        Agent package {agentPackageVersionLabel(inspectedProductionPackage.version)}
                        {inspectedProductionPackage.status === 'published' ? (
                          <AgentProductionNotification count={pendingProductionFeatureCount} />
                        ) : null}
                      </h4>
                      <p>{inspectedProductionPackage.summary}</p>
                    </div>
                    <dl>
                      <div>
                        <dt>Based on</dt>
                        <dd>
                          {inspectedProductionBase
                            ? `Production ${agentPackageVersionLabel(inspectedProductionBase.version)}`
                            : `Published ${agentPackageVersionLabel(inspectedProductionPackage.version)} lineage root`}
                        </dd>
                      </div>
                      <div>
                        <dt>Builder contract</dt>
                        <dd>{agentPackageContractVersion(inspectedProductionPackage)}</dd>
                      </div>
                      <div>
                        <dt>Foundation</dt>
                        <dd>
                          {brandedFoundationVersion(inspectedProductionPackage.foundationVersion)}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="production-feature-versions__comparison">
                    <section aria-labelledby="production-version-changes-title">
                      <Eyebrow>Version difference</Eyebrow>
                      <h4 id="production-version-changes-title">
                        {inspectedProductionBase
                          ? `Changes from ${agentPackageVersionLabel(inspectedProductionBase.version)}`
                          : `Published ${agentPackageVersionLabel(inspectedProductionPackage.version)} baseline`}
                      </h4>
                      {inspectedProductionPackage.stagedBehaviourIds?.length ? (
                        <AgentPackageFeatureList
                          ariaLabel={`Changes introduced in agent package ${agentPackageVersionLabel(inspectedProductionPackage.version)}`}
                          behaviourIds={inspectedProductionPackage.stagedBehaviourIds}
                          heading={`${inspectedProductionPackage.stagedBehaviourIds.length} recorded feature change${inspectedProductionPackage.stagedBehaviourIds.length === 1 ? '' : 's'}`}
                          version={inspectedProductionPackage.version}
                        />
                      ) : (
                        <p className="muted-copy">
                          This published lineage root has no version-level feature additions
                          recorded.
                        </p>
                      )}
                    </section>
                    <section aria-labelledby="production-version-inventory-title">
                      <Eyebrow>Complete inventory</Eyebrow>
                      <h4 id="production-version-inventory-title">
                        Built into production{' '}
                        {agentPackageVersionLabel(inspectedProductionPackage.version)}
                      </h4>
                      <AgentPackageFeatureList
                        ariaLabel={`Complete feature inventory for agent package ${agentPackageVersionLabel(inspectedProductionPackage.version)}`}
                        behaviourIds={inspectedBehaviourIds}
                        heading={`${inspectedBehaviourIds.length} built-in feature${inspectedBehaviourIds.length === 1 ? '' : 's'}`}
                        version={inspectedProductionPackage.version}
                      />
                    </section>
                  </div>

                  {inspectedProductionPackage.version <= 4 ? (
                    <p className="production-feature-versions__legacy-note">
                      <strong>Historical source boundary.</strong> v4 predates immutable per-feature
                      file snapshots. The inventory shows its recorded baseline only; current source
                      files are not presented as an exact v4 snapshot.
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="muted-copy">No production package versions are available yet.</p>
              )}
            </div>

            {inspectedProductionPackage && inspectedProductionPackage.version > 4 ? (
              <FeatureImplementationFiles
                detail={`These are the implementation files associated with the recorded features in production ${agentPackageVersionLabel(inspectedProductionPackage.version)}. Open a file to inspect its enabling lines.`}
                features={inspectedImplementationFeatures}
                heading={`Built-in feature implementation · ${agentPackageVersionLabel(inspectedProductionPackage.version)}`}
                onOpenWorkshop={
                  inspectedProductionPackage.status === 'published' ? setWorkshopFeature : undefined
                }
              />
            ) : null}
          </section>

          <Dialog.Root
            onOpenChange={(open) => {
              if (!open) {
                setWorkshopFeature(undefined);
                setWorkshopDirection('');
              }
            }}
            open={Boolean(workshopFeature)}
          >
            <Dialog.Portal>
              <Dialog.Overlay className="builder-file-preview-overlay" />
              <Dialog.Content className="foundation-workshop-dialog">
                <div className="foundation-workshop-dialog__header">
                  <div>
                    <Eyebrow>Foundation workshop</Eyebrow>
                    <Dialog.Title>{workshopFeature?.title}</Dialog.Title>
                    <p>
                      Workshop revision {agentPackageVersionLabel(publishedPackage?.version ?? 4)}.2
                    </p>
                  </div>
                  <StatusBadge tone="success">
                    <Wrench aria-hidden="true" size={14} /> Workshoped
                  </StatusBadge>
                  <Dialog.Close asChild>
                    <IconButton label="Close foundation workshop" variant="quiet">
                      <X aria-hidden="true" size={18} />
                    </IconButton>
                  </Dialog.Close>
                </div>
                <p className="muted-copy">
                  This is the protected source-feature workspace: refine the JavaScript
                  implementation here with Codex, then send the agreed behaviour to a private test
                  package. It does not make the page-building agent recreate the hard-coded feature.
                </p>
                <label className="foundation-workshop-dialog__direction">
                  <span>Workshop change for the next test behaviour</span>
                  <textarea
                    maxLength={4000}
                    onChange={(event) => setWorkshopDirection(event.target.value)}
                    placeholder="For example: make the mobile menu icon morph more slowly and stagger each navigation link by 80ms."
                    rows={5}
                    value={workshopDirection}
                  />
                </label>
                <ButtonGroup className="foundation-workshop-dialog__actions">
                  <Button
                    disabled={!workshopDirection.trim() || isSendingWorkshop}
                    onClick={() => void sendWorkshopToTesting()}
                    type="button"
                  >
                    <CheckCheck aria-hidden="true" size={16} />
                    {isSendingWorkshop ? 'Sending to test' : 'Approve & send to test feature'}
                  </Button>
                  <small>
                    Sending creates a versioned test-package proposal. The current production
                    package remains unchanged.
                  </small>
                </ButtonGroup>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </>
      ) : null}

      {view === 'architecture' ? (
        <>
          <section
            className="agent-package-config__delivery"
            aria-labelledby="agent-delivery-title"
          >
            <div>
              <Eyebrow>Protected delivery system</Eyebrow>
              <h3 id="agent-delivery-title">How the package reaches a private preview</h3>
            </div>
            <p>
              The server-side builder worker creates a disposable workspace from the locked
              foundation, supplies the selected package and build direction to Codex, then saves
              source, logs, screenshots, and quality results against that run. It never publishes a
              prospect site.
            </p>
          </section>

          <section
            aria-labelledby="agent-capability-decision-title"
            className="agent-package-config__decision"
          >
            <div>
              <Eyebrow>Refinement boundary</Eyebrow>
              <h3 id="agent-capability-decision-title">
                Directions can propose a capability, not create one
              </h3>
              <p>
                A test direction can change how the current package is used, or reveal that a new
                capability would be useful. It must not silently write a shared runtime for future
                builds.
              </p>
            </div>
            <ol>
              <li>
                <strong>Test direction</strong>
                <span>Scoped to one private build and stored with that run.</span>
              </li>
              <li>
                <strong>Capability proposal</strong>
                <span>Review whether the idea needs policy only or new tested source code.</span>
              </li>
              <li>
                <strong>Package release</strong>
                <span>
                  Test, document, version, and publish the approved change for future builds.
                </span>
              </li>
            </ol>
          </section>
        </>
      ) : null}

      {view === 'versions' ? (
        <>
          <section
            aria-labelledby="agent-package-versions-title"
            className="agent-package-config__versions"
          >
            <div>
              <Eyebrow>Package versions</Eyebrow>
              <h3 id="agent-package-versions-title">Published baseline</h3>
              <p>
                Published and test-ready packages are immutable. A test package is always derived
                from a published base; a complete prospect build uses only the currently published
                package.
              </p>
            </div>
            <div className="agent-package-config__version-row">
              <StatusBadge tone="success">Published</StatusBadge>
              <strong className="agent-production-version-value">
                {agentPackageVersionLabel(publishedPackage?.version ?? 4)} · Current production
                package
                <AgentProductionNotification count={pendingProductionFeatureCount} />
              </strong>
              <span>Prospect builds use this package today.</span>
            </div>
          </section>

          {proposals.length || draftPackages.length ? (
            <section
              className="agent-package-config__drafts"
              aria-labelledby="agent-package-drafts-title"
            >
              <div>
                <Eyebrow>Derived test versions</Eyebrow>
                <h3 id="agent-package-drafts-title">Review, test, then promote</h3>
                <p>
                  Test versions are pinned to their derived package. Once a tested behaviour is
                  approved as a production draft, it is removed from future test choices until a
                  later explicit publish action. Neither action rewrites an earlier build.
                </p>
              </div>
              <div className="agent-package-config__draft-list">
                {proposals.map((proposal) => {
                  const draft = packages.find((item) => item.id === proposal.draftPackageId);
                  const basePackage = packages.find((item) => item.id === proposal.basePackageId);
                  return (
                    <article key={proposal.id}>
                      <div>
                        <strong>
                          {draft
                            ? `${agentPackageVersionLabel(draft.version)} test package · derived from ${agentPackageVersionLabel(basePackage?.version)}`
                            : 'Package proposal'}
                        </strong>
                        <StatusBadge
                          tone={
                            proposal.status === 'failed' || proposal.status === 'rejected'
                              ? 'danger'
                              : proposal.status === 'ready' || proposal.status === 'accepted'
                                ? 'success'
                                : 'warning'
                          }
                        >
                          {proposal.status.replace('_', ' ')}
                        </StatusBadge>
                      </div>
                      <p>{proposal.summary ?? proposal.direction}</p>
                      {draft?.stagedBehaviourIds?.length ? (
                        <AgentPackageFeatureList
                          behaviourIds={draft.stagedBehaviourIds}
                          version={draft.version}
                        />
                      ) : null}
                      {proposal.capabilityAssessment === 'foundation_change_required' ? (
                        <p className="agent-package-config__foundation-note">
                          <strong>Foundation change required.</strong> {proposal.capabilityProposal}
                        </p>
                      ) : null}
                      {proposal.errorSummary ? (
                        <p className="error-copy">{proposal.errorSummary}</p>
                      ) : null}
                      {draft ? (
                        <details className="agent-package-config__draft-diff">
                          <summary>
                            Review {agentPackageVersionLabel(draft.version)} package addenda
                          </summary>
                          {draft.contractAddendum ? (
                            <div>
                              <strong>Builder contract addendum</strong>
                              <pre>{draft.contractAddendum}</pre>
                            </div>
                          ) : null}
                          {draft.instructionsAddendum ? (
                            <div>
                              <strong>Template instructions addendum</strong>
                              <pre>{draft.instructionsAddendum}</pre>
                            </div>
                          ) : null}
                          {!draft.contractAddendum && !draft.instructionsAddendum ? (
                            <p>
                              No Markdown addendum was generated for this foundation-change
                              proposal.
                            </p>
                          ) : null}
                        </details>
                      ) : null}
                      {draft?.status === 'draft' &&
                      proposal.capabilityAssessment === 'policy_only' ? (
                        <Button
                          disabled={actionPackageId === draft.id}
                          onClick={() => void runPackageAction(draft.id, 'approve')}
                          type="button"
                          variant="secondary"
                        >
                          <Check aria-hidden="true" size={16} />
                          {actionPackageId === draft.id
                            ? 'Approving package'
                            : `Approve ${agentPackageVersionLabel(draft.version)} for testing`}
                        </Button>
                      ) : null}
                      {draft?.status === 'test_ready' ? (
                        <>
                          <Button
                            disabled={
                              actionPackageId === draft.id || !testedPackageIds.has(draft.id)
                            }
                            onClick={() => void runPackageAction(draft.id, 'ready')}
                            type="button"
                          >
                            <CheckCheck aria-hidden="true" size={16} />
                            {actionPackageId === draft.id
                              ? 'Saving production draft'
                              : `Approve ${agentPackageVersionLabel(draft.version)} as production draft`}
                          </Button>
                          {!testedPackageIds.has(draft.id) ? (
                            <p>
                              Complete a private homepage test before saving this production draft.
                            </p>
                          ) : null}
                        </>
                      ) : null}
                      {draft?.status === 'production_ready' ? (
                        <>
                          <p className="agent-package-config__foundation-note">
                            <strong>Production draft saved.</strong> This behaviour is preserved for
                            a future release and is no longer selectable for new test builds.
                          </p>
                          <Button
                            disabled={actionPackageId === draft.id}
                            onClick={() => void runPackageAction(draft.id, 'promote')}
                            type="button"
                          >
                            <CheckCheck aria-hidden="true" size={16} />
                            {actionPackageId === draft.id
                              ? 'Publishing package'
                              : `Publish ${agentPackageVersionLabel(draft.version)} to production`}
                          </Button>
                        </>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          {message ? (
            <p className="error-copy" role="alert">
              {message}
            </p>
          ) : null}
        </>
      ) : null}

      {view === 'architecture' ? (
        <section
          className="agent-package-config__details"
          aria-labelledby="agent-package-files-title"
        >
          <div className="agent-package-config__details-header">
            <div>
              <Eyebrow>Inspectable files</Eyebrow>
              <h3 id="agent-package-files-title">Open the package source</h3>
              <p>
                These are the source-controlled files behind the current package. Select one to read
                it in a focused, scrollable viewer.
              </p>
            </div>
            <small>{currentAgentPackageFiles.length} protected policy and foundation files</small>
          </div>
          <div className="agent-package-config__file-list">
            {currentAgentPackageFiles.map((file) => (
              <button key={file.path} onClick={() => setSelectedFile(file)} type="button">
                <FileText aria-hidden="true" size={18} />
                <span>
                  <small>{file.group}</small>
                  <strong>{file.label}</strong>
                  <small>{file.detail}</small>
                  <code>{file.path}</code>
                </span>
                <ArrowUpRight aria-hidden="true" size={16} />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {view === 'versions' ? (
        <section
          aria-labelledby="agent-package-baseline-title"
          className="agent-package-config__baseline"
        >
          <div>
            <Eyebrow>Current baseline changes</Eyebrow>
            <h3 id="agent-package-baseline-title">What is in the package and Studio now</h3>
            <p>
              This is a current-state record, not an invented historical changelog. Future package
              releases save an immutable policy diff and promotion record here.
            </p>
          </div>
          <ul>
            {agentPackageBaseline.map((item) => (
              <li key={item.label}>
                <strong>{item.label}</strong>
                <span>{item.detail}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {view === 'architecture' ? (
        <Dialog.Root
          onOpenChange={(open) => !open && setSelectedFile(undefined)}
          open={Boolean(selectedFile)}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="builder-file-preview-overlay" />
            <Dialog.Content
              className="builder-file-preview-dialog agent-package-config__dialog"
              onCloseAutoFocus={(event) => {
                if (!selectedFileTriggerRef.current) return;
                event.preventDefault();
                selectedFileTriggerRef.current.focus();
                selectedFileTriggerRef.current = null;
              }}
            >
              <div className="builder-file-preview-dialog__header">
                <div>
                  <div className="agent-production-version-label">
                    <Eyebrow>
                      {selectedFile?.group ?? 'Agent package'} ·{' '}
                      {agentPackageVersionLabel(publishedPackage?.version ?? 4)}
                    </Eyebrow>
                    <AgentProductionNotification count={pendingProductionFeatureCount} />
                  </div>
                  <Dialog.Title>{selectedFile?.label}</Dialog.Title>
                </div>
                <Dialog.Close asChild>
                  <IconButton label="Close agent file" variant="quiet">
                    <X aria-hidden="true" size={18} />
                  </IconButton>
                </Dialog.Close>
              </div>
              <Dialog.Description className="muted-copy">
                <code>{selectedFile?.path}</code>
              </Dialog.Description>
              <pre className="builder-file-preview-dialog__source">{selectedFile?.content}</pre>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      ) : null}
    </div>
  );
}

function AgentStudioPage({
  workspaces,
  agentPackages,
  agentPackageProposals,
  section,
  selectedBusinessId,
  onSelectSection,
  onSelectWorkspace,
  onOpenProspect,
  onOpenUsageAnalysis,
  onRequestBuild,
  onResumeBuild,
  onCancelBuild,
  onDeleteBuild,
  onOpenPreview,
  onLoadBuildEvidence,
  onMoveToAgentStudio,
  onRequestSiteTest,
  onRequestAgentPackageProposal,
  onApproveAgentPackageForTesting,
  onStageAgentPackageBehaviours,
  onApproveAgentPackageForProduction,
  onPromoteAgentPackage,
}: {
  workspaces: ProspectWorkspace[];
  agentPackages: AgentPackage[];
  agentPackageProposals: AgentPackageProposal[];
  section: AgentStudioSection;
  selectedBusinessId?: string;
  onSelectSection: (section: AgentStudioSection) => void;
  onSelectWorkspace: (businessId: string) => void;
  onOpenProspect: (businessId: string) => void;
  onOpenUsageAnalysis: (builderRunId: string) => void;
  onRequestBuild: (
    businessId: string,
    mode: BuilderRunMode,
    targetSourceUrl?: string,
    buildInstruction?: string,
    agentPackageId?: string,
    sourceBuilderRunId?: string,
    targetSourceUrls?: string[],
  ) => Promise<void>;
  onResumeBuild: (builderRunId: string) => Promise<void>;
  onCancelBuild: (businessId: string) => Promise<void>;
  onDeleteBuild: (businessId: string) => Promise<void>;
  onOpenPreview: (builderRunId: string, mode?: BuilderPreviewMode) => Promise<string>;
  onLoadBuildEvidence: (builderRunId: string) => Promise<BuilderRunEvidence>;
  onMoveToAgentStudio: (builderRunId: string) => Promise<void>;
  onRequestSiteTest: (
    sourceBuilderRunId: string,
    buildInstruction: string,
    agentPackageId: string,
    featureId: string,
  ) => Promise<void>;
  onRequestAgentPackageProposal: (basePackageId: string, direction: string) => Promise<void>;
  onApproveAgentPackageForTesting: (packageId: string) => Promise<void>;
  onStageAgentPackageBehaviours: (packageId: string, behaviourIds: string[]) => Promise<void>;
  onApproveAgentPackageForProduction: (packageId: string) => Promise<void>;
  onPromoteAgentPackage: (packageId: string) => Promise<void>;
}) {
  const testWorkspaces = workspaces.filter(
    (workspace) =>
      workspace.buildManifest &&
      workspace.redesignBrief?.status === 'approved' &&
      workspace.buildManifest.redesignBriefId === workspace.redesignBrief.id,
  );
  const selectedWorkspace = testWorkspaces.find(
    (workspace) => workspace.business.id === selectedBusinessId,
  );
  const testProspectLogos = testWorkspaces.flatMap((workspace) => {
    const logoId = workspace.brandKit?.primaryLogoAssetId;
    const logo = logoId
      ? workspace.artifacts.find((artifact) => artifact.id === logoId)
      : undefined;
    return logo ? [logo] : [];
  });
  const { urls: testProspectLogoUrls } = usePrivateArtifactUrls(
    testProspectLogos,
    'Some prospect logos could not be loaded.',
  );
  const [prospectPickerOpen, setProspectPickerOpen] = useState(false);
  const [architectureMapOpen, setArchitectureMapOpen] = useState(false);
  const architectureMapTriggerRef = useRef<HTMLButtonElement>(null);
  const selectedLogo = selectedWorkspace?.brandKit?.primaryLogoAssetId
    ? selectedWorkspace.artifacts.find(
        (artifact) => artifact.id === selectedWorkspace.brandKit?.primaryLogoAssetId,
      )
    : undefined;
  const isArchitecturePage = section === 'agent';
  const isVersionsPage = section === 'versions';
  const publishedAgentPackage = agentPackages.find((item) => item.status === 'published');
  const semanticRecoveryUpdatePending =
    pendingProductionFeatureIds(agentPackages).includes('visual-content-recovery');
  const testedPackageIds = new Set(
    workspaces.flatMap((workspace) =>
      workspace.builderRuns
        .filter(
          (run) =>
            run.buildMode === 'homepage_test' &&
            (run.status === 'ready' || run.status === 'review_required') &&
            Boolean(run.agentPackageId),
        )
        .map((run) => run.agentPackageId as string),
    ),
  );

  return (
    <section className="agent-studio" aria-labelledby="agent-studio-title">
      <div className="agent-studio__header">
        <div>
          <Eyebrow>Agent Studio</Eyebrow>
          <h1 id="agent-studio-title">
            {isArchitecturePage
              ? 'Builder agent architecture'
              : isVersionsPage
                ? 'Build package versions'
                : 'Refine the builder, not a prospect'}
          </h1>
          <p className="muted-copy">
            {isArchitecturePage
              ? 'See how the builder foundation, built-in capabilities, package contract, build direction, and protected delivery worker fit together.'
              : isVersionsPage
                ? 'Review every saved build package, the system that can use it, its release notes, complete feature inventory, and its path from test version to production.'
                : 'Use a prepared prospect only as a private test harness. Directions refine one test run; the published package remains unchanged until a reviewed release exists.'}
          </p>
        </div>
        <div className="agent-studio__header-actions">
          <AgentStudioSectionNavigation onSelectSection={onSelectSection} section={section} />
          <BuilderSettingsControl iconOnly />
          {isArchitecturePage ? (
            <IconButton
              className="agent-studio__architecture-map-trigger"
              label="Open architecture map"
              onClick={() => setArchitectureMapOpen(true)}
              ref={architectureMapTriggerRef}
              variant="secondary"
            >
              <CircleHelp aria-hidden="true" size={19} />
            </IconButton>
          ) : null}
        </div>
      </div>

      {isVersionsPage ? (
        <SemanticRecoverySourceUpdate
          packageVersion={publishedAgentPackage?.version ?? 6}
          pending={semanticRecoveryUpdatePending}
        />
      ) : null}

      {isArchitecturePage || isVersionsPage ? (
        <AgentPackageConfiguration
          architectureMapOpen={architectureMapOpen}
          onApproveForTesting={onApproveAgentPackageForTesting}
          onApproveForProduction={onApproveAgentPackageForProduction}
          onArchitectureMapCloseAutoFocus={() => architectureMapTriggerRef.current?.focus()}
          onArchitectureMapOpenChange={setArchitectureMapOpen}
          onPromote={onPromoteAgentPackage}
          onRequestProposal={onRequestAgentPackageProposal}
          packages={agentPackages}
          proposals={agentPackageProposals}
          testedPackageIds={testedPackageIds}
          view={isArchitecturePage ? 'architecture' : 'versions'}
        />
      ) : testWorkspaces.length ? (
        <section className="agent-studio__test" aria-labelledby="agent-studio-test-title">
          <div className="agent-studio__test-header">
            <div>
              <div className="agent-studio__test-eyebrow">
                <Eyebrow>Testing with</Eyebrow>
                <span className="agent-studio__test-help">
                  <button aria-describedby="agent-studio-test-help-copy" type="button">
                    <CircleHelp aria-hidden="true" size={18} />
                    <span className="sr-only">About private test builds</span>
                  </button>
                  <span id="agent-studio-test-help-copy" role="tooltip">
                    A test uses approved research and brand context for a private run. It never
                    changes the prospect’s live website.
                  </span>
                </span>
              </div>
              <h2 className="sr-only" id="agent-studio-test-title">
                Choose a prepared prospect
              </h2>
              <div className="agent-studio__prospect-picker">
                <Button
                  aria-controls="agent-studio-prospect-options"
                  aria-expanded={prospectPickerOpen}
                  aria-haspopup="listbox"
                  className="agent-studio__prospect-picker-trigger"
                  onClick={() => setProspectPickerOpen((open) => !open)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') setProspectPickerOpen(false);
                  }}
                  type="button"
                  variant="secondary"
                >
                  {selectedLogo && testProspectLogoUrls[selectedLogo.id] ? (
                    <img alt="" src={testProspectLogoUrls[selectedLogo.id]} />
                  ) : (
                    <span aria-hidden="true" className="agent-studio__prospect-picker-monogram">
                      {(selectedWorkspace?.business.name ?? 'Choose').slice(0, 1)}
                    </span>
                  )}
                  <span>
                    <small>Prepared prospect</small>
                    <strong>{selectedWorkspace?.business.name ?? 'Choose a prospect'}</strong>
                  </span>
                  <ChevronDown aria-hidden="true" size={20} />
                </Button>
                {prospectPickerOpen ? (
                  <div
                    aria-label="Prepared prospects"
                    className="agent-studio__prospect-picker-menu"
                    id="agent-studio-prospect-options"
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') setProspectPickerOpen(false);
                    }}
                    role="listbox"
                  >
                    {testWorkspaces.map((workspace) => {
                      const logoId = workspace.brandKit?.primaryLogoAssetId;
                      const logo = logoId
                        ? workspace.artifacts.find((artifact) => artifact.id === logoId)
                        : undefined;
                      const selected = workspace.business.id === selectedWorkspace?.business.id;
                      return (
                        <button
                          aria-selected={selected}
                          className="agent-studio__prospect-picker-option"
                          key={workspace.business.id}
                          onClick={() => {
                            onSelectWorkspace(workspace.business.id);
                            setProspectPickerOpen(false);
                          }}
                          role="option"
                          type="button"
                        >
                          {logo && testProspectLogoUrls[logo.id] ? (
                            <img alt="" src={testProspectLogoUrls[logo.id]} />
                          ) : (
                            <span
                              aria-hidden="true"
                              className="agent-studio__prospect-picker-monogram"
                            >
                              {workspace.business.name.slice(0, 1)}
                            </span>
                          )}
                          <span>{workspace.business.name}</span>
                          {selected ? <Check aria-hidden="true" size={18} /> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
            {selectedWorkspace ? (
              <Button
                aria-label="Review prospect inputs"
                className="agent-studio__review-inputs"
                onClick={() => onOpenProspect(selectedWorkspace.business.id)}
                title="Review prospect inputs"
                type="button"
                variant="secondary"
              >
                <ArrowUpRight aria-hidden="true" size={16} />
                <span aria-hidden="true" className="agent-studio__review-inputs-label">
                  Review prospect inputs
                </span>
              </Button>
            ) : null}
          </div>
          {selectedWorkspace ? (
            <BuilderRunPanel
              agentPackages={agentPackages}
              buildKind="test"
              onCancelBuild={() => onCancelBuild(selectedWorkspace.business.id)}
              onDeleteBuild={onDeleteBuild}
              onLoadBuildEvidence={onLoadBuildEvidence}
              onMoveToAgentStudio={onMoveToAgentStudio}
              onOpenPreview={onOpenPreview}
              onOpenUsageAnalysis={onOpenUsageAnalysis}
              onRequestProposal={onRequestAgentPackageProposal}
              onResumeBuild={onResumeBuild}
              onRequestSiteTest={onRequestSiteTest}
              onStageBehaviours={onStageAgentPackageBehaviours}
              onRequestBuild={(
                mode,
                targetSourceUrl,
                buildInstruction,
                agentPackageId,
                sourceBuilderRunId,
                targetSourceUrls,
              ) =>
                onRequestBuild(
                  selectedWorkspace.business.id,
                  mode,
                  targetSourceUrl,
                  buildInstruction,
                  agentPackageId,
                  sourceBuilderRunId,
                  targetSourceUrls,
                )
              }
              workspace={selectedWorkspace}
            />
          ) : (
            <p className="muted-copy">
              Choose a prepared prospect to open the private test controls.
            </p>
          )}
        </section>
      ) : (
        <EmptyState
          detail="Approve a redesign brief and prepare its Build Manifest in a prospect workspace before using it to test the builder."
          headingLevel={2}
          icon={PackageCheck}
          title="No prepared test prospects"
        />
      )}
    </section>
  );
}

class AgentStudioErrorBoundary extends Component<
  { children: ReactNode; onOpenSafeTesting: () => void; routeKey: string },
  { error?: Error }
> {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, details: ErrorInfo) {
    console.error('Agent Studio could not render.', error, details);
  }

  componentDidUpdate(
    previousProps: Readonly<{
      children: ReactNode;
      onOpenSafeTesting: () => void;
      routeKey: string;
    }>,
  ) {
    if (previousProps.routeKey !== this.props.routeKey && this.state.error) {
      this.setState({ error: undefined });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="agent-studio agent-studio--error" role="alert">
        <Eyebrow>Agent Studio</Eyebrow>
        <h1>Testing could not be displayed</h1>
        <p>
          A saved Testing record could not be rendered. You can open Testing without that saved
          selection, then choose another prepared prospect or retry this one.
        </p>
        <p className="agent-studio__error-detail">
          <strong>Error detail:</strong> {this.state.error.message}
        </p>
        <ButtonGroup>
          <Button onClick={this.props.onOpenSafeTesting}>Open Testing safely</Button>
          <Button onClick={() => window.location.reload()} variant="secondary">
            Retry saved selection
          </Button>
        </ButtonGroup>
      </section>
    );
  }
}

function BuildManifestPanel({
  workspace,
  agentPackages,
  onCreate,
  onRequestBuild,
  onCancelBuild,
  onDeleteBuild,
  onOpenPreview,
  onLoadBuildEvidence,
  onMoveToAgentStudio,
}: {
  workspace: ProspectWorkspace;
  agentPackages: AgentPackage[];
  onCreate: () => Promise<void>;
  onRequestBuild: (
    mode: BuilderRunMode,
    targetSourceUrl?: string,
    buildInstruction?: string,
    agentPackageId?: string,
  ) => Promise<void>;
  onCancelBuild: () => Promise<void>;
  onDeleteBuild: (businessId: string) => Promise<void>;
  onOpenPreview: (builderRunId: string, mode?: BuilderPreviewMode) => Promise<string>;
  onLoadBuildEvidence: (builderRunId: string) => Promise<BuilderRunEvidence>;
  onMoveToAgentStudio: (builderRunId: string) => Promise<void>;
}) {
  const [isPreparing, setIsPreparing] = useState(false);
  const [isManifestOpen, setIsManifestOpen] = useState(false);
  const [message, setMessage] = useState('');
  const brief = workspace.redesignBrief;
  const manifest = workspace.buildManifest;

  async function prepareManifest() {
    setIsPreparing(true);
    setMessage('');
    try {
      await onCreate();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'The Build Manifest could not be prepared.',
      );
    } finally {
      setIsPreparing(false);
    }
  }

  if (!brief || brief.status !== 'approved') {
    return (
      <Card className="workspace-panel brief-empty-state">
        <Eyebrow>Builder handoff</Eyebrow>
        <h2>Approve the redesign brief first</h2>
        <EmptyState
          detail="The Build Manifest is created only from an approved brief, so a future Codex builder receives a stable, human-reviewed strategy and source selection."
          icon={ClipboardCheck}
          title="Builder handoff locked"
        />
      </Card>
    );
  }

  if (!manifest || manifest.redesignBriefId !== brief.id) {
    return (
      <Card className="workspace-panel brief-empty-state">
        <Eyebrow>Builder handoff</Eyebrow>
        <h2>
          {manifest ? 'Prepare the brand-aware Build Manifest' : 'Prepare the Build Manifest'}
        </h2>
        <p className="muted-copy">
          This creates an immutable, private handoff for the future Codex builder. It includes the
          approved brief, selected research, permitted facts, approved asset guidance, open
          questions, and non-negotiable quality rules.
        </p>
        <Button disabled={isPreparing} onClick={() => void prepareManifest()} type="button">
          <Sparkles aria-hidden="true" size={16} />
          {isPreparing
            ? 'Preparing manifest'
            : manifest
              ? 'Prepare replacement manifest'
              : 'Prepare Build Manifest'}
        </Button>
        {message ? (
          <p className="form-message form-message--error" role="alert">
            {message}
          </p>
        ) : null}
      </Card>
    );
  }

  const data = manifest.data;
  const permittedFactCount = Array.isArray(data.permittedFacts) ? data.permittedFacts.length : 0;
  const selectedPageCount = Array.isArray(data.selectedPages) ? data.selectedPages.length : 0;
  const selectedAssetCount = Array.isArray(data.selectedAssets) ? data.selectedAssets.length : 0;
  const approvedAssetCount = Array.isArray(data.approvedAssetGuidance)
    ? data.approvedAssetGuidance.length
    : 0;
  const openQuestionCount = Array.isArray(data.openQuestions) ? data.openQuestions.length : 0;
  const uncertaintyCount = Array.isArray(data.uncertainties) ? data.uncertainties.length : 0;
  const architecture = data.architecture;
  const productionRuntimeLabel =
    architecture?.productionRuntime === 'managed-next-runtime'
      ? 'Managed Next.js runtime'
      : architecture?.productionRuntime === 'managed-forms'
        ? 'Managed forms'
        : 'Static marketing';
  const routeSummary = Array.isArray(data.selectedPages)
    ? data.selectedPages
        .slice(0, 4)
        .map((page) => page.publicPath || page.url)
        .join(', ')
    : '';

  return (
    <Card className="workspace-panel brief-panel">
      <div className="brief-panel__header builder-handoff__header">
        <div className="builder-handoff__topline">
          <Eyebrow>Builder handoff</Eyebrow>
          <div className="builder-handoff__actions">
            <StatusBadge tone="success">Ready for builder</StatusBadge>
          </div>
        </div>
        <div>
          <h2>Build Manifest ready</h2>
          <p className="muted-copy">
            Approved brief v{brief.version} is the permissioned input for every private preview:
            {` ${permittedFactCount}`} permitted facts, {selectedPageCount} selected pages, and{' '}
            {selectedAssetCount} source assets.
          </p>
        </div>
      </div>

      <Dialog.Root onOpenChange={setIsManifestOpen} open={isManifestOpen}>
        <Dialog.Trigger asChild>
          <button aria-haspopup="dialog" className="build-manifest-package" type="button">
            <span className="build-manifest-package__heading">
              <PackageCheck aria-hidden="true" size={22} />
              <span>
                <span className="build-manifest-package__eyebrow">Immutable build package</span>
                <strong>Approved and ready for the builder</strong>
              </span>
              <span className="build-manifest-package__action">Open package</span>
            </span>
            <span className="build-manifest-summary" aria-label="Build Manifest contents">
              <span>
                <span>Permitted facts</span>
                <strong>{permittedFactCount}</strong>
              </span>
              <span>
                <span>Selected pages</span>
                <strong>{selectedPageCount}</strong>
              </span>
              <span>
                <span>Source assets</span>
                <strong>{selectedAssetCount}</strong>
              </span>
              <span>
                <span>Approved reuse assets</span>
                <strong>{approvedAssetCount}</strong>
              </span>
            </span>
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="image-preview-overlay" />
          <Dialog.Content
            aria-describedby="build-manifest-dialog-description"
            className="build-manifest-dialog"
          >
            <div className="build-manifest-dialog__header">
              <div>
                <Eyebrow>Immutable build package</Eyebrow>
                <Dialog.Title>Build Manifest ready</Dialog.Title>
                <Dialog.Description id="build-manifest-dialog-description">
                  Approved brief v{brief.version} is the permissioned input for every private
                  preview created from this package.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <IconButton label="Close Build Manifest" variant="quiet">
                  <X aria-hidden="true" size={18} />
                </IconButton>
              </Dialog.Close>
            </div>
            <dl className="build-manifest-summary" aria-label="Build Manifest contents">
              <div>
                <dt>Permitted facts</dt>
                <dd>{permittedFactCount}</dd>
              </div>
              <div>
                <dt>Selected pages</dt>
                <dd>{selectedPageCount}</dd>
              </div>
              <div>
                <dt>Source assets</dt>
                <dd>{selectedAssetCount}</dd>
              </div>
              <div>
                <dt>Approved reuse assets</dt>
                <dd>{approvedAssetCount}</dd>
              </div>
            </dl>
            <section className="build-manifest-dialog__section">
              <h3>Approved source context</h3>
              <p>
                This immutable handoff links the approved brief, captured research, and permitted
                asset guidance to this build. It is the source of truth for every run below.
              </p>
            </section>
            <section className="build-manifest-dialog__section">
              <h3>Engineering architecture</h3>
              <p>
                This package targets a pinned Next.js App Router and strict TypeScript foundation.
                The agent creates the site-specific visual system and component layers; the
                foundation supplies tested mechanics and verification.
              </p>
              <ul>
                <li>
                  Production profile: <strong>{productionRuntimeLabel}</strong>. The private preview
                  remains a local static export.
                </li>
                <li>
                  Generated layers:{' '}
                  {architecture?.componentLayers?.join(', ') ??
                    'tokens, UI, patterns, sections, site, layouts, and pages'}
                  .
                </li>
                <li>
                  {architecture?.capabilityAdapters?.length ?? 0} approved production capability
                  adapter
                  {(architecture?.capabilityAdapters?.length ?? 0) === 1 ? '' : 's'} recorded.
                </li>
                <li>
                  Clean routes: {routeSummary || 'the selected source routes in this manifest'}.
                </li>
                <li>
                  Responsive and interaction evidence is required at{' '}
                  {architecture?.qualityProfile?.requiredViewports
                    ?.map((viewport) => `${viewport.width}×${viewport.height}`)
                    .join(', ') ?? '320×568, 375×812, 768×1024, and 1440×900'}
                  .
                </li>
              </ul>
            </section>
            <section className="build-manifest-dialog__section">
              <h3>What the builder may use</h3>
              <ul>
                <li>Permitted facts remain tied to their original captured evidence.</li>
                <li>
                  Selected pages and assets are research context, not visual instructions to copy.
                </li>
                <li>
                  Only the {approvedAssetCount} human-approved asset guidance record
                  {approvedAssetCount === 1 ? '' : 's'} authorise visual reuse.
                </li>
                <li>
                  {openQuestionCount + uncertaintyCount} open question
                  {openQuestionCount + uncertaintyCount === 1 ? '' : 's'} or uncertaint
                  {openQuestionCount + uncertaintyCount === 1 ? 'y' : 'ies'} remain for human
                  review.
                </li>
              </ul>
            </section>
            <section className="build-manifest-dialog__section">
              <h3>Private preview rules</h3>
              <p>
                Contract {brandedBuilderContractVersion(manifest.builderContractVersion)}. The
                builder can generate a private preview when ready, but sharing still requires
                further approval.
              </p>
              <ul>
                {Array.isArray(data.builderRules)
                  ? data.builderRules.map((rule) => <li key={rule}>{rule}</li>)
                  : null}
              </ul>
            </section>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <BuilderRunPanel
        agentPackages={agentPackages}
        buildKind="prospect"
        onCancelBuild={onCancelBuild}
        onDeleteBuild={onDeleteBuild}
        onLoadBuildEvidence={onLoadBuildEvidence}
        onMoveToAgentStudio={onMoveToAgentStudio}
        onOpenPreview={onOpenPreview}
        onRequestBuild={onRequestBuild}
        workspace={workspace}
      />
    </Card>
  );
}

function auditStatusLabel(status: Audit['status']) {
  if (status === 'research_pending') return 'Audit queued';
  if (status === 'running') return 'Audit running';
  if (status === 'ready') return 'Audit ready';
  if (status === 'failed') return 'Audit failed';
  if (status === 'cancelled') return 'Audit cancelled';
  return 'Not started';
}

function auditStatusTone(status: Audit['status']) {
  if (status === 'ready') return 'success' as const;
  if (status === 'failed') return 'danger' as const;
  if (status === 'cancelled') return 'warning' as const;
  if (status === 'research_pending' || status === 'running') return 'warning' as const;
  return 'neutral' as const;
}

function findingReviewLabel(state: AuditFinding['reviewState']) {
  if (state === 'approved') return 'Approved';
  if (state === 'blocked') return 'Blocked';
  return 'Needs review';
}

function findingReviewTone(state: AuditFinding['reviewState']) {
  if (state === 'approved') return 'success' as const;
  if (state === 'blocked') return 'danger' as const;
  return 'warning' as const;
}

function FindingEditor({
  finding,
  onUpdate,
}: {
  finding: AuditFinding;
  onUpdate: (
    finding: AuditFinding,
    patch: Pick<AuditFinding, 'title' | 'finding' | 'recommendation' | 'severity' | 'reviewState'>,
  ) => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    title: finding.title,
    finding: finding.finding,
    recommendation: finding.recommendation,
    severity: finding.severity,
    reviewState: finding.reviewState || 'needs_review',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function save(patch = draft) {
    setIsSaving(true);
    setMessage('');
    try {
      await onUpdate(finding, patch);
      setMessage('Finding saved.');
    } catch {
      setMessage('The finding could not be saved. Try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article className="audit-finding">
      <div className="audit-finding__header">
        <div>
          <Eyebrow>{finding.area}</Eyebrow>
          <h4>{finding.title}</h4>
        </div>
        <div className="audit-finding__badges">
          <StatusBadge tone={finding.severity === 'high' ? 'danger' : 'warning'}>
            {finding.severity}
          </StatusBadge>
          <StatusBadge tone={findingReviewTone(finding.reviewState || 'needs_review')}>
            {findingReviewLabel(finding.reviewState || 'needs_review')}
          </StatusBadge>
        </div>
      </div>
      <p>{finding.finding}</p>
      <div className="audit-finding__recommendation">
        <strong>Recommended change</strong>
        <p>{finding.recommendation}</p>
      </div>
      {finding.sourceUrls.length ? (
        <div className="audit-finding__sources">
          <strong>Captured sources</strong>
          {finding.sourceUrls.map((url) => (
            <a href={url} key={url} rel="noreferrer" target="_blank">
              {new URL(url).pathname || '/'}
            </a>
          ))}
        </div>
      ) : null}
      <div className="audit-finding__actions">
        <Button
          disabled={isSaving || finding.reviewState === 'approved'}
          onClick={() => void save({ ...draft, reviewState: 'approved' })}
          type="button"
          variant="secondary"
        >
          <Check aria-hidden="true" size={16} />
          Approve finding
        </Button>
        <Button
          disabled={isSaving || finding.reviewState === 'blocked'}
          onClick={() => void save({ ...draft, reviewState: 'blocked' })}
          type="button"
          variant="quiet"
        >
          <Ban aria-hidden="true" size={16} />
          Block finding
        </Button>
      </div>
      <details className="audit-finding__edit">
        <summary>Edit finding</summary>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <label>
            Title
            <input
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              required
              value={draft.title}
            />
          </label>
          <label>
            Severity
            <select
              onChange={(event) =>
                setDraft({
                  ...draft,
                  severity: event.target.value as AuditFinding['severity'],
                })
              }
              value={draft.severity}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label>
            Finding
            <textarea
              onChange={(event) => setDraft({ ...draft, finding: event.target.value })}
              required
              value={draft.finding}
            />
          </label>
          <label>
            Recommended change
            <textarea
              onChange={(event) => setDraft({ ...draft, recommendation: event.target.value })}
              required
              value={draft.recommendation}
            />
          </label>
          <label>
            Review state
            <select
              onChange={(event) =>
                setDraft({
                  ...draft,
                  reviewState: event.target.value as AuditFinding['reviewState'],
                })
              }
              value={draft.reviewState}
            >
              <option value="needs_review">Needs review</option>
              <option value="approved">Approved</option>
              <option value="blocked">Blocked</option>
            </select>
          </label>
          <Button disabled={isSaving} type="submit">
            <Save aria-hidden="true" size={16} />
            {isSaving ? 'Saving changes' : 'Save changes'}
          </Button>
        </form>
      </details>
      {message ? (
        <p className="audit-finding__message" role="status">
          {message}
        </p>
      ) : null}
    </article>
  );
}

function AuditPanel({
  workspace,
  onRequestAudit,
  onCancelAudit,
  onApproveAllFindings,
  onUpdateFinding,
}: {
  workspace: ProspectWorkspace;
  onRequestAudit: () => Promise<void>;
  onCancelAudit: () => Promise<void>;
  onApproveAllFindings: () => Promise<void>;
  onUpdateFinding: (
    finding: AuditFinding,
    patch: Pick<AuditFinding, 'title' | 'finding' | 'recommendation' | 'severity' | 'reviewState'>,
  ) => Promise<void>;
}) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isApprovingAll, setIsApprovingAll] = useState(false);
  const [message, setMessage] = useState('');
  const audit = workspace.audit;
  const captureReady = workspace.latestCapture?.status === 'ready';
  const isActive =
    Boolean(audit?.crawlRunId) &&
    (audit?.status === 'research_pending' || audit?.status === 'running');
  const displayedStatus =
    isActive ||
    audit?.status === 'ready' ||
    audit?.status === 'failed' ||
    audit?.status === 'cancelled'
      ? (audit?.status ?? 'not_started')
      : 'not_started';
  const findings = audit?.findings ?? [];
  const approvedCount = findings.filter((finding) => finding.reviewState === 'approved').length;
  const pendingFindings = findings.filter((finding) => finding.reviewState === 'needs_review');

  async function requestAudit() {
    setIsRequesting(true);
    setMessage('');
    try {
      await onRequestAudit();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'The audit could not be queued. Confirm that the website capture is complete.',
      );
    } finally {
      setIsRequesting(false);
    }
  }

  async function cancelAudit() {
    setIsCancelling(true);
    setMessage('');
    try {
      await onCancelAudit();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The audit could not be cancelled.');
    } finally {
      setIsCancelling(false);
    }
  }

  async function approveAllFindings() {
    setIsApprovingAll(true);
    setMessage('');
    try {
      await onApproveAllFindings();
      setMessage(`${pendingFindings.length} findings approved.`);
    } catch {
      setMessage('The findings could not all be approved. Try again.');
    } finally {
      setIsApprovingAll(false);
    }
  }

  return (
    <>
      <div className="audit-panel__header">
        <div>
          <Eyebrow>Website audit</Eyebrow>
          <h2>Evidence-led audit</h2>
          <p className="muted-copy">
            The private worker analyses the latest saved capture. Findings stay internal and need
            your judgment before they guide a redesign or a client-facing report.
          </p>
        </div>
        <div className="audit-panel__actions">
          <StatusBadge tone={auditStatusTone(displayedStatus)}>
            {auditStatusLabel(displayedStatus)}
          </StatusBadge>
          <Button
            disabled={!captureReady || isActive || isRequesting}
            onClick={() => void requestAudit()}
            type="button"
          >
            <ClipboardCheck aria-hidden="true" size={16} />
            {isRequesting
              ? 'Queueing audit'
              : isActive
                ? audit?.status === 'running'
                  ? 'Audit running'
                  : 'Audit queued'
                : displayedStatus === 'ready'
                  ? 'Generate audit again'
                  : 'Generate audit'}
          </Button>
          {isActive ? (
            <Button
              disabled={isCancelling || Boolean(audit?.cancelRequestedAt)}
              onClick={() => void cancelAudit()}
              type="button"
              variant="secondary"
            >
              <Ban aria-hidden="true" size={16} />
              {isCancelling || audit?.cancelRequestedAt ? 'Stopping audit' : 'Cancel audit'}
            </Button>
          ) : null}
        </div>
      </div>
      {!captureReady ? (
        <EmptyState
          detail="Complete a website capture before generating an evidence-led audit."
          icon={ClipboardCheck}
          title="Capture required"
        />
      ) : null}
      {isActive ? (
        <div className="capture-progress capture-progress--running">
          <div
            aria-label="Website audit progress"
            aria-valuetext={
              audit?.progressDetail || 'Reading private capture evidence and preparing findings.'
            }
            className="capture-progress__track"
            role="progressbar"
          >
            <span className="capture-progress__bar" />
          </div>
          <span>
            {audit?.progressDetail || 'Reading private capture evidence and preparing findings.'}
            {audit?.totalItems
              ? ` ${audit.completedItems} of ${audit.totalItems} items complete.`
              : ''}
          </span>
        </div>
      ) : null}
      {displayedStatus === 'failed' ? (
        <p className="form-message form-message--error" role="alert">
          The audit could not complete. Confirm the saved capture is available, then generate it
          again.
        </p>
      ) : null}
      {isActive || displayedStatus === 'ready' || displayedStatus === 'cancelled' ? (
        <>
          <dl className="audit-panel__metrics">
            <div>
              <dt>Findings generated</dt>
              <dd>{findings.length}</dd>
            </div>
            <div>
              <dt>Approved findings</dt>
              <dd>{approvedCount}</dd>
            </div>
            <div>
              <dt>Source capture</dt>
              <dd>{workspace.latestCapture?.capturedPageCount ?? 0} pages</dd>
            </div>
          </dl>
          {findings.length ? (
            <section aria-labelledby="audit-findings-title" className="audit-findings">
              <div className="audit-findings__heading">
                <div>
                  <Eyebrow>Generated findings</Eyebrow>
                  <h3 id="audit-findings-title">Review before redesign</h3>
                </div>
                {pendingFindings.length ? (
                  <Button
                    disabled={isApprovingAll}
                    onClick={() => void approveAllFindings()}
                    title="Approves every finding still awaiting review. Blocked findings are unchanged."
                    type="button"
                    variant="secondary"
                  >
                    <CheckCheck aria-hidden="true" size={16} />
                    {isApprovingAll
                      ? 'Approving findings'
                      : `Approve all findings (${pendingFindings.length})`}
                  </Button>
                ) : null}
              </div>
              {findings.map((finding) => (
                <FindingEditor finding={finding} key={finding.id} onUpdate={onUpdateFinding} />
              ))}
            </section>
          ) : (
            <EmptyState
              detail="The current automated checks did not produce findings. This does not replace a visual or manual review."
              icon={SearchCheck}
              title="No automated findings"
            />
          )}
        </>
      ) : null}
      {message ? (
        <p className="form-message form-message--error" role="alert">
          {message}
        </p>
      ) : null}
    </>
  );
}

function WorkspaceContent({
  tab,
  workspace,
  agentPackages,
  toggleTask,
  requestResearchCapture,
  requestAssetRefresh,
  continueResearchCapture,
  cancelResearchCapture,
  requestWebsiteAudit,
  cancelWebsiteAudit,
  requestAssetAnalysis,
  requestEditableLogoRetry,
  deleteLogoAsset,
  cancelAssetAnalysis,
  setAssetAnalysisSelected,
  updateAssetAnnotation,
  requestVisualContentExtraction,
  cancelVisualContentExtraction,
  approveAllVisualContent,
  updateVisualContentCandidate,
  saveBrandKit,
  pushLogoVersionsToBuilder,
  createBrandAwareBriefRevision,
  createRedesignBrief,
  refreshRedesignBriefArchitecture,
  updateRedesignBrief,
  approveRedesignBrief,
  createBuildManifest,
  requestProspectBuild,
  cancelProspectBuild,
  deleteProspectBuilds,
  moveBuilderRunToAgentStudio,
  openBuilderPreview,
  loadBuilderRunEvidence,
  approveAllAuditFindings,
  updateAuditFinding,
}: {
  tab: WorkspaceTab;
  workspace: ProspectWorkspace;
  agentPackages: AgentPackage[];
  toggleTask: (task: Task) => Promise<void>;
  requestResearchCapture: () => Promise<void>;
  requestAssetRefresh: () => Promise<void>;
  continueResearchCapture: () => Promise<void>;
  cancelResearchCapture: () => Promise<void>;
  requestWebsiteAudit: () => Promise<void>;
  cancelWebsiteAudit: () => Promise<void>;
  requestAssetAnalysis: () => Promise<void>;
  requestEditableLogoRetry: (
    asset: ResearchArtifact,
    options: { simplifyGeometry: boolean; vectorizerProvider: 'vtracer' | 'vectorizer_ai' },
  ) => Promise<void>;
  deleteLogoAsset: (asset: ResearchArtifact, onUndo: () => void) => void;
  cancelAssetAnalysis: () => Promise<void>;
  setAssetAnalysisSelected: (asset: ResearchArtifact, selected: boolean) => Promise<void>;
  updateAssetAnnotation: (
    annotation: AssetAnnotation,
    patch: Pick<
      AssetAnnotation,
      'suggestedRole' | 'businessAssociation' | 'reviewState' | 'humanNotes'
    >,
  ) => Promise<void>;
  requestVisualContentExtraction: () => Promise<void>;
  cancelVisualContentExtraction: () => Promise<void>;
  approveAllVisualContent: () => Promise<void>;
  updateVisualContentCandidate: (
    candidate: VisualContentCandidate,
    patch: Pick<
      VisualContentCandidate,
      | 'contentType'
      | 'reviewState'
      | 'humanTitle'
      | 'humanBody'
      | 'humanAttribution'
      | 'humanNotes'
      | 'humanStructuredContent'
    >,
  ) => Promise<void>;
  saveBrandKit: (
    draft: Pick<
      BrandKit,
      'primaryLogoAssetId' | 'editableLogoAssetId' | 'approvedAssetIds' | 'palette' | 'notes'
    >,
    approve?: boolean,
    silent?: boolean,
  ) => Promise<void>;
  pushLogoVersionsToBuilder: (
    draft: Pick<
      BrandKit,
      'primaryLogoAssetId' | 'editableLogoAssetId' | 'approvedAssetIds' | 'palette' | 'notes'
    >,
  ) => Promise<void>;
  createBrandAwareBriefRevision: () => Promise<void>;
  createRedesignBrief: () => Promise<void>;
  refreshRedesignBriefArchitecture: (brief: RedesignBrief) => Promise<void>;
  updateRedesignBrief: (
    brief: RedesignBrief,
    patch: Pick<RedesignBrief, 'sourceSelections' | 'draft'>,
  ) => Promise<void>;
  approveRedesignBrief: (brief: RedesignBrief) => Promise<void>;
  createBuildManifest: () => Promise<void>;
  requestProspectBuild: (
    mode: BuilderRunMode,
    targetSourceUrl?: string,
    buildInstruction?: string,
    agentPackageId?: string,
  ) => Promise<void>;
  cancelProspectBuild: () => Promise<void>;
  deleteProspectBuilds: (businessId: string) => Promise<void>;
  moveBuilderRunToAgentStudio: (builderRunId: string) => Promise<void>;
  openBuilderPreview: (builderRunId: string, mode?: BuilderPreviewMode) => Promise<string>;
  loadBuilderRunEvidence: (builderRunId: string) => Promise<BuilderRunEvidence>;
  approveAllAuditFindings: () => Promise<void>;
  updateAuditFinding: (
    finding: AuditFinding,
    patch: Pick<AuditFinding, 'title' | 'finding' | 'recommendation' | 'severity' | 'reviewState'>,
  ) => Promise<void>;
}) {
  if (tab === 'overview') {
    return (
      <div className="workspace-content-grid">
        <Card>
          <Eyebrow>Current state</Eyebrow>
          <h2>Research first, then decisions</h2>
          <p className="muted-copy">
            This workspace holds the business, website, evidence, audit, redesign and report as
            separate, versionable records.
          </p>
          <dl className="detail-list">
            <div>
              <dt>Website</dt>
              <dd>{workspace.website?.domain ?? 'Not recorded'}</dd>
            </div>
            <div>
              <dt>Research</dt>
              <dd>{captureLabel(workspace.latestCapture?.status)}</dd>
            </div>
            <div>
              <dt>Evidence facts</dt>
              <dd>{workspace.facts.length}</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <Eyebrow>Tasks</Eyebrow>
          <h2>Next internal actions</h2>
          <TaskList onToggle={toggleTask} tasks={workspace.tasks} />
        </Card>
      </div>
    );
  }

  if (tab === 'research') {
    const isCaptureActive = captureIsActive(workspace.latestCapture);
    const captureFailed =
      workspace.latestCapture?.status === 'failed' ||
      workspace.latestCapture?.status === 'cancelled';
    return (
      <Card className="workspace-panel">
        <ResearchCapturePanel
          onCancelCapture={cancelResearchCapture}
          onContinueCapture={continueResearchCapture}
          onRequestCapture={requestResearchCapture}
          onRequestAssetRefresh={requestAssetRefresh}
          workspace={workspace}
        />
        <CapturedSiteMap
          artifacts={workspace.artifacts}
          capture={workspace.latestCapture}
          facts={workspace.facts}
          pages={workspace.capturedPages}
        />
        <PageInventory
          assets={workspace.artifacts.filter((artifact) => artifact.kind === 'asset')}
          pages={workspace.capturedPages}
        />
        {workspace.artifacts.length ? <CaptureArtifacts artifacts={workspace.artifacts} /> : null}
        {workspace.facts.length ? (
          <section aria-labelledby="captured-facts-title" className="research-section">
            <div>
              <Eyebrow>Website facts</Eyebrow>
              <h3 id="captured-facts-title">Captured directly from the site</h3>
              <p className="muted-copy">
                Titles, headings, metadata, and public contact details tied to their original page.
              </p>
            </div>
            <EvidenceFactList facts={workspace.facts} pages={workspace.capturedPages} />
          </section>
        ) : isCaptureActive ? (
          <EvidenceLoadingState />
        ) : (
          <EmptyState
            detail={
              captureFailed
                ? 'This capture did not complete, so no current evidence is available.'
                : 'No website facts were found in this capture.'
            }
            icon={SearchCheck}
            title={captureFailed ? 'Current capture unavailable' : 'No website facts captured'}
          />
        )}
        {isCaptureActive && workspace.artifacts.length ? <EvidenceLoadingState /> : null}
        {captureFailed && workspace.previousCapture ? (
          <section aria-labelledby="previous-capture-title" className="previous-capture">
            <Eyebrow>Previous capture</Eyebrow>
            <h3 id="previous-capture-title">Last successful evidence</h3>
            <p className="muted-copy">
              Captured{' '}
              {formatDateTime(
                workspace.previousCapture.completedAt ?? workspace.previousCapture.requestedAt,
              )}
              . This evidence is retained for reference and is not part of the failed refresh.
            </p>
            {workspace.previousFacts.length ? (
              <EvidenceFactList facts={workspace.previousFacts} />
            ) : null}
            <CaptureArtifacts
              artifacts={workspace.previousArtifacts}
              eyebrow="Previous files"
              title="Previous screenshots and source files"
              titleId="previous-capture-evidence-title"
            />
          </section>
        ) : null}
      </Card>
    );
  }

  if (tab === 'packet') {
    return <ResearchPacketPanel workspace={workspace} />;
  }

  if (tab === 'assets') {
    return (
      <div className="workspace-content-stack">
        <AssetReviewPanel
          onCancelAnalysis={cancelAssetAnalysis}
          onRequestAnalysis={requestAssetAnalysis}
          onSetAssetAnalysisSelected={setAssetAnalysisSelected}
          onUpdateAnnotation={updateAssetAnnotation}
          workspace={workspace}
        />
        <VisualContentRecoveryPanel
          onExtract={requestVisualContentExtraction}
          onCancel={cancelVisualContentExtraction}
          onApproveAll={approveAllVisualContent}
          onUpdate={updateVisualContentCandidate}
          workspace={workspace}
        />
        <BrandKitPanel
          onConvertLogo={requestEditableLogoRetry}
          onCreateRevision={createBrandAwareBriefRevision}
          onDeleteLogo={deleteLogoAsset}
          onPushLogoVersions={pushLogoVersionsToBuilder}
          onSave={saveBrandKit}
          workspace={workspace}
        />
      </div>
    );
  }

  if (tab === 'brief') {
    return (
      <BriefPanel
        onApprove={approveRedesignBrief}
        onCreate={createRedesignBrief}
        onRefreshArchitecture={refreshRedesignBriefArchitecture}
        onUpdate={updateRedesignBrief}
        workspace={workspace}
      />
    );
  }

  if (tab === 'audit') {
    return (
      <Card className="workspace-panel">
        <AuditPanel
          onCancelAudit={cancelWebsiteAudit}
          onApproveAllFindings={approveAllAuditFindings}
          onRequestAudit={requestWebsiteAudit}
          onUpdateFinding={updateAuditFinding}
          workspace={workspace}
        />
      </Card>
    );
  }

  if (tab === 'redesign') {
    return (
      <div className="workspace-content-stack">
        <BuildManifestPanel
          agentPackages={agentPackages}
          onCancelBuild={cancelProspectBuild}
          onCreate={createBuildManifest}
          onDeleteBuild={deleteProspectBuilds}
          onLoadBuildEvidence={loadBuilderRunEvidence}
          onMoveToAgentStudio={moveBuilderRunToAgentStudio}
          onOpenPreview={openBuilderPreview}
          onRequestBuild={requestProspectBuild}
          workspace={workspace}
        />
      </div>
    );
  }

  if (tab === 'report') {
    return (
      <Card className="workspace-panel">
        <Eyebrow>Decision report</Eyebrow>
        <h2>Nothing client-facing has been produced</h2>
        <p className="muted-copy">{workspace.report?.summary}</p>
        <EmptyState
          detail="A report will be generated only from reviewed findings and an approved redesign concept."
          icon={FileText}
          title="Report not started"
        />
      </Card>
    );
  }

  return (
    <Card className="workspace-panel">
      <Eyebrow>Timeline</Eyebrow>
      <h2>Record activity</h2>
      <div className="activity-list">
        {workspace.activity.slice(0, 6).map((activity) => (
          <article className="activity-row" key={activity.id}>
            <span>
              <strong>{activity.message}</strong>
              <small>{activity.type.replaceAll('_', ' ')}</small>
            </span>
            <time dateTime={activity.createdAt}>{formatDateTime(activity.createdAt)}</time>
          </article>
        ))}
      </div>
      {workspace.activity.length > 6 ? (
        <ListOverflow label="activity entries" remainingCount={workspace.activity.length - 6}>
          <div className="activity-list">
            {workspace.activity.slice(6).map((activity) => (
              <article className="activity-row" key={activity.id}>
                <span>
                  <strong>{activity.message}</strong>
                  <small>{activity.type.replaceAll('_', ' ')}</small>
                </span>
                <time dateTime={activity.createdAt}>{formatDateTime(activity.createdAt)}</time>
              </article>
            ))}
          </div>
        </ListOverflow>
      ) : null}
    </Card>
  );
}

function WorkspacePage({
  workspace,
  agentPackages,
  onBack,
  onApprove,
  onDelete,
  onToggleTask,
  onRequestResearchCapture,
  onRequestAssetRefresh,
  onContinueResearchCapture,
  onCancelResearchCapture,
  onRequestWebsiteAudit,
  onCancelWebsiteAudit,
  onRequestAssetAnalysis,
  onRequestEditableLogoRetry,
  onDeleteLogoAsset,
  onCancelAssetAnalysis,
  onSetAssetAnalysisSelected,
  onUpdateAssetAnnotation,
  onRequestVisualContentExtraction,
  onCancelVisualContentExtraction,
  onApproveAllVisualContent,
  onUpdateVisualContentCandidate,
  onSaveBrandKit,
  onPushLogoVersionsToBuilder,
  onCreateBrandAwareBriefRevision,
  onCreateRedesignBrief,
  onRefreshRedesignBriefArchitecture,
  onUpdateRedesignBrief,
  onApproveRedesignBrief,
  onCreateBuildManifest,
  onRequestProspectBuild,
  onCancelProspectBuild,
  onDeleteProspectBuilds,
  onMoveBuilderRunToAgentStudio,
  onOpenBuilderPreview,
  onLoadBuilderRunEvidence,
  onApproveAllAuditFindings,
  onUpdateAuditFinding,
  onVersionChange,
  tab,
  onTabChange,
}: {
  workspace: ProspectWorkspace;
  agentPackages: AgentPackage[];
  onBack: () => void;
  onApprove: () => void;
  onDelete: () => Promise<void>;
  onToggleTask: (task: Task) => Promise<void>;
  onRequestResearchCapture: () => Promise<void>;
  onRequestAssetRefresh: () => Promise<void>;
  onContinueResearchCapture: () => Promise<void>;
  onCancelResearchCapture: () => Promise<void>;
  onRequestWebsiteAudit: () => Promise<void>;
  onCancelWebsiteAudit: () => Promise<void>;
  onRequestAssetAnalysis: () => Promise<void>;
  onRequestEditableLogoRetry: (
    asset: ResearchArtifact,
    options: { simplifyGeometry: boolean; vectorizerProvider: 'vtracer' | 'vectorizer_ai' },
  ) => Promise<void>;
  onDeleteLogoAsset: (asset: ResearchArtifact, onUndo: () => void) => void;
  onCancelAssetAnalysis: () => Promise<void>;
  onSetAssetAnalysisSelected: (asset: ResearchArtifact, selected: boolean) => Promise<void>;
  onUpdateAssetAnnotation: (
    annotation: AssetAnnotation,
    patch: Pick<
      AssetAnnotation,
      'suggestedRole' | 'businessAssociation' | 'reviewState' | 'humanNotes'
    >,
  ) => Promise<void>;
  onRequestVisualContentExtraction: () => Promise<void>;
  onCancelVisualContentExtraction: () => Promise<void>;
  onApproveAllVisualContent: () => Promise<void>;
  onUpdateVisualContentCandidate: (
    candidate: VisualContentCandidate,
    patch: Pick<
      VisualContentCandidate,
      | 'contentType'
      | 'reviewState'
      | 'humanTitle'
      | 'humanBody'
      | 'humanAttribution'
      | 'humanNotes'
      | 'humanStructuredContent'
    >,
  ) => Promise<void>;
  onSaveBrandKit: (
    draft: Pick<
      BrandKit,
      'primaryLogoAssetId' | 'editableLogoAssetId' | 'approvedAssetIds' | 'palette' | 'notes'
    >,
    approve?: boolean,
    silent?: boolean,
  ) => Promise<void>;
  onPushLogoVersionsToBuilder: (
    draft: Pick<
      BrandKit,
      'primaryLogoAssetId' | 'editableLogoAssetId' | 'approvedAssetIds' | 'palette' | 'notes'
    >,
  ) => Promise<void>;
  onCreateBrandAwareBriefRevision: () => Promise<void>;
  onCreateRedesignBrief: () => Promise<void>;
  onRefreshRedesignBriefArchitecture: (brief: RedesignBrief) => Promise<void>;
  onUpdateRedesignBrief: (
    brief: RedesignBrief,
    patch: Pick<RedesignBrief, 'sourceSelections' | 'draft'>,
  ) => Promise<void>;
  onApproveRedesignBrief: (brief: RedesignBrief) => Promise<void>;
  onCreateBuildManifest: () => Promise<void>;
  onRequestProspectBuild: (
    mode: BuilderRunMode,
    targetSourceUrl?: string,
    buildInstruction?: string,
    agentPackageId?: string,
  ) => Promise<void>;
  onCancelProspectBuild: () => Promise<void>;
  onDeleteProspectBuilds: (businessId: string) => Promise<void>;
  onMoveBuilderRunToAgentStudio: (builderRunId: string) => Promise<void>;
  onOpenBuilderPreview: (builderRunId: string, mode?: BuilderPreviewMode) => Promise<string>;
  onLoadBuilderRunEvidence: (builderRunId: string) => Promise<BuilderRunEvidence>;
  onApproveAllAuditFindings: () => Promise<void>;
  onUpdateAuditFinding: (
    finding: AuditFinding,
    patch: Pick<AuditFinding, 'title' | 'finding' | 'recommendation' | 'severity' | 'reviewState'>,
  ) => Promise<void>;
  tab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  onVersionChange?: (versionId: string) => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [workspacePickerOpen, setWorkspacePickerOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const workspacePickerRef = useRef<HTMLDivElement>(null);
  const workspacePickerTriggerRef = useRef<HTMLButtonElement>(null);
  const workspacePickerOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeWorkspaceTab = workspaceTabs.find((item) => item.id === tab) ?? workspaceTabs[0]!;

  useEffect(() => {
    if (!workspacePickerOpen) return;
    const activeIndex = workspaceTabs.findIndex((item) => item.id === tab);
    window.requestAnimationFrame(() => workspacePickerOptionRefs.current[activeIndex]?.focus());
  }, [tab, workspacePickerOpen]);

  useEffect(() => {
    if (!workspacePickerOpen) return;
    function closeOnOutsidePress(event: PointerEvent) {
      if (!workspacePickerRef.current?.contains(event.target as Node)) {
        setWorkspacePickerOpen(false);
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePress);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePress);
  }, [workspacePickerOpen]);

  function handleSettingsOpenChange(open: boolean) {
    setSettingsOpen(open);
    if (!open) window.requestAnimationFrame(() => settingsButtonRef.current?.focus());
  }

  function closeWorkspacePicker(restoreFocus = false) {
    setWorkspacePickerOpen(false);
    if (restoreFocus)
      window.requestAnimationFrame(() => workspacePickerTriggerRef.current?.focus());
  }

  function handleWorkspacePickerKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeWorkspacePicker(true);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = (index + direction + workspaceTabs.length) % workspaceTabs.length;
      workspacePickerOptionRefs.current[nextIndex]?.focus();
    }
  }

  return (
    <>
      <WorkspaceHeader
        onApprove={onApprove}
        onBack={onBack}
        onOpenSettings={() => setSettingsOpen(true)}
        onVersionChange={onVersionChange}
        settingsButtonRef={settingsButtonRef}
        workspace={workspace}
      />
      <div aria-label="Prospect workspace sections" className="workspace-tabs" role="tablist">
        {workspaceTabs.map((item) => (
          <button
            aria-controls={`workspace-${item.id}`}
            aria-selected={tab === item.id}
            className={
              tab === item.id
                ? 'workspace-tabs__tab workspace-tabs__tab--active'
                : 'workspace-tabs__tab'
            }
            id={`workspace-tab-${item.id}`}
            key={item.id}
            onClick={() => onTabChange(item.id)}
            role="tab"
            type="button"
          >
            <item.icon aria-hidden="true" size={16} />
            {item.label}
          </button>
        ))}
      </div>
      <div className="workspace-tab-picker" ref={workspacePickerRef}>
        <span className="workspace-tab-picker__label" id="workspace-tab-picker-label">
          Workspace section
        </span>
        <div className="workspace-tab-picker__control">
          <Button
            aria-controls="workspace-tab-picker-options"
            aria-expanded={workspacePickerOpen}
            aria-haspopup="menu"
            aria-labelledby="workspace-tab-picker-label workspace-tab-picker-value"
            className="workspace-tab-picker__trigger"
            onClick={() => setWorkspacePickerOpen((open) => !open)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                setWorkspacePickerOpen(true);
              }
              if (event.key === 'Escape') closeWorkspacePicker();
            }}
            ref={workspacePickerTriggerRef}
            variant="secondary"
          >
            <activeWorkspaceTab.icon aria-hidden="true" size={18} />
            <span id="workspace-tab-picker-value">{activeWorkspaceTab.label}</span>
            <ChevronDown aria-hidden="true" className="workspace-tab-picker__icon" size={18} />
          </Button>
          {workspacePickerOpen ? (
            <div
              aria-labelledby="workspace-tab-picker-label"
              className="workspace-tab-picker__menu"
              id="workspace-tab-picker-options"
              role="menu"
            >
              {workspaceTabs.map((item, index) => (
                <Button
                  aria-checked={tab === item.id}
                  className="workspace-tab-picker__option"
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    closeWorkspacePicker(true);
                  }}
                  onKeyDown={(event) => handleWorkspacePickerKeyDown(event, index)}
                  ref={(node) => {
                    workspacePickerOptionRefs.current[index] = node;
                  }}
                  role="menuitemradio"
                  variant="quiet"
                >
                  <item.icon aria-hidden="true" size={18} />
                  <span>{item.label}</span>
                  {tab === item.id ? <Check aria-hidden="true" size={16} /> : null}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <section
        aria-label={activeWorkspaceTab.label}
        className="workspace-tab-panel"
        id={`workspace-${tab}`}
        key={tab}
        role="tabpanel"
      >
        <WorkspaceContent
          agentPackages={agentPackages}
          approveAllAuditFindings={onApproveAllAuditFindings}
          approveRedesignBrief={onApproveRedesignBrief}
          createRedesignBrief={onCreateRedesignBrief}
          refreshRedesignBriefArchitecture={onRefreshRedesignBriefArchitecture}
          createBuildManifest={onCreateBuildManifest}
          requestProspectBuild={onRequestProspectBuild}
          cancelProspectBuild={onCancelProspectBuild}
          deleteProspectBuilds={onDeleteProspectBuilds}
          moveBuilderRunToAgentStudio={onMoveBuilderRunToAgentStudio}
          openBuilderPreview={onOpenBuilderPreview}
          loadBuilderRunEvidence={onLoadBuilderRunEvidence}
          requestAssetAnalysis={onRequestAssetAnalysis}
          requestEditableLogoRetry={onRequestEditableLogoRetry}
          deleteLogoAsset={onDeleteLogoAsset}
          cancelAssetAnalysis={onCancelAssetAnalysis}
          setAssetAnalysisSelected={onSetAssetAnalysisSelected}
          cancelResearchCapture={onCancelResearchCapture}
          continueResearchCapture={onContinueResearchCapture}
          requestResearchCapture={onRequestResearchCapture}
          requestAssetRefresh={onRequestAssetRefresh}
          requestWebsiteAudit={onRequestWebsiteAudit}
          cancelWebsiteAudit={onCancelWebsiteAudit}
          tab={tab}
          toggleTask={onToggleTask}
          updateAuditFinding={onUpdateAuditFinding}
          updateAssetAnnotation={onUpdateAssetAnnotation}
          requestVisualContentExtraction={onRequestVisualContentExtraction}
          cancelVisualContentExtraction={onCancelVisualContentExtraction}
          approveAllVisualContent={onApproveAllVisualContent}
          updateVisualContentCandidate={onUpdateVisualContentCandidate}
          saveBrandKit={onSaveBrandKit}
          pushLogoVersionsToBuilder={onPushLogoVersionsToBuilder}
          createBrandAwareBriefRevision={onCreateBrandAwareBriefRevision}
          updateRedesignBrief={onUpdateRedesignBrief}
          workspace={workspace}
        />
      </section>
      <WorkspaceSettingsDialog
        onDelete={onDelete}
        onOpenChange={handleSettingsOpenChange}
        open={settingsOpen}
        workspace={workspace}
      />
    </>
  );
}

function WorkspaceApp({
  repository,
  userEmail,
  onSignOut,
}: {
  repository: WorkspaceRepository;
  userEmail?: string;
  onSignOut?: () => Promise<void>;
}) {
  const [route, setRoute] = useState<Route>(initialRoute);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [workspaces, setWorkspaces] = useState<ProspectWorkspace[]>([]);
  const [agentPackages, setAgentPackages] = useState<AgentPackage[]>([]);
  const [agentPackageProposals, setAgentPackageProposals] = useState<AgentPackageProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPresentation, setLoadingPresentation] = useState(true);
  const [isHydrating, setIsHydrating] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [notice, setNotice] = useState<ToastNotice>();
  const dataFingerprintRef = useRef('');
  const lastBackgroundRefreshAtRef = useRef(0);
  const refreshInFlightRef = useRef(false);
  const hydrationTimerRef = useRef<number>();
  const loadingPresentationRef = useRef(true);
  const assetAnalysisStatusRef = useRef(new Map<string, string>());
  const pendingLogoDeletionsRef = useRef(
    new Map<string, { onUndo: () => void; timeout: ReturnType<typeof setTimeout> }>(),
  );

  useEffect(
    () => () => {
      if (hydrationTimerRef.current) window.clearTimeout(hydrationTimerRef.current);
      for (const pending of pendingLogoDeletionsRef.current.values()) {
        window.clearTimeout(pending.timeout);
      }
    },
    [],
  );

  useEffect(() => {
    loadingPresentationRef.current = loadingPresentation;
  }, [loadingPresentation]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(undefined), 10000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    const nextStatuses = new Map<string, string>();
    for (const candidate of workspaces) {
      const job = candidate.assetAnalysis;
      if (!job) continue;
      const previousStatus = assetAnalysisStatusRef.current.get(candidate.business.id);
      nextStatuses.set(candidate.business.id, job.status);
      if (previousStatus && previousStatus !== 'failed' && job.status === 'failed') {
        setNotice({
          id: crypto.randomUUID(),
          title: 'SVG conversion or asset analysis failed',
          detail:
            job.errorSummary ||
            'The worker stopped before it could save the requested result. Open Assets to review and retry.',
          tone: 'danger',
        });
      }
    }
    assetAnalysisStatusRef.current = nextStatuses;
  }, [workspaces]);

  const refreshData = useCallback(
    async ({ announce = false }: { announce?: boolean } = {}) => {
      if (refreshInFlightRef.current) return false;
      refreshInFlightRef.current = true;
      const presentHydration = !loadingPresentationRef.current;
      if (presentHydration) {
        if (hydrationTimerRef.current) window.clearTimeout(hydrationTimerRef.current);
        setIsHydrating(true);
      }
      try {
        const [nextBusinesses, nextWorkspaces, nextAgentPackages, nextAgentPackageProposals] =
          await Promise.all([
            repository.listBusinesses(),
            repository.listWorkspaces(),
            repository.listAgentPackages(),
            repository.listAgentPackageProposals(),
          ]);
        const nextFingerprint = JSON.stringify({
          businesses: nextBusinesses.map((business) => [business.id, business.updatedAt]),
          agentPackages: nextAgentPackages.map((agentPackage) => [
            agentPackage.id,
            agentPackage.version,
            agentPackage.status,
            agentPackage.updatedAt,
          ]),
          agentPackageProposals: nextAgentPackageProposals.map((proposal) => [
            proposal.id,
            proposal.status,
            proposal.updatedAt,
            proposal.draftPackageId,
          ]),
          captures: nextWorkspaces.map((workspace) => [
            workspace.business.id,
            workspace.latestCapture?.id,
            workspace.latestCapture?.status,
            workspace.latestCapture?.completedAt,
            workspace.latestCapture?.progressPhase,
            workspace.latestCapture?.progressDetail,
            workspace.latestCapture?.currentUrl,
            workspace.latestCapture?.cancelRequestedAt,
            workspace.artifacts.length,
            workspace.facts.length,
            workspace.audit?.id,
            workspace.audit?.status,
            workspace.audit?.updatedAt,
            workspace.audit?.findings.length,
            workspace.audit?.progressPhase,
            workspace.audit?.progressDetail,
            workspace.audit?.completedItems,
            workspace.audit?.cancelRequestedAt,
            workspace.assetAnalysis?.id,
            workspace.assetAnalysis?.status,
            workspace.assetAnalysis?.updatedAt,
            workspace.assetAnalysis?.progressPhase,
            workspace.assetAnalysis?.progressDetail,
            workspace.assetAnalysis?.completedItems,
            workspace.assetAnalysis?.cancelRequestedAt,
            workspace.assetAnnotations.length,
            workspace.latestBuilderRun?.id,
            workspace.latestBuilderRun?.status,
            workspace.latestBuilderRun?.updatedAt,
            workspace.latestBuilderRun?.progressPhase,
            workspace.latestBuilderRun?.progressDetail,
            workspace.latestBuilderRun?.completedItems,
            workspace.builderArtifacts.length,
            workspace.builderEvents.length,
          ]),
        });
        const changed = Boolean(
          dataFingerprintRef.current && dataFingerprintRef.current !== nextFingerprint,
        );
        dataFingerprintRef.current = nextFingerprint;
        setBusinesses(nextBusinesses);
        setWorkspaces(nextWorkspaces);
        setAgentPackages(nextAgentPackages);
        setAgentPackageProposals(nextAgentPackageProposals);
        if (announce && changed) {
          setNotice({
            id: crypto.randomUUID(),
            title: 'Workspace updated',
            detail: 'New saved data is now visible in your current view.',
            tone: 'info',
          });
        }
        return changed;
      } finally {
        refreshInFlightRef.current = false;
        if (presentHydration) {
          hydrationTimerRef.current = window.setTimeout(() => {
            setIsHydrating(false);
            hydrationTimerRef.current = undefined;
          }, 1_200);
        }
      }
    },
    [repository],
  );

  useEffect(() => {
    function updateRoute() {
      const hash = window.location.hash || '#/today';
      persistRouteHash(hash);
      setRoute(routeFromHash(hash));
    }
    window.addEventListener('hashchange', updateRoute);
    return () => window.removeEventListener('hashchange', updateRoute);
  }, []);

  useEffect(() => {
    let active = true;
    async function initialise() {
      try {
        await repository.bootstrap();
        const [nextBusinesses, nextWorkspaces, nextAgentPackages, nextAgentPackageProposals] =
          await Promise.all([
            repository.listBusinesses(),
            repository.listWorkspaces(),
            repository.listAgentPackages(),
            repository.listAgentPackageProposals(),
          ]);
        if (!active) return;
        setBusinesses(nextBusinesses);
        setWorkspaces(nextWorkspaces);
        setAgentPackages(nextAgentPackages);
        setAgentPackageProposals(nextAgentPackageProposals);
        dataFingerprintRef.current = JSON.stringify({
          businesses: nextBusinesses.map((business) => [business.id, business.updatedAt]),
          agentPackages: nextAgentPackages.map((agentPackage) => [
            agentPackage.id,
            agentPackage.version,
            agentPackage.status,
            agentPackage.updatedAt,
          ]),
          agentPackageProposals: nextAgentPackageProposals.map((proposal) => [
            proposal.id,
            proposal.status,
            proposal.updatedAt,
            proposal.draftPackageId,
          ]),
          captures: nextWorkspaces.map((workspace) => [
            workspace.business.id,
            workspace.latestCapture?.id,
            workspace.latestCapture?.status,
            workspace.latestCapture?.completedAt,
            workspace.latestCapture?.progressPhase,
            workspace.latestCapture?.progressDetail,
            workspace.latestCapture?.currentUrl,
            workspace.latestCapture?.cancelRequestedAt,
            workspace.artifacts.length,
            workspace.facts.length,
            workspace.audit?.id,
            workspace.audit?.status,
            workspace.audit?.updatedAt,
            workspace.audit?.findings.length,
            workspace.audit?.progressPhase,
            workspace.audit?.progressDetail,
            workspace.audit?.completedItems,
            workspace.audit?.cancelRequestedAt,
            workspace.assetAnalysis?.id,
            workspace.assetAnalysis?.status,
            workspace.assetAnalysis?.updatedAt,
            workspace.assetAnalysis?.progressPhase,
            workspace.assetAnalysis?.progressDetail,
            workspace.assetAnalysis?.completedItems,
            workspace.assetAnalysis?.cancelRequestedAt,
            workspace.assetAnnotations.length,
            workspace.latestBuilderRun?.id,
            workspace.latestBuilderRun?.status,
            workspace.latestBuilderRun?.updatedAt,
            workspace.latestBuilderRun?.progressPhase,
            workspace.latestBuilderRun?.progressDetail,
            workspace.latestBuilderRun?.completedItems,
            workspace.builderArtifacts.length,
            workspace.builderEvents.length,
          ]),
        });
      } catch (error) {
        console.error('Made Solid Studio workspace load failed.', error);
        if (active)
          setStorageError(
            'Made Solid Studio could not load workspace data. Check your connection and organization access, then try again.',
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void initialise();
    return () => {
      active = false;
    };
  }, [repository]);

  useEffect(() => {
    if (loading) return;
    function refreshInBackground() {
      if (document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (now - lastBackgroundRefreshAtRef.current < 20_000) return;
      lastBackgroundRefreshAtRef.current = now;
      void refreshData({ announce: true }).catch(() => undefined);
    }
    window.addEventListener('focus', refreshInBackground);
    document.addEventListener('visibilitychange', refreshInBackground);
    return () => {
      window.removeEventListener('focus', refreshInBackground);
      document.removeEventListener('visibilitychange', refreshInBackground);
    };
  }, [loading, refreshData]);

  const hasActiveAiUsage = workspaces.some(
    (candidate) =>
      candidate.assetAnalysis?.status === 'queued' ||
      candidate.assetAnalysis?.status === 'running' ||
      candidate.visualContentJob?.status === 'queued' ||
      candidate.visualContentJob?.status === 'running' ||
      candidate.latestBuilderRun?.status === 'queued' ||
      candidate.latestBuilderRun?.status === 'running' ||
      candidate.latestBuilderRun?.status === 'paused',
  );
  const hasActiveAgentPackageProposal = agentPackageProposals.some(
    (proposal) => proposal.status === 'queued' || proposal.status === 'running',
  );
  const hasActiveAgentStudioBuild = workspaces.some((candidate) =>
    candidate.builderRuns.some(
      (run) => run.status === 'queued' || run.status === 'running' || run.status === 'paused',
    ),
  );

  useEffect(() => {
    if (route.page !== 'usage' || !hasActiveAiUsage) return;
    const interval = window.setInterval(() => void refreshData(), 3_000);
    return () => window.clearInterval(interval);
  }, [hasActiveAiUsage, refreshData, route.page]);

  useEffect(() => {
    if (route.page !== 'agent-studio' || !hasActiveAgentPackageProposal) return;
    const interval = window.setInterval(() => void refreshData(), 3_000);
    return () => window.clearInterval(interval);
  }, [hasActiveAgentPackageProposal, refreshData, route.page]);

  useEffect(() => {
    if (route.page !== 'agent-studio' || !hasActiveAgentStudioBuild) return;
    const interval = window.setInterval(() => void refreshData(), 1_000);
    return () => window.clearInterval(interval);
  }, [hasActiveAgentStudioBuild, refreshData, route.page]);

  const baseWorkspace =
    route.page === 'prospects' && route.businessId
      ? workspaces.find((candidate) => candidate.business.id === route.businessId)
      : undefined;
  const workspace =
    baseWorkspace && route.page === 'prospects' && route.versionId
      ? (() => {
          const brief = baseWorkspace.redesignBriefs.find((item) => item.id === route.versionId);
          if (!brief) return baseWorkspace;
          const manifest = baseWorkspace.buildManifests.find(
            (item) => item.redesignBriefId === brief.id,
          );
          const run = manifest
            ? baseWorkspace.builderRuns.find((item) => item.buildManifestId === manifest.id)
            : undefined;
          const capture = baseWorkspace.captures.find((item) => item.id === brief.crawlRunId);
          return {
            ...baseWorkspace,
            latestCapture: capture,
            redesignBrief: brief,
            buildManifest: manifest,
            latestBuilderRun: run,
          };
        })()
      : baseWorkspace;

  const activeCapture = captureIsActive(workspace?.latestCapture);
  const activeAudit =
    Boolean(workspace?.audit?.crawlRunId) &&
    (workspace?.audit?.status === 'research_pending' || workspace?.audit?.status === 'running');
  const activeAssetAnalysis =
    workspace?.assetAnalysis?.status === 'queued' || workspace?.assetAnalysis?.status === 'running';
  const activeAssetRefresh =
    workspace?.assetRefresh?.status === 'queued' || workspace?.assetRefresh?.status === 'running';
  const activeVisualContent =
    workspace?.visualContentJob?.status === 'queued' ||
    workspace?.visualContentJob?.status === 'running';
  const activeBuilder =
    workspace?.latestBuilderRun?.status === 'queued' ||
    workspace?.latestBuilderRun?.status === 'running' ||
    workspace?.latestBuilderRun?.status === 'paused';
  const awaitingPreferredLogo =
    Boolean(workspace?.website) &&
    !workspace?.artifacts.some(
      (artifact) =>
        artifact.kind === 'asset' && artifact.metadata.preferredOrganisationLogo === true,
    );

  useEffect(() => {
    if (
      !activeCapture &&
      !activeAudit &&
      !activeAssetAnalysis &&
      !activeAssetRefresh &&
      !activeVisualContent &&
      !activeBuilder &&
      !awaitingPreferredLogo
    )
      return;
    const interval = window.setInterval(() => {
      void refreshData();
    }, 2_000);
    return () => window.clearInterval(interval);
  }, [
    activeAssetAnalysis,
    activeAssetRefresh,
    activeVisualContent,
    activeAudit,
    activeBuilder,
    activeCapture,
    awaitingPreferredLogo,
    refreshData,
    workspace?.assetAnalysis?.id,
    workspace?.assetRefresh?.id,
    workspace?.visualContentJob?.id,
    workspace?.audit?.id,
    workspace?.latestBuilderRun?.id,
    workspace?.latestCapture?.id,
  ]);

  function navigate(nextRoute: Route) {
    const nextHref = hrefForRoute(nextRoute);
    persistRouteHash(nextHref);
    if (window.location.hash === nextHref) setRoute(nextRoute);
    else window.location.hash = nextHref;
  }

  function openWorkspace(businessId: string) {
    navigate({ page: 'prospects', businessId });
  }

  async function handleWorkspaceCreated(nextWorkspace: ProspectWorkspace) {
    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title: 'Prospect created',
      detail: 'The workspace is ready for research review.',
      tone: 'success',
      action: {
        label: 'View prospect',
        onClick: () => openWorkspace(nextWorkspace.business.id),
      },
    });
  }

  async function toggleTask(task: Task) {
    await repository.setTaskState(task, task.state === 'done' ? 'open' : 'done');
    await refreshData();
  }

  async function requestResearchCapture() {
    if (!workspace) return;
    const capture = await repository.requestResearchCapture(workspace.business.id);
    if (!capture) throw new Error('The website capture could not be queued.');
    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title: 'Website capture queued',
      detail:
        'The private worker will discover and save public-site evidence here when the capture completes.',
      tone: 'warning',
    });
  }

  async function requestAssetRefresh() {
    if (!workspace) return;
    const job = await repository.requestAssetRefresh(workspace.business.id);
    if (!job) throw new Error('The image-only refresh could not be queued.');
    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title: 'Image refresh queued',
      detail: 'Only new image assets will be added to this capture.',
      tone: 'warning',
    });
  }

  async function cancelResearchCapture() {
    if (!workspace) return;
    await repository.cancelResearchCapture(workspace.business.id);
    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title: 'Capture cancellation requested',
      detail: 'The worker will stop after its current safe step. Saved evidence remains private.',
      tone: 'warning',
    });
  }

  async function continueResearchCapture() {
    if (!workspace) return;
    const capture = await repository.continueResearchCapture(workspace.business.id);
    if (!capture) throw new Error('The website capture could not be continued.');
    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title: 'Website capture continuing',
      detail: 'The worker will retry the incomplete step and preserve evidence already saved.',
      tone: 'warning',
    });
  }

  async function requestWebsiteAudit() {
    if (!workspace) return;
    const audit = await repository.requestWebsiteAudit(workspace.business.id);
    if (!audit) throw new Error('The website audit could not be queued.');
    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title: 'Website audit queued',
      detail:
        'The private worker will analyse the latest completed capture and save editable findings.',
      tone: 'warning',
    });
  }

  async function cancelWebsiteAudit() {
    if (!workspace) return;
    await repository.cancelWebsiteAudit(workspace.business.id);
    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title: 'Audit cancellation requested',
      detail: 'The worker will stop after its current safe step. Saved findings remain private.',
      tone: 'warning',
    });
  }

  async function updateAuditFinding(
    finding: AuditFinding,
    patch: Pick<AuditFinding, 'title' | 'finding' | 'recommendation' | 'severity' | 'reviewState'>,
  ) {
    await repository.updateAuditFinding(finding, patch);
    await refreshData();
  }

  async function requestAssetAnalysis() {
    if (!workspace) return;
    const job = await repository.requestAssetAnalysis(workspace.business.id);
    if (!job) throw new Error('The visual-asset analysis could not be queued.');
    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title: 'Asset analysis queued',
      detail: 'The private worker will save editable visual descriptions for human review.',
      tone: 'warning',
    });
  }

  async function requestVisualContentExtraction() {
    if (!workspace) return;
    const job = await repository.requestVisualContentExtraction(workspace.business.id);
    if (!job) throw new Error('Structured image-content recovery could not be queued.');
    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title: 'Structured content recovery queued',
      detail:
        'The private worker will interpret the saved images as tables, testimonials, lists and other semantic information. The website will not be recaptured.',
      tone: 'warning',
    });
  }

  async function cancelVisualContentExtraction() {
    if (!workspace) return;
    await repository.cancelVisualContentExtraction(workspace.business.id);
    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title: 'Content recovery cancellation requested',
      detail:
        'The worker will stop before the next saved image. Completed candidates remain private.',
      tone: 'warning',
    });
  }

  async function updateVisualContentCandidate(
    candidate: VisualContentCandidate,
    patch: Pick<
      VisualContentCandidate,
      | 'contentType'
      | 'reviewState'
      | 'humanTitle'
      | 'humanBody'
      | 'humanAttribution'
      | 'humanNotes'
      | 'humanStructuredContent'
    >,
  ) {
    await repository.updateVisualContentCandidate(candidate, patch);
    if (patch.reviewState === 'approved') {
      const currentWorkspace = await repository.getWorkspace(candidate.businessId);
      const hasOtherReadyItems = currentWorkspace?.visualContentCandidates.some(
        (item) =>
          item.reviewState === 'needs_review' &&
          item.structureStatus === 'ready' &&
          (hasStructuredVisualContent(item.structuredContent) ||
            hasStructuredVisualContent(item.humanStructuredContent) ||
            Boolean(item.humanBody || item.body)),
      );
      if (!hasOtherReadyItems) {
        try {
          await prepareCurrentBuildHandoff(candidate.businessId);
          setNotice({
            id: crypto.randomUUID(),
            title: 'Recovered information ready for builds',
            detail:
              'The current Brief and Build Manifest were refreshed automatically for test and complete builds.',
            tone: 'success',
          });
        } catch (error) {
          await refreshData();
          throw new Error(
            `The information was approved, but its builder handoff is not ready yet. ${
              error instanceof Error ? error.message : 'Check the approved Brand Kit and try again.'
            }`,
            { cause: error },
          );
        }
      }
    }
    await refreshData();
  }

  async function prepareCurrentBuildHandoff(businessId: string) {
    const brief = await repository.createRedesignBrief(businessId);
    if (!brief) {
      throw new Error(
        'The saved capture is still being interpreted. Try the build again when capability analysis is ready.',
      );
    }
    if (brief.status !== 'approved') await repository.approveRedesignBrief(brief);
    const manifest = await repository.createBuildManifest(businessId);
    if (!manifest) throw new Error('The current Build Manifest could not be prepared.');
    return manifest;
  }

  async function approveAllVisualContent() {
    if (!workspace) return;
    const candidates = workspace.visualContentCandidates.filter(
      (candidate) =>
        candidate.reviewState === 'needs_review' &&
        candidate.structureStatus === 'ready' &&
        (hasStructuredVisualContent(candidate.structuredContent) ||
          hasStructuredVisualContent(candidate.humanStructuredContent) ||
          Boolean(candidate.humanBody || candidate.body)),
    );
    if (!candidates.length) {
      throw new Error('There is no ready recovered information waiting for approval.');
    }

    for (const candidate of candidates) {
      await repository.updateVisualContentCandidate(candidate, {
        contentType: candidate.contentType,
        reviewState: 'approved',
        humanTitle: candidate.humanTitle,
        humanBody: candidate.humanBody,
        humanAttribution: candidate.humanAttribution,
        humanNotes: candidate.humanNotes,
        humanStructuredContent: candidate.humanStructuredContent,
      });
    }

    try {
      await prepareCurrentBuildHandoff(workspace.business.id);
    } catch (error) {
      await refreshData();
      throw new Error(
        `The recovered information was approved, but its builder handoff is not ready yet. ${
          error instanceof Error ? error.message : 'Check the approved Brand Kit and try again.'
        }`,
        { cause: error },
      );
    }

    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title: 'Recovered information approved for builds',
      detail:
        'The current Brief and Build Manifest were refreshed automatically. Agent Studio tests and complete prospect builds will use this structured information.',
      tone: 'success',
    });
  }

  async function requestEditableLogoRetry(
    asset: ResearchArtifact,
    options: { simplifyGeometry: boolean; vectorizerProvider: 'vtracer' | 'vectorizer_ai' },
  ) {
    if (!workspace) return;
    const job = await repository.requestEditableLogoRetry(asset, options);
    if (!job) throw new Error('The SVG conversion retry could not be queued.');
    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title: 'SVG conversion retry queued',
      detail:
        options.vectorizerProvider === 'vectorizer_ai'
          ? 'The private worker will send the original captured logo directly to Vectorizer.AI for an editable SVG comparison.'
          : options.simplifyGeometry
            ? 'The private worker will reuse or clean up the logo, verify it against the source, then fit straight lines, corners and smooth curves into another editable SVG variant.'
            : 'The private worker will reuse or clean up the logo, verify it against the source, then trace another editable SVG variant without geometry fitting.',
      tone: 'warning',
    });
  }

  function deleteLogoAsset(asset: ResearchArtifact, onUndo: () => void) {
    const deleteAfterUndoWindow = async () => {
      pendingLogoDeletionsRef.current.delete(asset.id);
      try {
        await repository.deleteLogoAsset(asset);
        await refreshData();
      } catch (error) {
        onUndo();
        setNotice({
          id: crypto.randomUUID(),
          title: 'Logo could not be deleted',
          detail: error instanceof Error ? error.message : 'Try deleting the logo again.',
          tone: 'danger',
        });
        return;
      }
      setNotice({
        id: crypto.randomUUID(),
        title: 'Logo permanently deleted',
        detail: 'The selected logo and its derived SVG variants were removed from this prospect.',
        tone: 'success',
      });
    };
    const timeout = window.setTimeout(() => void deleteAfterUndoWindow(), 5000);
    pendingLogoDeletionsRef.current.set(asset.id, { onUndo, timeout });
    setNotice({
      id: crypto.randomUUID(),
      title: 'Logo deleted',
      detail: 'This logo will be permanently deleted in 5 seconds.',
      tone: 'warning',
      action: {
        label: 'Undo',
        onClick: () => {
          const pending = pendingLogoDeletionsRef.current.get(asset.id);
          if (!pending) return;
          window.clearTimeout(pending.timeout);
          pendingLogoDeletionsRef.current.delete(asset.id);
          pending.onUndo();
        },
      },
    });
  }

  async function cancelAssetAnalysis() {
    if (!workspace) return;
    await repository.cancelAssetAnalysis(workspace.business.id);
    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title: 'Asset analysis cancellation requested',
      detail: 'The worker will stop after its current image. Saved suggestions remain private.',
      tone: 'warning',
    });
  }

  async function setAssetAnalysisSelected(asset: ResearchArtifact, selected: boolean) {
    await repository.setAssetAnalysisSelected(asset, selected);
    void refreshData();
  }

  async function updateAssetAnnotation(
    annotation: AssetAnnotation,
    patch: Pick<
      AssetAnnotation,
      'suggestedRole' | 'businessAssociation' | 'reviewState' | 'humanNotes'
    >,
  ) {
    await repository.updateAssetAnnotation(annotation, patch);
    await refreshData();
  }

  async function saveBrandKit(
    draft: Pick<
      BrandKit,
      'primaryLogoAssetId' | 'editableLogoAssetId' | 'approvedAssetIds' | 'palette' | 'notes'
    >,
    approve = false,
    silent = false,
  ) {
    if (!workspace) return;
    const brandKit = await repository.saveBrandKit(workspace.business.id, draft, approve, !silent);
    if (!brandKit) throw new Error('The Brand Kit could not be saved.');
    if (silent) {
      setWorkspaces((current) =>
        current.map((candidate) =>
          candidate.business.id === workspace.business.id ? { ...candidate, brandKit } : candidate,
        ),
      );
      return;
    }
    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title: approve ? 'Brand Kit approved' : 'Brand Kit saved',
      detail: approve
        ? 'Future redesign revisions will use this reviewed logo, visual assets, and colour system.'
        : 'The private Brand Kit remains editable until approval.',
      tone: 'success',
    });
  }

  async function pushLogoVersionsToBuilder(
    draft: Pick<
      BrandKit,
      'primaryLogoAssetId' | 'editableLogoAssetId' | 'approvedAssetIds' | 'palette' | 'notes'
    >,
  ) {
    if (!workspace) return;
    const brandKit = await repository.saveBrandKit(workspace.business.id, draft, true, true);
    if (!brandKit) throw new Error('The generated logos could not be approved in the Brand Kit.');
    const brief = await repository.createBrandAwareBriefRevision(workspace.business.id);
    if (!brief) throw new Error('The updated brand-aware Brief could not be created.');
    await repository.approveRedesignBrief(brief);
    const manifest = await repository.createBuildManifest(workspace.business.id);
    if (!manifest) throw new Error('The updated Build Manifest could not be prepared.');
    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title: 'Logo versions pushed to builds',
      detail:
        'The transparent logo versions are approved and staged in a new Brief and Build Manifest. The alpha matte remains private review material.',
      tone: 'success',
    });
  }

  async function createBrandAwareBriefRevision() {
    if (!workspace) return;
    const brief = await repository.createBrandAwareBriefRevision(workspace.business.id);
    if (!brief) throw new Error('The brand-aware brief revision could not be created.');
    await refreshData();
    navigate({ page: 'prospects', businessId: workspace.business.id, tab: 'brief' });
    setNotice({
      id: crypto.randomUUID(),
      title: 'Brand-aware brief ready',
      detail: 'Review and approve this new brief before generating a replacement private preview.',
      tone: 'success',
    });
  }

  async function createRedesignBrief() {
    if (!workspace) return;
    const brief = await repository.createRedesignBrief(workspace.business.id);
    await refreshData();
    if (!brief) {
      setNotice({
        id: crypto.randomUUID(),
        title: 'AI capability analysis queued',
        detail: 'The saved capture is being interpreted. No new website scrape is needed.',
        tone: 'success',
      });
      return;
    }
    setNotice({
      id: crypto.randomUUID(),
      title: 'Redesign brief created',
      detail: 'Review source selections and open questions before approving the builder handoff.',
      tone: 'success',
    });
  }

  async function refreshRedesignBriefArchitecture(brief: RedesignBrief) {
    const refreshed = await repository.refreshRedesignBriefArchitecture(brief);
    if (!refreshed) throw new Error('The proposed architecture could not be regenerated.');
    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title: 'Architecture regenerated',
      detail:
        'The draft now groups selected pages into conversion, content, tool, and utility routes without a new website capture.',
      tone: 'success',
    });
  }

  async function updateRedesignBrief(
    brief: RedesignBrief,
    patch: Pick<RedesignBrief, 'sourceSelections' | 'draft'>,
  ) {
    await repository.updateRedesignBrief(brief, patch);
    await refreshData();
  }

  async function approveRedesignBrief(brief: RedesignBrief) {
    await repository.approveRedesignBrief(brief);
    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title: 'Redesign brief approved',
      detail: 'The future builder can now use this reviewed strategy and source selection.',
      tone: 'success',
    });
  }

  async function createBuildManifest() {
    if (!workspace) return;
    const manifest = await repository.createBuildManifest(workspace.business.id);
    if (!manifest) throw new Error('The Build Manifest could not be prepared.');
    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title: 'Build Manifest ready',
      detail:
        'The approved brief is now a private, versioned handoff for the future Codex builder.',
      tone: 'success',
    });
  }

  async function requestAgentPackageProposal(basePackageId: string, direction: string) {
    const proposal = await repository.requestAgentPackageProposal(basePackageId, direction);
    if (!proposal) throw new Error('The agent package proposal could not be queued.');
    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title: 'Package proposal queued',
      detail:
        'The protected refinement worker will prepare a Markdown policy proposal derived from the published package.',
      tone: 'warning',
    });
  }

  async function approveAgentPackageForTesting(packageId: string) {
    const agentPackage = await repository.approveAgentPackageForTesting(packageId);
    if (!agentPackage) throw new Error('The test package could not be approved.');
    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title: `Package ${agentPackageVersionLabel(agentPackage.version)} ready for testing`,
      detail: 'Select it in Refine to pin a private homepage or page test to this package.',
      tone: 'success',
    });
  }

  async function stageAgentPackageBehaviours(packageId: string, behaviourIds: string[]) {
    const agentPackage = await repository.stageAgentPackageBehaviours(packageId, behaviourIds);
    if (!agentPackage) throw new Error('The selected behaviours could not be staged.');
    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title: 'Behaviours staged for a production draft',
      detail:
        'They will no longer be shown as behaviours to test. The remaining unchecked behaviours stay available for the next private test.',
      tone: 'success',
    });
  }

  async function approveAgentPackageForProduction(packageId: string) {
    const agentPackage = await repository.approveAgentPackageForProduction(packageId);
    if (!agentPackage) throw new Error('The production draft could not be saved.');
    setAgentPackages((currentPackages) =>
      currentPackages.map((currentPackage) =>
        currentPackage.id === agentPackage.id ? agentPackage : currentPackage,
      ),
    );
    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title: `Package ${agentPackageVersionLabel(agentPackage.version)} saved as a production draft`,
      detail:
        'This tested behaviour is no longer offered to new test builds. The published production package is unchanged until you explicitly publish this draft.',
      tone: 'success',
    });
  }

  async function promoteAgentPackage(packageId: string) {
    const agentPackage = await repository.promoteAgentPackage(packageId);
    if (!agentPackage) throw new Error('The agent package could not be promoted.');
    setAgentPackages((currentPackages) =>
      currentPackages.map((currentPackage) => {
        if (currentPackage.id === agentPackage.id) return agentPackage;
        if (currentPackage.status === 'published') {
          return { ...currentPackage, status: 'superseded' };
        }
        return currentPackage;
      }),
    );
    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title: `Package ${agentPackageVersionLabel(agentPackage.version)} published`,
      detail:
        'Future complete prospect builds now pin this package. Earlier tests and prospect builds remain unchanged.',
      tone: 'success',
    });
  }

  async function requestWebsiteBuildForBusiness(
    businessId: string,
    mode: BuilderRunMode,
    targetSourceUrl?: string,
    buildInstruction?: string,
    agentPackageId?: string,
    sourceBuilderRunId?: string,
    targetSourceUrls?: string[],
  ) {
    const listedWorkspace = workspaces.find((candidate) => candidate.business.id === businessId);
    if (!listedWorkspace) throw new Error('The selected test prospect is no longer available.');
    await prepareCurrentBuildHandoff(businessId);
    const targetWorkspace = (await repository.getWorkspace(businessId)) ?? listedWorkspace;
    const requestedInstruction = buildInstruction?.trim() || undefined;
    const run = await repository.requestWebsiteBuild(
      targetWorkspace.business.id,
      mode,
      targetSourceUrl,
      requestedInstruction,
      agentPackageId,
      sourceBuilderRunId,
      targetSourceUrls,
    );
    if (!run) throw new Error('The private preview could not be queued.');
    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title:
        mode === 'homepage_test'
          ? 'Homepage test queued'
          : mode === 'page_test'
            ? 'Selected page test queued'
            : 'Prospect build queued',
      detail:
        mode === 'homepage_test'
          ? 'The protected builder will create a new private homepage test from the selected package and approved manifest. It will not resume a stopped test; the prospect’s public website is unchanged.'
          : mode === 'page_test'
            ? 'The protected builder will create a new selected-page test. It will not resume a stopped test; the prospect’s public website is unchanged.'
            : 'The protected builder will create this prospect’s complete private website from the approved homepage direction and Build Manifest. The prospect’s public website is unchanged.',
      tone: 'success',
    });
  }

  async function moveBuilderRunToAgentStudio(builderRunId: string) {
    const sourceRun = workspaces
      .flatMap((candidate) => candidate.builderRuns)
      .find((candidate) => candidate.id === builderRunId);
    if (!sourceRun) throw new Error('The selected private build is no longer available.');
    const movedRun = await repository.moveBuilderRunToAgentStudio(builderRunId);
    if (!movedRun) throw new Error('This private build could not move into Agent Studio.');
    await refreshData();
    navigate({
      page: 'agent-studio',
      section: 'refine',
      businessId: sourceRun.businessId,
    });
    setNotice({
      id: crypto.randomUUID(),
      title: 'Build moved into Agent Studio',
      detail: `${builderRunPageCount(
        workspaces.find((candidate) => candidate.business.id === sourceRun.businessId)!,
        sourceRun,
      )} saved page${
        builderRunPageCount(
          workspaces.find((candidate) => candidate.business.id === sourceRun.businessId)!,
          sourceRun,
        ) === 1
          ? ''
          : 's'
      } are available as the immutable source for a focused feature test.`,
      tone: 'success',
    });
  }

  async function requestAgentStudioSiteTest(
    sourceBuilderRunId: string,
    buildInstruction: string,
    agentPackageId: string,
    featureId: string,
  ) {
    const run = await repository.requestAgentStudioSiteTest(
      sourceBuilderRunId,
      buildInstruction,
      agentPackageId,
      featureId,
    );
    if (!run) throw new Error('The linked Agent Studio test version could not be queued.');
    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title: 'Linked feature test queued',
      detail:
        'The complete saved site will be restored, only the navigation feature will be changed, and the result will appear above its source version.',
      tone: 'success',
    });
  }

  async function cancelWebsiteBuildForBusiness(businessId: string) {
    await repository.cancelWebsiteBuild(businessId);
    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title: 'Preview cancellation requested',
      detail: 'The builder will stop at its next safe step. Any saved output remains private.',
      tone: 'warning',
    });
  }

  async function resumeWebsiteBuildForBusiness(builderRunId: string) {
    const resumedRun = await repository.resumeWebsiteBuild(builderRunId);
    if (!resumedRun) throw new Error('This private test could not be continued.');
    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title: 'Private test continuing',
      detail:
        'Codex will continue this exact test from its saved private source. The prospect’s public website is unchanged.',
      tone: 'success',
    });
  }

  async function deleteWebsiteBuild(businessId: string) {
    await repository.deleteWebsiteBuildHistory(businessId);
    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title: 'Private builds deleted',
      detail:
        'All private builds, drafts, screenshots, logs, and preview links were removed. Research and the Build Manifest were kept.',
      tone: 'success',
    });
  }

  async function deleteManagedRecord(kind: ManagedRecordKind, id: string) {
    await repository.deleteManagedRecord(kind, id);
    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title: 'Saved record deleted',
      detail: 'The record was permanently removed from this workspace.',
      tone: 'success',
    });
  }

  async function deleteBuildPackage(businessId: string, redesignBriefId: string) {
    await repository.deleteBuildPackage(businessId, redesignBriefId);
    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title: 'Build package deleted',
      detail:
        'The linked brief, Build Manifest, private builds, and saved build output were removed.',
      tone: 'success',
    });
  }

  async function createBuilderPreviewUrl(builderRunId: string, mode?: BuilderPreviewMode) {
    return repository.createBuilderPreviewUrl(builderRunId, mode);
  }

  async function approveAllAuditFindings() {
    const pendingFindings = workspace?.audit?.findings.filter(
      (finding) => finding.reviewState === 'needs_review',
    );
    if (!pendingFindings?.length) return;
    await Promise.all(
      pendingFindings.map((finding) =>
        repository.updateAuditFinding(finding, {
          title: finding.title,
          finding: finding.finding,
          recommendation: finding.recommendation,
          severity: finding.severity,
          reviewState: 'approved',
        }),
      ),
    );
    await refreshData();
  }

  async function approveWorkspace() {
    if (!workspace) return;
    await repository.approveForOutreach(workspace.business.id);
    await refreshData();
  }

  async function deleteWorkspace() {
    if (!workspace) return;
    const deleted = await repository.deleteProspect(workspace.business.id);
    if (!deleted) throw new Error('The prospect could not be deleted.');
    await refreshData();
    setNotice({
      id: crypto.randomUUID(),
      title: 'Prospect deleted',
      detail: 'The prospect workspace records were removed.',
      tone: 'danger',
    });
    navigate({ page: 'prospects' });
  }

  const activePage: AppPage = route.page === 'prospects' ? 'prospects' : route.page;

  if (!loadingPresentation && storageError) {
    return <WorkspaceErrorOverlay message={storageError} onSignOut={onSignOut} />;
  }

  return (
    <>
      <AppShell
        activePage={activePage}
        contentKey={
          route.page === 'prospects' && route.businessId
            ? `#/prospects/${route.businessId}`
            : hrefForRoute(route)
        }
        isLoading={loadingPresentation}
        isHydrating={!loadingPresentation && isHydrating}
        onNavigate={(page) =>
          navigate(
            page === 'today'
              ? { page: 'today' }
              : page === 'data'
                ? { page: 'data' }
                : page === 'usage'
                  ? { page: 'usage' }
                  : page === 'settings'
                    ? { page: 'settings' }
                    : page === 'agent-studio'
                      ? { page: 'agent-studio', section: 'refine' }
                      : { page: 'prospects' },
          )
        }
        onSignOut={onSignOut}
        userEmail={userEmail}
      >
        {loadingPresentation ? null : route.page === 'today' ? (
          <TodayPage
            businesses={businesses}
            openWorkspace={openWorkspace}
            workspaces={workspaces}
          />
        ) : route.page === 'data' ? (
          <DataManagementPage
            onDeletePackage={deleteBuildPackage}
            onDeleteRecord={deleteManagedRecord}
            onOpenWorkspace={(targetWorkspace, tab, versionId) =>
              navigate({
                page: 'prospects',
                businessId: targetWorkspace.business.id,
                versionId,
                tab,
              })
            }
            workspaces={workspaces}
          />
        ) : route.page === 'usage' ? (
          <UsagePage
            agentPackages={agentPackages}
            initialBuildId={route.builderRunId}
            onOpenWorkspace={openWorkspace}
            workspaces={workspaces}
          />
        ) : route.page === 'settings' ? (
          <BuilderSettingsPage />
        ) : route.page === 'agent-studio' ? (
          <AgentStudioErrorBoundary
            onOpenSafeTesting={() => navigate({ page: 'agent-studio', section: 'refine' })}
            routeKey={`${route.section ?? 'refine'}:${route.businessId ?? ''}`}
          >
            <AgentStudioPage
              agentPackageProposals={agentPackageProposals}
              agentPackages={agentPackages}
              onApproveAgentPackageForTesting={approveAgentPackageForTesting}
              onApproveAgentPackageForProduction={approveAgentPackageForProduction}
              onStageAgentPackageBehaviours={stageAgentPackageBehaviours}
              onCancelBuild={cancelWebsiteBuildForBusiness}
              onDeleteBuild={deleteWebsiteBuild}
              onLoadBuildEvidence={(builderRunId) => repository.getBuilderRunEvidence(builderRunId)}
              onMoveToAgentStudio={moveBuilderRunToAgentStudio}
              onOpenPreview={createBuilderPreviewUrl}
              onOpenProspect={(businessId) =>
                navigate({ page: 'prospects', businessId, tab: 'redesign' })
              }
              onOpenUsageAnalysis={(builderRunId) => navigate({ page: 'usage', builderRunId })}
              onRequestBuild={requestWebsiteBuildForBusiness}
              onRequestSiteTest={requestAgentStudioSiteTest}
              onResumeBuild={resumeWebsiteBuildForBusiness}
              onRequestAgentPackageProposal={requestAgentPackageProposal}
              onPromoteAgentPackage={promoteAgentPackage}
              onSelectSection={(section) =>
                navigate({
                  page: 'agent-studio',
                  section,
                  businessId: route.businessId,
                })
              }
              onSelectWorkspace={(businessId) =>
                navigate({
                  page: 'agent-studio',
                  section: 'refine',
                  businessId: businessId || undefined,
                })
              }
              section={route.section ?? 'refine'}
              selectedBusinessId={route.businessId}
              workspaces={workspaces}
            />
          </AgentStudioErrorBoundary>
        ) : route.businessId && workspace ? (
          <WorkspacePage
            agentPackages={agentPackages}
            onApprove={approveWorkspace}
            onBack={() => navigate({ page: 'prospects' })}
            onDelete={deleteWorkspace}
            onApproveAllAuditFindings={approveAllAuditFindings}
            onApproveRedesignBrief={approveRedesignBrief}
            onCreateBuildManifest={createBuildManifest}
            onRequestProspectBuild={(mode, targetSourceUrl, buildInstruction, agentPackageId) =>
              requestWebsiteBuildForBusiness(
                workspace.business.id,
                mode,
                targetSourceUrl,
                buildInstruction,
                agentPackageId,
              )
            }
            onCancelProspectBuild={() => cancelWebsiteBuildForBusiness(workspace.business.id)}
            onDeleteProspectBuilds={deleteWebsiteBuild}
            onOpenBuilderPreview={createBuilderPreviewUrl}
            onLoadBuilderRunEvidence={(builderRunId) =>
              repository.getBuilderRunEvidence(builderRunId)
            }
            onMoveBuilderRunToAgentStudio={moveBuilderRunToAgentStudio}
            onCreateRedesignBrief={createRedesignBrief}
            onRefreshRedesignBriefArchitecture={refreshRedesignBriefArchitecture}
            onRequestAssetAnalysis={requestAssetAnalysis}
            onRequestVisualContentExtraction={requestVisualContentExtraction}
            onCancelVisualContentExtraction={cancelVisualContentExtraction}
            onApproveAllVisualContent={approveAllVisualContent}
            onUpdateVisualContentCandidate={updateVisualContentCandidate}
            onRequestEditableLogoRetry={requestEditableLogoRetry}
            onDeleteLogoAsset={deleteLogoAsset}
            onCancelAssetAnalysis={cancelAssetAnalysis}
            onSetAssetAnalysisSelected={setAssetAnalysisSelected}
            onCancelResearchCapture={cancelResearchCapture}
            onContinueResearchCapture={continueResearchCapture}
            onRequestResearchCapture={requestResearchCapture}
            onRequestAssetRefresh={requestAssetRefresh}
            onRequestWebsiteAudit={requestWebsiteAudit}
            onCancelWebsiteAudit={cancelWebsiteAudit}
            onToggleTask={toggleTask}
            onTabChange={(tab) =>
              navigate({
                page: 'prospects',
                businessId: workspace.business.id,
                versionId: route.page === 'prospects' ? route.versionId : undefined,
                tab,
              })
            }
            onVersionChange={(versionId) =>
              navigate({
                page: 'prospects',
                businessId: workspace.business.id,
                versionId,
                tab: 'overview',
              })
            }
            tab={route.tab ?? 'overview'}
            onUpdateAuditFinding={updateAuditFinding}
            onUpdateAssetAnnotation={updateAssetAnnotation}
            onSaveBrandKit={saveBrandKit}
            onPushLogoVersionsToBuilder={pushLogoVersionsToBuilder}
            onCreateBrandAwareBriefRevision={createBrandAwareBriefRevision}
            onUpdateRedesignBrief={updateRedesignBrief}
            workspace={workspace}
          />
        ) : (
          <ProspectsPage
            businesses={businesses}
            createProspect={(url) => repository.createProspect(url)}
            createWorkspace={handleWorkspaceCreated}
            openWorkspace={openWorkspace}
            workspaces={workspaces}
          />
        )}
      </AppShell>
      {loadingPresentation ? (
        <WorkspaceLoadingOverlay
          loading={loading}
          onComplete={() => setLoadingPresentation(false)}
        />
      ) : null}
      <ToastRegion notice={notice} onDismiss={() => setNotice(undefined)} />
    </>
  );
}

function SignInScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [state, setState] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = getSupabaseClient();
    if (!client || !email.trim() || !password) return;
    setState('submitting');
    setMessage('');
    const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setState('error');
      setMessage('We could not sign you in. Check your email address and password.');
      return;
    }
    onSignedIn();
  }

  return (
    <main className="auth-shell">
      <Card aria-labelledby="sign-in-title" className="auth-panel">
        <Eyebrow>Made Solid Studio</Eyebrow>
        <h1 id="sign-in-title">Sign in to your workspace</h1>
        <p>Use the account created in Supabase. Your prospect records stay organization-scoped.</p>
        <form className="auth-form" onSubmit={submit}>
          <label htmlFor="signInEmail">Email address</label>
          <input
            autoComplete="email"
            id="signInEmail"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
          <label htmlFor="signInPassword">Password</label>
          <input
            autoComplete="current-password"
            id="signInPassword"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
          <Button disabled={state === 'submitting' || !email.trim() || !password} type="submit">
            {state === 'submitting' ? 'Signing in' : 'Sign in'}
          </Button>
          {message ? (
            <p className="form-message form-message--error" role="alert">
              {message}
            </p>
          ) : null}
        </form>
      </Card>
    </main>
  );
}

function OrganizationSetup({ onCreated }: { onCreated: (organizationId: string) => void }) {
  const [name, setName] = useState('Made Solid Studio');
  const [state, setState] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = getSupabaseClient();
    if (!client || !name.trim()) return;
    setState('submitting');
    setMessage('');
    const { data, error } = await client.rpc('create_organization', {
      organization_name: name.trim(),
    });
    if (error || typeof data !== 'string') {
      setState('error');
      setMessage('We could not create the organization. Please try again.');
      return;
    }
    onCreated(data);
  }

  return (
    <main className="auth-shell">
      <Card aria-labelledby="organization-title" className="auth-panel">
        <Eyebrow>First-time setup</Eyebrow>
        <h1 id="organization-title">Name your organization</h1>
        <p>
          This creates the private boundary that separates your prospects, clients, files and team
          access.
        </p>
        <form className="auth-form" onSubmit={submit}>
          <label htmlFor="organizationName">Organization name</label>
          <input
            autoComplete="organization"
            id="organizationName"
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
          <Button disabled={state === 'submitting' || !name.trim()} type="submit">
            {state === 'submitting' ? 'Creating organization' : 'Create organization'}
          </Button>
          {message ? (
            <p className="form-message form-message--error" role="alert">
              {message}
            </p>
          ) : null}
        </form>
      </Card>
    </main>
  );
}

function SupabaseApp() {
  const client = getSupabaseClient();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string>();
  const [organizationLoading, setOrganizationLoading] = useState(false);
  const [organizationError, setOrganizationError] = useState('');

  useEffect(() => {
    if (!client) return;
    let active = true;
    void client.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setAuthLoading(false);
      }
    });
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [client]);

  useEffect(() => {
    if (!client || !session) {
      setOrganizationId(undefined);
      setOrganizationError('');
      setOrganizationLoading(false);
      return;
    }
    let active = true;
    setOrganizationLoading(true);
    setOrganizationError('');
    void client
      .from('organizations')
      .select('id')
      .order('created_at')
      .limit(1)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setOrganizationError('We could not load your organization access.');
        else setOrganizationId(typeof data?.[0]?.id === 'string' ? data[0].id : undefined);
        setOrganizationLoading(false);
      });
    return () => {
      active = false;
    };
  }, [client, session?.user.id]);

  const repository = useMemo(
    () =>
      client && organizationId
        ? new SupabaseWorkspaceRepository(client, organizationId)
        : undefined,
    [client, organizationId],
  );

  if (!client) return <WorkspaceApp repository={siteforgeRepository} />;
  if (authLoading) {
    return (
      <main className="auth-shell">
        <Card className="loading-panel" role="status">
          Loading account...
        </Card>
      </main>
    );
  }
  if (!session) return <SignInScreen onSignedIn={() => undefined} />;
  if (organizationLoading) {
    return (
      <main className="auth-shell">
        <Card className="loading-panel" role="status">
          Loading organization...
        </Card>
      </main>
    );
  }
  if (organizationError) {
    return (
      <main className="auth-shell">
        <Card className="error-panel" role="alert">
          <ShieldAlert aria-hidden="true" size={20} />
          <div>
            <h1>Organization unavailable</h1>
            <p>{organizationError}</p>
          </div>
        </Card>
      </main>
    );
  }
  if (!organizationId) return <OrganizationSetup onCreated={setOrganizationId} />;
  if (!repository) return null;
  return (
    <WorkspaceApp
      onSignOut={() =>
        client.auth.signOut().then(({ error }) => {
          if (error) throw error;
        })
      }
      repository={repository}
      userEmail={session.user.email ?? 'Signed-in user'}
    />
  );
}

export function App() {
  if (!isSupabaseConfigured || usesLocalStorage)
    return <WorkspaceApp repository={siteforgeRepository} />;
  return <SupabaseApp />;
}
