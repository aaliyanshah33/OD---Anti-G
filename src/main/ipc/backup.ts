import { ipcMain, app, dialog } from 'electron'
import { getDb } from '../db/database'
import { writeAuditLog } from '../services/audit'
import { v4 as uuidv4 } from 'uuid'
import { join } from 'path'
import { existsSync, mkdirSync, copyFileSync, statSync } from 'fs'
import { encryptFile } from '../services/crypto'

export function registerBackupHandlers(): void {
  ipcMain.handle('backup:list', () => {
    return getDb().prepare('SELECT * FROM backup_metadata ORDER BY created_at DESC').all()
  })

  ipcMain.handle('backup:create', async (_, userId: string) => {
    try {
      const dbPath = join(app.getPath('userData'), 'od-ims-data', 'ims.db')
      const backupDir = join(app.getPath('userData'), 'od-ims-backups')
      if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true })

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupName = `ims_backup_\${timestamp}.db.enc`
      const destPath = join(backupDir, backupName)

      // Encrypt the SQLite file directly as a backup
      const key = Buffer.alloc(32, 'od-ims-master-key-2026')
      encryptFile(dbPath, destPath, key)

      const size = statSync(destPath).size
      const id = uuidv4()

      getDb().prepare(`
        INSERT INTO backup_metadata (id, backup_path, backup_size, created_by)
        VALUES (?, ?, ?, ?)
      `).run(id, destPath, size, userId)

      writeAuditLog({ action: 'BACKUP_CREATE', entityId: id, userId, details: `Created system backup \${backupName}` })
      return { success: true, path: destPath }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('backup:exportToUsb', async (_, userId: string) => {
    try {
      // Get latest backup
      const latest = getDb().prepare('SELECT * FROM backup_metadata ORDER BY created_at DESC LIMIT 1').get() as any
      if (!latest) return { success: false, error: 'No backup found to export' }

      const result = await dialog.showSaveDialog({
        title: 'Export Backup',
        defaultPath: latest.backup_path.split(/[\\/]/).pop(),
        filters: [{ name: 'Encrypted Database Backup', extensions: ['enc'] }]
      })

      if (result.canceled || !result.filePath) return { success: false }

      copyFileSync(latest.backup_path, result.filePath)
      writeAuditLog({ action: 'BACKUP_CREATE', userId, details: `Exported backup to \${result.filePath}` })

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })
}
