import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const defaultServerUrl = 'ws://127.0.0.1:4500';
const maximumImageBytes = 15 * 1024 * 1024;
const maximumImageAttachments = 5;
const maximumPromptLength = 4_000;
const maximumAgentThreads = 24;
const teamDelegationInstruction =
  'Agent team is enabled for this request. You are the supervisor. Delegate useful independent workstreams to attached sub-agents with clear, non-overlapping assignments, run them concurrently when practical, monitor their outcomes, and synthesize the result in this parent conversation. Keep work that is trivial or inherently sequential in the parent agent.';
const progressUpdateInstruction =
  'During longer work, keep the user oriented with concise commentary at meaningful transitions: explain what you are checking, what you learned or changed, and what remains. Send an update before a long tool run. Do not narrate routine actions, repeat yourself, expose hidden reasoning, or claim unverified progress.';
const supportedImageTypes = new Map([
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['image/webp', '.webp'],
]);

function waitForOpen(socket, timeoutMs = 3_000) {
  return new Promise((resolveOpen, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('The local Codex service did not respond.')),
      timeoutMs,
    );
    socket.addEventListener(
      'open',
      () => {
        clearTimeout(timeout);
        resolveOpen();
      },
      { once: true },
    );
    socket.addEventListener(
      'error',
      () => {
        clearTimeout(timeout);
        reject(new Error('The local Codex service is unavailable.'));
      },
      { once: true },
    );
  });
}

export async function connectCodexAppServer({
  serverUrl = process.env.MADE_SOLID_CODEX_APP_SERVER_URL || defaultServerUrl,
  WebSocketImplementation = globalThis.WebSocket,
} = {}) {
  if (!WebSocketImplementation)
    throw new Error('This Node runtime does not provide WebSocket support.');
  const socket = new WebSocketImplementation(serverUrl);
  await waitForOpen(socket);
  let nextId = 1;
  const pending = new Map();
  const request = (method, params = {}) =>
    new Promise((resolveRequest, reject) => {
      const id = nextId++;
      pending.set(id, { resolveRequest, reject });
      socket.send(JSON.stringify({ method, id, params }));
    });
  const handleMessage = (event) => {
    let message;
    try {
      message = JSON.parse(String(event.data));
    } catch {
      return;
    }
    if (message.id === undefined || !pending.has(message.id)) return;
    const pendingRequest = pending.get(message.id);
    pending.delete(message.id);
    if (message.error)
      pendingRequest.reject(new Error(String(message.error.message || 'Codex request failed.')));
    else pendingRequest.resolveRequest(message.result);
  };
  socket.addEventListener('message', handleMessage);
  socket.addEventListener('close', () => {
    for (const pendingRequest of pending.values()) {
      pendingRequest.reject(new Error('The local Codex connection closed unexpectedly.'));
    }
    pending.clear();
  });
  await request('initialize', {
    clientInfo: {
      name: 'made_solid_studio',
      title: 'Made Solid Studio',
      version: '0.1.0',
    },
    capabilities: {
      experimentalApi: true,
    },
  });
  socket.send(JSON.stringify({ method: 'initialized', params: {} }));
  return {
    request,
    close() {
      socket.close();
    },
  };
}

function publicModel(model) {
  const supportedEfforts = Array.isArray(model.supportedReasoningEfforts)
    ? model.supportedReasoningEfforts
        .map((item) => ({
          id: String(item.reasoningEffort || ''),
          description: String(item.description || ''),
        }))
        .filter((item) => item.id)
    : [];
  const modalities = Array.isArray(model.inputModalities)
    ? model.inputModalities
    : ['text', 'image'];
  const serviceTiers = Array.isArray(model.serviceTiers)
    ? model.serviceTiers
        .map((tier) => ({
          id: String(tier.id || ''),
          name: String(tier.name || tier.id || ''),
          description: String(tier.description || ''),
        }))
        .filter((tier) => tier.id)
    : [];
  return {
    id: String(model.id || model.model || ''),
    label: String(model.displayName || model.id || model.model || 'Codex model'),
    defaultEffort: String(model.defaultReasoningEffort || supportedEfforts[0]?.id || 'medium'),
    efforts: supportedEfforts,
    supportsImages: modalities.includes('image'),
    serviceTiers,
    defaultServiceTier: String(model.defaultServiceTier || 'default'),
    isDefault: model.isDefault === true,
  };
}

function selectedServiceTier(input, model) {
  const serviceTier = input.serviceTier === 'priority' ? 'priority' : 'default';
  if (
    serviceTier === 'priority' &&
    !model.serviceTiers.some((candidate) => candidate.id === 'priority')
  ) {
    throw new Error('Fast mode is unavailable for this model.');
  }
  return serviceTier;
}

function selectThread(threads, cwd) {
  const candidates = Array.isArray(threads) ? threads : [];
  return (
    candidates.find((thread) => thread.cwd === cwd && thread.status?.type === 'active') ||
    candidates.find((thread) => thread.cwd === cwd) ||
    candidates.find((thread) => thread.status?.type === 'active') ||
    candidates[0]
  );
}

function publicThread(thread, { discardable = false } = {}) {
  const turn = activeTurn(thread);
  const lastTurn = [...(Array.isArray(thread?.turns) ? thread.turns : [])]
    .reverse()
    .find((candidate) => typeof candidate?.id === 'string');
  const activeFlags = Array.isArray(thread.status?.activeFlags)
    ? thread.status.activeFlags.filter((flag) => typeof flag === 'string').slice(0, 8)
    : [];
  return {
    id: String(thread.id),
    name: typeof thread.name === 'string' ? thread.name : undefined,
    preview: typeof thread.preview === 'string' ? thread.preview.slice(0, 160) : undefined,
    status: String(thread.status?.type || 'unknown'),
    working: thread.status?.type === 'active',
    activeTurnId: typeof turn?.id === 'string' ? turn.id : undefined,
    activeFlags,
    updatedAt: typeof thread.updatedAt === 'number' ? thread.updatedAt : undefined,
    workingStartedAt: typeof turn?.startedAt === 'number' ? turn.startedAt : undefined,
    lastTurnStatus: typeof lastTurn?.status === 'string' ? lastTurn.status : undefined,
    interrupted: lastTurn?.status === 'interrupted',
    discardable,
  };
}

function agentTask(thread) {
  const task = String(thread?.preview || '')
    .split(/\n\s*(?:Captured from:|Agent team is enabled)/i, 1)[0]
    .replace(/\s+/g, ' ')
    .trim();
  return task.slice(0, maximumPromptLength);
}

