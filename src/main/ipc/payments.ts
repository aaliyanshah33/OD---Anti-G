import { ipcMain } from 'electron'
import { getDb } from '../db/database'
import { writeAuditLog } from '../services/audit'
import { v4 as uuidv4 } from 'uuid'

export function registerPaymentHandlers(): void {
  ipcMain.handle('payments:getByPlot', (_, plotId: string) => {
    return getDb().prepare(`
      SELECT p.*, b.full_name as buyer_name, u.username as recorded_by_username
      FROM payments p
      JOIN buyers b ON p.buyer_id = b.id
      LEFT JOIN users u ON p.recorded_by = u.id
      WHERE p.plot_id = ?
      ORDER BY p.payment_date DESC, p.created_at DESC
    `).all(plotId)
  })

  ipcMain.handle('payments:create', (_, data) => {
    const id = uuidv4()
    getDb().prepare(`
      INSERT INTO payments (id, plot_id, buyer_id, amount, payment_date, payment_method, reference_number, notes, recorded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.plotId, data.buyerId, data.amount, data.paymentDate, data.paymentMethod, data.referenceNumber, data.notes, data.userId)
    
    writeAuditLog({ action: 'PAYMENT_RECORD', entityId: id, userId: data.userId, details: `Recorded payment of \${data.amount} for plot \${data.plotId}` })
    return { success: true, id }
  })
}
