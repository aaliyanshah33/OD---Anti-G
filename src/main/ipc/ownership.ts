import { ipcMain } from 'electron'
import { getDb } from '../db/database'
import { writeAuditLog } from '../services/audit'
import { v4 as uuidv4 } from 'uuid'

export function registerOwnershipHandlers(): void {
  ipcMain.handle('ownership:getByPlot', (_, plotId: string) => {
    return getDb().prepare(`
      SELECT o.*, b.full_name as buyer_name, b.cnic, u.username as authorized_by_username
      FROM ownership_records o
      JOIN buyers b ON o.buyer_id = b.id
      LEFT JOIN users u ON o.authorized_by = u.id
      WHERE o.plot_id = ?
      ORDER BY o.sequence_number DESC
    `).all(plotId)
  })

  ipcMain.handle('ownership:getByBuyer', (_, buyerId: string) => {
    return getDb().prepare(`
      SELECT o.*, p.plot_number, p.block, p.size_marla, pr.name as project_name, p.status
      FROM ownership_records o
      JOIN plots p ON o.plot_id = p.id
      JOIN projects pr ON p.project_id = pr.id
      WHERE o.buyer_id = ?
      ORDER BY o.transfer_date DESC
    `).all(buyerId)
  })

  ipcMain.handle('ownership:transfer', (_, data) => {
    const db = getDb()
    try {
      db.exec('BEGIN TRANSACTION')
      
      const lastSeq = db.prepare('SELECT MAX(sequence_number) as max_seq FROM ownership_records WHERE plot_id = ?').get(data.plotId) as { max_seq: number }
      const newSeq = (lastSeq.max_seq || 0) + 1
      
      const id = uuidv4()
      db.prepare(`
        INSERT INTO ownership_records (id, plot_id, buyer_id, transfer_date, transfer_price, sequence_number, transfer_type, notes, authorized_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.plotId, data.buyerId, data.transferDate, data.transferPrice, newSeq, data.transferType, data.notes, data.authorizedBy)
      
      // Update plot status and owner ref
      const newStatus = data.transferType === 'Sale' ? 'Sold' : 'Transferred'
      db.prepare(`UPDATE plots SET status = ? WHERE id = ?`).run(newStatus, data.plotId)
      
      db.exec('COMMIT')
      
      writeAuditLog({ action: 'OWNERSHIP_TRANSFER', entityId: id, userId: data.authorizedBy, details: `Transferred plot \${data.plotId} to buyer \${data.buyerId}` })
      return { success: true, id }
    } catch (err: any) {
      db.exec('ROLLBACK')
      return { success: false, error: err.message }
    }
  })
}
