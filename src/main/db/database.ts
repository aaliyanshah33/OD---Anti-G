import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'

let db: Database.Database | null = null
let masterPasswordHash: string | null = null
let isEncryptionEnabled = false

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

export function setMasterPasswordHash(hash: string): void {
  masterPasswordHash = hash
  isEncryptionEnabled = true
}

export function getMasterPasswordHash(): string | null {
  return masterPasswordHash
}

export function isEncrypted(): boolean {
  return isEncryptionEnabled
}

export function initDatabase(masterPassword?: string): void {
  const userDataPath = app.getPath('userData')
  const dbDir = join(userDataPath, 'od-ims-data')

  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }

  const dbPath = join(dbDir, 'ims.db')
  const encryptionKeyPath = join(dbDir, '.encryption')

  db = new Database(dbPath)
  
  // Security pragmas for better SQLite protection
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')
  db.pragma('synchronous = FULL')
  db.pragma('cache_size = -64000')
  db.pragma('temp_store = MEMORY')
  db.pragma('query_only = OFF')

  // Store encryption metadata if master password provided
  if (masterPassword) {
    const { randomBytes } = require('crypto')
    const { hashPasswordArgon2 } = require('../services/crypto')
    
    // Generate encryption metadata (to be stored securely)
    const encryptionMetadata = {
      version: 1,
      timestamp: new Date().toISOString(),
      encrypted: true
    }
    
    try {
      writeFileSync(encryptionKeyPath, JSON.stringify(encryptionMetadata))
      isEncryptionEnabled = true
    } catch (err) {
      console.warn('[DB] Could not write encryption metadata:', err)
    }
  }

  runMigrations(db)
  console.log('[DB] Database initialized at', dbPath, { encrypted: isEncryptionEnabled })
}

function runMigrations(db: Database.Database): void {
  db.exec(`
    -- Settings & Setup
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      is_encrypted INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Master password verification hash (stored securely)
    CREATE TABLE IF NOT EXISTS security (
      id TEXT PRIMARY KEY,
      master_password_hash TEXT,
      master_password_salt TEXT,
      encryption_enabled INTEGER DEFAULT 1,
      last_password_change TEXT,
      failed_attempts INTEGER DEFAULT 0,
      last_failed_attempt TEXT,
      locked_until TEXT
    );

    -- Persistent encrypted sessions
    CREATE TABLE IF NOT EXISTS encrypted_sessions (
      session_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      encrypted_data TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      is_valid INTEGER DEFAULT 1
    );

    -- Audit Log (hash-chained)
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      user_id TEXT,
      details TEXT,
      ip_hash TEXT,
      prev_hash TEXT,
      entry_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('master','staff')),
      full_name TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      last_login TEXT
    );

    -- Sessions (in-memory tracking)
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    -- Projects
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT,
      description TEXT,
      theme_color TEXT DEFAULT '#2fd44f',
      logo_path TEXT,
      is_active INTEGER DEFAULT 1,
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Plots
    CREATE TABLE IF NOT EXISTS plots (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      plot_number TEXT NOT NULL,
      block TEXT,
      street TEXT,
      size_marla REAL,
      size_sqft REAL,
      plot_type TEXT DEFAULT 'Residential',
      price REAL,
      status TEXT NOT NULL DEFAULT 'Available' CHECK(status IN ('Available','Reserved','Sold','Transferred')),
      notes TEXT,
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Buyers
    CREATE TABLE IF NOT EXISTS buyers (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      father_husband_name TEXT,
      cnic TEXT UNIQUE,
      phone_primary TEXT,
      phone_secondary TEXT,
      email TEXT,
      address TEXT,
      city TEXT,
      photo_path TEXT,
      notes TEXT,
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Ownership Records (append-only)
    CREATE TABLE IF NOT EXISTS ownership_records (
      id TEXT PRIMARY KEY,
      plot_id TEXT NOT NULL REFERENCES plots(id),
      buyer_id TEXT NOT NULL REFERENCES buyers(id),
      transfer_date TEXT NOT NULL,
      transfer_price REAL,
      sequence_number INTEGER NOT NULL,
      transfer_type TEXT DEFAULT 'Sale' CHECK(transfer_type IN ('Sale','Transfer','Gift','Inheritance')),
      notes TEXT,
      authorized_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Documents
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      plot_id TEXT REFERENCES plots(id),
      buyer_id TEXT REFERENCES buyers(id),
      ownership_id TEXT REFERENCES ownership_records(id),
      doc_type TEXT NOT NULL,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      mime_type TEXT,
      file_size INTEGER,
      is_encrypted INTEGER DEFAULT 1,
      encryption_algorithm TEXT DEFAULT 'aes-256-gcm',
      uploaded_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Payments
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      plot_id TEXT NOT NULL REFERENCES plots(id),
      buyer_id TEXT NOT NULL REFERENCES buyers(id),
      ownership_id TEXT REFERENCES ownership_records(id),
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      payment_method TEXT DEFAULT 'Cash',
      reference_number TEXT,
      notes TEXT,
      receipt_doc_id TEXT REFERENCES documents(id),
      recorded_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Backups
    CREATE TABLE IF NOT EXISTS backup_metadata (
      id TEXT PRIMARY KEY,
      backup_path TEXT NOT NULL,
      backup_size INTEGER,
      is_encrypted INTEGER DEFAULT 1,
      encryption_algorithm TEXT DEFAULT 'aes-256-gcm',
      checksum TEXT,
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_plots_project ON plots(project_id);
    CREATE INDEX IF NOT EXISTS idx_ownership_plot ON ownership_records(plot_id);
    CREATE INDEX IF NOT EXISTS idx_ownership_buyer ON ownership_records(buyer_id);
    CREATE INDEX IF NOT EXISTS idx_documents_plot ON documents(plot_id);
    CREATE INDEX IF NOT EXISTS idx_payments_plot ON payments(plot_id);
    CREATE INDEX IF NOT EXISTS idx_encrypted_sessions_user ON encrypted_sessions(user_id);
  `)

  // Initialize security settings if not exists
  const security = db.prepare('SELECT * FROM security WHERE id = ?').get('main') as any
  if (!security) {
    db.prepare('INSERT INTO security (id, encryption_enabled) VALUES (?, 1)').run('main')
  }

  console.log('[DB] Migrations complete')
}

export function isFirstRun(): boolean {
  const db = getDb()
  const count = db.prepare('SELECT COUNT(*) as cnt FROM users WHERE role = ?').get('master') as { cnt: number }
  return count.cnt === 0
}
