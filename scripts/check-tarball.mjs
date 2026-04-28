#!/usr/bin/env node
// Pre-publish guard. Runs `npm pack --dry-run --json` and verifies that
// every file referenced from package.json (bin entries, postinstall hook)
// is actually present in the tarball.
//
// Why: 0.3.0 shipped with a postinstall hook that pointed at
// scripts/postinstall-hint.mjs, but `scripts/` was not in the `files`
// allowlist. Every consumer install crashed with MODULE_NOT_FOUND.
// One `npm pack --dry-run` would have caught it.

import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))

let raw
try {
  raw = execSync('npm pack --dry-run --json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
} catch (err) {
  console.error('[check-tarball] `npm pack --dry-run` failed:', err.message)
  process.exit(1)
}

let result
try {
  result = JSON.parse(raw)
} catch {
  console.error('[check-tarball] could not parse `npm pack --json` output')
  process.exit(1)
}

const filesInTarball = new Set(
  (result[0]?.files ?? []).map((f) => f.path)
)

const required = []

// bin entries (e.g. "alignmink-dtp": "bin/alignmink-dtp.mjs")
if (pkg.bin && typeof pkg.bin === 'object') {
  for (const target of Object.values(pkg.bin)) {
    required.push({ path: target, reason: 'bin' })
  }
}

// Lifecycle scripts that run on the consumer's machine. Extract any
// path-like token (foo/bar.mjs) so we don't have to maintain a hand
// list. preinstall/install/postinstall all run during `npm install`.
for (const hook of ['preinstall', 'install', 'postinstall']) {
  const cmd = pkg.scripts?.[hook]
  if (!cmd) continue
  const matches = cmd.match(/[\w./-]+\.(?:m?js|cjs)/g) ?? []
  for (const m of matches) {
    required.push({ path: m, reason: `scripts.${hook}` })
  }
}

const missing = required.filter((r) => !filesInTarball.has(r.path))

if (missing.length > 0) {
  console.error(`\n[check-tarball] FAIL — files referenced from package.json are NOT in the tarball:\n`)
  for (const m of missing) {
    console.error(`  ${m.path}   (referenced by ${m.reason})`)
  }
  console.error(`\nFix: add the parent directory to the "files" allowlist in package.json.\n`)
  console.error(`See https://docs.npmjs.com/cli/v10/configuring-npm/package-json#files\n`)
  process.exit(1)
}

console.log(`[check-tarball] ${required.length} required file(s) present in tarball.`)
