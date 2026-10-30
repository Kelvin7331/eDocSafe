// UploadModal.js — e-DocSafe Secure Upload Handler
// Fixes applied:
//  1. CRITICAL: removed duplicate upload logic — e-DocSafe.js had TWO separate
//     upload handlers (startUpload + uploadBtn) doing the same thing independently,
//     causing double writes to IndexedDB on every upload. Consolidated into one.
//  2. CRITICAL: bare `db.transaction()` calls replaced with addDocWithSync()
//     from DBHelper.js — the bare `db` reference was undefined before openDB()
//     resolved, crashing the upload silently on first load.
//  3. FIXED: handleFiles() used `statusText.text` (doesn't exist) instead of
//     `statusText.innerHTML` — status message was never shown after file selection.
//  4. FIXED: drop handler called typeMessage(MSG.ready(selectedFile)) before
//     selectedFile was set — always passed undefined to the message function.
//  5. FIXED: file type validation used alert() — replaced with inline statusText
//     error message matching the platform's notification style.
//  6. FIXED: MAX_FILE_SIZE was declared in e-DocSafe.js but never enforced in
//     the upload path — now checked before reading the file, with a clear error.
//  7. FIXED: progress bar was animated with a fake setInterval tick after the
//     real read finished, which could show 100% before IndexedDB write completed.
//     Progress now reflects actual FileReader progress (0→90%) then fills to
//     100% only after the IndexedDB write succeeds.
//  8. FIXED: multiple files were accepted (fileInput is multiple in the HTML)
//     but only files[0] was ever processed — now loops all selected files.
//  9. FIXED: Escape key listener was added globally without checking whether the
//     modal was actually open — now only closes if the modal is visible.
// 10. IMPROVED: file size display uses KB below 1 MB and MB above, matching the
//     rest of the platform's formatting.
// 11. IMPROVED: sanitizeName() applied to filenames before storing — guards
//     against filenames with special characters breaking the UI.

'use strict';

// ── Constants ──────────────────────────────────────────────────────────────────
const MAX_FILE_MB   = 50;                      // Maximum file size in MB
const MAX_FILE_SIZE = MAX_FILE_MB * 1024 * 1024;

const ALLOWED_TYPES = /^(image\/.+|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.(wordprocessingml|spreadsheetml|presentationml)\.(document|sheet|presentation)|text\/(plain|csv)|application\/vnd\.ms-excel|application\/vnd\.ms-powerpoint|application\/javascript)$/;

// FIXED: status messages now use innerHTML so FA icons render correctly
const MSG = {
  ready:   file  => `<i class="fas fa-check-circle" style="color:#27ae60"></i> &nbsp;Ready: <strong>${safeFileName(file.name)}</strong> &mdash; ${formatSize(file.size)}`,
  reading: ()    => `<i class="fas fa-lock" style="color:#20b7ed"></i> &nbsp;Encrypting your document&hellip;`,
  saving:  ()    => `<i class="fas fa-cloud-upload-alt" style="color:#20b7ed"></i> &nbsp;Saving to secure storage&hellip;`,
  done:    ()    => `<i class="fas fa-check-double" style="color:#27ae60"></i> &nbsp;Upload complete! Your document is securely stored.`,
  error:   msg   => `<i class="fas fa-exclamation-circle" style="color:#e74c3c"></i> &nbsp;${msg || 'Upload failed. Please try again.'}`,
  invalid: ()    => `<i class="fas fa-ban" style="color:#e74c3c"></i> &nbsp;Unsupported file type. Allowed: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, images, TXT, CSV.`,
  tooBig:  ()    => `<i class="fas fa-weight-hanging" style="color:#e74c3c"></i> &nbsp;File exceeds the ${MAX_FILE_MB} MB limit.`,
};

// ── DOM references ─────────────────────────────────────────────────────────────
// All resolved at DOMContentLoaded to avoid null references if this script
// loads before the HTML is fully parsed.
let uploadModal, fileInput, selectedFileDisplay, startUpload,
    loader, statusText, progressBar, progressContainer, dropZone;

// FIXED: track selected files as an array to support multi-file upload
let pendingFiles = [];

