const allowedIssueTypes = new Set([
  'navigation_obstruction',
  'oversized_branding',
  'visual_hierarchy',
  'content_redundancy',
  'information_architecture',
  'readability',
  'touch_interaction',
  'responsive_layout',
  'misleading_affordance',
  'image_based_text',
  'form_usability',
  'journey_clarity',
]);

const allowedAreas = new Set(['UI', 'UX', 'Mobile', 'Accessibility', 'Content', 'Conversion']);
const allowedSeverities = new Set(['high', 'medium', 'low']);
const severityWeight = { high: 60, medium: 40, low: 20 };
const ignoredWords = new Set([
  'about',
  'after',
  'before',
  'could',
  'from',
  'have',
  'into',
  'page',
  'that',
  'their',
  'there',
  'this',
  'visitor',
  'website',
  'with',
]);

const issueSignals = {
  navigation_obstruction: /\b(header|menu|nav(?:igation)?)\b/i,
  oversized_branding: /\b(brand(?:ing)?|logo|wordmark)\b/i,
  visual_hierarchy: /\b(crowd|dominant|hierarchy|large visual|viewport)\b/i,
  content_redundancy: /\b(duplicat|redundan|repeat)/i,
  information_architecture: /\b(heading|information|organi[sz]|scan|structure)\b/i,
  readability: /\b(contrast|legib|line length|readab|small text|type size)\b/i,
  touch_interaction: /\b(control|tap|target|touch)\b/i,
  responsive_layout: /\b(mobile|overflow|responsive|viewport)\b/i,
  misleading_affordance: /\b(affordance|button|clickable|link|looks interactive)\b/i,
  image_based_text:
    /\b(image[- ]based|image.{0,30}(feedback|review|testimonial|text)|text.{0,20}image)\b/i,
  form_usability: /\b(error|field|form|label|validation)\b/i,
  journey_clarity: /\b(booking|call.to.action|contact|conversion|enquiry|journey|quote)\b/i,
};

function plainRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : undefined;
}

function boundedText(value, maximumLength) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maximumLength);
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function artifactValue(artifact, camel, snake) {
  return artifact?.[camel] ?? artifact?.[snake];
}

function canonicalUrl(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString();
  } catch {
    return '';
  }
}

function textTokens(value) {
  return new Set(
    boundedText(value, 2_000)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter((word) => word.length >= 4 && !ignoredWords.has(word)),
  );
}

function tokenSimilarity(left, right) {
  if (!left.size || !right.size) return 0;
  const overlap = [...left].filter((word) => right.has(word)).length;
  return overlap / Math.min(left.size, right.size);
}

function validRegion(region, viewport) {
  const record = plainRecord(region);
  const bounds = plainRecord(record?.bounds);
  const x = finiteNumber(bounds?.x);
  const y = finiteNumber(bounds?.y);
  const width = finiteNumber(bounds?.width);
  const height = finiteNumber(bounds?.height);
  if (!boundedText(record?.label, 160) || [x, y, width, height].includes(undefined)) return false;
  if (x < 0 || y < 0 || width < 4 || height < 4) return false;
  return x + width <= viewport.width + 2 && y + height <= viewport.height + 2;
}

function corroboratingRules(observation, ruleFindings) {
  const observationText = `${observation.title} ${observation.observation}`;
  const observationTokens = textTokens(observationText);
  const signal = issueSignals[observation.issueType];
  return ruleFindings.filter((finding) => {
    if (!plainRecord(finding)) return false;
    const urls = Array.isArray(finding.sourceUrls)
      ? finding.sourceUrls
      : Array.isArray(finding.source_urls)
        ? finding.source_urls
        : [];
    if (!urls.some((url) => canonicalUrl(url) === canonicalUrl(observation.sourceUrl)))
      return false;
    const artifactIds = Array.isArray(finding.evidenceArtifactIds)
      ? finding.evidenceArtifactIds
      : Array.isArray(finding.evidence_artifact_ids)
        ? finding.evidence_artifact_ids
        : [];
    const findingText = `${finding.title ?? ''} ${finding.finding ?? finding.observation ?? ''}`;
    return (
      artifactIds.includes(observation.screenshotArtifactId) ||
      Boolean(signal?.test(findingText)) ||
      tokenSimilarity(observationTokens, textTokens(findingText)) >= 0.34
    );
  });
}

