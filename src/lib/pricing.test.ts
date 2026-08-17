import { describe, expect, it } from 'vitest';
import type { BuildManifest } from './domain';
import { approvePricingCalculation, calculateBuildPricing, defaultPricingOptions } from './pricing';

function manifest(
  overrides: {
    pages?: number;
    capabilities?: BuildManifest['data']['approvedCapabilities'];
    openQuestions?: string[];
    runtime?: BuildManifest['data']['architecture']['productionRuntime'];
    uniquePageTypes?: boolean;
  } = {},
): BuildManifest {
  const pageCount = overrides.pages ?? 5;
  return {
    id: 'manifest-pricing-test',
    businessId: 'business-pricing-test',
    redesignBriefId: 'brief-pricing-test',
    researchPacketId: 'packet-pricing-test',
    crawlRunId: 'crawl-pricing-test',
    schemaVersion: 1,
    builderContractVersion: 'test',
    status: 'ready',
    generatedAt: '2026-08-17T00:00:00.000Z',
    createdAt: '2026-08-17T00:00:00.000Z',
    updatedAt: '2026-08-17T00:00:00.000Z',
    data: {
      source: {
        businessName: 'Pricing Test',
        researchPacketId: 'packet-pricing-test',
        crawlRunId: 'crawl-pricing-test',
        redesignBriefId: 'brief-pricing-test',
      },
      permittedFacts: [],
      selectedPages: Array.from({ length: pageCount }, (_, index) => ({
        url: `https://example.com/page-${index + 1}`,
        routePath: index ? `/page-${index + 1}` : '/',
        publicPath: index ? `/page-${index + 1}` : '/',
        outputPath: index ? `page-${index + 1}/index.html` : 'index.html',
        sourcePath: `page-${index + 1}`,
        sourceSelected: true,
        disposition: 'build' as const,
        pageType: overrides.uniquePageTypes
          ? `page-type-${index}`
          : index === 0
            ? 'home'
            : index === pageCount - 1
              ? 'contact'
              : 'standard',
      })),
      pageCoverage: [],
      selectedAssets: [],
      approvedAssetGuidance: [],
      approvedCapabilities: overrides.capabilities ?? [],
      approvedVisualContent: [],
      approvedVisualContentGroups: [],
      architecture: {
        productionRuntime: overrides.runtime ?? 'static-marketing',
      } as BuildManifest['data']['architecture'],
      strategy: '',
      proposedSitemap: [],
      pagePlans: [],
      assumptions: [],
      openQuestions: overrides.openQuestions ?? [],
      uncertainties: [],
      builderRules: [],
    },
  };
}

describe('build pricing', () => {
  it('starts a preview-first build at $6,900 with a 50% opening payment', () => {
    const result = calculateBuildPricing(manifest(), defaultPricingOptions);
    expect(result.subtotalCents).toBe(690_000);
    expect(result.totalCents).toBe(690_000);
    expect(result.depositCents).toBe(345_000);
    expect(result.balanceCents).toBe(345_000);
    expect(result.reviewRequired).toBe(false);
  });

  it('derives pages, unique systems, capabilities, runtime and GST from reviewed scope', () => {
    const result = calculateBuildPricing(
      manifest({
        pages: 8,
        uniquePageTypes: true,
        runtime: 'managed-next-runtime',
        capabilities: [
          {
            id: 'commerce',
            kind: 'commerce',
            title: 'Online shop',
            description: '',
            delivery: 'application',
            confidence: 'high',
            evidence: [],
            decision: 'include',
            decisionQuestion: '',
          },
        ],
      }),
      { ...defaultPricingOptions, contentMode: 'write', applyGst: true },
    );
    expect(result.metrics.outputPages).toBe(8);
    expect(result.lineItems.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        'unique-layouts',
        'capability-commerce',
        'managed-runtime',
        'copywriting-core',
      ]),
    );
    expect(result.gstCents).toBe(Math.round(result.subtotalCents * 0.1));
    expect(result.reviewReasons).toContain('Complex application capability');
  });

  it('records unresolved scope while reviewing only unexplained commercial changes', () => {
    const calculation = calculateBuildPricing(
      manifest({ openQuestions: ['Who supplies product data?'] }),
      {
        ...defaultPricingOptions,
        adjustmentCents: 20_000,
      },
    );
    expect(calculation.reviewRequired).toBe(true);
    expect(calculation.metrics.openScopeItems).toBe(1);
    expect(calculation.assumptions.join(' ')).toContain('1 recorded scope item');
    expect(calculation.reviewReasons).toContain('Commercial adjustment has no reason');
  });

  it('locks an approved snapshot to the exact manifest and quote reference', () => {
    const calculation = calculateBuildPricing(manifest());
    const approved = approvePricingCalculation(calculation, 'quote-reference-test');
    expect(approved.status).toBe('approved');
    expect(approved.sourceManifestId).toBe('manifest-pricing-test');
    expect(approved.quoteReference).toBe('quote-reference-test');
  });
});
