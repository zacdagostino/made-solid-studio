import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractLogoPalette,
  lockRasterColoursToSource,
  vectorizeRasterLogo,
} from '../../worker/logo-vectorizer.mjs';
import { transparentLogoVariants } from '../../worker/logo-variants.mjs';

function raster(width, height) {
  return new Uint8ClampedArray(width * height * 4);
}

function fill(data, width, left, top, right, bottom, colour) {
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const pixel = (y * width + x) * 4;
      data.set([...colour, 255], pixel);
    }
  }
}

function fillCircle(data, width, centerX, centerY, radius, colour) {
  for (let y = centerY - radius; y <= centerY + radius; y += 1) {
    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      if ((x - centerX) ** 2 + (y - centerY) ** 2 > radius ** 2) continue;
      const pixel = (y * width + x) * 4;
      data.set([...colour, 255], pixel);
    }
  }
}

test('traces a multi-colour raster logo without replacing its palette', async () => {
  const width = 48;
  const height = 32;
  const data = raster(width, height);
  fill(data, width, 4, 4, 18, 28, [15, 112, 88]);
  fill(data, width, 18, 4, 32, 28, [215, 81, 42]);
  fill(data, width, 32, 4, 44, 28, [34, 73, 153]);

  const { svg, sourceColours } = await vectorizeRasterLogo({ width, height, data });

  assert.match(svg, /<svg\b/);
  assert.match(svg, /data-siteforge-vectorizer="vtracer"/);
  assert.match(svg, /<path\b/);
  assert.doesNotMatch(svg, /data:image/i);
  assert.deepEqual(sourceColours, ['#0F7058', '#D7512A', '#224999']);
  for (const colour of sourceColours) assert.match(svg, new RegExp(`fill="${colour}"`));
});

test('uses the pixel fitter for a compact, pixelated logo', async () => {
  const width = 16;
  const height = 16;
  const data = raster(width, height);
  fill(data, width, 2, 2, 6, 14, [240, 88, 62]);
  fill(data, width, 6, 6, 14, 10, [240, 88, 62]);
  fill(data, width, 9, 2, 14, 6, [35, 55, 105]);

  const { mode, svg } = await vectorizeRasterLogo({ width, height, data });

  assert.equal(mode, 'pixel');
  assert.match(svg, /data-siteforge-trace-mode="pixel"/);
  assert.match(svg, /fill="#F0583E"/);
  assert.match(svg, /fill="#233769"/);
});

test('removes a plain white AI-edit backdrop while retaining the original source palette', async () => {
  const width = 64;
  const height = 40;
  const data = raster(width, height);
  fill(data, width, 0, 0, width, height, [255, 255, 255]);
  fill(data, width, 8, 8, 32, 32, [23, 89, 182]);
  fill(data, width, 32, 8, 56, 32, [209, 66, 57]);

  const image = { width, height, data };
  const referencePalette = extractLogoPalette(image);
  const { svg, sourceColours } = await vectorizeRasterLogo(image, { referencePalette });

  assert.deepEqual(sourceColours, ['#1759B6', '#D14239']);
  assert.doesNotMatch(svg, /fill="#FFFFFF"/);
});

test('uses the geometry-safe simplification path for wide, low-colour wordmarks', async () => {
  const width = 360;
  const height = 120;
  const data = raster(width, height);
  fill(data, width, 20, 20, 110, 100, [35, 59, 83]);
  fill(data, width, 140, 32, 320, 88, [169, 178, 192]);

  const { mode, simplifier, svg, sourceColours } = await vectorizeRasterLogo(
    { width, height, data },
    { simplifyGeometry: true },
  );

  assert.equal(mode, 'polygon');
  assert.equal(simplifier, 'geometry-polygon-v1');
  assert.match(svg, /data-siteforge-simplifier="geometry-polygon-v1"/);
  assert.deepEqual([...sourceColours].sort(), ['#233B53', '#A9B2C0']);
});

test('keeps geometry simplification off unless a conversion explicitly requests it', async () => {
  const width = 360;
  const height = 120;
  const data = raster(width, height);
  fill(data, width, 20, 20, 110, 100, [35, 59, 83]);
  fill(data, width, 140, 32, 320, 88, [169, 178, 192]);

  const { mode, simplifier, svg } = await vectorizeRasterLogo({ width, height, data });

  assert.equal(mode, 'spline');
  assert.equal(simplifier, undefined);
  assert.doesNotMatch(svg, /data-siteforge-simplifier=/);
});

test('uses straight and curve tracers together when a logo contains both geometry types', async () => {
  const width = 360;
  const height = 160;
  const data = raster(width, height);
  fill(data, width, 20, 30, 130, 130, [35, 59, 83]);
  fillCircle(data, width, 265, 80, 52, [35, 59, 83]);

  const { mode, simplifier, svg } = await vectorizeRasterLogo(
    { width, height, data },
    { simplifyGeometry: true },
  );

  assert.equal(mode, 'hybrid');
  assert.equal(simplifier, 'geometry-hybrid-fit-v1');
  assert.match(svg, /data-siteforge-trace-mode="hybrid"/);
  assert.match(svg, /data-siteforge-simplifier="geometry-hybrid-fit-v1"/);
});

