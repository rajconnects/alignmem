// `alignmink-dtp install-skills` — copy capture skills into a host surface.
//
// Default target is Claude Code (~/.claude/skills/alignmink-dtp/).
// Other targets print a paste-ready instruction block from templates/
// for the user to install manually.
//
// Spec: 03-capture-flow.md §3.

import { spawn } from 'node:child_process'
import { copyFile, cp, mkdir, readFile, readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createInterface } from 'node:readline'
import process from 'node:process'

const VALID_TARGETS = ['claude-code', 'cursor', 'cowork', 'chatgpt']

// Exported for unit tests. parseArgs is pure so it's safe to test
// without touching the filesystem.
export function parseArgs(args) {
  const out = { target: 'claude-code', force: false }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]

    // Accept both --target=value and --target value forms.
    let key = a
    let inlineVal = null
    if (a.startsWith('--') && a.includes('=')) {
      const eqIdx = a.indexOf('=')
      key = a.slice(0, eqIdx)
      inlineVal = a.slice(eqIdx + 1)
    }

    if (key === '--target' || key === '-t') {
      const value = inlineVal !== null ? inlineVal : args[++i]
      if (!VALID_TARGETS.includes(value)) {
        throw new Error(`invalid --target value: '${value}'. Expected one of: ${VALID_TARGETS.join(', ')}`)
      }
      out.target = value
    } else if (key === '--force' || key === '-f') {
      out.force = true
    } else if (key === '--help' || key === '-h') {
      out.help = true
    } else {
      throw new Error(`unknown option for 'install-skills': ${a}`)
    }
  }
  return out
}

function printHelp() {
  process.stdout.write(`Usage: alignmink-dtp install-skills [options]

Options:
  --target <surface>    One of: claude-code (default), cursor, cowork, chatgpt
  --force, -f           Overwrite without prompting
  --help, -h            Show this help

Targets:
  claude-code   Copies engine/ to ~/.claude/skills/alignmink-dtp/
  cursor        Prints paste-ready .cursorrules content
  cowork        Prints custom-instructions block for a Cowork Project
  chatgpt       Prints custom-instructions block for ChatGPT
`)
}

async function promptYesNo(question) {
  if (!process.stdin.isTTY) {
    // Non-interactive — be conservative, return false
    return false
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(`${question} [y/N] `, (answer) => {
      rl.close()
      resolve(answer.trim().toLowerCase().startsWith('y'))
    })
  })
}

async function pathExists(p) {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

async function countFiles(dir) {
  let n = 0
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      n += await countFiles(full)
    } else if (entry.isFile()) {
      n++
    }
  }
  return n
}

async function installClaudeCode({ packageRoot, force }) {
  const sourceDir = path.join(packageRoot, 'engine')
  if (!existsSync(sourceDir)) {
    throw new Error(`engine/ not found at ${sourceDir}. Is the package installed correctly?`)
  }

  const skillsRoot = path.join(os.homedir(), '.claude', 'skills')
  const targetDir = path.join(skillsRoot, 'alignmink-dtp')

  await mkdir(skillsRoot, { recursive: true })

  if (await pathExists(targetDir)) {
    if (!force) {
      const ok = await promptYesNo(
        `[install-skills] ${targetDir} already exists. Overwrite?`
      )
      if (!ok) {
        process.stdout.write('[install-skills] Cancelled. Existing skills untouched.\n')
        return
      }
    }
    // Remove the old install before copying. fs.cp recursive overwrites
    // file-by-file but won't remove files no longer in source.
    await spawnRm(targetDir)
  }

  // Filter junk like macOS .DS_Store so the user's skills folder
  // stays clean.
  await cp(sourceDir, targetDir, {
    recursive: true,
    filter: (src) => !path.basename(src).startsWith('.DS_Store')
  })
  const fileCount = await countFiles(targetDir)

  process.stdout.write(`[install-skills] Installed ${fileCount} file(s) to:\n`)
  process.stdout.write(`  ${targetDir}\n\n`)
  process.stdout.write(`Next: open Claude Code. The skill activates automatically when\n`)
  process.stdout.write(`you start a strategic conversation. Try saying "capture this\n`)
  process.stdout.write(`decision" once you've made a call you want to remember.\n`)
}

async function spawnRm(target) {
  // Cross-platform "rm -rf" via Node's fs.rm.
  const { rm } = await import('node:fs/promises')
  await rm(target, { recursive: true, force: true })
}

async function installCowork({ packageRoot }) {
  // Cowork needs two things from us:
  //   1. The capture custom-instructions block (what to paste into the Project).
  //   2. The engine bundle as an uploadable zip (Project knowledge file).
  // Cowork has no filesystem we can write to, so we drop the zip in CWD and
  // print the paste-ready instructions.
  const zipSource = path.join(packageRoot, 'dist', 'engine.zip')
  if (!existsSync(zipSource)) {
    throw new Error(
      `engine.zip not found at ${zipSource}. ` +
      `Run 'npm run build:engine-zip' from the package root, or reinstall.`
    )
  }
  const zipDest = path.join(process.cwd(), 'alignmink-dtp-engine.zip')
  await copyFile(zipSource, zipDest)
  const stats = await stat(zipDest)

  process.stdout.write(`[install-skills] Wrote engine bundle:\n`)
  process.stdout.write(`  ${zipDest} (${stats.size} bytes)\n\n`)
  process.stdout.write(`Upload this zip to your Claude Cowork Project as a knowledge file,\n`)
  process.stdout.write(`then paste the custom-instructions block below into the Project's\n`)
  process.stdout.write(`"Custom instructions" field.\n\n`)

  await printTemplate({
    packageRoot,
    templateName: 'cowork-custom-instructions.md',
    surfaceLabel: 'Claude Cowork (Project custom instructions)'
  })
}

async function printTemplate({ packageRoot, templateName, surfaceLabel }) {
  const tplPath = path.join(packageRoot, 'templates', templateName)
  if (!existsSync(tplPath)) {
    throw new Error(
      `Template missing: ${templateName}. Reinstall the package or report this bug.`
    )
  }
  const content = await readFile(tplPath, 'utf8')
  process.stdout.write(`[install-skills] ${surfaceLabel} setup — paste the following:\n`)
  process.stdout.write('─'.repeat(72) + '\n')
  process.stdout.write(content)
  if (!content.endsWith('\n')) process.stdout.write('\n')
  process.stdout.write('─'.repeat(72) + '\n')
}

export async function installSkillsCommand({ args, packageRoot }) {
  let opts
  try {
    opts = parseArgs(args)
  } catch (err) {
    process.stderr.write(`alignmink-dtp install-skills: ${err.message}\n`)
    printHelp()
    process.exit(1)
  }

  if (opts.help) {
    printHelp()
    return
  }

  switch (opts.target) {
    case 'claude-code':
      await installClaudeCode({ packageRoot, force: opts.force })
      return
    case 'cursor':
      await printTemplate({
        packageRoot,
        templateName: 'cursor-rules.md',
        surfaceLabel: 'Cursor / Windsurf'
      })
      return
    case 'cowork':
      await installCowork({ packageRoot })
      return
    case 'chatgpt':
      await printTemplate({
        packageRoot,
        templateName: 'chatgpt-custom-instructions.md',
        surfaceLabel: 'ChatGPT (custom instructions)'
      })
      return
    default:
      // Unreachable — parseArgs validates target — but typescript-style guard.
      throw new Error(`unhandled target: ${opts.target}`)
  }
}
