function nearestPaletteColour(red, green, blue, palette) {
  let closest = palette[0];
  let closestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of palette) {
    const distance =
      (red - candidate.red) ** 2 + (green - candidate.green) ** 2 + (blue - candidate.blue) ** 2;
    if (distance < closestDistance) {
      closest = candidate;
      closestDistance = distance;
    }
  }
  return closest;
}

function nearestPaletteIndex(red, green, blue, palette) {
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < palette.length; index += 1) {
    const candidate = palette[index];
    const distance =
      (red - candidate.red) ** 2 + (green - candidate.green) ** 2 + (blue - candidate.blue) ** 2;
    if (distance < closestDistance) {
      closestIndex = index;
      closestDistance = distance;
    }
  }
  return closestIndex;
}

function colourProfile(colour) {
  const maximum = Math.max(colour.red, colour.green, colour.blue) / 255;
  const minimum = Math.min(colour.red, colour.green, colour.blue) / 255;
  const delta = maximum - minimum;
  let hue = 0;
  if (delta) {
    if (maximum === colour.red / 255) hue = ((colour.green / 255 - colour.blue / 255) / delta) % 6;
    else if (maximum === colour.green / 255)
      hue = (colour.blue / 255 - colour.red / 255) / delta + 2;
    else hue = (colour.red / 255 - colour.green / 255) / delta + 4;
    hue = ((hue * 60 + 360) % 360) / 360;
  }
  return { hue, saturation: maximum ? delta / maximum : 0, value: maximum };
}

function hueDistance(left, right) {
  const difference = Math.abs(left - right);
  return Math.min(difference, 1 - difference);
}

function logoBrandColours(palette) {
  const chromatic = palette.filter((colour) => colourProfile(colour).saturation >= 0.16);
  const candidates = chromatic.length
    ? chromatic
    : palette.filter((colour) => {
        const profile = colourProfile(colour);
        return profile.value < 0.82 || profile.saturation >= 0.05;
      });
  const selected = candidates.filter((candidate) => {
    const profile = colourProfile(candidate);
    return !candidates.some((base) => {
      if (base === candidate) return false;
      const baseProfile = colourProfile(base);
      return (
        hueDistance(baseProfile.hue, profile.hue) <= 0.08 &&
        baseProfile.saturation >= profile.saturation + 0.16 &&
        baseProfile.value <= profile.value + 0.06
      );
    });
  });
  return selected.length ? selected : palette;
}