function rejection(index, reason) {
  return { index, reason };
}

/**
 * Validates untrusted multimodal output against immutable, same-run screenshot evidence.
 * Accepted output remains a private suggestion: this function never emits an approved or
 * publication-eligible observation.
 */
export function normaliseVisionObservations(
  rawObservations,
  { screenshotArtifacts, auditId, crawlRunId, ruleFindings = [] },
) {
  const artifacts = new Map(
    (Array.isArray(screenshotArtifacts) ? screenshotArtifacts : []).map((artifact) => [
      artifact?.id,
      artifact,
    ]),
  );
  const accepted = [];
  const rejected = [];
  (Array.isArray(rawObservations) ? rawObservations : []).slice(0, 40).forEach((raw, index) => {
    const record = plainRecord(raw);
    if (!record) {
      rejected.push(rejection(index, 'invalid_observation'));
      return;
    }
    const issueType = boundedText(record.issueType, 80);
    const area = boundedText(record.area, 40);
    const severity = boundedText(record.severity, 20);
    const title = boundedText(record.title, 160);
    const observation = boundedText(record.observation, 1_200);
    const customerImpact = boundedText(record.customerImpact, 800);
    const recommendation = boundedText(record.recommendation, 800);
    const sourceUrl = canonicalUrl(record.sourceUrl);
    const screenshotArtifactId = boundedText(record.screenshotArtifactId, 80);
    const modelConfidence = finiteNumber(record.confidence);
    if (
      !allowedIssueTypes.has(issueType) ||
      !allowedAreas.has(area) ||
      !allowedSeverities.has(severity) ||
      title.length < 8 ||
      observation.length < 12 ||
      customerImpact.length < 8 ||
      recommendation.length < 8 ||
      !sourceUrl ||
      modelConfidence === undefined ||
      modelConfidence < 0 ||
      modelConfidence > 1
    ) {
      rejected.push(rejection(index, 'invalid_fields'));
      return;
    }
    const artifact = artifacts.get(screenshotArtifactId);
    const metadata = plainRecord(artifact?.metadata) ?? {};
    if (!artifact || artifact.kind !== 'screenshot') {
      rejected.push(rejection(index, 'missing_screenshot_evidence'));
      return;
    }
    if (
      artifactValue(artifact, 'crawlRunId', 'crawl_run_id') !== crawlRunId ||
      metadata.auditId !== auditId
    ) {
      rejected.push(rejection(index, 'evidence_from_different_run'));
      return;
    }
    if (canonicalUrl(metadata.sourceUrl) !== sourceUrl) {
      rejected.push(rejection(index, 'evidence_source_mismatch'));
      return;
    }
    const viewport = plainRecord(metadata.viewport);
    if (
      !viewport ||
      finiteNumber(viewport.width) === undefined ||
      finiteNumber(viewport.height) === undefined ||
      !boundedText(viewport.label, 40) ||
      !validRegion(record.region, viewport)
    ) {
      rejected.push(rejection(index, 'unverifiable_visible_region'));
      return;
    }
    const base = {
      source: 'multimodal_ux_model',
      issueType,
      area,
      severity,
      title,
      observation,
      customerImpact,
      recommendation,
      sourceUrl,
      screenshotArtifactId,
      evidenceArtifactIds: [screenshotArtifactId],
      viewport: {
        label: boundedText(viewport.label, 40),
        width: viewport.width,
        height: viewport.height,
      },
      region: {
        label: boundedText(record.region.label, 160),
        selector: boundedText(record.region.selector, 300),
        bounds: {
          x: record.region.bounds.x,
          y: record.region.bounds.y,
          width: record.region.bounds.width,
          height: record.region.bounds.height,
        },
      },
      modelConfidence,
    };
    const matchedRules = corroboratingRules(base, ruleFindings);
    const corroborated = matchedRules.length > 0;
    const confidence = corroborated
      ? modelConfidence >= 0.8
        ? 'high'
        : modelConfidence >= 0.6
          ? 'medium'
          : 'low'
      : 'low';
    const candidateState =
      corroborated && modelConfidence >= 0.6 ? 'ranked_candidate' : 'review_only';
    accepted.push({
      ...base,
      findingClass: 'design_judgement',
      confidence,
      candidateState,
      corroboration: {
        matchedRuleIds: matchedRules.map((finding) => finding.id).filter(Boolean),
        matchedRuleTitles: matchedRules.map((finding) => boundedText(finding.title, 160)),
      },
      priorityScore: Math.round(
        severityWeight[severity] + modelConfidence * 20 + (corroborated ? 20 : 0),
      ),
      reviewState: 'needs_review',
      publicationEligible: false,
    });
  });
  return { accepted, rejected };
}