function collabAgentStates(threads) {
  const states = new Map();
  for (const thread of threads) {
    for (const turn of Array.isArray(thread?.turns) ? thread.turns : []) {
      for (const item of Array.isArray(turn?.items) ? turn.items : []) {
        if (item?.type !== 'collabAgentToolCall' || !item.agentsStates) continue;
        for (const [threadId, state] of Object.entries(item.agentsStates)) {
          if (state && typeof state === 'object') states.set(String(threadId), state);
        }
      }
    }
  }
  return states;
}

function collabAgentTurnIds(thread) {
  const turnIds = new Map();
  for (const turn of Array.isArray(thread?.turns) ? thread.turns : []) {
    if (typeof turn?.id !== 'string') continue;
    for (const item of Array.isArray(turn.items) ? turn.items : []) {
      if (item?.type !== 'collabAgentToolCall' || !item.agentsStates) continue;
      for (const threadId of Object.keys(item.agentsStates)) {
        if (!turnIds.has(String(threadId))) turnIds.set(String(threadId), turn.id);
      }
    }
  }
  return turnIds;
}

function publicAgent(thread, detail, state, depth, supervisorTurnId) {
  const source = detail?.thread ? { ...thread, ...detail.thread } : thread;
  const turn = activeTurn(source);
  const lastTurn = [...(Array.isArray(source?.turns) ? source.turns : [])]
    .reverse()
    .find((candidate) => typeof candidate?.id === 'string');
  const inferredStatus =
    source?.status?.type === 'active'
      ? 'running'
      : source?.status?.type === 'systemError'
        ? 'errored'
        : lastTurn?.status === 'interrupted'
          ? 'interrupted'
          : lastTurn?.status === 'completed'
            ? 'completed'
            : source?.status?.type === 'idle'
              ? lastTurn
                ? 'completed'
                : 'pendingInit'
              : 'pendingInit';
  const messages = publicMessages(source).slice(-10);
  const latestAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant')?.text;
  const status =
    source?.status?.type === 'active' || turn
      ? 'running'
      : lastTurn?.status === 'interrupted'
        ? 'interrupted'
        : lastTurn?.status === 'completed'
          ? 'completed'
          : source?.status?.type === 'systemError'
            ? 'errored'
            : typeof state?.status === 'string'
              ? state.status
              : inferredStatus;
  return {
    id: String(source.id),
    parentThreadId: typeof source.parentThreadId === 'string' ? source.parentThreadId : undefined,
    supervisorTurnId,
    nickname: typeof source.agentNickname === 'string' ? source.agentNickname : undefined,
    role: typeof source.agentRole === 'string' ? source.agentRole : undefined,
    name: typeof source.name === 'string' ? source.name : undefined,
    task: agentTask(source),
    status,
    statusMessage:
      typeof state?.message === 'string'
        ? state.message.slice(0, 12_000)
        : latestAssistantMessage?.slice(0, 12_000),
    working: status === 'running',
    depth,
    createdAt: typeof source.createdAt === 'number' ? source.createdAt : undefined,
    updatedAt: typeof source.updatedAt === 'number' ? source.updatedAt : undefined,
    workingStartedAt: typeof turn?.startedAt === 'number' ? turn.startedAt : undefined,
    messages,
  };
}

function hasConversationContent(thread) {
  return (Array.isArray(thread?.turns) ? thread.turns : []).some((turn) =>
    (Array.isArray(turn?.items) ? turn.items : []).some(
      (item) => item?.type === 'userMessage' || item?.type === 'agentMessage',
    ),
  );
}

function activeTurn(thread) {
  return [...(Array.isArray(thread?.turns) ? thread.turns : [])]
    .reverse()
    .find((turn) => turn?.status === 'inProgress' && typeof turn.id === 'string');
}

function lastTurn(thread) {
  return [...(Array.isArray(thread?.turns) ? thread.turns : [])]
    .reverse()
    .find((turn) => typeof turn?.id === 'string');
}

function supervisorAgentRecoveryInstruction(agents) {
  if (!agents.length) return '';
  const targets = agents.map((agent) => `${agent.name} (${agent.id})`).join(', ');
  return ` Agent team recovery is required for these interrupted attached agents: ${targets}. Before continuing the parent work, use the followup_task collaboration tool once for each exact thread ID and tell that agent to continue its original assignment from its saved sub-chat. Do not call App Server directly for a child, do not merely monitor an interrupted child, and do not spawn a replacement unless followup_task reports that the saved child cannot resume. Wait for fresh completion results from every resumed child before final synthesis.`;
}

function publicMessages(thread) {
  const messages = [];
  for (const turn of Array.isArray(thread?.turns) ? thread.turns : []) {
    for (const item of Array.isArray(turn.items) ? turn.items : []) {
      if (item.type === 'userMessage') {
        const text = (Array.isArray(item.content) ? item.content : [])
          .filter((part) => part?.type === 'text' && typeof part.text === 'string')
          .map((part) => part.text)
          .join('\n')
          .trim();
        if (text)
          messages.push({
            id: String(item.id || randomUUID()),
            role: 'user',
            text: text.slice(0, maximumPromptLength),
            turnId: typeof turn.id === 'string' ? turn.id : undefined,
          });
      } else if (item.type === 'agentMessage' && typeof item.text === 'string') {
        const text = item.text.trim();
        if (text)
          messages.push({
            id: String(item.id || randomUUID()),
            role: 'assistant',
            text: text.slice(0, 12_000),
            phase: typeof item.phase === 'string' ? item.phase : undefined,
            turnId: typeof turn.id === 'string' ? turn.id : undefined,
          });
      }
    }
  }
  return messages.slice(-60);
}

function messagesWithFeedbackRecords(thread, records, threadId) {
  const messages = publicMessages(thread);
  const available = records.filter(
    (record) =>
      ['running', 'recovering', 'completed', 'interrupted', 'delivered'].includes(record.status) &&
      String(record.threadId || '') === String(threadId || ''),
  );
  const used = new Set();
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== 'user') continue;
    const record = [...available]
      .reverse()
      .find(
        (candidate) =>
          !used.has(candidate.id) &&
          (message.text === candidate.prompt ||
            message.text.startsWith(`${candidate.prompt}\n\nCaptured from:`) ||
            message.text.startsWith(`${candidate.prompt}\n\nAgent team is enabled`) ||
            message.text.startsWith(`${candidate.prompt}\n\n${progressUpdateInstruction}`)),
      );
    if (!record) continue;
    used.add(record.id);
    message.text = record.prompt;
    message.feedbackId = record.id;
    const attachmentIds = recordAttachmentIds(record);
    if (attachmentIds.length) {
      message.attachmentIds = attachmentIds;
      message.attachmentId = attachmentIds[0];
    }
  }
  return messages;
}