test('locks an AI-cleaned outline back to the approved source colours', () => {
  const sourceWidth = 40;
  const sourceHeight = 20;
  const source = raster(sourceWidth, sourceHeight);
  fill(source, sourceWidth, 0, 0, sourceWidth, sourceHeight, [255, 255, 255]);
  fill(source, sourceWidth, 4, 4, 18, 16, [35, 59, 83]);
  fill(source, sourceWidth, 22, 4, 36, 16, [220, 28, 35]);

  const enhancedWidth = 120;
  const enhancedHeight = 60;
  const enhanced = raster(enhancedWidth, enhancedHeight);
  fill(enhanced, enhancedWidth, 0, 0, enhancedWidth, enhancedHeight, [255, 255, 255]);
  fill(enhanced, enhancedWidth, 12, 12, 54, 48, [27, 57, 94]);
  // The clean-up output has lost the original red and made the second shape grey.
  fill(enhanced, enhancedWidth, 66, 12, 108, 48, [176, 184, 198]);

  const sourceImage = { width: sourceWidth, height: sourceHeight, data: source };
  const locked = lockRasterColoursToSource(
    { width: enhancedWidth, height: enhancedHeight, data: enhanced },
    sourceImage,
    extractLogoPalette(sourceImage),
  );

  const blue = (20 * enhancedWidth + 20) * 4;
  const red = (20 * enhancedWidth + 84) * 4;
  assert.deepEqual([...locked.data.slice(blue, blue + 4)], [35, 59, 83, 255]);
  assert.deepEqual([...locked.data.slice(red, red + 4)], [220, 28, 35, 255]);
  assert.equal(locked.data[3], 0);
});

test('creates transparent original, monochrome, and accent logo versions from a flat AI matte', () => {
  const width = 8;
  const height = 4;
  const data = raster(width, height);
  fill(data, width, 0, 0, width, height, [255, 255, 255]);
  fill(data, width, 1, 1, 4, 3, [23, 89, 182]);
  fill(data, width, 4, 1, 7, 3, [209, 66, 57]);

  const variants = transparentLogoVariants({ width, height, data }, [
    { red: 23, green: 89, blue: 182 },
    { red: 209, green: 66, blue: 57 },
  ]);
  const byKey = new Map(variants.map((variant) => [variant.key, variant.data]));
  const backgroundPixel = 0;
  const primaryPixel = (1 * width + 1) * 4;
  const accentPixel = (1 * width + 4) * 4;

  assert.deepEqual(
    [...byKey.keys()],
    ['original', 'black', 'black-accent', 'white', 'white-accent'],
  );
  assert.equal(byKey.get('original')[backgroundPixel + 3], 0);
  assert.deepEqual(
    [...byKey.get('original').slice(primaryPixel, primaryPixel + 4)],
    [23, 89, 182, 255],
  );
  assert.deepEqual([...byKey.get('black').slice(primaryPixel, primaryPixel + 4)], [0, 0, 0, 255]);
  assert.deepEqual(
    [...byKey.get('white-accent').slice(primaryPixel, primaryPixel + 4)],
    [255, 255, 255, 255],
  );
  assert.deepEqual(
    [...byKey.get('white-accent').slice(accentPixel, accentPixel + 4)],
    [209, 66, 57, 255],
  );
});

test('keeps a multicolour logo accent consistent through the AI matte soft edge', () => {
  const width = 16;
  const height = 7;
  const source = raster(width, height);
  const matte = raster(width, height);
  fill(source, width, 0, 0, width, height, [255, 255, 255]);
  fill(matte, width, 0, 0, width, height, [255, 255, 255]);
  fill(source, width, 1, 2, 4, 5, [23, 89, 182]);
  fill(source, width, 7, 2, 10, 5, [209, 66, 57]);
  fill(matte, width, 1, 2, 4, 5, [0, 0, 0]);
  fill(matte, width, 7, 2, 14, 5, [0, 0, 0]);

  // ChatGPT's matte supplies a soft outer edge where the low-resolution colour source is
  // already background. That edge must inherit the adjacent accent region as one clean shape.
  const accentEdge = (3 * width + 13) * 4;
  source[accentEdge] = 23;
  source[accentEdge + 1] = 89;
  source[accentEdge + 2] = 182;
  matte[accentEdge] = 128;
  matte[accentEdge + 1] = 128;
  matte[accentEdge + 2] = 128;

  const variants = transparentLogoVariants(
    { width, height, data: source },
    [
      { red: 23, green: 89, blue: 182 },
      { red: 209, green: 66, blue: 57 },
    ],
    {
      sourceReference: { width, height, data: source },
      alphaMatte: { width, height, data: matte },
      useAiMatteOnly: true,
    },
  );
  const whiteAccent = variants.find((variant) => variant.key === 'white-accent');
  assert.ok(whiteAccent);
  assert.deepEqual([...whiteAccent.data.slice(accentEdge, accentEdge + 4)], [209, 66, 57, 127]);
});

test('rejects background artefacts outside the original logo silhouette during cut-out', () => {
  const width = 10;
  const height = 6;
  const source = raster(width, height);
  const enhanced = raster(width, height);
  fill(source, width, 0, 0, width, height, [255, 255, 255]);
  fill(enhanced, width, 0, 0, width, height, [255, 255, 255]);
  fill(source, width, 3, 2, 7, 4, [23, 89, 182]);
  fill(enhanced, width, 3, 2, 7, 4, [23, 89, 182]);
  // A plausible model artefact: source-coloured pixels outside the known logo boundary.
  fill(enhanced, width, 0, 0, 1, 1, [23, 89, 182]);

  const variants = transparentLogoVariants(
    { width, height, data: enhanced },
    [{ red: 23, green: 89, blue: 182 }],
    { sourceReference: { width, height, data: source } },
  );
  const original = variants.find((variant) => variant.key === 'original');
  assert.ok(original);
  assert.equal(original.data[3], 0);
  assert.deepEqual(
    [...original.data.slice((2 * width + 3) * 4, (2 * width + 3) * 4 + 4)],
    [23, 89, 182, 255],
  );
});