function observationsAreDuplicates(left, right) {
  return (
    left.issueType === right.issueType &&
    tokenSimilarity(textTokens(left.title), textTokens(right.title)) >= 0.5
  );
}

/**
 * Groups repeated page/device cases and ranks only corroborated, non-low-confidence suggestions.
 * Review-only suggestions remain available to a human but are intentionally kept out of the
 * curated candidate list.
 */
export function rankVisionCandidates(observations, { maximumCandidates = 15 } = {}) {
  const groups = [];
  for (const observation of Array.isArray(observations) ? observations : []) {
    const group = groups.find((candidate) =>
      observationsAreDuplicates(candidate.representative, observation),
    );
    if (group) group.occurrences.push(observation);
    else groups.push({ representative: observation, occurrences: [observation] });
  }
  const rankedCandidates = groups
    .map((group) => {
      const representative = [...group.occurrences].sort(
        (left, right) => right.priorityScore - left.priorityScore,
      )[0];
      const affectedPages = [...new Set(group.occurrences.map((entry) => entry.sourceUrl))];
      const affectedViewports = [
        ...new Set(group.occurrences.map((entry) => entry.viewport?.label).filter(Boolean)),
      ];
      const corroboratedCount = group.occurrences.filter(
        (entry) => entry.candidateState === 'ranked_candidate',
      ).length;
      const repeatedVisualEvidence = affectedPages.length > 1 || affectedViewports.length > 1;
      const independentlySupported =
        corroboratedCount > 0 ||
        (repeatedVisualEvidence &&
          group.occurrences.some((entry) => entry.modelConfidence >= 0.75));
      return {
        ...representative,
        occurrenceCount: group.occurrences.length,
        corroboratedCount,
        candidateState: independentlySupported ? 'ranked_candidate' : 'review_only',
        confidence:
          representative.confidence === 'high' ? 'high' : independentlySupported ? 'medium' : 'low',
        affectedPages,
        affectedViewports,
        evidenceArtifactIds: [
          ...new Set(group.occurrences.flatMap((entry) => entry.evidenceArtifactIds ?? [])),
        ],
        priorityScore:
          representative.priorityScore +
          Math.min(10, (affectedPages.length - 1) * 3 + (affectedViewports.length - 1) * 2),
        reviewState: 'needs_review',
        publicationEligible: false,
      };
    })
    .filter(
      (candidate) =>
        candidate.candidateState === 'ranked_candidate' && candidate.confidence !== 'low',
    )
    .sort(
      (left, right) =>
        right.priorityScore - left.priorityScore || left.title.localeCompare(right.title),
    )
    .slice(0, Math.max(0, Math.min(15, maximumCandidates)));
  const rankedEvidenceIds = new Set(
    rankedCandidates.flatMap((candidate) => candidate.evidenceArtifactIds),
  );
  const reviewOnly = (Array.isArray(observations) ? observations : []).filter(
    (observation) =>
      observation.candidateState === 'review_only' ||
      !observation.evidenceArtifactIds?.some((id) => rankedEvidenceIds.has(id)),
  );
  return { rankedCandidates, reviewOnly };
}

