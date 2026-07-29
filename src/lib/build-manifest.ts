import type {
  ApprovedVisualContent,
  ApprovedVisualContentGroup,
  BuildArchitecture,
  BuildManifestPage,
  BuildManifestData,
  CapabilityInventoryItem,
  EvidenceFact,
  ProspectWorkspace,
  RedesignBrief,
  ResearchArtifact,
} from './domain';

export const buildManifestSchemaVersion = 4;
export const codexBuilderContractVersion = 'made-solid-studio-codex-builder-v8';

const builderRules = [
  'Build a complete mobile-first website from this manifest, not a superficial reskin of the captured website.',
  'Use only permitted facts and source-bound content. Do not invent reviews, qualifications, prices, guarantees, locations, services, contact details, or performance claims.',
  'Treat selected pages and selected assets as research context. Only approved asset guidance authorises visual reuse in the redesign.',
  'Treat approved visual-content groups as required semantic source material, not layout instructions. Account for every item on its source page, while deciding whether to integrate the group into an existing section or create a new composition and owning its responsive design and styling.',
  'When a Brand Kit is present, use its staged approved logo family in the header and footer, choose a contrast-safe approved logo appearance for each direct background surface, prefer its approved editable SVG logo version only where its original colours remain legible, use its reviewed primary and accent colours as brand tokens, and derive accessible neutral, background, surface, muted, and border tokens rather than copying a weak legacy palette or substituting a generic identity.',
  'Use semantic HTML, labelled forms, keyboard-accessible controls, accessible colour contrast, and a clear focus order.',
  'Create a clear visual hierarchy with purposeful typography, spacing, navigation, calls to action, trust presentation, and restrained motion. Viewport reveals for headings and containers, plus counters for real metrics, are built-in defaults: apply them where they support scanning without waiting for a separate motion prompt.',
  'Design responsive mobile, tablet, and desktop layouts. Do not rely on desktop layouts shrinking into mobile.',
  'Keep performance, privacy, maintainability, local SEO foundations, and reusable design tokens as first-class implementation constraints.',
  'Surface open questions and uncertainties for human review rather than resolving them with assumptions.',
  'Treat the proposed sitemap as an information-hierarchy model, not a list of the only pages to build. Every selected source page remains required output scope; keep articles, tools, legal, confirmation, profile, and other supporting routes available without forcing them into primary navigation.',
  'Do not publish, contact a prospect, use uncertain information as fact, or make compliance guarantees without human approval.',
  'Implement only the approved capabilities. For a capability that requires an external service, account, authentication, payments, or server-side data, create an honest preview of the user-facing flow and record the production integration requirement; do not invent credentials, accounts, transactions, or working backend behaviour.',
  'Use the manifest architecture contract: Next.js App Router, strict TypeScript, Tailwind with semantic CSS tokens, native HTML first, and Base UI only for interaction patterns whose keyboard or focus behaviour is not safely supplied by the platform.',
  'Create the site-specific component system in layers: tokens, UI primitives, patterns, sections, site-wide navigation, layouts, and pages. The foundation locks behaviour and dependencies, not visual appearance.',
  'Do not add, remove, or upgrade packages during a build. Use the pinned foundation and create only the components the selected site needs.',
];

