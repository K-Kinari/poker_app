const CACHE_NAME = 'poker-app-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './src/index.css',
  './src/main.js',
  './src/utils/constants.js',
  './src/utils/dom.js',
  './src/utils/formatters.js',
  './src/store/GameStore.js',
  './src/core/PotManager.js',
  './src/core/SeatManager.js',
  './src/core/HandManager.js',
  './src/core/ActionValidator.js',
  './src/core/GameEngine.js',
  './src/components/PlayerSeat.js',
  './src/components/PotDisplay.js',
  './src/components/ActionButtons.js',
  './src/components/SmartRaiseSlider.js',
  './src/screens/SetupScreen.js',
  './src/screens/TableScreen.js',
  './src/screens/ShowdownScreen.js',
  './src/screens/SettlementScreen.js',
  './src/screens/AdminScreen.js',
  './src/screens/HistoryScreen.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          function(response) {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            var responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });
            return response;
          }
        );
      })
  );
});
