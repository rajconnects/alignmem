// Regression tests for the delta-sync that closes the
// "added while journal was off" gap (v0.3.5 fix).
//
// Pre-fix bug: app.ts only ran importAllTraces when the local cache
// was empty. Files added to source while the journal was off remained
// invisible until the project was re-added. This test set drives a
// scenario the old "import-once-if-empty" path would silently fail.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import { syncTraces } from '../storage.js'

let tmpRoot: string
let projectRoot: string

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aldtp-sync-'))
  process.env.ALIGNMEM_HOME = path.join(tmpRoot, 'home')
  await fs.mkdir(process.env.ALIGNMEM_HOME, { recursive: true })

  projectRoot = path.join(tmpRoot, 'project')
  await fs.mkdir(path.join(projectRoot, 'alignmink-traces', 'threads'), { recursive: true })
})

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true })
})

async function writeSource(name: string, content = '{"trace_id":"x"}') {
  const p = path.join(projectRoot, 'alignmink-traces', 'threads', name)
  await fs.writeFile(p, content)
  return p
}

async function listCache(projectName = 'P') {
  const dir = path.join(process.env.ALIGNMEM_HOME!, 'traces', projectName)
  try {
    return (await fs.readdir(dir)).sort()
  } catch {
    return []
  }
}

describe('syncTraces — delta sync', () => {
  it('copies all source files into an empty cache', async () => {
    await writeSource('a.json')
    await writeSource('b.json')
    await writeSource('c.json')

    const result = await syncTraces(projectRoot, 'P')

    expect(result).toMatchObject({ added: 3, updated: 0, failed: 0 })
    expect(await listCache()).toEqual(['a.json', 'b.json', 'c.json'])
  })

  it('copies only the missing file when cache is partially populated', async () => {
    // The exact bug shape: cache has 1 file, source has 3. Pre-fix this
    // call was a no-op because the cache wasn't empty.
    await writeSource('a.json')
    await writeSource('b.json')
    await writeSource('c.json')

    // Pre-populate cache with just one file (simulates a stale cache from
    // a prior run that captured a-content before b and c existed).
    await syncTraces(projectRoot, 'P')

    // Now add a fourth file as if user captured it while journal was off.
    await writeSource('d.json')
    const result = await syncTraces(projectRoot, 'P')

    expect(result.added).toBe(1)
    expect(result.unchanged).toBe(3)
    expect(await listCache()).toEqual(['a.json', 'b.json', 'c.json', 'd.json'])
  })

  it('updates a cache file when source mtime is newer', async () => {
    const sourcePath = await writeSource('a.json', '{"v":1}')
    await syncTraces(projectRoot, 'P')

    // Bump source mtime by re-writing with newer content.
    await fs.writeFile(sourcePath, '{"v":2}')
    const future = new Date(Date.now() + 60_000)
    await fs.utimes(sourcePath, future, future)

    const result = await syncTraces(projectRoot, 'P')
    expect(result.updated).toBe(1)
    expect(result.added).toBe(0)

    const cached = await fs.readFile(
      path.join(process.env.ALIGNMEM_HOME!, 'traces', 'P', 'a.json'),
      'utf8'
    )
    expect(cached).toBe('{"v":2}')
  })

  it('writes cached files with mode 0o600 to match the in-app importer', async () => {
    await writeSource('a.json')
    await syncTraces(projectRoot, 'P')

    const stat = await fs.stat(
      path.join(process.env.ALIGNMEM_HOME!, 'traces', 'P', 'a.json')
    )
    // Match only the user-readable+writeable bits; ignore higher bits.
    expect(stat.mode & 0o777).toBe(0o600)
  })

  it('returns zero counts gracefully when source threadsDir is missing', async () => {
    await fs.rm(path.join(projectRoot, 'alignmink-traces'), { recursive: true })
    const result = await syncTraces(projectRoot, 'P')
    expect(result).toEqual({ added: 0, updated: 0, unchanged: 0, failed: 0 })
  })
})
