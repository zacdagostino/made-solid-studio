import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { CodexFeedbackBridge } from '../../scripts/codex-feedback-bridge.mjs';

const imageDataUrl = `data:image/png;base64,${Buffer.from('private screenshot').toString('base64')}`;

function fakeConnection(state) {
  return async () => ({
    async request(method, params) {
      if (method === 'account/read') {
        return { account: { type: 'chatgpt', planType: 'plus' } };
      }
      if (method === 'model/list') {
        return {
          data: [
            {
              id: 'gpt-image-capable',
              displayName: 'Image capable',
              defaultReasoningEffort: 'medium',
              inputModalities: ['text', 'image'],
              isDefault: true,
              supportedReasoningEfforts: [
                { reasoningEffort: 'low', description: 'Faster' },
                { reasoningEffort: 'medium', description: 'Balanced' },
              ],
            },
            {
              id: 'gpt-text-only',
              displayName: 'Text only',
              inputModalities: ['text'],
              supportedReasoningEfforts: [{ reasoningEffort: 'medium' }],
            },
          ],
        };
      }
      if (method === 'thread/list') {
        return {
          data: [
            ...(state.newThreads || []),
            {
              id: 'thread-1',
              name: 'Current Studio chat',
              cwd: '/workspaces/siteforge-os',
              updatedAt: Math.floor(Date.now() / 1_000) - 12,
              status: state.busy ? { type: 'active', activeFlags: ['turn'] } : { type: 'idle' },
            },
            {
              id: 'thread-2',
              name: 'Earlier Studio chat',
              cwd: '/workspaces/siteforge-os',
              status: { type: 'idle' },
            },
          ],
        };
      }
      if (method === 'thread/read') {
        const newThread = state.newThreads?.find((thread) => thread.id === params.threadId);
        if (newThread) {
          if (state.unmaterializedNewThreads) {
            throw new Error(
              `thread ${params.threadId} is not materialized yet; includeTurns is unavailable before first user message`,
            );
          }
          return { thread: newThread };
        }
        const submittedTurns = state.turns
          .filter((turn) => turn.threadId === params.threadId)
          .map((turn, index) => ({
            id: state.turnIds?.[index] || `submitted-turn-${index + 1}`,
            status:
              state.turnStatuses?.[state.turnIds?.[index] || `submitted-turn-${index + 1}`] ||
              'inProgress',
            items: [
              {
                id: `submitted-user-${index + 1}`,
                type: 'userMessage',
                content: [
                  {
                    type: 'text',
                    text: turn.input.find((item) => item.type === 'text')?.text || '',
                  },
                ],
              },
            ],
          }));
        return {
          thread: {
            id: params.threadId,
            status: state.busy ? { type: 'active', activeFlags: [] } : { type: 'idle' },
            turns: [
              {
                id: 'turn-active',
                status: state.busy ? 'inProgress' : state.interrupted ? 'interrupted' : 'completed',
                startedAt: state.busy ? Math.floor(Date.now() / 1_000) - 12 : undefined,
                items: [
                  {
                    id: 'message-user',
                    type: 'userMessage',
                    content: [{ type: 'text', text: 'Inspect this Studio page.' }],
                  },
                  {
                    id: 'message-agent',
                    type: 'agentMessage',
                    phase: 'final',
                    text: 'The Studio page is ready.',
                  },
                ],
              },
              ...submittedTurns,
            ],
          },
        };
      }
      if (method === 'thread/resume') return { thread: { id: params.threadId } };
      if (method === 'thread/start') {
        state.threadStarts ??= [];
        state.threadStarts.push(params);
        const thread = {
          id: `thread-new-${state.threadStarts.length}`,
          cwd: params.cwd,
          status: { type: 'idle' },
          turns: [],
        };
        state.newThreads ??= [];
        state.newThreads.unshift(thread);
        return {
          thread,
          approvalPolicy: params.approvalPolicy,
          approvalsReviewer: 'user',
          cwd: params.cwd,
          model: params.model,
          modelProvider: 'openai',
          sandbox: { type: 'dangerFullAccess' },
        };
      }
      if (method === 'turn/start') {
        state.turns.push(params);
        state.turnIds ??= [];
        const turnId = `turn-${state.turnIds.length + 1}`;
        state.turnIds.push(turnId);
        const newThread = state.newThreads?.find((thread) => thread.id === params.threadId);
        if (newThread) {
          const prompt = params.input.find((item) => item.type === 'text')?.text || '';
          newThread.name = 'Automatically named by Codex';
          newThread.preview = prompt;
          newThread.status = { type: 'active', activeFlags: ['turn'] };
          newThread.turns = [
            {
              id: `turn-${state.turns.length}`,
              status: 'inProgress',
              items: [
                {
                  id: `user-${state.turns.length}`,
                  type: 'userMessage',
                  content: [{ type: 'text', text: prompt }],
                },
              ],
            },
          ];
        }
        return { turn: { id: turnId, status: 'inProgress' } };
      }
      if (method === 'turn/interrupt') {
        state.interrupts ??= [];
        state.interrupts.push(params);
        state.busy = false;
        return {};
      }
      if (method === 'thread/delete') {
        state.deletedThreads ??= [];
        state.deletedThreads.push(params.threadId);
        state.newThreads = (state.newThreads || []).filter(
          (thread) => thread.id !== params.threadId,
        );
        return {};
      }
      throw new Error(`Unexpected method: ${method}`);
    },
    close() {},
  });
}

