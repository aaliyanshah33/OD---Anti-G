import { ipcMain } from 'electron'
import { getDb } from '../db/database'
import { writeAuditLog } from '../services/audit'

export function registerSearchHandlers(): void {
  ipcMain.handle('search:global', (_, { query, userId }) => {
    try {
      const raw = String(query ?? '').trim()
      if (raw.length < 2) {
        return { buyers: [], plots: [], projects: [] }
      }

      const db = getDb()
      // Escape LIKE wildcards so user input like "%" or "_" is matched literally
      const escaped = raw.replace(/[\\%_]/g, match => `\\${match}`)
      const term = `%${escaped}%`

      const buyers = db.prepare(`
        SELECT id, full_name, cnic, phone_primary, city
        FROM buyers
        WHERE full_name LIKE ? ESCAPE '\\'
           OR cnic LIKE ? ESCAPE '\\'
           OR phone_primary LIKE ? ESCAPE '\\'
           OR phone_secondary LIKE ? ESCAPE '\\'
        ORDER BY full_name COLLATE NOCASE
        LIMIT 25
      `).all(term, term, term, term)

      const plots = db.prepare(`
        SELECT p.id, p.plot_number, p.block, pr.name as project_name, p.status
        FROM plots p
        JOIN projects pr ON p.project_id = pr.id
        WHERE p.plot_number LIKE ? ESCAPE '\\'
           OR p.block LIKE ? ESCAPE '\\'
           OR p.street LIKE ? ESCAPE '\\'
        ORDER BY pr.name COLLATE NOCASE, p.plot_number COLLATE NOCASE
        LIMIT 25
      `).all(term, term, term)

      const projects = db.prepare(`
        SELECT id, name, location
        FROM projects
        WHERE name LIKE ? ESCAPE '\\'
           OR location LIKE ? ESCAPE '\\'
        ORDER BY name COLLATE NOCASE
        LIMIT 10
      `).all(term, term)

      writeAuditLog({ action: 'SEARCH', userId, details: `Global search for: "${raw}"` })

      return { buyers, plots, projects }
    } catch (err) {
      console.error('Search error:', err)
      return { buyers: [], plots: [], projects: [] }
    }
  })
}
