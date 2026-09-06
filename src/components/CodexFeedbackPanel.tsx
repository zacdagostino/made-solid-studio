import * as Dialog from '@radix-ui/react-dialog';
import {
  Activity,
  ArrowDown,
  BellRing,
  Bot,
  Camera,
  Check,
  CircleAlert,
  Clock3,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  CircleDot,
  CircleX,
  CornerDownRight,
  CreditCard,
  Globe2,
  GitFork,
  ImageUp,
  FilePenLine,
  ListChecks,
  LoaderCircle,
  Maximize2,
  MessageSquareText,
  MonitorUp,
  Pause,
  PanelsTopLeft,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Save,
  Send,
  Settings,
  Search,
  SlidersHorizontal,
  Square,
  SquareTerminal,
  Trash2,
  UsersRound,
  Volume2,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { captureVisiblePage, warmMobileScreenCapture } from '../lib/mobile-screen-capture';
import {
  codexCloudSpeechChunks,
  codexSpeechChunks,
  codexSpeechLanguage,
  codexSpeechRate,
  codexSpeechTextFromWord,
  codexSpeechWordAtTime,
  codexSpeechWords,
  estimatedCodexSpeechSeconds,
  formatCodexSpeechTime,
  preferredEnglishSpeechVoice,
  type CodexSpeechStyle,
} from '../lib/codex-speech';
import { studioRuntimeFetch } from '../lib/studio-runtime';
import { openCodexPanelEvent } from '../lib/codex-panel-events';
import { isSupabaseConfigured, usesLocalStorage } from '../lib/supabase';
import {
  codexConversationRequestText,
  codexConversationTitle,
} from '../lib/codex-conversation-title';
import {
  useCallback,
  useEffect,
  Fragment,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Button, ButtonGroup, ConfirmationDialog, IconButton, StatusBadge } from './ui';
import { MarkdownContent } from './MarkdownContent';

type CodexEffort = {
  id: string;
  description: string;
};

type CodexModel = {
  id: string;
  label: string;
  defaultEffort: string;
  efforts: CodexEffort[];
  supportsImages: boolean;
  serviceTiers: Array<{ id: string; name: string; description: string }>;
  defaultServiceTier: string;
  isDefault: boolean;
};

type CodexThread = {
  id: string;
  name?: string;
  preview?: string;
  status: string;
  working?: boolean;
  activeFlags?: string[];
  updatedAt?: number;
  workingStartedAt?: number;
  activeTurnId?: string;
  lastTurnStatus?: string;
  interrupted?: boolean;
  discardable?: boolean;
  scope?: 'client' | 'universal';
};

type CodexUsageWindow = {
  usedPercent: number;
  windowDurationMins?: number;
  resetsAt?: number;
};

type CodexStatus = {
  status: 'ready' | 'unavailable';
  detail: string;
  threadIssue?: string;
  account?: { type: string; planType: string };
  subscriptionUsage?: {
    primary?: CodexUsageWindow;
    secondary?: CodexUsageWindow;
  };
  billing?: {
    apiKeyConfigured: boolean;
    mode: 'chatgpt_subscription' | 'api_credits';
    label: string;
  };
  capabilities?: { stopActiveTurn?: boolean };
  thread?: CodexThread;
  threads: CodexThread[];
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    text: string;
    turnId?: string;
    turnStatus?: string;
    phase?: string;
    attachmentId?: string;
    attachmentIds?: string[];
    feedbackId?: string;
    position?: number;
  }>;
  activities?: CodexActivity[];
  agents: CodexAgent[];
  models: CodexModel[];
  queuedCount: number;
  interruptingCount?: number;
  queuedMessages?: Array<{
    id: string;
    threadId?: string;
    prompt: string;
    model: string;
    effort: string;
    serviceTier?: 'default' | 'priority';
    deliveryMode: 'queue' | 'interrupt';
    createdAt: string;
    position: number;
    attachmentId?: string;
    attachmentIds?: string[];
    workMode?: 'direct' | 'team';
  }>;
};

function canBranchCodexMessage(
  message: CodexStatus['messages'][number],
  thread: CodexThread | undefined,
  messages: CodexStatus['messages'],
) {
  if (
    message.role !== 'assistant' ||
    message.phase === 'commentary' ||
    !message.turnId ||
    message.turnId === thread?.activeTurnId
  )
    return false;
  if (message.turnStatus) return message.turnStatus === 'completed';
  const latestFinalTurnId = [...messages]
    .reverse()
    .find(
      (candidate) => candidate.role === 'assistant' && candidate.phase !== 'commentary',
    )?.turnId;
  if (latestFinalTurnId !== message.turnId) return true;
  return (
    thread?.lastTurnStatus === 'completed' ||
    (!thread?.working && thread?.lastTurnStatus !== 'interrupted')
  );
}

type CodexActivityKind =
  'command' | 'file' | 'tool' | 'search' | 'image' | 'plan' | 'agent' | 'context';

type CodexActivity = {
  id: string;
  kind: CodexActivityKind;
  label: string;
  detail?: string;
  outcome?: string;
  status: 'running' | 'completed' | 'failed';
  durationMs?: number;
  createdAt?: number;
  turnId?: string;
  position?: number;
};

type CodexAgentStatus =
  'pendingInit' | 'running' | 'interrupted' | 'completed' | 'errored' | 'shutdown' | 'notFound';

type CodexAgent = {
  id: string;
  parentThreadId?: string;
  supervisorTurnId?: string;
  nickname?: string;
  role?: string;
  name?: string;
  task: string;
  status: CodexAgentStatus;
  statusMessage?: string;
  working: boolean;
  depth: number;
  createdAt?: number;
  updatedAt?: number;
  workingStartedAt?: number;
  messages: CodexStatus['messages'];
};

type TeamResumeState = {
  threadId: string;
  agentIds: string[];
  failedAgentIds: string[];
};

type PanelPhase =
  'closed' | 'compose' | 'sending-chat' | 'capturing' | 'capturing-tab' | 'selecting';
type SpeechPlaybackState = 'idle' | 'loading' | 'playing' | 'paused';
type SpeechProgress = { elapsedSeconds: number; totalSeconds: number };
type AutoReadMessage = {
  id: string;
  phase: 'progress' | 'final';
  text: string;
  turnId?: string;
};
type CloudSpeechVoice = {
  id: string;
  gender: 'Female' | 'Male' | 'Neutral' | 'Unspecified';
  languageCode: string;
  model: string;
  modelLabel: string;
  name: string;
  qualityLabel: string;
  qualityRank: number;
};
type CloudSpeechConfiguration = {
  available: boolean;
  defaultVoice: string;
  provider: string;
  voices: CloudSpeechVoice[];
};
type CloudSpeechSegment = { audio: HTMLAudioElement; duration: number; url: string };
type ConversationTransition = {
  id: number;
  kind: 'branch' | 'create' | 'switch';
  label: string;
};
type CodexExcerpt = { messageId: string; text: string; turnId?: string };
type TemporaryQuestion = {
  answer?: string;
  error?: string;
  excerpt: string;
  messageId: string;
  model?: string;
  phase: 'compose' | 'loading' | 'answer';
  question: string;
  speechId: string;
  threadId: string;
  turnId?: string;
};
type Point = { x: number; y: number };
type Selection = { start: Point; end: Point };
type DraftAttachment = { id: string; name: string; source: string };

const statusEndpoint = '/__made-solid/codex-status';
const feedbackEndpoint = '/__made-solid/codex-feedback';
const branchEndpoint = '/__made-solid/codex-branch';
const localPageCaptureEndpoint = '/__made-solid/page-screenshot';
const codexAttachmentPrefix = '/__made-solid/codex-attachment/';
const codexSpeechEndpoint = '/__made-solid/codex-speech';
const codexPreferencesEndpoint = '/__made-solid/codex-preferences';
const aiBillingModeEndpoint = '/__made-solid/ai-billing-mode';
const browserCaptureSource = 'made-solid-browser-capture';
const codexPreferencesKey = 'made-solid-codex-preferences-v1';
const codexDraftKey = 'made-solid-codex-draft-v1';
const codexChatSessionKey = 'made-solid-codex-chat-session-v1';
const codexConversationLifecycleKey = 'made-solid-codex-conversation-lifecycle-v1';
const maximumPhotoBytes = 15 * 1024 * 1024;
const maximumDraftAttachments = 5;
const supportedPhotoTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const cloudSpeechBlobCache = new Map<string, Blob>();
const maximumCloudSpeechCacheEntries = 24;
const interruptedBranchMessage =
  'Branching was interrupted before Studio returned a result. Check Conversations for the new branch, then retry if it is not listed.';

async function readBranchResponse(response: Response) {
  const body = await response.text();
  if (!body.trim()) throw new Error(interruptedBranchMessage);
  try {
    return JSON.parse(body) as { thread?: CodexThread; detail?: string };
  } catch {
    if (!response.ok && !body.trimStart().startsWith('<')) {
      throw new Error(body.trim().slice(0, 240));
    }
    throw new Error(interruptedBranchMessage);
  }
}

function cacheCloudSpeechBlob(key: string, blob: Blob) {
  cloudSpeechBlobCache.delete(key);
  cloudSpeechBlobCache.set(key, blob);
  while (cloudSpeechBlobCache.size > maximumCloudSpeechCacheEntries) {
    const oldestKey = cloudSpeechBlobCache.keys().next().value;
    if (oldestKey === undefined) break;
    cloudSpeechBlobCache.delete(oldestKey);
  }
}

function RuntimeAttachmentImage({ attachmentId, alt }: { attachmentId: string; alt: string }) {
  const directSource = `${codexAttachmentPrefix}${attachmentId}`;
  const [source, setSource] = useState(
    !isSupabaseConfigured || usesLocalStorage ? directSource : undefined,
  );

  useEffect(() => {
    if (!isSupabaseConfigured || usesLocalStorage) return;
    let active = true;
    let objectUrl: string | undefined;
    void studioRuntimeFetch(directSource)
      .then(async (response) => {
        if (!response.ok) throw new Error('Attachment unavailable.');
        objectUrl = URL.createObjectURL(await response.blob());
        if (active) setSource(objectUrl);
      })
      .catch(() => {
        if (active) setSource(undefined);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [directSource]);

  return source ? <img alt={alt} className="codex-chat-message__attachment" src={source} /> : null;
}

function RuntimeAttachmentGallery({
  attachmentIds,
  altPrefix,
}: {
  attachmentIds: string[];
  altPrefix: string;
}) {
  if (!attachmentIds.length) return null;
  return (
    <div className="codex-chat-message__attachments">
      {attachmentIds.map((attachmentId, index) => (
        <RuntimeAttachmentImage
          attachmentId={attachmentId}
          alt={`${altPrefix} ${index + 1} of ${attachmentIds.length}`}
          key={attachmentId}
        />
      ))}
    </div>
  );
}

type CodexPreferences = {
  modelId: string;
  effortByModel: Record<string, string>;
  workMode: 'direct' | 'team';
  fastMode: boolean;
  autoReadCodex: boolean;
  speechLanguage: string;
  speechRate: number;
  speechStyle: CodexSpeechStyle;
  speechVoice: string;
};

type CodexTranscriptPosition = {
  anchorId?: string;
  anchorKind?: 'activity' | 'message';
  anchorOffset?: number;
  followingLatest: boolean;
  scrollTop: number;
  updatedAt: number;
};

type CodexChatSession = {
  isOpen: boolean;
  positions: Record<string, CodexTranscriptPosition>;
  selectedThreadId: string;
  selectedThreadScope?: CodexThread['scope'];
};

type CodexConversationLifecycle = {
  unseenCompletionThreadIds: string[];
  workingByThread: Record<string, boolean>;
};

function scopedStorageKey(base: string, workspaceDirectory?: string) {
  return workspaceDirectory ? `${base}:client:${workspaceDirectory}` : base;
}

function readCodexChatSession(workspaceDirectory?: string): CodexChatSession {
  const fallback: CodexChatSession = {
    isOpen: false,
    positions: {},
    selectedThreadId: '',
  };
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(scopedStorageKey(codexChatSessionKey, workspaceDirectory)) ||
        '{}',
    ) as Partial<CodexChatSession>;
    const positions =
      stored.positions && typeof stored.positions === 'object' ? stored.positions : {};
    return {
      isOpen: stored.isOpen === true,
      positions,
      selectedThreadId: typeof stored.selectedThreadId === 'string' ? stored.selectedThreadId : '',
      selectedThreadScope:
        stored.selectedThreadScope === 'client' || stored.selectedThreadScope === 'universal'
          ? stored.selectedThreadScope
          : undefined,
    };
  } catch {
    return fallback;
  }
}

function readCodexConversationLifecycle(): CodexConversationLifecycle {
  const fallback = { unseenCompletionThreadIds: [], workingByThread: {} };
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(codexConversationLifecycleKey) || '{}',
    ) as Partial<CodexConversationLifecycle>;
    return {
      unseenCompletionThreadIds: Array.isArray(stored.unseenCompletionThreadIds)
        ? stored.unseenCompletionThreadIds
            .filter((threadId): threadId is string => typeof threadId === 'string')
            .slice(0, 100)
        : [],
      workingByThread:
        stored.workingByThread && typeof stored.workingByThread === 'object'
          ? Object.fromEntries(
              Object.entries(stored.workingByThread)
                .filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean')
                .slice(0, 100),
            )
          : {},
    };
  } catch {
    return fallback;
  }
}

function writeCodexConversationLifecycle(lifecycle: CodexConversationLifecycle) {
  try {
    window.localStorage.setItem(codexConversationLifecycleKey, JSON.stringify(lifecycle));
  } catch {
    // Conversation indicators remain usable when browser storage is unavailable or full.
  }
}

function writeCodexChatSession(session: CodexChatSession, workspaceDirectory?: string) {
  try {
    window.localStorage.setItem(
      scopedStorageKey(codexChatSessionKey, workspaceDirectory),
      JSON.stringify(session),
    );
  } catch {
    // Chat remains usable when browser storage is unavailable or full.
  }
}

function selectedNodeElement(node: Node | null) {
  if (node instanceof Element) return node;
  return node?.parentElement ?? null;
}

function quotedCodexExcerpt(text: string, instruction = 'Quoted from Codex:') {
  const quote = text
    .trim()
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
  return `${instruction}\n\n${quote}`;
}

function normalizeCodexPreferences(stored: Partial<CodexPreferences>): CodexPreferences {
  return {
    modelId: typeof stored.modelId === 'string' ? stored.modelId : '',
    effortByModel:
      stored.effortByModel && typeof stored.effortByModel === 'object' ? stored.effortByModel : {},
    workMode: stored.workMode === 'direct' ? 'direct' : 'team',
    fastMode: stored.fastMode === true,
    autoReadCodex: stored.autoReadCodex === true,
    speechLanguage:
      typeof stored.speechLanguage === 'string' && stored.speechLanguage.trim()
        ? stored.speechLanguage
        : 'en-AU',
    speechRate: [0.85, 1, 1.15].includes(Number(stored.speechRate)) ? Number(stored.speechRate) : 1,
    speechStyle: stored.speechStyle === 'literal' ? 'literal' : 'natural',
    speechVoice:
      typeof stored.speechVoice === 'string' && stored.speechVoice.trim()
        ? stored.speechVoice
        : 'Aoede',
  };
}

function readCodexPreferences(): CodexPreferences {
  if (typeof window === 'undefined') return normalizeCodexPreferences({});
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(codexPreferencesKey) || '{}',
    ) as Partial<CodexPreferences>;
    return normalizeCodexPreferences(stored);
  } catch {
    return normalizeCodexPreferences({});
  }
}

function agentStatusPresentation(status: CodexAgentStatus) {
  if (status === 'running') return { label: 'Working', tone: 'working' } as const;
  if (status === 'pendingInit') return { label: 'Starting', tone: 'pending' } as const;
  if (status === 'completed') return { label: 'Complete', tone: 'complete' } as const;
  if (status === 'interrupted') return { label: 'Interrupted', tone: 'warning' } as const;
  if (status === 'errored' || status === 'notFound')
    return { label: 'Needs attention', tone: 'danger' } as const;
  return { label: 'Stopped', tone: 'muted' } as const;
}

function agentName(agent: CodexAgent, index: number) {
  const role = agent.role?.replaceAll('_', ' ').trim();
  if (role) return role.charAt(0).toUpperCase() + role.slice(1);
  return agent.name?.trim() || agent.nickname?.trim() || `Agent ${index + 1}`;
}

