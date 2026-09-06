import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const captureSvg = `data:image/svg+xml,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
    <rect width="1200" height="800" fill="#f3f3f3"/>
    <rect x="80" y="80" width="1040" height="90" rx="10" fill="#111111"/>
    <rect x="100" y="250" width="450" height="320" rx="16" fill="#ffffff" stroke="#d0d0d0"/>
    <rect x="650" y="250" width="450" height="320" rx="16" fill="#e7ff1f" stroke="#667300"/>
    <text x="120" y="315" font-family="sans-serif" font-size="34" fill="#111111">Website preview</text>
    <text x="680" y="315" font-family="sans-serif" font-size="28" fill="#111111">Selected issue</text>
  </svg>
`)}`;
const capturePng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+Xf5vAAAAAElFTkSuQmCC';

async function openChatSettings(composer) {
  const settings = composer.getByRole('button', { name: 'Chat settings' });
  if ((await settings.getAttribute('aria-expanded')) !== 'true') await settings.click();
  await expect(composer.getByRole('dialog', { name: 'Chat settings' })).toBeVisible();
}

async function openRunSettings(composer) {
  const settings = composer.getByRole('button', { name: 'Run setup' });
  if ((await settings.getAttribute('aria-expanded')) !== 'true') await settings.click();
  await expect(composer.getByRole('group', { name: 'Run setup' })).toBeVisible();
}

async function selectRenderedText(locator, selectedText) {
  await locator.evaluate((element, text) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let renderedText = '';
    let node = walker.nextNode();
    while (node) {
      textNodes.push({ node, start: renderedText.length, text: node.textContent ?? '' });
      renderedText += node.textContent ?? '';
      node = walker.nextNode();
    }
    const selectionStart = renderedText.indexOf(text);
    if (selectionStart < 0) throw new Error(`Could not select rendered text: ${text}`);
    const selectionEnd = selectionStart + text.length;
    const startNode = textNodes.find(
      (candidate) =>
        selectionStart >= candidate.start &&
        selectionStart <= candidate.start + candidate.text.length,
    );
    const endNode = textNodes.find(
      (candidate) =>
        selectionEnd >= candidate.start && selectionEnd <= candidate.start + candidate.text.length,
    );
    if (!startNode || !endNode) throw new Error(`Could not map rendered text: ${text}`);
    const range = document.createRange();
    range.setStart(startNode.node, selectionStart - startNode.start);
    range.setEnd(endNode.node, selectionEnd - endNode.start);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  }, selectedText);
}

async function enableGoogleSpeech(page, onSpeechRequest = () => {}) {
  await page.route('**/__made-solid/codex-speech', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          available: true,
          defaultVoice: 'en-AU-Chirp3-HD-Aoede',
          provider: 'Google Cloud Text-to-Speech',
          voices: [
            {
              id: 'en-AU-Chirp3-HD-Aoede',
              gender: 'Female',
              languageCode: 'en-AU',
              model: 'chirp3-hd',
              modelLabel: 'Chirp 3 HD',
              name: 'Aoede',
              qualityLabel: 'Recommended · most natural',
              qualityRank: 1,
            },
            {
              id: 'en-AU-Chirp3-HD-Leda',
              gender: 'Female',
              languageCode: 'en-AU',
              model: 'chirp3-hd',
              modelLabel: 'Chirp 3 HD',
              name: 'Leda',
              qualityLabel: 'Recommended · most natural',
              qualityRank: 1,
            },
            {
              id: 'en-US-Chirp3-HD-Charon',
              gender: 'Male',
              languageCode: 'en-US',
              model: 'chirp3-hd',
              modelLabel: 'Chirp 3 HD',
              name: 'Charon',
              qualityLabel: 'Recommended · most natural',
              qualityRank: 1,
            },
            {
              id: 'en-US-Standard-A',
              gender: 'Female',
              languageCode: 'en-US',
              model: 'standard',
              modelLabel: 'Standard',
              name: 'A',
              qualityLabel: 'Basic · lowest cost',
              qualityRank: 6,
            },
            {
              id: 'fr-FR-Neural2-A',
              gender: 'Female',
              languageCode: 'fr-FR',
              model: 'neural2',
              modelLabel: 'Neural2',
              name: 'A',
              qualityLabel: 'Good quality · lower cost',
              qualityRank: 3,
            },
          ],
        }),
      });
      return;
    }
    onSpeechRequest(route.request().postDataJSON());
    await route.fulfill({
      contentType: 'audio/mpeg',
      body: Buffer.from('deterministic mocked mp3 audio'),
    });
  });
}

async function showCompletedSpeechReply(page, text, id = 'speech-feature-reply') {
  await page.route('**/__made-solid/codex-status*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ready',
        detail: 'Connected to the local Codex conversation.',
        thread: { id: 'thread-speech-feature', name: 'Speech feature review', status: 'idle' },
        threads: [{ id: 'thread-speech-feature', name: 'Speech feature review', status: 'idle' }],
        messages: [{ id, role: 'assistant', phase: 'final_answer', text }],
        agents: [],
        queuedCount: 0,
        queuedMessages: [],
        models: [
          {
            id: 'gpt-5.6-sol',
            label: 'GPT-5.6-Sol',
            defaultEffort: 'medium',
            isDefault: true,
            supportsImages: true,
            efforts: [{ id: 'medium', description: 'Balanced reasoning' }],
            serviceTiers: [],
          },
        ],
      }),
    });
  });
}

function speechFeatureStatus(messages, { working = true } = {}) {
  return {
    status: 'ready',
    detail: 'Connected to the local Codex conversation.',
    thread: {
      id: 'thread-auto-speech',
      name: 'Automatic speech review',
      status: working ? 'active' : 'idle',
      working,
      activeTurnId: working ? 'turn-auto-speech' : undefined,
      activeFlags: working ? ['turn'] : [],
    },
    threads: [
      {
        id: 'thread-auto-speech',
        name: 'Automatic speech review',
        status: working ? 'active' : 'idle',
        working,
        activeFlags: working ? ['turn'] : [],
      },
    ],
    messages,
    agents: [],
    queuedCount: 0,
    queuedMessages: [],
    models: [
      {
        id: 'gpt-5.6-sol',
        label: 'GPT-5.6-Sol',
        defaultEffort: 'medium',
        isDefault: true,
        supportsImages: true,
        efforts: [{ id: 'medium', description: 'Balanced reasoning' }],
        serviceTiers: [],
      },
    ],
  };
}

async function showMutableSpeechConversation(page, currentStatus) {
  await page.route('**/__made-solid/codex-status*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(currentStatus()),
    });
  });
}

test.beforeEach(async ({ page }) => {
  let statusRequestCount = 0;
  let billingMode = 'chatgpt_subscription';
  let savedCodexPreferences = null;
  await page.addInitScript(
    ({ screenshot, tabScreenshot }) => {
      class MockSpeechSynthesisUtterance extends EventTarget {
        constructor(text = '') {
          super();
          this.text = text;
          this.lang = '';
          this.voice = null;
          this.volume = 1;
          this.rate = 1;
          this.pitch = 1;
          this.onend = null;
          this.onerror = null;
        }
      }
      const speechEvents = [];
      const audioEvents = [];
      let currentUtterance;
      const utterances = [];
      const speechSynthesis = {
        paused: false,
        pending: false,
        speaking: false,
        getVoices: () => [
          {
            default: true,
            lang: 'fr-FR',
            localService: true,
            name: 'Voix française par défaut',
            voiceURI: 'playwright-french-default',
          },
          {
            default: false,
            lang: 'en-AU',
            localService: true,
            name: 'Playwright device voice',
            voiceURI: 'playwright-device-voice',
          },
        ],
        speak(utterance) {
          utterances.push(utterance);
          currentUtterance = utterance;
          this.paused = false;
          this.pending = false;
          this.speaking = true;
          speechEvents.push({
            type: 'speak',
            text: utterance.text,
            lang: utterance.lang,
            voiceLang: utterance.voice?.lang ?? '',
            voiceName: utterance.voice?.name ?? '',
            rate: utterance.rate,
            utteranceIndex: utterances.length - 1,
          });
        },
        cancel() {
          currentUtterance = undefined;
          this.paused = false;
          this.pending = false;
          this.speaking = false;
          speechEvents.push({ type: 'cancel' });
        },
        pause() {
          this.paused = true;
          speechEvents.push({ type: 'pause' });
        },
        resume() {
          this.paused = false;
          speechEvents.push({ type: 'resume' });
        },
        addEventListener() {},
        removeEventListener() {},
      };
      Object.defineProperty(window, 'SpeechSynthesisUtterance', {
        configurable: true,
        value: MockSpeechSynthesisUtterance,
      });
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: speechSynthesis,
      });
      window.__speechHarness = {
        events: speechEvents,
        utteranceCount: () => utterances.length,
        currentText: () => currentUtterance?.text ?? '',
        finishUtterance: (index) => {
          const utterance = utterances[index];
          if (!utterance) return;
          if (currentUtterance === utterance) {
            currentUtterance = undefined;
            speechSynthesis.paused = false;
            speechSynthesis.speaking = false;
          }
          utterance.onend?.(new Event('end'));
          utterance.dispatchEvent(new Event('end'));
        },
      };
      window.__speechHarness.finishCurrent = () => {
        const index = utterances.indexOf(currentUtterance);
        window.__speechHarness.finishUtterance(index);
      };
      class MockAudio extends EventTarget {
        constructor(source = '') {
          super();
          this.src = source;
          this.currentTime = 0;
          this.duration = 12;
          this.preload = '';
          this.onended = null;
          this.onerror = null;
          this.ontimeupdate = null;
        }
        load() {
          window.__currentAudio = this;
          queueMicrotask(() => this.dispatchEvent(new Event('loadedmetadata')));
        }
        async play() {
          window.__currentAudio = this;
          audioEvents.push({ type: 'play', source: this.src, currentTime: this.currentTime });
        }
        pause() {
          audioEvents.push({ type: 'pause', source: this.src, currentTime: this.currentTime });
        }
        dispatchEvent(event) {
          const dispatched = super.dispatchEvent(event);
          this[`on${event.type}`]?.(event);
          return dispatched;
        }
      }
      Object.defineProperty(window, 'Audio', { configurable: true, value: MockAudio });
      window.__audioHarness = {
        events: audioEvents,
        advance(seconds) {
          if (!window.__currentAudio) return;
          window.__currentAudio.currentTime = seconds;
          window.__currentAudio.dispatchEvent(new Event('timeupdate'));
        },
        finish() {
          window.__currentAudio?.dispatchEvent(new Event('ended'));
        },
        currentTime: () => window.__currentAudio?.currentTime ?? 0,
      };
      window.addEventListener('message', (event) => {
        if (event.source !== window || event.data?.source !== 'made-solid-browser-capture') return;
        if (new URL(window.location.href).searchParams.has('noCaptureHelper')) return;
        if (event.data.type === 'ping') {
          window.postMessage(
            {
              source: 'made-solid-browser-capture',
              type: 'ping-result',
              requestId: event.data.requestId,
            },
            window.location.origin,
          );
        } else if (event.data.type === 'capture') {
          window.__captureDialogVisibleAtRequest = Boolean(
            document.querySelector('.codex-chat-dialog'),
          );
          window.postMessage(
            {
              source: 'made-solid-browser-capture',
              type: 'capture-result',
              requestId: event.data.requestId,
              screenshot: tabScreenshot,
            },
            window.location.origin,
          );
        }
      });
      const sharedCanvas = document.createElement('canvas');
      sharedCanvas.width = 1200;
      sharedCanvas.height = 800;
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          getDisplayMedia: async () => {
            window.__displayCaptureHadUserActivation = navigator.userActivation.isActive;
            return sharedCanvas.captureStream();
          },
        },
      });
      if (!new URL(window.location.href).searchParams.has('realCanvas')) {
        Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
          configurable: true,
          get: () => HTMLMediaElement.HAVE_METADATA,
        });
        Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
          configurable: true,
          get: () => 1200,
        });
        Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
          configurable: true,
          get: () => 800,
        });
        HTMLMediaElement.prototype.play = async () => {};
        HTMLCanvasElement.prototype.getContext = () => ({ drawImage() {} });
        HTMLCanvasElement.prototype.toDataURL = () => screenshot;
      }
    },
    { screenshot: captureSvg, tabScreenshot: capturePng },
  );
  await page.route('**/__made-solid/codex-speech', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          available: false,
          defaultVoice: 'en-AU-Chirp3-HD-Aoede',
          provider: 'Google Cloud Text-to-Speech',
          voices: [],
        }),
      });
      return;
    }
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'unavailable' }),
    });
  });
  await page.route('**/__made-solid/codex-preferences', async (route) => {
    if (route.request().method() === 'PUT') {
      savedCodexPreferences = route.request().postDataJSON().preferences;
    }
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        preferences: savedCodexPreferences,
        status: route.request().method() === 'PUT' ? 'saved' : 'ready',
      }),
    });
  });
  await page.route('**/__made-solid/ai-billing-mode', async (route) => {
    if (route.request().method() === 'POST') {
      billingMode = route.request().postDataJSON().mode;
    }
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        apiKeyConfigured: true,
        label: billingMode === 'api_credits' ? 'OpenAI API credits' : 'ChatGPT subscription',
        mode: billingMode,
      }),
    });
  });
  await page.route('**/__made-solid/codex-status*', async (route) => {
    statusRequestCount += 1;
    const selectedThreadId = new URL(route.request().url()).searchParams.get('threadId');
    const pageUrl = new URL(route.request().headers().referer || 'http://localhost');
    const outOfOrderStatus = pageUrl.searchParams.has('codexOutOfOrderStatus');
    const delayedWorkingStatus = outOfOrderStatus && statusRequestCount === 1;
    const noWorkingStart = pageUrl.searchParams.has('codexWorkingNoStart');
    const working = outOfOrderStatus
      ? delayedWorkingStatus
      : pageUrl.searchParams.has('codexWorking') || noWorkingStart;
    const interrupted = pageUrl.searchParams.has('codexInterrupted');
    const teamHistory = pageUrl.searchParams.has('codexTeamHistory');
    const directWorkingTurn = pageUrl.searchParams.has('codexDirectWorking');
    const incomingProgress = pageUrl.searchParams.has('codexIncoming');
    const incomingActivity = pageUrl.searchParams.has('codexIncomingActivity');
    const activityHistory = pageUrl.searchParams.has('codexActivityHistory');
    const evidenceNarrative = pageUrl.searchParams.has('codexEvidenceNarrative');
    const conciseTitles = pageUrl.searchParams.has('codexConciseTitles');
    const currentThreadPreview = conciseTitles
      ? "Ok sweet, can we have every chat's title in the chat drop down be a consise summary of the latest thing it's done or is doing so I can identify it at a glance?\n\nCaptured from: Made Solid Studio"
      : 'Open the Studio chat.\n\nCaptured from: Made Solid Studio';
    const currentUserMessage = conciseTitles
      ? "Ok sweet, can we have every chat's title in the chat drop down be a consise summary of the latest thing it's done or is doing so I can identify it at a glance?"
      : 'Open the Studio chat.';
    const historicalThreadPreview = conciseTitles
      ? 'Please review the complete Clientspace navigation because the old page labels are confusing.\n\nCaptured from: Made Solid Studio'
      : 'Review the earlier homepage.\n\nCaptured from: Made Solid Studio';
    const unreadableConversation =
      pageUrl.searchParams.has('codexUnreadableConversation') && selectedThreadId !== 'thread-2';
    const usageUnavailable = pageUrl.searchParams.has('codexUsageUnavailable');
    const twoUsageWindows = pageUrl.searchParams.has('codexTwoUsage');
    const workingSince = Math.floor(Date.now() / 1_000) - 65;
    const threadUpdatedAt = noWorkingStart
      ? Math.floor(Date.now() / 1_000) - 97 * 60 * 60
      : workingSince;
    if (delayedWorkingStatus) {
      await new Promise((resolve) => setTimeout(resolve, 6_000));
    }
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ready',
        detail: unreadableConversation
          ? 'The selected conversation is unavailable, but the other conversations remain accessible.'
          : 'Connected to the local Codex conversation.',
        threadIssue: unreadableConversation
          ? 'This conversation could not be loaded safely. Choose another chat or start a new one; the existing conversation has been preserved.'
          : undefined,
        account: { type: 'chatgpt', planType: 'plus' },
        billing: {
          apiKeyConfigured: true,
          label: billingMode === 'api_credits' ? 'OpenAI API credits' : 'ChatGPT subscription',
          mode: billingMode,
        },
        capabilities: pageUrl.searchParams.has('noStopCapability')
          ? undefined
          : { stopActiveTurn: true },
        subscriptionUsage: usageUnavailable
          ? undefined
          : {
              primary: {
                usedPercent: twoUsageWindows ? 42 : 51,
                windowDurationMins: twoUsageWindows ? 300 : 10_080,
                resetsAt: twoUsageWindows ? 1_787_339_400 : 1_787_823_574,
              },
              secondary: twoUsageWindows
                ? {
                    usedPercent: 18,
                    windowDurationMins: 10_080,
                    resetsAt: 1_787_827_574,
                  }
                : undefined,
            },
        thread:
          selectedThreadId === 'thread-2'
            ? {
                id: 'thread-2',
                name: 'Earlier website review',
                preview: historicalThreadPreview,
                status: 'idle',
                updatedAt: Math.floor(Date.now() / 1_000) - 3_700,
              }
            : {
                id: 'thread-1',
                name: 'Studio',
                preview: currentThreadPreview,
                status: working ? 'active' : 'idle',
                working,
                activeTurnId: working
                  ? directWorkingTurn
                    ? 'turn-direct-active'
                    : teamHistory
                      ? 'turn-team-3'
                      : 'turn-team-1'
                  : undefined,
                interrupted,
                lastTurnStatus: interrupted ? 'interrupted' : 'completed',
                activeFlags: working ? ['turn'] : [],
                updatedAt: working ? threadUpdatedAt : undefined,
                workingStartedAt: working && !noWorkingStart ? workingSince : undefined,
              },
        threads: [
          {
            id: 'thread-1',
            name: 'Studio',
            preview: currentThreadPreview,
            status: working ? 'active' : 'idle',
            working,
            interrupted,
            lastTurnStatus: interrupted ? 'interrupted' : 'completed',
            activeFlags: working ? ['turn'] : [],
            updatedAt: working ? threadUpdatedAt : undefined,
            workingStartedAt: working && !noWorkingStart ? workingSince : undefined,
          },
          {
            id: 'thread-2',
            name: 'Earlier website review',
            preview: historicalThreadPreview,
            status: 'idle',
            updatedAt: Math.floor(Date.now() / 1_000) - 3_700,
          },
        ],
        messages: unreadableConversation
          ? []
          : selectedThreadId === 'thread-2'
            ? [
                { id: 'old-user', role: 'user', text: 'Review the earlier homepage.' },
                { id: 'old-codex', role: 'assistant', text: 'The earlier review is complete.' },
              ]
            : [
                {
                  id: 'current-user',
                  role: 'user',
                  text: currentUserMessage,
                  turnId: 'turn-team-1',
                  position: 0,
                },
                ...(!incomingProgress || statusRequestCount > 2
                  ? [
                      {
                        id: 'current-codex',
                        role: 'assistant',
                        text: evidenceNarrative
                          ? 'I found the public services page, so I’m preserving its supported service structure while updating the interface.'
                          : 'Studio chat is connected.',
                        turnId: 'turn-team-1',
                        phase: working ? 'commentary' : 'final_answer',
                        position: 2,
                      },
                    ]
                  : []),
                ...(evidenceNarrative
                  ? [
                      {
                        id: 'current-codex-evidence',
                        role: 'assistant',
                        text: 'The implementation updates are saved and the checks completed, so I’m reviewing the responsive result next.',
                        turnId: 'turn-team-1',
                        phase: 'commentary',
                        position: 6,
                      },
                    ]
                  : []),
                ...(teamHistory
                  ? [
                      {
                        id: 'direct-user',
                        role: 'user',
                        text: 'Now make one direct copy change.',
                        turnId: 'turn-direct-2',
                        position: 10,
                      },
                      {
                        id: 'direct-codex',
                        role: 'assistant',
                        text: 'The direct copy change is complete.',
                        turnId: 'turn-direct-2',
                        position: 11,
                      },
                      {
                        id: 'second-team-user',
                        role: 'user',
                        text: 'Run a new agent team review.',
                        turnId: 'turn-team-3',
                        position: 12,
                      },
                      {
                        id: 'second-team-codex',
                        role: 'assistant',
                        text: 'The new team review is underway.',
                        turnId: 'turn-team-3',
                        position: 13,
                      },
                    ]
                  : []),
              ],
        activities:
          selectedThreadId !== 'thread-2' && (working || activityHistory)
            ? [
                {
                  id: 'activity-search',
                  kind: 'search',
                  label: 'Opening workspace.madesolid.com.au/services',
                  detail: 'Reviewing workspace.madesolid.com.au/services.',
                  status: 'completed',
                  outcome: 'workspace.madesolid.com.au/services was opened for inspection.',
                  turnId: 'turn-team-1',
                  position: 1,
                },
                {
                  id: 'activity-files',
                  kind: 'file',
                  label: 'Updated 2 files',
                  detail: 'src/components/CodexFeedbackPanel.tsx · src/styles.css',
                  status: 'completed',
                  outcome: '2 file changes were saved.',
                  turnId: 'turn-team-1',
                  position: 3,
                },
                {
                  id: 'activity-checks',
                  kind: 'command',
                  label: 'Running project checks',
                  detail: 'Workspace: siteforge-os',
                  status: 'completed',
                  outcome: 'Project checks completed successfully.',
                  durationMs: 4_280,
                  turnId: 'turn-team-1',
                  position: 4,
                },
                ...(!incomingActivity || statusRequestCount > 2
                  ? [
                      {
                        id: 'activity-browser',
                        kind: 'tool',
                        label: 'Using browser checks',
                        detail: 'Reviewing the required responsive viewports.',
                        status: working ? 'running' : 'completed',
                        outcome: working
                          ? 'The browser review is still running.'
                          : 'The browser review completed.',
                        turnId: 'turn-team-1',
                        position: 5,
                      },
                    ]
                  : []),
              ]
            : [],
        agents: pageUrl.searchParams.has('codexAgents')
          ? [
              {
                id: 'agent-responsive',
                parentThreadId: 'thread-1',
                supervisorTurnId: 'turn-team-1',
                nickname: 'Lime',
                role: 'responsive reviewer',
                task: 'Verify the agent team interface at mobile, tablet, and desktop widths.',
                status: interrupted ? 'interrupted' : 'running',
                working: !interrupted,
                depth: 0,
                createdAt: workingSince - 10,
                workingStartedAt: workingSince,
                messages: [
                  {
                    id: 'agent-responsive-update',
                    role: 'assistant',
                    text: 'Mobile checks are complete. I am reviewing tablet and desktop now.',
                  },
                ],
              },
              {
                id: 'agent-accessibility',
                parentThreadId: 'thread-1',
                supervisorTurnId: teamHistory ? 'turn-team-3' : 'turn-team-1',
                nickname: 'Oak',
                role: 'accessibility reviewer',
                task: 'Test keyboard navigation, focus visibility, and accessible status updates.',
                status: 'completed',
                working: false,
                depth: 0,
                createdAt: workingSince - 24,
                updatedAt: workingSince - 2,
                messages: [
                  {
                    id: 'agent-accessibility-result',
                    role: 'assistant',
                    text: 'The agent cards and work-mode control have clear names and focus states.',
                  },
                ],
              },
            ]
          : [],
        queuedCount: working ? 2 : 0,
        queuedMessages: working
          ? [
              {
                id: '11111111-1111-4111-8111-111111111111',
                prompt: 'Keep the navigation stable while scrolling.',
                model: 'gpt-5.6-sol',
                effort: 'medium',
                deliveryMode: 'queue',
                createdAt: new Date().toISOString(),
                position: 1,
              },
              {
                id: '22222222-2222-4222-8222-222222222222',
                prompt: 'Check the hero spacing at desktop width.',
                model: 'gpt-5.6-sol',
                effort: 'medium',
                deliveryMode: 'queue',
                createdAt: new Date().toISOString(),
                position: 2,
              },
            ]
          : [],
        models: [
          {
            id: 'gpt-5.6-sol',
            label: 'GPT-5.6-Sol',
            defaultEffort: 'medium',
            isDefault: true,
            supportsImages: true,
            serviceTiers: [
              { id: 'priority', name: 'Fast', description: '1.5x speed, increased usage' },
            ],
            defaultServiceTier: 'default',
            efforts: [
              { id: 'low', description: 'Faster responses with lighter reasoning' },
              { id: 'medium', description: 'Balanced reasoning' },
            ],
          },
          {
            id: 'gpt-5.6-terra',
            label: 'GPT-5.6-Terra',
            defaultEffort: 'medium',
            isDefault: false,
            supportsImages: true,
            serviceTiers: [
              { id: 'priority', name: 'Fast', description: '1.5x speed, increased usage' },
            ],
            defaultServiceTier: 'default',
            efforts: [
              { id: 'medium', description: 'Balanced reasoning' },
              { id: 'high', description: 'Deeper reasoning for complex changes' },
            ],
          },
          {
            id: 'gpt-6-astra',
            label: 'GPT-6 Astra',
            defaultEffort: 'medium',
            isDefault: false,
            supportsImages: true,
            serviceTiers: [
              { id: 'priority', name: 'Fast', description: '2x speed, increased usage' },
            ],
            defaultServiceTier: 'default',
            efforts: [
              { id: 'low', description: 'Faster responses with lighter reasoning' },
              { id: 'medium', description: 'Balanced reasoning' },
              { id: 'high', description: 'Greater reasoning depth' },
              { id: 'xhigh', description: 'Extra-high reasoning depth' },
              { id: 'max', description: 'Maximum reasoning depth' },
            ],
          },
          {
            id: 'gpt-5.6-luna',
            label: 'GPT-5.6-Luna',
            defaultEffort: 'medium',
            isDefault: false,
            supportsImages: true,
            efforts: [{ id: 'medium', description: 'Balanced reasoning' }],
          },
          {
            id: 'gpt-5.5',
            label: 'GPT-5.5',
            defaultEffort: 'medium',
            isDefault: false,
            supportsImages: true,
            efforts: [{ id: 'medium', description: 'Balanced reasoning' }],
          },
          {
            id: 'gpt-5.4',
            label: 'GPT-5.4',
            defaultEffort: 'medium',
            isDefault: false,
            supportsImages: true,
            efforts: [{ id: 'medium', description: 'Balanced reasoning' }],
          },
          {
            id: 'gpt-5.4-mini',
            label: 'GPT-5.4-Mini',
            defaultEffort: 'medium',
            isDefault: false,
            supportsImages: true,
            efforts: [{ id: 'medium', description: 'Balanced reasoning' }],
          },
          {
            id: 'gpt-5.3-codex-spark',
            label: 'GPT-5.3-Codex-Spark',
            defaultEffort: 'high',
            isDefault: false,
            supportsImages: false,
            efforts: [{ id: 'high', description: 'Fast text-only reasoning' }],
          },
        ],
      }),
    });
  });
});

test('keeps the Codex launcher visible while its initial status reconnects', async ({ page }) => {
  let releaseStatus;
  const statusGate = new Promise((resolve) => {
    releaseStatus = resolve;
  });
  await page.route('**/__made-solid/codex-status*', async (route) => {
    await statusGate;
    await route.fallback();
  });

  await page.goto('/#/prospects');
  const launcher = page.getByRole('button', { name: 'Connecting to Codex' });
  await expect(launcher).toBeVisible();
  await expect(launcher).toHaveAttribute('aria-busy', 'true');

  releaseStatus();
  await expect(page.getByRole('button', { name: 'Chat with Codex' })).toBeVisible();
});

test('replaces a failed initial Codex status spinner with a recoverable chat state', async ({
  page,
}) => {
  await page.route('**/__made-solid/codex-status*', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'unavailable',
        detail: 'Codex is reconnecting after Chrome resumed this tab.',
      }),
    });
  });

  await page.goto('/#/prospects');
  const launcher = page.getByRole('button', { name: 'Chat with Codex' });
  await expect(launcher).toBeVisible();
  await expect(launcher).toHaveAttribute('aria-busy', 'false');
  await launcher.click();
  await expect(page.getByRole('dialog', { name: 'Codex', exact: true })).toContainText(
    'Codex is reconnecting after Chrome resumed this tab.',
  );
});

test('resynchronizes a remembered open website chat after its iframe loads', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'made-solid-codex-chat-session-v1',
      JSON.stringify({ isOpen: true }),
    );
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Close Codex chat' }).click();
  await page.evaluate(() => {
    window.localStorage.setItem(
      'made-solid-codex-chat-session-v1',
      JSON.stringify({ isOpen: true }),
    );
  });
  await page.setContent(`
    <main style="min-height:100dvh;background:#e7ff1f">
      <h1>Made Solid website</h1>
    </main>
    <iframe
      aria-label="Made Solid Codex chat"
      id="made-solid-codex-panel"
      src="/#/codex-panel"
      style="border:0;bottom:0;height:68px;position:fixed;right:0;width:68px"
    ></iframe>
    <script>
      (() => {
        const frame = document.getElementById('made-solid-codex-panel');
        window.addEventListener('message', (event) => {
          if (
            event.origin !== window.location.origin ||
            event.source !== frame.contentWindow ||
            event.data?.source !== 'made-solid-codex-panel'
          ) return;
          const open = event.data.open === true;
          frame.style.width = open ? 'min(444px, 100vw)' : '68px';
          frame.style.height = open ? 'min(744px, 100dvh)' : '68px';
        });
        frame.addEventListener('load', () => {
          frame.contentWindow.postMessage(
            {
              action: 'synchronize',
              source: 'made-solid-codex-host',
              title: document.title,
              url: window.location.href,
              viewportHeight: window.innerHeight,
              viewportWidth: window.innerWidth,
            },
            window.location.origin,
          );
        });
      })();
    </script>
  `);

  const frame = page.locator('#made-solid-codex-panel');
  const expectedWidth = Math.min(444, page.viewportSize().width);
  const expectedHeight = Math.min(744, page.viewportSize().height);
  await expect
    .poll(async () => {
      const box = await frame.boundingBox();
      return box ? { height: box.height, width: box.width } : null;
    })
    .toEqual({ height: expectedHeight, width: expectedWidth });
  await expect(
    page.frameLocator('#made-solid-codex-panel').getByRole('dialog', { name: 'Codex' }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  await expect(page).toHaveScreenshot('codex-website-restored-embed.png', {
    animations: 'disabled',
  });

  const embeddedPanel = page.frameLocator('#made-solid-codex-panel');
  await embeddedPanel.getByRole('button', { name: 'Close Codex chat' }).click();
  await expect
    .poll(async () => {
      const box = await frame.boundingBox();
      return box ? { height: box.height, width: box.width } : null;
    })
    .toEqual({ height: 68, width: 68 });
  await expect(frame).toHaveScreenshot('codex-website-closed-embed.png', {
    animations: 'disabled',
  });
  await embeddedPanel.getByRole('button', { name: 'Chat with Codex' }).click();
  await expect(embeddedPanel.getByRole('dialog', { name: 'Codex' })).toBeVisible();

  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 568 });
    await expect
      .poll(async () => {
        const box = await frame.boundingBox();
        return box ? { height: box.height, width: box.width } : null;
      })
      .toEqual({ height: 568, width: 320 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    await expect(page).toHaveScreenshot('codex-website-restored-embed-320.png', {
      animations: 'disabled',
    });
  }
});

test('provides Codex chat as a dedicated responsive Studio page', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/codex');

  await expect(page).toHaveURL(/#\/codex$/);
  if (testInfo.project.name !== 'desktop') {
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
  }
  await expect(page.getByRole('button', { name: 'Codex chat', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  if (testInfo.project.name !== 'desktop') {
    await page.getByRole('button', { name: 'Close navigation menu' }).click();
  }
  const chat = page.getByRole('dialog', { name: 'Codex', exact: true });
  await expect(chat).toBeVisible();
  await expect(chat).toContainText('Studio chat is connected.');
  await expect(page.locator('.codex-feedback-trigger')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const accessibility = await new AxeBuilder({ page }).include('.codex-chat-dialog').analyze();
  expect(accessibility.violations).toEqual([]);
  await expect(page).toHaveScreenshot('codex-chat-page.png', { animations: 'disabled' });

  await page.reload();
  await expect(page).toHaveURL(/#\/codex$/);
  await expect(page.getByRole('dialog', { name: 'Codex', exact: true })).toBeVisible();

  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 568 });
    await expect(page.getByRole('dialog', { name: 'Codex', exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expect(page).toHaveScreenshot('codex-chat-page-compact-mobile.png', {
      animations: 'disabled',
    });
  }
});

test('keeps an open Codex popup and draft through a Studio source update', async ({ page }) => {
  await page.goto('/#/prospects');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const chat = page.getByRole('dialog', { name: 'Codex', exact: true });
  const input = chat.getByLabel('Message to Codex');
  await input.fill('Keep this draft open while Studio updates.');

  await page.evaluate(() => document.dispatchEvent(new Event('made-solid:studio-update-started')));
  await expect(page.getByLabel('Updating Studio')).toBeVisible();
  await expect(chat).toBeVisible();
  await expect(input).toHaveValue('Keep this draft open while Studio updates.');
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('made-solid-codex-chat-session-v1') || '{}').isOpen,
      ),
    )
    .toBe(true);

  await page.evaluate(() => document.dispatchEvent(new Event('made-solid:studio-update-finished')));
  await expect(page.getByLabel('Updating Studio')).toBeHidden();
  await expect(chat).toBeVisible();
  await expect(input).toHaveValue('Keep this draft open while Studio updates.');
});

test('sends a text-only chat message to the selected Codex model', async ({ page }) => {
  let delivered;
  let releaseDelivery;
  const deliveryGate = new Promise((resolve) => {
    releaseDelivery = resolve;
  });
  await page.route('**/__made-solid/codex-feedback', async (route) => {
    delivered = route.request().postDataJSON();
    await deliveryGate;
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'queued',
        id: 'chat-1',
        detail: 'Your message is queued for the active Codex conversation.',
      }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await openRunSettings(composer);
  await composer.getByLabel('Model').selectOption('gpt-5.3-codex-spark');
  await expect(composer.getByRole('button', { name: 'Capture this tab' })).toBeDisabled();
  await expect(
    composer.getByRole('button', { name: 'Upload photo from camera roll' }),
  ).toBeDisabled();
  await expect(
    composer.getByRole('button', { name: 'Capture another tab or window' }),
  ).toBeDisabled();
  await composer
    .getByLabel('Message to Codex')
    .fill('Review the current implementation and explain the next best change.');
  await composer.getByRole('button', { name: 'Send message' }).click();

  await expect(composer).toBeVisible();
  await expect(composer.getByLabel('Message to Codex')).toHaveValue('');
  await expect(composer.getByRole('log', { name: 'Codex chat log' })).toContainText(
    'Review the current implementation and explain the next best change.',
  );
  await expect(composer.getByRole('log', { name: 'Codex chat log' })).toContainText('Sending');
  await expect(composer.locator('.codex-chat-message--pending')).toHaveCSS(
    'animation-name',
    'codex-message-from-composer',
  );
  releaseDelivery();
  await expect(page.getByRole('dialog', { name: 'Message queued' })).toHaveCount(0);
  expect(delivered.model).toBe('gpt-5.3-codex-spark');
  expect(delivered.effort).toBe('high');
  expect(delivered.serviceTier).toBe('default');
  expect(delivered.workMode).toBe('team');
  expect(delivered.prompt).toContain('Review the current implementation');
  expect(delivered).not.toHaveProperty('screenshot');
});

test('adds selected Codex output to the draft or sends the excerpt immediately', async ({
  page,
}) => {
  const delivered = [];
  const temporaryRequests = [];
  await page.route('**/__made-solid/codex-feedback', async (route) => {
    const request = route.request().postDataJSON();
    if (request.action === 'temporary-question') {
      temporaryRequests.push(request);
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'complete',
          answer: 'It confirms that the Studio connection is currently available.',
          model: 'GPT-5.6-Luna',
          detail: 'Temporary answer complete.',
        }),
      });
      return;
    }
    delivered.push(request);
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'queued', id: `excerpt-${delivered.length}` }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const chat = page.getByRole('dialog', { name: 'Codex', exact: true });
  await openChatSettings(chat);
  await chat.getByRole('checkbox', { name: 'Auto-read Codex' }).check();
  await chat.getByRole('button', { name: 'Close chat settings' }).click();
  const reply = chat.locator('.codex-chat-message--assistant', {
    hasText: 'Studio chat is connected.',
  });

  await selectRenderedText(reply.locator('.markdown-content'), 'Studio chat');
  const excerptActions = chat.getByLabel('Selected Codex excerpt');
  await expect(excerptActions).toBeVisible();
  await expect(excerptActions.getByText('Studio chat', { exact: true })).toBeVisible();
  expect(await chat.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  const [excerptBounds, actionButtonBounds] = await Promise.all([
    excerptActions.boundingBox(),
    excerptActions.locator('.codex-chat-excerpt-actions__buttons').boundingBox(),
  ]);
  expect(actionButtonBounds?.width).toBeGreaterThanOrEqual((excerptBounds?.width ?? 24) - 24);
  for (const actionName of [
    'Quick question',
    'Add to prompt',
    'Send now',
    'Dismiss selected excerpt',
  ]) {
    const bounds = await excerptActions.getByRole('button', { name: actionName }).boundingBox();
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
  }
  const accessibility = await new AxeBuilder({ page })
    .include('.codex-chat-excerpt-actions')
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await expect(chat).toHaveScreenshot('codex-selected-excerpt.png', { animations: 'disabled' });

  await excerptActions.getByRole('button', { name: 'Quick question' }).click();
  const quickQuestion = page.getByRole('dialog', { name: 'Quick question' });
  await expect(quickQuestion.getByLabel('What do you want to know?')).toBeFocused();
  await expect(quickQuestion).toHaveCSS('color-scheme', 'dark');
  await expect(quickQuestion).toHaveCSS('background-color', 'rgb(31, 31, 31)');
  await quickQuestion.getByLabel('What do you want to know?').fill('What does this confirm?');
  await quickQuestion.getByRole('button', { name: 'Ask quickly' }).press('Enter');
  await expect(quickQuestion.getByText('Quick answer')).toBeVisible();
  await expect(
    quickQuestion.getByText('It confirms that the Studio connection is currently available.'),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__speechHarness.currentText()))
    .toContain('Studio connection is currently available');
  await expect(quickQuestion.getByRole('button', { name: 'Pause reading' })).toBeVisible();
  expect(
    await quickQuestion.evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
  const quickQuestionAccessibility = await new AxeBuilder({ page })
    .include('.codex-quick-question-dialog')
    .analyze();
  expect(quickQuestionAccessibility.violations).toEqual([]);
  await expect(quickQuestion).toHaveScreenshot('codex-quick-question-answer.png', {
    animations: 'disabled',
  });
  expect(temporaryRequests).toHaveLength(1);
  expect(temporaryRequests[0]).toMatchObject({
    action: 'temporary-question',
    excerpt: 'Studio chat',
    messageId: 'current-codex',
    model: 'gpt-5.6-luna',
    question: 'What does this confirm?',
    threadId: 'thread-1',
    turnId: 'turn-team-1',
  });
  await quickQuestion.getByRole('button', { name: 'Done' }).press('Enter');
  await expect(quickQuestion).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__speechHarness.currentText())).toBe('');
  await expect(chat.getByRole('log', { name: 'Codex chat log' })).not.toContainText(
    'What does this confirm?',
  );

  await selectRenderedText(reply.locator('.markdown-content'), 'Studio chat');
  const appendedExcerptActions = chat.getByLabel('Selected Codex excerpt');
  await appendedExcerptActions.getByRole('button', { name: 'Add to prompt' }).focus();
  await page.keyboard.press('Enter');
  await expect(chat.getByLabel('Message to Codex')).toHaveValue(
    'Quoted from Codex:\n\n> Studio chat\n\n',
  );
  await expect(chat.getByLabel('Message to Codex')).toBeFocused();
  expect(delivered).toHaveLength(0);

  await selectRenderedText(reply.locator('.markdown-content'), 'is connected');
  await chat.getByLabel('Selected Codex excerpt').getByRole('button', { name: 'Send now' }).click();
  await expect.poll(() => delivered.length).toBe(1);
  expect(delivered[0].prompt).toBe('Please respond to this Codex excerpt:\n\n> is connected');
  await expect(chat.getByLabel('Message to Codex')).toHaveValue(
    'Quoted from Codex:\n\n> Studio chat\n\n',
  );
});

test('offers selected excerpt actions on the dedicated Codex page', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/codex');
  const chat = page.getByRole('dialog', { name: 'Codex', exact: true });
  const reply = chat.locator('.codex-chat-message--assistant', {
    hasText: 'Studio chat is connected.',
  });

  await selectRenderedText(reply.locator('.markdown-content'), 'Studio chat');
  const actions = chat.getByLabel('Selected Codex excerpt');
  await expect(actions).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const accessibility = await new AxeBuilder({ page })
    .include('.codex-chat-excerpt-actions')
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await expect(page).toHaveScreenshot('codex-selected-excerpt-page.png', {
    animations: 'disabled',
  });

  const quickQuestionButton = actions.getByRole('button', { name: 'Quick question' });
  await quickQuestionButton.focus();
  await page.keyboard.press('Enter');
  const quickQuestion = page.getByRole('dialog', { name: 'Quick question' });
  await expect(quickQuestion.getByLabel('What do you want to know?')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(quickQuestion).toBeHidden();

  await selectRenderedText(reply.locator('.markdown-content'), 'Studio chat');
  const dismiss = chat
    .getByLabel('Selected Codex excerpt')
    .getByRole('button', { name: 'Dismiss selected excerpt' });
  await dismiss.focus();
  await page.keyboard.press('Enter');
  await expect(actions).toBeHidden();

  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 568 });
    await selectRenderedText(reply.locator('.markdown-content'), 'is connected');
    const compactActions = chat.getByLabel('Selected Codex excerpt');
    await expect(compactActions).toBeVisible();
    await compactActions.scrollIntoViewIfNeeded();
    await expect(chat.locator('.codex-chat-transcript__latest')).toBeHidden();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expect(page).toHaveScreenshot('codex-selected-excerpt-page-compact-mobile.png', {
      animations: 'disabled',
    });
  }
});

test('restores a message to the composer when optimistic delivery fails', async ({ page }) => {
  let releaseDelivery;
  const deliveryGate = new Promise((resolve) => {
    releaseDelivery = resolve;
  });
  await page.route('**/__made-solid/codex-feedback', async (route) => {
    await deliveryGate;
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Codex is temporarily unavailable.' }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  const textarea = composer.getByLabel('Message to Codex');
  await textarea.fill('Keep this draft if delivery fails.');
  await composer.getByRole('button', { name: 'Send message' }).click();

  await expect(composer.locator('.codex-chat-message--pending')).toContainText(
    'Keep this draft if delivery fails.',
  );
  await expect(textarea).toHaveValue('');
  releaseDelivery();
  await expect(composer.locator('.codex-chat-message--pending')).toHaveCount(0);
  await expect(textarea).toHaveValue('Keep this draft if delivery fails.');
  await expect(textarea).toBeFocused();
  await expect(composer.getByRole('alert')).toContainText('Codex is temporarily unavailable.');
});

test('sends Fast as the selected Codex priority service tier', async ({ page }) => {
  let delivered;
  await page.route('**/__made-solid/codex-feedback', async (route) => {
    delivered = route.request().postDataJSON();
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'queued', id: 'fast-chat-1' }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await openChatSettings(composer);
  const fast = composer.getByRole('button', { name: /^Fast/ });
  await expect(fast).toHaveAttribute('aria-pressed', 'false');
  await fast.click();
  await expect(fast).toHaveAttribute('aria-pressed', 'true');
  await composer.getByLabel('Message to Codex').fill('Use the Fast service tier for this turn.');
  await composer.getByRole('button', { name: 'Send message' }).click();

  await expect.poll(() => delivered?.serviceTier).toBe('priority');
  expect(delivered.model).toBe('gpt-5.6-sol');
  expect(delivered.effort).toBe('medium');
});

test('shows the current attached agent team and opens its reported results', async ({ page }) => {
  await page.goto('/?codexAgents=1');
  await page.getByRole('button', { name: 'Codex is working' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  const team = composer.getByRole('region', { name: 'Agent team' });

  await expect(team).toContainText('2 assigned · 1 working · 1 complete');
  await expect(team).toContainText('Responsive reviewer');
  await expect(team).toContainText('Accessibility reviewer');
  const responsiveAgent = team.getByRole('button', { name: /Responsive reviewer/ });
  await responsiveAgent.click();
  await expect(responsiveAgent).toHaveAttribute('aria-expanded', 'true');
  await expect(team.getByLabel('Responsive reviewer results')).toContainText(
    'Mobile checks are complete',
  );
  await expect(team).not.toContainText('Supervisor');
  await expect(team).not.toContainText('Assignment');
  await expect(composer).toHaveScreenshot('codex-agent-team.png', {
    mask: [team.locator('.codex-agent-card__meta small').first()],
  });

  const accessibility = await new AxeBuilder({ page }).include('.codex-chat-dialog').analyze();
  expect(accessibility.violations).toEqual([]);
});

test('keeps only the latest relevant agent team beside the request that created it', async ({
  page,
}) => {
  await page.goto('/?codexAgents=1&codexTeamHistory=1');
  await page.getByRole('button', { name: /Chat with Codex|Codex is working/ }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  const log = composer.getByRole('log', { name: 'Codex chat log' });
  const teams = log.getByRole('region', { name: 'Agent team' });

  await expect(teams).toHaveCount(1);
  await expect(teams).not.toContainText('Responsive reviewer');
  await expect(teams).toContainText('Accessibility reviewer');
  const transcriptOrder = await log
    .locator(':scope > *')
    .evaluateAll((elements) =>
      elements.map((element) => element.textContent?.replace(/\s+/g, ' ').trim() || ''),
    );
  const indexOfText = (text) => transcriptOrder.findIndex((item) => item.includes(text));
  expect(indexOfText('The direct copy change is complete.')).toBeLessThan(
    indexOfText('Run a new agent team review.'),
  );
  expect(indexOfText('Run a new agent team review.')).toBeLessThan(
    indexOfText('Accessibility reviewer'),
  );
  expect(indexOfText('Accessibility reviewer')).toBeLessThan(
    indexOfText('The new team review is underway.'),
  );
  await log.evaluate((element) => {
    element.scrollTop = 0;
  });
  await expect(log).toHaveScreenshot('codex-agent-team-history.png');

  const accessibility = await new AxeBuilder({ page }).include('.codex-chat-dialog').analyze();
  expect(accessibility.violations).toEqual([]);
});

test('shows current Codex generation even when only historical agents exist', async ({ page }) => {
  await page.goto('/?codexAgents=1&codexWorking=1&codexDirectWorking=1');
  await page.getByRole('button', { name: 'Codex is working' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });

  await expect(composer.locator('.codex-working-status')).toContainText('Codex is working');
  await expect(composer.getByRole('region', { name: 'Agent team' })).toHaveCount(0);
});

test('keeps the live agent team usable at the compact 320px viewport', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/?codexAgents=1');
  await page.getByRole('button', { name: 'Codex is working' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  const team = composer.getByRole('region', { name: 'Agent team' });
  await expect(team.getByRole('button', { name: /Responsive reviewer/ })).toBeVisible();
  await expect(team.getByRole('button', { name: /Accessibility reviewer/ })).toBeVisible();
  await expect(composer).toHaveScreenshot('codex-agent-team-320.png', {
    mask: [team.locator('.codex-agent-card__meta small').first()],
  });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});

test('lets the reviewer choose direct work instead of Agent team delegation', async ({ page }) => {
  let delivered;
  await page.route('**/__made-solid/codex-feedback', async (route) => {
    delivered = route.request().postDataJSON();
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'accepted', id: 'direct-chat-1' }),
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await openRunSettings(composer);
  const teamMode = composer.getByRole('button', { name: /Agent team/ });
  await expect(teamMode).toHaveAttribute('aria-pressed', 'true');
  await teamMode.click();
  await expect(teamMode).toHaveAttribute('aria-pressed', 'false');
  await composer.getByLabel('Message to Codex').fill('Explain this without delegating.');
  await composer.getByRole('button', { name: 'Send message' }).click();
  expect(delivered.workMode).toBe('direct');
});

test('reconciles a delivered request without leaving a duplicate Sending card', async ({
  page,
}) => {
  let delivered = false;
  const requestId = '33333333-3333-4333-8333-333333333333';
  const prompt = 'Fix the duplicated optimistic chat message.';
  await page.route('**/__made-solid/codex-feedback', async (route) => {
    delivered = true;
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'accepted', id: requestId }),
    });
  });
  await page.route('**/__made-solid/codex-status*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ready',
        detail: 'Connected to the local Codex conversation.',
        thread: {
          id: 'thread-deduplicated',
          name: 'Deduplicated request',
          status: delivered ? 'active' : 'idle',
          working: delivered,
          workingStartedAt: delivered ? Math.floor(Date.now() / 1_000) : undefined,
        },
        threads: [
          {
            id: 'thread-deduplicated',
            name: 'Deduplicated request',
            status: delivered ? 'active' : 'idle',
            working: delivered,
          },
        ],
        messages: delivered
          ? [{ id: 'user-delivered', feedbackId: requestId, role: 'user', text: prompt }]
          : [],
        queuedCount: 0,
        queuedMessages: [],
        models: [
          {
            id: 'gpt-5.6-sol',
            label: 'GPT-5.6-Sol',
            defaultEffort: 'medium',
            isDefault: true,
            supportsImages: true,
            efforts: [{ id: 'medium', description: 'Balanced reasoning' }],
          },
        ],
      }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await composer.getByLabel('Message to Codex').fill(prompt);
  await composer.getByRole('button', { name: 'Send message' }).click();
  const log = composer.getByRole('log', { name: 'Codex chat log' });
  await expect(log.getByText(prompt, { exact: true })).toHaveCount(1);
  await expect(log.getByText('Sending', { exact: true })).toHaveCount(0);
  await expect(composer.locator('.codex-working-status')).toContainText('Codex is working');
});

test('shows an accessible loading state while switching saved Codex conversations', async ({
  page,
}) => {
  let releaseConversation;
  const conversationReady = new Promise((resolve) => {
    releaseConversation = resolve;
  });
  await page.route('**/__made-solid/codex-status*', async (route) => {
    const selectedThreadId = new URL(route.request().url()).searchParams.get('threadId');
    if (selectedThreadId === 'thread-2') await conversationReady;
    await route.fallback();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  const log = composer.getByRole('log', { name: 'Codex chat log' });
  await expect(log).toContainText('Studio chat is connected.');

  const conversationPicker = composer.getByRole('button', { name: 'Conversation' });
  await expect(conversationPicker.locator('strong')).toHaveText('Open the Studio chat.');
  await expect(conversationPicker).not.toContainText('Captured from');
  await conversationPicker.click();
  const earlierConversation = composer.getByRole('menuitemradio', {
    name: /Review the earlier homepage\./,
  });
  await expect(earlierConversation).toContainText('Last used 1h ago');
  await earlierConversation.click();
  const loading = composer.locator('.codex-conversation-loading');
  await expect(loading).toBeVisible();
  await expect(loading).toContainText('Opening conversation');
  await expect(loading).toContainText('Loading Review the earlier homepage.');
  await expect(log).toHaveAttribute('aria-busy', 'true');
  await expect(log).not.toContainText('Studio chat is connected.');
  await expect(composer.getByRole('button', { name: 'Conversation' })).toBeDisabled();
  await expect(composer.getByRole('button', { name: 'New chat' })).toBeDisabled();
  await expect(composer.getByLabel('Message to Codex')).toBeDisabled();
  await expect(composer).toHaveScreenshot('codex-conversation-loading.png');
  const accessibility = await new AxeBuilder({ page }).include('.codex-chat-dialog').analyze();
  expect(accessibility.violations).toEqual([]);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);

  releaseConversation();
  await expect(log).toContainText('Review the earlier homepage.');
  await expect(log).toContainText('The earlier review is complete.');
  await expect(loading).toBeHidden();
  await expect(log).toHaveAttribute('aria-busy', 'false');
});

test('switches conversations while another chat keeps working', async ({ page }) => {
  let targetStatusRequests = 0;
  let firstTargetRequestPending = false;
  let overlappingTargetRequests = 0;
  await page.route('**/__made-solid/codex-status*', async (route) => {
    const selectedThreadId = new URL(route.request().url()).searchParams.get('threadId');
    if (selectedThreadId === 'thread-2') {
      targetStatusRequests += 1;
      if (targetStatusRequests === 1) {
        firstTargetRequestPending = true;
        await new Promise((resolve) => setTimeout(resolve, 1_250));
        firstTargetRequestPending = false;
      } else if (firstTargetRequestPending) {
        overlappingTargetRequests += 1;
      }
    }
    await route.fallback();
  });
  await page.goto('/?codexWorking=1');
  await page.getByRole('button', { name: 'Codex is working' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await composer.getByRole('button', { name: 'Conversation' }).click();
  await composer.getByRole('menuitemradio', { name: /Review the earlier homepage\./ }).click();

  await expect(composer.getByRole('log', { name: 'Codex chat log' })).toContainText(
    'The earlier review is complete.',
  );
  await expect(composer.getByText('That conversation could not be loaded')).toHaveCount(0);
  await expect(composer.getByRole('button', { name: 'Conversation' })).toContainText(
    'Review the earlier homepage.',
  );
  expect(overlappingTargetRequests).toBe(0);
});

test('keeps other conversations usable when one saved transcript cannot load', async ({ page }) => {
  await page.goto('/?codexUnreadableConversation=1');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  const log = composer.getByRole('log', { name: 'Codex chat log' });

  await expect(log.getByRole('alert')).toContainText('Choose another chat or start a new one');
  await expect(composer.getByLabel('Message to Codex')).toBeDisabled();
  await expect(composer.getByRole('button', { name: 'Send message' })).toBeDisabled();
  await expect(composer).toHaveScreenshot('codex-unreadable-conversation.png');
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  const accessibility = await new AxeBuilder({ page }).include('.codex-chat-dialog').analyze();
  expect(accessibility.violations).toEqual([]);

  await composer.getByRole('button', { name: 'Conversation' }).click();
  await composer.getByRole('menuitemradio', { name: /Review the earlier homepage\./ }).click();
  await expect(log).toContainText('The earlier review is complete.');
  await expect(log.getByRole('alert')).toHaveCount(0);
  await expect(composer.getByLabel('Message to Codex')).toBeEnabled();
});

test('keeps conversation loading motion static when reduced motion is requested', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  let releaseConversation;
  const conversationReady = new Promise((resolve) => {
    releaseConversation = resolve;
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.route('**/__made-solid/codex-status*', async (route) => {
    const selectedThreadId = new URL(route.request().url()).searchParams.get('threadId');
    if (selectedThreadId === 'thread-2') await conversationReady;
    await route.fallback();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await composer.getByRole('button', { name: 'Conversation' }).click();
  await composer.getByRole('menuitemradio', { name: /Review the earlier homepage\./ }).click();
  await expect(composer.locator('.codex-conversation-loading')).toBeVisible();
  await expect(composer.locator('.codex-conversation-loading__icon')).toHaveCSS(
    'animation-name',
    'none',
  );
  await expect(composer.locator('.codex-conversation-loading__skeleton i').first()).toHaveCSS(
    'animation-name',
    'none',
  );
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  releaseConversation();
});

test('explains and continues a conversation interrupted by a Codespace pause', async ({ page }) => {
  let continuation;
  await page.route('**/__made-solid/codex-feedback', async (route) => {
    continuation = route.request().postDataJSON();
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'accepted',
        detail:
          'Codex resumed the supervisor with instructions to restart 1 interrupted attached agent from its saved sub-chat.',
        resumeRequestedAgents: [{ id: 'agent-responsive', name: 'responsive reviewer' }],
        resumedAgents: [{ id: 'agent-responsive', name: 'responsive reviewer' }],
        agentResumeFailures: [],
      }),
    });
  });

  await page.goto('/?codexInterrupted&codexAgents=1');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  const log = composer.getByRole('log', { name: 'Codex chat log' });
  await composer.getByLabel('Message to Codex').focus();
  await expect(composer.locator('.codex-composer-surface')).toHaveClass(/is-expanded/);
  await expect(composer.getByText('Work was interrupted')).toBeVisible();
  await expect(composer).toContainText('The Codespace paused before Codex finished.');
  await expect(composer).toContainText('1 interrupted attached agent will resume');
  await log.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(composer).toHaveScreenshot('codex-interrupted-conversation-mobile.png');
  await composer.getByRole('button', { name: 'Resume working' }).click();
  await expect.poll(() => continuation?.action).toBe('continue-interrupted-thread');
  await expect(composer.getByRole('region', { name: 'Agent team' })).toContainText(
    '1 interrupted agent is resuming',
  );
  await expect(composer.getByText('Work is resuming')).toHaveCount(0);
  await expect(composer.getByRole('button', { name: /Responsive reviewer/ })).toContainText(
    'Resuming',
  );
  await log.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(composer).toHaveScreenshot('codex-resuming-agent-team.png');
  expect(continuation.threadId).toBe('thread-1');
  expect(continuation.model).toBe('gpt-5.6-sol');

  const accessibility = await new AxeBuilder({ page }).include('.codex-chat-dialog').analyze();
  expect(accessibility.violations).toEqual([]);
});

test('renders safe Markdown in Codex chat messages without overflowing', async ({ page }) => {
  const markdown = `## Implementation

