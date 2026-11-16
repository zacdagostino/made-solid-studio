export type DevicePreviewPreset = 'phone' | 'tablet' | 'desktop';

const defaultInspectOrigin = 'https://inspect.madesolid.com.au';

export function devicePreviewUrl(
  source: string,
  options: {
    device?: DevicePreviewPreset;
    label?: string;
    returnUrl?: string;
  } = {},
) {
  const configuredOrigin =
    import.meta.env.VITE_SITEFORGE_INSPECT_ORIGIN?.trim() || defaultInspectOrigin;
  const inspectUrl = new URL('/inspect/', configuredOrigin);
  inspectUrl.searchParams.set('source', source);
  inspectUrl.searchParams.set('device', options.device ?? 'desktop');
  if (options.label?.trim()) inspectUrl.searchParams.set('label', options.label.trim());
  if (options.returnUrl?.trim()) inspectUrl.searchParams.set('return', options.returnUrl.trim());
  return inspectUrl.href;
}
