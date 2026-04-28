#!/usr/bin/env node
// Postinstall hint. PRINTS only — never writes to ~/.claude or anywhere
// else. Silent filesystem writes from npm postinstalls are a bad pattern.
//
// We also stay quiet inside CI and inside dependency installs (i.e.,
// when alignmink-dtp is being pulled as a transitive dep, not a
// top-level global), so this never spams build logs.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

if (process.env.CI) process.exit(0)
// npm sets npm_config_global=true when the user ran `npm install -g`.
// For everything else, stay quiet — we don't want to nag users who are
// pulling alignmink-dtp as a transitive dep.
if (process.env.npm_config_global !== 'true') process.exit(0)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const pkgPath = path.join(__dirname, '..', 'package.json')

let version = ''
try {
  version = JSON.parse(readFileSync(pkgPath, 'utf8')).version
} catch {
  // best-effort hint; version is decorative here
}

const banner = '─'.repeat(60)
process.stdout.write(`\n${banner}\n`)
process.stdout.write(`alignmink-dtp ${version} installed.\n\n`)
process.stdout.write(`To activate the Claude Code skill, run:\n\n`)
process.stdout.write(`  alignmink-dtp install-skills\n\n`)
process.stdout.write(`Then check status anytime with:\n\n`)
process.stdout.write(`  alignmink-dtp doctor\n`)
process.stdout.write(`${banner}\n\n`)
