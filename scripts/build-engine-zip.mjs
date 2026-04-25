#!/usr/bin/env node
// Build a clean engine.zip for distribution to Cowork / ChatGPT Project users.
//
// The zip mirrors engine/ as it should appear in a CEO's workspace —
// no .DS_Store, no macOS resource forks, no internal files. Run via
// `npm run build:engine-zip`. Output: dist/engine.zip.

import { mkdir, rm, stat } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const PACKAGE_ROOT = path.resolve(path.dirname(__filename), '..')
const ENGINE_DIR = path.join(PACKAGE_ROOT, 'engine')
const DIST_DIR = path.join(PACKAGE_ROOT, 'dist')
const OUT_PATH = path.join(DIST_DIR, 'engine.zip')

async function pathExists(p) {
  try { await stat(p); return true } catch { return false }
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', ...opts })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${cmd} exited with code ${code}`))
    })
  })
}

async function main() {
  if (!(await pathExists(ENGINE_DIR))) {
    throw new Error(`engine/ not found at ${ENGINE_DIR}`)
  }

  await mkdir(DIST_DIR, { recursive: true })
  await rm(OUT_PATH, { force: true })

  // -r recursive, -X strip extra file attributes (no resource forks),
  // -x exclude patterns. Run from PACKAGE_ROOT so paths inside the zip
  // are rooted at engine/.
  const excludes = [
    'engine/.DS_Store',
    'engine/**/.DS_Store',
    'engine/**/__MACOSX/*',
    'engine/**/._*'
  ]

  await run(
    'zip',
    ['-rX', OUT_PATH, 'engine', ...excludes.flatMap((p) => ['-x', p])],
    { cwd: PACKAGE_ROOT }
  )

  const stats = await stat(OUT_PATH)
  process.stdout.write(`[build-engine-zip] Wrote ${OUT_PATH} (${stats.size} bytes)\n`)
}

main().catch((err) => {
  process.stderr.write(`[build-engine-zip] ${err.message}\n`)
  process.exit(1)
})
