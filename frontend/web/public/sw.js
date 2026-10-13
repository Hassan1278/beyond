// Retire the pitch cache. Product journals never enter an offline shell cache.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key.startsWith('beyond-')).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.registration.unregister()),
  );
});
