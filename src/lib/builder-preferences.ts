import type {
  BuilderExecutionPreference,
  BuilderPreferences,
  BuilderProfileId,
  BuilderRunMode,
} from './domain';

export const builderPreferencesChangedEvent = 'made-solid:builder-preferences-changed';

export const recommendedBuilderProfiles: Record<
  BuilderProfileId,
  Required<BuilderExecutionPreference>
> = {
  page_test: { model: 'gpt-5.6-terra', reasoningEffort: 'medium' },
  site_test: { model: 'gpt-5.6-sol', reasoningEffort: 'high' },
  full_site: { model: 'gpt-5.6-sol', reasoningEffort: 'high' },
};

export function defaultBuilderPreferences(): BuilderPreferences {
  return { pageTest: {}, siteTest: {}, fullSite: {} };
}

function boundedProfile(value: unknown): BuilderExecutionPreference {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const profile = value as Partial<BuilderExecutionPreference>;
  const model = typeof profile.model === 'string' ? profile.model.trim() : '';
  const reasoningEffort =
    typeof profile.reasoningEffort === 'string' ? profile.reasoningEffort.trim() : '';
  if (!model || model.length > 100 || !reasoningEffort || reasoningEffort.length > 40) return {};
  return { model, reasoningEffort };
}

export function normalizeBuilderPreferences(value: unknown): BuilderPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return defaultBuilderPreferences();
  }
  const input = value as Partial<BuilderPreferences>;
  return {
    pageTest: boundedProfile(input.pageTest),
    siteTest: boundedProfile(input.siteTest),
    fullSite: boundedProfile(input.fullSite),
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : undefined,
  };
}

export function builderProfileId(mode: BuilderRunMode): BuilderProfileId {
  if (mode === 'homepage_test' || mode === 'page_test') return 'page_test';
  return mode;
}

export function effectiveBuilderProfile(
  preferences: BuilderPreferences,
  profileId: BuilderProfileId,
) {
  const selected =
    profileId === 'page_test'
      ? preferences.pageTest
      : profileId === 'site_test'
        ? preferences.siteTest
        : preferences.fullSite;
  return selected.model && selected.reasoningEffort
    ? {
        model: selected.model,
        reasoningEffort: selected.reasoningEffort,
        source: 'custom' as const,
      }
    : { ...recommendedBuilderProfiles[profileId], source: 'recommended' as const };
}
