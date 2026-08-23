/* global document, getComputedStyle, HTMLImageElement */

import { createHash } from 'node:crypto';
import { hostname } from 'node:os';
import { createClient } from '@supabase/supabase-js';
import { openAiApiEnabled, openAiApiKey } from './openai-api-policy.mjs';
import { chromium } from 'playwright';
import { recordAiUsage } from './ai-usage.mjs';
import { assertPublicUrl } from './security.mjs';
import { coloursFromSvg, isBrandColour, isLogoBrandColour } from './brand-evidence.mjs';
import {
  extractLogoPalette,
  lockRasterColoursToSource,
  vectorizeRasterLogo,
} from './logo-vectorizer.mjs';
import {
  alphaMattePreview,
  logoBrandColours,
  logoMatte,
  transparentLogoVariants,
} from './logo-variants.mjs';

const artifactBucket = 'siteforge-artifacts';
const requestTimeoutMs = 90_000;
const imageGenerationTimeoutMs = 150_000;
const rasterisationTimeoutMs = 30_000;
const maxBrandEvidencePages = 8;
const cancellationPollMs = 500;
const workerHeartbeatMs = 10_000;
const defaultAssetAnalysisConcurrency = 3;
const maxAssetAnalysisConcurrency = 5;
const supportedRoles = new Set([
  'primary_logo',
  'secondary_mark',
  'worksite_photo',
  'team_photo',
  'project_photo',
  'partner_logo',
  'supplier_logo',
  'decorative',
  'unknown',
  'exclude',
]);
const supportedAssociations = new Set(['target_business', 'third_party', 'unknown']);
const supportedConfidence = new Set(['high', 'medium', 'low']);

class AssetAnalysisCancelledError extends Error {
  constructor() {
    super('Asset analysis cancelled by a workspace user.');
    this.name = 'AssetAnalysisCancelledError';
  }
}

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for the asset-analysis worker.`);
  return value;
}

function assetAnalysisConcurrency() {
  const configured = Number.parseInt(process.env.SITEFORGE_ASSET_ANALYSIS_CONCURRENCY ?? '', 10);
  if (!Number.isFinite(configured)) return defaultAssetAnalysisConcurrency;
  return Math.min(Math.max(configured, 1), maxAssetAnalysisConcurrency);
}

async function runWithConcurrency(items, concurrency, processItem) {
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex];
      nextIndex += 1;
      await processItem(item);
    }
  });
  await Promise.all(workers);
}

function createTimedFetch(timeoutMs) {
  return (input, init = {}) => {
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = init.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;
    return fetch(input, { ...init, signal });
  };
}

function withTimeout(promise, timeoutMs, message) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function throwIfAborted(signal) {
  if (!signal?.aborted) return;
  throw signal.reason instanceof Error ? signal.reason : new AssetAnalysisCancelledError();
}

function readString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function readStringList(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

function safeAssetPreparationDetail(error) {
  const message = error instanceof Error ? error.message : '';
  if (/Target page, context or browser has been closed/i.test(message))
    return 'The private image conversion browser closed before the image could be prepared.';
  if (/timed out|timeout/i.test(message))
    return 'The private image preparation step exceeded its time limit.';
  if (/vision provider returned/i.test(message))
    return 'The vision provider could not analyse this image during this run.';
  return 'The private image could not be prepared for automated analysis during this run.';
}

function recordValue(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {};
}

function isSelectedForAnalysis(asset) {
  return recordValue(asset.metadata).analysisSelected !== false;
}

function uniqueAssetsByContent(assets, preferredIds = new Set()) {
  const groups = new Map();
  for (const asset of assets) {
    const key = readString(asset.sha256) || `artifact:${asset.id}`;
    const existing = groups.get(key);
    if (!existing || (preferredIds.has(asset.id) && !preferredIds.has(existing.id))) {
      groups.set(key, asset);
    }
  }
  return [...groups.values()];
}

function storedAnnotationFromRow(row) {
  const modelOutput = recordValue(row.model_output);
  return {
    suggestedRole: readString(row.suggested_role),
    businessAssociation: readString(row.business_association),
    reviewState: readString(row.review_state),
    retryable: modelOutput.processingStatus === 'unavailable',
  };
}

function outputText(response) {
  if (typeof response.output_text === 'string') return response.output_text;
  const output = Array.isArray(response.output) ? response.output : [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    const text = content.find((entry) => entry?.type === 'output_text')?.text;
    if (typeof text === 'string') return text;
  }
  throw new Error('The vision model did not return structured text.');
}

function annotationSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'observed_description',
      'visible_text',
      'suggested_role',
      'business_association',
      'safe_reuse_note',
      'cautions',
      'confidence',
    ],
    properties: {
      observed_description: { type: 'string' },
      visible_text: { type: 'array', items: { type: 'string' } },
      suggested_role: { type: 'string', enum: [...supportedRoles] },
      business_association: { type: 'string', enum: [...supportedAssociations] },
      safe_reuse_note: { type: 'string' },
      cautions: { type: 'array', items: { type: 'string' } },
      confidence: { type: 'string', enum: [...supportedConfidence] },
    },
  };
}

async function imageInput(blob, signal) {
  throwIfAborted(signal);
  if (blob.type === 'image/avif' || blob.type === 'image/svg+xml') {
    const converter = await chromium.launch({ headless: true });
    try {
      const page = await converter.newPage({ viewport: { width: 1600, height: 1200 } });
      try {
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
        throwIfAborted(signal);
        return `data:image/png;base64,${png.toString('base64')}`;
      } finally {
        await page.close().catch(() => undefined);
      }
    } finally {
      await converter.close().catch(() => undefined);
    }
  }
  const image = `data:${blob.type || 'image/png'};base64,${Buffer.from(
    await blob.arrayBuffer(),
  ).toString('base64')}`;
  throwIfAborted(signal);
  return image;
}

function isDerivedVectorSuggestion(asset) {
  const metadata = recordValue(asset.metadata);
  return metadata.vectorSuggestion === true || Boolean(readString(metadata.derivedFromAssetId));
}

function canCreateVectorSuggestion(asset, annotation) {
  if (isDerivedVectorSuggestion(asset) || asset.content_type === 'image/svg+xml') return false;
  return (
    annotation?.reviewState === 'approved' &&
    annotation.businessAssociation === 'target_business' &&
    ['primary_logo', 'secondary_mark'].includes(annotation.suggestedRole)
  );
}

function canCreateEditableLogoVariant(asset, annotation) {
  if (isDerivedVectorSuggestion(asset)) return false;
  return (
    annotation?.reviewState === 'approved' &&
    annotation.businessAssociation === 'target_business' &&
    ['primary_logo', 'secondary_mark'].includes(annotation.suggestedRole)
  );
}

async function rasteriseLogo(browser, blob, options = {}) {
  const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
  try {
    const source = `data:${blob.type || 'image/png'};base64,${Buffer.from(
      await blob.arrayBuffer(),
    ).toString('base64')}`;
    await page.setContent(`<img id="asset" src="${source}">`);
    const raster = await withTimeout(
      page.evaluate(async (settings) => {
        const image = document.querySelector('#asset');
        if (!(image instanceof HTMLImageElement))
          throw new Error('The raster logo could not load.');
        await image.decode();
        const longestEdge = settings.longestEdge ?? 1_400;
        const pixelBudget = settings.pixelBudget ?? 1_500_000;
        const scale =
          settings.width && settings.height
            ? undefined
            : Math.min(
                1,
                longestEdge / Math.max(image.naturalWidth, image.naturalHeight),
                Math.sqrt(pixelBudget / (image.naturalWidth * image.naturalHeight)),
              );
        const canvas = document.createElement('canvas');
        canvas.width = settings.width ?? Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = settings.height ?? Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('The raster logo could not be read.');
        if (settings.background) {
          context.fillStyle = settings.background;
          context.fillRect(0, 0, canvas.width, canvas.height);
        }
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        let pixelBinary = '';
        const pixelBytes = pixels.data;
        const chunkSize = 32_768;
        for (let offset = 0; offset < pixelBytes.length; offset += chunkSize) {
          pixelBinary += String.fromCharCode(
            ...pixelBytes.subarray(offset, Math.min(offset + chunkSize, pixelBytes.length)),
          );
        }
        return {
          width: pixels.width,
          height: pixels.height,
          pixelBase64: globalThis.btoa(pixelBinary),
          png: canvas.toDataURL('image/png').split(',')[1],
        };
      }, options),
      rasterisationTimeoutMs,
      'The private logo rasterisation step exceeded its time limit.',
    );
    if (
      !Number.isInteger(raster.width) ||
      !Number.isInteger(raster.height) ||
      raster.width < 1 ||
      raster.height < 1 ||
      raster.width * raster.height > 1_500_000 ||
      typeof raster.pixelBase64 !== 'string' ||
      !raster.png
    ) {
      throw new Error('The prepared logo image did not pass the private raster validation check.');
    }
    const data = Buffer.from(raster.pixelBase64, 'base64');
    if (data.byteLength !== raster.width * raster.height * 4) {
      throw new Error('The prepared logo pixels did not pass the private raster validation check.');
    }
    return {
      width: raster.width,
      height: raster.height,
      data: Uint8ClampedArray.from(data),
      png: raster.png,
    };
  } finally {
    await page.close();
  }
}

function imageDataFromRaster(raster) {
  return {
    width: raster.width,
    height: raster.height,
    data: Uint8ClampedArray.from(raster.data),
  };
}

function enhancementDimensions(width, height) {
  const sourceRatio = Math.max(width / height, 1 / 3);
  const ratio = Math.min(sourceRatio, 3);
  // A 1024px master keeps private browser rasterisation reliable in constrained worker memory.
  // The original captured logo remains the source of truth for geometry and colour.
  const longEdge = 1024;
  if (ratio >= 1) {
    return {
      width: longEdge,
      height: Math.max(16, Math.round(longEdge / ratio / 16) * 16),
    };
  }
  return {
    width: Math.max(16, Math.round((longEdge * ratio) / 16) * 16),
    height: longEdge,
  };
}

function imageGenerationDimensions(width, height) {
  const minimumPixels = 1_050_000;
  const scale = Math.max(1, Math.sqrt(minimumPixels / Math.max(1, width * height)));
  return {
    width: Math.ceil((width * scale) / 16) * 16,
    height: Math.ceil((height * scale) / 16) * 16,
  };
}

function enhancementMatte(palette) {
  // GPT Image cannot return alpha. Pick a matte that does not disappear behind a
  // light logo, then recover transparency deterministically after the edit.
  const containsLightMark = palette.some(
    (colour) => colour.red >= 232 && colour.green >= 232 && colour.blue >= 232,
  );
  return containsLightMark ? '#17191d' : '#ffffff';
}

function visibleLogoMask(imageData) {
  const { width, height, data } = imageData;
  const matte = logoMatte(imageData);
  const mask = new Uint8Array(width * height);
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  let visible = 0;
  for (let index = 0, pixel = 0; index < data.length; index += 4, pixel += 1) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const alpha = data[index + 3];
    const distanceFromMatte = matte
      ? (matte.red - red) ** 2 + (matte.green - green) ** 2 + (matte.blue - blue) ** 2
      : Number.POSITIVE_INFINITY;
    if (alpha < 128 || distanceFromMatte < 34 ** 2) continue;
    mask[pixel] = 1;
    visible += 1;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
  return {
    mask,
    visible,
    bounds: visible ? { left, top, right, bottom } : undefined,
  };
}

function enhancementFidelity(reference, candidate) {
  if (reference.width !== candidate.width || reference.height !== candidate.height) {
    return { accepted: false, detail: 'The AI result changed the source canvas dimensions.' };
  }
  const source = visibleLogoMask(reference);
  const enhanced = visibleLogoMask(candidate);
  if (!source.bounds || !enhanced.bounds) {
    return { accepted: false, detail: 'The AI result did not contain a visible logo.' };
  }
  let intersection = 0;
  for (let index = 0; index < source.mask.length; index += 1) {
    if (source.mask[index] && enhanced.mask[index]) intersection += 1;
  }
  const overlap = (2 * intersection) / Math.max(1, source.visible + enhanced.visible);
  const sourceWidth = source.bounds.right - source.bounds.left + 1;
  const sourceHeight = source.bounds.bottom - source.bounds.top + 1;
  const enhancedWidth = enhanced.bounds.right - enhanced.bounds.left + 1;
  const enhancedHeight = enhanced.bounds.bottom - enhanced.bounds.top + 1;
  const widthRatio = enhancedWidth / sourceWidth;
  const heightRatio = enhancedHeight / sourceHeight;
  const areaRatio = enhanced.visible / source.visible;
  const accepted =
    overlap >= 0.74 &&
    areaRatio >= 0.62 &&
    areaRatio <= 1.5 &&
    widthRatio >= 0.72 &&
    widthRatio <= 1.32 &&
    heightRatio >= 0.72 &&
    heightRatio <= 1.32;
  return {
    accepted,
    detail: accepted
      ? `AI output passed the source-shape check (${Math.round(overlap * 100)}% overlap).`
      : 'The AI output did not preserve the original logo geometry closely enough.',
    overlap,
  };
}

function enhancementFailure(response, body) {
  const code = readString(recordValue(recordValue(body).error).code);
  if (code === 'moderation_blocked') return 'The AI logo clean-up request was blocked.';
  if (response.status === 401 || response.status === 403)
    return 'The AI logo clean-up service could not be authenticated.';
  if (response.status === 429)
    return 'The AI logo clean-up service is busy. Retry the SVG conversion shortly.';
  if (response.status >= 500)
    return 'The AI logo clean-up service is temporarily unavailable. Retry shortly.';
  return 'The AI logo clean-up service could not prepare this logo.';
}

async function enhanceLogoWithOpenAi({ apiKey, model, raster, matte, signal }) {
  throwIfAborted(signal);
  const body = Buffer.from(raster.png, 'base64');
  const form = new FormData();
  form.set('model', model);
  form.set(
    'prompt',
    [
      'This is a logo clean-up task, not a redesign.',
      'Preserve the exact visible logo: every letter, word, mark, proportion, spacing, placement, and colour relationship must remain unchanged.',
      'Do not add, remove, replace, restyle, redraw, translate, or invent anything.',
      'Only remove compression artefacts and smooth pixelated or jagged edges so the existing logo is clearer for private vector tracing.',
      `Keep the logo centred on the same plain ${matte} canvas with the same composition. Do not add a shadow, gradient, or texture.`,
    ].join(' '),
  );
  form.set('quality', process.env.SITEFORGE_LOGO_ENHANCEMENT_QUALITY?.trim() || 'medium');
  const outputSize = imageGenerationDimensions(raster.width, raster.height);
  form.set('size', `${outputSize.width}x${outputSize.height}`);
  form.append('image[]', new Blob([body], { type: 'image/png' }), 'logo-reference.png');
  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}` },
    signal: signal
      ? AbortSignal.any([AbortSignal.timeout(imageGenerationTimeoutMs), signal])
      : AbortSignal.timeout(imageGenerationTimeoutMs),
    body: form,
  });
  const responseBody = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(enhancementFailure(response, recordValue(responseBody)));
  const imageData = Array.isArray(recordValue(responseBody).data)
    ? recordValue(responseBody).data
    : [];
  const output = readString(recordValue(imageData[0]).b64_json);
  if (!output) throw new Error('The AI logo clean-up service returned no image.');
  return {
    blob: new Blob([Buffer.from(output, 'base64')], { type: 'image/png' }),
    requestId: response.headers.get('x-request-id') || undefined,
  };
}

