// auth.js — e-DocSafe Authentication Logic
// Fixes applied:
//  1. Removed dead ensureAuthManager() fallback — auth uses window.firebaseAuth directly
//  2. Fixed window.firebaseFire → window.firebaseFirestore (was causing silent Firestore failure)
//  3. checkAuthState() now guards Sign-Up page as well
//  4. Replaced prompt()/alert() for forgot password with in-page modal
//  5. Removed excessive console.log calls

// ─── Password visibility toggle ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.toggle-password').forEach(toggle => {
    toggle.addEventListener('click', function () {
      const targetId = this.getAttribute('data-target');
      const passwordInput = document.getElementById(targetId);
      const icon = this.querySelector('i');

      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.className = 'fas fa-eye-slash';
        this.setAttribute('aria-label', 'Hide password');
      } else {
        passwordInput.type = 'password';
        icon.className = 'fas fa-eye';
        this.setAttribute('aria-label', 'Show password');
      }
    });
  });
});

// ─── Sign-Up Logic ─────────────────────────────────────────────────────────────
const signupForm = document.getElementById('signup-form');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name     = document.getElementById('signup-name').value.trim();
    const email    = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm  = document.getElementById('signup-confirm').value;
    const msg      = document.getElementById('signup-message');

    msg.textContent = '';
    msg.style.color = '';

    // ── Validation ──
    if (!name || !email || !password || !confirm) {
      showFormMsg(msg, 'All fields are required.', 'error');
      return;
    }

    if (password !== confirm) {
      showFormMsg(msg, 'Passwords do not match.', 'error');
      return;
    }

    if (password.length < 6) {
      showFormMsg(msg, 'Password must be at least 6 characters.', 'error');
      return;
    }

    // ── Guard: Firebase must be ready ──
    if (!window.firebaseAuth) {
      showFormMsg(msg, 'Authentication service is not ready. Please refresh.', 'error');
      return;
    }

    const submitBtn  = signupForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating account…';
    submitBtn.disabled = true;

    try {
      const userCredential = await window.firebaseAuth.createUserWithEmailAndPassword(email, password);

      if (userCredential.user) {
        // Set display name
        await userCredential.user.updateProfile({ displayName: name });

        // Create Firestore user document
        // FIXED: was window.firebaseFire (undefined) — corrected to window.firebaseFirestore
        if (window.firebaseFirestore) {
          try {
            await window.firebaseFirestore.collection('users').doc(userCredential.user.uid).set({
              name:         name,
              email:        email,
              createdAt:    new Date().toISOString(),
              storageLimit: 100
            });
          } catch (dbErr) {
            // Non-fatal: log only; don't surface to user
            console.warn('Firestore user doc creation failed:', dbErr.code);
          }
        }

        // Cache minimal user info locally
        localStorage.setItem('currentUser', JSON.stringify({
          uid:         userCredential.user.uid,
          email:       userCredential.user.email,
          displayName: name
        }));
      }

      showFormMsg(msg, 'Account created! Redirecting…', 'success');
      setTimeout(() => { window.location.href = 'index.html'; }, 2000);

    } catch (error) {
      submitBtn.textContent = originalText;
      submitBtn.disabled    = false;

      switch (error.code) {
        case 'auth/email-already-in-use':
          showFormMsg(msg, 'This email is already registered.', 'error'); break;
        case 'auth/weak-password':
          showFormMsg(msg, 'Password is too weak. Use at least 6 characters.', 'error'); break;
        case 'auth/invalid-email':
          showFormMsg(msg, 'Invalid email address.', 'error'); break;
        default:
          showFormMsg(msg, 'Sign-up failed: ' + error.message, 'error');
      }
    }
  });
}

