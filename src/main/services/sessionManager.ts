import { getDb } from '../db/database'
import { encryptBuffer, decryptBuffer, deriveKeyFromMasterPassword } from './crypto'
import { v4 as uuidv4 } from 'uuid'

export interface PersistentSession {
  sessionId: string
  userId: string
  username: string
  role: string
  expiresAt: number
}

/**
 * Stores an encrypted session for master user
 */
export async function storeEncryptedSession(
  userId: string,
  username: string,
  role: string,
  masterPassword: string
): Promise<string> {
  try {
    const sessionId = uuidv4()
    const db = getDb()
    
    const encryptionKey = await deriveKeyFromMasterPassword(masterPassword)
    const sessionData = JSON.stringify({
      userId,
      username,
      role,
      timestamp: Date.now(),
      sessionId
    })
    
    const encryptedData = encryptBuffer(Buffer.from(sessionData), encryptionKey).toString('base64')
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    
    db.prepare(`
      INSERT INTO encrypted_sessions (session_id, user_id, encrypted_data, expires_at, is_valid)
      VALUES (?, ?, ?, ?, 1)
    `).run(sessionId, userId, encryptedData, expiresAt)
    
    return sessionId
  } catch (err) {
    console.error('[SessionManager] Failed to store encrypted session:', err)
    throw err
  }
}

/**
 * Retrieves and decrypts a persistent session
 */
export async function getEncryptedSession(
  sessionId: string,
  masterPassword: string
): Promise<PersistentSession | null> {
  try {
    const db = getDb()
    const session = db.prepare(`
      SELECT * FROM encrypted_sessions
      WHERE session_id = ? AND is_valid = 1 AND expires_at > datetime('now')
    `).get(sessionId) as any
    
    if (!session) return null
    
    const encryptionKey = await deriveKeyFromMasterPassword(masterPassword)
    const decryptedBuffer = decryptBuffer(Buffer.from(session.encrypted_data, 'base64'), encryptionKey)
    const sessionData = JSON.parse(decryptedBuffer.toString('utf-8'))
    
    return {
      sessionId: sessionData.sessionId,
      userId: sessionData.userId,
      username: sessionData.username,
      role: sessionData.role,
      expiresAt: sessionData.timestamp + 30 * 60 * 1000
    }
  } catch (err) {
    console.error('[SessionManager] Failed to retrieve encrypted session:', err)
    return null
  }
}

/**
 * Invalidates a persistent session
 */
export function invalidateSession(sessionId: string): void {
  try {
    const db = getDb()
    db.prepare('UPDATE encrypted_sessions SET is_valid = 0 WHERE session_id = ?').run(sessionId)
  } catch (err) {
    console.error('[SessionManager] Failed to invalidate session:', err)
  }
}

/**
 * Cleanup expired sessions
 */
export function cleanupExpiredSessions(): void {
  try {
    const db = getDb()
    db.prepare('DELETE FROM encrypted_sessions WHERE expires_at < datetime(\'now\')').run()
  } catch (err) {
    console.error('[SessionManager] Failed to cleanup expired sessions:', err)
  }
}
