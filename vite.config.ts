import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
// @ts-expect-error The local Vite-only Node plugin is intentionally plain JavaScript.
import { localWorkspacePlugin } from './scripts/local-workspace-vite-plugin.mjs';

function configuredHostname(value?: string) {
  if (!value) return undefined;
  const match = /^(?:https?:\/\/)?([a-z0-9](?:[a-z0-9.-]*[a-z0-9])?)(?::\d{1,5})?(?:\/|$)/i.exec(
    value.trim(),
  );
  return match?.[1]?.toLowerCase();
}

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, '.', '');
  const railwayAllowedHosts = [
    'healthcheck.railway.app',
    configuredHostname(environment.RAILWAY_PUBLIC_DOMAIN),
    configuredHostname(environment.SITEFORGE_PUBLIC_ORIGIN),
  ].filter((host): host is string => Boolean(host));

  return {
    plugins: [react(), localWorkspacePlugin()],
    preview: {
      allowedHosts: railwayAllowedHosts,
      headers: {
        'Content-Security-Policy':
          "frame-ancestors 'self' https://madesolid.com.au https://www.madesolid.com.au",
      },
    },
    server: {
      allowedHosts: ['silver-fiesta-xg6xjqvw4pvhp477-5173.app.github.dev'],
    },
  };
});