**Ready** with \`npm run build\`.

- Keep the navigation stable
- Verify the responsive layout

> This note stays readable.

| Check | Status |
| --- | --- |
| TypeScript | Passed |

[Open documentation](https://example.com/docs)

\`\`\`ts
const result = "this-code-line-scrolls-horizontally-on-small-screens";
\`\`\`

<script>markdownWasUnsafe = true</script>`;
  await page.route('**/__made-solid/codex-status*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ready',
        detail: 'Connected to the local Codex conversation.',
        thread: { id: 'thread-markdown', name: 'Markdown review', status: 'idle' },
        threads: [{ id: 'thread-markdown', name: 'Markdown review', status: 'idle' }],
        messages: [{ id: 'markdown-response', role: 'assistant', text: markdown }],
        queuedCount: 0,
        queuedMessages: [],
        models: [
          {
            id: 'gpt-5.6-sol',
            label: 'GPT-5.6-Sol',
            defaultEffort: 'medium',
            isDefault: true,
            supportsImages: true,
            efforts: [{ id: 'medium', description: 'Balanced reasoning' }],
          },
        ],
      }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const message = page.locator('.codex-chat-message--assistant');
  await expect(message.getByRole('heading', { name: 'Implementation', level: 3 })).toBeVisible();
  await expect(message.getByRole('listitem')).toHaveCount(2);
  await expect(message.getByText('npm run build', { exact: true })).toHaveCSS(
    'font-family',
    /monospace/,
  );
  await expect(message.getByRole('table')).toContainText('TypeScript');
  await expect(message.getByRole('link', { name: 'Open documentation' })).toHaveAttribute(
    'target',
    '_blank',
  );
  await expect(message.getByText(/<script>markdownWasUnsafe/)).toBeVisible();
  await expect(page.locator('script').filter({ hasText: 'markdownWasUnsafe' })).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  await expect(message).toHaveScreenshot('codex-markdown-message.png');

  const accessibility = await new AxeBuilder({ page }).include('.codex-chat-dialog').analyze();
  expect(accessibility.violations).toEqual([]);
});

