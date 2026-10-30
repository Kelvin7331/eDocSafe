// firebase-auth.js — e-DocSafe Auth Manager
// Fixes applied:
//  1. Manager creation deferred to DOMContentLoaded so Firebase is guaranteed ready
//  2. Removed console.log spam; kept only meaningful warnings/errors
//  3. signOut() fixed — was calling bare firebaseAuth instead of this.auth

class SimpleAuthManager {
  constructor() {
    this.auth = window.firebaseAuth;
    this.db   = window.firebaseFirestore;
    this.currentUser = null;

    this.auth.onAuthStateChanged((user) => {
      this.currentUser = user;
    });
  }

  async signUp(email, password, name) {
    try {
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);

      await userCredential.user.updateProfile({ displayName: name });

      if (this.db) {
        try {
          await this.db.collection('users').doc(userCredential.user.uid).set({
            name,
            email,
            createdAt:    firebase.firestore.FieldValue.serverTimestamp(),
            storageLimit: 100
          });
        } catch (dbError) {
          console.warn('Firestore user doc creation failed:', dbError.code);
        }
      }

      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async signIn(email, password) {
    try {
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async signOut() {
    try {
      // FIXED: was calling bare `firebaseAuth.signOut()` (undefined in this scope)
      await this.auth.signOut();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }
}

// FIXED: defer creation until DOM (and Firebase config) is guaranteed loaded
function initAuthManager() {
  if (typeof firebase === 'undefined' || !window.firebaseAuth) {
    console.error('firebase-auth.js: Firebase not ready. Ensure firebase-config.js loads first.');
    return;
  }

  window.firebaseAuthManager = new SimpleAuthManager();
}

// If the DOM is already loaded (e.g. script runs after DOMContentLoaded), init immediately
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthManager);
} else {
  initAuthManager();
}
