import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
// @ts-expect-error The local Vite-only Node plugin is intentionally plain JavaScript.
import { localWorkspacePlugin } from './scripts/local-workspace-vite-plugin.mjs';
// @ts-expect-error The private Workspace Vite-only bridge is intentionally plain JavaScript.
import { workspaceCodexBranchPlugin } from './scripts/workspace-codex-branch-vite-plugin.mjs';

function configuredHostname(value?: string) {
  if (!value) return undefined;
  const match = /^(?:https?:\/\/)?([a-z0-9](?:[a-z0-9.-]*[a-z0-9])?)(?::\d{1,5})?(?:\/|$)/i.exec(
    value.trim(),
  );
  return match?.[1]?.toLowerCase();
}

function loopbackRuntimeTarget(value?: string) {
  if (!value) return undefined;
  const match = /^http:\/\/(?:127\.0\.0\.1|localhost):(\d{1,5})$/.exec(value.trim());
  const port = Number(match?.[1]);
  if (!match || port < 1 || port > 65_535) {
    throw new Error('SITEFORGE_RUNTIME_API_PROXY_ORIGIN must be an exact loopback HTTP origin.');
  }
  return value.trim();
}

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, '.', '');
  const workspaceDevelopment = environment.SITEFORGE_WORKSPACE_DEVELOPMENT === '1';
  const runtimeApiTarget = loopbackRuntimeTarget(environment.SITEFORGE_RUNTIME_API_PROXY_ORIGIN);
  if (workspaceDevelopment !== Boolean(runtimeApiTarget)) {
    throw new Error(
      'Workspace development mode and its internal runtime API proxy must be configured together.',
    );
  }
  const railwayAllowedHosts = [
    'healthcheck.railway.app',
    configuredHostname(environment.RAILWAY_PUBLIC_DOMAIN),
    configuredHostname(environment.SITEFORGE_PUBLIC_ORIGIN),
    configuredHostname(environment.SITEFORGE_DEVELOPMENT_ORIGIN),
    configuredHostname(environment.SITEFORGE_WORKSPACE_PREVIEW_ORIGIN),
    ...(environment.SITEFORGE_DEVELOPMENT_COMPATIBILITY_ORIGINS || '')
      .split(/[\s,]+/)
      .map(configuredHostname),
  ].filter((host): host is string => Boolean(host));
  const frameAncestors = workspaceDevelopment
    ? "frame-ancestors 'none'"
    : "frame-ancestors 'self' https://madesolid.com.au https://www.madesolid.com.au";

  return {
    plugins: [
      react(),
      ...(workspaceDevelopment ? [workspaceCodexBranchPlugin()] : [localWorkspacePlugin()]),
    ],
    preview: {
      allowedHosts: railwayAllowedHosts,
      headers: {
        'Content-Security-Policy': frameAncestors,
      },
    },
    server: {
      allowedHosts: ['silver-fiesta-xg6xjqvw4pvhp477-5173.app.github.dev', ...railwayAllowedHosts],
      headers: {
        'Content-Security-Policy': frameAncestors,
      },
      proxy: runtimeApiTarget
        ? {
            '/__made-solid': {
              changeOrigin: true,
              target: runtimeApiTarget,
              ws: true,
            },
          }
        : undefined,
    },
  };
});
