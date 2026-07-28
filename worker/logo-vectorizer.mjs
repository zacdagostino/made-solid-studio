import vtracer from '@visioncortex/vtracer';

const maxSvgBytes = 1_500_000;

function hex(red, green, blue) {
  return `#${[red, green, blue]
    .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
}

function readRaster(imageData) {
  const width = Number(imageData?.width);
  const height = Number(imageData?.height);
  const data = imageData?.data;
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1 ||
    !(data instanceof Uint8Array || data instanceof Uint8ClampedArray) ||
    data.length !== width * height * 4
  ) {
    throw new Error('The raster logo could not be prepared for vector tracing.');
  }
  return { width, height, data };
}

function sourcePalette(data) {
  const buckets = new Map();
  const precisionShift = 5;
  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3];
    if (alpha < 128) continue;
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const key = `${red >> precisionShift}:${green >> precisionShift}:${blue >> precisionShift}`;
    const bucket = buckets.get(key) ?? { red: 0, green: 0, blue: 0, weight: 0 };
    bucket.red += red * alpha;
    bucket.green += green * alpha;
    bucket.blue += blue * alpha;
    bucket.weight += alpha;
    buckets.set(key, bucket);
  }
  const clusters = [];
  for (const bucket of [...buckets.values()].sort((left, right) => right.weight - left.weight)) {
    const candidate = {
      red: bucket.red / bucket.weight,
      green: bucket.green / bucket.weight,
      blue: bucket.blue / bucket.weight,
    };
    let closest;
    let closestDistance = Number.POSITIVE_INFINITY;
    for (const cluster of clusters) {
      const distance =
        (candidate.red - cluster.red / cluster.weight) ** 2 +
        (candidate.green - cluster.green / cluster.weight) ** 2 +
        (candidate.blue - cluster.blue / cluster.weight) ** 2;
      if (distance < closestDistance) {
        closest = cluster;
        closestDistance = distance;
      }
    }
    if (closest && closestDistance < 48 ** 2) {
      closest.red += candidate.red * bucket.weight;
      closest.green += candidate.green * bucket.weight;
      closest.blue += candidate.blue * bucket.weight;
      closest.weight += bucket.weight;
    } else {
      clusters.push({
        red: candidate.red * bucket.weight,
        green: candidate.green * bucket.weight,
        blue: candidate.blue * bucket.weight,
        weight: bucket.weight,
      });
    }
  }
  return clusters
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 6)
    .map((cluster) => ({
      red: cluster.red / cluster.weight,
      green: cluster.green / cluster.weight,
      blue: cluster.blue / cluster.weight,
    }));
}

function colourDistance(left, right) {
  return (
    (left.red - right.red) ** 2 + (left.green - right.green) ** 2 + (left.blue - right.blue) ** 2
  );
}

function likelyLightNeutral(colour) {
  const maximum = Math.max(colour.red, colour.green, colour.blue);
  const minimum = Math.min(colour.red, colour.green, colour.blue);
  return maximum >= 232 && maximum - minimum <= 24;
}

function removeLikelyOpaqueBackdrop(width, height, data) {
  const cornerIndexes = [
    0,
    (width - 1) * 4,
    (height - 1) * width * 4,
    ((height - 1) * width + width - 1) * 4,
  ];
  const corners = cornerIndexes.map((index) => ({
    red: data[index],
    green: data[index + 1],
    blue: data[index + 2],
    alpha: data[index + 3],
  }));
  if (
    corners.some((corner) => corner.alpha < 250 || !likelyLightNeutral(corner)) ||
    corners.some((corner) => colourDistance(corner, corners[0]) > 18 ** 2)
  ) {
    return Uint8Array.from(data);
  }

  const normalised = Uint8Array.from(data);
  const backdrop = corners[0];
  for (let index = 0; index < normalised.length; index += 4) {
    if (normalised[index + 3] < 128) continue;
    const colour = {
      red: normalised[index],
      green: normalised[index + 1],
      blue: normalised[index + 2],
    };
    if (colourDistance(colour, backdrop) <= 28 ** 2) normalised[index + 3] = 0;
  }
  return normalised;
}

function closestSourceColour(colour, palette) {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(colour);
  if (!match || !palette.length) return colour;
  const [red, green, blue] = match.slice(1).map((channel) => Number.parseInt(channel, 16));
  let closest = palette[0];
  let distance = Number.POSITIVE_INFINITY;
  for (const candidate of palette) {
    const candidateDistance =
      (candidate.red - red) ** 2 + (candidate.green - green) ** 2 + (candidate.blue - blue) ** 2;
    if (candidateDistance < distance) {
      closest = candidate;
      distance = candidateDistance;
    }
  }
  return hex(closest.red, closest.green, closest.blue);
}

function closestPaletteIndex(red, green, blue, palette) {
  let closestIndex = -1;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < palette.length; index += 1) {
    const candidate = palette[index];
    const distance =
      (candidate.red - red) ** 2 + (candidate.green - green) ** 2 + (candidate.blue - blue) ** 2;
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  }
  return closestIndex;
}

function normaliseLogoPixels(data, palette) {
  const normalised = Uint8Array.from(data);
  for (let index = 0; index < normalised.length; index += 4) {
    if (normalised[index + 3] < 128) {
      normalised[index + 3] = 0;
      continue;
    }
    const colour = closestSourceColour(
      hex(normalised[index], normalised[index + 1], normalised[index + 2]),
      palette,
    );
    const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(colour);
    if (!match) continue;
    normalised[index] = Number.parseInt(match[1], 16);
    normalised[index + 1] = Number.parseInt(match[2], 16);
    normalised[index + 2] = Number.parseInt(match[3], 16);
    normalised[index + 3] = 255;
  }
  return normalised;
}

function traceMode(width, height, palette, simplifyGeometry) {
  const longestEdge = Math.max(width, height);
  // A compact, low-colour image is usually a pixel mark, not a failed smooth image. VTracer's
  // pixel fitter preserves its original geometry instead of inventing rounded corners.
  if (longestEdge <= 96 && palette.length <= 6) return 'pixel';
  // Wide, low-colour wordmarks often arrive as antialiased raster artwork. Spline fitting follows
  // every antialiased edge and can make straight logo strokes visibly ripple. Polygon fitting is
  // a topology-preserving simplification pass for that narrow case: it removes excess anchors
  // while retaining the original silhouette and palette. Icons and more detailed marks continue
  // to use spline fitting so circular and organic artwork is not made angular.
  if (
    simplifyGeometry &&
    palette.length <= 2 &&
    longestEdge >= 240 &&
    width / Math.max(height, 1) >= 1.35
  ) {
    return 'polygon';
  }
  return 'spline';
}

function traceConfiguration(mode, palette, width, height) {
  const simpleWordmark = palette.length <= 2 && Math.max(width, height) >= 240;
  const geometrySimplified = mode === 'polygon' && simpleWordmark;
  // Curves in a sparse wordmark need more fitting iterations than a general illustration. This
  // lets the tracer combine adjacent anti-aliased edge samples into a controlled Bézier section,
  // instead of retaining a chain of tiny, visibly wobbly curve segments. Straight components use
  // the polygon configuration below, so this does not round intentional corners or diagonals.
  const geometryCurveFit = mode === 'spline' && simpleWordmark;
  return {
    colorMode: 'color',
    mode,
    hierarchical: 'cutout',
    palette: palette.map(({ red, green, blue }) => hex(red, green, blue)),
    maxColors: palette.length,
    cornerThreshold: mode === 'pixel' ? 90 : geometrySimplified ? 110 : geometryCurveFit ? 110 : 60,
    lengthThreshold: mode === 'pixel' ? 0 : geometrySimplified ? 24 : geometryCurveFit ? 20 : 2,
    maxIterations: geometrySimplified ? 80 : geometryCurveFit ? 120 : 10,
    spliceThreshold: geometrySimplified ? 120 : geometryCurveFit ? 120 : 45,
    filterSpeckle: mode === 'pixel' ? 0 : geometrySimplified ? 24 : geometryCurveFit ? 16 : 4,
    colorPrecision: 8,
    layerDifference: 0,
    pathPrecision: 2,
    optimize: 2,
  };
}

function pathTokens(pathData) {
  return pathData.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) ?? [];
}

function distanceFromLine(point, start, end) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  if (deltaX === 0 && deltaY === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  return (
    Math.abs(deltaX * (start.y - point.y) - (start.x - point.x) * deltaY) /
    Math.hypot(deltaX, deltaY)
  );
}

function ramerDouglasPeucker(points, tolerance) {
  if (points.length < 3) return points;
  let furthestIndex = -1;
  let furthestDistance = 0;
  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = distanceFromLine(points[index], points[0], points[points.length - 1]);
    if (distance > furthestDistance) {
      furthestDistance = distance;
      furthestIndex = index;
    }
  }
  if (furthestDistance <= tolerance) return [points[0], points[points.length - 1]];
  return [
    ...ramerDouglasPeucker(points.slice(0, furthestIndex + 1), tolerance).slice(0, -1),
    ...ramerDouglasPeucker(points.slice(furthestIndex), tolerance),
  ];
}

function simplifyClosedPolygon(points, tolerance) {
  if (points.length < 4) return points;
  let oppositeIndex = 1;
  let longestDistance = 0;
  for (let index = 1; index < points.length; index += 1) {
    const distance = (points[index].x - points[0].x) ** 2 + (points[index].y - points[0].y) ** 2;
    if (distance > longestDistance) {
      longestDistance = distance;
      oppositeIndex = index;
    }
  }
  const firstHalf = ramerDouglasPeucker(points.slice(0, oppositeIndex + 1), tolerance);
  const secondHalf = ramerDouglasPeucker([...points.slice(oppositeIndex), points[0]], tolerance);
  return [...firstHalf.slice(0, -1), ...secondHalf.slice(0, -1)];
}

function formatPathNumber(value) {
  return String(Math.round(value * 10) / 10);
}

// VTracer's polygon output contains only straight-line commands. Simplifying those points after
// tracing is safer than blurring the original: each retained edge differs from the source path by
// no more than the configured tolerance, while the resulting SVG is markedly cleaner at large
// sizes. Any path VTracer does not express as a closed polygon is deliberately left untouched.
function simplifyPolygonPath(pathData, tolerance) {
  const tokens = pathTokens(pathData);
  const loops = [];
  let index = 0;
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let loop = [];

  while (index < tokens.length) {
    const command = tokens[index++];
    if (!/^[mMlLhHvVzZ]$/.test(command)) return undefined;
    const relative = command === command.toLowerCase();
    if (command === 'Z' || command === 'z') {
      if (loop.length < 3) return undefined;
      loops.push(loop);
      loop = [];
      x = startX;
      y = startY;
      continue;
    }
    if (command === 'M' || command === 'm') {
      if (loop.length) return undefined;
      const nextX = Number(tokens[index++]);
      const nextY = Number(tokens[index++]);
      if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) return undefined;
      x = relative ? x + nextX : nextX;
      y = relative ? y + nextY : nextY;
      startX = x;
      startY = y;
      loop = [{ x, y }];
      continue;
    }
    if (!loop.length) return undefined;
    if (command === 'L' || command === 'l') {
      const nextX = Number(tokens[index++]);
      const nextY = Number(tokens[index++]);
      if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) return undefined;
      x = relative ? x + nextX : nextX;
      y = relative ? y + nextY : nextY;
    } else if (command === 'H' || command === 'h') {
      const nextX = Number(tokens[index++]);
      if (!Number.isFinite(nextX)) return undefined;
      x = relative ? x + nextX : nextX;
    } else if (command === 'V' || command === 'v') {
      const nextY = Number(tokens[index++]);
      if (!Number.isFinite(nextY)) return undefined;
      y = relative ? y + nextY : nextY;
    }
    loop.push({ x, y });
  }

  if (loop.length || !loops.length) return undefined;
  return loops
    .map((polygon) => {
      const points = simplifyClosedPolygon(polygon, tolerance);
      return `M${points.map((point) => `${formatPathNumber(point.x)},${formatPathNumber(point.y)}`).join('L')}Z`;
    })
    .join('');
}

function simplifyPolygonSvg(svg, tolerance = 1.5) {
  let changed = false;
  const simplified = svg.replace(/\sd="([^"]+)"/g, (attribute, pathData) => {
    const nextPath = simplifyPolygonPath(pathData, tolerance);
    if (!nextPath || nextPath.length >= pathData.length) return attribute;
    changed = true;
    return ` d="${nextPath}"`;
  });
  return { svg: simplified, changed };
}

function pointDistance(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function subtractPoints(left, right) {
  return { x: left.x - right.x, y: left.y - right.y };
}

function addPoints(left, right) {
  return { x: left.x + right.x, y: left.y + right.y };
}

function scalePoint(point, scalar) {
  return { x: point.x * scalar, y: point.y * scalar };
}

function dotPoint(left, right) {
  return left.x * right.x + left.y * right.y;
}

function normalisePoint(point) {
  const length = Math.hypot(point.x, point.y);
  return length > 0.0001 ? scalePoint(point, 1 / length) : { x: 0, y: 0 };
}

function cubicPoint(start, controlOne, controlTwo, end, position) {
  const inverse = 1 - position;
  return addPoints(
    addPoints(scalePoint(start, inverse ** 3), scalePoint(controlOne, 3 * position * inverse ** 2)),
    addPoints(scalePoint(controlTwo, 3 * position ** 2 * inverse), scalePoint(end, position ** 3)),
  );
}

function cubicPathSubpath(pathData) {
  const tokens = pathTokens(pathData);
  const segments = [];
  let index = 0;
  let current = { x: 0, y: 0 };
  let start;
  while (index < tokens.length) {
    const command = tokens[index++];
    if (!/^[mMcCzZ]$/.test(command)) return undefined;
    const relative = command === command.toLowerCase();
    if (command === 'Z' || command === 'z') {
      if (!start || !segments.length || index !== tokens.length) return undefined;
      return { start, segments };
    }
    if (command === 'M' || command === 'm') {
      if (start) return undefined;
      const x = Number(tokens[index++]);
      const y = Number(tokens[index++]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
      current = relative ? addPoints(current, { x, y }) : { x, y };
      start = current;
      continue;
    }
    if (!start) return undefined;
    const values = Array.from({ length: 6 }, () => Number(tokens[index++]));
    if (values.some((value) => !Number.isFinite(value))) return undefined;
    const controlOne = relative
      ? addPoints(current, { x: values[0], y: values[1] })
      : { x: values[0], y: values[1] };
    const controlTwo = relative
      ? addPoints(current, { x: values[2], y: values[3] })
      : { x: values[2], y: values[3] };
    const end = relative
      ? addPoints(current, { x: values[4], y: values[5] })
      : { x: values[4], y: values[5] };
    segments.push({ start: current, controlOne, controlTwo, end });
    current = end;
  }
  return undefined;
}

function cubicContourPoints(subpath) {
  const points = [subpath.start];
  for (const segment of subpath.segments) {
    for (const position of [0.25, 0.5, 0.75, 1]) {
      const point = cubicPoint(
        segment.start,
        segment.controlOne,
        segment.controlTwo,
        segment.end,
        position,
      );
      if (pointDistance(point, points.at(-1)) > 0.01) points.push(point);
    }
  }
  if (points.length > 2 && pointDistance(points[0], points.at(-1)) < 0.1) points.pop();
  return points;
}

function contourCorners(points) {
  const candidates = [];
  for (let index = 0; index < points.length; index += 1) {
    const previous = points[(index - 1 + points.length) % points.length];
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const incoming = normalisePoint(subtractPoints(current, previous));
    const outgoing = normalisePoint(subtractPoints(next, current));
    if (!Math.hypot(incoming.x, incoming.y) || !Math.hypot(outgoing.x, outgoing.y)) continue;
    const turn = Math.acos(Math.max(-1, Math.min(1, dotPoint(incoming, outgoing))));
    if (turn >= 0.72) candidates.push({ index, turn });
  }
  candidates.sort((left, right) => right.turn - left.turn);
  const selected = [];
  for (const candidate of candidates) {
    const tooClose = selected.some((existing) => {
      const distance = Math.abs(existing - candidate.index);
      return Math.min(distance, points.length - distance) < 3;
    });
    if (!tooClose) selected.push(candidate.index);
  }
  return selected.sort((left, right) => left - right);
}

function chordLengthParameters(points) {
  const values = [0];
  for (let index = 1; index < points.length; index += 1) {
    values.push(values[index - 1] + pointDistance(points[index - 1], points[index]));
  }
  const total = values.at(-1);
  return total > 0 ? values.map((value) => value / total) : values.map(() => 0);
}

function fitCubicSegment(points, startTangent, endTangent) {
  const parameters = chordLengthParameters(points);
  const start = points[0];
  const end = points.at(-1);
  let xx = 0;
  let xy = 0;
  let yy = 0;
  let rightX = 0;
  let rightY = 0;
  for (let index = 0; index < points.length; index += 1) {
    const parameter = parameters[index];
    const inverse = 1 - parameter;
    const basisOne = 3 * parameter * inverse ** 2;
    const basisTwo = 3 * parameter ** 2 * inverse;
    const basisStart = inverse ** 3;
    const basisEnd = parameter ** 3;
    const one = scalePoint(startTangent, basisOne);
    const two = scalePoint(endTangent, basisTwo);
    const target = subtractPoints(
      points[index],
      addPoints(scalePoint(start, basisStart + basisOne), scalePoint(end, basisTwo + basisEnd)),
    );
    xx += dotPoint(one, one);
    xy += dotPoint(one, two);
    yy += dotPoint(two, two);
    rightX += dotPoint(one, target);
    rightY += dotPoint(two, target);
  }
  const determinant = xx * yy - xy * xy;
  const fallback = pointDistance(start, end) / 3;
  const alphaOne = determinant > 0.0001 ? (rightX * yy - rightY * xy) / determinant : fallback;
  const alphaTwo = determinant > 0.0001 ? (xx * rightY - xy * rightX) / determinant : fallback;
  return {
    start,
    controlOne: addPoints(start, scalePoint(startTangent, alphaOne > 0.01 ? alphaOne : fallback)),
    controlTwo: addPoints(end, scalePoint(endTangent, alphaTwo > 0.01 ? alphaTwo : fallback)),
    end,
    parameters,
  };
}

function straightSegment(points, tolerance) {
  return points.every((point) => distanceFromLine(point, points[0], points.at(-1)) <= tolerance);
}

function recursivelyFitCurve(points, startTangent, endTangent, tolerance, depth = 0) {
  if (points.length < 3 || straightSegment(points, tolerance * 0.65)) {
    return [{ type: 'line', end: points.at(-1) }];
  }
  const curve = fitCubicSegment(points, startTangent, endTangent);
  let furthestIndex = -1;
  let furthestError = 0;
  for (let index = 1; index < points.length - 1; index += 1) {
    const point = cubicPoint(
      curve.start,
      curve.controlOne,
      curve.controlTwo,
      curve.end,
      curve.parameters[index],
    );
    const error = pointDistance(point, points[index]);
    if (error > furthestError) {
      furthestError = error;
      furthestIndex = index;
    }
  }
  if (
    furthestError <= tolerance ||
    furthestIndex < 2 ||
    furthestIndex > points.length - 3 ||
    depth >= 8
  ) {
    return [{ type: 'curve', ...curve }];
  }
  const centerTangent = normalisePoint(
    subtractPoints(points[furthestIndex - 1], points[furthestIndex + 1]),
  );
  return [
    ...recursivelyFitCurve(
      points.slice(0, furthestIndex + 1),
      startTangent,
      centerTangent,
      tolerance,
      depth + 1,
    ),
    ...recursivelyFitCurve(
      points.slice(furthestIndex),
      scalePoint(centerTangent, -1),
      endTangent,
      tolerance,
      depth + 1,
    ),
  ];
}

function fitCubicContour(pathData, tolerance = 1.35) {
  const subpath = cubicPathSubpath(pathData);
  if (!subpath) return undefined;
  const points = cubicContourPoints(subpath);
  if (points.length < 7) return undefined;
  const corners = contourCorners(points);
  const anchors = corners.length ? corners : [0];
  const start = anchors[0];
  let nextPath = `M${formatPathNumber(points[start].x)},${formatPathNumber(points[start].y)}`;
  let curveCount = 0;
  for (let section = 0; section < anchors.length; section += 1) {
    const from = anchors[section];
    const to =
      anchors[(section + 1) % anchors.length] +
      (section + 1 === anchors.length ? points.length : 0);
    const sectionPoints = [];
    for (let index = from; index <= to; index += 1)
      sectionPoints.push(points[index % points.length]);
    if (sectionPoints.length < 2) continue;
    const curves = recursivelyFitCurve(
      sectionPoints,
      normalisePoint(subtractPoints(sectionPoints[1], sectionPoints[0])),
      normalisePoint(subtractPoints(sectionPoints.at(-2), sectionPoints.at(-1))),
      tolerance,
    );
    for (const curve of curves) {
      if (curve.type === 'line') {
        nextPath += `L${formatPathNumber(curve.end.x)},${formatPathNumber(curve.end.y)}`;
      } else {
        curveCount += 1;
        nextPath += `C${formatPathNumber(curve.controlOne.x)},${formatPathNumber(curve.controlOne.y)} ${formatPathNumber(curve.controlTwo.x)},${formatPathNumber(curve.controlTwo.y)} ${formatPathNumber(curve.end.x)},${formatPathNumber(curve.end.y)}`;
      }
    }
  }
  nextPath += 'Z';
  return curveCount && curveCount < subpath.segments.length ? nextPath : undefined;
}

// This is deliberately not a generic point-removal pass. It recognises an existing all-cubic
// contour, preserves genuine corners, then replaces noisy micro-curves with fitted lines and a
// small set of error-bounded Bézier sections.
function fitCubicSvg(svg) {
  let changed = false;
  let originalCubicCount = 0;
  let fittedCubicCount = 0;
  const fitted = svg.replace(/\sd="([^"]+)"/g, (attribute, pathData) => {
    const original = (pathData.match(/[cC]/g) ?? []).length;
    const nextPath = original ? fitCubicContour(pathData) : undefined;
    if (!nextPath) return attribute;
    const next = (nextPath.match(/[cC]/g) ?? []).length;
    if (!next || next >= original) return attribute;
    changed = true;
    originalCubicCount += original;
    fittedCubicCount += next;
    return ` d="${nextPath}"`;
  });
  return { svg: fitted, changed, originalCubicCount, fittedCubicCount };
}

function splitGeometryPixels(data, width, height) {
  const pixels = width * height;
  const component = new Int32Array(pixels);
  component.fill(-1);
  const components = [];
  const opaque = (index) => data[index * 4 + 3] >= 128;
  let componentId = 0;

  for (let start = 0; start < pixels; start += 1) {
    if (component[start] !== -1 || !opaque(start)) continue;
    const queue = [start];
    const members = [];
    component[start] = componentId;
    let head = 0;
    let left = width;
    let right = 0;
    let top = height;
    let bottom = 0;
    while (head < queue.length) {
      const current = queue[head++];
      members.push(current);
      const x = current % width;
      const y = Math.floor(current / width);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      for (const [offsetX, offsetY] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const nextX = x + offsetX;
        const nextY = y + offsetY;
        if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue;
        const next = nextY * width + nextX;
        if (component[next] !== -1 || !opaque(next)) continue;
        component[next] = componentId;
        queue.push(next);
      }
    }
    components.push({ members, left, right, top, bottom });
    componentId += 1;
  }

  const straight = new Uint8ClampedArray(data.length);
  const curved = new Uint8ClampedArray(data.length);
  let curvedComponentCount = 0;
  let straightComponentCount = 0;
  for (const candidate of components) {
    const bins = new Uint32Array(16);
    let boundary = 0;
    for (const pixel of candidate.members) {
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      const mask = (sampleX, sampleY) =>
        sampleX >= 0 && sampleX < width && sampleY >= 0 && sampleY < height
          ? Number(opaque(sampleY * width + sampleX))
          : 0;
      const gradientX =
        -mask(x - 1, y - 1) -
        2 * mask(x - 1, y) -
        mask(x - 1, y + 1) +
        mask(x + 1, y - 1) +
        2 * mask(x + 1, y) +
        mask(x + 1, y + 1);
      const gradientY =
        -mask(x - 1, y - 1) -
        2 * mask(x, y - 1) -
        mask(x + 1, y - 1) +
        mask(x - 1, y + 1) +
        2 * mask(x, y + 1) +
        mask(x + 1, y + 1);
      if (!gradientX && !gradientY) continue;
      boundary += 1;
      const angle = (Math.atan2(gradientY, gradientX) + Math.PI * 2) % (Math.PI * 2);
      bins[Math.floor((angle / (Math.PI * 2)) * bins.length) % bins.length] += 1;
    }
    const activeDirections = bins.filter((count) => count >= Math.max(2, boundary * 0.025)).length;
    const componentWidth = candidate.right - candidate.left + 1;
    const componentHeight = candidate.bottom - candidate.top + 1;
    const aspect = componentWidth / Math.max(componentHeight, 1);
    // A curve exposes a broad, continuous set of edge normals. Straight marks and serif glyphs
    // cluster around a small number of directions, which makes them safe for line fitting.
    const isCurved = activeDirections >= 8 && aspect >= 0.45 && aspect <= 2.2;
    if (isCurved) curvedComponentCount += 1;
    else straightComponentCount += 1;
    const target = isCurved ? curved : straight;
    for (const pixel of candidate.members) {
      const offset = pixel * 4;
      target[offset] = data[offset];
      target[offset + 1] = data[offset + 1];
      target[offset + 2] = data[offset + 2];
      target[offset + 3] = data[offset + 3];
    }
  }
  return { straight, curved, curvedComponentCount, straightComponentCount };
}

function svgInner(svg) {
  const root = /<svg\b[^>]*>/i.exec(svg);
  const closing = svg.lastIndexOf('</svg>');
  if (!root || closing < root.index)
    throw new Error('The vector tracer did not return an SVG root.');
  return { root: root[0], inner: svg.slice(root.index + root[0].length, closing) };
}

function combineTraces(traces) {
  const [first, ...rest] = traces.map(svgInner);
  return `${first.root}${first.inner}${rest.map((trace) => trace.inner).join('')}</svg>`;
}

function validateSvg(svg) {
  if (typeof svg !== 'string' || !/<svg\b/i.test(svg) || Buffer.byteLength(svg) > maxSvgBytes) {
    throw new Error('The vector tracer did not produce a reviewable SVG.');
  }
}

export function extractLogoPalette(imageData) {
  const { width, height, data } = readRaster(imageData);
  return sourcePalette(removeLikelyOpaqueBackdrop(width, height, data));
}

// AI clean-up can improve the outline but may subtly replace a brand colour (for example, red
// text with grey). Preserve the visible geometry from the cleaned raster while assigning colours
// from the approved source at the corresponding position. The small source neighbourhood absorbs
// harmless anti-aliasing and sub-pixel shifts without inventing a new colour.
export function lockRasterColoursToSource(imageData, sourceImageData, referencePalette = []) {
  const target = readRaster(imageData);
  const source = readRaster(sourceImageData);
  const palette = referencePalette.length
    ? referencePalette
    : sourcePalette(removeLikelyOpaqueBackdrop(source.width, source.height, source.data));
  if (!palette.length)
    return {
      width: target.width,
      height: target.height,
      data: Uint8ClampedArray.from(target.data),
    };

  const sourcePixels = normaliseLogoPixels(
    removeLikelyOpaqueBackdrop(source.width, source.height, source.data),
    palette,
  );
  const targetPixels = removeLikelyOpaqueBackdrop(target.width, target.height, target.data);
  const locked = Uint8ClampedArray.from(targetPixels);
  const radius = 2;

  for (let y = 0; y < target.height; y += 1) {
    const sourceY = Math.round(((y + 0.5) * source.height) / target.height - 0.5);
    for (let x = 0; x < target.width; x += 1) {
      const targetIndex = (y * target.width + x) * 4;
      if (targetPixels[targetIndex + 3] < 128) {
        locked[targetIndex + 3] = 0;
        continue;
      }

      const sourceX = Math.round(((x + 0.5) * source.width) / target.width - 0.5);
      let paletteIndex = -1;
      let closestOffset = Number.POSITIVE_INFINITY;
      for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
        const sampleY = sourceY + offsetY;
        if (sampleY < 0 || sampleY >= source.height) continue;
        for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
          const sampleX = sourceX + offsetX;
          if (sampleX < 0 || sampleX >= source.width) continue;
          const sourceIndex = (sampleY * source.width + sampleX) * 4;
          if (sourcePixels[sourceIndex + 3] < 128) continue;
          const offset = offsetX ** 2 + offsetY ** 2;
          if (offset >= closestOffset) continue;
          closestOffset = offset;
          paletteIndex = closestPaletteIndex(
            sourcePixels[sourceIndex],
            sourcePixels[sourceIndex + 1],
            sourcePixels[sourceIndex + 2],
            palette,
          );
        }
      }
      if (paletteIndex < 0) {
        paletteIndex = closestPaletteIndex(
          targetPixels[targetIndex],
          targetPixels[targetIndex + 1],
          targetPixels[targetIndex + 2],
          palette,
        );
      }
      const colour = palette[paletteIndex];
      locked[targetIndex] = Math.round(colour.red);
      locked[targetIndex + 1] = Math.round(colour.green);
      locked[targetIndex + 2] = Math.round(colour.blue);
      locked[targetIndex + 3] = 255;
    }
  }

  return { width: target.width, height: target.height, data: locked };
}

export async function vectorizeRasterLogo(imageData, options = {}) {
  const { width, height, data } = readRaster(imageData);
  const preparedPixels = removeLikelyOpaqueBackdrop(width, height, data);
  const referencePalette = Array.isArray(options.referencePalette) ? options.referencePalette : [];
  const palette = referencePalette.length ? referencePalette : sourcePalette(preparedPixels);
  if (!palette.length) throw new Error('The raster logo contains no visible pixels to trace.');
  const simplifyGeometry = options.simplifyGeometry === true;
  const mode = traceMode(width, height, palette, simplifyGeometry);
  const normalisedPixels = normaliseLogoPixels(preparedPixels, palette);
  const split = simplifyGeometry ? splitGeometryPixels(normalisedPixels, width, height) : undefined;
  const shouldUseHybrid = Boolean(split?.curvedComponentCount && split.straightComponentCount);
  const traced = shouldUseHybrid
    ? combineTraces([
        vtracer.convertPixels(
          split.straight,
          width,
          height,
          traceConfiguration('polygon', palette, width, height),
        ),
        vtracer.convertPixels(
          split.curved,
          width,
          height,
          traceConfiguration('spline', palette, width, height),
        ),
      ])
    : vtracer.convertPixels(
        normalisedPixels,
        width,
        height,
        traceConfiguration(mode, palette, width, height),
      );
  validateSvg(traced);
  const curveFitting = shouldUseHybrid ? fitCubicSvg(traced) : undefined;
  const pathSimplification =
    simplifyGeometry && (mode === 'polygon' || shouldUseHybrid)
      ? simplifyPolygonSvg(curveFitting?.svg ?? traced)
      : undefined;
  const simplifier = shouldUseHybrid
    ? curveFitting?.changed
      ? 'geometry-hybrid-fit-v1'
      : 'geometry-hybrid-v2'
    : mode === 'polygon'
      ? pathSimplification?.changed
        ? 'geometry-polygon-rdp-v1'
        : 'geometry-polygon-v1'
      : undefined;
  const svg = (pathSimplification?.svg ?? curveFitting?.svg ?? traced).replace(
    /<svg\b/i,
    `<svg data-siteforge-trace-mode="${shouldUseHybrid ? 'hybrid' : mode}" data-siteforge-vectorizer="vtracer"${
      simplifier ? ` data-siteforge-simplifier="${simplifier}"` : ''
    }`,
  );
  validateSvg(svg);
  return {
    svg,
    mode: shouldUseHybrid ? 'hybrid' : mode,
    simplifier,
    sourceColours: palette.map(({ red, green, blue }) => hex(red, green, blue)),
  };
}
