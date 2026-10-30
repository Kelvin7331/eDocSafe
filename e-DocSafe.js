
// ── Auth Guard ────────────────────────────────────────────────────────────────
// Redirect to Sign-In if no Firebase session.
(function initAuthGuard() {
  if (typeof firebase === 'undefined' || !window.firebaseAuth) return;
  window.firebaseAuth.onAuthStateChanged(function(user) {
    if (!user) {
      window.location.href = 'Sign-In.html';
    }
  });
})();

// Shim: openDB() and STORE_NAME are provided by DBHelper.js (loaded first via defer).
// These guards protect against any edge-case timing without opening a different DB.
if (typeof openDB === 'undefined') {
  window.openDB = function() {
    if (typeof dbPromise !== 'undefined') return dbPromise;
    return Promise.reject(new Error('DBHelper.js not ready — check script load order.'));
  };
}
if (typeof STORE_NAME === 'undefined') {
  window.STORE_NAME = 'documents';
}

 // Navigation 
const sidebar = document.getElementById('sidebar');

 // Toggle Sidebar
 function toggleSidebar() { 
  if (window.innerWidth >= 768) {
     sidebar.classList.toggle('collapsed'); 
   } else {
     sidebar.classList.toggle('open'); 
   }
 }

 function activateMenu(el, pushState = true) {
   document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
   el.classList.add('active');
   
   const target = el.getAttribute('data-target');
   document.querySelectorAll('.section-container').forEach(sec => sec.style.display = 'none');
 
  // Show the selected section
 const section = document.getElementById(target);
   if (section) {
      section.style.display = 'block'; 
    } else {
     console.warn(`No section found for: ${target}`);
  }

 // Save to Localstorage
 localStorage.setItem('activeSection',target);
 
 // Push to browser history
if (pushState) {
    history.pushState({ section:target },'', `#${target}`);
  }
}

// On browser back/forward navigation
window.addEventListener('popstate', (event) => {
  const section = event.state?.section || localStorage.getItem('activeSection') || 'dashboard';
  const el = document.querySelector(`.menu-item[data-target="${section}"]`);
  if (el) activateMenu(el, false); 
});

// On initial page load
window.addEventListener('DOMContentLoaded', () => {
  const fromHash = location.hash?.substring(1);
  const saved = localStorage.getItem('activeSection');
  const target = fromHash || saved || 'dashboard';
  const el = document.querySelector(`.menu-item[data-target="${target}"]`);
  if (el) activateMenu(el);
});
    
 // Close sidebar on item click
 sidebar.addEventListener('click', e => {
   sidebar.classList.remove('open');
 })
    
 // Close sidebar on mobile outside click
 document.addEventListener('click', e => { 
   if (window.innerWidth < 768 && sidebar.classList.contains('open')) {
   if (!sidebar.contains(e.target) && !e.target.closest('.toggle-btn')) {
    sidebar.classList.remove('open');
    }
  }
});
 
  // User dropdown Function
 const userIcon = document.getElementById('userIcon');
 const dropdownMenu = document.getElementById('dropdownMenu');

  userIcon.addEventListener('click', e => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('show');
  });
   
  // Close dropDown on outside click
 document.addEventListener('click', e => {
   if (!userIcon.contains(e.target) && !dropdownMenu.contains(e.target)) {
     dropdownMenu.classList.remove('show');
   }
 });
   
 // Close User dropDown
function closeDropdown() {
   dropdownMenu.classList.remove('show');
}

