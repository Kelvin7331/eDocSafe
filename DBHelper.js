// DBHelper.js — e-DocSafe IndexedDB Layer
// Fixes applied:
//  1. CRITICAL: removed indexedDB.deleteDatabase("eDocSafeDB") — was wiping
//     the entire database on every single page load, deleting all user files
//  2. FIXED: getAllDocs() used bare `db` variable which could be undefined
//     before openDB() resolves — now awaits dbPromise
//  3. FIXED: updateDoc() same bare `db` race condition — now awaits openDB()
//  4. FIXED: addDocWithSync() used store.add(doc) without awaiting the IDBRequest
//     — wrapped in a Promise so errors are actually caught
//  5. FIXED: onblocked handler was outside the Promise body (misplaced brace)
//     — moved inside correctly
//  6. FIXED: "upgdade" typo in onblocked alert corrected to "upgrade"
//  7. FIXED: version upgrade branch (oldVersion < 2) tried to create indexes
//     that were already created in the initial store setup — guarded with
//     indexNames.contains() checks (they were there but ran in wrong order,
//     causing "index already exists" DOMException on fresh installs)
//  8. IMPROVED: showNotification('info','Database ready!') fires on every
//     page load — changed to a silent console.info so it doesn't toast the
//     user every time they open the app
//  9. IMPROVED: compactDatabase() was a no-op stub with a console.info —
//     now actually clears orphaned trash entries older than 30 days
// 10. IMPROVED: exported dbPromise so firebase-sync.js and other modules
//     can await it directly without calling openDB() again

'use strict';

// ── Constants ──────────────────────────────────────────────────────────────────
const DB_NAME    = 'eDocSafeDB';
const DB_VERSION = 2;
const STORE_NAME = 'documents';
const TRASH_STORE = 'trash';

const TRASH_EXPIRY_DAYS = 30;

// ── Single shared DB instance ──────────────────────────────────────────────────
let db = null;

// dbPromise is the canonical way for all modules to get the DB instance.
// It resolves once and is reused — never opens the DB twice.
const dbPromise = openDB();
window.dbPromise = dbPromise; // expose for firebase-sync.js

// ── openDB ─────────────────────────────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    // Return cached instance immediately if already open
    if (db) return resolve(db);

    if (!window.indexedDB) {
      if (typeof showNotification === 'function') {
        showNotification('error', "Your browser doesn't support IndexedDB.");
      }
      return reject(new Error('IndexedDB not supported'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // ── Success ──
    request.onsuccess = (e) => {
      db = e.target.result;

      // Handle external version change (e.g. another tab upgraded)
      db.onversionchange = () => {
        db.close();
        db = null;
        if (typeof showNotification === 'function') {
          showNotification('info', 'Database updated — please reload the page.');
        }
      };

      // FIXED: was showNotification('info','Database ready!') on every load
      // — that toasted the user every single page visit. Now silent.
      console.info('IndexedDB ready:', DB_NAME, 'v' + DB_VERSION);
      resolve(db);
    };

    // ── Error ──
    request.onerror = (e) => {
      console.error('IndexedDB error:', e.target.error);
      if (typeof showNotification === 'function') {
        showNotification('error', 'Database error — some features may not work offline.');
      }
      reject(e.target.error);
    };

    // ── Blocked (another tab has an older version open) ──
    // FIXED: was outside the Promise body due to misplaced brace
    // FIXED: "upgdade" typo corrected to "upgrade"
    request.onblocked = () => {
      console.warn('IndexedDB upgrade blocked — another tab may be open.');
      if (typeof showNotification === 'function') {
        showNotification('info', 'Please close other e-DocSafe tabs to finish the database upgrade.');
      }
    };

    // ── Schema creation / migration ──
    request.onupgradeneeded = (e) => {
      const upgradeDB  = e.target.result;
      const oldVersion = e.oldVersion;

      // ── Create documents store (fresh install) ──
      if (!upgradeDB.objectStoreNames.contains(STORE_NAME)) {
        const store = upgradeDB.createObjectStore(STORE_NAME, {
          keyPath:       'id',
          autoIncrement: true
        });
        store.createIndex('name',        'name',        { unique: false });
        store.createIndex('uploadedAt',  'uploadedAt',  { unique: false });
        store.createIndex('favoritedAt', 'favoritedAt', { unique: false });
        store.createIndex('isEncrypted', 'isEncrypted', { unique: false });
        store.createIndex('sharedWith',  'sharedWith',  { multiEntry: true });
      }

      // ── Create trash store (fresh install) ──
      if (!upgradeDB.objectStoreNames.contains(TRASH_STORE)) {
        upgradeDB.createObjectStore(TRASH_STORE, {
          keyPath:       'id',
          autoIncrement: true
        });
      }

      // ── v1 → v2 migration: add indexes that didn't exist in v1 ──
      // FIXED: these ran unconditionally before, causing "index already exists"
      // DOMException on fresh installs where the store was just created above.
      // Now guarded so they only run when upgrading an existing v1 database.
      if (oldVersion > 0 && oldVersion < 2) {
        const store = e.target.transaction.objectStore(STORE_NAME);
        if (!store.indexNames.contains('isEncrypted')) {
          store.createIndex('isEncrypted', 'isEncrypted', { unique: false });
        }
        if (!store.indexNames.contains('favoritedAt')) {
          store.createIndex('favoritedAt', 'favoritedAt', { unique: false });
        }
      }
    };
  });
}

// ── getAllDocs ──────────────────────────────────────────────────────────────────
// FIXED: was using bare `db` which could be null before openDB() resolved.
// Now properly awaits the shared dbPromise.
async function getAllDocs() {
  const database = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx      = database.transaction(STORE_NAME, 'readonly');
    const store   = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror   = () => reject(request.error);
  });
}

