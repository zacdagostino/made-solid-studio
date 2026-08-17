import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// @ts-expect-error The local Vite-only Node plugin is intentionally plain JavaScript.
import { localWorkspacePlugin } from './scripts/local-workspace-vite-plugin.mjs';

export default defineConfig({
  plugins: [react(), localWorkspacePlugin()],
  server: {
    allowedHosts: ['silver-fiesta-xg6xjqvw4pvhp477-5173.app.github.dev'],
  },
});
