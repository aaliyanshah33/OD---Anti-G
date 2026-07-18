import { getDb } from '../db/database'
import { encryptFile, decryptFile, deriveKeyFromMasterPassword } from './crypto'
import { v4 as uuidv4 } from 'uuid'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { createReadStream, createWriteStream } from 'fs'
import { createHash } from 'crypto'

/**
 * Creates an encrypted backup of the entire database
 * Uses master password to derive encryption key
 */
export async function createEncryptedBackup(
  backupDir: string,
  userId: string,
  masterPassword: string
): Promise<{ backupId: string; backupPath: string; checksum: string }> {
  try {
    const db = getDb()
    const backupId = uuidv4()
    
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true })
    }
    
    // Get database path
    const dbPath = db.exec('PRAGMA database_list')[0]?.file || 'ims.db'
    
    // Create backup filename
    const backupPath = join(backupDir, `backup_${backupId}_${Date.now()}.db.enc`)
    
    // Derive encryption key from master password
    const encryptionKey = await deriveKeyFromMasterPassword(masterPassword)
    
    // Encrypt the database file
    encryptFile(dbPath, backupPath, encryptionKey)
    
    // Calculate checksum
    const fileData = readFileSync(backupPath)
    const checksum = createHash('sha256').update(fileData).digest('hex')
    
    // Store backup metadata
    db.prepare(`
      INSERT INTO backup_metadata (id, backup_path, backup_size, is_encrypted, checksum, created_by, encryption_algorithm)
      VALUES (?, ?, ?, 1, ?, ?, 'aes-256-gcm')
    `).run(backupId, backupPath, fileData.length, checksum, userId)
    
    console.log('[Backup] Created encrypted backup:', backupPath)
    
    return { backupId, backupPath, checksum }
  } catch (err) {
    console.error('[Backup] Failed to create backup:', err)
    throw err
  }
}

/**
 * Restores database from encrypted backup
 */
export async function restoreFromEncryptedBackup(
  backupPath: string,
  masterPassword: string
): Promise<boolean> {
  try {
    if (!existsSync(backupPath)) {
      throw new Error('Backup file not found')
    }
    
    // Derive encryption key from master password
    const encryptionKey = await deriveKeyFromMasterPassword(masterPassword)
    
    // Create a temporary restore location
    const restoreDir = join(require('path').dirname(backupPath), 'restore_temp')
    if (!existsSync(restoreDir)) {
      mkdirSync(restoreDir, { recursive: true })
    }
    
    const restorePath = join(restoreDir, 'ims_restore.db')
    
    // Decrypt the backup
    const decryptedData = decryptFile(backupPath, encryptionKey)
    writeFileSync(restorePath, decryptedData)
    
    console.log('[Backup] Restored backup to:', restorePath)
    
    return true
  } catch (err) {
    console.error('[Backup] Failed to restore backup:', err)
    throw err
  }
}

/**
 * Exports backup to USB with encryption metadata
 */
export async function exportBackupToUsb(
  backupPath: string,
  usbPath: string,
  userId: string,
  masterPassword: string
): Promise<boolean> {
  try {
    const db = getDb()
    const backupId = uuidv4()
    
    if (!existsSync(usbPath)) {
      mkdirSync(usbPath, { recursive: true })
    }
    
    // Create export structure
    const exportDir = join(usbPath, `od-ims-backup-${Date.now()}`)
    mkdirSync(exportDir, { recursive: true })
    
    // Copy encrypted backup
    const exportedPath = join(exportDir, 'database.db.enc')
    const backupData = readFileSync(backupPath)
    writeFileSync(exportedPath, backupData)
    
    // Create metadata file
    const metadata = {
      version: 1,
      backupDate: new Date().toISOString(),
      backupId,
      encrypted: true,
      encryptionAlgorithm: 'aes-256-gcm',
      checksum: createHash('sha256').update(backupData).digest('hex'),
      exportedBy: userId
    }
    
    writeFileSync(join(exportDir, 'backup_metadata.json'), JSON.stringify(metadata, null, 2))
    
    // Store export record
    db.prepare(`
      INSERT INTO backup_metadata (id, backup_path, backup_size, is_encrypted, checksum, created_by)
      VALUES (?, ?, ?, 1, ?, ?)
    `).run(backupId, exportedPath, backupData.length, metadata.checksum, userId)
    
    console.log('[Backup] Exported backup to USB:', exportDir)
    
    return true
  } catch (err) {
    console.error('[Backup] Failed to export to USB:', err)
    throw err
  }
}
