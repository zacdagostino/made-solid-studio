import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CodexPushNotifications } from './codex-push-notifications.mjs';

export const workspaceCodexBranchEndpoint = '/__made-solid/codex-branch';
export const workspaceCodexNotificationsEndpoint = '/__made-solid/codex-notifications';

const directoryPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

function sendJson(response, statusCode, value) {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(value));
}

async function readJsonBody(request, maximumBytes = 64 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maximumBytes) throw new Error('The branch request is too large.');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('The branch request is invalid.');
  }
}

function clientWorkspace(directory, environment = process.env) {
  if (!directoryPattern.test(directory || '')) return undefined;
  const root = environment.SITEFORGE_PROSPECT_WORKSPACES_DIR?.trim();
  if (!root) return undefined;
  const candidate = resolve(root, directory);
  return candidate.startsWith(`${resolve(root)}/`) &&
    existsSync(resolve(candidate, '.git')) &&
    existsSync(resolve(candidate, 'package.json'))
    ? candidate
    : undefined;
}

export function workspaceCodexBranchPlugin(environment = process.env) {
  const studioWorkspace = environment.SITEFORGE_STUDIO_WORKSPACE_DIR?.trim() || process.cwd();
  const inferredRuntimeDataDirectory =
    environment.SITEFORGE_WORKSPACE_DEVELOPMENT === '1'
      ? resolve(studioWorkspace, '..', '..')
      : undefined;
  const runtimeDataDirectory =
    environment.SITEFORGE_RUNTIME_DATA_DIR?.trim() || inferredRuntimeDataDirectory;
  const pushNotifications = new CodexPushNotifications({
    storagePath: runtimeDataDirectory
      ? resolve(runtimeDataDirectory, 'codex-push-notifications.json')
      : resolve(studioWorkspace, '.made-solid', 'codex-push-notifications.json'),
  });
  const bridgeEnvironment = {
    ...environment,
    SITEFORGE_PROSPECT_WORKSPACES_DIR:
      environment.SITEFORGE_PROSPECT_WORKSPACES_DIR?.trim() ||
      (runtimeDataDirectory ? resolve(runtimeDataDirectory, 'prospect-workspaces') : undefined),
  };
  const bridgeSource = pathToFileURL(resolve(studioWorkspace, 'scripts/codex-feedback-bridge.mjs'));
  let bridge;
  let bridgeModifiedAt = 0;
  let loading;

  const loadBridge = async () => {
    const modifiedAt = (await stat(bridgeSource)).mtimeMs;
    if (bridge && modifiedAt === bridgeModifiedAt) return bridge;
    loading ??= import(`${bridgeSource.href}?workspace-branch=${modifiedAt}-${randomUUID()}`)
      .then(({ CodexFeedbackBridge }) => {
        bridge = new CodexFeedbackBridge({
          cwd: studioWorkspace,
          resolveClientWorkspace: (directory) => clientWorkspace(directory, bridgeEnvironment),
          runtimeWorkspaceRoots: [
            studioWorkspace,
            environment.MADE_SOLID_WEBSITE_DIRECTORY ||
              resolve(studioWorkspace, '..', 'made-solid-website'),
          ]
            .filter(Boolean)
            .map((directory) => resolve(directory)),
          storageRoot: runtimeDataDirectory
            ? resolve(runtimeDataDirectory, 'codex-feedback')
            : resolve(studioWorkspace, '.made-solid', 'codex-feedback'),
          notifyCompletion: (record) => pushNotifications.notifyCompletion(record),
        });
        bridgeModifiedAt = modifiedAt;
        return bridge;
      })
      .finally(() => {
        loading = undefined;
      });
    return loading;
  };

  return {
    name: 'made-solid-workspace-codex-branch',
    configureServer(server) {
      const maintainNotifications = async () => {
        const activeBridge = await loadBridge();
        const [records, notificationState] = await Promise.all([
          activeBridge.readRecords(),
          pushNotifications.state(),
        ]);
        const subscribedAt = notificationState.subscriptions
          .map((subscription) => Date.parse(subscription.createdAt))
          .filter(Number.isFinite)
          .sort((first, second) => first - second)[0];
        if (!subscribedAt) return;
        const missedCompletions = records.filter(
          (record) =>
            record.status === 'completed' &&
            !record.notificationSentAt &&
            Date.parse(record.completedAt) >= subscribedAt,
        );
        for (const record of missedCompletions) {
          await activeBridge.updateRecordStatus(record, 'completed', {
            notificationPending: true,
          });
        }
        await activeBridge.dispatchCompletionNotifications(
          missedCompletions.map((record) => ({ ...record, notificationPending: true })),
        );
      };
      const maintain = () => void maintainNotifications().catch(() => undefined);
      maintain();
      const notificationInterval = setInterval(maintain, 2_000);
      notificationInterval.unref();
      server.httpServer?.once('close', () => clearInterval(notificationInterval));
      server.middlewares.use(async (request, response, next) => {
        const requestUrl = new URL(request.url || '/', 'http://made-solid.local');
        if (requestUrl.pathname === workspaceCodexNotificationsEndpoint) {
          const fetchSite = String(request.headers['sec-fetch-site'] || '').toLowerCase();
          if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
            sendJson(response, 403, {
              status: 'forbidden',
              detail: 'Notification settings are only available from the private Workspace Studio.',
            });
            return;
          }
          try {
            if (request.method === 'GET') {
              sendJson(response, 200, await pushNotifications.configuration());
              return;
            }
            if (request.method !== 'POST') {
              response.statusCode = 405;
              response.end('Method not allowed');
              return;
            }
            const input = await readJsonBody(request, 32 * 1024);
            const result =
              input.action === 'subscribe'
                ? await pushNotifications.subscribe(input.subscription)
                : input.action === 'unsubscribe'
                  ? await pushNotifications.unsubscribe(input.endpoint)
                  : undefined;
            if (!result) throw new Error('Choose a valid notification action.');
            sendJson(response, 200, result);
            maintain();
          } catch (error) {
            sendJson(response, 400, {
              status: 'failed',
              detail:
                error instanceof Error
                  ? error.message
                  : 'Phone notification settings could not be updated.',
            });
          }
          return;
        }
        if (requestUrl.pathname !== workspaceCodexBranchEndpoint) return next();
        if (request.method !== 'POST') {
          response.statusCode = 405;
          response.end('Method not allowed');
          return;
        }
        const fetchSite = String(request.headers['sec-fetch-site'] || '').toLowerCase();
        if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site') {
          sendJson(response, 403, {
            status: 'forbidden',
            detail: 'This action is only available from the private Workspace Studio.',
          });
          return;
        }
        try {
          const input = await readJsonBody(request);
          if (input.action !== 'branch-thread') throw new Error('Choose a valid branch action.');
          const activeBridge = await loadBridge();
          const result = await activeBridge.forkThread(input);
          sendJson(response, 202, result);
        } catch (error) {
          sendJson(response, 400, {
            status: 'failed',
            detail:
              error instanceof Error ? error.message : 'The Codex conversation could not branch.',
          });
        }
      });
    },
  };
}
