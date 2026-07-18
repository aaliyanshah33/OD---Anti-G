import { ipcMain } from 'electron'
import { getDb } from '../db/database'
import { writeAuditLog } from '../services/audit'
import { v4 as uuidv4 } from 'uuid'

export function registerPlotHandlers(): void {
  ipcMain.handle('plots:getByProject', (_, projectId: string) => {
    return getDb().prepare(`
      SELECT p.*,
        (SELECT full_name FROM buyers b 
         JOIN ownership_records o ON b.id = o.buyer_id 
         WHERE o.plot_id = p.id 
         ORDER BY o.sequence_number DESC LIMIT 1) as current_owner_name
      FROM plots p
      WHERE project_id = ?
      ORDER BY plot_number ASC
    `).all(projectId)
  })

  ipcMain.handle('plots:getById', (_, id: string) => {
    return getDb().prepare(`
      SELECT p.*, pr.name as project_name
      FROM plots p
      JOIN projects pr ON p.project_id = pr.id
      WHERE p.id = ?
    `).get(id)
  })

  ipcMain.handle('plots:create', (_, data) => {
    const id = uuidv4()
    getDb().prepare(`
      INSERT INTO plots (id, project_id, plot_number, block, street, size_marla, size_sqft, plot_type, price, status, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.projectId, data.plotNumber, data.block, data.street, data.sizeMarla, data.sizeSqft, data.plotType, data.price, data.status, data.notes, data.userId)
    writeAuditLog({ action: 'PLOT_CREATE', entityId: id, userId: data.userId, details: `Added plot ${data.plotNumber}` })
    return { success: true, id }
  })

  ipcMain.handle('plots:update', (_, { id, data, userId }) => {
    getDb().prepare(`
      UPDATE plots SET
        plot_number = ?, block = ?, street = ?, size_marla = ?, size_sqft = ?,
        plot_type = ?, price = ?, status = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(data.plotNumber, data.block, data.street, data.sizeMarla, data.sizeSqft, data.plotType, data.price, data.status, data.notes, id)
    writeAuditLog({ action: 'PLOT_UPDATE', entityId: id, userId, details: `Updated plot ${data.plotNumber}` })
    return { success: true }
  })

  ipcMain.handle('plots:delete', (_, { id, userId }) => {
    const db = getDb()
    try {
      db.prepare('DELETE FROM plots WHERE id = ?').run(id)
      writeAuditLog({ action: 'PLOT_DELETE', entityId: id, userId, details: `Deleted plot ${id}` })
      return { success: true }
    } catch (err: any) {
      return { success: false, error: 'Cannot delete plot with linked records' }
    }
  })
}