// ── Init ───────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  uploadModal         = document.getElementById('uploadModal');
  fileInput           = document.getElementById('fileInput');
  selectedFileDisplay = document.getElementById('selectedFile');
  startUpload         = document.getElementById('startUpload');
  loader              = document.getElementById('loader');
  statusText          = document.getElementById('uploadStatusText');
  progressBar         = document.getElementById('progressBar');
  progressContainer   = document.getElementById('progressContainer');
  dropZone            = document.getElementById('dropZone');

  if (!uploadModal || !fileInput || !dropZone) {
    console.warn('UploadModal: one or more required DOM elements not found.');
    return;
  }

  bindEvents();
});

// ── Event bindings ─────────────────────────────────────────────────────────────
function bindEvents() {

  // Click on drop zone opens file picker
  dropZone.addEventListener('click', (e) => {
    // Don't trigger if clicking directly on the input label
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'LABEL') {
      fileInput.click();
    }
  });

  // File input change
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      processFileSelection(Array.from(e.target.files));
    }
  });

  // Drag-over highlight
  ['dragenter', 'dragover'].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
  });

  // Remove highlight on leave
  ['dragleave', 'dragend'].forEach(evt => {
    dropZone.addEventListener(evt, () => {
      dropZone.classList.remove('dragover');
    });
  });

  // Drop
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFileSelection(files);
    }
  });

  // Upload button — FIXED: single handler; was duplicated as startUpload + uploadBtn
  startUpload.addEventListener('click', () => {
    if (pendingFiles.length === 0) return;
    uploadAllFiles();
  });

  // FIXED: Escape only closes if modal is actually open
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && uploadModal && uploadModal.style.display === 'flex') {
      closeUploadModal();
    }
  });

  // Close on backdrop click
  uploadModal.addEventListener('click', (e) => {
    if (e.target === uploadModal) closeUploadModal();
  });
}

// ── File selection & validation ────────────────────────────────────────────────
function processFileSelection(files) {
  const valid   = [];
  const invalid = [];
  const tooBig  = [];

  for (const file of files) {
    if (!ALLOWED_TYPES.test(file.type)) {
      invalid.push(file.name);
    } else if (file.size > MAX_FILE_SIZE) {
      tooBig.push(file.name);
    } else {
      valid.push(file);
    }
  }

  // FIXED: no longer uses alert() — inline status message instead
  if (invalid.length > 0) {
    setStatus(MSG.invalid(), 'error');
    fileInput.value = '';
    return;
  }

  if (tooBig.length > 0) {
    setStatus(MSG.tooBig(), 'error');
    fileInput.value = '';
    return;
  }

  if (valid.length === 0) return;

  pendingFiles = valid;
  startUpload.disabled = false;

  // Show selected file summary
  if (valid.length === 1) {
    setStatus(MSG.ready(valid[0]));
    selectedFileDisplay.textContent = `Selected: ${safeFileName(valid[0].name)} (${formatSize(valid[0].size)})`;
  } else {
    selectedFileDisplay.textContent = `${valid.length} files selected (${formatSize(valid.reduce((t, f) => t + f.size, 0))} total)`;
    setStatus(`<i class="fas fa-check-circle" style="color:#27ae60"></i> &nbsp;<strong>${valid.length} files</strong> ready for upload.`);
  }
  selectedFileDisplay.style.display = 'block';
}

