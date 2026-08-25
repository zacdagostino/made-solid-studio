const legacyDevelopmentOrigin = 'https://workspace.madesolid.com.au';

function exactHttpsOrigin(value, label) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be an exact HTTPS origin.`);
  }
  if (parsed.protocol !== 'https:' || parsed.href !== `${parsed.origin}/`) {
    throw new Error(`${label} must be an exact HTTPS origin.`);
  }
  return parsed.origin;
}

function compatibilitySources(environment) {
  const configured = environment.SITEFORGE_DEVELOPMENT_COMPATIBILITY_ORIGINS?.trim();
  if (!configured) return [];
  return configured.split(/[\s,]+/).filter(Boolean);
}

export function studioDevelopmentOrigins(environment = process.env) {
  const canonicalSource =
    environment.SITEFORGE_DEVELOPMENT_ORIGIN?.trim() ||
    environment.SITEFORGE_WORKSPACE_PREVIEW_ORIGIN?.trim() ||
    legacyDevelopmentOrigin;
  const canonicalOrigin = exactHttpsOrigin(canonicalSource, 'SITEFORGE_DEVELOPMENT_ORIGIN');
  const compatibilityOrigins = compatibilitySources(environment).map((source) =>
    exactHttpsOrigin(source, 'SITEFORGE_DEVELOPMENT_COMPATIBILITY_ORIGINS'),
  );
  if (canonicalOrigin !== legacyDevelopmentOrigin)
    compatibilityOrigins.push(legacyDevelopmentOrigin);
  return {
    canonicalOrigin,
    origins: [...new Set([canonicalOrigin, ...compatibilityOrigins])],
  };
}

export function studioDevelopmentOriginForRequest(
  request,
  developmentOrigins,
  { allowLoopback = false } = {},
) {
  const host = String(request.headers.host || '')
    .trim()
    .toLowerCase();
  if (allowLoopback && /^(?:127\.0\.0\.1|localhost)(?::\d{1,5})?$/.test(host)) {
    return developmentOrigins[0];
  }
  if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?(?::\d{1,5})?$/.test(host)) return undefined;
  const requestedOrigin = `https://${host}`;
  return developmentOrigins.includes(requestedOrigin) ? requestedOrigin : undefined;
}

export { legacyDevelopmentOrigin };
