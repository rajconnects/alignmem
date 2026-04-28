// Single source of truth for the three independent version numbers
// alignmink-dtp surfaces. They are deliberately decoupled:
//
//   - PACKAGE version  → npm tarball release (package.json)
//   - SKILL   version  → engine/SKILL.md frontmatter (skill_version)
//   - PROTOCOL version → DTP wire format embedded in trace JSON files
//
// Bumping the package without touching the protocol is the common case.
// `doctor` reads all three and explains the gap to the user.

import { readFileSync } from 'node:fs'
import path from 'node:path'

// DTP wire format. Bump only when the JSON shape of a trace file
// changes; every published trace_id pins this in its `schema_version`.
export const PROTOCOL_VERSION = '0.1.0'

export function getPackageVersion(packageRoot) {
  try {
    const raw = readFileSync(path.join(packageRoot, 'package.json'), 'utf8')
    const parsed = JSON.parse(raw)
    return typeof parsed.version === 'string' ? parsed.version : null
  } catch {
    return null
  }
}

// Parse `skill_version` out of YAML frontmatter without pulling in a
// YAML dep. We only ever read one scalar field; a regex is enough and
// keeps the package's runtime footprint tiny.
export function getSkillVersion(skillMdPath) {
  let raw
  try {
    raw = readFileSync(skillMdPath, 'utf8')
  } catch {
    return null
  }

  if (!raw.startsWith('---')) return null
  const end = raw.indexOf('\n---', 3)
  if (end === -1) return null
  const frontmatter = raw.slice(3, end)

  const match = frontmatter.match(/^skill_version:\s*(.+?)\s*$/m)
  if (!match) return null

  // Strip optional surrounding quotes — `skill_version: "0.3.0"` and
  // bare `skill_version: 0.3.0` both work.
  return match[1].replace(/^["']|["']$/g, '')
}
