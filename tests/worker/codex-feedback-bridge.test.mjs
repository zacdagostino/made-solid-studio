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
        if (params.ancestorThreadId) return { data: state.agentThreads || [] };
        return {
          data: [
            ...(state.newThreads || []),
            {
              id: 'thread-1',
              name: 'Current Studio chat',
              cwd: '/workspaces/siteforge-os',
              updatedAt: Math.floor(Date.now() / 1_000) - 12,
              status:
                state.threadStatus ||
                (state.busy ? { type: 'active', activeFlags: ['turn'] } : { type: 'idle' }),
            },
            {
              id: 'thread-2',
              name: 'Earlier Studio chat',
              cwd: '/workspaces/siteforge-os',
              status: state.threadStatus || { type: 'idle' },
            },
          ],
        };
      }
      if (method === 'thread/read') {
        const agentThread = state.agentThreads?.find((thread) => thread.id === params.threadId);
        if (agentThread) return { thread: agentThread };
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
            status:
              state.threadStatus ||
              (state.busy ? { type: 'active', activeFlags: [] } : { type: 'idle' }),
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
                  ...(state.collabItems || []),
                ],
              },
              ...submittedTurns,
            ],
          },
        };
      }
      if (method === 'thread/resume') {
        state.threadResumes ??= [];
        state.threadResumes.push(params);
        if (state.reactivateOnResume) {
          state.threadStatus = { type: 'active', activeFlags: ['turn'] };
          const lastTurnId = state.turnIds?.at(-1);
          if (lastTurnId) state.turnStatuses[lastTurnId] = 'inProgress';
        }
        return { thread: { id: params.threadId } };
      }
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
        const agentThread = state.agentThreads?.find((thread) => thread.id === params.threadId);
        if (agentThread) {
          throw new Error('direct app-server input is not allowed for multi-agent v2 sub-agents');
        }
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
      if (method === 'turn/steer') {
        state.steers ??= [];
        state.steers.push(params);
        return { turnId: params.expectedTurnId };
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
    close() {
      state.closedConnections = Number(state.closedConnections || 0) + 1;
    },
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
  assert.equal(status.messages[0].turnId, 'turn-active');
  assert.equal(status.messages[1].text, 'The Studio page is ready.');
  assert.equal(status.models[0].supportsImages, true);
  assert.deepEqual(
    status.models[0].efforts.map((effort) => effort.id),
    ['low', 'medium'],
  );
  assert.equal(status.models[1].supportsImages, false);
  assert.deepEqual(status.agents, []);
});

test('returns the live hierarchy and bounded sub-chat transcript for attached agents', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'made-solid-codex-agents-'));
  const now = Math.floor(Date.now() / 1_000);
  const state = {
    busy: true,
    turns: [],
    collabItems: [
      {
        id: 'spawn-agent-1',
        type: 'collabAgentToolCall',
        tool: 'spawnAgent',
        status: 'completed',
        senderThreadId: 'thread-1',
        receiverThreadIds: ['agent-1'],
        agentsStates: {
          'agent-1': { status: 'running', message: 'Checking the responsive layout.' },
        },
      },
    ],
    agentThreads: [
      {
        id: 'agent-1',
        parentThreadId: 'thread-1',
        agentNickname: 'Lime',
        agentRole: 'responsive reviewer',
        preview: 'Verify the chat at mobile, tablet, and desktop widths.',
        createdAt: now - 30,
        updatedAt: now,
        status: { type: 'active', activeFlags: ['turn'] },
        turns: [
          {
            id: 'agent-turn-1',
            status: 'inProgress',
            startedAt: now - 25,
            items: [
              {
                id: 'agent-user-1',
                type: 'userMessage',
                content: [{ type: 'text', text: 'Verify every required viewport.' }],
              },
              {
                id: 'agent-message-1',
                type: 'agentMessage',
                text: 'Mobile and tablet checks are in progress.',
              },
            ],
          },
        ],
      },
      {
        id: 'agent-2',
        parentThreadId: 'agent-1',
        agentNickname: 'Oak',
        preview: 'Inspect keyboard and focus behaviour.',
        createdAt: now - 20,
        updatedAt: now - 2,
        status: { type: 'idle' },
        turns: [
          {
            id: 'agent-turn-2',
            status: 'completed',
            items: [
              {
                id: 'agent-message-2',
                type: 'agentMessage',
                text: 'Keyboard checks passed.',
              },
            ],
          },
        ],
      },
    ],
  };
  const bridge = new CodexFeedbackBridge({
    cwd: '/workspaces/siteforge-os',
    storageRoot: directory,
    connect: fakeConnection(state),
  });

  const status = await bridge.inspect({ threadId: 'thread-1' });

  assert.equal(status.agents.length, 2);
  assert.equal(status.agents[0].role, 'responsive reviewer');
  assert.equal(status.agents[0].status, 'running');
  assert.equal(status.agents[0].working, true);
  assert.equal(status.agents[0].supervisorTurnId, 'turn-active');
  assert.equal(status.agents[0].messages.at(-1).text, 'Mobile and tablet checks are in progress.');
  assert.equal(status.agents[1].depth, 1);
  assert.equal(status.agents[1].supervisorTurnId, 'turn-active');
  assert.equal(status.agents[1].status, 'completed');
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

