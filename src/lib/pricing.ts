import type { BuildManifest, BuildManifestPage } from './domain';

export const pricingScheduleVersion = 'made-solid-cold-prospect-v3.0';
export const serviceTermsVersion = 'made-solid-au-services-v1.1';
export const privacyNoticeVersion = 'made-solid-au-privacy-v1.1';
export const quoteValidityDays = 14;

export type PricingContentMode = 'client_ready' | 'refine' | 'write';
export type PricingMotionTier = 'standard' | 'advanced' | 'signature';

export type PricingOptions = {
  contentMode: PricingContentMode;
  motionTier: PricingMotionTier;
  rush: boolean;
  applyGst: boolean;
  adjustmentCents: number;
  adjustmentReason: string;
  includeManaged: boolean;
  includeEssentials: boolean;
};

export type PricingSourceScope = {
  source: 'manifest' | 'working_source' | 'committed_source';
  revisionLabel: string;
  fingerprint?: string;
  sourceCommit?: string;
  sourceEditVersion?: number;
  totalRoutes: number;
  corePages: number;
  contentEntries: number;
  workflowPages: number;
  supportPages: number;
  redirectRoutes: number;
  uniquePageSystems: number;
};

export type PricingLineItem = {
  id: string;
  label: string;
  detail: string;
  quantity: number;
  unitAmountCents: number;
  amountCents: number;
  source: 'manifest' | 'source_revision' | 'review';
};

export type PricingPaymentMilestone = {
  sequence: number;
  kind: 'commencement' | 'progress' | 'release';
  label: string;
  dueTrigger: string;
  amountCents: number;
};

export type PricingOfferKind = 'milestones' | 'outright' | 'managed' | 'essentials';

export type PricingOfferChoice = {
  id: string;
  kind: PricingOfferKind;
  label: string;
  summary: string;
  scopeLabel: string;
  totalCommitmentCents: number;
  setupCents: number;
  recurringCents: number;
  recurringMonths: number;
  paymentSchedule: PricingPaymentMilestone[];
  includedItems: string[];
  deferredItems: string[];
  recommended: boolean;
};

export type PricingMetrics = {
  outputPages: number;
  corePages: number;
  contentEntries: number;
  workflowPages: number;
  supportPages: number;
  redirectRoutes: number;
  uniquePageTypes: number;
  approvedAssets: number;
  capabilityCount: number;
  productionRuntime: string;
  openScopeItems: number;
};

export type PricingQuoteSnapshot = {
  schemaVersion: 3;
  quoteReference: string;
  pricingVersion: string;
  source: 'automatic_build' | 'legacy_manual' | 'amendment';
  sourceManifestId?: string;
  sourceScope: PricingSourceScope;
  generatedAt: string;
  approvedAt: string;
  validUntil: string;
  serviceTermsVersion: string;
  privacyNoticeVersion: string;
  currency: 'AUD';
  status: 'approved';
  metrics: PricingMetrics;
  options: PricingOptions;
  lineItems: PricingLineItem[];
  fullScopeValueCents: number;
  automaticOfferCeilingCents: number;
  offerChoices: PricingOfferChoice[];
  paymentSchedule: PricingPaymentMilestone[];
  subtotalCents: number;
  gstCents: number;
  totalCents: number;
  depositCents: number;
  balanceCents: number;
  assumptions: string[];
  exclusions: string[];
  reviewRequired: boolean;
  reviewReasons: string[];
  amendmentReason?: string;
};

export type PricingCalculation = Omit<
  PricingQuoteSnapshot,
  'quoteReference' | 'approvedAt' | 'status'
>;

export const defaultPricingOptions: PricingOptions = {
  contentMode: 'refine',
  motionTier: 'standard',
  rush: false,
  applyGst: false,
  adjustmentCents: 0,
  adjustmentReason: '',
  includeManaged: true,
  includeEssentials: true,
};

const automaticOfferCeilingCents = 990_000;
const essentialsSubtotalCents = 590_000;

const capabilityAmounts: Record<string, { amountCents: number; label: string }> = {
  content_collection: { amountCents: 75_000, label: 'Managed content collection' },
  interactive_tool: { amountCents: 120_000, label: 'Interactive tool' },
  booking_workflow: { amountCents: 75_000, label: 'Booking workflow' },
  lead_form: { amountCents: 50_000, label: 'Additional lead workflow' },
  account_area: { amountCents: 450_000, label: 'Authenticated account area' },
  commerce: { amountCents: 350_000, label: 'Commerce foundation' },
  search_and_filter: { amountCents: 100_000, label: 'Search and filtering' },
  third_party_integration: { amountCents: 75_000, label: 'Third-party integration' },
};

