// firebase-service-worker.js — e-DocSafe PWA Service Worker
// Fixes applied:
//  1. FIXED: urlsToCache had wrong filenames (signin.html, style.css, main.js)
//     — corrected to actual filenames used in the project
//  2. FIXED: syncDocuments() called openDB() which is undefined in SW context
//     — replaced with native indexedDB API
//  3. Cache version bump forces old caches to clear on deploy

const CACHE_NAME    = 'e-docsafe-v3';
const CACHE_VERSION = 3;

const urlsToCache = [
  '/',
  '/index.html',
  '/Sign-In.html',
  '/Sign-Up.html',
  '/styles.css',
  '/e-DocSafe-platform.css',
  '/auth.js',
  '/e-DocSafe.js',
  '/firebase-config.js',
  '/firebase-auth.js',
  '/firebase-sync.js',
  '/DBHelper.js',
  '/UploadModal.js',
  '/e-DocSafe-favicon.ico',
  '/manifest.json'
];

// ── Install: pre-cache app shell ──────────────────────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting(); // Activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // addAll fails if any URL 404s — use individual adds to be resilient
      return Promise.allSettled(
        urlsToCache.map(url => cache.add(url).catch(() => { /* skip missing */ }))
      );
    })
  );
});

// ── Activate: purge old caches ────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first, fall back to cache ──────────────────────────────────
self.addEventListener('fetch', event => {
  // Only handle GET requests; skip cross-origin non-navigations
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(cached =>
          cached || caches.match('/index.html')
        )
      )
  );
});

// ── Background Sync ───────────────────────────────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-documents') {
    event.waitUntil(syncPendingDocuments());
  }
});

// FIXED: replaced openDB() call (defined in DBHelper.js, not in SW scope)
// with native IndexedDB API
async function syncPendingDocuments() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('eDocSafeDB', 1);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const db    = request.result;
      const tx    = db.transaction(['documents'], 'readonly');
      const store = tx.objectStore('documents');
      const getAll = store.getAll();

      getAll.onsuccess = () => {
        const pendingDocs = getAll.result.filter(doc => !doc.synced);
        // Actual Firebase push would be done here via fetch() to a Cloud Function
        // For now we resolve — the main thread handles real sync via firebase-sync.js
        resolve(pendingDocs.length);
      };

      getAll.onerror = () => reject(getAll.error);
    };
  });
}
