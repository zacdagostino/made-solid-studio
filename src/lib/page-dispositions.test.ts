import { describe, expect, it } from 'vitest';
import { pageDisposition } from './redesign-brief';

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
