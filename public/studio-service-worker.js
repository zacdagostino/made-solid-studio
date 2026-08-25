/* global self */
self.addEventListener('push', (event) => {
  let data;
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = {};
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Codex finished', {
      body: data.body || 'Your Codex chat is ready to review.',
      data: { url: data.url || '/#/codex' },
      icon: '/made-solid-anvil.svg',
      tag: data.tag || 'codex-complete',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destination = new URL(event.notification.data?.url || '/#/codex', self.location.origin);
  if (destination.origin !== self.location.origin)
    destination.href = `${self.location.origin}/#/codex`;
  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(async (clients) => {
      const existing = clients.find(
        (client) => new URL(client.url).origin === self.location.origin,
      );
      if (existing) {
        await existing.navigate(destination.href);
        return existing.focus();
      }
      return self.clients.openWindow(destination.href);
    }),
  );
});
