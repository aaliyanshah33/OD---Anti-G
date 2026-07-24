import { app, dialog, ipcMain } from 'electron'
import { getDb } from '../db/database'
import { writeAuditLog } from '../services/audit'
import { v4 as uuidv4 } from 'uuid'
import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { join, extname } from 'path'
import { MAX_ACTIVE_PROJECTS, MAX_ACTIVE_PROJECTS_MESSAGE } from '../../shared/projectLimits'

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

  ipcMain.handle('projects:selectLogo', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Project Logo', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'] }]
    })
    if (result.canceled || !result.filePaths.length) {
      return { success: false }
    }

    const sourcePath = result.filePaths[0]
    const userDataPath = app.getPath('userData')
    const destDir = join(userDataPath, 'od-ims-project-logos')
    if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true })

    const fileExt = extname(sourcePath) || '.png'
    const storedName = `${uuidv4()}${fileExt}`
    const destPath = join(destDir, storedName)
    copyFileSync(sourcePath, destPath)

    return { success: true, path: destPath }
  })

  ipcMain.handle('projects:create', (_, data) => {
    try {
      const db = getDb()
      const row = db.prepare(`SELECT COUNT(*) as count FROM projects WHERE is_active = 1`).get() as { count: number }
      if (row.count >= MAX_ACTIVE_PROJECTS) {
        return { success: false, error: MAX_ACTIVE_PROJECTS_MESSAGE }
      }

      const id = uuidv4()
      db.prepare(`
        INSERT INTO projects (id, name, location, description, theme_color, logo_path, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.name, data.location, data.description, data.themeColor, data.logoPath || null, data.userId)
      writeAuditLog({ action: 'PROJECT_CREATE', entityId: id, userId: data.userId, details: `Created project "${data.name}"` })
      return { success: true, id }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to create project' }
    }
  })

  ipcMain.handle('projects:update', (_, { id, data, userId }) => {
    getDb().prepare(`
      UPDATE projects SET name = ?, location = ?, description = ?, theme_color = ?, logo_path = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(data.name, data.location, data.description, data.themeColor, data.logoPath || null, id)
    writeAuditLog({ action: 'PROJECT_UPDATE', entityId: id, userId, details: `Updated project "${data.name}"` })
    return { success: true }
  })

  ipcMain.handle('projects:delete', (_, { id, userId }) => {
    // Soft delete to preserve referential integrity
    getDb().prepare(`UPDATE projects SET is_active = 0 WHERE id = ?`).run(id)
    writeAuditLog({ action: 'PROJECT_DELETE', entityId: id, userId, details: `Deleted project ${id}` })
    return { success: true }
  })
}
