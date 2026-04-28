// Unit tests for bin/lib/versions.mjs.
// Locks the contract: three independent versions are surfaced, a missing
// skill or missing skill_version field returns null instead of throwing,
// and the protocol constant matches the trace files on disk.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  getPackageVersion,
  getSkillVersion,
  PROTOCOL_VERSION
} from '../lib/versions.mjs'

let tmpRoot

beforeAll(() => {
  tmpRoot = mkdtempSync(path.join(tmpdir(), 'aldtp-versions-'))
})

afterAll(() => {
  rmSync(tmpRoot, { recursive: true, force: true })
})

describe('PROTOCOL_VERSION', () => {
  it('is 0.1.0 — the DTP version stored inside trace files', () => {
    expect(PROTOCOL_VERSION).toBe('0.1.0')
  })
})

describe('getPackageVersion', () => {
  it('reads version from a package.json', () => {
    const dir = path.join(tmpRoot, 'pkg-ok')
    mkdirSync(dir)
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ version: '9.9.9' }))
    expect(getPackageVersion(dir)).toBe('9.9.9')
  })

  it('returns null when package.json is missing', () => {
    const dir = path.join(tmpRoot, 'pkg-missing')
    mkdirSync(dir)
    expect(getPackageVersion(dir)).toBeNull()
  })
})

describe('getSkillVersion', () => {
  it('parses skill_version from frontmatter', () => {
    const file = path.join(tmpRoot, 'skill-ok.md')
    writeFileSync(
      file,
      '---\nname: alignmink-decision-engine\nskill_version: 0.3.0\n---\n\nbody\n'
    )
    expect(getSkillVersion(file)).toBe('0.3.0')
  })

  it('returns null when skill_version field is absent', () => {
    const file = path.join(tmpRoot, 'skill-no-version.md')
    writeFileSync(file, '---\nname: alignmink-decision-engine\n---\n\nbody\n')
    expect(getSkillVersion(file)).toBeNull()
  })

  it('returns null when the file does not exist', () => {
    expect(getSkillVersion(path.join(tmpRoot, 'nope.md'))).toBeNull()
  })

  it('returns null when no frontmatter fence is present', () => {
    const file = path.join(tmpRoot, 'skill-no-fm.md')
    writeFileSync(file, '# Just a heading\n\nno frontmatter here\n')
    expect(getSkillVersion(file)).toBeNull()
  })

  it('handles quoted version values', () => {
    const file = path.join(tmpRoot, 'skill-quoted.md')
    writeFileSync(file, '---\nskill_version: "1.2.3"\n---\n')
    expect(getSkillVersion(file)).toBe('1.2.3')
  })
})
