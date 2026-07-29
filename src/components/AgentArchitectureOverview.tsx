import {
  ArrowRight,
  Bot,
  Braces,
  Check,
  Database,
  FileCheck2,
  FileText,
  GitBranch,
  Layers3,
  LockKeyhole,
  MonitorSmartphone,
  PackageCheck,
  Rocket,
  ServerCog,
  ShieldCheck,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Button, Eyebrow, StatusBadge } from './ui';

type RuntimeProfileId = 'static-marketing' | 'managed-forms' | 'managed-next-runtime';

type ArchitectureSourceLabel =
  | 'Builder contract'
  | 'Builder worker'
  | 'Component architecture contract'
  | 'Runtime profiles contract'
  | 'Template instructions'
  | 'Template packages';

const pipelineStages: Array<{
  title: string;
  detail: string;
  output: string;
  Icon: LucideIcon;
}> = [
  {
    title: 'Approved inputs',
    detail: 'Immutable brief, Brand Kit, facts, pages, assets, capabilities and open questions.',
    output: 'Build Manifest v4',
    Icon: FileCheck2,
  },
  {
    title: 'Isolated workspace',
    detail: 'A disposable Git workspace receives only the locked foundation and approved inputs.',
    output: 'Clean source boundary',
    Icon: GitBranch,
  },
  {
    title: 'Codex build',
    detail: 'Codex creates the business-specific design system, components, layouts and routes.',
    output: 'Strict TSX source',
    Icon: Bot,
  },
  {
    title: 'Framework gate',
    detail: 'Formatting, ESLint, strict typing and the production Next.js export must all pass.',
    output: 'Compiled App Router site',
    Icon: Braces,
  },
  {
    title: 'Browser evidence',
    detail:
      'Routes, navigation, focus, reduced motion, overflow, console errors and axe are checked.',
    output: 'Four viewport captures',
    Icon: MonitorSmartphone,
  },
  {
    title: 'Private preview',
    detail: 'Source, compiled files, logs and quality results are saved against the immutable run.',
    output: 'Reviewable, never published',
    Icon: Rocket,
  },
];

const generatedLayers = [
  {
    name: 'Semantic tokens',
    detail: 'Colour roles, type, spacing, radius, elevation and motion.',
  },
  {
    name: 'UI primitives',
    detail: 'Buttons, inputs, dialogs and controls with site-specific appearance.',
  },
  {
    name: 'Patterns',
    detail: 'Navigation groups, form rows, content lists and repeated arrangements.',
  },
  {
    name: 'Sections',
    detail: 'Hero, services, proof, process, FAQ and contact compositions.',
  },
  {
    name: 'Site components',
    detail: 'Business-specific combinations that carry the site’s visual identity.',
  },
  {
    name: 'Layouts',
    detail: 'Page shells, content hierarchy, responsive grids and route families.',
  },
  {
    name: 'Pages',
    detail: 'Real App Router routes mapped to every selected source page.',
  },
] as const;

const lockedFoundation = [
  {
    title: 'Framework and dependencies',
    detail: 'Pinned Next.js, React, TypeScript, Tailwind, Base UI, CVA and Lucide versions.',
  },
  {
    title: 'Behaviour contracts',
    detail: 'Accessibility, evidence, navigation, brand and capability boundaries.',
  },
  {
    title: 'Protected runtime',
    detail: 'Brand handoff, reveal mechanics, factual counters and reduced-motion handling.',
  },
  {
    title: 'Worker and quality gates',
    detail: 'Workspace isolation, typed checkpoints, compilation and browser verification.',
  },
] as const;

const runtimeProfiles: Record<
  RuntimeProfileId,
  {
    label: string;
    shortLabel: string;
    useWhen: string;
    preview: string;
    production: string;
    adapters: string[];
  }
> = {
  'static-marketing': {
    label: 'Static marketing',
    shortLabel: 'Static',
    useWhen: 'The website publishes information and uses links, navigation and local interactions.',
    preview: 'The private export is functionally representative.',
    production: 'Deploy the generated static output to a CDN or static host.',
    adapters: ['Analytics configuration', 'Destination URLs', 'Optional consent service'],
  },
  'managed-forms': {
    label: 'Managed forms',
    shortLabel: 'Forms',
    useWhen:
      'The visitor submits an enquiry, quote request, newsletter signup or similar workflow.',
    preview: 'The complete form UI and states are testable; submission remains safely blocked.',
    production: 'Connect the reviewed form adapter and server-side secret configuration.',
    adapters: ['Form endpoint', 'Spam protection', 'Delivery destination', 'Privacy copy'],
  },
  'managed-next-runtime': {
    label: 'Managed Next.js runtime',
    shortLabel: 'Next runtime',
    useWhen: 'The website needs accounts, bookings, commerce, protected data or server operations.',
    preview: 'The interface and state model are shown without fabricating unavailable services.',
    production: 'Deploy the source to an approved Next.js runtime with reviewed integrations.',
    adapters: ['Authentication', 'Database', 'Booking or commerce API', 'Secrets and webhooks'],
  },
};

