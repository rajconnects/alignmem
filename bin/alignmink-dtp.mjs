#!/usr/bin/env node
// alignmink-dtp — CLI entry point.
//
// Routes argv to subcommand handlers. v0.1 implements `start`; other
// commands stub with a coming-soon message so users discover the
// surface without surprise. Help and version always work.

import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { readFileSync } from 'node:fs'
import { startCommand } from './commands/start.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PACKAGE_ROOT = path.resolve(__dirname, '..')

function readPackageJson() {
  const raw = readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8')
  return JSON.parse(raw)
}

function printHelp() {
  const pkg = readPackageJson()
  process.stdout.write(`alignmink-dtp ${pkg.version} — Decision Journal CLI

Usage:
  alignmink-dtp <command> [options]

Commands:
  start [--port N] [--no-open]    Launch the Decision Journal reader (default: port 3000)
  install-skills                  (coming soon) Install capture skills into Claude Code
  import <file|folder>            (coming soon) Import DTP traces from disk
  capture                         (coming soon) Interactive non-AI capture wizard
  migrate                         (coming soon) Convert pre-v0.1 traces to DTP v0.1
  doctor                          (coming soon) Diagnose install issues
  eject                           (coming soon) Remove skills, daemon; preserve traces

Options:
  --version, -v                   Print package and protocol versions
  --help, -h                      Show this help

Documentation:
  https://github.com/rajconnects/alignmink-dtp
  https://alignmink.ai/decision-protocol
`)
}

function printVersion() {
  const pkg = readPackageJson()
  // Protocol version is independent of package version; track here until
  // wired into a generated metadata file.
  const protocolVersion = '0.1.0'
  process.stdout.write(`alignmink-dtp ${pkg.version} (DTP ${protocolVersion})\n`)
}

function unknownCommand(name) {
  process.stderr.write(`alignmink-dtp: unknown command '${name}'\n`)
  process.stderr.write(`Run 'alignmink-dtp --help' to see available commands.\n`)
  process.exit(1)
}

function comingSoon(name) {
  process.stderr.write(`alignmink-dtp ${name}: coming soon in a later v0.1.x release.\n`)
  process.stderr.write(`Track progress: https://github.com/rajconnects/alignmink-dtp\n`)
  process.exit(2)
}

async function main(argv) {
  const args = argv.slice(2)
  const first = args[0]

  if (first === undefined || first === '--help' || first === '-h' || first === 'help') {
    printHelp()
    return
  }
  if (first === '--version' || first === '-v' || first === 'version') {
    printVersion()
    return
  }

  switch (first) {
    case 'start':
      await startCommand({ args: args.slice(1), packageRoot: PACKAGE_ROOT })
      return
    case 'install-skills':
    case 'import':
    case 'capture':
    case 'migrate':
    case 'doctor':
    case 'eject':
      comingSoon(first)
      return
    default:
      unknownCommand(first)
  }
}

main(process.argv).catch((err) => {
  const msg = err instanceof Error ? err.message : String(err)
  process.stderr.write(`alignmink-dtp: ${msg}\n`)
  process.exit(1)
})