test('asks the supervisor to resume each interrupted attached agent through collaboration', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'made-solid-codex-team-resume-'));
  const interruptedTurn = (id) => ({ id, status: 'interrupted', items: [] });
  const state = {
    busy: false,
    interrupted: true,
    turns: [],
    collabItems: [
      {
        id: 'team-state',
        type: 'collabAgentToolCall',
        agentsStates: {
          'agent-interrupted-1': { status: 'interrupted' },
          'agent-interrupted-2': { status: 'interrupted' },
          'agent-complete': { status: 'completed' },
        },
      },
    ],
    agentThreads: [
      {
        id: 'agent-interrupted-1',
        parentThreadId: 'thread-1',
        agentRole: 'responsive reviewer',
        preview: 'Check the responsive interface.',
        status: { type: 'idle' },
        turns: [interruptedTurn('agent-turn-1')],
      },
      {
        id: 'agent-interrupted-2',
        parentThreadId: 'thread-1',
        agentNickname: 'Oak',
        preview: 'Run the accessibility checks.',
        status: { type: 'notLoaded' },
        turns: [interruptedTurn('agent-turn-2')],
      },
      {
        id: 'agent-complete',
        parentThreadId: 'thread-1',
        preview: 'Inspect the backend contract.',
        status: { type: 'idle' },
        turns: [{ id: 'agent-turn-3', status: 'completed', items: [] }],
      },
    ],
  };
  const bridge = new CodexFeedbackBridge({
    cwd: '/workspaces/siteforge-os',
    storageRoot: directory,
    connect: fakeConnection(state),
  });

  const resumed = await bridge.continueInterruptedThread({
    threadId: 'thread-1',
    model: 'gpt-text-only',
    effort: 'medium',
  });

  assert.deepEqual(
    state.turns.map((turn) => turn.threadId),
    ['thread-1'],
  );
  assert.equal(resumed.resumeRequestedAgents.length, 2);
  assert.equal(resumed.resumedAgents.length, 2);
  assert.deepEqual(resumed.agentResumeFailures, []);
  assert.match(resumed.detail, /instructions to restart 2 interrupted attached agents/);
  assert.match(state.turns[0].input[0].text, /followup_task collaboration tool/);
  assert.match(state.turns[0].input[0].text, /agent-interrupted-1/);
  assert.match(state.turns[0].input[0].text, /agent-interrupted-2/);
  assert.doesNotMatch(state.turns[0].input[0].text, /agent-complete/);
  assert.match(state.turns[0].input[0].text, /Wait for fresh completion results/);
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

test('durably resumes every newly interrupted app-owned continuation', async () => {
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

  state.turnStatuses['turn-2'] = 'interrupted';
  await bridge.maintain();
  assert.equal(state.turns.length, 3);
  assert.match(state.turns[2].input[0].text, /Codespace paused/);
  const recoveredAgain = (await bridge.readRecords('running'))[0];
  assert.equal(recoveredAgain.turnId, 'turn-3');
  assert.equal(recoveredAgain.recoveryCount, 2);

  state.turnStatuses['turn-3'] = 'completed';
  await bridge.maintain();
  const completed = (await bridge.readRecords('completed'))[0];
  assert.equal(completed.id, accepted.id);
  assert.ok(completed.completedAt);
});

