import {
  createECDH,
  createCipheriv,
  createPrivateKey,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
  sign,
} from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { assertPublicUrl } from '../worker/security.mjs';

const maximumSubscriptionBytes = 16 * 1024;
const maximumSubscriptions = 12;
const pushRecordSize = 4_096;

function base64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function decodeBase64Url(value, expectedLength) {
  if (typeof value !== 'string' || value.length > 256) throw new Error('Invalid push key.');
  const decoded = Buffer.from(value, 'base64url');
  if (decoded.length !== expectedLength) throw new Error('Invalid push key.');
  return decoded;
}

function validPushEndpoint(value) {
  if (typeof value !== 'string' || value.length > 2_048) return undefined;
  try {
    const endpoint = new URL(value);
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) return undefined;
    if (
      endpoint.hostname === 'localhost' ||
      endpoint.hostname === '127.0.0.1' ||
      endpoint.hostname === '::1' ||
      endpoint.hostname.endsWith('.local')
    ) {
      return undefined;
    }
    return endpoint;
  } catch {
    return undefined;
  }
}

function parseSubscription(input) {
  if (Buffer.byteLength(JSON.stringify(input ?? {})) > maximumSubscriptionBytes) {
    throw new Error('The push subscription is too large.');
  }
  const endpoint = validPushEndpoint(input?.endpoint);
  if (!endpoint) throw new Error('Choose a valid secure push subscription.');
  const p256dh = decodeBase64Url(input?.keys?.p256dh, 65);
  if (p256dh[0] !== 4) throw new Error('Invalid push key.');
  decodeBase64Url(input?.keys?.auth, 16);
  const expirationTime = input?.expirationTime;
  if (expirationTime !== null && expirationTime !== undefined) {
    if (!Number.isFinite(expirationTime) || expirationTime <= Date.now()) {
      throw new Error('The push subscription has expired.');
    }
  }
  return {
    endpoint: endpoint.href,
    expirationTime: expirationTime ?? null,
    keys: { auth: input.keys.auth, p256dh: input.keys.p256dh },
  };
}

async function atomicWriteJson(path, value) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporaryPath = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(value, null, 2), { mode: 0o600 });
  await rename(temporaryPath, path);
}

function vapidKeys() {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  return {
    privateKey: privateKey.export({ format: 'jwk' }),
    publicKey: publicKey.export({ format: 'jwk' }),
  };
}

function rawPublicKey(jwk) {
  return Buffer.concat([
    Buffer.from([4]),
    Buffer.from(jwk.x, 'base64url'),
    Buffer.from(jwk.y, 'base64url'),
  ]);
}

function vapidAuthorization(endpoint, keys, subject) {
  const audience = new URL(endpoint).origin;
  const header = base64Url(JSON.stringify({ alg: 'ES256', typ: 'JWT' }));
  const claims = base64Url(
    JSON.stringify({
      aud: audience,
      exp: Math.floor(Date.now() / 1_000) + 12 * 60 * 60,
      sub: subject,
    }),
  );
  const unsigned = `${header}.${claims}`;
  const signature = sign('sha256', Buffer.from(unsigned), {
    dsaEncoding: 'ieee-p1363',
    key: createPrivateKey({ format: 'jwk', key: keys.privateKey }),
  });
  return `vapid t=${unsigned}.${base64Url(signature)}, k=${base64Url(rawPublicKey(keys.publicKey))}`;
}

export function encryptWebPushPayload(subscription, value) {
  const userPublicKey = decodeBase64Url(subscription.keys.p256dh, 65);
  const authSecret = decodeBase64Url(subscription.keys.auth, 16);
  const serverKeys = createECDH('prime256v1');
  serverKeys.generateKeys();
  const serverPublicKey = serverKeys.getPublicKey();
  const sharedSecret = serverKeys.computeSecret(userPublicKey);
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), userPublicKey, serverPublicKey]);
  const inputKey = Buffer.from(hkdfSync('sha256', sharedSecret, authSecret, keyInfo, 32));
  const salt = randomBytes(16);
  const contentEncryptionKey = Buffer.from(
    hkdfSync('sha256', inputKey, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16),
  );
  const nonce = Buffer.from(
    hkdfSync('sha256', inputKey, salt, Buffer.from('Content-Encoding: nonce\0'), 12),
  );
  const payload = Buffer.concat([Buffer.from(JSON.stringify(value)), Buffer.from([2])]);
  const cipher = createCipheriv('aes-128-gcm', contentEncryptionKey, nonce);
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final(), cipher.getAuthTag()]);
  const header = Buffer.alloc(21);
  salt.copy(header, 0);
  header.writeUInt32BE(pushRecordSize, 16);
  header.writeUInt8(serverPublicKey.length, 20);
  return Buffer.concat([header, serverPublicKey, encrypted]);
}

