// Backup-before-overwrite test for `install-skills --force`.
// A non-tech CEO running `--force` shouldn't lose hand-edits silently.
// Before we replace ~/.claude/skills/alignmink-dtp/, we rename it to a
// .bak-<timestamp> sibling. This test plants a sentinel file in the
// existing target, runs the installer, and asserts the sentinel is
// preserved in the backup directory while the new target has fresh
// content.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, readdirSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { installClaudeCode } from '../commands/install-skills.mjs'

let tmpRoot
let packageRoot
let homeDir

function plantSource(root) {
  const eng = path.join(root, 'engine')
  mkdirSync(eng, { recursive: true })
  writeFileSync(
    path.join(eng, 'SKILL.md'),
    '---\nname: alignmink-decision-engine\nskill_version: 0.3.0\n---\n\nfresh\n'
  )
  writeFileSync(path.join(eng, 'NEW.md'), 'shipped in v0.3\n')
}

function plantStaleTarget(home, sentinel) {
  const target = path.join(home, '.claude', 'skills', 'alignmink-dtp')
  mkdirSync(target, { recursive: true })
  writeFileSync(path.join(target, 'SKILL.md'), '---\nname: alignmem-decision-engine\nskill_version: 0.2.0\n---\n\nold\n')
  writeFileSync(path.join(target, 'MY-NOTES.md'), sentinel)
  return target
}

beforeEach(() => {
  tmpRoot = mkdtempSync(path.join(tmpdir(), 'aldtp-backup-'))
  packageRoot = path.join(tmpRoot, 'pkg')
  homeDir = path.join(tmpRoot, 'home')
  mkdirSync(homeDir, { recursive: true })
  plantSource(packageRoot)
})

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true })
})

describe('install-skills --force backup', () => {
  it('moves existing target to ~/.claude/backups/alignmink-dtp/<ts>/ and writes fresh content', async () => {
    const sentinel = 'CEO-edited content that must survive'
    const target = plantStaleTarget(homeDir, sentinel)

    await installClaudeCode({ packageRoot, force: true, homeDir })

    // New target exists with fresh files.
    expect(existsSync(target)).toBe(true)
    const newSkill = readFileSync(path.join(target, 'SKILL.md'), 'utf8')
    expect(newSkill).toContain('skill_version: 0.3.0')
    expect(existsSync(path.join(target, 'NEW.md'))).toBe(true)

    // Backups live OUTSIDE ~/.claude/skills/ so Claude Code doesn't
    // register them as duplicate skills.
    const skillsRoot = path.join(homeDir, '.claude', 'skills')
    const skillSiblings = readdirSync(skillsRoot)
    expect(skillSiblings.filter((n) => n.startsWith('alignmink-dtp.bak-'))).toHaveLength(0)

    const backupsRoot = path.join(homeDir, '.claude', 'backups', 'alignmink-dtp')
    const stamps = readdirSync(backupsRoot)
    expect(stamps.length).toBe(1)

    const backupDir = path.join(backupsRoot, stamps[0])
    const restoredSentinel = readFileSync(path.join(backupDir, 'MY-NOTES.md'), 'utf8')
    expect(restoredSentinel).toBe(sentinel)

    // Old SKILL.md is in the backup, not in the new install.
    const backupSkill = readFileSync(path.join(backupDir, 'SKILL.md'), 'utf8')
    expect(backupSkill).toContain('skill_version: 0.2.0')
  })

  it('does not create a backup when target did not exist', async () => {
    await installClaudeCode({ packageRoot, force: true, homeDir })

    const backupsRoot = path.join(homeDir, '.claude', 'backups', 'alignmink-dtp')
    expect(existsSync(backupsRoot)).toBe(false)
  })
})
