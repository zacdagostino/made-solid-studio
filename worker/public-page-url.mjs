const nonPublicAuthenticationPath = /(^|\/)(?:auth|oauth2?|login|log-in|sign-in|signin)(?:\/|$)/i;

export function isPublicWebsitePageUrl(value) {
  try {
    const url = new URL(value);
    return (
      /^https?:$/.test(url.protocol) &&
      !url.username &&
      !url.password &&
      !nonPublicAuthenticationPath.test(url.pathname)
    );
  } catch {
    return false;
  }
}

export function assertPublicWebsitePageUrl(value) {
  if (!isPublicWebsitePageUrl(value)) {
    throw new Error('Authentication and session pages are not public website evidence.');
  }
}
