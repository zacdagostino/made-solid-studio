import { CheckCircle2, LoaderCircle, RotateCcw, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { CodexRuntimeModel } from '../lib/codex-runtime-updates';
import {
  builderPreferencesChangedEvent,
  defaultBuilderPreferences,
  effectiveBuilderProfile,
  normalizeBuilderPreferences,
  recommendedBuilderProfiles,
} from '../lib/builder-preferences';
import type {
  BuilderExecutionPreference,
  BuilderPreferences,
  BuilderProfileId,
} from '../lib/domain';
import type { WorkspaceRepository } from '../lib/repository';
import { Button, ButtonGroup, StatusBadge } from './ui';

const profileDefinitions: Array<{
  description: string;
  id: BuilderProfileId;
  key: 'pageTest' | 'siteTest' | 'fullSite';
  title: string;
}> = [
  {
    id: 'page_test',
    key: 'pageTest',
    title: 'Page tests',
    description: 'Homepage and selected-page tests from the clean builder foundation.',
  },
  {
    id: 'site_test',
    key: 'siteTest',
    title: 'Whole-site tests',
    description: 'Feature revisions that preserve and retest an existing multi-page source.',
  },
  {
    id: 'full_site',
    key: 'fullSite',
    title: 'Full website builds',
    description: 'Complete prospect websites created from the approved Build Manifest.',
  },
];

function modelFor(models: CodexRuntimeModel[], id?: string) {
  return models.find((model) => model.id === id);
}

function firstCustomProfile(models: CodexRuntimeModel[], profileId: BuilderProfileId) {
  const recommended = recommendedBuilderProfiles[profileId];
  const model =
    modelFor(models, recommended.model) ?? models.find((item) => item.isDefault) ?? models[0];
  if (!model) return recommended;
  return {
    model: model.id,
    reasoningEffort:
      model.efforts.find((effort) => effort.id === recommended.reasoningEffort)?.id ||
      model.defaultEffort ||
      model.efforts[0]?.id ||
      recommended.reasoningEffort,
  };
}

function samePreferences(left: BuilderPreferences, right: BuilderPreferences) {
  return (
    JSON.stringify(normalizeBuilderPreferences(left)) ===
    JSON.stringify(normalizeBuilderPreferences(right))
  );
}

export function WebsiteBuilderSettings({ repository }: { repository: WorkspaceRepository }) {
  const [saved, setSaved] = useState<BuilderPreferences>(defaultBuilderPreferences);
  const [draft, setDraft] = useState<BuilderPreferences>(defaultBuilderPreferences);
  const [models, setModels] = useState<CodexRuntimeModel[]>([]);
  const [runtimeVersion, setRuntimeVersion] = useState('');
  const [catalogReady, setCatalogReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    let active = true;
    const runtimeStatus = import('../lib/codex-runtime-updates').then(({ readCodexUpdateStatus }) =>
      readCodexUpdateStatus(),
    );
    Promise.allSettled([repository.getBuilderPreferences(), runtimeStatus]).then(
      ([preferencesResult, runtimeResult]) => {
        if (!active) return;
        if (preferencesResult.status === 'fulfilled') {
          const preferences = normalizeBuilderPreferences(preferencesResult.value);
          setSaved(preferences);
          setDraft(preferences);
        } else {
          setMessage('Builder preferences could not be loaded. Refresh and try again.');
        }
        if (runtimeResult.status === 'fulfilled') {
          setModels(runtimeResult.value.availableModels ?? []);
          setRuntimeVersion(runtimeResult.value.currentVersion);
          setCatalogReady(runtimeResult.value.modelCatalogStatus === 'ready');
        }
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [repository]);

  const dirty = useMemo(() => !samePreferences(saved, draft), [draft, saved]);

  function updateProfile(
    key: 'pageTest' | 'siteTest' | 'fullSite',
    profile: BuilderExecutionPreference,
  ) {
    setDraft((current) => ({ ...current, [key]: profile, updatedAt: undefined }));
    setSavedMessage('');
    setMessage('');
  }

  async function save() {
    setSaving(true);
    setMessage('');
    setSavedMessage('');
    try {
      for (const definition of profileDefinitions) {
        const profile = draft[definition.key];
        if (!profile.model) continue;
        const model = modelFor(models, profile.model);
        if (!model || !model.efforts.some((effort) => effort.id === profile.reasoningEffort)) {
          throw new Error(
            `${definition.title} must use a model and reasoning level from the live Codex catalogue.`,
          );
        }
      }
      const next = await repository.saveBuilderPreferences(draft);
      setSaved(next);
      setDraft(next);
      window.dispatchEvent(new Event(builderPreferencesChangedEvent));
      setSavedMessage('Builder settings saved. New runs will snapshot these profiles.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Builder settings could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      aria-busy={loading || saving}
      aria-labelledby="website-builder-settings-title"
      className="website-builder-settings"
      id="website-builder-settings"
    >
      <div className="website-builder-settings__header">
        <div>
          <h2 id="website-builder-settings-title">Website builder</h2>
          <p className="muted-copy">
            These organization-wide defaults apply wherever you start a website build or Agent
            Studio test. Changing them never alters an existing run.
          </p>
        </div>
        <StatusBadge tone={catalogReady ? 'success' : 'warning'}>
          {catalogReady ? `${models.length} live models` : 'Catalogue unavailable'}
        </StatusBadge>
      </div>

      {loading ? (
        <div className="website-builder-settings__loading" role="status">
          <LoaderCircle aria-hidden="true" className="spin" size={18} /> Loading builder settings…
        </div>
      ) : (
        <div className="website-builder-settings__profiles">
          {profileDefinitions.map((definition) => {
            const profile = draft[definition.key];
            const isCustom = Boolean(profile.model && profile.reasoningEffort);
            const selectedModel = modelFor(models, profile.model);
            const effective = effectiveBuilderProfile(draft, definition.id);
            return (
              <fieldset className="website-builder-profile" key={definition.id}>
                <legend>{definition.title}</legend>
                <p>{definition.description}</p>
                <label>
                  <span>Profile</span>
                  <select
                    onChange={(event) =>
                      updateProfile(
                        definition.key,
                        event.target.value === 'custom'
                          ? firstCustomProfile(models, definition.id)
                          : {},
                      )
                    }
                    value={isCustom ? 'custom' : 'recommended'}
                  >
                    <option value="recommended">Made Solid recommended</option>
                    <option disabled={!catalogReady || !models.length} value="custom">
                      Advanced custom
                    </option>
                  </select>
                </label>
                {isCustom ? (
                  <div className="website-builder-profile__custom">
                    <label>
                      <span>Model</span>
                      <select
                        onChange={(event) => {
                          const model = modelFor(models, event.target.value);
                          updateProfile(definition.key, {
                            model: event.target.value,
                            reasoningEffort:
                              model?.defaultEffort || model?.efforts[0]?.id || 'medium',
                          });
                        }}
                        value={profile.model}
                      >
                        {!selectedModel && profile.model ? (
                          <option value={profile.model}>{profile.model} · unavailable</option>
                        ) : null}
                        {models.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.label}
                            {model.supportsImages ? '' : ' · text only'}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Reasoning</span>
                      <select
                        disabled={!selectedModel}
                        onChange={(event) =>
                          updateProfile(definition.key, {
                            model: profile.model,
                            reasoningEffort: event.target.value,
                          })
                        }
                        value={profile.reasoningEffort}
                      >
                        {selectedModel?.efforts.map((effort) => (
                          <option key={effort.id} value={effort.id}>
                            {effort.id.charAt(0).toUpperCase() + effort.id.slice(1)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : null}
                <small>
                  Effective profile: <strong>{effective.model}</strong> ·{' '}
                  {effective.reasoningEffort} reasoning
                </small>
              </fieldset>
            );
          })}
        </div>
      )}

      <div className="website-builder-settings__runtime">
        <span>Codex runtime</span>
        <strong>{runtimeVersion ? `v${runtimeVersion}` : 'Unavailable'}</strong>
        <small>
          The exact runtime version is also copied onto each run when its worker starts.
        </small>
      </div>

      {message ? (
        <p className="form-message form-message--error" role="alert">
          {message}
        </p>
      ) : null}
      {savedMessage ? (
        <p className="form-message form-message--success" role="status">
          <CheckCircle2 aria-hidden="true" size={16} /> {savedMessage}
        </p>
      ) : null}
      <ButtonGroup>
        <Button disabled={!dirty || saving || loading} onClick={() => void save()}>
          {saving ? (
            <LoaderCircle aria-hidden="true" className="spin" size={16} />
          ) : (
            <Save aria-hidden="true" size={16} />
          )}
          {saving ? 'Saving settings…' : 'Save builder settings'}
        </Button>
        <Button
          disabled={!dirty || saving}
          onClick={() => {
            setDraft(saved);
            setMessage('');
            setSavedMessage('');
          }}
          variant="quiet"
        >
          <RotateCcw aria-hidden="true" size={16} /> Discard changes
        </Button>
      </ButtonGroup>
    </section>
  );
}