function AgentTeamPanel({
  agents,
  clock,
  expandedAgentId,
  onExpandedAgentChange,
  resumingAgentIds,
  resumeState,
  teamKey,
  teamLabel,
}: {
  agents: CodexAgent[];
  clock: number;
  expandedAgentId: string;
  onExpandedAgentChange: (agentId: string) => void;
  resumingAgentIds: Set<string>;
  resumeState?: TeamResumeState;
  teamKey: string;
  teamLabel: string;
}) {
  const activeAgents = agents.filter((agent) => agent.working);
  const completedAgents = agents.filter((agent) => agent.status === 'completed').length;
  const teamAgentIds = new Set(agents.map((agent) => agent.id));
  const teamResumeState =
    resumeState &&
    [...resumeState.agentIds, ...resumeState.failedAgentIds].some((id) => teamAgentIds.has(id))
      ? resumeState
      : undefined;
  const titleId = `codex-agent-team-title-${teamKey.replace(/[^A-Za-z0-9_-]/g, '-')}`;

  return (
    <section aria-label={teamLabel} className="codex-agent-team">
      <header className="codex-agent-team__header">
        <span aria-hidden="true" className="codex-agent-team__icon">
          <UsersRound size={17} />
        </span>
        <span className="codex-agent-team__summary">
          <strong id={titleId}>{teamLabel}</strong>
          <small aria-live="polite">
            {teamResumeState?.agentIds.length
              ? `${teamResumeState.agentIds.length} interrupted ${teamResumeState.agentIds.length === 1 ? 'agent is' : 'agents are'} resuming`
              : `${agents.length} assigned · ${activeAgents.length} working · ${completedAgents} complete`}
          </small>
        </span>
        <span className="codex-agent-team__count">
          {completedAgents}/{agents.length}
        </span>
      </header>
      {teamResumeState?.failedAgentIds.length ? (
        <div className="codex-agent-team__resume has-failure" role="alert">
          <CircleAlert aria-hidden="true" size={16} />
          <span>
            <strong>Some agents need attention</strong>
            <small>
              {teamResumeState.failedAgentIds.length}{' '}
              {teamResumeState.failedAgentIds.length === 1 ? 'agent could' : 'agents could'} not be
              restarted.
            </small>
          </span>
        </div>
      ) : null}
      <div className="codex-agent-team__list">
        {agents.map((agent, index) => {
          const expanded = expandedAgentId === agent.id;
          const agentIsResuming = resumingAgentIds.has(agent.id);
          const presentation = agentIsResuming
            ? ({ label: 'Resuming', tone: 'working' } as const)
            : agentStatusPresentation(agent.status);
          const agentPanelId = `codex-agent-${agent.id}`;
          return (
            <article className="codex-agent-card" data-depth={agent.depth} key={agent.id}>
              <Button
                aria-controls={agentPanelId}
                aria-expanded={expanded}
                className="codex-agent-card__trigger"
                onClick={() => onExpandedAgentChange(expanded ? '' : agent.id)}
                variant="quiet"
              >
                <span
                  aria-hidden="true"
                  className={`codex-agent-card__state codex-agent-card__state--${presentation.tone}`}
                >
                  {agent.status === 'running' || agentIsResuming ? (
                    <LoaderCircle className="is-spinning" size={15} />
                  ) : agent.status === 'completed' ? (
                    <CircleCheck size={15} />
                  ) : agent.status === 'pendingInit' ? (
                    <CircleDot size={15} />
                  ) : (
                    <CircleX size={15} />
                  )}
                </span>
                <span className="codex-agent-card__copy">
                  <span>
                    <strong>{agentName(agent, index)}</strong>
                  </span>
                  <small>{agent.task || 'Preparing an assigned task…'}</small>
                </span>
                <span className="codex-agent-card__meta">
                  <strong>{presentation.label}</strong>
                  <small>
                    {agent.working
                      ? elapsedTime(agent.workingStartedAt ?? agent.createdAt, clock)
                      : 'Details'}
                  </small>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={expanded ? 'is-expanded' : undefined}
                  size={15}
                />
              </Button>
              {expanded ? (
                <div className="codex-agent-card__detail" id={agentPanelId}>
                  {agent.messages.length ? (
                    <div
                      aria-label={`${agentName(agent, index)} results`}
                      className="codex-agent-card__messages"
                    >
                      {agent.messages.map((message) => (
                        <div
                          className={`codex-agent-card__message codex-agent-card__message--${message.role}`}
                          key={message.id}
                        >
                          <strong>Agent result</strong>
                          <MarkdownContent>{message.text}</MarkdownContent>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="codex-agent-card__empty">No result has been reported yet.</p>
                  )}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function activityPresentation(kind: CodexActivityKind) {
  if (kind === 'command') return { icon: SquareTerminal, label: 'Command' };
  if (kind === 'file') return { icon: FilePenLine, label: 'Files' };
  if (kind === 'search') return { icon: Search, label: 'Research' };
  if (kind === 'plan') return { icon: ListChecks, label: 'Plan' };
  if (kind === 'agent') return { icon: UsersRound, label: 'Team' };
  if (kind === 'image') return { icon: Camera, label: 'Visual' };
  if (kind === 'context') return { icon: Activity, label: 'Context' };
  return { icon: Wrench, label: 'Tool' };
}

function activityDuration(durationMs: number | undefined) {
  if (durationMs === undefined) return undefined;
  if (durationMs < 1_000) return `${Math.max(1, Math.round(durationMs))} ms`;
  if (durationMs < 60_000) return `${(durationMs / 1_000).toFixed(durationMs < 10_000 ? 1 : 0)} s`;
  return `${Math.floor(durationMs / 60_000)}m ${Math.round((durationMs % 60_000) / 1_000)}s`;
}

function usageWindowLabel(windowDurationMins: number | undefined, index: number) {
  if (!windowDurationMins) return index === 0 ? 'Current quota window' : 'Additional quota window';
  if (windowDurationMins % (24 * 60) === 0) {
    const days = windowDurationMins / (24 * 60);
    return `${days}-day usage`;
  }
  if (windowDurationMins % 60 === 0) {
    const hours = windowDurationMins / 60;
    return `${hours}-hour usage`;
  }
  return `${windowDurationMins}-minute usage`;
}

function usageResetLabel(resetsAt: number | undefined) {
  if (!resetsAt) return undefined;
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(new Date(resetsAt * 1_000));
}

function CodexSubscriptionUsage({ usage }: { usage: CodexStatus['subscriptionUsage'] }) {
  const windows = [usage?.primary, usage?.secondary].filter((window): window is CodexUsageWindow =>
    Boolean(window),
  );
  return (
    <section aria-labelledby="codex-subscription-usage-title" className="codex-subscription-usage">
      <header>
        <span>
          <strong id="codex-subscription-usage-title">Codex subscription usage</strong>
          <small>Live usage from your signed-in ChatGPT plan</small>
        </span>
        {windows.length === 1 ? (
          <strong className="codex-subscription-usage__total">
            {windows[0].usedPercent}% used
          </strong>
        ) : null}
      </header>
      {windows.length ? (
        <div className="codex-subscription-usage__windows">
          {windows.map((window, index) => {
            const label = usageWindowLabel(window.windowDurationMins, index);
            const resetLabel = usageResetLabel(window.resetsAt);
            return (
              <div className="codex-subscription-usage__window" key={`${label}-${index}`}>
                <span className="codex-subscription-usage__labels">
                  <small>{label}</small>
                  {windows.length > 1 ? <strong>{window.usedPercent}% used</strong> : null}
                </span>
                <span
                  aria-label={`${label}: ${window.usedPercent}% used`}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={window.usedPercent}
                  className="codex-subscription-usage__meter"
                  role="progressbar"
                >
                  <span style={{ width: `${window.usedPercent}%` }} />
                </span>
                <small>{resetLabel ? `Resets ${resetLabel}` : 'Reset time unavailable'}</small>
              </div>
            );
          })}
        </div>
      ) : (
        <p>Usage is temporarily unavailable. Your Codex chat remains connected.</p>
      )}
    </section>
  );
}

function CodexChatActivity({ activity, entering }: { activity: CodexActivity; entering: boolean }) {
  const presentation = activityPresentation(activity.kind);
  const Icon = presentation.icon;
  const duration = activityDuration(activity.durationMs);
  const stateLabel =
    activity.status === 'running'
      ? 'Running'
      : activity.status === 'failed'
        ? 'Needs attention'
        : 'Complete';
  return (
    <article
      aria-current={activity.status === 'running' ? 'step' : undefined}
      className={`codex-chat-activity codex-chat-activity--${activity.status}${entering ? ' is-entering' : ''}`}
      data-activity-id={activity.id}
      data-activity-status={activity.status}
    >
      <span aria-hidden="true" className="codex-chat-activity__marker">
        {activity.status === 'completed' ? (
          <Check size={14} />
        ) : activity.status === 'failed' ? (
          <CircleAlert size={14} />
        ) : (
          <Icon size={14} />
        )}
      </span>
      <span className="codex-chat-activity__copy">
        <span className="codex-chat-activity__meta">
          <small>Workspace activity · {presentation.label}</small>
          <span className="codex-chat-activity__state">
            {stateLabel}
            {duration ? <small> · {duration}</small> : null}
          </span>
        </span>
        <strong>{activity.label}</strong>
        {activity.detail ? <small>{activity.detail}</small> : null}
        {activity.outcome ? (
          <span className="codex-chat-activity__outcome">
            <CornerDownRight aria-hidden="true" size={13} />
            <span>
              <small>{activity.status === 'running' ? 'Live status' : 'Observed result'}</small>
              <span>{activity.outcome}</span>
            </span>
          </span>
        ) : null}
      </span>
    </article>
  );
}

function CodexConversationLoading({ transition }: { transition: ConversationTransition }) {
  const creating = transition.kind === 'create';
  const branching = transition.kind === 'branch';
  return (
    <div className="codex-conversation-loading" role="status">
      <div className="codex-conversation-loading__status">
        <span aria-hidden="true" className="codex-conversation-loading__icon">
          <Bot size={19} />
        </span>
        <span className="codex-conversation-loading__copy">
          <strong>
            {creating
              ? 'Starting a new chat'
              : branching
                ? 'Branching conversation'
                : 'Opening conversation'}
          </strong>
          <small>
            {creating
              ? 'Preparing a fresh Codex workspace…'
              : branching
                ? 'Copying context through the selected reply…'
                : `Loading ${transition.label}…`}
          </small>
        </span>
        <span aria-hidden="true" className="codex-conversation-loading__dots">
          <span />
          <span />
          <span />
        </span>
      </div>
      <div aria-hidden="true" className="codex-conversation-loading__skeletons">
        <span className="codex-conversation-loading__skeleton is-assistant">
          <i />
          <i />
          <i />
        </span>
        <span className="codex-conversation-loading__skeleton is-user">
          <i />
          <i />
        </span>
        <span className="codex-conversation-loading__skeleton is-assistant is-short">
          <i />
          <i />
        </span>
      </div>
    </div>
  );
}

function readCodexDraft(workspaceDirectory?: string) {
  if (typeof window === 'undefined') return '';
  return (
    window.localStorage.getItem(scopedStorageKey(codexDraftKey, workspaceDirectory)) || ''
  ).slice(0, 4_000);
}

function readPhotoFile(file: File) {
  if (!supportedPhotoTypes.has(file.type)) {
    throw new Error('Choose a JPEG, PNG, or WebP photo.');
  }
  if (!file.size || file.size > maximumPhotoBytes) {
    throw new Error('Choose a photo smaller than 15 MB.');
  }
  return new Promise<string>((resolvePhoto, reject) => {
    const reader = new FileReader();
    reader.addEventListener(
      'load',
      () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        if (!result.startsWith(`data:${file.type};base64,`)) {
          reject(new Error('The selected photo could not be read.'));
          return;
        }
        resolvePhoto(result);
      },
      { once: true },
    );
    reader.addEventListener(
      'error',
      () => reject(new Error('The selected photo could not be read.')),
      { once: true },
    );
    reader.readAsDataURL(file);
  });
}

type BrowserCaptureMessage = {
  source?: string;
  type?: string;
  requestId?: string;
  screenshot?: string;
  detail?: string;
};

type WorkspaceCaptureContext = {
  url: string;
  title: string;
  scrollX: number;
  scrollY: number;
  viewportWidth: number;
  viewportHeight: number;
};

function browserCaptureRequest(type: 'ping' | 'capture', timeoutMs = 8_000) {
  return new Promise<string | undefined>((resolveCapture, reject) => {
    const requestId = crypto.randomUUID();
    const timeout = window.setTimeout(() => {
      window.removeEventListener('message', receiveCapture);
      if (type === 'ping') resolveCapture(undefined);
      else reject(new Error('The Made Solid browser capture helper did not respond.'));
    }, timeoutMs);
    function receiveCapture(event: MessageEvent<BrowserCaptureMessage>) {
      if (
        event.source !== window ||
        event.data?.source !== browserCaptureSource ||
        event.data?.requestId !== requestId ||
        event.data?.type !== `${type}-result`
      )
        return;
      window.clearTimeout(timeout);
      window.removeEventListener('message', receiveCapture);
      if (event.data.detail) reject(new Error(event.data.detail));
      else resolveCapture(event.data.screenshot || 'ready');
    }
    window.addEventListener('message', receiveCapture);
    window.postMessage({ source: browserCaptureSource, type, requestId }, window.location.origin);
  });
}

function selectedRectangle(selection?: Selection) {
  if (!selection) return undefined;
  const left = Math.min(selection.start.x, selection.end.x);
  const top = Math.min(selection.start.y, selection.end.y);
  return {
    left,
    top,
    width: Math.abs(selection.end.x - selection.start.x),
    height: Math.abs(selection.end.y - selection.start.y),
  };
}

function waitForVideo(video: HTMLVideoElement) {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA && video.videoWidth)
    return Promise.resolve();
  return new Promise<void>((resolveVideo, reject) => {
    video.addEventListener('loadedmetadata', () => resolveVideo(), { once: true });
    video.addEventListener(
      'error',
      () => reject(new Error('The shared screen could not be read.')),
      {
        once: true,
      },
    );
  });
}

function requestSharedScreen(preferCurrentTab = false) {
  if (!sharedScreenSupported()) {
    throw new Error('Screen capture is not supported in this browser.');
  }
  const options: DisplayMediaStreamOptions & {
    monitorTypeSurfaces?: 'include' | 'exclude';
    preferCurrentTab?: boolean;
    selfBrowserSurface?: 'include' | 'exclude';
    surfaceSwitching?: 'include' | 'exclude';
  } = {
    audio: false,
    video: { displaySurface: 'browser' },
  };
  if (preferCurrentTab) {
    options.monitorTypeSurfaces = 'exclude';
    options.preferCurrentTab = true;
    options.selfBrowserSurface = 'include';
    options.surfaceSwitching = 'exclude';
  }
  return navigator.mediaDevices.getDisplayMedia(options);
}

function sharedScreenSupported() {
  const mediaDevices = navigator.mediaDevices as
    (MediaDevices & { getDisplayMedia?: MediaDevices['getDisplayMedia'] }) | undefined;
  return typeof mediaDevices?.getDisplayMedia === 'function';
}

async function captureSharedScreen(streamRequest = requestSharedScreen()) {
  const stream = await streamRequest;
  try {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();
    await waitForVideo(video);
    await new Promise<void>((resolveFrame) => requestAnimationFrame(() => resolveFrame()));
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('The screenshot canvas is unavailable.');
    context.drawImage(video, 0, 0);
    return canvas.toDataURL('image/png');
  } finally {
    for (const track of stream.getTracks()) track.stop();
  }
}

function modelEffort(model: CodexModel | undefined, requested: string) {
  if (!model) return '';
  return model.efforts.some((effort) => effort.id === requested)
    ? requested
    : model.defaultEffort || model.efforts[0]?.id || 'medium';
}

function elapsedTime(activeTurnStartedAt: number | undefined, now: number) {
  if (!activeTurnStartedAt) return 'Working now';
  const startedAt =
    activeTurnStartedAt < 1_000_000_000_000 ? activeTurnStartedAt * 1_000 : activeTurnStartedAt;
  const elapsedSeconds = Math.max(0, Math.floor((now - startedAt) / 1_000));
  const hours = Math.floor(elapsedSeconds / 3_600);
  const minutes = Math.floor((elapsedSeconds % 3_600) / 60);
  const seconds = elapsedSeconds % 60;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  return `${seconds}s`;
}

function timestampMilliseconds(timestamp: number | undefined) {
  if (!timestamp) return undefined;
  return timestamp < 1_000_000_000_000 ? timestamp * 1_000 : timestamp;
}

function lastUsedTime(timestamp: number | undefined, now: number) {
  const usedAt = timestampMilliseconds(timestamp);
  if (!usedAt) return 'No recent activity';
  const elapsedSeconds = Math.max(0, Math.floor((now - usedAt) / 1_000));
  if (elapsedSeconds < 60) return 'Just now';
  if (elapsedSeconds < 3_600) return `${Math.floor(elapsedSeconds / 60)}m ago`;
  if (elapsedSeconds < 86_400) return `${Math.floor(elapsedSeconds / 3_600)}h ago`;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(usedAt);
}

function threadTitle(thread: CodexThread | undefined) {
  return codexConversationTitle(thread);
}

function threadLastUsedAt(thread: CodexThread | undefined) {
  const timestamps = [thread?.updatedAt, thread?.workingStartedAt].filter(
    (timestamp): timestamp is number => typeof timestamp === 'number',
  );
  return timestamps.length ? Math.max(...timestamps) : undefined;
}

async function waitForHiddenCaptureUi() {
  await new Promise<void>((resolvePaint) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolvePaint())),
  );
  const closingDialog = document.querySelector<HTMLElement>(
    '.codex-chat-dialog[data-state="closed"]',
  );
  if (closingDialog) {
    await Promise.all(
      closingDialog.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
    );
  }
  await new Promise<void>((resolvePaint) => requestAnimationFrame(() => resolvePaint()));
}

function loadCloudSpeechSegment(blob: Blob, signal: AbortSignal): Promise<CloudSpeechSegment> {
  return new Promise((resolveSegment, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.preload = 'metadata';
    let settled = false;
    const abort = () => finish(new DOMException('Speech loading was stopped.', 'AbortError'));
    const failed = () => finish(new Error('The generated speech audio could not be loaded.'));
    const loaded = () => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
        failed();
        return;
      }
      finish();
    };
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
      audio.removeEventListener('loadedmetadata', loaded);
      audio.removeEventListener('error', failed);
      if (error) {
        URL.revokeObjectURL(url);
        reject(error);
        return;
      }
      resolveSegment({ audio, duration: audio.duration, url });
    };
    const timeout = window.setTimeout(
      () => finish(new Error('The generated speech audio took too long to load.')),
      15_000,
    );
    signal.addEventListener('abort', abort, { once: true });
    audio.addEventListener('loadedmetadata', loaded, { once: true });
    audio.addEventListener('error', failed, { once: true });
    audio.load();
  });
}

export function CodexFeedbackPanel({
  embedded = false,
  page = false,
  portalContainer,
  workspaceDirectory,
}: {
  embedded?: boolean;
  page?: boolean;
  portalContainer?: HTMLElement | null;
  workspaceDirectory?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const conversationTriggerRef = useRef<HTMLButtonElement>(null);
  const chatPreferencesTriggerRef = useRef<HTMLButtonElement>(null);
  const conversationPickerRef = useRef<HTMLDivElement>(null);
  const conversationTransitionIdRef = useRef(0);
  const conversationTransitionRef = useRef<ConversationTransition>();
  const statusRefreshInFlightRef = useRef(0);
  const initialChatSessionRef = useRef(readCodexChatSession(workspaceDirectory));
  const initialConversationLifecycleRef = useRef(readCodexConversationLifecycle());
  const workingByThreadRef = useRef(initialConversationLifecycleRef.current.workingByThread);
  const unseenCompletionThreadIdsRef = useRef(
    new Set(initialConversationLifecycleRef.current.unseenCompletionThreadIds),
  );
  const deletedThreadIdsRef = useRef(new Set<string>());
  const knownTimelineIdsRef = useRef(new Set<string>());
  const knownTimelineThreadRef = useRef('');
  const timelineAnimationTimerRef = useRef<number>();
  const previousChatScrollTopRef = useRef(0);
  const restoredChatThreadRef = useRef('');
  const chatSessionRef = useRef(initialChatSessionRef.current);
  const composerTextareaRef = useRef<HTMLTextAreaElement>(null);
  const temporaryQuestionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const temporaryQuestionAbortRef = useRef<AbortController>();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const chatFollowingLatestRef = useRef(true);
  const selectionImageRef = useRef<HTMLImageElement>(null);
  const selectionPointerRef = useRef<{ pointerId: number; start: Point }>();
  const speechRunRef = useRef(0);
  const speechChunksRef = useRef<string[]>([]);
  const speechChunkIndexRef = useRef(0);
  const speechMessageIdRef = useRef('');
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance>();
  const speechNextChunkTimerRef = useRef<number>();
  const speechWatchdogTimerRef = useRef<number>();
  const speechProgressTimerRef = useRef<number>();
  const speechElapsedBeforePlayRef = useRef(0);
  const speechStartedAtRef = useRef(0);
  const speechEstimatedTotalRef = useRef(0);
  const speechSourceRef = useRef<'device' | 'google'>('device');
  const speechInitiatorRef = useRef<'auto' | 'manual'>('manual');
  const speechAutoPhaseRef = useRef<'progress' | 'final'>('final');
  const autoReadSeenMessageIdsRef = useRef(new Set<string>());
  const autoReadThreadIdRef = useRef('');
  const cloudSpeechSegmentsRef = useRef<Array<CloudSpeechSegment | undefined>>([]);
  const cloudSpeechSegmentPromisesRef = useRef<Array<Promise<CloudSpeechSegment>>>([]);
  const cloudSpeechChunkTextsRef = useRef<string[]>([]);
  const cloudSpeechWordStartsRef = useRef<number[]>([]);
  const cloudSpeechSegmentIndexRef = useRef(0);
  const cloudSpeechAbortRef = useRef<AbortController>();
  const voicePreviewAudioRef = useRef<HTMLAudioElement>();
  const voicePreviewUrlRef = useRef('');
  const voicePreviewAbortRef = useRef<AbortController>();
  const speechMarkdownRef = useRef('');
  const speechWordOffsetRef = useRef(0);
  const [isSupported, setIsSupported] = useState<boolean>();
  const [mountedChatLog, setMountedChatLog] = useState<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<PanelPhase>(() =>
    page || initialChatSessionRef.current.isOpen ? 'compose' : 'closed',
  );
  const [status, setStatus] = useState<CodexStatus>();
  const [enteringTimelineIds, setEnteringTimelineIds] = useState<Set<string>>(() => new Set());
  const [selectedModelId, setSelectedModelId] = useState(() => readCodexPreferences().modelId);
  const [selectedEffort, setSelectedEffort] = useState(() => {
    const preferences = readCodexPreferences();
    return preferences.effortByModel[preferences.modelId] || '';
  });
  const [effortPreferences, setEffortPreferences] = useState(
    () => readCodexPreferences().effortByModel,
  );
  const [workMode, setWorkMode] = useState<'direct' | 'team'>(
    () => readCodexPreferences().workMode,
  );
  const [fastMode, setFastMode] = useState(() => readCodexPreferences().fastMode);
  const [selectedThreadId, setSelectedThreadId] = useState(
    initialChatSessionRef.current.selectedThreadId,
  );
  const [conversationPickerOpen, setConversationPickerOpen] = useState(false);
  const statusRequestSequenceRef = useRef(0);
  const selectedThreadIdRef = useRef(initialChatSessionRef.current.selectedThreadId);
  const selectedThreadScopeRef = useRef(initialChatSessionRef.current.selectedThreadScope);
  const [sourceScreenshot, setSourceScreenshot] = useState('');
  const [selection, setSelection] = useState<Selection>();
  const [draftAttachments, setDraftAttachments] = useState<DraftAttachment[]>([]);
  const [prompt, setPrompt] = useState(() => readCodexDraft(workspaceDirectory));
  const [selectedExcerpt, setSelectedExcerpt] = useState<CodexExcerpt>();
  const [temporaryQuestion, setTemporaryQuestion] = useState<TemporaryQuestion>();
  const [error, setError] = useState<string>();
  const [browserCaptureAvailable, setBrowserCaptureAvailable] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const [unseenCompletionThreadIds, setUnseenCompletionThreadIds] = useState(
    () => new Set(initialConversationLifecycleRef.current.unseenCompletionThreadIds),
  );
  const [pendingChatMessage, setPendingChatMessage] = useState<{
    id: string;
    text: string;
    threadId: string;
  }>();
  const [pendingVisualMessage, setPendingVisualMessage] = useState<{
    id: string;
    text: string;
    images: string[];
    threadId: string;
  }>();
  const [expandedQueueId, setExpandedQueueId] = useState('');
  const [queuedEdits, setQueuedEdits] = useState<Record<string, string>>({});
  const [queueActionId, setQueueActionId] = useState('');
  const [queueActionError, setQueueActionError] = useState('');
  const [deleteQueueId, setDeleteQueueId] = useState('');
  const [isStoppingTurn, setIsStoppingTurn] = useState(false);
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [deleteConversationId, setDeleteConversationId] = useState('');
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);
  const [deleteConversationError, setDeleteConversationError] = useState('');
  const [conversationTransition, setConversationTransition] = useState<ConversationTransition>();
  const [isResumingThread, setIsResumingThread] = useState(false);
  const [teamResumeState, setTeamResumeState] = useState<TeamResumeState>();
  const [workspaceCaptureContext, setWorkspaceCaptureContext] = useState<WorkspaceCaptureContext>();
  const [captureDetail, setCaptureDetail] = useState('');
  const [isChatFollowingLatest, setIsChatFollowingLatest] = useState(true);
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const [composerSettingsOpen, setComposerSettingsOpen] = useState(false);
  const [chatPreferencesOpen, setChatPreferencesOpen] = useState(false);
  const [billingModeChanging, setBillingModeChanging] = useState(false);
  const [isPreparingPhoto, setIsPreparingPhoto] = useState(false);
  const [expandedAgentId, setExpandedAgentId] = useState('');
  const [speechMessageId, setSpeechMessageId] = useState('');
  const [speechPlaybackState, setSpeechPlaybackState] = useState<SpeechPlaybackState>('idle');
  const [speechStatus, setSpeechStatus] = useState('');
  const [speechProgress, setSpeechProgress] = useState<SpeechProgress>();
  const [autoReadPending, setAutoReadPending] = useState<AutoReadMessage>();
  const [speechActiveWordIndex, setSpeechActiveWordIndex] = useState<number>();
  const [cloudSpeechConfiguration, setCloudSpeechConfiguration] =
    useState<CloudSpeechConfiguration>();
  const [selectedSpeechVoice, setSelectedSpeechVoice] = useState(
    () => readCodexPreferences().speechVoice,
  );
  const [selectedSpeechLanguage, setSelectedSpeechLanguage] = useState(
    () => readCodexPreferences().speechLanguage,
  );
  const [selectedSpeechStyle, setSelectedSpeechStyle] = useState<CodexSpeechStyle>(
    () => readCodexPreferences().speechStyle,
  );
  const [selectedSpeechRate, setSelectedSpeechRate] = useState(
    () => readCodexPreferences().speechRate,
  );
  const [autoReadCodex, setAutoReadCodex] = useState(() => readCodexPreferences().autoReadCodex);
  const [runtimePreferencesReady, setRuntimePreferencesReady] = useState(false);
  const [runtimePreferencesHydrated, setRuntimePreferencesHydrated] = useState(false);
  const [selectedSpeechModel, setSelectedSpeechModel] = useState('chirp3-hd');
  const [voicePreviewState, setVoicePreviewState] = useState<'idle' | 'loading' | 'playing'>(
    'idle',
  );

  const deviceSpeechSupported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window;
  const speechSupported = deviceSpeechSupported || cloudSpeechConfiguration?.available === true;
  const selectedCloudSpeechVoice = cloudSpeechConfiguration?.voices.find(
    ({ id }) => id === selectedSpeechVoice,
  );
  const speechLanguages = useMemo(
    () =>
      [...new Set((cloudSpeechConfiguration?.voices ?? []).map(({ languageCode }) => languageCode))]
        .map((code) => {
          try {
            return {
              code,
              label:
                new Intl.DisplayNames([navigator.language || 'en'], { type: 'language' }).of(
                  code,
                ) ?? code,
            };
          } catch {
            return { code, label: code };
          }
        })
        .sort((left, right) => left.label.localeCompare(right.label)),
    [cloudSpeechConfiguration?.voices],
  );
  const speechModels = useMemo(() => {
    const unique = new Map<string, CloudSpeechVoice>();
    for (const voice of cloudSpeechConfiguration?.voices ?? []) {
      if (voice.languageCode === selectedSpeechLanguage && !unique.has(voice.model)) {
        unique.set(voice.model, voice);
      }
    }
    return [...unique.values()].sort((left, right) => left.qualityRank - right.qualityRank);
  }, [cloudSpeechConfiguration?.voices, selectedSpeechLanguage]);
  const filteredSpeechVoices = useMemo(
    () =>
      (cloudSpeechConfiguration?.voices ?? []).filter(
        ({ languageCode, model }) =>
          languageCode === selectedSpeechLanguage && model === selectedSpeechModel,
      ),
    [cloudSpeechConfiguration?.voices, selectedSpeechLanguage, selectedSpeechModel],
  );
  const selectedSpeechLanguageLabel =
    speechLanguages.find(({ code }) => code === selectedSpeechLanguage)?.label ??
    selectedSpeechLanguage;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void studioRuntimeFetch(codexPreferencesEndpoint, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Saved Codex preferences are unavailable.');
        return (await response.json()) as { preferences?: Partial<CodexPreferences> | null };
      })
      .then(({ preferences }) => {
        if (!active) return;
        if (preferences) {
          const saved = normalizeCodexPreferences(preferences);
          setSelectedModelId(saved.modelId);
          setEffortPreferences(saved.effortByModel);
          setSelectedEffort(saved.effortByModel[saved.modelId] || '');
          setWorkMode(saved.workMode);
          setFastMode(saved.fastMode);
          setAutoReadCodex(saved.autoReadCodex);
          setSelectedSpeechLanguage(saved.speechLanguage);
          setSelectedSpeechRate(saved.speechRate);
          setSelectedSpeechStyle(saved.speechStyle);
          setSelectedSpeechVoice(saved.speechVoice);
        }
        setRuntimePreferencesReady(true);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setRuntimePreferencesHydrated(true);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const stopVoicePreview = useCallback(() => {
    voicePreviewAbortRef.current?.abort();
    voicePreviewAbortRef.current = undefined;
    const audio = voicePreviewAudioRef.current;
    if (audio) {
      audio.pause();
      audio.onended = null;
      audio.onerror = null;
    }
    voicePreviewAudioRef.current = undefined;
    if (voicePreviewUrlRef.current) URL.revokeObjectURL(voicePreviewUrlRef.current);
    voicePreviewUrlRef.current = '';
    setVoicePreviewState('idle');
  }, []);

  const clearCloudSpeech = useCallback(() => {
    cloudSpeechAbortRef.current?.abort();
    cloudSpeechAbortRef.current = undefined;
    for (const segment of cloudSpeechSegmentsRef.current) {
      if (!segment) continue;
      segment.audio.pause();
      segment.audio.onended = null;
      segment.audio.ontimeupdate = null;
      segment.audio.onerror = null;
      URL.revokeObjectURL(segment.url);
    }
    cloudSpeechSegmentsRef.current = [];
    cloudSpeechSegmentPromisesRef.current = [];
    cloudSpeechChunkTextsRef.current = [];
    cloudSpeechWordStartsRef.current = [];
    cloudSpeechSegmentIndexRef.current = 0;
  }, []);

  const clearSpeechTimers = useCallback(() => {
    if (speechNextChunkTimerRef.current !== undefined) {
      window.clearTimeout(speechNextChunkTimerRef.current);
      speechNextChunkTimerRef.current = undefined;
    }
    if (speechWatchdogTimerRef.current !== undefined) {
      window.clearTimeout(speechWatchdogTimerRef.current);
      speechWatchdogTimerRef.current = undefined;
    }
    if (speechProgressTimerRef.current !== undefined) {
      window.clearInterval(speechProgressTimerRef.current);
      speechProgressTimerRef.current = undefined;
    }
  }, []);

  const currentSpeechElapsedSeconds = useCallback(() => {
    const activeElapsed = speechStartedAtRef.current
      ? Math.max(0, Date.now() - speechStartedAtRef.current)
      : 0;
    return Math.floor((speechElapsedBeforePlayRef.current + activeElapsed) / 1000);
  }, []);

  const updateSpeechProgress = useCallback(() => {
    const elapsedSeconds = currentSpeechElapsedSeconds();
    const totalSeconds = Math.max(speechEstimatedTotalRef.current, elapsedSeconds + 1);
    setSpeechProgress({ elapsedSeconds, totalSeconds });
  }, [currentSpeechElapsedSeconds]);

  const stopCodexSpeech = useCallback(
    (announce = true) => {
      const wasActive = Boolean(speechMessageIdRef.current);
      speechRunRef.current += 1;
      clearSpeechTimers();
      clearCloudSpeech();
      stopVoicePreview();
      speechUtteranceRef.current = undefined;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      speechChunksRef.current = [];
      speechChunkIndexRef.current = 0;
      speechMessageIdRef.current = '';
      speechElapsedBeforePlayRef.current = 0;
      speechStartedAtRef.current = 0;
      speechEstimatedTotalRef.current = 0;
      speechSourceRef.current = 'device';
      speechMarkdownRef.current = '';
      speechWordOffsetRef.current = 0;
      setSpeechMessageId('');
      setSpeechPlaybackState('idle');
      setSpeechProgress(undefined);
      setSpeechActiveWordIndex(undefined);
      if (announce && wasActive) setSpeechStatus('Reading stopped.');
    },
    [clearCloudSpeech, clearSpeechTimers, stopVoicePreview],
  );

  const playStoredCodexSpeech = useCallback(
    (messageId: string) => {
      if (
        typeof window === 'undefined' ||
        !('speechSynthesis' in window) ||
        !('SpeechSynthesisUtterance' in window)
      )
        return;
      const synthesis = window.speechSynthesis;
      const runId = speechRunRef.current + 1;
      speechRunRef.current = runId;
      speechMessageIdRef.current = messageId;
      setSpeechMessageId(messageId);
      setSpeechPlaybackState('playing');
      setSpeechStatus('Reading Codex reply in English using your device voice.');
      speechStartedAtRef.current = Date.now();
      if (speechProgressTimerRef.current !== undefined) {
        window.clearInterval(speechProgressTimerRef.current);
      }
      updateSpeechProgress();
      speechProgressTimerRef.current = window.setInterval(updateSpeechProgress, 500);

      const finishReading = () => {
        if (speechRunRef.current !== runId) return;
        clearSpeechTimers();
        speechUtteranceRef.current = undefined;
        speechMessageIdRef.current = '';
        speechElapsedBeforePlayRef.current = 0;
        speechStartedAtRef.current = 0;
        speechEstimatedTotalRef.current = 0;
        setSpeechMessageId('');
        setSpeechPlaybackState('idle');
        setSpeechProgress(undefined);
        setSpeechActiveWordIndex(undefined);
        setSpeechStatus('Finished reading Codex reply.');
      };

      const failReading = () => {
        if (speechRunRef.current !== runId) return;
        clearSpeechTimers();
        speechUtteranceRef.current = undefined;
        speechMessageIdRef.current = '';
        speechElapsedBeforePlayRef.current = 0;
        speechStartedAtRef.current = 0;
        speechEstimatedTotalRef.current = 0;
        setSpeechMessageId('');
        setSpeechPlaybackState('idle');
        setSpeechProgress(undefined);
        setSpeechActiveWordIndex(undefined);
        setSpeechStatus('Your device voice could not read this reply. Try Read again.');
      };

      const speakNextChunk = () => {
        if (speechRunRef.current !== runId || speechMessageIdRef.current !== messageId) return;
        const chunkIndex = speechChunkIndexRef.current;
        const chunk = speechChunksRef.current[chunkIndex];
        if (!chunk) {
          finishReading();
          return;
        }

        const utterance = new window.SpeechSynthesisUtterance(chunk);
        const voice = preferredEnglishSpeechVoice(synthesis.getVoices(), selectedSpeechLanguage);
        utterance.lang = voice?.lang || selectedSpeechLanguage || codexSpeechLanguage;
        if (voice) utterance.voice = voice;
        utterance.rate = codexSpeechRate * selectedSpeechRate;
        utterance.pitch = 1;
        speechUtteranceRef.current = utterance;
        let settled = false;
        let started = false;
        const queuedAt = Date.now();

        const advance = () => {
          if (
            settled ||
            speechRunRef.current !== runId ||
            speechMessageIdRef.current !== messageId ||
            speechChunkIndexRef.current !== chunkIndex ||
            speechUtteranceRef.current !== utterance
          )
            return;
          settled = true;
          if (speechWatchdogTimerRef.current !== undefined) {
            window.clearTimeout(speechWatchdogTimerRef.current);
            speechWatchdogTimerRef.current = undefined;
          }
          speechUtteranceRef.current = undefined;
          speechChunkIndexRef.current += 1;
          speechNextChunkTimerRef.current = window.setTimeout(() => {
            speechNextChunkTimerRef.current = undefined;
            speakNextChunk();
          }, 80);
        };

        const watchForSilentCompletion = () => {
          if (settled || speechRunRef.current !== runId || speechUtteranceRef.current !== utterance)
            return;
          const waitedForStart = Date.now() - queuedAt >= 5000;
          if (!synthesis.speaking && !synthesis.pending && (started || waitedForStart)) {
            advance();
            return;
          }
          speechWatchdogTimerRef.current = window.setTimeout(watchForSilentCompletion, 750);
        };

        utterance.onstart = () => {
          started = true;
          const precedingWords = speechChunksRef.current
            .slice(0, chunkIndex)
            .reduce((total, previousChunk) => total + codexSpeechWords(previousChunk).length, 0);
          setSpeechActiveWordIndex(speechWordOffsetRef.current + precedingWords);
        };
        utterance.onboundary = (event) => {
          if (speechRunRef.current !== runId || event.name !== 'word') return;
          const precedingWords = speechChunksRef.current
            .slice(0, chunkIndex)
            .reduce((total, previousChunk) => total + codexSpeechWords(previousChunk).length, 0);
          const localWordIndex = codexSpeechWords(chunk.slice(0, event.charIndex)).length;
          setSpeechActiveWordIndex(speechWordOffsetRef.current + precedingWords + localWordIndex);
        };
        utterance.onend = advance;
        utterance.onerror = (event) => {
          if (
            speechRunRef.current !== runId ||
            event.error === 'canceled' ||
            event.error === 'interrupted'
          )
            return;
          failReading();
        };
        synthesis.speak(utterance);
        speechWatchdogTimerRef.current = window.setTimeout(watchForSilentCompletion, 1500);
      };

      speakNextChunk();
    },
    [clearSpeechTimers, selectedSpeechLanguage, selectedSpeechRate, updateSpeechProgress],
  );

  const readDeviceCodexReply = useCallback(
    (
      messageId: string,
      markdown: string,
      startWord = 0,
      initiator: 'auto' | 'manual' = 'manual',
      autoPhase: 'progress' | 'final' = 'final',
    ) => {
      stopCodexSpeech(false);
      speechInitiatorRef.current = initiator;
      speechAutoPhaseRef.current = autoPhase;
      const speechText = codexSpeechTextFromWord(markdown, startWord, selectedSpeechStyle);
      const chunks = codexSpeechChunks(speechText, 260, selectedSpeechStyle);
      if (!chunks.length) {
        setSpeechStatus('This Codex reply has no readable text.');
        return;
      }
      speechChunksRef.current = chunks;
      speechMarkdownRef.current = markdown;
      speechWordOffsetRef.current = startWord;
      speechChunkIndexRef.current = 0;
      speechElapsedBeforePlayRef.current = 0;
      speechStartedAtRef.current = 0;
      speechEstimatedTotalRef.current = estimatedCodexSpeechSeconds(chunks);
      setSpeechProgress({
        elapsedSeconds: 0,
        totalSeconds: speechEstimatedTotalRef.current,
      });
      setSpeechActiveWordIndex(startWord);
      playStoredCodexSpeech(messageId);
    },
    [playStoredCodexSpeech, selectedSpeechStyle, stopCodexSpeech],
  );

  const playCloudSpeechSegments = useCallback(
    (messageId: string, runId: number, shouldPlay = true) => {
      const segments = cloudSpeechSegmentsRef.current;
      if (!segments.length || speechRunRef.current !== runId) return;
      speechSourceRef.current = 'google';
      speechMessageIdRef.current = messageId;
      setSpeechMessageId(messageId);
      setSpeechPlaybackState(shouldPlay ? 'playing' : 'paused');
      setSpeechStatus(
        shouldPlay ? `Reading Codex reply with Google ${selectedSpeechVoice}.` : 'Reading paused.',
      );

      const totalSeconds = () =>
        segments.reduce(
          (total, segment, index) =>
            total +
            (segment?.duration ??
              estimatedCodexSpeechSeconds([cloudSpeechChunkTextsRef.current[index]])),
          0,
        );
      const playSegment = async (index: number, autoplay = true) => {
        if (speechRunRef.current !== runId || speechMessageIdRef.current !== messageId) return;
        if (index >= segments.length) {
          stopCodexSpeech(false);
          setSpeechStatus('Finished reading Codex reply.');
          return;
        }
        let segment = segments[index];
        if (!segment) {
          setSpeechPlaybackState('loading');
          setSpeechStatus(`Buffering Google ${selectedSpeechVoice}…`);
          try {
            segment = await cloudSpeechSegmentPromisesRef.current[index];
          } catch {
            if (speechRunRef.current !== runId) return;
            stopCodexSpeech(false);
            setSpeechStatus('Google speech stopped unexpectedly. Try Read again.');
            return;
          }
        }
        if (speechRunRef.current !== runId || speechMessageIdRef.current !== messageId) return;
        cloudSpeechSegmentIndexRef.current = index;
        const elapsedBefore = segments
          .slice(0, index)
          .reduce(
            (total, previous, previousIndex) =>
              total +
              (previous?.duration ??
                estimatedCodexSpeechSeconds([cloudSpeechChunkTextsRef.current[previousIndex]])),
            0,
          );
        const updateProgress = () => {
          if (speechRunRef.current !== runId) return;
          const localWordIndex = codexSpeechWordAtTime(
            cloudSpeechChunkTextsRef.current[index],
            segment.duration,
            segment.audio.currentTime,
          );
          setSpeechActiveWordIndex(
            speechWordOffsetRef.current + cloudSpeechWordStartsRef.current[index] + localWordIndex,
          );
          setSpeechProgress({
            elapsedSeconds: Math.floor(elapsedBefore + segment.audio.currentTime),
            totalSeconds: Math.ceil(totalSeconds()),
          });
        };
        segment.audio.ontimeupdate = updateProgress;
        segment.audio.onended = () => void playSegment(index + 1);
        segment.audio.onerror = () => {
          stopCodexSpeech(false);
          setSpeechStatus('Google speech stopped unexpectedly. Try Read again.');
        };
        updateProgress();
        if (!autoplay) return;
        setSpeechPlaybackState('playing');
        setSpeechStatus(`Reading Codex reply with Google ${selectedSpeechVoice}.`);
        void segment.audio.play().catch(() => {
          if (speechRunRef.current !== runId) return;
          setSpeechPlaybackState('paused');
          setSpeechStatus('Google speech is ready. Press Resume to start playback.');
        });
      };

      void playSegment(cloudSpeechSegmentIndexRef.current, shouldPlay);
    },
    [selectedSpeechVoice, stopCodexSpeech],
  );

  const readCloudCodexReply = useCallback(
    async (
      messageId: string,
      markdown: string,
      startWord = 0,
      initiator: 'auto' | 'manual' = 'manual',
      autoPhase: 'progress' | 'final' = 'final',
    ) => {
      stopCodexSpeech(false);
      speechInitiatorRef.current = initiator;
      speechAutoPhaseRef.current = autoPhase;
      const speechText = codexSpeechTextFromWord(markdown, startWord, selectedSpeechStyle);
      const broadChunks = codexCloudSpeechChunks(speechText, 900, selectedSpeechStyle);
      const chunks = broadChunks.length
        ? [
            ...codexCloudSpeechChunks(broadChunks[0], 220, selectedSpeechStyle),
            ...broadChunks.slice(1),
          ]
        : [];
      if (!chunks.length) {
        setSpeechStatus('This Codex reply has no readable text.');
        return;
      }
      const runId = speechRunRef.current + 1;
      speechRunRef.current = runId;
      speechSourceRef.current = 'google';
      speechMessageIdRef.current = messageId;
      speechMarkdownRef.current = markdown;
      speechWordOffsetRef.current = startWord;
      setSpeechMessageId(messageId);
      setSpeechPlaybackState('loading');
      setSpeechStatus(`Preparing Google ${selectedSpeechVoice}…`);
      setSpeechProgress({ elapsedSeconds: 0, totalSeconds: estimatedCodexSpeechSeconds(chunks) });
      const controller = new AbortController();
      cloudSpeechAbortRef.current = controller;
      cloudSpeechSegmentsRef.current = Array.from({ length: chunks.length });
      cloudSpeechChunkTextsRef.current = chunks;
      let wordStart = 0;
      cloudSpeechWordStartsRef.current = chunks.map((chunk) => {
        const start = wordStart;
        wordStart += codexSpeechWords(chunk).length;
        return start;
      });
      setSpeechActiveWordIndex(startWord);
      const deferred = chunks.map(() => {
        let resolve!: (segment: CloudSpeechSegment) => void;
        let reject!: (error: unknown) => void;
        const promise = new Promise<CloudSpeechSegment>((resolveSegment, rejectSegment) => {
          resolve = resolveSegment;
          reject = rejectSegment;
        });
        void promise.catch(() => undefined);
        return { promise, reject, resolve };
      });
      cloudSpeechSegmentPromisesRef.current = deferred.map(({ promise }) => promise);
      let nextIndex = 0;
      const loadNext = async (): Promise<void> => {
        const index = nextIndex++;
        if (index >= chunks.length || controller.signal.aborted) return;
        try {
          const cacheKey = `${selectedSpeechVoice}\u0000${chunks[index]}`;
          let blob = cloudSpeechBlobCache.get(cacheKey);
          if (!blob) {
            const response = await studioRuntimeFetch(codexSpeechEndpoint, {
              body: JSON.stringify({ text: chunks[index], voice: selectedSpeechVoice }),
              headers: { Accept: 'audio/mpeg', 'Content-Type': 'application/json' },
              method: 'POST',
              signal: controller.signal,
            });
            if (!response.ok) throw new Error('Google speech is unavailable.');
            blob = await response.blob();
            cacheCloudSpeechBlob(cacheKey, blob);
          }
          const segment = await loadCloudSpeechSegment(blob, controller.signal);
          segment.audio.playbackRate = selectedSpeechRate;
          if (controller.signal.aborted || speechRunRef.current !== runId) {
            segment.audio.pause();
            URL.revokeObjectURL(segment.url);
            return;
          }
          cloudSpeechSegmentsRef.current[index] = segment;
          deferred[index].resolve(segment);
        } catch (error) {
          deferred[index].reject(error);
        }
        await loadNext();
      };
      try {
        void loadNext();
        void loadNext();
        await deferred[0].promise;
        if (speechRunRef.current !== runId || controller.signal.aborted) {
          return;
        }
        cloudSpeechSegmentIndexRef.current = 0;
        playCloudSpeechSegments(messageId, runId);
      } catch (error) {
        if (controller.signal.aborted || speechRunRef.current !== runId) return;
        if (deviceSpeechSupported) {
          readDeviceCodexReply(messageId, markdown, startWord, initiator, autoPhase);
          setSpeechStatus(
            `Google speech is unavailable. Reading in ${selectedSpeechLanguageLabel} with your device voice.`,
          );
          return;
        }
        stopCodexSpeech(false);
        setSpeechStatus(
          error instanceof Error
            ? `${error.message} Try Read again.`
            : 'Speech is unavailable. Try Read again.',
        );
      }
    },
    [
      deviceSpeechSupported,
      playCloudSpeechSegments,
      readDeviceCodexReply,
      selectedSpeechLanguageLabel,
      selectedSpeechRate,
      selectedSpeechStyle,
      selectedSpeechVoice,
      stopCodexSpeech,
    ],
  );

  const readCodexReply = useCallback(
    (
      messageId: string,
      markdown: string,
      startWord = 0,
      initiator: 'auto' | 'manual' = 'manual',
      autoPhase: 'progress' | 'final' = 'final',
    ) => {
      if (cloudSpeechConfiguration?.available) {
        void readCloudCodexReply(messageId, markdown, startWord, initiator, autoPhase);
      } else {
        readDeviceCodexReply(messageId, markdown, startWord, initiator, autoPhase);
      }
    },
    [cloudSpeechConfiguration?.available, readCloudCodexReply, readDeviceCodexReply],
  );

  const pauseCodexSpeech = useCallback(() => {
    if (!speechMessageIdRef.current) return;
    if (speechSourceRef.current === 'google') {
      const segment = cloudSpeechSegmentsRef.current[cloudSpeechSegmentIndexRef.current];
      segment?.audio.pause();
      setSpeechPlaybackState('paused');
      setSpeechStatus('Reading paused.');
      return;
    }
    if (speechStartedAtRef.current) {
      speechElapsedBeforePlayRef.current += Math.max(0, Date.now() - speechStartedAtRef.current);
      speechStartedAtRef.current = 0;
    }
    speechRunRef.current += 1;
    clearSpeechTimers();
    speechUtteranceRef.current = undefined;
    window.speechSynthesis.cancel();
    updateSpeechProgress();
    setSpeechPlaybackState('paused');
    setSpeechStatus('Reading paused. Resume restarts the current sentence.');
  }, [clearSpeechTimers, updateSpeechProgress]);

  const resumeCodexSpeech = useCallback(() => {
    const messageId = speechMessageIdRef.current;
    if (!messageId) return;
    if (speechSourceRef.current === 'google') {
      const segment = cloudSpeechSegmentsRef.current[cloudSpeechSegmentIndexRef.current];
      if (!segment) return;
      setSpeechPlaybackState('playing');
      setSpeechStatus(`Reading Codex reply with Google ${selectedSpeechVoice}.`);
      void segment.audio.play().catch(() => {
        setSpeechPlaybackState('paused');
        setSpeechStatus('Playback is blocked. Press Resume to try again.');
      });
      return;
    }
    if (!speechChunksRef.current.length) return;
    playStoredCodexSpeech(messageId);
  }, [playStoredCodexSpeech, selectedSpeechVoice]);

  const seekCodexSpeech = useCallback(
    (requestedSeconds: number) => {
      if (speechSourceRef.current !== 'google' || !speechMessageIdRef.current) return;
      const segments = cloudSpeechSegmentsRef.current;
      const durations = segments.map(
        (segment, index) =>
          segment?.duration ??
          estimatedCodexSpeechSeconds([cloudSpeechChunkTextsRef.current[index]]),
      );
      const total = durations.reduce((sum, duration) => sum + duration, 0);
      const seconds = Math.max(0, Math.min(requestedSeconds, total));
      let elapsed = 0;
      let targetIndex = Math.max(0, segments.length - 1);
      for (let index = 0; index < segments.length; index += 1) {
        if (seconds <= elapsed + durations[index]) {
          targetIndex = index;
          break;
        }
        elapsed += durations[index];
      }
      const wasPlaying = speechPlaybackState === 'playing';
      segments[cloudSpeechSegmentIndexRef.current]?.audio.pause();
      cloudSpeechSegmentIndexRef.current = targetIndex;
      setSpeechProgress({ elapsedSeconds: Math.floor(seconds), totalSeconds: Math.ceil(total) });
      const messageId = speechMessageIdRef.current;
      const runId = speechRunRef.current;
      void cloudSpeechSegmentPromisesRef.current[targetIndex]
        .then((segment) => {
          if (speechRunRef.current !== runId) return;
          segment.audio.currentTime = Math.max(0, Math.min(seconds - elapsed, segment.duration));
          playCloudSpeechSegments(messageId, runId, wasPlaying);
        })
        .catch(() => undefined);
    },
    [playCloudSpeechSegments, speechPlaybackState],
  );

  const skipCodexSpeech = useCallback(
    (seconds: number) => {
      if (!speechMessageIdRef.current) return;
      if (speechSourceRef.current === 'google') {
        seekCodexSpeech((speechProgress?.elapsedSeconds ?? 0) + seconds);
        return;
      }
      const markdown = speechMarkdownRef.current;
      const wordCount = codexSpeechWords(markdown).length;
      if (!markdown || !wordCount) return;
      const currentWord = speechActiveWordIndex ?? speechWordOffsetRef.current;
      const targetWord = Math.max(
        0,
        Math.min(wordCount - 1, currentWord + Math.round((seconds * 150) / 60)),
      );
      readCodexReply(speechMessageIdRef.current, markdown, targetWord);
    },
    [readCodexReply, seekCodexSpeech, speechActiveWordIndex, speechProgress?.elapsedSeconds],
  );

  const previewSpeechVoice = useCallback(async () => {
    if (!cloudSpeechConfiguration?.available) return;
    stopCodexSpeech(false);
    const controller = new AbortController();
    voicePreviewAbortRef.current = controller;
    setVoicePreviewState('loading');
    setSpeechStatus(`Preparing a preview of Google ${selectedSpeechVoice}…`);
    try {
      const response = await studioRuntimeFetch(codexSpeechEndpoint, {
        body: JSON.stringify({
          text: 'Hi, this is your Studio Codex Chat voice. I can read complete replies aloud.',
          voice: selectedSpeechVoice,
        }),
        headers: { Accept: 'audio/mpeg', 'Content-Type': 'application/json' },
        method: 'POST',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('This voice preview is unavailable.');
      const segment = await loadCloudSpeechSegment(await response.blob(), controller.signal);
      if (controller.signal.aborted) {
        URL.revokeObjectURL(segment.url);
        return;
      }
      voicePreviewAbortRef.current = undefined;
      voicePreviewAudioRef.current = segment.audio;
      voicePreviewUrlRef.current = segment.url;
      segment.audio.onended = () => {
        stopVoicePreview();
        setSpeechStatus(`Finished previewing Google ${selectedSpeechVoice}.`);
      };
      segment.audio.onerror = () => {
        stopVoicePreview();
        setSpeechStatus('This voice preview could not be played. Try again.');
      };
      setVoicePreviewState('playing');
      setSpeechStatus(`Previewing Google ${selectedSpeechVoice}.`);
      await segment.audio.play();
    } catch (error) {
      if (controller.signal.aborted) return;
      stopVoicePreview();
      setSpeechStatus(
        error instanceof Error ? error.message : 'This voice preview could not be played.',
      );
    }
  }, [cloudSpeechConfiguration?.available, selectedSpeechVoice, stopCodexSpeech, stopVoicePreview]);

  const updateChatFollowingLatest = useCallback((following: boolean) => {
    chatFollowingLatestRef.current = following;
    setIsChatFollowingLatest(following);
  }, []);

  const mountChatLog = useCallback((log: HTMLDivElement | null) => {
    setMountedChatLog(log);
  }, []);

  const updateChatSession = useCallback(
    (update: Partial<CodexChatSession>) => {
      const nextSession = { ...chatSessionRef.current, ...update };
      chatSessionRef.current = nextSession;
      writeCodexChatSession(nextSession, workspaceDirectory);
    },
    [workspaceDirectory],
  );

  const saveConversationLifecycle = useCallback(
    (workingByThread: Record<string, boolean>, unseenThreadIds: Set<string>) => {
      workingByThreadRef.current = workingByThread;
      unseenCompletionThreadIdsRef.current = unseenThreadIds;
      setUnseenCompletionThreadIds(unseenThreadIds);
      writeCodexConversationLifecycle({
        unseenCompletionThreadIds: [...unseenThreadIds],
        workingByThread,
      });
    },
    [],
  );

  const markConversationViewed = useCallback(
    (threadId: string | undefined) => {
      if (!threadId || !unseenCompletionThreadIdsRef.current.has(threadId)) return;
      const nextUnseenThreadIds = new Set(unseenCompletionThreadIdsRef.current);
      nextUnseenThreadIds.delete(threadId);
      saveConversationLifecycle(workingByThreadRef.current, nextUnseenThreadIds);
    },
    [saveConversationLifecycle],
  );

  const recordConversationLifecycle = useCallback(
    (nextStatus: CodexStatus, viewedThreadId?: string) => {
      const threads = new Map(nextStatus.threads.map((thread) => [thread.id, thread]));
      if (nextStatus.thread) threads.set(nextStatus.thread.id, nextStatus.thread);
      const lifecycleThreads = [...threads.values()].slice(0, 100);
      const retainedThreadIds = [
        ...new Set([
          ...lifecycleThreads.map((thread) => thread.id),
          ...Object.keys(workingByThreadRef.current),
        ]),
      ].slice(0, 100);
      const retainedThreadIdSet = new Set(retainedThreadIds);
      const nextWorkingByThread = Object.fromEntries(
        retainedThreadIds.map((threadId) => [threadId, workingByThreadRef.current[threadId]]),
      ) as Record<string, boolean>;
      const nextUnseenThreadIds = new Set(
        [...unseenCompletionThreadIdsRef.current].filter((threadId) =>
          retainedThreadIdSet.has(threadId),
        ),
      );

      for (const thread of lifecycleThreads) {
        const working = thread.working === true;
        if (
          workingByThreadRef.current[thread.id] === true &&
          !working &&
          !thread.interrupted &&
          thread.lastTurnStatus !== 'interrupted' &&
          thread.id !== viewedThreadId
        ) {
          nextUnseenThreadIds.add(thread.id);
        }
        nextWorkingByThread[thread.id] = working;
      }

      if (viewedThreadId) nextUnseenThreadIds.delete(viewedThreadId);
      const workingChanged =
        Object.keys(nextWorkingByThread).length !==
          Object.keys(workingByThreadRef.current).length ||
        Object.entries(nextWorkingByThread).some(
          ([threadId, working]) => workingByThreadRef.current[threadId] !== working,
        );
      const unseenChanged =
        nextUnseenThreadIds.size !== unseenCompletionThreadIdsRef.current.size ||
        ![...nextUnseenThreadIds].every((threadId) =>
          unseenCompletionThreadIdsRef.current.has(threadId),
        );
      if (!workingChanged && !unseenChanged) return;
      saveConversationLifecycle(nextWorkingByThread, nextUnseenThreadIds);
    },
    [saveConversationLifecycle],
  );

  const saveChatPosition = useCallback(
    (threadIdOverride?: string) => {
      const log = mountedChatLog;
      const threadId = threadIdOverride ?? selectedThreadIdRef.current;
      if (!log || !threadId) return;
      if (restoredChatThreadRef.current !== threadId) return;
      const logTop = log.getBoundingClientRect().top;
      const anchor = [
        ...log.querySelectorAll<HTMLElement>('[data-message-id], [data-activity-id]'),
      ].find((element) => element.getBoundingClientRect().bottom > logTop);
      const anchorId = anchor?.dataset.messageId ?? anchor?.dataset.activityId;
      const anchorKind = anchor?.dataset.messageId ? 'message' : anchor ? 'activity' : undefined;
      const positions = {
        ...chatSessionRef.current.positions,
        [threadId]: {
          anchorId,
          anchorKind,
          anchorOffset: anchor ? anchor.getBoundingClientRect().top - logTop : undefined,
          followingLatest: chatFollowingLatestRef.current,
          scrollTop: log.scrollTop,
          updatedAt: Date.now(),
        } satisfies CodexTranscriptPosition,
      };
      const boundedPositions = Object.fromEntries(
        Object.entries(positions)
          .sort(([, first], [, second]) => second.updatedAt - first.updatedAt)
          .slice(0, 25),
      );
      updateChatSession({ positions: boundedPositions });
    },
    [mountedChatLog, updateChatSession],
  );

  const scrollChatToLatest = useCallback(() => {
    const log = mountedChatLog;
    if (!log) return;
    updateChatFollowingLatest(true);
    log.scrollTo({ top: log.scrollHeight, behavior: 'auto' });
  }, [mountedChatLog, updateChatFollowingLatest]);

  const handleChatLogScroll = useCallback(() => {
    const log = mountedChatLog;
    if (!log) return;
    const distanceFromLatest = log.scrollHeight - log.clientHeight - log.scrollTop;
    const followingLatest = distanceFromLatest <= 12;
    const scrollingUp = log.scrollTop < previousChatScrollTopRef.current - 1;
    previousChatScrollTopRef.current = log.scrollTop;
    updateChatFollowingLatest(followingLatest);
    if (!followingLatest && scrollingUp) {
      setIsComposerExpanded(false);
      composerTextareaRef.current?.blur();
    }
    saveChatPosition();
  }, [mountedChatLog, saveChatPosition, updateChatFollowingLatest]);

  const selectConversation = useCallback(
    (threadId: string, threadScope?: CodexThread['scope']) => {
      saveChatPosition();
      stopCodexSpeech(false);
      selectedThreadIdRef.current = threadId;
      selectedThreadScopeRef.current = threadScope;
      setSelectedThreadId(threadId);
      restoredChatThreadRef.current = '';
      updateChatSession({ selectedThreadId: threadId, selectedThreadScope: threadScope });
      setConversationPickerOpen(false);
      setExpandedAgentId('');
      setTeamResumeState(undefined);
    },
    [saveChatPosition, stopCodexSpeech, updateChatSession],
  );

  const refreshStatus = useCallback(
    async (
      threadIdOverride?: string,
      threadScopeOverride?: CodexThread['scope'],
      allowDuringConversationTransition = false,
    ) => {
      if (conversationTransitionRef.current && !allowDuringConversationTransition) return false;
      const explicitRefresh = Boolean(
        threadIdOverride || threadScopeOverride || allowDuringConversationTransition,
      );
      if (!explicitRefresh && statusRefreshInFlightRef.current > 0) return false;
      statusRefreshInFlightRef.current += 1;
      const requestSequence = ++statusRequestSequenceRef.current;
      const requestedThreadId = threadIdOverride ?? selectedThreadIdRef.current;
      try {
        const requestedScope =
          threadScopeOverride ??
          selectedThreadScopeRef.current ??
          (workspaceDirectory ? 'client' : 'universal');
        const query = new URLSearchParams();
        if (requestedThreadId) query.set('threadId', requestedThreadId);
        if (workspaceDirectory) query.set('workspace', workspaceDirectory);
        if (requestedScope) query.set('threadScope', requestedScope);
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 12_000);
        const response = await studioRuntimeFetch(
          `${statusEndpoint}${query.size ? `?${query.toString()}` : ''}`,
          {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
          },
        );
        window.clearTimeout(timeout);
        if (requestSequence !== statusRequestSequenceRef.current) return false;
        if (
          response.status === 404 ||
          !response.headers.get('content-type')?.includes('application/json')
        ) {
          setIsSupported(false);
          return false;
        }
        if (!response.ok) {
          const failure = (await response.json().catch(() => ({}))) as { detail?: string };
          setIsSupported(true);
          setStatus((current) => ({
            account: current?.account,
            activities: current?.activities ?? [],
            agents: current?.agents ?? [],
            billing: current?.billing,
            capabilities: current?.capabilities,
            detail: failure.detail || 'The Codex service is reconnecting. Try again shortly.',
            messages: current?.messages ?? [],
            models: current?.models ?? [],
            queuedCount: current?.queuedCount ?? 0,
            queuedMessages: current?.queuedMessages ?? [],
            status: 'unavailable',
            subscriptionUsage: current?.subscriptionUsage,
            thread: current?.thread,
            threads: current?.threads ?? [],
          }));
          return false;
        }
        const receivedStatus = (await response.json()) as CodexStatus;
        const nextThreads = receivedStatus.threads.filter(
          (thread) => !deletedThreadIdsRef.current.has(thread.id),
        );
        const nextStatus = {
          ...receivedStatus,
          thread:
            receivedStatus.thread && !deletedThreadIdsRef.current.has(receivedStatus.thread.id)
              ? receivedStatus.thread
              : nextThreads[0],
          threads: nextThreads,
        };
        setIsSupported(true);
        if (requestedThreadId !== selectedThreadIdRef.current) return false;
        recordConversationLifecycle(
          nextStatus,
          phase !== 'closed' ? nextStatus.thread?.id : undefined,
        );
        setStatus(nextStatus);
        if (
          nextStatus.thread &&
          (!requestedThreadId ||
            !nextStatus.threads.some((thread) => thread.id === requestedThreadId))
        ) {
          selectConversation(nextStatus.thread.id, nextStatus.thread.scope);
        }
        if (!runtimePreferencesHydrated) return true;
        if (!selectedModelId || !nextStatus.models.some((model) => model.id === selectedModelId)) {
          const nextModel =
            nextStatus.models.find((model) => model.isDefault) || nextStatus.models[0];
          if (nextModel) {
            const nextEffort = modelEffort(
              nextModel,
              effortPreferences[nextModel.id] || selectedEffort,
            );
            setSelectedModelId(nextModel.id);
            setSelectedEffort(nextEffort);
            setEffortPreferences((current) => ({ ...current, [nextModel.id]: nextEffort }));
          }
        }
        return true;
      } catch {
        if (requestSequence !== statusRequestSequenceRef.current) return false;
        setIsSupported((current) => (current === undefined ? false : current));
        return false;
      } finally {
        statusRefreshInFlightRef.current = Math.max(0, statusRefreshInFlightRef.current - 1);
      }
    },
    [
      effortPreferences,
      phase,
      recordConversationLifecycle,
      runtimePreferencesHydrated,
      selectConversation,
      selectedEffort,
      selectedModelId,
      workspaceDirectory,
    ],
  );

  const changeBillingMode = useCallback(async () => {
    const currentMode = status?.billing?.mode ?? 'chatgpt_subscription';
    const nextMode = currentMode === 'api_credits' ? 'chatgpt_subscription' : 'api_credits';
    setBillingModeChanging(true);
    setError(undefined);
    try {
      const response = await studioRuntimeFetch(aiBillingModeEndpoint, {
        body: JSON.stringify({ mode: nextMode }),
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = (await response.json()) as CodexStatus['billing'] & { detail?: string };
      if (!response.ok) throw new Error(result?.detail || 'The AI billing mode could not change.');
      setStatus((current) => (current ? { ...current, billing: result } : current));
      window.setTimeout(() => void refreshStatus(), 2_500);
    } catch (changeError) {
      setError(
        changeError instanceof Error
          ? changeError.message
          : 'The AI billing mode could not change.',
      );
    } finally {
      setBillingModeChanging(false);
    }
  }, [refreshStatus, status?.billing?.mode]);

  const pollingActiveTurnId = status?.thread?.activeTurnId;
  const pollingActiveWork =
    status?.thread?.working === true ||
    status?.threads.some((thread) => thread.working) === true ||
    (Boolean(pollingActiveTurnId) &&
      status?.agents?.some(
        (agent) =>
          agent.working &&
          (!agent.supervisorTurnId || agent.supervisorTurnId === pollingActiveTurnId),
      ));

  useEffect(() => {
    void refreshStatus();
    const interval = window.setInterval(
      () => void refreshStatus(),
      pollingActiveWork ? 1_000 : 5_000,
    );
    return () => window.clearInterval(interval);
  }, [pollingActiveWork, refreshStatus]);

  useEffect(() => {
    const refreshVisibleChat = () => {
      if (document.visibilityState === 'hidden') return;
      void refreshStatus();
    };
    const refreshAfterVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshVisibleChat();
    };
    document.addEventListener('visibilitychange', refreshAfterVisibilityChange);
    window.addEventListener('pageshow', refreshVisibleChat);
    window.addEventListener('focus', refreshVisibleChat);
    window.addEventListener('online', refreshVisibleChat);
    return () => {
      document.removeEventListener('visibilitychange', refreshAfterVisibilityChange);
      window.removeEventListener('pageshow', refreshVisibleChat);
      window.removeEventListener('focus', refreshVisibleChat);
      window.removeEventListener('online', refreshVisibleChat);
    };
  }, [refreshStatus]);

  useEffect(() => {
    const openPanel = () => {
      markConversationViewed(selectedThreadIdRef.current || status?.thread?.id);
      restoredChatThreadRef.current = '';
      updateChatSession({ isOpen: true });
      setPhase('compose');
      setError(undefined);
      void refreshStatus();
    };
    window.addEventListener(openCodexPanelEvent, openPanel);
    return () => window.removeEventListener(openCodexPanelEvent, openPanel);
  }, [markConversationViewed, refreshStatus, status?.thread?.id, updateChatSession]);

  useEffect(() => {
    void browserCaptureRequest('ping', 1_000)
      .then((result) => setBrowserCaptureAvailable(result === 'ready'))
      .catch(() => setBrowserCaptureAvailable(false));
    if (!sharedScreenSupported()) window.setTimeout(() => warmMobileScreenCapture(), 0);
  }, []);

  useEffect(() => {
    if (!embedded || window.parent === window) return;
    const receiveWorkspaceContext = (event: MessageEvent) => {
      if (event.source !== window.parent || event.data?.source !== 'made-solid-codex-host') return;
      if (event.data.action === 'synchronize') {
        window.parent.postMessage(
          {
            source: 'made-solid-codex-panel',
            ready: isSupported !== undefined,
            open: phase !== 'closed',
            expanded: phase === 'selecting',
          },
          event.origin,
        );
      }
      if (event.data.action === 'open') {
        markConversationViewed(selectedThreadIdRef.current || status?.thread?.id);
        restoredChatThreadRef.current = '';
        updateChatSession({ isOpen: true });
        setPhase('compose');
        setError(undefined);
        void refreshStatus();
        return;
      }
      if (typeof event.data.url !== 'string') return;
      try {
        const pageUrl = new URL(event.data.url);
        if (pageUrl.origin !== event.origin) return;
        setWorkspaceCaptureContext({
          url: pageUrl.href,
          title: typeof event.data.title === 'string' ? event.data.title.slice(0, 200) : '',
          scrollX: Number(event.data.scrollX) || 0,
          scrollY: Number(event.data.scrollY) || 0,
          viewportWidth: Number(event.data.viewportWidth) || window.innerWidth,
          viewportHeight: Number(event.data.viewportHeight) || window.innerHeight,
        });
      } catch {
        // Ignore malformed parent-page context.
      }
    };
    window.addEventListener('message', receiveWorkspaceContext);
    return () => window.removeEventListener('message', receiveWorkspaceContext);
  }, [
    embedded,
    isSupported,
    markConversationViewed,
    phase,
    refreshStatus,
    status?.thread?.id,
    updateChatSession,
  ]);

  useEffect(() => {
    const log = mountedChatLog;
    if (!log || !chatFollowingLatestRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      if (chatFollowingLatestRef.current) log.scrollTop = log.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    pendingChatMessage,
    pendingVisualMessage,
    mountedChatLog,
    status?.activities,
    status?.messages,
    status?.queuedMessages,
  ]);

  useEffect(() => {
    const threadId = status?.thread?.id ?? '';
    if (!threadId) return;
    const currentIds = new Set([
      ...(status?.messages.map((message) => `message:${message.id}`) ?? []),
      ...(status?.activities?.map((activity) => `activity:${activity.id}`) ?? []),
    ]);
    if (knownTimelineThreadRef.current !== threadId || !knownTimelineIdsRef.current.size) {
      knownTimelineThreadRef.current = threadId;
      knownTimelineIdsRef.current = currentIds;
      setEnteringTimelineIds(new Set());
      return;
    }
    const incomingIds = [...currentIds].filter((id) => !knownTimelineIdsRef.current.has(id));
    knownTimelineIdsRef.current = currentIds;
    if (!incomingIds.length) return;
    setEnteringTimelineIds(new Set(incomingIds));
    window.clearTimeout(timelineAnimationTimerRef.current);
    timelineAnimationTimerRef.current = window.setTimeout(
      () => setEnteringTimelineIds(new Set()),
      600,
    );
  }, [status?.activities, status?.messages, status?.thread?.id]);

  useEffect(() => () => window.clearTimeout(timelineAnimationTimerRef.current), []);

  useEffect(() => {
    const threadId = status?.thread?.id ?? '';
    const messages = status?.messages ?? [];
    if (!threadId) return;
    if (autoReadThreadIdRef.current !== threadId) {
      autoReadThreadIdRef.current = threadId;
      autoReadSeenMessageIdsRef.current = new Set(messages.map(({ id }) => id));
      setAutoReadPending(undefined);
      return;
    }
    const unseen = messages.filter((message) => !autoReadSeenMessageIdsRef.current.has(message.id));
    for (const message of unseen) autoReadSeenMessageIdsRef.current.add(message.id);
    if (
      !autoReadCodex ||
      phase === 'closed' ||
      document.visibilityState !== 'visible' ||
      !unseen.length
    )
      return;
    const activeTurnId = status?.thread?.activeTurnId;
    const candidates = unseen.flatMap((message): AutoReadMessage[] => {
      if (message.role !== 'assistant' || !message.text.trim()) return [];
      if (message.phase === 'commentary') {
        if (activeTurnId && message.turnId && message.turnId !== activeTurnId) return [];
        return [{ id: message.id, phase: 'progress', text: message.text, turnId: message.turnId }];
      }
      const belongsToWorkingTurn = Boolean(
        status?.thread?.working &&
        activeTurnId &&
        message.turnId &&
        message.turnId === activeTurnId,
      );
      return belongsToWorkingTurn
        ? []
        : [{ id: message.id, phase: 'final', text: message.text, turnId: message.turnId }];
    });
    const candidate =
      [...candidates].reverse().find(({ phase: messagePhase }) => messagePhase === 'final') ??
      candidates.at(-1);
    if (!candidate) return;
    setAutoReadPending((current) =>
      current?.phase === 'final' && candidate.phase === 'progress' ? current : candidate,
    );
  }, [autoReadCodex, phase, status?.messages, status?.thread]);

  useEffect(() => {
    if (!autoReadCodex || !autoReadPending) return;
    if (phase === 'closed' || document.visibilityState !== 'visible') {
      setAutoReadPending(undefined);
      return;
    }
    if (speechMessageIdRef.current && speechInitiatorRef.current === 'manual') {
      setAutoReadPending(undefined);
      return;
    }
    if (speechMessageIdRef.current) {
      if (autoReadPending.phase === 'final' && speechAutoPhaseRef.current === 'progress') {
        stopCodexSpeech(false);
      }
      return;
    }
    const pending = autoReadPending;
    const timer = window.setTimeout(
      () => {
        if (document.visibilityState !== 'visible') return;
        setAutoReadPending((current) => (current?.id === pending.id ? undefined : current));
        readCodexReply(pending.id, pending.text, 0, 'auto', pending.phase);
      },
      pending.phase === 'progress' ? 750 : 0,
    );
    return () => window.clearTimeout(timer);
  }, [
    autoReadCodex,
    autoReadPending,
    phase,
    readCodexReply,
    speechMessageId,
    speechPlaybackState,
    stopCodexSpeech,
  ]);

  useEffect(() => {
    const stopForHiddenPage = () => {
      if (document.visibilityState === 'visible') return;
      setAutoReadPending(undefined);
      if (speechInitiatorRef.current === 'auto') stopCodexSpeech(false);
    };
    document.addEventListener('visibilitychange', stopForHiddenPage);
    return () => document.removeEventListener('visibilitychange', stopForHiddenPage);
  }, [stopCodexSpeech]);

  useEffect(() => {
    const stopForNavigation = () => stopCodexSpeech(false);
    window.addEventListener('hashchange', stopForNavigation);
    window.addEventListener('pagehide', stopForNavigation);
    return () => {
      window.removeEventListener('hashchange', stopForNavigation);
      window.removeEventListener('pagehide', stopForNavigation);
      stopCodexSpeech(false);
    };
  }, [stopCodexSpeech]);

  useLayoutEffect(() => {
    if (phase !== 'compose' && phase !== 'sending-chat') return;
    const threadId = selectedThreadId || status?.thread?.id || '';
    const log = mountedChatLog;
    if (!threadId || status?.thread?.id !== threadId || !log || conversationTransition) return;
    if (restoredChatThreadRef.current === threadId) return;
    const savedPosition = chatSessionRef.current.positions[threadId];
    restoredChatThreadRef.current = threadId;
    if (!savedPosition) {
      updateChatFollowingLatest(true);
      log.scrollTop = log.scrollHeight;
      previousChatScrollTopRef.current = log.scrollTop;
      return;
    }
    updateChatFollowingLatest(savedPosition.followingLatest);
    if (savedPosition.followingLatest) {
      log.scrollTop = log.scrollHeight;
    } else {
      const restoreSavedPosition = () => {
        log.scrollTop = savedPosition.scrollTop;
        const anchor = [
          ...log.querySelectorAll<HTMLElement>('[data-message-id], [data-activity-id]'),
        ].find((element) =>
          savedPosition.anchorKind === 'message'
            ? element.dataset.messageId === savedPosition.anchorId
            : element.dataset.activityId === savedPosition.anchorId,
        );
        if (anchor && savedPosition.anchorOffset !== undefined) {
          log.scrollTop +=
            anchor.getBoundingClientRect().top -
            log.getBoundingClientRect().top -
            savedPosition.anchorOffset;
        }
        previousChatScrollTopRef.current = log.scrollTop;
      };
      restoreSavedPosition();
      let settledFrame = 0;
      const layoutFrame = window.requestAnimationFrame(() => {
        restoreSavedPosition();
        settledFrame = window.requestAnimationFrame(restoreSavedPosition);
      });
      return () => {
        window.cancelAnimationFrame(layoutFrame);
        window.cancelAnimationFrame(settledFrame);
      };
    }
    previousChatScrollTopRef.current = log.scrollTop;
  }, [
    conversationTransition,
    mountedChatLog,
    phase,
    selectedThreadId,
    status?.activities,
    status?.messages,
    status?.queuedMessages,
    status?.thread?.id,
    updateChatFollowingLatest,
  ]);

  useEffect(() => {
    const key = scopedStorageKey(codexDraftKey, workspaceDirectory);
    if (prompt) window.localStorage.setItem(key, prompt);
    else window.localStorage.removeItem(key);
  }, [prompt, workspaceDirectory]);

  useEffect(() => {
    if (!mountedChatLog || phase === 'closed') return;
    const captureSelectedExcerpt = () => {
      const browserSelection = window.getSelection();
      const text = browserSelection?.toString().trim() ?? '';
      if (!browserSelection || browserSelection.isCollapsed || !text) {
        if (!document.activeElement?.closest('.codex-chat-excerpt-actions')) {
          setSelectedExcerpt(undefined);
        }
        return;
      }
      const anchor = selectedNodeElement(browserSelection.anchorNode)?.closest<HTMLElement>(
        '.codex-chat-message--assistant .markdown-content',
      );
      const focus = selectedNodeElement(browserSelection.focusNode)?.closest<HTMLElement>(
        '.codex-chat-message--assistant .markdown-content',
      );
      if (!anchor || !focus) {
        setSelectedExcerpt(undefined);
        return;
      }
      const anchorMessage = anchor.closest<HTMLElement>('[data-message-id]');
      const focusMessage = focus.closest<HTMLElement>('[data-message-id]');
      if (
        !anchorMessage ||
        anchorMessage !== focusMessage ||
        !mountedChatLog.contains(anchorMessage)
      ) {
        setSelectedExcerpt(undefined);
        return;
      }
      const messageId = anchorMessage.dataset.messageId;
      if (!messageId) return;
      const turnId = status?.messages.find((message) => message.id === messageId)?.turnId;
      setSelectedExcerpt((current) =>
        current?.messageId === messageId && current.text === text && current.turnId === turnId
          ? current
          : { messageId, text, turnId },
      );
    };
    document.addEventListener('selectionchange', captureSelectedExcerpt);
    return () => document.removeEventListener('selectionchange', captureSelectedExcerpt);
  }, [mountedChatLog, phase, status?.messages]);

  useEffect(() => setSelectedExcerpt(undefined), [selectedThreadId]);

  const displayedThreadId = selectedThreadId || status?.thread?.id || '';
  const pendingChatAccepted = Boolean(
    pendingChatMessage &&
    status?.thread?.id === pendingChatMessage.threadId &&
    (status?.messages.some(
      (message) =>
        message.feedbackId === pendingChatMessage.id ||
        (message.role === 'user' && message.text === pendingChatMessage.text),
    ) ||
      status?.queuedMessages?.some((message) => message.id === pendingChatMessage.id)),
  );
  const pendingVisualAccepted = Boolean(
    pendingVisualMessage &&
    status?.thread?.id === pendingVisualMessage.threadId &&
    (status?.messages.some(
      (message) =>
        message.feedbackId === pendingVisualMessage.id ||
        message.attachmentId === pendingVisualMessage.id,
    ) ||
      status?.queuedMessages?.some((message) => message.id === pendingVisualMessage.id)),
  );

  useEffect(() => {
    if (pendingChatAccepted) setPendingChatMessage(undefined);
  }, [pendingChatAccepted]);

  useEffect(() => {
    if (pendingVisualAccepted) setPendingVisualMessage(undefined);
  }, [pendingVisualAccepted]);

  const showPendingChatMessage =
    pendingChatMessage?.threadId === displayedThreadId && !pendingChatAccepted;
  const showPendingVisualMessage =
    pendingVisualMessage?.threadId === displayedThreadId && !pendingVisualAccepted;
  const latestQueuedRequest = [...(status?.queuedMessages ?? [])]
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .at(-1)?.prompt;
  const latestUserRequest = codexConversationRequestText(
    (showPendingVisualMessage ? pendingVisualMessage?.text : undefined) ||
      (showPendingChatMessage ? pendingChatMessage?.text : undefined) ||
      latestQueuedRequest ||
      [...(status?.messages ?? [])]
        .reverse()
        .find((message) => message.role === 'user' && message.text.trim())?.text,
  );

  const activeAgents = status?.agents?.filter((agent) => agent.working) ?? [];
  const transcriptEntries = useMemo(() => {
    const messages = (status?.messages ?? []).map((message, index) => ({
      kind: 'message' as const,
      id: message.id,
      position: message.position,
      fallbackPosition: index,
      message,
    }));
    const activities = (status?.activities ?? []).map((activity, index) => ({
      kind: 'activity' as const,
      id: activity.id,
      position: activity.position,
      fallbackPosition: messages.length + index,
      activity,
    }));
    const entries = [...messages, ...activities];
    const hasCanonicalOrder = entries.every((entry) => typeof entry.position === 'number');
    return entries.sort((first, second) => {
      const firstPosition = hasCanonicalOrder ? first.position! : first.fallbackPosition;
      const secondPosition = hasCanonicalOrder ? second.position! : second.fallbackPosition;
      if (firstPosition !== secondPosition) return firstPosition - secondPosition;
      if (first.kind !== second.kind) return first.kind === 'message' ? -1 : 1;
      return first.id.localeCompare(second.id);
    });
  }, [status?.activities, status?.messages]);
  const activeSpeechMessage = status?.messages.find(
    (message) => message.id === speechMessageId && message.role === 'assistant',
  );
  const activeSpeechProgress = activeSpeechMessage ? speechProgress : undefined;
  const activeSpeechHasExactProgress = Boolean(
    activeSpeechMessage &&
    speechSourceRef.current === 'google' &&
    cloudSpeechSegmentsRef.current.length > 0 &&
    cloudSpeechSegmentsRef.current.every(Boolean),
  );
  const activeSpeechProgressPercent = activeSpeechProgress
    ? Math.min(100, (activeSpeechProgress.elapsedSeconds / activeSpeechProgress.totalSeconds) * 100)
    : 0;
  const firstTranscriptActivityId = transcriptEntries.find(
    (entry) => entry.kind === 'activity',
  )?.id;
  const activityContextByMessageId = useMemo(() => {
    const contexts = new Map<string, { count: number; activityIds: string[] }>();
    let pendingActivityIds: string[] = [];
    let pendingTurnId = '';
    for (const entry of transcriptEntries) {
      if (entry.kind === 'activity') {
        const activityTurnId = entry.activity.turnId || '';
        if (pendingActivityIds.length && activityTurnId !== pendingTurnId) {
          pendingActivityIds = [];
        }
        pendingTurnId = activityTurnId;
        pendingActivityIds.push(entry.id);
        continue;
      }
      const message = entry.message;
      if (message.role === 'user') {
        pendingActivityIds = [];
        pendingTurnId = message.turnId || '';
        continue;
      }
      const sameTurn = !pendingTurnId || !message.turnId || pendingTurnId === message.turnId;
      if (pendingActivityIds.length && sameTurn) {
        contexts.set(message.id, {
          count: pendingActivityIds.length,
          activityIds: pendingActivityIds,
        });
      }
      pendingActivityIds = [];
      pendingTurnId = message.turnId || '';
    }
    return contexts;
  }, [transcriptEntries]);
  const interruptedAgents = status?.agents?.filter((agent) => agent.status === 'interrupted') ?? [];
  const selectedTeamResumeState =
    teamResumeState?.threadId === (selectedThreadId || status?.thread?.id)
      ? teamResumeState
      : undefined;
  const resumingAgentIds = new Set(selectedTeamResumeState?.agentIds ?? []);
  const isTeamResumePending = Boolean(selectedTeamResumeState?.agentIds.length);
  const agentTeamsAfterMessage = useMemo(() => {
    const messages = status?.messages ?? [];
    const anchorMessageByTurn = new Map<string, string>();
    for (const message of messages) {
      if (message.turnId && !anchorMessageByTurn.has(message.turnId)) {
        anchorMessageByTurn.set(message.turnId, message.id);
      }
    }
    const fallbackMessageId = messages.at(-1)?.id;
    const teamsByTurn = new Map<string, CodexAgent[]>();
    for (const agent of status?.agents ?? []) {
      const teamKey = agent.supervisorTurnId || '__legacy-agent-team__';
      teamsByTurn.set(teamKey, [...(teamsByTurn.get(teamKey) ?? []), agent]);
    }
    const teamsByMessage = new Map<
      string,
      Array<{ key: string; label: string; agents: CodexAgent[] }>
    >();
    const selectedTeamKeys: string[] = [];
    if (status?.thread?.activeTurnId) {
      if (teamsByTurn.has(status.thread.activeTurnId)) {
        selectedTeamKeys.push(status.thread.activeTurnId);
      }
    } else {
      const latestVisibleTeamKey = [...messages]
        .reverse()
        .map((message) => message.turnId)
        .find((turnId) => Boolean(turnId && teamsByTurn.has(turnId)));
      if (latestVisibleTeamKey) selectedTeamKeys.push(latestVisibleTeamKey);
      else if (teamsByTurn.has('__legacy-agent-team__')) {
        selectedTeamKeys.push('__legacy-agent-team__');
      }
    }
    for (const key of selectedTeamKeys) {
      const agents = teamsByTurn.get(key) ?? [];
      const messageId =
        key === '__legacy-agent-team__' ? fallbackMessageId : anchorMessageByTurn.get(key);
      if (!messageId) continue;
      teamsByMessage.set(messageId, [
        ...(teamsByMessage.get(messageId) ?? []),
        {
          key,
          label: 'Agent team',
          agents,
        },
      ]);
    }
    return teamsByMessage;
  }, [status?.agents, status?.messages, status?.thread?.activeTurnId]);
  const legacyAgents = status?.agents?.filter((agent) => !agent.supervisorTurnId) ?? [];
  const currentActiveAgents = status?.thread?.activeTurnId
    ? activeAgents.filter(
        (agent) =>
          !agent.supervisorTurnId || agent.supervisorTurnId === status.thread?.activeTurnId,
      )
    : [];
  const isCodexWorking = status?.thread?.working === true || currentActiveAgents.length > 0;
  const hasUnseenCompletion = unseenCompletionThreadIds.size > 0;
  const hasActiveTeam = currentActiveAgents.length > 0;
  const anyConversationWorking = status?.threads.some((thread) => thread.working) === true;
  const queuedCount = status?.queuedCount ?? 0;
  const interruptingCount = status?.interruptingCount ?? 0;
  const activeFlags = status?.thread?.activeFlags ?? [];
  const hasActiveProgressUpdate =
    status?.messages.some(
      (message) =>
        message.role === 'assistant' &&
        message.phase === 'commentary' &&
        (!status.thread?.activeTurnId || message.turnId === status.thread.activeTurnId),
    ) === true;
  const workingTitle =
    isStoppingTurn || interruptingCount
      ? 'Stopping the current turn'
      : activeFlags.includes('waitingOnApproval')
        ? 'Waiting for approval'
        : activeFlags.includes('waitingOnUserInput')
          ? 'Waiting for your input'
          : hasActiveProgressUpdate
            ? 'Working through the next step'
            : 'Getting oriented';
  const workingDetail = isStoppingTurn
    ? 'Sending the stop request for this conversation and its active agent team.'
    : interruptingCount
      ? `${interruptingCount} ${interruptingCount === 1 ? 'message is' : 'messages are'} lined up next`
      : activeFlags.includes('waitingOnApproval')
        ? 'Codex will continue as soon as the requested approval is available.'
        : activeFlags.includes('waitingOnUserInput')
          ? 'Codex needs your response before it can continue safely.'
          : hasActiveProgressUpdate
            ? 'The latest progress is above. Another update will appear after the next verified step.'
            : 'Reading your request and workspace context before acting.';

  useEffect(() => {
    if (!isCodexWorking && !anyConversationWorking) return;
    setClock(Date.now());
    const interval = window.setInterval(() => setClock(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [
    anyConversationWorking,
    isCodexWorking,
    status?.thread?.id,
    status?.thread?.workingStartedAt,
  ]);

  useEffect(() => {
    if (!conversationPickerOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!conversationPickerRef.current?.contains(event.target as Node)) {
        setConversationPickerOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [conversationPickerOpen]);

  useEffect(() => {
    if (!embedded || window.parent === window) return;
    window.parent.postMessage(
      {
        source: 'made-solid-codex-panel',
        ready: isSupported !== undefined,
        open: phase !== 'closed',
        expanded: phase === 'selecting',
      },
      '*',
    );
  }, [embedded, isSupported, phase]);

  const availableModels = useMemo(() => status?.models ?? [], [status?.models]);
  const selectedThread =
    status?.threads.find((thread) => thread.id === (selectedThreadId || status?.thread?.id)) ??
    status?.thread;
  const conversationPendingDeletion = status?.threads.find(
    (thread) => thread.id === deleteConversationId,
  );
  const clientWorkspaceLabel = workspaceDirectory
    ? workspaceDirectory.replace(/[._-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
    : '';
  const clientThreads = (status?.threads ?? []).filter((thread) => thread.scope === 'client');
  const universalThreads = (status?.threads ?? []).filter((thread) => thread.scope !== 'client');
  const selectedModel = availableModels.find((model) => model.id === selectedModelId);
  const temporaryQuestionModel =
    availableModels.find((model) => /(?:^|[-_.])luna(?:$|[-_.])/i.test(model.id)) ??
    selectedModel ??
    availableModels.find((model) => model.isDefault) ??
    availableModels[0];
  const selectedFastTier = selectedModel?.serviceTiers?.find((tier) => tier.id === 'priority');
  const fastModeAvailable = Boolean(selectedFastTier);
  const selectedServiceTier = fastMode && fastModeAvailable ? 'priority' : 'default';
  const stopActiveTurnSupported = status?.capabilities?.stopActiveTurn === true;
  const isInterrupted = selectedThread?.interrupted === true;
  const selectionRectangle = selectedRectangle(selection);
  const selectionReady = Boolean(
    selectionRectangle && selectionRectangle.width >= 12 && selectionRectangle.height >= 12,
  );

  const chooseEffort = (modelId: string, effort: string) => {
    setSelectedEffort(effort);
    setEffortPreferences((current) =>
      current[modelId] === effort ? current : { ...current, [modelId]: effort },
    );
  };

  const chooseModel = (model: CodexModel) => {
    const effort = modelEffort(model, effortPreferences[model.id] || selectedEffort);
    setSelectedModelId(model.id);
    chooseEffort(model.id, effort);
  };

  useEffect(() => {
    if (!selectedModel) return;
    const effort = modelEffort(selectedModel, selectedEffort);
    if (effort !== selectedEffort) chooseEffort(selectedModel.id, effort);
  }, [selectedEffort, selectedModel]);

  useEffect(() => {
    if (!selectedModelId || !selectedEffort) return;
    const preferences = {
      modelId: selectedModelId,
      effortByModel: { ...effortPreferences, [selectedModelId]: selectedEffort },
      workMode,
      fastMode,
      autoReadCodex,
      speechLanguage: selectedSpeechLanguage,
      speechRate: selectedSpeechRate,
      speechStyle: selectedSpeechStyle,
      speechVoice: selectedSpeechVoice,
    } satisfies CodexPreferences;
    window.localStorage.setItem(codexPreferencesKey, JSON.stringify(preferences));
    if (!runtimePreferencesReady) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void studioRuntimeFetch(codexPreferencesEndpoint, {
        body: JSON.stringify({ preferences }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PUT',
        signal: controller.signal,
      }).catch(() => undefined);
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [
    autoReadCodex,
    effortPreferences,
    fastMode,
    selectedEffort,
    selectedModelId,
    selectedSpeechLanguage,
    selectedSpeechRate,
    selectedSpeechStyle,
    selectedSpeechVoice,
    runtimePreferencesReady,
    workMode,
  ]);

  useEffect(() => {
    if (phase === 'closed' || cloudSpeechConfiguration) return;
    const controller = new AbortController();
    void studioRuntimeFetch(codexSpeechEndpoint, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Speech configuration is unavailable.');
        return (await response.json()) as CloudSpeechConfiguration;
      })
      .then((configuration) => {
        if (!Array.isArray(configuration.voices) || !configuration.voices.length) return;
        setCloudSpeechConfiguration(configuration);
        const chosen =
          configuration.voices.find(({ id }) => id === selectedSpeechVoice) ??
          configuration.voices
            .filter(({ languageCode }) => languageCode === selectedSpeechLanguage)
            .sort((left, right) => left.qualityRank - right.qualityRank)[0] ??
          configuration.voices.find(({ id }) => id === configuration.defaultVoice) ??
          configuration.voices[0];
        setSelectedSpeechVoice(chosen.id);
        setSelectedSpeechLanguage(chosen.languageCode);
        setSelectedSpeechModel(chosen.model);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [cloudSpeechConfiguration, phase, selectedSpeechLanguage, selectedSpeechVoice]);

  const discardEmptyConversation = async (threadId: string) => {
    const candidate = status?.threads.find((thread) => thread.id === threadId);
    if (!threadId || !candidate?.discardable) return;
    try {
      const response = await studioRuntimeFetch(feedbackEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          action: 'delete-empty-thread',
          threadId,
          threadScope: candidate.scope || (workspaceDirectory ? 'client' : 'universal'),
          workspace: workspaceDirectory,
        }),
      });
      const result = (await response.json()) as { deleted?: boolean };
      if (!response.ok || !result.deleted) return;
      setStatus((current) =>
        current
          ? {
              ...current,
              thread: current.thread?.id === threadId ? undefined : current.thread,
              threads: current.threads.filter((thread) => thread.id !== threadId),
            }
          : current,
      );
    } catch {
      // A failed cleanup must not block navigation to another conversation.
    }
  };

  const deleteConversation = async () => {
    const threadId = deleteConversationId;
    const candidate = status?.threads.find((thread) => thread.id === threadId);
    if (!threadId || !candidate || isDeletingConversation) return;
    setIsDeletingConversation(true);
    setDeleteConversationError('');
    try {
      const response = await studioRuntimeFetch(feedbackEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          action: 'delete-thread',
          threadId,
          threadScope: candidate.scope || (workspaceDirectory ? 'client' : 'universal'),
          workspace: workspaceDirectory,
        }),
      });
      const result = (await response.json()) as { deleted?: boolean; detail?: string };
      if (!response.ok || !result.deleted) {
        throw new Error(result.detail || 'This conversation could not be deleted.');
      }

      deletedThreadIdsRef.current.add(threadId);
      const remainingThreads = (status?.threads ?? []).filter((thread) => thread.id !== threadId);
      const deletingSelected =
        threadId === (selectedThreadIdRef.current || status?.thread?.id || '');
      const fallbackThread = deletingSelected
        ? (remainingThreads.find((thread) => thread.scope === candidate.scope) ??
          remainingThreads[0])
        : undefined;
      const nextWorkingByThread = { ...workingByThreadRef.current };
      delete nextWorkingByThread[threadId];
      const nextUnseenThreadIds = new Set(unseenCompletionThreadIdsRef.current);
      nextUnseenThreadIds.delete(threadId);
      saveConversationLifecycle(nextWorkingByThread, nextUnseenThreadIds);
      const nextPositions = { ...chatSessionRef.current.positions };
      delete nextPositions[threadId];
      updateChatSession({ positions: nextPositions });
      setStatus((current) =>
        current
          ? {
              ...current,
              thread: current.thread?.id === threadId ? fallbackThread : current.thread,
              threads: current.threads.filter((thread) => thread.id !== threadId),
            }
          : current,
      );
      setDeleteConversationId('');
      setConversationPickerOpen(false);
      if (deletingSelected && fallbackThread) {
        selectConversation(fallbackThread.id, fallbackThread.scope);
        await refreshStatus(fallbackThread.id, fallbackThread.scope, true);
      } else if (deletingSelected) {
        selectedThreadIdRef.current = '';
        selectedThreadScopeRef.current = candidate.scope;
        setSelectedThreadId('');
        updateChatSession({
          selectedThreadId: '',
          selectedThreadScope: candidate.scope,
        });
      }
    } catch (cause) {
      setDeleteConversationError(
        cause instanceof Error ? cause.message : 'This conversation could not be deleted.',
      );
    } finally {
      setIsDeletingConversation(false);
    }
  };

  const beginConversationTransition = (transition: ConversationTransition) => {
    conversationTransitionRef.current = transition;
    setConversationTransition(transition);
  };

  const finishConversationTransition = (transitionId: number) => {
    if (conversationTransitionRef.current?.id === transitionId) {
      conversationTransitionRef.current = undefined;
    }
    setConversationTransition((current) => (current?.id === transitionId ? undefined : current));
  };

  const createConversation = async () => {
    if (!selectedModel || !selectedEffort || isCreatingThread || conversationTransition) return;
    const transitionId = conversationTransitionIdRef.current + 1;
    conversationTransitionIdRef.current = transitionId;
    beginConversationTransition({ id: transitionId, kind: 'create', label: 'New chat' });
    setIsCreatingThread(true);
    setError(undefined);
    try {
      await discardEmptyConversation(selectedThreadId || status?.thread?.id || '');
      const response = await studioRuntimeFetch(feedbackEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          action: 'new-thread',
          model: selectedModel.id,
          effort: selectedEffort,
          serviceTier: selectedServiceTier,
          threadScope: workspaceDirectory ? 'client' : 'universal',
          workspace: workspaceDirectory,
        }),
      });
      const result = (await response.json()) as {
        thread?: CodexThread;
        detail?: string;
      };
      if (!response.ok || !result.thread?.id) {
        throw new Error(result.detail || 'A new Codex conversation could not be created.');
      }
      const newThread = result.thread;
      setStatus((current) =>
        current
          ? {
              ...current,
              thread: newThread,
              threads: [
                newThread,
                ...current.threads.filter((thread) => thread.id !== newThread.id),
              ],
              messages: [],
              activities: [],
              agents: [],
              queuedCount: 0,
              interruptingCount: 0,
              queuedMessages: [],
            }
          : current,
      );
      selectConversation(newThread.id, newThread.scope);
      setPendingChatMessage(undefined);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'A new Codex conversation could not be created.',
      );
    } finally {
      setIsCreatingThread(false);
      finishConversationTransition(transitionId);
    }
  };

  const branchConversation = async (message: CodexStatus['messages'][number]) => {
    const sourceThreadId = selectedThreadId || status?.thread?.id || '';
    const sourceThreadScope = selectedThread?.scope;
    if (
      !sourceThreadId ||
      !message.turnId ||
      message.role !== 'assistant' ||
      message.phase === 'commentary' ||
      !canBranchCodexMessage(message, status?.thread, status?.messages || []) ||
      conversationTransition
    )
      return;
    const transitionId = conversationTransitionIdRef.current + 1;
    conversationTransitionIdRef.current = transitionId;
    beginConversationTransition({ id: transitionId, kind: 'branch', label: 'Branched chat' });
    setError(undefined);
    try {
      const response = await studioRuntimeFetch(branchEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          action: 'branch-thread',
          threadId: sourceThreadId,
          turnId: message.turnId,
          threadScope: sourceThreadScope || (workspaceDirectory ? 'client' : 'universal'),
          workspace: workspaceDirectory,
        }),
      });
      const result = await readBranchResponse(response);
      if (!response.ok || !result.thread?.id) {
        throw new Error(result.detail || 'The Codex conversation could not be branched.');
      }
      const branchedThread = result.thread;
      selectConversation(branchedThread.id, branchedThread.scope);
      const loaded = await refreshStatus(branchedThread.id, branchedThread.scope, true);
      if (!loaded && selectedThreadIdRef.current === branchedThread.id) {
        selectConversation(sourceThreadId, sourceThreadScope);
        await refreshStatus(sourceThreadId, sourceThreadScope, true);
        throw new Error(
          'The branch was created but could not be opened. Your original chat is still selected.',
        );
      }
      setPendingChatMessage(undefined);
      setPendingVisualMessage(undefined);
      window.requestAnimationFrame(() => composerTextareaRef.current?.focus());
    } catch (cause) {
      if (selectedThreadIdRef.current !== sourceThreadId) {
        selectConversation(sourceThreadId, sourceThreadScope);
      }
      setError(
        cause instanceof Error ? cause.message : 'The Codex conversation could not be branched.',
      );
    } finally {
      finishConversationTransition(transitionId);
    }
  };

  const switchConversation = async (thread: CodexThread) => {
    if (
      conversationTransition ||
      thread.id === (selectedThreadId || status?.thread?.id) ||
      !thread.id
    )
      return;
    const previousThreadId = selectedThreadId || status?.thread?.id || '';
    const previousThreadScope = selectedThread?.scope;
    const transitionId = conversationTransitionIdRef.current + 1;
    conversationTransitionIdRef.current = transitionId;
    beginConversationTransition({
      id: transitionId,
      kind: 'switch',
      label: threadTitle(thread),
    });
    setError(undefined);
    selectConversation(thread.id, thread.scope);
    const loaded = await refreshStatus(thread.id, thread.scope, true);
    if (!loaded && selectedThreadIdRef.current === thread.id) {
      selectConversation(previousThreadId, previousThreadScope);
      setError('That conversation could not be loaded. Your previous chat is still available.');
    }
    finishConversationTransition(transitionId);
  };

  const continueInterruptedConversation = async () => {
    if (
      !selectedThread?.id ||
      !selectedModel ||
      !selectedEffort ||
      isResumingThread ||
      isTeamResumePending
    )
      return;
    setIsResumingThread(true);
    setTeamResumeState(
      interruptedAgents.length
        ? {
            threadId: selectedThread.id,
            agentIds: interruptedAgents.map((agent) => agent.id),
            failedAgentIds: [],
          }
        : undefined,
    );
    setError(undefined);
    try {
      const response = await studioRuntimeFetch(feedbackEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          action: 'continue-interrupted-thread',
          threadId: selectedThread.id,
          model: selectedModel.id,
          effort: selectedEffort,
          serviceTier: selectedServiceTier,
          threadScope: selectedThread?.scope || (workspaceDirectory ? 'client' : 'universal'),
          workspace: workspaceDirectory,
        }),
      });
      const result = (await response.json()) as {
        detail?: string;
        resumeRequestedAgents?: Array<{ id: string; name: string }>;
        resumedAgents?: Array<{ id: string; name: string }>;
        agentResumeFailures?: Array<{ id: string; detail: string }>;
      };
      if (!response.ok) {
        throw new Error(result.detail || 'The interrupted conversation could not be resumed.');
      }
      const resumedAgentIds = (result.resumeRequestedAgents ?? result.resumedAgents ?? []).map(
        (agent) => agent.id,
      );
      const failedAgentIds = (result.agentResumeFailures ?? []).map((agent) => agent.id);
      setTeamResumeState(
        resumedAgentIds.length || failedAgentIds.length
          ? { threadId: selectedThread.id, agentIds: resumedAgentIds, failedAgentIds }
          : undefined,
      );
      await refreshStatus(selectedThread.id, selectedThread.scope);
      scrollChatToLatest();
    } catch (cause) {
      setTeamResumeState(undefined);
      setError(
        cause instanceof Error
          ? cause.message
          : 'The interrupted conversation could not be resumed.',
      );
    } finally {
      setIsResumingThread(false);
    }
  };

  useEffect(() => {
    if (!teamResumeState || teamResumeState.threadId !== selectedThread?.id) return;
    setTeamResumeState((current) => {
      if (!current || current.threadId !== selectedThread.id) return current;
      const stillResuming = current.agentIds.filter(
        (agentId) => status?.agents.find((agent) => agent.id === agentId)?.status === 'interrupted',
      );
      if (stillResuming.length === current.agentIds.length) return current;
      if (stillResuming.length || current.failedAgentIds.length) {
        return { ...current, agentIds: stillResuming };
      }
      return undefined;
    });
  }, [selectedThread?.id, status?.agents, teamResumeState?.threadId]);

  const beginCapture = async (preferCurrentTab = false) => {
    setError(undefined);
    try {
      const streamRequest = requestSharedScreen(preferCurrentTab);
      setCaptureDetail(
        preferCurrentTab
          ? 'Choose This Tab to capture the Studio exactly as it appears.'
          : 'Choose the tab or window you want Codex to inspect.',
      );
      setPhase('capturing');
      const screenshot = await captureSharedScreen(streamRequest);
      setSourceScreenshot(screenshot);
      setSelection(undefined);
      setPhase('selecting');
    } catch (cause) {
      setPhase('compose');
      if ((cause as DOMException)?.name !== 'AbortError') {
        setError(cause instanceof Error ? cause.message : 'The screen could not be captured.');
      }
    }
  };

  const beginCurrentTabCapture = async () => {
    setError(undefined);
    setCaptureDetail('Capturing this tab…');
    setPhase('capturing-tab');
    try {
      await waitForHiddenCaptureUi();
      const screenshot = await browserCaptureRequest('capture');
      if (!screenshot?.startsWith('data:image/png;base64,')) {
        throw new Error('The browser helper returned an invalid screenshot.');
      }
      setSourceScreenshot(screenshot);
      setSelection(undefined);
      setPhase('selecting');
    } catch (cause) {
      setPhase('compose');
      setError(
        cause instanceof Error ? cause.message : 'The current browser tab could not be captured.',
      );
    }
  };

  const beginLocalPageCapture = async () => {
    setError(undefined);
    setCaptureDetail('Capturing the current website workspace…');
    setPhase('capturing-tab');
    try {
      await waitForHiddenCaptureUi();
      const context = workspaceCaptureContext ?? {
        url: embedded && document.referrer ? document.referrer : window.location.href,
        title: document.title,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      };
      const response = await studioRuntimeFetch(localPageCaptureEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          targetUrl: context.url,
          scrollX: context.scrollX,
          scrollY: context.scrollY,
          viewportWidth: context.viewportWidth,
          viewportHeight: context.viewportHeight,
        }),
      });
      const result = (await response.json()) as { screenshot?: string; detail?: string };
      if (!response.ok || !result.screenshot?.startsWith('data:image/png;base64,')) {
        throw new Error(result.detail || 'The local workspace could not be captured.');
      }
      setSourceScreenshot(result.screenshot);
      setSelection(undefined);
      setPhase('selecting');
    } catch (cause) {
      setPhase('compose');
      setError(
        cause instanceof Error ? cause.message : 'The local workspace could not be captured.',
      );
    }
  };

  const beginMobilePageCapture = async () => {
    setError(undefined);
    setCaptureDetail('Capturing exactly what is visible…');
    setPhase('capturing-tab');
    try {
      await waitForHiddenCaptureUi();
      const screenshot = await captureVisiblePage();
      setSourceScreenshot(screenshot);
      setSelection(undefined);
      setPhase('selecting');
    } catch (cause) {
      setPhase('compose');
      setError(
        cause instanceof Error ? cause.message : 'The visible mobile page could not be captured.',
      );
    }
  };

  const beginPrimaryCapture = () => {
    if (browserCaptureAvailable) return beginCurrentTabCapture();
    if (workspaceCaptureContext) return beginLocalPageCapture();
    if (!sharedScreenSupported()) return beginMobilePageCapture();
    return beginCapture(true);
  };

  const appendDraftAttachment = (source: string, name: string) => {
    if (draftAttachments.length >= maximumDraftAttachments) {
      setError(`You can attach up to ${maximumDraftAttachments} images to one message.`);
      setPhase('compose');
      return;
    }
    setDraftAttachments((current) => [...current, { id: crypto.randomUUID(), name, source }]);
    setSelection(undefined);
    setError(undefined);
    setPhase('compose');
    window.requestAnimationFrame(() => composerTextareaRef.current?.focus());
  };

  const choosePhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';
    if (!files.length) return;
    const availableSlots = maximumDraftAttachments - draftAttachments.length;
    const selectedFiles = files.slice(0, Math.max(0, availableSlots));
    if (!selectedFiles.length) {
      setError(`You can attach up to ${maximumDraftAttachments} images to one message.`);
      return;
    }
    setIsPreparingPhoto(true);
    setError(undefined);
    try {
      const prepared = await Promise.allSettled(
        selectedFiles.map(async (file) => ({
          id: crypto.randomUUID(),
          name: file.name || 'Selected image',
          source: await readPhotoFile(file),
        })),
      );
      const ready = prepared.flatMap((result) =>
        result.status === 'fulfilled' ? [result.value] : [],
      );
      if (ready.length) setDraftAttachments((current) => [...current, ...ready]);
      const rejected = prepared.filter((result) => result.status === 'rejected');
      const omitted = files.length - selectedFiles.length;
      if (rejected.length || omitted) {
        const messages = [];
        if (rejected.length) {
          messages.push(
            `${rejected.length} ${rejected.length === 1 ? 'image was' : 'images were'} not added. Use JPEG, PNG, or WebP files smaller than 15 MB.`,
          );
        }
        if (omitted) messages.push(`Only ${maximumDraftAttachments} images can be attached.`);
        setError(messages.join(' '));
      }
      setIsComposerExpanded(true);
      window.requestAnimationFrame(() => composerTextareaRef.current?.focus());
    } finally {
      setIsPreparingPhoto(false);
    }
  };

  const pointerPosition = (event: ReactPointerEvent<HTMLElement>) => {
    const image = selectionImageRef.current;
    if (!image) return undefined;
    const bounds = image.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(bounds.width, event.clientX - bounds.left)),
      y: Math.max(0, Math.min(bounds.height, event.clientY - bounds.top)),
    };
  };

  const startSelection = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const point = pointerPosition(event);
    if (!point) return;
    selectionPointerRef.current = { pointerId: event.pointerId, start: point };
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelection({ start: point, end: point });
    setError(undefined);
  };

  const moveSelection = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (selectionPointerRef.current?.pointerId !== event.pointerId) return;
    const point = pointerPosition(event);
    if (!point) return;
    setSelection((current) => (current ? { ...current, end: point } : current));
  };

  const cancelSelection = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (selectionPointerRef.current?.pointerId !== event.pointerId) return;
    selectionPointerRef.current = undefined;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const cropSelection = (targetSelection = selection) => {
    const image = selectionImageRef.current;
    const rectangle = selectedRectangle(targetSelection);
    if (!image || !rectangle || rectangle.width < 12 || rectangle.height < 12) {
      setError('Drag a larger rectangle around the part you want Codex to inspect.');
      return;
    }
    const bounds = image.getBoundingClientRect();
    const scaleX = image.naturalWidth / bounds.width;
    const scaleY = image.naturalHeight / bounds.height;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(rectangle.width * scaleX));
    canvas.height = Math.max(1, Math.round(rectangle.height * scaleY));
    const context = canvas.getContext('2d');
    if (!context) {
      setError('The selected screenshot could not be prepared.');
      return;
    }
    context.drawImage(
      image,
      rectangle.left * scaleX,
      rectangle.top * scaleY,
      rectangle.width * scaleX,
      rectangle.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    appendDraftAttachment(
      canvas.toDataURL('image/png'),
      `Screenshot ${draftAttachments.length + 1}`,
    );
  };

  const useWholeScreenshot = () => {
    if (!sourceScreenshot.startsWith('data:image/')) {
      setError('Capture the page before choosing the whole screenshot.');
      return;
    }
    appendDraftAttachment(sourceScreenshot, `Screenshot ${draftAttachments.length + 1}`);
  };

  const finishSelection = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = selectionPointerRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const end = pointerPosition(event) ?? gesture.start;
    const completedSelection = { start: gesture.start, end };
    cancelSelection(event);
    setSelection(completedSelection);
    const rectangle = selectedRectangle(completedSelection);
    if (rectangle && rectangle.width >= 12 && rectangle.height >= 12) {
      cropSelection(completedSelection);
    } else {
      setError('Drag a larger rectangle around the part you want Codex to inspect.');
    }
  };

  const runQueueAction = async (
    action: 'update-queued' | 'interrupt-queued' | 'delete-queued',
    id: string,
    queuedPrompt?: string,
  ) => {
    setQueueActionId(id);
    setQueueActionError('');
    try {
      const response = await studioRuntimeFetch(feedbackEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          action,
          id,
          prompt: queuedPrompt,
          threadScope: selectedThread?.scope || (workspaceDirectory ? 'client' : 'universal'),
          workspace: workspaceDirectory,
        }),
      });
      const result = (await response.json()) as { id?: string; detail?: string };
      if (!response.ok)
        throw new Error(result.detail || 'The queued message could not be changed.');
      if (action === 'update-queued') setExpandedQueueId('');
      if (action === 'delete-queued') {
        setDeleteQueueId('');
        if (expandedQueueId === id) setExpandedQueueId('');
        setQueuedEdits((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
      }
      await refreshStatus();
    } catch (cause) {
      setExpandedQueueId(id);
      setQueuedEdits((current) => ({
        ...current,
        [id]:
          queuedPrompt ??
          current[id] ??
          status?.queuedMessages?.find((message) => message.id === id)?.prompt ??
          '',
      }));
      setQueueActionError(
        cause instanceof Error ? cause.message : 'The queued message could not be changed.',
      );
    } finally {
      setQueueActionId('');
    }
  };

  const sendFeedback = async (submission?: {
    prompt: string;
    attachments?: DraftAttachment[];
    preserveDraft?: boolean;
  }) => {
    const submittedPrompt = (submission?.prompt ?? prompt).trim();
    const submittedAttachments = submission?.attachments ?? [...draftAttachments];
    const preserveDraft = submission?.preserveDraft === true;
    if (!submittedPrompt && submittedAttachments.length === 0) {
      setError('Describe what Codex should change or investigate, or attach an image.');
      return;
    }
    if (!selectedModel || !selectedEffort) {
      setError('Choose an available Codex model and reasoning level.');
      return;
    }
    const submittedThreadId = selectedThreadId || status?.thread?.id || '';
    const optimisticMessageId = crypto.randomUUID();
    if (!submittedAttachments.length) {
      setPendingChatMessage({
        id: optimisticMessageId,
        text: submittedPrompt,
        threadId: submittedThreadId,
      });
    } else {
      setPendingVisualMessage({
        id: optimisticMessageId,
        text: submittedPrompt,
        images: submittedAttachments.map((attachment) => attachment.source),
        threadId: submittedThreadId,
      });
    }
    if (!preserveDraft) {
      setPrompt('');
      setDraftAttachments([]);
      setIsComposerExpanded(false);
    }
    setPhase('sending-chat');
    setError(undefined);
    window.requestAnimationFrame(scrollChatToLatest);
    try {
      const response = await studioRuntimeFetch(feedbackEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          action: 'enqueue',
          screenshots: submittedAttachments.map((attachment) => attachment.source),
          prompt: submittedPrompt,
          model: selectedModel.id,
          effort: selectedEffort,
          serviceTier: selectedServiceTier,
          workMode,
          context: `${document.title} · ${window.location.href}`,
          threadId: submittedThreadId,
          threadScope: selectedThread?.scope || (workspaceDirectory ? 'client' : 'universal'),
          workspace: workspaceDirectory,
        }),
      });
      const result = (await response.json()) as { id?: string; detail?: string };
      if (!response.ok) throw new Error(result.detail || 'Codex could not accept this feedback.');
      const resultId = result.id;
      if (!submittedAttachments.length) {
        if (resultId) {
          setPendingChatMessage((current) => (current ? { ...current, id: resultId } : current));
        }
      } else {
        if (resultId) {
          setPendingVisualMessage((current) => (current ? { ...current, id: resultId } : current));
        }
      }
      setPhase('compose');
      await refreshStatus();
    } catch (cause) {
      setPendingChatMessage(undefined);
      setPendingVisualMessage(undefined);
      if (!preserveDraft) {
        setPrompt(submittedPrompt);
        setDraftAttachments(submittedAttachments);
        setIsComposerExpanded(true);
      }
      setPhase('compose');
      setError(cause instanceof Error ? cause.message : 'Codex could not accept this feedback.');
      if (!preserveDraft) window.requestAnimationFrame(() => composerTextareaRef.current?.focus());
    }
  };

  const stopActiveTurn = async () => {
    if (!selectedThread?.id || isStoppingTurn) return;
    setIsStoppingTurn(true);
    setError(undefined);
    try {
      const response = await studioRuntimeFetch(feedbackEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          action: 'stop-active-turn',
          threadId: selectedThread.id,
          threadScope: selectedThread.scope || (workspaceDirectory ? 'client' : 'universal'),
          workspace: workspaceDirectory,
        }),
      });
      const result = (await response.json()) as { detail?: string };
      if (!response.ok) throw new Error(result.detail || 'Codex could not stop this turn.');
      await refreshStatus(selectedThread.id, selectedThread.scope);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Codex could not stop this turn.');
    } finally {
      setIsStoppingTurn(false);
    }
  };

  const clearSelectedExcerpt = () => {
    setSelectedExcerpt(undefined);
    window.getSelection()?.removeAllRanges();
  };

  const appendSelectedExcerpt = () => {
    if (!selectedExcerpt) return;
    const excerpt = quotedCodexExcerpt(selectedExcerpt.text);
    const nextPrompt = prompt.trimEnd()
      ? `${prompt.trimEnd()}\n\n${excerpt}\n\n`
      : `${excerpt}\n\n`;
    if (nextPrompt.length > 4_000) {
      setError('That excerpt will not fit in this draft. Shorten the selection and try again.');
      return;
    }
    setPrompt(nextPrompt);
    setError(undefined);
    setIsComposerExpanded(true);
    clearSelectedExcerpt();
    window.requestAnimationFrame(() => {
      const textarea = composerTextareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(nextPrompt.length, nextPrompt.length);
    });
  };

  const sendSelectedExcerpt = () => {
    if (!selectedExcerpt) return;
    const excerpt = quotedCodexExcerpt(
      selectedExcerpt.text,
      'Please respond to this Codex excerpt:',
    );
    if (excerpt.length > 4_000) {
      setError('That excerpt is too long to send. Shorten the selection and try again.');
      return;
    }
    clearSelectedExcerpt();
    void sendFeedback({ prompt: excerpt, attachments: [], preserveDraft: true });
  };

  const openTemporaryQuestion = () => {
    if (!selectedExcerpt || !selectedThread?.id) return;
    if (selectedExcerpt.text.length > 3_000) {
      setError('Select a shorter excerpt for a quick question.');
      return;
    }
    setTemporaryQuestion({
      excerpt: selectedExcerpt.text,
      messageId: selectedExcerpt.messageId,
      phase: 'compose',
      question: '',
      speechId: `quick-answer-${selectedExcerpt.messageId}`,
      threadId: selectedThread.id,
      turnId: selectedExcerpt.turnId,
    });
    clearSelectedExcerpt();
    window.requestAnimationFrame(() => temporaryQuestionTextareaRef.current?.focus());
  };

  const closeTemporaryQuestion = () => {
    temporaryQuestionAbortRef.current?.abort();
    temporaryQuestionAbortRef.current = undefined;
    setAutoReadPending((current) =>
      current?.id === temporaryQuestion?.speechId ? undefined : current,
    );
    if (speechMessageIdRef.current === temporaryQuestion?.speechId) stopCodexSpeech(false);
    setTemporaryQuestion(undefined);
  };

  const askTemporaryQuestion = async () => {
    if (!temporaryQuestion?.question.trim() || !temporaryQuestionModel) return;
    const controller = new AbortController();
    temporaryQuestionAbortRef.current?.abort();
    temporaryQuestionAbortRef.current = controller;
    setTemporaryQuestion((current) =>
      current ? { ...current, error: undefined, phase: 'loading' } : current,
    );
    try {
      const response = await studioRuntimeFetch(feedbackEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          action: 'temporary-question',
          excerpt: temporaryQuestion.excerpt,
          messageId: temporaryQuestion.messageId,
          question: temporaryQuestion.question.trim(),
          model: temporaryQuestionModel.id,
          threadId: temporaryQuestion.threadId,
          threadScope: selectedThread?.scope || (workspaceDirectory ? 'client' : 'universal'),
          turnId: temporaryQuestion.turnId,
          workspace: workspaceDirectory,
        }),
        signal: controller.signal,
      });
      const result = (await response.json()) as {
        answer?: string;
        detail?: string;
        model?: string;
      };
      if (!response.ok || !result.answer) {
        throw new Error(result.detail || 'Codex could not answer that temporary question.');
      }
      if (temporaryQuestionAbortRef.current !== controller) return;
      setTemporaryQuestion((current) =>
        current
          ? {
              ...current,
              answer: result.answer,
              error: undefined,
              model: result.model,
              phase: 'answer',
            }
          : current,
      );
      if (autoReadCodex && speechSupported) {
        setAutoReadPending({
          id: temporaryQuestion.speechId,
          phase: 'final',
          text: result.answer,
          turnId: temporaryQuestion.turnId,
        });
      }
    } catch (cause) {
      if (controller.signal.aborted) return;
      setTemporaryQuestion((current) =>
        current
          ? {
              ...current,
              error:
                cause instanceof Error
                  ? cause.message
                  : 'Codex could not answer that temporary question.',
              phase: 'compose',
            }
          : current,
      );
    } finally {
      if (temporaryQuestionAbortRef.current === controller) {
        temporaryQuestionAbortRef.current = undefined;
      }
    }
  };

  const closePanel = () => {
    saveChatPosition();
    updateChatSession({ isOpen: false });
    restoredChatThreadRef.current = '';
    stopCodexSpeech(false);
    void discardEmptyConversation(selectedThreadId || status?.thread?.id || '');
    setComposerSettingsOpen(false);
    setChatPreferencesOpen(false);
    setPhase('closed');
    setError(undefined);
  };

  return (
    <>
      {!page ? (
        <IconButton
          aria-busy={isSupported === undefined}
          className={`codex-feedback-trigger${embedded ? ' is-embedded' : ''}${isCodexWorking ? ' is-working' : ''}${hasUnseenCompletion ? ' has-completion' : ''}`}
          disabled={isSupported === false}
          label={
            isSupported === undefined
              ? 'Connecting to Codex'
              : isSupported === false
                ? 'Codex chat is unavailable'
                : isCodexWorking
                  ? 'Codex is working'
                  : hasUnseenCompletion
                    ? 'Codex finished — open chat'
                    : 'Chat with Codex'
          }
          onClick={() => {
            markConversationViewed(selectedThreadIdRef.current || status?.thread?.id);
            restoredChatThreadRef.current = '';
            updateChatSession({ isOpen: true });
            setPhase('compose');
            setError(undefined);
            void refreshStatus();
          }}
          ref={triggerRef}
          variant="primary"
        >
          {isSupported === undefined || isCodexWorking ? (
            <LoaderCircle aria-hidden="true" className="is-spinning" size={20} />
          ) : hasUnseenCompletion ? (
            <BellRing aria-hidden="true" size={20} />
          ) : (
            <MessageSquareText aria-hidden="true" size={20} />
          )}
        </IconButton>
      ) : null}

      <Dialog.Root
        modal={!page}
        onOpenChange={(open) => !page && !open && closePanel()}
        open={page || phase === 'compose' || phase === 'sending-chat'}
      >
        <Dialog.Portal container={portalContainer}>
          {!page ? <Dialog.Overlay className="codex-feedback-overlay" /> : null}
          <Dialog.Content
            aria-describedby="codex-feedback-description"
            className={`codex-feedback-dialog codex-chat-dialog${embedded ? ' is-embedded' : ''}${page ? ' is-page' : ''}`}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              triggerRef.current?.focus();
            }}
            onEscapeKeyDown={(event) => {
              if (chatPreferencesOpen) {
                event.preventDefault();
                stopVoicePreview();
                setChatPreferencesOpen(false);
                window.requestAnimationFrame(() => chatPreferencesTriggerRef.current?.focus());
                return;
              }
              if (conversationPickerOpen) {
                event.preventDefault();
                setConversationPickerOpen(false);
                window.requestAnimationFrame(() => conversationTriggerRef.current?.focus());
                return;
              }
              if (composerSettingsOpen) {
                event.preventDefault();
                stopVoicePreview();
                setComposerSettingsOpen(false);
                return;
              }
              if (page) event.preventDefault();
            }}
          >
            <div className="codex-feedback-dialog__header">
              <div className="codex-feedback-dialog__identity">
                <span className="codex-feedback-dialog__icon" aria-hidden="true">
                  <Bot size={20} />
                </span>
                <div>
                  <Dialog.Title>
                    {workspaceDirectory ? `${clientWorkspaceLabel} website editor` : 'Codex'}{' '}
                    <span aria-hidden="true">Workspace Agent</span>
                  </Dialog.Title>
                  <div className="codex-feedback-dialog__status">
                    <span
                      aria-hidden="true"
                      className={status?.status === 'ready' ? 'is-ready' : ''}
                    />
                    <span>
                      {status?.billing?.label ?? 'ChatGPT subscription'} ·{' '}
                      {status?.thread ? 'connected' : 'waiting'}
                    </span>
                    <StatusBadge tone={status?.thread ? 'success' : 'warning'}>
                      {activeAgents.length
                        ? `${activeAgents.length} agent${activeAgents.length === 1 ? '' : 's'}`
                        : status?.thread?.working
                          ? 'Working'
                          : status?.queuedCount
                            ? `${status.queuedCount} queued`
                            : status?.thread?.interrupted
                              ? 'Interrupted'
                              : status?.thread
                                ? 'Ready'
                                : 'Waiting'}
                    </StatusBadge>
                  </div>
                </div>
              </div>
              {!page ? (
                <Dialog.Close asChild>
                  <IconButton label="Close Codex chat" variant="quiet">
                    <X aria-hidden="true" size={18} />
                  </IconButton>
                </Dialog.Close>
              ) : null}
            </div>

            <Dialog.Description className="sr-only" id="codex-feedback-description">
              {workspaceDirectory
                ? `Chat with Codex about the ${clientWorkspaceLabel} client website or open a universal Studio chat. Other client conversations are hidden.`
                : 'Chat with the subscription-only Codex Workspace Agent and optionally attach a photo or screenshot.'}
            </Dialog.Description>
            <section aria-label="Chat workspace scope" className="codex-workspace-scope">
              {workspaceDirectory ? (
                <PanelsTopLeft aria-hidden="true" size={18} />
              ) : (
                <Globe2 aria-hidden="true" size={18} />
              )}
              <span>
                <strong>
                  {workspaceDirectory
                    ? `Editing only ${clientWorkspaceLabel}`
                    : 'Universal Studio chats'}
                </strong>
                <small>
                  {workspaceDirectory
                    ? 'Client chats can edit this website only. Universal Studio chats remain available below.'
                    : 'These conversations aren’t tied to one client website.'}
                </small>
              </span>
            </section>
            {status?.status === 'unavailable' ? (
              <p className="codex-feedback-error" role="status">
                <CircleAlert aria-hidden="true" size={18} />
                {status.detail}
              </p>
            ) : null}
            <p aria-live="polite" className="sr-only" role="status">
              {speechStatus}
            </p>

            <div className="codex-thread-field">
              <div className="codex-thread-field__header">
                <label className="sr-only" htmlFor="codex-conversation">
                  Conversation
                </label>
              </div>
              <div className="codex-conversation-picker" ref={conversationPickerRef}>
                <Button
                  aria-controls="codex-conversation-menu"
                  aria-expanded={conversationPickerOpen}
                  aria-haspopup="menu"
                  aria-label="Conversation"
                  className="codex-conversation-picker__trigger"
                  disabled={!status?.threads.length || Boolean(conversationTransition)}
                  id="codex-conversation"
                  onClick={() => setConversationPickerOpen((open) => !open)}
                  ref={conversationTriggerRef}
                  variant="quiet"
                >
                  <span className="codex-conversation-picker__summary">
                    <strong>
                      {conversationTransition?.kind === 'create'
                        ? 'Starting a new chat'
                        : conversationTransition?.kind === 'branch'
                          ? 'Branching conversation'
                          : threadTitle(selectedThread)}
                    </strong>
                    <small>
                      {workspaceDirectory ? (
                        <span
                          className={`codex-thread-scope is-${selectedThread?.scope ?? 'client'}`}
                        >
                          {selectedThread?.scope === 'universal' ? 'Universal' : 'This client'}
                        </span>
                      ) : null}
                      {conversationTransition
                        ? conversationTransition.kind === 'create'
                          ? 'Preparing conversation'
                          : conversationTransition.kind === 'branch'
                            ? 'Copying conversation'
                            : 'Loading conversation'
                        : selectedThread?.working
                          ? 'Working'
                          : selectedThread?.interrupted
                            ? 'Interrupted'
                            : 'Last used'}
                      {!conversationTransition ? (
                        <>
                          {' '}
                          ·{' '}
                          {selectedThread?.working
                            ? elapsedTime(selectedThread.workingStartedAt, clock)
                            : lastUsedTime(threadLastUsedAt(selectedThread), clock)}
                        </>
                      ) : null}
                    </small>
                  </span>
                  {conversationTransition || selectedThread?.working ? (
                    <LoaderCircle aria-hidden="true" className="is-spinning" size={17} />
                  ) : (
                    <ChevronDown aria-hidden="true" size={17} />
                  )}
                </Button>
                <IconButton
                  className="codex-conversation-picker__new"
                  disabled={
                    !status || !selectedModel || isCreatingThread || Boolean(conversationTransition)
                  }
                  label={
                    workspaceDirectory ? `New ${clientWorkspaceLabel} website chat` : 'New chat'
                  }
                  onClick={() => void createConversation()}
                  variant="quiet"
                >
                  {isCreatingThread ? (
                    <LoaderCircle aria-hidden="true" className="is-spinning" size={16} />
                  ) : (
                    <Plus aria-hidden="true" size={17} />
                  )}
                </IconButton>
                {conversationPickerOpen ? (
                  <div
                    aria-label="Available conversations"
                    className="codex-conversation-picker__menu"
                    id="codex-conversation-menu"
                    role="menu"
                  >
                    {(workspaceDirectory
                      ? [
                          {
                            icon: <PanelsTopLeft aria-hidden="true" size={14} />,
                            emptyLabel: 'No client chats yet',
                            label: `This client · ${clientWorkspaceLabel}`,
                            threads: clientThreads,
                          },
                          {
                            icon: <Globe2 aria-hidden="true" size={14} />,
                            emptyLabel: 'No Universal Studio chats yet',
                            label: 'Universal Studio',
                            threads: universalThreads,
                          },
                        ]
                      : [
                          {
                            icon: <Globe2 aria-hidden="true" size={14} />,
                            emptyLabel: 'No Studio conversations yet',
                            label: 'Studio conversations',
                            threads: universalThreads,
                          },
                        ]
                    ).map((group) => (
                      <div aria-label={group.label} key={group.label} role="group">
                        <p className="codex-conversation-picker__group-label" role="presentation">
                          {group.icon}
                          {group.label}
                        </p>
                        {group.threads.length ? (
                          group.threads.map((thread) => {
                            const selected = thread.id === (selectedThreadId || status?.thread?.id);
                            const unseenCompletion = unseenCompletionThreadIds.has(thread.id);
                            const lastUsedAt = threadLastUsedAt(thread);
                            const usedAt = timestampMilliseconds(lastUsedAt);
                            const queuedWork = status?.queuedMessages?.some(
                              (message) => message.threadId === thread.id,
                            );
                            const deletionBlocked = thread.working || queuedWork;
                            const title = threadTitle(thread);
                            return (
                              <div className="codex-conversation-picker__row" key={thread.id}>
                                <Button
                                  aria-checked={selected}
                                  className="codex-conversation-picker__option"
                                  disabled={Boolean(conversationTransition)}
                                  onClick={() => {
                                    void discardEmptyConversation(
                                      selectedThreadId || status?.thread?.id || '',
                                    );
                                    void switchConversation(thread);
                                  }}
                                  role="menuitemradio"
                                  variant="quiet"
                                >
                                  <span
                                    className={`codex-conversation-picker__state${unseenCompletion && !thread.working ? ' is-unread' : ''}`}
                                    aria-hidden="true"
                                  >
                                    {thread.working ? (
                                      <LoaderCircle className="is-spinning" size={16} />
                                    ) : unseenCompletion ? (
                                      <BellRing size={15} />
                                    ) : selected ? (
                                      <Check size={16} />
                                    ) : (
                                      <Clock3 size={15} />
                                    )}
                                  </span>
                                  <span className="codex-conversation-picker__option-copy">
                                    <strong>{title}</strong>
                                    <small>
                                      <span>
                                        {thread.working
                                          ? 'Working'
                                          : unseenCompletion
                                            ? 'Finished · Unread'
                                            : thread.interrupted
                                              ? 'Interrupted'
                                              : 'Ready'}
                                      </span>
                                      <time
                                        dateTime={
                                          usedAt ? new Date(usedAt).toISOString() : undefined
                                        }
                                        title={
                                          usedAt ? new Date(usedAt).toLocaleString() : undefined
                                        }
                                      >
                                        Last used {lastUsedTime(lastUsedAt, clock)}
                                      </time>
                                    </small>
                                  </span>
                                </Button>
                                <IconButton
                                  className="codex-conversation-picker__delete"
                                  disabled={
                                    Boolean(conversationTransition) ||
                                    isDeletingConversation ||
                                    deletionBlocked
                                  }
                                  label={`Delete ${title}`}
                                  onClick={() => {
                                    setDeleteConversationError('');
                                    setDeleteConversationId(thread.id);
                                  }}
                                  role="menuitem"
                                  title={
                                    deletionBlocked
                                      ? `${title} has active or queued work and cannot be deleted yet`
                                      : `Delete ${title}`
                                  }
                                  variant="quiet"
                                >
                                  <Trash2 aria-hidden="true" size={15} />
                                </IconButton>
                              </div>
                            );
                          })
                        ) : (
                          <p className="codex-conversation-picker__empty" role="presentation">
                            {group.emptyLabel}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div
              className={`codex-chat-transcript${activeSpeechMessage ? ' has-speech-dock' : ''}${latestUserRequest ? ' has-latest-request' : ''}`}
            >
              {activeSpeechMessage ? (
                <section aria-label="Read aloud controls" className="codex-speech-dock">
                  <div className="codex-speech-dock__topline">
                    <span className="codex-speech-dock__identity">
                      <Volume2 aria-hidden="true" size={16} />
                      <strong>
                        {activeSpeechMessage.phase === 'commentary'
                          ? 'Progress update'
                          : 'Codex reply'}
                      </strong>
                    </span>
                    <ButtonGroup className="codex-speech-dock__controls">
                      <Button
                        aria-label={
                          speechPlaybackState === 'loading'
                            ? 'Preparing reading'
                            : speechPlaybackState === 'playing'
                              ? 'Pause reading'
                              : 'Resume reading'
                        }
                        disabled={speechPlaybackState === 'loading'}
                        onClick={() => {
                          if (speechPlaybackState === 'playing') pauseCodexSpeech();
                          else if (speechPlaybackState === 'paused') resumeCodexSpeech();
                        }}
                        size="small"
                        variant="quiet"
                      >
                        {speechPlaybackState === 'loading' ? (
                          <LoaderCircle aria-hidden="true" className="is-spinning" size={15} />
                        ) : speechPlaybackState === 'playing' ? (
                          <Pause aria-hidden="true" size={15} />
                        ) : (
                          <Play aria-hidden="true" size={15} />
                        )}
                        {speechPlaybackState === 'loading'
                          ? 'Preparing'
                          : speechPlaybackState === 'playing'
                            ? 'Pause'
                            : 'Resume'}
                      </Button>
                      <IconButton
                        label="Skip back 5 seconds"
                        onClick={() => skipCodexSpeech(-5)}
                        variant="quiet"
                      >
                        <RotateCcw aria-hidden="true" size={14} />
                      </IconButton>
                      <IconButton
                        label="Skip forward 5 seconds"
                        onClick={() => skipCodexSpeech(5)}
                        variant="quiet"
                      >
                        <RotateCw aria-hidden="true" size={14} />
                      </IconButton>
                      <IconButton
                        label="Stop reading"
                        onClick={() => stopCodexSpeech()}
                        variant="quiet"
                      >
                        <Square aria-hidden="true" size={14} />
                      </IconButton>
                    </ButtonGroup>
                  </div>
                  {activeSpeechProgress && activeSpeechHasExactProgress ? (
                    <label className="codex-speech-dock__progress codex-chat-message__speech-progress--seekable">
                      <span className="sr-only">Speech playback position</span>
                      <input
                        aria-label="Speech playback position"
                        aria-valuetext={`${formatCodexSpeechTime(
                          activeSpeechProgress.elapsedSeconds,
                        )} of ${formatCodexSpeechTime(activeSpeechProgress.totalSeconds)}`}
                        max={activeSpeechProgress.totalSeconds}
                        min={0}
                        onChange={(event) => seekCodexSpeech(Number(event.target.value))}
                        step={1}
                        type="range"
                        value={Math.min(
                          activeSpeechProgress.elapsedSeconds,
                          activeSpeechProgress.totalSeconds,
                        )}
                      />
                      <span className="codex-chat-message__speech-progress-time">
                        {formatCodexSpeechTime(activeSpeechProgress.elapsedSeconds)} /{' '}
                        {formatCodexSpeechTime(activeSpeechProgress.totalSeconds)}
                      </span>
                    </label>
                  ) : activeSpeechProgress ? (
                    <div
                      aria-label="Estimated reading progress"
                      aria-valuemax={activeSpeechProgress.totalSeconds}
                      aria-valuemin={0}
                      aria-valuenow={Math.min(
                        activeSpeechProgress.elapsedSeconds,
                        activeSpeechProgress.totalSeconds,
                      )}
                      aria-valuetext={`${formatCodexSpeechTime(
                        activeSpeechProgress.elapsedSeconds,
                      )} of about ${formatCodexSpeechTime(activeSpeechProgress.totalSeconds)}`}
                      className="codex-speech-dock__progress"
                      role="progressbar"
                    >
                      <span
                        aria-hidden="true"
                        className="codex-chat-message__speech-progress-track"
                      >
                        <span
                          className="codex-chat-message__speech-progress-value"
                          style={{ inlineSize: `${activeSpeechProgressPercent}%` }}
                        />
                      </span>
                      <span className="codex-chat-message__speech-progress-time">
                        {formatCodexSpeechTime(activeSpeechProgress.elapsedSeconds)} / about{' '}
                        {formatCodexSpeechTime(activeSpeechProgress.totalSeconds)}
                      </span>
                    </div>
                  ) : null}
                </section>
              ) : null}
              {latestUserRequest ? (
                <aside aria-label="Your latest request" className="codex-chat-latest-request">
                  <MessageSquareText aria-hidden="true" size={14} />
                  <span>
                    <strong>Your latest</strong>
                    <span title={latestUserRequest}>{latestUserRequest}</span>
                  </span>
                </aside>
              ) : null}
              <div
                aria-busy={Boolean(conversationTransition)}
                aria-label="Codex chat log"
                aria-live="polite"
                className="codex-chat-log"
                onScroll={handleChatLogScroll}
                ref={mountChatLog}
                role="log"
                tabIndex={0}
              >
                {conversationTransition ? (
                  <CodexConversationLoading transition={conversationTransition} />
                ) : (
                  <>
                    {status?.threadIssue ? (
                      <p className="codex-feedback-error" role="alert">
                        <CircleAlert aria-hidden="true" size={18} />
                        {status.threadIssue}
                      </p>
                    ) : null}
                    {transcriptEntries.length
                      ? transcriptEntries.map((entry) => {
                          if (entry.kind === 'activity') {
                            return (
                              <Fragment key={`activity:${entry.id}`}>
                                {entry.id === firstTranscriptActivityId ? (
                                  <div className="codex-chat-activity-boundary" role="note">
                                    <Activity aria-hidden="true" size={15} />
                                    <span>
                                      <strong>Workspace activity timeline</strong>
                                      <small>
                                        Verified actions are logged in conversation order. Private
                                        reasoning is not shown.
                                      </small>
                                    </span>
                                  </div>
                                ) : null}
                                <CodexChatActivity
                                  activity={entry.activity}
                                  entering={enteringTimelineIds.has(`activity:${entry.id}`)}
                                />
                              </Fragment>
                            );
                          }
                          const message = entry.message;
                          const isReadableCodexMessage =
                            message.role === 'assistant' && Boolean(message.text.trim());
                          const supportsSpeechReadAlong = isReadableCodexMessage;
                          const isReadingThisReply = speechMessageId === message.id;
                          const activityContext = activityContextByMessageId.get(message.id);
                          return (
                            <Fragment key={`message:${message.id}`}>
                              <article
                                className={`codex-chat-message codex-chat-message--${message.role}${
                                  message.role === 'assistant' && message.phase === 'commentary'
                                    ? ' codex-chat-message--progress'
                                    : ''
                                }${
                                  activityContext ? ' codex-chat-message--activity-explanation' : ''
                                }${enteringTimelineIds.has(`message:${message.id}`) ? ' codex-chat-message--entering' : ''}`}
                                data-explains-activity-ids={activityContext?.activityIds.join(' ')}
                                data-phase={message.phase}
                                data-message-id={message.id}
                              >
                                <header className="codex-chat-message__header">
                                  <strong>
                                    {message.role === 'user' ? (
                                      'You'
                                    ) : message.phase === 'commentary' ? (
                                      <>
                                        <span
                                          aria-hidden="true"
                                          className="codex-chat-message__pulse"
                                        />
                                        Progress update
                                      </>
                                    ) : (
                                      'Codex'
                                    )}
                                  </strong>
                                  <ButtonGroup className="codex-chat-message__actions">
                                    {speechSupported && isReadableCodexMessage ? (
                                      isReadingThisReply ? (
                                        <span className="codex-chat-message__reading-state">
                                          <Volume2 aria-hidden="true" size={14} />
                                          Playing above
                                        </span>
                                      ) : (
                                        <Button
                                          aria-label={
                                            message.phase === 'commentary'
                                              ? 'Read progress update'
                                              : 'Read Codex reply'
                                          }
                                          className="codex-chat-message__read"
                                          onClick={() => {
                                            setAutoReadPending(undefined);
                                            readCodexReply(message.id, message.text);
                                          }}
                                          size="small"
                                          variant="quiet"
                                        >
                                          <Volume2 aria-hidden="true" size={15} />
                                          Read
                                        </Button>
                                      )
                                    ) : null}
                                    {message.role === 'assistant' &&
                                    message.phase !== 'commentary' &&
                                    message.turnId &&
                                    canBranchCodexMessage(
                                      message,
                                      status?.thread,
                                      status?.messages || [],
                                    ) ? (
                                      <Button
                                        aria-label="Branch chat from this reply"
                                        className="codex-chat-message__branch"
                                        disabled={Boolean(conversationTransition)}
                                        onClick={() => void branchConversation(message)}
                                        size="small"
                                        title="Create a new chat with context through this reply"
                                        variant="quiet"
                                      >
                                        <GitFork aria-hidden="true" size={15} />
                                        Branch
                                      </Button>
                                    ) : null}
                                  </ButtonGroup>
                                </header>
                                {activityContext ? (
                                  <span
                                    className="codex-chat-message__activity-context"
                                    data-explains-activity-count={activityContext.count}
                                  >
                                    <CornerDownRight aria-hidden="true" size={13} />
                                    <span>
                                      {message.phase === 'commentary'
                                        ? 'Codex update'
                                        : 'Codex conclusion'}{' '}
                                      · after {activityContext.count} recorded{' '}
                                      {activityContext.count === 1 ? 'action' : 'actions'}
                                    </span>
                                  </span>
                                ) : null}
                                <MarkdownContent
                                  speech={
                                    supportsSpeechReadAlong
                                      ? {
                                          activeWordIndex: isReadingThisReply
                                            ? speechActiveWordIndex
                                            : undefined,
                                          onWordSelect: (wordIndex) => {
                                            setAutoReadPending(undefined);
                                            readCodexReply(message.id, message.text, wordIndex);
                                          },
                                          words: codexSpeechWords(
                                            message.text,
                                            selectedSpeechStyle,
                                          ),
                                        }
                                      : undefined
                                  }
                                >
                                  {message.text}
                                </MarkdownContent>
                                {message.role === 'assistant' &&
                                selectedExcerpt?.messageId === message.id ? (
                                  <aside
                                    aria-label="Selected Codex excerpt"
                                    className="codex-chat-excerpt-actions"
                                  >
                                    <span className="codex-chat-excerpt-actions__copy">
                                      <strong>Use selected text</strong>
                                      <small title={selectedExcerpt.text}>
                                        {selectedExcerpt.text}
                                      </small>
                                    </span>
                                    <ButtonGroup className="codex-chat-excerpt-actions__buttons">
                                      <Button
                                        disabled={
                                          phase === 'sending-chat' ||
                                          Boolean(conversationTransition) ||
                                          !temporaryQuestionModel ||
                                          !canBranchCodexMessage(
                                            message,
                                            status?.thread,
                                            status?.messages || [],
                                          )
                                        }
                                        onClick={openTemporaryQuestion}
                                        size="small"
                                        title="Ask with the whole conversation after this reply is complete"
                                        variant="quiet"
                                      >
                                        <Zap aria-hidden="true" size={15} />
                                        Quick question
                                      </Button>
                                      <Button
                                        disabled={
                                          phase === 'sending-chat' ||
                                          Boolean(conversationTransition)
                                        }
                                        onClick={appendSelectedExcerpt}
                                        size="small"
                                        variant="secondary"
                                      >
                                        <Plus aria-hidden="true" size={15} />
                                        Add to prompt
                                      </Button>
                                      <Button
                                        disabled={
                                          phase === 'sending-chat' ||
                                          Boolean(conversationTransition) ||
                                          !status?.thread ||
                                          !selectedModel
                                        }
                                        onClick={sendSelectedExcerpt}
                                        size="small"
                                        variant="primary"
                                      >
                                        <Send aria-hidden="true" size={15} />
                                        Send now
                                      </Button>
                                    </ButtonGroup>
                                    <IconButton
                                      label="Dismiss selected excerpt"
                                      onClick={clearSelectedExcerpt}
                                      variant="quiet"
                                    >
                                      <X aria-hidden="true" size={16} />
                                    </IconButton>
                                  </aside>
                                ) : null}
                                <RuntimeAttachmentGallery
                                  attachmentIds={
                                    message.attachmentIds ??
                                    (message.attachmentId ? [message.attachmentId] : [])
                                  }
                                  altPrefix="Image attached to your message"
                                />
                              </article>
                              {(agentTeamsAfterMessage.get(message.id) ?? []).map((team) => (
                                <AgentTeamPanel
                                  agents={team.agents}
                                  clock={clock}
                                  expandedAgentId={expandedAgentId}
                                  key={team.key}
                                  onExpandedAgentChange={setExpandedAgentId}
                                  resumeState={selectedTeamResumeState}
                                  resumingAgentIds={resumingAgentIds}
                                  teamKey={team.key}
                                  teamLabel={team.label}
                                />
                              ))}
                            </Fragment>
                          );
                        })
                      : null}
                    {!status?.threadIssue &&
                    !transcriptEntries.length &&
                    !status?.queuedMessages?.length &&
                    !showPendingChatMessage &&
                    !showPendingVisualMessage ? (
                      <p className="codex-chat-log__empty">
                        No messages are saved in this conversation.
                      </p>
                    ) : null}
                    {(status?.queuedMessages ?? []).map((message) => {
                      const expanded = expandedQueueId === message.id;
                      const editValue = queuedEdits[message.id] ?? message.prompt;
                      const actionPending = queueActionId === message.id;
                      return (
                        <article className="codex-queued-message" key={message.id}>
                          <header>
                            <span>
                              {message.deliveryMode === 'interrupt'
                                ? 'Interrupting'
                                : `Waiting for current reply to finish · ${message.position}${message.workMode === 'team' ? ' · Agent team' : ''}`}
                            </span>
                            <ButtonGroup>
                              <Button
                                aria-expanded={expanded}
                                disabled={actionPending}
                                onClick={() => {
                                  setExpandedQueueId(expanded ? '' : message.id);
                                  setQueuedEdits((current) => ({
                                    ...current,
                                    [message.id]: current[message.id] ?? message.prompt,
                                  }));
                                  setQueueActionError('');
                                }}
                                size="small"
                                variant="quiet"
                              >
                                {expanded ? (
                                  <ChevronUp aria-hidden="true" size={14} />
                                ) : (
                                  <Pencil aria-hidden="true" size={14} />
                                )}
                                {expanded ? 'Collapse' : 'Edit'}
                              </Button>
                              <Button
                                disabled={actionPending || message.deliveryMode === 'interrupt'}
                                onClick={() => void runQueueAction('interrupt-queued', message.id)}
                                size="small"
                                variant="quiet"
                              >
                                {actionPending ? (
                                  <LoaderCircle
                                    aria-hidden="true"
                                    className="is-spinning"
                                    size={14}
                                  />
                                ) : (
                                  <Square aria-hidden="true" size={12} />
                                )}
                                Interrupt
                              </Button>
                              <Button
                                disabled={actionPending}
                                onClick={() => {
                                  setDeleteQueueId(message.id);
                                  setQueueActionError('');
                                }}
                                size="small"
                                variant="quiet"
                              >
                                <Trash2 aria-hidden="true" size={14} />
                                Delete
                              </Button>
                            </ButtonGroup>
                          </header>
                          {expanded ? (
                            <div className="codex-queued-message__editor">
                              <label>
                                <span>Edit queued message</span>
                                <textarea
                                  maxLength={4_000}
                                  onChange={(event) =>
                                    setQueuedEdits((current) => ({
                                      ...current,
                                      [message.id]: event.target.value,
                                    }))
                                  }
                                  rows={3}
                                  value={editValue}
                                />
                              </label>
                              <Button
                                disabled={actionPending || !editValue.trim()}
                                onClick={() =>
                                  void runQueueAction('update-queued', message.id, editValue.trim())
                                }
                                size="small"
                                variant="secondary"
                              >
                                <Save aria-hidden="true" size={14} />
                                Save changes
                              </Button>
                            </div>
                          ) : (
                            <MarkdownContent>{message.prompt}</MarkdownContent>
                          )}
                          <RuntimeAttachmentGallery
                            attachmentIds={
                              message.attachmentIds ??
                              (message.attachmentId ? [message.attachmentId] : [])
                            }
                            altPrefix="Image attached to your queued message"
                          />
                          {queueActionError && expandedQueueId === message.id ? (
                            <p className="codex-queued-message__error" role="alert">
                              {queueActionError}
                            </p>
                          ) : null}
                        </article>
                      );
                    })}
                    <ConfirmationDialog
                      confirmLabel="Delete message"
                      detail="This removes the queued message before Codex receives it. This cannot be undone."
                      error={deleteQueueId ? queueActionError : ''}
                      isConfirming={Boolean(deleteQueueId && queueActionId === deleteQueueId)}
                      onConfirm={() => void runQueueAction('delete-queued', deleteQueueId)}
                      onOpenChange={(open) => {
                        if (!open && !queueActionId) setDeleteQueueId('');
                      }}
                      open={Boolean(deleteQueueId)}
                      title="Delete queued message?"
                    />
                    {pendingChatMessage && showPendingChatMessage ? (
                      <article className="codex-chat-message codex-chat-message--user codex-chat-message--pending codex-chat-message--entering">
                        <strong>
                          You <span>Sending</span>
                        </strong>
                        <MarkdownContent>{pendingChatMessage.text}</MarkdownContent>
                      </article>
                    ) : null}
                    {pendingVisualMessage && showPendingVisualMessage ? (
                      <article className="codex-chat-message codex-chat-message--user codex-chat-message--pending codex-chat-message--entering">
                        <strong>
                          You <span>Sending</span>
                        </strong>
                        <MarkdownContent>{pendingVisualMessage.text}</MarkdownContent>
                        <div className="codex-chat-message__attachments">
                          {pendingVisualMessage.images.map((image, index) => (
                            <img
                              alt={`Image attached to your message ${index + 1} of ${pendingVisualMessage.images.length}`}
                              className="codex-chat-message__attachment"
                              key={`${pendingVisualMessage.id}-${index}`}
                              src={image}
                            />
                          ))}
                        </div>
                      </article>
                    ) : null}
                    {legacyAgents.length && !agentTeamsAfterMessage.size ? (
                      <AgentTeamPanel
                        agents={legacyAgents}
                        clock={clock}
                        expandedAgentId={expandedAgentId}
                        onExpandedAgentChange={setExpandedAgentId}
                        resumeState={selectedTeamResumeState}
                        resumingAgentIds={resumingAgentIds}
                        teamKey="legacy-agent-team"
                        teamLabel="Agent team"
                      />
                    ) : null}
                    {isInterrupted && !isCodexWorking && !isTeamResumePending ? (
                      <div className="codex-interrupted-status" role="status">
                        <span aria-hidden="true" className="codex-working-status__icon">
                          {isTeamResumePending ? (
                            <LoaderCircle className="is-spinning" size={17} />
                          ) : (
                            <CircleAlert size={17} />
                          )}
                        </span>
                        <span className="codex-working-status__copy">
                          <strong>
                            {isTeamResumePending ? 'Work is resuming' : 'Work was interrupted'}
                          </strong>
                          <small>
                            {isTeamResumePending
                              ? `The supervisor is restarting ${selectedTeamResumeState?.agentIds.length} interrupted attached ${selectedTeamResumeState?.agentIds.length === 1 ? 'agent' : 'agents'} from ${selectedTeamResumeState?.agentIds.length === 1 ? 'its' : 'their'} saved sub-chats.`
                              : `The Codespace paused before Codex finished. The saved transcript and edits are still available.${
                                  interruptedAgents.length
                                    ? ` ${interruptedAgents.length} interrupted attached ${interruptedAgents.length === 1 ? 'agent will' : 'agents will'} resume from ${interruptedAgents.length === 1 ? 'its' : 'their'} saved sub-chats too.`
                                    : ''
                                }`}
                          </small>
                        </span>
                        <Button
                          disabled={
                            isResumingThread ||
                            isTeamResumePending ||
                            !selectedModel ||
                            !selectedEffort
                          }
                          onClick={() => void continueInterruptedConversation()}
                          size="small"
                          variant="secondary"
                        >
                          {isResumingThread || isTeamResumePending ? (
                            <LoaderCircle aria-hidden="true" className="is-spinning" size={15} />
                          ) : (
                            <RotateCcw aria-hidden="true" size={15} />
                          )}
                          {isResumingThread || isTeamResumePending
                            ? 'Work resuming…'
                            : 'Resume working'}
                        </Button>
                      </div>
                    ) : null}
                    {(isCodexWorking && !hasActiveTeam) || queuedCount ? (
                      <div
                        className={`codex-working-status${isCodexWorking ? ' codex-generating-message' : ''}`}
                      >
                        <span className="sr-only" role="status">
                          {isCodexWorking
                            ? 'Codex is working on the selected conversation.'
                            : `Codex has ${queuedCount} queued ${queuedCount === 1 ? 'request' : 'requests'}.`}
                        </span>
                        <span aria-hidden="true" className="codex-working-status__icon">
                          {isCodexWorking ? <Bot size={17} /> : <Clock3 size={17} />}
                        </span>
                        <span className="codex-working-status__copy">
                          <strong>
                            {isCodexWorking ? workingTitle : 'Waiting for Codex'}
                            {isCodexWorking ? (
                              <span aria-hidden="true" className="codex-generating-message__dots">
                                <span />
                                <span />
                                <span />
                              </span>
                            ) : null}
                          </strong>
                          <small>
                            {isCodexWorking
                              ? workingDetail
                              : `${queuedCount} ${queuedCount === 1 ? 'request' : 'requests'} queued`}
                          </small>
                          {isCodexWorking && queuedCount ? (
                            <small className="codex-working-status__queue">
                              {queuedCount} {queuedCount === 1 ? 'request' : 'requests'} queued next
                            </small>
                          ) : null}
                        </span>
                        <time aria-hidden="true">
                          {isCodexWorking
                            ? elapsedTime(status?.thread?.workingStartedAt, clock)
                            : 'Queued'}
                        </time>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
              {!conversationTransition && !isChatFollowingLatest && !selectedExcerpt ? (
                <Button
                  className="codex-chat-transcript__latest"
                  onClick={scrollChatToLatest}
                  variant="secondary"
                >
                  <ArrowDown aria-hidden="true" size={15} />
                  Back to latest
                </Button>
              ) : null}
            </div>

            <section
              aria-busy={Boolean(conversationTransition)}
              aria-label="Message composer"
              className={`codex-composer-surface ${isComposerExpanded ? 'is-expanded' : 'is-collapsed'}${phase === 'sending-chat' ? ' is-sending' : ''}${conversationTransition ? ' is-loading-conversation' : ''}`}
            >
              {draftAttachments.length ? (
                <div aria-label="Selected images" className="codex-composer-draft-attachments">
                  {draftAttachments.map((attachment) => (
                    <figure key={attachment.id}>
                      <img alt={`Selected image: ${attachment.name}`} src={attachment.source} />
                      <figcaption title={attachment.name}>{attachment.name}</figcaption>
                      <IconButton
                        disabled={phase === 'sending-chat' || Boolean(conversationTransition)}
                        label={`Remove ${attachment.name}`}
                        onClick={() => {
                          setDraftAttachments((current) =>
                            current.filter((candidate) => candidate.id !== attachment.id),
                          );
                          setError(undefined);
                          window.requestAnimationFrame(() => composerTextareaRef.current?.focus());
                        }}
                        variant="quiet"
                      >
                        <X aria-hidden="true" size={16} />
                      </IconButton>
                    </figure>
                  ))}
                </div>
              ) : null}
              {draftAttachments.length || isPreparingPhoto ? (
                <p aria-live="polite" className="codex-composer-attachment-status">
                  {isPreparingPhoto
                    ? 'Preparing selected images…'
                    : `${draftAttachments.length} of ${maximumDraftAttachments} images selected`}
                </p>
              ) : null}
              <label className="codex-feedback-prompt codex-feedback-prompt--compose">
                <span>Message to Codex</span>
                <textarea
                  disabled={
                    phase === 'sending-chat' ||
                    Boolean(conversationTransition) ||
                    Boolean(status?.threadIssue)
                  }
                  maxLength={4_000}
                  onChange={(event) => setPrompt(event.target.value)}
                  onBlur={() => {
                    if (
                      (!prompt.trim() && draftAttachments.length === 0) ||
                      !chatFollowingLatestRef.current
                    )
                      setIsComposerExpanded(false);
                  }}
                  onFocus={() => {
                    setIsComposerExpanded(true);
                    if (chatFollowingLatestRef.current) {
                      window.requestAnimationFrame(scrollChatToLatest);
                    }
                  }}
                  placeholder="Ask Codex to build, change, check, or explain…"
                  ref={composerTextareaRef}
                  rows={isComposerExpanded ? 3 : 1}
                  value={prompt}
                />
              </label>

              <div className="codex-composer-attachments">
                <input
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Photo from camera roll"
                  hidden
                  multiple
                  onChange={(event) => void choosePhotos(event)}
                  ref={photoInputRef}
                  type="file"
                />
                <IconButton
                  disabled={
                    phase === 'sending-chat' ||
                    Boolean(conversationTransition) ||
                    Boolean(status?.threadIssue) ||
                    isPreparingPhoto ||
                    !selectedModel?.supportsImages
                  }
                  label="Upload photo from camera roll"
                  onClick={() => photoInputRef.current?.click()}
                  variant="quiet"
                >
                  {isPreparingPhoto ? (
                    <LoaderCircle aria-hidden="true" className="is-spinning" size={18} />
                  ) : (
                    <ImageUp aria-hidden="true" size={18} />
                  )}
                </IconButton>
                <IconButton
                  disabled={
                    phase === 'sending-chat' ||
                    Boolean(conversationTransition) ||
                    Boolean(status?.threadIssue) ||
                    isPreparingPhoto ||
                    !selectedModel?.supportsImages
                  }
                  label="Capture this tab"
                  onClick={() => void beginPrimaryCapture()}
                  variant="quiet"
                >
                  <Camera aria-hidden="true" size={18} />
                </IconButton>
                <IconButton
                  disabled={
                    phase === 'sending-chat' ||
                    Boolean(conversationTransition) ||
                    Boolean(status?.threadIssue) ||
                    !status?.thread ||
                    !selectedModel ||
                    !selectedModel.supportsImages
                  }
                  label="Capture another tab or window"
                  onClick={() => void beginCapture()}
                  variant="quiet"
                >
                  <MonitorUp aria-hidden="true" size={18} />
                </IconButton>
                <span className="sr-only" aria-live="polite">
                  {isPreparingPhoto
                    ? 'Preparing photo…'
                    : `${prompt ? 'Draft saved · ' : ''}${
                        browserCaptureAvailable
                          ? 'Tab capture ready'
                          : workspaceCaptureContext
                            ? 'Local workspace capture ready'
                            : sharedScreenSupported()
                              ? 'Current-tab capture ready · browser confirmation required'
                              : 'Mobile screen capture ready'
                      }`}
                </span>
                <small className="sr-only">{prompt.length.toLocaleString()} / 4,000</small>
                <IconButton
                  aria-controls="codex-composer-settings"
                  aria-expanded={composerSettingsOpen}
                  className={composerSettingsOpen ? 'is-active' : ''}
                  disabled={Boolean(conversationTransition)}
                  label="Run setup"
                  onClick={() =>
                    setComposerSettingsOpen((open) => {
                      if (!open) setChatPreferencesOpen(false);
                      return !open;
                    })
                  }
                  variant="quiet"
                >
                  <SlidersHorizontal aria-hidden="true" size={18} />
                </IconButton>
                <IconButton
                  aria-controls="codex-chat-preferences"
                  aria-expanded={chatPreferencesOpen}
                  className={chatPreferencesOpen ? 'is-active' : ''}
                  disabled={Boolean(conversationTransition)}
                  label="Chat settings"
                  onClick={() => {
                    setComposerSettingsOpen(false);
                    setChatPreferencesOpen(true);
                  }}
                  ref={chatPreferencesTriggerRef}
                  variant="quiet"
                >
                  <Settings aria-hidden="true" size={18} />
                </IconButton>
                {phase !== 'sending-chat' &&
                (isStoppingTurn ||
                  (isCodexWorking && !prompt.trim() && draftAttachments.length === 0)) ? (
                  <IconButton
                    disabled={
                      Boolean(conversationTransition) ||
                      isStoppingTurn ||
                      !status?.thread ||
                      !stopActiveTurnSupported
                    }
                    key="stop-codex"
                    label={
                      isStoppingTurn
                        ? 'Stopping Codex'
                        : stopActiveTurnSupported
                          ? 'Stop Codex'
                          : 'Stop Codex unavailable until Studio reconnects'
                    }
                    onClick={() => void stopActiveTurn()}
                    variant="danger"
                  >
                    {isStoppingTurn ? (
                      <LoaderCircle aria-hidden="true" className="is-spinning" size={18} />
                    ) : (
                      <Square aria-hidden="true" fill="currentColor" size={16} />
                    )}
                  </IconButton>
                ) : (
                  <IconButton
                    disabled={
                      phase === 'sending-chat' ||
                      Boolean(conversationTransition) ||
                      Boolean(status?.threadIssue) ||
                      isPreparingPhoto ||
                      !status?.thread ||
                      !selectedModel ||
                      !selectedEffort ||
                      (!prompt.trim() && draftAttachments.length === 0)
                    }
                    key="send-codex"
                    label={phase === 'sending-chat' ? 'Sending message' : 'Send message'}
                    onClick={() => void sendFeedback()}
                    variant="primary"
                  >
                    {phase === 'sending-chat' ? (
                      <LoaderCircle aria-hidden="true" className="is-spinning" size={18} />
                    ) : (
                      <Send aria-hidden="true" size={18} />
                    )}
                  </IconButton>
                )}
              </div>

              {error ? (
                <p className="codex-feedback-error" role="alert">
                  <CircleAlert aria-hidden="true" size={18} />
                  {error}
                </p>
              ) : null}

              {composerSettingsOpen || chatPreferencesOpen ? (
                <div
                  aria-labelledby={chatPreferencesOpen ? 'codex-chat-preferences-title' : undefined}
                  aria-label={chatPreferencesOpen ? undefined : 'Run setup'}
                  aria-modal={chatPreferencesOpen || undefined}
                  className={`codex-composer-settings${chatPreferencesOpen ? ' is-preferences' : ' is-run-setup'}`}
                  id={chatPreferencesOpen ? 'codex-chat-preferences' : 'codex-composer-settings'}
                  role={chatPreferencesOpen ? 'dialog' : 'group'}
                >
                  {chatPreferencesOpen ? (
                    <header className="codex-chat-preferences__header">
                      <span>
                        <strong id="codex-chat-preferences-title">Chat settings</strong>
                        <small>Usage, billing, response speed, and read-aloud preferences</small>
                      </span>
                      <IconButton
                        autoFocus
                        label="Close chat settings"
                        onClick={() => {
                          stopVoicePreview();
                          setChatPreferencesOpen(false);
                          window.requestAnimationFrame(() =>
                            chatPreferencesTriggerRef.current?.focus(),
                          );
                        }}
                        variant="quiet"
                      >
                        <X aria-hidden="true" size={18} />
                      </IconButton>
                    </header>
                  ) : null}
                  {chatPreferencesOpen ? (
                    <>
                      <CodexSubscriptionUsage usage={status?.subscriptionUsage} />
                      <Button
                        aria-pressed={status?.billing?.mode === 'api_credits'}
                        className={`codex-agent-mode${status?.billing?.mode === 'api_credits' ? ' is-active' : ''}`}
                        disabled={
                          billingModeChanging ||
                          Boolean(status?.thread?.working) ||
                          Boolean(status?.queuedCount) ||
                          (status?.billing?.mode !== 'api_credits' &&
                            status?.billing?.apiKeyConfigured !== true)
                        }
                        onClick={() => void changeBillingMode()}
                        variant="quiet"
                      >
                        {billingModeChanging ? (
                          <LoaderCircle aria-hidden="true" className="is-spinning" size={17} />
                        ) : (
                          <CreditCard aria-hidden="true" size={17} />
                        )}
                        <span className="codex-agent-mode__copy">
                          <strong>
                            {status?.billing?.mode === 'api_credits'
                              ? 'OpenAI API credits'
                              : 'Use API credits'}
                          </strong>
                          <small>
                            {status?.billing?.apiKeyConfigured
                              ? status.billing.mode === 'api_credits'
                                ? 'Separately billed for Studio chat, builders, and AI analysis'
                                : 'Switch here if your ChatGPT subscription allowance runs out'
                              : 'Add a server-side OpenAI API key in Railway to enable this'}
                          </small>
                        </span>
                        <span aria-hidden="true" className="codex-agent-mode__state">
                          {billingModeChanging
                            ? 'Switching'
                            : status?.billing?.mode === 'api_credits'
                              ? 'On'
                              : 'Off'}
                        </span>
                      </Button>
                    </>
                  ) : null}
                  {composerSettingsOpen ? (
                    <Button
                      aria-pressed={workMode === 'team'}
                      className={`codex-agent-mode${workMode === 'team' ? ' is-active' : ''}`}
                      disabled={phase === 'sending-chat' || Boolean(conversationTransition)}
                      onClick={() =>
                        setWorkMode((current) => (current === 'team' ? 'direct' : 'team'))
                      }
                      variant="quiet"
                    >
                      <UsersRound aria-hidden="true" size={17} />
                      <span className="codex-agent-mode__copy">
                        <strong>Agent team</strong>
                        <small>
                          {workMode === 'team'
                            ? 'Codex can delegate independent work in parallel'
                            : 'Use one Codex agent for this request'}
                        </small>
                      </span>
                      <span aria-hidden="true" className="codex-agent-mode__state">
                        {workMode === 'team' ? 'On' : 'Off'}
                      </span>
                    </Button>
                  ) : null}
                  {chatPreferencesOpen ? (
                    <>
                      <Button
                        aria-pressed={selectedServiceTier === 'priority'}
                        className={`codex-agent-mode${selectedServiceTier === 'priority' ? ' is-active' : ''}`}
                        disabled={
                          phase === 'sending-chat' ||
                          Boolean(conversationTransition) ||
                          !fastModeAvailable
                        }
                        onClick={() => setFastMode((current) => !current)}
                        variant="quiet"
                      >
                        <Clock3 aria-hidden="true" size={17} />
                        <span className="codex-agent-mode__copy">
                          <strong>Fast</strong>
                          <small>
                            {fastModeAvailable
                              ? selectedFastTier?.description ||
                                'Higher-speed Codex responses with increased usage'
                              : 'Unavailable for the selected model'}
                          </small>
                        </span>
                        <span aria-hidden="true" className="codex-agent-mode__state">
                          {selectedServiceTier === 'priority' ? 'On' : 'Off'}
                        </span>
                      </Button>
                      <section
                        aria-labelledby="codex-speech-settings-title"
                        className="codex-speech-settings"
                      >
                        <header>
                          <span>
                            <strong id="codex-speech-settings-title">Read aloud voice</strong>
                            <small>
                              {cloudSpeechConfiguration?.available
                                ? `${cloudSpeechConfiguration.voices.length} Google voices · choose any available language and model`
                                : cloudSpeechConfiguration
                                  ? 'Google voice setup is not active · using your English device voice'
                                  : 'Checking Google voice availability…'}
                            </small>
                          </span>
                        </header>
                        <div className="codex-speech-settings__controls">
                          <label>
                            <span>Language &amp; accent</span>
                            <select
                              disabled={!cloudSpeechConfiguration?.available}
                              onChange={(event) => {
                                stopCodexSpeech(false);
                                stopVoicePreview();
                                const language = event.target.value;
                                const voice = cloudSpeechConfiguration?.voices
                                  .filter(({ languageCode }) => languageCode === language)
                                  .sort((left, right) => left.qualityRank - right.qualityRank)[0];
                                if (!voice) return;
                                setSelectedSpeechLanguage(language);
                                setSelectedSpeechModel(voice.model);
                                setSelectedSpeechVoice(voice.id);
                              }}
                              value={selectedSpeechLanguage}
                            >
                              {speechLanguages.map(({ code, label }) => (
                                <option key={code} value={code}>
                                  {label} · {code}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span>Model quality</span>
                            <select
                              disabled={!cloudSpeechConfiguration?.available}
                              onChange={(event) => {
                                stopCodexSpeech(false);
                                stopVoicePreview();
                                const model = event.target.value;
                                const voice = cloudSpeechConfiguration?.voices.find(
                                  (candidate) =>
                                    candidate.languageCode === selectedSpeechLanguage &&
                                    candidate.model === model,
                                );
                                if (!voice) return;
                                setSelectedSpeechModel(model);
                                setSelectedSpeechVoice(voice.id);
                              }}
                              value={selectedSpeechModel}
                            >
                              {speechModels.map((voice) => (
                                <option key={voice.model} value={voice.model}>
                                  {voice.modelLabel} — {voice.qualityLabel}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span>Voice</span>
                            <select
                              disabled={!cloudSpeechConfiguration?.available}
                              onChange={(event) => {
                                stopCodexSpeech(false);
                                stopVoicePreview();
                                setSelectedSpeechVoice(event.target.value);
                                const voice = cloudSpeechConfiguration?.voices.find(
                                  ({ id }) => id === event.target.value,
                                );
                                setSpeechStatus(
                                  `Google ${voice?.name ?? event.target.value} selected.`,
                                );
                              }}
                              value={selectedSpeechVoice}
                            >
                              {!cloudSpeechConfiguration?.voices.length ? (
                                <option value={selectedSpeechVoice}>{selectedSpeechVoice}</option>
                              ) : null}
                              {filteredSpeechVoices.map((voice) => (
                                <option key={voice.id} value={voice.id}>
                                  {voice.name} · {voice.gender}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span>Reading style</span>
                            <select
                              onChange={(event) => {
                                stopCodexSpeech(false);
                                setSelectedSpeechStyle(event.target.value as CodexSpeechStyle);
                              }}
                              value={selectedSpeechStyle}
                            >
                              <option value="natural">Natural</option>
                              <option value="literal">Literal</option>
                            </select>
                          </label>
                          <label>
                            <span>Speed</span>
                            <select
                              onChange={(event) => {
                                stopCodexSpeech(false);
                                setSelectedSpeechRate(Number(event.target.value));
                              }}
                              value={selectedSpeechRate}
                            >
                              <option value="0.85">0.85× · relaxed</option>
                              <option value="1">1× · conversational</option>
                              <option value="1.15">1.15× · brisk</option>
                            </select>
                          </label>
                          <label className="codex-speech-settings__toggle">
                            <span>
                              <strong>Auto-read Codex</strong>
                              <small>
                                Reads progress updates and the final reply automatically while this
                                chat is open.
                              </small>
                            </span>
                            <input
                              checked={autoReadCodex}
                              onChange={(event) => {
                                const enabled = event.target.checked;
                                setAutoReadCodex(enabled);
                                setAutoReadPending(undefined);
                                if (!enabled && speechInitiatorRef.current === 'auto') {
                                  stopCodexSpeech(false);
                                }
                                setSpeechStatus(
                                  enabled
                                    ? 'Auto-read is on for new progress and final replies in this chat.'
                                    : 'Auto-read is off.',
                                );
                              }}
                              type="checkbox"
                            />
                          </label>
                          {selectedCloudSpeechVoice ? (
                            <p className="codex-speech-settings__selection">
                              <strong>
                                {selectedSpeechLanguageLabel} ·{' '}
                                {selectedSpeechStyle === 'natural' ? 'Natural' : 'Literal'} ·{' '}
                                {selectedSpeechRate}×
                              </strong>
                              <span>
                                {selectedCloudSpeechVoice.modelLabel} ·{' '}
                                {selectedCloudSpeechVoice.qualityLabel} ·{' '}
                                {autoReadCodex ? 'Auto-read on' : 'Auto-read off'}
                              </span>
                            </p>
                          ) : null}
                          <Button
                            aria-label={
                              voicePreviewState === 'playing'
                                ? 'Stop voice preview'
                                : voicePreviewState === 'loading'
                                  ? 'Preparing voice preview'
                                  : `Preview ${selectedCloudSpeechVoice?.name ?? selectedSpeechVoice} voice`
                            }
                            disabled={
                              !cloudSpeechConfiguration?.available ||
                              voicePreviewState === 'loading'
                            }
                            onClick={() => {
                              if (voicePreviewState === 'playing') stopVoicePreview();
                              else void previewSpeechVoice();
                            }}
                            size="small"
                            variant="quiet"
                          >
                            {voicePreviewState === 'loading' ? (
                              <LoaderCircle aria-hidden="true" className="is-spinning" size={15} />
                            ) : voicePreviewState === 'playing' ? (
                              <Square aria-hidden="true" size={14} />
                            ) : (
                              <Play aria-hidden="true" size={15} />
                            )}
                            {voicePreviewState === 'loading'
                              ? 'Preparing'
                              : voicePreviewState === 'playing'
                                ? 'Stop preview'
                                : 'Preview voice'}
                          </Button>
                        </div>
                      </section>
                    </>
                  ) : null}
                  {composerSettingsOpen ? (
                    <footer className="codex-composer-footer">
                      <div className="codex-chat-configuration">
                        <label className="codex-model-field">
                          <span>Model</span>
                          <select
                            disabled={!status?.thread || Boolean(conversationTransition)}
                            onChange={(event) => {
                              const model = availableModels.find(
                                (candidate) => candidate.id === event.target.value,
                              );
                              if (model) chooseModel(model);
                            }}
                            value={selectedModelId}
                          >
                            {availableModels.map((model) => (
                              <option key={model.id} value={model.id}>
                                {model.label}
                                {model.id === 'gpt-6-astra' ? ' · new' : ''}
                                {model.supportsImages ? '' : ' · text only'}
                              </option>
                            ))}
                          </select>
                        </label>

                        {selectedModel?.efforts.length ? (
                          <label className="codex-effort-field">
                            <span>Reasoning</span>
                            <select
                              disabled={Boolean(conversationTransition)}
                              onChange={(event) =>
                                chooseEffort(selectedModel.id, event.target.value)
                              }
                              value={modelEffort(selectedModel, selectedEffort)}
                            >
                              {selectedModel.efforts.map((effort) => (
                                <option key={effort.id} value={effort.id}>
                                  {effort.id.charAt(0).toUpperCase() + effort.id.slice(1)}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                      </div>
                    </footer>
                  ) : null}
                </div>
              ) : null}
            </section>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {phase === 'capturing' || phase === 'capturing-tab' ? (
        <div aria-live="polite" className="codex-feedback-capturing" role="status">
          <LoaderCircle aria-hidden="true" className="is-spinning" size={20} />
          {captureDetail || 'Capturing the current page…'}
        </div>
      ) : null}

      <Dialog.Root onOpenChange={(open) => !open && closePanel()} open={phase === 'selecting'}>
        <Dialog.Portal>
          <Dialog.Overlay className="codex-feedback-selection-overlay" />
          <Dialog.Content
            aria-describedby="codex-selection-description"
            className="codex-feedback-selection-dialog"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              triggerRef.current?.focus();
            }}
          >
            <header>
              <div>
                <Dialog.Title>Drag around the issue</Dialog.Title>
                <Dialog.Description id="codex-selection-description">
                  Select only the area Codex needs to inspect.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <IconButton label="Cancel screenshot selection" variant="quiet">
                  <X aria-hidden="true" size={18} />
                </IconButton>
              </Dialog.Close>
            </header>
            <div
              className="codex-feedback-selection-stage"
              onPointerCancel={cancelSelection}
              onPointerDown={startSelection}
              onPointerMove={moveSelection}
              onPointerUp={finishSelection}
            >
              <img
                alt="Screen capture ready for area selection"
                ref={selectionImageRef}
                src={sourceScreenshot}
              />
              {selectionRectangle ? (
                <span
                  aria-hidden="true"
                  className="codex-feedback-selection-box"
                  style={{
                    height: selectionRectangle.height,
                    left: selectionRectangle.left,
                    top: selectionRectangle.top,
                    width: selectionRectangle.width,
                  }}
                />
              ) : null}
              {!selectionReady ? (
                <span className="codex-feedback-selection-hint">
                  Drag around an area, or send the whole screenshot
                </span>
              ) : null}
            </div>
            {error ? (
              <p className="codex-feedback-error" role="alert">
                <CircleAlert aria-hidden="true" size={18} />
                {error}
              </p>
            ) : null}
            <ButtonGroup className="codex-feedback-selection-actions">
              <Button onClick={() => void beginPrimaryCapture()} variant="secondary">
                <RotateCcw aria-hidden="true" size={18} />
                Capture again
              </Button>
              <Button onClick={useWholeScreenshot} variant="secondary">
                <Maximize2 aria-hidden="true" size={18} />
                Use whole screenshot
              </Button>
              <Button disabled={!selectionReady} onClick={() => cropSelection()}>
                Add selection to message
              </Button>
            </ButtonGroup>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        onOpenChange={(open) => {
          if (!open) closeTemporaryQuestion();
        }}
        open={Boolean(temporaryQuestion)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="codex-quick-question-overlay" />
          <Dialog.Content
            aria-describedby="codex-quick-question-description"
            className="codex-quick-question-dialog"
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              window.requestAnimationFrame(() => temporaryQuestionTextareaRef.current?.focus());
            }}
          >
            <header className="codex-quick-question-dialog__header">
              <span aria-hidden="true" className="codex-quick-question-dialog__icon">
                <Zap size={18} />
              </span>
              <span>
                <Dialog.Title>Quick question</Dialog.Title>
                <Dialog.Description id="codex-quick-question-description">
                  Uses this conversation · temporary and read-only
                </Dialog.Description>
              </span>
              <Dialog.Close asChild>
                <IconButton label="Close temporary question" variant="quiet">
                  <X aria-hidden="true" size={17} />
                </IconButton>
              </Dialog.Close>
            </header>

            {temporaryQuestion ? (
              <>
                <blockquote className="codex-quick-question-dialog__excerpt">
                  <small>Selected Codex excerpt</small>
                  <p>{temporaryQuestion.excerpt}</p>
                </blockquote>

                <div aria-atomic="true" aria-live="polite">
                  {temporaryQuestion.phase === 'answer' && temporaryQuestion.answer ? (
                    <section
                      aria-labelledby="codex-quick-answer-title"
                      className="codex-quick-question-dialog__answer"
                    >
                      <header>
                        <span>
                          <small>
                            {autoReadCodex && speechSupported
                              ? 'Temporary response · auto-read on'
                              : 'Temporary response'}
                          </small>
                          <strong id="codex-quick-answer-title">Quick answer</strong>
                        </span>
                        <CircleCheck aria-hidden="true" size={18} />
                      </header>
                      <MarkdownContent
                        speech={
                          speechSupported
                            ? {
                                activeWordIndex:
                                  speechMessageId === temporaryQuestion.speechId
                                    ? speechActiveWordIndex
                                    : undefined,
                                onWordSelect: (wordIndex) => {
                                  setAutoReadPending(undefined);
                                  readCodexReply(
                                    temporaryQuestion.speechId,
                                    temporaryQuestion.answer || '',
                                    wordIndex,
                                  );
                                },
                                words: codexSpeechWords(
                                  temporaryQuestion.answer,
                                  selectedSpeechStyle,
                                ),
                              }
                            : undefined
                        }
                      >
                        {temporaryQuestion.answer}
                      </MarkdownContent>
                      {speechSupported ? (
                        <ButtonGroup className="codex-quick-question-dialog__speech-actions">
                          <Button
                            disabled={
                              speechMessageId === temporaryQuestion.speechId &&
                              speechPlaybackState === 'loading'
                            }
                            onClick={() => {
                              if (
                                speechMessageId === temporaryQuestion.speechId &&
                                speechPlaybackState === 'playing'
                              ) {
                                pauseCodexSpeech();
                              } else if (
                                speechMessageId === temporaryQuestion.speechId &&
                                speechPlaybackState === 'paused'
                              ) {
                                resumeCodexSpeech();
                              } else {
                                setAutoReadPending(undefined);
                                readCodexReply(
                                  temporaryQuestion.speechId,
                                  temporaryQuestion.answer || '',
                                );
                              }
                            }}
                            size="small"
                            variant="quiet"
                          >
                            {speechMessageId === temporaryQuestion.speechId &&
                            speechPlaybackState === 'loading' ? (
                              <LoaderCircle aria-hidden="true" className="is-spinning" size={15} />
                            ) : speechMessageId === temporaryQuestion.speechId &&
                              speechPlaybackState === 'playing' ? (
                              <Pause aria-hidden="true" size={15} />
                            ) : (
                              <Volume2 aria-hidden="true" size={15} />
                            )}
                            {speechMessageId === temporaryQuestion.speechId &&
                            speechPlaybackState === 'loading'
                              ? 'Preparing'
                              : speechMessageId === temporaryQuestion.speechId &&
                                  speechPlaybackState === 'playing'
                                ? 'Pause reading'
                                : speechMessageId === temporaryQuestion.speechId &&
                                    speechPlaybackState === 'paused'
                                  ? 'Resume reading'
                                  : 'Read answer'}
                          </Button>
                          {speechMessageId === temporaryQuestion.speechId ? (
                            <Button onClick={() => stopCodexSpeech()} size="small" variant="quiet">
                              <Square aria-hidden="true" size={14} />
                              Stop
                            </Button>
                          ) : null}
                        </ButtonGroup>
                      ) : null}
                      <small>
                        {temporaryQuestion.model
                          ? `${temporaryQuestion.model} · discarded when closed`
                          : 'Discarded when closed'}
                      </small>
                    </section>
                  ) : null}

                  {temporaryQuestion.phase === 'loading' ? (
                    <div className="codex-quick-question-dialog__loading" role="status">
                      <LoaderCircle aria-hidden="true" className="is-spinning" size={18} />
                      <span>
                        <strong>Answering with this conversation</strong>
                        <small>The saved conversation and workspace files stay unchanged.</small>
                      </span>
                    </div>
                  ) : null}
                </div>

                {temporaryQuestion.phase !== 'answer' ? (
                  <label className="codex-quick-question-dialog__prompt">
                    <span>What do you want to know?</span>
                    <textarea
                      disabled={temporaryQuestion.phase === 'loading'}
                      maxLength={800}
                      onChange={(event) =>
                        setTemporaryQuestion((current) =>
                          current
                            ? { ...current, error: undefined, question: event.target.value }
                            : current,
                        )
                      }
                      onKeyDown={(event) => {
                        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                          event.preventDefault();
                          void askTemporaryQuestion();
                        }
                      }}
                      placeholder="Ask about this excerpt…"
                      ref={temporaryQuestionTextareaRef}
                      rows={3}
                      value={temporaryQuestion.question}
                    />
                  </label>
                ) : null}

                {temporaryQuestion.error ? (
                  <p className="codex-feedback-error" role="alert">
                    <CircleAlert aria-hidden="true" size={18} />
                    {temporaryQuestion.error}
                  </p>
                ) : null}

                <footer className="codex-quick-question-dialog__actions">
                  {temporaryQuestion.phase === 'answer' ? (
                    <Button
                      onClick={() => {
                        setAutoReadPending((current) =>
                          current?.id === temporaryQuestion.speechId ? undefined : current,
                        );
                        if (speechMessageIdRef.current === temporaryQuestion.speechId) {
                          stopCodexSpeech(false);
                        }
                        setTemporaryQuestion((current) =>
                          current
                            ? {
                                ...current,
                                answer: undefined,
                                error: undefined,
                                phase: 'compose',
                                question: '',
                              }
                            : current,
                        );
                        window.requestAnimationFrame(() =>
                          temporaryQuestionTextareaRef.current?.focus(),
                        );
                      }}
                      variant="secondary"
                    >
                      Ask another
                    </Button>
                  ) : (
                    <Button onClick={closeTemporaryQuestion} variant="secondary">
                      Cancel
                    </Button>
                  )}
                  {temporaryQuestion.phase === 'answer' ? (
                    <Button onClick={closeTemporaryQuestion}>Done</Button>
                  ) : (
                    <Button
                      disabled={
                        temporaryQuestion.phase === 'loading' ||
                        !temporaryQuestion.question.trim() ||
                        !temporaryQuestionModel
                      }
                      onClick={() => void askTemporaryQuestion()}
                    >
                      {temporaryQuestion.phase === 'loading' ? (
                        <LoaderCircle aria-hidden="true" className="is-spinning" size={18} />
                      ) : (
                        <Zap aria-hidden="true" size={17} />
                      )}
                      {temporaryQuestion.phase === 'loading' ? 'Answering' : 'Ask quickly'}
                    </Button>
                  )}
                </footer>
              </>
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <ConfirmationDialog
        confirmLabel="Delete chat"
        confirmingLabel="Deleting chat"
        detail={
          conversationPendingDeletion
            ? `“${threadTitle(conversationPendingDeletion)}” and its complete conversation history will be permanently deleted.`
            : 'This conversation and its complete history will be permanently deleted.'
        }
        error={deleteConversationError}
        isConfirming={isDeletingConversation}
        onConfirm={() => void deleteConversation()}
        onOpenChange={(open) => {
          if (open || isDeletingConversation) return;
          setDeleteConversationId('');
          setDeleteConversationError('');
        }}
        open={Boolean(conversationPendingDeletion)}
        title="Delete this chat?"
      />
    </>
  );
}