test('discovers ChatGPT models, image support, efforts, and the active Studio thread', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'made-solid-codex-status-'));
  const state = { busy: false, turns: [] };
  const bridge = new CodexFeedbackBridge({
    cwd: '/workspaces/siteforge-os',
    storageRoot: directory,
    connect: fakeConnection(state),
  });
  const status = await bridge.inspect();
  assert.equal(status.account.type, 'chatgpt');
  assert.equal(status.thread.id, 'thread-1');
  assert.equal(status.threads.length, 2);
  assert.equal(status.messages[0].role, 'user');
  assert.equal(status.messages[1].text, 'The Studio page is ready.');
  assert.equal(status.models[0].supportsImages, true);
  assert.deepEqual(
    status.models[0].efforts.map((effort) => effort.id),
    ['low', 'medium'],
  );
  assert.equal(status.models[1].supportsImages, false);
});

test('identifies and safely continues a turn interrupted by a Codespace pause', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'made-solid-codex-resume-'));
  const state = { busy: false, interrupted: true, turns: [] };
  const bridge = new CodexFeedbackBridge({
    cwd: '/workspaces/siteforge-os',
    storageRoot: directory,
    connect: fakeConnection(state),
  });

  const interrupted = await bridge.inspect({ threadId: 'thread-1' });
  assert.equal(interrupted.thread.interrupted, true);
  assert.equal(interrupted.thread.lastTurnStatus, 'interrupted');

  const resumed = await bridge.continueInterruptedThread({
    threadId: 'thread-1',
    model: 'gpt-text-only',
    effort: 'medium',
  });
  assert.equal(resumed.status, 'accepted');
  assert.equal(state.turns.length, 1);
  assert.equal(state.turns[0].threadId, 'thread-1');
  assert.deepEqual(state.turns[0].runtimeWorkspaceRoots, [
    '/workspaces/siteforge-os',
    '/workspaces/made-solid-website',
  ]);
  assert.match(state.turns[0].input[0].text, /Codespace paused/);
  assert.match(state.turns[0].input[0].text, /preserve existing changes/);
});

test('keeps a newly started empty thread selectable before thread/list includes it', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'made-solid-codex-new-thread-'));
  const state = { busy: false, turns: [] };
  const connection = fakeConnection(state);
  let listCalls = 0;
  const bridge = new CodexFeedbackBridge({
    cwd: '/workspaces/siteforge-os',
    storageRoot: directory,
    connect: async () => {
      const client = await connection();
      return {
        ...client,
        async request(method, params) {
          if (method === 'thread/list') {
            const result = await client.request(method, params);
            listCalls += 1;
            return listCalls === 1
              ? { data: result.data.filter((thread) => !thread.id.startsWith('thread-new-')) }
              : result;
          }
          if (method === 'thread/read' && params.threadId.startsWith('thread-new-')) {
            throw new Error(
              `thread ${params.threadId} is not materialized yet; includeTurns is unavailable before first user message`,
            );
          }
          return client.request(method, params);
        },
      };
    },
  });

  const created = await bridge.createThread({ model: 'gpt-image-capable', effort: 'medium' });
  const status = await bridge.inspect({ threadId: created.thread.id });
  const polledStatus = await bridge.inspect({ threadId: created.thread.id });

  assert.equal(status.thread.id, created.thread.id);
  assert.equal(status.threads[0].id, created.thread.id);
  assert.deepEqual(status.messages, []);
  assert.equal(polledStatus.thread.id, created.thread.id);
  assert.equal(polledStatus.threads[0].id, created.thread.id);
  assert.deepEqual(polledStatus.messages, []);
});

