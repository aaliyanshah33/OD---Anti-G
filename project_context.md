# Project Context: OD Inventory Maintenance System (IMS)

## Overview
This is a production-ready desktop application developed for Optional Developers, designed to manage real estate projects, plots, buyers, documents, and payments. The system is built with Electron, React, and TypeScript. It features a secure local SQLite database with comprehensive encryption, offline-first operation, and tamper-evident audit logging.

**Status**: Core security implementation completed (v1.0)

## Architecture
- **Main Process (Node.js)**: SQLite database management, encrypted file storage, hash-chained audit trails, secure backups, and IPC communication.
- **Renderer Process (React/Vite)**: User interface built with React, React Router, and Zustand state management. Custom title bar, neon-green (#48f06a) theme on dark background.
- **Security Services**: Dedicated modules for cryptography, password hashing, session management, backup encryption, and audit logging.

## Security Model (Production-Grade)

### Authentication & Passwords
- **Two-role system**: Master (admin) and Staff users with different capabilities
- **Password Hashing**: **Argon2id** (not SHA-256) — industry-standard PBKDF with:
  - Memory cost: 19,456 KB (staff), 65,540 KB (master)
  - Time cost: 2-3 iterations
  - Parallelism: 1-4 threads
  - 16-32 byte salt
- **Automatic password validation** for sensitive operations (master password re-auth)

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
- `projects` — Real estate projects with location and theming
- `plots` — Individual plots with status (Available, Reserved, Sold, Transferred)
- `buyers` — Buyer profiles with contact and identity info
- `ownership_records` — Append-only plot-to-buyer transfers with timestamps

**Operations**:
- `documents` — Encrypted document storage with metadata
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
- `getUsers()`, `createUser()`, `toggleUser()` — User management

**Data Operations** (30+ handlers across 7 modules):
- **projects**: CRUD with audit logging and plot statistics
- **plots**: Full lifecycle management (Available → Transferred)
- **buyers**: Registry and contact management
- **ownership**: Plot-to-buyer transfers (append-only records)
- **documents**: Encrypted upload/download/view
- **payments**: Transaction logging with receipts
- **search**: Full-text search across all entities

**Maintenance**:
- `backup:create()` — Encrypted backup with Argon2 derivation
- `backup:exportToUsb()` — Export with metadata and checksum
- `audit:query()` — View hash-chained audit trail

## Frontend Pages (11 Total)

| Page | Purpose |
|------|---------|
| **SetupPage** | First-run master account creation |
| **LoginPage** | Role-based authentication |
| **DashboardPage** | Overview, statistics, quick actions |
| **ProjectsPage/Detail** | Project CRUD and management |
| **PlotsPage/Detail** | Plot inventory and status tracking |
| **BuyersPage/Detail** | Buyer registry and contacts |
| **SearchPage** | Cross-entity full-text search |
| **BackupPage** | Backup creation, restoration, USB export |
| **SettingsPage** | App configuration and preferences |
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

**GitHub Actions CI/CD** (configured for automatic .exe builds):
- Build on Windows runner (handles native modules: better-sqlite3, argon2)
- Creates NSIS installer automatically
- Generates release artifacts

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
- Master password change functionality (planned)
- Two-factor authentication (planned)
- Cloud sync option (deferred; offline-first design maintained)
- Mobile companion app (future release)
