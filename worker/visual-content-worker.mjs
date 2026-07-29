/* global document, HTMLImageElement */

import { hostname } from 'node:os';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import { recordAiUsage } from './ai-usage.mjs';

const requestTimeoutMs = 120_000;
const supportedKinds = [
  'testimonial',
  'service',
  'contact',
  'pricing',
  'faq',
  'process',
  'table',
  'list',
  'general',
];

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the visual-content worker.`);
  return value;
}

function outputText(response) {
  if (typeof response.output_text === 'string') return response.output_text;
  for (const item of response.output ?? []) {
    const value = item?.content?.find((entry) => entry?.type === 'output_text')?.text;
    if (typeof value === 'string') return value;
  }
  throw new Error('The visual-content model did not return structured output.');
}

function structuredSchema() {
  const stringArray = { type: 'array', items: { type: 'string' } };
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'schemaVersion',
      'kind',
      'heading',
      'body',
      'testimonial',
      'table',
      'items',
      'faqs',
      'uncertainties',
    ],
    properties: {
      schemaVersion: { type: 'integer', enum: [1] },
      kind: { type: 'string', enum: supportedKinds },
      heading: { type: 'string' },
      body: { type: 'string' },
      testimonial: {
        type: 'object',
        additionalProperties: false,
        required: ['quote', 'person', 'role', 'organisation'],
        properties: {
          quote: { type: 'string' },
          person: { type: 'string' },
          role: { type: 'string' },
          organisation: { type: 'string' },
        },
      },
      table: {
        type: 'object',
        additionalProperties: false,
        required: ['caption', 'columns', 'rows', 'footnotes'],
        properties: {
          caption: { type: 'string' },
          columns: stringArray,
          rows: { type: 'array', items: stringArray },
          footnotes: stringArray,
        },
      },
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['label', 'value', 'detail'],
          properties: {
            label: { type: 'string' },
            value: { type: 'string' },
            detail: { type: 'string' },
          },
        },
      },
      faqs: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['question', 'answer'],
          properties: { question: { type: 'string' }, answer: { type: 'string' } },
        },
      },
      uncertainties: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['path', 'detail'],
          properties: { path: { type: 'string' }, detail: { type: 'string' } },
        },
      },
    },
  };
}

async function imageDataUrl(blob) {
  if (blob.type === 'image/avif' || blob.type === 'image/svg+xml') {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
      const source = `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`;
      await page.setContent(`<img id="asset" src="${source}">`);
      await page.waitForFunction(
        () => {
          const image = document.querySelector('#asset');
          return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
        },
        undefined,
        { timeout: 12_000 },
      );
      const png = await page.locator('#asset').screenshot({ type: 'png', timeout: 12_000 });
      return `data:image/png;base64,${png.toString('base64')}`;
    } finally {
      await browser.close().catch(() => undefined);
    }
  }
  const bytes = Buffer.from(await blob.arrayBuffer());
  if (bytes.byteLength > 20 * 1024 * 1024) {
    throw new Error('The saved image is too large for structured visual analysis.');
  }
  return `data:${blob.type || 'image/png'};base64,${bytes.toString('base64')}`;
}

async function interpretCandidate(apiKey, model, blob, candidate) {
  const prompt = [
    'Recover semantic information from this saved public website image.',
    'Return information structure, not a UI or layout. A source table stays tabular data; a carousel or gallery is only provenance and must not affect the output structure.',
    'Transcribe only directly visible content. Do not infer missing cells, identities, relationships, endorsements, prices, facts, or claims.',
    'Use an empty string or empty array for fields that do not apply. Put every uncertain or unreadable value in uncertainties with a precise JSON-style path.',
    'For a testimonial, separate the quote, person, role, and organisation using directly visible labels or clear visual attribution grouping. Short standalone lines placed directly beneath the quote are observable attribution even when they do not include literal labels: put a visible job title in role and a visible company, project, or organisation line in organisation, and do not leave those attribution lines inside quote. Preserve an uncertainty entry when the attribution type remains ambiguous; never invent or expand the visible wording.',
    'For a table, preserve column order, row order, captions, and footnotes. Every row must have the same number of cells as columns; use an empty cell plus uncertainty rather than guessing.',
    'For pricing, services, processes, contacts, and lists, use items with label, value, and detail. Use faqs only for explicit question-and-answer pairs.',
    `Saved provenance: ${JSON.stringify({
      sourcePageUrl: candidate.source_page_url,
      sectionHeading: candidate.section_heading,
      sourcePresentation: candidate.source_presentation,
      earlierVisibleText: candidate.body,
    })}`,
  ].join('\n');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    signal: AbortSignal.timeout(requestTimeoutMs),
    body: JSON.stringify({
      model,
      store: false,
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: prompt },
            { type: 'input_image', image_url: await imageDataUrl(blob), detail: 'high' },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'structured_visual_content',
          strict: true,
          schema: structuredSchema(),
        },
      },
    }),
  });
  if (!response.ok) {
    const detail = (await response.text()).replace(/\s+/g, ' ').slice(0, 500);
    throw new Error(
      `The visual-content model returned ${response.status}${detail ? `: ${detail}` : '.'}`,
    );
  }
  const responseBody = await response.json();
  const structured = JSON.parse(outputText(responseBody));
  return {
    structured: {
      ...structured,
      kind: supportedKinds.includes(structured.kind) ? structured.kind : 'general',
    },
    usage: responseBody.usage,
  };
}

async function assertActive(client, job, workerId) {
  const { data, error } = await client
    .from('visual_content_jobs')
    .select('status, worker_id, cancel_requested_at')
    .eq('id', job.id)
    .maybeSingle();
  if (error) throw error;
  if (data?.cancel_requested_at) throw new Error('VISUAL_CONTENT_CANCELLED');
  if (!data || data.status !== 'running' || data.worker_id !== workerId) {
    throw new Error('The visual-content worker lease was lost.');
  }
}

async function processJob(client, job, workerId, apiKey, model) {
  const [{ data: candidates, error: candidatesError }, { data: assets, error: assetsError }] =
    await Promise.all([
      client
        .from('visual_content_candidates')
        .select('*')
        .eq('crawl_run_id', job.crawl_run_id)
        .eq('review_state', 'needs_review')
        .eq('structure_status', 'pending')
        .order('created_at'),
      client
        .from('artifacts')
        .select('id, storage_bucket, storage_path, content_type')
        .eq('crawl_run_id', job.crawl_run_id)
        .eq('kind', 'asset'),
    ]);
  if (candidatesError || assetsError) {
    throw new Error('The worker could not load saved visual-content candidates.');
  }
  const assetById = new Map((assets ?? []).map((asset) => [asset.id, asset]));
  const work = (candidates ?? []).filter((candidate) => assetById.has(candidate.asset_id));
  await client
    .from('visual_content_jobs')
    .update({
      model,
      total_items: work.length,
      completed_items: 0,
      progress_phase: 'interpreting_images',
      progress_detail: `Structuring ${work.length} saved image${work.length === 1 ? '' : 's'} for review.`,
    })
    .eq('id', job.id)
    .eq('worker_id', workerId);

  let completed = 0;
  let succeeded = 0;
  let failed = 0;
  for (const candidate of work) {
    await assertActive(client, job, workerId);
    const asset = assetById.get(candidate.asset_id);
    await client
      .from('visual_content_jobs')
      .update({
        current_candidate_id: candidate.id,
        progress_detail: `Reading saved image ${completed + 1} of ${work.length}.`,
      })
      .eq('id', job.id)
      .eq('worker_id', workerId);
    try {
      const { data: blob, error: downloadError } = await client.storage
        .from(asset.storage_bucket || 'siteforge-artifacts')
        .download(asset.storage_path);
      if (downloadError || !blob) throw new Error('The saved source image could not be loaded.');
      const result = await interpretCandidate(apiKey, model, blob, candidate);
      await recordAiUsage(client, {
        organizationId: job.organization_id,
        businessId: job.business_id,
        source: 'visual_content_structure',
        model,
        usage: result.usage,
        metadata: { visualContentJobId: job.id, candidateId: candidate.id },
      });
      const { error: saveError } = await client
        .from('visual_content_candidates')
        .update({
          content_type: result.structured.kind,
          structured_content: result.structured,
          structure_status: 'ready',
          structure_error: null,
        })
        .eq('id', candidate.id)
        .eq('review_state', 'needs_review');
      if (saveError) throw saveError;
      succeeded += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message.slice(0, 500) : 'Structured extraction failed.';
      await client
        .from('visual_content_candidates')
        .update({ structure_status: 'failed', structure_error: message })
        .eq('id', candidate.id)
        .eq('review_state', 'needs_review');
      failed += 1;
    }
    completed += 1;
    await client
      .from('visual_content_jobs')
      .update({ completed_items: completed })
      .eq('id', job.id)
      .eq('worker_id', workerId);
  }

  await assertActive(client, job, workerId);
  const { error } = await client
    .from('visual_content_jobs')
    .update({
      status: succeeded || !work.length ? 'ready' : 'failed',
      worker_id: null,
      lease_expires_at: null,
      progress_phase: 'complete',
      progress_detail: failed
        ? `${succeeded} candidate${succeeded === 1 ? '' : 's'} structured; ${failed} need another attempt or manual review.`
        : `${succeeded} structured content candidate${succeeded === 1 ? ' is' : 's are'} ready for human review.`,
      current_candidate_id: null,
      completed_items: completed,
      error_summary: failed
        ? `${failed} saved image${failed === 1 ? '' : 's'} could not be structured.`
        : null,
    })
    .eq('id', job.id)
    .eq('worker_id', workerId);
  if (error) throw error;
}

async function main() {
  const apiKey =
    process.env.OPENAI_API_KEY?.trim() || requiredEnvironment('SITEFORGE_CODEX_API_KEY');
  const client = createClient(
    requiredEnvironment('SITEFORGE_SUPABASE_URL'),
    requiredEnvironment('SITEFORGE_SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const model =
    process.env.SITEFORGE_VISUAL_CONTENT_MODEL?.trim() ||
    process.env.SITEFORGE_ASSET_VISION_MODEL?.trim() ||
    'gpt-5';
  const workerId = `${hostname()}-${process.pid}`;
  const runOnce = process.argv.includes('--once');
  let keepRunning = true;
  while (keepRunning) {
    const { data, error } = await client.rpc('claim_next_structured_visual_content', {
      worker_identity: workerId,
    });
    if (error) throw error;
    const job = Array.isArray(data) ? data[0] : undefined;
    if (!job) {
      if (runOnce) {
        console.log('[visual-content-worker] no queued structured content jobs.');
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      continue;
    }
    try {
      await processJob(client, job, workerId, apiKey, model);
      console.log(`[visual-content-worker] completed ${job.id}`);
    } catch (error) {
      const cancelled = error instanceof Error && error.message === 'VISUAL_CONTENT_CANCELLED';
      await client
        .from('visual_content_jobs')
        .update({
          status: 'failed',
          worker_id: null,
          lease_expires_at: null,
          progress_phase: cancelled ? 'cancelled' : 'failed',
          progress_detail: cancelled
            ? 'Structured content recovery stopped. Saved candidates remain private.'
            : 'Structured content recovery failed.',
          error_summary: cancelled
            ? 'Structured content recovery cancelled by a workspace user.'
            : error instanceof Error
              ? error.message.slice(0, 500)
              : 'Structured content recovery failed.',
        })
        .eq('id', job.id)
        .eq('worker_id', workerId);
      console.error(
        '[visual-content-worker] failed',
        job.id,
        error instanceof Error ? error.message : error,
      );
    }
    if (runOnce) keepRunning = false;
  }
}

main().catch((error) => {
  console.error(
    '[visual-content-worker] stopped unexpectedly',
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