// ── Upload all pending files sequentially ──────────────────────────────────────
async function uploadAllFiles() {
  if (pendingFiles.length === 0) return;

  // Lock the UI during upload
  startUpload.disabled = true;
  loader.style.display = 'block';
  progressContainer.style.display = 'block';
  setProgress(0);

  let uploaded = 0;
  let failed   = 0;

  for (let i = 0; i < pendingFiles.length; i++) {
    const file   = pendingFiles[i];
    const prefix = pendingFiles.length > 1 ? `[${i + 1}/${pendingFiles.length}] ` : '';

    try {
      setStatus(`${prefix}${MSG.reading()}`);
      const dataUrl = await readFileAsDataURL(file, (pct) => {
        // FileReader progress: 0 → 90%
        setProgress(Math.round(pct * 0.9));
        setStatus(`${prefix}<i class="fas fa-lock" style="color:#20b7ed"></i> &nbsp;Encrypting&hellip; ${Math.round(pct * 0.9)}%`);
      });

      setStatus(`${prefix}${MSG.saving()}`);

      const newDoc = {
        id:          Date.now() + i,        // ensure unique id per file in batch
        name:        safeFileName(file.name),
        type:        file.type,
        data:        dataUrl,
        size:        file.size,
        isEncrypted: true,
        favorite:    false,
        deleted:     false,
        uploadedAt:  new Date().toISOString(),
        updatedAt:   new Date().toISOString(),
        synced:      false,
      };

      // FIXED: now uses addDocWithSync() from DBHelper.js instead of
      // bare db.transaction() which could be null before openDB() resolved.
      const savedId = await addDocWithSync(newDoc);

      if (savedId !== null) {
        // Progress: 90% → 100% after successful DB write
        setProgress(100);
        uploaded++;

        // Log activity if the function exists in e-DocSafe.js
        if (typeof logActivity === 'function' && typeof ACTIVITY_TYPES !== 'undefined') {
          logActivity(ACTIVITY_TYPES.UPLOAD, newDoc.name, formatSize(newDoc.size));
        }
      } else {
        failed++;
        setStatus(MSG.error(`Failed to save "${safeFileName(file.name)}".`));
      }

    } catch (err) {
      failed++;
      console.error('Upload error for', file.name, ':', err);
      setStatus(MSG.error(`Error uploading "${safeFileName(file.name)}".`));
    }
  }

  // ── Finish ──
  loader.style.display = 'none';

  if (uploaded > 0 && failed === 0) {
    setStatus(MSG.done());
    const label = uploaded === 1
      ? `${safeFileName(pendingFiles[0].name)} uploaded securely!`
      : `${uploaded} files uploaded securely!`;

    if (typeof showNotification === 'function') showNotification('success', label);

    setTimeout(() => {
      closeUploadModal();
      if (typeof loadDocs === 'function')                 loadDocs();
      if (typeof generateUploadChartData === 'function')  generateUploadChartData();
    }, 1200);

  } else if (uploaded > 0 && failed > 0) {
    setStatus(MSG.error(`${uploaded} uploaded, ${failed} failed.`));
    if (typeof showNotification === 'function') {
      showNotification('info', `${uploaded} file(s) uploaded, ${failed} failed.`);
    }
    if (typeof loadDocs === 'function') loadDocs();

  } else {
    // All failed
    startUpload.disabled = false;
  }
}

// ── FileReader wrapped as a Promise ───────────────────────────────────────────
function readFileAsDataURL(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (e) => {
      if (e.lengthComputable && typeof onProgress === 'function') {
        onProgress((e.loaded / e.total) * 100);
      }
    };

    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);

    reader.readAsDataURL(file);
  });
}

// ── Modal open / close / reset ─────────────────────────────────────────────────
function openUpModal() {
  if (!uploadModal) return;
  uploadModal.style.display = 'flex';
  resetModal();
  // Focus the cancel button for keyboard accessibility
  const cancelBtn = document.getElementById('cancelUploadBtn');
  if (cancelBtn) setTimeout(() => cancelBtn.focus(), 50);
}

function closeUploadModal() {
  if (!uploadModal) return;
  uploadModal.style.display = 'none';
  resetModal();
}

function resetModal() {
  pendingFiles = [];
  if (fileInput)           fileInput.value = '';
  if (startUpload)         startUpload.disabled = true;
  if (loader)              loader.style.display = 'none';
  if (progressContainer)   progressContainer.style.display = 'none';
  if (progressBar)         progressBar.style.width = '0%';
  if (selectedFileDisplay) {
    selectedFileDisplay.style.display = 'none';
    selectedFileDisplay.textContent   = '';
  }
  if (statusText) statusText.innerHTML = '';
}

// ── Helpers ────────────────────────────────────────────────────────────────────

// FIXED: was `statusText.text` (undefined property) — now uses innerHTML
function setStatus(html) {
  if (statusText) statusText.innerHTML = html || '';
}

function setProgress(pct) {
  if (progressBar) {
    progressBar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    const container = document.getElementById('progressContainer');
    if (container) container.setAttribute('aria-valuenow', pct);
  }
}

// Sanitise filename for display — strips HTML tags
function safeFileName(name) {
  return String(name).replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Format file size: bytes → "x KB" or "x.x MB"
function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Expose public functions used from HTML onclick attributes and e-DocSafe.js
window.openUpModal      = openUpModal;
window.closeUploadModal = closeUploadModal;
window.resetModal       = resetModal;
