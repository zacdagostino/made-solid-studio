import * as Dialog from '@radix-ui/react-dialog';
import {
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
  GitBranch,
  ImageUp,
  LoaderCircle,
  Maximize2,
  MessageSquareText,
  MonitorUp,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Send,
  SlidersHorizontal,
  Square,
  UsersRound,
  X,
} from 'lucide-react';
import { captureVisiblePage, warmMobileScreenCapture } from '../lib/mobile-screen-capture';
import { studioRuntimeFetch } from '../lib/studio-runtime';
import { isSupabaseConfigured, usesLocalStorage } from '../lib/supabase';
import {
  useCallback,
  useEffect,
  Fragment,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Button, ButtonGroup, IconButton, StatusBadge } from './ui';
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
};

type CodexStatus = {
  status: 'ready' | 'unavailable';
  detail: string;
  account?: { type: string; planType: string };
  thread?: CodexThread;
  threads: CodexThread[];
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    text: string;
    turnId?: string;
    phase?: string;
    attachmentId?: string;
    attachmentIds?: string[];
    feedbackId?: string;
  }>;
  agents: CodexAgent[];
  models: CodexModel[];
  queuedCount: number;
  interruptingCount?: number;
  queuedMessages?: Array<{
    id: string;
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
type Point = { x: number; y: number };
type Selection = { start: Point; end: Point };
type DraftAttachment = { id: string; name: string; source: string };

const statusEndpoint = '/__made-solid/codex-status';
const feedbackEndpoint = '/__made-solid/codex-feedback';
const localPageCaptureEndpoint = '/__made-solid/page-screenshot';
const codexAttachmentPrefix = '/__made-solid/codex-attachment/';
const browserCaptureSource = 'made-solid-browser-capture';
const codexPreferencesKey = 'made-solid-codex-preferences-v1';
const codexDraftKey = 'made-solid-codex-draft-v1';
const maximumPhotoBytes = 15 * 1024 * 1024;
const maximumDraftAttachments = 5;
const supportedPhotoTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

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
};

