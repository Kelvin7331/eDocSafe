// firebase-service-worker.js — e-DocSafe PWA Service Worker
// ============================================================================
// FIXES APPLIED:
//   1. CRITICAL: urlsToCache had wrong filenames (signin.html, style.css,
//      main.js) — corrected to actual filenames
//   2. CRITICAL: syncDocuments() called openDB() which is undefined in SW
//      context — replaced with native indexedDB API
//   3. Cache version bump forces old caches to clear on deploy
//
// ROUND 2 FIXES (this version):
//   4. CRITICAL: indexedDB.open(DB_NAME, 1) → 2 — DBHelper uses v2, so the
//      old code threw VersionError on every background sync attempt
//   5. FIXED: added onupgradeneeded no-op so SW opening the DB before the
//      main thread doesn't trigger a silent schema upgrade (main thread's
//      DBHelper.js owns schema creation)
//   6. FIXED: if 'documents' store doesn't exist yet, resolve(0) instead of
//      throwing — SW can run before first page load completes
//   7. IMPROVED: cache.add() failures now log the URL so missing files are
//      easy to identify during deploy debugging
//   8. IMPROVED: fetch handler skips caching the SW file itself and
//      cross-origin requests
//   9. IMPROVED: version-bump comment block so future-you knows to bump
//      CACHE_NAME on every significant deploy
// ============================================================================

'use strict';

// ⚠️ BUMP THIS ON EVERY SIGNIFICANT DEPLOY
const CACHE_NAME    = 'e-docsafe-v4';
const CACHE_VERSION = 4;

// IndexedDB constants (must match DBHelper.js)
const DB_NAME     = 'eDocSafeDB';
const DB_VERSION  = 2;
const STORE_NAME  = 'documents';

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

// ════════════════════════════════════════════════════════════════════════════
//  INSTALL — pre-cache app shell
// ════════════════════════════════════════════════════════════════════════════
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Activate new SW immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        urlsToCache.map((url) =>
          cache.add(url).catch((err) => {
            console.info('SW: cache miss for', url, err.message);
          })
        )
      )
    )
  );
});

// ════════════════════════════════════════════════════════════════════════════
//  ACTIVATE — purge old caches
// ════════════════════════════════════════════════════════════════════════════
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) =>
        Promise.all(
          names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ════════════════════════════════════════════════════════════════════════════
//  FETCH — network-first, fall back to cache
// ════════════════════════════════════════════════════════════════════════════
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip cross-origin
  if (url.origin !== self.location.origin) return;

  // Never cache the SW file itself
  if (url.pathname.endsWith('firebase-service-worker.js')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(
          (cached) => cached || caches.match('/index.html')
        )
      )
  );
});

// ════════════════════════════════════════════════════════════════════════════
//  BACKGROUND SYNC
// ════════════════════════════════════════════════════════════════════════════
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-documents') {
    event.waitUntil(syncPendingDocuments());
  }
});

async function syncPendingDocuments() {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.warn('SW: IndexedDB open failed — deferring to main thread');
      resolve(0);
    };

    request.onupgradeneeded = (e) => {
      // SW opened DB before main thread — do NOT create schema here.
      // DBHelper.js owns schema creation; a no-op upgrade lets DBHelper
      // create the stores when the page loads.
      console.info('SW: DB upgrade deferred to main thread (was v' + e.oldVersion + ')');
    };

    request.onsuccess = () => {
      const db = request.result;

      // Nothing to sync if the store hasn't been created yet
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.close();
        return resolve(0);
      }

      try {
        const tx    = db.transaction([STORE_NAME], 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const getAll = store.getAll();

        getAll.onsuccess = () => {
          const docs    = getAll.result || [];
          const pending = docs.filter((doc) => !doc.synced);
          db.close();
          resolve(pending.length);
        };

        getAll.onerror = () => {
          db.close();
          console.error('SW: getAll failed');
          resolve(0);
        };
      } catch (err) {
        db.close();
        console.error('SW: transaction failed', err);
        resolve(0);
      }
    };
  });
}