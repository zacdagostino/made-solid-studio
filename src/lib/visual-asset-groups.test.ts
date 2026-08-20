import { describe, expect, it } from 'vitest';

import type { ResearchArtifact } from './domain';
import { groupVisualAssets } from './visual-asset-groups';

function asset(
  id: string,
  sha256: string | undefined,
  pageUrl: string,
  sourceUrl: string,
): ResearchArtifact {
  return {
    id,
    businessId: 'business-1',
    crawlRunId: 'capture-1',
    kind: 'asset',
    storageBucket: 'artifacts',
    storagePath: `${id}.jpg`,
    contentType: 'image/jpeg',
    sha256,
    metadata: { pageUrl, pageUrls: [pageUrl], sourceUrl },
    createdAt: '2026-08-11T00:00:00.000Z',
  };
}

describe('groupVisualAssets', () => {
  it('shows byte-identical images once and retains every discovery location', () => {
    const groups = groupVisualAssets([
      asset('first', 'same-bytes', 'https://example.com/', 'https://cdn.example.com/hero.jpg'),
      asset(
        'duplicate',
        'same-bytes',
        'https://example.com/services',
        'https://img.example.com/hero-copy.jpg',
      ),
      asset(
        'different',
        'other-bytes',
        'https://example.com/about',
        'https://example.com/team.jpg',
      ),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].asset.id).toBe('first');
    expect(groups[0].assets.map((item) => item.id)).toEqual(['first', 'duplicate']);
    expect(groups[0].pageUrls).toEqual(['https://example.com/', 'https://example.com/services']);
    expect(groups[0].sourceUrls).toEqual([
      'https://cdn.example.com/hero.jpg',
      'https://img.example.com/hero-copy.jpg',
    ]);
  });

  it('falls back to the captured source URL for legacy artifacts without a hash', () => {
    const groups = groupVisualAssets([
      asset('first', undefined, 'https://example.com/', 'https://example.com/shared.svg'),
      asset(
        'duplicate',
        undefined,
        'https://example.com/contact',
        'https://example.com/shared.svg',
      ),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].pageUrls).toHaveLength(2);
  });
});