test('filters, previews, and remembers a voice from the global Google catalogue', async ({
  page,
}) => {
  const speechRequests = [];
  await enableGoogleSpeech(page, (request) => speechRequests.push(request));
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  let composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await openChatSettings(composer);

  const voiceSettings = composer.getByRole('region', { name: 'Read aloud voice' });
  await expect(voiceSettings).toContainText('5 Google voices');
  await expect(voiceSettings).toContainText('Recommended · most natural');
  await expect(voiceSettings.getByRole('combobox', { name: 'Language & accent' })).toContainText(
    /American English|English \(United States\)/,
  );
  await voiceSettings
    .getByRole('combobox', { name: 'Language & accent' })
    .selectOption({ value: 'en-US' });
  await expect(voiceSettings.getByRole('combobox', { name: 'Model quality' })).toContainText(
    'Standard — Basic · lowest cost',
  );
  await voiceSettings
    .getByRole('combobox', { name: 'Model quality' })
    .selectOption({ value: 'standard' });
  await expect(voiceSettings.getByRole('combobox', { name: 'Voice', exact: true })).toHaveValue(
    'en-US-Standard-A',
  );
  await voiceSettings
    .getByRole('combobox', { name: 'Language & accent' })
    .selectOption({ value: 'en-AU' });
  await expect(voiceSettings.getByRole('combobox', { name: 'Voice', exact: true })).toHaveValue(
    'en-AU-Chirp3-HD-Aoede',
  );
  await voiceSettings
    .getByRole('combobox', { name: 'Voice', exact: true })
    .selectOption('en-AU-Chirp3-HD-Leda');
  await voiceSettings.getByRole('button', { name: 'Preview Leda voice' }).click();
  await expect(voiceSettings.getByRole('button', { name: 'Stop voice preview' })).toBeVisible();
  await expect.poll(() => speechRequests.length).toBe(1);
  expect(speechRequests[0]).toMatchObject({ voice: 'en-AU-Chirp3-HD-Leda' });
  expect(speechRequests[0].text).toContain('Studio Codex Chat voice');
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__audioHarness.events.filter((event) => event.type === 'play').length,
      ),
    )
    .toBeGreaterThan(0);
  await expect(composer).toHaveScreenshot('codex-google-voice-settings.png');
  const accessibility = await new AxeBuilder({ page }).include('.codex-feedback-dialog').analyze();
  expect(accessibility.violations).toEqual([]);

  await voiceSettings.getByRole('button', { name: 'Stop voice preview' }).click();
  await composer.getByRole('button', { name: 'Close chat settings' }).click();
  await composer.getByRole('button', { name: 'Close Codex chat' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await openChatSettings(composer);
  await expect(composer.getByRole('combobox', { name: 'Voice', exact: true })).toHaveValue(
    'en-AU-Chirp3-HD-Leda',
  );
});

test('configures and remembers natural read-aloud preferences', async ({ page }) => {
  await enableGoogleSpeech(page);
  await showCompletedSpeechReply(page, 'These read-aloud settings should stay on this device.');
  await page.goto('/');
  await page.getByRole('button', { name: /Codex/ }).click();
  let composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await openChatSettings(composer);

  const readAloudSettings = composer.getByRole('region', { name: /Read aloud/ });
  await expect(readAloudSettings).toContainText(
    'Reads progress updates and the final reply automatically while this chat is open.',
  );
  await readAloudSettings
    .getByRole('combobox', { name: 'Language & accent' })
    .selectOption('en-US');
  await readAloudSettings
    .getByRole('combobox', { name: 'Voice', exact: true })
    .selectOption('en-US-Chirp3-HD-Charon');
  await readAloudSettings.getByRole('combobox', { name: 'Reading style' }).selectOption('literal');
  await readAloudSettings.getByRole('combobox', { name: 'Speed' }).selectOption('1.15');
  await readAloudSettings.getByRole('checkbox', { name: 'Auto-read Codex' }).check();

  await composer.getByRole('button', { name: 'Close chat settings' }).click();
  await composer.getByRole('button', { name: 'Close Codex chat' }).click();
  await page.reload();
  await page.getByRole('button', { name: /Codex/ }).click();
  composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await openChatSettings(composer);

  await expect(composer.getByRole('combobox', { name: 'Language & accent' })).toHaveValue('en-US');
  await expect(composer.getByRole('combobox', { name: 'Voice', exact: true })).toHaveValue(
    'en-US-Chirp3-HD-Charon',
  );
  await expect(composer.getByRole('combobox', { name: 'Reading style' })).toHaveValue('literal');
  await expect(composer.getByRole('combobox', { name: 'Speed' })).toHaveValue('1.15');
  await expect(composer.getByRole('checkbox', { name: 'Auto-read Codex' })).toBeChecked();
});

