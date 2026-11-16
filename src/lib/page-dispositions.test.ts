import { describe, expect, it } from 'vitest';
import { createBriefDraft, pageDisposition } from './redesign-brief';
import type { CapturedPage, ResearchPacket } from './domain';

const home = {
  url: 'https://example.com/',
  pageType: 'homepage',
  title: 'Example',
  primaryHeading: 'Example',
  description: '',
  canonicalUrl: '',
};

function page(path: string, title: string, canonicalUrl = '') {
  return {
    url: `https://example.com${path}`,
    pageType: '',
    title,
    primaryHeading: title,
    description: '',
    canonicalUrl,
  };
}

describe('pageDisposition', () => {
  it('holds suspicious CMS slugs for human review', () => {
    expect(pageDisposition(page('/home-1', 'Alternate home'), [home]).disposition).toBe(
      'needs_review',
    );
  });

  it('keeps confirmations and profiles out of global navigation', () => {
    expect(pageDisposition(page('/thank-you', 'Thank you'), [home]).disposition).toBe(
      'workflow_state',
    );
    expect(
      pageDisposition(page('/profile/editor/profile', 'Editor profile'), [home]).disposition,
    ).toBe('contextual');
  });

  it('uses a selected canonical page as a redirect target', () => {
    const alias = page('/old-home', 'Old home', home.url);
    expect(pageDisposition(alias, [home, alias])).toMatchObject({
      disposition: 'redirect',
      targetSourceUrl: home.url,
    });
  });
});

describe('public redesign sources', () => {
  it('excludes authentication redirects and normalises selected public URLs', () => {
    const publicPage = {
      id: 'page-public',
      businessId: 'business',
      crawlRunId: 'capture',
      url: 'https://example.com/about/?campaign=spring',
      pageType: 'about',
      title: 'About',
      canonicalUrl: 'https://example.com/about/',
      createdAt: '2026-10-01T00:00:00.000Z',
    } as unknown as CapturedPage;
    const authenticationRedirect = {
      ...publicPage,
      id: 'page-auth',
      url: 'https://accounts.example.com/auth/v2?s=temporary-session',
      title: 'Sign in',
    };
    const packet = {
      data: {
        pages: [
          { url: publicPage.url, pageType: 'about', title: 'About' },
          { url: authenticationRedirect.url, pageType: 'other', title: 'Sign in' },
        ],
      },
    } as unknown as ResearchPacket;

    const generated = createBriefDraft('Example', packet, [], [], undefined, [
      publicPage,
      authenticationRedirect,
    ]);

    expect(generated.sourceSelections.pageUrls).toEqual(['https://example.com/about']);
    expect(generated.draft.pagePlans.map((plan) => plan.sourceUrl)).toEqual([
      'https://example.com/about',
    ]);
  });
});
