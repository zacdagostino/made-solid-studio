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
  Square,
  X,
} from 'lucide-react';
import { captureVisiblePage, warmMobileScreenCapture } from '../lib/mobile-screen-capture';
import {
  useCallback,
  useEffect,
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
    phase?: string;
    attachmentId?: string;
    feedbackId?: string;
  }>;
  models: CodexModel[];
  queuedCount: number;
  interruptingCount?: number;
  queuedMessages?: Array<{
    id: string;
    prompt: string;
    model: string;
    effort: string;
    deliveryMode: 'queue' | 'interrupt';
    createdAt: string;
    position: number;
    attachmentId?: string;
  }>;
};

type PanelPhase =
  | 'closed'
  | 'compose'
  | 'sending-chat'
  | 'capturing'
  | 'capturing-tab'
  | 'selecting'
  | 'review'
  | 'sending';
type Point = { x: number; y: number };
type Selection = { start: Point; end: Point };

const statusEndpoint = '/__made-solid/codex-status';
const feedbackEndpoint = '/__made-solid/codex-feedback';
const localPageCaptureEndpoint = '/__made-solid/page-screenshot';
const codexAttachmentPrefix = '/__made-solid/codex-attachment/';
const browserCaptureSource = 'made-solid-browser-capture';
const codexPreferencesKey = 'made-solid-codex-preferences-v1';
const codexDraftKey = 'made-solid-codex-draft-v1';
const maximumPhotoBytes = 15 * 1024 * 1024;
const supportedPhotoTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

type CodexPreferences = {
  modelId: string;
  effortByModel: Record<string, string>;
};

function readCodexPreferences(): CodexPreferences {
  if (typeof window === 'undefined') return { modelId: '', effortByModel: {} };
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
    };
  } catch {
    return { modelId: '', effortByModel: {} };
  }
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
  await new Promise<void>((resolveCompositor) => window.setTimeout(resolveCompositor, 120));
}

