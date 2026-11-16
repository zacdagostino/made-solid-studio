import { execFileSync } from 'node:child_process';
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectDirectory = resolve(import.meta.dirname, '../../');
const madeSolidDirectory = resolve(projectDirectory, '.made-solid');
const logPath = resolve(madeSolidDirectory, 'refinement-log.jsonl');
const originPath = resolve(madeSolidDirectory, 'origin.json');
const bundlePath = resolve(madeSolidDirectory, 'learning-bundle.json');
const classifications = new Set([
  'strict_invariant',
  'flexible_principle',
  'project_specific',
  'unclassified',
]);

function argumentsFrom(commandArguments) {
  const values = new Map();
  for (let index = 0; index < commandArguments.length; index += 1) {
    const key = commandArguments[index];
    if (!key.startsWith('--')) throw new Error(`Unexpected argument: ${key}`);
    const value = commandArguments[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${key}`);
    values.set(key.slice(2), value.trim());
    index += 1;
  }
  return values;
}

function list(value) {
  return value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function git(...arguments_) {
  try {
    return execFileSync('git', arguments_, {
      cwd: projectDirectory,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

async function entries() {
  const source = await readFile(logPath, 'utf8').catch(() => '');
  return source
    .split('\n')
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch {
        throw new Error(`Refinement ledger line ${index + 1} is not valid JSON.`);
      }
    });
}

async function add(commandArguments) {
  const values = argumentsFrom(commandArguments);
  for (const key of ['id', 'classification', 'title', 'problem', 'fix']) {
    if (!values.get(key)) throw new Error(`--${key} is required.`);
  }
  const classification = values.get('classification');
  if (!classifications.has(classification)) {
    throw new Error(`Unknown classification: ${classification}`);
  }
  const currentEntries = await entries();
  const id = values.get('id');
  if (currentEntries.some((entry) => entry.id === id)) {
    throw new Error(`Refinement entry ${id} already exists. Amend it deliberately in the ledger.`);
  }
  const entry = {
    schemaVersion: 1,
    id,
    recordedAt: new Date().toISOString(),
    classification,
    title: values.get('title'),
    problem: values.get('problem'),
    ...(values.get('root-cause') ? { rootCause: values.get('root-cause') } : {}),
    fix: values.get('fix'),
    ...(values.get('pattern') ? { pattern: values.get('pattern') } : {}),
    paths: list(values.get('paths')),
    pages: list(values.get('pages')),
    viewports: list(values.get('viewports')),
    evidence: list(values.get('evidence')),
    verification: list(values.get('verification')),
    ...(git('rev-parse', '--verify', 'HEAD') ? { gitCommit: git('rev-parse', 'HEAD') } : {}),
  };
  await appendFile(logPath, `${JSON.stringify(entry)}\n`);
  console.log(`Recorded ${entry.id}: ${entry.title}`);
}

async function summary() {
  const currentEntries = await entries();
  const counts = Object.fromEntries([...classifications].map((value) => [value, 0]));
  for (const entry of currentEntries) counts[entry.classification] += 1;
  console.log(JSON.stringify({ total: currentEntries.length, classifications: counts }, null, 2));
}

async function bundle() {
  const [origin, currentEntries] = await Promise.all([
    readFile(originPath, 'utf8').then(JSON.parse),
    entries(),
  ]);
  if (!currentEntries.length) throw new Error('Record at least one verified refinement first.');
  const patterns = new Map();
  for (const entry of currentEntries) {
    if (!entry.pattern) continue;
    const grouped = patterns.get(entry.pattern) ?? [];
    grouped.push(entry.id);
    patterns.set(entry.pattern, grouped);
  }
  const bundleDocument = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    origin,
    repository: {
      baselineCommit: origin.baselineCommit || undefined,
      finalCommit: git('rev-parse', '--verify', 'HEAD') || undefined,
      status: git('status', '--short'),
      recentCommits: git('log', '--oneline', '--max-count=40').split('\n').filter(Boolean),
      changedPathsFromBaseline: origin.baselineCommit
        ? git('diff', '--name-only', `${origin.baselineCommit}..HEAD`).split('\n').filter(Boolean)
        : [],
    },
    entries: currentEntries,
    repeatedPatterns: [...patterns.entries()]
      .filter(([, entryIds]) => entryIds.length > 1)
      .map(([pattern, entryIds]) => ({ pattern, entryIds })),
    distillationStatus: 'awaiting_review',
  };
  await writeFile(bundlePath, `${JSON.stringify(bundleDocument, null, 2)}\n`);
  console.log(`Created ${bundlePath}`);
}

const [command = 'summary', ...commandArguments] = process.argv.slice(2);
if (command === 'add') await add(commandArguments);
else if (command === 'summary') await summary();
else if (command === 'bundle') await bundle();
else throw new Error(`Unknown refinement command: ${command}`);
