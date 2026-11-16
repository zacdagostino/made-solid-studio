import sharp from 'sharp';

// Email animations are assembled beside Chromium and the Studio workers. Avoid
// retaining decoded libvips images after each frame has been copied into the
// explicitly bounded stack below.
sharp.cache({ memory: 0, files: 0, items: 0 });
sharp.concurrency(1);

const maximumEmailGifBytes = 1_900_000;
const maximumRawAnimationBytes = 64 * 1024 * 1024;
const scrollPixelsPerSecond = 120;
const maximumScrollDurationMs = 18_000;
const minimumScrollDurationMs = 8_000;
const targetFrameDelayMs = 100;
const responsiveComparisonFrameDelayMs = 80;
const transitionFrameCount = 6;
const gifEncodingEffort = 1;
export const capturedHomepageProfile = { width: 420, height: 263, colours: 24 };
export const pairedDesktopProfile = {
  width: 560,
  height: 203,
  panelWidth: 276,
  panelHeight: 172,
  labelHeight: 31,
  gap: 8,
  colours: 24,
};
export const responsiveDesktopProfile = { width: 272, height: 170, colours: 24 };
export const pairedMobileProfile = {
  width: 340,
  height: 390,
  panelWidth: 166,
  panelHeight: 359,
  labelHeight: 31,
  gap: 8,
  colours: 24,
};

const outputProfiles = [
  { width: 420, height: 263, colours: 24 },
  { width: 360, height: 225, colours: 20 },
  { width: 320, height: 200, colours: 16 },
];

function linearPosition(progress, distance) {
  return Math.round(distance * progress);
}

export function scrollingHomepageTimeline(distance, frameBytes) {
  const scrollDurationMs = Math.min(
    maximumScrollDurationMs,
    Math.max(minimumScrollDurationMs, Math.round((distance / scrollPixelsPerSecond) * 1_000)),
  );
  const fixedFrameCount = 1 + transitionFrameCount * 2;
  const memoryLimitedFrames = Math.max(
    12,
    Math.floor(maximumRawAnimationBytes / Math.max(1, frameBytes)) - fixedFrameCount,
  );
  const scrollFrameCount = Math.max(
    12,
    Math.min(Math.ceil(scrollDurationMs / targetFrameDelayMs), memoryLimitedFrames),
  );
  const scrollDelayMs = Math.max(
    targetFrameDelayMs,
    Math.round(scrollDurationMs / scrollFrameCount),
  );
  const positions = Array.from({ length: scrollFrameCount }, (_, index) =>
    linearPosition((index + 1) / scrollFrameCount, distance),
  );
  return {
    positions,
    scrollDelayMs,
    scrollDurationMs: scrollDelayMs * scrollFrameCount,
    loadingFrameCount: 1,
    revealFrameCount: transitionFrameCount,
    scrollFrameCount,
    resetFrameCount: transitionFrameCount,
    frameCount: fixedFrameCount + scrollFrameCount,
  };
}

export function comparisonHomepageTimeline(distance) {
  const scrollDurationMs = Math.min(6_000, Math.max(4_000, Math.round((distance / 220) * 1_000)));
  const scrollFrameCount = Math.max(18, Math.ceil(scrollDurationMs / targetFrameDelayMs));
  const scrollDelayMs = Math.max(
    targetFrameDelayMs,
    Math.round(scrollDurationMs / scrollFrameCount),
  );
  return {
    positions: Array.from({ length: scrollFrameCount }, (_, index) =>
      linearPosition((index + 1) / scrollFrameCount, distance),
    ),
    scrollDelayMs,
    scrollDurationMs: scrollDelayMs * scrollFrameCount,
    scrollFrameCount,
  };
}

