import { ipcMain, dialog, app } from 'electron'
import { getDb } from '../db/database'
import { encryptFile, decryptFile } from '../services/crypto'
import { writeAuditLog } from '../services/audit'
import { v4 as uuidv4 } from 'uuid'
import { join, extname, basename } from 'path'
import { existsSync, mkdirSync, statSync, unlinkSync, writeFileSync } from 'fs'

const DOC_KEY = Buffer.alloc(32, 'od-ims-master-key-2026')

function extensionFromNameOrMime(originalName: string, mimeType?: string | null): string {
  const fromName = extname(originalName || '').toLowerCase()
  if (fromName) return fromName

  const mime = (mimeType || '').toLowerCase()
  if (mime.includes('pdf')) return '.pdf'
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg'
  if (mime.includes('png')) return '.png'
  if (mime.includes('msword')) return '.doc'
  if (mime.includes('wordprocessingml')) return '.docx'
  return ''
}

function ensureExtension(filePath: string, originalName: string, mimeType?: string | null): string {
  const needed = extensionFromNameOrMime(originalName, mimeType)
  if (!needed) return filePath
  if (filePath.toLowerCase().endsWith(needed)) return filePath
  // Strip a wrong/missing extension and append the correct one
  const currentExt = extname(filePath)
  const base = currentExt ? filePath.slice(0, -currentExt.length) : filePath
  return `${base}${needed}`
}

function filtersForDocument(originalName: string, mimeType?: string | null): Electron.FileFilter[] {
  const ext = extensionFromNameOrMime(originalName, mimeType).replace('.', '')
  if (!ext) return [{ name: 'All Files', extensions: ['*'] }]
  const label =
    ext === 'pdf' ? 'PDF Document'
    : ext === 'jpg' || ext === 'jpeg' ? 'JPEG Image'
    : ext === 'png' ? 'PNG Image'
    : `${ext.toUpperCase()} File`
  return [
    { name: label, extensions: [ext === 'jpg' ? 'jpg' : ext] },
    { name: 'All Files', extensions: ['*'] }
  ]
}

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
      const storedName = `${id}.enc`
      const destPath = join(docsDir, storedName)
      const fileSize = statSync(data.filePath).size

      encryptFile(data.filePath, destPath, DOC_KEY)

      getDb().prepare(`
        INSERT INTO documents (id, plot_id, buyer_id, doc_type, original_name, stored_name, mime_type, file_size, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, data.plotId || null, data.buyerId || null, data.docType, data.originalName, storedName, data.mimeType, fileSize, data.userId)

      writeAuditLog({ action: 'DOCUMENT_UPLOAD', entityId: id, userId: data.userId, details: `Uploaded ${data.originalName}` })
      return { success: true, id }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('documents:update', (_, data) => {
    try {
      const db = getDb()
      const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(data.docId) as any
      if (!doc) return { success: false, error: 'Document not found' }

      const userDataPath = app.getPath('userData')
      const docsDir = join(userDataPath, 'od-ims-docs')
      if (!existsSync(docsDir)) mkdirSync(docsDir, { recursive: true })

      let storedName = doc.stored_name
      let originalName = doc.original_name
      let mimeType = doc.mime_type
      let fileSize = doc.file_size

      if (data.filePath) {
        storedName = `${doc.id}-${Date.now()}.enc`
        const destPath = join(docsDir, storedName)
        fileSize = statSync(data.filePath).size
        encryptFile(data.filePath, destPath, DOC_KEY)

        const oldPath = join(docsDir, doc.stored_name)
        if (doc.stored_name !== storedName && existsSync(oldPath)) {
          try { unlinkSync(oldPath) } catch { /* best-effort */ }
        }

        originalName = data.originalName || basename(data.filePath)
        mimeType = data.mimeType || doc.mime_type
      }

      db.prepare(`
        UPDATE documents
        SET doc_type = ?, original_name = ?, stored_name = ?, mime_type = ?, file_size = ?, uploaded_by = ?
        WHERE id = ?
      `).run(data.docType || doc.doc_type, originalName, storedName, mimeType, fileSize, data.userId, doc.id)

      writeAuditLog({
        action: 'DOCUMENT_UPDATE',
        entityId: doc.id,
        userId: data.userId,
        details: data.filePath
          ? `Updated document: replaced "${doc.original_name}" with "${originalName}"`
          : `Updated document metadata for "${doc.original_name}"`
      })
      return { success: true }
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
      if (!existsSync(docPath)) return { success: false, error: 'Encrypted file missing on disk' }

      const decrypted = decryptFile(docPath, DOC_KEY)
      writeAuditLog({ action: 'DOCUMENT_VIEW', entityId: docId, userId, details: `Viewed ${doc.original_name}` })

      return {
        success: true,
        data: decrypted.toString('base64'),
        mimeType: doc.mime_type || 'application/octet-stream',
        originalName: doc.original_name
      }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('documents:download', async (_, { docId, userId }) => {
    try {
      const doc = getDb().prepare('SELECT * FROM documents WHERE id = ?').get(docId) as any
      if (!doc) return { success: false, error: 'Document not found' }

      const suggestedName = doc.original_name || `document${extensionFromNameOrMime('', doc.mime_type) || '.bin'}`
      const result = await dialog.showSaveDialog({
        title: 'Save Document',
        defaultPath: suggestedName,
        filters: filtersForDocument(suggestedName, doc.mime_type)
      })
      if (result.canceled || !result.filePath) return { success: false, canceled: true }

      const savePath = ensureExtension(result.filePath, suggestedName, doc.mime_type)
      const userDataPath = app.getPath('userData')
      const docPath = join(userDataPath, 'od-ims-docs', doc.stored_name)
      if (!existsSync(docPath)) return { success: false, error: 'Encrypted file missing on disk' }

      const decrypted = decryptFile(docPath, DOC_KEY)
      writeFileSync(savePath, decrypted)

      writeAuditLog({
        action: 'DOCUMENT_DOWNLOAD',
        entityId: docId,
        userId,
        details: `Downloaded ${doc.original_name} as ${basename(savePath)}`
      })
      return { success: true, path: savePath }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })
}