async function createAlphaMatteWithOpenAi({ apiKey, model, raster, signal }) {
  throwIfAborted(signal);
  const body = Buffer.from(raster.png, 'base64');
  const form = new FormData();
  form.set('model', model);
  form.set(
    'prompt',
    [
      'Create a high-quality alpha matte for this exact logo, not a redesign.',
      'Return only the same logo silhouette in solid black on a perfectly flat pure white background.',
      'Black means fully visible logo; white means transparent background; use smooth grey only for antialiased edges.',
      'Preserve every letter, curve, corner, spacing, proportion, and placement exactly. Do not add shadows, gradients, texture, colours, or any extra marks.',
    ].join(' '),
  );
  // The source-verified silhouette corrects this request, so a low-quality matte is both
  // sufficient for soft-edge coverage and much faster than a second high-quality render.
  form.set('quality', process.env.SITEFORGE_LOGO_ALPHA_MATTE_QUALITY?.trim() || 'medium');
  const outputSize = imageGenerationDimensions(raster.width, raster.height);
  form.set('size', `${outputSize.width}x${outputSize.height}`);
  form.append('image[]', new Blob([body], { type: 'image/png' }), 'logo-cleanup.png');
  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}` },
    signal: signal
      ? AbortSignal.any([AbortSignal.timeout(imageGenerationTimeoutMs), signal])
      : AbortSignal.timeout(imageGenerationTimeoutMs),
    body: form,
  });
  const responseBody = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(enhancementFailure(response, recordValue(responseBody)));
  const imageData = Array.isArray(recordValue(responseBody).data)
    ? recordValue(responseBody).data
    : [];
  const output = readString(recordValue(imageData[0]).b64_json);
  if (!output) throw new Error('The AI logo clean-up service returned no alpha matte.');
  return {
    blob: new Blob([Buffer.from(output, 'base64')], { type: 'image/png' }),
    requestId: response.headers.get('x-request-id') || undefined,
  };
}

async function rasterBlobFromPixels(browser, imageData) {
  const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
  try {
    const png = await page.evaluate(
      ({ width, height, pixelBase64 }) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('The vectorizer input could not be prepared.');
        const binary = globalThis.atob(pixelBase64);
        const data = new Uint8ClampedArray(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
          data[index] = binary.charCodeAt(index);
        }
        context.putImageData(new globalThis.ImageData(data, width, height), 0, 0);
        return canvas.toDataURL('image/png').split(',')[1];
      },
      {
        width: imageData.width,
        height: imageData.height,
        pixelBase64: Buffer.from(imageData.data).toString('base64'),
      },
    );
    return new Blob([Buffer.from(png, 'base64')], { type: 'image/png' });
  } finally {
    await page.close();
  }
}

async function vectorizeWithVectorizerAi({ apiId, apiSecret, raster, signal }) {
  if (!apiId || !apiSecret) {
    throw new Error(
      'Vectorizer.AI requires VECTORIZER_AI_API_ID and VECTORIZER_AI_API_SECRET in server-only secrets.',
    );
  }
  const form = new FormData();
  form.set('image', raster, 'ai-remastered-logo.png');
  const response = await fetch('https://api.vectorizer.ai/api/v1/vectorize', {
    method: 'POST',
    headers: { authorization: `Basic ${Buffer.from(`${apiId}:${apiSecret}`).toString('base64')}` },
    signal: signal
      ? AbortSignal.any([AbortSignal.timeout(imageGenerationTimeoutMs), signal])
      : AbortSignal.timeout(imageGenerationTimeoutMs),
    body: form,
  });
  const svg = await response.text();
  if (!response.ok || !/<svg\b/i.test(svg)) {
    throw new Error(
      response.status === 401 || response.status === 403
        ? 'Vectorizer.AI could not authenticate with the configured server-only credentials.'
        : response.status === 429
          ? 'Vectorizer.AI is busy. Retry the SVG conversion shortly.'
          : 'Vectorizer.AI could not create a reviewable SVG from this logo.',
    );
  }
  return editableSvgSource(new Blob([svg], { type: 'image/svg+xml' }));
}

function wixOriginalImageUrl(sourceUrl) {
  try {
    const url = new URL(sourceUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'static.wixstatic.com') return undefined;
    const match = /^\/media\/([^/]+)\/v1\//.exec(url.pathname);
    return match ? `https://static.wixstatic.com/media/${match[1]}` : undefined;
  } catch {
    return undefined;
  }
}

async function highestQualityLogoSource(asset, fallback, signal) {
  if (asset.content_type === 'image/svg+xml') return fallback;
  const sourceUrl = wixOriginalImageUrl(readString(recordValue(asset.metadata).sourceUrl));
  if (!sourceUrl) return fallback;
  try {
    const response = await fetch(sourceUrl, { signal });
    const contentType = response.headers.get('content-type')?.split(';')[0].trim() || '';
    const contentLength = Number(response.headers.get('content-length') || '0');
    if (
      !response.ok ||
      !contentType.startsWith('image/') ||
      (Number.isFinite(contentLength) && contentLength > 15 * 1024 * 1024)
    ) {
      return fallback;
    }
    const body = await response.arrayBuffer();
    if (!body.byteLength || body.byteLength > 15 * 1024 * 1024) return fallback;
    return new Blob([body], { type: contentType });
  } catch {
    return fallback;
  }
}

async function storeVectorSuggestion(client, job, sourceAsset, svg) {
  const metadata = recordValue(sourceAsset.metadata);
  const storagePath = `${job.organization_id}/${job.business_id}/${job.crawl_run_id}/derived/vector-suggestion-${sourceAsset.id}.svg`;
  const content = Buffer.from(svg, 'utf8');
  const { error: uploadError } = await client.storage
    .from(artifactBucket)
    .upload(storagePath, content, {
      contentType: 'image/svg+xml',
      upsert: true,
    });
  if (uploadError) throw new Error('The worker could not save the private vector suggestion.');
  const { error: artifactError } = await client.from('artifacts').upsert(
    {
      organization_id: job.organization_id,
      business_id: job.business_id,
      crawl_run_id: job.crawl_run_id,
      kind: 'asset',
      label: `Derived vector suggestion from ${sourceAsset.label || 'approved logo'}`,
      storage_bucket: artifactBucket,
      storage_path: storagePath,
      content_type: 'image/svg+xml',
      byte_size: content.byteLength,
      sha256: createHash('sha256').update(content).digest('hex'),
      metadata: {
        sourceUrl: readString(metadata.sourceUrl),
        pageUrl: readString(metadata.pageUrl),
        assetType: 'logo',
        detail: 'Deterministic vector suggestion derived from a human-approved raster logo.',
        context: readString(metadata.context),
        vectorSuggestion: true,
        derivedFromAssetId: sourceAsset.id,
        derivedFromContentType: sourceAsset.content_type || 'image',
        reviewState: 'needs_review',
      },
    },
    { onConflict: 'storage_path' },
  );
  if (artifactError) throw new Error('The worker could not index the private vector suggestion.');
}

