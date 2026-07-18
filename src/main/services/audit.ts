import { getDb } from '../db/database'
import { hashChain } from './crypto'
import { v4 as uuidv4 } from 'uuid'

export type AuditAction =
  | 'LOGIN' | 'LOGIN_FAILED' | 'LOGOUT' | 'AUTO_LOCK'
  | 'PROJECT_CREATE' | 'PROJECT_UPDATE' | 'PROJECT_DELETE'
  | 'PLOT_CREATE' | 'PLOT_UPDATE' | 'PLOT_DELETE'
  | 'BUYER_CREATE' | 'BUYER_UPDATE' | 'BUYER_DELETE'
  | 'OWNERSHIP_TRANSFER'
  | 'DOCUMENT_UPLOAD' | 'DOCUMENT_VIEW' | 'DOCUMENT_DOWNLOAD' | 'DOCUMENT_PRINT'
  | 'PAYMENT_RECORD'
  | 'EXPORT_PDF' | 'EXPORT_EXCEL'
  | 'BACKUP_CREATE' | 'BACKUP_RESTORE'
  | 'SETTINGS_UPDATE' | 'USER_CREATE' | 'USER_UPDATE' | 'USER_DELETE'
  | 'SEARCH'

export interface AuditEntry {
  action: AuditAction
  entityType?: string
  entityId?: string
  userId?: string
  details?: string
}

export function writeAuditLog(entry: AuditEntry): void {
  try {
    const db = getDb()
    const lastEntry = db.prepare('SELECT entry_hash FROM audit_log ORDER BY id DESC LIMIT 1').get() as { entry_hash: string } | undefined
    const prevHash = lastEntry?.entry_hash ?? '0000000000000000000000000000000000000000000000000000000000000000'

    const data = JSON.stringify({
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      userId: entry.userId,
      details: entry.details,
      timestamp: new Date().toISOString()
    })

    const entryHash = hashChain(data, prevHash)

    db.prepare(`
      INSERT INTO audit_log (id, action, entity_type, entity_id, user_id, details, prev_hash, entry_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.action,
      entry.entityType ?? null,
      entry.entityId ?? null,
      entry.userId ?? null,
      entry.details ?? null,
      prevHash,
      entryHash
    )
  } catch (err) {
    console.error('[Audit] Failed to write audit log:', err)
  }
}