export function pairedComparisonTimeline(frameBytes, fixedFrameCount = 0) {
  const scrollDurationMs = 22_000;
  const memoryLimitedFrames = Math.max(
    40,
    Math.floor(maximumRawAnimationBytes / Math.max(1, frameBytes)) - fixedFrameCount - 6,
  );
  const scrollFrameCount = Math.min(110, memoryLimitedFrames);
  const scrollDelayMs = Math.round(scrollDurationMs / scrollFrameCount);
  return {
    progress: Array.from(
      { length: scrollFrameCount },
      (_, index) => (index + 1) / scrollFrameCount,
    ),
    scrollDelayMs,
    scrollDurationMs: scrollDelayMs * scrollFrameCount,
    scrollFrameCount,
  };
}

export function responsiveComparisonTimeline(frameBytes, fixedFrameCount = 0) {
  const scrollDurationMs = 22_000;
  const memoryLimitedFrames = Math.max(
    80,
    Math.floor(maximumRawAnimationBytes / Math.max(1, frameBytes)) - fixedFrameCount - 6,
  );
  const scrollFrameCount = Math.min(
    Math.ceil(scrollDurationMs / responsiveComparisonFrameDelayMs),
    memoryLimitedFrames,
  );
  const scrollDelayMs = Math.max(
    responsiveComparisonFrameDelayMs,
    Math.round(scrollDurationMs / scrollFrameCount),
  );
  return {
    progress: Array.from(
      { length: scrollFrameCount },
      (_, index) => (index + 1) / scrollFrameCount,
    ),
    scrollDelayMs,
    scrollDurationMs: scrollDelayMs * scrollFrameCount,
    scrollFrameCount,
  };
}

function cropRawFrame(source, width, channels, top, height) {
  const rowBytes = width * channels;
  const start = top * rowBytes;
  const end = start + height * rowBytes;
  return source.subarray(start, end);
}

function blendRawFrames(from, to, progress) {
  const blended = Buffer.allocUnsafe(from.length);
  const inverse = 1 - progress;
  for (let index = 0; index < from.length; index += 1) {
    blended[index] = Math.round(from[index] * inverse + to[index] * progress);
  }
  return blended;
}

function wipeRawFrames(from, to, width, height, progress) {
  const output = Buffer.from(from);
  const revealWidth = Math.max(0, Math.min(width, Math.round(width * progress)));
  const rowBytes = width * 3;
  const revealBytes = revealWidth * 3;
  for (let row = 0; row < height; row += 1) {
    const offset = row * rowBytes;
    to.copy(output, offset, offset, offset + revealBytes);
  }
  return output;
}

function writeFrame(target, frameBytes, index, frame) {
  frame.copy(target, index * frameBytes);
}

async function rawOpeningFrame(source, width, height) {
  if (!source) return undefined;
  return sharp(source).resize(width, height, { fit: 'fill' }).removeAlpha().raw().toBuffer();
}

