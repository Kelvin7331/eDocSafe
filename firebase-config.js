// firebase-config.js — e-DocSafe Firebase Initialisation
// Fixes applied:
//  1. Removed duplicate window.firebaseApp = firebase overwrite at the bottom
//  2. Removed excessive console.log calls
//  3. Cleaner guard against double-initialisation

if (!window.firebaseApp) {
  const firebaseConfig = {
    apiKey:            "AIzaSyBU1Xooj84T1JKiKGBqbF9X1FI0_-xqr14",
    authDomain:        "e-docsafe.firebaseapp.com",
    projectId:         "e-docsafe",
    storageBucket:     "e-docsafe.firebasestorage.app",
    messagingSenderId: "628262513985",
    appId:             "1:628262513985:web:2e1f40162f5b07775885c0",
    measurementId:     "G-S5MXTHR4H5"
  };

  try {
    // Initialise Firebase app
    window.firebaseApp = firebase.initializeApp(firebaseConfig);

    // Initialise services and expose globally
    window.firebaseAuth      = firebase.auth();
    window.firebaseFirestore = firebase.firestore();
    window.firebaseStorage   = firebase.storage();

    // Enable Firestore offline persistence (fails silently in multi-tab)
    window.firebaseFirestore.enablePersistence({ synchronizeTabs: true })
      .catch((err) => {
        if (err.code !== 'failed-precondition' && err.code !== 'unimplemented') {
          console.warn('Firestore persistence error:', err.code);
        }
      });

  } catch (error) {
    console.error('Firebase initialisation error:', error);
  }

} else {
  // Already initialised — ensure globals are bound for pages that load this
  // script after firebase-app-compat.js (e.g. Sign-In / Sign-Up pages)
  if (!window.firebaseAuth)      window.firebaseAuth      = firebase.auth();
  if (!window.firebaseFirestore) window.firebaseFirestore = firebase.firestore();
  if (!window.firebaseStorage)   window.firebaseStorage   = firebase.storage();
}