function lineItem(
  id: string,
  label: string,
  detail: string,
  quantity: number,
  unitAmountCents: number,
  source: PricingLineItem['source'],
): PricingLineItem {
  return {
    id,
    label,
    detail,
    quantity,
    unitAmountCents,
    amountCents: quantity * unitAmountCents,
    source,
  };
}

function routeClassification(page: BuildManifestPage) {
  if (page.disposition === 'redirect' || page.disposition === 'contextual') return 'redirect';
  if (page.disposition === 'workflow_state') return 'workflow';
  const path = page.publicPath || page.routePath || new URL(page.url).pathname;
  if (/\/(?:post|posts|article|articles|blog)\//i.test(path)) return 'content';
  if (/\/(?:news|resources?)\/(?:categories|tags?)\//i.test(path)) return 'content';
  if (/\/(?:privacy|terms|cookies?|accessibility)\/?$/i.test(path)) return 'support';
  return 'core';
}

function manifestSourceScope(manifest: BuildManifest): PricingSourceScope {
  const pages = manifest.data.selectedPages;
  const classifications = pages.map(routeClassification);
  const uniqueTypes = new Set(
    pages
      .filter((page) => routeClassification(page) !== 'redirect')
      .map((page) => page.pageType?.trim().toLowerCase())
      .filter(Boolean),
  );
  return {
    source: 'manifest',
    revisionLabel: 'Approved Build Manifest',
    totalRoutes: pages.length,
    corePages: classifications.filter((value) => value === 'core').length,
    contentEntries: classifications.filter((value) => value === 'content').length,
    workflowPages: classifications.filter((value) => value === 'workflow').length,
    supportPages: classifications.filter((value) => value === 'support').length,
    redirectRoutes: classifications.filter((value) => value === 'redirect').length,
    uniquePageSystems: Math.max(1, uniqueTypes.size),
  };
}

function paymentSchedule(totalCents: number): PricingPaymentMilestone[] {
  const opening = Math.round((totalCents * 0.4) / 100) * 100;
  const progress = Math.round((totalCents * 0.3) / 100) * 100;
  return [
    {
      sequence: 1,
      kind: 'commencement',
      label: 'Project commencement',
      dueTrigger: 'Due when the proposal is accepted and work is commissioned.',
      amountCents: opening,
    },
    {
      sequence: 2,
      kind: 'progress',
      label: 'Content and design approval',
      dueTrigger: 'Due when the agreed structure, content and visual direction are approved.',
      amountCents: progress,
    },
    {
      sequence: 3,
      kind: 'release',
      label: 'Launch and handover',
      dueTrigger: 'Due after final approval and before launch or source handover.',
      amountCents: totalCents - opening - progress,
    },
  ];
}

function outrightSchedule(totalCents: number): PricingPaymentMilestone[] {
  return [
    {
      sequence: 1,
      kind: 'commencement',
      label: 'Project commissioning',
      dueTrigger: 'Due when the proposal is accepted so delivery can be scheduled.',
      amountCents: totalCents,
    },
  ];
}

function applyTax(amountCents: number, applyGst: boolean) {
  return amountCents + (applyGst ? Math.round(amountCents * 0.1) : 0);
}

function buildOfferChoices(
  subtotalCents: number,
  options: PricingOptions,
  deferredItems: string[],
): PricingOfferChoice[] {
  const totalCents = applyTax(subtotalCents, options.applyGst);
  const offers: PricingOfferChoice[] = [
    {
      id: 'recommended-milestones',
      kind: 'milestones',
      label: 'Build in three milestones',
      summary: 'Commission the complete recommended launch scope across three fixed payments.',
      scopeLabel: 'Recommended launch scope',
      totalCommitmentCents: totalCents,
      setupCents: paymentSchedule(totalCents)[0]?.amountCents ?? totalCents,
      recurringCents: 0,
      recurringMonths: 0,
      paymentSchedule: paymentSchedule(totalCents),
      includedItems: ['All components in the recommended launch scope shown in this proposal.'],
      deferredItems,
      recommended: true,
    },
    {
      id: 'outright',
      kind: 'outright',
      label: 'Pay outright',
      summary: 'One commissioning payment for the same complete scope and ownership outcome.',
      scopeLabel: 'Recommended launch scope',
      totalCommitmentCents: totalCents,
      setupCents: totalCents,
      recurringCents: 0,
      recurringMonths: 0,
      paymentSchedule: outrightSchedule(totalCents),
      includedItems: ['All components in the recommended launch scope shown in this proposal.'],
      deferredItems,
      recommended: false,
    },
  ];

  if (options.includeManaged) {
    const setupBeforeTax = 99_000;
    const managedSubtotal = Math.max(subtotalCents + 75_000, Math.round(subtotalCents * 1.08));
    const monthlyBeforeTax = Math.ceil((managedSubtotal - setupBeforeTax) / 24 / 1_000) * 1_000;
    const setupCents = applyTax(setupBeforeTax, options.applyGst);
    const recurringCents = applyTax(monthlyBeforeTax, options.applyGst);
    const managedTotal = setupCents + recurringCents * 24;
    offers.push({
      id: 'managed-24-month',
      kind: 'managed',
      label: 'Managed website plan',
      summary: 'Lower upfront cost with build, hosting, care and support combined for 24 months.',
      scopeLabel: 'Recommended launch scope with managed care',
      totalCommitmentCents: managedTotal,
      setupCents,
      recurringCents,
      recurringMonths: 24,
      paymentSchedule: [],
      includedItems: [
        'All components in the recommended launch scope shown in this proposal.',
        'Managed hosting, maintenance, security updates and priority support during the 24-month term.',
      ],
      deferredItems,
      recommended: false,
    });
  }

  if (options.includeEssentials && subtotalCents > essentialsSubtotalCents) {
    const essentialsTotal = applyTax(essentialsSubtotalCents, options.applyGst);
    const opening = Math.round(essentialsTotal / 2 / 100) * 100;
    offers.push({
      id: 'essentials-launch',
      kind: 'essentials',
      label: 'Essentials launch',
      summary: 'A focused first release for the strongest services, proof and enquiry journey.',
      scopeLabel: 'Focused essentials scope',
      totalCommitmentCents: essentialsTotal,
      setupCents: opening,
      recurringCents: 0,
      recurringMonths: 0,
      paymentSchedule: [
        {
          sequence: 1,
          kind: 'commencement',
          label: 'Project commencement',
          dueTrigger: 'Due when the focused launch is commissioned.',
          amountCents: opening,
        },
        {
          sequence: 2,
          kind: 'release',
          label: 'Launch and handover',
          dueTrigger: 'Due after final approval and before launch.',
          amountCents: essentialsTotal - opening,
        },
      ],
      includedItems: [
        'Core launch strategy, approved brand direction and responsive design system.',
        'The priority service, proof and enquiry pages needed for a credible first release.',
        'Contact workflow, responsive quality assurance and launch preparation.',
      ],
      deferredItems: [
        'Secondary service and resource routes move to a separately approved second release.',
        'Advanced integrations, account features and net-new long-form copy remain outside this option.',
      ],
      recommended: false,
    });
  }
  return offers;
}

function isoDaysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1_000).toISOString();
}