test('keeps feedback queued while Codex is busy, then delivers the image and model override', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'made-solid-codex-queue-'));
  const state = { busy: true, turns: [] };
  const bridge = new CodexFeedbackBridge({
    cwd: '/workspaces/siteforge-os',
    storageRoot: directory,
    connect: fakeConnection(state),
  });
  const activeStatus = await bridge.inspect();
  assert.equal(activeStatus.thread.working, true);
  assert.deepEqual(activeStatus.thread.activeFlags, []);
  assert.equal(typeof activeStatus.thread.updatedAt, 'number');
  assert.equal(typeof activeStatus.thread.workingStartedAt, 'number');
  const queued = await bridge.enqueue({
    screenshot: imageDataUrl,
    prompt: 'Fix the clipped navigation and verify every viewport.',
    model: 'gpt-image-capable',
    effort: 'medium',
    context: 'Made Solid private preview',
  });
  await new Promise((resolveWait) => setTimeout(resolveWait, 20));
  assert.equal((await bridge.readRecords('queued')).length, 1);
  assert.equal(state.turns.length, 0);
  const queuedStatus = await bridge.inspect();
  assert.equal(queuedStatus.queuedMessages[0].attachmentId, queued.id);
  const attachment = await bridge.attachment(queued.id);
  assert.equal(attachment.mimeType, 'image/png');
  assert.equal(attachment.data.toString('utf8'), 'private screenshot');

  state.busy = false;
  await bridge.flush();
  const running = await bridge.readRecords('running');
  assert.equal(running.length, 1);
  assert.equal(state.turns.length, 1);
  assert.equal(state.turns[0].model, 'gpt-image-capable');
  assert.equal(state.turns[0].effort, 'medium');
  assert.equal(state.turns[0].input[1].type, 'localImage');
  assert.match(state.turns[0].input[0].text, /Made Solid private preview/);
  assert.equal(await readFile(state.turns[0].input[1].path, 'utf8'), 'private screenshot');
  assert.equal(running[0].id, queued.id);
  assert.equal(running[0].turnId, 'turn-1');
});

test('durably resumes an app-owned turn once after a Codespace interruption', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'made-solid-codex-durable-resume-'));
  const state = { busy: false, turns: [], turnStatuses: {} };
  const bridge = new CodexFeedbackBridge({
    cwd: '/workspaces/siteforge-os',
    storageRoot: directory,
    connect: fakeConnection(state),
  });
  const accepted = await bridge.enqueue({
    prompt: 'Finish the source-aware payment integration.',
    model: 'gpt-text-only',
    effort: 'medium',
    threadId: 'thread-2',
  });
  assert.equal(accepted.status, 'accepted');
  assert.equal((await bridge.readRecords('running'))[0].turnId, 'turn-1');

  state.turnStatuses['turn-1'] = 'interrupted';
  await bridge.maintain();
  assert.equal(state.turns.length, 2);
  assert.match(state.turns[1].input[0].text, /Codespace paused/);
  const recovered = (await bridge.readRecords('running'))[0];
  assert.equal(recovered.turnId, 'turn-2');
  assert.equal(recovered.recoveryCount, 1);

  state.turnStatuses['turn-2'] = 'completed';
  await bridge.maintain();
  const completed = (await bridge.readRecords('completed'))[0];
  assert.equal(completed.id, accepted.id);
  assert.ok(completed.completedAt);
});

