// Unit tests for CLI argument parsing.
// parseArgs is pure — no fs / network — so these tests stay fast and
// focused on the contract: which flags are accepted, what they map to,
// and what errors look like. Catches the kind of regression where
// --port=N silently breaks because someone refactored space-handling.

import { describe, it, expect } from 'vitest'
import { parseArgs as parseStartArgs } from '../commands/start.mjs'
import { parseArgs as parseInstallSkillsArgs } from '../commands/install-skills.mjs'

describe('start parseArgs', () => {
  it('returns defaults with no args', () => {
    expect(parseStartArgs([])).toEqual({ port: 3000, open: true })
  })

  it('accepts --port N (space-separated)', () => {
    expect(parseStartArgs(['--port', '4000'])).toEqual({ port: 4000, open: true })
  })

  it('accepts --port=N (equals-separated)', () => {
    expect(parseStartArgs(['--port=4000'])).toEqual({ port: 4000, open: true })
  })

  it('accepts -p shortform', () => {
    expect(parseStartArgs(['-p', '5000'])).toEqual({ port: 5000, open: true })
  })

  it('accepts --no-open', () => {
    expect(parseStartArgs(['--no-open'])).toEqual({ port: 3000, open: false })
  })

  it('combines --port=N and --no-open', () => {
    expect(parseStartArgs(['--port=3457', '--no-open'])).toEqual({ port: 3457, open: false })
  })

  it('sets help on --help', () => {
    expect(parseStartArgs(['--help'])).toMatchObject({ help: true })
  })

  it('sets help on -h', () => {
    expect(parseStartArgs(['-h'])).toMatchObject({ help: true })
  })

  it('rejects port below 1', () => {
    expect(() => parseStartArgs(['--port=0'])).toThrow(/invalid --port value/)
  })

  it('rejects port above 65535', () => {
    expect(() => parseStartArgs(['--port=65536'])).toThrow(/invalid --port value/)
  })

  it('rejects non-numeric port', () => {
    expect(() => parseStartArgs(['--port=abc'])).toThrow(/invalid --port value/)
  })

  it('rejects unknown options', () => {
    expect(() => parseStartArgs(['--bogus'])).toThrow(/unknown option for 'start'/)
  })
})

describe('install-skills parseArgs', () => {
  it('defaults to claude-code target, not forced', () => {
    expect(parseInstallSkillsArgs([])).toMatchObject({ target: 'claude-code', force: false })
  })

  it('accepts --target=cursor (equals-separated)', () => {
    expect(parseInstallSkillsArgs(['--target=cursor'])).toMatchObject({ target: 'cursor' })
  })

  it('accepts --target cursor (space-separated)', () => {
    expect(parseInstallSkillsArgs(['--target', 'cursor'])).toMatchObject({ target: 'cursor' })
  })

  it('accepts -t shortform', () => {
    expect(parseInstallSkillsArgs(['-t', 'cowork'])).toMatchObject({ target: 'cowork' })
  })

  it('accepts all four valid targets', () => {
    expect(parseInstallSkillsArgs(['--target=claude-code'])).toMatchObject({ target: 'claude-code' })
    expect(parseInstallSkillsArgs(['--target=cursor'])).toMatchObject({ target: 'cursor' })
    expect(parseInstallSkillsArgs(['--target=cowork'])).toMatchObject({ target: 'cowork' })
    expect(parseInstallSkillsArgs(['--target=chatgpt'])).toMatchObject({ target: 'chatgpt' })
  })

  it('rejects unknown target', () => {
    expect(() => parseInstallSkillsArgs(['--target=slack'])).toThrow(/invalid --target value/)
  })

  it('accepts --force', () => {
    expect(parseInstallSkillsArgs(['--force'])).toMatchObject({ force: true })
  })

  it('accepts -f shortform', () => {
    expect(parseInstallSkillsArgs(['-f'])).toMatchObject({ force: true })
  })

  it('combines target + force', () => {
    expect(parseInstallSkillsArgs(['--target=cowork', '--force'])).toMatchObject({
      target: 'cowork',
      force: true
    })
  })

  it('sets help on --help', () => {
    expect(parseInstallSkillsArgs(['--help'])).toMatchObject({ help: true })
  })

  it('rejects unknown options', () => {
    expect(() => parseInstallSkillsArgs(['--bogus'])).toThrow(/unknown option for 'install-skills'/)
  })
})
