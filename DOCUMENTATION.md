# OD Inventory Maintenance System (OD-IMS)

**Product name:** OD Inventory System  
**Package:** `od-ims` · **Version:** 1.0.0  
**Organization:** Optional Developers  
**Author:** Aaliyan Shah  
**App ID:** `com.optionaldevelopers.ims`

This document describes the application as implemented in the `OD---Anti-G` codebase. It is the primary technical reference for developers and operators.

---

## Table of contents

1. [Overview](#1-overview)
2. [Tech stack](#2-tech-stack)
3. [Repository structure](#3-repository-structure)
4. [Architecture](#4-architecture)
5. [Getting started](#5-getting-started)
6. [Build & packaging](#6-build--packaging)
7. [Authentication & security](#7-authentication--security)
8. [Business rules](#8-business-rules)
9. [Database](#9-database)
10. [IPC API reference](#10-ipc-api-reference)
11. [Frontend guide](#11-frontend-guide)
12. [Features by module](#12-features-by-module)
13. [Branding & UI](#13-branding--ui)
14. [Data locations](#14-data-locations)
15. [Known limitations](#15-known-limitations)
16. [Related documents](#16-related-documents)

---

## 1. Overview

OD-IMS is an **offline-first desktop application** for managing real-estate inventory: housing **projects**, **plots**, **buyers**, **ownership transfers**, **encrypted documents**, and **payments**.

It runs as an Electron app with:

- A **Node.js main process** (SQLite, file encryption, IPC)
- A **React renderer** (UI)
- A **preload bridge** exposing a typed-style `window.api` surface with context isolation enabled

The system is designed for local use without cloud sync. Sensitive operations (ownership transfer, document view/download, user disable, project delete) can require **master password** re-authentication.

### Roles

| Role (internal) | UI label | Capabilities |
|-----------------|----------|--------------|
| `master` | **Admin** | Full access: projects, plots, buyers, transfers, documents, payments, search, audit, backup, settings, user management |
| `staff` | **Staff** | Day-to-day inventory and buyer workflows; admin-only nav items (Audit, Backup, Settings) are hidden |

---

## 2. Tech stack

| Layer | Technology |
|-------|------------|
| Desktop shell | Electron 43 |
| Bundler | electron-vite + Vite 5 |
| UI | React 18, React Router 6 (HashRouter) |
| State | Zustand (auth persist + toasts) |
| Language | TypeScript 5.3 (strict) |
| Database | better-sqlite3 (local SQLite file) |
| Password hashing | Argon2id (`argon2`) |
| File encryption | AES-256-GCM (Node `crypto`) |
| Icons | Lucide React |
| Export helpers | exceljs, jspdf, jspdf-autotable, html2canvas |
| Packaging | electron-builder |

---

## 3. Repository structure

```
OD---Anti-G/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── index.ts          # Window creation, app lifecycle, window IPC
│   │   ├── db/
│   │   │   └── database.ts   # SQLite init, schema, pragmas
│   │   ├── ipc/              # One module per domain (auth, projects, …)
│   │   └── services/         # crypto, audit, sessionManager, backupManager
│   ├── preload/
│   │   └── index.ts          # contextBridge → window.api
│   ├── renderer/
│   │   ├── index.html
│   │   └── src/
│   │       ├── App.tsx
│   │       ├── main.tsx
│   │       ├── assets/       # od-logo.png
│   │       ├── components/   # AppShell, modals, toasts
│   │       ├── pages/        # Route screens
│   │       ├── stores/       # Zustand
│   │       ├── styles/       # Design system CSS
│   │       └── types/
│   └── shared/               # Shared constants/validators (main + renderer)
│       ├── passwordPolicy.ts
│       ├── projectLimits.ts
│       └── plotOwnership.ts
├── package.json
├── electron.vite.config.ts
├── tsconfig.json
├── project_context.md        # Living agent/dev context (kept in sync with changes)
├── DOCUMENTATION.md          # This file
└── .github/workflows/        # CI present but currently paused / not in active use
```

Path aliases:

- `@main` → `src/main`
- `@renderer` → `src/renderer/src`
- `@shared` → `src/shared`

---

## 4. Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Renderer (React)                                       │
│  Pages · Zustand · CSS · HashRouter                     │
│                         │                               │
│                         ▼ window.api.*                  │
│  Preload (contextBridge, contextIsolation: true)        │
└─────────────────────────┬───────────────────────────────┘
                          │ ipcRenderer.invoke
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Main process                                           │
│  IPC handlers → SQLite (better-sqlite3)                 │
│               → AES file ops (documents / backups)      │
│               → Argon2 auth                             │
│               → Audit writer                            │
└─────────────────────────────────────────────────────────┘
```

### Main process startup

1. App ready → `initDatabase()`
2. Register all IPC handler modules
3. Create frameless `BrowserWindow` (dark background `#060907`, preload script loaded)
4. Security: `contextIsolation: true`, `nodeIntegration: false`

### Session model

- **In-memory sessions** (Map in `auth.ts`): 30-minute TTL, refreshed on `validateSession`
- **Encrypted persistent sessions** (table `encrypted_sessions`): written for master logins
- Sidebar logout opens a **confirmation modal** before ending the session

---

## 5. Getting started

### Prerequisites

- Node.js (LTS recommended)
- Windows for local Windows portable builds (macOS/Linux builders for other targets)
- Native build tools for `better-sqlite3` and `argon2` (handled via `postinstall` / electron-builder deps)

### Install & run (development)

```bash
cd OD---Anti-G
npm install
npm run dev
```

`npm install` runs `electron-builder install-app-deps` (postinstall) to rebuild native modules for Electron.

### First launch

1. If no master account exists → **Setup** screen (create Admin / master credentials)
2. Otherwise → **Login**
3. After login → Dashboard and full shell navigation

### Lint

```bash
npm run lint
```

---

## 6. Build & packaging

```bash
npm run build          # Compile to out/
npm run build:win      # Windows portable (x64)
npm run build:mac      # dmg + zip
npm run build:linux    # AppImage + deb
npm run build:all      # all configured platforms
npm run preview        # preview production build
```

| Setting | Value |
|---------|--------|
| Output directory | `release/` |
| Windows target | **portable** x64 (not NSIS) |
| Product name | OD Inventory System |

**CI/CD:** GitHub Actions workflow files may exist under `.github/workflows/`, but that phase is **paused** and should not be treated as an active delivery pipeline.

---

## 7. Authentication & security

### Password policy

Defined in `src/shared/passwordPolicy.ts` and enforced in:

- Master setup (`auth:setupMaster`)
- Staff creation (`auth:createUser`)
- Password change (`auth:changePassword`)
- Setup / Settings UI validation

| Rule | Requirement |
|------|-------------|
| Length | Minimum **11** characters |
| Digit | At least **one number** |
| Special | At least **one special character** (non-alphanumeric) |

### Password hashing

- Algorithm: **Argon2id**
- Typical params (user passwords): memoryCost `19456`, timeCost `2`, parallelism `1`, saltLength `16`

### Change password

Located under **Settings → Account Security → Change Password**.

Flow:

1. Enter **current password**
2. Enter / confirm **new password** (policy applied)
3. Server verifies current password with Argon2; only then stores the new hash
4. For master accounts, `security.master_password_hash` is updated as well

Failed attempts (wrong current password) are audit-logged as `PASSWORD_CHANGE_FAILED`.

### Master re-authentication

`MasterPasswordModal` + `auth:verifyMasterPassword` gate sensitive UI actions (e.g. ownership transfer, viewing/downloading documents, disabling users, deleting projects).

### File encryption (documents & backups)

Helpers in `src/main/services/crypto.ts` implement **AES-256-GCM** (`IV` 16 bytes + auth tag 16 bytes + ciphertext).

**Current implementation note:** document and backup IPC paths use a **fixed application key** (`od-ims-master-key-2026` buffer), not a key derived from the master password. Treat this as an interim approach; see [Known limitations](#15-known-limitations).

### Database at rest

The SQLite database file itself is **not** SQLCipher-encrypted. Protection for documents/backups is at the file-blob layer where encryption is applied.

---

## 8. Business rules

| Rule | Detail |
|------|--------|
| **Max active projects** | **7**. Enforced in UI and `projects:create` (`src/shared/projectLimits.ts`). Soft-deleted projects (`is_active = 0`) do not count. |
| **Default plot owner** | If a plot has no ownership record (not sold/transferred to a buyer), ownership displays as **Optional Developers** (`src/shared/plotOwnership.ts`). |
| **Ownership history** | Transfers are **append-only** records with sequence numbers; prior owners are retained. |
| **Project theme color** | Selectable when **creating** a project; hidden when **editing**. |
| **Role labels** | Sidebar shows **Admin** for `master`, **Staff** for `staff`. |

---

## 9. Database

### Location

```
{Electron userData}/od-ims-data/ims.db
```

### Pragmas

- WAL mode
- Foreign keys ON
- Synchronous FULL
- Busy timeout enabled

### Tables (summary)

| Table | Purpose |
|-------|---------|
| `settings` | Key/value app settings |
| `security` | Master password hash / security metadata |
| `users` | Master & staff accounts |
| `sessions` | Session rows (schema present) |
| `encrypted_sessions` | Persistent encrypted session payloads |
| `audit_log` | Audit entries (intended hash-chained) |
| `projects` | Housing projects (`is_active` soft delete) |
| `plots` | Plots per project; status lifecycle |
| `buyers` | Buyer registry (CNIC unique) |
| `ownership_records` | Plot ↔ buyer transfer history |
| `documents` | Encrypted document metadata |
| `payments` | Payment records per plot |
| `backup_metadata` | Backup history metadata |

### Plot status values

`Available` → `Reserved` → `Sold` → `Transferred` (also used independently as status labels in UI filters).

---

## 10. IPC API reference

All channels are exposed through `src/preload/index.ts` as `window.api.<module>.<method>()`.

### Auth — `window.api.auth`

| Method | Channel | Notes |
|--------|---------|-------|
| `isFirstRun()` | `auth:isFirstRun` | |
| `setupMaster(data)` | `auth:setupMaster` | Password policy enforced |
| `login(data)` | `auth:login` | Returns session + user |
| `logout(sessionId)` | `auth:logout` | |
| `validateSession(sessionId)` | `auth:validateSession` | Sliding TTL |
| `verifyMasterPassword(password)` | `auth:verifyMasterPassword` | |
| `changePassword(data)` | `auth:changePassword` | Requires current password |
| `getUsers()` | `auth:getUsers` | |
| `createUser(data)` | `auth:createUser` | Staff; password policy |
| `toggleUser(data)` | `auth:toggleUser` | Enable/disable |

### Projects — `window.api.projects`

`getAll`, `getById`, `selectLogo`, `create` (**max 7 active**), `update`, `delete` (soft)

### Plots — `window.api.plots`

`getByProject`, `getById`, `create`, `update`, `delete`

### Buyers — `window.api.buyers`

`getAll`, `getById`, `create`, `update`

### Ownership — `window.api.ownership`

`getByPlot`, `getByBuyer`, `transfer`

### Documents — `window.api.documents`

| Method | Notes |
|--------|-------|
| `getByPlot` | List |
| `openFilePicker` | Native dialog |
| `upload` | Encrypt + store |
| `update` | Replace metadata/file (**IPC available**; Plot UI update control not fully wired) |
| `getContent` | Decrypt for view |
| `download` | Decrypt + save dialog |

### Payments — `window.api.payments`

`getByPlot`, `create`

### Backup — `window.api.backup`

`list`, `create`, `exportToUsb`

### Settings / Search / Audit / Window

- `settings.getAll` / `update`
- `search.global` — buyers, plots, projects (LIKE search, escaped wildcards)
- `audit.getLogs` / `getDashboardStats` / `verify`
- `window.minimize` / `maximize` / `close` / `isMaximized`

---

## 11. Frontend guide

### Routing (`App.tsx`)

| Route | Page |
|-------|------|
| (first run) | `SetupPage` |
| (logged out) | `LoginPage` |
| `/` | Redirect → `/dashboard` |
| `/dashboard` | `DashboardPage` |
| `/projects`, `/projects/:id` | Projects list / detail |
| `/plots`, `/plots/:id` | All plots / plot detail |
| `/buyers`, `/buyers/:id` | Buyers list / detail |
| `/search` | Universal search |
| `/backup` | Backups (master) |
| `/settings` | Settings (master) |
| `/audit` | Audit log (master) |

Shell: `AppShell` (custom title bar, sidebar, theme toggle, logout confirmation).

### State

- `authStore` — session/user (persisted key `od-ims-auth`)
- `toastStore` — transient notifications

### Shared UI patterns

- Form styles via `global.css` (`.form-input`, `.btn`, `.modal`, `.table`, …)
- Master-gated actions use `MasterPasswordModal`
- Dark / light theme via `od-theme` in `localStorage` and `body.theme-light`

---

## 12. Features by module

### Setup & Login

- Official Optional Developers logo (`src/renderer/src/assets/od-logo.png`)
- Rights footer: *All rights are reserved to Optional Developers.*
- Password policy hints and validation

### Dashboard

- Aggregate stats (projects, plots, buyers, etc.)
- No time-of-day greeting (removed)

### Projects

- CRUD with logo upload
- Active count `n/7` in header
- Soft delete with master password
- Theme color on create only

### Plots

- Per-project inventory + global All Plots view
- Status badges and filters
- Default owner **Optional Developers** when unsold
- Detail tabs: Ownership · Documents · Payments
- Ownership transfer (master password)

### Buyers

- Registry with CNIC and contact fields
- Detail view with related ownership history

### Search

- Debounced global search across buyers, plots, projects
- Backend escapes LIKE wildcards; returns ordered limited result sets

### Settings

- Account Security → Change Password
- Staff user create / enable-disable
- System information panel

### Backup

- Create encrypted backup, list history, export to USB (UI + IPC)

### Audit

- Log viewer and dashboard stats
- Chain verification UI exists; see limitations on integrity checks

---

## 13. Branding & UI

| Token / asset | Value |
|---------------|--------|
| Brand | Optional Developers |
| Accent green | `#2fd44f` / `#48f06a` |
| Dark base | `#060907` |
| Font | Inter |
| Logo | Neon rings + wordmark + tagline image on Setup/Login |
| Window | Frameless; custom title bar |

---

## 14. Data locations

| Data | Typical path under Electron `userData` |
|------|----------------------------------------|
| SQLite DB | `od-ims-data/ims.db` |
| Encrypted documents | `od-ims-docs/*.enc` |
| Project logos | `od-ims-project-logos/` |
| Backups | App backup directory + metadata table |

Exact `userData` root depends on OS and Electron (e.g. under AppData on Windows).

---

## 15. Known limitations

These are intentional honesty notes for maintainers — not product marketing claims.

1. **Document/backup encryption key** is currently a fixed app key in IPC paths, not master-password-derived encryption end-to-end.
2. **SQLite DB file** is not encrypted at rest with SQLCipher.
3. **Audit hash chain**: writer/verify have known defects (INSERT bind mismatch; verify may always report valid). Do not rely on chain verification for compliance until fixed.
4. **`documents:update` IPC** exists; plot Documents tab UI for “update existing document” (with master password) may still need completion if not visible in the build you are testing.
5. **Forgotten password recovery** without knowing the current password is not implemented (change-password requires current password).
6. **CI/CD** automation is paused — use local `npm run build:*` for releases.
7. **Windows package** is portable x64, not an NSIS installer.
8. **`sessionManager.ts` / `backupManager.ts`** contain additional logic that is not fully wired as the primary path for all IPC operations.
9. No automated test suite is present in the repository.

---

## 16. Related documents

| File | Role |
|------|------|
| `project_context.md` | Short living context for ongoing development (update when features change) |
| `DOCUMENTATION.md` | This detailed technical reference |
| `COMPLETE_IMPLEMENTATION_SUMMARY.md` | Historical implementation notes (may lag behind code) |
| `GITHUB_ACTIONS_GUIDE.md` / `GITHUB_PUSH_INSTRUCTIONS.md` | CI/push notes (CI phase paused) |

---

## Quick operator checklist

1. Install deps → `npm install`
2. Develop → `npm run dev`
3. Create master account on first run (strong password: 11+ chars, number, special)
4. Create up to **7** projects
5. Add plots; unsold plots show owner **Optional Developers**
6. Register buyers → transfer ownership (master password)
7. Upload documents / record payments
8. Change password from Settings when needed
9. Create backups from Backup page before major data work
10. Package with `npm run build:win` (or mac/linux) when ready to distribute

---

*© Optional Developers — All rights reserved.*  
*Documentation aligned to codebase version 1.0.0.*
