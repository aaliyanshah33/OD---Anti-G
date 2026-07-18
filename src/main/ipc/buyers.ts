import { ipcMain } from 'electron'
import { getDb } from '../db/database'
import { writeAuditLog } from '../services/audit'
import { v4 as uuidv4 } from 'uuid'

export function registerBuyerHandlers(): void {
  ipcMain.handle('buyers:getAll', () => {
    return getDb().prepare(`
      SELECT b.*,
        (SELECT COUNT(DISTINCT plot_id) FROM ownership_records WHERE buyer_id = b.id) as plot_count
      FROM buyers b
      ORDER BY b.full_name ASC
    `).all()
  })

  ipcMain.handle('buyers:getById', (_, id: string) => {
    return getDb().prepare('SELECT * FROM buyers WHERE id = ?').get(id)
  })

  ipcMain.handle('buyers:create', (_, data) => {
    const id = uuidv4()
    try {
      getDb().prepare(`
        INSERT INTO buyers (id, full_name, father_husband_name, cnic, phone_primary, phone_secondary, email, address, city, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.fullName, data.fatherHusbandName, data.cnic, data.phonePrimary, data.phoneSecondary, data.email, data.address, data.city, data.notes, data.userId)
      writeAuditLog({ action: 'BUYER_CREATE', entityId: id, userId: data.userId, details: `Created buyer \${data.fullName}` })
      return { success: true, id }
    } catch (err: any) {
      if (err.message.includes('UNIQUE constraint failed: buyers.cnic')) {
        return { success: false, error: 'A buyer with this CNIC already exists' }
      }
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('buyers:update', (_, { id, data, userId }) => {
    getDb().prepare(`
      UPDATE buyers SET
        full_name = ?, father_husband_name = ?, cnic = ?, phone_primary = ?, phone_secondary = ?,
        email = ?, address = ?, city = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(data.fullName, data.fatherHusbandName, data.cnic, data.phonePrimary, data.phoneSecondary, data.email, data.address, data.city, data.notes, id)
    writeAuditLog({ action: 'BUYER_UPDATE', entityId: id, userId, details: `Updated buyer \${data.fullName}` })
    return { success: true }
  })
}