function readCodexPreferences(): CodexPreferences {
  if (typeof window === 'undefined')
    return { modelId: '', effortByModel: {}, workMode: 'team', fastMode: false };
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(codexPreferencesKey) || '{}',
    ) as Partial<CodexPreferences>;
    return {
      modelId: typeof stored.modelId === 'string' ? stored.modelId : '',
      effortByModel:
        stored.effortByModel && typeof stored.effortByModel === 'object'
          ? stored.effortByModel
          : {},
      workMode: stored.workMode === 'direct' ? 'direct' : 'team',
      fastMode: stored.fastMode === true,
    };
  } catch {
    return { modelId: '', effortByModel: {}, workMode: 'team', fastMode: false };
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
  supervisorWorking,
  teamKey,
  teamLabel,
}: {
  agents: CodexAgent[];
  clock: number;
  expandedAgentId: string;
  onExpandedAgentChange: (agentId: string) => void;
  resumingAgentIds: Set<string>;
  resumeState?: TeamResumeState;
  supervisorWorking: boolean;
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
              : activeAgents.length
                ? `${activeAgents.length} working in parallel`
                : supervisorWorking
                  ? 'Supervisor synthesizing results'
                  : `${completedAgents} of ${agents.length} complete`}
          </small>
        </span>
        <span className="codex-agent-team__count">
          {completedAgents}/{agents.length}
        </span>
      </header>
      {teamResumeState ? (
        <div
          className={`codex-agent-team__resume${teamResumeState.failedAgentIds.length ? ' has-failure' : ''}`}
          role={teamResumeState.failedAgentIds.length ? 'alert' : 'status'}
        >
          {teamResumeState.agentIds.length ? (
            <LoaderCircle aria-hidden="true" className="is-spinning" size={16} />
          ) : (
            <CircleAlert aria-hidden="true" size={16} />
          )}
          <span>
            <strong>
              {teamResumeState.agentIds.length
                ? 'Resuming interrupted agents'
                : 'Some agents need attention'}
            </strong>
            <small>
              {teamResumeState.agentIds.length
                ? `${teamResumeState.agentIds.length} ${teamResumeState.agentIds.length === 1 ? 'assignment is' : 'assignments are'} continuing from saved sub-chats.`
                : ''}
              {teamResumeState.failedAgentIds.length
                ? ` ${teamResumeState.failedAgentIds.length} ${teamResumeState.failedAgentIds.length === 1 ? 'agent could' : 'agents could'} not be restarted.`
                : ''}
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
                    {agent.nickname && agent.role ? <small>{agent.nickname}</small> : null}
                  </span>
                  <small>{agent.task || 'Preparing an assigned task…'}</small>
                </span>
                <span className="codex-agent-card__meta">
                  <strong>{presentation.label}</strong>
                  <small>
                    {agent.working
                      ? elapsedTime(agent.workingStartedAt ?? agent.createdAt, clock)
                      : 'View chat'}
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
                  <div className="codex-agent-card__assignment">
                    <GitBranch aria-hidden="true" size={14} />
                    <span>
                      <strong>Assignment</strong>
                      <small>{agent.task || 'Waiting for the supervisor.'}</small>
                    </span>
                  </div>
                  {agent.messages.length ? (
                    <div
                      aria-label={`${agentName(agent, index)} sub-chat`}
                      className="codex-agent-card__messages"
                    >
                      {agent.messages.map((message) => (
                        <div
                          className={`codex-agent-card__message codex-agent-card__message--${message.role}`}
                          key={message.id}
                        >
                          <strong>
                            {message.role === 'user' ? 'Supervisor' : agentName(agent, index)}
                          </strong>
                          <MarkdownContent>{message.text}</MarkdownContent>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="codex-agent-card__empty">The sub-chat is starting.</p>
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

function readCodexDraft() {
  if (typeof window === 'undefined') return '';
  return (window.localStorage.getItem(codexDraftKey) || '').slice(0, 4_000);
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
  const latestPrompt = thread?.preview
    ?.split(/\n\s*Captured from:/i, 1)[0]
    .replace(/\s+/g, ' ')
    .trim();
  const source = latestPrompt || thread?.name?.trim() || 'New chat';
  const maximumLength = 64;
  if (source.length <= maximumLength) return source;
  const candidate = source.slice(0, maximumLength + 1);
  const wordBoundary = candidate.lastIndexOf(' ');
  const shortened = candidate.slice(0, wordBoundary >= 32 ? wordBoundary : maximumLength).trimEnd();
  return `${shortened}…`;
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

export function CodexFeedbackPanel({ embedded = false }: { embedded?: boolean }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const conversationTriggerRef = useRef<HTMLButtonElement>(null);
  const conversationPickerRef = useRef<HTMLDivElement>(null);
  const previousWorkingRef = useRef(false);
  const chatLogRef = useRef<HTMLDivElement>(null);
  const knownMessageIdsRef = useRef(new Set<string>());
  const knownMessageThreadRef = useRef('');
  const messageAnimationTimerRef = useRef<number>();
  const previousChatScrollTopRef = useRef(0);
  const composerTextareaRef = useRef<HTMLTextAreaElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const chatFollowingLatestRef = useRef(true);
  const selectionImageRef = useRef<HTMLImageElement>(null);
  const selectionPointerRef = useRef<{ pointerId: number; start: Point }>();
  const [isSupported, setIsSupported] = useState<boolean>();
  const [phase, setPhase] = useState<PanelPhase>('closed');
  const [status, setStatus] = useState<CodexStatus>();
  const [enteringMessageIds, setEnteringMessageIds] = useState<Set<string>>(() => new Set());
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
  const [selectedThreadId, setSelectedThreadId] = useState('');
  const [conversationPickerOpen, setConversationPickerOpen] = useState(false);
  const selectedThreadIdRef = useRef('');
  const [sourceScreenshot, setSourceScreenshot] = useState('');
  const [selection, setSelection] = useState<Selection>();
  const [draftAttachments, setDraftAttachments] = useState<DraftAttachment[]>([]);
  const [prompt, setPrompt] = useState(readCodexDraft);
  const [error, setError] = useState<string>();
  const [browserCaptureAvailable, setBrowserCaptureAvailable] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const [hasUnseenCompletion, setHasUnseenCompletion] = useState(false);
  const [pendingChatMessage, setPendingChatMessage] = useState<{
    id: string;
    text: string;
  }>();
  const [pendingVisualMessage, setPendingVisualMessage] = useState<{
    id: string;
    text: string;
    images: string[];
  }>();
  const [expandedQueueId, setExpandedQueueId] = useState('');
  const [queuedEdits, setQueuedEdits] = useState<Record<string, string>>({});
  const [queueActionId, setQueueActionId] = useState('');
  const [queueActionError, setQueueActionError] = useState('');
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [isResumingThread, setIsResumingThread] = useState(false);
  const [teamResumeState, setTeamResumeState] = useState<TeamResumeState>();
  const [workspaceCaptureContext, setWorkspaceCaptureContext] = useState<WorkspaceCaptureContext>();
  const [captureDetail, setCaptureDetail] = useState('');
  const [isChatFollowingLatest, setIsChatFollowingLatest] = useState(true);
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const [composerSettingsOpen, setComposerSettingsOpen] = useState(false);
  const [isPreparingPhoto, setIsPreparingPhoto] = useState(false);
  const [expandedAgentId, setExpandedAgentId] = useState('');

  const updateChatFollowingLatest = useCallback((following: boolean) => {
    chatFollowingLatestRef.current = following;
    setIsChatFollowingLatest(following);
  }, []);

  const scrollChatToLatest = useCallback(() => {
    const log = chatLogRef.current;
    if (!log) return;
    updateChatFollowingLatest(true);
    log.scrollTo({ top: log.scrollHeight, behavior: 'auto' });
  }, [updateChatFollowingLatest]);

  const handleChatLogScroll = useCallback(() => {
    const log = chatLogRef.current;
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
  }, [updateChatFollowingLatest]);

  const selectConversation = useCallback(
    (threadId: string) => {
      selectedThreadIdRef.current = threadId;
      setSelectedThreadId(threadId);
      setConversationPickerOpen(false);
      setExpandedAgentId('');
      setTeamResumeState(undefined);
      updateChatFollowingLatest(true);
    },
    [updateChatFollowingLatest],
  );

  const refreshStatus = useCallback(
    async (threadIdOverride?: string) => {
      const requestedThreadId = threadIdOverride ?? selectedThreadIdRef.current;
      try {
        const query = requestedThreadId ? `?threadId=${encodeURIComponent(requestedThreadId)}` : '';
        const response = await studioRuntimeFetch(`${statusEndpoint}${query}`, {
          headers: { Accept: 'application/json' },
        });
        if (
          response.status === 404 ||
          !response.headers.get('content-type')?.includes('application/json')
        ) {
          setIsSupported(false);
          return;
        }
        if (!response.ok) return;
        const nextStatus = (await response.json()) as CodexStatus;
        setIsSupported(true);
        if (requestedThreadId !== selectedThreadIdRef.current) return;
        setStatus(nextStatus);
        if (
          nextStatus.thread &&
          (!requestedThreadId ||
            !nextStatus.threads.some((thread) => thread.id === requestedThreadId))
        ) {
          selectConversation(nextStatus.thread.id);
        }
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
      } catch {
        setIsSupported((current) => (current === undefined ? false : current));
      }
    },
    [effortPreferences, selectConversation, selectedEffort, selectedModelId],
  );

  useEffect(() => {
    void refreshStatus();
    const interval = window.setInterval(() => void refreshStatus(), 5_000);
    return () => window.clearInterval(interval);
  }, [refreshStatus]);

  useEffect(() => {
    void browserCaptureRequest('ping', 1_000)
      .then((result) => setBrowserCaptureAvailable(result === 'ready'))
      .catch(() => setBrowserCaptureAvailable(false));
    if (!sharedScreenSupported()) window.setTimeout(() => warmMobileScreenCapture(), 0);
  }, []);

  useEffect(() => {
    if (!embedded || window.parent === window) return;
    const receiveWorkspaceContext = (event: MessageEvent) => {
      if (
        event.source !== window.parent ||
        event.data?.source !== 'made-solid-codex-host' ||
        typeof event.data.url !== 'string'
      )
        return;
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
  }, [embedded]);

  useEffect(() => {
    const log = chatLogRef.current;
    if (!log || !chatFollowingLatestRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      if (chatFollowingLatestRef.current) log.scrollTop = log.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pendingChatMessage, pendingVisualMessage, status?.messages, status?.queuedMessages]);

  useEffect(() => {
    const threadId = status?.thread?.id ?? '';
    if (!threadId) return;
    const currentIds = new Set(status?.messages.map((message) => message.id) ?? []);
    if (knownMessageThreadRef.current !== threadId || !knownMessageIdsRef.current.size) {
      knownMessageThreadRef.current = threadId;
      knownMessageIdsRef.current = currentIds;
      setEnteringMessageIds(new Set());
      return;
    }
    const incomingIds = [...currentIds].filter((id) => !knownMessageIdsRef.current.has(id));
    knownMessageIdsRef.current = currentIds;
    if (!incomingIds.length) return;
    setEnteringMessageIds(new Set(incomingIds));
    window.clearTimeout(messageAnimationTimerRef.current);
    messageAnimationTimerRef.current = window.setTimeout(
      () => setEnteringMessageIds(new Set()),
      600,
    );
  }, [status?.messages, status?.thread?.id]);

  useEffect(() => () => window.clearTimeout(messageAnimationTimerRef.current), []);

  useEffect(() => {
    if (phase !== 'compose') return;
    updateChatFollowingLatest(true);
    const frame = window.requestAnimationFrame(scrollChatToLatest);
    return () => window.cancelAnimationFrame(frame);
  }, [phase, scrollChatToLatest, selectedThreadId, updateChatFollowingLatest]);

  useEffect(() => {
    if (prompt) window.localStorage.setItem(codexDraftKey, prompt);
    else window.localStorage.removeItem(codexDraftKey);
  }, [prompt]);

  const pendingChatAccepted = Boolean(
    pendingChatMessage &&
    (status?.messages.some(
      (message) =>
        message.feedbackId === pendingChatMessage.id ||
        (message.role === 'user' && message.text === pendingChatMessage.text),
    ) ||
      status?.queuedMessages?.some((message) => message.id === pendingChatMessage.id)),
  );
  const pendingVisualAccepted = Boolean(
    pendingVisualMessage &&
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

  const activeAgents = status?.agents?.filter((agent) => agent.working) ?? [];
  const interruptedAgents = status?.agents?.filter((agent) => agent.status === 'interrupted') ?? [];
  const completedAgents =
    status?.agents?.filter((agent) => agent.status === 'completed').length ?? 0;
  const selectedTeamResumeState =
    teamResumeState?.threadId === (selectedThreadId || status?.thread?.id)
      ? teamResumeState
      : undefined;
  const resumingAgentIds = new Set(selectedTeamResumeState?.agentIds ?? []);
  const isTeamResumePending = Boolean(selectedTeamResumeState?.agentIds.length);
  const agentTeamsAfterMessage = useMemo(() => {
    const messages = status?.messages ?? [];
    const lastMessageByTurn = new Map<string, string>();
    for (const message of messages) {
      if (message.turnId) lastMessageByTurn.set(message.turnId, message.id);
    }
    const fallbackMessageId =
      messages.find((message) => message.role === 'assistant')?.id ?? messages[0]?.id;
    const teamsByTurn = new Map<string, CodexAgent[]>();
    for (const agent of status?.agents ?? []) {
      const teamKey = agent.supervisorTurnId || '__legacy-agent-team__';
      teamsByTurn.set(teamKey, [...(teamsByTurn.get(teamKey) ?? []), agent]);
    }
    const teamsByMessage = new Map<
      string,
      Array<{ key: string; label: string; agents: CodexAgent[] }>
    >();
    let teamNumber = 0;
    for (const [key, agents] of teamsByTurn) {
      const messageId = lastMessageByTurn.get(key) || fallbackMessageId;
      if (!messageId) continue;
      teamNumber += 1;
      teamsByMessage.set(messageId, [
        ...(teamsByMessage.get(messageId) ?? []),
        {
          key,
          label: teamsByTurn.size > 1 ? `Agent team ${teamNumber}` : 'Agent team',
          agents,
        },
      ]);
    }
    return teamsByMessage;
  }, [status?.agents, status?.messages]);
  const isCodexWorking = status?.thread?.working === true || activeAgents.length > 0;
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
  const workingTitle = interruptingCount
    ? 'Stopping the current turn'
    : activeFlags.includes('waitingOnApproval')
      ? 'Waiting for approval'
      : activeFlags.includes('waitingOnUserInput')
        ? 'Waiting for your input'
        : hasActiveProgressUpdate
          ? 'Working through the next step'
          : 'Getting oriented';
  const workingDetail = interruptingCount
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
    if (previousWorkingRef.current && !isCodexWorking && phase === 'closed') {
      setHasUnseenCompletion(true);
    }
    previousWorkingRef.current = isCodexWorking;
  }, [isCodexWorking, phase]);

  useEffect(() => {
    if (!embedded || window.parent === window) return;
    window.parent.postMessage(
      {
        source: 'made-solid-codex-panel',
        open: phase !== 'closed',
        expanded: phase === 'selecting',
      },
      '*',
    );
  }, [embedded, phase]);

  const availableModels = useMemo(() => status?.models ?? [], [status?.models]);
  const selectedThread =
    status?.threads.find((thread) => thread.id === (selectedThreadId || status?.thread?.id)) ??
    status?.thread;
  const selectedModel = availableModels.find((model) => model.id === selectedModelId);
  const fastModeAvailable =
    selectedModel?.serviceTiers?.some((tier) => tier.id === 'priority') === true;
  const selectedServiceTier = fastMode && fastModeAvailable ? 'priority' : 'default';
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
    window.localStorage.setItem(
      codexPreferencesKey,
      JSON.stringify({
        modelId: selectedModelId,
        effortByModel: { ...effortPreferences, [selectedModelId]: selectedEffort },
        workMode,
        fastMode,
      } satisfies CodexPreferences),
    );
  }, [effortPreferences, fastMode, selectedEffort, selectedModelId, workMode]);

  const discardEmptyConversation = async (threadId: string) => {
    const candidate = status?.threads.find((thread) => thread.id === threadId);
    if (!threadId || !candidate?.discardable) return;
    try {
      const response = await studioRuntimeFetch(feedbackEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ action: 'delete-empty-thread', threadId }),
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

  const createConversation = async () => {
    if (!selectedModel || !selectedEffort || isCreatingThread) return;
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
              agents: [],
              queuedCount: 0,
              interruptingCount: 0,
              queuedMessages: [],
            }
          : current,
      );
      selectConversation(newThread.id);
      setPendingChatMessage(undefined);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'A new Codex conversation could not be created.',
      );
    } finally {
      setIsCreatingThread(false);
    }
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
      await refreshStatus(selectedThread.id);
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
    action: 'update-queued' | 'interrupt-queued',
    id: string,
    queuedPrompt?: string,
  ) => {
    setQueueActionId(id);
    setQueueActionError('');
    try {
      const response = await studioRuntimeFetch(feedbackEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ action, id, prompt: queuedPrompt }),
      });
      const result = (await response.json()) as { id?: string; detail?: string };
      if (!response.ok)
        throw new Error(result.detail || 'The queued message could not be changed.');
      if (action === 'update-queued') setExpandedQueueId('');
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

  const sendFeedback = async () => {
    if (!prompt.trim()) {
      setError('Describe what Codex should change or investigate.');
      return;
    }
    if (!selectedModel || !selectedEffort) {
      setError('Choose an available Codex model and reasoning level.');
      return;
    }
    const submittedPrompt = prompt.trim();
    const submittedAttachments = [...draftAttachments];
    setPhase('sending-chat');
    setError(undefined);
    try {
      const response = await studioRuntimeFetch(feedbackEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          screenshots: submittedAttachments.map((attachment) => attachment.source),
          prompt: submittedPrompt,
          model: selectedModel.id,
          effort: selectedEffort,
          serviceTier: selectedServiceTier,
          workMode,
          context: `${document.title} · ${window.location.href}`,
          threadId: selectedThreadId || status?.thread?.id,
        }),
      });
      const result = (await response.json()) as { id?: string; detail?: string };
      if (!response.ok) throw new Error(result.detail || 'Codex could not accept this feedback.');
      if (!submittedAttachments.length) {
        setPendingChatMessage({
          id: result.id || crypto.randomUUID(),
          text: submittedPrompt,
        });
      } else {
        setPendingVisualMessage({
          id: result.id || crypto.randomUUID(),
          text: submittedPrompt,
          images: submittedAttachments.map((attachment) => attachment.source),
        });
      }
      setPrompt('');
      setDraftAttachments([]);
      setIsComposerExpanded(false);
      setPhase('compose');
      await refreshStatus();
    } catch (cause) {
      setPhase('compose');
      setError(cause instanceof Error ? cause.message : 'Codex could not accept this feedback.');
    }
  };

  const closePanel = () => {
    void discardEmptyConversation(selectedThreadId || status?.thread?.id || '');
    setPhase('closed');
    setError(undefined);
  };

  if (isSupported !== true) return null;

  return (
    <>
      <IconButton
        className={`codex-feedback-trigger${embedded ? ' is-embedded' : ''}${isCodexWorking ? ' is-working' : ''}${hasUnseenCompletion ? ' has-completion' : ''}`}
        label={
          isCodexWorking
            ? 'Codex is working'
            : hasUnseenCompletion
              ? 'Codex finished — open chat'
              : 'Chat with Codex'
        }
        onClick={() => {
          setHasUnseenCompletion(false);
          updateChatFollowingLatest(true);
          setPhase('compose');
          setError(undefined);
          void refreshStatus();
        }}
        ref={triggerRef}
        variant="primary"
      >
        {isCodexWorking ? (
          <LoaderCircle aria-hidden="true" className="is-spinning" size={20} />
        ) : hasUnseenCompletion ? (
          <BellRing aria-hidden="true" size={20} />
        ) : (
          <MessageSquareText aria-hidden="true" size={20} />
        )}
      </IconButton>

      <Dialog.Root
        onOpenChange={(open) => !open && closePanel()}
        open={phase === 'compose' || phase === 'sending-chat'}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="codex-feedback-overlay" />
          <Dialog.Content
            aria-describedby="codex-feedback-description"
            className={`codex-feedback-dialog codex-chat-dialog${embedded ? ' is-embedded' : ''}`}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              triggerRef.current?.focus();
            }}
            onEscapeKeyDown={(event) => {
              if (conversationPickerOpen) {
                event.preventDefault();
                setConversationPickerOpen(false);
                window.requestAnimationFrame(() => conversationTriggerRef.current?.focus());
                return;
              }
              if (composerSettingsOpen) {
                event.preventDefault();
                setComposerSettingsOpen(false);
              }
            }}
          >
            <header className="codex-feedback-dialog__header">
              <div className="codex-feedback-dialog__identity">
                <span className="codex-feedback-dialog__icon" aria-hidden="true">
                  <Bot size={20} />
                </span>
                <div>
                  <Dialog.Title>
                    Codex <span aria-hidden="true">Workspace Agent</span>
                  </Dialog.Title>
                  <div className="codex-feedback-dialog__status">
                    <span
                      aria-hidden="true"
                      className={status?.status === 'ready' ? 'is-ready' : ''}
                    />
                    <span>
                      {status?.thread
                        ? 'ChatGPT subscription · connected'
                        : 'ChatGPT subscription · waiting'}
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
              <Dialog.Close asChild>
                <IconButton label="Close Codex chat" variant="quiet">
                  <X aria-hidden="true" size={18} />
                </IconButton>
              </Dialog.Close>
            </header>

            <Dialog.Description className="sr-only" id="codex-feedback-description">
              Chat with the subscription-only Codex Workspace Agent and optionally attach a photo or
              screenshot.
            </Dialog.Description>

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
                  disabled={!status?.threads.length}
                  id="codex-conversation"
                  onClick={() => setConversationPickerOpen((open) => !open)}
                  ref={conversationTriggerRef}
                  variant="quiet"
                >
                  <span className="codex-conversation-picker__summary">
                    <strong>{threadTitle(selectedThread)}</strong>
                    <small>
                      {selectedThread?.working
                        ? 'Working'
                        : selectedThread?.interrupted
                          ? 'Interrupted'
                          : 'Last used'}{' '}
                      ·{' '}
                      {selectedThread?.working
                        ? elapsedTime(selectedThread.workingStartedAt, clock)
                        : lastUsedTime(threadLastUsedAt(selectedThread), clock)}
                    </small>
                  </span>
                  {selectedThread?.working ? (
                    <LoaderCircle aria-hidden="true" className="is-spinning" size={17} />
                  ) : (
                    <ChevronDown aria-hidden="true" size={17} />
                  )}
                </Button>
                <IconButton
                  className="codex-conversation-picker__new"
                  disabled={!status?.thread || !selectedModel || isCreatingThread}
                  label="New chat"
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
                    {(status?.threads ?? []).map((thread) => {
                      const selected = thread.id === (selectedThreadId || status?.thread?.id);
                      const lastUsedAt = threadLastUsedAt(thread);
                      const usedAt = timestampMilliseconds(lastUsedAt);
                      return (
                        <Button
                          aria-checked={selected}
                          className="codex-conversation-picker__option"
                          key={thread.id}
                          onClick={() => {
                            void discardEmptyConversation(
                              selectedThreadId || status?.thread?.id || '',
                            );
                            selectConversation(thread.id);
                            setConversationPickerOpen(false);
                            void refreshStatus(thread.id);
                          }}
                          role="menuitemradio"
                          variant="quiet"
                        >
                          <span className="codex-conversation-picker__state" aria-hidden="true">
                            {thread.working ? (
                              <LoaderCircle className="is-spinning" size={16} />
                            ) : selected ? (
                              <Check size={16} />
                            ) : (
                              <Clock3 size={15} />
                            )}
                          </span>
                          <span className="codex-conversation-picker__option-copy">
                            <strong>{threadTitle(thread)}</strong>
                            <small>
                              <span>
                                {thread.working
                                  ? 'Working'
                                  : thread.interrupted
                                    ? 'Interrupted'
                                    : 'Ready'}
                              </span>
                              <time
                                dateTime={usedAt ? new Date(usedAt).toISOString() : undefined}
                                title={usedAt ? new Date(usedAt).toLocaleString() : undefined}
                              >
                                Last used {lastUsedTime(lastUsedAt, clock)}
                              </time>
                            </small>
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="codex-chat-transcript">
              <div
                aria-label="Codex chat log"
                aria-live="polite"
                className="codex-chat-log"
                onScroll={handleChatLogScroll}
                ref={chatLogRef}
                role="log"
                tabIndex={0}
              >
                {status?.messages.length
                  ? status.messages.map((message) => (
                      <Fragment key={message.id}>
                        <article
                          className={`codex-chat-message codex-chat-message--${message.role}${
                            message.role === 'assistant' && message.phase === 'commentary'
                              ? ' codex-chat-message--progress'
                              : ''
                          }${enteringMessageIds.has(message.id) ? ' codex-chat-message--entering' : ''}`}
                          data-phase={message.phase}
                        >
                          <strong>
                            {message.role === 'user' ? (
                              'You'
                            ) : message.phase === 'commentary' ? (
                              <>
                                <span aria-hidden="true" className="codex-chat-message__pulse" />
                                Progress update
                              </>
                            ) : (
                              'Codex'
                            )}
                          </strong>
                          <MarkdownContent>{message.text}</MarkdownContent>
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
                            supervisorWorking={status.thread?.activeTurnId === team.key}
                            teamKey={team.key}
                            teamLabel={team.label}
                          />
                        ))}
                      </Fragment>
                    ))
                  : null}
                {!status?.messages.length &&
                !status?.queuedMessages?.length &&
                !pendingChatMessage &&
                !pendingVisualMessage ? (
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
                            : `${message.workMode === 'team' ? 'Agent team · ' : ''}Queued · ${message.position}`}
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
                              <LoaderCircle aria-hidden="true" className="is-spinning" size={14} />
                            ) : (
                              <Square aria-hidden="true" size={12} />
                            )}
                            Interrupt
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
                {pendingChatMessage && !pendingChatAccepted ? (
                  <article className="codex-chat-message codex-chat-message--user codex-chat-message--pending codex-chat-message--entering">
                    <strong>
                      You <span>Sending</span>
                    </strong>
                    <MarkdownContent>{pendingChatMessage.text}</MarkdownContent>
                  </article>
                ) : null}
                {pendingVisualMessage && !pendingVisualAccepted ? (
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
                {status?.agents?.length && !agentTeamsAfterMessage.size ? (
                  <section aria-labelledby="codex-agent-team-title" className="codex-agent-team">
                    <header className="codex-agent-team__header">
                      <span aria-hidden="true" className="codex-agent-team__icon">
                        <UsersRound size={17} />
                      </span>
                      <span className="codex-agent-team__summary">
                        <strong id="codex-agent-team-title">Agent team</strong>
                        <small aria-live="polite">
                          {selectedTeamResumeState?.agentIds.length
                            ? `${selectedTeamResumeState.agentIds.length} interrupted ${selectedTeamResumeState.agentIds.length === 1 ? 'agent is' : 'agents are'} resuming`
                            : activeAgents.length
                              ? `${activeAgents.length} working in parallel`
                              : status.thread?.working
                                ? 'Supervisor synthesizing results'
                                : `${completedAgents} of ${status.agents.length} complete`}
                        </small>
                      </span>
                      <span className="codex-agent-team__count">
                        {completedAgents}/{status.agents.length}
                      </span>
                    </header>
                    {selectedTeamResumeState ? (
                      <div
                        className={`codex-agent-team__resume${selectedTeamResumeState.failedAgentIds.length ? ' has-failure' : ''}`}
                        role={selectedTeamResumeState.failedAgentIds.length ? 'alert' : 'status'}
                      >
                        {selectedTeamResumeState.agentIds.length ? (
                          <LoaderCircle aria-hidden="true" className="is-spinning" size={16} />
                        ) : (
                          <CircleAlert aria-hidden="true" size={16} />
                        )}
                        <span>
                          <strong>
                            {selectedTeamResumeState.agentIds.length
                              ? 'Resuming interrupted agents'
                              : 'Some agents need attention'}
                          </strong>
                          <small>
                            {selectedTeamResumeState.agentIds.length
                              ? `${selectedTeamResumeState.agentIds.length} ${selectedTeamResumeState.agentIds.length === 1 ? 'assignment is' : 'assignments are'} continuing from saved sub-chats.`
                              : ''}
                            {selectedTeamResumeState.failedAgentIds.length
                              ? ` ${selectedTeamResumeState.failedAgentIds.length} ${selectedTeamResumeState.failedAgentIds.length === 1 ? 'agent could' : 'agents could'} not be restarted.`
                              : ''}
                          </small>
                        </span>
                      </div>
                    ) : null}
                    <div className="codex-agent-team__list">
                      {status.agents.map((agent, index) => {
                        const expanded = expandedAgentId === agent.id;
                        const agentIsResuming = resumingAgentIds.has(agent.id);
                        const presentation = agentIsResuming
                          ? ({ label: 'Resuming', tone: 'working' } as const)
                          : agentStatusPresentation(agent.status);
                        const agentPanelId = `codex-agent-${agent.id}`;
                        return (
                          <article
                            className="codex-agent-card"
                            data-depth={agent.depth}
                            key={agent.id}
                          >
                            <Button
                              aria-controls={agentPanelId}
                              aria-expanded={expanded}
                              className="codex-agent-card__trigger"
                              onClick={() => setExpandedAgentId(expanded ? '' : agent.id)}
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
                                  {agent.nickname && agent.role ? (
                                    <small>{agent.nickname}</small>
                                  ) : null}
                                </span>
                                <small>{agent.task || 'Preparing an assigned task…'}</small>
                              </span>
                              <span className="codex-agent-card__meta">
                                <strong>{presentation.label}</strong>
                                <small>
                                  {agent.working
                                    ? elapsedTime(agent.workingStartedAt ?? agent.createdAt, clock)
                                    : 'View chat'}
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
                                <div className="codex-agent-card__assignment">
                                  <GitBranch aria-hidden="true" size={14} />
                                  <span>
                                    <strong>Assignment</strong>
                                    <small>{agent.task || 'Waiting for the supervisor.'}</small>
                                  </span>
                                </div>
                                {agent.messages.length ? (
                                  <div
                                    aria-label={`${agentName(agent, index)} sub-chat`}
                                    className="codex-agent-card__messages"
                                  >
                                    {agent.messages.map((message) => (
                                      <div
                                        className={`codex-agent-card__message codex-agent-card__message--${message.role}`}
                                        key={message.id}
                                      >
                                        <strong>
                                          {message.role === 'user'
                                            ? 'Supervisor'
                                            : agentName(agent, index)}
                                        </strong>
                                        <MarkdownContent>{message.text}</MarkdownContent>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="codex-agent-card__empty">
                                    The sub-chat is starting.
                                  </p>
                                )}
                              </div>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ) : null}
                {isInterrupted && !isCodexWorking ? (
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
                        isResumingThread || isTeamResumePending || !selectedModel || !selectedEffort
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
                {(isCodexWorking && !status?.agents?.length) || queuedCount ? (
                  <div className="codex-working-status">
                    <span className="sr-only" role="status">
                      {isCodexWorking
                        ? 'Codex is working on the selected conversation.'
                        : `Codex has ${queuedCount} queued ${queuedCount === 1 ? 'request' : 'requests'}.`}
                    </span>
                    <span aria-hidden="true" className="codex-working-status__icon">
                      {isCodexWorking ? (
                        <LoaderCircle className="is-spinning" size={17} />
                      ) : (
                        <Clock3 size={17} />
                      )}
                    </span>
                    <span className="codex-working-status__copy">
                      <strong>{isCodexWorking ? workingTitle : 'Waiting for Codex'}</strong>
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
              </div>
              {!isChatFollowingLatest ? (
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
              aria-label="Message composer"
              className={`codex-composer-surface ${isComposerExpanded ? 'is-expanded' : 'is-collapsed'}`}
            >
              {draftAttachments.length ? (
                <div aria-label="Selected images" className="codex-composer-draft-attachments">
                  {draftAttachments.map((attachment) => (
                    <figure key={attachment.id}>
                      <img alt={`Selected image: ${attachment.name}`} src={attachment.source} />
                      <figcaption title={attachment.name}>{attachment.name}</figcaption>
                      <IconButton
                        disabled={phase === 'sending-chat'}
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
                  disabled={phase === 'sending-chat'}
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
                    phase === 'sending-chat' || isPreparingPhoto || !selectedModel?.supportsImages
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
                    phase === 'sending-chat' || isPreparingPhoto || !selectedModel?.supportsImages
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
                  label="Chat settings"
                  onClick={() => setComposerSettingsOpen((open) => !open)}
                  variant="quiet"
                >
                  <SlidersHorizontal aria-hidden="true" size={18} />
                </IconButton>
                <IconButton
                  label={
                    phase === 'sending-chat'
                      ? 'Sending message'
                      : isCodexWorking
                        ? 'Queue message'
                        : 'Send message'
                  }
                  disabled={
                    phase === 'sending-chat' ||
                    isPreparingPhoto ||
                    !status?.thread ||
                    !selectedModel ||
                    !prompt.trim()
                  }
                  onClick={() => void sendFeedback()}
                  variant="primary"
                >
                  {phase === 'sending-chat' ? (
                    <LoaderCircle aria-hidden="true" className="is-spinning" size={18} />
                  ) : (
                    <Send aria-hidden="true" size={18} />
                  )}
                </IconButton>
              </div>

              {error ? (
                <p className="codex-feedback-error" role="alert">
                  <CircleAlert aria-hidden="true" size={18} />
                  {error}
                </p>
              ) : null}

              {composerSettingsOpen ? (
                <div
                  aria-label="Chat settings"
                  className="codex-composer-settings"
                  id="codex-composer-settings"
                  role="group"
                >
                  <Button
                    aria-pressed={workMode === 'team'}
                    className={`codex-agent-mode${workMode === 'team' ? ' is-active' : ''}`}
                    disabled={phase === 'sending-chat'}
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
                  <Button
                    aria-pressed={selectedServiceTier === 'priority'}
                    className={`codex-agent-mode${selectedServiceTier === 'priority' ? ' is-active' : ''}`}
                    disabled={phase === 'sending-chat' || !fastModeAvailable}
                    onClick={() => setFastMode((current) => !current)}
                    variant="quiet"
                  >
                    <Clock3 aria-hidden="true" size={17} />
                    <span className="codex-agent-mode__copy">
                      <strong>Fast</strong>
                      <small>
                        {fastModeAvailable
                          ? 'Higher-speed Codex responses with increased usage'
                          : 'Unavailable for the selected model'}
                      </small>
                    </span>
                    <span aria-hidden="true" className="codex-agent-mode__state">
                      {selectedServiceTier === 'priority' ? 'On' : 'Off'}
                    </span>
                  </Button>
                  <footer className="codex-composer-footer">
                    <div className="codex-chat-configuration">
                      <label className="codex-model-field">
                        <span>Model</span>
                        <select
                          disabled={!status?.thread}
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
                              {model.supportsImages ? '' : ' · text only'}
                            </option>
                          ))}
                        </select>
                      </label>

                      {selectedModel?.efforts.length ? (
                        <label className="codex-effort-field">
                          <span>Reasoning</span>
                          <select
                            onChange={(event) => chooseEffort(selectedModel.id, event.target.value)}
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
    </>
  );
}
