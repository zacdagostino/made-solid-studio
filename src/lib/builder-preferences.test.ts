import { describe, expect, it } from 'vitest';
import { effectiveBuilderProfile, normalizeBuilderPreferences } from './builder-preferences';

describe('website builder preferences', () => {
  it('keeps the economical and quality-first recommended profiles separate', () => {
    const preferences = normalizeBuilderPreferences({});
    expect(effectiveBuilderProfile(preferences, 'page_test')).toEqual({
      model: 'gpt-5.6-terra',
      reasoningEffort: 'medium',
      source: 'recommended',
    });
    expect(effectiveBuilderProfile(preferences, 'site_test')).toEqual({
      model: 'gpt-5.6-sol',
      reasoningEffort: 'high',
      source: 'recommended',
    });
    expect(effectiveBuilderProfile(preferences, 'full_site')).toEqual({
      model: 'gpt-5.6-sol',
      reasoningEffort: 'high',
      source: 'recommended',
    });
  });

  it('uses only complete bounded custom profiles', () => {
    const preferences = normalizeBuilderPreferences({
      pageTest: { model: 'gpt-6-astra', reasoningEffort: 'xhigh' },
      siteTest: { model: 'gpt-6-astra' },
    });
    expect(effectiveBuilderProfile(preferences, 'page_test')).toEqual({
      model: 'gpt-6-astra',
      reasoningEffort: 'xhigh',
      source: 'custom',
    });
    expect(preferences.siteTest).toEqual({});
  });
});
