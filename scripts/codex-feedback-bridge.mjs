import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const defaultServerUrl = 'ws://127.0.0.1:4500';
const maximumImageBytes = 15 * 1024 * 1024;
const maximumPromptLength = 4_000;
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
  return {
    id: String(model.id || model.model || ''),
    label: String(model.displayName || model.id || model.model || 'Codex model'),
    defaultEffort: String(model.defaultReasoningEffort || supportedEfforts[0]?.id || 'medium'),
    efforts: supportedEfforts,
    supportsImages: modalities.includes('image'),
    isDefault: model.isDefault === true,
  };
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
    activeFlags,
    updatedAt: typeof thread.updatedAt === 'number' ? thread.updatedAt : undefined,
    workingStartedAt: typeof turn?.startedAt === 'number' ? turn.startedAt : undefined,
    lastTurnStatus: typeof lastTurn?.status === 'string' ? lastTurn.status : undefined,
    interrupted: lastTurn?.status === 'interrupted',
    discardable,
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
          });
      } else if (item.type === 'agentMessage' && typeof item.text === 'string') {
        const text = item.text.trim();
        if (text)
          messages.push({
            id: String(item.id || randomUUID()),
            role: 'assistant',
            text: text.slice(0, 12_000),
            phase: typeof item.phase === 'string' ? item.phase : undefined,
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
      ['running', 'completed', 'interrupted', 'delivered'].includes(record.status) &&
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
            message.text.startsWith(`${candidate.prompt}\n\nCaptured from:`)),
      );
    if (!record) continue;
    used.add(record.id);
    message.text = record.prompt;
    message.feedbackId = record.id;
    if (record.imagePath) message.attachmentId = record.id;
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
      const requestedThread = threadCandidates.find(
        (candidate) => String(candidate.id) === String(threadId || ''),
      );
      const thread = requestedThread || selectThread(threadCandidates, this.cwd);
      let threadDetail;
      if (thread) {
        try {
          threadDetail = await client.request('thread/read', {
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
        models,
        queuedCount: selectedQueued.length,
        interruptingCount: selectedQueued.filter((record) => record.deliveryMode === 'interrupt')
          .length,
        queuedMessages: selectedQueued.map((record, index) => ({
          id: record.id,
          prompt: record.prompt,
          model: record.model,
          effort: record.effort,
          deliveryMode: record.deliveryMode || 'queue',
          createdAt: record.createdAt,
          position: index + 1,
          attachmentId: record.imagePath ? record.id : undefined,
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
    const screenshot = parseScreenshot(input.screenshot);
    const threadId =
      typeof input.threadId === 'string' && /^[A-Za-z0-9-]{1,100}$/.test(input.threadId)
        ? input.threadId
        : undefined;
    await mkdir(this.storageRoot, { recursive: true, mode: 0o700 });
    const id = randomUUID();
    const imagePath = screenshot
      ? resolve(this.storageRoot, `${id}${screenshot.extension}`)
      : undefined;
    const recordPath = resolve(this.storageRoot, `${id}.json`);
    if (imagePath && screenshot) await writeFile(imagePath, screenshot.data, { mode: 0o600 });
    const record = {
      id,
      status: 'queued',
      prompt,
      model,
      effort,
      deliveryMode: 'queue',
      imagePath,
      mimeType: screenshot?.mimeType,
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
        : screenshot
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
      const result = await client.request('thread/start', {
        cwd: this.cwd,
        runtimeWorkspaceRoots: this.runtimeWorkspaceRoots,
        model,
        sandbox: 'danger-full-access',
        approvalPolicy: 'never',
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
          runtimeWorkspaceRoots: this.runtimeWorkspaceRoots,
        });
      }
      const result = await client.request('turn/start', {
        threadId,
        input: [
          {
            type: 'text',
            text: 'The previous turn was interrupted when the Codespace paused. Continue the original request from the saved work and transcript. Inspect the current shared workspace first, preserve existing changes, finish the remaining implementation and verification, and report the final result.',
          },
        ],
        cwd: this.cwd,
        runtimeWorkspaceRoots: this.runtimeWorkspaceRoots,
        model,
        effort,
      });
      return {
        status: 'accepted',
        detail: 'Codex resumed the interrupted conversation from its saved transcript.',
        turnId: typeof result.turn?.id === 'string' ? result.turn.id : undefined,
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
    const record = (await this.readRecords()).find(
      (candidate) => candidate.id === id && candidate.imagePath && candidate.mimeType,
    );
    const extension = supportedImageTypes.get(record?.mimeType);
    if (!record || !extension) throw new Error('That screenshot attachment is unavailable.');
    return {
      data: await readFile(resolve(this.storageRoot, `${id}${extension}`)),
      mimeType: record.mimeType,
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
              (model) => model.id === record.model && (!record.imagePath || model.supportsImages),
            );
          if (!availableModel) {
            await this.markFailed(
              record,
              record.imagePath
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
          const thread = record.threadId
            ? threadCandidates.find(
                (candidate) => String(candidate.id) === String(record.threadId),
              ) || this.startedThreads.get(String(record.threadId))
            : selectThread(threadCandidates, this.cwd);
          if (!thread) continue;
          if (thread.status?.type === 'active') continue;
          if (thread.status?.type === 'notLoaded') {
            await client.request('thread/resume', {
              threadId: thread.id,
              runtimeWorkspaceRoots: this.runtimeWorkspaceRoots,
            });
          }
          try {
            const turnResult = await client.request('turn/start', {
              threadId: thread.id,
              input: [
                {
                  type: 'text',
                  text: record.context
                    ? `${record.prompt}\n\nCaptured from: ${record.context}`
                    : record.prompt,
                },
                ...(record.imagePath ? [{ type: 'localImage', path: record.imagePath }] : []),
              ],
              cwd: this.cwd,
              runtimeWorkspaceRoots: this.runtimeWorkspaceRoots,
              model: record.model,
              effort: record.effort,
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

  async runMaintenance() {
    await this.flush();
    const records = await this.readRecords();
    const running = records.filter((record) => record.status === 'running');
    if (!running.length) return;
    const queued = records.filter((record) => record.status === 'queued');
    const client = await this.connect().catch(() => undefined);
    if (!client) return;
    try {
      const threadResult = await client.request('thread/list', {
        limit: 100,
        cwd: this.cwd,
        sortKey: 'updated_at',
      });
      const threads = Array.isArray(threadResult.data) ? threadResult.data : [];
      for (const record of running) {
        const thread = threads.find(
          (candidate) => String(candidate.id) === String(record.threadId || ''),
        );
        if (!thread) continue;
        let detail;
        try {
          detail = await client.request('thread/read', {
            threadId: thread.id,
            includeTurns: true,
          });
        } catch {
          continue;
        }
        const turns = Array.isArray(detail?.thread?.turns) ? detail.thread.turns : [];
        const trackedTurn = record.turnId
          ? turns.find((turn) => String(turn?.id) === String(record.turnId))
          : turns.at(-1);
        if (!trackedTurn || trackedTurn.status === 'inProgress') continue;
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
        const hasQueuedFollowUp = queued.some(
          (candidate) => String(candidate.threadId || '') === String(record.threadId || ''),
        );
        if (hasQueuedFollowUp) {
          await this.updateRecordStatus(record, 'interrupted', {
            interruptedAt: new Date().toISOString(),
          });
          continue;
        }
        if (Number(record.recoveryCount || 0) >= 1) {
          await this.updateRecordStatus(record, 'interrupted', {
            interruptedAt: new Date().toISOString(),
          });
          continue;
        }
        if (thread.status?.type === 'notLoaded') {
          await client.request('thread/resume', {
            threadId: thread.id,
            runtimeWorkspaceRoots: this.runtimeWorkspaceRoots,
          });
        }
        const recoveryResult = await client.request('turn/start', {
          threadId: thread.id,
          input: [
            {
              type: 'text',
              text: 'The Codespace paused while this turn was still running. Continue the same request from the saved transcript and current workspace. Preserve existing changes, finish the remaining implementation and verification, and report the final result.',
            },
          ],
          cwd: this.cwd,
          runtimeWorkspaceRoots: this.runtimeWorkspaceRoots,
          model: record.model,
          effort: record.effort,
        });
        await this.updateRecordStatus(record, 'running', {
          turnId:
            typeof recoveryResult?.turn?.id === 'string' ? recoveryResult.turn.id : record.turnId,
          recoveryCount: Number(record.recoveryCount || 0) + 1,
          recoveredAt: new Date().toISOString(),
        });
      }
    } finally {
      client.close();
    }
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
