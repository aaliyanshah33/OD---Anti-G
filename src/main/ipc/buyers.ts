import { app, dialog, ipcMain } from 'electron'
import { getDb } from '../db/database'
import { writeAuditLog } from '../services/audit'
import { v4 as uuidv4 } from 'uuid'
import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { join, extname } from 'path'

function copyBuyerAttachment(sourcePath: string, kind: 'photo' | 'id'): string {
  const userDataPath = app.getPath('userData')
  const destDir = join(userDataPath, 'od-ims-buyer-docs')
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true })
  const fileExt = extname(sourcePath) || '.jpg'
  const storedName = `${kind}-${uuidv4()}${fileExt}`
  const destPath = join(destDir, storedName)
  copyFileSync(sourcePath, destPath)
  return destPath
}

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

  ipcMain.handle('buyers:selectAttachment', async (_, kind: 'photo' | 'id' = 'photo') => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        {
          name: kind === 'id' ? 'CNIC / Passport Front' : 'Buyer Photo',
          extensions: ['jpg', 'jpeg', 'png', 'webp', 'pdf']
        }
      ]
    })
    if (result.canceled || !result.filePaths.length) {
      return { success: false }
    }
    return { success: true, path: result.filePaths[0] }
  })

  ipcMain.handle('buyers:create', (_, data) => {
    const id = uuidv4()
    try {
      if (!data.photoPath) {
        return { success: false, error: 'Buyer photo is required' }
      }
      if (!data.idDocumentPath) {
        return { success: false, error: 'CNIC / Passport front attachment is required' }
      }

      const photoPath = copyBuyerAttachment(data.photoPath, 'photo')
      const idDocumentPath = copyBuyerAttachment(data.idDocumentPath, 'id')

      getDb().prepare(`
        INSERT INTO buyers (
          id, full_name, father_husband_name, cnic, phone_primary, phone_secondary,
          email, address, city, photo_path, id_document_path, notes, created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        data.fullName,
        data.fatherHusbandName,
        data.cnic,
        data.phonePrimary,
        data.phoneSecondary,
        data.email,
        data.address,
        data.city,
        photoPath,
        idDocumentPath,
        data.notes,
        data.userId
      )
      writeAuditLog({ action: 'BUYER_CREATE', entityId: id, userId: data.userId, details: `Created buyer ${data.fullName}` })
      return { success: true, id }
    } catch (err: any) {
      if (err.message.includes('UNIQUE constraint failed: buyers.cnic')) {
        return { success: false, error: 'A buyer with this CNIC already exists' }
      }
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('buyers:update', (_, { id, data, userId }) => {
    try {
      const existing = getDb().prepare('SELECT photo_path, id_document_path FROM buyers WHERE id = ?').get(id) as any
      if (!existing) return { success: false, error: 'Buyer not found' }

      let photoPath = existing.photo_path
      let idDocumentPath = existing.id_document_path

      if (data.photoPath && data.photoPath !== existing.photo_path) {
        photoPath = copyBuyerAttachment(data.photoPath, 'photo')
      }
      if (data.idDocumentPath && data.idDocumentPath !== existing.id_document_path) {
        idDocumentPath = copyBuyerAttachment(data.idDocumentPath, 'id')
      }

      getDb().prepare(`
        UPDATE buyers SET
          full_name = ?, father_husband_name = ?, cnic = ?, phone_primary = ?, phone_secondary = ?,
          email = ?, address = ?, city = ?, photo_path = ?, id_document_path = ?, notes = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).run(
        data.fullName,
        data.fatherHusbandName,
        data.cnic,
        data.phonePrimary,
        data.phoneSecondary,
        data.email,
        data.address,
        data.city,
        photoPath,
        idDocumentPath,
        data.notes,
        id
      )
      writeAuditLog({ action: 'BUYER_UPDATE', entityId: id, userId, details: `Updated buyer ${data.fullName}` })
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })
}
