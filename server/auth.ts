import type { NextFunction, Request, Response } from 'express'
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto'
import { readPasscodeHash, writePasscodeHash } from './storage.js'

// Single-passcode auth:
// - first-run: /api/auth/setup writes a scrypt hash to disk
// - subsequent runs: /api/auth/login compares against the stored hash
// - sessions are signed cookies; 30-day expiry
// - env var PASSCODE overrides the file (useful for CI or resetting)
//
// Scrypt is Node-stdlib — no native compile, no `node-gyp`, no bcrypt.
// Stored format: `scrypt:<N>:<r>:<p>:<salt-hex>:<derived-hex>`. The
// parameters are written so a future increase stays verifiable for
// existing hashes.

const SCRYPT_N = 16384 // 2^14, CPU/memory cost
const SCRYPT_R = 8
const SCRYPT_P = 1
const SCRYPT_KEYLEN = 64
const SCRYPT_SALT_LEN = 16

const SESSION_COOKIE = 'decision_journal_session'
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export const SESSION_COOKIE_NAME = SESSION_COOKIE
export const SESSION_MAX_AGE = SESSION_MAX_AGE_MS

export async function hashPasscode(passcode: string): Promise<string> {
  const salt = randomBytes(SCRYPT_SALT_LEN)
  const derived = scryptSync(passcode, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P
  })
  return `scrypt:${SCRYPT_N}:${SCRYPT_R}:${SCRYPT_P}:${salt.toString('hex')}:${derived.toString('hex')}`
}

export async function verifyPasscode(passcode: string): Promise<boolean> {
  if (process.env.PASSCODE) {
    return passcode === process.env.PASSCODE
  }
  const stored = await readPasscodeHash()
  if (!stored) return false
  // Legacy bcrypt hashes (starting with $2) are no longer supported in
  // v0.1. User resets via /api/auth/setup (delete ~/.alignmem-reader/.passcode
  // or future /api/auth/reset endpoint).
  if (!stored.startsWith('scrypt:')) return false
  const parts = stored.split(':')
  if (parts.length !== 6) return false
  const [, nStr, rStr, pStr, saltHex, derivedHex] = parts
  const N = Number.parseInt(nStr, 10)
  const r = Number.parseInt(rStr, 10)
  const p = Number.parseInt(pStr, 10)
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false
  try {
    const salt = Buffer.from(saltHex, 'hex')
    const storedBuf = Buffer.from(derivedHex, 'hex')
    const derived = scryptSync(passcode, salt, storedBuf.length, { N, r, p })
    return derived.length === storedBuf.length && timingSafeEqual(derived, storedBuf)
  } catch {
    return false
  }
}

export async function isFirstRun(): Promise<boolean> {
  if (process.env.PASSCODE) return false
  const stored = await readPasscodeHash()
  return stored == null || stored.trim().length === 0
}

export async function setupPasscode(passcode: string): Promise<void> {
  if (passcode.length < 6) {
    throw new Error('Passcode must be at least 6 characters')
  }
  const hash = await hashPasscode(passcode)
  await writePasscodeHash(hash)
}

// Express middleware — requires a valid signed session cookie on every
// endpoint except the /api/auth/* routes.
export function requireSession(req: Request, res: Response, next: NextFunction): void {
  const session = req.signedCookies?.[SESSION_COOKIE]
  if (session === 'ok') {
    next()
    return
  }
  res.status(401).json({ success: false, error: 'unauthenticated' })
}

export function issueSessionCookie(res: Response): void {
  res.cookie(SESSION_COOKIE, 'ok', {
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // localhost only
    signed: true,
    maxAge: SESSION_MAX_AGE_MS,
    path: '/'
  })
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: '/' })
}
