import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';

const defaultServerUrl = 'ws://127.0.0.1:4500';
const maximumImageBytes = 15 * 1024 * 1024;
const maximumImageAttachments = 5;
const maximumPromptLength = 4_000;
const maximumAgentThreads = 24;
const defaultThreadReadTimeoutMs = 2_500;
const teamDelegationInstruction =
  'Agent team is enabled for this request. You are the supervisor. Delegate useful independent workstreams to attached sub-agents with clear, non-overlapping assignments, run them concurrently when practical, monitor their outcomes, and synthesize the result in this parent conversation. Keep work that is trivial or inherently sequential in the parent agent.';
const progressUpdateInstruction =
  'During longer work, keep the user oriented with concise commentary at meaningful transitions: explain what you are checking, what you learned or changed, and what remains. When a website search, tool, file change, or check produces a meaningful verified result, include that result in the next commentary and explain how it affects the remaining work. Send an update before a long tool run. Do not narrate routine actions, repeat yourself, expose hidden reasoning, or claim unverified progress.';
const temporaryQuestionInstruction =
  'This is a temporary, read-only question about the quoted excerpt. Answer directly and concisely using only the excerpt and the question. Do not inspect files, browse, call tools, change workspace state, create tasks, or provide progress commentary. If the excerpt does not support an answer, say what is missing. Return only the answer.';
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

function publicRateLimitWindow(window) {
  const usedPercent = Number(window?.usedPercent);
  if (!Number.isFinite(usedPercent)) return undefined;
  const windowDurationMins = Number(window?.windowDurationMins);
  const resetsAt = Number(window?.resetsAt);
  return {
    usedPercent: Math.min(100, Math.max(0, Math.round(usedPercent))),
    windowDurationMins:
      Number.isFinite(windowDurationMins) && windowDurationMins > 0
        ? Math.round(windowDurationMins)
        : undefined,
    resetsAt: Number.isFinite(resetsAt) && resetsAt > 0 ? Math.round(resetsAt) : undefined,
  };
}

function publicSubscriptionUsage(snapshot) {
  const primary = publicRateLimitWindow(snapshot?.primary);
  const secondary = publicRateLimitWindow(snapshot?.secondary);
  if (!primary && !secondary) return undefined;
  return {
    primary,
    secondary,
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

function publicThread(thread, { discardable = false, scope = 'universal' } = {}) {
  const turn = activeTurn(thread);
  const hasTurnDetails = Array.isArray(thread?.turns);
  const lastTurn = [...(hasTurnDetails ? thread.turns : [])]
    .reverse()
    .find((candidate) => typeof candidate?.id === 'string');
  const working = Boolean(turn) || (!hasTurnDetails && thread.status?.type === 'active');
  const activeFlags =
    working && Array.isArray(thread.status?.activeFlags)
      ? thread.status.activeFlags.filter((flag) => typeof flag === 'string').slice(0, 8)
      : [];
  return {
    id: String(thread.id),
    name: typeof thread.name === 'string' ? thread.name : undefined,
    preview: typeof thread.preview === 'string' ? thread.preview.slice(0, 160) : undefined,
    status: String(thread.status?.type || 'unknown'),
    working,
    activeTurnId: typeof turn?.id === 'string' ? turn.id : undefined,
    activeFlags,
    updatedAt: typeof thread.updatedAt === 'number' ? thread.updatedAt : undefined,
    workingStartedAt: typeof turn?.startedAt === 'number' ? turn.startedAt : undefined,
    lastTurnStatus: typeof lastTurn?.status === 'string' ? lastTurn.status : undefined,
    interrupted: lastTurn?.status === 'interrupted',
    discardable,
    scope,
  };
}

function humanizeAgentPath(value) {
  const segment = String(value || '')
    .split('/')
    .filter(Boolean)
    .at(-1);
  if (!segment) return '';
  const label = segment.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return label ? `${label.charAt(0).toUpperCase()}${label.slice(1)}` : '';
}

function threadAgentPath(thread) {
  return (
    thread?.subAgent?.thread_spawn?.agent_path ||
    thread?.source?.subAgent?.thread_spawn?.agent_path ||
    thread?.source?.subagent?.thread_spawn?.agent_path ||
    thread?.agentPath ||
    thread?.agent_path
  );
}

function agentTask(thread, activity) {
  return humanizeAgentPath(activity?.agentPath || threadAgentPath(thread));
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

function collabAgentActivities(threads) {
  const activities = new Map();
  for (const thread of threads) {
    for (const turn of Array.isArray(thread?.turns) ? thread.turns : []) {
      if (typeof turn?.id !== 'string') continue;
      for (const item of Array.isArray(turn.items) ? turn.items : []) {
        if (item?.type !== 'subAgentActivity' || typeof item.agentThreadId !== 'string') continue;
        const threadId = String(item.agentThreadId);
        const next = {
          turnId: turn.id,
          agentPath: typeof item.agentPath === 'string' ? item.agentPath : undefined,
          kind: typeof item.kind === 'string' ? item.kind : undefined,
        };
        const current = activities.get(threadId);
        if (!current || (next.kind === 'started' && current.kind !== 'started')) {
          activities.set(threadId, next);
        }
      }
    }
  }
  return activities;
}

function collabAgentTurnIds(thread) {
  const turnIds = new Map();
  for (const turn of Array.isArray(thread?.turns) ? thread.turns : []) {
    if (typeof turn?.id !== 'string') continue;
    for (const item of Array.isArray(turn.items) ? turn.items : []) {
      if (item?.type === 'subAgentActivity' && typeof item.agentThreadId === 'string') {
        const threadId = String(item.agentThreadId);
        if (!turnIds.has(threadId) || item.kind === 'started') turnIds.set(threadId, turn.id);
        continue;
      }
      if (item?.type !== 'collabAgentToolCall' || !item.agentsStates) continue;
      for (const threadId of Object.keys(item.agentsStates)) {
        if (!turnIds.has(String(threadId))) turnIds.set(String(threadId), turn.id);
      }
    }
  }
  return turnIds;
}

function agentOwnedTurns(thread, inheritedTurnIds) {
  const turns = Array.isArray(thread?.turns) ? thread.turns : [];
  const createdAt = typeof thread?.createdAt === 'number' ? thread.createdAt : undefined;
  return turns.filter((turn) => {
    if (typeof turn?.id === 'string' && inheritedTurnIds?.has(turn.id)) return false;
    if (createdAt === undefined || typeof turn?.startedAt !== 'number') return true;
    return turn.startedAt >= createdAt;
  });
}

function publicAgent(thread, detail, state, depth, supervisorTurnId, activity, inheritedTurnIds) {
  const source = detail?.thread ? { ...thread, ...detail.thread } : thread;
  const ownedSource = { ...source, turns: agentOwnedTurns(source, inheritedTurnIds) };
  const turn = activeTurn(ownedSource);
  const lastTurn = [...ownedSource.turns]
    .reverse()
    .find((candidate) => typeof candidate?.id === 'string');
  const inferredStatus = turn
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
  const messages = publicMessages(ownedSource)
    .filter((message) => message.role === 'assistant')
    .slice(-6);
  const latestAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant')?.text;
  const status = turn
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
    task: agentTask(source, activity),
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

function* orderedThreadItems(thread) {
  let position = 0;
  for (const turn of Array.isArray(thread?.turns) ? thread.turns : []) {
    for (const item of Array.isArray(turn.items) ? turn.items : []) {
      yield { item, position, turn };
      position += 1;
    }
  }
}

function publicMessages(thread) {
  const messages = [];
  for (const { item, position, turn } of orderedThreadItems(thread)) {
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
          turnStatus: typeof turn.status === 'string' ? turn.status : undefined,
          position,
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
          turnStatus: typeof turn.status === 'string' ? turn.status : undefined,
          position,
        });
    }
  }
  return messages.slice(-60);
}

function publicActivityStatus(value) {
  if (value === 'inProgress' || value === 'running') return 'running';
  if (value === 'failed' || value === 'declined') return 'failed';
  return 'completed';
}

function publicActivityPath(value, workspaceRoots = []) {
  if (typeof value !== 'string') return '';
  const safeRelativePath = (candidate) => {
    const segments = candidate.split(/[\\/]+/).filter(Boolean);
    if (
      !segments.length ||
      segments.some(
        (segment) =>
          segment === '..' || /^\.env(?:\.|$)/i.test(segment) || !publicActivityText(segment, 80),
      )
    ) {
      return '';
    }
    return segments.join('/');
  };
  let publicValue = '';
  if (isAbsolute(value)) {
    const target = resolve(value);
    for (const root of workspaceRoots) {
      const candidate = relative(resolve(root), target);
      if (candidate && !candidate.startsWith('..') && !isAbsolute(candidate)) {
        publicValue = safeRelativePath(candidate);
        if (publicValue) break;
      }
    }
  } else {
    publicValue = safeRelativePath(value);
  }
  return publicValue.length > 180 ? `…${publicValue.slice(-179)}` : publicValue;
}

function humanizeActivityName(value) {
  const label = String(value || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return label ? `${label.charAt(0).toUpperCase()}${label.slice(1)}` : '';
}

function publicActivityText(value, maximumLength = 180) {
  if (typeof value !== 'string') return '';
  const text = value.replace(/\s+/g, ' ').trim();
  if (
    /(api[ _-]?key|access[ _-]?token|auth(?:orization)?|bearer|cookie|password|secret|session[ _-]?id)/i.test(
      text,
    ) ||
    /\b[A-Za-z0-9_-]{40,}\b/.test(text)
  ) {
    return '';
  }
  return text.slice(0, maximumLength);
}

function publicWebLocation(value) {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    const safeSegments = url.pathname
      .split('/')
      .filter(Boolean)
      .filter(
        (segment) =>
          segment.length <= 32 &&
          !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment) &&
          Boolean(publicActivityText(decodeURIComponent(segment), 32)),
      )
      .slice(0, 3);
    return `${url.hostname}${safeSegments.length ? `/${safeSegments.join('/')}` : ''}`.slice(
      0,
      180,
    );
  } catch {
    return '';
  }
}

