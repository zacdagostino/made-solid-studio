import { uxVisionResponseSchema } from './ux-vision-contract.mjs';
import { openAiApiKey } from './openai-api-policy.mjs';

const responseEndpoint = 'https://api.openai.com/v1/responses';
const defaultVisionModel = 'gpt-5.4';
const maximumScreenshotsPerPage = 6;
const maximumImageBytes = 6 * 1024 * 1024;

const observationSchema = uxVisionResponseSchema();

function outputText(response) {
  if (typeof response?.output_text === 'string') return response.output_text;
  return (response?.output ?? [])
    .flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
    .filter((item) => item?.type === 'output_text' && typeof item.text === 'string')
    .map((item) => item.text)
    .join('');
}

function concisePageContext(page, screenshots) {
  const overview = screenshots.find((item) => item.metadata?.evidenceKind === 'overview');
  const metadata = overview?.metadata ?? screenshots[0]?.metadata ?? {};
  return {
    url: page.url,
    title: page.title ?? null,
    pageType: page.page_type ?? null,
    headingOutline: metadata.headingOutline ?? [],
    sectionOutline: metadata.sectionOutline ?? [],
    mainPresent: metadata.mainPresent,
    landmarkCount: metadata.landmarkCount,
    visibleTextLength: metadata.visibleTextLength,
    repeatedActionLabels: metadata.repeatedActionLabels ?? [],
    fixedOrStickyElements: metadata.fixedOrStickyElements ?? [],
    resourceSummary: metadata.resourceSummary ?? {},
    runtimeErrors: metadata.runtimeErrors ?? [],
  };
}

async function screenshotContent(client, artifact) {
  const { data, error } = await client.storage
    .from(artifact.storage_bucket)
    .download(artifact.storage_path);
  if (error || !data) throw new Error('A responsive screenshot could not be loaded for UX vision.');
  const bytes = Buffer.from(await data.arrayBuffer());
  if (!bytes.length || bytes.length > maximumImageBytes) {
    throw new Error('A responsive screenshot is outside the supported UX vision size.');
  }
  return `data:${artifact.content_type || 'image/png'};base64,${bytes.toString('base64')}`;
}

function apiKey() {
  return openAiApiKey(process.env, ['SITEFORGE_UX_VISION_API_KEY', 'OPENAI_API_KEY']);
}

export function uxVisionConfigured() {
  return Boolean(apiKey());
}

export async function analysePageUxWithVision(client, task, page, pageScreenshots) {
  const key = apiKey();
  if (!key) {
    throw new Error(
      'UX vision is not configured. Explicitly enable OpenAI API features and add SITEFORGE_UX_VISION_API_KEY to the protected worker environment.',
    );
  }
  const viewportOrder = { mobile: 0, tablet: 1, desktop: 2 };
  const evidenceOrder = (artifact) => {
    const kind = artifact.metadata?.evidenceKind ?? '';
    if (kind === 'page-overview') return 0;
    if (kind.startsWith('interaction-')) return 1;
    return 2;
  };
  const screenshots = [...pageScreenshots]
    .sort(
      (left, right) =>
        evidenceOrder(left) - evidenceOrder(right) ||
        (viewportOrder[left.metadata?.viewport?.label] ?? 9) -
          (viewportOrder[right.metadata?.viewport?.label] ?? 9),
    )
    .slice(0, maximumScreenshotsPerPage);
  if (!screenshots.length)
    return { observations: [], coverageNotes: ['No screenshot was available.'] };
  const content = [
    {
      type: 'input_text',
      text: [
        'Act as an evidence-bound website UX reviewer for everyday visitors.',
        'Identify only directly visible or structurally supported interface problems.',
        'Look for hierarchy, information structure, readability, redundant content, oversized imagery or branding, confusing navigation, obscured actions, poor mobile use, inaccessible image-based text, inconsistent patterns, and weak conversion journeys.',
        'Do not infer sales loss, legal non-compliance, business intent, developer competence, or platform causation.',
        'Do not praise the design or produce client prose. Return candidate observations for a human reviewer.',
        'Return at most eight strong concerns for this page. Omit generic advice and uncertain preferences.',
        'When the same issue is clearly visible in more than one device screenshot, return one observation for each supporting screenshot using the same title.',
        'Use only the exact supplied source URL and screenshot artifact ID. Give the clearest visible region in screenshot pixel coordinates.',
        `Page evidence: ${JSON.stringify(concisePageContext(page, screenshots))}`,
      ].join('\n'),
    },
  ];
  for (const [index, artifact] of screenshots.entries()) {
    content.push({
      type: 'input_text',
      text: `Screenshot ${index}: ${JSON.stringify({
        artifactId: artifact.id,
        sourceUrl: artifact.metadata?.sourceUrl,
        viewport: artifact.metadata?.viewport,
        evidenceKind: artifact.metadata?.evidenceKind,
        interactionState: artifact.metadata?.interactionState,
        focusedRegion: artifact.metadata?.focusedRegion,
      })}`,
    });
    content.push({
      type: 'input_image',
      image_url: await screenshotContent(client, artifact),
      detail: 'original',
    });
  }

  const response = await fetch(responseEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.SITEFORGE_UX_VISION_MODEL?.trim() || defaultVisionModel,
      store: false,
      reasoning: { effort: 'low' },
      input: [{ role: 'user', content }],
      text: {
        format: {
          type: 'json_schema',
          name: 'website_ux_observations',
          strict: true,
          schema: observationSchema,
        },
      },
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) {
    const requestId = response.headers.get('x-request-id');
    throw new Error(
      `UX vision request failed (${response.status}${requestId ? `, request ${requestId}` : ''}).`,
    );
  }
  const body = await response.json();
  const text = outputText(body);
  if (!text) throw new Error('UX vision returned no structured analysis.');
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('UX vision returned an unreadable structured analysis.');
  }
  return {
    ...parsed,
    model: body.model || process.env.SITEFORGE_UX_VISION_MODEL?.trim() || defaultVisionModel,
    responseId: body.id,
    screenshots,
  };
}

export const uxVisionLimits = {
  maximumScreenshotsPerPage,
  maximumImageBytes,
};
