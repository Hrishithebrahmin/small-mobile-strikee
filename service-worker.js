const CACHE_NAME = 'sms-strike-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/icon.png',
  '/index.tsx',
  '/App.tsx',
  '/constants.ts',
  '/types.ts',
  '/components/GameCanvas.tsx',
  '/components/Leaderboard.tsx',
  '/utils/audio.ts',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://aistudiocdn.com/react@^19.2.0',
  'https://aistudiocdn.com/react-dom@^19.2.0/client'
];

self.addEventListener('install', event => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // AddAll will fail if any of the requests fail.
        // Using a loop with individual add calls and catching errors for more resilience against CDN issues.
        const promises = URLS_TO_CACHE.map(url => {
          return fetch(new Request(url, { mode: 'no-cors' }))
            .then(response => cache.put(url, response))
            .catch(err => console.warn(`Failed to cache ${url}:`, err));
        });
        return Promise.all(promises);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});