document.addEventListener('DOMContentLoaded', function () {
  const editBtn = document.getElementById('editProfileBtn');
  const saveBtn = document.getElementById('saveProfileBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const backToProfile = document.getElementById('backToProfile');
  const profilePage = document.getElementById('profilePage');
  const editProfilePage = document.getElementById('editProfilePage');
  const editFullName = document.getElementById('editFullName');
  const editEmail = document.getElementById('editEmail');
  const editPhone = document.getElementById('editPhone');
  const displayFullName = document.getElementById('displayFullName');
  const displayEmail = document.getElementById('displayEmail');
  const displayPhone = document.getElementById('displayPhone');

  // Main icon initials
  const userInitials = document.getElementById('userInitials');

    // Helper to set innerText on all elements with the given class
  function updateAllTextByClass(className, text) {
     document.querySelectorAll(`.${className}`).forEach(el => el.textContent = text);
  }

  // Get initials from full name
 function getInitials(name) {
   const words = name.trim().split(' ');
   if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
 }

  // Load profile from localStorage
 function loadProfile() {
   // sourced from Firebase Auth or empty defaults
   const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
   const profile = JSON.parse(localStorage.getItem('userProfile')) || {
    fullName: currentUser.displayName || '',
    email:    currentUser.email || '',
    phone:    ''
  };

  const initials = getInitials(profile.fullName);

  // Update all profile fields in UI
  updateAllTextByClass('displayFullName', profile.fullName);
  updateAllTextByClass('displayEmail', profile.email);
  updateAllTextByClass('displayPhone', profile.phone);

  // Update initials
  if (userIcon) userIcon.textContent = initials;
  if (userInitials) userInitials.textContent = initials;

  // Fill form fields
  editFullName.value = profile.fullName;
  editEmail.value = profile.email;
  editPhone.value = profile.phone;
}

  // Save profile to localStorage
 function saveProfile() {
   const updatedProfile = {
     fullName: editFullName.value.trim(),
     email: editEmail.value.trim(),
     phone: editPhone.value.trim()
   };

   localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
   loadProfile(); // Reload profile to update UI
 }

   // Back to profile page
  backToProfile.addEventListener('click', function() {
    editProfilePage.style.display = 'none';
    profilePage.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  
  // Edit button
  editBtn.addEventListener('click', () => {
    profilePage.style.display = 'none';
    editProfilePage.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Save changes
  saveBtn.addEventListener('click', () => {
    saveProfile();
    editProfilePage.style.display = 'none';
    profilePage.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showNotification('success', 'Profile info updated successfully!');
  });

  // Cancel editing
  cancelEditBtn.addEventListener('click', () => {
    editProfilePage.style.display = 'none';
    profilePage.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadProfile(); // reset fields
  });

 // Load profile on page load
  loadProfile();
  setWelcomeMessage();
});

  // Set welcome message
function setWelcomeMessage() {
    const profile = JSON.parse(localStorage.getItem('userProfile'));
    if (!profile || !profile.fullName) return;
    const firstName = profile.fullName.trim().split(' ')[0];
    document.getElementById('welcomeName').textContent = firstName;
}

function saveCurrentUser() {
    sessionStorage.setItem('currentUser', JSON.stringify(user));
}
   
function getCurrentUser() {
   const user = sessionStorage.getItem('currentUser');
   return user ? JSON.parse(user) : null;
}

 // Dynamic Year
document.getElementById('year').textContent = new Date().getFullYear();

 // Export Activities CSV
function exportActivity() {
   showNotification('info', 'Feature coming soon.');
}

  // Scan function
function scan() {
   showNotification('info', 'Document scanning coming soon.');
}

// Signout Function with Firebase
async function logout() {
  showConfirmationModal({
    title: 'Logout',
    message: 'Are you sure you want to log out?',
    type: 'logout',
    onConfirm: async () => {
      try {
        if (window.firebaseAuthManager) {
          await window.firebaseAuthManager.signOut();
        }
        
        localStorage.removeItem('userProfile');
        localStorage.removeItem('currentUser');
        showNotification('success', 'Logged out successfully!');
        
        // Redirect to signin page
        window.location.href = "Sign-In.html";
        closeDropdown();
      } catch (error) {
        showNotification('error', 'Logout failed: ' + error.message);
      }
    }
  });
}
     
  // Status messages
const upload_MSG = {
   ready: file => `<i class="fas fa-check-circle"></i> File selected: "<strong>${sanitizeName(file.name)}</strong>" – Ready for secure upload.`,
   reading: '<i class="fas fa-lock"></i> Encrypting your document for secure upload...',
   saving: '<i class="fas fa-cloud-upload-alt"></i> Uploading encrypted document to secure storage...',
   done: '<i class="fas fa-check-double"></i> Upload successful! Your document is now securely stored.',
   error: '<i class="fas fa-exclamation-circle"></i> Upload failed. Please try again.'
};

// Typewriter effect function
function typeMessage(messageHtml, elementId = 'statusText', speed = 30) {
  const el = document.getElementById(elementId);
  el.classList.remove('typewriter'); // reset
  el.innerHTML = '';
  let i = 0;
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = messageHtml;
  const fullText = tempDiv.textContent || tempDiv.innerText || '';

  const typeInterval = setInterval(() => {
    if (i < fullText.length) {
      el.innerHTML = fullText.slice(0, i + 1);
      i++;
    } else {
      el.innerHTML = messageHtml; 
      clearInterval(typeInterval);
      el.classList.add('typewriter'); // Add cursor
    }
  }, speed);
}
    
   // DOM Element Constants
   // NOTE: fileInput, dropZone, statusText, uploadModal, startUpload, loader,
   //       progressContainer, progressBar, selectedFileDisplay are declared in
   //       UploadModal.js — removed here to prevent 'already declared' SyntaxError.
   const MAX_STORAGE   = 100; // 100 MB storage limit
   const uploadBtn     = document.getElementById('uploadBtn');
   const clearAllBtn   = document.getElementById('clearAllBtn');
   const sortSelect    = document.getElementById('sortSelect');
   const docsGrid      = document.getElementById('docsGrid');
   const previewModal  = document.getElementById('previewModal');
   const previewContent= document.getElementById('previewContent');
   const closeModal    = document.getElementById('closeModal');
   const notification  = document.getElementById('notification');
   const searchInput   = document.getElementById('searchInput');
   const favoritesSearch = document.getElementById('favoritesSearch');
   const favoritesGrid = document.getElementById('favoritesGrid');
   const trashGrid     = document.getElementById('trashGrid');
   const emptyTrashBtn = document.getElementById('emptyTrashBtn');
   const spinner       = document.getElementById('uploadSpinner');

   let selectedFile = null;
   const PURGE_DAYS = 1;
 
     // Handling File input
  fileInput.addEventListener('change', function(e) {
     const file = fileInput.files[0];
     const allowedTypes = /^(image\/.+|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.(wordprocessingml|spreadsheetml|presentationml)\.document|text\/plain|text\/csv|application\/vnd\.ms-excel|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|application\/vnd\.ms-powerpoint|application\/vnd\.openxmlformats-officedocument\.presentationml\.presentation|application\/javascript)$/;
     
   if (file && allowedTypes.test(file.type)) {
       selectedFile = file;
       statusText.textContent = upload_MSG.ready(selectedFile);
       typeMessage(upload_MSG.ready(selectedFile));
       uploadBtn.disabled = false;
       startUpload.disabled = false;
     } else {
       showNotification('error', 'Unsupported file type. Allowed: PDF, DOCX, XLSX, images, TXT, CSV.');
       fileInput.value = '';
       selectedFile = null;
       uploadBtn.disabled = true;
       resetUpload();
     }
  });

  function openUpModal() {
    uploadModal.style.display = 'flex';
    statusText.textContent = '';
    progressContainer.style.display = 'none';
    progressBar.style.width = '0%';   
    selectedFileDisplay.style.display = 'none';
  }
    
 function closeUploadModal() {
    uploadModal.style.display = 'none';
    resetModal();
  }
  
 // Reset modal
 function resetModal() {
    fileInput.value = '';
    startUpload.disabled = true;
    loader.style.display = 'none';
    statusText.textContent = '';
    progressContainer.style.display = 'none';
    progressBar.style.width = '0%';
    selectedFileDisplay.style.display = 'none';
    selectedFileDisplay.textContent = '';
  }

 // Reset Upload
 function resetUpload() { 
    fileInput.value = ''; 
    selectedFile = null; 
    uploadBtn.disabled = true; 
    statusText.textContent = '';
    spinner.classList.add('hidden');
    progressBar.style.width = '0%';
  }

  // Drag & Drop File selection
 dropZone.onclick = () => fileInput.click();
 
 // Drag and Drop Handling
["dragenter", "dragover"].forEach(event => {
  dropZone.addEventListener(event, e => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach(event => {
  dropZone.addEventListener(event, e => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
  });
});

dropZone.addEventListener("drop", e => {
  const droppedFile = e.dataTransfer.files[0];
  if (droppedFile) {
    typeMessage(upload_MSG.ready(selectedFile));
    fileInput.files = e.dataTransfer.files;
    fileInput.dispatchEvent(new Event("change"));
  }
});

  // Upload Modal Functionality
 startUpload.addEventListener('click', () => {
   if (!selectedFile) return;
   statusText.textContent = '';

   // Show loader & progress
   loader.style.display = 'block';
   statusText.textContent = upload_MSG.reading;
   progressContainer.style.display = 'block';

   const reader = new FileReader();

   reader.onprogress = (e) => {
     if (e.lengthComputable) {
       const pct = Math.round((e.loaded / e.total) * 100);
       progressBar.style.width = `${pct}%`;
       statusText.textContent = `Reading (${pct}%)`;
     }
   };

  reader.onload = async () => {
     statusText.textContent = upload_MSG.saving;
     const dataUrl = reader.result;

   const newDoc = {
      id: Date.now(),
      name: selectedFile.name,
      type: selectedFile.type,
      data: dataUrl,
      size: selectedFile.size,
      isEncrypted: true,
      favorite: false,
      deleted: false,
      uploadedAt: new Date().toISOString(),
    };

   try {
     await addDocWithSync(newDoc);
     // Simulate progress from current % to 100%
     let pct = parseInt(progressBar.style.width) || 0;
     const finishInterval = setInterval(() => {
       pct += 5;
       if (pct > 100) pct = 100;
       progressBar.style.width = `${pct}%`;
       statusText.textContent = `Saving (${pct}%)`;

       if (pct >= 100) {
         clearInterval(finishInterval);
         loader.style.display = 'none';
         statusText.textContent = upload_MSG.done;

         setTimeout(() => {
           closeUploadModal();
           logActivity(ACTIVITY_TYPES.UPLOAD, newDoc.name, `${(newDoc.size / 1024).toFixed(2)} KB`);
           showNotification('success', `${newDoc.name} uploaded securely!`);
           loadDocs();
           generateUploadChartData();
         }, 1000);
       }
     }, 500);
   } catch (err) {
     loader.style.display = 'none';
     showNotification('error', 'Error uploading document.');
     statusText.textContent = upload_MSG.error;
   }
  };

  reader.onerror = () => {
    loader.style.display = 'none';
    showNotification('error', 'Failed to read the file.');
    statusText.textContent = upload_MSG.error;
  };

  reader.readAsDataURL(selectedFile);
});
  
 
  // Upload functionality
 uploadBtn.addEventListener('click', async () => {
    statusText.textContent = '';
    if (!selectedFile) return;
     
    spinner.classList.remove('hidden'); //show spinner
    typeMessage(upload_MSG.reading);
     
    const reader = new FileReader();
      
    reader.onload = async () => {
      spinner.classList.remove('hidden'); 
      typeMessage(upload_MSG.saving);
      const dataUrl = reader.result;
        
    const newDoc = {
        id: Date.now(), 
        name: selectedFile.name, 
        type: selectedFile.type, 
        data: dataUrl, 
        size: selectedFile.size,
        isEncrypted: true,
        favorite: false,
        deleted: false,
        uploadedAt: new Date().toISOString()
      };
                
    try {
      await addDocWithSync(newDoc);
      resetUpload();
      loadDocs();
      generateUploadChartData();
      setTimeout(() => spinner.classList.add('hidden'), 1500);
      closeUploadModal();
      typeMessage(upload_MSG.done);
      logActivity(ACTIVITY_TYPES.UPLOAD, newDoc.name, `${(newDoc.size / 1024).toFixed(2)} KB`);
      showNotification('success', `${newDoc.name} uploaded securely!`);
    } catch (err) {
      showNotification('error', 'Error uploading document.');
      typeMessage(upload_MSG.error);
      spinner.classList.add('hidden');
    }
    };
     
    reader.onerror = () => {
      showNotification('error', 'File read failed.');
      typeMessage(upload_MSG.error);
      spinner.classList.add('hidden');
  };
     
    reader.readAsDataURL(selectedFile);
 });


// Render UploadChart
let uploadChart;

function renderUploadChart(labels, data, mode) {
  const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  const ctx = document.getElementById('uploadHistoryChart').getContext('2d');
  if (uploadChart) uploadChart.destroy();

  uploadChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: `Uploads (${mode})`,
        data,
        backgroundColor: '#36a2eb'
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: {
           title: { 
             display: true,
             text: mode.charAt(0).toUpperCase() + mode.slice(1),
             color: '#27ae60',
           font: {
             size: 16,
             weight: 'bold',
             family: 'Times New Roman',
            }
           },
           ticks: {
              color: isDarkMode ? '#ecf0f1' : '#212529',
             font: {
                size: 12,
                family: 'Segoe UI'
             }
           }
          },
        y: {
           beginAtZero: true,
           title: { 
             display: true,
             text: 'Uploads', 
             color: '#27ae60',
            font: {
              size: 16,
              weight: 'bold',
              family: 'Times New Roman',
           }
          },
          ticks: {
             color: '#212529',
             font: {
               size: 12,
               family: 'Segoe UI'
             }
           }
         }
       }
     }
   });
 }

document.getElementById('dateFilter').addEventListener('change', () => {
  generateUploadChartData();
});

function groupByPeriod(date, mode) {
  const d = new Date(date);
  if (mode === 'day') return d.toISOString().split('T')[0];
  
  if (mode === 'week') {
    const weekStart = new Date(d.setDate(d.getDate() - d.getDay()));
    return `Week of ${weekStart.toISOString().split('T')[0]}`;
  }
  
  if (mode === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return '';
}

 // Generate
/* REMOVED: duplicate sync version of generateUploadChartData() — superseded by
   the async version below that uses openDB() correctly */

async function generateUploadChartData() {
  const mode = document.getElementById('dateFilter').value;
  const db = await openDB();
  const transaction = db.transaction([STORE_NAME], "readonly");
  const store = transaction.objectStore(STORE_NAME);
  const request = store.getAll();

  request.onsuccess = function () {
    const docs = request.result;

    const timeGroups = {};
    const docTypeGroups = {};
    let firstUpload = null;
    let encryptedCount = 0;

    docs.forEach(doc => {
      if (doc.uploadedAt) {
        const key = groupByPeriod(doc.uploadedAt, mode);
        timeGroups[key] = (timeGroups[key] || 0) + 1;

        const dateObj = new Date(doc.uploadedAt);
        if (!firstUpload || dateObj < new Date(firstUpload)) {
          firstUpload = doc.uploadedAt;
        }
      }

      const typeKey = doc.type?.split('/')[1] || 'unknown';
      
      docTypeGroups[typeKey] = (docTypeGroups[typeKey] || 0) + 1;
      
      if (doc.isEncrypted) encryptedCount++;
    });  
    
   // CHARTS
   const timeLabels = Object.keys(timeGroups).sort();
   const timeData = timeLabels.map(k => timeGroups[k]);

   const docLabels = Object.keys(docTypeGroups);
   const docData = docLabels.map(k => docTypeGroups[k]);

   renderUploadChart(timeLabels, timeData, mode);
   renderDocTypeChart(docLabels, docData);

   // STATS
   const totalUploads = docs.length;
   const mostType = docLabels.reduce((a, b) => docTypeGroups[a] > docTypeGroups[b] ? a : b, '-');
   const peakPeriod = timeLabels.reduce((a, b) => timeGroups[a] > timeGroups[b] ? a : b, '-');

    updateStatsUI({
      totalUploads,
      mostType,
      peakPeriod,
      firstUpload: firstUpload ? new Date(firstUpload).toDateString() : '-',
      encryptedCount
    });
  };
}

// Update Stats
function updateStatsUI(stats) {
  document.getElementById('totalUploads').textContent = stats.totalUploads;
  document.getElementById('mostType').textContent = stats.mostType.toUpperCase();
  document.getElementById('peakPeriod').textContent = stats.peakPeriod;
  document.getElementById('firstUpload').textContent = stats.firstUpload;
  document.getElementById('encryptedCount').textContent = stats.encryptedCount;
}

let docTypeChart;

// Render Doctype Chart
function renderDocTypeChart(labels, data) {
  const ctx = document.getElementById('docTypeChart').getContext('2d');
  if (docTypeChart) docTypeChart.destroy();

  docTypeChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        label: 'Document Types',
        data,
        backgroundColor: [
          '#36a2eb', '#ff6384', '#ffcd56', '#4bc0c0', '#9966ff', '#ff9f40', '#95a5a6'
        ]
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

  // Notification System
 function showNotification(type, message) {  
    const iconMap = {
       success: '<i class="fas fa-check-circle"></i>',
       error: '<i class="fas fa-times-circle"></i>',
       info: '<i class="fas fa-info-circle"></i>',
       warning: '<i class="fas fa-exclamation-triangle"></i>'
     };
     
    const soundMap = {
       success: 'sounds/success.mp3',
       error: 'sounds/error-bleep.mp3',
       info: 'sounds/info-bleep.mp3',
       warning: 'sounds/warning.mp3'
    };

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `${iconMap[type]} <span>${message}</span>`;
    document.body.appendChild(notification);
    
    // Play sound
    const audio = new Audio(soundMap[type]);
    audio.volume = 0.5; // Set volume level (0.0 to 1.0)

    setTimeout(() => {
      notification.remove();
    }, 3000);
 }

// Sanitize File name function
function sanitizeName(name) {
  if (!name || typeof name !== "string") {
    return "Unnamed File";
  }

  const div = document.createElement("div");

  // Remove invalid characters
  const cleanName = name.replace(/[<>:"'\/\\|?*]+/g, "").trim();

  // Escape any HTML/Script content
  div.textContent = cleanName;

  // Limit name length
  let finalName = div.innerHTML;
  if (finalName.length > 40) {
    finalName = finalName.substring(0, 25) + "...";
  }

  return finalName;
}
 
 // Highlight function
function highlightMatch(text, query) {
  if (!query) return sanitizeName(text); // No highlight if no search
  const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // escape regex chars
  const regex = new RegExp(`(${safeQuery})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
}
      
 // Appropriate icon for a document types
 function getFileIcon(fileName) {
   const exten = fileName.split('.').pop().toLowerCase();
     
   const iconMap = {
      pdf  : "fa-file-pdf text-red",
      doc  : "fa-file-word text-blue",
      docx : "fa-file-word text-blue",
      xls  : "fa-file-excel text-green",
      xlsx : "fa-file-excel text-green",
      ppt  : "fa-file-powerpoint text-orange",
      pptx : "fa-file-powerpoint text-orange",
      png  : "fa-file-image text-purple",
      jpg  : "fa-file-image text-purple",
      jpeg : "fa-file-image text-purple",
      mp4  : "fa-file-video text-cyan",
      mov  : "fa-file-video text-cyan",
      zip  : "fa-file-zipper text-yellow",
      txt  : "fa-file-lines text-gray",
      csv  : "fa-file-csv text-lime",
      html : "fa-file-code text-indigo",
      css  : "fa-file-code text-indigo",
      js   : "fa-file-code text-indigo",
      py   : "fa-file-code text-indigo",
      cpp  : "fa-file-code text-indigo",
      default : "fa-file text-muted"
    };
     
   return iconMap[exten] || iconMap["default"];
 }
 
 sortSelect.addEventListener('change', loadDocs);
 searchInput.oninput = debounce(loadDocs, 300);

function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
    
 // Load Documents 
async function loadDocs() {
   const sortVal = sortSelect.value;
   const query = searchInput.value.toLowerCase().trim();
   const keywords = query.split(/\s+/).filter(k => k.length > 0);
    
  try { 
    const db = await openDB();
    const tx = db.transaction([STORE_NAME], "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      let docs = request.result || [];
      
      // No documents at all
    if (docs.length === 0) {
       docsGrid.innerHTML = '<p><i class="fas fa-folder-open"></i> No documents uploaded yet.</p>';
       document.getElementById('total-docs').textContent = 0;
       document.getElementById('encrypted').textContent = 0;
       document.getElementById('total-storage').textContent = 0;
       updateStorage("0", MAX_STORAGE);
       return;
    }
   
      // Filter by Search
     const filteredDocs = docs.filter(d =>  d.name.toLowerCase().includes(query) || d.type.toLowerCase().includes(query)
      );
 
     if (filteredDocs.length === 0) {
        docsGrid.innerHTML = '<p><i class="fas fa-search"></i> No matching documents found.</p>';
        return;
     } 
    
    // Sort filtering
   filteredDocs.sort((a, b) => {
     if (sortVal === 'date_desc') return b.id - a.id;
     if (sortVal === 'date_asc') return a.id - b.id;
     if (sortVal === 'name_asc') return a.name.localeCompare(b.name);
     if (sortVal === 'name_desc') return b.name.localeCompare(a.name);
   });
      
   // Update Dashboard Stats
   document.getElementById('total-docs').textContent = docs.length;
   document.getElementById('encrypted').textContent = docs.filter(d => d.isEncrypted).length;
                
   const totalBytes = docs.reduce((acc, doc) => acc + (doc.size || 0), 0);
   const totalMB = totalBytes / (1024 * 1024);
   document.getElementById('total-storage').textContent = `${totalMB.toFixed(2)} MB`; 
  
   // Initialize storage  
  updateStorage(`${totalMB.toFixed(2)}`, MAX_STORAGE);

   // Render documents
  docsGrid.innerHTML = '';
  filteredDocs.forEach(doc => {
     const highlightedName = highlightMatch(sanitizeName(doc.name), query);
     const highlightedType = highlightMatch(doc.type, query);
     const highlightedDate = highlightMatch(doc.uploadedAt, query);
    
   const iconClass = getFileIcon(doc.name);
   const card = document.createElement('div'); 
   card.className = 'card';
   card.dataset.docId = doc.id;
      
      // Encrypted icon
   if (doc.isEncrypted) {
      const lock = document.createElement('i'); 
      lock.className = 'fas fa-lock encrypted-icon';
      card.append(lock);
    }
      
   const info = document.createElement('div'); 
   info.className = 'doc-info';
   
   info.innerHTML = `
      <strong><i class="fas ${iconClass}"></i>${highlightedName}</strong>
      <span><strong>Uploaded:</strong>${new Date(doc.uploadedAt).toLocaleString()}</span><br>
      <em class="doc-size">○ ${formatFileSize(doc.size)}</em>
     `;
     
    const securityInfo = document.createElement('div'); 
    securityInfo.className = 'security-info';
      
     // Actions buttons
    const actions = document.createElement('div'); 
    actions.className = 'actions';
    
     // Rename
    const renameBtn = document.createElement('button');
    renameBtn.title = 'Rename';
    renameBtn.className = 'action-btn-sm';
    renameBtn.innerHTML = '<i class="fas fa-edit"></i>';
    renameBtn.onclick = () => renameDoc(doc.id);

     // Favorite button
    const favBtn = document.createElement('button');
    favBtn.className = `action-btn-sm favorite-btn ${doc.favorite ? 'favorited' : ''}`;
    favBtn.title = doc.favorite ? 'Unfavorite' : 'Favorite';
    favBtn.innerHTML  = '<i class="fas fa-star"></i>';
    favBtn.onclick   = () => toggleFavorite(doc.id);
    
     // Preview
    const previewBtn = document.createElement('button'); 
    previewBtn.title = 'Preview'; 
    previewBtn.className = 'action-btn-sm';
    previewBtn.innerHTML = '<i class="fas fa-eye"></i>'; 
    previewBtn.onclick = () => openModal(doc);
    
     // Download
    const dlBtn = document.createElement('button');
    dlBtn.title = 'Download'; 
    dlBtn.className = 'action-btn-sm';
    dlBtn.innerHTML = '<i class="fas fa-download"></i>';
    dlBtn.onclick = () => downloadDoc(doc);
    
     // Share
    const shBtn = document.createElement('button'); 
    shBtn.title = 'Share'; 
    shBtn.className = 'action-btn-sm';
    shBtn.innerHTML = '<i class="fas fa-paper-plane"></i>'; 
    shBtn.onclick = () => showShareModal(doc.id);
       
     // Delete
    const delBtn = document.createElement('button'); 
    delBtn.title = 'Delete'; 
    delBtn.className = 'action-btn-sm';
    delBtn.innerHTML = '<i class="fas fa-trash"></i>'; 
    delBtn.onclick = () => deleteDoc(doc.id);
        
    actions.append(renameBtn, favBtn, previewBtn, dlBtn, shBtn, delBtn);
    card.append(info, actions);
    docsGrid.append(card);
   });
  };
  
  request.onerror = () => {
     showNotification('error','Failed to load documents.');
     console.error('Error loading documents', request.error);
  };
  
} catch (error) {
     showNotification('error','Failed to load documents.');
     console.error('Error loading documents', error);
  }
}

 // Update storage progress 
function updateStorage(current, total) {
  const progress = (current / total) * 100;
  document.getElementById('storage-progress').style.width = `${progress}%`;
  document.getElementById('total-storage').textContent =  `${current} MB`;
  document.getElementById('percent').textContent = `${Math.round(progress)}%`;
  document.getElementById('storage').textContent = `${total} MB used`
}
      
 // Rename Doc Function
let currentRenameDocId = null;
let originalName = "";

function renameDoc(docId) {
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const getReq = store.get(docId);

  getReq.onsuccess = () => {
    const doc = getReq.result;
    if (!doc) {
      showNotification("error", "Document not found!");
      return;
    }

    currentRenameDocId = docId;
    originalName = doc.name;

    const input = document.getElementById("renameInput");
    input.value = doc.name;
    document.getElementById("renameModal").classList.remove("hidden");
  
  //Focus the input field
  setTimeout(() => {
      input.focus();
      input.select();
    }, 100); // small delay ensures modal is visible first

  // Listen for Enter key
  input.onkeydown = (e) => {
     if (e.key === "Enter") {
     confirmRename();
     }
   };
   
  // Listen for Escape key
  input.onkeydown = (e) => {
     if (e.key === "Esc") {
     closeRenameModal();
     }
    };
  };
}

// Close Rename Modal
function closeRenameModal() { 
document.getElementById("renameModal").classList.add("hidden");
  currentRenameDocId = null;
  originalName = "";
  
  document.getElementById("renameInput").onkeydown = null;
}

function confirmRename() {
  const newName = document.getElementById("renameInput").value.trim();
  if (!newName) {
    showNotification('error', 'Name cannot be empty.');
    return;
  }

  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const allDocsReq = store.getAll();

  allDocsReq.onsuccess = () => {
    const allDocs = allDocsReq.result;
    const nameConflict = allDocs.some(
      (doc) => doc.name === newName && doc.id !== currentRenameDocId
    );

    if (nameConflict) {
      showNotification("error", "Another document with this name already exists. Try another name.");
      return;
    }

    const getReq = store.get(currentRenameDocId);
    getReq.onsuccess = () => {
      const doc = getReq.result;
      doc.name = newName;
      const updateReq = store.put(doc);

      updateReq.onsuccess = () => {
         loadDocs();
         loadFavorites();
         closeRenameModal();
         showNotification("success", "Document renamed.");
         logActivity(ACTIVITY_TYPES.RENAME || "✏️ Rename", newName, `Renamed from "${originalName}"`);
      };

      updateReq.onerror = () => {
        showNotification("error", "Failed to rename document.");
      };
    };
  };

  allDocsReq.onerror = () => {
    showNotification("error", "Failed to check for name conflicts.");
  };
}
   
 // Download function 
function downloadDoc(doc) {
  try {
    if (!doc) {
      throw new Error("Document is missing.");
    }
    
    if (!doc.data) {
      throw new Error(`No data found for document: ${doc.name || "Unnamed file"}`);
    }

    const blob = new Blob([doc.data], { type: doc.type || "application/octet-stream" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = doc.name || "download";

    // Simulate click safely
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);

    logActivity(ACTIVITY_TYPES.DOWNLOAD || "⬇️ Download", doc.name || "Unnamed file");
    showNotification("info", `Download started: ${doc.name || "Unnamed file"}`);
  } catch (err) {
    console.error("Download failed:", err);
    logActivity("ERROR", `Download failed: ${err.message}`);
    showNotification("error", `Download failed: ${err.message}`);
  }
}

 // Toggle favorite status
function toggleFavorite(id) {
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  const getRequest = store.get(id);

  getRequest.onsuccess = () => {
    const doc = getRequest.result;
    if (!doc) {
      showNotification('error', 'Document not found.');
      return;
    }
    
    doc.favorite = !doc.favorite;
    const updateRequest = store.put(doc);

    updateRequest.onsuccess = () => {
      loadDocs();
      loadFavorites();
      showNotification('info', doc.favorite ? 'Added to favorites.' : 'Removed from favorites. You can still find it in documents.');
    };
    
   updateRequest.onerror = () =>
      showNotification('error', 'Failed to update favorite status.');
  };
}
  
favoritesSearch.oninput = debounce(loadFavorites, 300);

 // Render favoritesGrid
async function loadFavorites() {
  const favSearch = document.getElementById('favoritesSearch');
  const query = favSearch.value.toLowerCase();
  favoritesGrid.innerHTML = '';
 
 try {
   const db = await openDB();
   const transaction = db.transaction([STORE_NAME], 'readonly');
   const store = transaction.objectStore(STORE_NAME);
   const request = store.getAll();

  request.onsuccess = () => {
    const favorites = request.result.filter(d => d.favorite && !d.deleted);
    
    // No favorites at all
    if (favorites.length === 0) {
        favoritesGrid.innerHTML = '<p><i class="fas fa-star"></i> No favorites yet.</p>';
        return;
    }
    
    // Search filtering
   const filteredDocs = favorites.filter(doc => doc.name.toLowerCase().includes(query) || doc.type.toLowerCase().includes(query)
    );

   if (filteredDocs.length === 0) {
      favoritesGrid.innerHTML = '<p><i class="fas fa-search"></i> No matching documents found.</p>';
      return;
   }
  
   // Render filtered favorites
  filteredDocs.forEach(doc => {
    const highlightedName = highlightMatch(sanitizeName(doc.name), query);
    const highlightedType = highlightMatch(doc.type, query);
    const iconClass = getFileIcon(doc.name);
    
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.docId = doc.id;
    
      // Encrypted icon
    if (doc.isEncrypted) {
       const lock = document.createElement('i');
       lock.className = 'fas fa-lock encrypted-icon';
       card.append(lock);
    }
      
    const info = document.createElement('div');
    info.className   = 'doc-info';
    
    info.innerHTML = `
      <strong><i class="fas ${iconClass}"></i> ${highlightedName}</strong>
      <span><strong>Uploaded:</strong>${new Date(doc.uploadedAt).toLocaleString()}</span><br>
      <em> ○ ${formatFileSize(doc.size)}</em>
    `;

    const actions = document.createElement('div');
    actions.className    =  'actions';
 
    // Rename
    const renameBtn = document.createElement('button');
    renameBtn.title    =   'Rename';
    renameBtn.className = 'action-btn-sm';
    renameBtn.innerHTML =  '<i class="fas fa-edit"></i>';
    renameBtn.onclick  = () => renameDoc(doc.id);
    
    // Favorite toggle
    const favBtn = document.createElement('button');
    favBtn.className = `action-btn-sm favorite-btn ${doc.favorite ? 'favorited' : ''}`;
    favBtn.title=doc.favorite? 'Unfavorite' : 'Favorite';
    favBtn.innerHTML = '<i class="fas fa-star"></i>';
    favBtn.onclick  = () => toggleFavorite(doc.id);

    // Preview
    const previewBtn = document.createElement('button');
    previewBtn.title     = 'Preview';
    previewBtn.className = 'action-btn-sm';
    previewBtn.innerHTML = '<i class="fas fa-eye"></i>';
    previewBtn.onclick   = () => openModal(doc);

    // Download
    const dlBtn = document.createElement('button');
    dlBtn.title   =  'Download';
    dlBtn.className = 'action-btn-sm';
    dlBtn.innerHTML = '<i class="fas fa-download"></i>';
    dlBtn.onclick   = () => downloadDoc(doc);

    // Share
    const shBtn = document.createElement('button');
    shBtn.title      = 'Share';
    shBtn.className = 'action-btn-sm';
    shBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
    shBtn.onclick    = () => showShareModal(doc.id);

    // Delete
    const delBtn = document.createElement('button');
    delBtn.title       = 'Delete';
    delBtn.className = 'action-btn-sm';
    delBtn.innerHTML = '<i class="fas fa-trash"></i>';
    delBtn.onclick       = () => deleteDoc(doc.id);

     actions.append(renameBtn, favBtn, previewBtn, dlBtn, shBtn, delBtn);
     card.append(info, actions);
     favoritesGrid.append(card);
   });
  };
 } catch (error) {
     showNotification('error','Failed to load favorited files.');
     console.error('An error occurred', error);
 }
}


 // Load Trashed Docs 
async function loadTrash() {
  try {
    const db = await openDB();
    const transaction = db.transaction(['trash'], 'readonly');
    const store = transaction.objectStore('trash');
    const request = store.getAll();

  request.onsuccess = () => {
    const trash = request.result;
    trashGrid.innerHTML = trash.length ? '' : '<p>Trash is empty.</p>';
      
   trash.forEach(doc => {
     const iconClass = getFileIcon(doc.name);
     const card = document.createElement('div'); 
     card.className = 'card trash-card';
     
     const checkbox = document.createElement('input');
     checkbox.type = 'checkbox';
     checkbox.className = 'trash-item-checkbox';
     checkbox.setAttribute('data-id', doc.id);
     
     const info = document.createElement('div'); 
     info.className = 'doc-info';
       
     info.innerHTML = `
       <strong><i class="fas ${iconClass}"></i> ${sanitizeName(doc.name)}</strong>
       <span><strong>Deleted:</strong>${doc.deletedAt ? new Date(doc.deletedAt || Date.now()).toLocaleString() : 'Unknown'}</span><br>
       <em>○ ${formatFileSize(doc.size)}</em>
      `;
        
     const actions = document.createElement('div');
     actions.className =  'actions';

     // Restore
     const restoreBtn = document.createElement('button'); 
     restoreBtn.title  =   'Restore'; 
     restoreBtn.className = 'action-btn-sm';
     restoreBtn.innerHTML = '<i class="fas fa-undo"></i>'; 
     restoreBtn.onclick = () => restoreDoc(doc.id);
  
     // Purge permanently
     const purgeBtn  = document.createElement('button');
     purgeBtn.title  = 'Delete Permanently'; 
     purgeBtn.className = 'action-btn-sm';
     purgeBtn.innerHTML = '<i class="fas fa-fire"></i>'; 
     purgeBtn.onclick  =  () => purgeDoc(doc.id);

     actions.append(restoreBtn, purgeBtn);
     card.append(checkbox, info, actions);
     trashGrid.append(card);
    });
  };
} catch (error) {
    console.error('An error occured', error);
    showNotification('error', 'Failed to load trashed files.');
  }
}
 
 
 // == Activity Feed ==
const ACTIVITY_TYPES = {
    UPLOAD : '📤 Upload',
    DELETE : '🗑️ Delete',
    UNDO_DELETE : '↩️ Undo-Delete',
    DOWNLOAD : '⬇️ Download',
    SHARE  : '📤 Share',
    RESTORE: '♻️ Restore',
    PERMANENT_DELETE : '🔥 Perma-Delete',
    RENAME: '🖍 Rename',
    PURGE_ALL : '🧹 Purge-All',
    AUTO_PURGE : '🔥 Auto-Purged'
 };
 
 // Maps activity display names to font awesome icons
const ACTIVITY_ICON_MAP = {
   'Upload'   :   'fa-upload',
   'Delete'   :   'fa-trash-alt',
   'Undo-Delete' :   'fa-undo',
   'Download'   :   'fa-download',
   'Share'     :   'fa-share-alt',
   'Restore'   :   'fa-undo',
   'Perma-Delete' :  'fa-fire',
   'Rename'   :   'fa-pen',
   'Purge-All'  : 'fa-broom',
   'Auto-Purged' : 'fa-fire'
 };
 
const ACTIVITY_COLOR_CLASS_MAP = {
   'Upload' : 'icon-upload',
   'Delete' : 'icon-delete',
   'Undo-Delete' : 'icon-undo-delete',
   'Download' : 'icon-download',
   'Share' : 'icon-share',
   'Restore' : 'icon-restore',
   'Perma-Delete' : 'icon-perma-delete',
   'Rename' : 'icon-rename',
   'Purge-All' : 'icon-purge-all',
   'Auto-Purged' : 'icon-auto-purged'
};
   
 function logActivity(type, docName, extra = '') {
   const activities = JSON.parse(localStorage.getItem('activities') || '[]');
  
  activities.unshift({ 
      timestamp: Date.now(), 
      type, docName, 
      extra, 
      user: 'currentUser' // to replace with actual user
   });
  
  if (activities.length > 20) activities.pop(); 
  
    localStorage.setItem('activities', JSON.stringify(activities));
    refreshActivityFeed();
 }

 // Load Activities
function refreshActivityFeed(feedArray) {
  let activities = feedArray || JSON.parse(localStorage.getItem('activities') || '[]');
  
  if (!Array.isArray(activities)) activities = [];
  if (!document.getElementById('activityFeed')) return;
  
  activities = activities.slice(0, 20); // keep only recent 20

  const feed = document.getElementById('activityFeed');
  feed.innerHTML = activities.map(activity => {
    const [emoji, ...displayParts] = activity.type.split(' ');
    const displayName = displayParts.join(' ');
    const tagClass = displayName.toLowerCase().replace(/\s+/g, '-');
    const iconClass = ACTIVITY_ICON_MAP[displayName] || 'fa-question-circle';
    const colorClass = ACTIVITY_COLOR_CLASS_MAP[displayName] || 'icon-unknown';
    return `
      <div class="activity-item">
        <div class="activity-icon">
          <i class="fas ${iconClass} ${colorClass}"></i>
        </div>
        <div class="activity-content">
         <strong class="activity-tag ${tagClass}">${displayName}</strong>
          <span>${sanitizeName(activity.docName)}</span>
          ${activity.extra ? `<em>${activity.extra}</em>` : ''}
          <time>${new Date(activity.timestamp).toLocaleString()}</time>
        </div>
      </div>`;
  }).join('');
}

let activityChart; // Global variable

 // Update Activity Summary 
function updateActivitySummary() {
  const summaryText = document.getElementById('activitySummaryText');
  const timeAgoText = document.getElementById('activityTime');
  const activities = JSON.parse(localStorage.getItem('activities') || '[]');

  if (!activities.length) {
    summaryText.textContent = 'No activity yet';
    timeAgoText.textContent = '';
    return;
  }
  
  if (activityChart) activityChart.destroy();
  
  const recentActivities = activities.slice(0, 2); // Get the latest 2 activities only

  // Count activity types
  const countMap = {};
  recentActivities.forEach(a => {
    const [emoji, ...parts] = a.type.split(' ');
    const typeName = parts.join(' ');
    countMap[typeName] = (countMap[typeName] || 0) + 1;
  });

  // Smart summary: "2 Uploads", "3 Deletes", etc.
  const summaryParts = Object.entries(countMap).map(([type, count]) => {
    const plural = count > 1 ? `${type}s` : type;
    return `${count} ${plural}`;
  });

  summaryText.textContent = summaryParts.join(', ');
  
  // Most recent activity
  const latest = recentActivities[0];
  const [emoji, ...parts] = latest.type.split(' ');
  const latestType = parts.join(' ');
  const timeAgo = timeSince(latest.timestamp);
  timeAgoText.textContent = '';
  
  // Pie chart data
  const ctx = document.getElementById('activityPieChart').getContext('2d');
  const labels = Object.keys(countMap);
  const data = Object.values(countMap);

  const backgroundColors = [
    '#4dabf7', '#dc3545', '#28a745', '#17a2b8', '#ffc107', '#fd7e14', '#6f42c1', '#e83e8c'
  ];

  // Destroy existing chart before creating new one
  if (activityChart) activityChart.destroy();

  activityChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: backgroundColors.slice(0, labels.length),
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

function timeSince(timestamp) {
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);

  const intervals = [
    { label: 'year', secs: 31536000 },
    { label: 'month', secs: 2592000 },
    { label: 'week', secs: 604800 },
    { label: 'day', secs: 86400 },
    { label: 'hour', secs: 3600 },
    { label: 'minute', secs: 60 },
    { label: 'second', secs: 1 }
  ];

  for (const { label, secs } of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) {
      return `${count} ${label}${count > 1 ? 's' : ''} ago`;
    }
  }
  return 'just now';
}

// Helper to get all selected trash IDs
function getSelectedTrashIds() {
  const checkboxes = document.querySelectorAll('.trash-item-checkbox:checked');
  return Array.from(checkboxes).map(cb => cb.getAttribute('data-id'));
}

// Restore selected files
async function restoreSelected() {
  const selectedIds = getSelectedTrashIds();
  if (selectedIds.length === 0) {
    showNotification('info', 'No files selected to restore.');
    return;
  }

  try {
    const db = await openDB();
    const tx = db.transaction(['trash', 'documents'], 'readwrite');
    const trashStore = tx.objectStore('trash');
    const docStore = tx.objectStore('documents');

    for (const id of selectedIds) {
      const doc = await trashStore.get(Number(id));
      if (doc) {
        await docStore.put(doc);
        await trashStore.delete(Number(id));
      }
    }

    await tx.done;
    showNotification('success', `${selectedIds.length} file(s) restored.`);
    loadTrash();
  } catch (err) {
    console.error('Restore error', err);
    showNotification('error', 'Failed to restore selected files.');
  }
}

// Permanently delete selected files
async function purgeSelected() {
  const selectedIds = getSelectedTrashIds();
  if (selectedIds.length === 0) {
    showNotification('info', 'No files selected to delete.');
    return;
  }

  try {
    const db = await openDB();
    const tx = db.transaction(['trash'], 'readwrite');
    const store = tx.objectStore('trash');

    for (const id of selectedIds) {
      await store.delete(Number(id));
    }

    await tx.done;
    showNotification('success', `${selectedIds.length} file(s) permanently deleted.`);
    loadTrash();
  } catch (err) {
    console.error('Purge error', err);
    showNotification('error', 'Failed to delete selected files.');
  }
}

 // Show Custom Modal Function  
function showConfirmationModal({ title, message, iconClass = 'fas fa-exclamation-triangle', onConfirm }) {
  const modal = document.getElementById('confirmationModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalMessage = document.getElementById('modalMessage');
  const modalIcon = document.getElementById('modalIcon');
  const spinner = document.getElementById('modalSpinner');
  const checkmark = document.getElementById('modalCheckmark');
  const confirmBtn = document.getElementById('modalConfirmBtn');
  const cancelBtn = document.getElementById('modalCancelBtn');

  // Check that all elements exist
  if (!modal || !modalTitle || !modalMessage || !modalIcon || !spinner || !checkmark || !confirmBtn || !cancelBtn) {
    console.error("⚠️ One or more modal elements are missing.");
    return;
  }

  // Set content
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  modalIcon.className = iconClass;

  // Show modal and reset UI
  modal.classList.remove('hidden');
  spinner.classList.add('hidden');
  checkmark.classList.add('hidden');
  confirmBtn.disabled = false;

  // Prevent double-event binding by replacing the confirm button
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

  // Confirm handler
  newConfirmBtn.addEventListener('click', async () => {
    try {
      newConfirmBtn.disabled = true;
      spinner.classList.remove('hidden');

      if (typeof onConfirm === 'function') {
        await onConfirm(); // Call the async confirmation action
      }

      spinner.classList.add('hidden');
      checkmark.classList.remove('hidden');

      setTimeout(() => {
        modal.classList.add('hidden');
      }, 1000);
    } catch (err) {
      console.error("🚫 Error occurred:", err);
      showNotification('error', 'An error occurred: ' + (err.message || err));
      spinner.classList.add('hidden');
      newConfirmBtn.disabled = false;
    }
  });

  // Cancel button handler
  cancelBtn.onclick = () => {
    modal.classList.add('hidden');
  };
}
 
 // Clear all stored documents
async function clearAllDocs() {
   try {
      const db = await openDB();
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);

      const getAllReq = store.getAll();
      getAllReq.onsuccess = () => {
        const docs = getAllReq.result;
      
        if (!docs.length) {
          showNotification('info', 'No documents to clear.');
         return;
         }
      
     // Using showConfirmationModal for better UX (replaces browser confirm())
     // This call is async-wrapped — proceed is handled inside onConfirm
     // Note: for full modal flow, wrap caller in showConfirmationModal; 
     // kept as confirm() here to avoid refactoring the outer async block
     if (!confirm(`⚠️ All ${docs.length} file(s) will be moved to Trash. Are you sure?`)) return;
          
       const tx2 = db.transaction([STORE_NAME, 'trash'], 'readwrite');
       const docStore = tx2.objectStore(STORE_NAME);
       const trashStore = tx2.objectStore('trash');

       docs.forEach(doc => {
          doc.deletedAt = Date.now();
          trashStore.put(doc);
          docStore.delete(doc.id);
        });
          
       tx2.oncomplete = () => {
          loadDocs();
          loadTrash();
          loadFavorites();
          showNotification('info', `${docs.length} document(s) moved to trash.`);
       };      
    };
   getAllReq.onerror = () => {
     showNotification('error', 'Failed to fetch documents.');
   };   
 } catch (err) {
    console.error('Clear All Error:', err);
    showNotification('error', 'An error occurred while clearing documents.');
  }
}

// Soft Delete Document with Undo
let recentlyDeletedDocs = [];

async function deleteDoc(id) {
  const db = await openDB();
  const tx = db.transaction([STORE_NAME, 'trash'], 'readwrite');

  const mainStore = tx.objectStore(STORE_NAME);
  const trashStore = tx.objectStore('trash');

  const req = mainStore.get(id);
  req.onsuccess = () => {
    const doc = req.result;
    if (!doc) return;
    
   if (!confirm(`⚠️ Are you sure you want to move this file to trash?`)) return;
   
    doc.deletedAt = Date.now();
    recentlyDeletedDocs.push(doc); // Save for undo
    
    trashStore.put(doc);
    mainStore.delete(id);
    
    logActivity(ACTIVITY_TYPES.DELETE, doc.name, 'Moved to trash.');
    showNotification('info', `${doc.name} moved to trash!  <button class="btn-secondary" onclick="undoDelete()">Undo</button>`, true);
    loadDocs();
    loadFavorites();
    loadTrash();
  };
  
  req.onerror = () => {
     showNotification('error', 'Failed to delete document.');
  };
}

// Undo Delete
async function undoDelete() {
  if (!recentlyDeletedDocs.length) {
    showNotification('info', 'Nothing to undo.');
    return;
  }

  try {
    const db = await openDB();
    const tx = db.transaction([STORE_NAME, 'trash'], 'readwrite');
    const mainStore = tx.objectStore(STORE_NAME);
    const trashStore = tx.objectStore('trash');

    recentlyDeletedDocs.forEach(doc => {
      trashStore.delete(doc.id);
      delete doc.deletedAt;
      mainStore.put(doc);
    });

    tx.oncomplete = () => {
      const names = recentlyDeletedDocs.map(d => d.name).join(', ');
      showNotification('success', 'Deletion undone!');
      logActivity(ACTIVITY_TYPES.UNDO_DELETE || '↩️ Undo Delete', names, 'Restored successfully.');      
      loadDocs();
      loadTrash();
      loadFavorites();
      recentlyDeletedDocs = [];
    };
  } catch (err) {
     console.error("Undo delete error:", err);
     showNotification('error', 'Failed to undo deletion.');
  }
}

// Restore from Trash
async function restoreDoc(id) {
  const db = await openDB();
  const tx = db.transaction(['trash', STORE_NAME], 'readwrite');
  const trashStore = tx.objectStore('trash');
  const mainStore = tx.objectStore(STORE_NAME);
  
  const req = trashStore.get(id);
  req.onsuccess = () => {
     const doc = req.result;
      if (!doc) return;
      
     if (!confirm(`Confirm you are restoring ${doc.name} from trash. Are you sure?`)) return;  
     
      delete doc.deletedAt;
      mainStore.put(doc); // Put to documents
      trashStore.delete(id); // Remove from trash
      
      loadDocs();
      loadTrash();
      logActivity(ACTIVITY_TYPES.RESTORE, doc.name, 'Restored.');
      showNotification('success', `${doc.name} restored successfully!`);
     };
    req.onerror = () => {
      showNotification('error', 'Failed to restore the file.')
  };
}

// Purge Permanently
async function purgeDoc(id) {
  const db = await openDB();
  const tx = db.transaction(['trash'], 'readwrite');
  const trashStore = tx.objectStore('trash');
  const req = trashStore.get(id);
 
   req.onsuccess = () => {
     const doc = req.result;
     
     if (doc) {
     if (!confirm(`Are you sure you want to delete ${doc.name} permanently? This action cannot be undone!`)) return;  
  
     trashStore.delete(id);  
    
     logActivity(ACTIVITY_TYPES.PERMANENT_DELETE, doc.name, 'Deleted permanently.');  
     showNotification('info', 'Document deleted permanently!');  
     loadTrash();  
     }
   };
  req.onerror = () => {
    showNotification('error', 'Failed deleting document.');
   };
 }
 
 // Clear Trash
async function emptyTrash() {
 const db = await openDB();
 const tx = db.transaction(['trash'], 'readwrite');
 const store = tx.objectStore('trash');

  const getAllReq = store.getAllKeys();
  getAllReq.onsuccess = () => {
  const allTrash = getAllReq.result;

   if (!allTrash.length) {
      showNotification('info', 'Trash is already empty.');
      return;
    }

    if (!confirm(`⚠️ Are you sure you want to permanently delete ${allTrash.length} item(s) in the trash? This action cannot be undone.`)) return;

    allTrash.forEach(key => store.delete(key));  
  
    logActivity(ACTIVITY_TYPES.PERMANENT_DELETE, 'Clear Trash', `${allTrash.length} trashed file(s) cleared.`);  
    showNotification('success', 'Trash emptied successfully!');  
    loadTrash();
   };
   
   getAllReq.onerror = () => {
      showNotification('error', 'Failed to clear trashed files.');
  };
}
 
 // Restore all trashed docs
async function restoreAllTrash() {
  const db = await openDB();
  const tx = db.transaction(['documents', 'trash'], 'readwrite');
  const trashStore = tx.objectStore('trash');
  const docStore = tx.objectStore('documents');

  const getAllReq = trashStore.getAll();
  
  getAllReq.onsuccess = () => {
    const allTrash = getAllReq.result;

    if (!allTrash.length) {
      showNotification('info', 'No documents to restore.');
      return;
    }

    if (!confirm(`Are you sure you want to restore ALL ${allTrash.length} trashed document(s)? Proceed.`)) return;
    
    allTrash.forEach(doc => {
      delete doc.deletedAt;
      docStore.put(doc);
      trashStore.delete(doc.id);

      logActivity(ACTIVITY_TYPES.RESTORE, 'Restored', `All ${allTrash.length} trashed document(s) restored.`);
    });

    showNotification('success',`${allTrash.length} document(s) restored from trash.`);
    loadDocs();
    loadTrash();
  };
}

// Auto-purge old trash
async function autoPurgeTrash() {
  try {
    const db = await openDB();
    const tx = db.transaction(['trash'], 'readwrite');
    const store = tx.objectStore('trash');

    const req = store.getAll();

    req.onsuccess = () => {
      const now = Date.now();
      const trashedDocs = req.result;
      let purgedCount = 0;

      trashedDocs.forEach(doc => {
        if (doc.deletedAt && (now - doc.deletedAt > PURGE_DAYS * 24 * 60 * 60 * 1000)) {
          store.delete(doc.id);
          purgedCount++;
        }
      });

      if (purgedCount > 0) {
        logActivity(ACTIVITY_TYPES.AUTO_PURGE, 'Auto-purged', ` ${purgedCount} item(s) older than ${PURGE_DAYS} days auto-purged.`);
        showNotification('info', ` ${purgedCount} item(s) purged from trash.`);
      }

      loadTrash(); // Refresh trash view
    };

    req.onerror = () => {
      showNotification('error', 'Failed to auto-purge old trash.');
    };

  } catch (error) {
    console.error('Auto-purge failed:', error);
    showNotification('error', 'Unexpected error during auto-purge.');
  }
}

// Check if auto-purge should run
function shouldRunAutoPurge() {
  const lastRun = localStorage.getItem('lastAutoPurge');
  if (!lastRun) return true;

  const now = Date.now();
  return (now - parseInt(lastRun)) > (24 * 60 * 60 * 1000); // More than 24 hours
}

// Try to run auto-purge if conditions are met
function tryAutoPurgeTrash() {
  if (shouldRunAutoPurge()) {
    autoPurgeTrash().then(() => {
      localStorage.setItem('lastAutoPurge', Date.now().toString());
    });
  }
}

// Trigger on app start
document.addEventListener('DOMContentLoaded', () => {
  tryAutoPurgeTrash();
  updateActivitySummary();
});


// Track current document being shared
let currentDoc = null;

// Show share modal
async function showShareModal(docId) {
  document.getElementById("sharingModal").classList.remove("hidden");
  currentDoc = docId;
}

// Tab switching
const tabs = document.querySelectorAll(".tab");
const contents = {
  email: document.getElementById("emailTab"),
  linkedin: document.getElementById("linkedinTab"),
  link: document.getElementById("linkTab"),
};

tabs.forEach(tab => {
  tab.onclick = () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    Object.values(contents).forEach(c => c.classList.add("hidden"));
    contents[tab.dataset.tab].classList.remove("hidden");
  };
});

// Generate secure document link
function generateDocumentLink(docId) {
  const view = document.getElementById("viewPermission").checked;
  const download = document.getElementById("downloadPermission").checked;
  const expiry = document.getElementById("expiryDate").value;
  const expiryError = document.getElementById('expiryError');

  expiryError.textContent = "";

  if (expiry) {
    const expiryDate = new Date(expiry);
    const now = new Date();
    if (expiryDate <= now) {
      expiryError.textContent = "Expiry date must be in the future.";
      return null;
    }
  }

  return `https://edocsafe.com/share?view=${view}&download=${download}&expiry=${expiry || "none"}&id=${docId}`;
}

// Validate email format
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Send email
document.getElementById("sendEmailBtn").onclick = (e) => {
  const emailInput = document.getElementById("emailInput");
  const messageInput = document.getElementById("emailMessage");
  const email = emailInput.value.trim();
  const message = messageInput.value.trim();
  const emailError = document.getElementById("emailError");
  const messageError = document.getElementById("messageError");

  // Clear previous errors
  [emailInput, messageInput].forEach(input => input.classList.remove("input-error"));
  emailError.textContent = "";
  messageError.textContent = "";

  let valid = true;

  if (!email) {
    emailInput.classList.add("input-error");
    emailError.textContent = "Please enter recipient email address!";
    valid = false;
  } else if (!validateEmail(email)) {
    emailInput.classList.add("input-error");
    emailError.textContent = "Invalid email address";
    valid = false;
  }

  if (!message) {
    messageInput.classList.add("input-error");
    messageError.textContent = "Please include a short message";
    valid = false;
  }

  if (!valid) return;

  const docLink = generateDocumentLink(currentDoc);
  if (!docLink) return;

  const subject = encodeURIComponent("Shared Document from e-DocSafe");
  const body = encodeURIComponent(`${message}\n\nAccess the document securely:\n${docLink}`);

  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;

  setTimeout(() => resetAndCloseShareModal(), 500);

  logActivity(ACTIVITY_TYPES.SHARE, currentDoc, "Shared via Email", `To: ${email}`);
};

// Share via LinkedIn
document.getElementById("shareLinkedInBtn").onclick = () => {
  const docLink = generateDocumentLink(currentDoc);
  if (!docLink) return;

  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(docLink)}`;
  window.open(linkedInUrl, "_blank");

  logActivity(ACTIVITY_TYPES.SHARE, "Shared via LinkedIn");
};

// Generate shareable link
document.getElementById("generateLinkBtn").onclick = () => {
  const link = generateDocumentLink(currentDoc);
  if (!link) return;

  document.getElementById("generatedLink").value = link;
  copyLinkBtn.disabled = false;
  showNotification('success', 'Secure link generated.');
};

// Copy link to clipboard
document.getElementById("copyLinkBtn").onclick = (e) => {
  const linkInput = document.getElementById("generatedLink");
  
  if (!linkInput || !linkInput.value.trim()) {
     showNotification('info', 'Please generate a link first.');
     return;
   }
  
  linkInput.select();
  linkInput.setSelectionRange(0, 99999); // For mobile devices
  document.execCommand("copy");
  
  showNotification('success', 'Link copied to clipboard!');
  resetAndCloseShareModal();
  logActivity(ACTIVITY_TYPES.SHARE, "Link Generated & Copied");
};

// Close modal
document.getElementById("closeModalBtn").onclick = () => resetAndCloseShareModal();

// Calendar icon opens date picker
document.getElementById("calendarIcon").onclick = () => {
  const dateInput = document.getElementById("expiryDate");
  dateInput.showPicker?.(); // Chaining for browser support
  dateInput.focus();
};

// Set expiry input minimum to today
window.addEventListener("DOMContentLoaded", () => {
  const expiryInput = document.getElementById("expiryDate");
  const today = new Date().toISOString().split("T")[0];
  expiryInput.min = today;
});

// Reset and close modal
function resetAndCloseShareModal() {
  document.getElementById("emailInput").value = "";
  document.getElementById("emailMessage").value = "";
  document.getElementById("expiryDate").value = "";
  document.getElementById("generatedLink").value = "";
  document.getElementById("viewPermission").checked = true;
  document.getElementById("downloadPermission").checked = false;
  document.getElementById("emailError").textContent = "";
  document.getElementById("messageError").textContent = "";
  document.getElementById("expiryError").textContent = "";

  // Remove error styles
document.getElementById("emailInput").classList.remove("input-error");
  document.getElementById("emailMessage").classList.remove("input-error");

  // Reset tabs
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelector(".tab[data-tab='email']").classList.add("active");

  document.querySelectorAll(".modal-content").forEach(c => c.classList.add("hidden"));
  document.getElementById("emailTab").classList.remove("hidden");

 // Hide Modal
document.getElementById("sharingModal").classList.add("hidden");
  currentDoc = null;
}


// PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.6.347/pdf.worker.min.js';

function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64.split(',')[1]);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes.buffer;
}

 // Preview Document Logic
async function openModal(doc) {
  currentDoc = doc;
  
  const extension = doc.name.split('.').pop().toLowerCase();
  const fileType = extension === 'doc' ? 'docx' : extension;

  const previewModal = document.getElementById('previewModal');
  const previewContent = document.getElementById('previewContent');
  const loadingIndicator = document.getElementById('loadingIndicator');

  document.getElementById('previewTitle').textContent = sanitizeName(doc.name);
  document.getElementById('fileType').textContent = extension.toUpperCase();
  document.getElementById('fileSize').textContent = formatFileSize(doc.size);


document.getElementById('downloadBtn')?.addEventListener('click', () => {
  if (currentDoc) downloadDoc(currentDoc);
});

document.getElementById('shareBtn')?.addEventListener('click', () => {
  if (currentDoc) showShareModal(currentDoc);
});

document.getElementById('printBtn')?.addEventListener('click', () => {
   window.print();
});

  // Clear previous content
previewContent.querySelectorAll('img, .pdf-container, .docx-container, .excel-preview, pre, table, iframe, .no-preview').forEach(el => el.remove());

  // Show modal and spinner
  loadingIndicator.classList.add('visible');
  previewModal.style.display = 'flex';
  document.body.classList.add('modal-open');
  previewContent.classList.remove('show');
  
  await new Promise(resolve => setTimeout(resolve, 100)); // Allow DOM to paint

  try {
    if (extension === 'pdf') {
      const container = document.createElement('div');
      container.className = 'pdf-container';
      previewContent.appendChild(container);
      const pdf = await pdfjsLib.getDocument(doc.data).promise;
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        const context = canvas.getContext('2d');
        await page.render({ canvasContext: context, viewport }).promise;
        container.appendChild(canvas);
      }

    } else if (extension === 'docx') {
      const container = document.createElement('div');
      container.className = 'docx-container';
      previewContent.appendChild(container);
      const result = await mammoth.convertToHtml({ arrayBuffer: base64ToArrayBuffer(doc.data) });
      container.innerHTML = result.value;

    } else if (extension === 'xlsx') {
      const workbook = XLSX.read(base64ToArrayBuffer(doc.data), { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const html = XLSX.utils.sheet_to_html(sheet);
      const container = document.createElement('div');
      container.className = 'excel-preview';
      container.innerHTML = html;
      previewContent.appendChild(container);

    } else if (extension === 'csv') {
      const csvData = atob(doc.data.split(',')[1]);
      const rows = csvData.split('\n').map(row => row.split(','));
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
      previewContent.appendChild(container);

    } else if (extension === 'txt') {
      const pre = document.createElement('pre');
      pre.textContent = atob(doc.data.split(',')[1]);
      previewContent.appendChild(pre);

    } else if (extension === 'html') {
      const iframe = document.createElement('iframe');
      iframe.srcdoc = atob(doc.data.split(',')[1]);
      iframe.style.width = '100%';
      iframe.style.height = '500px';
      previewContent.appendChild(iframe);

    } else if (extension === 'md') {
      const markdown = atob(doc.data.split(',')[1]);
      const html = marked.parse(markdown);
      const container = document.createElement('div');
      container.innerHTML = html;
      previewContent.appendChild(container);

    } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) {
      const img = document.createElement('img');
      img.src = doc.data;
      previewContent.appendChild(img);

    } else {
      const msg = document.createElement('div');
      msg.className = 'no-preview';
      msg.textContent = `No preview available for .${extension.toUpperCase()} files.`;
      previewContent.appendChild(msg);
    }

  } catch (err) {
    console.error(err);
    previewContent.innerHTML = `<div class="no-preview">Error loading ${extension.toUpperCase()} preview.</div>`;
  }

  // Hide spinner and show content
  loadingIndicator.classList.remove('visible');
  previewContent.classList.add('show');
}

// Close PreviewModal logic
document.getElementById('closeModal').onclick = () => {
  document.getElementById('previewModal').style.display = 'none';
};

// Close Preview modal on outside click
document.getElementById('previewModal').onclick = e => {
  if (e.target.id === 'previewModal') {
    document.getElementById('previewModal').style.display = 'none';
  }
};

// Show Message while loading
function showLoading(message = "Loading preview") {
  const loadingIndicator = document.getElementById('loadingIndicator');
  const loadingText = document.getElementById('loadingText');

  loadingText.textContent = message;
  loadingIndicator.classList.add('visible');
}

function hideLoading() {
  document.getElementById('loadingIndicator').classList.remove('visible');
}

// Function to format file sizes
function formatFileSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Byte';
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Save and apply settings
function saveSettings() {
  const theme = document.getElementById('themeMode').value;
  const fontSize = document.getElementById('fontSize').value;

  localStorage.setItem('eDocSafe_theme', theme);
  localStorage.setItem('eDocSafe_fontSize', fontSize);

  applyTheme(theme);
  applyFontSize(fontSize);

  const msg = document.getElementById('settingsSavedMsg');
  msg.classList.remove('hidden');
  setTimeout(() => msg.classList.add('hidden'), 3000);
}

// Toggle dark mode manually via button
function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark-mode');
  const newTheme = isDark ? 'dark' : 'light';

  localStorage.setItem('eDocSafe_theme', newTheme);
  document.getElementById('themeMode').value = newTheme;

  updateToggleIcon();
}

// Apply theme based on setting
function applyTheme(theme) {
  document.body.classList.remove('dark-mode');

  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
  } else if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) document.body.classList.add('dark-mode');
  }

  updateToggleIcon();
}

// Update the icon on the toggle-mode button
function updateToggleIcon() {
  const modeButton = document.querySelector('.toggle-mode');
  if (!modeButton) return;

  const isDark = document.body.classList.contains('dark-mode');
  modeButton.innerHTML = isDark
    ? '<i class="fas fa-sun"></i>' // Light icon
    : '<i class="fas fa-moon"></i>'; // Dark icon
}

// Font size setting
function applyFontSize(size) {
  const root = document.documentElement;
  const sizeMap = {
    small: '14px',
    medium: '16px',
    large: '18px'
  };
  root.style.setProperty('--base-font-size', sizeMap[size] || '16px');
}

// Reset to default
function resetSettings() {
  localStorage.removeItem('eDocSafe_theme');
  localStorage.removeItem('eDocSafe_fontSize');

  loadSettings(); // Re-apply defaults
  showNotification('info', 'Settings reset to default.');
}

// Re-load settings from storage
function loadSettings() {
  const savedTheme = localStorage.getItem('eDocSafe_theme') || 'system';
  const savedFontSize = localStorage.getItem('eDocSafe_fontSize') || 'medium';

  document.getElementById('themeMode').value = savedTheme;
  document.getElementById('fontSize').value = savedFontSize;

  applyTheme(savedTheme);
  applyFontSize(savedFontSize);
}

 // Toggle Mode Settings Function
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('eDocSafe_theme') || 'system';
  const savedFontSize = localStorage.getItem('eDocSafe_fontSize') || 'medium';

  document.getElementById('themeMode').value = savedTheme;
  document.getElementById('fontSize').value = savedFontSize;

  applyTheme(savedTheme);
  applyFontSize(savedFontSize);
  updateChartColors();
});

document.getElementById('connectBtn').addEventListener('click', () => { 
    showNotification('info', 'Feature coming soon.');
});

 // e-DocSafe Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
     document.querySelectorAll('.modal').forEach(modal => modal.style.display = 'none');
     previewModal.style.display = 'none';
     const _upModal = document.getElementById('uploadModal'); if (_upModal) _upModal.style.display = 'none';
     const _sm = document.getElementById('sharingModal'); if (_sm) _sm.classList.add('hidden');
     closeRenameModal();
     closeUploadModal();
   }
  
  if (e.ctrlKey && e.key === 'u') {
     e.preventDefault();
     showUploadModal();
   }
   
  if (e.ctrlKey && e.key === 'f') {
      e.preventDefault();
      searchInput.focus();
  }
});

document.getElementById('favoritesSearch').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
       loadFavorites();
   }
});

// DocsGrid toggle view
function setView(view) {
  const grid = document.getElementById("docsGrid");
  const btnList = document.getElementById("btnList");
  const btnGrid = document.getElementById("btnGrid");

  btnList.classList.remove("active");
  btnGrid.classList.remove("active");

  if (view === "list") {
    grid.classList.remove("grid-view");
    grid.classList.add("list-view");
    btnList.classList.add("active");
  } else {
    grid.classList.remove("list-view");
    grid.classList.add("grid-view");
    btnGrid.classList.add("active");
  }

  localStorage.setItem("docsView", view);
}

// FavoritesGrid toggle view
function applyViewMode(mode) {
  favoritesGrid.classList.remove("grid-view", "list-view");
  favoritesGrid.classList.add(`${mode}-view`);
  localStorage.setItem("docViewMode", mode);
  gridViewBtn.classList.toggle("active", mode === "grid");
  listViewBtn.classList.toggle("active", mode === "list");
}

// Button Events
 gridViewBtn.onclick = () => applyViewMode('grid');
 listViewBtn.onclick = () => applyViewMode('list'); 

// Initialize with saved view
document.addEventListener('DOMContentLoaded', () => {
  let saved = localStorage.getItem('docsView') || 'list';
  if (!saved) {
      saved = window.innerWidth <= 768 ? "list" : "grid";
   }
  setView(saved);
  
  const savedView = localStorage.getItem('docViewMode') || 'list';
  applyViewMode(savedView);
});

// Support ticket submission  
const formElements = {
    confirm_title: "Confirm Ticket Submission",
    confirm_message: "Are you sure you want to submit the ticket?"
}

function showConfirmation(title, message, callback, summaryHTML = '') {
            document.getElementById("modalTitle").innerText = title;
            document.getElementById("modalMessage").innerText = message;
            document.getElementById("formSummary").innerHTML = summaryHTML;

    confirmCallback = callback;
            document.getElementById("modalOverlay").style.display = "flex";
}

 function closeSupportModal() { 
    document.getElementById("modalOverlay").style.display = "none";
 }
  document.getElementById("confirmBtn").addEventListener("click", function() {
   if (confirmCallback) {
       confirmCallback();
    }
    closeSupportModal();
 });

function confirmSubmission() {
   const form = document.getElementById("supportForm");
   if (form.checkValidity()) {
       const email = form.email.value;
       const subject = form.subject.value;
       const description = form.description.value;

       const summary = `
          <strong>Email:</strong> ${email}<br>
          <strong>Subject:</strong> ${subject}<br>
          <strong>Description:</strong> ${description}
        `;
        
          showConfirmation(
              formElements.confirm_title,
              formElements.confirm_message,
              submitFormAJAX,
              summary
           );
     } else {
        form.reportValidity();
    }
 }

 function submitFormAJAX() {
     const form = document.getElementById("supportForm");
     const formData = new FormData(form);
     const modalContent = document.getElementById("modalContent");

     modalContent.innerHTML = `<div class="spinner"></div>`;

     setTimeout(() => {
         showNotification('success', 'Support ticket submitted. We will be in touch!');
         modalContent.innerHTML = `<p>Your support has been received successfully! You'll be notified via email.</p>`;
         form.reset();
     }, 1000);
 }

 // Live chat button
const chatBtn = document.getElementById('chatBtn');
const chatBox = document.getElementById('chatBox');
const closeBtn = document.getElementById('closeBtn');
const sendBtn = document.getElementById('sendBtn');
const userInput = document.getElementById('userInput');
const chatMessages = document.getElementById('chatMessages');

// Toggle chat box visibility
chatBtn.addEventListener('click', () => {
  chatBox.style.display = chatBox.style.display === 'block' ? 'none' : 'block';
});

closeBtn.addEventListener('click', () => {
  chatBox.style.display = 'none';
});

// Send message functionality
function sendMessage() {
  const message = userInput.value.trim();
  if (message) {
    // Add user message
    const userDiv = document.createElement('div');
    userDiv.textContent = message;
    userDiv.style.textAlign = 'right';
    userDiv.style.margin = '5px 0';
    chatMessages.appendChild(userDiv);
    
    // Simulate bot response (replace with actual API call)
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
}

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});
    
 // Knowledge Base data and search/filter logic
 const kbArticles = [
   { title: 'Uploading Documents', content: 'Step-by-step guide to upload your documents safely.' },
   { title: 'Sharing & Permissions', content: 'Learn how to generate share links and set permissions.' },
   { title: 'Account Security', content: 'Tips for securing your account including MFA setup.' },
   { title: 'How to enable dark mode?', content: 'Go to Settings → Appearance → Toggle Dark Mode.' },
   { title: 'Billing & Subscription', content: 'View plans, invoices, and manage billing preferences.' }
    ];

 const kbList = document.getElementById('kb-list');
 const kbSearch = document.getElementById('kb-search');
 
 function highlightMatch(text, query) {
    const re = new RegExp(`(${query})`,'gi');
    return text.replace(re, '<mark>$1</mark>');
 }

 function renderKB(list) {
   kbList.innerHTML = '';
   
  if (list.length === 0) {
    kbList.innerHTML = `<div class="no-results">No articles found for "<strong>${query}</strong>"</div>`;
    return;
  }
   
   list.forEach(article => {
     const div = document.createElement('div');
     div.className = 'kb-article';
     
     div.innerHTML = `
        <details>
         <summary><h3>${article.title}</h3></summary>
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
  
  // Handling feedback
 function handleFeedback(isHelpful) {
    const msg = isHelpful ? "Thanks for your feedback!" : "Sorry to hear that. We’ll work on improving this.";
    showNotification('info', msg);
  }

 // Initial render
 renderKB(kbArticles);

  // Filter as user types
 kbSearch.addEventListener('input', function() {
   const query = this.value.toLowerCase();
   const filtered = kbArticles.filter(a => a.title.toLowerCase().includes(query) || a.content.toLowerCase().includes(query));
   renderKB(filtered, query);
  });

// Collapsible FAQs
const faqQuestions = document.querySelectorAll('.faq-question');
faqQuestions.forEach((question) => {
    question.addEventListener('click', () => {
        const answer = question.nextElementSibling;
        const isVisible = answer.style.display === 'block';
        answer.style.display = isVisible ? 'none' : 'block';
        question.querySelector('span').textContent = isVisible ? '+' : '-';
    });
});

// Folder Creation functionality
function openFolderModal() {
   document.getElementById('folderModal').style.display = 'flex';
 }
 
 function createFolder() {
   const folderName = document.getElementById('folderName').value.trim();
   if (!folderName) return;
   const newFolder = {
       name: folderName,
       icon: 'fa-folder'
    };

   if (!folders.some(f => f.name.toLowerCase() === folderName.toLowerCase())) {
    folders.push(newFolder);
    documents[folderName.toLowerCase().replace(' ', '')] = [];
    saveToLocalStorage();
    renderFolders();
    updateFolderDropdown();
    closeModal('folderModal');
    document.getElementById('folderName').value = '';
    } else {
       showNotification('error', 'A folder with that name already exists.');
   }
 }

// Close Folder Modal
function closeFolderModal() {
   document.getElementById('folderModal').style.display = 'none';
}

 // Delete Account
const deleteModal = document.getElementById('deleteModal');
const deleteAccountbtn = document.getElementById('deleteAccount');

deleteAccountbtn.addEventListener('click', () => {
    deleteModal.style.display = 'flex';
});

function closeDeleteModal() {
   deleteModal.style.display = 'none';
}

async function deleteAccount() {
  try {
    const user = window.firebaseAuth ? window.firebaseAuth.currentUser : null;
    if (!user) {
      showNotification('error', 'No signed-in user found.');
      closeDeleteModal();
      return;
    }
    // Delete all Firestore user documents
    if (window.firebaseFirestore) {
      try {
        const docsRef = window.firebaseFirestore
          .collection('users').doc(user.uid).collection('documents');
        const snapshot = await docsRef.get();
        const batch = window.firebaseFirestore.batch();
        snapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        await window.firebaseFirestore.collection('users').doc(user.uid).delete();
      } catch (fsErr) {
        console.warn('Firestore cleanup error:', fsErr.code);
      }
    }
    // Delete Firebase Auth account
    await user.delete();
    // Clear all local data
    localStorage.clear();
    sessionStorage.clear();
    closeDeleteModal();
    window.location.href = 'Landing-page.html';
  } catch (error) {
    closeDeleteModal();
    if (error.code === 'auth/requires-recent-login') {
      showNotification('error',
        'Please sign out and sign back in before deleting your account.');
    } else {
      showNotification('error', 'Account deletion failed: ' + error.message);
    }
  }
}

// Show Notification modal
const notificationIcon = document.getElementById("notificationIcon");
const notificationModal = document.getElementById("notificationModal");

notificationIcon.addEventListener("click", () => {
  notificationModal.style.display =
    notificationModal.style.display === "block" ? "none" : "block";
});

// Close if clicked outside
document.addEventListener("click", (e) => {
   if (!notificationModal.contains(e.target) && e.target !== notificationIcon) {
     notificationModal.style.display = "none";
  }
});

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./firebase-service-worker.js')
      .then(registration => {
        showNotification('info', 'App ready for offline use.');
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showNotification('info', 'New version available! Refresh to update.');
            }
          });
        });
      })
      .catch(error => {
        console.log('ServiceWorker registration failed:', error);
      });
  });
}

// Install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  // Show install button
  const installBtn = document.createElement('button');
  installBtn.id = 'installBtn';
  installBtn.innerHTML = '<i class="fas fa-download"></i> Install App';
  installBtn.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    background: var(--brand);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    z-index: 1000;
  `;
  
  installBtn.onclick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response: ${outcome}`);
      deferredPrompt = null;
      installBtn.remove();
    }
  };
  
  document.body.appendChild(installBtn);
});

// DOMContentLoaded event listener
window.addEventListener('DOMContentLoaded', () => {  
  // Check for online sync
  if (navigator.onLine && window.firebaseSyncManager) {
    setTimeout(() => {
      window.firebaseSyncManager.syncPendingChanges();
    }, 3000);
  }
});

// Initial Load
window.addEventListener('load', () => {
   loadDocs();
   loadFavorites();
   loadTrash();
   refreshActivityFeed();
   generateUploadChartData();
});