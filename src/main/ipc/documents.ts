import { ipcMain, dialog, app } from 'electron'
import { getDb } from '../db/database'
import { encryptFile, decryptFile } from '../services/crypto'
import { writeAuditLog } from '../services/audit'
import { v4 as uuidv4 } from 'uuid'
import { join } from 'path'
import { existsSync, mkdirSync, statSync } from 'fs'

export function registerDocumentHandlers(): void {
  ipcMain.handle('documents:getByPlot', (_, plotId: string) => {
    return getDb().prepare(`
      SELECT d.*, u.username as uploaded_by_username
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.plot_id = ?
      ORDER BY d.created_at DESC
    `).all(plotId)
  })

  ipcMain.handle('documents:openFilePicker', async () => {
    return await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Documents', extensions: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'] }]
    })
  })

  ipcMain.handle('documents:upload', (_, data) => {
    try {
      const userDataPath = app.getPath('userData')
      const docsDir = join(userDataPath, 'od-ims-docs')
      if (!existsSync(docsDir)) mkdirSync(docsDir, { recursive: true })

      const id = uuidv4()
      const storedName = `\${id}.enc`
      const destPath = join(docsDir, storedName)
      const fileSize = statSync(data.filePath).size

      // Use a derived key from master config or standard key for demo
      // In production, fetch the master encryption key securely
      const key = Buffer.alloc(32, 'od-ims-master-key-2026') 
      
      encryptFile(data.filePath, destPath, key)

      getDb().prepare(`
        INSERT INTO documents (id, plot_id, buyer_id, doc_type, original_name, stored_name, mime_type, file_size, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.plotId || null, data.buyerId || null, data.docType, data.originalName, storedName, data.mimeType, fileSize, data.userId)

      writeAuditLog({ action: 'DOCUMENT_UPLOAD', entityId: id, userId: data.userId, details: `Uploaded \${data.originalName}` })
      return { success: true, id }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('documents:getContent', (_, { docId, userId }) => {
    try {
      const doc = getDb().prepare('SELECT * FROM documents WHERE id = ?').get(docId) as any
      if (!doc) return { success: false, error: 'Document not found' }

      const userDataPath = app.getPath('userData')
      const docPath = join(userDataPath, 'od-ims-docs', doc.stored_name)
      
      const key = Buffer.alloc(32, 'od-ims-master-key-2026')
      const decrypted = decryptFile(docPath, key)

      writeAuditLog({ action: 'DOCUMENT_VIEW', entityId: docId, userId, details: `Viewed \${doc.original_name}` })
      
      return { success: true, data: decrypted.toString('base64'), mimeType: doc.mime_type }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('documents:download', async (_, { docId, userId }) => {
    try {
      const doc = getDb().prepare('SELECT * FROM documents WHERE id = ?').get(docId) as any
      if (!doc) return { success: false, error: 'Document not found' }

      const result = await dialog.showSaveDialog({ defaultPath: doc.original_name })
      if (result.canceled || !result.filePath) return { success: false }

      const userDataPath = app.getPath('userData')
      const docPath = join(userDataPath, 'od-ims-docs', doc.stored_name)
      
      const key = Buffer.alloc(32, 'od-ims-master-key-2026')
      const decrypted = decryptFile(docPath, key)
      
      const { writeFileSync } = require('fs')
      writeFileSync(result.filePath, decrypted)

      writeAuditLog({ action: 'DOCUMENT_DOWNLOAD', entityId: docId, userId, details: `Downloaded \${doc.original_name}` })
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })
}
