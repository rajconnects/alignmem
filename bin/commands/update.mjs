// `alignmink-dtp update` — friendly update flow.
//
// We can't safely shell out to `npm install -g` from inside a running
// global CLI (permissions, lock files, partial-install hazards). Instead:
//
//   - npx mode    → directly refresh the skill (npx already pulled latest)
//   - global mode → print the npm command for the user to run, then explain
//                   that re-running `update` after npm finishes syncs the skill
//   - local/dev   → bail; we don't manage dev checkouts

import { detectInstallMode } from './doctor.mjs'
import { installSkillsCommand } from './install-skills.mjs'
import { execFileSync } from 'node:child_process'

function detectInstallModeAtRuntime(scriptPath) {
  const fromPath = detectInstallMode(scriptPath)
  if (fromPath !== 'local') return fromPath
  try {
    const out = execFileSync('npm', ['root', '-g'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    const globalRoot = out.trim()
    if (globalRoot && scriptPath && scriptPath.startsWith(globalRoot)) {
      return 'global'
    }
  } catch {}
  return 'local'
}

export async function updateCommand({ args, packageRoot }) {
  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write(`Usage: alignmink-dtp update\n\nUpdates the Claude Code skill to match the installed CLI.\nIf the CLI itself is out of date, prints the command to update it.\n`)
    return
  }

  const installMode = detectInstallModeAtRuntime(process.argv[1])

  if (installMode === 'npx') {
    process.stdout.write(`[update] npx mode — refreshing the Claude Code skill from this run.\n\n`)
    await installSkillsCommand({ args: ['--force'], packageRoot })
    return
  }

  if (installMode === 'global') {
    process.stdout.write(`[update] To update the CLI itself, run:\n\n`)
    process.stdout.write(`  npm install -g alignmink-dtp@latest\n\n`)
    process.stdout.write(`Then re-run \`alignmink-dtp update\` and the skill will sync.\n`)
    return
  }

  // local / dev
  process.stderr.write(`[update] Looks like a local checkout. The update command manages npm/npx installs.\n`)
  process.stderr.write(`In a dev checkout, edit files directly and run \`npm run build\`.\n`)
  process.exit(2)
}
