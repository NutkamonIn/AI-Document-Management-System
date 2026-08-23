const CACHE_NAME = 'ai-doc-hub-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let network handle dynamic API calls directly
  if (event.request.url.includes('/api/')) {
    return;
  }
});
