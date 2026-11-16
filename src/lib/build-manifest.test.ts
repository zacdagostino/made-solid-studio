import { describe, expect, it } from 'vitest';
import type { ProspectWorkspace, RedesignBrief } from './domain';
import { createBuildManifestData } from './build-manifest';

describe('createBuildManifestData', () => {
  it('matches normalised public pages and omits authentication redirects from legacy briefs', () => {
    const publicUrl = 'https://example.com/about/?campaign=spring';
    const authenticationUrl = 'https://accounts.example.com/auth/v2?s=temporary-session';
    const workspace = {
      business: { id: 'business', name: 'Example' },
      website: { url: 'https://example.com/' },
      facts: [],
      artifacts: [],
      capturedPages: [
        { url: publicUrl, title: 'About', pageType: 'about' },
        { url: authenticationUrl, title: 'Sign in', pageType: 'other' },
      ],
    } as unknown as ProspectWorkspace;
    const brief = {
      id: 'brief',
      researchPacketId: 'packet',
      crawlRunId: 'capture',
      sourceSelections: {
        pageUrls: [publicUrl, authenticationUrl],
        assetIds: [],
        autoSelectedAssetIds: [],
        uncertainties: [],
      },
      draft: {
        strategy: 'Use public evidence.',
        proposedSitemap: [],
        pagePlans: [
          {
            sourceUrl: 'https://example.com/about',
            disposition: 'build',
            dispositionReason: 'Public page.',
          },
          {
            sourceUrl: 'https://accounts.example.com/auth/v2',
            disposition: 'build',
            dispositionReason: 'Legacy capture error.',
          },
        ],
        assetGuidance: [],
        assumptions: [],
        openQuestions: [],
        capabilityInventory: [],
      },
    } as unknown as RedesignBrief;

    const manifest = createBuildManifestData(workspace, brief);

    expect(manifest.pageCoverage).toHaveLength(1);
    expect(manifest.pageCoverage[0]?.url).toBe('https://example.com/about');
    expect(manifest.selectedPages.map((page) => page.url)).toEqual(['https://example.com/about']);
  });
});
