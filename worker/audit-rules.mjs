const severityForImpact = {
  critical: 'high',
  serious: 'high',
  moderate: 'medium',
  minor: 'low',
};

function numberValue(record, key) {
  const value = record?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function sourceEvidenceIds(factsByUrl, sourceUrls) {
  return [...new Set(sourceUrls.flatMap((url) => factsByUrl.get(url) ?? []))];
}

function sourceArtifactIds(artifactsByUrl, sourceUrls) {
  return [...new Set(sourceUrls.flatMap((url) => artifactsByUrl.get(url) ?? []))];
}

function finding({
  area,
  severity,
  title,
  finding: description,
  recommendation,
  sourceUrls,
  factsByUrl,
  artifactsByUrl,
  findingClass = 'observed_defect',
  customerImpact = '',
  confidence = 'high',
  measurement = {},
  evidenceArtifactIds = [],
}) {
  return {
    area,
    severity,
    title,
    finding: description,
    recommendation,
    sourceUrls: [...new Set(sourceUrls)],
    evidenceFactIds: sourceEvidenceIds(factsByUrl, sourceUrls),
    evidenceArtifactIds: evidenceArtifactIds.length
      ? [...new Set(evidenceArtifactIds)]
      : sourceArtifactIds(artifactsByUrl, sourceUrls),
    findingClass,
    customerImpact,
    confidence,
    measurement,
  };
}

/**
 * Produces only observations supported by the saved capture. This deliberately does not judge a
 * business claim, legal compliance, visual taste, or conversion outcome without human review.
 */
export function generateAuditFindings({
  pages,
  facts,
  accessibilityReports,
  performanceReports,
  screenshots,
  evidenceArtifacts = [],
}) {
  const factsByUrl = new Map();
  facts.forEach((fact) => {
    if (!fact.source_url || !fact.id) return;
    factsByUrl.set(fact.source_url, [...(factsByUrl.get(fact.source_url) ?? []), fact.id]);
  });
  const findings = [];
  const artifactsByUrl = new Map();
  evidenceArtifacts.forEach((artifact) => {
    if (!artifact.sourceUrl || !artifact.id) return;
    artifactsByUrl.set(artifact.sourceUrl, [
      ...(artifactsByUrl.get(artifact.sourceUrl) ?? []),
      artifact.id,
    ]);
  });
  const addFinding = (input) => finding({ ...input, factsByUrl, artifactsByUrl });
  const capturedPages = pages.filter((page) => page.url);

  const missingTitles = capturedPages.filter((page) => !page.title).map((page) => page.url);
  if (missingTitles.length) {
    findings.push(
      addFinding({
        area: 'SEO',
        severity: 'medium',
        title: 'Some captured pages do not have a document title',
        finding: `${missingTitles.length} captured ${missingTitles.length === 1 ? 'page does' : 'pages do'} not expose a document title in the saved markup.`,
        customerImpact:
          'A missing title can make a page harder to identify in browser tabs, bookmarks, and search results.',
        recommendation:
          'Add a concise, page-specific document title that matches the page purpose.',
        sourceUrls: missingTitles,
      }),
    );
  }

  const missingCanonicals = capturedPages
    .filter((page) => !page.canonical_url)
    .map((page) => page.url);
  if (missingCanonicals.length) {
    findings.push(
      addFinding({
        area: 'SEO',
        severity: 'low',
        title: 'Canonical URLs are missing on captured pages',
        finding: `${missingCanonicals.length} captured ${missingCanonicals.length === 1 ? 'page does' : 'pages do'} not provide a canonical link element.`,
        customerImpact:
          'When duplicate or alternate URLs exist, search engines may have less guidance about which version should represent the page.',
        recommendation:
          'Confirm the preferred public URL for each page and add canonical links where appropriate.',
        sourceUrls: missingCanonicals,
        findingClass: 'observed_condition',
        confidence: 'medium',
      }),
    );
  }

  const pagesWithoutHeadings = capturedPages
    .filter((page) => numberValue(page.metadata, 'headingCount') === 0)
    .map((page) => page.url);
  if (pagesWithoutHeadings.length) {
    findings.push(
      addFinding({
        area: 'Content',
        severity: 'medium',
        title: 'Some pages have no captured heading structure',
        finding: `${pagesWithoutHeadings.length} captured ${pagesWithoutHeadings.length === 1 ? 'page has' : 'pages have'} no H1, H2, or H3 elements in the saved markup.`,
        customerImpact:
          'Visitors may find the page harder to scan, and assistive-technology users have fewer landmarks for navigating its content.',
        recommendation:
          'Add a clear primary heading and a logical heading hierarchy that reflects the page content.',
        sourceUrls: pagesWithoutHeadings,
      }),
    );
  }

  const imageAltByPage = capturedPages
    .map((page) => ({ page, count: numberValue(page.metadata, 'imagesWithoutAlt') }))
    .filter(({ count }) => count > 0);
  const imagesWithoutAlt = imageAltByPage.reduce((total, entry) => total + entry.count, 0);
  if (imagesWithoutAlt) {
    findings.push(
      addFinding({
        area: 'Accessibility',
        severity: 'medium',
        title: 'Images without alternative text were found',
        finding: `${imagesWithoutAlt} images across ${imageAltByPage.length} captured ${imageAltByPage.length === 1 ? 'page do' : 'pages do'} not have alternative text in the saved markup.`,
        customerImpact:
          'Meaningful image content may be unavailable to people using screen readers when no text alternative is provided.',
        recommendation:
          'Add meaningful alternative text for informative images and use empty alt text only for genuinely decorative images.',
        sourceUrls: imageAltByPage.map(({ page }) => page.url),
      }),
    );
  }

  const unlabelledFields = capturedPages
    .map((page) => ({ page, count: numberValue(page.metadata, 'unlabelledFormFieldCount') }))
    .filter(({ count }) => count > 0);
  const totalUnlabelledFields = unlabelledFields.reduce((total, entry) => total + entry.count, 0);
  if (totalUnlabelledFields) {
    findings.push(
      addFinding({
        area: 'Accessibility',
        severity: 'high',
        title: 'Form controls without programmatic labels were found',
        finding: `${totalUnlabelledFields} form controls across ${unlabelledFields.length} captured ${unlabelledFields.length === 1 ? 'page do' : 'pages do'} not expose a label, aria-label, or aria-labelledby attribute.`,
        customerImpact:
          'People using screen readers or voice input may not know what information a field expects.',
        recommendation:
          'Give every form control a persistent visible label and connect it programmatically to the field.',
        sourceUrls: unlabelledFields.map(({ page }) => page.url),
      }),
    );
  }

  const formsFound = capturedPages.reduce(
    (total, page) => total + numberValue(page.metadata, 'formCount'),
    0,
  );
  const contactPages = capturedPages.filter((page) => page.page_type === 'contact');
  if (contactPages.length && formsFound === 0) {
    findings.push(
      addFinding({
        area: 'Conversion',
        severity: 'medium',
        title: 'No form was found on the captured contact pages',
        finding:
          'The captured contact page set contains no HTML form. The capture cannot determine whether another lead path is effective.',
        customerImpact:
          'Visitors who prefer a written enquiry may have fewer obvious ways to contact the business without leaving the page.',
        recommendation:
          'Review the primary contact journey and ensure the preferred lead action is clear, accessible, and easy to complete on mobile.',
        sourceUrls: contactPages.map((page) => page.url),
        findingClass: 'usability_concern',
        confidence: 'medium',
      }),
    );
  }

  const viewportMissing = capturedPages
    .filter((page) => page.metadata.viewportPresent === false)
    .map((page) => page.url);
  if (viewportMissing.length) {
    findings.push(
      addFinding({
        area: 'Mobile',
        severity: 'high',
        title: 'Viewport metadata is missing',
        finding: `${viewportMissing.length} captured ${viewportMissing.length === 1 ? 'page does' : 'pages do'} not include a viewport meta tag.`,
        customerImpact:
          'Mobile browsers may lay the page out at a desktop width and scale it down, making text and controls difficult to use.',
        recommendation: 'Add a responsive viewport meta tag and retest the page on narrow screens.',
        sourceUrls: viewportMissing,
      }),
    );
  }

  const overflowingScreens = screenshots.filter((screenshot) => {
    const pageWidth = numberValue(screenshot.metadata, 'pageWidth');
    const viewportWidth =
      numberValue(screenshot.metadata, 'contentViewportWidth') ||
      numberValue(screenshot.metadata, 'layoutViewportWidth');
    return viewportWidth > 0 && pageWidth > viewportWidth;
  });
  const overflowUrls = overflowingScreens.map((screenshot) => screenshot.sourceUrl).filter(Boolean);
  if (overflowUrls.length) {
    const overflowMeasurements = overflowingScreens.map((screenshot) => ({
      sourceUrl: screenshot.sourceUrl,
      viewport: screenshot.metadata?.viewport,
      overflowPx: Math.max(
        0,
        numberValue(screenshot.metadata, 'pageWidth') -
          (numberValue(screenshot.metadata, 'contentViewportWidth') ||
            numberValue(screenshot.metadata, 'layoutViewportWidth')),
      ),
    }));
    findings.push(
      addFinding({
        area: 'Mobile',
        severity: 'high',
        title: 'Horizontal layout overflow was recorded at a captured viewport',
        finding: `${new Set(overflowUrls).size} captured ${new Set(overflowUrls).size === 1 ? 'page has' : 'pages have'} a document width wider than the requested viewport.`,
        customerImpact:
          'Text, controls, or other content may sit off-screen and require sideways scrolling at the affected layout.',
        recommendation:
          'Inspect fixed-width elements, media, tables, and navigation at the affected viewport before redesigning the responsive layout.',
        sourceUrls: overflowUrls,
        measurement: { testedViews: overflowMeasurements },
      }),
    );
  }

  const obstructedScreens = screenshots.filter(
    (screenshot) =>
      screenshot.metadata?.captureContract === 'real-device-responsive-audit-v1' &&
      screenshot.metadata?.viewportIntegrity?.status === 'passed' &&
      Array.isArray(screenshot.metadata?.persistentOverlayOcclusions) &&
      screenshot.metadata.persistentOverlayOcclusions.length > 0,
  );
  const obstructedUrls = obstructedScreens
    .map((screenshot) => screenshot.sourceUrl)
    .filter(Boolean);
  if (obstructedUrls.length) {
    const overlayCount = obstructedScreens.reduce(
      (total, screenshot) => total + screenshot.metadata.persistentOverlayOcclusions.length,
      0,
    );
    findings.push(
      addFinding({
        area: 'UX',
        severity: 'high',
        title: 'Persistent interface elements cover page content',
        finding: `${overlayCount} fixed or sticky interface ${overlayCount === 1 ? 'element was' : 'elements were'} measured over meaningful page content across ${obstructedScreens.length} real-device responsive ${obstructedScreens.length === 1 ? 'capture' : 'captures'}.`,
        customerImpact:
          'Important content or actions can become difficult to read or use when a persistent control sits over them, especially near the end of a page on a phone.',
        recommendation:
          'Keep persistent actions clear of the document content by reserving responsive space, reducing or collapsing the control, or making it dismissible. Recheck the footer and other page endings at every supported viewport.',
        sourceUrls: obstructedUrls,
        evidenceArtifactIds: obstructedScreens.map((screenshot) => screenshot.id).filter(Boolean),
        findingClass: 'usability_concern',
        measurement: {
          captureContract: 'real-device-responsive-audit-v1',
          testedViews: obstructedScreens.map((screenshot) => ({
            sourceUrl: screenshot.sourceUrl,
            viewport: screenshot.metadata?.viewport,
            evidenceKind: screenshot.metadata?.evidenceKind,
            scrollState: screenshot.metadata?.scrollState,
            overlays: screenshot.metadata?.persistentOverlayOcclusions,
          })),
        },
      }),
    );
  }

  const undersizedTouchScreens = screenshots.filter((screenshot) => {
    const viewportWidth = numberValue(screenshot.metadata?.viewport, 'width');
    return (
      viewportWidth > 0 &&
      viewportWidth <= 768 &&
      numberValue(screenshot.metadata, 'undersizedTargetCount') > 0
    );
  });
  const undersizedTouchUrls = undersizedTouchScreens
    .map((screenshot) => screenshot.sourceUrl)
    .filter(Boolean);
  if (undersizedTouchUrls.length) {
    const targetCount = undersizedTouchScreens.reduce(
      (total, screenshot) => total + numberValue(screenshot.metadata, 'undersizedTargetCount'),
      0,
    );
    findings.push(
      addFinding({
        area: 'Mobile',
        severity: 'medium',
        title: 'Small interactive-target candidates were measured in touch layouts',
        finding: `${targetCount} visible interactive ${targetCount === 1 ? 'target was' : 'targets were'} measured below 44 pixels in at least one dimension across ${undersizedTouchScreens.length} mobile or tablet ${undersizedTouchScreens.length === 1 ? 'view' : 'views'}. This is a screening signal; spacing and applicable exceptions still require human review.`,
        customerImpact:
          'Small or closely packed controls can be difficult to activate accurately, especially for visitors using touch or with limited dexterity.',
        recommendation:
          'Review the measured controls in the saved viewport evidence and enlarge or separate the confirmed touch targets.',
        sourceUrls: undersizedTouchUrls,
        findingClass: 'usability_concern',
        confidence: 'medium',
        measurement: {
          candidateCount: targetCount,
          testedViews: undersizedTouchScreens.map((screenshot) => ({
            sourceUrl: screenshot.sourceUrl,
            viewport: screenshot.metadata?.viewport,
            candidateCount: numberValue(screenshot.metadata, 'undersizedTargetCount'),
            samples: Array.isArray(screenshot.metadata?.undersizedTargets)
              ? screenshot.metadata.undersizedTargets
              : [],
          })),
        },
      }),
    );
  }

  const dominantMobileChrome = screenshots.filter((screenshot) => {
    const viewportWidth = numberValue(screenshot.metadata?.viewport, 'width');
    return (
      viewportWidth > 0 &&
      viewportWidth <= 768 &&
      numberValue(screenshot.metadata, 'chromeViewportRatio') >= 0.28
    );
  });
  const dominantMobileChromeUrls = dominantMobileChrome
    .map((screenshot) => screenshot.sourceUrl)
    .filter(Boolean);
  if (dominantMobileChromeUrls.length) {
    const maximumRatio = Math.max(
      ...dominantMobileChrome.map((screenshot) =>
        numberValue(screenshot.metadata, 'chromeViewportRatio'),
      ),
    );
    findings.push(
      addFinding({
        area: 'Mobile',
        severity: 'high',
        title: 'Navigation takes up too much of the first mobile screen',
        finding: `The visible header and navigation occupied up to ${Math.round(maximumRatio * 100)}% of the tested mobile viewport before the main page content began.`,
        customerImpact:
          'People arriving on a phone have much less space to understand the page or see the next useful action without scrolling.',
        recommendation:
          'Use a compact mobile header, move secondary navigation into an accessible menu, and keep the page purpose visible in the first screen.',
        sourceUrls: dominantMobileChromeUrls,
        findingClass: 'usability_concern',
        measurement: {
          maximumViewportRatio: maximumRatio,
          testedViews: dominantMobileChrome.map((screenshot) => ({
            sourceUrl: screenshot.sourceUrl,
            viewport: screenshot.metadata?.viewport,
            heightPx: numberValue(screenshot.metadata, 'chromeHeightPx'),
            viewportRatio: numberValue(screenshot.metadata, 'chromeViewportRatio'),
          })),
        },
      }),
    );
  }

  const oversizedLogoScreens = screenshots.filter(
    (screenshot) => numberValue(screenshot.metadata?.oversizedLogo, 'viewportAreaRatio') >= 0.35,
  );
  const oversizedLogoUrls = oversizedLogoScreens
    .map((screenshot) => screenshot.sourceUrl)
    .filter(Boolean);
  if (oversizedLogoUrls.length) {
    const maximumRatio = Math.max(
      ...oversizedLogoScreens.map((screenshot) =>
        numberValue(screenshot.metadata?.oversizedLogo, 'viewportAreaRatio'),
      ),
    );
    findings.push(
      addFinding({
        area: 'UX',
        severity: 'high',
        title: 'An oversized logo dominates the visible page',
        finding: `A visible logo occupied up to ${Math.round(maximumRatio * 100)}% of the tested viewport area in the saved responsive capture.`,
        customerImpact:
          'Brand recognition is important, but an oversized mark can push useful information and actions out of view and make the page feel harder to enter.',
        recommendation:
          'Give the logo a supporting role and use the first screen for a clear page purpose, useful information, and an obvious next action.',
        sourceUrls: oversizedLogoUrls,
        findingClass: 'design_judgement',
        measurement: {
          maximumViewportAreaRatio: maximumRatio,
          testedViews: oversizedLogoScreens.map((screenshot) => ({
            sourceUrl: screenshot.sourceUrl,
            viewport: screenshot.metadata?.viewport,
            logo: screenshot.metadata?.oversizedLogo,
          })),
        },
      }),
    );
  }

  const dominantMediaScreens = screenshots.filter((screenshot) => {
    const mediaRatio = numberValue(screenshot.metadata?.largestMedia, 'viewportAreaRatio');
    const logoRatio = numberValue(screenshot.metadata?.oversizedLogo, 'viewportAreaRatio');
    return mediaRatio >= 0.75 && logoRatio === 0;
  });
  const dominantMediaUrls = dominantMediaScreens
    .map((screenshot) => screenshot.sourceUrl)
    .filter(Boolean);
  if (dominantMediaUrls.length) {
    const maximumRatio = Math.max(
      ...dominantMediaScreens.map((screenshot) =>
        numberValue(screenshot.metadata?.largestMedia, 'viewportAreaRatio'),
      ),
    );
    findings.push(
      addFinding({
        area: 'UX',
        severity: 'medium',
        title: 'A large visual crowds out useful information',
        finding: `The largest visible image or graphic occupied up to ${Math.round(maximumRatio * 100)}% of the first tested viewport.`,
        customerImpact:
          'Visitors may need to scroll before they can understand what the page offers or find the information they came for.',
        recommendation:
          'Resize or reposition the visual so it supports the page message while keeping the purpose and next step visible.',
        sourceUrls: dominantMediaUrls,
        findingClass: 'design_judgement',
        measurement: {
          maximumViewportAreaRatio: maximumRatio,
          testedViews: dominantMediaScreens.map((screenshot) => ({
            sourceUrl: screenshot.sourceUrl,
            viewport: screenshot.metadata?.viewport,
            media: screenshot.metadata?.largestMedia,
          })),
        },
      }),
    );
  }

  const imageFeedbackScreens = screenshots.filter(
    (screenshot) =>
      Array.isArray(screenshot.metadata?.feedbackRegions) &&
      screenshot.metadata.feedbackRegions.length > 0,
  );
  const imageFeedbackUrls = imageFeedbackScreens
    .map((screenshot) => screenshot.sourceUrl)
    .filter(Boolean);
  if (imageFeedbackUrls.length) {
    findings.push(
      addFinding({
        area: 'UX',
        severity: 'high',
        title: 'Customer feedback is presented mainly as images',
        finding: `Feedback or review sections on ${new Set(imageFeedbackUrls).size} captured ${new Set(imageFeedbackUrls).size === 1 ? 'page rely' : 'pages rely'} on images with very little readable page text.`,
        customerImpact:
          'The trust-building message can be difficult to read on a small screen and may be unavailable to search engines, translation tools, and people using assistive technology.',
        recommendation:
          'Present each approved testimonial as real text with a readable quote and attribution, using imagery only as supporting context.',
        sourceUrls: imageFeedbackUrls,
        findingClass: 'usability_concern',
        measurement: {
          testedViews: imageFeedbackScreens.map((screenshot) => ({
            sourceUrl: screenshot.sourceUrl,
            viewport: screenshot.metadata?.viewport,
            regions: screenshot.metadata?.feedbackRegions,
          })),
        },
      }),
    );
  }

  const accessibilityByRule = new Map();
  accessibilityReports.forEach((report) => {
    (report.violations ?? []).forEach((violation) => {
      const existing = accessibilityByRule.get(violation.id) ?? {
        id: violation.id,
        help: violation.help,
        impact: violation.impact,
        nodeCount: 0,
        sourceUrls: [],
      };
      existing.nodeCount += numberValue(violation, 'nodeCount');
      existing.sourceUrls.push(report.sourceUrl);
      accessibilityByRule.set(violation.id, existing);
    });
  });
  [...accessibilityByRule.values()].slice(0, 8).forEach((violation) => {
    findings.push(
      addFinding({
        area: 'Accessibility',
        severity: severityForImpact[violation.impact] ?? 'medium',
        title: `Automated accessibility check: ${violation.help || violation.id}`,
        finding: `The automated check recorded ${violation.nodeCount} affected ${violation.nodeCount === 1 ? 'element' : 'elements'} across ${new Set(violation.sourceUrls).size} captured ${new Set(violation.sourceUrls).size === 1 ? 'page' : 'pages'}.`,
        customerImpact:
          'The recorded issue may prevent some visitors from perceiving, understanding, or operating the affected interface.',
        recommendation:
          'Inspect the affected components and validate the remedy with keyboard and assistive-technology testing.',
        sourceUrls: violation.sourceUrls.filter(Boolean),
      }),
    );
  });

  const slowPages = performanceReports.filter(
    (report) => numberValue(report.navigation, 'loadMs') > 3_000,
  );
  if (slowPages.length) {
    const maxLoadMs = Math.max(
      ...slowPages.map((report) => numberValue(report.navigation, 'loadMs')),
    );
    findings.push(
      addFinding({
        area: 'Performance',
        severity: 'medium',
        title: 'Captured navigation timing indicates slow page loads',
        finding: `${slowPages.length} captured ${slowPages.length === 1 ? 'page recorded' : 'pages recorded'} a load event above 3 seconds; the highest recorded value was ${maxLoadMs} ms. This is a lab-style capture signal, not a field performance measurement.`,
        customerImpact:
          'Long waits can interrupt the browsing journey, particularly on slower devices or connections.',
        recommendation:
          'Profile the affected pages for render-blocking resources, oversized media, third-party scripts, and avoidable network work.',
        sourceUrls: slowPages.map((report) => report.sourceUrl).filter(Boolean),
        findingClass: 'observed_condition',
        confidence: 'medium',
        measurement: {
          maximumLoadMs: maxLoadMs,
          measuredPages: slowPages.map((report) => ({
            sourceUrl: report.sourceUrl,
            loadMs: numberValue(report.navigation, 'loadMs'),
          })),
        },
      }),
    );
  }

  return findings;
}

export const auditSpecialistKinds = [
  'responsive_ui',
  'accessibility',
  'performance_engineering',
  'technical_seo',
  'conversion_journey',
  'platform_integrations',
];

const areasBySpecialist = {
  responsive_ui: new Set(['UI', 'UX', 'Mobile']),
  accessibility: new Set(['Accessibility']),
  performance_engineering: new Set(['Performance']),
  technical_seo: new Set(['SEO', 'Content']),
  conversion_journey: new Set(['Trust', 'Conversion']),
};

function platformFindings(input) {
  const reports = input.performanceReports ?? [];
  const platformUrls = new Map();
  reports.forEach((report) => {
    const structure = report.structure ?? {};
    const signals = [
      ...(Array.isArray(structure.integrations) ? structure.integrations : []),
      ...(Array.isArray(structure.images) ? structure.images.map((image) => image.src) : []),
    ].filter((value) => typeof value === 'string');
    if (signals.some((value) => /wixstatic\.com|wix\.com/i.test(value))) {
      platformUrls.set(report.sourceUrl, 'Wix');
    }
  });
  const wixUrls = [...platformUrls.entries()]
    .filter(([, platform]) => platform === 'Wix')
    .map(([url]) => url)
    .filter(Boolean);
  if (!wixUrls.length) return [];
  const artifactsByUrl = new Map();
  (input.evidenceArtifacts ?? []).forEach((artifact) => {
    if (!artifact.sourceUrl || !artifact.id) return;
    artifactsByUrl.set(artifact.sourceUrl, [
      ...(artifactsByUrl.get(artifact.sourceUrl) ?? []),
      artifact.id,
    ]);
  });
  const factsByUrl = new Map();
  (input.facts ?? []).forEach((fact) => {
    if (!fact.source_url || !fact.id) return;
    factsByUrl.set(fact.source_url, [...(factsByUrl.get(fact.source_url) ?? []), fact.id]);
  });
  return [
    finding({
      area: 'Platform',
      severity: 'low',
      title: 'Wix platform signals were observed in the captured website',
      finding:
        'Captured pages reference Wix-hosted website resources. This identifies the current delivery platform; it does not, by itself, establish a defect.',
      customerImpact:
        'Platform choice matters when the business needs capabilities, editing workflows, or portability that the current setup may not provide.',
      recommendation:
        'Compare the business’s actual editing, integration, ownership, and portability needs before recommending that it keep or change platform.',
      sourceUrls: wixUrls,
      factsByUrl,
      artifactsByUrl,
      findingClass: 'observed_condition',
      confidence: 'medium',
      measurement: { platform: 'Wix', signalPageCount: wixUrls.length },
    }),
  ];
}

export function generateSpecialistAuditFindings(specialistKind, input) {
  if (!auditSpecialistKinds.includes(specialistKind)) {
    throw new Error(`Unsupported audit specialist: ${specialistKind}`);
  }
  if (specialistKind === 'platform_integrations') return platformFindings(input);
  const areas = areasBySpecialist[specialistKind];
  return generateAuditFindings(input).filter((entry) => areas?.has(entry.area));
}