/**
 * Worker-facing adapter. It keeps validation diagnostics available while projecting accepted
 * suggestions into the existing audit-finding shape. The caller must still persist every finding
 * with `review_state = needs_review`; `publicationEligible` is deliberately false in both the
 * normalised suggestion and its saved measurement.
 */
export function normaliseVisionAnalysis({
  analysis,
  screenshots,
  page,
  facts = [],
  deterministicFindings = [],
  task,
  maximumCandidates = 15,
}) {
  const rawObservations = Array.isArray(analysis) ? analysis : analysis?.observations;
  const result = normaliseVisionObservations(rawObservations, {
    screenshotArtifacts: screenshots,
    auditId: task?.audit_id ?? task?.auditId,
    crawlRunId: task?.crawl_run_id ?? task?.crawlRunId,
    ruleFindings: deterministicFindings,
  });
  const ranking = rankVisionCandidates(result.accepted, { maximumCandidates });
  const fallbackSourceUrl = canonicalUrl(page?.url);
  const findings = result.accepted.map((entry) => ({
    area: entry.area,
    severity: entry.severity,
    title: entry.title,
    finding: entry.observation,
    customerImpact: entry.customerImpact,
    recommendation: entry.recommendation,
    sourceUrls: [entry.sourceUrl || fallbackSourceUrl].filter(Boolean),
    evidenceFactIds: facts
      .filter(
        (fact) => fact?.id && canonicalUrl(fact.source_url ?? fact.sourceUrl) === entry.sourceUrl,
      )
      .map((fact) => fact.id),
    evidenceArtifactIds: entry.evidenceArtifactIds,
    findingClass: entry.findingClass,
    confidence: entry.confidence,
    viewport: entry.viewport,
    interactionState: 'settled page',
    selector: entry.region.selector || undefined,
    measurement: {
      vision: {
        issueType: entry.issueType,
        modelConfidence: entry.modelConfidence,
        candidateState: entry.candidateState,
        corroboration: entry.corroboration,
        visibleRegion: entry.region,
        publicationEligible: false,
      },
    },
  }));
  return { findings, rejected: result.rejected, ...ranking };
}

export function uxVisionResponseSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['observations'],
    properties: {
      observations: {
        type: 'array',
        maxItems: 40,
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'issueType',
            'area',
            'severity',
            'title',
            'observation',
            'customerImpact',
            'recommendation',
            'sourceUrl',
            'screenshotArtifactId',
            'confidence',
            'region',
          ],
          properties: {
            issueType: { type: 'string', enum: [...allowedIssueTypes] },
            area: { type: 'string', enum: [...allowedAreas] },
            severity: { type: 'string', enum: [...allowedSeverities] },
            title: { type: 'string' },
            observation: { type: 'string' },
            customerImpact: { type: 'string' },
            recommendation: { type: 'string' },
            sourceUrl: { type: 'string' },
            screenshotArtifactId: { type: 'string' },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            region: {
              type: 'object',
              additionalProperties: false,
              required: ['label', 'selector', 'bounds'],
              properties: {
                label: { type: 'string' },
                selector: { type: 'string' },
                bounds: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['x', 'y', 'width', 'height'],
                  properties: {
                    x: { type: 'number', minimum: 0 },
                    y: { type: 'number', minimum: 0 },
                    width: { type: 'number', minimum: 4 },
                    height: { type: 'number', minimum: 4 },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}