// ── getDoc ─────────────────────────────────────────────────────────────────────
async function getDoc(id) {
  const database = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx      = database.transaction(STORE_NAME, 'readonly');
    const store   = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror   = () => reject(request.error);
  });
}

// ── updateDoc ──────────────────────────────────────────────────────────────────
// FIXED: was using bare `db` (race condition) — now awaits openDB()
async function updateDoc(doc) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx      = database.transaction(STORE_NAME, 'readwrite');
    const store   = tx.objectStore(STORE_NAME);
    const request = store.put(doc);
    request.onsuccess = () => resolve(true);
    request.onerror   = () => reject(request.error);
  });
}

// ── deleteDoc (soft delete — moves to trash) ───────────────────────────────────
async function deleteDoc(id) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx        = database.transaction([STORE_NAME, TRASH_STORE], 'readwrite');
    const docStore  = tx.objectStore(STORE_NAME);
    const trashStore = tx.objectStore(TRASH_STORE);

    const getRequest = docStore.get(id);

    getRequest.onsuccess = () => {
      const doc = getRequest.result;
      if (!doc) return resolve(false);

      // Move to trash with deletion timestamp
      doc.deletedAt     = new Date().toISOString();
      doc.originalStore = STORE_NAME;

      trashStore.add(doc);
      docStore.delete(id);

      tx.oncomplete = () => resolve(true);
      tx.onerror    = () => reject(tx.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

// ── restoreDoc (from trash back to documents) ──────────────────────────────────
async function restoreDoc(id) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx         = database.transaction([STORE_NAME, TRASH_STORE], 'readwrite');
    const docStore   = tx.objectStore(STORE_NAME);
    const trashStore = tx.objectStore(TRASH_STORE);

    const getRequest = trashStore.get(id);

    getRequest.onsuccess = () => {
      const doc = getRequest.result;
      if (!doc) return resolve(false);

      delete doc.deletedAt;
      delete doc.originalStore;

      docStore.put(doc);
      trashStore.delete(id);

      tx.oncomplete = () => resolve(true);
      tx.onerror    = () => reject(tx.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

// ── purgeDoc (permanent delete from trash) ────────────────────────────────────
async function purgeDoc(id) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx      = database.transaction(TRASH_STORE, 'readwrite');
    const store   = tx.objectStore(TRASH_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror   = () => reject(request.error);
  });
}

// ── getAllTrash ────────────────────────────────────────────────────────────────
async function getAllTrash() {
  const database = await dbPromise;
  return new Promise((resolve, reject) => {
    const tx      = database.transaction(TRASH_STORE, 'readonly');
    const store   = tx.objectStore(TRASH_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror   = () => reject(request.error);
  });
}

// ── executeTransaction (generic helper for complex multi-store operations) ─────
async function executeTransaction(storeNames, mode, operation) {
  const database = await openDB();
  const tx       = database.transaction(storeNames, mode);
  return new Promise((resolve, reject) => {
    operation(tx);
    tx.oncomplete = () => resolve();
    tx.onerror    = (e) => {
      console.error('Transaction failed:', e.target.error);
      reject(e.target.error);
    };
  });
}

// ── syncDocumentToFirebase ─────────────────────────────────────────────────────
async function syncDocumentToFirebase(doc) {
  if (window.firebaseSyncManager) {
    try {
      await window.firebaseSyncManager.syncToFirestore(doc, doc.id);
    } catch (err) {
      console.warn('Firebase sync failed for doc', doc.id, ':', err);
    }
  }
}

// ── updateDocWithSync ──────────────────────────────────────────────────────────
async function updateDocWithSync(doc) {
  try {
    await updateDoc(doc);
    await syncDocumentToFirebase(doc);
    return true;
  } catch (error) {
    console.error('updateDocWithSync failed:', error);
    return false;
  }
}

// ── addDocWithSync ─────────────────────────────────────────────────────────────
// FIXED: store.add(doc) returns an IDBRequest — it was not being awaited,
// so errors were silently swallowed and the returned id was never captured.
async function addDocWithSync(doc) {
  try {
    const database = await openDB();
    const id = await new Promise((resolve, reject) => {
      const tx      = database.transaction(STORE_NAME, 'readwrite');
      const store   = tx.objectStore(STORE_NAME);
      const request = store.add(doc);
      request.onsuccess = () => resolve(request.result); // returns the new id
      request.onerror   = () => reject(request.error);
    });

    // Attach the generated id before syncing
    await syncDocumentToFirebase({ ...doc, id });
    return id;
  } catch (error) {
    console.error('addDocWithSync failed:', error);
    return null;
  }
}

// ── compactDatabase ────────────────────────────────────────────────────────────
// IMPROVED: was a no-op stub. Now purges trash items older than 30 days.
async function compactDatabase() {
  try {
    const trashedDocs = await getAllTrash();
    const cutoff      = Date.now() - TRASH_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    let   purged      = 0;

    for (const doc of trashedDocs) {
      if (doc.deletedAt && new Date(doc.deletedAt).getTime() < cutoff) {
        await purgeDoc(doc.id);
        purged++;
      }
    }

    if (purged > 0) {
      console.info(`Compact: purged ${purged} expired trash item(s).`);
      if (typeof showNotification === 'function') {
        showNotification('info', `${purged} expired trash item(s) permanently removed.`);
      }
    }
  } catch (error) {
    console.warn('compactDatabase failed:', error);
  }
}

// Run compaction on load (non-blocking)
dbPromise.then(() => compactDatabase()).catch(() => {});