test('automatically reads one stable progress update and then the final reply', async ({
  page,
}) => {
  const speechRequests = [];
  let status = speechFeatureStatus([
    { id: 'auto-user', role: 'user', text: 'Please check the responsive layout.' },
  ]);
  await page.clock.install();
  await enableGoogleSpeech(page, (request) => speechRequests.push(request));
  await showMutableSpeechConversation(page, () => status);
  await page.goto('/');
  await page.getByRole('button', { name: /Codex/ }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await openChatSettings(composer);
  await composer.getByRole('checkbox', { name: 'Auto-read Codex' }).check();
  await composer.getByRole('button', { name: 'Close chat settings' }).click();

  status = speechFeatureStatus([
    { id: 'auto-user', role: 'user', text: 'Please check the responsive layout.' },
    {
      id: 'auto-progress',
      role: 'assistant',
      phase: 'commentary',
      text: 'I have checked mobile and I am moving on to the tablet layout.',
    },
  ]);
  await page.clock.fastForward(5_500);
  await expect
    .poll(() => speechRequests.map(({ text }) => text))
    .toEqual(['I have checked mobile and I am moving on to the tablet layout.']);

  await page.clock.fastForward(5_500);
  expect(speechRequests).toHaveLength(1);
  await page.evaluate(() => window.__audioHarness.finish());

  status = speechFeatureStatus(
    [
      { id: 'auto-user', role: 'user', text: 'Please check the responsive layout.' },
      {
        id: 'auto-progress',
        role: 'assistant',
        phase: 'commentary',
        text: 'I have checked mobile and I am moving on to the tablet layout.',
      },
      {
        id: 'auto-final',
        role: 'assistant',
        phase: 'final_answer',
        text: 'The mobile, tablet, and desktop layouts are all ready.',
      },
    ],
    { working: false },
  );
  await page.clock.fastForward(5_500);
  await expect
    .poll(() => speechRequests.map(({ text }) => text))
    .toEqual([
      'I have checked mobile and I am moving on to the tablet layout.',
      'The mobile, tablet, and desktop layouts are all ready.',
    ]);
});

test('coalesces queued progress so automatic reading speaks only the latest update', async ({
  page,
}) => {
  const speechRequests = [];
  const userMessage = { id: 'coalesce-user', role: 'user', text: 'Keep me updated.' };
  const firstProgress = {
    id: 'coalesce-progress-1',
    role: 'assistant',
    phase: 'commentary',
    text: 'I am checking the project structure now.',
  };
  const supersededProgress = {
    id: 'coalesce-progress-2',
    role: 'assistant',
    phase: 'commentary',
    text: 'I found the chat component and I am inspecting its speech state.',
  };
  const latestProgress = {
    id: 'coalesce-progress-3',
    role: 'assistant',
    phase: 'commentary',
    text: 'The speech state is understood and I am checking the tests next.',
  };
  let status = speechFeatureStatus([userMessage]);
  await page.clock.install();
  await enableGoogleSpeech(page, (request) => speechRequests.push(request));
  await showMutableSpeechConversation(page, () => status);
  await page.goto('/');
  await page.getByRole('button', { name: /Codex/ }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await openChatSettings(composer);
  await composer.getByRole('checkbox', { name: 'Auto-read Codex' }).check();

  status = speechFeatureStatus([userMessage, firstProgress]);
  await page.clock.fastForward(5_500);
  await expect.poll(() => speechRequests).toHaveLength(1);

  status = speechFeatureStatus([userMessage, firstProgress, supersededProgress]);
  await page.clock.fastForward(5_500);
  status = speechFeatureStatus([userMessage, firstProgress, supersededProgress, latestProgress]);
  await page.clock.fastForward(5_500);
  expect(speechRequests).toHaveLength(1);

  await page.evaluate(() => window.__audioHarness.finish());
  await expect.poll(() => speechRequests).toHaveLength(2);
  expect(speechRequests.map(({ text }) => text)).toEqual([firstProgress.text, latestProgress.text]);
});

test('gives manual Read priority and stops future automatic speech when switched off', async ({
  page,
}) => {
  const speechRequests = [];
  const userMessage = { id: 'priority-user', role: 'user', text: 'Explain the decision.' };
  const earlierFinal = {
    id: 'priority-earlier-final',
    role: 'assistant',
    phase: 'final_answer',
    text: 'This earlier answer is available for manual reading.',
  };
  const progress = {
    id: 'priority-progress',
    role: 'assistant',
    phase: 'commentary',
    text: 'I am comparing the available voice options.',
  };
  let status = speechFeatureStatus([userMessage, earlierFinal]);
  await page.clock.install();
  await enableGoogleSpeech(page, (request) => speechRequests.push(request));
  await showMutableSpeechConversation(page, () => status);
  await page.goto('/');
  await page.getByRole('button', { name: /Codex/ }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await openChatSettings(composer);
  await composer.getByRole('checkbox', { name: 'Auto-read Codex' }).check();
  await composer.getByRole('button', { name: 'Close chat settings' }).click();

  status = speechFeatureStatus([userMessage, earlierFinal, progress]);
  await page.clock.fastForward(5_500);
  await expect.poll(() => speechRequests.map(({ text }) => text)).toEqual([progress.text]);

  const earlierReply = composer.locator('.codex-chat-message--assistant', {
    hasText: earlierFinal.text,
  });
  await earlierReply.getByRole('button', { name: 'Read Codex reply', exact: true }).click();
  await expect
    .poll(() => speechRequests.map(({ text }) => text))
    .toEqual([progress.text, earlierFinal.text]);
  const playback = composer.getByRole('region', { name: 'Read aloud controls' });
  await expect(playback.getByRole('button', { name: 'Pause reading', exact: true })).toBeVisible();

  await playback.getByRole('button', { name: 'Stop reading', exact: true }).click();
  await openChatSettings(composer);
  await composer.getByRole('checkbox', { name: 'Auto-read Codex' }).uncheck();
  status = speechFeatureStatus([
    userMessage,
    earlierFinal,
    progress,
    {
      id: 'priority-later-progress',
      role: 'assistant',
      phase: 'commentary',
      text: 'This later progress update must remain silent.',
    },
  ]);
  await page.clock.fastForward(5_500);
  expect(speechRequests).toHaveLength(2);
});

test('keeps Google voice settings usable at the compact 320px viewport', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await enableGoogleSpeech(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await openChatSettings(composer);
  const voiceSettings = composer.getByRole('region', { name: 'Read aloud voice' });
  await expect(voiceSettings.getByRole('combobox', { name: 'Language & accent' })).toBeVisible();
  await expect(voiceSettings.getByRole('combobox', { name: 'Model quality' })).toBeVisible();
  await expect(voiceSettings.getByRole('combobox', { name: 'Voice', exact: true })).toBeVisible();
  await expect(voiceSettings.getByRole('button', { name: /Preview Aoede voice/ })).toBeVisible();
  await expect
    .poll(() => composer.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBeLessThanOrEqual(1);
  await expect(voiceSettings).toHaveScreenshot('codex-google-voice-settings-320.png');
  const accessibility = await new AxeBuilder({ page }).include('.codex-feedback-dialog').analyze();
  expect(accessibility.violations).toEqual([]);
});

test('plays Google speech with exact seekable seconds and no device utterance', async ({
  page,
}) => {
  const speechRequests = [];
  await enableGoogleSpeech(page, (request) => speechRequests.push(request));
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const reply = page.locator('.codex-chat-message--assistant', {
    hasText: 'Studio chat is connected.',
  });
  await reply.getByRole('button', { name: 'Read Codex reply', exact: true }).click();
  const playback = page.getByRole('region', { name: 'Read aloud controls' });
  await expect(playback.getByRole('button', { name: 'Pause reading', exact: true })).toBeVisible();
  expect(speechRequests).toEqual([
    { text: 'Studio chat is connected.', voice: 'en-AU-Chirp3-HD-Aoede' },
  ]);
  expect(
    await page.evaluate(
      () => window.__speechHarness.events.filter((event) => event.type === 'speak').length,
    ),
  ).toBe(0);

  const timeline = playback.getByLabel('Speech playback position');
  await expect(timeline).toHaveAttribute('max', '12');
  await expect(playback.getByText('0:00 / 0:12', { exact: true })).toBeVisible();
  await page.evaluate(() => window.__audioHarness.advance(5));
  await expect(timeline).toHaveValue('5');
  await expect(playback.getByText('0:05 / 0:12', { exact: true })).toBeVisible();
  await timeline.fill('8');
  await expect.poll(() => page.evaluate(() => window.__audioHarness.currentTime())).toBe(8);

  await playback.getByRole('button', { name: 'Pause reading', exact: true }).click();
  await expect(playback.getByRole('button', { name: 'Resume reading', exact: true })).toBeVisible();
  await playback.getByRole('button', { name: 'Resume reading', exact: true }).click();
  await expect(playback.getByRole('button', { name: 'Pause reading', exact: true })).toBeVisible();
  await playback.getByRole('button', { name: 'Stop reading', exact: true }).click();
  await expect(playback).toHaveCount(0);
  await expect(reply.getByRole('button', { name: 'Read Codex reply', exact: true })).toBeVisible();
});

test('reads arrow icons naturally and leaves long verification details in chat', async ({
  page,
}) => {
  const replyText = `I completed Settings → Read aloud verification; the details are in chat.

- TypeScript typecheck passed across the workspace source files
- ESLint completed with no warnings in the application package
- Vitest ran the focused speech transformation unit tests successfully
- Production Vite build emitted the expected hashed browser assets

The reading update is ready.

Implemented in codex-speech.ts with coverage in codex-speech.test.ts and codex-feedback.spec.js.

All checks passed: formatting, lint, TypeScript, production build, 23 speech tests, 76 package tests, and Playwright at 375×812, 768×1024, and 1440×900.`;
  const speechRequests = [];
  await showCompletedSpeechReply(page, replyText, 'speech-natural-technical-list');
  await enableGoogleSpeech(page, (request) => speechRequests.push(request));
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const reply = page.locator('.codex-chat-message--assistant', {
    hasText: 'I completed Settings',
  });
  await expect(reply).toContainText('Production Vite build emitted');
  await expect(reply).toContainText('Implemented in codex-speech.ts');
  await expect(reply).toContainText('All checks passed: formatting');
  await reply.getByRole('button', { name: 'Read Codex reply', exact: true }).click();
  await expect
    .poll(() => speechRequests.map(({ text }) => text))
    .toEqual([
      'I completed Settings then Read aloud verification; the details are in chat. The reading update is ready. The technical implementation and verification details are in the chat.',
    ]);
});

test('starts the first Google speech chunk while later chunks are still buffering', async ({
  page,
}) => {
  const sentence =
    'This sentence gives the listener a clear, useful update before the remaining audio is ready.';
  const longReply = Array.from({ length: 58 }, (_, index) => `${index + 1}. ${sentence}`).join(
    '\n\n',
  );
  await showCompletedSpeechReply(page, longReply, 'speech-progressive');

  let releaseLaterChunks;
  const laterChunks = new Promise((resolve) => {
    releaseLaterChunks = resolve;
  });
  const speechRequests = [];
  await page.route('**/__made-solid/codex-speech', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          available: true,
          defaultVoice: 'en-AU-Chirp3-HD-Aoede',
          provider: 'Google Cloud Text-to-Speech',
          voices: [
            {
              id: 'en-AU-Chirp3-HD-Aoede',
              gender: 'Female',
              languageCode: 'en-AU',
              model: 'chirp3-hd',
              modelLabel: 'Chirp 3 HD',
              name: 'Aoede',
              qualityLabel: 'Recommended · most natural',
              qualityRank: 1,
            },
          ],
        }),
      });
      return;
    }
    speechRequests.push(route.request().postDataJSON());
    if (speechRequests.length > 1) await laterChunks;
    await route.fulfill({
      contentType: 'audio/mpeg',
      body: Buffer.from(`mocked speech chunk ${speechRequests.length}`),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const reply = page.locator('.codex-chat-message--assistant', { hasText: sentence });
  await reply.getByRole('button', { name: 'Read Codex reply', exact: true }).click();

  await expect.poll(() => speechRequests.length).toBeGreaterThan(1);
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__audioHarness.events.filter((event) => event.type === 'play').length,
      ),
    )
    .toBe(1);
  const playback = page.getByRole('region', { name: 'Read aloud controls' });
  await expect(playback.getByRole('button', { name: 'Pause reading', exact: true })).toBeVisible();

  releaseLaterChunks();
  await expect(playback.getByRole('button', { name: 'Pause reading', exact: true })).toBeVisible();
  await playback.getByRole('button', { name: 'Stop reading', exact: true }).click();
});

test('highlights spoken words, starts from a selected word, and skips five seconds', async ({
  page,
}, testInfo) => {
  const replyText =
    'Start with a clear summary. Continue with the practical implementation details. Finish with the next action.';
  await showCompletedSpeechReply(page, replyText, 'speech-word-controls');
  const speechRequests = [];
  await enableGoogleSpeech(page, (request) => speechRequests.push(request));
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const reply = page.locator('.codex-chat-message--assistant', { hasText: replyText });
  await reply.getByRole('button', { name: 'Read Codex reply', exact: true }).click();

  const playback = page.getByRole('region', { name: 'Read aloud controls' });
  const back = playback.getByRole('button', { name: 'Skip back 5 seconds', exact: true });
  const forward = playback.getByRole('button', { name: 'Skip forward 5 seconds', exact: true });
  await expect(back).toBeVisible();
  await expect(forward).toBeVisible();
  expect((await back.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  expect((await forward.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await expect(reply.locator('.codex-chat-message__speech-word[aria-current="true"]')).toHaveText(
    'Start',
  );
  await expect(reply.locator('.codex-chat-message__speech-word[tabindex="0"]')).toHaveCount(1);
  await expect(reply.locator('.codex-chat-message__speech-word:not([tabindex="-1"])')).toHaveCount(
    1,
  );
  await expect
    .poll(() => reply.locator('.codex-chat-message__speech-word[tabindex="-1"]').count())
    .toBeGreaterThan(0);

  await page.evaluate(() => window.__audioHarness.advance(6));
  await expect(
    reply.locator('.codex-chat-message__speech-word[aria-current="true"]'),
  ).not.toHaveText('Start');
  await forward.click();
  await expect.poll(() => page.evaluate(() => window.__audioHarness.currentTime())).toBe(11);
  await back.click();
  await expect.poll(() => page.evaluate(() => window.__audioHarness.currentTime())).toBe(6);

  const selectedWord = reply.getByRole('button', {
    name: 'Start reading from “implementation”',
    exact: true,
  });
  const playCountBeforeWordSelection = await page.evaluate(
    () => window.__audioHarness.events.filter((event) => event.type === 'play').length,
  );
  if (testInfo.project.use.hasTouch) await selectedWord.tap();
  else await selectedWord.click();
  await expect(selectedWord).toHaveAttribute('aria-current', 'true');
  await expect.poll(() => speechRequests.at(-1)?.text).toMatch(/^implementation details\./);
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__audioHarness.events.filter((event) => event.type === 'play').length,
      ),
    )
    .toBeGreaterThan(playCountBeforeWordSelection);
  await expect(playback.getByRole('button', { name: 'Pause reading', exact: true })).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).include('.codex-chat-dialog').analyze();
  expect(accessibility.violations).toEqual([]);
});

test('keeps the spoken-word highlight static when reduced motion is preferred', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await showCompletedSpeechReply(
    page,
    'Spoken words remain clear without animated emphasis.',
    'speech-reduced-motion',
  );
  await enableGoogleSpeech(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const reply = page.locator('.codex-chat-message--assistant', {
    hasText: 'Spoken words remain clear',
  });
  await reply.getByRole('button', { name: 'Read Codex reply', exact: true }).click();
  const activeWord = reply.locator('.codex-chat-message__speech-word[aria-current="true"]');
  await expect(activeWord).toBeVisible();
  await expect(activeWord).toHaveCSS('animation-name', 'none');
  await expect(activeWord).toHaveCSS('transition-duration', '0s');
  await expect(reply).toHaveScreenshot('codex-speech-read-along.png');
});

test('ignores late buffered Google audio after the Codex panel closes', async ({ page }) => {
  const sentence =
    'This private audio segment must never start after its Codex panel has been closed.';
  await showCompletedSpeechReply(
    page,
    Array.from({ length: 58 }, (_, index) => `${index + 1}. ${sentence}`).join('\n\n'),
    'speech-buffer-cleanup',
  );
  let releaseBufferedAudio;
  const bufferedAudio = new Promise((resolve) => {
    releaseBufferedAudio = resolve;
  });
  let speechRequestCount = 0;
  await page.route('**/__made-solid/codex-speech', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          available: true,
          defaultVoice: 'en-AU-Chirp3-HD-Aoede',
          provider: 'Google Cloud Text-to-Speech',
          voices: [
            {
              id: 'en-AU-Chirp3-HD-Aoede',
              gender: 'Female',
              languageCode: 'en-AU',
              model: 'chirp3-hd',
              modelLabel: 'Chirp 3 HD',
              name: 'Aoede',
              qualityLabel: 'Recommended · most natural',
              qualityRank: 1,
            },
          ],
        }),
      });
      return;
    }
    speechRequestCount += 1;
    if (speechRequestCount > 1) await bufferedAudio;
    await route
      .fulfill({
        contentType: 'audio/mpeg',
        body: Buffer.from(`buffered speech ${speechRequestCount}`),
      })
      .catch(() => undefined);
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await composer
    .locator('.codex-chat-message--assistant', { hasText: sentence })
    .getByRole('button', { name: 'Read Codex reply', exact: true })
    .click();
  await expect.poll(() => speechRequestCount).toBeGreaterThan(1);
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__audioHarness.events.filter((event) => event.type === 'play').length,
      ),
    )
    .toBe(1);

  await composer.getByRole('button', { name: 'Close Codex chat' }).click();
  const playCountAfterClose = await page.evaluate(
    () => window.__audioHarness.events.filter((event) => event.type === 'play').length,
  );
  releaseBufferedAudio();
  await page.waitForTimeout(100);
  expect(
    await page.evaluate(
      () => window.__audioHarness.events.filter((event) => event.type === 'play').length,
    ),
  ).toBe(playCountAfterClose);
});

test('falls back to the English device voice when Google synthesis fails', async ({ page }) => {
  await page.route('**/__made-solid/codex-speech', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          available: true,
          defaultVoice: 'en-AU-Chirp3-HD-Aoede',
          provider: 'Google Cloud Text-to-Speech',
          voices: [
            {
              id: 'en-AU-Chirp3-HD-Aoede',
              gender: 'Female',
              languageCode: 'en-AU',
              model: 'chirp3-hd',
              modelLabel: 'Chirp 3 HD',
              name: 'Aoede',
              qualityLabel: 'Recommended · most natural',
              qualityRank: 1,
            },
          ],
        }),
      });
      return;
    }
    await route.fulfill({ status: 502, contentType: 'application/json', body: '{}' });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const reply = page.locator('.codex-chat-message--assistant', {
    hasText: 'Studio chat is connected.',
  });
  await reply.getByRole('button', { name: 'Read Codex reply', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__speechHarness.currentText()))
    .toContain('Studio chat is connected.');
  const spoken = await page.evaluate(() =>
    window.__speechHarness.events.findLast((event) => event.type === 'speak'),
  );
  expect(spoken.lang).toMatch(/^en(?:-|$)/i);
  expect(spoken.voiceName).toBe('Playwright device voice');
});