export function logoMatte(imageData) {
  const { width, height, data } = imageData;
  const stride = Math.max(1, Math.floor(Math.max(width, height) / 80));
  const offsets = new Set();
  for (let x = 0; x < width; x += stride) {
    offsets.add(x * 4);
    offsets.add(((height - 1) * width + x) * 4);
  }
  for (let y = 0; y < height; y += stride) {
    offsets.add(y * width * 4);
    offsets.add((y * width + width - 1) * 4);
  }
  const samples = [...offsets]
    .map((offset) => ({
      red: data[offset],
      green: data[offset + 1],
      blue: data[offset + 2],
      alpha: data[offset + 3],
    }))
    .filter((sample) => sample.alpha >= 250);
  if (samples.length < 8) return undefined;

  // A model edit can produce a very slightly uneven matte. Pick the dominant border colour
  // rather than relying on four corner pixels, so a single noisy corner cannot create a halo.
  const buckets = new Map();
  for (const sample of samples) {
    const key = `${sample.red >> 3}:${sample.green >> 3}:${sample.blue >> 3}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const [dominantKey, dominantCount] = [...buckets.entries()].sort(
    (left, right) => right[1] - left[1],
  )[0] ?? ['', 0];
  if (!dominantKey || dominantCount < samples.length * 0.45) return undefined;
  const [redBucket, greenBucket, blueBucket] = dominantKey.split(':').map(Number);
  const centre = {
    red: redBucket * 8 + 4,
    green: greenBucket * 8 + 4,
    blue: blueBucket * 8 + 4,
  };
  const matching = samples.filter(
    (sample) =>
      (sample.red - centre.red) ** 2 +
        (sample.green - centre.green) ** 2 +
        (sample.blue - centre.blue) ** 2 <=
      28 ** 2,
  );
  if (!matching.length) return undefined;
  return {
    red: matching.reduce((sum, sample) => sum + sample.red, 0) / matching.length,
    green: matching.reduce((sum, sample) => sum + sample.green, 0) / matching.length,
    blue: matching.reduce((sum, sample) => sum + sample.blue, 0) / matching.length,
  };
}

function dilateMask(mask, width, height, radius) {
  if (!radius) return mask;
  const expanded = Uint8Array.from(mask);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue;
      for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
        for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
          const nextX = x + offsetX;
          const nextY = y + offsetY;
          if (nextX >= 0 && nextX < width && nextY >= 0 && nextY < height) {
            expanded[nextY * width + nextX] = 1;
          }
        }
      }
    }
  }
  return expanded;
}

function expectedLogoShape(imageData, palette) {
  const { width, height, data } = imageData;
  const matte = logoMatte(imageData);
  const core = new Uint8Array(width * height);
  const colourIndices = new Int16Array(width * height).fill(-1);
  for (let offset = 0, pixel = 0; offset < data.length; offset += 4, pixel += 1) {
    if (data[offset + 3] < 12) continue;
    const distanceFromMatte = matte
      ? (data[offset] - matte.red) ** 2 +
        (data[offset + 1] - matte.green) ** 2 +
        (data[offset + 2] - matte.blue) ** 2
      : Number.POSITIVE_INFINITY;
    // This is intentionally conservative: a solid source pixel is authoritative about logo
    // geometry, even if the AI clean-up source shifts its colour slightly.
    if (!matte || distanceFromMatte > 36 ** 2) {
      core[pixel] = 1;
      colourIndices[pixel] = nearestPaletteIndex(
        data[offset],
        data[offset + 1],
        data[offset + 2],
        palette,
      );
    }
  }
  return {
    core,
    allowed: dilateMask(
      core,
      width,
      height,
      Math.max(1, Math.round(Math.max(width, height) / 1_200)),
    ),
    colourIndices,
  };
}

function fillTransparentPinholes(data, width, height) {
  // Keep this bounded: the former three-pass, allocation-heavy implementation was run for every
  // colour variant and could hold the worker for minutes on 2K logos. A single conservative pass
  // fixes isolated holes without delaying the first saved result.
  const repairs = [];
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const offset = (y * width + x) * 4;
      if (data[offset + 3] >= 32) continue;
      let opaqueNeighbours = 0;
      let selectedOffset = -1;
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (!offsetX && !offsetY) continue;
          const neighbour = ((y + offsetY) * width + x + offsetX) * 4;
          if (data[neighbour + 3] < 200) continue;
          opaqueNeighbours += 1;
          if (selectedOffset < 0) selectedOffset = neighbour;
        }
      }
      if (opaqueNeighbours >= 7 && selectedOffset >= 0) repairs.push([offset, selectedOffset]);
    }
  }
  for (const [offset, selectedOffset] of repairs) {
    data[offset] = data[selectedOffset];
    data[offset + 1] = data[selectedOffset + 1];
    data[offset + 2] = data[selectedOffset + 2];
    data[offset + 3] = 255;
  }
}

function smoothedForegroundColours(imageData, palette, expectedShape) {
  const { width, height, data } = imageData;
  let colours = new Int16Array(width * height).fill(-1);
  for (let pixel = 0, offset = 0; pixel < colours.length; pixel += 1, offset += 4) {
    if (data[offset + 3] < 32 || (expectedShape && !expectedShape.core[pixel])) continue;
    colours[pixel] = nearestPaletteIndex(data[offset], data[offset + 1], data[offset + 2], palette);
  }
  for (let pass = 0; pass < 2; pass += 1) {
    const next = Int16Array.from(colours);
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const pixel = y * width + x;
        if (colours[pixel] < 0) continue;
        const neighbours = [];
        for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
          for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
            if (!offsetX && !offsetY) continue;
            const neighbour = (y + offsetY) * width + x + offsetX;
            if (colours[neighbour] >= 0) neighbours.push(colours[neighbour]);
          }
        }
        if (neighbours.length < 3) continue;
        const currentCount = neighbours.filter((candidate) => candidate === colours[pixel]).length;
        for (const colour of neighbours) {
          const count = neighbours.filter((candidate) => candidate === colour).length;
          if (colour !== colours[pixel] && count >= 3 && count > currentCount) {
            next[pixel] = colour;
            break;
          }
        }
      }
    }
    colours = next;
  }
  return colours;
}

function sourceColourOwnership(imageData, palette, alphaMatte) {
  const shape = expectedLogoShape(imageData, palette);
  const colours = smoothedForegroundColours(imageData, palette, shape);
  const sourceSeeds = Int16Array.from(colours);
  const { width, height } = imageData;
  if (alphaMatte?.width !== width || alphaMatte?.height !== height) return colours;

  // The source image decides colour ownership and the AI matte decides coverage. Propagate the
  // verified source labels only through visible matte pixels, producing a nearest-region map that
  // cannot jump across transparent gaps between letters or marks.
  const visible = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let queueStart = 0;
  let queueEnd = 0;
  for (let pixel = 0, offset = 0; pixel < visible.length; pixel += 1, offset += 4) {
    const luma =
      alphaMatte.data[offset] * 0.2126 +
      alphaMatte.data[offset + 1] * 0.7152 +
      alphaMatte.data[offset + 2] * 0.0722;
    visible[pixel] = alphaMatte.data[offset + 3] >= 8 && luma <= 247 ? 1 : 0;
    if (visible[pixel] && colours[pixel] >= 0) {
      queue[queueEnd] = pixel;
      queueEnd += 1;
    }
  }
  while (queueStart < queueEnd) {
    const pixel = queue[queueStart];
    queueStart += 1;
    const x = pixel % width;
    const neighbours = [
      pixel - width,
      pixel + width,
      x > 0 ? pixel - 1 : -1,
      x + 1 < width ? pixel + 1 : -1,
    ];
    for (const neighbour of neighbours) {
      if (neighbour < 0 || neighbour >= visible.length) continue;
      if (!visible[neighbour] || colours[neighbour] >= 0) continue;
      colours[neighbour] = colours[pixel];
      queue[queueEnd] = neighbour;
      queueEnd += 1;
    }
  }

  const visited = new Uint8Array(width * height);
  const component = new Int32Array(width * height);
  const counts = new Uint32Array(palette.length);
  for (let start = 0; start < visible.length; start += 1) {
    if (!visible[start] || visited[start]) continue;
    counts.fill(0);
    let componentStart = 0;
    let componentEnd = 1;
    component[0] = start;
    visited[start] = 1;
    while (componentStart < componentEnd) {
      const pixel = component[componentStart];
      componentStart += 1;
      const sourceColour = sourceSeeds[pixel];
      if (sourceColour >= 0) counts[sourceColour] += 1;
      const x = pixel % width;
      const neighbours = [
        pixel - width,
        pixel + width,
        x > 0 ? pixel - 1 : -1,
        x + 1 < width ? pixel + 1 : -1,
      ];
      for (const neighbour of neighbours) {
        if (neighbour < 0 || neighbour >= visible.length) continue;
        if (!visible[neighbour] || visited[neighbour]) continue;
        visited[neighbour] = 1;
        component[componentEnd] = neighbour;
        componentEnd += 1;
      }
    }
    let owner = -1;
    let ownerCount = 0;
    let seedCount = 0;
    for (let colour = 0; colour < counts.length; colour += 1) {
      seedCount += counts[colour];
      if (counts[colour] <= ownerCount) continue;
      owner = colour;
      ownerCount = counts[colour];
    }
    if (owner < 0 || ownerCount / Math.max(1, seedCount) < 0.85) continue;
    for (let index = 0; index < componentEnd; index += 1) {
      colours[component[index]] = owner;
    }
  }
  return colours;
}

// GPT Image cannot currently return alpha. Recover it from the known flat matte using the
// compositing equation P = alpha * foreground + (1 - alpha) * matte. This retains antialiased
// edge pixels instead of simply making a near-matte colour transparent, which would leave a
// visible halo around a logo on dark surfaces.
export function transparentLogoVariants(imageData, palette, options = {}) {
  const { width, height, data } = imageData;
  const sourceColours = palette.length
    ? logoBrandColours(palette)
    : [{ red: 0, green: 0, blue: 0 }];
  const matte = logoMatte(imageData);
  const sourceReference = options.sourceReference;
  const alphaMatte = options.alphaMatte;
  const colourOwnership =
    sourceReference?.width === width && sourceReference?.height === height
      ? sourceColourOwnership(sourceReference, sourceColours, alphaMatte)
      : undefined;
  const expectedShape =
    !options.useAiMatteOnly &&
    sourceReference?.width === width &&
    sourceReference?.height === height
      ? expectedLogoShape(sourceReference, sourceColours)
      : undefined;
  const cleanedColourIndices = expectedShape
    ? smoothedForegroundColours(imageData, sourceColours, expectedShape)
    : undefined;
  const master = new Uint8ClampedArray(data.length);
  const black = new Uint8ClampedArray(data.length);
  const white = new Uint8ClampedArray(data.length);
  const accent = sourceColours.length > 1 ? sourceColours[1] : undefined;
  const blackAccent = accent ? new Uint8ClampedArray(data.length) : undefined;
  const whiteAccent = accent ? new Uint8ClampedArray(data.length) : undefined;

  for (let offset = 0; offset < data.length; offset += 4) {
    const pixel = offset / 4;
    const inputAlpha = data[offset + 3] / 255;
    let alpha = inputAlpha;
    let colour = nearestPaletteColour(
      data[offset],
      data[offset + 1],
      data[offset + 2],
      sourceColours,
    );
    if (matte && inputAlpha > 0.01) {
      let best = { colour, alpha: 0, error: Number.POSITIVE_INFINITY };
      for (const candidate of sourceColours) {
        const delta = {
          red: candidate.red - matte.red,
          green: candidate.green - matte.green,
          blue: candidate.blue - matte.blue,
        };
        const denominator = delta.red ** 2 + delta.green ** 2 + delta.blue ** 2;
        if (denominator < 1) continue;
        const numerator =
          (data[offset] - matte.red) * delta.red +
          (data[offset + 1] - matte.green) * delta.green +
          (data[offset + 2] - matte.blue) * delta.blue;
        const candidateAlpha = Math.max(0, Math.min(1, numerator / denominator));
        const red = matte.red + candidateAlpha * delta.red;
        const green = matte.green + candidateAlpha * delta.green;
        const blue = matte.blue + candidateAlpha * delta.blue;
        const error =
          (data[offset] - red) ** 2 +
          (data[offset + 1] - green) ** 2 +
          (data[offset + 2] - blue) ** 2;
        if (error < best.error) best = { colour: candidate, alpha: candidateAlpha, error };
      }
      colour = best.colour;
      // Keep only pixels that solve the matte compositing equation closely. The previous loose
      // allowance was the source of most colour fringes and isolated background artefacts.
      alpha = best.error <= 11 ** 2 ? best.alpha : 0;
    }
    // When an AI-produced black-on-white alpha matte is available, use its soft edge as the
    // starting coverage.  The original logo still owns the interior and permitted silhouette,
    // so an AI artefact can never punch a hole into the mark or extend it into the background.
    if (alphaMatte?.width === width && alphaMatte?.height === height) {
      const matteLuma =
        alphaMatte.data[offset] * 0.2126 +
        alphaMatte.data[offset + 1] * 0.7152 +
        alphaMatte.data[offset + 2] * 0.0722;
      const modelAlpha = (1 - matteLuma / 255) * (alphaMatte.data[offset + 3] / 255);
      alpha = options.useAiMatteOnly ? modelAlpha : Math.max(alpha, modelAlpha);
    }
    // AI image edits can preserve a colour relationship while changing a blue or red by enough
    // to fail a compositing residual check. Never turn an original solid logo pixel into a hole:
    // the source silhouette is more reliable than the edited pixel colour for its interior.
    if (expectedShape?.core[pixel]) alpha = 1;
    const sourceColourIndex = expectedShape?.colourIndices[pixel] ?? -1;
    const cleanedColourIndex = cleanedColourIndices?.[pixel] ?? -1;
    const ownedColourIndex = colourOwnership?.[pixel] ?? -1;
    if (ownedColourIndex >= 0) colour = sourceColours[ownedColourIndex];
    else if (cleanedColourIndex >= 0) colour = sourceColours[cleanedColourIndex];
    const outputAlpha = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
    if (
      outputAlpha < 8 ||
      (expectedShape && (!expectedShape.allowed[pixel] || sourceColourIndex < 0))
    )
      continue;
    master[offset] = Math.round(colour.red);
    master[offset + 1] = Math.round(colour.green);
    master[offset + 2] = Math.round(colour.blue);
    master[offset + 3] = outputAlpha;
    black[offset + 3] = outputAlpha;
    white[offset] = 255;
    white[offset + 1] = 255;
    white[offset + 2] = 255;
    white[offset + 3] = outputAlpha;
    if (blackAccent && whiteAccent) {
      const useAccent = colour === accent;
      if (useAccent) {
        blackAccent[offset] = Math.round(accent.red);
        blackAccent[offset + 1] = Math.round(accent.green);
        blackAccent[offset + 2] = Math.round(accent.blue);
        whiteAccent[offset] = Math.round(accent.red);
        whiteAccent[offset + 1] = Math.round(accent.green);
        whiteAccent[offset + 2] = Math.round(accent.blue);
      } else {
        whiteAccent[offset] = 255;
        whiteAccent[offset + 1] = 255;
        whiteAccent[offset + 2] = 255;
      }
      blackAccent[offset + 3] = outputAlpha;
      whiteAccent[offset + 3] = outputAlpha;
    }
  }

  fillTransparentPinholes(master, width, height);

  return [
    { key: 'original', label: 'Original colours', data: master },
    { key: 'black', label: 'Black', data: black },
    ...(accent ? [{ key: 'black-accent', label: 'Black + accent', data: blackAccent }] : []),
    { key: 'white', label: 'White', data: white },
    ...(accent ? [{ key: 'white-accent', label: 'White + accent', data: whiteAccent }] : []),
  ];
}

export function alphaMattePreview(variants) {
  const original = variants.find((variant) => variant.key === 'original');
  if (!original)
    throw new Error('An original transparent logo version is required for the alpha matte.');
  const data = new Uint8ClampedArray(original.data.length);
  for (let offset = 0; offset < data.length; offset += 4) {
    const coverage = original.data[offset + 3];
    const value = 255 - coverage;
    data[offset] = value;
    data[offset + 1] = value;
    data[offset + 2] = value;
    data[offset + 3] = 255;
  }
  return { key: 'alpha-matte', label: 'AI-assisted alpha matte', data };
}