function editableSvg(svg) {
  const tokens = new Map();
  function tokenFor(colour) {
    const key = colour.trim();
    if (!tokens.has(key)) tokens.set(key, `--siteforge-logo-colour-${tokens.size + 1}`);
    return tokens.get(key);
  }
  const root = svg.replace(/<svg\b([^>]*)>/i, '<svg$1 data-siteforge-logo-variant="editable">');
  return root.replace(/\b(fill|stroke)="(?!none\b)([^"]*)"/gi, (_match, property, colour) => {
    const token = tokenFor(colour);
    return `${property}="var(${token}, ${colour})"`;
  });
}

async function editableSvgSource(blob) {
  const svg = await blob.text();
  if (!/^\s*<svg\b/i.test(svg) || Buffer.byteLength(svg) > 1_500_000) {
    throw new Error('The source logo is not a reviewable SVG.');
  }
  return svg
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

async function loadArtifactBlob(client, artifact) {
  const { data, error } = await client.storage
    .from(artifact.storage_bucket || artifactBucket)
    .download(artifact.storage_path);
  if (error || !data) {
    throw new Error('The saved AI clean-up image could not be loaded.');
  }
  return data;
}

async function storeAiEnhancedLogoVariant(client, job, sourceAsset, blob, enhancement) {
  const metadata = recordValue(sourceAsset.metadata);
  const retryToken = readString(job.editable_logo_retry_token);
  const storagePath = `${job.organization_id}/${job.business_id}/${job.crawl_run_id}/derived/ai-enhanced-logo-${sourceAsset.id}${
    retryToken ? `-${retryToken}` : ''
  }.png`;
  const content = Buffer.from(await blob.arrayBuffer());
  const { error: uploadError } = await client.storage
    .from(artifactBucket)
    .upload(storagePath, content, {
      contentType: 'image/png',
      upsert: true,
    });
  if (uploadError) throw new Error('The worker could not save the private AI clean-up image.');
  const { error: artifactError } = await client.from('artifacts').upsert(
    {
      organization_id: job.organization_id,
      business_id: job.business_id,
      crawl_run_id: job.crawl_run_id,
      kind: 'asset',
      label: `AI-cleaned tracing source from ${sourceAsset.label || 'approved logo'}`,
      storage_bucket: artifactBucket,
      storage_path: storagePath,
      content_type: 'image/png',
      byte_size: content.byteLength,
      sha256: createHash('sha256').update(content).digest('hex'),
      metadata: {
        sourceUrl: readString(metadata.sourceUrl),
        pageUrl: readString(metadata.pageUrl),
        assetType: 'logo',
        detail:
          'Private AI clean-up suggestion used only as a reviewable tracing source. The final SVG remains colour-locked to the approved original logo.',
        context: readString(metadata.context),
        logoVariant: 'ai_enhanced',
        privateAiSuggestion: true,
        aiEnhancement: true,
        aiEnhancementModel: enhancement.model,
        aiEnhancementMatte: enhancement.matte,
        ...(enhancement.requestId ? { aiEnhancementRequestId: enhancement.requestId } : {}),
        ...(retryToken ? { retryToken } : {}),
        derivedFromAssetId: sourceAsset.id,
        derivedFromContentType: sourceAsset.content_type || 'image',
        reviewState: 'needs_review',
      },
    },
    { onConflict: 'storage_path' },
  );
  if (artifactError) throw new Error('The worker could not index the private AI clean-up image.');
}

async function storeLogoAppearanceVariants(
  client,
  browser,
  job,
  sourceAsset,
  raster,
  palette,
  sourceReference,
  alphaMatte,
  alphaMatteBlob,
  alphaMatteRequestId,
  appearanceRaster,
  onStored,
) {
  const metadata = recordValue(sourceAsset.metadata);
  const retryToken = readString(job.editable_logo_retry_token);
  const verifiedAppearanceRaster = appearanceRaster ?? sourceReference ?? raster;
  const variants = transparentLogoVariants(imageDataFromRaster(verifiedAppearanceRaster), palette, {
    sourceReference: imageDataFromRaster(verifiedAppearanceRaster),
  });
  const matteVariant = alphaMatte
    ? { key: 'alpha-matte', label: 'ChatGPT alpha matte', data: alphaMatte.data }
    : alphaMattePreview(variants);
  const matteBlob =
    alphaMatteBlob ??
    (await rasterBlobFromPixels(browser, {
      width: alphaMatte?.width ?? verifiedAppearanceRaster.width,
      height: alphaMatte?.height ?? verifiedAppearanceRaster.height,
      data: matteVariant.data,
    }));
  const matteContent = Buffer.from(await matteBlob.arrayBuffer());
  const matteStoragePath = `${job.organization_id}/${job.business_id}/${job.crawl_run_id}/derived/logo-alpha-matte-${sourceAsset.id}${
    retryToken ? `-${retryToken}` : ''
  }.png`;
  const { error: matteUploadError } = await client.storage
    .from(artifactBucket)
    .upload(matteStoragePath, matteContent, {
      contentType: 'image/png',
      upsert: true,
    });
  if (matteUploadError) throw new Error('The worker could not save the alpha matte.');
  const { error: matteArtifactError } = await client.from('artifacts').upsert(
    {
      organization_id: job.organization_id,
      business_id: job.business_id,
      crawl_run_id: job.crawl_run_id,
      kind: 'asset',
      label: `${matteVariant.label} from ${sourceAsset.label || 'approved logo'}`,
      storage_bucket: artifactBucket,
      storage_path: matteStoragePath,
      content_type: 'image/png',
      byte_size: matteContent.byteLength,
      sha256: createHash('sha256').update(matteContent).digest('hex'),
      metadata: {
        sourceUrl: readString(metadata.sourceUrl),
        pageUrl: readString(metadata.pageUrl),
        assetType: 'logo_alpha_matte',
        detail:
          'Private, reviewable high-quality alpha matte. Source-owned geometry and colour regions drive the transparent logo versions.',
        context: readString(metadata.context),
        logoVariant: 'alpha_matte',
        privateAiSuggestion: Boolean(alphaMatteBlob),
        aiAlphaMatte: Boolean(alphaMatteBlob),
        rawAiOutput: Boolean(alphaMatteBlob),
        ...(alphaMatteRequestId ? { aiAlphaMatteRequestId: alphaMatteRequestId } : {}),
        transparentBackground: false,
        derivedFromAssetId: sourceAsset.id,
        derivedFromContentType: sourceAsset.content_type || 'image',
        ...(retryToken ? { retryToken } : {}),
        reviewState: 'needs_review',
      },
    },
    { onConflict: 'storage_path' },
  );
  if (matteArtifactError) throw new Error('The worker could not index the alpha matte.');
  await onStored?.(matteVariant, 0, variants.length);
  for (const [index, variant] of variants.entries()) {
    const blob = await rasterBlobFromPixels(browser, {
      width: verifiedAppearanceRaster.width,
      height: verifiedAppearanceRaster.height,
      data: variant.data,
    });
    const content = Buffer.from(await blob.arrayBuffer());
    const storagePath = `${job.organization_id}/${job.business_id}/${job.crawl_run_id}/derived/logo-${variant.key}-${sourceAsset.id}${
      retryToken ? `-${retryToken}` : ''
    }.png`;
    const { error: uploadError } = await client.storage
      .from(artifactBucket)
      .upload(storagePath, content, {
        contentType: 'image/png',
        upsert: true,
      });
    if (uploadError) throw new Error('The worker could not save a transparent logo version.');
    const { error: artifactError } = await client.from('artifacts').upsert(
      {
        organization_id: job.organization_id,
        business_id: job.business_id,
        crawl_run_id: job.crawl_run_id,
        kind: 'asset',
        label: `${variant.label} transparent logo from ${sourceAsset.label || 'approved logo'}`,
        storage_bucket: artifactBucket,
        storage_path: storagePath,
        content_type: 'image/png',
        byte_size: content.byteLength,
        sha256: createHash('sha256').update(content).digest('hex'),
        metadata: {
          sourceUrl: readString(metadata.sourceUrl),
          pageUrl: readString(metadata.pageUrl),
          assetType: 'logo_variant',
          detail:
            'Private transparent logo version derived from a verified high-fidelity clean-up source. Colours are deterministic and the original geometry is retained.',
          context: readString(metadata.context),
          logoVariant: 'appearance',
          logoAppearance: variant.key,
          transparentBackground: true,
          derivedFromAssetId: sourceAsset.id,
          derivedFromContentType: sourceAsset.content_type || 'image',
          ...(retryToken ? { retryToken } : {}),
          reviewState: 'needs_review',
        },
      },
      { onConflict: 'storage_path' },
    );
    if (artifactError) throw new Error('The worker could not index a transparent logo version.');
    await onStored?.(variant, index + 1, variants.length);
  }
}

async function removePriorLogoAppearanceVariants(client, job, sourceAssetId) {
  const { data: artifacts, error: artifactsError } = await client
    .from('artifacts')
    .select('id, storage_bucket, storage_path, metadata')
    .eq('crawl_run_id', job.crawl_run_id)
    .eq('kind', 'asset')
    .contains('metadata', { derivedFromAssetId: sourceAssetId });
  if (artifactsError) throw new Error('The worker could not locate the previous logo versions.');
  const previousVariants = (artifacts ?? []).filter((artifact) =>
    ['appearance', 'alpha_matte'].includes(readString(recordValue(artifact.metadata).logoVariant)),
  );
  if (!previousVariants.length) return;

  const pathsByBucket = new Map();
  for (const artifact of previousVariants) {
    const bucket = artifact.storage_bucket || artifactBucket;
    pathsByBucket.set(bucket, [...(pathsByBucket.get(bucket) ?? []), artifact.storage_path]);
  }
  for (const [bucket, paths] of pathsByBucket) {
    const { error } = await client.storage.from(bucket).remove(paths);
    if (error) throw new Error('The worker could not remove the previous logo version files.');
  }
  const { error: deleteError } = await client
    .from('artifacts')
    .delete()
    .in(
      'id',
      previousVariants.map((artifact) => artifact.id),
    );
  if (deleteError)
    throw new Error('The worker could not remove the previous logo version records.');
}

async function storeEditableLogoVariant(client, job, sourceAsset, svg, options = {}) {
  const metadata = recordValue(sourceAsset.metadata);
  const isRasterSource = sourceAsset.content_type !== 'image/svg+xml';
  const retryToken = readString(job.editable_logo_retry_token);
  const storagePath = `${job.organization_id}/${job.business_id}/${job.crawl_run_id}/derived/${
    isRasterSource ? 'editable-logo-vtracer' : 'editable-logo'
  }-${sourceAsset.id}${retryToken ? `-${retryToken}` : ''}.svg`;
  const content = Buffer.from(editableSvg(svg), 'utf8');
  const { error: uploadError } = await client.storage
    .from(artifactBucket)
    .upload(storagePath, content, { contentType: 'image/svg+xml', upsert: true });
  if (uploadError) throw new Error('The worker could not save the editable SVG logo.');
  const { error: artifactError } = await client.from('artifacts').upsert(
    {
      organization_id: job.organization_id,
      business_id: job.business_id,
      crawl_run_id: job.crawl_run_id,
      kind: 'asset',
      label: `${
        options.simplifier
          ? 'Geometry-fitted editable SVG'
          : options.aiEnhancement
            ? 'AI-assisted high-fidelity editable SVG'
            : isRasterSource
              ? 'High-fidelity editable SVG'
              : 'Editable SVG'
      } from ${sourceAsset.label || 'approved logo'}`,
      storage_bucket: artifactBucket,
      storage_path: storagePath,
      content_type: 'image/svg+xml',
      byte_size: content.byteLength,
      sha256: createHash('sha256').update(content).digest('hex'),
      metadata: {
        sourceUrl: readString(metadata.sourceUrl),
        pageUrl: readString(metadata.pageUrl),
        assetType: 'logo',
        detail: options.simplifier
          ? 'Private editable SVG traced with geometry fitting for straight lines, sharp corners, and smooth Bézier curves. Original logo colours are retained as editable fill and stroke CSS variables.'
          : options.aiEnhancement
            ? 'Private editable SVG traced from an AI clean-up suggestion that passed a source-shape check. Original logo colours are retained as editable fill and stroke CSS variables.'
            : 'Private editable SVG traced with VTracer from a human-approved logo. Source colours are retained as editable fill and stroke CSS variables.',
        context: readString(metadata.context),
        vectorSuggestion: true,
        logoVariant: 'editable',
        editableColourTokenPrefix: '--siteforge-logo-colour-',
        vectorizer: options.vectorizer ?? (isRasterSource ? 'vtracer' : 'source-svg'),
        ...(options.simplifier ? { svgSimplifier: options.simplifier } : {}),
        ...(options.aiEnhancement
          ? { aiEnhancement: true, aiEnhancementModel: options.aiEnhancementModel }
          : {}),
        ...(retryToken ? { retryToken } : {}),
        derivedFromAssetId: sourceAsset.id,
        derivedFromContentType: sourceAsset.content_type || 'image',
        reviewState: 'needs_review',
      },
    },
    { onConflict: 'storage_path' },
  );
  if (artifactError) throw new Error('The worker could not index the editable SVG logo.');
}

function shouldSimplifyLogoOutline(raster, palette) {
  const width = Number(raster?.width) || 0;
  const height = Number(raster?.height) || 0;
  const longestEdge = Math.max(width, height);
  return (
    Array.isArray(palette) &&
    palette.length <= 2 &&
    longestEdge > 600 &&
    width / Math.max(height, 1) >= 1.35
  );
}

async function resampleLogoForGeometrySimplification(browser, raster) {
  if (!raster?.png) return raster;
  return rasteriseLogo(
    browser,
    new Blob([Buffer.from(raster.png, 'base64')], { type: 'image/png' }),
    {
      longestEdge: 600,
      pixelBudget: 400_000,
    },
  );
}

async function pixelColourCandidates(browser, blob) {
  const raster = await rasteriseLogo(browser, blob, {
    longestEdge: 640,
    pixelBudget: 360_000,
  });
  const palette = logoBrandColours(extractLogoPalette(imageDataFromRaster(raster)));
  return palette.map(({ red, green, blue }, index) => ({
    colour: `#${[red, green, blue]
      .map((value) => Math.round(value).toString(16).padStart(2, '0'))
      .join('')}`.toUpperCase(),
    // Palette order reflects source coverage. Retain every distinct cluster so a small accent
    // inside a long wordmark cannot be dropped by coarse top-frequency buckets.
    occurrenceCount: Math.max(1, palette.length - index),
  }));
}

async function logoColourEvidence(browser, blob, asset, annotation) {
  const metadata = recordValue(asset.metadata);
  const likelyLogo =
    readString(metadata.assetType) === 'logo' ||
    (['primary_logo', 'secondary_mark'].includes(annotation.suggestedRole) &&
      annotation.businessAssociation === 'target_business');
  if (!likelyLogo || annotation.businessAssociation === 'third_party') return [];
  const confidence =
    annotation.suggestedRole === 'primary_logo' &&
    annotation.businessAssociation === 'target_business'
      ? 'high'
      : annotation.businessAssociation === 'unknown'
        ? 'low'
        : 'medium';
  const sourceUrl = readString(metadata.sourceUrl) || undefined;
  const base = {
    assetId: asset.id,
    sourceUrl,
    sourceLabel: asset.label || 'Captured logo asset',
    confidence,
  };
  const evidence = [];
  if (blob.type === 'image/svg+xml') {
    for (const colour of coloursFromSvg(await blob.text())) {
      if (!isBrandColour(colour)) continue;
      evidence.push({
        ...base,
        sourceType: 'logo_vector',
        colour,
        occurrenceCount: 1,
        details: { assetType: 'svg', detectedFrom: 'fill, stroke, or embedded SVG CSS' },
      });
    }
  }
  for (const candidate of await pixelColourCandidates(browser, blob)) {
    evidence.push({
      ...base,
      sourceType: 'logo_pixels',
      colour: candidate.colour,
      occurrenceCount: candidate.occurrenceCount,
      details: { assetType: blob.type || 'image', detectedFrom: 'logo image pixels' },
    });
  }
  return evidence;
}

async function collectRenderedInterfaceEvidence(browser, pages, assertActive = async () => {}) {
  const dnsCache = new Map();
  const context = await browser.newContext({
    serviceWorkers: 'block',
    viewport: { width: 1440, height: 900 },
  });
  await context.route('**/*', async (route) => {
    try {
      await assertPublicUrl(route.request().url(), dnsCache);
      await route.continue();
    } catch {
      await route.abort('blockedbyclient');
    }
  });
  const evidence = [];
  try {
    for (const capturedPage of pages.slice(0, maxBrandEvidencePages)) {
      try {
        await assertActive();
        await assertPublicUrl(capturedPage.url, dnsCache);
        const page = await context.newPage();
        try {
          const response = await page.goto(capturedPage.url, {
            timeout: 30_000,
            waitUntil: 'domcontentloaded',
          });
          if (!response || response.status() >= 400) continue;
          await page.waitForLoadState('networkidle', { timeout: 3_000 }).catch(() => undefined);
          await assertActive();
          const signals = await page.evaluate(() => {
            const hexFromComputed = (value) => {
              const match = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(value);
              return match
                ? `#${match
                    .slice(1, 4)
                    .map((channel) => Number(channel).toString(16).padStart(2, '0'))
                    .join('')}`.toUpperCase()
                : '';
            };
            const colourIsUseful = (colour) => {
              if (!/^#[0-9A-F]{6}$/.test(colour)) return false;
              const red = Number.parseInt(colour.slice(1, 3), 16);
              const green = Number.parseInt(colour.slice(3, 5), 16);
              const blue = Number.parseInt(colour.slice(5, 7), 16);
              const maximum = Math.max(red, green, blue) / 255;
              const minimum = Math.min(red, green, blue) / 255;
              const brightness = (red + green + blue) / (255 * 3);
              return (
                brightness >= 0.08 && brightness <= 0.94 && (maximum - minimum) / maximum >= 0.28
              );
            };
            const values = new Map();
            const add = (colour, sourceType, sourceLabel) => {
              if (!colourIsUseful(colour)) return;
              const key = `${sourceType}|${sourceLabel}|${colour}`;
              const current = values.get(key) ?? {
                colour,
                sourceType,
                sourceLabel,
                occurrenceCount: 0,
              };
              current.occurrenceCount += 1;
              values.set(key, current);
            };
            const rootStyle = getComputedStyle(document.documentElement);
            const variableNames = new Set(
              Array.from(rootStyle).filter((name) => name.startsWith('--')),
            );
            const collectVariableNames = (rules) => {
              for (const rule of rules) {
                if (rule.style) {
                  for (const name of Array.from(rule.style)) {
                    if (name.startsWith('--')) variableNames.add(name);
                  }
                }
                if (rule.cssRules) collectVariableNames(rule.cssRules);
              }
            };
            for (const stylesheet of Array.from(document.styleSheets)) {
              try {
                collectVariableNames(stylesheet.cssRules);
              } catch {
                // Browser security prevents reading some cross-origin stylesheets. Their applied
                // colours are still collected from rendered interface controls below.
              }
            }
            for (const name of variableNames) {
              if (!/(?:brand|primary|secondary|accent|action|button)/i.test(name)) continue;
              const probe = document.createElement('span');
              probe.style.color = `var(${name})`;
              document.body.append(probe);
              add(hexFromComputed(getComputedStyle(probe).color), 'website_css', name);
              probe.remove();
            }
            const controls = Array.from(
              document.querySelectorAll(
                'header, nav, button, a[href], input[type="submit"], [role="button"]',
              ),
            ).slice(0, 300);
            for (const element of controls) {
              const bounds = element.getBoundingClientRect();
              if (!bounds.width || !bounds.height || getComputedStyle(element).display === 'none')
                continue;
              const style = getComputedStyle(element);
              const label = element.matches('header, nav')
                ? element.tagName.toLowerCase()
                : element.matches('button, input[type="submit"], [role="button"]')
                  ? 'interactive control'
                  : 'link';
              const textColour = hexFromComputed(style.color);
              add(hexFromComputed(style.backgroundColor), 'rendered_ui', `${label} background`);
              if (textColour !== '#0000EE') add(textColour, 'rendered_ui', `${label} text`);
              if (label !== 'link') {
                add(hexFromComputed(style.borderTopColor), 'rendered_ui', `${label} border`);
              }
            }
            return [...values.values()];
          });
          evidence.push(
            ...signals.map((signal) => ({
              ...signal,
              sourceUrl: capturedPage.url,
              confidence: signal.sourceType === 'website_css' ? 'high' : 'medium',
              details: {
                pageType: capturedPage.page_type || 'page',
                detectedFrom: signal.sourceLabel,
              },
            })),
          );
          await assertActive();
        } finally {
          await page.close();
        }
      } catch {
        // Brand-colour enrichment never invalidates a completed capture or its asset analysis.
      }
    }
  } finally {
    await context.close();
  }
  return evidence;
}

async function saveBrandColourEvidence(client, job, evidence) {
  const { error: deleteError } = await client
    .from('brand_colour_evidence')
    .delete()
    .eq('crawl_run_id', job.crawl_run_id);
  if (deleteError) throw new Error('The worker could not refresh previous brand-colour evidence.');
  const unique = new Map();
  for (const item of evidence) {
    const directLogoColour = item.sourceType === 'logo_vector' || item.sourceType === 'logo_pixels';
    if (!(directLogoColour ? isLogoBrandColour(item.colour) : isBrandColour(item.colour))) continue;
    const sourceKey = `${item.sourceType}|${item.assetId ?? item.sourceUrl ?? ''}|${item.sourceLabel}|${item.colour}`;
    const current = unique.get(sourceKey);
    if (current) current.occurrence_count += item.occurrenceCount;
    else {
      unique.set(sourceKey, {
        organization_id: job.organization_id,
        business_id: job.business_id,
        crawl_run_id: job.crawl_run_id,
        asset_id: item.assetId ?? null,
        source_type: item.sourceType,
        source_key: sourceKey,
        source_label: item.sourceLabel,
        source_url: item.sourceUrl ?? null,
        colour: item.colour,
        occurrence_count: item.occurrenceCount,
        confidence: item.confidence,
        details: item.details,
      });
    }
  }
  const records = [...unique.values()];
  if (!records.length) return 0;
  const { error } = await client.from('brand_colour_evidence').insert(records);
  if (error) throw new Error('The worker could not save brand-colour evidence.');
  return records.length;
}

async function analyzeAsset({ apiKey, model, blob, context, signal }) {
  const prompt = [
    'You are creating a private draft annotation for one public website image.',
    'Describe only directly observable visual content. Page context may help orientation but is not proof.',
    'Never claim a project, client, qualification, service, location, ownership, endorsement, or business relationship unless visible text in the image proves it.',
    'If a logo belongs to a third party or you cannot determine association, use third_party or unknown.',
    'Use the output only as a human-review suggestion for a redesign workflow.',
    `Source context: ${JSON.stringify(context)}`,
  ].join('\n');
  const image = await imageInput(blob, signal);
  throwIfAborted(signal);
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    signal: signal
      ? AbortSignal.any([AbortSignal.timeout(requestTimeoutMs), signal])
      : AbortSignal.timeout(requestTimeoutMs),
    body: JSON.stringify({
      model,
      store: false,
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: prompt },
            { type: 'input_image', image_url: image, detail: 'high' },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'asset_annotation',
          strict: true,
          schema: annotationSchema(),
        },
      },
    }),
  });
  if (!response.ok) throw new Error(`The vision provider returned ${response.status}.`);
  const responseBody = await response.json();
  const output = JSON.parse(outputText(responseBody));
  return {
    observedDescription: readString(output.observed_description),
    visibleText: readStringList(output.visible_text),
    suggestedRole: supportedRoles.has(output.suggested_role) ? output.suggested_role : 'unknown',
    businessAssociation: supportedAssociations.has(output.business_association)
      ? output.business_association
      : 'unknown',
    safeReuseNote: readString(output.safe_reuse_note),
    cautions: readStringList(output.cautions),
    confidence: supportedConfidence.has(output.confidence) ? output.confidence : 'low',
    raw: output,
    usage: responseBody.usage,
  };
}

