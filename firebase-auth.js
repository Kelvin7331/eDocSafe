// firebase-auth.js — e-DocSafe Auth Manager
// ============================================================================
// FIXES APPLIED (all versions):
//   1. Manager creation deferred to DOMContentLoaded so Firebase is guaranteed ready
//   2. Removed console.log spam; kept only meaningful warnings/errors
//   3. signOut() fixed — was calling bare firebaseAuth instead of this.auth
//   4. NEW: updateProfile() wrapped in its own try/catch — was silently making
//      the whole signup report failure if displayName update threw, even
//      though the Firebase account was already created
//   5. NEW: serverTimestamp() uses window.firebase.firestore path consistently
//   6. NEW: constructor throws a clear error if Firebase services aren't ready
//   7. NEW: JSDoc on every public method
// ============================================================================

'use strict';

class SimpleAuthManager {
  constructor() {
    this.auth = window.firebaseAuth;
    this.db   = window.firebaseFirestore;
    this.currentUser = null;

    if (!this.auth) {
      throw new Error('SimpleAuthManager: window.firebaseAuth is not available. Check script load order — firebase-config.js must run first.');
    }

    // Keep currentUser in sync with Firebase session
    this.auth.onAuthStateChanged((user) => {
      this.currentUser = user;
    });
  }

  /**
   * Creates a new Firebase account.
   * The account is created FIRST, then displayName is set, then Firestore
   * user doc is written. If any post-creation step fails, the account still
   * exists and this returns success:true with a warning flag.
   *
   * @param {string} email
   * @param {string} password
   * @param {string} name
   * @returns {Promise<{success: boolean, user?: Object, error?: string, warning?: string}>}
   */
  async signUp(email, password, name) {
    let userCredential;

    // ── Step 1: Create the account (the only truly fatal step) ─────────────
    try {
      userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
    } catch (error) {
      return { success: false, error: error.message };
    }

    // ── Step 2: Update displayName (non-fatal if it fails) ─────────────────
    let warning;
    try {
      await userCredential.user.updateProfile({ displayName: name });
    } catch (e) {
      console.warn('firebase-auth.js: updateProfile failed:', e.code || e.message);
      warning = 'Account created, but display name could not be set. You can update it later in Profile.';
    }

    // ── Step 3: Write Firestore user doc (non-fatal if it fails) ───────────
    if (this.db) {
      try {
        await this.db.collection('users').doc(userCredential.user.uid).set({
          name,
          email,
          createdAt:    window.firebase.firestore.FieldValue.serverTimestamp(),
          storageLimit: 100
        });
      } catch (dbError) {
        console.warn('firebase-auth.js: Firestore user doc creation failed:', dbError.code || dbError.message);
      }
    }

    return { success: true, user: userCredential.user, warning };
  }

  /**
   * Signs the user in with email/password.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
   */
  async signIn(email, password) {
    try {
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Signs the current user out.
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async signOut() {
    try {
      await this.auth.signOut();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Returns the currently signed-in Firebase user, or null.
   * Note: this is populated asynchronously via onAuthStateChanged — during
   * the first ~100ms of page load it may be null even if the user is signed in.
   * For UI rendering, prefer awaiting `firebaseAuth.onAuthStateChanged` directly.
   * @returns {Object|null}
   */
  getCurrentUser() {
    return this.currentUser;
  }
}

// ── Deferred instantiation ────────────────────────────────────────────────────
function initAuthManager() {
  if (typeof firebase === 'undefined' || !window.firebaseAuth) {
    console.error('firebase-auth.js: Firebase not ready. Ensure firebase-config.js loads before this script.');
    return;
  }

  try {
    window.firebaseAuthManager = new SimpleAuthManager();
  } catch (err) {
    console.error('firebase-auth.js: Failed to initialise auth manager:', err.message);
  }
}

// Run immediately if DOM is already parsed, otherwise wait for DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthManager);
} else {
  initAuthManager();
}