async function atomicWriteJson(path, value) {
  const temporaryPath = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporaryPath, path);
}

function parseScreenshot(dataUrl) {
  if (dataUrl === undefined || dataUrl === null || dataUrl === '') return undefined;
  if (typeof dataUrl !== 'string') throw new Error('The screenshot is invalid.');
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match || !supportedImageTypes.has(match[1])) {
    throw new Error('The screenshot must be a PNG, JPEG, or WebP image.');
  }
  const data = Buffer.from(match[2], 'base64');
  if (!data.length || data.length > maximumImageBytes) {
    throw new Error('The screenshot must be smaller than 15 MB.');
  }
  return { data, extension: supportedImageTypes.get(match[1]), mimeType: match[1] };
}

function recordAttachmentIds(record) {
  const ids = Array.isArray(record?.attachments)
    ? record.attachments
        .map((attachment) => String(attachment?.id || ''))
        .filter((id) => /^[0-9a-f-]{36}$/i.test(id))
    : [];
  if (ids.length) return ids;
  return record?.imagePath && /^[0-9a-f-]{36}$/i.test(String(record.id)) ? [String(record.id)] : [];
}

function recordImageAttachments(record, storageRoot) {
  const attachments = Array.isArray(record?.attachments)
    ? record.attachments.flatMap((attachment) => {
        const id = String(attachment?.id || '');
        const mimeType = String(attachment?.mimeType || '');
        const extension = supportedImageTypes.get(mimeType);
        if (!/^[0-9a-f-]{36}$/i.test(id) || !extension) return [];
        return [{ id, mimeType, path: resolve(storageRoot, `${id}${extension}`) }];
      })
    : [];
  if (attachments.length) return attachments;
  const legacyExtension = supportedImageTypes.get(record?.mimeType);
  return record?.imagePath && legacyExtension
    ? [
        {
          id: String(record.id),
          mimeType: record.mimeType,
          path: resolve(storageRoot, `${record.id}${legacyExtension}`),
        },
      ]
    : [];
}

function railwayContainerThreadSettings(runtimeWorkspaceRoots) {
  return {
    runtimeWorkspaceRoots,
    sandbox: 'danger-full-access',
    approvalPolicy: 'never',
  };
}

function railwayContainerTurnSettings(runtimeWorkspaceRoots) {
  return {
    runtimeWorkspaceRoots,
    sandboxPolicy: {
      type: 'dangerFullAccess',
    },
    approvalPolicy: 'never',
  };
}

export class CodexFeedbackBridge {
  constructor({
    cwd = process.cwd(),
    runtimeWorkspaceRoots,
    storageRoot = resolve('.made-solid', 'codex-feedback'),
    connect = connectCodexAppServer,
  } = {}) {
    this.cwd = resolve(cwd);
    this.runtimeWorkspaceRoots = [
      ...new Set(
        (
          runtimeWorkspaceRoots ?? [
            this.cwd,
            process.env.MADE_SOLID_WEBSITE_DIRECTORY ||
              resolve(this.cwd, '..', 'made-solid-website'),
          ]
        ).map((root) => resolve(root)),
      ),
    ];
    this.storageRoot = storageRoot;
    this.connect = connect;
    this.flushRequested = false;
    this.flushPromise = undefined;
    this.flushRetryTimer = undefined;
    this.startedThreads = new Map();
    this.maintenancePromise = undefined;
  }