function activityOutcome(status, { completed, failed, running }) {
  if (status === 'running') return running;
  if (status === 'failed') return failed;
  return completed;
}

function commandActivityOutcome(label, status, exitCode) {
  const subject =
    label === 'Running project checks'
      ? 'Project checks'
      : label === 'Building the project'
        ? 'The project build'
        : label === 'Reviewing workspace changes'
          ? 'The workspace change review'
          : label === 'Inspecting workspace files'
            ? 'The workspace inspection'
            : 'The local command';
  if (status === 'running')
    return `${subject} ${subject === 'Project checks' ? 'are' : 'is'} still running.`;
  if (status === 'failed') return `${subject} reported a failure.`;
  if (typeof exitCode === 'number' && exitCode !== 0) {
    return `${subject} finished with exit code ${exitCode}.`;
  }
  if (label === 'Running project checks') return 'Project checks completed successfully.';
  if (label === 'Building the project') return 'The project build completed successfully.';
  if (label === 'Reviewing workspace changes') return 'The workspace change review completed.';
  if (label === 'Inspecting workspace files') return 'The workspace inspection completed.';
  return 'The local command completed.';
}

function fileChangeActivityOutcome(changes, status) {
  if (status === 'running') return 'The scoped file update is being applied.';
  if (status === 'failed') return 'The scoped file update did not complete.';
  const counts = new Map();
  for (const change of changes) {
    const kind =
      typeof change?.kind === 'string'
        ? change.kind
        : typeof change?.kind?.type === 'string'
          ? change.kind.type
          : '';
    const label = /add|create/i.test(kind)
      ? 'added'
      : /delete|remove/i.test(kind)
        ? 'deleted'
        : /update|modify/i.test(kind)
          ? 'updated'
          : '';
    if (label) counts.set(label, (counts.get(label) || 0) + 1);
  }
  const summary = [...counts].map(([label, count]) => `${count} ${label}`).join(', ');
  const subject = changes.length
    ? `${changes.length} file ${changes.length === 1 ? 'change was' : 'changes were'} saved`
    : 'Workspace file changes were saved';
  return `${subject}${summary ? `: ${summary}` : ''}.`;
}