test('uses an app-server reactivated turn instead of starting a duplicate continuation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'made-solid-codex-reactivated-turn-'));
  const state = {
    busy: false,
    turns: [],
    turnStatuses: {},
    reactivateOnResume: true,
  };
  const bridge = new CodexFeedbackBridge({
    cwd: '/workspaces/siteforge-os',
    storageRoot: directory,
    connect: fakeConnection(state),
  });
  await bridge.enqueue({
    prompt: 'Complete the resumable task.',
    model: 'gpt-text-only',
    effort: 'medium',
    threadId: 'thread-2',
  });
  state.turnStatuses['turn-1'] = 'interrupted';
  state.threadStatus = { type: 'notLoaded' };

  await bridge.maintain();

  assert.equal(state.turns.length, 1);
  assert.equal(state.turnStatuses['turn-1'], 'inProgress');
  assert.deepEqual(state.threadResumes, [
    {
      threadId: 'thread-2',
      runtimeWorkspaceRoots: ['/workspaces/siteforge-os', '/workspaces/made-solid-website'],
      sandbox: 'workspace-write',
      approvalPolicy: 'never',
    },
  ]);
  const running = (await bridge.readRecords('running'))[0];
  assert.equal(running.turnId, 'turn-1');
  assert.equal(running.recoveryCount, undefined);
});

test('rebinds a recovery turn accepted before the bridge process disconnected', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'made-solid-codex-recovery-rebind-'));
  const state = { busy: false, turns: [], turnStatuses: {} };
  const bridge = new CodexFeedbackBridge({
    cwd: '/workspaces/siteforge-os',
    storageRoot: directory,
    connect: fakeConnection(state),
  });
  const accepted = await bridge.enqueue({
    prompt: 'Finish the durable handoff.',
    model: 'gpt-text-only',
    effort: 'medium',
    threadId: 'thread-2',
  });
  const record = (await bridge.readRecords('running'))[0];
  state.turnStatuses['turn-1'] = 'interrupted';
  await bridge.updateRecordStatus(record, 'recovering', {
    recoveryFromTurnId: 'turn-1',
    recoveryStartedAt: new Date().toISOString(),
  });
  state.turns.push({
    threadId: 'thread-2',
    input: [{ type: 'text', text: 'Existing recovery accepted before disconnect.' }],
  });
  state.turnIds.push('turn-2');

  await bridge.maintain();

  assert.equal(state.turns.length, 2);
  const rebound = (await bridge.readRecords('running'))[0];
  assert.equal(rebound.id, accepted.id);
  assert.equal(rebound.turnId, 'turn-2');
  assert.equal(rebound.recoveryFromTurnId, undefined);
});

test('automatically gives the supervisor exact interrupted-agent recovery instructions', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'made-solid-codex-team-maintenance-'));
  const state = {
    busy: false,
    turns: [],
    turnStatuses: {},
    agentThreads: [
      {
        id: 'agent-interrupted',
        parentThreadId: 'thread-2',
        agentRole: 'verification specialist',
        preview: 'Verify the implementation.',
        status: { type: 'idle' },
        turns: [{ id: 'agent-turn-1', status: 'interrupted', items: [] }],
      },
      {
        id: 'agent-complete',
        parentThreadId: 'thread-2',
        preview: 'Review the contract.',
        status: { type: 'idle' },
        turns: [{ id: 'agent-turn-2', status: 'completed', items: [] }],
      },
    ],
  };
  const bridge = new CodexFeedbackBridge({
    cwd: '/workspaces/siteforge-os',
    storageRoot: directory,
    connect: fakeConnection(state),
  });
  await bridge.enqueue({
    prompt: 'Complete the feature with an agent team.',
    model: 'gpt-text-only',
    effort: 'medium',
    workMode: 'team',
    threadId: 'thread-2',
  });
  state.turnStatuses['turn-1'] = 'interrupted';

  await bridge.maintain();

  assert.deepEqual(
    state.turns.map((turn) => turn.threadId),
    ['thread-2', 'thread-2'],
  );
  assert.equal(state.agentThreads[0].status.type, 'idle');
  assert.equal(state.agentThreads[1].status.type, 'idle');
  assert.match(state.turns[1].input[0].text, /Codespace paused/);
  assert.match(state.turns[1].input[0].text, /followup_task collaboration tool/);
  assert.match(state.turns[1].input[0].text, /agent-interrupted/);
  assert.doesNotMatch(state.turns[1].input[0].text, /agent-complete/);
});