test('delivers a text-only chat turn without creating an image attachment', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'made-solid-codex-chat-'));
  const state = { busy: false, turns: [] };
  const bridge = new CodexFeedbackBridge({
    cwd: '/workspaces/siteforge-os',
    storageRoot: directory,
    connect: fakeConnection(state),
  });
  const queued = await bridge.enqueue({
    prompt: 'Explain the next implementation step.',
    model: 'gpt-text-only',
    effort: 'medium',
    context: 'Made Solid Studio',
    threadId: 'thread-2',
  });
  await new Promise((resolveWait) => setTimeout(resolveWait, 20));

  assert.equal(queued.status, 'accepted');
  assert.match(queued.detail, /started this request/i);
  assert.equal(state.turns.length, 1);
  assert.equal(state.turns[0].model, 'gpt-text-only');
  assert.equal(state.turns[0].threadId, 'thread-2');
  assert.deepEqual(state.turns[0].runtimeWorkspaceRoots, [
    '/workspaces/siteforge-os',
    '/workspaces/made-solid-website',
  ]);
  assert.deepEqual(
    state.turns[0].input.map((input) => input.type),
    ['text'],
  );
  assert.match(state.turns[0].input[0].text, /Made Solid Studio/);
  const deliveredStatus = await bridge.inspect({ threadId: 'thread-2' });
  const deliveredMessage = deliveredStatus.messages.at(-1);
  assert.equal(deliveredMessage.text, 'Explain the next implementation step.');
  assert.equal(deliveredMessage.feedbackId, queued.id);
  assert.equal(deliveredMessage.attachmentId, undefined);
});

test('runs an idle conversation while another conversation is already working', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'made-solid-codex-concurrent-'));
  const state = { busy: true, turns: [] };
  const bridge = new CodexFeedbackBridge({
    cwd: '/workspaces/siteforge-os',
    storageRoot: directory,
    connect: fakeConnection(state),
  });
  await bridge.enqueue({
    prompt: 'Keep working in the first conversation.',
    model: 'gpt-text-only',
    effort: 'medium',
    threadId: 'thread-1',
  });
  await new Promise((resolveWait) => setTimeout(resolveWait, 20));
  await bridge.enqueue({
    prompt: 'Start this independent conversation now.',
    model: 'gpt-text-only',
    effort: 'medium',
    threadId: 'thread-2',
  });
  await new Promise((resolveWait) => setTimeout(resolveWait, 20));

  assert.equal(state.turns.length, 1);
  assert.equal(state.turns[0].threadId, 'thread-2');
  const queued = await bridge.readRecords('queued');
  assert.equal(queued.length, 1);
  assert.equal(queued[0].threadId, 'thread-1');
});

test('drains a second conversation submitted while another flush is in progress', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'made-solid-codex-flush-race-'));
  const state = { busy: true, turns: [] };
  const baseConnection = fakeConnection(state);
  let releaseFirstModelRead;
  const firstModelRead = new Promise((resolve) => {
    releaseFirstModelRead = resolve;
  });
  let modelReads = 0;
  const bridge = new CodexFeedbackBridge({
    cwd: '/workspaces/siteforge-os',
    storageRoot: directory,
    connect: async () => {
      const client = await baseConnection();
      return {
        ...client,
        async request(method, params) {
          if (method === 'model/list' && modelReads++ === 0) await firstModelRead;
          return client.request(method, params);
        },
      };
    },
  });
  const first = bridge.enqueue({
    prompt: 'Wait behind the active first conversation.',
    model: 'gpt-text-only',
    effort: 'medium',
    threadId: 'thread-1',
  });
  await new Promise((resolveWait) => setTimeout(resolveWait, 5));
  const second = bridge.enqueue({
    prompt: 'Run this second conversation independently.',
    model: 'gpt-text-only',
    effort: 'medium',
    threadId: 'thread-2',
  });
  releaseFirstModelRead();
  const [, secondResult] = await Promise.all([first, second]);

  assert.equal(secondResult.status, 'accepted');
  assert.equal(state.turns.length, 1);
  assert.equal(state.turns[0].threadId, 'thread-2');
  const queued = await bridge.readRecords('queued');
  assert.deepEqual(
    queued.map((record) => record.threadId),
    ['thread-1'],
  );
});

test('uses the Codex title after the first prompt and deletes only abandoned empty chats', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'made-solid-codex-empty-thread-'));
  const state = { busy: false, turns: [], deletedThreads: [] };
  const bridge = new CodexFeedbackBridge({
    cwd: '/workspaces/siteforge-os',
    storageRoot: directory,
    connect: fakeConnection(state),
  });
  const abandoned = await bridge.createThread({ model: 'gpt-text-only', effort: 'medium' });
  assert.equal(abandoned.thread.name, undefined);
  assert.equal(abandoned.thread.discardable, true);
  const deleted = await bridge.deleteEmptyThread(abandoned.thread.id);
  assert.equal(deleted.deleted, true);
  assert.deepEqual(state.deletedThreads, [abandoned.thread.id]);

  const prompted = await bridge.createThread({ model: 'gpt-text-only', effort: 'medium' });
  await bridge.enqueue({
    prompt: 'Fix the homepage navigation hierarchy.',
    model: 'gpt-text-only',
    effort: 'medium',
    threadId: prompted.thread.id,
  });
  await new Promise((resolveWait) => setTimeout(resolveWait, 20));
  const status = await bridge.inspect({ threadId: prompted.thread.id });
  assert.equal(status.thread.name, 'Automatically named by Codex');
  assert.equal(status.thread.discardable, false);
  const retained = await bridge.deleteEmptyThread(prompted.thread.id);
  assert.equal(retained.deleted, false);
});

