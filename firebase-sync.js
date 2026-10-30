// firebase-sync.js — e-DocSafe Cloud Sync Manager
// Fixes applied:
//  1. Instantiation deferred to DOMContentLoaded so openDB / getAllDocs from
//     DBHelper.js are guaranteed to exist (was a race condition with defer)
//  2. Removed console.log spam; kept meaningful log points

class FirebaseSyncManager {
  constructor() {
    this.db        = window.firebaseFirestore;
    this.auth      = window.firebaseAuth;
    this.isOnline  = navigator.onLine;
    this.pendingSync = [];

    this.initNetworkListener();
    this.initAuthListener();
  }

  initNetworkListener() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingChanges();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  initAuthListener() {
    this.auth.onAuthStateChanged((user) => {
      if (user) {
        this.userId = user.uid;
        this.setupUserCollection();
      } else {
        this.userId = null;
        // Unsubscribe snapshot listener if it exists
        if (this._unsubscribeSnapshot) {
          this._unsubscribeSnapshot();
          this._unsubscribeSnapshot = null;
        }
      }
    });
  }

  setupUserCollection() {
    if (!this.userId) return;

    this.userDocsRef = this.db
      .collection('users')
      .doc(this.userId)
      .collection('documents');

    // Real-time listener for remote changes
    this._unsubscribeSnapshot = this.userDocsRef.onSnapshot((snapshot) => {
      if (!this.isOnline) return;

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          this.syncToIndexedDB(change.doc.data(), change.doc.id);
        }
      });
    }, (err) => {
      console.warn('Firestore snapshot error:', err.code);
    });
  }

  async syncToFirestore(docData, docId) {
    if (!this.userId || !this.isOnline) {
      this.queueForSync(docData, docId);
      return;
    }

    try {
      const docRef = this.userDocsRef.doc(docId || Date.now().toString());
      await docRef.set({
        ...docData,
        lastSynced: firebase.firestore.FieldValue.serverTimestamp(),
        userId: this.userId
      });

      this.removeFromPendingSync(docId);
    } catch (error) {
      console.warn('Firestore sync error:', error.code);
      this.queueForSync(docData, docId);
    }
  }

  async syncToIndexedDB(docData, docId) {
    try {
      const db    = await openDB();
      const tx    = db.transaction(['documents'], 'readwrite');
      const store = tx.objectStore('documents');

      const existing = await new Promise((res, rej) => {
        const req = store.get(docId);
        req.onsuccess = () => res(req.result);
        req.onerror   = () => rej(req.error);
      });

      if (!existing || new Date(docData.updatedAt) > new Date(existing.updatedAt)) {
        store.put({ ...docData, id: docId, synced: true });

        // Refresh UI if the docs view is active
        if (typeof loadDocs === 'function') loadDocs();
      }
    } catch (error) {
      console.warn('IndexedDB sync error:', error);
    }
  }

  queueForSync(docData, docId) {
    // Avoid duplicate queue entries
    if (!this.pendingSync.find(i => i.docId === docId)) {
      this.pendingSync.push({ docData, docId, timestamp: Date.now() });
      localStorage.setItem('pendingSync', JSON.stringify(this.pendingSync));
    }
  }

  removeFromPendingSync(docId) {
    this.pendingSync = this.pendingSync.filter(item => item.docId !== docId);
    localStorage.setItem('pendingSync', JSON.stringify(this.pendingSync));
  }

  async syncPendingChanges() {
    if (!this.userId || !this.isOnline) return;

    const pending = JSON.parse(localStorage.getItem('pendingSync') || '[]');
    for (const item of pending) {
      await this.syncToFirestore(item.docData, item.docId);
    }
  }

  async getAllFirestoreDocs() {
    if (!this.userId || !this.isOnline) return [];

    try {
      const snapshot = await this.userDocsRef.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.warn('Error fetching Firestore docs:', error.code);
      return [];
    }
  }

  async fullSync() {
    if (!this.userId || !this.isOnline) return;

    const firestoreDocs  = await this.getAllFirestoreDocs();
    const indexedDBDocs  = typeof getAllDocs === 'function' ? await getAllDocs() : [];

    await this.mergeDocuments(firestoreDocs, indexedDBDocs);

    if (typeof showNotification === 'function') {
      showNotification('info', 'Full sync completed');
    }
  }

  async mergeDocuments(firestoreDocs, indexedDBDocs) {
    const merged = [...indexedDBDocs];

    firestoreDocs.forEach(fsDoc => {
      if (!indexedDBDocs.find(dbDoc => dbDoc.id === fsDoc.id)) {
        merged.push(fsDoc);
      }
    });

    try {
      const db    = await openDB();
      const tx    = db.transaction(['documents'], 'readwrite');
      const store = tx.objectStore('documents');
      for (const doc of merged) store.put(doc);
    } catch (err) {
      console.warn('Merge IndexedDB write error:', err);
    }

    for (const dbDoc of indexedDBDocs) {
      const fsDoc = firestoreDocs.find(doc => doc.id === dbDoc.id);
      if (!fsDoc || new Date(dbDoc.updatedAt) > new Date(fsDoc.updatedAt)) {
        await this.syncToFirestore(dbDoc, dbDoc.id);
      }
    }
  }
}

// FIXED: defer instantiation until DOM is ready to guarantee DBHelper.js
// functions (openDB, getAllDocs) are available
function initSyncManager() {
  if (!window.firebaseFirestore || !window.firebaseAuth) {
    console.warn('firebase-sync.js: Firebase services not ready.');
    return;
  }
  window.firebaseSyncManager = new FirebaseSyncManager();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSyncManager);
} else {
  initSyncManager();
}