async function assertJobActive(client, job, workerId) {
  const { data, error } = await client
    .from('asset_analysis_jobs')
    .select('status, worker_id, cancel_requested_at')
    .eq('id', job.id)
    .maybeSingle();
  if (error) throw new Error('The worker could not confirm the asset-analysis state.');
  if (data?.cancel_requested_at) throw new AssetAnalysisCancelledError();
  if (!data || data.status !== 'running' || data.worker_id !== workerId) {
    throw new Error('The asset-analysis worker lease was lost.');
  }
}

function createCancellationMonitor(client, job, workerId) {
  const controller = new AbortController();
  let stopped = false;
  let cancellationDetected = false;
  let checking = false;

  const check = async () => {
    if (stopped || checking || cancellationDetected) return;
    checking = true;
    try {
      const { data } = await client
        .from('asset_analysis_jobs')
        .select('cancel_requested_at')
        .eq('id', job.id)
        .eq('worker_id', workerId)
        .maybeSingle();
      if (data?.cancel_requested_at) {
        cancellationDetected = true;
        controller.abort(new AssetAnalysisCancelledError());
      }
    } finally {
      checking = false;
    }
  };

  const timer = setInterval(() => void check(), cancellationPollMs);
  const heartbeat = setInterval(() => {
    void client
      .from('asset_analysis_jobs')
      .update({ heartbeat_at: new Date().toISOString() })
      .eq('id', job.id)
      .eq('worker_id', workerId)
      .eq('status', 'running')
      .is('cancel_requested_at', null);
  }, workerHeartbeatMs);
  void check();
  return {
    signal: controller.signal,
    async assertActive() {
      if (cancellationDetected) throw new AssetAnalysisCancelledError();
      await assertJobActive(client, job, workerId);
      if (cancellationDetected) throw new AssetAnalysisCancelledError();
    },
    stop() {
      stopped = true;
      clearInterval(timer);
      clearInterval(heartbeat);
    },
  };
}