  async inspect({ threadId } = {}) {
    const client = await this.connect();
    try {
      const [accountResult, modelResult, threadResult] = await Promise.all([
        client.request('account/read', {}),
        client.request('model/list', { limit: 100, includeHidden: false }),
        client.request('thread/list', { limit: 50, cwd: this.cwd, sortKey: 'updated_at' }),
      ]);
      const models = (modelResult.data || []).map(publicModel).filter((model) => model.id);
      const listedThreads = Array.isArray(threadResult.data) ? threadResult.data : [];
      const startedThreadIds = new Set(this.startedThreads.keys());
      const threadCandidates = [
        ...this.startedThreads.values().map((startedThread) => {
          const listedThread = listedThreads.find(
            (candidate) => String(candidate.id) === String(startedThread.id),
          );
          return listedThread ? { ...startedThread, ...listedThread } : startedThread;
        }),
        ...listedThreads.filter((thread) => !startedThreadIds.has(String(thread.id))),
      ].slice(0, 50);
      let requestedThread = threadCandidates.find(
        (candidate) => String(candidate.id) === String(threadId || ''),
      );
      let requestedThreadDetail;
      if (
        !requestedThread &&
        typeof threadId === 'string' &&
        /^[A-Za-z0-9-]{1,100}$/.test(threadId)
      ) {
        try {
          requestedThreadDetail = await client.request('thread/read', {
            threadId,
            includeTurns: true,
          });
          if (requestedThreadDetail?.thread?.id) {
            requestedThread = requestedThreadDetail.thread;
            threadCandidates.unshift(requestedThread);
          }
        } catch {
          // A stale browser selection falls back to the newest listed Studio thread.
        }
      }
      const thread = requestedThread || selectThread(threadCandidates, this.cwd);
      let threadDetail =
        String(requestedThreadDetail?.thread?.id || '') === String(thread?.id || '')
          ? requestedThreadDetail
          : undefined;
      if (thread) {
        try {
          threadDetail ??= await client.request('thread/read', {
            threadId: thread.id,
            includeTurns: true,
          });
          if (hasConversationContent(threadDetail?.thread)) {
            this.startedThreads.delete(String(thread.id));
          }
        } catch (error) {
          if (!this.startedThreads.has(String(thread.id))) throw error;
          threadDetail = { thread: { ...thread, turns: [] } };
        }
      }
      const detailedThread = threadDetail?.thread
        ? {
            ...thread,
            ...threadDetail.thread,
            status: threadDetail.thread.status || thread.status,
            updatedAt: threadDetail.thread.updatedAt || thread.updatedAt,
          }
        : thread;
      let agentThreads = [];
      if (thread?.id) {
        try {
          const descendants = await client.request('thread/list', {
            limit: maximumAgentThreads,
            ancestorThreadId: thread.id,
            sortKey: 'created_at',
            sortDirection: 'asc',
            sourceKinds: [
              'subAgent',
              'subAgentReview',
              'subAgentCompact',
              'subAgentThreadSpawn',
              'subAgentOther',
            ],
          });
          agentThreads = Array.isArray(descendants.data)
            ? descendants.data.slice(0, maximumAgentThreads)
            : [];
        } catch {
          // Older app-server builds can still serve the parent conversation without agent detail.
        }
      }
      const agentDetails = await Promise.all(
        agentThreads.map(async (agentThread) => {
          try {
            return await client.request('thread/read', {
              threadId: agentThread.id,
              includeTurns: true,
            });
          } catch {
            return { thread: agentThread };
          }
        }),
      );
      const agentStates = collabAgentStates([
        detailedThread,
        ...agentDetails.map((detail) => detail?.thread),
      ]);
      const agentParents = new Map(
        agentThreads.map((agentThread) => [String(agentThread.id), agentThread.parentThreadId]),
      );
      const agentDepth = (agentThread) => {
        let depth = 0;
        let parentId = agentThread.parentThreadId;
        const visited = new Set();
        while (parentId && String(parentId) !== String(thread?.id) && !visited.has(parentId)) {
          visited.add(parentId);
          depth += 1;
          parentId = agentParents.get(String(parentId));
        }
        return Math.min(depth, 4);
      };
      const directAgentTurnIds = collabAgentTurnIds(detailedThread);
      const rootAgentId = (agentThread) => {
        let currentId = String(agentThread.id);
        let parentId = agentThread.parentThreadId;
        const visited = new Set();
        while (parentId && String(parentId) !== String(thread?.id) && !visited.has(parentId)) {
          visited.add(parentId);
          currentId = String(parentId);
          parentId = agentParents.get(String(parentId));
        }
        return currentId;
      };
      const parentTurns = (Array.isArray(detailedThread?.turns) ? detailedThread.turns : []).filter(
        (turn) => typeof turn?.id === 'string',
      );
      const supervisorTurnId = (agentThread) => {
        const directTurnId = directAgentTurnIds.get(rootAgentId(agentThread));
        if (directTurnId) return directTurnId;
        if (typeof agentThread.createdAt !== 'number') return undefined;
        return [...parentTurns]
          .filter(
            (turn) => typeof turn.startedAt === 'number' && turn.startedAt <= agentThread.createdAt,
          )
          .sort((left, right) => Number(right.startedAt) - Number(left.startedAt))[0]?.id;
      };
      const records = await this.readRecords();
      const queued = records.filter((record) => record.status === 'queued');
      const selectedQueued = queued.filter(
        (record) => !record.threadId || String(record.threadId) === String(thread?.id || ''),
      );
      return {
        status: 'ready',
        detail: thread
          ? 'Connected to the local Codex conversation.'
          : 'Codex is connected, but no Studio conversation is available yet.',
        account: accountResult.account
          ? {
              type: String(accountResult.account.type || ''),
              planType: String(accountResult.account.planType || ''),
            }
          : undefined,
        thread: detailedThread
          ? publicThread(detailedThread, {
              discardable:
                this.startedThreads.has(String(detailedThread.id)) ||
                (!detailedThread.name &&
                  !detailedThread.preview &&
                  !hasConversationContent(detailedThread)),
            })
          : undefined,
        threads: threadCandidates.map((candidate) =>
          String(candidate.id) === String(thread?.id)
            ? publicThread(detailedThread || candidate, {
                discardable:
                  this.startedThreads.has(String(candidate.id)) ||
                  (!candidate.name &&
                    !candidate.preview &&
                    !hasConversationContent(detailedThread)),
              })
            : publicThread(candidate, {
                discardable:
                  this.startedThreads.has(String(candidate.id)) ||
                  (!candidate.name && !candidate.preview),
              }),
        ),
        messages: messagesWithFeedbackRecords(threadDetail?.thread, records, thread?.id),
        agents: agentThreads.map((agentThread, index) =>
          publicAgent(
            agentThread,
            agentDetails[index],
            agentStates.get(String(agentThread.id)),
            agentDepth(agentThread),
            supervisorTurnId(agentThread),
          ),
        ),
        models,
        queuedCount: selectedQueued.length,
        interruptingCount: selectedQueued.filter((record) => record.deliveryMode === 'interrupt')
          .length,
        queuedMessages: selectedQueued.map((record, index) => ({
          id: record.id,
          prompt: record.prompt,
          model: record.model,
          effort: record.effort,
          serviceTier: record.serviceTier || 'default',
          deliveryMode: record.deliveryMode || 'queue',
          createdAt: record.createdAt,
          position: index + 1,
          attachmentIds: recordAttachmentIds(record),
          attachmentId: recordAttachmentIds(record)[0],
          workMode: record.workMode === 'team' ? 'team' : 'direct',
        })),
      };
    } finally {
      client.close();
    }
  }

