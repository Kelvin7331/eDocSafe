// DBHelper.js — e-DocSafe IndexedDB Layer
// ============================================================================
// FIXES APPLIED (chronological, all still present):
//   1. CRITICAL: removed indexedDB.deleteDatabase("eDocSafeDB") — was wiping
//      the entire database on every single page load
//   2. FIXED: getAllDocs() used bare `db` variable which could be undefined
//      before openDB() resolves — now awaits openDB()
//   3. FIXED: updateDoc() same bare `db` race condition
//   4. FIXED: addDocWithSync() used store.add(doc) without awaiting the
//      IDBRequest — wrapped in a Promise so errors are actually caught
//   5. FIXED: onblocked handler was outside the Promise body (misplaced brace)
//   6. FIXED: "upgdade" typo in onblocked alert corrected to "upgrade"
//   7. FIXED: version upgrade branch (oldVersion < 2) tried to create indexes
//      that were already created in the initial store setup — guarded with
//      indexNames.contains() checks
//   8. IMPROVED: showNotification('info','Database ready!') fires on every
//      page load — changed to silent console.info
//   9. IMPROVED: compactDatabase() was a no-op stub — now actually clears
//      orphaned trash entries older than 30 days
//  10. IMPROVED: exported dbPromise so firebase-sync.js and other modules
//      can await it directly
//
// ROUND 2 FIXES (this version):
//  11. NEW: exposed window.deleteDocFromDB / restoreDocFromDB / purgeDocFromDB
//      so e-DocSafe.js can wrap them with confirmation dialogs WITHOUT
//      redefining the whole function (which previously overrode these with
//      buggy versions using bare `db`)
//  12. FIXED: deleteDoc now uses put() instead of add() on the trash store —
//      prevents ConstraintError if the id somehow already exists in trash
//  13. FIXED: executeTransaction now handles tx.onabort and synchronous
//      throws inside the operation() callback
//  14. IMPROVED: onupgradeneeded is fully defensive — ensures all required
//      indexes exist regardless of the store's prior state (fresh, v1, or
//      corrupted half-migrated)
//  15. IMPROVED: JSDoc comments on every public function
// ============================================================================

'use strict';

// ── Constants ─────────────────────────────────────────────────────────────────
const DB_NAME           = 'eDocSafeDB';
const DB_VERSION        = 2;
const STORE_NAME        = 'documents';
const TRASH_STORE       = 'trash';
const TRASH_EXPIRY_DAYS = 30;

// ── State ─────────────────────────────────────────────────────────────────────
let db = null;

// dbPromise is the canonical "database ready" signal for external modules.
// Internal operations below use openDB() directly — it handles the post-
// versionchange re-open case more gracefully than a stale promise would.
const dbPromise = openDB();
window.dbPromise = dbPromise;