async function updateProgress(client, job, workerId, patch) {
  const { data, error } = await client
    .from('asset_analysis_jobs')
    .update(patch)
    .eq('id', job.id)
    .eq('worker_id', workerId)
    .eq('status', 'running')
    .is('cancel_requested_at', null)
    .select('id');
  if (error) throw new Error('The worker could not save asset-analysis progress.');
  if (!data?.length) await assertJobActive(client, job, workerId);
  if (!data?.length) throw new Error('The asset-analysis worker lease was lost.');
}

async function processJob(client, job, workerId, apiKey, model) {
  const cancellation = createCancellationMonitor(client, job, workerId);
  let analyzedOutputCount = 0;
  let savedEvidenceCount;
  let savedLogoVersionCount = 0;
  try {
    const { data: business, error: businessError } = await client
      .from('businesses')
      .select('name')
      .eq('id', job.business_id)
      .single();
    if (businessError || !business)
      throw new Error('The worker could not load the business context.');
    const { data: assets, error: assetError } = await client
      .from('artifacts')
      .select('*')
      .eq('crawl_run_id', job.crawl_run_id)
      .eq('kind', 'asset')
      .order('created_at');
    if (assetError) throw new Error('The worker could not load the private visual assets.');
    const savedAiEnhancedLogoBySourceId = new Map();
    for (const candidate of [...(assets ?? [])].sort(
      (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
    )) {
      const metadata = recordValue(candidate.metadata);
      const sourceAssetId = readString(metadata.derivedFromAssetId);
      if (
        metadata.logoVariant === 'ai_enhanced' &&
        sourceAssetId &&
        !savedAiEnhancedLogoBySourceId.has(sourceAssetId)
      ) {
        savedAiEnhancedLogoBySourceId.set(sourceAssetId, candidate);
      }
    }
    const { data: pages, error: pagesError } = await client
      .from('crawl_pages')
      .select('url, page_type, title')
      .eq('crawl_run_id', job.crawl_run_id)
      .eq('capture_status', 'ready')
      .order('created_at')
      .limit(maxBrandEvidencePages);
    if (pagesError) throw new Error('The worker could not load captured pages for brand evidence.');
    const { data: savedAnnotations, error: savedAnnotationsError } = await client
      .from('asset_annotations')
      .select('asset_id, suggested_role, business_association, review_state, model_output')
      .eq('crawl_run_id', job.crawl_run_id);
    if (savedAnnotationsError)
      throw new Error('The worker could not load saved visual suggestions for refresh.');
    const annotationsByAsset = new Map(
      (savedAnnotations ?? []).map((annotation) => [
        annotation.asset_id,
        storedAnnotationFromRow(annotation),
      ]),
    );
    const { data: brandKits, error: brandKitsError } = await client
      .from('brand_kits')
      .select('primary_logo_artifact_id')
      .eq('business_id', job.business_id)
      .order('version', { ascending: false })
      .limit(1);
    if (brandKitsError) throw new Error('The worker could not load the Brand Kit logo choice.');
    const selectedPrimaryLogoIds = new Set(
      (brandKits ?? []).map((kit) => readString(kit.primary_logo_artifact_id)).filter(Boolean),
    );
    const analysisScope = ['brand_colours', 'logo_versions'].includes(
      readString(job.analysis_scope),
    )
      ? readString(job.analysis_scope)
      : 'full';
    const colourOnly = analysisScope === 'brand_colours';
    const logoVersionsOnly = analysisScope === 'logo_versions';
    if (colourOnly && !selectedPrimaryLogoIds.size) {
      throw new Error(
        'Choose an original primary logo in the Brand Kit before redoing its colours.',
      );
    }
    const retryEditableLogoAssetId = readString(job.editable_logo_retry_asset_id);
    const createEditableSvg = job.editable_logo_generation_enabled === true;
    const simplifyEditableLogoGeometry = job.editable_logo_simplification_enabled === true;
    const editableLogoVectorizerProvider =
      createEditableSvg && readString(job.editable_logo_vectorizer_provider) === 'vectorizer_ai'
        ? 'vectorizer_ai'
        : 'vtracer';
    const conversionAnnotation = (asset) => {
      const annotation = annotationsByAsset.get(asset.id);
      if (
        annotation &&
        annotation.reviewState === 'approved' &&
        annotation.businessAssociation === 'target_business' &&
        ['primary_logo', 'secondary_mark'].includes(annotation.suggestedRole)
      ) {
        return annotation;
      }
      if (!selectedPrimaryLogoIds.has(asset.id)) return annotation;
      return {
        suggestedRole: 'primary_logo',
        businessAssociation: 'target_business',
        reviewState: 'approved',
        retryable: false,
      };
    };
    const derivedFromAssetIds = new Set(
      (assets ?? [])
        .filter((asset) => isDerivedVectorSuggestion(asset))
        .map((asset) => readString(recordValue(asset.metadata).derivedFromAssetId))
        .filter(Boolean),
    );
    const editableVariantFromAssetIds = new Set(
      (assets ?? [])
        .filter((asset) => {
          const metadata = recordValue(asset.metadata);
          return (
            metadata.logoVariant === 'editable' &&
            (metadata.vectorizer === 'vtracer' ||
              readString(metadata.derivedFromContentType) === 'image/svg+xml')
          );
        })
        .map((asset) => readString(recordValue(asset.metadata).derivedFromAssetId))
        .filter(Boolean),
    );
    const selectedAssets = uniqueAssetsByContent(
      (assets ?? []).filter((asset) => {
        if (isDerivedVectorSuggestion(asset)) return false;
        if (colourOnly) return selectedPrimaryLogoIds.has(asset.id);
        if (logoVersionsOnly) return asset.id === retryEditableLogoAssetId;
        return (
          isSelectedForAnalysis(asset) ||
          selectedPrimaryLogoIds.has(asset.id) ||
          asset.id === retryEditableLogoAssetId
        );
      }),
      selectedPrimaryLogoIds,
    );
    const assetsNeedingAnalysis = analysisScope === 'full' ? selectedAssets : [];
    const vectorCandidates =
      createEditableSvg && logoVersionsOnly && retryEditableLogoAssetId
        ? selectedAssets.filter(
            (asset) =>
              asset.id === retryEditableLogoAssetId &&
              canCreateEditableLogoVariant(asset, conversionAnnotation(asset)),
          )
        : [];
    const totalItems =
      assetsNeedingAnalysis.length +
      vectorCandidates.length +
      (analysisScope === 'full'
        ? Math.min((pages ?? []).length, maxBrandEvidencePages)
        : selectedAssets.length);
    await updateProgress(client, job, workerId, {
      progress_phase: 'preparing',
      progress_detail: colourOnly
        ? 'Loading the selected original logo only. Other assets and captured pages will not be reanalysed.'
        : assetsNeedingAnalysis.length
          ? retryEditableLogoAssetId
            ? 'Private visual assets loaded. Preparing newly captured images for analysis alongside the logo refresh.'
            : 'Private visual assets loaded. Preparing a fresh analysis of every selected image.'
          : vectorCandidates.length
            ? 'Preparing high-fidelity transparent logo versions from the approved logo.'
            : 'Existing visual suggestions retained. Refreshing deterministic brand evidence only.',
      current_asset_id: null,
      total_items: totalItems,
      completed_items: 0,
    });
    if (retryEditableLogoAssetId) {
      await cancellation.assertActive();
      await removePriorLogoAppearanceVariants(client, job, retryEditableLogoAssetId);
      await updateProgress(client, job, workerId, {
        progress_phase: 'preparing_logo_enhancement',
        progress_detail:
          'Previous generated logo versions removed. Preparing the selected logo only.',
        current_asset_id: retryEditableLogoAssetId,
        total_items: totalItems,
        completed_items: 0,
      });
    }

    let completedItems = 0;
    let progressQueue = Promise.resolve();
    const queueProgress = (patch) => {
      progressQueue = progressQueue.then(() => updateProgress(client, job, workerId, patch));
      return progressQueue;
    };

    await runWithConcurrency(assetsNeedingAnalysis, assetAnalysisConcurrency(), async (asset) => {
      await cancellation.assertActive();
      await queueProgress({
        progress_phase: 'analysing_asset',
        progress_detail: `Analysing captured visual assets in parallel (${assetAnalysisConcurrency()} at a time).`,
        current_asset_id: asset.id,
        total_items: totalItems,
        completed_items: completedItems,
      });
      const { data: blob, error: downloadError } = await client.storage
        .from(asset.storage_bucket || artifactBucket)
        .download(asset.storage_path);
      if (downloadError || !blob) {
        throw new Error(`The worker could not download a private visual asset (${asset.id}).`);
      }
      await cancellation.assertActive();
      const metadata = recordValue(asset.metadata);
      const sourceContext = {
        businessName: business.name,
        sourcePageUrl: readString(metadata.pageUrl),
        originalImageUrl: readString(metadata.sourceUrl),
        capturedType: readString(metadata.assetType) || 'image',
        altOrDetail: readString(metadata.detail),
        surroundingContext: readString(metadata.context),
      };
      let annotation;
      if (!apiKey) {
        annotation = {
          observedDescription: '',
          visibleText: [],
          suggestedRole: 'unknown',
          businessAssociation: 'unknown',
          safeReuseNote: 'Review this captured image manually before deciding whether to reuse it.',
          cautions: [
            'Vision analysis is unavailable because no server-only model key is configured.',
          ],
          confidence: 'low',
          raw: { processingStatus: 'unavailable', detail: 'Vision analysis is unavailable.' },
        };
      } else
        try {
          annotation = await analyzeAsset({
            apiKey,
            model,
            blob,
            context: sourceContext,
            signal: cancellation.signal,
          });
        } catch (error) {
          await cancellation.assertActive();
          const detail = safeAssetPreparationDetail(error);
          console.warn(`[asset-analysis-worker] skipped model analysis for ${asset.id}: ${detail}`);
          annotation = {
            observedDescription: '',
            visibleText: [],
            suggestedRole: 'unknown',
            businessAssociation: 'unknown',
            safeReuseNote:
              'Review this captured image manually before deciding whether to reuse it.',
            cautions: [detail],
            confidence: 'low',
            raw: { processingStatus: 'unavailable', detail },
          };
        }
      if (annotation.usage) {
        await recordAiUsage(client, {
          organizationId: job.organization_id,
          businessId: job.business_id,
          source: 'asset_analysis',
          model,
          usage: annotation.usage,
          metadata: { analysisJobId: job.id, assetId: asset.id, crawlRunId: job.crawl_run_id },
        });
      }
      await cancellation.assertActive();
      const { error: annotationError } = await client.from('asset_annotations').upsert(
        {
          organization_id: job.organization_id,
          business_id: job.business_id,
          crawl_run_id: job.crawl_run_id,
          asset_id: asset.id,
          analysis_job_id: job.id,
          analysis_run_token: job.run_token,
          source_context: sourceContext,
          observed_description: annotation.observedDescription,
          visible_text: annotation.visibleText,
          suggested_role: annotation.suggestedRole,
          business_association: annotation.businessAssociation,
          safe_reuse_note: annotation.safeReuseNote,
          cautions: annotation.cautions,
          confidence: annotation.confidence,
          review_state: 'needs_review',
          model,
          model_output: annotation.raw,
          analyzed_at: new Date().toISOString(),
        },
        { onConflict: 'asset_id' },
      );
      if (annotationError) throw new Error('The worker could not save an asset annotation.');
      annotationsByAsset.set(asset.id, {
        suggestedRole: annotation.suggestedRole,
        businessAssociation: annotation.businessAssociation,
        reviewState: 'needs_review',
        retryable: annotation.raw?.processingStatus === 'unavailable',
      });
      completedItems += 1;
      analyzedOutputCount += 1;
      await queueProgress({
        progress_phase: 'analysing_asset',
        progress_detail:
          annotation.raw?.processingStatus === 'unavailable'
            ? 'An image needs manual review after preparation failed. Continuing with the remaining assets.'
            : 'Visual suggestion saved. Continuing with the remaining assets.',
        current_asset_id: asset.id,
        total_items: totalItems,
        completed_items: completedItems,
      });
    });

    let browser = await chromium.launch({ headless: true });
    try {
      const brandEvidence = [];
      for (const asset of selectedAssets) {
        await cancellation.assertActive();
        if (isDerivedVectorSuggestion(asset)) continue;
        const existingAnnotation = conversionAnnotation(asset);
        if (existingAnnotation && !existingAnnotation.retryable) {
          const metadata = recordValue(asset.metadata);
          const likelyLogo =
            readString(metadata.assetType) === 'logo' ||
            ['primary_logo', 'secondary_mark'].includes(existingAnnotation.suggestedRole);
          if (likelyLogo) {
            const { data: blob, error: downloadError } = await client.storage
              .from(asset.storage_bucket || artifactBucket)
              .download(asset.storage_path);
            if (!downloadError && blob) {
              await cancellation.assertActive();
              brandEvidence.push(
                ...(await logoColourEvidence(browser, blob, asset, existingAnnotation)),
              );
              await cancellation.assertActive();
              if (
                asset.id === retryEditableLogoAssetId &&
                canCreateEditableLogoVariant(asset, existingAnnotation)
              ) {
                await updateProgress(client, job, workerId, {
                  progress_phase: 'preparing_logo_enhancement',
                  progress_detail:
                    'Preparing the highest-quality captured logo for private clean-up and tracing.',
                  current_asset_id: asset.id,
                  total_items: totalItems,
                  completed_items: completedItems,
                });
                try {
                  const sourceForTracing = await highestQualityLogoSource(
                    asset,
                    blob,
                    cancellation.signal,
                  );
                  let svg;
                  let svgSimplifier;
                  let usedAiEnhancement = false;
                  let enhancementModel;
                  if (asset.content_type === 'image/svg+xml') {
                    await updateProgress(client, job, workerId, {
                      progress_phase: 'retaining_source_svg',
                      progress_detail:
                        'The approved logo is already a vector, so its original SVG is retained without AI clean-up.',
                      current_asset_id: asset.id,
                      total_items: totalItems,
                      completed_items: completedItems,
                    });
                    svg = await editableSvgSource(sourceForTracing);
                  } else {
                    const sourceRaster = await rasteriseLogo(browser, sourceForTracing);
                    const sourceImageData = imageDataFromRaster(sourceRaster);
                    const referencePalette = extractLogoPalette(sourceImageData);
                    const aiMatte = enhancementMatte(referencePalette);
                    const appearanceWidth = Math.min(1_400, Math.max(sourceRaster.width, 1_024));
                    const appearanceRaster = await rasteriseLogo(browser, sourceForTracing, {
                      width: appearanceWidth,
                      height: Math.max(
                        1,
                        Math.round((appearanceWidth * sourceRaster.height) / sourceRaster.width),
                      ),
                      background: aiMatte,
                    });
                    let tracingRaster = sourceRaster;
                    let shapeReferenceRaster = sourceRaster;
                    let alphaMatteRaster;
                    let alphaMatteBlob;
                    let alphaMatteRequestId;
                    enhancementModel =
                      process.env.SITEFORGE_LOGO_ENHANCEMENT_MODEL?.trim() || 'gpt-image-2';
                    const dimensions = enhancementDimensions(
                      sourceRaster.width,
                      sourceRaster.height,
                    );
                    let alphaMatteInput;
                    let alphaMatteRequest;

                    if (apiKey && editableLogoVectorizerProvider !== 'vectorizer_ai') {
                      alphaMatteInput = await rasteriseLogo(browser, sourceForTracing, {
                        ...dimensions,
                        background: aiMatte,
                      });
                      await updateProgress(client, job, workerId, {
                        progress_phase: 'enhancing_logo_and_alpha_matte',
                        progress_detail:
                          'ChatGPT is cleaning the logo and preparing its high-resolution alpha matte at the same time.',
                        current_asset_id: asset.id,
                        total_items: totalItems,
                        completed_items: completedItems,
                      });
                      alphaMatteRequest = createAlphaMatteWithOpenAi({
                        apiKey,
                        model: enhancementModel,
                        raster: alphaMatteInput,
                        signal: cancellation.signal,
                      })
                        .then((result) => ({ result }))
                        .catch((error) => ({ error }));
                    }

                    if (editableLogoVectorizerProvider === 'vectorizer_ai') {
                      await updateProgress(client, job, workerId, {
                        progress_phase: 'preparing_vectorizer_source',
                        progress_detail:
                          'Preparing the original captured logo for direct Vectorizer.AI conversion. ChatGPT remastering is skipped.',
                        current_asset_id: asset.id,
                        total_items: totalItems,
                        completed_items: completedItems,
                      });
                    } else if (simplifyEditableLogoGeometry) {
                      const savedAiEnhancedLogo = savedAiEnhancedLogoBySourceId.get(asset.id);
                      let reusedSavedAiEnhancement = false;
                      if (savedAiEnhancedLogo) {
                        try {
                          await updateProgress(client, job, workerId, {
                            progress_phase: 'reusing_ai_enhanced_logo',
                            progress_detail:
                              'Reusing the saved ChatGPT clean-up image for this logo. No new AI request is needed.',
                            current_asset_id: asset.id,
                            total_items: totalItems,
                            completed_items: completedItems,
                          });
                          tracingRaster = await rasteriseLogo(
                            browser,
                            await loadArtifactBlob(client, savedAiEnhancedLogo),
                            {
                              ...dimensions,
                              background:
                                readString(
                                  recordValue(savedAiEnhancedLogo.metadata).aiEnhancementMatte,
                                ) || aiMatte,
                            },
                          );
                          shapeReferenceRaster = await rasteriseLogo(browser, sourceForTracing, {
                            ...dimensions,
                            background:
                              readString(
                                recordValue(savedAiEnhancedLogo.metadata).aiEnhancementMatte,
                              ) || aiMatte,
                          });
                          usedAiEnhancement = true;
                          enhancementModel =
                            readString(
                              recordValue(savedAiEnhancedLogo.metadata).aiEnhancementModel,
                            ) || enhancementModel;
                          reusedSavedAiEnhancement = true;
                          await updateProgress(client, job, workerId, {
                            progress_phase: 'ai_enhanced_logo_ready',
                            progress_detail:
                              'Reused the saved AI clean-up image. Original logo colours are now locked for the SVG trace.',
                            current_asset_id: asset.id,
                            total_items: totalItems,
                            completed_items: completedItems,
                          });
                        } catch (error) {
                          console.warn(
                            `Could not reuse saved AI clean-up image for ${asset.id}; requesting a replacement.`,
                            error,
                          );
                        }
                      }

                      if (reusedSavedAiEnhancement) {
                        // The saved private remaster is the tracing source for this retry.
                      } else if (!apiKey) {
                        await updateProgress(client, job, workerId, {
                          progress_phase: 'ai_cleanup_unavailable',
                          progress_detail:
                            'AI logo clean-up is unavailable without a server-only API key. Continuing with the highest-quality source.',
                          current_asset_id: asset.id,
                          total_items: totalItems,
                          completed_items: completedItems,
                        });
                      } else {
                        const enhancementInput = alphaMatteInput;
                        shapeReferenceRaster = enhancementInput;
                        await cancellation.assertActive();
                        await updateProgress(client, job, workerId, {
                          progress_phase: 'enhancing_logo_and_alpha_matte',
                          progress_detail:
                            'ChatGPT is cleaning compression artefacts and preparing the alpha matte in parallel.',
                          current_asset_id: asset.id,
                          total_items: totalItems,
                          completed_items: completedItems,
                        });
                        let enhancement;
                        try {
                          enhancement = await enhanceLogoWithOpenAi({
                            apiKey,
                            model: enhancementModel,
                            raster: enhancementInput,
                            matte: aiMatte,
                            signal: cancellation.signal,
                          });
                        } catch (error) {
                          console.warn(
                            `Could not create AI logo clean-up for ${asset.id}; continuing to the independent ChatGPT alpha matte.`,
                            error,
                          );
                          await updateProgress(client, job, workerId, {
                            progress_phase: 'ai_cleanup_unavailable',
                            progress_detail:
                              'The optional AI clean-up request failed. Continuing with the independent ChatGPT alpha matte request.',
                            current_asset_id: asset.id,
                            total_items: totalItems,
                            completed_items: completedItems,
                          });
                        }
                        await cancellation.assertActive();
                        if (enhancement) {
                          await updateProgress(client, job, workerId, {
                            progress_phase: 'validating_logo_enhancement',
                            progress_detail:
                              'Checking the AI result against the original logo before allowing it into the SVG trace.',
                            current_asset_id: asset.id,
                            total_items: totalItems,
                            completed_items: completedItems,
                          });
                          const enhancedRaster = await rasteriseLogo(browser, enhancement.blob, {
                            ...dimensions,
                            background: aiMatte,
                          });
                          const fidelity = enhancementFidelity(enhancementInput, enhancedRaster);
                          if (fidelity.accepted) {
                            await storeAiEnhancedLogoVariant(client, job, asset, enhancement.blob, {
                              model: enhancementModel,
                              requestId: enhancement.requestId,
                              matte: aiMatte,
                            });
                            tracingRaster = enhancedRaster;
                            usedAiEnhancement = true;
                            await updateProgress(client, job, workerId, {
                              progress_phase: 'ai_enhanced_logo_ready',
                              progress_detail:
                                'AI clean-up passed the source-shape check. Original logo colours are now locked for the SVG trace.',
                              current_asset_id: asset.id,
                              total_items: totalItems,
                              completed_items: completedItems,
                            });
                          } else {
                            await updateProgress(client, job, workerId, {
                              progress_phase: 'ai_enhancement_rejected',
                              progress_detail:
                                'AI clean-up did not preserve the original shape closely enough. Continuing with the highest-quality source instead.',
                              current_asset_id: asset.id,
                              total_items: totalItems,
                              completed_items: completedItems,
                            });
                          }
                        }
                      }
                    } else {
                      await updateProgress(client, job, workerId, {
                        progress_phase: 'creating_alpha_matte',
                        progress_detail:
                          'Creating the ChatGPT alpha matte directly. The redundant AI clean-up request is skipped for faster logo versions.',
                        current_asset_id: asset.id,
                        total_items: totalItems,
                        completed_items: completedItems,
                      });
                    }

                    await cancellation.assertActive();
                    if (alphaMatteRequest) {
                      await updateProgress(client, job, workerId, {
                        progress_phase: 'creating_alpha_matte',
                        progress_detail:
                          'Finalising the high-resolution black-and-white alpha matte that was prepared in parallel.',
                        current_asset_id: asset.id,
                        total_items: totalItems,
                        completed_items: completedItems,
                      });
                      const alphaMatteResponse = await alphaMatteRequest;
                      let aiMatteResult = alphaMatteResponse.result;
                      if (alphaMatteResponse.error && alphaMatteInput) {
                        await updateProgress(client, job, workerId, {
                          progress_phase: 'retrying_alpha_matte',
                          progress_detail:
                            'The first ChatGPT matte request was unavailable. Retrying the matte once without substituting a generated pixel mask.',
                          current_asset_id: asset.id,
                          total_items: totalItems,
                          completed_items: completedItems,
                        });
                        try {
                          aiMatteResult = await createAlphaMatteWithOpenAi({
                            apiKey,
                            model: enhancementModel,
                            raster: alphaMatteInput,
                            signal: cancellation.signal,
                          });
                        } catch (error) {
                          throw new Error(
                            'ChatGPT did not return an alpha matte after two attempts. No replacement pixel mask was created.',
                            { cause: error },
                          );
                        }
                      }
                      if (!aiMatteResult) {
                        throw new Error(
                          'ChatGPT did not return an alpha matte. No replacement pixel mask was created.',
                          { cause: alphaMatteResponse.error },
                        );
                      }
                      alphaMatteBlob = aiMatteResult.blob;
                      alphaMatteRequestId = aiMatteResult.requestId;
                      alphaMatteRaster = await rasteriseLogo(browser, alphaMatteBlob, {
                        longestEdge: 2_048,
                        pixelBudget: 1_500_000,
                        background: '#ffffff',
                      });
                      if (
                        tracingRaster.width !== alphaMatteRaster.width ||
                        tracingRaster.height !== alphaMatteRaster.height
                      ) {
                        tracingRaster = await rasteriseLogo(
                          browser,
                          await rasterBlobFromPixels(browser, imageDataFromRaster(tracingRaster)),
                          {
                            width: alphaMatteRaster.width,
                            height: alphaMatteRaster.height,
                            background: aiMatte,
                          },
                        );
                        shapeReferenceRaster = await rasteriseLogo(
                          browser,
                          await rasterBlobFromPixels(
                            browser,
                            imageDataFromRaster(shapeReferenceRaster),
                          ),
                          {
                            width: alphaMatteRaster.width,
                            height: alphaMatteRaster.height,
                            background: aiMatte,
                          },
                        );
                      }
                    }
                    await cancellation.assertActive();
                    await updateProgress(client, job, workerId, {
                      progress_phase: 'creating_logo_versions',
                      progress_detail:
                        'Removing the flat background and saving transparent original, black, white, and accent logo versions.',
                      current_asset_id: asset.id,
                      total_items: totalItems,
                      completed_items: completedItems,
                    });
                    await storeLogoAppearanceVariants(
                      client,
                      browser,
                      job,
                      asset,
                      tracingRaster,
                      referencePalette,
                      shapeReferenceRaster,
                      alphaMatteRaster,
                      alphaMatteBlob,
                      alphaMatteRequestId,
                      appearanceRaster,
                      async (variant, savedCount, totalVariants) => {
                        savedLogoVersionCount = Math.max(savedLogoVersionCount, savedCount);
                        await cancellation.assertActive();
                        await updateProgress(client, job, workerId, {
                          progress_phase:
                            savedCount === 0 ? 'alpha_matte_ready' : 'saving_logo_version',
                          progress_detail:
                            savedCount === 0
                              ? 'Saved the reviewable alpha matte. Transparent logo versions are now being created from it.'
                              : `Saved ${variant.label} transparent logo (${savedCount} of ${totalVariants}). It is now available in Assets.`,
                          current_asset_id: asset.id,
                          total_items: totalItems,
                          completed_items: completedItems,
                        });
                      },
                    );
                    await cancellation.assertActive();
                    if (createEditableSvg) {
                      if (
                        simplifyEditableLogoGeometry &&
                        shouldSimplifyLogoOutline(tracingRaster, referencePalette)
                      ) {
                        await updateProgress(client, job, workerId, {
                          progress_phase: 'fitting_logo_geometry',
                          progress_detail:
                            'Detecting straight lines, corners and curved sections before the geometry-fitted SVG trace.',
                          current_asset_id: asset.id,
                          total_items: totalItems,
                          completed_items: completedItems,
                        });
                        tracingRaster = await resampleLogoForGeometrySimplification(
                          browser,
                          tracingRaster,
                        );
                      }

                      await cancellation.assertActive();
                      await updateProgress(client, job, workerId, {
                        progress_phase: 'vectorising_logo',
                        progress_detail:
                          editableLogoVectorizerProvider === 'vectorizer_ai'
                            ? 'Sending the original colour-locked logo to Vectorizer.AI for an editable SVG trace.'
                            : 'Tracing editable SVG shapes and locking the approved source colours into the result.',
                        current_asset_id: asset.id,
                        total_items: totalItems,
                        completed_items: completedItems,
                      });
                      tracingRaster = lockRasterColoursToSource(
                        imageDataFromRaster(tracingRaster),
                        sourceImageData,
                        referencePalette,
                      );
                      if (editableLogoVectorizerProvider === 'vectorizer_ai') {
                        svg = await vectorizeWithVectorizerAi({
                          apiId: process.env.VECTORIZER_AI_API_ID?.trim(),
                          apiSecret: process.env.VECTORIZER_AI_API_SECRET?.trim(),
                          raster: await rasterBlobFromPixels(browser, tracingRaster),
                          signal: cancellation.signal,
                        });
                      } else {
                        const vectorTrace = await vectorizeRasterLogo(tracingRaster, {
                          referencePalette,
                          simplifyGeometry: simplifyEditableLogoGeometry,
                        });
                        svg = vectorTrace.svg;
                        svgSimplifier = vectorTrace.simplifier;
                      }
                    }
                  }
                  if (createEditableSvg) {
                    if (
                      editableLogoVectorizerProvider === 'vtracer' &&
                      canCreateVectorSuggestion(asset, existingAnnotation)
                    ) {
                      await storeVectorSuggestion(client, job, asset, svg);
                    }
                    await storeEditableLogoVariant(client, job, asset, svg, {
                      aiEnhancement: usedAiEnhancement,
                      aiEnhancementModel: enhancementModel,
                      simplifier: svgSimplifier,
                      vectorizer: editableLogoVectorizerProvider,
                    });
                    derivedFromAssetIds.add(asset.id);
                    editableVariantFromAssetIds.add(asset.id);
                  }
                } catch (error) {
                  if (asset.id === retryEditableLogoAssetId) {
                    throw new Error(
                      `SVG conversion failed: ${error instanceof Error ? error.message : 'The vectoriser could not create an editable SVG.'}`,
                      { cause: error },
                    );
                  }
                  await updateProgress(client, job, workerId, {
                    progress_phase: 'vectorisation_unavailable',
                    progress_detail:
                      'The optional SVG suggestion could not be created. The approved original logo remains available.',
                    current_asset_id: asset.id,
                    total_items: totalItems,
                    completed_items: completedItems,
                  });
                }
                completedItems += 1;
              }
            }
          }
          await updateProgress(client, job, workerId, {
            progress_phase: 'retaining_asset_review',
            progress_detail: 'Existing visual suggestion retained without another model call.',
            current_asset_id: asset.id,
            total_items: totalItems,
            completed_items: completedItems,
          });
          continue;
        }
      }
      await cancellation.assertActive();
      await updateProgress(client, job, workerId, {
        progress_phase: 'collecting_brand_evidence',
        progress_detail: 'Detecting primary and accent evidence from the logo and captured pages.',
        current_asset_id: null,
        total_items: totalItems,
        completed_items: completedItems,
      });
      const interfaceEvidence =
        analysisScope === 'full'
          ? await collectRenderedInterfaceEvidence(browser, pages ?? [], () =>
              cancellation.assertActive(),
            )
          : [];
      brandEvidence.push(...interfaceEvidence);
      completedItems +=
        analysisScope === 'full'
          ? Math.min((pages ?? []).length, maxBrandEvidencePages)
          : selectedAssets.length;
      await cancellation.assertActive();
      const evidenceCount = await saveBrandColourEvidence(client, job, brandEvidence);
      savedEvidenceCount = evidenceCount;
      await updateProgress(client, job, workerId, {
        progress_phase: 'saving_brand_evidence',
        progress_detail: evidenceCount
          ? `Saved ${evidenceCount} private brand-colour observations for primary and accent review.`
          : 'No reliable brand colours were found. Manual colour review is still available.',
        current_asset_id: null,
        total_items: totalItems,
        completed_items: completedItems,
      });
    } finally {
      await browser.close();
    }
    return {
      analyzedOutputCount,
      savedEvidenceCount: savedEvidenceCount ?? 0,
      savedLogoVersionCount,
    };
  } finally {
    cancellation.stop();
  }
}

async function markFailed(client, job, error) {
  const message = error instanceof Error ? error.message : '';
  const errorSummary =
    /Target crashed|rasterisation step exceeded|prepared logo image did not pass/i.test(message)
      ? 'Logo conversion stopped because the private image processor could not safely prepare this file. Your original logo is unchanged; retry to use the memory-safe conversion path.'
      : message
        ? message.slice(0, 500)
        : 'Asset analysis failed.';
  const { error: updateError } = await client
    .from('asset_analysis_jobs')
    .update({
      status: 'failed',
      lease_expires_at: null,
      progress_phase: 'failed',
      progress_detail: errorSummary,
      error_summary: errorSummary,
    })
    .eq('id', job.id)
    .eq('worker_id', job.worker_id)
    .eq('status', 'running');
  if (updateError) throw updateError;
}

async function markCancelled(client, job, workerId) {
  await client
    .from('asset_analysis_jobs')
    .update({
      status: 'failed',
      lease_expires_at: null,
      progress_phase: 'cancelled',
      progress_detail: 'Asset analysis cancelled. Saved suggestions remain private and editable.',
      error_summary: 'Asset analysis cancelled by a workspace user.',
    })
    .eq('id', job.id)
    .eq('worker_id', workerId)
    .not('cancel_requested_at', 'is', null);
}

async function processNext(client, workerId, apiKey, model) {
  const { data, error } = await client.rpc('claim_next_asset_analysis_v2', {
    worker_identity: workerId,
    supported_contract_version: 2,
  });
  if (error) throw new Error('The worker could not claim asset analysis.');
  const job = Array.isArray(data) ? data[0] : undefined;
  if (!job) return false;
  try {
    const outcome = await processJob(client, job, workerId, apiKey, model);
    const analysisScope = ['brand_colours', 'logo_versions'].includes(
      readString(job.analysis_scope),
    )
      ? readString(job.analysis_scope)
      : 'full';
    const completedOutputs = [
      outcome.analyzedOutputCount
        ? `${outcome.analyzedOutputCount} new asset review ${outcome.analyzedOutputCount === 1 ? 'card' : 'cards'} saved`
        : '',
      outcome.savedLogoVersionCount
        ? `${outcome.savedLogoVersionCount} transparent logo ${outcome.savedLogoVersionCount === 1 ? 'version' : 'versions'} saved`
        : '',
      outcome.savedEvidenceCount
        ? `${outcome.savedEvidenceCount} brand-colour ${outcome.savedEvidenceCount === 1 ? 'observation' : 'observations'} refreshed`
        : '',
    ].filter(Boolean);
    const completionLabel =
      analysisScope === 'brand_colours'
        ? 'Original-logo colour refresh complete'
        : analysisScope === 'logo_versions'
          ? 'Logo version refresh complete'
          : 'Asset analysis complete';
    const completionDetail = completedOutputs.length
      ? `${completionLabel}: ${completedOutputs.join(', ')}.`
      : 'Asset analysis complete. No new review cards or reliable brand-colour observations were produced.';
    const { error: completeError } = await client
      .from('asset_analysis_jobs')
      .update({
        status: 'ready',
        model,
        lease_expires_at: null,
        progress_phase: 'complete',
        progress_detail: completionDetail,
        current_asset_id: null,
        error_summary: null,
      })
      .eq('id', job.id)
      .eq('worker_id', workerId);
    if (completeError) throw completeError;
    const apiRecoveryEnabled = openAiApiEnabled();
    const { error: contentRecoveryError } =
      analysisScope === 'full' && apiRecoveryEnabled
        ? await client.rpc('request_visual_content_extraction', {
            target_business_id: job.business_id,
          })
        : { error: null };
    if (analysisScope === 'full' && apiRecoveryEnabled && contentRecoveryError) {
      console.warn(
        `[asset-analysis-worker] visual-content recovery was not available for ${job.id}: ${contentRecoveryError.message}`,
      );
    } else if (analysisScope === 'full' && apiRecoveryEnabled) {
      const { error: pendingStructureError } = await client
        .from('visual_content_candidates')
        .update({ structure_status: 'pending', structure_error: null })
        .eq('crawl_run_id', job.crawl_run_id)
        .eq('review_state', 'needs_review');
      if (!pendingStructureError) {
        const { error: structureQueueError } = await client.from('visual_content_jobs').upsert(
          {
            organization_id: job.organization_id,
            business_id: job.business_id,
            crawl_run_id: job.crawl_run_id,
            status: 'queued',
            model: null,
            worker_id: null,
            lease_expires_at: null,
            attempt_count: 0,
            error_summary: null,
            progress_phase: 'queued',
            progress_detail: 'Waiting to interpret saved image content as structured information.',
            current_candidate_id: null,
            total_items: 0,
            completed_items: 0,
            cancel_requested_at: null,
          },
          { onConflict: 'crawl_run_id' },
        );
        if (structureQueueError) {
          console.warn(
            `[asset-analysis-worker] structured visual-content recovery was not queued for ${job.id}: ${structureQueueError.message}`,
          );
        }
      }
    }
    await client.from('activities').insert({
      organization_id: job.organization_id,
      business_id: job.business_id,
      type: 'note',
      message: 'Private visual-asset suggestions are ready for review.',
    });
    console.log(`[asset-analysis-worker] completed ${job.id}`);
  } catch (error) {
    if (error instanceof AssetAnalysisCancelledError) {
      await markCancelled(client, job, workerId);
      console.log(`[asset-analysis-worker] cancelled ${job.id}`);
      return true;
    }
    await markFailed(client, job, error);
    console.error(
      '[asset-analysis-worker] failed',
      job.id,
      error instanceof Error ? error.message : error,
    );
  }
  return true;
}

async function main() {
  const supabaseUrl = requiredEnvironment('SITEFORGE_SUPABASE_URL');
  const serviceRoleKey = requiredEnvironment('SITEFORGE_SUPABASE_SERVICE_ROLE_KEY');
  const model = process.env.SITEFORGE_ASSET_VISION_MODEL?.trim() || 'gpt-5';
  const workerId = process.env.SITEFORGE_WORKER_ID?.trim() || `${hostname()}-${process.pid}`;
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: createTimedFetch(requestTimeoutMs) },
  });
  const runOnce = process.argv.includes('--once');
  let keepRunning = true;
  while (keepRunning) {
    const claimed = await processNext(
      client,
      workerId,
      openAiApiKey(process.env, ['OPENAI_API_KEY']),
      model,
    );
    if (runOnce) {
      if (!claimed) console.log('[asset-analysis-worker] no queued asset analyses.');
      keepRunning = false;
      continue;
    }
    if (!claimed) await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
}

main().catch((error) => {
  console.error(
    '[asset-analysis-worker] stopped unexpectedly',
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
