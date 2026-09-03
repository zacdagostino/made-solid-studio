import assert from 'node:assert/strict';
import { createDecipheriv, createECDH, hkdfSync, randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  CodexPushNotifications,
  encryptWebPushPayload,
} from '../../scripts/codex-push-notifications.mjs';
import { CodexFeedbackBridge } from '../../scripts/codex-feedback-bridge.mjs';

function subscriptionFixture(endpoint = 'https://push.example.test/subscription-1') {
  const client = createECDH('prime256v1');
  client.generateKeys();
  const auth = randomBytes(16);
  return {
    client,
    subscription: {
      endpoint,
      expirationTime: null,
      keys: {
        auth: auth.toString('base64url'),
        p256dh: client.getPublicKey().toString('base64url'),
      },
    },
  };
}

function decryptPayload(client, subscription, body) {
  const salt = body.subarray(0, 16);
  assert.equal(body.readUInt32BE(16), 4_096);
  const keyLength = body.readUInt8(20);
  const serverPublicKey = body.subarray(21, 21 + keyLength);
  const encrypted = body.subarray(21 + keyLength);
  const sharedSecret = client.computeSecret(serverPublicKey);
  const authSecret = Buffer.from(subscription.keys.auth, 'base64url');
  const userPublicKey = Buffer.from(subscription.keys.p256dh, 'base64url');
  const inputKey = Buffer.from(
    hkdfSync(
      'sha256',
      sharedSecret,
      authSecret,
      Buffer.concat([Buffer.from('WebPush: info\0'), userPublicKey, serverPublicKey]),
      32,
    ),
  );
  const contentEncryptionKey = Buffer.from(
    hkdfSync('sha256', inputKey, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16),
  );
  const nonce = Buffer.from(
    hkdfSync('sha256', inputKey, salt, Buffer.from('Content-Encoding: nonce\0'), 12),
  );
  const decipher = createDecipheriv('aes-128-gcm', contentEncryptionKey, nonce);
  decipher.setAuthTag(encrypted.subarray(-16));
  const cleartext = Buffer.concat([decipher.update(encrypted.subarray(0, -16)), decipher.final()]);
  assert.equal(cleartext.at(-1), 2);
  return JSON.parse(cleartext.subarray(0, -1).toString('utf8'));
}

test('encrypts an interoperable aes128gcm Web Push payload', () => {
  const { client, subscription } = subscriptionFixture();
  const body = encryptWebPushPayload(subscription, { title: 'Codex finished' });
  assert.deepEqual(decryptPayload(client, subscription, body), { title: 'Codex finished' });
});

test('persists subscriptions and sends only generic completion copy', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'made-solid-codex-push-'));
  const storagePath = join(directory, 'push.json');
  const { client, subscription } = subscriptionFixture();
  let request;
  const notifications = new CodexPushNotifications({
    fetchImplementation: async (endpoint, init) => {
      request = { endpoint, init };
      return new Response(null, { status: 201 });
    },
    storagePath,
    validateEndpoint: async (endpoint) => new URL(endpoint),
  });
  await notifications.subscribe(subscription);
  const result = await notifications.notifyCompletion({
    id: 'private-record',
    prompt: 'Secret prospect prompt',
    workspace: 'secret-client',
  });
  assert.deepEqual(result, { delivered: 1, subscriptions: 1 });
  assert.equal(request.endpoint, subscription.endpoint);
  assert.match(request.init.headers.Authorization, /^vapid t=.+, k=.+$/);
  assert.equal(request.init.headers['Content-Encoding'], 'aes128gcm');
  const payload = decryptPayload(client, subscription, request.init.body);
  assert.deepEqual(payload, {
    body: 'Your Codex chat is ready to review.',
    tag: 'codex-complete-private-record',
    title: 'Codex finished',
    url: '/#/codex',
  });
  assert.doesNotMatch(JSON.stringify(payload), /Secret|secret-client/);
  assert.match(await readFile(storagePath, 'utf8'), /lastSuccessAt/);
});

test('removes an expired push endpoint after a 410 response', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'made-solid-codex-push-expired-'));
  const storagePath = join(directory, 'push.json');
  const { subscription } = subscriptionFixture();
  const notifications = new CodexPushNotifications({
    fetchImplementation: async () => new Response(null, { status: 410 }),
    storagePath,
    validateEndpoint: async (endpoint) => new URL(endpoint),
  });
  await notifications.subscribe(subscription);
  assert.deepEqual(await notifications.notifyCompletion({ id: 'record' }), {
    delivered: 0,
    subscriptions: 0,
  });
  const stored = JSON.parse(await readFile(storagePath, 'utf8'));
  assert.deepEqual(stored.subscriptions, []);
});

test('sends a generic Codex version update to subscribed phones', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'made-solid-codex-update-push-'));
  const storagePath = join(directory, 'push.json');
  const { client, subscription } = subscriptionFixture();
  let request;
  const notifications = new CodexPushNotifications({
    fetchImplementation: async (_endpoint, init) => {
      request = init;
      return new Response(null, { status: 201 });
    },
    storagePath,
    validateEndpoint: async (endpoint) => new URL(endpoint),
  });
  await notifications.subscribe(subscription);
  assert.deepEqual(await notifications.notifyCodexUpdate({ version: '0.152.1' }), {
    delivered: 1,
    subscriptions: 1,
  });
  assert.deepEqual(decryptPayload(client, subscription, request.body), {
    body: 'Codex updated to 0.152.1. Open Studio to see the new features and fixes.',
    tag: 'codex-update-0.152.1',
    title: 'Codex updated',
    url: '/#/settings',
  });
});

test('delivers a durable completion marker once across maintenance polls', async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), 'made-solid-codex-push-outbox-'));
  const record = {
    id: 'f7cad3b4-e396-4a79-ab71-cd308b24fb75',
    status: 'completed',
    notificationPending: true,
    createdAt: new Date().toISOString(),
  };
  await mkdir(storageRoot, { recursive: true });
  await writeFile(join(storageRoot, `${record.id}.json`), JSON.stringify(record));
  let deliveries = 0;
  const bridge = new CodexFeedbackBridge({
    notifyCompletion: async () => {
      deliveries += 1;
      return { delivered: 1 };
    },
    storageRoot,
  });
  await bridge.maintain();
  await bridge.maintain();
  assert.equal(deliveries, 1);
  const stored = JSON.parse(await readFile(join(storageRoot, `${record.id}.json`), 'utf8'));
  assert.equal(stored.notificationPending, false);
  assert.equal(stored.notificationDeliveredCount, 1);
  assert.match(stored.notificationSentAt, /^\d{4}-\d{2}-\d{2}T/);
});
