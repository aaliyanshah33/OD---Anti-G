import { ipcMain } from 'electron'
import { getDb } from '../db/database'
import { writeAuditLog } from '../services/audit'
import { v4 as uuidv4 } from 'uuid'

export function registerProjectHandlers(): void {
  ipcMain.handle('projects:getAll', () => {
    const db = getDb()
    return db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM plots WHERE project_id = p.id) as total_plots,
        (SELECT COUNT(*) FROM plots WHERE project_id = p.id AND status = 'Available') as available_plots,
        (SELECT COUNT(*) FROM plots WHERE project_id = p.id AND status = 'Reserved') as reserved_plots,
        (SELECT COUNT(*) FROM plots WHERE project_id = p.id AND status = 'Sold') as sold_plots,
        (SELECT COUNT(*) FROM plots WHERE project_id = p.id AND status = 'Transferred') as transferred_plots
      FROM projects p
      WHERE is_active = 1
      ORDER BY p.name ASC
    `).all()
  })

  ipcMain.handle('projects:getById', (_, id: string) => {
    return getDb().prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM plots WHERE project_id = p.id) as total_plots,
        (SELECT COUNT(*) FROM plots WHERE project_id = p.id AND status = 'Available') as available_plots,
        (SELECT COUNT(*) FROM plots WHERE project_id = p.id AND status = 'Reserved') as reserved_plots,
        (SELECT COUNT(*) FROM plots WHERE project_id = p.id AND status = 'Sold') as sold_plots,
        (SELECT COUNT(*) FROM plots WHERE project_id = p.id AND status = 'Transferred') as transferred_plots
      FROM projects p WHERE id = ?
    `).get(id)
  })

  ipcMain.handle('projects:create', (_, data) => {
    const id = uuidv4()
    getDb().prepare(`
      INSERT INTO projects (id, name, location, description, theme_color, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, data.name, data.location, data.description, data.themeColor, data.userId)
    writeAuditLog({ action: 'PROJECT_CREATE', entityId: id, userId: data.userId, details: `Created project "\${data.name}"` })
    return { success: true, id }
  })

  ipcMain.handle('projects:update', (_, { id, data, userId }) => {
    getDb().prepare(`
      UPDATE projects SET name = ?, location = ?, description = ?, theme_color = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(data.name, data.location, data.description, data.themeColor, id)
    writeAuditLog({ action: 'PROJECT_UPDATE', entityId: id, userId, details: `Updated project "\${data.name}"` })
    return { success: true }
  })

  ipcMain.handle('projects:delete', (_, { id, userId }) => {
    // Soft delete to preserve referential integrity
    getDb().prepare(`UPDATE projects SET is_active = 0 WHERE id = ?`).run(id)
    writeAuditLog({ action: 'PROJECT_DELETE', entityId: id, userId, details: `Deleted project \${id}` })
    return { success: true }
  })
}