test('creates and returns a new persistent full-access Codex conversation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'made-solid-codex-new-thread-'));
  const state = { busy: false, turns: [], threadStarts: [] };
  const bridge = new CodexFeedbackBridge({
    cwd: '/workspaces/siteforge-os',
    storageRoot: directory,
    connect: fakeConnection(state),
  });
  const created = await bridge.createThread({
    model: 'gpt-image-capable',
    effort: 'medium',
  });

  assert.equal(created.thread.id, 'thread-new-1');
  assert.deepEqual(state.threadStarts, [
    {
      cwd: '/workspaces/siteforge-os',
      runtimeWorkspaceRoots: ['/workspaces/siteforge-os', '/workspaces/made-solid-website'],
      model: 'gpt-image-capable',
      sandbox: 'danger-full-access',
      approvalPolicy: 'never',
      config: { model_reasoning_effort: 'medium' },
      ephemeral: false,
      sessionStartSource: 'clear',
    },
  ]);
});

test('deletes an abandoned new chat before its rollout is materialized', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'made-solid-codex-unmaterialized-thread-'));
  const state = {
    busy: false,
    turns: [],
    threadStarts: [],
    deletedThreads: [],
    unmaterializedNewThreads: true,
  };
  const bridge = new CodexFeedbackBridge({
    cwd: '/workspaces/siteforge-os',
    storageRoot: directory,
    connect: fakeConnection(state),
  });
  const created = await bridge.createThread({
    model: 'gpt-image-capable',
    effort: 'medium',
  });

  const deleted = await bridge.deleteEmptyThread(created.thread.id);

  assert.equal(deleted.deleted, true);
  assert.deepEqual(state.deletedThreads, [created.thread.id]);
});

test('edits a queued message and interrupts the active turn from that exact queued card', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'made-solid-codex-interrupt-'));
  const state = { busy: true, turns: [], interrupts: [] };
  const bridge = new CodexFeedbackBridge({
    cwd: '/workspaces/siteforge-os',
    storageRoot: directory,
    connect: fakeConnection(state),
  });
  const queued = await bridge.enqueue({
    prompt: 'Original queued direction.',
    model: 'gpt-text-only',
    effort: 'medium',
    threadId: 'thread-1',
  });
  await bridge.updateQueued(queued.id, { prompt: 'Stop and use this updated direction instead.' });
  const waiting = await bridge.inspect({ threadId: 'thread-1' });
  assert.equal(waiting.queuedMessages[0].prompt, 'Stop and use this updated direction instead.');
  const interrupted = await bridge.interruptQueued(queued.id);
  await new Promise((resolveWait) => setTimeout(resolveWait, 30));

  assert.match(interrupted.detail, /active Codex turn is stopping/i);
  assert.deepEqual(state.interrupts, [{ threadId: 'thread-1', turnId: 'turn-active' }]);
  assert.equal(state.turns.length, 1);
  assert.equal(state.turns[0].input[0].text, 'Stop and use this updated direction instead.');
});

test('rejects unsupported models and prompts before creating a Codex turn', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'made-solid-codex-validation-'));
  const state = { busy: false, turns: [] };
  const bridge = new CodexFeedbackBridge({
    cwd: '/workspaces/siteforge-os',
    storageRoot: directory,
    connect: fakeConnection(state),
  });
  await assert.rejects(
    bridge.enqueue({
      screenshot: imageDataUrl,
      prompt: '',
      model: 'gpt-image-capable',
      effort: 'medium',
    }),
    /prompt/i,
  );
  await bridge.enqueue({
    screenshot: imageDataUrl,
    prompt: 'Inspect this.',
    model: 'gpt-text-only',
    effort: 'medium',
  });
  await new Promise((resolveWait) => setTimeout(resolveWait, 20));
  assert.equal((await bridge.readRecords('failed')).length, 1);
  assert.equal(state.turns.length, 0);
});
