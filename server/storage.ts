import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'

// Small filesystem abstraction for the reader's state directory.
// Defaults to ~/.alignmem-reader; overridable via $ALIGNMEM_HOME for tests.
// Stored files:
//   - .passcode         scrypt hash of the unlock passcode (v0.1+)
//   - cookie-secret     random 32-byte hex, used to sign session cookies
//   - projects.json     list of { name, path, last_seen, trace_count }

export interface ProjectEntry {
  name: string
  path: string
  last_seen: string
  trace_count?: number
}

export function getHomeDir(): string {
  return process.env.ALIGNMEM_HOME || path.join(os.homedir(), '.alignmem-reader')
}

export async function ensureHome(): Promise<string> {
  const dir = getHomeDir()
  await fs.mkdir(dir, { recursive: true })
  return dir
}

async function readTextFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf8')
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return null
    throw err
  }
}

// ── Passcode ─────────────────────────────────────────────
const PASSCODE_FILE = '.passcode'

export async function readPasscodeHash(): Promise<string | null> {
  const dir = await ensureHome()
  return readTextFile(path.join(dir, PASSCODE_FILE))
}

export async function writePasscodeHash(hash: string): Promise<void> {
  const dir = await ensureHome()
  await fs.writeFile(path.join(dir, PASSCODE_FILE), hash, { mode: 0o600 })
}

// ── Cookie secret ────────────────────────────────────────
const COOKIE_SECRET_FILE = 'cookie-secret'

export async function getCookieSecret(): Promise<string> {
  if (process.env.COOKIE_SECRET) return process.env.COOKIE_SECRET
  const dir = await ensureHome()
  const filePath = path.join(dir, COOKIE_SECRET_FILE)
  const existing = await readTextFile(filePath)
  if (existing && existing.trim().length > 0) return existing.trim()
  const secret = crypto.randomBytes(32).toString('hex')
  await fs.writeFile(filePath, secret, { mode: 0o600 })
  return secret
}

// ── Projects ─────────────────────────────────────────────
const PROJECTS_FILE = 'projects.json'

export async function readProjects(): Promise<ProjectEntry[]> {
  const dir = await ensureHome()
  const raw = await readTextFile(path.join(dir, PROJECTS_FILE))
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (p): p is ProjectEntry =>
        p != null && typeof p === 'object' && typeof p.name === 'string' && typeof p.path === 'string'
    )
  } catch {
    return []
  }
}

export async function writeProjects(projects: readonly ProjectEntry[]): Promise<void> {
  const dir = await ensureHome()
  await fs.writeFile(
    path.join(dir, PROJECTS_FILE),
    JSON.stringify(projects, null, 2),
    { mode: 0o600 }
  )
}

export async function upsertProject(entry: ProjectEntry): Promise<ProjectEntry[]> {
  const existing = await readProjects()
  const filtered = existing.filter((p) => p.path !== entry.path)
  const next: ProjectEntry[] = [entry, ...filtered]
  await writeProjects(next)
  return next
}

export async function findProjectByName(name: string): Promise<ProjectEntry | null> {
  const projects = await readProjects()
  return projects.find((p) => p.name === name) ?? null
}

// ── Local trace store ────────────────────────────────────
// Traces are never read from the (potentially cloud-synced) source directory.
// Instead, they are copied to ~/.alignmem-reader/traces/<projectName>/
// and the indexer reads from there.

const IMPORT_TIMEOUT_MS = 5_000

export function getTracesDir(projectName: string): string {
  return path.join(getHomeDir(), 'traces', projectName)
}

export async function ensureTracesDir(projectName: string): Promise<string> {
  const dir = getTracesDir(projectName)
  await fs.mkdir(dir, { recursive: true })
  return dir
}

export async function importTrace(sourcePath: string, projectName: string): Promise<void> {
  const fileName = path.basename(sourcePath)
  const destDir = await ensureTracesDir(projectName)
  const destPath = path.join(destDir, fileName)

  let contents: string
  try {
    contents = await Promise.race([
      fs.readFile(sourcePath, 'utf8'),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`timeout reading ${fileName}`)), IMPORT_TIMEOUT_MS)
      )
    ])
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    // eslint-disable-next-line no-console
    console.warn(`[storage] importTrace skipped ${fileName}: ${msg}`)
    return
  }

  await fs.writeFile(destPath, contents, { mode: 0o600 })
}

export async function importAllTraces(
  projectRoot: string,
  projectName: string
): Promise<{ imported: number; failed: number }> {
  const threadsDir = path.join(projectRoot, 'alignmink-traces', 'threads')

  let entries: string[]
  try {
    entries = await fs.readdir(threadsDir)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    // eslint-disable-next-line no-console
    console.warn(`[storage] importAllTraces could not read ${threadsDir}: ${msg}`)
    return { imported: 0, failed: 0 }
  }

  const jsonFiles = entries.filter((f) => f.toLowerCase().endsWith('.json'))

  let imported = 0
  let failed = 0

  await Promise.allSettled(
    jsonFiles.map(async (fileName) => {
      const sourcePath = path.join(threadsDir, fileName)
      const destDir = await ensureTracesDir(projectName)
      const destPath = path.join(destDir, fileName)

      let contents: string
      try {
        contents = await Promise.race([
          fs.readFile(sourcePath, 'utf8'),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`timeout reading ${fileName}`)),
              IMPORT_TIMEOUT_MS
            )
          )
        ])
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        // eslint-disable-next-line no-console
        console.warn(`[storage] importAllTraces skipped ${fileName}: ${msg}`)
        failed++
        return
      }

      await fs.writeFile(destPath, contents, { mode: 0o600 })
      imported++
    })
  )

  return { imported, failed }
}

export async function removeLocalTrace(fileName: string, projectName: string): Promise<void> {
  const filePath = path.join(getTracesDir(projectName), fileName)
  try {
    await fs.unlink(filePath)
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return
    throw err
  }
}

// ── Path validation ──────────────────────────────────────
// Accepts three natural shapes the user might paste:
//   (a) <root>                        where <root>/alignmink-traces/threads exists
//   (b) <root>/alignmink-traces       where ./threads exists
//   (c) <root>/alignmink-traces/threads  (the leaf itself)
// Returns the resolved project root in all three cases so callers can
// persist a single canonical path shape regardless of how the user got here.
export async function validateProjectPath(projectPath: string): Promise<{
  valid: boolean
  reason?: string
  resolvedRoot?: string
  threadsPath?: string
}> {
  const normalized = path.resolve(projectPath)
  const candidates: Array<{ root: string; threads: string }> = [
    { root: normalized, threads: path.join(normalized, 'alignmink-traces', 'threads') },
    { root: path.dirname(normalized), threads: path.join(normalized, 'threads') },
    { root: path.dirname(path.dirname(normalized)), threads: normalized }
  ]
  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate.threads)
      if (stat.isDirectory()) {
        return { valid: true, resolvedRoot: candidate.root, threadsPath: candidate.threads }
      }
    } catch {
      // try the next candidate
    }
  }
  return {
    valid: false,
    reason:
      'No alignmink-traces/threads/ folder found. Point at the project root, the alignmink-traces folder, or the threads folder itself.'
  }
}