test('offers device-voice reading for progress updates and completed Codex replies', async ({
  page,
}) => {
  await page.route('**/__made-solid/codex-status*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ready',
        detail: 'Connected to the local Codex conversation.',
        thread: { id: 'thread-speech', name: 'Speech review', status: 'idle' },
        threads: [{ id: 'thread-speech', name: 'Speech review', status: 'idle' }],
        messages: [
          { id: 'speech-user', role: 'user', text: 'Read the completed answer.' },
          {
            id: 'speech-progress',
            role: 'assistant',
            phase: 'commentary',
            text: 'I am still checking the workspace.',
          },
          {
            id: 'speech-final',
            role: 'assistant',
            phase: 'final_answer',
            text: 'The completed answer is ready to read.',
          },
        ],
        agents: [],
        queuedCount: 0,
        queuedMessages: [],
        models: [
          {
            id: 'gpt-5.6-sol',
            label: 'GPT-5.6-Sol',
            defaultEffort: 'medium',
            isDefault: true,
            supportsImages: true,
            efforts: [{ id: 'medium', description: 'Balanced reasoning' }],
            serviceTiers: [],
          },
        ],
      }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();

  const userMessage = page.locator('.codex-chat-message--user', {
    hasText: 'Read the completed answer.',
  });
  const progressMessage = page.locator('.codex-chat-message--progress', {
    hasText: 'I am still checking the workspace.',
  });
  const finalMessage = page.locator('.codex-chat-message--assistant', {
    hasText: 'The completed answer is ready to read.',
  });
  await expect(
    userMessage.getByRole('button', { name: 'Read Codex reply', exact: true }),
  ).toHaveCount(0);
  const progressReadButton = progressMessage.getByRole('button', {
    name: 'Read progress update',
    exact: true,
  });
  await expect(progressReadButton).toBeVisible();
  await expect(
    finalMessage.getByRole('button', { name: 'Read Codex reply', exact: true }),
  ).toBeVisible();
  const readButton = finalMessage.getByRole('button', {
    name: 'Read Codex reply',
    exact: true,
  });
  await expect(readButton).toHaveCSS('min-height', '44px');
  await expect
    .poll(async () => (await readButton.boundingBox())?.height ?? 0)
    .toBeGreaterThanOrEqual(44);
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await progressReadButton.click();
  const playback = composer.getByRole('region', { name: 'Read aloud controls' });
  await expect(playback).toContainText('Progress update');
  await expect
    .poll(() => page.evaluate(() => window.__speechHarness.currentText()))
    .toContain('I am still checking the workspace.');
  await expect(
    progressMessage.locator('.codex-chat-message__speech-word[aria-current="true"]'),
  ).toHaveText('I');
  await playback.getByRole('button', { name: 'Stop reading', exact: true }).click();
  await expect(progressReadButton).toBeVisible();
  await expect
    .poll(() => composer.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBeLessThanOrEqual(1);
  const accessibility = await new AxeBuilder({ page }).include('.codex-chat-dialog').analyze();
  expect(accessibility.violations).toEqual([]);
});

test('keeps the initial Read action visible and active playback docked across viewports', async ({
  page,
}) => {
  const longReply = Array.from(
    { length: 36 },
    (_, index) =>
      `Review note ${index + 1}. This completed Codex reply is deliberately long enough to scroll while its compact reading controls remain available.`,
  ).join('\n\n');
  await showCompletedSpeechReply(page, longReply, 'speech-dock-reply');

  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  const transcript = composer.locator('.codex-chat-transcript');
  const log = composer.getByRole('log', { name: 'Codex chat log' });
  const reply = composer.locator('.codex-chat-message--assistant', {
    hasText: 'Review note 1.',
  });
  const readButton = reply.getByRole('button', {
    name: 'Read Codex reply',
    exact: true,
  });

  await expect(readButton).toBeVisible();
  await expect
    .poll(async () => (await readButton.boundingBox())?.height ?? 0)
    .toBeGreaterThanOrEqual(44);
  await readButton.click();

  const dock = transcript.locator('.codex-speech-dock');
  await expect(dock).toBeVisible();
  await log.evaluate((element) => {
    element.scrollTop = Math.max(1, (element.scrollHeight - element.clientHeight) / 2);
  });
  await expect.poll(() => log.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect(dock).toBeVisible();

  const [transcriptBox, dockBox] = await Promise.all([
    transcript.boundingBox(),
    dock.boundingBox(),
  ]);
  expect(transcriptBox).not.toBeNull();
  expect(dockBox).not.toBeNull();
  expect(dockBox.y).toBeGreaterThanOrEqual(transcriptBox.y - 1);
  expect(dockBox.y).toBeLessThanOrEqual(transcriptBox.y + 12);
  expect(dockBox.x).toBeGreaterThanOrEqual(transcriptBox.x - 1);
  expect(dockBox.x + dockBox.width).toBeLessThanOrEqual(transcriptBox.x + transcriptBox.width + 1);

  const controlHeights = await dock
    .getByRole('button')
    .evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height));
  expect(controlHeights.length).toBeGreaterThan(0);
  expect(controlHeights.every((height) => height >= 44)).toBe(true);
  await expect
    .poll(() => transcript.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBeLessThanOrEqual(1);
  await expect
    .poll(() => dock.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBeLessThanOrEqual(1);
});

test('keeps device-voice controls usable at the compact 320px viewport', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  const reply = composer.locator('.codex-chat-message--assistant', {
    hasText: 'Studio chat is connected.',
  });

  await reply.getByRole('button', { name: 'Read Codex reply', exact: true }).click();
  const playback = composer.getByRole('region', { name: 'Read aloud controls' });
  const pauseButton = playback.getByRole('button', { name: 'Pause reading', exact: true });
  await expect(pauseButton).toBeVisible();
  expect((await pauseButton.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await expect(playback.getByRole('button', { name: 'Stop reading', exact: true })).toBeVisible();
  await expect(
    playback.getByRole('progressbar', { name: 'Estimated reading progress' }),
  ).toBeVisible();
  await expect(playback.getByText(/^\d+:\d{2} \/ about \d+:\d{2}$/)).toBeVisible();
  await expect
    .poll(() => composer.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBeLessThanOrEqual(1);
  await expect(playback).toHaveScreenshot('codex-device-voice-reading-320-controls.png');
  await expect(composer).toHaveScreenshot('codex-device-voice-reading-320.png');

  const accessibility = await new AxeBuilder({ page }).include('.codex-chat-dialog').analyze();
  expect(accessibility.violations).toEqual([]);
});

test('starts, pauses, resumes, and stops device-voice reading', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const reply = page.locator('.codex-chat-message--assistant', {
    hasText: 'Studio chat is connected.',
  });

  await reply.getByRole('button', { name: 'Read Codex reply', exact: true }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  const playback = composer.getByRole('region', { name: 'Read aloud controls' });
  await expect(playback.getByRole('button', { name: 'Pause reading', exact: true })).toBeVisible();
  await expect(
    playback.getByRole('progressbar', { name: 'Estimated reading progress' }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__speechHarness.currentText()))
    .toContain('Studio chat is connected.');
  await expect
    .poll(() => composer.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBeLessThanOrEqual(1);
  await expect(playback).toHaveScreenshot('codex-device-voice-reading.png');
  const playingAccessibility = await new AxeBuilder({ page })
    .include('.codex-chat-dialog')
    .analyze();
  expect(playingAccessibility.violations).toEqual([]);

  const cancelCountBeforePause = await page.evaluate(
    () => window.__speechHarness.events.filter((event) => event.type === 'cancel').length,
  );
  await playback.getByRole('button', { name: 'Pause reading', exact: true }).click();
  await expect(playback.getByRole('button', { name: 'Resume reading', exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__speechHarness.events.filter((event) => event.type === 'cancel').length,
      ),
    )
    .toBeGreaterThan(cancelCountBeforePause);

  const speakCountBeforeResume = await page.evaluate(
    () => window.__speechHarness.events.filter((event) => event.type === 'speak').length,
  );
  await playback.getByRole('button', { name: 'Resume reading', exact: true }).click();
  await expect(playback.getByRole('button', { name: 'Pause reading', exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__speechHarness.events.filter((event) => event.type === 'speak').length,
      ),
    )
    .toBeGreaterThan(speakCountBeforeResume);

  const cancelCountBeforeStop = await page.evaluate(
    () => window.__speechHarness.events.filter((event) => event.type === 'cancel').length,
  );
  await playback.getByRole('button', { name: 'Stop reading', exact: true }).click();
  await expect(reply.getByRole('button', { name: 'Read Codex reply', exact: true })).toBeVisible();
  await expect(playback).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__speechHarness.events.filter((event) => event.type === 'cancel').length,
      ),
    )
    .toBeGreaterThan(cancelCountBeforeStop);
});

test('tracks estimated reading seconds, freezes while paused, and resets after stop', async ({
  page,
}) => {
  const timelineReply = Array.from(
    { length: 5 },
    () =>
      'The device voice reads this complete sentence while the visible timeline reports an honest estimated duration.',
  ).join(' ');
  await page.route('**/__made-solid/codex-status*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ready',
        detail: 'Connected to the local Codex conversation.',
        thread: { id: 'thread-speech-timeline', name: 'Speech timeline', status: 'idle' },
        threads: [{ id: 'thread-speech-timeline', name: 'Speech timeline', status: 'idle' }],
        messages: [{ id: 'speech-timeline', role: 'assistant', text: timelineReply }],
        agents: [],
        queuedCount: 0,
        queuedMessages: [],
        models: [
          {
            id: 'gpt-5.6-sol',
            label: 'GPT-5.6-Sol',
            defaultEffort: 'medium',
            isDefault: true,
            supportsImages: true,
            efforts: [{ id: 'medium', description: 'Balanced reasoning' }],
            serviceTiers: [],
          },
        ],
      }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const reply = page.locator('.codex-chat-message--assistant', { hasText: timelineReply });
  await reply.getByRole('button', { name: 'Read Codex reply', exact: true }).click();

  let playback = page.getByRole('region', { name: 'Read aloud controls' });
  const progress = playback.getByRole('progressbar', { name: 'Estimated reading progress' });
  const visibleTimeline = playback.getByText(/^\d+:\d{2} \/ about \d+:\d{2}$/);
  await expect(progress).toHaveAttribute('aria-valuemin', '0');
  await expect(progress).toHaveAttribute('aria-valuetext', /^\d+:\d{2} of about \d+:\d{2}$/);
  await expect(visibleTimeline).toBeVisible();
  const estimatedTotal = Number(await progress.getAttribute('aria-valuemax'));
  expect(estimatedTotal).toBeGreaterThan(1);
  await expect
    .poll(async () => Number(await progress.getAttribute('aria-valuenow')))
    .toBeGreaterThan(0);

  await playback.getByRole('button', { name: 'Pause reading', exact: true }).click();
  const pausedElapsed = await progress.getAttribute('aria-valuenow');
  const pausedTimeline = await visibleTimeline.textContent();
  await page.waitForTimeout(1_200);
  await expect(progress).toHaveAttribute('aria-valuenow', pausedElapsed);
  await expect(visibleTimeline).toHaveText(pausedTimeline);

  await playback.getByRole('button', { name: 'Resume reading', exact: true }).click();
  await expect
    .poll(async () => Number(await progress.getAttribute('aria-valuenow')))
    .toBeGreaterThan(Number(pausedElapsed));

  await playback.getByRole('button', { name: 'Stop reading', exact: true }).click();
  await expect(progress).toHaveCount(0);
  await expect(visibleTimeline).toHaveCount(0);
  await reply.getByRole('button', { name: 'Read Codex reply', exact: true }).click();
  playback = page.getByRole('region', { name: 'Read aloud controls' });
  const restartedProgress = playback.getByRole('progressbar', {
    name: 'Estimated reading progress',
  });
  await expect(restartedProgress).toHaveAttribute('aria-valuenow', '0');
  await expect(restartedProgress).toHaveAttribute('aria-valuetext', /^0:00 of about \d+:\d{2}$/);
});

test('selects an English device voice even when the browser default voice is not English', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const reply = page.locator('.codex-chat-message--assistant', {
    hasText: 'Studio chat is connected.',
  });

  await reply.getByRole('button', { name: 'Read Codex reply', exact: true }).click();

  const spoken = await page.evaluate(() =>
    window.__speechHarness.events.findLast((event) => event.type === 'speak'),
  );
  expect(spoken.lang).toMatch(/^en(?:-|$)/i);
  expect(spoken.voiceLang).toMatch(/^en(?:-|$)/i);
  expect(spoken.voiceName).toBe('Playwright device voice');
  expect(spoken.rate).toBe(0.94);
});

test('speaks every chunk before completing and ignores stale utterance end events', async ({
  page,
}) => {
  const sentence =
    'This completed reply explains the captured evidence, the design decision, and the practical next action for the reviewer.';
  const longReply = Array.from({ length: 12 }, (_, index) => `${index + 1}. ${sentence}`).join(
    '\n\n',
  );
  await page.route('**/__made-solid/codex-status*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ready',
        detail: 'Connected to the local Codex conversation.',
        thread: { id: 'thread-chunked-speech', name: 'Speech review', status: 'idle' },
        threads: [{ id: 'thread-chunked-speech', name: 'Speech review', status: 'idle' }],
        messages: [
          { id: 'speech-stale', role: 'assistant', text: 'This older reply will be replaced.' },
          { id: 'speech-long', role: 'assistant', text: longReply },
        ],
        agents: [],
        queuedCount: 0,
        queuedMessages: [],
        models: [
          {
            id: 'gpt-5.6-sol',
            label: 'GPT-5.6-Sol',
            defaultEffort: 'medium',
            isDefault: true,
            supportsImages: true,
            efforts: [{ id: 'medium', description: 'Balanced reasoning' }],
            serviceTiers: [],
          },
        ],
      }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const staleReply = page.locator('.codex-chat-message--assistant', {
    hasText: 'This older reply will be replaced.',
  });
  const longReplyMessage = page.locator('.codex-chat-message--assistant', {
    hasText: sentence,
  });

  await staleReply.getByRole('button', { name: 'Read Codex reply', exact: true }).click();
  const staleUtteranceIndex = await page.evaluate(
    () => window.__speechHarness.utteranceCount() - 1,
  );
  await longReplyMessage.getByRole('button', { name: 'Read Codex reply', exact: true }).click();
  const playback = page.getByRole('region', { name: 'Read aloud controls' });
  const activeProgress = playback.getByRole('progressbar', {
    name: 'Estimated reading progress',
  });
  await expect(activeProgress).toBeVisible();
  const activeTextBeforeStaleEnd = await page.evaluate(() => window.__speechHarness.currentText());
  const speakCountBeforeStaleEnd = await page.evaluate(
    () => window.__speechHarness.events.filter((event) => event.type === 'speak').length,
  );

  await page.evaluate(
    (index) => window.__speechHarness.finishUtterance(index),
    staleUtteranceIndex,
  );

  await expect(playback.getByRole('button', { name: 'Pause reading', exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.__speechHarness.currentText())).toBe(
    activeTextBeforeStaleEnd,
  );
  expect(
    await page.evaluate(
      () => window.__speechHarness.events.filter((event) => event.type === 'speak').length,
    ),
  ).toBe(speakCountBeforeStaleEnd);

  for (let completedChunks = 0; completedChunks < 20; completedChunks += 1) {
    const readButton = longReplyMessage.getByRole('button', {
      name: 'Read Codex reply',
      exact: true,
    });
    if (await readButton.isVisible()) break;
    const utteranceCountBeforeEnd = await page.evaluate(() =>
      window.__speechHarness.utteranceCount(),
    );
    await page.evaluate(() => window.__speechHarness.finishCurrent());
    await expect
      .poll(async () => {
        if (await readButton.isVisible()) return true;
        return (
          (await page.evaluate(() => window.__speechHarness.utteranceCount())) >
          utteranceCountBeforeEnd
        );
      })
      .toBe(true);
  }

  await expect(
    longReplyMessage.getByRole('button', { name: 'Read Codex reply', exact: true }),
  ).toBeVisible();
  await expect(longReplyMessage.getByRole('button', { name: 'Stop reading' })).toHaveCount(0);
  await expect(activeProgress).toHaveCount(0);
  const spokenChunks = await page.evaluate(() =>
    window.__speechHarness.events
      .filter(
        (event) => event.type === 'speak' && event.text !== 'This older reply will be replaced.',
      )
      .map((event) => event.text),
  );
  expect(spokenChunks.length).toBeGreaterThan(1);
  expect(spokenChunks.join(' ').match(/This completed reply explains/g)).toHaveLength(12);
});

test('replaces the active reply when another completed reply starts reading', async ({ page }) => {
  await page.route('**/__made-solid/codex-status*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ready',
        detail: 'Connected to the local Codex conversation.',
        thread: { id: 'thread-replace-speech', name: 'Speech review', status: 'idle' },
        threads: [{ id: 'thread-replace-speech', name: 'Speech review', status: 'idle' }],
        messages: [
          { id: 'speech-first', role: 'assistant', text: 'This is the first completed reply.' },
          { id: 'speech-second', role: 'assistant', text: 'This is the second completed reply.' },
        ],
        agents: [],
        queuedCount: 0,
        queuedMessages: [],
        models: [
          {
            id: 'gpt-5.6-sol',
            label: 'GPT-5.6-Sol',
            defaultEffort: 'medium',
            isDefault: true,
            supportsImages: true,
            efforts: [{ id: 'medium', description: 'Balanced reasoning' }],
            serviceTiers: [],
          },
        ],
      }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const firstReply = page.locator('.codex-chat-message--assistant', {
    hasText: 'This is the first completed reply.',
  });
  const secondReply = page.locator('.codex-chat-message--assistant', {
    hasText: 'This is the second completed reply.',
  });
  await firstReply.getByRole('button', { name: 'Read Codex reply', exact: true }).click();
  const cancelCountBeforeReplacement = await page.evaluate(
    () => window.__speechHarness.events.filter((event) => event.type === 'cancel').length,
  );

  await secondReply.getByRole('button', { name: 'Read Codex reply', exact: true }).click();

  await expect(
    firstReply.getByRole('button', { name: 'Read Codex reply', exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('region', { name: 'Read aloud controls' })
      .getByRole('button', { name: 'Pause reading', exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__speechHarness.events.filter((event) => event.type === 'cancel').length,
      ),
    )
    .toBeGreaterThan(cancelCountBeforeReplacement);
  await expect
    .poll(() => page.evaluate(() => window.__speechHarness.currentText()))
    .toContain('This is the second completed reply.');
});

test('stops device-voice reading when the chat closes or changes conversation', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  const firstReply = composer.locator('.codex-chat-message--assistant', {
    hasText: 'Studio chat is connected.',
  });
  await firstReply.getByRole('button', { name: 'Read Codex reply', exact: true }).click();
  const cancelCountBeforeSwitch = await page.evaluate(
    () => window.__speechHarness.events.filter((event) => event.type === 'cancel').length,
  );

  await composer.getByRole('button', { name: 'Conversation', exact: true }).click();
  await composer.getByRole('menuitemradio', { name: /Review the earlier homepage\./ }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__speechHarness.events.filter((event) => event.type === 'cancel').length,
      ),
    )
    .toBeGreaterThan(cancelCountBeforeSwitch);

  const earlierReply = composer.locator('.codex-chat-message--assistant', {
    hasText: 'The earlier review is complete.',
  });
  await earlierReply.getByRole('button', { name: 'Read Codex reply', exact: true }).click();
  const cancelCountBeforeClose = await page.evaluate(
    () => window.__speechHarness.events.filter((event) => event.type === 'cancel').length,
  );
  await composer.getByRole('button', { name: 'Close Codex chat', exact: true }).click();
  await expect(composer).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__speechHarness.events.filter((event) => event.type === 'cancel').length,
      ),
    )
    .toBeGreaterThan(cancelCountBeforeClose);
});

for (const working of [false, true]) {
  test(`preserves a manual transcript position while Codex is ${working ? 'working' : 'idle'}`, async ({
    page,
  }) => {
    let appendLatestMessage = false;
    const messages = Array.from({ length: 24 }, (_, index) => ({
      id: `scroll-message-${index + 1}`,
      role: index % 2 ? 'assistant' : 'user',
      text: `Conversation entry ${index + 1}. This is enough realistic transcript content to require deliberate scrolling without truncating the saved response.`,
    }));
    await page.route('**/__made-solid/codex-status*', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ready',
          detail: 'Connected to the local Codex conversation.',
          thread: {
            id: 'thread-scroll',
            name: 'Long implementation review',
            status: working ? 'active' : 'idle',
            working,
            activeFlags: working ? ['turn'] : [],
            workingStartedAt: working ? Math.floor(Date.now() / 1_000) - 15 : undefined,
          },
          threads: [
            {
              id: 'thread-scroll',
              name: 'Long implementation review',
              status: working ? 'active' : 'idle',
              working,
            },
          ],
          messages: appendLatestMessage
            ? [
                ...messages,
                {
                  id: 'scroll-message-latest',
                  role: 'assistant',
                  text: 'New output arrived without moving the transcript.',
                },
              ]
            : messages,
          queuedCount: 0,
          queuedMessages: [],
          models: [
            {
              id: 'gpt-5.6-sol',
              label: 'GPT-5.6-Sol',
              defaultEffort: 'medium',
              isDefault: true,
              supportsImages: true,
              efforts: [{ id: 'medium', description: 'Balanced reasoning' }],
            },
          ],
        }),
      });
    });

    await page.goto('/');
    await page
      .getByRole('button', { name: working ? 'Codex is working' : 'Chat with Codex' })
      .click();
    const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
    const log = composer.getByRole('log', { name: 'Codex chat log' });
    const composerSurface = composer.getByRole('region', { name: 'Message composer' });
    const messageInput = composer.getByLabel('Message to Codex');
    await expect(composerSurface).toHaveClass(/is-collapsed/);
    await expect.poll(() => messageInput.evaluate((element) => element.clientHeight)).toBe(44);
    await messageInput.click();
    await messageInput.fill('Keep this draft while I review earlier messages.');
    await expect(composerSurface).toHaveClass(/is-expanded/);
    await expect
      .poll(() => log.evaluate((element) => element.scrollHeight > element.clientHeight))
      .toBe(true);
    await expect
      .poll(() =>
        log.evaluate(
          (element) => element.scrollHeight - element.clientHeight - element.scrollTop <= 12,
        ),
      )
      .toBe(true);

    await log.evaluate((element) => element.scrollTo({ top: 0, behavior: 'instant' }));
    await expect(composerSurface).toHaveClass(/is-collapsed/);
    await expect(messageInput).toHaveValue('Keep this draft while I review earlier messages.');
    await expect.poll(() => messageInput.evaluate((element) => element.clientHeight)).toBe(44);
    const latestButton = composer.getByRole('button', { name: 'Back to latest' });
    await expect(latestButton).toBeVisible();
    const latestButtonBounds = await latestButton.boundingBox();
    expect(latestButtonBounds?.height).toBeGreaterThanOrEqual(44);
    expect(latestButtonBounds?.width).toBeGreaterThanOrEqual(44);
    const anchoredScrollTop = await log.evaluate((element) => element.scrollTop);
    appendLatestMessage = true;
    await expect(log).toContainText('New output arrived without moving the transcript.', {
      timeout: 7_000,
    });
    await expect.poll(() => log.evaluate((element) => element.scrollTop)).toBe(anchoredScrollTop);
    await expect(latestButton).toBeVisible();

    if (!working) {
      await expect(composer).toHaveScreenshot('codex-chat-scrolled-up.png');
      const accessibility = await new AxeBuilder({ page }).include('.codex-chat-dialog').analyze();
      expect(accessibility.violations).toEqual([]);
    }

    await messageInput.click();
    await expect(composerSurface).toHaveClass(/is-expanded/);
    await expect.poll(() => messageInput.evaluate((element) => element.clientHeight)).toBe(112);

    await latestButton.focus();
    await page.keyboard.press('Enter');
    await expect(latestButton).toBeHidden();
    await expect
      .poll(() =>
        log.evaluate(
          (element) => element.scrollHeight - element.clientHeight - element.scrollTop <= 1,
        ),
      )
      .toBe(true);
  });
}

