# Project Context: OD Inventory Maintenance System (IMS)

## Overview
This is a production-ready desktop application developed for Optional Developers, designed to manage real estate projects, plots, buyers, documents, and payments. The system is built with Electron, React, and TypeScript. It features a secure local SQLite database with comprehensive encryption, offline-first operation, and tamper-evident audit logging.

**Status**: Core security implementation completed (v1.0)

**Full documentation**: See `DOCUMENTATION.md` for the detailed technical reference (architecture, setup, schema, IPC, business rules, known limitations). This `project_context.md` file remains the short living summary for day-to-day development.

## Architecture
- **Main Process (Node.js)**: SQLite database management, encrypted file storage, hash-chained audit trails, secure backups, and IPC communication.
- **Renderer Process (React/Vite)**: User interface built with React, React Router, and Zustand state management. Custom title bar, neon-green (#48f06a) theme on dark background.
- **Branding**: Official Optional Developers logo (`src/renderer/src/assets/od-logo.png`) on Setup/Login. Auth screens use a locked dark brand treatment (`.auth-screen`) so titles like “Inventory System” stay high-contrast white even when the app theme is light. App chrome supports professional dark and light themes via full CSS token remaps (`--text`, `--surface`, `--black`, shadows, `--on-green`).
- **Sidebar profile**: The bottom-left user card shows the role as "Admin" (master) or "Staff", and clicking it opens a logout confirmation modal (Cancel / Log Out) instead of logging out immediately.
- **Security Services**: Dedicated modules for cryptography, password hashing, session management, backup encryption, and audit logging.

## Security Model (Production-Grade)

### Authentication & Passwords
- **Two-role system**: Master (admin) and Staff users with different capabilities
- **Password policy**: Minimum **11 characters**, including at least **one number** and **one special character** — enforced on master setup, staff creation, and password change (shared validator in `src/shared/passwordPolicy.ts`, applied in UI and main-process auth handlers)
- **Password Hashing**: **Argon2id** (not SHA-256) — industry-standard PBKDF with:
  - Memory cost: 19,456 KB (staff), 65,540 KB (master)
  - Time cost: 2-3 iterations
  - Parallelism: 1-4 threads
  - 16-32 byte salt
- **Automatic password validation** for sensitive operations (master password re-auth)
- **Change password**: Available in Settings; requires correct current password before accepting a new one

### Session Management
- **Dual-layer sessions**:
  - In-memory sessions (30-min TTL) for active operations
  - Encrypted persistent sessions for master users (stored in database)
  - Sessions automatically cleaned up on expiry
- **Session encryption**: Derived from master password using Argon2

### Data Encryption
- **Master password-based system encryption**:
  - Master password → Argon2 key derivation → AES-256-GCM
  - Encryption key derived separately for each operation (not stored)
- **File encryption**: AES-256-GCM for documents and backups
  - Format: IV(16 bytes) + AuthTag(16 bytes) + EncryptedData
  - Authenticated encryption prevents tampering
- **Database security**:
  - WAL mode for crash safety
  - FULL synchronous writes
  - Foreign key constraints enabled
  - Query-only pragma controls
  - Performance indexes on audit, plots, ownership, documents

### Audit Trail
- **Hash-chained structure** (SHA-256) for tamper-evidence:
  - Each entry includes hash of previous entry
  - Retroactive modification impossible without breaking chain
- **Actions tracked**:
  - Authentication (login, logout, failed attempts)
  - CRUD operations (projects, plots, buyers, ownership)
  - Document operations (upload, view, download, print)
  - Payment recording and exports
  - Backup creation and restoration
  - User and settings management
  - Search queries
- **Metadata**: User ID, timestamp, entity type, operation details

## Database Schema (Production v1.0)

**Security & Settings**:
- `security` — Master password hash, encryption status, failed login tracking
- `settings` — Key-value configuration (encrypted or plaintext)
- `encrypted_sessions` — Persistent encrypted session storage with TTL

**Authentication**:
- `users` — Master/staff accounts with Argon2 hashes
- `sessions` — In-memory session tracking (TTL managed in code)
- `audit_log` — Hash-chained tamper-evident logs

**Real Estate Data**:
- `projects` — Real estate projects with location and theming. **Maximum 7 active projects** at a time (`src/shared/projectLimits.ts`); create is blocked in UI and main-process when the limit is reached. Soft-deleted projects do not count toward the limit.
- `plots` — Individual plots with status (Available, Reserved, Sold, Transferred). Until sold/transferred, ownership displays as **Optional Developers** by default.
- `buyers` — Buyer profiles with contact and identity info; **required** `photo_path` and `id_document_path` (CNIC/Passport) on create
- `ownership_records` — Append-only plot-to-buyer transfers with timestamps

**Operations**:
- `documents` — Encrypted document storage with metadata; supports **preview**, **update** (master password), and downloads in the **original file format**
- `payments` — Payment records per plot
- `backup_metadata` — Backup history with checksums and encryption metadata

## New Security Features (Latest Release)

✅ **Argon2id Password Hashing** — Replaced 10,000 SHA-256 iterations  
✅ **Master Password-Based Encryption** — Derives key for full-system encryption  
✅ **Persistent Encrypted Sessions** — For master users across app restarts  
✅ **Database Hardening** — Security pragmas, performance indexes, constraints  
✅ **Encrypted Backup Manager** — Create, restore, export to USB with checksums  
✅ **Session Manager Service** — Centralized encrypted session handling  
✅ **Production-Ready Audit Logging** — Hash-chained, tamper-evident entries  

## IPC API Surface (40+ Handlers)

**Security Module** (`auth`):
- `isFirstRun()` — Check first-time setup
- `setupMaster()` — Initialize master account with Argon2
- `login()` — Authenticate and create session (in-memory + persistent)
- `logout()` — End session and cleanup
- `validateSession()` — Verify active session with TTL refresh
- `verifyMasterPassword()` — Re-auth for sensitive operations
- `changePassword()` — Change own password (requires correct current password; Argon2 re-hash; syncs master security hash when role is master)
- `getUsers()`, `createUser()`, `toggleUser()` — User management

**Data Operations** (30+ handlers across 7 modules):
- **projects**: CRUD with audit logging and plot statistics
- **plots**: Full lifecycle management (Available → Transferred)
- **buyers**: Registry and contact management
- **ownership**: Plot-to-buyer transfers (append-only records)
- **documents**: Encrypted upload/download/view; **update**, original-format download, and preview content
- **payments**: Transaction logging with receipts
- **search**: Global LIKE-based search across buyers, plots, and projects (case-insensitive, wildcard-escaped input, ordered results, limits of 25/25/10 per entity)

**Maintenance**:
- `backup:create()` — Encrypted backup with Argon2 derivation
- `backup:exportToUsb()` — Export with metadata and checksum
- `audit:query()` — View hash-chained audit trail

## Frontend Pages (11 Total)

| Page | Purpose |
|------|---------|
| **SetupPage** | First-run master account creation (official OD logo header, rights-reserved footer) |
| **LoginPage** | Role-based authentication (official OD logo header, rights-reserved footer) |
| **DashboardPage** | Overview, statistics, quick actions |
| **ProjectsPage/Detail** | Project CRUD and management (no theme color picker; default brand green used). **Hard limit: max 7 active projects** — enforced in UI and `projects:create` IPC |
| **PlotsPage/Detail** | Plot inventory; documents support upload, **in-app preview** (image/PDF), **update** (master password), and download in the **original file format** (jpg/pdf/etc.) |
| **BuyersPage/Detail** | Buyer registry; creating a buyer **requires** photo + CNIC/Passport front attachments |
| **SearchPage** | Cross-entity full-text search |
| **BackupPage** | Backup creation, restoration, USB export |
| **SettingsPage** | App configuration, user management, and Change Password (current password required before setting a new one) |
| **AuditPage** | Tamper-evident audit log viewer |

## Build & Deployment

**Development**:
```bash
npm install       # Install dependencies
npm run dev       # Start Electron + React dev server
```

**Production Build**:
```bash
npm run build      # Compile to out/
npm run build:win  # Create Windows NSIS installer
```

**GitHub Actions CI/CD**: ⏸️ Paused — this phase was skipped and is not being worked on currently. The workflow file exists but should be ignored.

## Dependencies (Production)

**Runtime**:
- `argon2` — PBKDF password hashing
- `better-sqlite3` — High-performance SQLite
- `exceljs` — Excel export
- `jspdf` + `jspdf-autotable` — PDF generation
- `html2canvas` — Screenshot capture
- `uuid` — Unique identifiers
- `date-fns` — Date utilities

**Dev**:
- Electron 43.1.1
- React 18.2 + React Router 6
- TypeScript 5.3
- Zustand 4.5 (state management)
- Lucide React (icons)

## Performance Optimizations

- WAL mode for concurrent read access
- Query result caching with indexes
- Session cleanup cronjob
- Lazy-loaded UI components
- Efficient buffer-based encryption

## Known Limitations & Future Work

- SQLCipher integration (considered; using app-level encryption instead for portability)
- Two-factor authentication (planned)
- Cloud sync option (deferred; offline-first design maintained)
- Mobile companion app (future release)
- Forgotten-password recovery without current password (not implemented; change password requires current password)