export class CodexPushNotifications {
  constructor({
    storagePath = resolve('.made-solid', 'codex-push-notifications.json'),
    fetchImplementation = globalThis.fetch,
    validateEndpoint = assertPublicUrl,
    subject = process.env.SITEFORGE_PUBLIC_ORIGIN || 'https://workspace.madesolid.com.au',
  } = {}) {
    this.storagePath = storagePath;
    this.fetch = fetchImplementation;
    this.validateEndpoint = validateEndpoint;
    this.subject = subject.startsWith('mailto:') ? subject : new URL(subject).origin;
    this.statePromise = undefined;
  }

  async state() {
    this.statePromise ??= readFile(this.storagePath, 'utf8')
      .then((source) => JSON.parse(source))
      .catch(() => ({ keys: vapidKeys(), subscriptions: [] }));
    const state = await this.statePromise;
    if (!state.keys?.privateKey || !state.keys?.publicKey || !Array.isArray(state.subscriptions)) {
      this.statePromise = Promise.resolve({ keys: vapidKeys(), subscriptions: [] });
    }
    const validState = await this.statePromise;
    await atomicWriteJson(this.storagePath, validState);
    return validState;
  }

  async configuration() {
    const state = await this.state();
    return { publicKey: base64Url(rawPublicKey(state.keys.publicKey)), status: 'ready' };
  }

  async subscribe(input) {
    const subscription = parseSubscription(input);
    await this.validateEndpoint(subscription.endpoint);
    const state = await this.state();
    const now = new Date().toISOString();
    const subscriptions = [
      ...state.subscriptions.filter((candidate) => candidate.endpoint !== subscription.endpoint),
      { ...subscription, createdAt: now, updatedAt: now },
    ].slice(-maximumSubscriptions);
    await atomicWriteJson(this.storagePath, { ...state, subscriptions });
    state.subscriptions = subscriptions;
    return { status: 'subscribed' };
  }

  async unsubscribe(endpointValue) {
    const endpoint = validPushEndpoint(endpointValue);
    if (!endpoint) throw new Error('Choose a valid secure push subscription.');
    const state = await this.state();
    const subscriptions = state.subscriptions.filter(
      (candidate) => candidate.endpoint !== endpoint.href,
    );
    await atomicWriteJson(this.storagePath, { ...state, subscriptions });
    state.subscriptions = subscriptions;
    return { status: 'unsubscribed' };
  }

  async notifyCompletion(record) {
    const payload = {
      body: 'Your Codex chat is ready to review.',
      tag: `codex-complete-${record.id}`,
      title: 'Codex finished',
      url: '/#/codex',
    };
    return this.notify(payload);
  }

  async notifyCodexUpdate({ version }) {
    return this.notify({
      body: `Codex updated to ${version}. Open Studio to see the new features and fixes.`,
      tag: `codex-update-${version}`,
      title: 'Codex updated',
      url: '/#/settings',
    });
  }

  async notify(payload) {
    const state = await this.state();
    if (!state.subscriptions.length) return { delivered: 0, subscriptions: 0 };
    let delivered = 0;
    const retained = [];
    for (const subscription of state.subscriptions) {
      if (subscription.expirationTime && subscription.expirationTime <= Date.now()) continue;
      try {
        await this.validateEndpoint(subscription.endpoint);
        const body = await encryptWebPushPayload(subscription, payload);
        const response = await this.fetch(subscription.endpoint, {
          body,
          headers: {
            Authorization: vapidAuthorization(subscription.endpoint, state.keys, this.subject),
            'Content-Encoding': 'aes128gcm',
            'Content-Type': 'application/octet-stream',
            TTL: '86400',
            Urgency: 'normal',
          },
          method: 'POST',
        });
        if (response.ok) {
          delivered += 1;
          retained.push({ ...subscription, lastSuccessAt: new Date().toISOString() });
        } else if (response.status !== 404 && response.status !== 410) {
          retained.push({
            ...subscription,
            lastFailureAt: new Date().toISOString(),
            lastFailureStatus: response.status,
          });
        }
      } catch {
        retained.push({ ...subscription, lastFailureAt: new Date().toISOString() });
      }
    }
    await atomicWriteJson(this.storagePath, { ...state, subscriptions: retained });
    state.subscriptions = retained;
    return { delivered, subscriptions: state.subscriptions.length };
  }
}
