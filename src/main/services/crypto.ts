import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash } from 'crypto'
import { readFileSync, writeFileSync } from 'fs'
import argon2 from 'argon2'

const ALGORITHM = 'aes-256-gcm'
const KEY_LEN = 32
const IV_LEN = 16
const AUTH_TAG_LEN = 16
const SALT = 'od-ims-v1-salt-2026'

// Argon2 password hashing (replaces SHA-256 iterations)
export async function hashPasswordArgon2(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
    saltLength: 16
  })
}

export async function verifyPasswordArgon2(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password)
  } catch {
    return false
  }
}

export function deriveKey(password: string): Buffer {
  return scryptSync(password, SALT, KEY_LEN)
}

// Derive encryption key from master password using Argon2
export async function deriveKeyFromMasterPassword(masterPassword: string): Promise<Buffer> {
  const hash = await argon2.hash(masterPassword, {
    type: argon2.argon2id,
    memoryCost: 65540,
    timeCost: 3,
    parallelism: 4,
    saltLength: 32
  })
  // Use first 32 bytes of hash as encryption key
  return Buffer.from(hash.slice(0, 32), 'utf-8').slice(0, 32)
}

export function encryptBuffer(data: Buffer, key: Buffer): Buffer {
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()])
  const authTag = cipher.getAuthTag()
  // Format: iv(16) + authTag(16) + encrypted
  return Buffer.concat([iv, authTag, encrypted])
}

export function decryptBuffer(data: Buffer, key: Buffer): Buffer {
  const iv = data.subarray(0, IV_LEN)
  const authTag = data.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN)
  const encrypted = data.subarray(IV_LEN + AUTH_TAG_LEN)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()])
}

export function encryptFile(inputPath: string, outputPath: string, key: Buffer): void {
  const data = readFileSync(inputPath)
  const encrypted = encryptBuffer(data, key)
  writeFileSync(outputPath, encrypted)
}

export function decryptFile(inputPath: string, key: Buffer): Buffer {
  const data = readFileSync(inputPath)
  return decryptBuffer(data, key)
}

export function hashString(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

export function hashChain(data: string, prevHash: string): string {
  return createHash('sha256').update(data + prevHash).digest('hex')
}
