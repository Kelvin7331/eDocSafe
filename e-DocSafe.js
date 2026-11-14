// e-DocSafe.js — e-DocSafe Main Application Logic
// ============================================================================
// Complete fixed version. See commit notes above for every bug resolved.
// Requires: DBHelper.js, UploadModal.js, firebase-config.js, firebase-auth.js,
//           firebase-sync.js (all loaded as defer, before this script).
// ============================================================================

'use strict';

// ── Auth Guard ────────────────────────────────────────────────────────────────
// Redirect to Sign-In if no Firebase session.
(function initAuthGuard() {
  if (typeof firebase === 'undefined' || !window.firebaseAuth) return;
  window.firebaseAuth.onAuthStateChanged(function (user) {
    if (!user) {
      window.location.href = 'Sign-In.html';
    }
  });
})();

// ── Shim: DBHelper.js guarantees ──────────────────────────────────────────────
// openDB() and STORE_NAME come from DBHelper.js (loaded first via defer).
if (typeof openDB === 'undefined') {
  window.openDB = function () {
    if (typeof dbPromise !== 'undefined') return dbPromise;
    return Promise.reject(new Error('DBHelper.js not ready — check script load order.'));
  };
}
if (typeof STORE_NAME === 'undefined') {
  window.STORE_NAME = 'documents';
}

// ════════════════════════════════════════════════════════════════════════════
//  NAVIGATION & SIDEBAR
// ════════════════════════════════════════════════════════════════════════════

const sidebar = document.getElementById('sidebar');

function toggleSidebar() {
  if (!sidebar) return;
  if (window.innerWidth >= 768) {
    sidebar.classList.toggle('collapsed');
  } else {
    sidebar.classList.toggle('open');
  }
  // Sync aria-expanded on the toggle button
  const btn = document.getElementById('sidebarToggle');
  const backdrop = document.getElementById('sidebarBackdrop');
  const isOpen = window.innerWidth >= 768
    ? !sidebar.classList.contains('collapsed')
    : sidebar.classList.contains('open');
  if (btn) btn.setAttribute('aria-expanded', String(isOpen));
  if (backdrop) backdrop.classList.toggle('visible', isOpen && window.innerWidth < 768);
}

function activateMenu(el, pushState = true) {
  document.querySelectorAll('.menu-item').forEach(i => {
    i.classList.remove('active');
    i.removeAttribute('aria-current');
  });
  el.classList.add('active');
  el.setAttribute('aria-current', 'page');

  const target = el.getAttribute('data-target');
  document.querySelectorAll('.section-container').forEach(sec => (sec.style.display = 'none'));

  const section = document.getElementById(target);
  if (section) {
    section.style.display = 'block';
  } else {
    console.warn(`No section found for: ${target}`);
  }

  localStorage.setItem('activeSection', target);

  if (pushState) {
    history.pushState({ section: target }, '', `#${target}`);
  }
}

window.addEventListener('popstate', (event) => {
  const section = event.state?.section || localStorage.getItem('activeSection') || 'dashboard';
  const el = document.querySelector(`.menu-item[data-target="${section}"]`);
  if (el) activateMenu(el, false);
});

document.addEventListener('DOMContentLoaded', () => {
  const fromHash = location.hash?.substring(1);
  const saved = localStorage.getItem('activeSection');
  const target = fromHash || saved || 'dashboard';
  const el = document.querySelector(`.menu-item[data-target="${target}"]`);
  if (el) activateMenu(el, false);
});

// Close sidebar when clicking an item (mobile)
if (sidebar) {
  sidebar.addEventListener('click', () => {
    if (window.innerWidth < 768) sidebar.classList.remove('open');
  });
}

// Close sidebar on outside click (mobile)
document.addEventListener('click', (e) => {
  if (!sidebar) return;
  if (window.innerWidth < 768 && sidebar.classList.contains('open')) {
    if (!sidebar.contains(e.target) && !e.target.closest('.toggle-btn')) {
      sidebar.classList.remove('open');
    }
  }
});

// ════════  USER DROPDOWN ═════════════════════════════

// Canonical toggle — HTML inline onclick handles this; no extra listener needed
function toggleDropdown(e) {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  const menu = document.getElementById('dropdownMenu');
  const btn = document.getElementById('userIcon');
  if (!menu) return;
  const isOpen = menu.classList.toggle('show');
  if (btn) btn.setAttribute('aria-expanded', String(isOpen));
}

