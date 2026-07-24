import { ipcMain } from 'electron'
import { getDb, setMasterPasswordHash, isFirstRun } from '../db/database'
import { hashChain, hashPasswordArgon2, verifyPasswordArgon2, deriveKeyFromMasterPassword, encryptBuffer, decryptBuffer } from '../services/crypto'
import { writeAuditLog } from '../services/audit'
import { validatePasswordStrength } from '../../shared/passwordPolicy'
import { v4 as uuidv4 } from 'uuid'

const activeSessions = new Map<string, { userId: string; role: string; expiresAt: number }>()
const SESSION_TTL_MS = 30 * 60 * 1000

function createSession(userId: string, role: string): string {
  const sessionId = uuidv4()
  activeSessions.set(sessionId, { userId, role, expiresAt: Date.now() + SESSION_TTL_MS })
  return sessionId
}

export function registerAuthHandlers(): void {
  ipcMain.handle('auth:isFirstRun', () => isFirstRun())

  ipcMain.handle('auth:setupMaster', async (_, { username, password, fullName }) => {
    try {
      if (!isFirstRun()) return { success: false, error: 'Master account already exists' }

      const passwordCheck = validatePasswordStrength(password)
      if (!passwordCheck.valid) return { success: false, error: passwordCheck.error }

      const db = getDb()
      const id = uuidv4()
      
      // Hash password with Argon2 (replaces SHA-256)
      const passwordHash = await hashPasswordArgon2(password)
      
      db.prepare(`INSERT INTO users (id, username, password_hash, role, full_name) VALUES (?, ?, ?, 'master', ?)`).run(id, username, passwordHash, fullName)
      
      // Store master password hash for encryption key derivation
      db.prepare(`UPDATE security SET master_password_hash = ? WHERE id = 'main'`).run(passwordHash)
      
      db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('setup_complete', 'true')`).run()
      db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('company_name', 'Optional Developers')`).run()
      db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('encryption_enabled', 'true')`).run()
      
      setMasterPasswordHash(passwordHash)
      
      writeAuditLog({ action: 'USER_CREATE', entityId: id, details: 'Master account created with Argon2 hashing' })
      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Setup failed' }
    }
  })

  ipcMain.handle('auth:login', async (_, { username, password }) => {
    try {
      const db = getDb()
      const user = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username) as any
      if (!user) {
        writeAuditLog({ action: 'LOGIN_FAILED', details: `Failed login for: ${username}` })
        return { success: false, error: 'Invalid username or password' }
      }
      
      // Verify with Argon2 (replaces SHA-256 verification)
      const passwordValid = await verifyPasswordArgon2(password, user.password_hash)
      if (!passwordValid) {
        writeAuditLog({ action: 'LOGIN_FAILED', details: `Failed login for: ${username}` })
        return { success: false, error: 'Invalid username or password' }
      }
      
      const sessionId = createSession(user.id, user.role)
      db.prepare('UPDATE users SET last_login = datetime(\'now\') WHERE id = ?').run(user.id)
      
      // Store encrypted persistent session
      if (user.role === 'master') {
        try {
          const masterPassword = password // Use login password temporarily
          const encryptionKey = await deriveKeyFromMasterPassword(masterPassword)
          const sessionData = JSON.stringify({
            userId: user.id,
            username: user.username,
            role: user.role,
            timestamp: Date.now()
          })
          const encryptedData = encryptBuffer(Buffer.from(sessionData), encryptionKey).toString('base64')
          
          db.prepare(`INSERT INTO encrypted_sessions (session_id, user_id, encrypted_data, expires_at) VALUES (?, ?, ?, datetime('now', '+30 minutes'))`).run(sessionId, user.id, encryptedData)
        } catch (err) {
          console.warn('[Auth] Could not create persistent session:', err)
        }
      }
      
      writeAuditLog({ action: 'LOGIN', userId: user.id, details: 'User logged in successfully' })
      return { success: true, session: sessionId, user: { id: user.id, username: user.username, role: user.role, fullName: user.full_name } }
    } catch (err: unknown) {
      return { success: false, error: 'Login error' }
    }
  })

  ipcMain.handle('auth:logout', (_, sessionId: string) => {
    const session = activeSessions.get(sessionId)
    if (session) {
      activeSessions.delete(sessionId)
      
      // Invalidate persistent session
      try {
        const db = getDb()
        db.prepare('UPDATE encrypted_sessions SET is_valid = 0 WHERE session_id = ?').run(sessionId)
      } catch (err) {
        console.warn('[Auth] Could not invalidate persistent session:', err)
      }
      
      writeAuditLog({ action: 'LOGOUT', userId: session.userId, details: 'User logged out' })
    }
    return { success: true }
  })

  ipcMain.handle('auth:validateSession', (_, sessionId: string) => {
    const session = activeSessions.get(sessionId)
    if (!session || Date.now() > session.expiresAt) {
      activeSessions.delete(sessionId)
      return { valid: false }
    }
    session.expiresAt = Date.now() + SESSION_TTL_MS
    return { valid: true }
  })

  ipcMain.handle('auth:verifyMasterPassword', async (_, password: string) => {
    try {
      const db = getDb()
      const master = db.prepare('SELECT password_hash FROM users WHERE role = ?').get('master') as any
      if (!master) return { valid: false }
      
      // Verify with Argon2
      const valid = await verifyPasswordArgon2(password, master.password_hash)
      return { valid }
    } catch {
      return { valid: false }
    }
  })

  ipcMain.handle('auth:getUsers', () => {
    try {
      return getDb().prepare('SELECT id, username, full_name, role, is_active, last_login FROM users ORDER BY created_at DESC').all()
    } catch { return [] }
  })

  ipcMain.handle('auth:createUser', async (_, data) => {
    try {
      const passwordCheck = validatePasswordStrength(data.password)
      if (!passwordCheck.valid) return { success: false, error: passwordCheck.error }

      const id = uuidv4()
      // Hash with Argon2
      const passwordHash = await hashPasswordArgon2(data.password)
      getDb().prepare('INSERT INTO users (id, username, password_hash, role, full_name) VALUES (?, ?, ?, ?, ?)').run(id, data.username, passwordHash, 'staff', data.fullName)
      writeAuditLog({ action: 'USER_CREATE', entityId: id, details: `Created staff user ${data.username}` })
      return { success: true, id }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('auth:toggleUser', (_, { userId, isActive }) => {
    try {
      getDb().prepare('UPDATE users SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, userId)
      writeAuditLog({ action: 'USER_UPDATE', entityId: userId, details: `Set active state to ${isActive}` })
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('auth:changePassword', async (_, { userId, currentPassword, newPassword }) => {
    try {
      if (!userId || !currentPassword || !newPassword) {
        return { success: false, error: 'All password fields are required' }
      }

      const passwordCheck = validatePasswordStrength(newPassword)
      if (!passwordCheck.valid) {
        return { success: false, error: passwordCheck.error }
      }

      if (currentPassword === newPassword) {
        return { success: false, error: 'New password must be different from the current password' }
      }

      const db = getDb()
      const user = db.prepare('SELECT id, username, role, password_hash FROM users WHERE id = ? AND is_active = 1').get(userId) as any
      if (!user) return { success: false, error: 'User not found' }

      const currentValid = await verifyPasswordArgon2(currentPassword, user.password_hash)
      if (!currentValid) {
        writeAuditLog({
          action: 'PASSWORD_CHANGE_FAILED',
          userId: user.id,
          details: `Failed password change attempt for ${user.username} — incorrect current password`
        })
        return { success: false, error: 'Current password is incorrect' }
      }

      const newHash = await hashPasswordArgon2(newPassword)
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, user.id)

      // Keep master encryption hash in sync when the master account changes password
      if (user.role === 'master') {
        db.prepare(`UPDATE security SET master_password_hash = ?, last_password_change = datetime('now') WHERE id = 'main'`).run(newHash)
        setMasterPasswordHash(newHash)
      }

      writeAuditLog({
        action: 'PASSWORD_CHANGE',
        userId: user.id,
        details: `Password changed successfully for ${user.username}`
      })
      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Password change failed' }
    }
  })
}