export function calculateBuildPricing(
  manifest: BuildManifest,
  options: PricingOptions = defaultPricingOptions,
  suppliedSourceScope?: PricingSourceScope,
): PricingCalculation {
  const scope = suppliedSourceScope ?? manifestSourceScope(manifest);
  const corePages = Math.max(1, scope.corePages);
  const contentEntries = Math.max(0, scope.contentEntries);
  const outputPages = corePages + contentEntries + scope.workflowPages + scope.supportPages;
  const capabilities = manifest.data.approvedCapabilities ?? [];
  const openScopeItems =
    (manifest.data.openQuestions?.length ?? 0) + (manifest.data.uncertainties?.length ?? 0);
  const sourceKind = scope.source === 'manifest' ? 'manifest' : 'source_revision';
  const items: PricingLineItem[] = [
    lineItem(
      'preview-first-foundation',
      'Preview-first website delivery',
      'Tailored private preview, strategy handoff, design system, ten core pages, fifteen reusable content entries, responsive implementation, quality assurance and launch preparation.',
      1,
      690_000,
      sourceKind,
    ),
  ];

  const additionalCorePages = Math.min(12, Math.max(0, corePages - 10));
  if (additionalCorePages) {
    items.push(
      lineItem(
        'additional-core-pages',
        'Additional core website pages',
        `${corePages} client-facing core pages are present. Ten are included and repeated page production is volume-capped at twelve additional pages.`,
        additionalCorePages,
        12_500,
        sourceKind,
      ),
    );
  }

  const additionalContentEntries = Math.min(15, Math.max(0, contentEntries - 15));
  if (additionalContentEntries) {
    items.push(
      lineItem(
        'content-library',
        'Resource and article migration',
        `${contentEntries} reusable article, news or resource entries are present; fifteen are included and migration pricing is volume-capped.`,
        additionalContentEntries,
        5_000,
        sourceKind,
      ),
    );
  }

  const additionalPageSystems = Math.max(0, scope.uniquePageSystems - 4);
  if (additionalPageSystems) {
    items.push(
      lineItem(
        'unique-layouts',
        'Additional page systems',
        'Distinct responsive page families beyond the four included systems require their own layout and quality contract.',
        additionalPageSystems,
        65_000,
        sourceKind,
      ),
    );
  }

  let includedLeadFormUsed = false;
  const groupedCapabilities = new Map<string, number>();
  capabilities.forEach((capability) => {
    if (capability.kind === 'lead_form' && !includedLeadFormUsed) {
      includedLeadFormUsed = true;
      return;
    }
    groupedCapabilities.set(capability.kind, (groupedCapabilities.get(capability.kind) ?? 0) + 1);
  });
  groupedCapabilities.forEach((quantity, kind) => {
    const price = capabilityAmounts[kind];
    if (!price) return;
    items.push(
      lineItem(
        `capability-${kind}`,
        price.label,
        `${quantity} approved ${kind.replaceAll('_', ' ')} ${quantity === 1 ? 'capability' : 'capabilities'} recorded in the build scope.`,
        quantity,
        price.amountCents,
        sourceKind,
      ),
    );
  });

  if (manifest.data.architecture.productionRuntime === 'managed-next-runtime') {
    items.push(
      lineItem(
        'managed-runtime',
        'Managed application runtime',
        'Server-side production runtime, deployment configuration and operational handoff.',
        1,
        60_000,
        sourceKind,
      ),
    );
  }

  if (contentEntries > 12) {
    items.push(
      lineItem(
        'large-migration',
        'Large content and redirect migration',
        'Structured migration and continuity review for a substantial content library and its canonical routes.',
        1,
        120_000,
        sourceKind,
      ),
    );
  } else if (contentEntries > 0 || scope.redirectRoutes > 0) {
    items.push(
      lineItem(
        'standard-migration',
        'Content and redirect migration',
        'Content transfer, canonical redirects and launch continuity for the latest source routes.',
        1,
        40_000,
        sourceKind,
      ),
    );
  }

  if (options.contentMode === 'client_ready') {
    items.push(
      lineItem(
        'client-ready-content-credit',
        'Launch-ready content credit',
        'The client supplies complete, approved and correctly structured launch copy.',
        1,
        -50_000,
        'review',
      ),
    );
  } else if (options.contentMode === 'write') {
    items.push(
      lineItem(
        'copywriting-core',
        'Net-new core-page copywriting',
        'Research-informed copywriting for every client-facing core page.',
        corePages,
        35_000,
        'review',
      ),
    );
    if (contentEntries) {
      items.push(
        lineItem(
          'copywriting-library',
          'Net-new resource copywriting',
          'Original long-form copywriting for resource and article entries.',
          contentEntries,
          15_000,
          'review',
        ),
      );
    }
  }

  const motionAmount =
    options.motionTier === 'advanced' ? 75_000 : options.motionTier === 'signature' ? 150_000 : 0;
  if (motionAmount) {
    items.push(
      lineItem(
        'motion',
        options.motionTier === 'signature' ? 'Signature motion system' : 'Advanced motion system',
        'Reviewed interaction and motion treatment across responsive layouts.',
        1,
        motionAmount,
        'review',
      ),
    );
  }

  if (options.adjustmentCents) {
    items.push(
      lineItem(
        'review-adjustment',
        'Reviewed commercial adjustment',
        options.adjustmentReason.trim() || 'A recorded commercial reason is required.',
        1,
        options.adjustmentCents,
        'review',
      ),
    );
  }

  const beforeRush = items.reduce((total, item) => total + item.amountCents, 0);
  if (options.rush) {
    items.push(
      lineItem(
        'rush',
        'Priority delivery window',
        'Reserved capacity for an approved accelerated delivery schedule.',
        1,
        Math.round(beforeRush * 0.2),
        'review',
      ),
    );
  }

  const rawSubtotal = items.reduce((total, item) => total + item.amountCents, 0);
  const fullScopeValueCents = Math.max(0, Math.round(rawSubtotal / 10_000) * 10_000);
  const cappedSubtotal = Math.min(fullScopeValueCents, automaticOfferCeilingCents);
  if (fullScopeValueCents > cappedSubtotal) {
    items.push(
      lineItem(
        'cold-prospect-launch-credit',
        'Preview-first launch credit',
        'Automatic first-engagement pricing keeps the recommended cold-prospect offer within the reviewed launch ceiling.',
        1,
        cappedSubtotal - fullScopeValueCents,
        'review',
      ),
    );
  }
  const subtotalCents = cappedSubtotal;
  const gstCents = options.applyGst ? Math.round(subtotalCents * 0.1) : 0;
  const totalCents = subtotalCents + gstCents;
  const deferredItems =
    fullScopeValueCents > cappedSubtotal
      ? [
          'Scope beyond the automatic launch ceiling must be confirmed during onboarding before it is treated as included.',
        ]
      : [];
  const offerChoices = buildOfferChoices(subtotalCents, options, deferredItems);
  const schedule = offerChoices[0]?.paymentSchedule ?? paymentSchedule(totalCents);
  const reviewReasons = [
    ...(corePages > 35 ? ['More than 35 core website pages'] : []),
    ...(capabilities.some((capability) => ['commerce', 'account_area'].includes(capability.kind))
      ? ['Complex application capability']
      : []),
    ...(fullScopeValueCents > 1_500_000
      ? ['Full scope value exceeds the automatic cold-prospect review threshold']
      : []),
    ...(options.adjustmentCents && !options.adjustmentReason.trim()
      ? ['Commercial adjustment has no reason']
      : []),
  ];

  return {
    schemaVersion: 3,
    pricingVersion: pricingScheduleVersion,
    source: 'automatic_build',
    sourceManifestId: manifest.id,
    sourceScope: scope,
    generatedAt: new Date().toISOString(),
    validUntil: isoDaysFromNow(quoteValidityDays),
    serviceTermsVersion,
    privacyNoticeVersion,
    currency: 'AUD',
    metrics: {
      outputPages,
      corePages,
      contentEntries,
      workflowPages: scope.workflowPages,
      supportPages: scope.supportPages,
      redirectRoutes: scope.redirectRoutes,
      uniquePageTypes: scope.uniquePageSystems,
      approvedAssets: manifest.data.approvedAssetGuidance?.length ?? 0,
      capabilityCount: capabilities.length,
      productionRuntime: manifest.data.architecture.productionRuntime,
      openScopeItems,
    },
    options,
    lineItems: items,
    fullScopeValueCents,
    automaticOfferCeilingCents,
    offerChoices,
    paymentSchedule: schedule,
    subtotalCents,
    gstCents,
    totalCents,
    depositCents: schedule[0]?.amountCents ?? totalCents,
    balanceCents: totalCents - (schedule[0]?.amountCents ?? totalCents),
    assumptions: [
      'The newest identified Studio source revision remains the source of truth for the quoted scope.',
      'Two structured feedback rounds are included unless the accepted scope states otherwise.',
      ...(openScopeItems
        ? [
            `${openScopeItems} recorded scope item${openScopeItems === 1 ? '' : 's'} will be resolved without adding unapproved capabilities.`,
          ]
        : []),
      'The initial payment commissions the project and is credited to the total project investment.',
      'Third-party subscriptions, advertising spend and professional photography are separate.',
    ],
    exclusions: [
      'New capabilities or pages requested after quote acceptance require a clearly presented amendment.',
      options.includeManaged
        ? 'Ongoing hosting and care are separate unless the client accepts the managed website option shown in this proposal.'
        : 'Ongoing hosting and care are selected and billed separately before launch.',
      'Card details are handled by the payment provider and are not stored by Made Solid.',
    ],
    reviewRequired: reviewReasons.length > 0,
    reviewReasons,
  };
}

export function approvePricingCalculation(
  calculation: PricingCalculation,
  quoteReference: string,
  amendmentReason?: string,
): PricingQuoteSnapshot {
  return {
    ...calculation,
    quoteReference,
    approvedAt: new Date().toISOString(),
    status: 'approved',
    amendmentReason: amendmentReason?.trim() || undefined,
  };
}

export function formatAud(cents: number) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: cents % 100 ? 2 : 0,
  }).format(cents / 100);
}