test('steers a reactivated supervisor once to resume interrupted team agents', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'made-solid-codex-team-steer-'));
  const state = {
    busy: false,
    turns: [],
    turnStatuses: {},
    agentThreads: [
      {
        id: 'agent-interrupted',
        parentThreadId: 'thread-2',
        preview: 'Verify the implementation.',
        status: { type: 'idle' },
        turns: [{ id: 'agent-turn-1', status: 'interrupted', items: [] }],
      },
    ],
  };
  const bridge = new CodexFeedbackBridge({
    cwd: '/workspaces/siteforge-os',
    storageRoot: directory,
    connect: fakeConnection(state),
  });
  await bridge.enqueue({
    prompt: 'Complete the feature with an agent team.',
    model: 'gpt-text-only',
    effort: 'medium',
    workMode: 'team',
    threadId: 'thread-2',
  });

  await bridge.maintain();
  await bridge.maintain();

  assert.equal(state.turns.length, 1);
  assert.equal(state.steers.length, 1);
  assert.equal(state.steers[0].threadId, 'thread-2');
  assert.equal(state.steers[0].expectedTurnId, 'turn-1');
  assert.match(state.steers[0].input[0].text, /followup_task collaboration tool/);
  assert.match(state.steers[0].input[0].text, /agent-interrupted/);
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
  assert.ok(state.closedConnections > 0);
  assert.deepEqual(state.interrupts || [], []);
});

test('authorizes real delegation only for an Agent team request and keeps the visible prompt clean', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'made-solid-codex-agent-team-'));
  const state = { busy: false, turns: [] };
  const bridge = new CodexFeedbackBridge({
    cwd: '/workspaces/siteforge-os',
    storageRoot: directory,
    connect: fakeConnection(state),
  });

  const accepted = await bridge.enqueue({
    prompt: 'Build and verify the new workspace navigation.',
    model: 'gpt-text-only',
    effort: 'medium',
    workMode: 'team',
    threadId: 'thread-2',
  });

  assert.equal(accepted.status, 'accepted');
  assert.match(state.turns[0].input[0].text, /Agent team is enabled/);
  assert.match(state.turns[0].input[0].text, /Delegate useful independent workstreams/);
  assert.equal((await bridge.readRecords('running'))[0].workMode, 'team');
  const status = await bridge.inspect({ threadId: 'thread-2' });
  assert.equal(status.messages.at(-1).text, 'Build and verify the new workspace navigation.');
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

test('creates and returns a new persistent repository-scoped Codex conversation', async () => {
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
      sandbox: 'workspace-write',
      approvalPolicy: 'never',
      config: { model_reasoning_effort: 'medium' },
      ephemeral: false,
      sessionStartSource: 'clear',
    },
  ]);
});

test('applies the repository-scoped workspace-write policy to every delivered turn', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'made-solid-codex-workspace-write-'));
  const state = { busy: false, turns: [] };
  const bridge = new CodexFeedbackBridge({
    cwd: '/workspaces/siteforge-os',
    storageRoot: directory,
    connect: fakeConnection(state),
  });

  const accepted = await bridge.enqueue({
    prompt: 'Update both Made Solid repositories.',
    model: 'gpt-text-only',
    effort: 'medium',
    threadId: 'thread-2',
  });

  assert.equal(accepted.status, 'accepted');
  assert.deepEqual(state.turns[0].runtimeWorkspaceRoots, [
    '/workspaces/siteforge-os',
    '/workspaces/made-solid-website',
  ]);
  assert.deepEqual(state.turns[0].sandboxPolicy, {
    type: 'workspaceWrite',
    writableRoots: ['/workspaces/siteforge-os', '/workspaces/made-solid-website'],
    networkAccess: true,
  });
  assert.equal(state.turns[0].approvalPolicy, 'never');
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
