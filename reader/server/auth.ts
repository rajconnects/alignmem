import type { NextFunction, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { readPasscodeHash, writePasscodeHash } from './storage.js'

// Single-passcode auth:
// - first-run: /api/auth/setup writes a bcrypt hash to disk
// - subsequent runs: /api/auth/login compares against the stored hash
// - sessions are signed cookies; 30-day expiry
// - env var PASSCODE overrides the file (useful for CI or resetting)

const SALT_ROUNDS = 12
const SESSION_COOKIE = 'alignmem_session'
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export const SESSION_COOKIE_NAME = SESSION_COOKIE
export const SESSION_MAX_AGE = SESSION_MAX_AGE_MS

export async function hashPasscode(passcode: string): Promise<string> {
  return bcrypt.hash(passcode, SALT_ROUNDS)
}

export async function verifyPasscode(passcode: string): Promise<boolean> {
  if (process.env.PASSCODE) {
    return passcode === process.env.PASSCODE
  }
  const stored = await readPasscodeHash()
  if (!stored) return false
  try {
    return await bcrypt.compare(passcode, stored)
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
