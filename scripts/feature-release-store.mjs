import { execFile as execFileCallback } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { basename, isAbsolute, relative, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const featureIdPattern = /^feature-[0-9a-f-]{36}$/i;
const threadIdPattern = /^[A-Za-z0-9-]{1,100}$/;
const environments = ['development', 'production'];
const metadataVersion = 8;
const maximumProcessedTurns = 2_000;

function cleanText(value, maximumLength) {
  return String(value || '')
    .replace(/\n\nCaptured from:[\s\S]*$/i, '')
    .replace(/\n\nDuring longer work,[\s\S]*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maximumLength);
}

function plainText(value, maximumLength = 600) {
  return cleanText(value, maximumLength)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*_#>]/g, '')
    .replace(/\s+-\s+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();
}

const titleLowercaseWords = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'by',
  'for',
  'from',
  'in',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
]);
const titleAcronyms = new Map([
  ['ai', 'AI'],
  ['api', 'API'],
  ['chatgpt', 'ChatGPT'],
  ['clientspace', 'Clientspace'],
  ['dev', 'Dev'],
  ['lece', 'LECE'],
  ['stripe', 'Stripe'],
  ['studio', 'Studio'],
  ['ui', 'UI'],
  ['url', 'URL'],
  ['ux', 'UX'],
]);

function featureTitleCase(value) {
  const words = plainText(value, 96).split(/\s+/).filter(Boolean);
  return words
    .map((word, index) => {
      const punctuation = word.match(/^([^A-Za-z0-9]*)(.*?)([^A-Za-z0-9]*)$/);
      const prefix = punctuation?.[1] || '';
      const core = punctuation?.[2] || word;
      const suffix = punctuation?.[3] || '';
      const lower = core.toLowerCase();
      const formatted =
        titleAcronyms.get(lower) ||
        (index > 0 && index < words.length - 1 && titleLowercaseWords.has(lower)
          ? lower
          : `${core.charAt(0).toUpperCase()}${core.slice(1).toLowerCase()}`);
      return `${prefix}${formatted}${suffix}`;
    })
    .join(' ');
}

function promptTitle(prompt) {
  const cleaned = plainText(prompt, 240)
    .replace(/^(?:(?:ok(?:ay)?|so|then)[, ]+)*(?:please\s+)?(?:can you\s+)?/i, '')
    .replace(/^(?:implement|build|create|add|fix|update|make)\s+(?:this|that|it)\s*/i, '')
    .replace(/^(?:implement|build|create|add|fix|update|make)\s+/i, '')
    .trim();
  if (!cleaned || /^(?:then|it|this|that|in both places|the same)$/i.test(cleaned)) return '';
  const sentence = cleaned.split(/(?<=[.!?])\s+/)[0].replace(/[.!?]+$/, '');
  return featureTitleCase(sentence).slice(0, 96);
}

function validSuggestedTitle(value) {
  const title = plainText(value, 96)
    .replace(/[.!?]+$/, '')
    .replace(
      /^(?:(?:add|build|create|display|fix|improve|reorder|repair|restore|update|verify)\s+)+/i,
      '',
    )
    .replace(/\bLeceggroup\b/gi, 'LECE Group');
  if (!title || title.split(/\s+/).length > 10) return '';
  if (/\b(?:implement|implemented|do it|this|that|then|in both places)\b/i.test(title)) return '';
  return featureTitleCase(title);
}

function summaryTitle(summary) {
  const clauses = plainText(summary, 500)
    .split(/(?<=[.!?])\s+/)
    .map((clause) =>
      clause
        .replace(/^(?:implemented|completed|finished|done)(?: successfully)?[.:\s-]*/i, '')
        .replace(/[.!?]+$/, '')
        .trim(),
    )
    .filter((clause) => clause.split(/\s+/).length >= 3);
  const candidate = clauses.find((clause) => clause.split(/\s+/).length <= 12) || '';
  return validSuggestedTitle(candidate);
}

