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

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ screenshot, tabScreenshot }) => {
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
  await page.route('**/__made-solid/codex-status*', async (route) => {
    const selectedThreadId = new URL(route.request().url()).searchParams.get('threadId');
    const pageUrl = new URL(route.request().headers().referer || 'http://localhost');
    const noWorkingStart = pageUrl.searchParams.has('codexWorkingNoStart');
    const working = pageUrl.searchParams.has('codexWorking') || noWorkingStart;
    const interrupted = pageUrl.searchParams.has('codexInterrupted');
    const workingSince = Math.floor(Date.now() / 1_000) - 65;
    const threadUpdatedAt = noWorkingStart
      ? Math.floor(Date.now() / 1_000) - 97 * 60 * 60
      : workingSince;
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ready',
        detail: 'Connected to the local Codex conversation.',
        account: { type: 'chatgpt', planType: 'plus' },
        thread:
          selectedThreadId === 'thread-2'
            ? {
                id: 'thread-2',
                name: 'Earlier website review',
                preview: 'Review the earlier homepage.\n\nCaptured from: Made Solid Studio',
                status: 'idle',
                updatedAt: Math.floor(Date.now() / 1_000) - 3_700,
              }
            : {
                id: 'thread-1',
                name: 'Studio',
                preview: 'Open the Studio chat.\n\nCaptured from: Made Solid Studio',
                status: working ? 'active' : 'idle',
                working,
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
            preview: 'Open the Studio chat.\n\nCaptured from: Made Solid Studio',
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
            preview: 'Review the earlier homepage.\n\nCaptured from: Made Solid Studio',
            status: 'idle',
            updatedAt: Math.floor(Date.now() / 1_000) - 3_700,
          },
        ],
        messages:
          selectedThreadId === 'thread-2'
            ? [
                { id: 'old-user', role: 'user', text: 'Review the earlier homepage.' },
                { id: 'old-codex', role: 'assistant', text: 'The earlier review is complete.' },
              ]
            : [
                { id: 'current-user', role: 'user', text: 'Open the Studio chat.' },
                { id: 'current-codex', role: 'assistant', text: 'Studio chat is connected.' },
              ],
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
            efforts: [
              { id: 'medium', description: 'Balanced reasoning' },
              { id: 'high', description: 'Deeper reasoning for complex changes' },
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

test('sends a text-only chat message to the selected Codex model', async ({ page }) => {
  let delivered;
  await page.route('**/__made-solid/codex-feedback', async (route) => {
    delivered = route.request().postDataJSON();
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
  await expect(page.getByRole('dialog', { name: 'Message queued' })).toHaveCount(0);
  expect(delivered.model).toBe('gpt-5.3-codex-spark');
  expect(delivered.effort).toBe('high');
  expect(delivered.prompt).toContain('Review the current implementation');
  expect(delivered).not.toHaveProperty('screenshot');
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

test('shows the tmux chat log and switches between saved Codex conversations', async ({ page }) => {
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
  await expect(log).toContainText('Review the earlier homepage.');
  await expect(log).toContainText('The earlier review is complete.');
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
        detail: 'Codex resumed the interrupted conversation from its saved transcript.',
      }),
    });
  });

  await page.goto('/?codexInterrupted');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await expect(composer.getByText('Work was interrupted')).toBeVisible();
  await expect(composer).toContainText('The Codespace paused before Codex finished.');
  await expect(composer).toHaveScreenshot('codex-interrupted-conversation-mobile.png');
  await composer.getByRole('button', { name: 'Continue' }).click();
  await expect.poll(() => continuation?.action).toBe('continue-interrupted-thread');
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
    await expect.poll(() => messageInput.evaluate((element) => element.clientHeight)).toBe(72);

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

test('creates a new Codex conversation with the selected model and reasoning', async ({ page }) => {
  let createRequest;
  let deletedThreadId;
  let createdThread;
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
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await composer.getByLabel('Model').selectOption('gpt-5.6-terra');
  await composer.getByLabel('Reasoning').selectOption('high');
  await composer.getByRole('button', { name: 'New chat' }).click();
  await expect(composer.getByRole('button', { name: 'New chat' })).toBeEnabled();
  await expect(composer.getByRole('button', { name: 'Conversation' })).toContainText('New chat');
  await expect(composer.getByRole('log', { name: 'Codex chat log' })).toContainText(
    'No messages are saved in this conversation.',
  );
  await page.waitForTimeout(750);
  await expect(composer.getByRole('button', { name: 'Conversation' })).toContainText('New chat');
  await expect(composer.getByRole('log', { name: 'Codex chat log' })).toContainText(
    'No messages are saved in this conversation.',
  );
  expect(createRequest).toEqual({
    action: 'new-thread',
    model: 'gpt-5.6-terra',
    effort: 'high',
  });
  await composer.getByRole('button', { name: 'Conversation' }).click();
  await composer.getByRole('menuitemradio', { name: /^Studio/ }).click();
  await expect.poll(() => deletedThreadId).toBe('thread-new');
});

test('keeps the selected model and reasoning after the panel and page reopen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  let composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await composer.getByLabel('Model').selectOption('gpt-5.6-terra');
  await composer.getByLabel('Reasoning').selectOption('high');
  await composer.getByRole('button', { name: 'Close Codex chat' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await expect(composer.getByLabel('Model')).toHaveValue('gpt-5.6-terra');
  await expect(composer.getByLabel('Reasoning')).toHaveValue('high');
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

test('stacks editable queued messages with an exact per-message interrupt action', async ({
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
  expect(actions).toEqual([
    {
      action: 'update-queued',
      id: '11111111-1111-4111-8111-111111111111',
      prompt: 'Use the revised nav direction.',
    },
    {
      action: 'interrupt-queued',
      id: '22222222-2222-4222-8222-222222222222',
    },
  ]);
});

test('shows real Codex working state, queued work, and a live elapsed timer', async ({ page }) => {
  await page.goto('/?codexWorking=1');
  await page.getByRole('button', { name: 'Codex is working' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  const workingState = composer.locator('.codex-working-status');

  await expect(workingState).toContainText('Codex is working');
  await expect(workingState).toContainText('2 requests queued next');
  await expect(workingState.locator('time')).toHaveText(/1m (?:0[5-9]|1\d)s/);
  const conversationPicker = composer.getByRole('button', { name: 'Conversation' });
  await conversationPicker.click();
  const activeConversation = composer.getByRole('menuitemradio', {
    name: /^Open the Studio chat\./,
  });
  await expect(activeConversation.locator('.is-spinning')).toBeVisible();
  await expect(activeConversation).toContainText('Working');
  await expect(activeConversation).toContainText('Last used');
  await expect(composer.getByRole('menu', { name: 'Available conversations' })).toHaveScreenshot(
    'codex-conversation-menu.png',
  );
  await page.keyboard.press('Escape');
  await expect(composer.getByRole('menu', { name: 'Available conversations' })).toBeHidden();
  await expect(conversationPicker).toBeFocused();
  await expect(composer).toHaveScreenshot('codex-feedback-working.png', {
    mask: [workingState.locator('time')],
  });
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
  await expect(composer.getByLabel('Model')).toBeVisible();
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

  const review = page.getByRole('dialog', { name: 'Review visual feedback' });
  await review
    .getByLabel('What should Codex change?')
    .fill('Fix this layout issue comprehensively and verify all required viewports.');
  await expect(review).toHaveScreenshot('codex-feedback-review.png');
  await review.getByRole('button', { name: 'Send to Codex' }).click();

  await expect(composer).toBeVisible();
  await expect(composer.getByLabel('Message to Codex')).toHaveValue('');
  const inlineAttachment = composer.getByAltText('Image attached to your message');
  await expect(inlineAttachment).toBeVisible();
  await expect(inlineAttachment).toHaveAttribute('src', /^data:image\/svg\+xml/);
  await expect(page.getByRole('dialog', { name: 'Message queued' })).toHaveCount(0);
  await expect(composer).toHaveScreenshot('codex-feedback-inline-attachment.png');
  expect(delivered.model).toBe('gpt-5.6-terra');
  expect(delivered.effort).toBe('high');
  expect(delivered.prompt).toContain('Fix this layout issue');
  expect(delivered.screenshot).toContain('data:image/svg+xml');

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
  const review = page.getByRole('dialog', { name: 'Review visual feedback' });
  await review.getByLabel('What should Codex change?').fill('Review the complete screen.');
  await review.getByRole('button', { name: 'Send to Codex' }).click();

  await expect(composer).toBeVisible();
  await expect(composer.getByAltText('Image attached to your message')).toBeVisible();
  expect(delivered.screenshot).toContain('data:image/svg+xml');
});

test('uploads a camera-roll photo through visual review and sends it with the prompt', async ({
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
  const uploadBounds = await uploadButton.boundingBox();
  expect(uploadBounds?.width).toBeGreaterThanOrEqual(44);
  expect(uploadBounds?.height).toBeGreaterThanOrEqual(44);
  expect(await composer.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
    true,
  );
  const [fileChooser] = await Promise.all([page.waitForEvent('filechooser'), uploadButton.click()]);
  await fileChooser.setFiles({
    name: 'camera-roll.png',
    mimeType: 'image/png',
    buffer: Buffer.from(capturePng.split(',')[1], 'base64'),
  });

  const review = page.getByRole('dialog', { name: 'Review visual feedback' });
  await expect(
    review.getByAltText('Selected photo or screenshot that will be sent to Codex'),
  ).toBeVisible();
  await review.getByLabel('What should Codex change?').fill('Use this photo as visual context.');
  await review.getByRole('button', { name: 'Send to Codex' }).click();

  await expect(composer).toBeVisible();
  await expect(composer.getByAltText('Image attached to your message')).toBeVisible();
  expect(delivered.prompt).toBe('Use this photo as visual context.');
  expect(delivered.screenshot).toBe(capturePng);
});

test('restores focus when Escape dismisses the control panel', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Chat with Codex' });
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Codex', exact: true })).toBeHidden();
  await expect(trigger).toBeFocused();
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

test('has no automated accessibility violations in the model control panel', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const results = await new AxeBuilder({ page }).include('.codex-feedback-dialog').analyze();
  expect(results.violations).toEqual([]);
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

test('keeps the model control usable at the compact 320px viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Chat with Codex' }).click();
  const composer = page.getByRole('dialog', { name: 'Codex', exact: true });
  await expect(composer).toBeVisible();
  await expect(composer.getByRole('button', { name: 'Capture this tab' })).toBeVisible();
  const overflow = await composer.evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(composer.getByLabel('Model')).toBeVisible();
  await expect(composer).toHaveScreenshot('codex-feedback-compose-320.png');
});