// ════════════════════════════════════════════════════════════════════════════
//  SCHEMA / CONNECTION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Opens (or returns the cached) IndexedDB connection.
 * Creates the schema on first install and migrates v1 → v2 if needed.
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  return new Promise((resolve, reject) => {
    // Fast path — already open
    if (db) return resolve(db);

    if (!window.indexedDB) {
      if (typeof showNotification === 'function') {
        showNotification('error', "Your browser doesn't support IndexedDB.");
      }
      return reject(new Error('IndexedDB not supported'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // ── Success ─────────────────────────────────────────────────────────────
    request.onsuccess = (e) => {
      db = e.target.result;

      // Handle external version change (another tab upgraded the DB)
      db.onversionchange = () => {
        db.close();
        db = null;
        if (typeof showNotification === 'function') {
          showNotification('info', 'Database updated — please reload the page.');
        }
      };

      console.info('IndexedDB ready:', DB_NAME, 'v' + DB_VERSION);
      resolve(db);
    };

    // ── Error ───────────────────────────────────────────────────────────────
    request.onerror = (e) => {
      console.error('IndexedDB error:', e.target.error);
      if (typeof showNotification === 'function') {
        showNotification('error', 'Database error — some features may not work offline.');
      }
      reject(e.target.error);
    };

    // ── Blocked (another tab has an older version open) ─────────────────────
    request.onblocked = () => {
      console.warn('IndexedDB upgrade blocked — another tab may be open.');
      if (typeof showNotification === 'function') {
        showNotification('info', 'Please close other e-DocSafe tabs to finish the database upgrade.');
      }
    };

    // ── Schema creation / migration ─────────────────────────────────────────
    request.onupgradeneeded = (e) => {
      const upgradeDB  = e.target.result;
      const oldVersion = e.oldVersion;

      // ── Ensure documents store exists ───────────────────────────────────
      let docStore;
      if (!upgradeDB.objectStoreNames.contains(STORE_NAME)) {
        docStore = upgradeDB.createObjectStore(STORE_NAME, {
          keyPath:       'id',
          autoIncrement: true
        });
      } else {
        // Store already exists (this is an upgrade) — get a handle to it
        docStore = e.target.transaction.objectStore(STORE_NAME);
      }

      // ── Ensure trash store exists ───────────────────────────────────────
      if (!upgradeDB.objectStoreNames.contains(TRASH_STORE)) {
        upgradeDB.createObjectStore(TRASH_STORE, {
          keyPath:       'id',
          autoIncrement: true
        });
      }

      // ── Ensure ALL required indexes exist (defensive) ────────────────────
      // Handles every case: fresh install, v1→v2 upgrade, or an inconsistent
      // schema where an index was somehow lost. Existing indexes are kept.
      const requiredIndexes = [
        { name: 'name',        keyPath: 'name',        options: { unique: false } },
        { name: 'uploadedAt',  keyPath: 'uploadedAt',  options: { unique: false } },
        { name: 'favoritedAt', keyPath: 'favoritedAt', options: { unique: false } },
        { name: 'isEncrypted', keyPath: 'isEncrypted', options: { unique: false } },
        { name: 'sharedWith',  keyPath: 'sharedWith',  options: { multiEntry: true } }
      ];

      for (const idx of requiredIndexes) {
        if (!docStore.indexNames.contains(idx.name)) {
          docStore.createIndex(idx.name, idx.keyPath, idx.options);
        }
      }

      console.info(`IndexedDB schema: v${oldVersion} → v${DB_VERSION}`);
    };
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  READ HELPERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Fetches every document in the main store.
 * @returns {Promise<Array<Object>>}
 */
async function getAllDocs() {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx      = database.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror   = () => reject(request.error);
  });
}

/**
 * Fetches a single document by id.
 * @param {number|string} id
 * @returns {Promise<Object|null>}
 */
async function getDoc(id) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx      = database.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror   = () => reject(request.error);
  });
}

/**
 * Fetches every document currently in the trash.
 * @returns {Promise<Array<Object>>}
 */
async function getAllTrash() {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx      = database.transaction(TRASH_STORE, 'readonly');
    const request = tx.objectStore(TRASH_STORE).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror   = () => reject(request.error);
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  WRITE HELPERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Inserts or updates a document in the main store.
 * Caller is responsible for setting `updatedAt` on the doc for sync ordering.
 * @param {Object} doc
 * @returns {Promise<boolean>}
 */
async function updateDoc(doc) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx      = database.transaction(STORE_NAME, 'readwrite');
    const request = tx.objectStore(STORE_NAME).put(doc);
    request.onsuccess = () => resolve(true);
    request.onerror   = () => reject(request.error);
  });
}

/**
 * Moves a document from the main store to the trash store.
 * Adds `deletedAt` and `originalStore` metadata.
 * @param {number|string} id
 * @returns {Promise<boolean>} true if moved, false if not found
 */
async function deleteDoc(id) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx         = database.transaction([STORE_NAME, TRASH_STORE], 'readwrite');
    const docStore   = tx.objectStore(STORE_NAME);
    const trashStore = tx.objectStore(TRASH_STORE);

    const getRequest = docStore.get(id);

    getRequest.onsuccess = () => {
      const doc = getRequest.result;
      if (!doc) return resolve(false);

      doc.deletedAt     = new Date().toISOString();
      doc.originalStore = STORE_NAME;

      // put() not add() — safe if the id somehow already exists in trash
      trashStore.put(doc);
      docStore.delete(id);
    };

    getRequest.onerror = () => reject(getRequest.error);

    tx.oncomplete = () => resolve(true);
    tx.onerror    = () => reject(tx.error);
  });
}