function componentTitle(paths, summary) {
  if (/\brehearsal\b/i.test(summary)) return 'Client rehearsal workspace';
  if (/\bmilestones? now use\b/i.test(summary)) return 'Shared approval milestones';
  const ignored =
    /^(?:index|app|page|route|layout|styles?|repository|pricing|package|playwright|vite|server|worker|test|spec)$/i;
  for (const path of paths || []) {
    const basenameWithoutExtension = basename(path).replace(/\.[^.]+$/, '');
    if (
      ignored.test(basenameWithoutExtension) ||
      !/[A-Z][a-z]+[A-Z]/.test(basenameWithoutExtension)
    ) {
      continue;
    }
    const words = basenameWithoutExtension
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[-_]+/g, ' ')
      .trim();
    if (words) return `${words.charAt(0).toUpperCase()}${words.slice(1).toLowerCase()}`;
  }
  return '';
}

function semanticFeatureTitle(implementation = {}) {
  const context = `${implementation.prompt || ''} ${implementation.summary || ''}`;
  if (/\bstripe\b/i.test(context) && /\b(?:test|rehearsal)\b/i.test(context)) {
    return 'Stripe Test Checkout for Rehearsals';
  }
  if (
    /(?:each chats? name.*feature|feature history.*chat|chat.*feature history|recent feature name)/i.test(
      context,
    )
  ) {
    return 'Chat feature history';
  }
  return '';
}

