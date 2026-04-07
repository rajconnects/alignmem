import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs/promises'

// OS file-manager opener. Never shell-interpolates — always uses
// spawn with an argument array so paths containing spaces or quotes
// are passed verbatim.

export interface RevealResult {
  ok: boolean
  reason?: string
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

export async function revealInFolder(targetPath: string): Promise<RevealResult> {
  const resolved = path.resolve(targetPath)
  if (!(await exists(resolved))) {
    return { ok: false, reason: 'Path does not exist' }
  }

  const platform = os.platform()
  return new Promise<RevealResult>((resolve) => {
    try {
      let command: string
      let args: string[]
      if (platform === 'darwin') {
        command = 'open'
        args = ['-R', resolved]
      } else if (platform === 'win32') {
        command = 'explorer'
        args = ['/select,', resolved]
      } else {
        // Linux: xdg-open the containing directory (most portable fallback)
        command = 'xdg-open'
        args = [path.dirname(resolved)]
      }
      const child = spawn(command, args, { stdio: 'ignore', detached: true })
      child.on('error', (err) => {
        resolve({ ok: false, reason: err.message })
      })
      child.unref()
      // On success we don't wait for exit — just resolve.
      setTimeout(() => resolve({ ok: true }), 100)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown error'
      resolve({ ok: false, reason: msg })
    }
  })
}
