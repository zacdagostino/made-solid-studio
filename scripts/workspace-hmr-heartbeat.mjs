const defaultHeartbeatIntervalMs = 20_000;

export function workspaceHmrHeartbeatPlugin({
  heartbeatIntervalMs = defaultHeartbeatIntervalMs,
} = {}) {
  return {
    name: 'made-solid:workspace-hmr-heartbeat',
    configureServer(server) {
      const heartbeat = setInterval(() => {
        // This server-originated HMR event crosses the authenticated owner gateway even when
        // Chrome has throttled the page's timers. Vite accepts unknown custom events, so the
        // message keeps the socket active without changing application state.
        server.ws.send({
          type: 'custom',
          event: 'made-solid:workspace-heartbeat',
          data: {},
        });
      }, heartbeatIntervalMs);
      heartbeat.unref();
      server.httpServer?.once('close', () => clearInterval(heartbeat));
    },
  };
}