function generatedFeatureMetadata({ implementations = [], targets = [] } = {}) {
  const latest = implementations.at(-1) || {};
  const summary = plainText(latest.summary || latest.prompt, 800);
  const paths = targets.flatMap((target) => target.paths || []);
  const title =
    semanticFeatureTitle(latest) ||
    (latest.suggestedMetadataVersion === metadataVersion
      ? validSuggestedTitle(latest.suggestedTitle)
      : '') ||
    [...implementations]
      .reverse()
      .map((implementation) => promptTitle(implementation.prompt))
      .find(Boolean) ||
    componentTitle(paths, summary) ||
    summaryTitle(summary) ||
    'Review feature wording';
  const clauses = summary
    .split(/(?<=[.!?])\s+/)
    .map((clause) => clause.trim())
    .filter(Boolean);
  const usefulClauses = clauses.filter(
    (clause) =>
      !/^implemented(?:\s+(?:in|across)\s+(?:both\s+)?(?:studio|clientspace|places)(?:\s+and\s+(?:studio|clientspace))?)?[.!]?$/i.test(
        clause,
      ),
  );
  let description =
    plainText(latest.suggestedSummary, 700) ||
    usefulClauses.slice(0, 5).join(' ') ||
    summary ||
    'A completed Codex change awaiting a clearer description.';
  description = description
    .replace(/^Implemented(?: successfully)?[.:]?\s*/i, '')
    .replace(/^(?:and\s+)?verified[.!:]?\s*/i, '')
    .replace(/^[-.:;\s]+/, '')
    .replace(/\s+in\s+(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+(?::\d+)?[.!]?$/i, '.')
    .replace(/:\s*\.\s*/g, ': ')
    .replace(/\.{2,}/g, '.')
    .trim();
  if (/^Shared approval milestones$/i.test(title)) {
    description =
      'Keep proposal acceptance, content and refinement approval, and launch handover milestones consistent across Studio and Clientspace.';
  }
  if (/^Client rehearsal workspace$/i.test(title)) {
    description =
      'Create a clearly labelled test client across Studio and Clientspace using verified source data without treating it as a real client.';
  }
  if (/^Chat feature history$/i.test(title)) {
    description =
      'Name each Codex chat after its newest linked feature, show its feature history in the conversation picker and transcript, and jump directly to the exact completed turn.';
  }
  if (description) description = `${description.charAt(0).toUpperCase()}${description.slice(1)}`;
  if (!/[.!?]$/.test(description)) description = `${description}.`;
  return {
    title: featureTitleCase(title).slice(0, 96),
    summary: description.slice(0, 700),
  };
}

function meaningfulTitleWords(value) {
  return new Set(
    String(value || '')
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.filter(
        (word) =>
          word.length > 2 &&
          !['and', 'for', 'from', 'into', 'the', 'this', 'that', 'with'].includes(word),
      ) || [],
  );
}

function continuesFeature(feature, implementation, targets) {
  if (!feature) return false;
  if (
    /^(?:ok|okay|yes|yeah|yep|go ahead|do it|implement it|fix it|continue|finish it)[.!]?$/i.test(
      implementation.prompt,
    )
  ) {
    return true;
  }
  const nextTitle = generatedFeatureMetadata({ implementations: [implementation], targets }).title;
  const currentWords = meaningfulTitleWords(feature.title);
  const nextWords = meaningfulTitleWords(nextTitle);
  const overlap = [...nextWords].filter((word) => currentWords.has(word)).length;
  return (
    String(feature.title || '').toLowerCase() === nextTitle.toLowerCase() ||
    (overlap > 0 && overlap / Math.min(currentWords.size || 1, nextWords.size || 1) >= 0.5)
  );
}

function finalSummary(turn, fallback) {
  const messages = (Array.isArray(turn?.items) ? turn.items : [])
    .filter(
      (item) =>
        item?.type === 'agentMessage' &&
        typeof item.text === 'string' &&
        item.phase !== 'commentary',
    )
    .map((item) => cleanText(item.text, 1_200))
    .filter(Boolean);
  return messages.at(-1) || cleanText(fallback, 1_200) || 'Codex completed a product change.';
}

function processedTurnKey(threadId, turnId) {
  return `${String(threadId)}:${String(turnId)}`;
}

function rawChangedPaths(turn) {
  const paths = [];
  for (const item of Array.isArray(turn?.items) ? turn.items : []) {
    if (item?.type !== 'fileChange' || item.status === 'failed') continue;
    for (const change of Array.isArray(item.changes) ? item.changes : []) {
      if (typeof change?.path === 'string' && change.path.trim()) paths.push(change.path.trim());
    }
  }
  return [...new Set(paths)];
}

function targetForPath(path, repositories, record) {
  if (isAbsolute(path)) {
    const absolute = resolve(path);
    for (const repository of repositories) {
      const candidate = relative(repository.directory, absolute);
      if (candidate && !candidate.startsWith('..') && !isAbsolute(candidate)) {
        return { repository, path: candidate };
      }
    }
  }
  const fallback =
    record.threadScope === 'client'
      ? repositories.find((repository) => repository.id === 'client')
      : repositories.find((repository) => repository.id === 'studio');
  return fallback ? { repository: fallback, path: path.replace(/^\.\//, '') } : undefined;
}

async function atomicWriteJson(path, value) {
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporaryPath, path);
}

async function git(directory, arguments_) {
  const result = await execFile('git', arguments_, {
    cwd: directory,
    encoding: 'utf8',
    maxBuffer: 2 * 1024 * 1024,
  });
  return result.stdout.trim();
}

function emptyEnvironment() {
  return { status: 'not_deployed', updatedAt: null };
}

function environmentMatchesTarget(target, environment) {
  if (environment?.status !== 'verified' || target.sourceState !== 'committed') return false;
  return !environment.sourceCommit || environment.sourceCommit === target.sourceCommit;
}

export class FeatureReleaseStore {
  constructor({ storagePath, repositories = [] }) {
    this.storagePath = storagePath;
    this.repositories = repositories
      .filter((repository) => repository?.directory)
      .map((repository) => ({ ...repository, directory: resolve(repository.directory) }));
    this.state = undefined;
    this.writePromise = Promise.resolve();
  }

  async load() {
    if (this.state) return this.state;
    try {
      const parsed = JSON.parse(await readFile(this.storagePath, 'utf8'));
      this.state = {
        version: 2,
        features: Array.isArray(parsed?.features) ? parsed.features : [],
        threadFeatures:
          parsed?.threadFeatures && typeof parsed.threadFeatures === 'object'
            ? parsed.threadFeatures
            : {},
        processedTurns: Array.isArray(parsed?.processedTurns)
          ? parsed.processedTurns
              .filter((key) => typeof key === 'string')
              .slice(-maximumProcessedTurns)
          : [],
      };
    } catch {
      this.state = { version: 2, features: [], threadFeatures: {}, processedTurns: [] };
    }
    this.state.processedTurns = [
      ...new Set([
        ...(this.state.processedTurns || []),
        ...this.state.features.flatMap((feature) =>
          (feature.implementations || []).map((implementation) =>
            processedTurnKey(implementation.threadId, implementation.turnId),
          ),
        ),
      ]),
    ].slice(-maximumProcessedTurns);
    return this.state;
  }

  async processedTurnKeys() {
    const state = await this.load();
    return new Set(state.processedTurns || []);
  }

  async persist() {
    const state = await this.load();
    this.writePromise = this.writePromise
      .catch(() => undefined)
      .then(async () => {
        await mkdir(resolve(this.storagePath, '..'), { recursive: true, mode: 0o700 });
        await atomicWriteJson(this.storagePath, state);
      });
    await this.writePromise;
  }

  async linkThread({ featureId, sourceThreadId, threadId }) {
    const state = await this.load();
    if (!featureIdPattern.test(String(featureId || ''))) return;
    if (!threadIdPattern.test(String(threadId || ''))) return;
    const feature = state.features.find((candidate) => candidate.id === featureId);
    if (!feature) return;
    state.threadFeatures[threadId] = featureId;
    if (threadIdPattern.test(String(sourceThreadId || ''))) {
      state.threadFeatures[sourceThreadId] = featureId;
    }
    await this.persist();
  }

  async recordCompletedTurn({ record, turn, metadata }) {
    if (!record?.threadId || !turn?.id) return undefined;
    const state = await this.load();
    const turnKey = processedTurnKey(record.threadId, turn.id);
    if (state.processedTurns.includes(turnKey)) {
      const linkedFeatureId = state.threadFeatures[record.threadId];
      return state.features.find((candidate) => candidate.id === linkedFeatureId);
    }
    const changedPaths = rawChangedPaths(turn);
    if (!changedPaths.length) {
      state.processedTurns = [...state.processedTurns, turnKey].slice(-maximumProcessedTurns);
      await this.persist();
      return undefined;
    }
    const grouped = new Map();
    for (const path of changedPaths) {
      const target = targetForPath(path, this.repositories, record);
      if (!target) continue;
      const existing = grouped.get(target.repository.id) || {
        repository: target.repository,
        paths: [],
      };
      existing.paths.push(target.path);
      grouped.set(target.repository.id, existing);
    }
    if (!grouped.size) {
      state.processedTurns = [...state.processedTurns, turnKey].slice(-maximumProcessedTurns);
      await this.persist();
      return undefined;
    }

    const linkedFeatureId = state.threadFeatures[record.threadId];
    let feature = state.features.find((candidate) => candidate.id === linkedFeatureId);
    const now = new Date().toISOString();
    const implementation = {
      id: randomUUID(),
      threadId: String(record.threadId),
      turnId: String(turn.id),
      threadScope: record.threadScope === 'client' ? 'client' : 'universal',
      prompt: cleanText(record.prompt, 1_000),
      summary: finalSummary(turn, record.prompt),
      suggestedTitle: validSuggestedTitle(metadata?.title) || undefined,
      suggestedSummary: plainText(metadata?.summary, 700) || undefined,
      suggestedMetadataVersion: metadata?.title ? metadataVersion : undefined,
      completedAt: now,
    };
    const candidateTargets = [...grouped.values()].map(({ repository, paths }) => ({
      repositoryId: repository.id,
      paths,
    }));
    if (feature && !continuesFeature(feature, implementation, candidateTargets)) {
      feature = undefined;
    }
    if (feature?.implementations?.some((entry) => entry.turnId === implementation.turnId)) {
      return feature;
    }
    if (!feature) {
      feature = {
        id: `feature-${randomUUID()}`,
        title: 'Preparing feature wording',
        summary: 'Codex is organizing the completed product change.',
        metadata: { source: 'generated', version: metadataVersion, updatedAt: now },
        status: 'local_changes',
        createdAt: now,
        updatedAt: now,
        implementations: [],
        targets: [],
      };
      state.features.unshift(feature);
    }
    feature.updatedAt = now;
    feature.summary = implementation.summary;
    feature.implementations = [...(feature.implementations || []), implementation].slice(-20);
    state.threadFeatures[record.threadId] = feature.id;
    state.processedTurns = [...state.processedTurns, turnKey].slice(-maximumProcessedTurns);

    for (const { repository, paths } of grouped.values()) {
      let target = feature.targets.find((candidate) => candidate.repositoryId === repository.id);
      if (!target) {
        target = {
          repositoryId: repository.id,
          product: repository.product,
          label: repository.label,
          repository: basename(repository.directory),
          paths: [],
          sourceCommit: null,
          sourceState: 'local_changes',
          environments: {
            development: emptyEnvironment(),
            production: emptyEnvironment(),
          },
        };
        feature.targets.push(target);
      }
      target.paths = [...new Set([...(target.paths || []), ...paths])].slice(0, 200);
    }
    if (feature.metadata?.source !== 'manual') {
      Object.assign(feature, generatedFeatureMetadata(feature));
      feature.metadata = { source: 'generated', version: metadataVersion, updatedAt: now };
    }
    await this.refreshFeature(feature);
    await this.persist();
    return feature;
  }

  async refreshFeature(feature) {
    for (const target of feature.targets || []) {
      const repository = this.repositories.find(
        (candidate) => candidate.id === target.repositoryId,
      );
      if (!repository || !target.paths?.length) continue;
      try {
        const dirty = await git(repository.directory, [
          'status',
          '--porcelain=v1',
          '--',
          ...target.paths,
        ]);
        if (dirty) {
          target.sourceState = 'local_changes';
          target.sourceCommit = null;
          continue;
        }
        const commit = await git(repository.directory, [
          'log',
          '-1',
          '--format=%H',
          '--',
          ...target.paths,
        ]);
        target.sourceCommit = /^[0-9a-f]{40}$/i.test(commit) ? commit.toLowerCase() : null;
        target.sourceState = target.sourceCommit ? 'committed' : 'local_changes';
      } catch {
        target.sourceState = 'unknown';
      }
    }
    const targets = feature.targets || [];
    if (targets.some((target) => target.sourceState === 'local_changes')) {
      feature.status = 'local_changes';
    } else if (
      targets.length &&
      targets.every((target) => environmentMatchesTarget(target, target.environments?.production))
    ) {
      feature.status = 'live';
    } else if (
      targets.length &&
      targets.every((target) => environmentMatchesTarget(target, target.environments?.development))
    ) {
      feature.status = 'ready_production';
    } else if (targets.every((target) => target.sourceCommit)) {
      feature.status = 'ready_development';
    }
    return feature;
  }

  async list() {
    const state = await this.load();
    let migrated = false;
    for (const feature of [...state.features]) {
      const splitIndex = (feature.implementations || []).findIndex(
        (implementation, index) =>
          index > 0 &&
          semanticFeatureTitle(implementation) &&
          semanticFeatureTitle(implementation).toLowerCase() !==
            String(feature.title || '').toLowerCase(),
      );
      if (splitIndex < 1) continue;
      const movedImplementations = feature.implementations.splice(splitIndex);
      const now = new Date().toISOString();
      const splitFeature = {
        ...structuredClone(feature),
        id: `feature-${randomUUID()}`,
        createdAt: movedImplementations[0].completedAt,
        updatedAt: movedImplementations.at(-1).completedAt,
        implementations: movedImplementations,
        metadata: { source: 'generated', version: metadataVersion, updatedAt: now },
        status: 'local_changes',
        targets: (feature.targets || []).map((target) => ({
          ...structuredClone(target),
          environments: { development: emptyEnvironment(), production: emptyEnvironment() },
        })),
      };
      Object.assign(splitFeature, generatedFeatureMetadata(splitFeature));
      for (const implementation of movedImplementations) {
        state.threadFeatures[implementation.threadId] = splitFeature.id;
      }
      feature.updatedAt = feature.implementations.at(-1)?.completedAt || feature.createdAt;
      if (feature.metadata?.source !== 'manual') {
        Object.assign(feature, generatedFeatureMetadata(feature));
        feature.metadata = { source: 'generated', version: metadataVersion, updatedAt: now };
      }
      state.features.unshift(splitFeature);
      migrated = true;
    }
    for (const feature of state.features) {
      if (feature.metadata?.source === 'manual' || feature.metadata?.version === metadataVersion)
        continue;
      Object.assign(feature, generatedFeatureMetadata(feature));
      feature.metadata = {
        source: 'generated',
        version: metadataVersion,
        updatedAt: new Date().toISOString(),
      };
      migrated = true;
    }
    await Promise.all(state.features.map((feature) => this.refreshFeature(feature)));
    if (migrated || state.features.length) await this.persist();
    return state.features
      .map((feature) => ({
        ...structuredClone(feature),
        linkedThreadIds: [
          ...new Set([
            ...Object.entries(state.threadFeatures)
              .filter(([, featureId]) => featureId === feature.id)
              .map(([threadId]) => threadId),
            ...feature.implementations.map((implementation) => implementation.threadId),
          ]),
        ],
      }))
      .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));
  }

  async updateMetadata({ featureId, title, summary }) {
    if (!featureIdPattern.test(String(featureId || ''))) throw new Error('Choose a valid feature.');
    const cleanedTitle = featureTitleCase(plainText(title, 97));
    const cleanedSummary = plainText(summary, 701);
    if (cleanedTitle.length < 3 || cleanedTitle.length > 96) {
      throw new Error('Use a feature title between 3 and 96 characters.');
    }
    if (cleanedSummary.length < 20 || cleanedSummary.length > 700) {
      throw new Error('Use a feature description between 20 and 700 characters.');
    }
    const state = await this.load();
    const feature = state.features.find((candidate) => candidate.id === featureId);
    if (!feature) throw new Error('That feature is no longer available.');
    const now = new Date().toISOString();
    feature.title = cleanedTitle;
    feature.summary = cleanedSummary;
    feature.updatedAt = now;
    feature.metadata = { source: 'manual', version: metadataVersion, updatedAt: now };
    await this.persist();
    return structuredClone(feature);
  }

  async regenerateMetadata({ featureId }) {
    if (!featureIdPattern.test(String(featureId || ''))) throw new Error('Choose a valid feature.');
    const state = await this.load();
    const feature = state.features.find((candidate) => candidate.id === featureId);
    if (!feature) throw new Error('That feature is no longer available.');
    const now = new Date().toISOString();
    Object.assign(feature, generatedFeatureMetadata(feature));
    feature.updatedAt = now;
    feature.metadata = { source: 'generated', version: metadataVersion, updatedAt: now };
    await this.persist();
    return structuredClone(feature);
  }

  async mergeFeatures({ featureId, sourceFeatureId }) {
    if (
      !featureIdPattern.test(String(featureId || '')) ||
      !featureIdPattern.test(String(sourceFeatureId || ''))
    ) {
      throw new Error('Choose two valid features to merge.');
    }
    if (featureId === sourceFeatureId) throw new Error('Choose a different feature to merge.');
    const state = await this.load();
    const feature = state.features.find((candidate) => candidate.id === featureId);
    const source = state.features.find((candidate) => candidate.id === sourceFeatureId);
    if (!feature || !source) throw new Error('One of those features is no longer available.');
    if (
      [feature, source].some((candidate) =>
        candidate.deploymentRuns?.some((run) => ['queued', 'running'].includes(run.status)),
      )
    ) {
      throw new Error('Wait for active deployments to finish before merging features.');
    }
    feature.implementations = [...feature.implementations, ...source.implementations]
      .filter(
        (entry, index, entries) =>
          entries.findIndex((candidate) => candidate.turnId === entry.turnId) === index,
      )
      .sort((left, right) => String(left.completedAt).localeCompare(String(right.completedAt)));
    for (const sourceTarget of source.targets) {
      const target = feature.targets.find(
        (candidate) => candidate.repositoryId === sourceTarget.repositoryId,
      );
      if (!target) {
        feature.targets.push({
          ...structuredClone(sourceTarget),
          environments: { development: emptyEnvironment(), production: emptyEnvironment() },
        });
        continue;
      }
      const revisionsMatch =
        target.sourceCommit && target.sourceCommit === sourceTarget.sourceCommit;
      target.paths = [...new Set([...(target.paths || []), ...(sourceTarget.paths || [])])].slice(
        0,
        200,
      );
      if (!revisionsMatch) {
        target.environments = { development: emptyEnvironment(), production: emptyEnvironment() };
      }
    }
    for (const [threadId, linkedFeatureId] of Object.entries(state.threadFeatures)) {
      if (linkedFeatureId === sourceFeatureId) state.threadFeatures[threadId] = featureId;
    }
    state.features = state.features.filter((candidate) => candidate.id !== sourceFeatureId);
    const now = new Date().toISOString();
    const preservesManualWording = feature.metadata?.source === 'manual';
    if (!preservesManualWording) Object.assign(feature, generatedFeatureMetadata(feature));
    feature.updatedAt = now;
    feature.metadata = {
      source: preservesManualWording ? 'manual' : 'generated',
      version: metadataVersion,
      updatedAt: now,
    };
    await this.refreshFeature(feature);
    await this.persist();
    return structuredClone(feature);
  }

  async deploymentStarted({ featureId, environment }) {
    if (!featureIdPattern.test(String(featureId || ''))) throw new Error('Choose a valid feature.');
    if (!environments.includes(environment)) throw new Error('Choose a valid release environment.');
    const state = await this.load();
    const feature = state.features.find((candidate) => candidate.id === featureId);
    if (!feature) throw new Error('That feature is no longer available.');
    if (
      feature.deploymentRuns?.some((run) =>
        ['queued', 'running'].includes(String(run.status || '')),
      )
    ) {
      throw new Error('A deployment for this feature is already running.');
    }
    await this.refreshFeature(feature);
    if (
      feature.targets.some((target) => !target.sourceCommit || target.sourceState !== 'committed')
    ) {
      throw new Error('Commit every feature file before starting a deployment.');
    }
    const run = {
      id: randomUUID(),
      environment,
      status: 'queued',
      startedAt: new Date().toISOString(),
      targets: feature.targets.map((target) => ({
        repositoryId: target.repositoryId,
        sourceCommit: target.sourceCommit,
      })),
    };
    feature.deploymentRuns = [...(feature.deploymentRuns || []), run].slice(-20);
    for (const target of feature.targets) {
      target.environments[environment] = {
        status: 'queued',
        runId: run.id,
        sourceCommit: target.sourceCommit,
        updatedAt: run.startedAt,
      };
    }
    feature.updatedAt = run.startedAt;
    await this.persist();
    return { feature, run };
  }

  async deploymentFinished({ featureId, runId, status, detail, urls = {} }) {
    const state = await this.load();
    const feature = state.features.find((candidate) => candidate.id === featureId);
    const run = feature?.deploymentRuns?.find((candidate) => candidate.id === runId);
    if (!feature || !run) return;
    const now = new Date().toISOString();
    run.status = status;
    run.detail = cleanText(detail, 600);
    run.completedAt = now;
    for (const target of feature.targets) {
      const deployment = target.environments[run.environment];
      if (deployment?.runId !== run.id) continue;
      target.environments[run.environment] = {
        ...deployment,
        status: status === 'completed' ? 'verified' : 'failed',
        detail: run.detail,
        url: urls[target.repositoryId] || deployment.url,
        updatedAt: now,
      };
    }
    feature.updatedAt = now;
    await this.refreshFeature(feature);
    await this.persist();
  }
}
