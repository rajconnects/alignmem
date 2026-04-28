// Behavioural tests for `alignmink-dtp doctor`.
// The doctor command is the central UX for non-technical users: one
// command, three rows (package / skill / protocol), and a literal fix
// string they can paste back into a terminal. These tests lock the
// shape of that output across the three install states (up-to-date,
// out-of-date, not-installed) and prove the install-mode banner shows.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { runDoctor, detectInstallMode } from '../commands/doctor.mjs'

let tmpRoot
let packageRoot
let homeDir
let logs

function mkSkill(homeRoot, version) {
  const skillDir = path.join(homeRoot, '.claude', 'skills', 'alignmink-dtp')
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(
    path.join(skillDir, 'SKILL.md'),
    `---\nname: alignmink-decision-engine\nskill_version: ${version}\n---\n\nbody\n`
  )
  return skillDir
}

function mkPackage(root, version) {
  mkdirSync(root, { recursive: true })
  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({ name: 'alignmink-dtp', version })
  )
  // Engine SKILL.md is the source of truth for the shipped skill version
  const eng = path.join(root, 'engine')
  mkdirSync(eng, { recursive: true })
  writeFileSync(
    path.join(eng, 'SKILL.md'),
    `---\nname: alignmink-decision-engine\nskill_version: ${version}\n---\n\nbody\n`
  )
}

beforeEach(() => {
  tmpRoot = mkdtempSync(path.join(tmpdir(), 'aldtp-doctor-'))
  packageRoot = path.join(tmpRoot, 'pkg')
  homeDir = path.join(tmpRoot, 'home')
  mkdirSync(homeDir, { recursive: true })
  logs = []
})

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true })
  vi.restoreAllMocks()
})

function capture() {
  return {
    write: (s) => {
      logs.push(s)
      return true
    }
  }
}

function joined() {
  return logs.join('')
}

describe('doctor — up to date', () => {
  it('shows three rows, every row is up to date, no fix command shown', async () => {
    mkPackage(packageRoot, '0.3.0')
    mkSkill(homeDir, '0.3.0')

    await runDoctor({
      packageRoot,
      homeDir,
      installMode: 'global',
      out: capture()
    })

    const text = joined()
    expect(text).toMatch(/package\s+0\.3\.0/i)
    expect(text).toMatch(/skill\s+0\.3\.0/i)
    expect(text).toMatch(/protocol\s+0\.1\.0/i)
    expect(text).toMatch(/up to date/i)
    // No "fix" suggestions when everything is current.
    expect(text).not.toMatch(/install-skills --force/i)
    expect(text).not.toMatch(/npm install -g alignmink-dtp@latest/i)
  })
})

describe('doctor — skill out of date (global mode)', () => {
  it('marks skill out of date and prints the global fix command verbatim', async () => {
    mkPackage(packageRoot, '0.3.0')
    mkSkill(homeDir, '0.2.0')

    await runDoctor({
      packageRoot,
      homeDir,
      installMode: 'global',
      out: capture()
    })

    const text = joined()
    expect(text).toMatch(/out of date/i)
    expect(text).toContain('npm install -g alignmink-dtp@latest && alignmink-dtp install-skills --force')
  })
})

describe('doctor — skill out of date (npx mode)', () => {
  it('prints the npx fix command verbatim', async () => {
    mkPackage(packageRoot, '0.3.0')
    mkSkill(homeDir, '0.2.0')

    await runDoctor({
      packageRoot,
      homeDir,
      installMode: 'npx',
      out: capture()
    })

    const text = joined()
    expect(text).toContain('npx alignmink-dtp@latest install-skills --force')
  })
})

describe('doctor — skill missing', () => {
  it('marks skill not installed and prints the install command', async () => {
    mkPackage(packageRoot, '0.3.0')
    // No skill mkdir — ~/.claude/skills/alignmink-dtp/ does not exist.

    await runDoctor({
      packageRoot,
      homeDir,
      installMode: 'global',
      out: capture()
    })

    const text = joined()
    expect(text).toMatch(/not installed/i)
    expect(text).toContain('alignmink-dtp install-skills')
  })
})

describe('doctor — install mode banner', () => {
  it('names the detected mode in the header', async () => {
    mkPackage(packageRoot, '0.3.0')
    mkSkill(homeDir, '0.3.0')

    await runDoctor({
      packageRoot,
      homeDir,
      installMode: 'npx',
      out: capture()
    })

    expect(joined().toLowerCase()).toContain('npx')
  })
})

describe('detectInstallMode', () => {
  it('returns npx for /_npx/ paths', () => {
    expect(detectInstallMode('/Users/x/.npm/_npx/abc/node_modules/alignmink-dtp/bin/alignmink-dtp.mjs')).toBe('npx')
  })

  it('returns local for paths that look like a dev checkout', () => {
    // Anything that is neither under _npx nor under a global prefix is treated as local/dev.
    expect(detectInstallMode('/Users/x/Documents/Claude/Projects/foo/apps/alignmink-dtp/bin/alignmink-dtp.mjs')).toBe('local')
  })
})
