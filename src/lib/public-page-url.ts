const nonPublicAuthenticationPath = /(^|\/)(?:auth|oauth2?|login|log-in|sign-in|signin)(?:\/|$)/i;

export function isPublicWebsitePageUrl(value: string) {
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

export function normaliseWebsitePageUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = '';
    url.search = '';
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url.toString();
  } catch {
    return value;
  }
}
