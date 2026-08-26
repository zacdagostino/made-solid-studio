import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { workspaceHmrHeartbeatPlugin } from '../../scripts/workspace-hmr-heartbeat.mjs';

test('sends a server-originated HMR heartbeat and stops it with the Vite server', async () => {
  const messages = [];
  let closeServer;
  workspaceHmrHeartbeatPlugin({ heartbeatIntervalMs: 10 }).configureServer({
    httpServer: {
      once(event, listener) {
        assert.equal(event, 'close');
        closeServer = listener;
      },
    },
    ws: {
      send(message) {
        messages.push(message);
      },
    },
  });

  await delay(35);
  assert.ok(messages.length >= 2);
  assert.deepEqual(messages[0], {
    type: 'custom',
    event: 'made-solid:workspace-heartbeat',
    data: {},
  });

  closeServer();
  const stoppedAt = messages.length;
  await delay(25);
  assert.equal(messages.length, stoppedAt);
});
