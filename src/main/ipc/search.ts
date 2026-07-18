import { ipcMain } from 'electron'
import { getDb } from '../db/database'
import { writeAuditLog } from '../services/audit'

export function registerSearchHandlers(): void {
  ipcMain.handle('search:global', (_, { query, userId }) => {
    try {
      const db = getDb()
      const term = `%\${query}%`
      
      const buyers = db.prepare(`
        SELECT id, full_name, cnic, phone_primary, city 
        FROM buyers 
        WHERE full_name LIKE ? OR cnic LIKE ? OR phone_primary LIKE ? OR phone_secondary LIKE ?
        LIMIT 10
      `).all(term, term, term, term)

      const plots = db.prepare(`
        SELECT p.id, p.plot_number, p.block, pr.name as project_name, p.status
        FROM plots p
        JOIN projects pr ON p.project_id = pr.id
        WHERE p.plot_number LIKE ? OR p.block LIKE ? OR p.street LIKE ?
        LIMIT 10
      `).all(term, term, term)

      const projects = db.prepare(`
        SELECT id, name, location 
        FROM projects 
        WHERE name LIKE ? OR location LIKE ?
        LIMIT 5
      `).all(term, term)

      writeAuditLog({ action: 'SEARCH', userId, details: `Global search for: "\${query}"` })

      return { buyers, plots, projects }
    } catch (err: any) {
      console.error('Search error:', err)
      return { buyers: [], plots: [], projects: [] }
    }
  })
}
