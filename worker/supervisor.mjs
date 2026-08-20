import { spawn } from 'node:child_process';
import { openAiApiEnabled } from './openai-api-policy.mjs';

const workerScripts = [
  ['capture', 'capture-worker.mjs'],
  ['logos', 'logo-worker.mjs'],
  ['audit', 'audit-worker.mjs'],
  ['audit-specialist-1', 'audit-specialist-worker.mjs'],
  ['audit-specialist-2', 'audit-specialist-worker.mjs'],
  ['audit-specialist-3', 'audit-specialist-worker.mjs'],
  ['assets', 'asset-analysis-worker.mjs'],
];
if (openAiApiEnabled()) {
  workerScripts.push(
    ['visual-content', 'visual-content-worker.mjs'],
    ['capabilities', 'capability-analysis-worker.mjs'],
    ['agent-packages', 'agent-package-worker.mjs'],
  );
}
if (process.env.SITEFORGE_EXTERNAL_BUILDER !== '1') {
  workerScripts.push(['builder', 'builder-worker.mjs']);
}
if (process.env.MADE_SOLID_HANDOFF_URL && process.env.MADE_SOLID_HANDOFF_SECRET) {
  workerScripts.push(['made-solid-handoffs', 'made-solid-handoff-worker.mjs']);
}
if (
  (process.env.MADE_SOLID_REPORT_PREVIEW_URL || process.env.MADE_SOLID_HANDOFF_URL) &&
  (process.env.MADE_SOLID_HANDOFF_SECRET || process.env.STUDIO_HANDOFF_SECRET)
) {
  workerScripts.push(['report-previews', 'report-preview-worker.mjs']);
}
if (
  process.env.VERCEL_ACCESS_TOKEN &&
  process.env.CLIENTSPACE_HANDOFF_URL &&
  process.env.CLIENTSPACE_HANDOFF_SECRET
) {
  workerScripts.push(['client-preview', 'client-preview-worker.mjs']);
}
if (process.env.SITEFORGE_GITHUB_TOKEN || process.env.GITHUB_TOKEN) {
  workerScripts.push(['github-workspace', 'github-workspace-worker.mjs']);
}
const restartDelayMs = 2_000;
let stopping = false;
const children = new Set();

function startWorker(name, script) {
  if (stopping) return;
  const child = spawn(process.execPath, [new URL(script, import.meta.url).pathname], {
    env: process.env,
    stdio: 'inherit',
  });
  children.add(child);
  child.once('exit', (code, signal) => {
    children.delete(child);
    if (stopping) return;
    console.error(
      `[worker-supervisor] ${name} stopped (${signal ?? code ?? 'unknown'}); restarting.`,
    );
    setTimeout(() => startWorker(name, script), restartDelayMs);
  });
}

function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

console.log(
  `[worker-supervisor] starting ${workerScripts.map(([name]) => name).join(', ')} workers.`,
);
workerScripts.forEach(([name, script]) => startWorker(name, script));
