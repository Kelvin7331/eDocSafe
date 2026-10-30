[e e-DocSafe](#)

Active v1.2.0 PWA

Documentation Project

📄 Kelvinet Technologies · Version 1.2.0

# e-DocSafe Secure Document Management

A browser-based, offline-first Progressive Web App for secure personal and organisational document storage. Works fully without internet — syncs to Firebase automatically when back online.

Active Development Firebase v9 compat IndexedDB PWA Ready GitHub Pages

[🔗 Live App](https://e-docsafe.firebaseapp.com) [⭐ GitHub Repo](https://github.com)

## Why e-DocSafe?

| Problem | e-DocSafe Solution |
| --- | --- |
| Cloud-only apps fail offline | IndexedDB-first — full functionality without internet |
| Privacy risks on third-party servers | AES-256 client-side encryption before any cloud upload |
| Poor mobile experience | Installable PWA — works like a native app on any device |
| Expensive enterprise DMS software | Free — built entirely on open web standards |
| No offline document previewing | PDF.js, Mammoth.js, SheetJS — in-browser rendering |

### Platform Overview

🔐

#### Authentication

Firebase Auth — email/password sign-in, password reset, in-page forgot-password flow, session persistence.

📦

#### Offline Storage

IndexedDB via `DBHelper.js` — all documents stored locally first. No internet required to upload or view.

☁️

#### Cloud Sync

Firestore + Firebase Storage sync via `FirebaseSyncManager`. Pending queue survives network drops.

📱

#### PWA

Installable on Android, iOS, Windows, and macOS. App shortcuts, share target, maskable icons.

🔍

#### Search & Filter

Real-time search by filename. Filter by encrypted, favorites, or all. Sort by date or name.

🗑️

#### Trash & Restore

Soft-delete with 30-day retention. One-click restore or permanent purge. Bulk operations supported.

## Features

Everything built into e-DocSafe v1.2.0.

### 🔐 Security

- ✓ Firebase Authentication — secure email/password, session management
- ✓ AES-256 client-side encryption before any cloud upload
- ✓ TLS 1.3 for all Firebase communication
- ✓ Firestore + Storage Security Rules (per-user UID isolation)
- ✓ IndexedDB sandboxed per browser origin
- ✓ Configurable auto-lock on inactivity

### 📁 Document Management

- ✓ Upload via file picker or drag-and-drop
- ✓ In-browser preview — PDF, DOCX, XLSX, images, plain text
- ✓ Rename, delete (soft), restore, and permanently purge
- ✓ Favorites for quick access
- ✓ Bulk operations — clear all, restore all, delete selected
- ✓ 30-day trash retention with expiry
- ✓ Sort by date and name, filter by type
- ✓ Grid and list view toggle

### ☁️ Offline-First Sync

- ✓ Saved to IndexedDB immediately — no internet required
- ✓ Background sync to Firestore + Storage when online
- ✓ Timestamp-based conflict resolution
- ✓ Pending sync queue (survives extended offline)
- ✓ Online/offline status indicator

### 🔗 Sharing

- ✓ Secure time-limited share links
- ✓ Optional password protection per link
- ✓ Configurable view-only / download permissions
- ✓ Share via email or Web Share API

### 📊 Analytics & Activity

- ✓ Upload history chart (Chart.js)
- ✓ File type distribution chart
- ✓ Activity feed with CSV export
- ✓ Dark/light mode toggle (persisted)

## Tech Stack

No frameworks. Vanilla JS throughout — fast, maintainable, zero build step.

### Frontend

| Technology | Purpose |
| --- | --- |
| HTML5 / CSS3 | Structure and styling |
| Vanilla JS (ES6+) | All application logic — no framework dependency |
| CSS Grid / Flexbox | Responsive layouts |
| CSS Custom Properties | Theme tokens for dark/light mode |
| Font Awesome 6 | Icons throughout the platform |
| Google Fonts (Inter + Poppins) | Typography |

### Storage & Sync

| Technology | Purpose |
| --- | --- |
| IndexedDB (DBHelper.js) | Offline-first local document storage |
| Firebase Firestore | Cloud metadata sync and real-time updates |
| Firebase Storage | Cloud backup of document files |
| localStorage | User preferences, pending sync queue, theme |
| Service Worker Cache API | App shell caching for offline access |

### Firebase Backend Services

| Service | Purpose |
| --- | --- |
| Firebase Authentication | Sign-up, sign-in, password reset, session management |
| Cloud Firestore | NoSQL document metadata database |
| Firebase Storage | Binary file cloud storage |
| Firebase Hosting | Optional static hosting (`e-docsafe.web.app`) |

### Document Rendering Libraries

| Library | Renders |
| --- | --- |
| PDF.js 2.6 | PDF documents |
| Mammoth.js 1.4 | DOCX / DOC files |
| SheetJS 0.18 | XLSX / XLS spreadsheets |
| Marked.js | Markdown files |
| Chart.js | Analytics charts |
| HTML5 \<img> | JPEG, PNG, WEBP, GIF |

## File Structure

All files sit in the repository root. No build step required.

e-docsafe/ │ ├── index.html ← Main platform (dashboard, docs, upload, settings) ├── Sign-In.html ← Login page with forgot-password modal ├── Sign-Up.html ← Registration page ├── Landing-page.html ← Account deletion countdown page ├── Terms.html ← Terms of Service ├── Privacy-policy.html ← Privacy Policy │ ├── e-DocSafe-platform.css ← Main platform stylesheet (3,800+ lines) ├── styles.css ← Auth pages stylesheet (Sign-In / Sign-Up) │ ├── e-DocSafe.js ← Core app logic — CRUD, UI, charts, search ├── auth.js ← Auth logic — sign-in/up, forgot password ├── DBHelper.js ← IndexedDB abstraction layer ├── UploadModal.js ← Upload modal — validation, FileReader, progress │ ├── firebase-config.js ← Firebase init and service exports (no defer) ├── firebase-auth.js ← SimpleAuthManager class ├── firebase-sync.js ← FirebaseSyncManager — real-time listener, queue ├── firebase-service-worker.js ← PWA service worker (caching + background sync) │ ├── manifest.json ← PWA manifest — icons, shortcuts, share target ├── firebase.json ← Firebase CLI config ├── firestore.rules ← Firestore Security Rules ├── firestore.indexes.json ← Composite indexes ├── storage.rules ← Storage Security Rules ├── .nojekyll ← Disables GitHub Pages Jekyll processing │ ├── e-DocSafe-favicon.ico ├── e-DocSafe-logo.png └── icons/ ← PWA icons (72 → 512px, maskable 192 + 512)

### Script Load Order

The load order matters. `firebase-config.js` runs synchronously in `<head>` so the Firebase globals exist before any deferred script runs.

```
<!-- head (no defer) -->
<script src="firebase-app-compat.js"></script>
<script src="firebase-auth-compat.js"></script>
<script src="firebase-config.js"></script>

<!-- body (all defer, in order) -->
<script src="DBHelper.js" defer></script>
<script src="firebase-auth.js" defer></script>
<script src="firebase-sync.js" defer></script>
<script src="UploadModal.js" defer></script>
<script src="e-DocSafe.js" defer></script>
```

## Getting Started

Running locally takes under two minutes. Firebase setup is optional for local testing.

### Prerequisites

- Modern browser — Chrome 90+, Firefox 88+, Edge 90+, Safari 15+
- [Firebase account](https://firebase.google.com/) (free Spark plan is enough)
- Node.js v18+ (only needed for Firebase CLI)
- Git

### Local Development

```
# Clone the repository
git clone https://github.com/your-username/e-docsafe.git
cd e-docsafe

# Serve locally — pick one method

# Option A: VS Code Live Server (recommended)
#   Right-click index.html → "Open with Live Server"

# Option B: npx serve
npx serve . -p 5500

# Option C: Python
python3 -m http.server 5500

# Then open: http://localhost:5500
```

ℹ The Service Worker requires HTTPS to register. On `localhost`, all major browsers treat HTTP as a secure origin — no HTTPS setup needed for local development.

### Firebase Setup

1

**Create a Firebase project**

Go to [console.firebase.google.com](https://console.firebase.google.com) → Add project → name it `e-docsafe`.

2

**Enable Authentication**

Build → Authentication → Sign-in method → Email/Password → Enable.

3

**Create Firestore database**

Build → Firestore Database → Create database → Start in **production mode**.

4

**Enable Cloud Storage**

Build → Storage → Get started → Accept the default rules for now.

5

**Copy your config into firebase-config.js**

Project settings → Your apps → Firebase SDK snippet → Config. Paste the config object into `firebase-config.js`.

6

**Deploy Security Rules**

Run: `firebase deploy --only firestore:rules,storage`

7

**Authorise your domain**

Authentication → Settings → Authorised domains → Add `your-username.github.io` (or your custom domain).

## Security Architecture

Files are encrypted client-side before they ever leave the browser. The server only ever sees ciphertext.

### Security Measures

| Layer | Mechanism |
| --- | --- |
| Authentication | Firebase Auth — email/password, session tokens, auto-expiry |
| Local isolation | IndexedDB sandboxed per browser origin |
| At rest | AES-256 client-side — server never sees plaintext |
| In transit | TLS 1.3 for all Firebase communication |
| Cloud access control | Firestore + Storage Security Rules (per-user UID) |
| File type control | Storage Rules MIME whitelist — no executables or archives |
| File size control | 50 MB per-file enforced in UploadModal.js and Storage Rules |

## Deployment

e-DocSafe deploys to both GitHub Pages (zero cost) and Firebase Hosting.

### GitHub Pages

```
# Push to GitHub
git init
git add .
git commit -m "Initial e-DocSafe deployment"
git branch -M main
git remote add origin https://github.com/your-username/e-docsafe.git
git push -u origin main
```

Then: **Repo → Settings → Pages → Source: Deploy from branch → main → / (root)**

Live at: `https://your-username.github.io/e-docsafe/`

⚠

**Add your domain to Firebase Auth.** After deploying, go to Firebase → Authentication → Settings → Authorised domains → add `your-username.github.io`. Without this, sign-in fails with `auth/unauthorized-domain`.

### Firebase Hosting

```
# Install Firebase CLI
npm install -g firebase-tools

# Login and initialise
firebase login
firebase init

# Deploy everything
firebase deploy

# Deploy site only (skip rules)
firebase deploy --only hosting

# Preview channel (2 days)
firebase hosting:channel:deploy preview --expires 2d
```

Live at: `https://e-docsafe.web.app` and `https://e-docsafe.firebaseapp.com`

## PWA Support

e-DocSafe is a fully compliant Progressive Web App — installable, offline-capable, and integrated with the OS.

| Feature | Status | Notes |
| --- | --- | --- |
| Installable (Add to Home Screen) | ✓ Ready | Android, iOS, Windows, macOS, Linux |
| Offline access | ✓ Ready | Service Worker caches the full app shell |
| Background sync | ✓ Ready | Queues uploads offline, syncs on reconnect |
| App shortcuts | ✓ Ready | Upload, Documents, Favorites |
| Share target | ✓ Ready | Receive files from other Android apps |
| Maskable icons | ✓ Ready | 192px and 512px, safe-zone compliant |
| Themed splash screen | ✓ Ready | Brand colours from manifest |
| iOS background sync | ⚠ Partial | Safari WebKit restricts background sync |

### Generating Icons

Use [maskable.app/editor](https://maskable.app/editor) to generate all required sizes from `e-DocSafe-logo.png`. Export to the `/icons/` directory. Minimum set: 192×192 and 512×512 maskable; 72, 96, 128, 144, 152, 384px for broad device support.

## Roadmap

What's shipped and what's next.

### v1.2.0 — Current

✓ Offline-first IndexedDB storage

✓ Firebase Auth + Firestore + Storage sync

✓ AES-256 client-side encryption

✓ PWA — installable, offline, app shortcuts

✓ In-browser document previews

✓ Dark mode / light mode

✓ Share links with password protection

✓ Activity feed with CSV export

✓ Analytics dashboard (Chart.js)

### v1.3.0 — Next

○ End-to-end encryption key management UI

○ OCR integration for in-document text search

○ Bulk download as ZIP

○ Document expiry and reminder notifications

○ Push notifications for share activity

### v2.0 — Future

○ Multi-user access control (viewer / editor / admin roles)

○ Real-time collaborative annotations

○ AI-powered document categorisation

○ Multi-cloud backup (Google Drive + AWS S3)

○ Native mobile apps (Flutter — Android + iOS)

○ Digital signature support

○ Swahili language support

## Contributing

Contributions are welcome. Please follow the coding conventions used throughout the project.

```
# 1. Fork the repository on GitHub

# 2. Create a feature branch
git checkout -b feature/your-feature-name

# 3. Make your changes, then commit
git commit -m "feat: describe your change clearly"

# 4. Push and open a Pull Request
git push origin feature/your-feature-name
```

### Code Conventions

| Rule | Detail |
| --- | --- |
| No frameworks | Vanilla JS only — no React, Vue, Angular, or jQuery |
| Async style | Use `async/await` over raw `.then()` chains |
| IndexedDB writes | Always use `addDocWithSync()` — never bare `db.transaction()` |
| User feedback | Always `showNotification('success'\|'error'\|'info', msg)` — never `alert()` |
| Modals | Never `prompt()` or `confirm()` — use the existing `#confirmationModal` |
| DOM access | Resolve at `DOMContentLoaded` — never at parse time |
| Error handling | Every `async` function must have a `try/catch` |
| Indent / quotes | 2 spaces · single quotes · `'use strict'` at top of every JS file |

## Author & License

Built in Kenya, for the world.

KG

### Kelvin Mwichwiri Gitonga

Diploma in Information & Communication Technology\
Mukiria Technical Training Institute, Kenya\
**Developer & Maintainer:** Kelvinet Technologies

[📧 support@e-docsafe.com](mailto:support@e-docsafe.com) [🌐 www.edocsafe.com](https://www.edocsafe.com) 📍 Konza City, Kenya

### License

⚖

**MIT License** — Free to use, modify, and distribute. Copyright © 2025 Kelvinet Technologies.

```
MIT License

Copyright (c) 2025 Kelvinet Technologies

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

Built with ❤️ in Kenya · [Privacy Policy](Privacy-policy.html) · [Terms of Service](Terms.html) · © 2025 Kelvinet Technologies