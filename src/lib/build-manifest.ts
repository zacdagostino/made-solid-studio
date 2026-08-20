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
import { groupVisualAssets } from './visual-asset-groups';

export const buildManifestSchemaVersion = 7;
export const codexBuilderContractVersion = 'made-solid-studio-codex-builder-v11';

export function unresolvedPageDispositions(brief: RedesignBrief) {
  return brief.draft.pagePlans.filter(
    (plan) =>
      !plan.disposition ||
      plan.disposition === 'needs_review' ||
      ((plan.disposition === 'merge' || plan.disposition === 'redirect') && !plan.targetSourceUrl),
  );
}

const builderRules = [
  'Build a complete mobile-first website from this manifest, not a superficial reskin of the captured website.',
  'Use only permitted facts and source-bound content. Do not invent reviews, qualifications, prices, guarantees, locations, services, contact details, or performance claims.',
  'Treat selected pages and selected assets as research context. Only approved asset guidance authorises visual reuse in the redesign.',
  'Treat approved visual-content groups as required semantic source material, not layout instructions. Account for every item on its source page, while deciding whether to integrate the group into an existing section or create a new composition and owning its responsive design and styling.',
  'Never reuse or render an image that supplied approved recovered semantic content. Its asset ID is retained only as private provenance and the source image is excluded from selected assets, approved asset guidance, and the staged builder workspace.',
  'When a Brand Kit is present, use its staged approved logo family in the header and footer, choose a contrast-safe approved logo appearance for each direct background surface, prefer its approved editable SVG logo version only where its original colours remain legible, and use every enabled reviewed brand colour as its exact matching semantic token. A palette role deliberately switched off is builder-derived: choose a coherent accessible value for that role without presenting it as a verified brand fact. Derive accessible neutral, background, surface, muted, and border tokens rather than copying a weak legacy palette or substituting a generic identity.',
  'Use semantic HTML, labelled forms, keyboard-accessible controls, accessible colour contrast, and a clear focus order.',
  'Create a clear visual hierarchy with purposeful typography, spacing, navigation, calls to action, trust presentation, and restrained motion. Viewport reveals for headings and containers, plus counters for real metrics, are built-in defaults: apply them where they support scanning without waiting for a separate motion prompt.',
  'Design responsive mobile, tablet, and desktop layouts. Do not rely on desktop layouts shrinking into mobile.',
  'Keep performance, privacy, maintainability, local SEO foundations, and reusable design tokens as first-class implementation constraints.',
  'Surface open questions and uncertainties for human review rather than resolving them with assumptions.',
  'Treat pageCoverage as the reviewed source-coverage contract. Build only entries with outputRequired. Merge content into its target without creating another page, omit excluded residue, implement redirect aliases without navigation links, keep workflow states out of navigation and search indexing, and link contextual routes only where relevant.',
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
  pages: Array<
    Pick<
      BuildManifestPage,
      'url' | 'title' | 'pageType' | 'canonicalUrl' | 'disposition' | 'targetSourceUrl'
    >
  >,
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
  return groupVisualAssets(artifacts.filter((artifact) => artifact.kind === 'asset'))
    .filter((group) => group.assets.some((artifact) => selectedIds.has(artifact.id)))
    .map((group) => {
      const artifact =
        group.assets.find((candidate) => selectedIds.has(candidate.id)) ?? group.asset;
      return {
        artifactId: artifact.id,
        label: artifact.label,
        contentType: artifact.contentType,
        storageBucket: artifact.storageBucket,
        storagePath: artifact.storagePath,
        sourceSelected: true,
        sourcePageUrls: group.pageUrls,
        sourceUrls: group.sourceUrls,
        duplicateArtifactIds: group.assets
          .map((candidate) => candidate.id)
          .filter((artifactId) => artifactId !== artifact.id),
      };
    });
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
  const selectedAssetIds = new Set(brief.sourceSelections.assetIds);
  const canonicalAssetIds = new Map<string, string>();
  for (const group of groupVisualAssets(
    workspace.artifacts.filter((artifact) => artifact.kind === 'asset'),
  )) {
    const representative =
      group.assets.find((asset) => selectedAssetIds.has(asset.id)) ?? group.asset;
    for (const asset of group.assets) canonicalAssetIds.set(asset.id, representative.id);
  }
  const approvedVisualContent = brief.draft.approvedVisualContent ?? [];
  const recoveredContentAssetIds = new Set(
    approvedVisualContent.map((item) => item.assetId).filter(Boolean),
  );
  const approvedCapabilities = (brief.draft.capabilityInventory ?? []).filter(
    (capability) => capability.decision === 'include',
  );
  const selectedPages = buildPageRoutes(
    workspace.capturedPages
      .filter((page) => selectedPageUrls.has(page.url))
      .map((page) => {
        const plan = brief.draft.pagePlans.find((candidate) => candidate.sourceUrl === page.url);
        return {
          url: page.url,
          title: page.title,
          pageType: page.pageType,
          canonicalUrl: page.canonicalUrl,
          disposition: plan?.disposition,
          targetSourceUrl: plan?.targetSourceUrl,
        };
      })
      .filter(
        (
          page,
        ): page is typeof page & {
          disposition: 'build' | 'redirect' | 'workflow_state' | 'contextual';
        } =>
          page.disposition === 'build' ||
          page.disposition === 'redirect' ||
          page.disposition === 'workflow_state' ||
          page.disposition === 'contextual',
      ),
  );
  const pageCoverage = workspace.capturedPages
    .filter((page) => selectedPageUrls.has(page.url))
    .map((page) => {
      const plan = brief.draft.pagePlans.find((candidate) => candidate.sourceUrl === page.url);
      if (!plan || plan.disposition === 'needs_review') {
        throw new Error(`Review the page disposition for ${page.url} before building.`);
      }
      return {
        url: page.url,
        title: page.title,
        pageType: page.pageType,
        canonicalUrl: page.canonicalUrl,
        disposition: plan.disposition,
        dispositionReason: plan.dispositionReason,
        targetSourceUrl: plan.targetSourceUrl,
        outputRequired: !['merge', 'exclude'].includes(plan.disposition),
      };
    });

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
    pageCoverage,
    selectedAssets: selectedArtifacts(
      workspace.artifacts,
      brief.sourceSelections.assetIds.filter((assetId) => !recoveredContentAssetIds.has(assetId)),
    ),
    approvedAssetGuidance: [
      ...new Map(
        brief.draft.assetGuidance
          .filter((guidance) => !recoveredContentAssetIds.has(guidance.assetId))
          .map((guidance) => {
            const assetId = canonicalAssetIds.get(guidance.assetId) ?? guidance.assetId;
            return [assetId, { ...guidance, assetId }] as const;
          }),
      ).values(),
    ],
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