test('restores the open conversation and exact transcript position after refresh', async ({
  page,
}) => {
  const statusThreadIds = [];
  const threadMessages = (threadId) =>
    Array.from({ length: 28 }, (_, index) => ({
      id: `${threadId}-message-${index + 1}`,
      role: index % 2 ? 'assistant' : 'user',
      text: `${threadId} conversation entry ${index + 1}. This saved response is deliberately long enough to provide a stable transcript reading position across a full Studio refresh.`,
    }));
  await page.route('**/__made-solid/codex-status*', async (route) => {
    const requestedThreadId =
      new URL(route.request().url()).searchParams.get('threadId') || 'thread-1';
    statusThreadIds.push(requestedThreadId);
    const thread = {
      id: requestedThreadId,
      name: requestedThreadId === 'thread-2' ? 'Saved redesign review' : 'Studio',
      status: 'idle',
      working: false,
    };
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ready',
        detail: 'Connected to the local Codex conversation.',
        thread,
        threads: [
          { id: 'thread-1', name: 'Studio', status: 'idle', working: false },
          { id: 'thread-2', name: 'Saved redesign review', status: 'idle', working: false },
        ],
        messages: threadMessages(requestedThreadId),
        agents: [],
        queuedCount: 0,
        queuedMessages: [],
        models: [
          {
            id: 'gpt-5.6-sol',
            label: 'GPT-5.6-Sol',
            defaultEffort: 'medium',
            isDefault: true,
            supportsImages: true,
            serviceTiers: [],
            efforts: [{ id: 'medium', description: 'Balanced reasoning' }],
          },
        ],
      }),
    });
  });

  const workspaceRoute = '/#/prospects/business-demo-local-services/report-preview';
  await page.goto(workspaceRoute);
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  let composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await composer.getByRole('button', { name: 'Conversation', exact: true }).click();
  await composer.getByRole('menuitemradio', { name: /Saved redesign review/ }).click();
  let log = composer.getByRole('log', { name: 'Codex chat log' });
  await expect(log).toContainText('thread-2 conversation entry 28');
  await expect
    .poll(() => log.evaluate((element) => element.scrollHeight > element.clientHeight))
    .toBe(true);
  await log.evaluate((element) => element.scrollTo({ top: 520, behavior: 'instant' }));
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem('made-solid-codex-chat-session-v1') || '{}'),
      ),
    )
    .toMatchObject({
      isOpen: true,
      positions: { 'thread-2': { followingLatest: false, scrollTop: 520 } },
      selectedThreadId: 'thread-2',
    });

  const savedViewport = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('made-solid-codex-chat-session-v1') || '{}').positions[
        'thread-2'
      ],
  );

  const requestCountBeforeReload = statusThreadIds.length;
  await page.reload();
  await expect(page).toHaveURL(new RegExp(`${workspaceRoute.replaceAll('/', '\\/')}$`));
  composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await expect(composer).toBeVisible();
  await expect(composer.getByText('Saved redesign review', { exact: true })).toBeVisible();
  log = composer.getByRole('log', { name: 'Codex chat log' });
  await expect(log).toContainText('thread-2 conversation entry 28');
  await expect.poll(() => statusThreadIds.slice(requestCountBeforeReload)[0]).toBe('thread-2');
  await expect
    .poll(() =>
      log.evaluate((element) => {
        const top = element.getBoundingClientRect().top;
        const anchor = [...element.querySelectorAll('[data-message-id], [data-activity-id]')].find(
          (candidate) => candidate.getBoundingClientRect().bottom > top,
        );
        return anchor?.dataset.messageId || anchor?.dataset.activityId;
      }),
    )
    .toBe(savedViewport.anchorId);
  await expect
    .poll(() =>
      log.evaluate((element, savedOffset) => {
        const top = element.getBoundingClientRect().top;
        const anchor = [...element.querySelectorAll('[data-message-id], [data-activity-id]')].find(
          (candidate) => candidate.getBoundingClientRect().bottom > top,
        );
        return Math.abs((anchor ? anchor.getBoundingClientRect().top - top : 0) - savedOffset);
      }, savedViewport.anchorOffset),
    )
    .toBeLessThanOrEqual(4);
  await expect.poll(() => log.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect(composer.getByRole('button', { name: 'Back to latest' })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);

  await composer.getByRole('button', { name: 'Close Codex chat' }).click();
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Codex', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Chat with Codex' })).toBeVisible();
});

test('creates a new Codex conversation with the selected model and reasoning', async ({ page }) => {
  let createRequest;
  let deletedThreadId;
  let createdThread;
  let releaseCreate;
  const createReady = new Promise((resolve) => {
    releaseCreate = resolve;
  });
  let unselectedStatusRequests = 0;
  await page.route('**/__made-solid/codex-feedback', async (route) => {
    const request = route.request().postDataJSON();
    if (request.action === 'delete-empty-thread') {
      deletedThreadId = request.threadId;
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'deleted', deleted: true }),
      });
      return;
    }
    createRequest = request;
    createdThread = { id: 'thread-new', status: 'idle', discardable: true };
    await createReady;
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ready',
        detail: 'New Codex conversation created.',
        thread: createdThread,
      }),
    });
  });
  await page.route('**/__made-solid/codex-status*', async (route) => {
    const selectedThreadId = new URL(route.request().url()).searchParams.get('threadId');
    if (!selectedThreadId) {
      unselectedStatusRequests += 1;
      if (unselectedStatusRequests === 2) await new Promise((resolve) => setTimeout(resolve, 500));
      return route.fallback();
    }
    if (selectedThreadId !== createdThread?.id) return route.fallback();
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ready',
        detail: 'Connected to the local Codex conversation.',
        thread: createdThread,
        threads: [
          createdThread,
          { id: 'thread-1', name: 'Studio', status: 'idle', discardable: false },
        ],
        messages: [],
        queuedCount: 0,
        interruptingCount: 0,
        queuedMessages: [],
        models: [
          {
            id: 'gpt-5.6-terra',
            label: 'GPT-5.6-Terra',
            defaultEffort: 'medium',
            efforts: [{ id: 'high', description: 'High' }],
            supportsImages: true,
          },
        ],
      }),
    });
  });
  await page.goto('/?codexActivityHistory=1');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await openRunSettings(composer);
  await composer.getByLabel('Model').selectOption('gpt-5.6-terra');
  await composer.getByLabel('Reasoning').selectOption('high');
  await composer.getByRole('button', { name: 'New chat' }).click();
  const loading = composer.locator('.codex-conversation-loading');
  await expect(loading).toBeVisible();
  await expect(loading).toContainText('Starting a new chat');
  await expect(loading).toContainText('Preparing a fresh Codex workspace');
  await expect(composer.getByRole('log', { name: 'Codex chat log' })).not.toContainText(
    'Studio chat is connected.',
  );
  await expect(composer.getByRole('button', { name: 'New chat' })).toBeDisabled();
  await expect(composer.getByLabel('Message to Codex')).toBeDisabled();
  releaseCreate();
  await expect(composer.getByRole('button', { name: 'New chat' })).toBeEnabled();
  await expect(composer.getByRole('button', { name: 'Conversation' })).toContainText('New chat');
  await expect(composer.getByRole('log', { name: 'Codex chat log' })).toContainText(
    'No messages are saved in this conversation.',
  );
  await expect(composer.locator('.codex-chat-activity')).toHaveCount(0);
  await page.waitForTimeout(750);
  await expect(composer.getByRole('button', { name: 'Conversation' })).toContainText('New chat');
  await expect(composer.getByRole('log', { name: 'Codex chat log' })).toContainText(
    'No messages are saved in this conversation.',
  );
  expect(createRequest).toEqual({
    action: 'new-thread',
    model: 'gpt-5.6-terra',
    effort: 'high',
    serviceTier: 'default',
    threadScope: 'universal',
  });
  await composer.getByRole('button', { name: 'Conversation' }).click();
  await composer.getByRole('menuitemradio', { name: /^Studio/ }).click();
  await expect.poll(() => deletedThreadId).toBe('thread-new');
});

test('creates a new conversation while another chat keeps working', async ({ page }) => {
  const newThread = { id: 'thread-new-working', status: 'idle', discardable: true };
  await page.route('**/__made-solid/codex-feedback', async (route) => {
    const request = route.request().postDataJSON();
    if (request.action !== 'new-thread') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ready', thread: newThread }),
    });
  });
  await page.route('**/__made-solid/codex-status*', async (route) => {
    const selectedThreadId = new URL(route.request().url()).searchParams.get('threadId');
    if (selectedThreadId !== newThread.id) {
      await route.fallback();
      return;
    }
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ready',
        detail: 'Connected to the local Codex conversation.',
        thread: newThread,
        threads: [newThread],
        messages: [],
        activities: [],
        agents: [],
        queuedCount: 0,
        queuedMessages: [],
        models: [
          {
            id: 'gpt-5.6-sol',
            label: 'GPT-5.6-Sol',
            defaultEffort: 'medium',
            isDefault: true,
            supportsImages: true,
            efforts: [{ id: 'medium', description: 'Balanced reasoning' }],
            serviceTiers: [],
          },
        ],
      }),
    });
  });
  await page.goto('/?codexWorking=1');
  await page.getByRole('button', { name: 'Codex is working' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await composer.getByRole('button', { name: 'New chat' }).click();

  await expect(composer.getByRole('button', { name: 'Conversation' })).toContainText('New chat');
  await expect(composer.getByRole('log', { name: 'Codex chat log' })).toContainText(
    'No messages are saved in this conversation.',
  );
  await expect(composer.getByRole('alert')).not.toContainText(
    'That conversation could not be loaded',
  );
});

test('deletes a saved conversation from the conversation picker after confirmation', async ({
  page,
}) => {
  let deletionRequest;
  await page.route('**/__made-solid/codex-feedback', async (route) => {
    deletionRequest = route.request().postDataJSON();
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'deleted', deleted: true, detail: 'Conversation deleted.' }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await composer.getByRole('button', { name: 'Conversation' }).click();
  await composer.getByRole('menuitemradio', { name: /^Review the earlier homepage/ }).click();
  await expect(composer.getByRole('button', { name: 'Conversation' })).toContainText(
    'Review the earlier homepage',
  );
  await composer.getByRole('button', { name: 'Conversation' }).click();
  await composer.getByRole('menuitem', { name: 'Delete Review the earlier homepage' }).click();

  const confirmation = page.getByRole('dialog', { name: 'Delete this chat?' });
  await expect(confirmation).toContainText('Review the earlier homepage');
  await expect(confirmation).toHaveScreenshot('codex-conversation-delete-confirmation.png');
  await confirmation.getByRole('button', { name: 'Delete chat' }).click();
  await expect(confirmation).toBeHidden();
  expect(deletionRequest).toEqual({
    action: 'delete-thread',
    threadId: 'thread-2',
    threadScope: 'universal',
  });
  await expect(composer.getByRole('button', { name: 'Conversation' })).toContainText(
    'Open the Studio chat',
  );

  await composer.getByRole('button', { name: 'Conversation' }).click();
  await expect(
    composer.getByRole('menuitemradio', { name: /^Review the earlier homepage/ }),
  ).toHaveCount(0);
  const accessibility = await new AxeBuilder({ page }).include('.codex-chat-dialog').analyze();
  expect(accessibility.violations).toEqual([]);
});

test('refreshes a loading Codex conversation as soon as the page resumes', async ({ page }) => {
  let resumed = false;
  let statusRequests = 0;
  await page.route('**/__made-solid/codex-status*', async (route) => {
    statusRequests += 1;
    if (!resumed) return route.fallback();
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ready',
        detail: 'Connected to the local Codex conversation.',
        thread: { id: 'thread-1', name: 'Studio', status: 'idle', working: false },
        threads: [{ id: 'thread-1', name: 'Studio', status: 'idle', working: false }],
        messages: [
          { id: 'current-user', role: 'user', text: 'Open the Studio chat.' },
          {
            id: 'resumed-codex',
            role: 'assistant',
            phase: 'final_answer',
            text: 'The resumed work is now complete.',
          },
        ],
        activities: [],
        agents: [],
        queuedCount: 0,
        queuedMessages: [],
        models: [
          {
            id: 'gpt-5.6-sol',
            label: 'GPT-5.6-Sol',
            defaultEffort: 'medium',
            isDefault: true,
            supportsImages: true,
            efforts: [{ id: 'medium', description: 'Balanced reasoning' }],
            serviceTiers: [],
          },
        ],
      }),
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await expect(composer).toContainText('Studio chat is connected.');
  const requestsBeforeResume = statusRequests;
  resumed = true;
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect.poll(() => statusRequests).toBeGreaterThan(requestsBeforeResume);
  await expect(composer).toContainText('The resumed work is now complete.');
});

test('coalesces slow Codex status polls instead of stacking reconnect work', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'desktop',
    'Status request coalescing is viewport-independent.',
  );
  let activeRequests = 0;
  let maximumActiveRequests = 0;
  let statusRequests = 0;
  await page.route('**/__made-solid/codex-status*', async (route) => {
    statusRequests += 1;
    activeRequests += 1;
    maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
    await new Promise((resolve) => setTimeout(resolve, 1_300));
    await route.fallback();
    activeRequests -= 1;
  });

  await page.goto('/?codexWorking=1');
  await expect.poll(() => statusRequests, { timeout: 6_000 }).toBeGreaterThan(1);
  expect(maximumActiveRequests).toBe(1);
});

test('offers Astra with only its catalogue-provided reasoning and Fast controls', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await openRunSettings(composer);
  const model = composer.getByLabel('Model');
  await expect(model).toContainText('GPT-6 Astra · new');
  await model.selectOption('gpt-6-astra');
  await expect(composer.getByLabel('Reasoning')).toHaveValue('medium');
  await composer.getByLabel('Reasoning').selectOption('max');
  await expect(composer.getByLabel('Reasoning')).toHaveValue('max');
  await composer.getByRole('button', { name: 'Run setup' }).click();
  await openChatSettings(composer);
  const fast = composer.getByRole('button', { name: /^Fast/ });
  await expect(fast).toBeEnabled();
  await expect(fast).toContainText('2x speed, increased usage');
});

test('keeps the selected model, reasoning, and Fast preference after reopen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  let composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await openRunSettings(composer);
  await composer.getByLabel('Model').selectOption('gpt-5.6-terra');
  await composer.getByLabel('Reasoning').selectOption('high');
  await composer.getByRole('button', { name: 'Run setup' }).click();
  await openChatSettings(composer);
  await composer.getByRole('button', { name: /^Fast/ }).click();
  await composer.getByRole('button', { name: 'Close chat settings' }).click();
  await composer.getByRole('button', { name: 'Close Codex chat' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await openRunSettings(composer);
  await expect(composer.getByLabel('Model')).toHaveValue('gpt-5.6-terra');
  await expect(composer.getByLabel('Reasoning')).toHaveValue('high');
  await composer.getByRole('button', { name: 'Run setup' }).click();
  await openChatSettings(composer);
  await expect(composer.getByRole('button', { name: /^Fast/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('restores Codex chat settings after browser site data is cleared', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  let composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  const savedRequest = page.waitForRequest((request) => {
    if (!request.url().endsWith('/__made-solid/codex-preferences') || request.method() !== 'PUT')
      return false;
    return request.postDataJSON().preferences?.speechStyle === 'literal';
  });

  await openRunSettings(composer);
  await composer.getByLabel('Model').selectOption('gpt-5.6-terra');
  await composer.getByLabel('Reasoning').selectOption('high');
  await composer.getByRole('button', { name: /Agent team/ }).click();
  await openChatSettings(composer);
  await composer.getByRole('button', { name: /^Fast/ }).click();
  await composer.getByRole('checkbox', { name: 'Auto-read Codex' }).check();
  await composer.getByLabel('Reading style').selectOption('literal');
  await composer.getByLabel('Speed').selectOption('1.15');
  await savedRequest;

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await openRunSettings(composer);
  await expect(composer.getByLabel('Model')).toHaveValue('gpt-5.6-terra');
  await expect(composer.getByLabel('Reasoning')).toHaveValue('high');
  await expect(composer.getByRole('button', { name: /Agent team/ })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await openChatSettings(composer);
  await expect(composer.getByRole('button', { name: /^Fast/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(composer.getByRole('checkbox', { name: 'Auto-read Codex' })).toBeChecked();
  await expect(composer.getByLabel('Reading style')).toHaveValue('literal');
  await expect(composer.getByLabel('Speed')).toHaveValue('1.15');
});

test('keeps an unsent draft across Studio and preview workspaces until it is sent', async ({
  page,
}) => {
  await page.route('https://demo.supabase.co/functions/v1/siteforge-preview/**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        html: '<!doctype html><html><body><main><h1>Draft preview</h1></main></body></html>',
      }),
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const draft = 'Keep this unsent direction available in every workspace.';
  await page.getByLabel('Message to Codex').fill(draft);
  await expect(page.getByText(/Draft saved/)).toBeVisible();
  const source =
    'https://demo.supabase.co/functions/v1/siteforge-preview/capability/token/index.html';
  await page.goto(`/#/preview?source=${encodeURIComponent(source)}`);
  await expect(page.getByLabel('Message to Codex')).toHaveValue(draft);
});

test('stacks editable queued messages with exact interrupt and delete actions', async ({
  page,
}) => {
  const actions = [];
  await page.route('**/__made-solid/codex-feedback', async (route) => {
    actions.push(route.request().postDataJSON());
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'queued',
        detail: 'Queued message updated.',
      }),
    });
  });
  await page.goto('/?codexWorking=1');
  await page.getByRole('button', { name: 'Codex is working' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  const queuedCards = composer.locator('.codex-queued-message');
  await expect(queuedCards).toHaveCount(2);
  await queuedCards.first().getByRole('button', { name: 'Edit' }).click();
  await queuedCards
    .first()
    .getByLabel('Edit queued message')
    .fill('Use the revised nav direction.');
  await queuedCards.first().getByRole('button', { name: 'Save changes' }).click();
  await queuedCards.nth(1).getByRole('button', { name: 'Interrupt' }).click();
  await queuedCards.first().getByRole('button', { name: 'Delete' }).click();
  const confirmation = page.getByRole('dialog', { name: 'Delete queued message?' });
  await expect(confirmation).toContainText('before Codex receives it');
  await confirmation.getByRole('button', { name: 'Delete message' }).click();
  expect(actions).toEqual([
    {
      action: 'update-queued',
      id: '11111111-1111-4111-8111-111111111111',
      prompt: 'Use the revised nav direction.',
      threadScope: 'universal',
    },
    {
      action: 'interrupt-queued',
      id: '22222222-2222-4222-8222-222222222222',
      threadScope: 'universal',
    },
    {
      action: 'delete-queued',
      id: '11111111-1111-4111-8111-111111111111',
      threadScope: 'universal',
    },
  ]);
});

test('turns Stop into Send when a working chat receives text or an image', async ({ page }) => {
  const queuedRequests = [];
  await page.route('**/__made-solid/codex-feedback', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    queuedRequests.push(route.request().postDataJSON());
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'queued', id: `queued-${queuedRequests.length}` }),
    });
  });
  await page.goto('/?codexWorking=1#/settings');
  await page.getByRole('button', { name: 'Codex is working' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  const draft = composer.getByLabel('Message to Codex');
  await expect(composer.getByRole('button', { name: 'Stop Codex' })).toBeEnabled();

  await draft.fill('Queue this follow-up after the active turn.');
  await expect(composer.getByRole('button', { name: 'Stop Codex' })).toHaveCount(0);
  await composer.getByRole('button', { name: 'Send message' }).click();
  await expect.poll(() => queuedRequests.length).toBe(1);
  expect(queuedRequests[0]).toMatchObject({
    action: 'enqueue',
    prompt: 'Queue this follow-up after the active turn.',
    threadId: 'thread-1',
  });
  await expect(composer.getByRole('button', { name: 'Stop Codex' })).toBeEnabled();

  const uploadButton = composer.getByRole('button', { name: 'Upload photo from camera roll' });
  const [fileChooser] = await Promise.all([page.waitForEvent('filechooser'), uploadButton.click()]);
  await fileChooser.setFiles({
    name: 'queued-follow-up.png',
    mimeType: 'image/png',
    buffer: Buffer.from(capturePng.split(',')[1], 'base64'),
  });
  await expect(composer.getByRole('button', { name: 'Stop Codex' })).toHaveCount(0);
  await composer.getByRole('button', { name: 'Send message' }).click();
  await expect.poll(() => queuedRequests.length).toBe(2);
  expect(queuedRequests[1]).toMatchObject({
    action: 'enqueue',
    prompt: '',
    screenshots: [capturePng],
    threadId: 'thread-1',
  });
  await expect
    .poll(() => composer.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBeLessThanOrEqual(1);
});

test('never changes a pressed Stop into Send while completion status arrives', async ({ page }) => {
  const feedbackRequests = [];
  await page.route('**/__made-solid/codex-feedback', async (route) => {
    feedbackRequests.push(route.request().postDataJSON());
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'queued' }),
    });
  });
  await page.goto('/?codexWorking=1&codexAgents=1');
  await page.getByRole('button', { name: 'Codex is working' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  const stopButton = composer.getByRole('button', { name: 'Stop Codex' });
  const bounds = await stopButton.boundingBox();
  if (!bounds) throw new Error('The Stop Codex control must have visible bounds.');

  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.evaluate(() => window.history.replaceState({}, '', '/?codexAgents=1'));
  await expect(composer.getByRole('button', { name: 'Send message' })).toBeVisible({
    timeout: 3_000,
  });
  await page.mouse.up();

  await expect(composer.getByRole('button', { name: 'Stop Codex' })).toHaveCount(0);
  await expect(composer).not.toContainText('Choose an available Codex model and reasoning level.');
  expect(feedbackRequests).toEqual([]);
});

test('settles a slow working poll to the newer completed state', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'The status ordering is viewport-independent.');
  await page.goto('/?codexOutOfOrderStatus=1');
  await page
    .getByRole('button', { name: /Chat with Codex|Codex is working|Codex finished/ })
    .click({ timeout: 8_000 });
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await expect(composer.getByRole('button', { name: 'Send message' })).toBeVisible();
  await page.waitForTimeout(1_500);
  await expect(composer.getByRole('button', { name: 'Send message' })).toBeVisible();
  await expect(composer.getByRole('button', { name: 'Stop Codex' })).toHaveCount(0);
});

