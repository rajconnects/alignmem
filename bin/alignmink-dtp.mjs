#!/usr/bin/env node
// alignmink-dtp — CLI entry point.
//
// Routes argv to subcommand handlers. Bare invocation runs `doctor` so
// the CEO sees their install state without having to know the help flag.

import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { startCommand } from './commands/start.mjs'
import { installSkillsCommand } from './commands/install-skills.mjs'
import { doctorCommand } from './commands/doctor.mjs'
import { updateCommand } from './commands/update.mjs'
import { getPackageVersion, getSkillVersion, PROTOCOL_VERSION } from './lib/versions.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PACKAGE_ROOT = path.resolve(__dirname, '..')

function printHelp() {
  const version = getPackageVersion(PACKAGE_ROOT) ?? '?'
  process.stdout.write(`alignmink-dtp ${version} — Decision Journal CLI

Usage:
  alignmink-dtp                   Show install status (same as 'doctor')
  alignmink-dtp <command> [options]

Commands:
  start [--port N] [--no-open]    Launch the Decision Journal reader (default: port 3000)
  install-skills [--target=...]   Install capture skills (claude-code | cursor | cowork | chatgpt)
  doctor                          Show package/skill/protocol versions and any fix command
  update                          Update the Claude Code skill to match the installed CLI
  import <file|folder>            (coming soon) Import DTP traces from disk
  capture                         (coming soon) Interactive non-AI capture wizard
  migrate                         (coming soon) Convert pre-v0.1 traces to DTP v0.1
  eject                           (coming soon) Remove skills, daemon; preserve traces

Options:
  --version, -v                   Print package, skill, and protocol versions
  --help, -h                      Show this help

Documentation:
  https://github.com/rajconnects/alignmink-dtp
  https://alignmink.ai/decision-protocol
`)
}

function printVersion() {
  const pkgVersion = getPackageVersion(PACKAGE_ROOT) ?? '?'
  const skillVersion = getSkillVersion(path.join(PACKAGE_ROOT, 'engine', 'SKILL.md')) ?? '?'
  process.stdout.write(`package  ${pkgVersion}\n`)
  process.stdout.write(`skill    ${skillVersion}\n`)
  process.stdout.write(`protocol ${PROTOCOL_VERSION}\n`)
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

  if (first === '--help' || first === '-h' || first === 'help') {
    printHelp()
    return
  }
  if (first === '--version' || first === '-v' || first === 'version') {
    printVersion()
    return
  }

  // Bare invocation → doctor. A non-tech user typing just `alignmink-dtp`
  // gets actionable status instead of a wall of help.
  if (first === undefined) {
    await doctorCommand({ args: [], packageRoot: PACKAGE_ROOT })
    process.stdout.write(`Run 'alignmink-dtp --help' to see all commands.\n`)
    return
  }

  switch (first) {
    case 'start':
      await startCommand({ args: args.slice(1), packageRoot: PACKAGE_ROOT })
      return
    case 'install-skills':
      await installSkillsCommand({ args: args.slice(1), packageRoot: PACKAGE_ROOT })
      return
    case 'doctor':
      await doctorCommand({ args: args.slice(1), packageRoot: PACKAGE_ROOT })
      return
    case 'update':
      await updateCommand({ args: args.slice(1), packageRoot: PACKAGE_ROOT })
      return
    case 'import':
    case 'capture':
    case 'migrate':
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