  async enqueue(input) {
    const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
    if (!prompt || prompt.length > maximumPromptLength) {
      throw new Error('Add a prompt between 1 and 4,000 characters.');
    }
    const model = typeof input.model === 'string' ? input.model.trim() : '';
    const effort = typeof input.effort === 'string' ? input.effort.trim() : '';
    if (!/^[A-Za-z0-9._-]{1,100}$/.test(model) || !/^[A-Za-z0-9_-]{1,30}$/.test(effort)) {
      throw new Error('Choose an available Codex model and reasoning level.');
    }
    const screenshotInputs =
      input.screenshots ?? (input.screenshot === undefined ? [] : [input.screenshot]);
    if (!Array.isArray(screenshotInputs) || screenshotInputs.length > maximumImageAttachments) {
      throw new Error(`Attach no more than ${maximumImageAttachments} images to one message.`);
    }
    const screenshots = screenshotInputs.map(parseScreenshot).filter(Boolean);
    const workMode = input.workMode === 'team' ? 'team' : 'direct';
    const threadId =
      typeof input.threadId === 'string' && /^[A-Za-z0-9-]{1,100}$/.test(input.threadId)
        ? input.threadId
        : undefined;
    await mkdir(this.storageRoot, { recursive: true, mode: 0o700 });
    const id = randomUUID();
    const attachments = screenshots.map((screenshot) => {
      const attachmentId = randomUUID();
      return {
        id: attachmentId,
        mimeType: screenshot.mimeType,
        path: resolve(this.storageRoot, `${attachmentId}${screenshot.extension}`),
        screenshot,
      };
    });
    const recordPath = resolve(this.storageRoot, `${id}.json`);
    await Promise.all(
      attachments.map((attachment) =>
        writeFile(attachment.path, attachment.screenshot.data, { mode: 0o600 }),
      ),
    );
    const record = {
      id,
      status: 'queued',
      prompt,
      model,
      effort,
      serviceTier: input.serviceTier === 'priority' ? 'priority' : 'default',
      workMode,
      deliveryMode: 'queue',
      attachments: attachments.map((attachment) => ({
        id: attachment.id,
        mimeType: attachment.mimeType,
      })),
      context:
        typeof input.context === 'string'
          ? input.context.replace(/[\r\n]+/g, ' ').slice(0, 1_000)
          : '',
      threadId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await atomicWriteJson(recordPath, record);
    await this.flush();
    const savedRecord = (await this.readRecords()).find((candidate) => candidate.id === id);
    const accepted = ['running', 'completed', 'delivered'].includes(savedRecord?.status);
    return {
      status: accepted ? 'accepted' : 'queued',
      id,
      detail: accepted
        ? 'Codex started this request in the selected conversation.'
        : attachments.length
          ? 'Visual feedback is queued for the selected Codex conversation.'
          : 'Your message is queued for the selected Codex conversation.',
    };
  }

  async createThread(input) {
    const model = typeof input.model === 'string' ? input.model.trim() : '';
    const effort = typeof input.effort === 'string' ? input.effort.trim() : '';
    if (!/^[A-Za-z0-9._-]{1,100}$/.test(model) || !/^[A-Za-z0-9_-]{1,30}$/.test(effort)) {
      throw new Error('Choose an available Codex model and reasoning level.');
    }
    const client = await this.connect();
    try {
      const modelResult = await client.request('model/list', {
        limit: 100,
        includeHidden: false,
      });
      const availableModel = (modelResult.data || [])
        .map(publicModel)
        .find((candidate) => candidate.id === model);
      if (!availableModel) throw new Error('The selected Codex model is unavailable.');
      if (
        availableModel.efforts.length &&
        !availableModel.efforts.some((candidate) => candidate.id === effort)
      ) {
        throw new Error('The selected reasoning level is unavailable for this model.');
      }
      const serviceTier = selectedServiceTier(input, availableModel);
      const result = await client.request('thread/start', {
        cwd: this.cwd,
        ...railwayContainerThreadSettings(this.runtimeWorkspaceRoots),
        model,
        serviceTier,
        config: { model_reasoning_effort: effort },
        ephemeral: false,
        sessionStartSource: 'clear',
      });
      if (!result.thread?.id) throw new Error('Codex did not return a new conversation.');
      this.startedThreads.set(String(result.thread.id), result.thread);
      while (this.startedThreads.size > 10) {
        this.startedThreads.delete(this.startedThreads.keys().next().value);
      }
      return {
        status: 'ready',
        detail: 'New Codex conversation created.',
        thread: publicThread(result.thread, { discardable: true }),
      };
    } finally {
      client.close();
    }
  }

  async continueInterruptedThread(input) {
    const threadId = typeof input.threadId === 'string' ? input.threadId.trim() : '';
    const model = typeof input.model === 'string' ? input.model.trim() : '';
    const effort = typeof input.effort === 'string' ? input.effort.trim() : '';
    if (!/^[A-Za-z0-9-]{1,100}$/.test(threadId)) {
      throw new Error('Choose a valid interrupted conversation.');
    }
    if (!/^[A-Za-z0-9._-]{1,100}$/.test(model) || !/^[A-Za-z0-9_-]{1,30}$/.test(effort)) {
      throw new Error('Choose an available Codex model and reasoning level.');
    }
    const client = await this.connect();
    try {
      const [modelResult, threadResult] = await Promise.all([
        client.request('model/list', { limit: 100, includeHidden: false }),
        client.request('thread/read', { threadId, includeTurns: true }),
      ]);
      const availableModel = (modelResult.data || [])
        .map(publicModel)
        .find((candidate) => candidate.id === model);
      if (!availableModel) throw new Error('The selected Codex model is unavailable.');
      if (
        availableModel.efforts.length &&
        !availableModel.efforts.some((candidate) => candidate.id === effort)
      ) {
        throw new Error('The selected reasoning level is unavailable for this model.');
      }
      const serviceTier = selectedServiceTier(input, availableModel);
      const thread = threadResult.thread;
      if (thread?.status?.type === 'active') {
        throw new Error('This conversation is already working.');
      }
      const lastTurn = [...(Array.isArray(thread?.turns) ? thread.turns : [])]
        .reverse()
        .find((turn) => typeof turn?.id === 'string');
      if (lastTurn?.status !== 'interrupted') {
        throw new Error('This conversation no longer has interrupted work to continue.');
      }
      if (thread?.status?.type === 'notLoaded') {
        await client.request('thread/resume', {
          threadId,
          ...railwayContainerThreadSettings(this.runtimeWorkspaceRoots),
        });
      }
      let agentThreads = [];
      try {
        const descendants = await client.request('thread/list', {
          limit: maximumAgentThreads,
          ancestorThreadId: threadId,
          sortKey: 'created_at',
          sortDirection: 'asc',
          sourceKinds: [
            'subAgent',
            'subAgentReview',
            'subAgentCompact',
            'subAgentThreadSpawn',
            'subAgentOther',
          ],
        });
        agentThreads = Array.isArray(descendants.data)
          ? descendants.data.slice(0, maximumAgentThreads)
          : [];
      } catch {
        // Parent-only continuation remains available with older app-server builds.
      }
      const agentDetails = await Promise.all(
        agentThreads.map(async (agentThread) => {
          try {
            return await client.request('thread/read', {
              threadId: agentThread.id,
              includeTurns: true,
            });
          } catch {
            return { thread: agentThread };
          }
        }),
      );
      const agentStates = collabAgentStates([
        thread,
        ...agentDetails.map((detail) => detail?.thread),
      ]);
      const interruptedAgents = agentThreads
        .map((agentThread, index) => ({
          thread: agentThread,
          detail: agentDetails[index],
          public: publicAgent(
            agentThread,
            agentDetails[index],
            agentStates.get(String(agentThread.id)),
            0,
          ),
        }))
        .filter((agent) => agent.public.status === 'interrupted');
      const resumeRequestedAgents = interruptedAgents.map((agent) => ({
        id: agent.public.id,
        name: agent.public.role || agent.public.name || agent.public.nickname || 'Attached agent',
      }));
      const teamContinuation = supervisorAgentRecoveryInstruction(resumeRequestedAgents);
      const result = await client.request('turn/start', {
        threadId,
        input: [
          {
            type: 'text',
            text: `The previous turn was interrupted when the Codespace paused. Continue the original request from the saved work and transcript. Inspect the current shared workspace first, preserve existing changes, finish the remaining implementation and verification, and report the final result.${teamContinuation}\n\n${progressUpdateInstruction}`,
          },
        ],
        cwd: this.cwd,
        ...railwayContainerTurnSettings(this.runtimeWorkspaceRoots),
        model,
        effort,
        serviceTier,
      });
      const records = await this.readRecords();
      const interruptedRecord = [...records]
        .reverse()
        .find(
          (record) => String(record.threadId || '') === threadId && record.status === 'interrupted',
        );
      if (interruptedRecord) {
        await this.updateRecordStatus(interruptedRecord, 'running', {
          turnId: typeof result.turn?.id === 'string' ? result.turn.id : interruptedRecord.turnId,
          recoveryCount: Number(interruptedRecord.recoveryCount || 0) + 1,
          recoveredAt: new Date().toISOString(),
          agentRecoveryTurnId:
            resumeRequestedAgents.length && typeof result.turn?.id === 'string'
              ? result.turn.id
              : undefined,
          agentRecoveryThreadIds: resumeRequestedAgents.map((agent) => agent.id),
        });
      }
      return {
        status: 'accepted',
        detail: resumeRequestedAgents.length
          ? `Codex resumed the supervisor with instructions to restart ${resumeRequestedAgents.length} interrupted attached agent${resumeRequestedAgents.length === 1 ? '' : 's'} from saved sub-chats.`
          : 'Codex resumed the interrupted conversation from its saved transcript.',
        turnId: typeof result.turn?.id === 'string' ? result.turn.id : undefined,
        resumeRequestedAgents,
        resumedAgents: resumeRequestedAgents,
        agentResumeFailures: [],
      };
    } finally {
      client.close();
    }
  }

  async interruptActiveTurn(threadId) {
    const client = await this.connect();
    try {
      const threadResult = await client.request('thread/list', {
        limit: 50,
        cwd: this.cwd,
        sortKey: 'updated_at',
      });
      const threadCandidates = Array.isArray(threadResult.data) ? threadResult.data : [];
      const thread = threadId
        ? threadCandidates.find((candidate) => String(candidate.id) === String(threadId))
        : selectThread(threadCandidates, this.cwd);
      if (!thread) return false;
      const threadDetail = await client.request('thread/read', {
        threadId: thread.id,
        includeTurns: true,
      });
      const turn = activeTurn(threadDetail?.thread);
      if (!turn) return false;
      await client.request('turn/interrupt', { threadId: thread.id, turnId: turn.id });
      return true;
    } finally {
      client.close();
    }
  }

  async updateQueued(id, input) {
    const record = await this.queuedRecord(id);
    const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
    if (!prompt || prompt.length > maximumPromptLength) {
      throw new Error('Add a prompt between 1 and 4,000 characters.');
    }
    await atomicWriteJson(resolve(this.storageRoot, `${record.id}.json`), {
      ...record,
      prompt,
      updatedAt: new Date().toISOString(),
    });
    return { status: 'queued', id: record.id, detail: 'Queued message updated.' };
  }

  async interruptQueued(id) {
    const record = await this.queuedRecord(id);
    const queued = await this.readRecords('queued');
    await Promise.all(
      queued
        .filter((candidate) => String(candidate.threadId || '') === String(record.threadId || ''))
        .map((candidate) =>
          atomicWriteJson(resolve(this.storageRoot, `${candidate.id}.json`), {
            ...candidate,
            deliveryMode: candidate.id === record.id ? 'interrupt' : 'queue',
            updatedAt: new Date().toISOString(),
          }),
        ),
    );
    const interrupted = await this.interruptActiveTurn(record.threadId);
    if (interrupted) {
      const activeRecords = (await this.readRecords()).filter(
        (candidate) =>
          ['running', 'recovering'].includes(candidate.status) &&
          String(candidate.threadId || '') === String(record.threadId || ''),
      );
      await Promise.all(
        activeRecords.map((candidate) =>
          this.updateRecordStatus(candidate, 'interrupted', {
            interruptedAt: new Date().toISOString(),
            supersededBy: record.id,
          }),
        ),
      );
    }
    void this.flush();
    return {
      status: 'queued',
      id: record.id,
      detail: interrupted
        ? 'The active Codex turn is stopping and this queued message is next.'
        : 'No active turn remained; the queued message is being sent.',
    };
  }

  async queuedRecord(id) {
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) {
      throw new Error('Choose a valid queued message.');
    }
    const records = await this.readRecords('queued');
    const record = records.find((candidate) => candidate.id === id);
    if (!record) throw new Error('That message is no longer queued.');
    return record;
  }