// ─── Sign-In Logic ─────────────────────────────────────────────────────────────
const signinForm = document.getElementById('signin-form');
if (signinForm) {
  signinForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email      = document.getElementById('signin-email').value.trim();
    const password   = document.getElementById('signin-password').value;
    const rememberMe = document.getElementById('rememberMe')?.checked || false;
    const msg        = document.getElementById('signin-message');

    msg.textContent = '';
    msg.style.color = '';

    if (!email || !password) {
      showFormMsg(msg, 'Both fields are required.', 'error');
      return;
    }

    if (!window.firebaseAuth) {
      showFormMsg(msg, 'Authentication service is not ready. Please refresh.', 'error');
      return;
    }

    const submitBtn    = signinForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Signing in…';
    submitBtn.disabled    = true;

    try {
      const userCredential = await window.firebaseAuth.signInWithEmailAndPassword(email, password);

      // Remember Me
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      // Cache user info
      const user = userCredential.user;
      if (user) {
        localStorage.setItem('currentUser', JSON.stringify({
          uid:         user.uid,
          email:       user.email,
          displayName: user.displayName
        }));
      }

      showFormMsg(msg, 'Sign in successful! Redirecting…', 'success');
      setTimeout(() => { window.location.href = 'index.html'; }, 1000);

    } catch (error) {
      submitBtn.textContent = originalText;
      submitBtn.disabled    = false;

      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/invalid-credential':
          showFormMsg(msg, 'No account found with this email.', 'error'); break;
        case 'auth/wrong-password':
          showFormMsg(msg, 'Incorrect password. Please try again.', 'error'); break;
        case 'auth/too-many-requests':
          showFormMsg(msg, 'Too many failed attempts. Try again later.', 'error'); break;
        default:
          showFormMsg(msg, 'Sign in failed: ' + error.message, 'error');
      }
    }
  });

  // Pre-fill remembered email
  const rememberedEmail = localStorage.getItem('rememberedEmail');
  if (rememberedEmail) {
    const emailField = document.getElementById('signin-email');
    if (emailField) emailField.value = rememberedEmail;
    const rememberBox = document.getElementById('rememberMe');
    if (rememberBox) rememberBox.checked = true;
  }
}

// ─── Forgot Password — in-page modal ─────────────────────────────────────────
// IMPROVED: replaced browser prompt() / alert() with an in-page modal
function forgotPassword() {
  const modal = document.getElementById('forgotModal');
  if (modal) {
    modal.classList.remove('hidden');
    const emailInput = document.getElementById('forgotEmail');
    if (emailInput) emailInput.focus();
    const forgotMsg = document.getElementById('forgotMessage');
    if (forgotMsg) forgotMsg.textContent = '';
  }
}

function closeForgotModal() {
  const modal = document.getElementById('forgotModal');
  if (modal) modal.classList.add('hidden');
}

function sendResetEmail() {
  const emailInput = document.getElementById('forgotEmail');
  const forgotMsg  = document.getElementById('forgotMessage');
  const email      = emailInput ? emailInput.value.trim() : '';

  if (!email) {
    showFormMsg(forgotMsg, 'Please enter your email address.', 'error');
    return;
  }

  if (!window.firebaseAuth) {
    showFormMsg(forgotMsg, 'Authentication service unavailable. Please refresh.', 'error');
    return;
  }

  window.firebaseAuth.sendPasswordResetEmail(email)
    .then(() => {
      showFormMsg(forgotMsg, 'Reset link sent! Check your inbox.', 'success');
      setTimeout(closeForgotModal, 3000);
    })
    .catch((error) => {
      const friendlyMsg = error.code === 'auth/user-not-found'
        ? 'No account found with this email.'
        : 'Error: ' + error.message;
      showFormMsg(forgotMsg, friendlyMsg, 'error');
    });
}

// Close forgot modal on backdrop click
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('forgotModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeForgotModal();
    });
  }
});

// Close forgot modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeForgotModal();
});

// ─── Auth guard: redirect logged-in users away from auth pages ────────────────
function checkAuthState() {
  if (!window.firebaseAuth) return;

  window.firebaseAuth.onAuthStateChanged((user) => {
    const path = window.location.pathname;
    const onAuthPage = path.includes('Sign-In.html') || path.includes('Sign-Up.html');

    if (user && onAuthPage) {
      window.location.href = 'index.html';
    }
  });
}

checkAuthState();

// ─── Utility: display styled form messages ────────────────────────────────────
function showFormMsg(el, text, type) {
  if (!el) return;
  el.textContent = text;
  el.style.color = type === 'success' ? '#6ee7b7' : '#fca5a5';
}