test('keeps Stop disabled when the running server does not advertise cancellation', async ({
  page,
}) => {
  await page.goto('/?codexWorking=1&noStopCapability=1');
  await page.getByRole('button', { name: 'Codex is working' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await expect(
    composer.getByRole('button', { name: 'Stop Codex unavailable until Studio reconnects' }),
  ).toBeDisabled();
  await expect(composer.getByRole('button', { name: 'Send message' })).toHaveCount(0);
});

test('summarises every conversation from its latest work in the chat chooser', async ({ page }) => {
  await page.goto('/?codexConciseTitles=1');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  const conversationPicker = composer.getByRole('button', { name: 'Conversation' });

  await expect(conversationPicker).toContainText("Summarise each chat's latest work");
  await expect(conversationPicker).not.toContainText('so I can identify it at a glance');
  const closedSelectorTitle = await conversationPicker.locator('strong').innerText();
  await conversationPicker.click();

  const menu = composer.getByRole('menu', { name: 'Available conversations' });
  const selectedMenuItem = menu.getByRole('menuitemradio', {
    name: /^Summarise each chat's latest work/,
  });
  await expect(selectedMenuItem).toBeVisible();
  await expect(selectedMenuItem.locator('strong')).toHaveText(closedSelectorTitle);
  await expect(
    menu.getByRole('menuitemradio', {
      name: /^Review Clientspace navigation/,
    }),
  ).toBeVisible();
  await expect(menu).not.toContainText('Captured from');
  await expect(menu).not.toContainText('because the old page labels are confusing');
  await expect.poll(async () => (await menu.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(300);
  expect(await menu.evaluate((element) => element.scrollWidth - element.clientWidth)).toBe(0);
  await expect(menu).toHaveScreenshot('codex-concise-current-work-titles.png', {
    animations: 'allow',
  });

  await conversationPicker.click();
  const latestRequest = composer.getByLabel('Your latest request');
  await expect(latestRequest).toContainText('Your latest');
  await expect(latestRequest).toContainText("every chat's title in the chat drop down");
  await expect(latestRequest).not.toContainText('Captured from');
  await expect(latestRequest).toHaveScreenshot('codex-compact-latest-request.png', {
    animations: 'allow',
  });
  await expect(composer).toHaveScreenshot('codex-latest-request-chat.png', {
    animations: 'allow',
  });

  const accessibility = await new AxeBuilder({ page }).include('.codex-chat-dialog').analyze();
  expect(accessibility.violations).toEqual([]);
});

test('shows real Codex working state, queued work, and a live elapsed timer', async ({ page }) => {
  await page.goto('/?codexWorking=1&codexEvidenceNarrative=1');
  await page.getByRole('button', { name: 'Codex is working' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  const workingState = composer.locator('.codex-working-status');
  const chatLog = composer.getByRole('log', { name: 'Codex chat log' });
  const activityRows = chatLog.locator('.codex-chat-activity');

  await expect(composer.getByLabel('Your latest request')).toContainText(
    'Check the hero spacing at desktop width.',
  );
  await expect(composer.getByRole('button', { name: 'Stop Codex' })).toBeEnabled();
  await expect(composer.getByRole('button', { name: 'Send message' })).toHaveCount(0);

  await expect(activityRows).toHaveCount(4);
  await expect(chatLog.locator('.codex-chat-activity-boundary')).toContainText(
    'Verified actions are logged in conversation order',
  );
  await expect(composer.locator('.codex-activity-workbench')).toHaveCount(0);
  await expect(
    activityRows.locator('button, a, summary, input, select, textarea, [tabindex]'),
  ).toHaveCount(0);
  const activity = (id) => chatLog.locator(`[data-activity-id="${id}"]`);
  await expect(activity('activity-search')).toContainText(
    'Opening workspace.madesolid.com.au/services',
  );
  await expect(activity('activity-search')).toContainText(
    'workspace.madesolid.com.au/services was opened for inspection',
  );
  await expect(activity('activity-files')).toContainText('Updated 2 files');
  await expect(activity('activity-files')).toContainText('2 file changes were saved');
  await expect(activity('activity-checks')).toContainText('Complete · 4.3 s');
  await expect(activity('activity-checks')).toContainText('Project checks completed successfully');
  await expect(activity('activity-browser')).toContainText('Running');
  await expect(activity('activity-browser')).toContainText('browser review is still running');
  await expect(chatLog).not.toContainText(
    /reasoning tokens|raw terminal|safe to merge|proved ownership/,
  );
  const transcriptOrder = await chatLog
    .locator(':scope > *')
    .evaluateAll((elements) =>
      elements.map((element) => element.textContent?.replace(/\s+/g, ' ').trim() || ''),
    );
  const indexOf = (text) => transcriptOrder.findIndex((entry) => entry.includes(text));
  expect(indexOf('Open the Studio chat.')).toBeLessThan(
    indexOf('Opening workspace.madesolid.com.au/services'),
  );
  expect(indexOf('Opening workspace.madesolid.com.au/services')).toBeLessThan(
    indexOf('I found the public services page'),
  );
  expect(indexOf('I found the public services page')).toBeLessThan(indexOf('Updated 2 files'));
  expect(indexOf('Updated 2 files')).toBeLessThan(indexOf('Running project checks'));
  expect(indexOf('Running project checks')).toBeLessThan(indexOf('Using browser checks'));
  expect(indexOf('Using browser checks')).toBeLessThan(
    indexOf('The implementation updates are saved'),
  );
  await expect(workingState).toHaveClass(/codex-generating-message/);
  await expect(workingState).toContainText('Working through the next step');
  await expect(workingState).toContainText('The latest progress is above');
  await expect(workingState).toContainText('2 requests queued next');
  const progressUpdate = composer.locator('.codex-chat-message--progress');
  await expect(progressUpdate).toHaveCount(2);
  await expect(progressUpdate.nth(0)).toContainText('Codex update · after 1 recorded action');
  await expect(progressUpdate.nth(1)).toContainText('Codex update · after 3 recorded actions');
  await expect(progressUpdate.nth(0)).toContainText('I found the public services page');
  await expect(progressUpdate.nth(1)).toContainText(
    'The implementation updates are saved and the checks completed',
  );
  await expect(workingState).not.toContainText('after 3 recorded actions');
  await expect(workingState.locator('time')).toHaveText(/1m (?:0[5-9]|1\d)s/);
  await expect(workingState.locator('.codex-generating-message__dots > span').first()).toHaveCSS(
    'animation-name',
    'codex-generating-dot',
  );
  const conversationPicker = composer.getByRole('button', { name: 'Conversation' });
  await conversationPicker.click();
  const activeConversation = composer.getByRole('menuitemradio', {
    name: /^Open the Studio chat/,
  });
  await expect(activeConversation.locator('.is-spinning')).toBeVisible();
  await expect(activeConversation).toContainText('Working');
  await expect(activeConversation).toContainText('Last used');
  await page.mouse.move(0, 0);
  await expect(composer.getByRole('menu', { name: 'Available conversations' })).toHaveScreenshot(
    'codex-conversation-menu.png',
  );
  await page.keyboard.press('Escape');
  await expect(composer.getByRole('menu', { name: 'Available conversations' })).toBeHidden();
  await expect(conversationPicker).toBeFocused();
  await chatLog.evaluate((element) => element.scrollTo({ top: 0 }));
  await expect(composer).toHaveScreenshot('codex-feedback-working.png', {
    mask: [workingState.locator('time')],
  });
  const accessibility = await new AxeBuilder({ page }).include('.codex-chat-dialog').analyze();
  expect(accessibility.violations).toEqual([]);
});

test('keeps observable Codex activity readable at the compact 320px viewport', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/?codexWorking=1&codexEvidenceNarrative=1');
  await page.getByRole('button', { name: 'Codex is working' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  const chatLog = composer.getByRole('log', { name: 'Codex chat log' });

  const fileActivity = chatLog.locator('[data-activity-id="activity-files"]');
  await fileActivity.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await expect(chatLog).toContainText('src/components/CodexFeedbackPanel.tsx');
  await expect
    .poll(() => composer.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBeLessThanOrEqual(1);
  await expect
    .poll(() => chatLog.evaluate((element) => element.scrollWidth - element.clientWidth))
    .toBeLessThanOrEqual(1);
  await expect(fileActivity).toHaveScreenshot('codex-activity-timeline-320.png');
});

test('logs a newly observed workspace action into the live transcript', async ({ page }) => {
  await page.goto('/?codexWorking=1&codexIncomingActivity=1');
  await page.getByRole('button', { name: 'Codex is working' }).click();
  const chatLog = page.getByRole('log', { name: 'Codex chat log' });
  const existingActivity = chatLog.locator('[data-activity-id="activity-search"]');
  const incomingActivity = chatLog.locator('[data-activity-id="activity-browser"]');

  await expect(existingActivity).toBeVisible();
  await expect(incomingActivity).toHaveClass(/is-entering/, { timeout: 7_000 });
  await expect(incomingActivity).toHaveCSS('animation-name', 'codex-activity-entry');
  await expect(existingActivity).not.toHaveClass(/is-entering/);
});

test('keeps completed workspace activity in the conversation history', async ({ page }) => {
  await page.goto('/?codexActivityHistory=1&codexTeamHistory=1');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });

  await expect(composer.locator('[data-activity-id="activity-browser"]')).toContainText('Complete');
  await expect(
    composer
      .locator('[data-message-id="current-codex"]')
      .locator('.codex-chat-message__activity-context'),
  ).toContainText('Codex conclusion · after 1 recorded action');
  await expect(
    composer
      .locator('[data-message-id="direct-codex"]')
      .locator('.codex-chat-message__activity-context'),
  ).toHaveCount(0);
  await expect(composer.locator('.codex-working-status')).toHaveCount(0);
});

test('eases a new Codex progress update into the active transcript', async ({ page }) => {
  await page.goto('/?codexWorking=1&codexIncoming=1');
  await page.getByRole('button', { name: 'Codex is working' }).click();
  const progressUpdate = page.locator('.codex-chat-message--progress');

  await expect(progressUpdate).toHaveClass(/codex-chat-message--entering/);
  await expect(progressUpdate).toHaveCSS('animation-name', 'codex-assistant-message-enter');
});

test('keeps chat progress and message states static when reduced motion is preferred', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/__made-solid/codex-feedback', async (route) => {
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'queued',
        id: 'reduced-motion-message',
        detail: 'Your message is queued for the active Codex conversation.',
      }),
    });
  });
  await page.goto('/?codexWorking=1');
  await page.getByRole('button', { name: 'Codex is working' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });

  await expect(composer.locator('.codex-chat-message--progress')).toHaveCSS(
    'animation-name',
    'none',
  );
  await expect(composer.locator('.codex-chat-message__pulse')).toHaveCSS('animation-name', 'none');
  await expect(composer.locator('.codex-working-status')).toHaveCSS('animation-name', 'none');
  await expect(
    composer.locator('.codex-chat-activity--running .codex-chat-activity__marker'),
  ).toHaveCSS('animation-name', 'none');
  await expect(composer.locator('.codex-generating-message__dots > span').first()).toHaveCSS(
    'animation-name',
    'none',
  );

  await composer.getByLabel('Message to Codex').fill('Keep this message transition static.');
  await composer.getByRole('button', { name: 'Queue message' }).click();
  await expect(composer.locator('.codex-chat-message--pending')).toHaveCSS(
    'animation-name',
    'none',
  );
});

test('never presents a stale thread timestamp as active working time', async ({ page }) => {
  await page.goto('/?codexWorkingNoStart=1');
  await page.getByRole('button', { name: 'Codex is working' }).click();
  const workingState = page.locator('.codex-working-status');
  await expect(workingState.locator('time')).toHaveText('Working now');
  await expect(workingState.locator('time')).not.toContainText('97h');
});

test('shows working and unseen completion states on the closed launcher', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  let working = true;
  await page.route('**/__made-solid/codex-status*', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ready',
        detail: 'Connected to the local Codex conversation.',
        thread: {
          id: 'thread-notification',
          name: 'Notification test',
          status: working ? 'active' : 'idle',
          working,
          activeFlags: working ? ['turn'] : [],
          updatedAt: Math.floor(Date.now() / 1_000) - 8,
        },
        threads: [],
        messages: [],
        models: [],
        queuedCount: 0,
      }),
    });
  });

  await page.goto('/');
  const workingTrigger = page.getByRole('button', { name: 'Codex is working' });
  await expect(workingTrigger).toBeVisible();
  await expect(workingTrigger).toHaveCSS('background-color', 'rgb(52, 58, 24)');
  await expect(workingTrigger).toHaveScreenshot('codex-feedback-trigger-working.png');
  working = false;
  const completedTrigger = page.getByRole('button', { name: 'Codex finished — open chat' });
  await expect(completedTrigger).toBeVisible({
    timeout: 7_000,
  });
  await expect(completedTrigger).toHaveCSS('background-color', 'rgb(231, 255, 31)');
  await expect(completedTrigger).toHaveScreenshot('codex-feedback-trigger-complete.png');
  await completedTrigger.click();
  await expect(page.getByRole('dialog', { name: 'Codex', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Chat with Codex' })).toBeVisible();
});

test('shows working and unread completion states for every conversation', async ({
  page,
}, testInfo) => {
  let backgroundWorking = true;
  await page.route('**/__made-solid/codex-status*', async (route) => {
    const requestedThreadId =
      new URL(route.request().url()).searchParams.get('threadId') || 'thread-current';
    const now = Math.floor(Date.now() / 1_000);
    const threads = [
      {
        id: 'thread-current',
        name: 'Current review',
        status: 'idle',
        working: false,
        lastTurnStatus: 'completed',
        updatedAt: now - 90,
      },
      {
        id: 'thread-background',
        name: 'Background homepage update',
        status: backgroundWorking ? 'active' : 'idle',
        working: backgroundWorking,
        lastTurnStatus: backgroundWorking ? undefined : 'completed',
        workingStartedAt: now - 12,
        updatedAt: now,
      },
      {
        id: 'thread-history',
        name: 'Earlier completed review',
        status: 'idle',
        working: false,
        lastTurnStatus: 'completed',
        updatedAt: now - 3_700,
      },
      {
        id: 'thread-interrupted',
        name: 'Interrupted content update',
        status: backgroundWorking ? 'active' : 'idle',
        working: backgroundWorking,
        lastTurnStatus: backgroundWorking ? undefined : 'interrupted',
        interrupted: !backgroundWorking,
        workingStartedAt: now - 8,
        updatedAt: now,
      },
    ];
    const thread = threads.find(({ id }) => id === requestedThreadId) || threads[0];
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ready',
        detail: 'Connected to the local Codex conversation.',
        thread,
        threads,
        messages: [
          {
            id: `${thread.id}-reply`,
            role: 'assistant',
            text:
              thread.id === 'thread-background'
                ? 'The background homepage update is complete.'
                : `${thread.name} is ready.`,
          },
        ],
        agents: [],
        models: [],
        queuedCount: 0,
      }),
    });
  });

  await page.goto('/?codexConversationIndicators=1');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  const conversationPicker = composer.getByRole('button', { name: 'Conversation' });
  await conversationPicker.click();
  const menu = composer.getByRole('menu', { name: 'Available conversations' });
  const backgroundConversation = menu.getByRole('menuitemradio', {
    name: /^Background homepage update/,
  });
  const historicalConversation = menu.getByRole('menuitemradio', {
    name: /^Earlier completed review/,
  });
  const interruptedConversation = menu.getByRole('menuitemradio', {
    name: /^Interrupted content update/,
  });
  await expect(backgroundConversation.locator('.is-spinning')).toBeVisible();
  await expect(backgroundConversation).toContainText('Working');
  await expect(interruptedConversation.locator('.is-spinning')).toBeVisible();
  await expect(historicalConversation).toContainText('Ready');
  await expect(
    historicalConversation.locator('.codex-conversation-picker__state svg'),
  ).toBeVisible();

  await page.keyboard.press('Escape');
  backgroundWorking = false;
  await conversationPicker.click();
  await expect(backgroundConversation).toContainText('Finished · Unread', { timeout: 4_000 });
  await expect(
    backgroundConversation.locator('.codex-conversation-picker__state.is-unread svg'),
  ).toBeVisible();
  await expect(historicalConversation.locator('.is-unread')).toHaveCount(0);
  await expect(interruptedConversation).toContainText('Interrupted');
  await expect(interruptedConversation.locator('.is-unread')).toHaveCount(0);
  await expect(menu).toHaveScreenshot('codex-conversation-status-indicators.png');
  expect(await menu.evaluate((element) => element.scrollWidth - element.clientWidth)).toBe(0);
  if (testInfo.project.name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 568 });
    await expect(menu).toHaveScreenshot('codex-conversation-status-indicators-compact-mobile.png');
    expect(await composer.evaluate((element) => element.scrollWidth - element.clientWidth)).toBe(0);
  }
  const accessibility = await new AxeBuilder({ page }).include('.codex-chat-dialog').analyze();
  expect(accessibility.violations).toEqual([]);

  await backgroundConversation.click();
  await expect(composer.getByRole('log', { name: 'Codex chat log' })).toContainText(
    'The background homepage update is complete.',
  );
  await conversationPicker.click();
  const viewedBackgroundConversation = menu.getByRole('menuitemradio', {
    name: /^Background homepage update/,
  });
  await expect(viewedBackgroundConversation).toContainText('Ready');
  await expect(viewedBackgroundConversation).toHaveAttribute('aria-checked', 'true');
  await expect(viewedBackgroundConversation.locator('.is-unread')).toHaveCount(0);

  await page.reload();
  await expect(composer).toBeVisible();
  await conversationPicker.click();
  await expect(
    menu.getByRole('menuitemradio', { name: /^Background homepage update/ }),
  ).toContainText('Ready');
  await expect(menu.locator('.is-unread')).toHaveCount(0);
});

test('captures the current Chrome or Brave tab without opening display capture', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    const original = navigator.mediaDevices.getDisplayMedia;
    navigator.mediaDevices.getDisplayMedia = async (...arguments_) => {
      window.__displayCaptureCalls = (window.__displayCaptureCalls || 0) + 1;
      return original(...arguments_);
    };
  });
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const captureButton = page.getByRole('button', { name: 'Capture this tab' });
  await expect(captureButton).toHaveCSS('cursor', 'pointer');
  await captureButton.click();
  await expect(page.getByRole('dialog', { name: 'Drag around the issue' })).toBeVisible({
    timeout: 15_000,
  });
  const captureState = await page.evaluate(() => ({
    displayCaptureCalls: window.__displayCaptureCalls || 0,
    dialogVisibleAtRequest: window.__captureDialogVisibleAtRequest,
  }));
  expect(captureState.displayCaptureCalls).toBe(0);
  expect(captureState.dialogVisibleAtRequest).toBe(false);
});

test('captures the actual Studio tab instead of reopening an unauthenticated page', async ({
  page,
}) => {
  let localCaptureRequests = 0;
  await page.route('**/__made-solid/page-screenshot', async (route) => {
    localCaptureRequests += 1;
    await route.abort();
  });
  await page.goto('/?noCaptureHelper=1');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const captureButton = page.getByRole('button', { name: 'Capture this tab' });
  await expect(captureButton).toBeEnabled();
  await expect(captureButton).toHaveCSS('cursor', 'pointer');
  await captureButton.click();
  await expect(page.getByRole('dialog', { name: 'Drag around the issue' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText('Current-tab capture ready')).toBeHidden();
  expect(await page.evaluate(() => window.__displayCaptureHadUserActivation)).toBe(true);
  expect(localCaptureRequests).toBe(0);
});

test('captures accurate visible Studio pixels on mobile Chrome without screen-capture support', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await page.route('https://capture.invalid/offscreen-capture-image.png', (route) => route.abort());
  await page.goto('/?noCaptureHelper=1&realCanvas=1');
  const expectedScrollTop = await page.evaluate(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {},
    });
    const shell = document.querySelector('.app-shell');
    const main = shell?.querySelector(':scope > main');
    const content = main?.firstElementChild;
    if (!(shell instanceof HTMLElement) || !(main instanceof HTMLElement)) return 0;
    if (content instanceof HTMLElement) {
      content.style.minHeight = '1400px';
      content.style.position = 'relative';
      const offscreenImage = document.createElement('img');
      offscreenImage.alt = 'Intentionally unavailable off-screen test image';
      offscreenImage.src = 'https://capture.invalid/offscreen-capture-image.png';
      Object.assign(offscreenImage.style, {
        height: '40px',
        left: '0',
        position: 'absolute',
        top: '1200px',
        width: '40px',
      });
      content.append(offscreenImage);
    }
    const marker = document.createElement('div');
    marker.dataset.capturePixelMarker = 'true';
    Object.assign(marker.style, {
      background: 'rgb(1, 222, 111)',
      height: '56px',
      left: '48px',
      pointerEvents: 'none',
      position: 'fixed',
      top: '180px',
      width: '56px',
      zIndex: '30',
    });
    shell.append(marker);
    main.scrollTop = 180;
    return main.scrollTop;
  });

  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  await expect(page.getByText('Mobile screen capture ready')).toBeVisible();
  const captureStartedAt = Date.now();
  await page.getByRole('button', { name: 'Capture this tab' }).click();
  await expect(page.getByRole('status')).toContainText('Capturing exactly what is visible');
  const selectionDialog = page.getByRole('dialog', { name: 'Drag around the issue' });
  await expect(selectionDialog).toBeVisible({ timeout: 10_000 });
  expect(Date.now() - captureStartedAt).toBeLessThan(6_000);

  const capturedImage = selectionDialog.getByAltText('Screen capture ready for area selection');
  const capture = await capturedImage.evaluate(async (image) => {
    if (!image.complete) await new Promise((resolve) => image.addEventListener('load', resolve));
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const scaleX = image.naturalWidth / window.innerWidth;
    const scaleY = image.naturalHeight / window.innerHeight;
    const pixel = context.getImageData(Math.round(76 * scaleX), Math.round(208 * scaleY), 1, 1);
    return {
      height: image.naturalHeight,
      pixel: [...pixel.data],
      source: image.currentSrc.slice(0, 30),
      width: image.naturalWidth,
    };
  });
  expect(capture.source).toContain('data:image/png;base64,');
  expect(capture.width).toBeGreaterThanOrEqual(375);
  expect(capture.height).toBeGreaterThanOrEqual(812);
  expect(capture.pixel.slice(0, 3)).toEqual([1, 222, 111]);
  await expect(selectionDialog).toHaveScreenshot('codex-mobile-page-capture.png');
  await expect
    .poll(() => page.locator('.app-shell > main').evaluate((main) => main.scrollTop))
    .toBe(expectedScrollTop);
});

