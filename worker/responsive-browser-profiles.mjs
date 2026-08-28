const desktopUserAgent =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';
const tabletUserAgent =
  'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const mobileUserAgent =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36';

export const responsiveBrowserProfiles = Object.freeze({
  desktop: Object.freeze({
    id: 'desktop-chromium-v1',
    label: 'desktop',
    width: 1440,
    height: 900,
    isMobile: false,
    hasTouch: false,
    userAgent: desktopUserAgent,
  }),
  tablet: Object.freeze({
    id: 'tablet-safari-v1',
    label: 'tablet',
    width: 768,
    height: 1024,
    isMobile: true,
    hasTouch: true,
    userAgent: tabletUserAgent,
  }),
  mobile: Object.freeze({
    id: 'mobile-android-chrome-v1',
    label: 'mobile',
    width: 375,
    height: 812,
    isMobile: true,
    hasTouch: true,
    userAgent: mobileUserAgent,
  }),
});

export function orderedResponsiveProfiles(order) {
  return order.map((label) => ({ ...responsiveBrowserProfiles[label] }));
}

export function responsiveBrowserContextOptions(profile) {
  return {
    userAgent: profile.userAgent,
    viewport: { width: profile.width, height: profile.height },
    screen: { width: profile.width, height: profile.height },
    isMobile: profile.isMobile,
    hasTouch: profile.hasTouch,
    deviceScaleFactor: 1,
  };
}
