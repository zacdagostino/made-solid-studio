import { studioRuntimeFetch } from './studio-runtime';

const notificationsEndpoint = '/__made-solid/codex-notifications';
const serviceWorkerPath = '/studio-service-worker.js';

export type CodexNotificationState =
  'blocked' | 'error' | 'install_required' | 'loading' | 'off' | 'on' | 'unsupported';

function isIosBrowser() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function isStandaloneApp() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function supportsPush() {
  return (
    window.isSecureContext &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

function applicationServerKey(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const bytes = Uint8Array.from(
    atob(`${value.replaceAll('-', '+').replaceAll('_', '/')}${padding}`),
    (character) => character.charCodeAt(0),
  );
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

async function notificationConfiguration() {
  const response = await studioRuntimeFetch(notificationsEndpoint, {
    headers: { Accept: 'application/json' },
  });
  const value = await notificationResponse(response);
  if (!response.ok || !value.publicKey) {
    throw new Error(
      value.detail ||
        'Phone notifications are not ready on this Studio server yet. Refresh and try again.',
    );
  }
  return value.publicKey;
}

async function notificationResponse(response: Response) {
  const text = await response.text();
  if (!text.trim()) return {} as { detail?: string; publicKey?: string };
  try {
    return JSON.parse(text) as { detail?: string; publicKey?: string };
  } catch {
    return {} as { detail?: string; publicKey?: string };
  }
}

async function serviceWorkerRegistration() {
  return navigator.serviceWorker.register(serviceWorkerPath, { scope: '/' });
}

export async function readCodexNotificationState(): Promise<CodexNotificationState> {
  if (!supportsPush()) return 'unsupported';
  if (isIosBrowser() && !isStandaloneApp()) return 'install_required';
  if (Notification.permission === 'denied') return 'blocked';
  const registration = await serviceWorkerRegistration();
  const subscription = await registration.pushManager.getSubscription();
  return subscription ? 'on' : 'off';
}

export async function enableCodexNotifications(): Promise<CodexNotificationState> {
  if (!supportsPush()) return 'unsupported';
  if (isIosBrowser() && !isStandaloneApp()) return 'install_required';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off';
  const [registration, publicKey] = await Promise.all([
    serviceWorkerRegistration(),
    notificationConfiguration(),
  ]);
  let subscription = await registration.pushManager.getSubscription();
  subscription ??= await registration.pushManager.subscribe({
    applicationServerKey: applicationServerKey(publicKey),
    userVisibleOnly: true,
  });
  const response = await studioRuntimeFetch(notificationsEndpoint, {
    body: JSON.stringify({ action: 'subscribe', subscription: subscription.toJSON() }),
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    method: 'POST',
  });
  if (!response.ok) {
    await subscription.unsubscribe().catch(() => undefined);
    const value = await notificationResponse(response);
    throw new Error(value.detail || 'Phone notifications could not be turned on.');
  }
  return 'on';
}

export async function disableCodexNotifications(): Promise<CodexNotificationState> {
  if (!supportsPush()) return 'unsupported';
  const registration = await serviceWorkerRegistration();
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return 'off';
  const response = await studioRuntimeFetch(notificationsEndpoint, {
    body: JSON.stringify({ action: 'unsubscribe', endpoint: subscription.endpoint }),
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    method: 'POST',
  });
  if (!response.ok) {
    const value = await notificationResponse(response);
    throw new Error(value.detail || 'Phone notifications could not be turned off.');
  }
  await subscription.unsubscribe();
  return 'off';
}