test('captures a selected region and queues its prompt for the chosen Codex model', async ({
  page,
}) => {
  let delivered;
  await page.route('**/__made-solid/codex-feedback', async (route) => {
    delivered = route.request().postDataJSON();
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'queued',
        id: 'feedback-1',
        detail: 'Visual feedback is queued for the active Codex conversation.',
      }),
    });
  });

  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Chat with Codex' });
  await expect(trigger).toBeVisible();
  await trigger.click();

  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await expect(composer).toBeVisible();
  await openRunSettings(composer);
  await expect(composer.locator('.codex-model-field select')).toBeVisible();
  await expect(composer).toHaveScreenshot('codex-feedback-compose.png');
  await composer.getByLabel('Model').selectOption('gpt-5.6-terra');
  await composer.getByLabel('Reasoning').selectOption('high');
  await composer.getByRole('button', { name: 'Capture another tab or window' }).click();

  const selectionDialog = page.getByRole('dialog', { name: 'Drag around the issue' });
  const stage = selectionDialog.locator('.codex-feedback-selection-stage');
  await expect(stage).toBeVisible();
  const bounds = await stage.boundingBox();
  expect(bounds).toBeTruthy();
  await page.mouse.move(bounds.x + bounds.width * 0.5, bounds.y + bounds.height * 0.25);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.9, bounds.y + bounds.height * 0.75, {
    steps: 8,
  });
  await expect(selectionDialog.locator('.codex-feedback-selection-box')).toBeVisible();
  await expect(selectionDialog).toHaveScreenshot('codex-feedback-selection.png');
  await page.mouse.up();

  await expect(composer).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Review visual feedback' })).toHaveCount(0);
  await expect(composer.getByAltText('Selected image: Screenshot 1')).toBeVisible();
  await composer
    .getByLabel('Message to Codex')
    .fill('Fix this layout issue comprehensively and verify all required viewports.');
  await composer.getByRole('button', { name: 'Send message' }).click();
  await expect(composer.getByLabel('Message to Codex')).toHaveValue('');
  const inlineAttachment = composer.locator('.codex-chat-message__attachment').last();
  await expect(inlineAttachment).toBeVisible();
  await expect(inlineAttachment).toHaveAttribute('src', /^data:image\/svg\+xml/);
  await expect(page.getByRole('dialog', { name: 'Message queued' })).toHaveCount(0);
  const agentMode = composer.getByRole('button', { name: /Agent team/ });
  await expect(agentMode).toBeVisible();
  const agentModeBounds = await agentMode.boundingBox();
  expect(agentModeBounds?.height).toBeGreaterThanOrEqual(44);
  await expect(composer).toHaveScreenshot('codex-feedback-inline-attachment.png');
  expect(delivered.model).toBe('gpt-5.6-terra');
  expect(delivered.effort).toBe('high');
  expect(delivered.workMode).toBe('team');
  expect(delivered.prompt).toContain('Fix this layout issue');
  expect(delivered.screenshots).toHaveLength(1);
  expect(delivered.screenshots[0]).toContain('data:image/svg+xml');

  await composer.getByRole('button', { name: 'Close Codex chat' }).click();
  await expect(trigger).toBeFocused();
});

test('can review and send the complete captured screenshot without drawing a region', async ({
  page,
}) => {
  let delivered;
  await page.route('**/__made-solid/codex-feedback', async (route) => {
    delivered = route.request().postDataJSON();
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'queued', id: 'feedback-whole' }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await composer.getByRole('button', { name: 'Capture another tab or window' }).click();
  const selectionDialog = page.getByRole('dialog', { name: 'Drag around the issue' });
  await selectionDialog.getByRole('button', { name: 'Use whole screenshot' }).click();
  await expect(composer).toBeVisible();
  await expect(composer.getByAltText('Selected image: Screenshot 1')).toBeVisible();
  await composer.getByLabel('Message to Codex').fill('Review the complete screen.');
  await composer.getByRole('button', { name: 'Send message' }).click();
  await expect(composer.locator('.codex-chat-message__attachment').last()).toBeVisible();
  expect(delivered.screenshots[0]).toContain('data:image/svg+xml');
});

test('uploads, removes, and sends multiple camera-roll photos inside the active composer', async ({
  page,
}) => {
  let delivered;
  await page.route('**/__made-solid/codex-feedback', async (route) => {
    delivered = route.request().postDataJSON();
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'queued', id: 'camera-roll-photo' }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  const photoInput = composer.getByLabel('Photo from camera roll', { exact: true });
  const uploadButton = composer.getByRole('button', { name: 'Upload photo from camera roll' });
  await expect(photoInput).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
  await expect(photoInput).toHaveAttribute('multiple', '');
  await composer.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => {}))),
  );
  const uploadBounds = await uploadButton.boundingBox();
  expect(uploadBounds?.width).toBeGreaterThanOrEqual(44);
  expect(uploadBounds?.height).toBeGreaterThanOrEqual(44);
  expect(await composer.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
    true,
  );
  const [fileChooser] = await Promise.all([page.waitForEvent('filechooser'), uploadButton.click()]);
  const photoBuffer = Buffer.from(capturePng.split(',')[1], 'base64');
  await fileChooser.setFiles([
    { name: 'first-photo.png', mimeType: 'image/png', buffer: photoBuffer },
    { name: 'remove-photo.png', mimeType: 'image/png', buffer: photoBuffer },
    { name: 'second-photo.png', mimeType: 'image/png', buffer: photoBuffer },
  ]);

  await expect(composer).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Review visual feedback' })).toHaveCount(0);
  await expect(composer.getByAltText('Selected image: first-photo.png')).toBeVisible();
  await expect(composer.getByAltText('Selected image: second-photo.png')).toBeVisible();
  await expect(composer.getByText('3 of 5 images selected')).toBeVisible();
  const removePhotoButton = composer.getByRole('button', { name: 'Remove remove-photo.png' });
  await expect(removePhotoButton).toBeEnabled();
  await removePhotoButton.click();
  await expect(composer.getByAltText('Selected image: remove-photo.png')).toHaveCount(0);
  await composer.getByLabel('Message to Codex').fill('Use these photos as visual context.');
  await expect(composer).toHaveScreenshot('codex-feedback-multi-image-draft.png');
  const accessibility = await new AxeBuilder({ page }).include('.codex-chat-dialog').analyze();
  expect(accessibility.violations).toEqual([]);
  await composer.getByLabel('Message to Codex').fill('');
  const sendButton = composer.getByRole('button', { name: 'Send message' });
  await expect(sendButton).toBeEnabled();
  await sendButton.click();

  await expect(composer.locator('.codex-chat-message__attachment')).toHaveCount(2);
  expect(delivered.prompt).toBe('');
  expect(delivered.screenshots).toEqual([capturePng, capturePng]);

  await composer.getByRole('button', { name: 'Conversation' }).click();
  await composer.getByRole('menuitemradio', { name: /Review the earlier homepage\./ }).click();
  await expect(composer.locator('.codex-chat-message__attachment')).toHaveCount(0);
  await expect(composer.getByRole('log', { name: 'Codex chat log' })).toContainText(
    'The earlier review is complete.',
  );

  await composer.getByRole('button', { name: 'Conversation' }).click();
  await composer.getByRole('menuitemradio', { name: /Open the Studio chat\./ }).click();
  await expect(composer.locator('.codex-chat-message__attachment')).toHaveCount(2);
});

test('restores focus when Escape dismisses the control panel', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Chat with Codex' });
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Codex', exact: true })).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('animates the chat dialog in and out while respecting reduced motion', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Loading Made Solid Studio workspace')).toBeHidden();
  const trigger = page.getByRole('button', { name: 'Chat with Codex' });
  await trigger.click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });

  await expect(composer).toHaveAttribute('data-state', 'open');
  await expect(composer).toHaveCSS('animation-name', 'codex-chat-dialog-in');

  const closingState = await composer
    .getByRole('button', { name: 'Close Codex chat' })
    .evaluate(async (button) => {
      button.click();
      await new Promise(requestAnimationFrame);
      const dialog = document.querySelector('.codex-chat-dialog');
      return dialog
        ? {
            state: dialog.getAttribute('data-state'),
            animationName: getComputedStyle(dialog).animationName,
          }
        : null;
    });
  expect(closingState).toEqual({
    state: 'closed',
    animationName: 'codex-chat-dialog-out',
  });
  await expect(composer).toBeHidden();
  await expect(trigger).toBeFocused();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await trigger.click();
  await expect(page.getByRole('dialog', { name: 'Codex', exact: true })).toHaveCSS(
    'animation-name',
    'none',
  );
});

test('centers the connection status tag within the compact agent header', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  const badge = composer.locator('.codex-feedback-dialog__status .status-badge');

  await expect(badge).toHaveText('Ready');
  const contentInsets = await badge.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(element);
    const textBounds = range.getBoundingClientRect();
    return {
      top: textBounds.top - bounds.top,
      right: bounds.right - textBounds.right,
      bottom: bounds.bottom - textBounds.bottom,
      left: textBounds.left - bounds.left,
    };
  });
  expect(Math.abs(contentInsets.top - contentInsets.bottom)).toBeLessThanOrEqual(2);
  expect(Math.abs(contentInsets.left - contentInsets.right)).toBeLessThanOrEqual(2);
});

test('hides the chat and model controls before the browser capture chooser opens', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    navigator.mediaDevices.getDisplayMedia = () => new Promise(() => {});
  });
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  await page.getByRole('button', { name: 'Capture another tab or window' }).click();

  await expect(page.getByRole('dialog', { name: 'Codex', exact: true })).toBeHidden();
  await expect(page.getByRole('status')).toContainText(
    'Choose the tab or window you want Codex to inspect.',
  );
  await expect(page.getByLabel('Model')).toBeHidden();
});

test('keeps run setup and chat settings accessible with restored focus', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await openRunSettings(composer);
  let results = await new AxeBuilder({ page }).include('.codex-feedback-dialog').analyze();
  expect(results.violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(composer.getByRole('group', { name: 'Run setup' })).toBeHidden();
  await expect(composer.getByRole('button', { name: 'Run setup' })).toBeFocused();

  await openChatSettings(composer);
  await expect(composer.getByRole('button', { name: 'Close chat settings' })).toBeFocused();
  results = await new AxeBuilder({ page }).include('.codex-feedback-dialog').analyze();
  expect(results.violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(composer.getByRole('dialog', { name: 'Chat settings' })).toBeHidden();
  await expect(composer.getByRole('button', { name: 'Chat settings' })).toBeFocused();
});

test('shows live Codex subscription usage in chat settings', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await openChatSettings(composer);

  const usage = composer.getByRole('region', { name: 'Codex subscription usage' });
  await expect(usage).toContainText('51% used');
  await expect(usage).toContainText('7-day usage');
  await expect(usage).toContainText('Resets');
  await expect(usage.getByRole('progressbar', { name: '7-day usage: 51% used' })).toHaveAttribute(
    'aria-valuenow',
    '51',
  );
});

test('lets the owner switch all Studio AI work to disclosed API credits', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await openChatSettings(composer);

  const switcher = composer.getByRole('button', { name: /Use API credits/ });
  await expect(switcher).toHaveAttribute('aria-pressed', 'false');
  await expect(switcher).toContainText('if your ChatGPT subscription allowance runs out');
  await switcher.click();

  const enabled = composer.getByRole('button', { name: /OpenAI API credits/ });
  await expect(enabled).toHaveAttribute('aria-pressed', 'true');
  await expect(enabled).toContainText(
    'Separately billed for Studio chat, builders, and AI analysis',
  );
  await expect(composer.getByText('OpenAI API credits · connected')).toBeVisible();
  await expect(composer.getByRole('dialog', { name: 'Chat settings' })).toHaveScreenshot(
    'owner-api-credits-switch.png',
  );
});

test('keeps separate Codex quota windows and reports unavailable usage truthfully', async ({
  page,
}) => {
  await page.goto('/?codexTwoUsage=1');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  let composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await openChatSettings(composer);
  await expect(composer.getByRole('progressbar', { name: '5-hour usage: 42% used' })).toBeVisible();
  await expect(composer.getByRole('progressbar', { name: '7-day usage: 18% used' })).toBeVisible();

  await composer.getByRole('button', { name: 'Close chat settings' }).click();
  await composer.getByRole('button', { name: 'Close Codex chat' }).click();
  await page.goto('/?codexUsageUnavailable=1');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await openChatSettings(composer);
  await expect(composer.getByText('Usage is temporarily unavailable.')).toBeVisible();
  await expect(composer.getByRole('progressbar')).toHaveCount(0);
});

test('keeps visual feedback available on the private-preview surface', async ({ page }) => {
  await page.route('https://demo.supabase.co/functions/v1/siteforge-preview/**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        html: '<!doctype html><html><head><title>Preview</title></head><body><main><h1>Private website preview</h1></main></body></html>',
      }),
    });
  });
  const source =
    'https://demo.supabase.co/functions/v1/siteforge-preview/capability/token/index.html';
  await page.goto(`/#/preview?source=${encodeURIComponent(source)}`);
  await expect(page.getByTitle('Private website preview')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Chat with Codex' })).toBeVisible();
});

test('keeps Codex above a separately served prospect development preview', async ({ page }) => {
  await page.route('http://127.0.0.1:3000/**', async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><body><main><h1>Prospect development website</h1></main></body></html>',
    });
  });
  const source = 'http://127.0.0.1:3000/';
  await page.goto(`/#/preview?source=${encodeURIComponent(source)}`);

  const website = page.getByTitle('Prospect development website preview');
  await expect(website).toBeVisible();
  await expect(
    website.contentFrame().getByRole('heading', { name: 'Prospect development website' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Chat with Codex' })).toBeVisible();
  await expect(page).toHaveScreenshot('codex-development-preview.png');
});

test('separates the current client chats from universal Studio chats', async ({ page }) => {
  await page.unroute('**/__made-solid/codex-status*');
  let newThreadRequest;
  const requestedWorkspaces = [];
  await page.route('**/__made-solid/codex-status*', async (route) => {
    const requestUrl = new URL(route.request().url());
    const workspace = requestUrl.searchParams.get('workspace');
    requestedWorkspaces.push(workspace);
    const clientScoped = workspace === 'lece-group';
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ready',
        detail: clientScoped
          ? 'Connected to the client website editor.'
          : 'Connected to Universal Studio.',
        thread: clientScoped
          ? {
              id: 'client-thread',
              name: 'Homepage revisions',
              status: 'idle',
              scope: 'client',
            }
          : {
              id: 'universal-thread',
              name: 'Studio planning',
              status: 'idle',
              scope: 'universal',
            },
        threads: clientScoped
          ? [
              {
                id: 'client-thread',
                name: 'Homepage revisions',
                status: 'idle',
                scope: 'client',
              },
              {
                id: 'universal-thread',
                name: 'Studio planning',
                status: 'idle',
                scope: 'universal',
              },
            ]
          : [
              {
                id: 'universal-thread',
                name: 'Studio planning',
                status: 'idle',
                scope: 'universal',
              },
            ],
        messages: [],
        activities: [],
        agents: [],
        queuedCount: 0,
        interruptingCount: 0,
        queuedMessages: [],
        models: [
          {
            id: 'gpt-client-editor',
            label: 'Client editor',
            defaultEffort: 'medium',
            isDefault: true,
            supportsImages: true,
            efforts: [{ id: 'medium', description: 'Balanced reasoning' }],
            serviceTiers: [],
          },
        ],
      }),
    });
  });
  await page.route('**/__made-solid/codex-feedback', async (route) => {
    newThreadRequest = route.request().postDataJSON();
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        thread: { id: 'new-client-thread', name: 'New chat', status: 'idle', scope: 'client' },
      }),
    });
  });
  await page.route('http://127.0.0.1:3000/**', async (route) => {
    await route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><body><main><h1>Lece Group website</h1></main></body></html>',
    });
  });
  const source = encodeURIComponent('http://127.0.0.1:3000/');
  await page.goto(`/#/preview?source=${source}&workspace=lece-group`);
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const dialog = page.getByRole('dialog', { name: 'Lece Group website editor' });
  await expect(dialog.getByText('Editing only Lece Group')).toBeVisible();
  await dialog.getByRole('button', { name: 'Conversation' }).click();
  await expect(dialog.getByRole('group', { name: 'This client · Lece Group' })).toContainText(
    'Homepage revisions',
  );
  await expect(dialog.getByRole('group', { name: 'Universal Studio' })).toContainText(
    'Studio planning',
  );
  await dialog.getByRole('button', { name: 'New Lece Group website chat' }).click();
  expect(newThreadRequest).toMatchObject({
    action: 'new-thread',
    workspace: 'lece-group',
    threadScope: 'client',
  });
  const overflow = await dialog.evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const accessibility = await new AxeBuilder({ page }).include('.codex-chat-dialog').analyze();
  expect(accessibility.violations).toEqual([]);
  await expect(dialog).toHaveScreenshot('codex-client-scoped-chat.png');

  await dialog.getByRole('button', { name: 'Close Codex chat' }).click();
  await page.getByRole('link', { name: 'Back to Studio' }).click();
  await expect(page).toHaveURL(/\/#\/prospects$/);
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const universalDialog = page.getByRole('dialog', { name: 'Codex', exact: true });
  await expect(universalDialog).toBeVisible();
  await universalDialog.getByRole('button', { name: 'Conversation' }).click();
  await expect(universalDialog.getByRole('group', { name: 'Studio conversations' })).toContainText(
    'Studio planning',
  );
  expect(requestedWorkspaces).toContain('lece-group');
  expect(requestedWorkspaces).toContain(null);
});

test('branches a completed Codex reply into a separately selected conversation', async ({
  page,
}) => {
  let branchRequest;
  let releaseBranch;
  const branchReady = new Promise((resolve) => {
    releaseBranch = resolve;
  });
  const branchedThread = {
    id: 'thread-fork-1',
    name: 'Studio branch',
    status: 'idle',
    scope: 'universal',
  };
  await page.route('**/__made-solid/codex-branch', async (route) => {
    const request = route.request().postDataJSON();
    if (request.action !== 'branch-thread') return route.fallback();
    branchRequest = request;
    await branchReady;
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ready',
        detail: 'Codex conversation branched from the selected reply.',
        thread: branchedThread,
      }),
    });
  });
  await page.route('**/__made-solid/codex-status*', async (route) => {
    const selectedThreadId = new URL(route.request().url()).searchParams.get('threadId');
    if (selectedThreadId !== branchedThread.id) return route.fallback();
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ready',
        detail: 'Connected to the branched Codex conversation.',
        thread: branchedThread,
        threads: [
          branchedThread,
          { id: 'thread-1', name: 'Studio', status: 'idle', scope: 'universal' },
        ],
        messages: [
          {
            id: 'branched-user',
            role: 'user',
            text: 'Open the Studio chat.',
            turnId: 'turn-team-1',
            position: 0,
          },
          {
            id: 'branched-codex',
            role: 'assistant',
            text: 'Studio chat is connected.',
            turnId: 'turn-team-1',
            turnStatus: 'completed',
            phase: 'final_answer',
            position: 1,
          },
        ],
        activities: [],
        agents: [],
        queuedCount: 0,
        interruptingCount: 0,
        queuedMessages: [],
        models: [
          {
            id: 'gpt-5.6-sol',
            label: 'GPT-5.6-Sol',
            defaultEffort: 'medium',
            isDefault: true,
            supportsImages: true,
            efforts: [{ id: 'medium', description: 'Balanced reasoning' }],
            serviceTiers: [],
          },
        ],
      }),
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  const branch = composer.getByRole('button', { name: 'Branch chat from this reply' });
  await expect(branch).toBeVisible();
  await branch.click();

  const loading = composer.locator('.codex-conversation-loading');
  await expect(loading).toContainText('Branching conversation');
  await expect(loading).toContainText('Copying context through the selected reply');
  await expect(composer.getByRole('log', { name: 'Codex chat log' })).toHaveAttribute(
    'aria-busy',
    'true',
  );
  await expect.poll(() => branchRequest?.action).toBe('branch-thread');
  expect(branchRequest).toMatchObject({
    threadId: 'thread-1',
    turnId: 'turn-team-1',
    threadScope: 'universal',
  });

  releaseBranch();
  await expect(composer.getByRole('button', { name: 'Conversation' })).toContainText(
    'Studio branch',
  );
  await expect(composer.getByRole('log', { name: 'Codex chat log' })).toContainText(
    'Studio chat is connected.',
  );
  await expect(composer.getByLabel('Message to Codex')).toBeFocused();
  await composer.getByRole('button', { name: 'Conversation' }).click();
  await expect(composer.getByRole('menuitemradio', { name: /Studio branch/ })).toBeChecked();
  await expect(composer.getByRole('menuitemradio', { name: /^Studio/ })).toHaveCount(2);
  await page.keyboard.press('Escape');
  const overflow = await composer.evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const accessibility = await new AxeBuilder({ page }).include('.codex-chat-dialog').analyze();
  expect(accessibility.violations).toEqual([]);
  await expect(composer).toHaveScreenshot('codex-branched-chat.png');
});

test('keeps the original Codex chat selected when branching fails', async ({ page }) => {
  await page.route('**/__made-solid/codex-branch', async (route) => {
    const request = route.request().postDataJSON();
    if (request.action !== 'branch-thread') return route.fallback();
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'That completed reply is no longer available.' }),
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await composer.getByRole('button', { name: 'Branch chat from this reply' }).click();

  await expect(composer.getByRole('alert')).toContainText(
    'That completed reply is no longer available.',
  );
  await expect(composer.getByRole('button', { name: 'Conversation' })).toContainText(
    'Open the Studio chat.',
  );
  await expect(composer.getByRole('log', { name: 'Codex chat log' })).toContainText(
    'Studio chat is connected.',
  );
});

test('explains an interrupted empty branch response without exposing a JSON parser error', async ({
  page,
}) => {
  await page.route('**/__made-solid/codex-branch', async (route) => {
    const request = route.request().postDataJSON();
    if (request.action !== 'branch-thread') return route.fallback();
    await route.fulfill({ status: 502, contentType: 'application/json', body: '' });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await composer.getByRole('button', { name: 'Branch chat from this reply' }).click();

  await expect(composer.getByRole('alert')).toContainText(
    'Branching was interrupted before Studio returned a result.',
  );
  await expect(composer.getByRole('alert')).not.toContainText('JSON');
  await expect(composer.getByRole('button', { name: 'Conversation' })).toContainText(
    'Open the Studio chat.',
  );
});

test('keeps the model control usable at the compact 320px viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await expect(composer).toBeVisible();
  await expect(composer.getByRole('button', { name: 'Branch chat from this reply' })).toBeVisible();
  await expect(composer.getByRole('button', { name: 'Capture this tab' })).toBeVisible();
  await expect
    .poll(() =>
      composer.getByRole('region', { name: 'Message composer' }).evaluate((el) => el.clientHeight),
    )
    .toBeLessThanOrEqual(140);
  await expect
    .poll(() =>
      composer.getByRole('log', { name: 'Codex chat log' }).evaluate((el) => el.clientHeight),
    )
    .toBeGreaterThanOrEqual(180);
  const overflow = await composer.evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await openRunSettings(composer);
  await expect(composer.locator('.codex-model-field select')).toBeVisible();
  await expect(composer).toHaveScreenshot('codex-feedback-compose-320.png');
});