const sourceLinks: Array<{
  label: ArchitectureSourceLabel;
  description: string;
}> = [
  {
    label: 'Component architecture contract',
    description: 'Generated layers and ownership boundary',
  },
  {
    label: 'Runtime profiles contract',
    description: 'Preview and production capability rules',
  },
  {
    label: 'Template packages',
    description: 'Pinned framework and verification commands',
  },
  {
    label: 'Builder worker',
    description: 'Isolation, checkpoints and quality execution',
  },
];

export function AgentArchitectureOverview({
  contractVersion,
  foundationVersion,
  packageVersion,
  onOpenSource,
}: {
  contractVersion: string;
  foundationVersion: string;
  packageVersion: number;
  onOpenSource: (label: ArchitectureSourceLabel, trigger: HTMLButtonElement) => void;
}) {
  const [runtimeProfile, setRuntimeProfile] = useState<RuntimeProfileId>('static-marketing');
  const selectedRuntime = runtimeProfiles[runtimeProfile];

  return (
    <section
      aria-labelledby="agent-architecture-overview-title"
      className="agent-architecture-overview"
    >
      <header className="agent-architecture-overview__hero">
        <div className="agent-architecture-overview__hero-copy">
          <div className="agent-architecture-overview__status-row">
            <Eyebrow>Builder system v2</Eyebrow>
            <StatusBadge tone="success">
              <ShieldCheck aria-hidden="true" size={14} />
              Production architecture
            </StatusBadge>
          </div>
          <h3 id="agent-architecture-overview-title">
            One click. A complete, controlled website build.
          </h3>
          <p>
            The foundation locks engineering mechanics and safety boundaries. Codex remains free to
            create each business’s visual language, component system and page composition.
          </p>
        </div>
        <dl className="agent-architecture-overview__facts">
          <div>
            <dt>Published package</dt>
            <dd>v{packageVersion}</dd>
          </div>
          <div>
            <dt>Foundation</dt>
            <dd>{foundationVersion}</dd>
          </div>
          <div>
            <dt>Builder contract</dt>
            <dd>{contractVersion}</dd>
          </div>
          <div>
            <dt>Release standard</dt>
            <dd>WCAG 2.2 AA + compiled evidence</dd>
          </div>
        </dl>
      </header>

      <section
        aria-labelledby="agent-architecture-pipeline-title"
        className="agent-architecture-overview__section agent-architecture-pipeline"
      >
        <div className="agent-architecture-overview__section-heading">
          <div>
            <Eyebrow>One-click build path</Eyebrow>
            <h4 id="agent-architecture-pipeline-title">
              From approved evidence to private preview
            </h4>
          </div>
          <span>
            <Workflow aria-hidden="true" size={16} />
            Persisted, cancellable worker run
          </span>
        </div>
        <ol className="agent-architecture-pipeline__stages">
          {pipelineStages.map(({ title, detail, output, Icon }, index) => (
            <li key={title}>
              <div className="agent-architecture-pipeline__stage-heading">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <Icon aria-hidden="true" size={18} />
              </div>
              <strong>{title}</strong>
              <p>{detail}</p>
              <small>
                <Check aria-hidden="true" size={13} />
                {output}
              </small>
              {index < pipelineStages.length - 1 ? (
                <ArrowRight
                  aria-hidden="true"
                  className="agent-architecture-pipeline__connector"
                  size={16}
                />
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="agent-architecture-ownership-title"
        className="agent-architecture-overview__section agent-architecture-ownership"
      >
        <div className="agent-architecture-overview__section-heading">
          <div>
            <Eyebrow>Creative ownership</Eyebrow>
            <h4 id="agent-architecture-ownership-title">Locked mechanics. Generated design.</h4>
          </div>
          <span>
            <Layers3 aria-hidden="true" size={16} />
            Seven generated layers
          </span>
        </div>
        <div className="agent-architecture-ownership__columns">
          <section aria-labelledby="locked-foundation-title">
            <div className="agent-architecture-ownership__column-heading">
              <span className="agent-architecture-ownership__icon">
                <LockKeyhole aria-hidden="true" size={19} />
              </span>
              <div>
                <strong id="locked-foundation-title">Locked foundation</strong>
                <small>Audited and shared across builds</small>
              </div>
            </div>
            <ul className="agent-architecture-ownership__locked-list">
              {lockedFoundation.map((item) => (
                <li key={item.title}>
                  <Check aria-hidden="true" size={15} />
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="generated-system-title">
            <div className="agent-architecture-ownership__column-heading">
              <span className="agent-architecture-ownership__icon is-generated">
                <Layers3 aria-hidden="true" size={19} />
              </span>
              <div>
                <strong id="generated-system-title">Generated for this business</strong>
                <small>Creative, editable and site-specific</small>
              </div>
            </div>
            <ol className="agent-architecture-ownership__layer-stack">
              {generatedLayers.map((layer, index) => (
                <li key={layer.name}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{layer.name}</strong>
                    <small>{layer.detail}</small>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <div className="agent-architecture-overview__sources">
          <span>
            <FileText aria-hidden="true" size={15} />
            Inspect the source of truth
          </span>
          <div>
            {sourceLinks.map((source) => (
              <Button
                key={source.label}
                onClick={(event) => onOpenSource(source.label, event.currentTarget)}
                size="small"
                title={source.description}
                type="button"
                variant="quiet"
              >
                {source.label}
                <ArrowRight aria-hidden="true" size={14} />
              </Button>
            ))}
          </div>
        </div>
      </section>

      <div className="agent-architecture-runtime-quality">
        <section
          aria-labelledby="agent-architecture-runtime-title"
          className="agent-architecture-overview__section agent-architecture-runtime"
        >
          <div className="agent-architecture-overview__section-heading">
            <div>
              <Eyebrow>Production honesty</Eyebrow>
              <h4 id="agent-architecture-runtime-title">Runtime profile</h4>
            </div>
            <ServerCog aria-hidden="true" size={20} />
          </div>
          <div
            aria-label="Production runtime profiles"
            className="agent-architecture-runtime__tabs"
            role="group"
          >
            {(Object.keys(runtimeProfiles) as RuntimeProfileId[]).map((profileId) => (
              <Button
                aria-controls="agent-architecture-runtime-detail"
                aria-pressed={runtimeProfile === profileId}
                key={profileId}
                onClick={() => setRuntimeProfile(profileId)}
                size="small"
                type="button"
                variant={runtimeProfile === profileId ? 'primary' : 'secondary'}
              >
                {runtimeProfiles[profileId].shortLabel}
              </Button>
            ))}
          </div>
          <div
            className="agent-architecture-runtime__detail"
            id="agent-architecture-runtime-detail"
          >
            <div>
              <StatusBadge tone="success">{selectedRuntime.label}</StatusBadge>
              <strong>Use when</strong>
              <p>{selectedRuntime.useWhen}</p>
            </div>
            <dl>
              <div>
                <dt>Private preview</dt>
                <dd>{selectedRuntime.preview}</dd>
              </div>
              <div>
                <dt>Production</dt>
                <dd>{selectedRuntime.production}</dd>
              </div>
            </dl>
            <div className="agent-architecture-runtime__adapters">
              <strong>
                <Database aria-hidden="true" size={15} />
                Required adapters
              </strong>
              <ul>
                {selectedRuntime.adapters.map((adapter) => (
                  <li key={adapter}>{adapter}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="agent-architecture-quality-title"
          className="agent-architecture-overview__section agent-architecture-quality"
        >
          <div className="agent-architecture-overview__section-heading">
            <div>
              <Eyebrow>Release evidence</Eyebrow>
              <h4 id="agent-architecture-quality-title">Quality gate</h4>
            </div>
            <PackageCheck aria-hidden="true" size={20} />
          </div>
          <div className="agent-architecture-quality__viewports">
            <strong>Real browser viewports</strong>
            <ul>
              <li>
                <span>Small mobile</span>
                <code>320 × 568</code>
              </li>
              <li>
                <span>Mobile</span>
                <code>375 × 812</code>
              </li>
              <li>
                <span>Tablet</span>
                <code>768 × 1024</code>
              </li>
              <li>
                <span>Desktop</span>
                <code>1440 × 900</code>
              </li>
            </ul>
          </div>
          <ul className="agent-architecture-quality__checks">
            {[
              'Format, ESLint and strict TypeScript',
              'Production Next.js compilation',
              'Clean-route and source-page coverage',
              'Compact navigation open and closed',
              'Keyboard focus and Escape restoration',
              'Reduced motion and 44px touch targets',
              'Overflow and browser console errors',
              'axe accessibility and visual captures',
            ].map((check) => (
              <li key={check}>
                <Check aria-hidden="true" size={14} />
                {check}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}