function commandActivityLabel(command) {
  const value = String(command || '').toLowerCase();
  if (/\b(playwright|axe|vitest|jest|test|lint|typecheck|type-check|verify)\b/.test(value)) {
    return 'Running project checks';
  }
  if (/\b(build|compile|vite build|tsc)\b/.test(value)) return 'Building the project';
  if (/\bgit\s+(status|diff|log)\b/.test(value)) return 'Reviewing workspace changes';
  if (/\b(rg|grep|find|sed|ls)\b/.test(value)) return 'Inspecting workspace files';
  return 'Running a local command';
}

function publicActivities(thread, workspaceRoots = []) {
  const activities = [];
  for (const { item, position, turn } of orderedThreadItems(thread)) {
    const id = String(item?.id || `${turn.id || 'turn'}-activity-${position + 1}`);
    const status =
      item?.type === 'dynamicToolCall' && item.success === false
        ? 'failed'
        : publicActivityStatus(item?.status);
    const createdAt =
      typeof item?.createdAt === 'number'
        ? item.createdAt
        : typeof item?.startedAt === 'number'
          ? item.startedAt
          : typeof turn.startedAt === 'number'
            ? turn.startedAt
            : undefined;
    if (item?.type === 'commandExecution') {
      const label = commandActivityLabel(item.command);
      activities.push({
        id,
        kind: 'command',
        label,
        detail: 'Working inside the approved Studio workspace.',
        status,
        outcome: commandActivityOutcome(label, status, item.exitCode),
        durationMs: typeof item.durationMs === 'number' ? item.durationMs : undefined,
        createdAt,
        turnId: typeof turn.id === 'string' ? turn.id : undefined,
        position,
      });
      continue;
    }
    if (item?.type === 'fileChange') {
      const changes = (Array.isArray(item.changes) ? item.changes : []).slice(0, 6);
      const paths = changes
        .map((change) => publicActivityPath(change?.path, workspaceRoots))
        .filter(Boolean);
      const fileAction =
        status === 'running' ? 'Updating' : status === 'failed' ? 'Could not update' : 'Updated';
      activities.push({
        id,
        kind: 'file',
        label: `${fileAction} ${changes.length || 'workspace'} ${changes.length === 1 ? 'file' : 'files'}`,
        detail: paths.length ? paths.join(' · ') : 'Applying a scoped workspace file change.',
        status,
        outcome: fileChangeActivityOutcome(changes, status),
        createdAt,
        turnId: typeof turn.id === 'string' ? turn.id : undefined,
        position,
      });
      continue;
    }
    if (item?.type === 'mcpToolCall') {
      const app = item.appContext?.appName || item.server;
      const tool = humanizeActivityName(item.appContext?.actionName || item.tool).slice(0, 120);
      activities.push({
        id,
        kind: 'tool',
        label: app ? `Using ${String(app).slice(0, 80)}` : 'Using a connected tool',
        detail: tool || 'Running a connected workspace action.',
        status,
        outcome: activityOutcome(status, {
          completed: 'The connected action completed.',
          failed: 'The connected action reported a failure.',
          running: 'The connected action is still running.',
        }),
        createdAt,
        turnId: typeof turn.id === 'string' ? turn.id : undefined,
        position,
      });
      continue;
    }
    if (item?.type === 'dynamicToolCall') {
      activities.push({
        id,
        kind: 'tool',
        label: `Using ${humanizeActivityName(item.tool).slice(0, 100) || 'a workspace tool'}`,
        detail: 'Running an observable tool action for this task.',
        status,
        outcome:
          typeof item.success === 'boolean' && status === 'completed'
            ? item.success
              ? 'The workspace tool reported success.'
              : 'The workspace tool did not report success.'
            : activityOutcome(status, {
                completed: 'The workspace tool completed.',
                failed: 'The workspace tool reported a failure.',
                running: 'The workspace tool is still running.',
              }),
        durationMs: typeof item.durationMs === 'number' ? item.durationMs : undefined,
        createdAt,
        turnId: typeof turn.id === 'string' ? turn.id : undefined,
        position,
      });
      continue;
    }
    if (item?.type === 'webSearch') {
      const query = publicActivityText(item.query);
      const action = item.action && typeof item.action === 'object' ? item.action : undefined;
      const actionType = typeof action?.type === 'string' ? action.type : 'search';
      const location = publicWebLocation(action?.url);
      const pattern = publicActivityText(action?.pattern, 100);
      const isOpenPage = actionType === 'openPage';
      const isFindInPage = actionType === 'findInPage';
      activities.push({
        id,
        kind: 'search',
        label: isOpenPage
          ? location
            ? `Opening ${location}`
            : 'Opening a web source'
          : isFindInPage
            ? 'Checking a web page'
            : 'Searching the web',
        detail: isFindInPage
          ? pattern
            ? `Looking on ${location || 'the current page'} for “${pattern}”.`
            : `Inspecting ${location || 'the current web page'}.`
          : isOpenPage
            ? `Reviewing ${location || 'the selected source page'}.`
            : query || 'Looking up current source material.',
        status,
        outcome: isOpenPage
          ? `${location || 'The source page'} was opened for inspection.`
          : isFindInPage
            ? `The on-page check completed${pattern ? ` for “${pattern}”` : ''}.`
            : 'The source search completed; Codex will report any useful finding in its next update.',
        createdAt,
        turnId: typeof turn.id === 'string' ? turn.id : undefined,
        position,
      });
      continue;
    }
    if (item?.type === 'imageView') {
      activities.push({
        id,
        kind: 'image',
        label: 'Inspecting an image',
        detail:
          publicActivityPath(item.path, workspaceRoots) || 'Reviewing supplied visual context.',
        status,
        outcome: activityOutcome(status, {
          completed: 'The image was opened for visual inspection.',
          failed: 'The image could not be inspected.',
          running: 'The image is being inspected.',
        }),
        createdAt,
        turnId: typeof turn.id === 'string' ? turn.id : undefined,
        position,
      });
      continue;
    }
    if (item?.type === 'plan') {
      activities.push({
        id,
        kind: 'plan',
        label: 'Updating the work plan',
        detail:
          publicActivityText(item.text, 220) ||
          'Organising the remaining verified steps for this request.',
        status,
        outcome: activityOutcome(status, {
          completed: 'The remaining work sequence was updated.',
          failed: 'The work plan update did not complete.',
          running: 'The remaining work sequence is being organised.',
        }),
        createdAt,
        turnId: typeof turn.id === 'string' ? turn.id : undefined,
        position,
      });
      continue;
    }
    if (item?.type === 'collabToolCall' || item?.type === 'collabAgentToolCall') {
      activities.push({
        id,
        kind: 'agent',
        label: 'Coordinating the agent team',
        detail: humanizeActivityName(item.tool).slice(0, 120) || 'Managing a delegated workstream.',
        status,
        outcome: activityOutcome(status, {
          completed: 'The agent-team coordination step completed.',
          failed: 'The agent-team coordination step reported a failure.',
          running: 'The agent-team coordination step is in progress.',
        }),
        createdAt,
        turnId: typeof turn.id === 'string' ? turn.id : undefined,
        position,
      });
      continue;
    }
    if (item?.type === 'contextCompaction') {
      activities.push({
        id,
        kind: 'context',
        label: 'Organising conversation context',
        detail: 'Keeping the long-running task focused without changing its goal.',
        status: 'completed',
        outcome: 'Conversation context was compacted so work can continue on the same goal.',
        createdAt,
        turnId: typeof turn.id === 'string' ? turn.id : undefined,
        position,
      });
    }
  }
  return activities.slice(-60);
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
          ((candidate.turnId && String(candidate.turnId) === String(message.turnId || '')) ||
            message.text === candidate.prompt ||
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

function railwayContainerThreadSettings(scope) {
  if (scope.scope === 'client') {
    return {
      runtimeWorkspaceRoots: scope.runtimeWorkspaceRoots,
      sandbox: 'workspace-write',
      approvalPolicy: 'never',
    };
  }
  return {
    runtimeWorkspaceRoots: scope.runtimeWorkspaceRoots,
    sandbox: 'danger-full-access',
    approvalPolicy: 'never',
  };
}

function railwayContainerTurnSettings(scope) {
  if (scope.scope === 'client') {
    return {
      runtimeWorkspaceRoots: scope.runtimeWorkspaceRoots,
      sandboxPolicy: {
        type: 'workspaceWrite',
        writableRoots: scope.runtimeWorkspaceRoots,
        networkAccess: true,
        excludeSlashTmp: true,
        excludeTmpdirEnvVar: true,
      },
      approvalPolicy: 'never',
    };
  }
  return {
    runtimeWorkspaceRoots: scope.runtimeWorkspaceRoots,
    sandboxPolicy: {
      type: 'dangerFullAccess',
    },
    approvalPolicy: 'never',
  };
}

function temporaryQuestionThreadSettings(runtimeWorkspaceRoots) {
  return {
    runtimeWorkspaceRoots,
    sandbox: 'read-only',
    approvalPolicy: 'never',
  };
}

function temporaryQuestionTurnSettings(runtimeWorkspaceRoots) {
  return {
    runtimeWorkspaceRoots,
    sandboxPolicy: { type: 'readOnly' },
    approvalPolicy: 'never',
  };
}

function clientWorkspaceInstruction(scope) {
  return scope.scope === 'client'
    ? `This conversation is exclusively for the client website workspace at ${scope.cwd}. Edit files only inside that exact workspace. Do not inspect, edit, or create files in Studio, the Made Solid website, or any other client's workspace.`
    : '';
}

function wait(milliseconds) {
  return new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
}

export class CodexFeedbackBridge {
  constructor({
    cwd = process.cwd(),
    runtimeWorkspaceRoots,
    storageRoot = resolve('.made-solid', 'codex-feedback'),
    resolveClientWorkspace,
    notifyCompletion,
    connect = connectCodexAppServer,
    threadReadTimeoutMs = defaultThreadReadTimeoutMs,
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
    this.resolveClientWorkspace = resolveClientWorkspace;
    this.notifyCompletion = notifyCompletion;
    this.connect = connect;
    this.threadReadTimeoutMs = threadReadTimeoutMs;
    this.flushRequested = false;
    this.flushPromise = undefined;
    this.flushRetryTimer = undefined;
    this.startedThreads = new Map();
    this.maintenancePromise = undefined;
  }

  async readThreadForStatus(client, params) {
    let timeout;
    try {
      return await Promise.race([
        client.request('thread/read', params),
        new Promise((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error('The selected conversation took too long to load.')),
            this.threadReadTimeoutMs,
          );
        }),
      ]);
    } finally {
      clearTimeout(timeout);
    }
  }

  workspaceScope({ workspace, threadScope } = {}) {
    if (threadScope !== 'client') {
      return {
        scope: 'universal',
        cwd: this.cwd,
        runtimeWorkspaceRoots: this.runtimeWorkspaceRoots,
      };
    }
    if (typeof workspace !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(workspace)) {
      throw new Error('Choose a valid client website workspace.');
    }
    const clientWorkspace = this.resolveClientWorkspace?.(workspace);
    if (!clientWorkspace) throw new Error('That client website workspace is unavailable.');
    const cwd = resolve(clientWorkspace);
    return { scope: 'client', cwd, runtimeWorkspaceRoots: [cwd], workspace };
  }

  async listedThreads(client, scope) {
    const universalResult = await client.request('thread/list', {
      limit: 50,
      cwd: this.cwd,
      sortKey: 'updated_at',
    });
    const universal = (Array.isArray(universalResult.data) ? universalResult.data : []).map(
      (thread) => ({ ...thread, __madeSolidScope: 'universal' }),
    );
    if (scope.scope !== 'client') return universal;
    const clientResult = await client.request('thread/list', {
      limit: 50,
      cwd: scope.cwd,
      sortKey: 'updated_at',
    });
    const clientThreads = (Array.isArray(clientResult.data) ? clientResult.data : []).map(
      (thread) => ({ ...thread, __madeSolidScope: 'client' }),
    );
    return [...clientThreads, ...universal].slice(0, 50);
  }

  assertThreadScope(thread, scope) {
    const cwd = typeof thread?.cwd === 'string' ? resolve(thread.cwd) : '';
    const permitted = cwd === this.cwd || (scope.scope === 'client' && cwd === scope.cwd);
    if (!permitted) throw new Error('That conversation is not available in this website editor.');
    return cwd === this.cwd ? 'universal' : 'client';
  }

  async assertExactThreadScope(threadId, scope) {
    let thread = this.startedThreads.get(String(threadId));
    if (!thread) {
      const client = await this.connect();
      try {
        const result = await client.request('thread/read', { threadId, includeTurns: false });
        thread = result?.thread;
      } finally {
        client.close();
      }
    }
    if (!thread?.id) throw new Error('That conversation is unavailable.');
    const actualScope = this.assertThreadScope(thread, scope);
    if (actualScope !== scope.scope) {
      throw new Error('That conversation belongs to a different workspace.');
    }
  }

  async inspect({ threadId, workspace, threadScope } = {}) {
    const scope = this.workspaceScope({
      workspace,
      threadScope: workspace ? 'client' : 'universal',
    });
    const requestedScope = threadScope === 'client' ? 'client' : 'universal';
    if (requestedScope === 'client' && scope.scope !== 'client') {
      throw new Error('Choose a valid client website workspace.');
    }
    const client = await this.connect();
    try {
      const [accountResult, rateLimitResult, modelResult, threadResult] = await Promise.all([
        client.request('account/read', {}),
        client.request('account/rateLimits/read', null).catch(() => undefined),
        client.request('model/list', { limit: 100, includeHidden: false }),
        this.listedThreads(client, scope).then((data) => ({ data })),
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
      ]
        .filter((thread) => {
          try {
            this.assertThreadScope(thread, scope);
            return true;
          } catch {
            return false;
          }
        })
        .slice(0, 50);
      let requestedThread = threadCandidates.find(
        (candidate) =>
          String(candidate.id) === String(threadId || '') &&
          (candidate.__madeSolidScope || this.assertThreadScope(candidate, scope)) ===
            requestedScope,
      );
      let requestedThreadDetail;
      let threadIssue;
      if (
        !requestedThread &&
        typeof threadId === 'string' &&
        /^[A-Za-z0-9-]{1,100}$/.test(threadId)
      ) {
        try {
          requestedThreadDetail = await this.readThreadForStatus(client, {
            threadId,
            includeTurns: true,
          });
        } catch (error) {
          threadIssue =
            error instanceof Error ? error.message : 'The selected conversation could not load.';
          // A stale browser selection falls back to the newest listed Studio thread.
        }
        if (requestedThreadDetail?.thread?.id) {
          const directScope = this.assertThreadScope(requestedThreadDetail.thread, scope);
          if (directScope !== requestedScope) {
            throw new Error('That conversation belongs to a different workspace.');
          }
          requestedThreadDetail.thread.__madeSolidScope = directScope;
          requestedThread = requestedThreadDetail.thread;
          threadCandidates.unshift(requestedThread);
        }
      }
      const requestedCwd = requestedScope === 'client' ? scope.cwd : this.cwd;
      const thread = requestedThread || selectThread(threadCandidates, requestedCwd);
      let threadDetail =
        String(requestedThreadDetail?.thread?.id || '') === String(thread?.id || '')
          ? requestedThreadDetail
          : undefined;
      if (thread) {
        try {
          threadDetail ??= await this.readThreadForStatus(client, {
            threadId: thread.id,
            includeTurns: true,
          });
          if (hasConversationContent(threadDetail?.thread)) {
            this.startedThreads.delete(String(thread.id));
          }
        } catch (error) {
          threadIssue =
            error instanceof Error ? error.message : 'The selected conversation could not load.';
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
      const agentActivities = collabAgentActivities([
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
      const inheritedTurnIds = new Set(
        (Array.isArray(detailedThread?.turns) ? detailedThread.turns : [])
          .map((turn) => (typeof turn?.id === 'string' ? turn.id : undefined))
          .filter(Boolean),
      );
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
      const selectedThreadScope = detailedThread
        ? detailedThread.__madeSolidScope || this.assertThreadScope(detailedThread, scope)
        : requestedScope;
      const selectedQueued = queued.filter((record) => {
        const recordMatchesSelectedScope =
          record.threadScope === selectedThreadScope &&
          (selectedThreadScope !== 'client' || record.workspace === scope.workspace);
        if (record.threadId) {
          return recordMatchesSelectedScope && String(record.threadId) === String(thread?.id || '');
        }
        return recordMatchesSelectedScope;
      });
      return {
        status: 'ready',
        detail: thread
          ? threadIssue
            ? 'The selected conversation is unavailable, but the other conversations remain accessible.'
            : 'Connected to the local Codex conversation.'
          : 'Codex is connected, but no Studio conversation is available yet.',
        threadIssue: threadIssue
          ? 'This conversation could not be loaded safely. Choose another chat or start a new one; the existing conversation has been preserved.'
          : undefined,
        account: accountResult.account
          ? {
              type: String(accountResult.account.type || ''),
              planType: String(accountResult.account.planType || ''),
            }
          : undefined,
        subscriptionUsage: publicSubscriptionUsage(
          rateLimitResult?.rateLimitsByLimitId?.codex ?? rateLimitResult?.rateLimits,
        ),
        thread: detailedThread
          ? publicThread(detailedThread, {
              scope:
                detailedThread.__madeSolidScope || this.assertThreadScope(detailedThread, scope),
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
                scope: candidate.__madeSolidScope || this.assertThreadScope(candidate, scope),
                discardable:
                  this.startedThreads.has(String(candidate.id)) ||
                  (!candidate.name &&
                    !candidate.preview &&
                    !hasConversationContent(detailedThread)),
              })
            : publicThread(candidate, {
                scope: candidate.__madeSolidScope || this.assertThreadScope(candidate, scope),
                discardable:
                  this.startedThreads.has(String(candidate.id)) ||
                  (!candidate.name && !candidate.preview),
              }),
        ),
        messages: messagesWithFeedbackRecords(threadDetail?.thread, records, thread?.id),
        activities: publicActivities(threadDetail?.thread, scope.runtimeWorkspaceRoots),
        agents: agentThreads.map((agentThread, index) =>
          publicAgent(
            agentThread,
            agentDetails[index],
            agentStates.get(String(agentThread.id)),
            agentDepth(agentThread),
            supervisorTurnId(agentThread),
            agentActivities.get(String(agentThread.id)),
            inheritedTurnIds,
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
    const scope = this.workspaceScope(input);
    const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
    if (prompt.length > maximumPromptLength) {
      throw new Error('Keep the prompt within 4,000 characters.');
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
    if (!prompt && screenshots.length === 0) {
      throw new Error('Add a prompt or attach an image.');
    }
    const workMode = input.workMode === 'team' ? 'team' : 'direct';
    const threadId =
      typeof input.threadId === 'string' && /^[A-Za-z0-9-]{1,100}$/.test(input.threadId)
        ? input.threadId
        : undefined;
    if (threadId) await this.assertExactThreadScope(threadId, scope);
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
      threadScope: scope.scope,
      workspace: scope.workspace,
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

  async temporaryQuestion(input) {
    this.workspaceScope(input);
    const excerpt = typeof input.excerpt === 'string' ? input.excerpt.trim() : '';
    const question = typeof input.question === 'string' ? input.question.trim() : '';
    if (!excerpt) throw new Error('Select a Codex excerpt first.');
    if (!question) throw new Error('Ask a question about the selected excerpt.');
    if (excerpt.length > 3_000) throw new Error('Shorten the selected excerpt and try again.');
    if (question.length > 800) throw new Error('Keep the quick question within 800 characters.');
    const requestedModel = typeof input.model === 'string' ? input.model.trim() : '';
    if (!/^[A-Za-z0-9._-]{1,100}$/.test(requestedModel)) {
      throw new Error('Choose an available Codex model.');
    }

    const client = await this.connect();
    let temporaryDirectory;
    let threadId;
    let turnId;
    try {
      const modelResult = await client.request('model/list', { limit: 100, includeHidden: false });
      const model = (modelResult.data || [])
        .map(publicModel)
        .find((candidate) => candidate.id === requestedModel);
      if (!model) throw new Error('The quick-answer model is unavailable.');
      const effortOrder = ['minimal', 'low', 'medium', 'high', 'xhigh'];
      const effort =
        effortOrder.find((candidate) => model.efforts.some((item) => item.id === candidate)) ||
        model.defaultEffort ||
        model.efforts[0]?.id ||
        'medium';
      const serviceTier = model.serviceTiers.some((candidate) => candidate.id === 'priority')
        ? 'priority'
        : 'default';
      temporaryDirectory = await mkdtemp(join(tmpdir(), 'made-solid-codex-question-'));
      const threadResult = await client.request('thread/start', {
        cwd: temporaryDirectory,
        ...temporaryQuestionThreadSettings([]),
        model: model.id,
        serviceTier,
        config: { model_reasoning_effort: effort },
        ephemeral: true,
        sessionStartSource: 'clear',
      });
      threadId = String(threadResult.thread?.id || '');
      if (!threadId) throw new Error('Codex did not start the temporary question.');
      const turnResult = await client.request('turn/start', {
        threadId,
        input: [
          {
            type: 'text',
            text: `${temporaryQuestionInstruction}\n\nQuoted Codex excerpt:\n---\n${excerpt}\n---\n\nQuestion: ${question}`,
          },
        ],
        cwd: temporaryDirectory,
        ...temporaryQuestionTurnSettings([]),
        model: model.id,
        effort,
        serviceTier,
      });
      turnId = String(turnResult.turn?.id || '');
      if (!turnId) throw new Error('Codex did not accept the temporary question.');

      for (let attempt = 0; attempt < 120; attempt += 1) {
        if (attempt) await wait(250);
        const detail = await client.request('thread/read', { threadId, includeTurns: true });
        const turn = (Array.isArray(detail.thread?.turns) ? detail.thread.turns : []).find(
          (candidate) => String(candidate?.id || '') === turnId,
        );
        if (!turn || turn.status === 'inProgress') continue;
        if (turn.status !== 'completed') {
          throw new Error('The temporary Codex answer did not complete.');
        }
        const answer = publicMessages(detail.thread)
          .filter((message) => message.role === 'assistant' && message.turnId === turnId)
          .at(-1)?.text;
        if (!answer) throw new Error('Codex completed without a temporary answer.');
        return {
          status: 'complete',
          answer,
          model: model.label,
          detail: 'Temporary answer complete. This exchange was not added to the conversation.',
        };
      }
      await client.request('turn/interrupt', { threadId, turnId }).catch(() => undefined);
      throw new Error('The temporary answer took too long. Try again.');
    } finally {
      if (threadId) await client.request('thread/delete', { threadId }).catch(() => undefined);
      client.close();
      if (temporaryDirectory) await rm(temporaryDirectory, { force: true, recursive: true });
    }
  }

  async createThread(input) {
    const scope = this.workspaceScope(input);
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
        cwd: scope.cwd,
        ...railwayContainerThreadSettings(scope),
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
        thread: publicThread(result.thread, { discardable: true, scope: scope.scope }),
      };
    } finally {
      client.close();
    }
  }

  async forkThread(input) {
    const scope = this.workspaceScope(input);
    const threadId = typeof input.threadId === 'string' ? input.threadId.trim() : '';
    const turnId = typeof input.turnId === 'string' ? input.turnId.trim() : '';
    if (!/^[A-Za-z0-9-]{1,100}$/.test(threadId)) {
      throw new Error('Choose a valid conversation to branch.');
    }
    if (!/^[A-Za-z0-9-]{1,100}$/.test(turnId)) {
      throw new Error('Choose a completed Codex reply to branch from.');
    }
    const client = await this.connect();
    try {
      const sourceResult = await client.request('thread/read', {
        threadId,
        includeTurns: true,
      });
      const sourceThread = sourceResult?.thread;
      if (!sourceThread?.id) throw new Error('That conversation is unavailable.');
      if (this.assertThreadScope(sourceThread, scope) !== scope.scope) {
        throw new Error('That conversation belongs to a different workspace.');
      }
      const sourceTurns = Array.isArray(sourceThread.turns) ? sourceThread.turns : [];
      const selectedTurnIndex = sourceTurns.findIndex((turn) => String(turn?.id || '') === turnId);
      const selectedTurn = sourceTurns[selectedTurnIndex];
      if (!selectedTurn) {
        throw new Error('That Codex reply is no longer available in this conversation.');
      }
      if (selectedTurn.status !== 'completed') {
        throw new Error('Wait for this Codex reply to finish before branching from it.');
      }
      const result = await client.request('thread/fork', {
        threadId,
        lastTurnId: turnId,
        cwd: scope.cwd,
        ...railwayContainerThreadSettings(scope),
        deferGoalContinuation: true,
        ephemeral: false,
        threadSource: 'user',
      });
      if (!result.thread?.id) throw new Error('Codex did not return a branched conversation.');
      const forkedThreadId = String(result.thread.id);
      const includedTurnIds = new Set(
        sourceTurns
          .slice(0, selectedTurnIndex + 1)
          .map((turn) => (typeof turn?.id === 'string' ? turn.id : undefined))
          .filter(Boolean),
      );
      const inheritedRecords = (await this.readRecords()).filter(
        (record) =>
          ['completed', 'delivered', 'interrupted'].includes(record.status) &&
          String(record.threadId || '') === threadId &&
          includedTurnIds.has(String(record.turnId || '')),
      );
      await Promise.all(
        inheritedRecords.map((record) => {
          const id = randomUUID();
          const attachments = Array.isArray(record.attachments)
            ? record.attachments
            : record.imagePath && record.mimeType
              ? [{ id: record.id, mimeType: record.mimeType }]
              : [];
          return atomicWriteJson(resolve(this.storageRoot, `${id}.json`), {
            ...record,
            id,
            threadId: forkedThreadId,
            attachments,
            imagePath: undefined,
            forkedFromRecordId: record.id,
            notificationPending: false,
            updatedAt: new Date().toISOString(),
          });
        }),
      );
      return {
        status: 'ready',
        detail: 'Codex conversation branched from the selected reply.',
        thread: publicThread(result.thread, { scope: scope.scope }),
      };
    } finally {
      client.close();
    }
  }

  async continueInterruptedThread(input) {
    const scope = this.workspaceScope(input);
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
      const actualThreadScope = this.assertThreadScope(thread, scope);
      if (actualThreadScope !== scope.scope) {
        throw new Error('That conversation belongs to a different workspace.');
      }
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
          ...railwayContainerThreadSettings(scope),
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
            text: `The previous turn was interrupted when the Codespace paused. Continue the original request from the saved work and transcript. Inspect the current shared workspace first, preserve existing changes, finish the remaining implementation and verification, and report the final result.${teamContinuation}\n\n${clientWorkspaceInstruction(scope)}\n\n${progressUpdateInstruction}`,
          },
        ],
        cwd: scope.cwd,
        ...railwayContainerTurnSettings(scope),
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

  async interruptActiveTurn(threadId, scopeInput = {}, { includeDescendants = false } = {}) {
    const scope = this.workspaceScope(scopeInput);
    const client = await this.connect();
    try {
      const threadCandidates = await this.listedThreads(client, scope);
      let thread = threadId
        ? threadCandidates.find((candidate) => String(candidate.id) === String(threadId))
        : selectThread(threadCandidates, scope.cwd);
      if (!thread && threadId) {
        const direct = await client.request('thread/read', { threadId, includeTurns: false });
        thread = direct?.thread;
      }
      if (!thread) return false;
      if (this.assertThreadScope(thread, scope) !== scope.scope) {
        throw new Error('That conversation belongs to a different workspace.');
      }
      const threadDetail = await client.request('thread/read', {
        threadId: thread.id,
        includeTurns: true,
      });
      const activeTurns = [];
      const turn = activeTurn(threadDetail?.thread);
      if (turn) activeTurns.push({ threadId: thread.id, turnId: turn.id });
      if (includeDescendants) {
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
          for (const descendant of (Array.isArray(descendants.data) ? descendants.data : []).slice(
            0,
            maximumAgentThreads,
          )) {
            const detail = await client.request('thread/read', {
              threadId: descendant.id,
              includeTurns: true,
            });
            const descendantTurn = activeTurn(detail?.thread);
            if (descendantTurn) {
              activeTurns.push({ threadId: descendant.id, turnId: descendantTurn.id });
            }
          }
        } catch {
          // Stopping the scoped supervisor still succeeds when descendant discovery is unavailable.
        }
      }
      let interrupted = false;
      for (const active of activeTurns) {
        try {
          await client.request('turn/interrupt', active);
          interrupted = true;
        } catch (error) {
          if (String(active.threadId) === String(thread.id)) throw error;
        }
      }
      return interrupted;
    } finally {
      client.close();
    }
  }

  async stopActiveTurn(input = {}) {
    const threadId = typeof input.threadId === 'string' ? input.threadId.trim() : '';
    if (!/^[A-Za-z0-9-]{1,100}$/.test(threadId)) {
      throw new Error('Choose a valid active conversation to stop.');
    }
    const interrupted = await this.interruptActiveTurn(threadId, input, {
      includeDescendants: true,
    });
    if (interrupted) {
      const activeRecords = (await this.readRecords()).filter(
        (record) =>
          ['running', 'recovering'].includes(record.status) &&
          String(record.threadId || '') === threadId,
      );
      await Promise.all(
        activeRecords.map((record) =>
          this.updateRecordStatus(record, 'interrupted', {
            interruptedAt: new Date().toISOString(),
            manuallyStopped: true,
          }),
        ),
      );
    }
    return {
      status: interrupted ? 'stopping' : 'stopped',
      detail: interrupted
        ? 'Codex is stopping the current turn.'
        : 'That Codex turn had already stopped.',
    };
  }

  async updateQueued(id, input) {
    const record = await this.queuedRecord(id, input);
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

  async deleteQueued(id, input) {
    const record = await this.queuedRecord(id, input);
    await atomicWriteJson(resolve(this.storageRoot, `${record.id}.json`), {
      ...record,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return { status: 'cancelled', id: record.id, detail: 'Queued message deleted.' };
  }

  async interruptQueued(id, input) {
    const record = await this.queuedRecord(id, input);
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
    const interrupted = await this.interruptActiveTurn(record.threadId, {
      workspace: record.workspace,
      threadScope: record.threadScope,
    });
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

  async queuedRecord(id, scopeInput) {
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) {
      throw new Error('Choose a valid queued message.');
    }
    const records = await this.readRecords('queued');
    const record = records.find((candidate) => candidate.id === id);
    if (!record) throw new Error('That message is no longer queued.');
    if (scopeInput) {
      const requestedScope = this.workspaceScope(scopeInput);
      const recordScope = this.workspaceScope({
        workspace: record.workspace,
        threadScope: record.threadScope,
      });
      if (
        requestedScope.scope !== recordScope.scope ||
        requestedScope.cwd !== recordScope.cwd ||
        requestedScope.workspace !== recordScope.workspace
      ) {
        throw new Error('That queued message belongs to a different workspace.');
      }
    }
    return record;
  }

  async deleteEmptyThread(input) {
    const threadId = typeof input === 'string' ? input : input?.threadId;
    const scope = this.workspaceScope(typeof input === 'string' ? {} : input);
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
      if (this.assertThreadScope(result.thread, scope) !== scope.scope) {
        throw new Error('That conversation belongs to a different workspace.');
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
        let recordScope;
        try {
          recordScope = this.workspaceScope({
            workspace: record.workspace,
            threadScope: record.threadScope,
          });
        } catch (error) {
          await this.markFailed(
            record,
            error instanceof Error ? error.message : 'The client website workspace is unavailable.',
          );
          continue;
        }
        const client = await this.connect().catch(() => undefined);
        if (!client) return;
        try {
          const [modelResult, threadResult] = await Promise.all([
            client.request('model/list', { limit: 100, includeHidden: false }),
            this.listedThreads(client, recordScope).then((data) => ({ data })),
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
            : selectThread(threadCandidates, recordScope.cwd);
          if (!thread && record.threadId) {
            try {
              const directThread = await client.request('thread/read', {
                threadId: record.threadId,
                includeTurns: true,
              });
              if (directThread?.thread) {
                this.assertThreadScope(directThread.thread, recordScope);
                thread = directThread.thread;
              }
            } catch {
              // The durable queue remains private and retries after the thread is available.
            }
          }
          if (!thread) continue;
          const actualThreadScope = this.assertThreadScope(thread, recordScope);
          if (actualThreadScope !== recordScope.scope) {
            await this.markFailed(record, 'That conversation belongs to a different workspace.');
            continue;
          }
          if (thread.status?.type === 'active') continue;
          if (thread.status?.type === 'notLoaded') {
            await client.request('thread/resume', {
              threadId: thread.id,
              ...railwayContainerThreadSettings(recordScope),
            });
            const resumedThread = await client.request('thread/read', {
              threadId: thread.id,
              includeTurns: true,
            });
            thread = resumedThread?.thread || thread;
          }
          if (thread.status?.type === 'active' || activeTurn(thread)) continue;
          try {
            const currentRecord = await this.queuedRecord(record.id);
            const dispatchingRecord = {
              ...currentRecord,
              status: 'dispatching',
              updatedAt: new Date().toISOString(),
            };
            await atomicWriteJson(
              resolve(this.storageRoot, `${currentRecord.id}.json`),
              dispatchingRecord,
            );
            const imageAttachments = recordImageAttachments(dispatchingRecord, this.storageRoot);
            const turnResult = await client.request('turn/start', {
              threadId: thread.id,
              input: [
                {
                  type: 'text',
                  text: `${
                    dispatchingRecord.context
                      ? `${dispatchingRecord.prompt}\n\nCaptured from: ${dispatchingRecord.context}${
                          dispatchingRecord.workMode === 'team'
                            ? `\n\n${teamDelegationInstruction}`
                            : ''
                        }`
                      : `${dispatchingRecord.prompt}${
                          dispatchingRecord.workMode === 'team'
                            ? `\n\n${teamDelegationInstruction}`
                            : ''
                        }`
                  }\n\n${clientWorkspaceInstruction(recordScope)}\n\n${progressUpdateInstruction}`,
                },
                ...imageAttachments.map((attachment) => ({
                  type: 'localImage',
                  path: attachment.path,
                })),
              ],
              cwd: recordScope.cwd,
              ...railwayContainerTurnSettings(recordScope),
              model: dispatchingRecord.model,
              effort: dispatchingRecord.effort,
              serviceTier: dispatchingRecord.serviceTier || 'default',
            });
            await atomicWriteJson(resolve(this.storageRoot, `${record.id}.json`), {
              ...dispatchingRecord,
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
    const pendingNotifications = records.filter(
      (record) => record.status === 'completed' && record.notificationPending === true,
    );
    if (!running.length) {
      await this.dispatchCompletionNotifications(pendingNotifications);
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
          const recordScope = this.workspaceScope({
            workspace: record.workspace,
            threadScope: record.threadScope,
          });
          const detail = await client.request('thread/read', {
            threadId: record.threadId,
            includeTurns: true,
          });
          let detailedThread = detail?.thread;
          if (!detailedThread?.id) continue;
          const actualThreadScope = this.assertThreadScope(detailedThread, recordScope);
          if (actualThreadScope !== recordScope.scope) {
            await this.markFailed(record, 'That conversation belongs to a different workspace.');
            continue;
          }
          if (detailedThread.status?.type === 'notLoaded') {
            await client.request('thread/resume', {
              threadId: detailedThread.id,
              ...railwayContainerThreadSettings(recordScope),
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
          if (trackedTurn.status === 'completed') {
            await this.updateRecordStatus(record, 'completed', {
              completedAt: new Date().toISOString(),
              notificationPending: Boolean(this.notifyCompletion),
            });
            continue;
          }
          if (hasQueuedFollowUp && trackedTurn.status === 'interrupted') {
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
                text: `The Codespace paused while this turn was still running. Continue the same request from the saved transcript and current workspace. Preserve existing changes, finish the remaining implementation and verification, and report the final result.${teamRecoveryInstruction}\n\n${clientWorkspaceInstruction(recordScope)}\n\n${progressUpdateInstruction}`,
              },
            ],
            cwd: recordScope.cwd,
            ...railwayContainerTurnSettings(recordScope),
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
    await this.dispatchCompletionNotifications(pendingNotifications);
    await this.flush();
  }

  async dispatchCompletionNotifications(records) {
    if (!this.notifyCompletion || !records.length) return;
    for (const record of records) {
      try {
        const result = await this.notifyCompletion(record);
        await this.updateRecordStatus(record, 'completed', {
          notificationDeliveredCount: Number(result?.delivered || 0),
          notificationPending: false,
          notificationSentAt: new Date().toISOString(),
        });
      } catch {
        // The durable pending marker retries after a transient push-delivery failure.
      }
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
