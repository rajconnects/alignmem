// `alignmink-dtp doctor` — one-command status check.
//
// Three rows: package / skill / protocol. Each row shows shipped-vs-installed
// version + status (up to date / out of date / not installed) and the literal
// command to fix. Output is plain text — a non-tech CEO should be able to copy
// the fix command verbatim and paste it back.

import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import {
  getPackageVersion,
  getSkillVersion,
  PROTOCOL_VERSION
} from '../lib/versions.mjs'

// Pure: classifies a script path. The CLI caller refines 'local' to
// 'global' if the path turns out to live under `npm root -g`.
export function detectInstallMode(scriptPath) {
  if (!scriptPath) return 'local'
  // npx caches under either ~/.npm/_npx/<hash>/... or platform variants
  // that all contain the literal `/_npx/` segment.
  if (/[\\/](?:_npx)[\\/]/.test(scriptPath)) return 'npx'
  return 'local'
}

function detectInstallModeAtRuntime(scriptPath) {
  const fromPath = detectInstallMode(scriptPath)
  if (fromPath !== 'local') return fromPath

  // Try `npm root -g` to upgrade 'local' → 'global' when the script
  // happens to live under the global prefix. execFileSync is wrapped so
  // a missing `npm` (rare, but possible in stripped containers) doesn't
  // crash doctor.
  try {
    const out = execFileSync('npm', ['root', '-g'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    const globalRoot = out.trim()
    if (globalRoot && scriptPath && scriptPath.startsWith(globalRoot)) {
      return 'global'
    }
  } catch {
    // ignore — keep 'local'
  }
  return 'local'
}

function pad(s, n) {
  return (s + ' '.repeat(n)).slice(0, n)
}

// Three cases for the installed skill:
//   - SKILL.md doesn't exist → 'not installed'
//   - SKILL.md exists but no skill_version → 'out of date' (pre-0.3 install)
//   - SKILL.md exists with skill_version → compare to shipped
function computeSkillState(shippedSkill, skillMdPath) {
  if (!existsSync(skillMdPath)) {
    return { status: 'not installed', installedLabel: '—' }
  }
  const installed = getSkillVersion(skillMdPath)
  if (installed === null) {
    return { status: 'out of date', installedLabel: 'pre-0.3' }
  }
  if (shippedSkill === null) return { status: 'unknown', installedLabel: installed }
  if (shippedSkill === installed) return { status: 'up to date', installedLabel: installed }
  return { status: 'out of date', installedLabel: installed }
}

function fixCommandFor({ skillStatus, installMode }) {
  if (skillStatus === 'not installed') {
    return 'alignmink-dtp install-skills'
  }
  if (skillStatus !== 'out of date') return null
  if (installMode === 'npx') {
    return 'npx alignmink-dtp@latest install-skills --force'
  }
  // global (and local/dev — give the same hint; dev users will recognise it)
  return 'npm install -g alignmink-dtp@latest && alignmink-dtp install-skills --force'
}

export async function runDoctor({ packageRoot, homeDir, installMode, out = process.stdout }) {
  const home = homeDir || os.homedir()
  const installedSkillMd = path.join(home, '.claude', 'skills', 'alignmink-dtp', 'SKILL.md')

  const shippedPkg = getPackageVersion(packageRoot)
  const shippedSkill = getSkillVersion(path.join(packageRoot, 'engine', 'SKILL.md'))
  const skill = computeSkillState(shippedSkill, installedSkillMd)

  out.write(`alignmink-dtp doctor — install mode: ${installMode}\n`)
  out.write(`\n`)
  out.write(`  ${pad('component', 12)}${pad('shipped', 12)}${pad('installed', 12)}status\n`)
  out.write(`  ${pad('---------', 12)}${pad('-------', 12)}${pad('---------', 12)}------\n`)
  out.write(`  ${pad('package', 12)}${pad(shippedPkg ?? '?', 12)}${pad(shippedPkg ?? '?', 12)}up to date\n`)
  out.write(`  ${pad('skill', 12)}${pad(shippedSkill ?? '?', 12)}${pad(skill.installedLabel, 12)}${skill.status}\n`)
  out.write(`  ${pad('protocol', 12)}${pad(PROTOCOL_VERSION, 12)}${pad(PROTOCOL_VERSION, 12)}up to date\n`)
  out.write(`\n`)

  const fix = fixCommandFor({ skillStatus: skill.status, installMode })
  if (fix) {
    if (skill.status === 'not installed') {
      out.write(`The Claude Code skill is not installed. Run:\n\n  ${fix}\n\n`)
    } else {
      out.write(`Your skill is behind the package. Run:\n\n  ${fix}\n\n`)
    }
  } else {
    out.write(`Everything looks good. No action needed.\n`)
  }
}

export async function doctorCommand({ args, packageRoot }) {
  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write(`Usage: alignmink-dtp doctor\n\nReports installed vs shipped versions and prints the exact command\nto fix anything that is out of date.\n`)
    return
  }
  const installMode = detectInstallModeAtRuntime(process.argv[1])
  await runDoctor({ packageRoot, installMode })
}