function closeDropdown() {
  const menu = document.getElementById('dropdownMenu');
  const btn = document.getElementById('userIcon');
  if (menu) menu.classList.remove('show');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  const menu = document.getElementById('dropdownMenu');
  const btn = document.getElementById('userIcon');
  if (!menu || !btn) return;
  if (!btn.contains(e.target) && !menu.contains(e.target)) {
    menu.classList.remove('show');
    btn.setAttribute('aria-expanded', 'false');
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  MISSING FUNCTIONS REFERENCED IN HTML
// ════════════════════════════════════════════════════════════════════════════

function openNotificationModal() {
  const m = document.getElementById('notificationModal');
  if (!m) return;
  const visible = m.style.display === 'block';
  m.style.display = visible ? 'none' : 'block';
}

// Close notifications when clicking outside
document.addEventListener('click', (e) => {
  const m = document.getElementById('notificationModal');
  if (!m) return;
  if (!m.contains(e.target) && !e.target.closest('.notification-icon')) {
    m.style.display = 'none';
  }
});

function showAbout() {
  showNotification('info', 'e-DocSafe v1.2.0 — Kelvinet Technologies®');
}

function importActivityCSV(event) {
  const file = event.target.files[0];
  if (!file) return;
  showNotification('info', 'CSV import coming soon.');
  event.target.value = '';
}

// ════════════════════════════════════════════════════════════════════════════
//  PROFILE (Personal Info, Edit, Save)
// ════════════════════════════════════════════════════════════════════════════

function getInitials(name) {
  if (!name || typeof name !== 'string') return '?';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

function updateAllTextByClass(className, text) {
  document.querySelectorAll(`.${className}`).forEach(el => (el.textContent = text));
}

function getCurrentUser() {
  const u = window.firebaseAuth && window.firebaseAuth.currentUser;
  return u ? { uid: u.uid, email: u.email, displayName: u.displayName } : null;
}

function loadProfile() {
  const currentUser = getCurrentUser() || {};
  const profile = JSON.parse(localStorage.getItem('userProfile')) || {
    fullName: currentUser.displayName || '',
    email: currentUser.email || '',
    phone: ''
  };

  const initials = getInitials(profile.fullName);

  updateAllTextByClass('displayFullName', profile.fullName || '—');
  updateAllTextByClass('displayEmail', profile.email || '—');
  updateAllTextByClass('displayPhone', profile.phone || '—');

  const userIcon = document.getElementById('userIcon');
  const userInitials = document.getElementById('userInitials');
  if (userIcon) userIcon.textContent = initials;
  if (userInitials) userInitials.textContent = initials;

  const editFullName = document.getElementById('editFullName');
  const editEmail = document.getElementById('editEmail');
  const editPhone = document.getElementById('editPhone');
  if (editFullName) editFullName.value = profile.fullName || '';
  if (editEmail) editEmail.value = profile.email || '';
  if (editPhone) editPhone.value = profile.phone || '';
}

function saveProfile() {
  const updatedProfile = {
    fullName: document.getElementById('editFullName').value.trim(),
    email: document.getElementById('editEmail').value.trim(),
    phone: document.getElementById('editPhone').value.trim()
  };
  localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
  loadProfile();
}

function setWelcomeMessage() {
  const profile = JSON.parse(localStorage.getItem('userProfile'));
  const welcomeEl = document.getElementById('welcomeName');
  if (!welcomeEl) return;
  if (!profile || !profile.fullName) {
    welcomeEl.textContent = 'User';
    return;
  }
  welcomeEl.textContent = profile.fullName.trim().split(/\s+/)[0];
}

document.addEventListener('DOMContentLoaded', () => {
  const editBtn = document.getElementById('editProfileBtn');
  const saveBtn = document.getElementById('saveProfileBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const backToProfile = document.getElementById('backToProfile');
  const profilePage = document.getElementById('profilePage');
  const editProfilePage = document.getElementById('editProfilePage');

  if (editBtn && profilePage && editProfilePage) {
    editBtn.addEventListener('click', () => {
      profilePage.style.display = 'none';
      editProfilePage.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  if (saveBtn && profilePage && editProfilePage) {
    saveBtn.addEventListener('click', () => {
      saveProfile();
      editProfilePage.style.display = 'none';
      profilePage.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showNotification('success', 'Profile info updated!');
    });
  }
  if (cancelEditBtn && profilePage && editProfilePage) {
    cancelEditBtn.addEventListener('click', () => {
      editProfilePage.style.display = 'none';
      profilePage.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      loadProfile();
    });
  }
  if (backToProfile && profilePage && editProfilePage) {
    backToProfile.addEventListener('click', () => {
      editProfilePage.style.display = 'none';
      profilePage.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  loadProfile();
  setWelcomeMessage();
});

// ════════════════════════════════════════════════════════════════════════════
//  MISC UTILITIES
// ════════════════════════════════════════════════════════════════════════════

// Dynamic year
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

function exportActivity() {
  showNotification('info', 'Feature coming soon.');
}

function scan() {
  showNotification('info', 'Document scanning coming soon.');
}

// Sign-out
async function logout() {
  showConfirmationModal({
    title: 'Logout',
    message: 'Are you sure you want to log out?',
    iconClass: 'fas fa-sign-out-alt',
    onConfirm: async () => {
      try {
        if (window.firebaseAuthManager) {
          await window.firebaseAuthManager.signOut();
        } else if (window.firebaseAuth) {
          await window.firebaseAuth.signOut();
        }
        localStorage.removeItem('userProfile');
        showNotification('success', 'Logged out successfully!');
        window.location.href = 'Sign-In.html';
      } catch (error) {
        showNotification('error', 'Logout failed: ' + error.message);
      }
    }
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  NOTIFICATION SYSTEM
// ════════════════════════════════════════════════════════════════════════════
function showNotification(type, message) {
  const iconMap = {
    success: '<i class="fas fa-check-circle"></i>',
    error:   '<i class="fas fa-times-circle"></i>',
    info:    '<i class="fas fa-info-circle"></i>',
    warning: '<i class="fas fa-exclamation-triangle"></i>'
  };
  const soundMap = {
    success: 'sounds/success.mp3',
    error:   'sounds/error-bleep.mp3',
    info:    'sounds/info-bleep.mp3',
    warning: 'sounds/warning.mp3'
  };

  const el = document.createElement('div');
  el.className = `notification ${type}`;
  el.innerHTML = `${iconMap[type] || ''} <span>${message}</span>`;
  document.body.appendChild(el);

  // Play sound (autoplay blocked silently on most browsers, that's OK)
  try {
    const audio = new Audio(soundMap[type]);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch (_) { /* ignore */ }

  // Fade out then remove — matches fadeOut keyframe added to CSS
  setTimeout(() => {
    el.style.animation = 'fadeOut 0.4s forwards';
    setTimeout(() => el.remove(), 400);
  }, 3000);
}

// ════════════════════════════════════════════════════════════════════════════
//  FILE HELPERS
// ════════════════════════════════════════════════════════════════════════════

function sanitizeName(name) {
  if (!name || typeof name !== 'string') return 'Unnamed File';
  const div = document.createElement('div');
  const cleanName = name.replace(/[<>:"'\/\\|?*]+/g, '').trim();
  div.textContent = cleanName;
  let finalName = div.innerHTML;
  if (finalName.length > 40) {
    finalName = finalName.substring(0, 25) + '...';
  }
  return finalName;
}

function highlightMatch(text, query) {
  if (!query) return sanitizeName(text);
  const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${safeQuery})`, 'gi');
  return sanitizeName(text).replace(regex, '<mark>$1</mark>');
}

function getFileIcon(fileName) {
  const ext = (fileName || '').split('.').pop().toLowerCase();
  const iconMap = {
    pdf:  'fa-file-pdf text-red',
    doc:  'fa-file-word text-blue',
    docx: 'fa-file-word text-blue',
    xls:  'fa-file-excel text-green',
    xlsx: 'fa-file-excel text-green',
    ppt:  'fa-file-powerpoint text-orange',
    pptx: 'fa-file-powerpoint text-orange',
    png:  'fa-file-image text-purple',
    jpg:  'fa-file-image text-purple',
    jpeg: 'fa-file-image text-purple',
    gif:  'fa-file-image text-purple',
    webp: 'fa-file-image text-purple',
    bmp:  'fa-file-image text-purple',
    mp4:  'fa-file-video text-cyan',
    mov:  'fa-file-video text-cyan',
    zip:  'fa-file-zipper text-yellow',
    txt:  'fa-file-lines text-gray',
    csv:  'fa-file-csv text-lime',
    md:   'fa-file-lines text-indigo',
    html: 'fa-file-code text-indigo',
    css:  'fa-file-code text-indigo',
    js:   'fa-file-code text-indigo',
    py:   'fa-file-code text-indigo',
    cpp:  'fa-file-code text-indigo',
    default: 'fa-file text-muted'
  };
  return iconMap[ext] || iconMap.default;
}

function formatFileSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  DOM CONSTANTS (elements used throughout this file)
// ════════════════════════════════════════════════════════════════════════════

const MAX_STORAGE = 100; // 100 MB
const PURGE_DAYS = 30;   // Trash auto-purge threshold (matches UI + DBHelper)

const sortSelect      = document.getElementById('sortSelect');
const docsGrid        = document.getElementById('docsGrid');
const previewModal    = document.getElementById('previewModal');
const previewContent  = document.getElementById('previewContent');
const closeModal      = document.getElementById('closeModal');
const searchInput     = document.getElementById('searchInput');
const favoritesSearch = document.getElementById('favoritesSearch');
const favoritesGrid   = document.getElementById('favoritesGrid');
const trashGrid       = document.getElementById('trashGrid');

// ── DOCUMENTS: Load, Sort, Render ────────────────────────────────────────────

async function loadDocs() {
  const sortVal = sortSelect ? sortSelect.value : 'date_desc';
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

  try {
    const database = await openDB();
    const tx = database.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const docs = request.result || [];

      // ── Dashboard stats from FULL list — computed BEFORE any filtering ──
      const totalMB = docs.reduce((acc, d) => acc + (d.size || 0), 0) / (1024 * 1024);
      const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };
      setText('total-docs', docs.length);
      setText('encrypted', docs.filter(d => d.isEncrypted).length);
      setText('total-storage', `${totalMB.toFixed(2)} MB`);
      updateStorage(totalMB.toFixed(2), MAX_STORAGE);

      if (docs.length === 0) {
        if (docsGrid) docsGrid.innerHTML = '<p><i class="fas fa-folder-open"></i> No documents uploaded yet.</p>';
        return;
      }

      // ── Search filter ──
      const filteredDocs = docs.filter(d =>
        (d.name || '').toLowerCase().includes(query) ||
        (d.type || '').toLowerCase().includes(query)
      );

      if (filteredDocs.length === 0) {
        if (docsGrid) docsGrid.innerHTML = '<p><i class="fas fa-search"></i> No matching documents found.</p>';
        return;
      }

      // ── Sort ──
      filteredDocs.sort((a, b) => {
        if (sortVal === 'date_desc') return b.id - a.id;
        if (sortVal === 'date_asc')  return a.id - b.id;
        if (sortVal === 'name_asc')  return (a.name || '').localeCompare(b.name || '');
        if (sortVal === 'name_desc') return (b.name || '').localeCompare(a.name || '');
        return 0;
      });

      if (!docsGrid) return;
      docsGrid.innerHTML = '';

      filteredDocs.forEach(doc => {
        const card = buildDocCard(doc, query, { showDelete: true });
        docsGrid.appendChild(card);
      });
    };

    request.onerror = () => {
      showNotification('error', 'Failed to load documents.');
      console.error('Error loading documents', request.error);
    };
  } catch (error) {
    showNotification('error', 'Failed to load documents.');
    console.error('Error loading documents', error);
  }
}

// Shared card builder used by both loadDocs and loadFavorites
function buildDocCard(doc, query = '', options = {}) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.docId = doc.id;

  const iconClass = getFileIcon(doc.name);
  const highlightedName = highlightMatch(doc.name, query);

  if (doc.isEncrypted) {
    const lock = document.createElement('i');
    lock.className = 'fas fa-lock encrypted-icon';
    lock.setAttribute('aria-label', 'Encrypted');
    card.appendChild(lock);
  }

  const info = document.createElement('div');
  info.className = 'doc-info';
  info.innerHTML = `
    <strong><i class="fas ${iconClass}"></i> ${highlightedName}</strong>
    <span><strong>Uploaded:</strong> ${new Date(doc.uploadedAt).toLocaleString()}</span><br>
    <em class="doc-size">○ ${formatFileSize(doc.size)}</em>
  `;

  const actions = document.createElement('div');
  actions.className = 'actions';

  const renameBtn = makeActionBtn('fa-edit', 'Rename', () => renameDoc(doc.id));
  const favBtn = makeActionBtn('fa-star', doc.favorite ? 'Unfavorite' : 'Favorite',
    () => toggleFavorite(doc.id), 'favorite-btn' + (doc.favorite ? ' favorited' : ''));
  const previewBtn = makeActionBtn('fa-eye', 'Preview', () => openModal(doc));
  const dlBtn = makeActionBtn('fa-download', 'Download', () => downloadDoc(doc));
  const shBtn = makeActionBtn('fa-paper-plane', 'Share', () => showShareModal(doc.id));
  const delBtn = makeActionBtn('fa-trash', 'Delete', () => deleteDoc(doc.id));

  actions.append(renameBtn, favBtn, previewBtn, dlBtn, shBtn, delBtn);
  card.append(info, actions);
  return card;
}

function makeActionBtn(icon, title, onClick, extraClass = '') {
  const btn = document.createElement('button');
  btn.title = title;
  btn.className = `action-btn-sm ${extraClass}`.trim();
  btn.setAttribute('aria-label', title);
  btn.innerHTML = `<i class="fas ${icon}"></i>`;
  btn.addEventListener('click', onClick);
  return btn;
}

// Favorites
async function loadFavorites() {
  if (!favoritesGrid) return;
  const query = (favoritesSearch?.value || '').toLowerCase();
  favoritesGrid.innerHTML = '';

  try {
    const database = await openDB();
    const tx = database.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const favorites = (request.result || []).filter(d => d.favorite && !d.deleted);

      if (favorites.length === 0) {
        favoritesGrid.innerHTML = '<p><i class="fas fa-star"></i> No favorites yet.</p>';
        return;
      }

      const filtered = favorites.filter(doc =>
        (doc.name || '').toLowerCase().includes(query) ||
        (doc.type || '').toLowerCase().includes(query)
      );

      if (filtered.length === 0) {
        favoritesGrid.innerHTML = '<p><i class="fas fa-search"></i> No matching documents found.</p>';
        return;
      }

      filtered.forEach(doc => {
        favoritesGrid.appendChild(buildDocCard(doc, query));
      });
    };
  } catch (error) {
    showNotification('error', 'Failed to load favorites.');
    console.error('loadFavorites error', error);
  }
}

// Trash
async function loadTrash() {
  if (!trashGrid) return;
  try {
    const database = await openDB();
    const tx = database.transaction(['trash'], 'readonly');
    const store = tx.objectStore('trash');
    const request = store.getAll();

    request.onsuccess = () => {
      const trash = request.result || [];
      trashGrid.innerHTML = trash.length ? '' : '<p>Trash is empty.</p>';

      trash.forEach(doc => {
        const iconClass = getFileIcon(doc.name);
        const card = document.createElement('div');
        card.className = 'card trash-card';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'trash-item-checkbox';
        checkbox.setAttribute('data-id', doc.id);
        checkbox.setAttribute('aria-label', `Select ${doc.name}`);

        const info = document.createElement('div');
        info.className = 'doc-info';
        info.innerHTML = `
          <strong><i class="fas ${iconClass}"></i> ${sanitizeName(doc.name)}</strong>
          <span><strong>Deleted:</strong> ${doc.deletedAt ? new Date(doc.deletedAt).toLocaleString() : 'Unknown'}</span><br>
          <em>○ ${formatFileSize(doc.size)}</em>
        `;

        const actions = document.createElement('div');
        actions.className = 'actions';
        actions.append(
          makeActionBtn('fa-undo', 'Restore', () => restoreDoc(doc.id)),
          makeActionBtn('fa-fire', 'Delete Permanently', () => purgeDoc(doc.id))
        );

        card.append(checkbox, info, actions);
        trashGrid.appendChild(card);
      });
    };
  } catch (error) {
    console.error('loadTrash error', error);
    showNotification('error', 'Failed to load trashed files.');
  }
}

// Storage progress
function updateStorage(current, total) {
  const currentNum = parseFloat(current) || 0;
  const progress = Math.min(100, (currentNum / total) * 100);
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const setWidth = (id, w) => { const el = document.getElementById(id); if (el) el.style.width = w; };

  setWidth('storage-progress', `${progress}%`);
  setText('total-storage', `${current} MB`);
  setText('percent', `${Math.round(progress)}%`);
  setText('storage', `${total} MB used`);
}

// ════════════════════════════════════════════════════════════════════════════
//  CHART RENDERING
// ════════════════════════════════════════════════════════════════════════════

let uploadChart;
let docTypeChart;
let activityChart;

function renderUploadChart(labels, data, mode) {
  const canvas = document.getElementById('uploadHistoryChart');
  if (!canvas) return;
  const isDarkMode = document.body.classList.contains('dark-mode');
  const ctx = canvas.getContext('2d');
  if (uploadChart) uploadChart.destroy();

  uploadChart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: `Uploads (${mode})`, data, backgroundColor: '#36a2eb' }] },
    options: {
      responsive: true,
      scales: {
        x: {
          title: { display: true, text: mode.charAt(0).toUpperCase() + mode.slice(1), color: '#27ae60', font: { size: 16, weight: 'bold', family: 'Times New Roman' } },
          ticks: { color: isDarkMode ? '#ecf0f1' : '#212529', font: { size: 12, family: 'Segoe UI' } }
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Uploads', color: '#27ae60', font: { size: 16, weight: 'bold', family: 'Times New Roman' } },
          ticks: { color: '#212529', font: { size: 12, family: 'Segoe UI' } }
        }
      }
    }
  });
}

function renderDocTypeChart(labels, data) {
  const canvas = document.getElementById('docTypeChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (docTypeChart) docTypeChart.destroy();

  docTypeChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        label: 'Document Types',
        data,
        backgroundColor: ['#36a2eb', '#ff6384', '#ffcd56', '#4bc0c0', '#9966ff', '#ff9f40', '#95a5a6']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--text'),
            font: { size: 12 }
          }
        }
      }
    }
  });
}

function updateChartColors() {
  if (docTypeChart) {
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text');
    docTypeChart.options.plugins.legend.labels.color = textColor;
    docTypeChart.update();
  }
}

function groupByPeriod(dateStr, mode) {
  const d = new Date(dateStr);
  if (mode === 'day') return d.toISOString().split('T')[0];
  if (mode === 'week') {
    const weekStart = new Date(d.setDate(d.getDate() - d.getDay()));
    return `Week of ${weekStart.toISOString().split('T')[0]}`;
  }
  if (mode === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return '';
}

async function generateUploadChartData() {
  const filter = document.getElementById('dateFilter');
  if (!filter) return;
  const mode = filter.value;

  try {
    const database = await openDB();
    const tx = database.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = function () {
      const docs = request.result || [];
      const timeGroups = {};
      const docTypeGroups = {};
      let firstUpload = null;
      let encryptedCount = 0;

      docs.forEach(doc => {
        if (doc.uploadedAt) {
          const key = groupByPeriod(doc.uploadedAt, mode);
          timeGroups[key] = (timeGroups[key] || 0) + 1;
          const dateObj = new Date(doc.uploadedAt);
          if (!firstUpload || dateObj < new Date(firstUpload)) firstUpload = doc.uploadedAt;
        }
        const typeKey = (doc.type || '').split('/')[1] || 'unknown';
        docTypeGroups[typeKey] = (docTypeGroups[typeKey] || 0) + 1;
        if (doc.isEncrypted) encryptedCount++;
      });

      const timeLabels = Object.keys(timeGroups).sort();
      const timeData = timeLabels.map(k => timeGroups[k]);
      const docLabels = Object.keys(docTypeGroups);
      const docData = docLabels.map(k => docTypeGroups[k]);

      renderUploadChart(timeLabels, timeData, mode);
      renderDocTypeChart(docLabels, docData);

      updateStatsUI({
        totalUploads: docs.length,
        mostType: docLabels.length ? docLabels.reduce((a, b) => docTypeGroups[a] > docTypeGroups[b] ? a : b, '-') : '-',
        peakPeriod: timeLabels.length ? timeLabels.reduce((a, b) => timeGroups[a] > timeGroups[b] ? a : b, '-') : '-',
        firstUpload: firstUpload ? new Date(firstUpload).toDateString() : '-',
        encryptedCount
      });
    };
  } catch (err) {
    console.error('generateUploadChartData error', err);
  }
}

function updateStatsUI(stats) {
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setText('totalUploads', stats.totalUploads);
  setText('mostType', (stats.mostType || '-').toUpperCase());
  setText('peakPeriod', stats.peakPeriod);
  setText('firstUpload', stats.firstUpload);
  setText('encryptedCount', stats.encryptedCount);
}

// ════════════════════════════════════════════════════════════════════════════
//  ACTIVITY FEED
// ════════════════════════════════════════════════════════════════════════════

const ACTIVITY_TYPES = {
  UPLOAD: '📤 Upload',
  DELETE: '🗑️ Delete',
  UNDO_DELETE: '↩️ Undo-Delete',
  DOWNLOAD: '⬇️ Download',
  SHARE: '📤 Share',
  RESTORE: '♻️ Restore',
  PERMANENT_DELETE: '🔥 Perma-Delete',
  RENAME: '🖍 Rename',
  PURGE_ALL: '🧹 Purge-All',
  AUTO_PURGE: '🔥 Auto-Purged'
};

const ACTIVITY_ICON_MAP = {
  'Upload':        'fa-upload',
  'Delete':        'fa-trash-alt',
  'Undo-Delete':   'fa-undo',
  'Download':      'fa-download',
  'Share':         'fa-share-alt',
  'Restore':       'fa-undo',
  'Perma-Delete':  'fa-fire',
  'Rename':        'fa-pen',
  'Purge-All':     'fa-broom',
  'Auto-Purged':   'fa-fire'
};

const ACTIVITY_COLOR_CLASS_MAP = {
  'Upload':       'icon-upload',
  'Delete':       'icon-delete',
  'Undo-Delete':  'icon-undo-delete',
  'Download':     'icon-download',
  'Share':        'icon-share',
  'Restore':      'icon-restore',
  'Perma-Delete': 'icon-perma-delete',
  'Rename':       'icon-rename',
  'Purge-All':    'icon-purge-all',
  'Auto-Purged':  'icon-auto-purged'
};

function logActivity(type, docName, extra = '') {
  const activities = JSON.parse(localStorage.getItem('activities') || '[]');
  activities.unshift({
    timestamp: Date.now(),
    type,
    docName,
    extra,
    user: getCurrentUser()?.uid || 'currentUser'
  });
  if (activities.length > 20) activities.pop();
  localStorage.setItem('activities', JSON.stringify(activities));
  refreshActivityFeed();
}

function refreshActivityFeed(feedArray) {
  const feed = document.getElementById('activityFeed');
  if (!feed) return;

  let activities = feedArray || JSON.parse(localStorage.getItem('activities') || '[]');
  if (!Array.isArray(activities)) activities = [];
  activities = activities.slice(0, 20);

  feed.innerHTML = activities.map(activity => {
    const parts = activity.type.split(' ');
    parts.shift(); // drop emoji prefix
    const displayName = parts.join(' ');
    const iconClass = ACTIVITY_ICON_MAP[displayName] || 'fa-question-circle';
    const colorClass = ACTIVITY_COLOR_CLASS_MAP[displayName] || 'icon-unknown';
    const tagClass = displayName.toLowerCase().replace(/\s+/g, '-');

    return `
      <div class="activity-item" role="listitem">
        <div class="activity-icon">
          <i class="fas ${iconClass} ${colorClass}" aria-hidden="true"></i>
        </div>
        <div class="activity-content">
          <strong class="activity-tag ${tagClass}">${displayName}</strong>
          <span>${sanitizeName(activity.docName)}</span>
          ${activity.extra ? `<em>${activity.extra}</em>` : ''}
          <time>${new Date(activity.timestamp).toLocaleString()}</time>
        </div>
      </div>`;
  }).join('');

  if (activities.length === 0) {
    feed.innerHTML = '<div class="no-activity"><p>No recent activity to display.</p></div>';
  }
}

function updateActivitySummary() {
  const summaryText = document.getElementById('activitySummaryText');
  if (!summaryText) return;
  const activities = JSON.parse(localStorage.getItem('activities') || '[]');

  if (!activities.length) {
    summaryText.textContent = 'No activity yet';
    return;
  }

  const recent = activities.slice(0, 2);
  const countMap = {};
  recent.forEach(a => {
    const parts = a.type.split(' ');
    parts.shift();
    const name = parts.join(' ');
    countMap[name] = (countMap[name] || 0) + 1;
  });

  const summaryParts = Object.entries(countMap).map(([type, count]) =>
    `${count} ${count > 1 ? type + 's' : type}`
  );
  summaryText.textContent = summaryParts.join(', ');

  // Pie chart
  const canvas = document.getElementById('activityPieChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (activityChart) activityChart.destroy();

  activityChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(countMap),
      datasets: [{
        data: Object.values(countMap),
        backgroundColor: ['#4dabf7', '#dc3545', '#28a745', '#17a2b8', '#ffc107', '#fd7e14', '#6f42c1', '#e83e8c'],
        borderWidth: 1
      }]
    },
    options: {
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--text') || '#212529',
            font: { size: 12 }
          }
        }
      }
    }
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  DOCUMENT OPERATIONS (wrappers around DBHelper.js)
// ════════════════════════════════════════════════════════════════════════════

let currentRenameDocId = null;
let originalName = '';
let recentlyDeletedDocs = [];

// ── Delete (with undo) ──
async function deleteDoc(id) {
  try {
    const doc = await getDoc(id);
    if (!doc) return showNotification('error', 'Document not found.');
    if (!confirm(`⚠️ Move "${doc.name}" to trash?`)) return;

    const ok = await window.deleteDocFromDB(id);
    if (!ok) return showNotification('error', 'Failed to move to trash.');

    recentlyDeletedDocs.push(doc);
    logActivity(ACTIVITY_TYPES.DELETE, doc.name, 'Moved to trash.');
    showNotification('info', `${sanitizeName(doc.name)} moved to trash.`);
    loadDocs(); loadFavorites(); loadTrash();
  } catch (err) {
    console.error('deleteDoc error', err);
    showNotification('error', 'Failed to delete document.');
  }
}

async function undoDelete() {
  if (!recentlyDeletedDocs.length) return showNotification('info', 'Nothing to undo.');

  try {
    for (const doc of recentlyDeletedDocs) {
      await window.restoreDocFromDB(doc.id);
    }
    const names = recentlyDeletedDocs.map(d => d.name).join(', ');
    logActivity(ACTIVITY_TYPES.UNDO_DELETE, names, 'Restored.');
    showNotification('success', 'Deletion undone!');
    recentlyDeletedDocs = [];
    loadDocs(); loadFavorites(); loadTrash();
  } catch (err) {
    console.error('undoDelete error', err);
    showNotification('error', 'Failed to undo deletion.');
  }
}

// ── Restore from trash ──
async function restoreDoc(id) {
  try {
    const database = await openDB();
    const doc = await new Promise((res, rej) => {
      const tx = database.transaction('trash', 'readonly');
      const r = tx.objectStore('trash').get(id);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });

    if (!doc) return showNotification('error', 'Document not found in trash.');
    if (!confirm(`Restore "${doc.name}" from trash?`)) return;

    const ok = await window.restoreDocFromDB(id);
    if (!ok) return showNotification('error', 'Failed to restore.');

    logActivity(ACTIVITY_TYPES.RESTORE, doc.name, 'Restored.');
    showNotification('success', `${sanitizeName(doc.name)} restored!`);
    loadDocs(); loadTrash();
  } catch (err) {
    console.error('restoreDoc error', err);
    showNotification('error', 'Failed to restore document.');
  }
}

// ── Permanently delete ──
async function purgeDoc(id) {
  try {
    const database = await openDB();
    const doc = await new Promise((res, rej) => {
      const tx = database.transaction('trash', 'readonly');
      const r = tx.objectStore('trash').get(id);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });

    if (!doc) return;
    if (!confirm(`⚠️ Permanently delete "${doc.name}"? This CANNOT be undone.`)) return;

    const ok = await window.purgeDocFromDB(id);
    if (!ok) return showNotification('error', 'Failed to delete permanently.');

    logActivity(ACTIVITY_TYPES.PERMANENT_DELETE, doc.name, 'Deleted permanently.');
    showNotification('info', `${sanitizeName(doc.name)} permanently deleted.`);
    loadTrash();
  } catch (err) {
    console.error('purgeDoc error', err);
    showNotification('error', 'Failed to permanently delete.');
  }
}

// ── Rename ──
async function renameDoc(docId) {
  try {
    const database = await openDB();
    const doc = await new Promise((res, rej) => {
      const tx = database.transaction(STORE_NAME, 'readonly');
      const r = tx.objectStore(STORE_NAME).get(docId);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });

    if (!doc) return showNotification('error', 'Document not found!');

    currentRenameDocId = docId;
    originalName = doc.name;

    const input = document.getElementById('renameInput');
    const modal = document.getElementById('renameModal');
    if (!input || !modal) return;

    input.value = doc.name;
    modal.classList.remove('hidden');

    setTimeout(() => { input.focus(); input.select(); }, 100);

    // Single handler — fixes "Enter overwritten by Escape"
    input.onkeydown = (e) => {
      if (e.key === 'Enter')  { e.preventDefault(); confirmRename(); }
      if (e.key === 'Escape') { closeRenameModal(); }
    };
  } catch (err) {
    console.error('renameDoc error', err);
    showNotification('error', 'Failed to load document for rename.');
  }
}

function closeRenameModal() {
  const modal = document.getElementById('renameModal');
  const input = document.getElementById('renameInput');
  if (modal) modal.classList.add('hidden');
  currentRenameDocId = null;
  originalName = '';
  if (input) input.onkeydown = null;
}

async function confirmRename() {
  const newName = document.getElementById('renameInput')?.value.trim();
  if (!newName) return showNotification('error', 'Name cannot be empty.');
  if (!currentRenameDocId) return;

  try {
    const database = await openDB();
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const allDocs = await new Promise((res, rej) => {
      const r = store.getAll();
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });

    if (allDocs.some(d => d.name === newName && d.id !== currentRenameDocId)) {
      return showNotification('error', 'Another document with this name already exists.');
    }

    const doc = await new Promise((res, rej) => {
      const r = store.get(currentRenameDocId);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });

    if (!doc) return showNotification('error', 'Document no longer exists.');

    doc.name = newName;
    doc.updatedAt = new Date().toISOString();

    await new Promise((res, rej) => {
      const r = store.put(doc);
      r.onsuccess = () => res();
      r.onerror = () => rej(r.error);
    });

    const oldName = originalName;
    loadDocs(); loadFavorites();
    closeRenameModal();
    showNotification('success', 'Document renamed.');
    logActivity(ACTIVITY_TYPES.RENAME, newName, `Renamed from "${oldName}"`);
  } catch (err) {
    console.error('confirmRename error', err);
    showNotification('error', 'Failed to rename document.');
  }
}

// ── Toggle Favorite ──
async function toggleFavorite(id) {
  try {
    const database = await openDB();
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const doc = await new Promise((res, rej) => {
      const r = store.get(id);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });

    if (!doc) return showNotification('error', 'Document not found.');

    doc.favorite = !doc.favorite;

    await new Promise((res, rej) => {
      const r = store.put(doc);
      r.onsuccess = () => res();
      r.onerror = () => rej(r.error);
    });

    loadDocs(); loadFavorites();
    showNotification('info', doc.favorite ? 'Added to favorites.' : 'Removed from favorites.');
  } catch (err) {
    console.error('toggleFavorite error', err);
    showNotification('error', 'Failed to update favorite status.');
  }
}

// ── Download ──
function downloadDoc(doc) {
  try {
    if (!doc || !doc.data) throw new Error(`No data for document: ${doc?.name || 'unknown'}`);
    const blob = new Blob([doc.data], { type: doc.type || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.name || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logActivity(ACTIVITY_TYPES.DOWNLOAD, doc.name || 'Unnamed file');
    showNotification('info', `Download started: ${sanitizeName(doc.name)}`);
  } catch (err) {
    console.error('Download failed:', err);
    showNotification('error', `Download failed: ${err.message}`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  BULK TRASH OPERATIONS
// ════════════════════════════════════════════════════════════════════════════

function getSelectedTrashIds() {
  const checkboxes = document.querySelectorAll('.trash-item-checkbox:checked');
  return Array.from(checkboxes).map(cb => cb.getAttribute('data-id'));
}

async function restoreSelected() {
  const selectedIds = getSelectedTrashIds();
  if (selectedIds.length === 0) return showNotification('info', 'No files selected to restore.');

  try {
    const database = await openDB();
    const tx = database.transaction(['trash', 'documents'], 'readwrite');
    const trashStore = tx.objectStore('trash');
    const docStore = tx.objectStore('documents');

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('aborted'));

      for (const id of selectedIds) {
        const numericId = Number(id);
        const getReq = trashStore.get(numericId);
        getReq.onsuccess = () => {
          const doc = getReq.result;
          if (doc) {
            delete doc.deletedAt;
            delete doc.originalStore;
            docStore.put(doc);
            trashStore.delete(numericId);
          }
        };
      }
    });

    showNotification('success', `${selectedIds.length} file(s) restored.`);
    loadTrash(); loadDocs();
  } catch (err) {
    console.error('restoreSelected error', err);
    showNotification('error', 'Failed to restore selected files.');
  }
}

async function purgeSelected() {
  const selectedIds = getSelectedTrashIds();
  if (selectedIds.length === 0) return showNotification('info', 'No files selected to delete.');

  try {
    const database = await openDB();
    const tx = database.transaction(['trash'], 'readwrite');
    const store = tx.objectStore('trash');

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('aborted'));
      selectedIds.forEach(id => store.delete(Number(id)));
    });

    showNotification('success', `${selectedIds.length} file(s) permanently deleted.`);
    loadTrash();
  } catch (err) {
    console.error('purgeSelected error', err);
    showNotification('error', 'Failed to delete selected files.');
  }
}

async function clearAllDocs() {
  try {
    const database = await openDB();
    const count = await new Promise((res, rej) => {
      const tx = database.transaction(STORE_NAME, 'readonly');
      const r = tx.objectStore(STORE_NAME).count();
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });

    if (!count) return showNotification('info', 'No documents to clear.');
    if (!confirm(`⚠️ Move all ${count} file(s) to Trash?`)) return;

    const tx2 = database.transaction([STORE_NAME, 'trash'], 'readwrite');
    const docStore = tx2.objectStore(STORE_NAME);
    const trashStore = tx2.objectStore('trash');

    await new Promise((resolve, reject) => {
      tx2.oncomplete = resolve;
      tx2.onerror = () => reject(tx2.error);
      const getAll = docStore.getAll();
      getAll.onsuccess = () => {
        (getAll.result || []).forEach(doc => {
          doc.deletedAt = new Date().toISOString();
          doc.originalStore = STORE_NAME;
          trashStore.put(doc);
          docStore.delete(doc.id);
        });
      };
    });

    loadDocs(); loadFavorites(); loadTrash();
    showNotification('info', `${count} document(s) moved to trash.`);
  } catch (err) {
    console.error('clearAllDocs error', err);
    showNotification('error', 'Failed to clear documents.');
  }
}

async function emptyTrash() {
  try {
    const database = await openDB();
    const count = await new Promise((res, rej) => {
      const tx = database.transaction('trash', 'readonly');
      const r = tx.objectStore('trash').count();
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });

    if (!count) return showNotification('info', 'Trash is already empty.');
    if (!confirm(`⚠️ Permanently delete ${count} item(s)? This CANNOT be undone.`)) return;

    const tx = database.transaction('trash', 'readwrite');
    const store = tx.objectStore('trash');
    const keys = await new Promise((res, rej) => {
      const r = store.getAllKeys();
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      keys.forEach(k => store.delete(k));
    });

    logActivity(ACTIVITY_TYPES.PERMANENT_DELETE, 'Clear Trash', `${count} item(s) cleared.`);
    showNotification('success', 'Trash emptied.');
    loadTrash();
  } catch (err) {
    console.error('emptyTrash error', err);
    showNotification('error', 'Failed to empty trash.');
  }
}

async function restoreAllTrash() {
  try {
    const database = await openDB();
    const tx = database.transaction(['documents', 'trash'], 'readwrite');
    const trashStore = tx.objectStore('trash');
    const docStore = tx.objectStore('documents');

    const allTrash = await new Promise((res, rej) => {
      const r = trashStore.getAll();
      r.onsuccess = () => res(r.result || []);
      r.onerror = () => rej(r.error);
    });

    if (!allTrash.length) return showNotification('info', 'No documents to restore.');
    if (!confirm(`Restore ALL ${allTrash.length} trashed document(s)?`)) return;

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      allTrash.forEach(doc => {
        delete doc.deletedAt;
        delete doc.originalStore;
        docStore.put(doc);
        trashStore.delete(doc.id);
      });
    });

    logActivity(ACTIVITY_TYPES.RESTORE, 'Bulk Restore', `${allTrash.length} restored.`);
    showNotification('success', `${allTrash.length} document(s) restored.`);
    loadDocs(); loadTrash();
  } catch (err) {
    console.error('restoreAllTrash error', err);
    showNotification('error', 'Failed to restore trash.');
  }
}

async function autoPurgeTrash() {
  try {
    const database = await openDB();
    const tx = database.transaction('trash', 'readwrite');
    const store = tx.objectStore('trash');

    const trashedDocs = await new Promise((res, rej) => {
      const r = store.getAll();
      r.onsuccess = () => res(r.result || []);
      r.onerror = () => rej(r.error);
    });

    const cutoff = Date.now() - PURGE_DAYS * 24 * 60 * 60 * 1000;
    const expired = trashedDocs.filter(d => d.deletedAt && new Date(d.deletedAt).getTime() < cutoff);

    if (!expired.length) return;

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      expired.forEach(d => store.delete(d.id));
    });

    logActivity(ACTIVITY_TYPES.AUTO_PURGE, 'Auto-purged', `${expired.length} item(s) older than ${PURGE_DAYS} days.`);
    showNotification('info', `${expired.length} expired trash item(s) removed.`);
    loadTrash();
  } catch (err) {
    console.error('autoPurgeTrash error', err);
  }
}

function shouldRunAutoPurge() {
  const lastRun = localStorage.getItem('lastAutoPurge');
  if (!lastRun) return true;
  return (Date.now() - parseInt(lastRun, 10)) > (24 * 60 * 60 * 1000);
}

function tryAutoPurgeTrash() {
  if (shouldRunAutoPurge()) {
    autoPurgeTrash().finally(() => {
      localStorage.setItem('lastAutoPurge', Date.now().toString());
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  tryAutoPurgeTrash();
  updateActivitySummary();
});

// ════════════════════════════════════════════════════════════════════════════
//  CONFIRMATION MODAL
// ════════════════════════════════════════════════════════════════════════════

function showConfirmationModal({ title, message, iconClass = 'fas fa-exclamation-triangle', onConfirm }) {
  const modal       = document.getElementById('confirmationModal');
  const modalTitle  = document.getElementById('confirmModalTitle');
  const modalMsg    = document.getElementById('modalMessage');
  const modalIcon   = document.getElementById('modalIcon');
  const spinner     = document.getElementById('modalSpinner');
  const checkmark   = document.getElementById('modalCheckmark');
  const confirmBtn  = document.getElementById('modalConfirmBtn');
  const cancelBtn   = document.getElementById('modalCancelBtn');

  if (!modal || !modalTitle || !modalMsg || !modalIcon || !confirmBtn || !cancelBtn) {
    console.error('Confirmation modal elements missing.');
    return;
  }

  modalTitle.textContent = title;
  modalMsg.textContent = message;
  modalIcon.className = iconClass;

  modal.classList.remove('hidden');
  if (spinner) spinner.classList.add('hidden');
  if (checkmark) checkmark.classList.add('hidden');
  confirmBtn.disabled = false;

  // Replace button to clear old listeners
  const newConfirmBtn = confirmBtn.cloneNode(true);
  newConfirmBtn.disabled = false;
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

  newConfirmBtn.addEventListener('click', async () => {
    try {
      newConfirmBtn.disabled = true;
      if (spinner) spinner.classList.remove('hidden');

      if (typeof onConfirm === 'function') await onConfirm();

      if (spinner) spinner.classList.add('hidden');
      if (checkmark) checkmark.classList.remove('hidden');

      setTimeout(() => modal.classList.add('hidden'), 1000);
    } catch (err) {
      console.error('Confirmation action error:', err);
      showNotification('error', 'An error occurred: ' + (err.message || err));
      if (spinner) spinner.classList.add('hidden');
      newConfirmBtn.disabled = false;
    }
  });

  cancelBtn.onclick = () => modal.classList.add('hidden');
}

// ════════════════════════════════════════════════════════════════════════════
//  SHARE MODAL
// ════════════════════════════════════════════════════════════════════════════

let currentDoc = null;

async function showShareModal(docId) {
  if (!docId) {
    showNotification('info', 'Open a document first to share it.');
    return;
  }
  currentDoc = docId;
  const modal = document.getElementById('sharingModal');
  if (modal) modal.classList.remove('hidden');
}

// Tab switching
const shareTabs = document.querySelectorAll('.tab');
const shareContents = {
  email:    document.getElementById('emailTab'),
  linkedin: document.getElementById('linkedinTab'),
  link:     document.getElementById('linkTab')
};

shareTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    shareTabs.forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');

    Object.values(shareContents).forEach(c => c && c.classList.add('hidden'));
    const target = shareContents[tab.dataset.tab];
    if (target) target.classList.remove('hidden');
  });
});

function generateDocumentLink(docId) {
  const view     = document.getElementById('viewPermission')?.checked ?? true;
  const download = document.getElementById('downloadPermission')?.checked ?? false;
  const expiry   = document.getElementById('expiryDate')?.value || '';
  const expiryError = document.getElementById('expiryError');
  if (expiryError) expiryError.textContent = '';

  if (expiry) {
    const expiryDate = new Date(expiry);
    if (expiryDate <= new Date()) {
      if (expiryError) expiryError.textContent = 'Expiry date must be in the future.';
      return null;
    }
  }
  return `https://edocsafe.com/share?view=${view}&download=${download}&expiry=${expiry || 'none'}&id=${docId}`;
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Email share
document.getElementById('sendEmailBtn')?.addEventListener('click', () => {
  if (!currentDoc) return showNotification('info', 'Open a document first.');

  const emailInput = document.getElementById('emailInput');
  const messageInput = document.getElementById('emailMessage');
  const email = emailInput.value.trim();
  const message = messageInput.value.trim();
  const emailError = document.getElementById('emailError');
  const messageError = document.getElementById('messageError');

  [emailInput, messageInput].forEach(i => i.classList.remove('input-error'));
  if (emailError) emailError.textContent = '';
  if (messageError) messageError.textContent = '';

  let valid = true;
  if (!email) {
    emailInput.classList.add('input-error');
    if (emailError) emailError.textContent = 'Please enter recipient email.';
    valid = false;
  } else if (!validateEmail(email)) {
    emailInput.classList.add('input-error');
    if (emailError) emailError.textContent = 'Invalid email address.';
    valid = false;
  }
  if (!message) {
    messageInput.classList.add('input-error');
    if (messageError) messageError.textContent = 'Please include a short message.';
    valid = false;
  }
  if (!valid) return;

  const docLink = generateDocumentLink(currentDoc);
  if (!docLink) return;

  const subject = encodeURIComponent('Shared Document from e-DocSafe');
  const body = encodeURIComponent(`${message}\n\nAccess the document securely:\n${docLink}`);
  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;

  setTimeout(resetAndCloseShareModal, 500);
  logActivity(ACTIVITY_TYPES.SHARE, String(currentDoc), 'Shared via Email', `To: ${email}`);
});

// LinkedIn share
document.getElementById('shareLinkedInBtn')?.addEventListener('click', () => {
  if (!currentDoc) return showNotification('info', 'Open a document first.');
  const docLink = generateDocumentLink(currentDoc);
  if (!docLink) return;
  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(docLink)}`, '_blank');
  logActivity(ACTIVITY_TYPES.SHARE, String(currentDoc), 'Shared via LinkedIn');
});

// Generate link
document.getElementById('generateLinkBtn')?.addEventListener('click', () => {
  if (!currentDoc) return showNotification('info', 'Open a document first.');
  const link = generateDocumentLink(currentDoc);
  if (!link) return;
  document.getElementById('generatedLink').value = link;
  const copyBtn = document.getElementById('copyLinkBtn');
  if (copyBtn) copyBtn.disabled = false;
  showNotification('success', 'Secure link generated.');
});

// Copy link
document.getElementById('copyLinkBtn')?.addEventListener('click', () => {
  const input = document.getElementById('generatedLink');
  if (!input || !input.value.trim()) return showNotification('info', 'Please generate a link first.');
  input.select();
  input.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(input.value)
    .then(() => showNotification('success', 'Link copied!'))
    .catch(() => { document.execCommand('copy'); showNotification('success', 'Link copied!'); });
  resetAndCloseShareModal();
  logActivity(ACTIVITY_TYPES.SHARE, 'Link Generated & Copied');
});

document.getElementById('closeModalBtn')?.addEventListener('click', resetAndCloseShareModal);

document.getElementById('calendarIcon')?.addEventListener('click', () => {
  const dateInput = document.getElementById('expiryDate');
  if (dateInput) {
    dateInput.showPicker?.();
    dateInput.focus();
  }
});

window.addEventListener('DOMContentLoaded', () => {
  const expiryInput = document.getElementById('expiryDate');
  if (expiryInput) expiryInput.min = new Date().toISOString().split('T')[0];
});

function resetAndCloseShareModal() {
  const resetVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  const resetChecked = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val; };
  const resetText = (id) => { const el = document.getElementById(id); if (el) el.textContent = ''; };
  const resetErr = (id) => { const el = document.getElementById(id); if (el) el.classList.remove('input-error'); };

  resetVal('emailInput', '');
  resetVal('emailMessage', '');
  resetVal('expiryDate', '');
  resetVal('generatedLink', '');
  resetChecked('viewPermission', true);
  resetChecked('downloadPermission', false);
  resetText('emailError');
  resetText('messageError');
  resetText('expiryError');
  resetErr('emailInput');
  resetErr('emailMessage');

  shareTabs.forEach(t => t.classList.remove('active'));
  const emailTabBtn = document.querySelector(".tab[data-tab='email']");
  if (emailTabBtn) emailTabBtn.classList.add('active');

  Object.values(shareContents).forEach(c => c && c.classList.add('hidden'));
  if (shareContents.email) shareContents.email.classList.remove('hidden');

  const modal = document.getElementById('sharingModal');
  if (modal) modal.classList.add('hidden');
  currentDoc = null;
}

// ════════════════════════════════════════════════════════════════════════════
//  PREVIEW MODAL
// ════════════════════════════════════════════════════════════════════════════

if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.6.347/pdf.worker.min.js';
}

function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64.split(',')[1]);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes.buffer;
}

async function openModal(doc) {
  currentDoc = doc;
  const extension = (doc.name || '').split('.').pop().toLowerCase();

  const previewModalEl = document.getElementById('previewModal');
  const previewContentEl = document.getElementById('previewContent');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const previewTitleEl = document.getElementById('previewTitle');
  const fileTypeEl = document.getElementById('fileType');
  const fileSizeEl = document.getElementById('fileSize');

  if (previewTitleEl) previewTitleEl.textContent = sanitizeName(doc.name);
  if (fileTypeEl) fileTypeEl.textContent = extension.toUpperCase();
  if (fileSizeEl) fileSizeEl.textContent = formatFileSize(doc.size);

  // Clear previous content (excluding header)
  previewContentEl?.querySelectorAll('img, .pdf-container, .docx-container, .excel-preview, pre, table, iframe, .no-preview')
    .forEach(el => el.remove());

  if (loadingIndicator) loadingIndicator.classList.add('visible');
  if (previewModalEl) previewModalEl.style.display = 'flex';
  document.body.classList.add('modal-open');
  if (previewContentEl) previewContentEl.classList.remove('show');

  await new Promise(resolve => setTimeout(resolve, 100));

  try {
    if (extension === 'pdf') {
      const container = document.createElement('div');
      container.className = 'pdf-container';
      previewContentEl.appendChild(container);
      const pdf = await pdfjsLib.getDocument(doc.data).promise;
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        container.appendChild(canvas);
      }
    } else if (extension === 'docx') {
      const container = document.createElement('div');
      container.className = 'docx-container';
      previewContentEl.appendChild(container);
      const result = await mammoth.convertToHtml({ arrayBuffer: base64ToArrayBuffer(doc.data) });
      container.innerHTML = (typeof DOMPurify !== 'undefined')
        ? DOMPurify.sanitize(result.value)
        : result.value;
    } else if (extension === 'xlsx') {
      const workbook = XLSX.read(base64ToArrayBuffer(doc.data), { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const container = document.createElement('div');
      container.className = 'excel-preview';
      container.innerHTML = XLSX.utils.sheet_to_html(sheet);
      previewContentEl.appendChild(container);
    } else if (extension === 'csv') {
      const csvData = atob(doc.data.split(',')[1]);
      const rows = csvData.split('\n').map(r => r.split(','));
      const table = document.createElement('table');
      table.className = 'csv-table';
      rows.forEach((row, i) => {
        const tr = document.createElement('tr');
        row.forEach(cell => {
          const cellEl = document.createElement(i === 0 ? 'th' : 'td');
          cellEl.textContent = cell.trim();
          tr.appendChild(cellEl);
        });
        table.appendChild(tr);
      });
      const container = document.createElement('div');
      container.className = 'csv-table-preview';
      container.appendChild(table);
      previewContentEl.appendChild(container);
    } else if (extension === 'txt') {
      const pre = document.createElement('pre');
      pre.textContent = atob(doc.data.split(',')[1]);
      previewContentEl.appendChild(pre);
    } else if (extension === 'html') {
      const iframe = document.createElement('iframe');
      const rawHtml = atob(doc.data.split(',')[1]);
      iframe.sandbox = '';
      iframe.srcdoc = (typeof DOMPurify !== 'undefined')
        ? DOMPurify.sanitize(rawHtml, { WHOLE_DOCUMENT: true })
        : rawHtml;
      iframe.style.width = '100%';
      iframe.style.height = '500px';
      previewContentEl.appendChild(iframe);
    } else if (extension === 'md') {
      const markdown = atob(doc.data.split(',')[1]);
      const html = marked.parse(markdown);
      const container = document.createElement('div');
      container.innerHTML = (typeof DOMPurify !== 'undefined') ? DOMPurify.sanitize(html) : html;
      previewContentEl.appendChild(container);
    } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) {
      const img = document.createElement('img');
      img.src = doc.data;
      previewContentEl.appendChild(img);
    } else {
      const msg = document.createElement('div');
      msg.className = 'no-preview';
      msg.textContent = `No preview available for .${extension.toUpperCase()} files.`;
      previewContentEl.appendChild(msg);
    }
  } catch (err) {
    console.error('Preview error:', err);
    previewContentEl.innerHTML = `<div class="no-preview">Error loading ${extension.toUpperCase()} preview.</div>`;
  }

  if (loadingIndicator) loadingIndicator.classList.remove('visible');
  if (previewContentEl) previewContentEl.classList.add('show');
}

// Preview close
document.getElementById('closeModal')?.addEventListener('click', () => {
  const modal = document.getElementById('previewModal');
  if (modal) modal.style.display = 'none';
});

document.getElementById('previewModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'previewModal') e.target.style.display = 'none';
});

// One-time wiring for preview modal buttons — fixes duplicate-listener bug
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('downloadBtn')?.addEventListener('click', () => {
    if (currentDoc) downloadDoc(currentDoc);
  });
  document.getElementById('shareBtn')?.addEventListener('click', () => {
    if (currentDoc) showShareModal(currentDoc.id || currentDoc);
  });
  document.getElementById('printBtn')?.addEventListener('click', () => window.print());
});

// ════════════════════════════════════════════════════════════════════════════
//  SETTINGS & THEME
// ════════════════════════════════════════════════════════════════════════════

function saveSettings() {
  const theme = document.getElementById('themeMode')?.value || 'system';
  const fontSize = document.getElementById('fontSize')?.value || 'medium';
  localStorage.setItem('eDocSafe_theme', theme);
  localStorage.setItem('eDocSafe_fontSize', fontSize);
  applyTheme(theme);
  applyFontSize(fontSize);
  const msg = document.getElementById('settingsSavedMsg');
  if (msg) {
    msg.classList.remove('hidden');
    setTimeout(() => msg.classList.add('hidden'), 3000);
  }
}

function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark-mode');
  const newTheme = isDark ? 'dark' : 'light';
  localStorage.setItem('eDocSafe_theme', newTheme);
  const themeSelect = document.getElementById('themeMode');
  if (themeSelect) themeSelect.value = newTheme;
  updateToggleIcon();
  updateChartColors();
}

function applyTheme(theme) {
  document.body.classList.remove('dark-mode');
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
  } else if (theme === 'system') {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.body.classList.add('dark-mode');
    }
  }
  updateToggleIcon();
}

function updateToggleIcon() {
  const btn = document.querySelector('.toggle-mode');
  if (!btn) return;
  const isDark = document.body.classList.contains('dark-mode');
  btn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

function applyFontSize(size) {
  const sizeMap = { small: '14px', medium: '16px', large: '18px' };
  document.documentElement.style.setProperty('--base-font-size', sizeMap[size] || '16px');
}

function resetSettings() {
  localStorage.removeItem('eDocSafe_theme');
  localStorage.removeItem('eDocSafe_fontSize');
  loadSettings();
  showNotification('info', 'Settings reset to defaults.');
}

function loadSettings() {
  const savedTheme = localStorage.getItem('eDocSafe_theme') || 'system';
  const savedFontSize = localStorage.getItem('eDocSafe_fontSize') || 'medium';
  const themeEl = document.getElementById('themeMode');
  const fontEl = document.getElementById('fontSize');
  if (themeEl) themeEl.value = savedTheme;
  if (fontEl) fontEl.value = savedFontSize;
  applyTheme(savedTheme);
  applyFontSize(savedFontSize);
}

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  updateChartColors();
});

// ════════════════════════════════════════════════════════════════════════════
//  VIEW TOGGLE (grid vs list)
// ════════════════════════════════════════════════════════════════════════════

function setView(view) {
  const grid = document.getElementById('docsGrid');
  const btnList = document.getElementById('btnList');
  const btnGrid = document.getElementById('btnGrid');
  if (!grid) return;

  btnList?.classList.remove('active');
  btnGrid?.classList.remove('active');

  if (view === 'list') {
    grid.classList.remove('grid-view');
    grid.classList.add('list-view');
    btnList?.classList.add('active');
    btnList?.setAttribute('aria-pressed', 'true');
    btnGrid?.setAttribute('aria-pressed', 'false');
  } else {
    grid.classList.remove('list-view');
    grid.classList.add('grid-view');
    btnGrid?.classList.add('active');
    btnGrid?.setAttribute('aria-pressed', 'true');
    btnList?.setAttribute('aria-pressed', 'false');
  }
  localStorage.setItem('docsView', view);
}

function applyViewMode(mode) {
  if (!favoritesGrid) return;
  favoritesGrid.classList.remove('grid-view', 'list-view');
  favoritesGrid.classList.add(`${mode}-view`);
  localStorage.setItem('docViewMode', mode);

  const gridBtn = document.getElementById('gridViewBtn');
  const listBtn = document.getElementById('listViewBtn');
  gridBtn?.classList.toggle('active', mode === 'grid');
  listBtn?.classList.toggle('active', mode === 'list');
  gridBtn?.setAttribute('aria-pressed', String(mode === 'grid'));
  listBtn?.setAttribute('aria-pressed', String(mode === 'list'));
}

// Attach view toggle buttons (null-guarded)
document.getElementById('gridViewBtn')?.addEventListener('click', () => applyViewMode('grid'));
document.getElementById('listViewBtn')?.addEventListener('click', () => applyViewMode('list'));

document.addEventListener('DOMContentLoaded', () => {
  let saved = localStorage.getItem('docsView');
  if (!saved) saved = window.innerWidth <= 768 ? 'list' : 'grid';
  setView(saved);

  const savedFavView = localStorage.getItem('docViewMode') || 'list';
  applyViewMode(savedFavView);
});

// ════════════════════════════════════════════════════════════════════════════
//  SEARCH / SORT LISTENERS
// ════════════════════════════════════════════════════════════════════════════

if (sortSelect) sortSelect.addEventListener('change', loadDocs);
if (searchInput) searchInput.oninput = debounce(loadDocs, 300);
if (favoritesSearch) favoritesSearch.oninput = debounce(loadFavorites, 300);

document.getElementById('dateFilter')?.addEventListener('change', generateUploadChartData);

document.getElementById('favoritesSearch')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') loadFavorites();
});

// ════════════════════════════════════════════════════════════════════════════
//  SUPPORT TICKET (form is a div, not a form — manual validation)
// ════════════════════════════════════════════════════════════════════════════

const formElements = {
  confirm_title: 'Confirm Ticket Submission',
  confirm_message: 'Are you sure you want to submit the ticket?'
};

function showConfirmation(title, message, callback, summaryHTML = '') {
  const modal = document.getElementById('modalOverlay');
  const titleEl = document.getElementById('supportModalTitle');
  const msgEl = document.getElementById('supportModalMessage');
  const summaryEl = document.getElementById('formSummary');
  if (!modal) return;

  if (titleEl) titleEl.innerText = title;
  if (msgEl) msgEl.innerText = message;
  if (summaryEl) summaryEl.innerHTML = summaryHTML;

  window.confirmCallback = callback;
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}

function closeSupportModal() {
  const modal = document.getElementById('modalOverlay');
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}

document.getElementById('confirmBtn')?.addEventListener('click', () => {
  if (typeof window.confirmCallback === 'function') window.confirmCallback();
  closeSupportModal();
});

function confirmSubmission() {
  const email = document.getElementById('supportEmail')?.value.trim() || '';
  const subject = document.getElementById('supportSubject')?.value.trim() || '';
  const desc = document.getElementById('supportDescription')?.value.trim() || '';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return showNotification('error', 'Please enter a valid email address.');
  }
  if (!subject) return showNotification('error', 'Please enter a subject.');
  if (!desc) return showNotification('error', 'Please describe your issue.');

  const summary = `
    <strong>Email:</strong> ${email}<br>
    <strong>Subject:</strong> ${subject}<br>
    <strong>Description:</strong> ${desc}
  `;

  showConfirmation(
    formElements.confirm_title,
    formElements.confirm_message,
    submitFormAJAX,
    summary
  );
}

function submitFormAJAX() {
  const modalContent = document.getElementById('modalContent');
  if (!modalContent) return;
  modalContent.innerHTML = `<div class="spinner"></div>`;

  setTimeout(() => {
    showNotification('success', 'Support ticket submitted. We will be in touch!');
    modalContent.innerHTML = `<p>Your support request has been received. You'll be notified via email.</p>`;
    ['supportEmail', 'supportSubject', 'supportDescription'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }, 1000);
}

// ════════════════════════════════════════════════════════════════════════════
//  LIVE CHAT
// ════════════════════════════════════════════════════════════════════════════

const chatBtn = document.getElementById('chatBtn');
const chatBox = document.getElementById('chatBox');
const closeBtn = document.getElementById('closeBtn');
const sendBtn = document.getElementById('sendBtn');
const userInput = document.getElementById('userInput');
const chatMessages = document.getElementById('chatMessages');

chatBtn?.addEventListener('click', () => {
  if (chatBox) chatBox.style.display = chatBox.style.display === 'block' ? 'none' : 'block';
});

closeBtn?.addEventListener('click', () => {
  if (chatBox) chatBox.style.display = 'none';
});

function sendMessage() {
  const message = userInput?.value.trim();
  if (!message || !chatMessages) return;

  const userDiv = document.createElement('div');
  userDiv.textContent = message;
  userDiv.style.textAlign = 'right';
  userDiv.style.margin = '5px 0';
  chatMessages.appendChild(userDiv);

  setTimeout(() => {
    const botDiv = document.createElement('div');
    botDiv.textContent = "Thanks for your message! We'll respond shortly.";
    botDiv.style.color = '#666';
    botDiv.style.margin = '5px 0';
    chatMessages.appendChild(botDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 1000);

  userInput.value = '';
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

sendBtn?.addEventListener('click', sendMessage);
userInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

// ════════════════════════════════════════════════════════════════════════════
//  KNOWLEDGE BASE
// ════════════════════════════════════════════════════════════════════════════

const kbArticles = [
  { title: 'Uploading Documents', content: 'Step-by-step guide to upload your documents safely.' },
  { title: 'Sharing & Permissions', content: 'Learn how to generate share links and set permissions.' },
  { title: 'Account Security', content: 'Tips for securing your account including MFA setup.' },
  { title: 'How to enable dark mode?', content: 'Go to Settings → Appearance → Toggle Dark Mode.' },
  { title: 'Billing & Subscription', content: 'View plans, invoices, and manage billing preferences.' }
];

const kbList = document.getElementById('kb-list');
const kbSearch = document.getElementById('kb-search');

function renderKB(list, query = '') {
  if (!kbList) return;
  kbList.innerHTML = '';

  if (list.length === 0) {
    kbList.innerHTML = `<div class="no-results">No articles found for "<strong>${query}</strong>"</div>`;
    return;
  }

  list.forEach(article => {
    const div = document.createElement('div');
    div.className = 'kb-article';
    const title = query ? article.title.replace(new RegExp(`(${query})`, 'gi'), '<mark>$1</mark>') : article.title;
    div.innerHTML = `
      <details>
        <summary><h3>${title}</h3></summary>
        <p>${article.content}</p>
        <div class="kb-feedback">
          <span>Was this helpful?</span>
          <button class="feedback-btn" onclick="handleFeedback(true)">Yes</button>
          <button class="feedback-btn" onclick="handleFeedback(false)">No</button>
        </div>
      </details>
    `;
    kbList.appendChild(div);
  });
}

function handleFeedback(isHelpful) {
  showNotification('info', isHelpful
    ? 'Thanks for your feedback!'
    : "Sorry to hear that. We'll improve this.");
}

renderKB(kbArticles);

kbSearch?.addEventListener('input', function () {
  const query = this.value.toLowerCase();
  const filtered = kbArticles.filter(a =>
    a.title.toLowerCase().includes(query) || a.content.toLowerCase().includes(query)
  );
  renderKB(filtered, query);
});

// ════════════════════════════════════════════════════════════════════════════
//  FAQ (uses hidden attribute + aria-expanded)
// ════════════════════════════════════════════════════════════════════════════

document.querySelectorAll('.faq-question').forEach(question => {
  question.addEventListener('click', () => {
    const answer = question.nextElementSibling;
    const isOpen = question.getAttribute('aria-expanded') === 'true';
    question.setAttribute('aria-expanded', String(!isOpen));
    if (answer) answer.hidden = isOpen;
    const indicator = question.querySelector('span');
    if (indicator) indicator.textContent = isOpen ? '+' : '−';
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  FOLDER (stub — feature not yet implemented)
// ════════════════════════════════════════════════════════════════════════════

function openFolderModal() {
  const modal = document.getElementById('folderModal');
  if (modal) modal.style.display = 'flex';
}

function closeFolderModal() {
  const modal = document.getElementById('folderModal');
  if (modal) modal.style.display = 'none';
}

function createFolder() {
  const input = document.getElementById('folderName');
  const name = input?.value.trim();
  if (!name) return showNotification('error', 'Please enter a folder name.');
  showNotification('info', `Folder "${name}" — feature coming soon.`);
  if (input) input.value = '';
  closeFolderModal();
}

// ════════════════════════════════════════════════════════════════════════════
//  DELETE ACCOUNT
// ════════════════════════════════════════════════════════════════════════════

const deleteModal = document.getElementById('deleteModal');
document.getElementById('deleteAccount')?.addEventListener('click', () => {
  if (deleteModal) deleteModal.style.display = 'flex';
});

function closeDeleteModal() {
  if (deleteModal) deleteModal.style.display = 'none';
}

async function deleteAccount() {
  try {
    const user = window.firebaseAuth?.currentUser;
    if (!user) {
      showNotification('error', 'No signed-in user found.');
      closeDeleteModal();
      return;
    }

    if (window.firebaseFirestore) {
      try {
        const docsRef = window.firebaseFirestore.collection('users').doc(user.uid).collection('documents');
        const snapshot = await docsRef.get();
        const batch = window.firebaseFirestore.batch();
        snapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        await window.firebaseFirestore.collection('users').doc(user.uid).delete();
      } catch (fsErr) {
        console.warn('Firestore cleanup error:', fsErr.code);
      }
    }

    await user.delete();
    localStorage.clear();
    sessionStorage.clear();
    closeDeleteModal();
    window.location.href = 'Landing-page.html';
  } catch (error) {
    closeDeleteModal();
    if (error.code === 'auth/requires-recent-login') {
      showNotification('error', 'Please sign out and back in before deleting your account.');
    } else {
      showNotification('error', 'Account deletion failed: ' + error.message);
    }
  }
}

// ══════ KEYBOARD SHORTCUTS ═══════════════════════════════════
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal').forEach(modal => (modal.style.display = 'none'));
    if (previewModal) previewModal.style.display = 'none';
    document.getElementById('uploadModal')?.style && (document.getElementById('uploadModal').style.display = 'none');
    document.getElementById('sharingModal')?.classList.add('hidden');
    closeRenameModal();
    closeSupportModal();
    closeDeleteModal();
    closeFolderModal();
  }

  if (e.ctrlKey && e.key === 'u') {
    e.preventDefault();
    if (typeof openUpModal === 'function') openUpModal();
    else document.getElementById('uploadModal')?.style && (document.getElementById('uploadModal').style.display = 'flex');
  }

  if (e.ctrlKey && e.key === 'f') {
    e.preventDefault();
    if (searchInput) searchInput.focus();
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  SERVICE WORKER & INSTALL PROMPT
// ════════════════════════════════════════════════════════════════════════════

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./firebase-service-worker.js')
      .then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showNotification('info', 'New version available! Refresh to update.');
            }
          });
        });
      })
      .catch((error) => console.warn('ServiceWorker registration failed:', error));
  });
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  const installBtn = document.createElement('button');
  installBtn.id = 'installBtn';
  installBtn.innerHTML = '<i class="fas fa-download"></i> Install App';
  installBtn.style.cssText = 'position:fixed;bottom:20px;left:20px;background:var(--brand);color:white;border:none;padding:10px 20px;border-radius:5px;cursor:pointer;z-index:1000;';

  installBtn.onclick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.info(`Install prompt: ${outcome}`);
      deferredPrompt = null;
      installBtn.remove();
    }
  };

  document.body.appendChild(installBtn);
});

// ════════════════════════════════════════════════════════════════════════════
//  ONLINE SYNC ON LOAD
// ════════════════════════════════════════════════════════════════════════════

window.addEventListener('DOMContentLoaded', () => {
  if (navigator.onLine && window.firebaseSyncManager) {
    setTimeout(() => {
      window.firebaseSyncManager.syncPendingChanges();
    }, 3000);
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  INITIAL LOAD
// ════════════════════════════════════════════════════════════════════════════

window.addEventListener('load', () => {
  loadDocs();
  loadFavorites();
  loadTrash();
  refreshActivityFeed();
  generateUploadChartData();
});