function cleanRouteSegment(value: string) {
  return decodeURIComponent(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

function buildPageRoutes(
  pages: Array<Pick<BuildManifestPage, 'url' | 'title' | 'pageType' | 'canonicalUrl'>>,
): BuildManifestPage[] {
  const usedRoutes = new Set<string>();
  return pages.map((page) => {
    const sourceSegments = new URL(page.url).pathname
      .split('/')
      .filter(Boolean)
      .map(cleanRouteSegment)
      .filter(Boolean);
    const baseSegments = sourceSegments.length ? sourceSegments : [];
    let routeSegments = baseSegments;
    let routeKey = routeSegments.join('/');
    let duplicate = 2;
    while (usedRoutes.has(routeKey)) {
      const lastSegment = baseSegments.at(-1) || 'home';
      routeSegments = [...baseSegments.slice(0, -1), `${lastSegment}-${duplicate}`];
      routeKey = routeSegments.join('/');
      duplicate += 1;
    }
    usedRoutes.add(routeKey);
    const routePath = routeSegments.length ? `/${routeSegments.join('/')}` : '/';
    return {
      ...page,
      routePath,
      publicPath: routePath === '/' ? '/' : `${routePath}/`,
      outputPath: routeSegments.length ? `${routeSegments.join('/')}/index.html` : 'index.html',
      sourcePath: routeSegments.length ? `app/${routeSegments.join('/')}/page.tsx` : 'app/page.tsx',
      sourceSelected: true,
    };
  });
}

function productionRuntime(capabilities: CapabilityInventoryItem[]) {
  if (!capabilities.length) return 'static-marketing' as const;
  if (
    capabilities.every(
      (capability) =>
        capability.kind === 'lead_form' ||
        capability.kind === 'booking_workflow' ||
        capability.delivery === 'integration',
    )
  ) {
    return 'managed-forms' as const;
  }
  return 'managed-next-runtime' as const;
}

function buildArchitecture(capabilities: CapabilityInventoryItem[]): BuildArchitecture {
  const runtime = productionRuntime(capabilities);
  return {
    sourceFramework: 'next-app-router',
    language: 'typescript-strict',
    styling: 'tailwind-and-semantic-css-tokens',
    interactionFoundation: 'base-ui-and-native-html',
    iconSystem: 'lucide',
    previewRuntime: 'static-export',
    productionRuntime: runtime,
    componentLayers: ['tokens', 'ui', 'patterns', 'sections', 'site', 'layouts', 'pages'],
    generationPolicy: {
      agentOwnsVisualSystem: true,
      agentOwnsSiteComponents: true,
      lockedBehaviourNotAppearance: true,
      dependenciesPinnedByFoundation: true,
      nativeHtmlFirst: true,
    },
    capabilityAdapters: capabilities.map((capability) => ({
      capabilityId: capability.id,
      kind: capability.kind,
      previewMode: 'honest-interface',
      productionMode:
        runtime === 'static-marketing'
          ? 'static'
          : runtime === 'managed-forms' &&
              (capability.kind === 'lead_form' ||
                capability.kind === 'booking_workflow' ||
                capability.delivery === 'integration')
            ? 'managed-adapter'
            : 'managed-next-runtime',
      requiresSecrets:
        capability.delivery === 'integration' ||
        capability.delivery === 'authenticated_application' ||
        capability.kind === 'commerce',
      requiresHumanConfiguration: runtime !== 'static-marketing',
    })),
    qualityProfile: {
      standard: 'wcag-2.2-aa',
      requiredViewports: [
        { id: 'mobile-small', width: 320, height: 568 },
        { id: 'mobile', width: 375, height: 812 },
        { id: 'tablet', width: 768, height: 1024 },
        { id: 'desktop', width: 1440, height: 900 },
      ],
      checks: [
        'format',
        'lint',
        'strict-typecheck',
        'production-build',
        'route-coverage',
        'keyboard-navigation',
        'mobile-navigation-open-and-closed',
        'horizontal-overflow',
        'touch-targets',
        'axe',
        'local-assets-only',
        'responsive-screenshots',
      ],
    },
  };
}

function selectedArtifacts(artifacts: ResearchArtifact[], ids: string[]) {
  const selectedIds = new Set(ids);
  return artifacts
    .filter((artifact) => artifact.kind === 'asset' && selectedIds.has(artifact.id))
    .map((artifact) => ({
      artifactId: artifact.id,
      label: artifact.label,
      contentType: artifact.contentType,
      storageBucket: artifact.storageBucket,
      storagePath: artifact.storagePath,
      sourceSelected: true,
    }));
}

function permittedFacts(facts: EvidenceFact[]) {
  return facts
    .filter(
      (fact) => fact.verificationState !== 'rejected' && fact.verificationState !== 'inferred',
    )
    .map((fact) => ({
      id: fact.id,
      label: fact.label,
      value: fact.value,
      sourceUrl: fact.sourceUrl,
      evidence: fact.evidence,
      confidence: fact.confidence,
      verificationState: fact.verificationState,
    }));
}

export function manifestSourceMatchesBrief(workspace: ProspectWorkspace, brief: RedesignBrief) {
  return (
    workspace.latestCapture?.id === brief.crawlRunId &&
    workspace.researchPacket?.id === brief.researchPacketId
  );
}

export function currentManifestContentMatchesBrief(
  workspace: ProspectWorkspace,
  brief: RedesignBrief,
) {
  const manifest = workspace.buildManifest;
  if (!manifest || manifest.redesignBriefId !== brief.id) return true;
  return (
    manifest.schemaVersion === buildManifestSchemaVersion &&
    manifest.builderContractVersion === codexBuilderContractVersion &&
    JSON.stringify(manifest.data.approvedVisualContent) ===
      JSON.stringify(brief.draft.approvedVisualContent ?? [])
  );
}

function semanticGroupHeading(item: ApprovedVisualContent) {
  return item.sectionHeading.trim() || item.structuredContent.heading.trim() || item.contentType;
}

export function groupApprovedVisualContent(
  items: ApprovedVisualContent[],
): ApprovedVisualContentGroup[] {
  const groups = new Map<
    string,
    {
      sourcePageUrl: string;
      sectionHeading: string;
      semanticRole: ApprovedVisualContent['contentType'];
      items: ApprovedVisualContent[];
      sourcePresentations: Set<ApprovedVisualContent['sourcePresentation']>;
    }
  >();
  for (const item of items) {
    const sectionHeading = semanticGroupHeading(item);
    const key = [
      item.sourcePageUrl.trim().toLowerCase(),
      sectionHeading.trim().toLowerCase(),
      item.contentType,
    ].join('\n');
    const group = groups.get(key) ?? {
      sourcePageUrl: item.sourcePageUrl,
      sectionHeading,
      semanticRole: item.contentType,
      items: [],
      sourcePresentations: new Set<ApprovedVisualContent['sourcePresentation']>(),
    };
    group.items.push(item);
    group.sourcePresentations.add(item.sourcePresentation);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => ({
    id: `semantic-group-${group.items[0].id}`,
    sourcePageUrl: group.sourcePageUrl,
    sectionHeading: group.sectionHeading,
    semanticRole: group.semanticRole,
    itemIds: group.items.map((item) => item.id),
    items: group.items,
    sourcePresentations: [...group.sourcePresentations],
    coverageInstruction: 'all_items_required',
    integrationInstruction: 'builder_decides',
    presentationInstruction: 'builder_decides',
  }));
}

export function createBuildManifestData(
  workspace: ProspectWorkspace,
  brief: RedesignBrief,
): BuildManifestData {
  const selectedPageUrls = new Set(brief.sourceSelections.pageUrls);
  const approvedVisualContent = brief.draft.approvedVisualContent ?? [];
  const approvedCapabilities = (brief.draft.capabilityInventory ?? []).filter(
    (capability) => capability.decision === 'include',
  );
  const selectedPages = buildPageRoutes(
    workspace.capturedPages
      .filter((page) => selectedPageUrls.has(page.url))
      .map((page) => ({
        url: page.url,
        title: page.title,
        pageType: page.pageType,
        canonicalUrl: page.canonicalUrl,
      })),
  );

  return {
    source: {
      businessName: workspace.business.name,
      websiteUrl: workspace.website?.url,
      researchPacketId: brief.researchPacketId,
      crawlRunId: brief.crawlRunId,
      redesignBriefId: brief.id,
    },
    permittedFacts: permittedFacts(workspace.facts),
    selectedPages,
    selectedAssets: selectedArtifacts(workspace.artifacts, brief.sourceSelections.assetIds),
    approvedAssetGuidance: brief.draft.assetGuidance,
    approvedCapabilities,
    approvedVisualContent,
    approvedVisualContentGroups: groupApprovedVisualContent(approvedVisualContent),
    architecture: buildArchitecture(approvedCapabilities),
    brandKit: brief.draft.brandKit,
    strategy: brief.draft.strategy,
    proposedSitemap: brief.draft.proposedSitemap,
    pagePlans: brief.draft.pagePlans,
    assumptions: brief.draft.assumptions,
    openQuestions: brief.draft.openQuestions,
    uncertainties: brief.sourceSelections.uncertainties,
    builderRules,
  };
}
