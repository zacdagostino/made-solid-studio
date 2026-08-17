import { getFontEmbedCSS, toPng } from 'html-to-image';

const captureAssetEndpoint = '/__made-solid/capture-asset';
const transparentPixel =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4AWJiYGBgAAAAAP//XRcpzQAAAAZJREFUAwAADwADJDd96QAAAABJRU5ErkJggg==';
const captureTimeoutMs = 10_000;

let fontCssPromise: Promise<string> | undefined;

function captureRoot() {
  return (
    document.querySelector<HTMLElement>('.app-shell') ??
    document.querySelector<HTMLElement>('.private-preview-shell') ??
    document.querySelector<HTMLElement>('.auth-shell') ??
    document.querySelector<HTMLElement>('#root')
  );
}

function embeddedFontCss(root: HTMLElement) {
  fontCssPromise ??= document.fonts.ready
    .then(() => getFontEmbedCSS(root, { preferredFontFormat: 'woff2' }))
    .catch((error) => {
      fontCssPromise = undefined;
      throw error;
    });
  return fontCssPromise;
}

function blobDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('A visible image could not be prepared.'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

async function embeddedImageUrl(url: string) {
  try {
    const response = await fetch(url, { cache: 'force-cache', credentials: 'include' });
    if (!response.ok) throw new Error('Image request failed.');
    return await blobDataUrl(await response.blob());
  } catch {
    const response = await fetch(captureAssetEndpoint, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const result = (await response.json()) as { dataUrl?: string; detail?: string };
    if (!response.ok || !result.dataUrl?.startsWith('data:image/')) {
      throw new Error(result.detail || 'A visible image could not be included in the screenshot.');
    }
    return result.dataUrl;
  }
}

async function inlineVisibleImages(root: HTMLElement) {
  const width = window.visualViewport?.width ?? window.innerWidth;
  const height = window.visualViewport?.height ?? window.innerHeight;
  const images = [...root.querySelectorAll<HTMLImageElement>('img')].filter((image) => {
    const bounds = image.getBoundingClientRect();
    return (
      bounds.width > 0 &&
      bounds.height > 0 &&
      bounds.right > 0 &&
      bounds.bottom > 0 &&
      bounds.left < width &&
      bounds.top < height
    );
  });
  const restorers: Array<() => void> = [];
  try {
    await Promise.all(
      images.map(async (image) => {
        const source = image.currentSrc || image.src;
        if (!source || source.startsWith('data:') || source.startsWith('blob:')) return;
        const originalSource = image.getAttribute('src');
        const originalSourceSet = image.getAttribute('srcset');
        const originalSizes = image.getAttribute('sizes');
        const embedded = await embeddedImageUrl(source);
        const restore = () => {
          if (originalSource === null) image.removeAttribute('src');
          else image.setAttribute('src', originalSource);
          if (originalSourceSet === null) image.removeAttribute('srcset');
          else image.setAttribute('srcset', originalSourceSet);
          if (originalSizes === null) image.removeAttribute('sizes');
          else image.setAttribute('sizes', originalSizes);
        };
        restorers.push(restore);
        image.removeAttribute('srcset');
        image.removeAttribute('sizes');
        image.src = embedded;
        await image.decode();
      }),
    );
  } catch (error) {
    for (const restore of restorers.reverse()) restore();
    throw error;
  }
  return () => {
    for (const restore of restorers.reverse()) restore();
  };
}

function excludeCaptureControls(node: HTMLElement) {
  if (!(node instanceof Element)) return true;
  return !(
    node.hasAttribute('data-made-solid-codex-panel') ||
    node.classList?.contains('codex-feedback-trigger') ||
    node.classList?.contains('codex-feedback-overlay') ||
    node.classList?.contains('codex-feedback-dialog') ||
    node.classList?.contains('codex-feedback-capturing')
  );
}

function preserveMainScroll(root: HTMLElement) {
  const main = root.matches('.app-shell')
    ? root.querySelector<HTMLElement>(':scope > main')
    : undefined;
  const content = main?.firstElementChild;
  if (!main || !(content instanceof HTMLElement) || (!main.scrollTop && !main.scrollLeft)) {
    return () => undefined;
  }

  const scrollTop = main.scrollTop;
  const scrollLeft = main.scrollLeft;
  const mainScrollBehavior = main.style.scrollBehavior;
  const contentPosition = content.style.position;
  const contentTop = content.style.top;
  const contentLeft = content.style.left;

  main.style.scrollBehavior = 'auto';
  content.style.position = 'relative';
  content.style.top = `${-scrollTop}px`;
  content.style.left = `${-scrollLeft}px`;
  main.scrollTo({ top: 0, left: 0, behavior: 'instant' });

  return () => {
    content.style.position = contentPosition;
    content.style.top = contentTop;
    content.style.left = contentLeft;
    main.style.scrollBehavior = mainScrollBehavior;
    main.scrollTo({ top: scrollTop, left: scrollLeft, behavior: 'instant' });
  };
}

function captureDeadline<T>(operation: Promise<T>) {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(
      () =>
        reject(new Error('The mobile screenshot took too long. Try again after the page settles.')),
      captureTimeoutMs,
    );
    operation.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (cause) => {
        window.clearTimeout(timeout);
        reject(cause);
      },
    );
  });
}

export function warmMobileScreenCapture() {
  const root = captureRoot();
  if (root) void embeddedFontCss(root).catch(() => undefined);
}

export async function captureVisiblePage() {
  const root = captureRoot();
  if (!root) throw new Error('The visible Studio page is not ready to capture.');

  const width = Math.max(1, Math.round(window.visualViewport?.width ?? window.innerWidth));
  const height = Math.max(1, Math.round(window.visualViewport?.height ?? window.innerHeight));
  const pixelRatio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const [fontEmbedCSS, restoreImages] = await Promise.all([
    embeddedFontCss(root),
    inlineVisibleImages(root),
  ]);
  const restoreScroll = preserveMainScroll(root);

  try {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const screenshot = await captureDeadline(
      toPng(root, {
        backgroundColor: getComputedStyle(document.documentElement).backgroundColor || '#ffffff',
        cacheBust: false,
        canvasHeight: height,
        canvasWidth: width,
        fetchRequestInit: { cache: 'force-cache', credentials: 'include' },
        filter: excludeCaptureControls,
        fontEmbedCSS,
        height,
        imagePlaceholder: transparentPixel,
        includeQueryParams: true,
        pixelRatio,
        preferredFontFormat: 'woff2',
        skipAutoScale: false,
        width,
      }),
    );
    if (!screenshot.startsWith('data:image/png;base64,') || screenshot.length < 1_000) {
      throw new Error('The mobile browser returned an incomplete screenshot.');
    }
    return screenshot;
  } finally {
    restoreScroll();
    restoreImages();
  }
}