/**
 * Moves a document from the trash store back to the main store.
 * @param {number|string} id
 * @returns {Promise<boolean>} true if restored, false if not in trash
 */
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
    };

    getRequest.onerror = () => reject(getRequest.error);

    tx.oncomplete = () => resolve(true);
    tx.onerror    = () => reject(tx.error);
  });
}

/**
 * Permanently deletes a document from the trash store.
 * @param {number|string} id
 * @returns {Promise<boolean>}
 */
async function purgeDoc(id) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx      = database.transaction(TRASH_STORE, 'readwrite');
    const request = tx.objectStore(TRASH_STORE).delete(id);
    request.onsuccess = () => resolve(true);
    request.onerror   = () => reject(request.error);
  });
}

/**
 * Generic multi-store transaction helper.
 * @param {string|string[]} storeNames
 * @param {'readonly'|'readwrite'} mode
 * @param {(tx: IDBTransaction) => void} operation - synchronous setup callback
 * @returns {Promise<void>}
 */
async function executeTransaction(storeNames, mode, operation) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    let tx;
    try {
      tx = database.transaction(storeNames, mode);
      operation(tx);
    } catch (err) {
      return reject(err);
    }

    tx.oncomplete = () => resolve();
    tx.onerror    = (e) => reject(e.target.error);
    tx.onabort    = ()  => reject(tx.error || new Error('Transaction aborted'));
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  FIREBASE SYNC WRAPPERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Pushes a document to Firestore via the sync manager (if loaded).
 * Silently no-ops if firebase-sync.js isn't present.
 * @param {Object} doc
 */
async function syncDocumentToFirebase(doc) {
  if (window.firebaseSyncManager) {
    try {
      await window.firebaseSyncManager.syncToFirestore(doc, doc.id);
    } catch (err) {
      console.warn('Firebase sync failed for doc', doc.id, ':', err);
    }
  }
}

/**
 * Updates a doc locally and pushes to Firestore.
 * @param {Object} doc
 * @returns {Promise<boolean>}
 */
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

/**
 * Adds a new doc, captures the auto-generated id, then syncs to Firestore.
 * @param {Object} doc
 * @returns {Promise<number|string|null>} new id, or null on failure
 */
async function addDocWithSync(doc) {
  try {
    const database = await openDB();

    const newId = await new Promise((resolve, reject) => {
      const tx      = database.transaction(STORE_NAME, 'readwrite');
      const request = tx.objectStore(STORE_NAME).add(doc);
      request.onsuccess = () => resolve(request.result);
      request.onerror   = () => reject(request.error);
    });

    await syncDocumentToFirebase({ ...doc, id: newId });
    return newId;

  } catch (error) {
    console.error('addDocWithSync failed:', error);
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  MAINTENANCE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Purges trash entries older than TRASH_EXPIRY_DAYS (30 days).
 * Runs automatically once per app load (non-blocking, silent if nothing to do).
 */
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

// ════════════════════════════════════════════════════════════════════════════
//  ALIASES FOR e-DocSafe.js
// ────────────────────────────────────────────────────────────────────────────
// These let e-DocSafe.js wrap the core DB operations with confirmation
// dialogs and UI refresh WITHOUT redefining the functions themselves (which
// was the bug — the local versions used bare `db` and overrode these).
//
// Usage in e-DocSafe.js:
//   const ok = await window.deleteDocFromDB(id);   // core logic
//   if (ok) { loadDocs(); showNotification(...); } // UI wrapper
// ════════════════════════════════════════════════════════════════════════════
window.deleteDocFromDB  = deleteDoc;
window.restoreDocFromDB = restoreDoc;
window.purgeDocFromDB   = purgeDoc;

// ════════════════════════════════════════════════════════════════════════════
//  RUN COMPACTION ON LOAD (non-blocking)
// ════════════════════════════════════════════════════════════════════════════
dbPromise
  .then(() => compactDatabase())
  .catch((err) => console.warn('DB ready chain failed:', err));