export function CodexFeedbackPanel({ embedded = false }: { embedded?: boolean }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const conversationTriggerRef = useRef<HTMLButtonElement>(null);
  const conversationPickerRef = useRef<HTMLDivElement>(null);
  const previousWorkingRef = useRef(false);
  const chatLogRef = useRef<HTMLDivElement>(null);
  const previousChatScrollTopRef = useRef(0);
  const composerTextareaRef = useRef<HTMLTextAreaElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const chatFollowingLatestRef = useRef(true);
  const selectionImageRef = useRef<HTMLImageElement>(null);
  const selectionPointerRef = useRef<{ pointerId: number; start: Point }>();
  const [isSupported, setIsSupported] = useState<boolean>();
  const [phase, setPhase] = useState<PanelPhase>('closed');
  const [status, setStatus] = useState<CodexStatus>();
  const [selectedModelId, setSelectedModelId] = useState(() => readCodexPreferences().modelId);
  const [selectedEffort, setSelectedEffort] = useState(() => {
    const preferences = readCodexPreferences();
    return preferences.effortByModel[preferences.modelId] || '';
  });
  const [effortPreferences, setEffortPreferences] = useState(
    () => readCodexPreferences().effortByModel,
  );
  const [selectedThreadId, setSelectedThreadId] = useState('');
  const [conversationPickerOpen, setConversationPickerOpen] = useState(false);
  const selectedThreadIdRef = useRef('');
  const [sourceScreenshot, setSourceScreenshot] = useState('');
  const [croppedScreenshot, setCroppedScreenshot] = useState('');
  const [selection, setSelection] = useState<Selection>();
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
    image: string;
  }>();
  const [expandedQueueId, setExpandedQueueId] = useState('');
  const [queuedEdits, setQueuedEdits] = useState<Record<string, string>>({});
  const [queueActionId, setQueueActionId] = useState('');
  const [queueActionError, setQueueActionError] = useState('');
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [isResumingThread, setIsResumingThread] = useState(false);
  const [workspaceCaptureContext, setWorkspaceCaptureContext] = useState<WorkspaceCaptureContext>();
  const [captureDetail, setCaptureDetail] = useState('');
  const [isChatFollowingLatest, setIsChatFollowingLatest] = useState(true);
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const [isPreparingPhoto, setIsPreparingPhoto] = useState(false);

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
      updateChatFollowingLatest(true);
    },
    [updateChatFollowingLatest],
  );

  const refreshStatus = useCallback(
    async (threadIdOverride?: string) => {
      const requestedThreadId = threadIdOverride ?? selectedThreadIdRef.current;
      try {
        const query = requestedThreadId ? `?threadId=${encodeURIComponent(requestedThreadId)}` : '';
        const response = await fetch(`${statusEndpoint}${query}`, {
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

  const isCodexWorking = status?.thread?.working === true;
  const anyConversationWorking = status?.threads.some((thread) => thread.working) === true;
  const queuedCount = status?.queuedCount ?? 0;
  const interruptingCount = status?.interruptingCount ?? 0;
  const activeFlags = status?.thread?.activeFlags ?? [];
  const workingDetail = interruptingCount
    ? `Stopping current turn · ${interruptingCount} ${interruptingCount === 1 ? 'message' : 'messages'} next`
    : activeFlags.includes('waitingOnApproval')
      ? 'Waiting for an approval'
      : activeFlags.includes('waitingOnUserInput')
        ? 'Waiting for your input'
        : 'Working on your request';

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
      } satisfies CodexPreferences),
    );
  }, [effortPreferences, selectedEffort, selectedModelId]);

  const discardEmptyConversation = async (threadId: string) => {
    const candidate = status?.threads.find((thread) => thread.id === threadId);
    if (!threadId || !candidate?.discardable) return;
    try {
      const response = await fetch(feedbackEndpoint, {
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
      const response = await fetch(feedbackEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          action: 'new-thread',
          model: selectedModel.id,
          effort: selectedEffort,
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
    if (!selectedThread?.id || !selectedModel || !selectedEffort || isResumingThread) return;
    setIsResumingThread(true);
    setError(undefined);
    try {
      const response = await fetch(feedbackEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          action: 'continue-interrupted-thread',
          threadId: selectedThread.id,
          model: selectedModel.id,
          effort: selectedEffort,
        }),
      });
      const result = (await response.json()) as { detail?: string };
      if (!response.ok) {
        throw new Error(result.detail || 'The interrupted conversation could not be resumed.');
      }
      await refreshStatus(selectedThread.id);
      scrollChatToLatest();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'The interrupted conversation could not be resumed.',
      );
    } finally {
      setIsResumingThread(false);
    }
  };

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
      const response = await fetch(localPageCaptureEndpoint, {
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

  const choosePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    setIsPreparingPhoto(true);
    setError(undefined);
    try {
      const photo = await readPhotoFile(file);
      setCroppedScreenshot(photo);
      setSelection(undefined);
      setPhase('review');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The selected photo could not be read.');
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
    setCroppedScreenshot(canvas.toDataURL('image/png'));
    setPhase('review');
    setError(undefined);
  };

  const useWholeScreenshot = () => {
    if (!sourceScreenshot.startsWith('data:image/')) {
      setError('Capture the page before choosing the whole screenshot.');
      return;
    }
    setCroppedScreenshot(sourceScreenshot);
    setSelection(undefined);
    setPhase('review');
    setError(undefined);
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
      const response = await fetch(feedbackEndpoint, {
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

  const sendFeedback = async (kind: 'chat' | 'visual') => {
    if (!prompt.trim()) {
      setError('Describe what Codex should change or investigate.');
      return;
    }
    if (!selectedModel || !selectedEffort) {
      setError('Choose an available Codex model and reasoning level.');
      return;
    }
    const submittedPrompt = prompt.trim();
    setPhase(kind === 'visual' ? 'sending' : 'sending-chat');
    setError(undefined);
    try {
      const response = await fetch(feedbackEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          screenshot: kind === 'visual' ? croppedScreenshot : undefined,
          prompt: submittedPrompt,
          model: selectedModel.id,
          effort: selectedEffort,
          context: `${document.title} · ${window.location.href}`,
          threadId: selectedThreadId || status?.thread?.id,
        }),
      });
      const result = (await response.json()) as { id?: string; detail?: string };
      if (!response.ok) throw new Error(result.detail || 'Codex could not accept this feedback.');
      if (kind === 'chat') {
        setPendingChatMessage({
          id: result.id || crypto.randomUUID(),
          text: submittedPrompt,
        });
        setPrompt('');
        setIsComposerExpanded(false);
        setPhase('compose');
      } else {
        setPendingVisualMessage({
          id: result.id || crypto.randomUUID(),
          text: submittedPrompt,
          image: croppedScreenshot,
        });
        setPrompt('');
        setIsComposerExpanded(false);
        setCroppedScreenshot('');
        setPhase('compose');
      }
      await refreshStatus();
    } catch (cause) {
      setPhase(kind === 'visual' ? 'review' : 'compose');
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
              if (!conversationPickerOpen) return;
              event.preventDefault();
              setConversationPickerOpen(false);
              window.requestAnimationFrame(() => conversationTriggerRef.current?.focus());
            }}
          >
            <header className="codex-feedback-dialog__header">
              <div className="codex-feedback-dialog__identity">
                <span className="codex-feedback-dialog__icon" aria-hidden="true">
                  <Bot size={20} />
                </span>
                <div>
                  <Dialog.Title>Codex</Dialog.Title>
                  <div className="codex-feedback-dialog__status">
                    <span
                      aria-hidden="true"
                      className={status?.status === 'ready' ? 'is-ready' : ''}
                    />
                    <span>{status?.thread ? 'Connected to tmux' : 'Waiting for tmux'}</span>
                    <StatusBadge tone={status?.thread ? 'success' : 'warning'}>
                      {status?.thread?.working
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
              Chat with the selected tmux Codex conversation and optionally attach a photo or
              screenshot.
            </Dialog.Description>

            <div className="codex-thread-field">
              <div className="codex-thread-field__header">
                <label htmlFor="codex-conversation">Conversation</label>
                <Button
                  disabled={!status?.thread || !selectedModel || isCreatingThread}
                  onClick={() => void createConversation()}
                  size="small"
                  variant="quiet"
                >
                  {isCreatingThread ? (
                    <LoaderCircle aria-hidden="true" className="is-spinning" size={14} />
                  ) : (
                    <Plus aria-hidden="true" size={14} />
                  )}
                  New chat
                </Button>
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
                      <article
                        className={`codex-chat-message codex-chat-message--${message.role}`}
                        key={message.id}
                      >
                        <strong>{message.role === 'user' ? 'You' : 'Codex'}</strong>
                        <MarkdownContent>{message.text}</MarkdownContent>
                        {message.attachmentId ? (
                          <img
                            alt="Image attached to your message"
                            className="codex-chat-message__attachment"
                            src={`${codexAttachmentPrefix}${message.attachmentId}`}
                          />
                        ) : null}
                      </article>
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
                            : `Queued · ${message.position}`}
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
                      {message.attachmentId ? (
                        <img
                          alt="Image attached to your queued message"
                          className="codex-chat-message__attachment"
                          src={`${codexAttachmentPrefix}${message.attachmentId}`}
                        />
                      ) : null}
                      {queueActionError && expandedQueueId === message.id ? (
                        <p className="codex-queued-message__error" role="alert">
                          {queueActionError}
                        </p>
                      ) : null}
                    </article>
                  );
                })}
                {pendingChatMessage && !pendingChatAccepted ? (
                  <article className="codex-chat-message codex-chat-message--user codex-chat-message--pending">
                    <strong>
                      You <span>Sending</span>
                    </strong>
                    <MarkdownContent>{pendingChatMessage.text}</MarkdownContent>
                  </article>
                ) : null}
                {pendingVisualMessage && !pendingVisualAccepted ? (
                  <article className="codex-chat-message codex-chat-message--user codex-chat-message--pending">
                    <strong>
                      You <span>Sending</span>
                    </strong>
                    <MarkdownContent>{pendingVisualMessage.text}</MarkdownContent>
                    <img
                      alt="Image attached to your message"
                      className="codex-chat-message__attachment"
                      src={pendingVisualMessage.image}
                    />
                  </article>
                ) : null}
                {isInterrupted && !isCodexWorking ? (
                  <div className="codex-interrupted-status" role="status">
                    <span aria-hidden="true" className="codex-working-status__icon">
                      <CircleAlert size={17} />
                    </span>
                    <span className="codex-working-status__copy">
                      <strong>Work was interrupted</strong>
                      <small>
                        The Codespace paused before Codex finished. The saved transcript and edits
                        are still available.
                      </small>
                    </span>
                    <Button
                      disabled={isResumingThread || !selectedModel || !selectedEffort}
                      onClick={() => void continueInterruptedConversation()}
                      size="small"
                      variant="secondary"
                    >
                      {isResumingThread ? (
                        <LoaderCircle aria-hidden="true" className="is-spinning" size={15} />
                      ) : (
                        <RotateCcw aria-hidden="true" size={15} />
                      )}
                      {isResumingThread ? 'Resuming…' : 'Continue'}
                    </Button>
                  </div>
                ) : null}
                {isCodexWorking || queuedCount ? (
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
                      <strong>{isCodexWorking ? 'Codex is working' : 'Waiting for Codex'}</strong>
                      <small>
                        {isCodexWorking
                          ? interruptingCount
                            ? workingDetail
                            : queuedCount
                              ? `${queuedCount} ${queuedCount === 1 ? 'request' : 'requests'} queued next`
                              : workingDetail
                          : `${queuedCount} ${queuedCount === 1 ? 'request' : 'requests'} queued`}
                      </small>
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
              <label className="codex-feedback-prompt codex-feedback-prompt--compose">
                <span>Message to Codex</span>
                <textarea
                  disabled={phase === 'sending-chat'}
                  maxLength={4_000}
                  onChange={(event) => setPrompt(event.target.value)}
                  onBlur={() => {
                    if (!prompt.trim() || !chatFollowingLatestRef.current)
                      setIsComposerExpanded(false);
                  }}
                  onFocus={() => setIsComposerExpanded(true)}
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
                  onChange={(event) => void choosePhoto(event)}
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
                <span aria-live="polite">
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
                <small>{prompt.length.toLocaleString()} / 4,000</small>
              </div>

              {error ? (
                <p className="codex-feedback-error" role="alert">
                  <CircleAlert aria-hidden="true" size={18} />
                  {error}
                </p>
              ) : null}

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
                <IconButton
                  disabled={
                    phase === 'sending-chat' || !status?.thread || !selectedModel || !prompt.trim()
                  }
                  label={
                    phase === 'sending-chat'
                      ? 'Sending message'
                      : isCodexWorking
                        ? 'Queue message'
                        : 'Send message'
                  }
                  onClick={() => void sendFeedback('chat')}
                  variant="primary"
                >
                  {phase === 'sending-chat' ? (
                    <LoaderCircle aria-hidden="true" className="is-spinning" size={18} />
                  ) : (
                    <Send aria-hidden="true" size={18} />
                  )}
                </IconButton>
              </footer>
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
                Review selection
              </Button>
            </ButtonGroup>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        onOpenChange={(open) => !open && closePanel()}
        open={phase === 'review' || phase === 'sending'}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="codex-feedback-overlay" />
          <Dialog.Content
            aria-describedby="codex-review-description"
            className="codex-feedback-dialog codex-feedback-review"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              triggerRef.current?.focus();
            }}
          >
            <header className="codex-feedback-dialog__header">
              <div>
                <span className="codex-feedback-dialog__icon" aria-hidden="true">
                  <Camera size={20} />
                </span>
                <div>
                  <Dialog.Title>Review visual feedback</Dialog.Title>
                  <Dialog.Description id="codex-review-description">
                    Add a clear instruction, then send the image and prompt to your tmux
                    conversation.
                  </Dialog.Description>
                </div>
              </div>
              <Dialog.Close asChild>
                <IconButton
                  label="Close visual feedback"
                  disabled={phase === 'sending'}
                  variant="quiet"
                >
                  <X aria-hidden="true" size={18} />
                </IconButton>
              </Dialog.Close>
            </header>

            <img
              alt="Selected photo or screenshot that will be sent to Codex"
              className="codex-feedback-review__image"
              src={croppedScreenshot}
            />
            <label className="codex-feedback-prompt">
              <span>What should Codex change?</span>
              <textarea
                autoFocus
                disabled={phase === 'sending'}
                maxLength={4_000}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="For example: Fix this overlap across mobile, tablet, and desktop, then verify it with screenshots."
                rows={5}
                value={prompt}
              />
              <small>{prompt.length.toLocaleString()} / 4,000</small>
            </label>
            <div className="codex-feedback-review__configuration">
              <span>{selectedModel?.label}</span>
              <span>{selectedEffort} reasoning</span>
            </div>

            {error ? (
              <p className="codex-feedback-error" role="alert">
                <CircleAlert aria-hidden="true" size={18} />
                {error}
              </p>
            ) : null}

            <ButtonGroup className="codex-feedback-dialog__actions">
              <Button
                disabled={phase === 'sending'}
                onClick={() => setPhase('selecting')}
                variant="secondary"
              >
                <RotateCcw aria-hidden="true" size={18} />
                Adjust selection
              </Button>
              <Button
                disabled={phase === 'sending' || !prompt.trim()}
                onClick={() => void sendFeedback('visual')}
              >
                {phase === 'sending' ? (
                  <LoaderCircle aria-hidden="true" className="is-spinning" size={18} />
                ) : (
                  <Send aria-hidden="true" size={18} />
                )}
                {phase === 'sending' ? 'Sending…' : 'Send to Codex'}
              </Button>
            </ButtonGroup>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
