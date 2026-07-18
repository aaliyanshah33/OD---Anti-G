import { ipcMain } from 'electron'
import { getDb } from '../db/database'
import { writeAuditLog } from '../services/audit'

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:getAll', () => {
    try {
      const rows = getDb().prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
      const settings: Record<string, string> = {}
      for (const row of rows) {
        settings[row.key] = row.value
      }
      return settings
    } catch {
      return {}
    }
  })

  ipcMain.handle('settings:update', (_, { data, userId }) => {
    try {
      const db = getDb()
      db.exec('BEGIN TRANSACTION')
      for (const [key, value] of Object.entries(data)) {
        db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
      }
      db.exec('COMMIT')
      writeAuditLog({ action: 'SETTINGS_UPDATE', userId, details: 'System settings updated' })
      return { success: true }
    } catch (err: any) {
      getDb().exec('ROLLBACK')
      return { success: false, error: err.message }
    }
  })
}