  async deleteEmptyThread(threadId) {
    if (typeof threadId !== 'string' || !/^[A-Za-z0-9-]{1,100}$/.test(threadId)) {
      throw new Error('Choose a valid empty conversation.');
    }
    const queued = await this.readRecords('queued');
    if (queued.some((record) => String(record.threadId || '') === threadId)) {
      return { status: 'retained', deleted: false, detail: 'The conversation has queued work.' };
    }
    const client = await this.connect();
    try {
      let result;
      try {
        result = await client.request('thread/read', { threadId, includeTurns: true });
      } catch (error) {
        const startedThread = this.startedThreads.get(threadId);
        const detail = error instanceof Error ? error.message : '';
        if (!startedThread || !/not materialized|includeTurns/i.test(detail)) throw error;
        result = { thread: startedThread };
      }
      if (result.thread?.status?.type === 'active' || hasConversationContent(result.thread)) {
        return {
          status: 'retained',
          deleted: false,
          detail: 'The conversation contains work and was retained.',
        };
      }
      await client.request('thread/delete', { threadId });
      this.startedThreads.delete(threadId);
      return { status: 'deleted', deleted: true, detail: 'Unused conversation removed.' };
    } finally {
      client.close();
    }
  }

  async attachment(id) {
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) {
      throw new Error('Choose a valid screenshot attachment.');
    }
    const attachment = (await this.readRecords())
      .flatMap((record) => recordImageAttachments(record, this.storageRoot))
      .find((candidate) => candidate.id === id);
    if (!attachment) throw new Error('That screenshot attachment is unavailable.');
    return {
      data: await readFile(attachment.path),
      mimeType: attachment.mimeType,
    };
  }

  async readRecords(status) {
    await mkdir(this.storageRoot, { recursive: true, mode: 0o700 });
    const files = await readdir(this.storageRoot);
    const records = await Promise.all(
      files
        .filter((file) => extname(file) === '.json')
        .map(async (file) => {
          try {
            return JSON.parse(await readFile(resolve(this.storageRoot, file), 'utf8'));
          } catch {
            return undefined;
          }
        }),
    );
    return records
      .filter((record) => record && (!status || record.status === status))
      .sort((first, second) => {
        if (status === 'queued' && first.deliveryMode !== second.deliveryMode) {
          return first.deliveryMode === 'interrupt' ? -1 : 1;
        }
        return String(first.createdAt).localeCompare(String(second.createdAt));
      });
  }

  scheduleFlush(delay = 0) {
    if (this.flushRetryTimer) {
      if (delay > 0) return;
      clearTimeout(this.flushRetryTimer);
    }
    this.flushRetryTimer = setTimeout(() => {
      this.flushRetryTimer = undefined;
      void this.flush();
    }, delay);
    this.flushRetryTimer.unref?.();
  }

  async flush() {
    this.flushRequested = true;
    if (this.flushPromise) return this.flushPromise;
    this.flushPromise = this.runFlush();
    try {
      await this.flushPromise;
    } finally {
      this.flushPromise = undefined;
      const queued = await this.readRecords('queued').catch(() => []);
      if (queued.length) this.scheduleFlush(1_000);
    }
  }

  async runFlush() {
    do {
      this.flushRequested = false;
      const queued = await this.readRecords('queued');
      for (const record of queued) {
        const client = await this.connect().catch(() => undefined);
        if (!client) return;
        try {
          const [modelResult, threadResult] = await Promise.all([
            client.request('model/list', { limit: 100, includeHidden: false }),
            client.request('thread/list', { limit: 50, cwd: this.cwd, sortKey: 'updated_at' }),
          ]);
          const availableModel = (modelResult.data || [])
            .map(publicModel)
            .find(
              (model) =>
                model.id === record.model &&
                (!recordAttachmentIds(record).length || model.supportsImages),
            );
          if (!availableModel) {
            await this.markFailed(
              record,
              recordAttachmentIds(record).length
                ? 'The selected Codex model no longer accepts images.'
                : 'The selected Codex model is no longer available.',
            );
            continue;
          }
          const supportedEfforts = availableModel.efforts.map((effort) => effort.id);
          if (supportedEfforts.length && !supportedEfforts.includes(record.effort)) {
            await this.markFailed(
              record,
              'The selected reasoning level is unavailable for this model.',
            );
            continue;
          }
          const threadCandidates = Array.isArray(threadResult.data) ? threadResult.data : [];
          let thread = record.threadId
            ? threadCandidates.find(
                (candidate) => String(candidate.id) === String(record.threadId),
              ) || this.startedThreads.get(String(record.threadId))
            : selectThread(threadCandidates, this.cwd);
          if (!thread && record.threadId) {
            try {
              const directThread = await client.request('thread/read', {
                threadId: record.threadId,
                includeTurns: true,
              });
              thread = directThread?.thread;
            } catch {
              // The durable queue remains private and retries after the thread is available.
            }
          }
          if (!thread) continue;
          if (thread.status?.type === 'active') continue;
          if (thread.status?.type === 'notLoaded') {
            await client.request('thread/resume', {
              threadId: thread.id,
              ...railwayContainerThreadSettings(this.runtimeWorkspaceRoots),
            });
            const resumedThread = await client.request('thread/read', {
              threadId: thread.id,
              includeTurns: true,
            });
            thread = resumedThread?.thread || thread;
          }
          if (thread.status?.type === 'active' || activeTurn(thread)) continue;
          try {
            const imageAttachments = recordImageAttachments(record, this.storageRoot);
            const turnResult = await client.request('turn/start', {
              threadId: thread.id,
              input: [
                {
                  type: 'text',
                  text: `${
                    record.context
                      ? `${record.prompt}\n\nCaptured from: ${record.context}${
                          record.workMode === 'team' ? `\n\n${teamDelegationInstruction}` : ''
                        }`
                      : `${record.prompt}${
                          record.workMode === 'team' ? `\n\n${teamDelegationInstruction}` : ''
                        }`
                  }\n\n${progressUpdateInstruction}`,
                },
                ...imageAttachments.map((attachment) => ({
                  type: 'localImage',
                  path: attachment.path,
                })),
              ],
              cwd: this.cwd,
              ...railwayContainerTurnSettings(this.runtimeWorkspaceRoots),
              model: record.model,
              effort: record.effort,
              serviceTier: record.serviceTier || 'default',
            });
            await atomicWriteJson(resolve(this.storageRoot, `${record.id}.json`), {
              ...record,
              status: 'running',
              threadId: String(thread.id),
              turnId: typeof turnResult?.turn?.id === 'string' ? turnResult.turn.id : undefined,
              startedAt: new Date().toISOString(),
              deliveredAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          } catch (error) {
            if (
              /active|running|in progress|turn/i.test(error instanceof Error ? error.message : '')
            )
              continue;
            throw error;
          }
        } catch (error) {
          await this.markFailed(
            record,
            error instanceof Error ? error.message : 'Codex could not accept this feedback.',
          );
        } finally {
          client.close();
        }
      }
    } while (this.flushRequested);
  }

  async maintain() {
    if (this.maintenancePromise) return this.maintenancePromise;
    this.maintenancePromise = this.runMaintenance();
    try {
      await this.maintenancePromise;
    } finally {
      this.maintenancePromise = undefined;
    }
  }

  async interruptedAgentsForSupervisor(client, { threadId }) {
    let agentThreads;
    try {
      const descendants = await client.request('thread/list', {
        limit: maximumAgentThreads,
        ancestorThreadId: threadId,
        sortKey: 'created_at',
        sortDirection: 'asc',
        sourceKinds: [
          'subAgent',
          'subAgentReview',
          'subAgentCompact',
          'subAgentThreadSpawn',
          'subAgentOther',
        ],
      });
      agentThreads = Array.isArray(descendants.data)
        ? descendants.data.slice(0, maximumAgentThreads)
        : [];
    } catch {
      return { agents: [], inspectionFailures: [] };
    }

    const agents = [];
    const inspectionFailures = [];
    for (const listedAgent of agentThreads) {
      let detail;
      try {
        detail = await client.request('thread/read', {
          threadId: listedAgent.id,
          includeTurns: true,
        });
      } catch (error) {
        inspectionFailures.push({
          id: String(listedAgent.id),
          detail: error instanceof Error ? error.message : 'The attached agent could not be read.',
        });
        continue;
      }
      const agent = detail?.thread ? { ...listedAgent, ...detail.thread } : listedAgent;
      const interruptedTurn = lastTurn(agent);
      if (
        agent.status?.type === 'active' ||
        activeTurn(agent) ||
        interruptedTurn?.status !== 'interrupted'
      ) {
        continue;
      }
      agents.push({
        id: String(agent.id),
        name: agent.agentRole || agent.name || agent.agentNickname || 'Attached agent',
      });
    }
    return { agents, inspectionFailures };
  }

  async runMaintenance() {
    const records = await this.readRecords();
    const running = records.filter((record) => ['running', 'recovering'].includes(record.status));
    if (!running.length) {
      await this.flush();
      return;
    }
    const queued = records.filter((record) => record.status === 'queued');
    const client = await this.connect().catch(() => undefined);
    if (!client) return;
    try {
      for (const record of running) {
        try {
          if (!record.threadId) continue;
          const detail = await client.request('thread/read', {
            threadId: record.threadId,
            includeTurns: true,
          });
          let detailedThread = detail?.thread;
          if (!detailedThread?.id) continue;
          if (detailedThread.status?.type === 'notLoaded') {
            await client.request('thread/resume', {
              threadId: detailedThread.id,
              ...railwayContainerThreadSettings(this.runtimeWorkspaceRoots),
            });
            const resumedDetail = await client.request('thread/read', {
              threadId: detailedThread.id,
              includeTurns: true,
            });
            detailedThread = resumedDetail?.thread || detailedThread;
          }
          const turns = Array.isArray(detailedThread?.turns) ? detailedThread.turns : [];
          const trackedTurnIndex = record.turnId
            ? turns.findIndex((turn) => String(turn?.id) === String(record.turnId))
            : turns.length - 1;
          const trackedTurn = turns[trackedTurnIndex];
          if (!trackedTurn) continue;

          if (
            record.status === 'recovering' &&
            String(record.recoveryFromTurnId || '') === String(trackedTurn.id)
          ) {
            const laterTurn = turns
              .slice(trackedTurnIndex + 1)
              .findLast((turn) => typeof turn?.id === 'string');
            const liveTurn = activeTurn(detailedThread);
            const recoveredTurn =
              laterTurn || (liveTurn?.id !== trackedTurn.id ? liveTurn : undefined);
            if (recoveredTurn) {
              await this.updateRecordStatus(record, 'running', {
                turnId: recoveredTurn.id,
                recoveredAt: new Date().toISOString(),
                recoveryFromTurnId: undefined,
                recoveryStartedAt: undefined,
              });
              continue;
            }
          }

          const hasQueuedFollowUp = queued.some(
            (candidate) => String(candidate.threadId || '') === String(record.threadId || ''),
          );
          if (hasQueuedFollowUp && trackedTurn.status !== 'inProgress') {
            await this.updateRecordStatus(record, 'interrupted', {
              interruptedAt: new Date().toISOString(),
            });
            continue;
          }

          const interruptedAgentResult =
            record.workMode === 'team' && !hasQueuedFollowUp
              ? await this.interruptedAgentsForSupervisor(client, {
                  threadId: detailedThread.id,
                })
              : { agents: [], inspectionFailures: [] };
          const teamRecoveryInstruction = supervisorAgentRecoveryInstruction(
            interruptedAgentResult.agents,
          );

          if (trackedTurn.status === 'inProgress') {
            const liveTurn = activeTurn(detailedThread);
            if (
              teamRecoveryInstruction &&
              liveTurn?.id &&
              String(record.agentRecoveryTurnId || '') !== String(liveTurn.id)
            ) {
              await client.request('turn/steer', {
                threadId: detailedThread.id,
                expectedTurnId: liveTurn.id,
                input: [{ type: 'text', text: teamRecoveryInstruction.trim() }],
              });
              await this.updateRecordStatus(record, 'running', {
                agentRecoveryTurnId: liveTurn.id,
                agentRecoveryThreadIds: interruptedAgentResult.agents.map((agent) => agent.id),
                agentRecoveryRequestedAt: new Date().toISOString(),
              });
            }
            continue;
          }
          if (trackedTurn.status === 'completed') {
            await this.updateRecordStatus(record, 'completed', {
              completedAt: new Date().toISOString(),
            });
            continue;
          }
          if (trackedTurn.status !== 'interrupted') {
            await this.markFailed(record, `Codex turn ended with status ${trackedTurn.status}.`);
            continue;
          }

          await this.updateRecordStatus(record, 'recovering', {
            recoveryFromTurnId: trackedTurn.id,
            recoveryStartedAt: new Date().toISOString(),
          });
          const recoveryResult = await client.request('turn/start', {
            threadId: detailedThread.id,
            input: [
              {
                type: 'text',
                text: `The Codespace paused while this turn was still running. Continue the same request from the saved transcript and current workspace. Preserve existing changes, finish the remaining implementation and verification, and report the final result.${teamRecoveryInstruction}\n\n${progressUpdateInstruction}`,
              },
            ],
            cwd: this.cwd,
            ...railwayContainerTurnSettings(this.runtimeWorkspaceRoots),
            model: record.model,
            effort: record.effort,
            serviceTier: record.serviceTier || 'default',
          });
          await this.updateRecordStatus(record, 'running', {
            turnId:
              typeof recoveryResult?.turn?.id === 'string' ? recoveryResult.turn.id : record.turnId,
            recoveryCount: Number(record.recoveryCount || 0) + 1,
            recoveredAt: new Date().toISOString(),
            recoveryFromTurnId: undefined,
            recoveryStartedAt: undefined,
            agentRecoveryTurnId:
              interruptedAgentResult.agents.length && typeof recoveryResult?.turn?.id === 'string'
                ? recoveryResult.turn.id
                : undefined,
            agentRecoveryThreadIds: interruptedAgentResult.agents.map((agent) => agent.id),
            agentRecoveryRequestedAt: interruptedAgentResult.agents.length
              ? new Date().toISOString()
              : undefined,
          });
        } catch {
          // A transport or app-server restart leaves the durable record recoverable next cycle.
        }
      }
    } finally {
      client.close();
    }
    await this.flush();
  }

  async updateRecordStatus(record, status, fields = {}) {
    await atomicWriteJson(resolve(this.storageRoot, `${record.id}.json`), {
      ...record,
      ...fields,
      status,
      updatedAt: new Date().toISOString(),
    });
  }

  async markFailed(record, detail) {
    await atomicWriteJson(resolve(this.storageRoot, `${record.id}.json`), {
      ...record,
      status: 'failed',
      failure: String(detail).slice(0, 500),
      updatedAt: new Date().toISOString(),
    });
  }
}