async function rawCapturedFrame(source, profile = capturedHomepageProfile) {
  return sharp(source)
    .resize(profile.width, profile.height, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer();
}

async function rawLabelledFrame(source, label, profile = capturedHomepageProfile) {
  const width = profile.width;
  const labelWidth = Math.min(width - 20, Math.max(126, label.length * 7 + 28));
  const overlay = Buffer.from(
    `<svg width="${width}" height="${profile.height}" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="${labelWidth}" height="30" fill="#171914"/><text x="24" y="30" fill="#dcff0a" font-family="Arial,Helvetica,sans-serif" font-size="11" font-weight="700" letter-spacing="1">${label}</text></svg>`,
  );
  return sharp(source)
    .resize(width, profile.height, { fit: 'fill' })
    .composite([{ input: overlay, top: 0, left: 0 }])
    .removeAlpha()
    .raw()
    .toBuffer();
}

async function rawSideBySideFrame(current, redesign, profile) {
  const label = Buffer.from(
    `<svg width="${profile.width}" height="${profile.height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ecebe4"/><rect width="${profile.panelWidth}" height="${profile.labelHeight}" fill="#171914"/><rect x="${profile.panelWidth + profile.gap}" width="${profile.panelWidth}" height="${profile.labelHeight}" fill="#171914"/><text x="12" y="21" fill="#dcff0a" font-family="Arial,Helvetica,sans-serif" font-size="10" font-weight="700" letter-spacing="1.1">CURRENT</text><text x="${profile.panelWidth + profile.gap + 12}" y="21" fill="#dcff0a" font-family="Arial,Helvetica,sans-serif" font-size="10" font-weight="700" letter-spacing="1.1">REDESIGN</text></svg>`,
  );
  const [currentPanel, redesignPanel] = await Promise.all([
    sharp(current)
      .resize(profile.panelWidth, profile.panelHeight, { fit: 'contain', background: '#ffffff' })
      .removeAlpha()
      .jpeg({ quality: 82 })
      .toBuffer(),
    sharp(redesign)
      .resize(profile.panelWidth, profile.panelHeight, { fit: 'contain', background: '#ffffff' })
      .removeAlpha()
      .jpeg({ quality: 82 })
      .toBuffer(),
  ]);
  return sharp(label)
    .composite([
      { input: currentPanel, left: 0, top: profile.labelHeight },
      { input: redesignPanel, left: profile.panelWidth + profile.gap, top: profile.labelHeight },
    ])
    .removeAlpha()
    .raw()
    .toBuffer();
}

export async function capturedPairedHomepageGif(input, options = {}) {
  const profile = options.profile;
  const pairs = input?.pairs ?? [];
  const delays = [...(input?.delays ?? [])];
  if (!profile || !pairs.length || pairs.length !== delays.length) {
    throw new Error('Paired homepage frames are incomplete.');
  }
  const frameBytes = profile.width * profile.height * 3;
  const frameCount = pairs.length + transitionFrameCount;
  if (frameBytes * frameCount > maximumRawAnimationBytes) {
    throw new Error('Paired homepage animation exceeds the raw frame memory limit.');
  }
  const stackedFrames = Buffer.allocUnsafe(frameBytes * frameCount);
  let openingFrame;
  let closingFrame;
  for (const [index, pair] of pairs.entries()) {
    const raw = await rawSideBySideFrame(pair.current, pair.redesign, profile);
    writeFrame(stackedFrames, frameBytes, index, raw);
    if (index === 0) openingFrame = Buffer.from(raw);
    if (index === pairs.length - 1) closingFrame = Buffer.from(raw);
  }
  for (let index = 1; index <= transitionFrameCount; index += 1) {
    writeFrame(
      stackedFrames,
      frameBytes,
      pairs.length + index - 1,
      blendRawFrames(closingFrame, openingFrame, index / transitionFrameCount),
    );
    delays.push(120);
  }
  const encodings = [
    { colours: profile.colours, dither: 0.3, interFrameMaxError: 8, interPaletteMaxError: 12 },
    { colours: 16, dither: 0.2, interFrameMaxError: 10, interPaletteMaxError: 16 },
    { colours: 12, dither: 0.1, interFrameMaxError: 14, interPaletteMaxError: 24 },
    { colours: 8, dither: 0, interFrameMaxError: 18, interPaletteMaxError: 32 },
  ];
  for (const encoding of encodings) {
    const content = await encodeFrameStack(stackedFrames, frameCount, delays, profile, encoding);
    if (content.length <= maximumEmailGifBytes) {
      return {
        content,
        width: profile.width,
        height: profile.height,
        frameCount,
        durationMs: delays.reduce((total, delay) => total + delay, 0),
        phases: {
          loading: input.loadingFrameCount ?? 0,
          reveal: input.revealFrameCount ?? 0,
          scroll: input.scrollFrameCount ?? 0,
          reset: transitionFrameCount,
        },
      };
    }
  }
  return null;
}

export async function capturedResponsiveHomepageGifs(input, options = {}) {
  const profile = options.profile ?? responsiveDesktopProfile;
  const pairs = input?.pairs ?? [];
  const delays = [...(input?.delays ?? [])];
  if (!pairs.length || pairs.length !== delays.length) {
    throw new Error('Responsive homepage frames are incomplete.');
  }
  const animationOptions = {
    profile,
    delays,
    loadingFrameCount: input.loadingFrameCount ?? 0,
    revealFrameCount: input.revealFrameCount ?? 0,
    scrollFrameCount: input.scrollFrameCount ?? 0,
  };
  // Encode sequentially so the two smoother animations never hold both raw
  // frame stacks in memory at the same time.
  const current = await capturedHomepageGif(
    pairs.map((pair) => pair.current),
    animationOptions,
  );
  const redesign = await capturedHomepageGif(
    pairs.map((pair) => pair.redesign),
    animationOptions,
  );
  return current && redesign ? { current, redesign } : null;
}

async function encodeFrameStack(stackedFrames, frameCount, delays, profile, encoding) {
  return sharp(stackedFrames, {
    raw: {
      width: profile.width,
      height: profile.height * frameCount,
      channels: 3,
      pageHeight: profile.height,
    },
  })
    .gif({
      loop: 0,
      delay: delays,
      colours: encoding.colours,
      effort: gifEncodingEffort,
      dither: encoding.dither,
      interFrameMaxError: encoding.interFrameMaxError,
      interPaletteMaxError: encoding.interPaletteMaxError,
      keepDuplicateFrames: true,
    })
    .toBuffer();
}

export async function capturedHomepageGif(frames, options) {
  const profile = options?.profile ?? capturedHomepageProfile;
  const delays = [...(options?.delays ?? [])];
  const loadingFrameCount = options?.loadingFrameCount ?? 0;
  const revealFrameCount = options?.revealFrameCount ?? 0;
  const scrollFrameCount = options?.scrollFrameCount ?? 0;
  if (
    !frames.length ||
    delays.length !== frames.length ||
    loadingFrameCount + revealFrameCount + scrollFrameCount !== frames.length
  ) {
    throw new Error('Captured homepage frames do not match their animation phases.');
  }
  const frameBytes = profile.width * profile.height * 3;
  const frameCount = frames.length + transitionFrameCount;
  if (frameBytes * frameCount > maximumRawAnimationBytes) {
    throw new Error('Captured homepage animation exceeds the raw frame memory limit.');
  }
  const stackedFrames = Buffer.allocUnsafe(frameBytes * frameCount);
  let openingFrame;
  let closingFrame;
  for (const [index, frame] of frames.entries()) {
    const raw = await rawCapturedFrame(frame, profile);
    writeFrame(stackedFrames, frameBytes, index, raw);
    if (index === 0) openingFrame = Buffer.from(raw);
    if (index === frames.length - 1) closingFrame = Buffer.from(raw);
  }
  for (let index = 1; index <= transitionFrameCount; index += 1) {
    writeFrame(
      stackedFrames,
      frameBytes,
      frames.length + index - 1,
      blendRawFrames(closingFrame, openingFrame, index / transitionFrameCount),
    );
    delays.push(100);
  }
  const encodings = [
    { colours: profile.colours, dither: 0.3, interFrameMaxError: 8, interPaletteMaxError: 12 },
    { colours: 16, dither: 0.2, interFrameMaxError: 10, interPaletteMaxError: 16 },
    { colours: 12, dither: 0.1, interFrameMaxError: 14, interPaletteMaxError: 24 },
    { colours: 8, dither: 0, interFrameMaxError: 18, interPaletteMaxError: 32 },
  ];
  for (const encoding of encodings) {
    const content = await encodeFrameStack(stackedFrames, frameCount, delays, profile, encoding);
    if (content.length <= maximumEmailGifBytes) {
      return {
        content,
        width: profile.width,
        height: profile.height,
        frameCount,
        durationMs: delays.reduce((total, delay) => total + delay, 0),
        phases: {
          loading: loadingFrameCount,
          reveal: revealFrameCount,
          scroll: scrollFrameCount,
          reset: transitionFrameCount,
        },
      };
    }
  }
  return null;
}

export async function capturedBeforeAfterHomepageGif(input, options = {}) {
  const profile = options.profile ?? capturedHomepageProfile;
  const newFrames = input?.newFrames ?? [];
  const newDelays = [...(input?.newDelays ?? [])];
  if (
    !input?.beforeDesktop ||
    !input?.beforeMobile ||
    !input?.afterMobile ||
    !newFrames.length ||
    newFrames.length !== newDelays.length
  ) {
    throw new Error('Before-and-after homepage frames are incomplete.');
  }

  const frameBytes = profile.width * profile.height * 3;
  const frameCount =
    1 +
    transitionFrameCount +
    newFrames.length +
    1 +
    transitionFrameCount +
    1 +
    transitionFrameCount;
  if (frameBytes * frameCount > maximumRawAnimationBytes) {
    throw new Error('Before-and-after homepage animation exceeds the raw frame memory limit.');
  }
  const stackedFrames = Buffer.allocUnsafe(frameBytes * frameCount);
  const delays = [];
  let frameIndex = 0;
  const beforeDesktop = await rawLabelledFrame(input.beforeDesktop, 'CURRENT WEBSITE', profile);
  const firstRedesignedFrame = await rawLabelledFrame(newFrames[0], 'NEW REDESIGN', profile);
  writeFrame(stackedFrames, frameBytes, frameIndex, beforeDesktop);
  delays.push(1_400);
  frameIndex += 1;

  for (let index = 1; index <= transitionFrameCount; index += 1) {
    writeFrame(
      stackedFrames,
      frameBytes,
      frameIndex,
      wipeRawFrames(
        beforeDesktop,
        firstRedesignedFrame,
        profile.width,
        profile.height,
        index / transitionFrameCount,
      ),
    );
    delays.push(index === transitionFrameCount ? 300 : 100);
    frameIndex += 1;
  }
  for (const [index, source] of newFrames.entries()) {
    const frame =
      index === 0 ? firstRedesignedFrame : await rawLabelledFrame(source, 'NEW REDESIGN', profile);
    writeFrame(stackedFrames, frameBytes, frameIndex, frame);
    delays.push(newDelays[index]);
    frameIndex += 1;
  }

  const beforeMobile = await rawLabelledFrame(input.beforeMobile, 'MOBILE · CURRENT', profile);
  const afterMobile = await rawLabelledFrame(input.afterMobile, 'MOBILE · REDESIGN', profile);
  writeFrame(stackedFrames, frameBytes, frameIndex, beforeMobile);
  delays.push(1_200);
  frameIndex += 1;
  for (let index = 1; index <= transitionFrameCount; index += 1) {
    writeFrame(
      stackedFrames,
      frameBytes,
      frameIndex,
      wipeRawFrames(
        beforeMobile,
        afterMobile,
        profile.width,
        profile.height,
        index / transitionFrameCount,
      ),
    );
    delays.push(100);
    frameIndex += 1;
  }
  writeFrame(stackedFrames, frameBytes, frameIndex, afterMobile);
  delays.push(1_400);
  frameIndex += 1;

  for (let index = 1; index <= transitionFrameCount; index += 1) {
    writeFrame(
      stackedFrames,
      frameBytes,
      frameIndex,
      blendRawFrames(afterMobile, beforeDesktop, index / transitionFrameCount),
    );
    delays.push(100);
    frameIndex += 1;
  }

  for (const colours of [profile.colours, 20, 16, 12]) {
    const content = await encodeFrameStack(stackedFrames, frameCount, delays, profile, {
      colours,
      dither: 0.3,
      interFrameMaxError: 8,
      interPaletteMaxError: 12,
    });
    if (content.length <= maximumEmailGifBytes) {
      return {
        content,
        width: profile.width,
        height: profile.height,
        frameCount,
        durationMs: delays.reduce((total, delay) => total + delay, 0),
        phases: {
          beforeDesktop: 1,
          desktopWipe: transitionFrameCount,
          loading: input.loadingFrameCount ?? 0,
          reveal: input.revealFrameCount ?? 0,
          scroll: input.scrollFrameCount ?? 0,
          beforeMobile: 1,
          mobileWipe: transitionFrameCount,
          afterMobile: 1,
          reset: transitionFrameCount,
        },
      };
    }
  }
  return null;
}

export async function encodeScrollingHomepageGifProfile(source, profile, options = {}) {
  const { data, info } = await sharp(source, { limitInputPixels: 1200 * 16_000 })
    .resize({ width: profile.width, withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const frameHeight = Math.min(profile.height, info.height);
  const distance = Math.max(0, info.height - frameHeight);
  if (distance < 80) return null;

  const frameBytes = info.width * frameHeight * info.channels;
  const timeline = scrollingHomepageTimeline(distance, frameBytes);
  const firstHomepageFrame = cropRawFrame(data, info.width, info.channels, 0, frameHeight);
  const loadingFrame =
    (await rawOpeningFrame(options.loadingFrame, info.width, frameHeight)) ?? firstHomepageFrame;
  const bottomFrame = cropRawFrame(data, info.width, info.channels, distance, frameHeight);
  const stackedFrames = Buffer.allocUnsafe(frameBytes * timeline.frameCount);
  const delays = [];
  let frameIndex = 0;

  writeFrame(stackedFrames, frameBytes, frameIndex, loadingFrame);
  delays.push(1_200);
  frameIndex += 1;

  for (let index = 1; index <= timeline.revealFrameCount; index += 1) {
    const progress = index / timeline.revealFrameCount;
    writeFrame(
      stackedFrames,
      frameBytes,
      frameIndex,
      blendRawFrames(loadingFrame, firstHomepageFrame, progress),
    );
    delays.push(index === timeline.revealFrameCount ? 900 : 100);
    frameIndex += 1;
  }

  for (const [index, top] of timeline.positions.entries()) {
    writeFrame(
      stackedFrames,
      frameBytes,
      frameIndex,
      cropRawFrame(data, info.width, info.channels, top, frameHeight),
    );
    delays.push(index === timeline.positions.length - 1 ? 1_000 : timeline.scrollDelayMs);
    frameIndex += 1;
  }

  for (let index = 1; index <= timeline.resetFrameCount; index += 1) {
    writeFrame(
      stackedFrames,
      frameBytes,
      frameIndex,
      blendRawFrames(bottomFrame, loadingFrame, index / timeline.resetFrameCount),
    );
    delays.push(100);
    frameIndex += 1;
  }

  const content = await sharp(stackedFrames, {
    raw: {
      width: info.width,
      height: frameHeight * timeline.frameCount,
      channels: info.channels,
      pageHeight: frameHeight,
    },
  })
    .gif({
      loop: 0,
      delay: delays,
      colours: profile.colours,
      effort: gifEncodingEffort,
      dither: 0.3,
      interFrameMaxError: 8,
      interPaletteMaxError: 12,
      keepDuplicateFrames: true,
    })
    .toBuffer();
  return {
    content,
    width: info.width,
    height: frameHeight,
    frameCount: timeline.frameCount,
    durationMs: delays.reduce((total, delay) => total + delay, 0),
    phases: {
      loading: timeline.loadingFrameCount,
      reveal: timeline.revealFrameCount,
      scroll: timeline.scrollFrameCount,
      reset: timeline.resetFrameCount,
    },
  };
}

export async function scrollingHomepageGif(source, options = {}) {
  for (const profile of outputProfiles) {
    const output = await encodeScrollingHomepageGifProfile(source, profile, options);
    if (!output) return null;
    if (output.content.length <= maximumEmailGifBytes) return output;
  }
  return null;
}

export const scrollingHomepageGifLimit = maximumEmailGifBytes;
