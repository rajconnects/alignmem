#!/usr/bin/env node
// Brand audit — enforces the non-negotiable design rules from
// Product-Documentation/Specs/alignmem-trace-reader-replit-prompt.md:
//   1. border-radius: 0 everywhere except one intentional 50% (.live-pip / .pip)
//   2. No box-shadow anywhere
//   3. Zilla Slab appears nowhere — the wordmark is now the official
//      Alignmink SVG (src/assets/alignmink-logo-*.svg), so no font
//      fallback is needed and Zilla Slab must not leak back in.
//
// Exits non-zero if any rule is violated so CI can fail the build.

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const SCAN_DIRS = ['src', 'server']
const IGNORE_DIRS = new Set(['node_modules', 'dist', 'coverage', '.vite', 'test-results', 'playwright-report'])
const INCLUDE_EXT = new Set(['.ts', '.tsx', '.jsx', '.js', '.css'])

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walk(full)
    } else if (INCLUDE_EXT.has(path.extname(entry.name))) {
      yield full
    }
  }
}

const violations = []

function record(rule, file, line, context) {
  violations.push({ rule, file: path.relative(ROOT, file), line, context: context.trim() })
}

const borderRadiusRegex = /border-radius\s*:\s*([^;]+)/g
const boxShadowRegex = /box-shadow\s*:/g
const zillaRegex = /Zilla Slab/g

for (const dir of SCAN_DIRS) {
  const abs = path.join(ROOT, dir)
  try {
    await fs.access(abs)
  } catch {
    continue
  }
  for await (const filePath of walk(abs)) {
    const content = await fs.readFile(filePath, 'utf8')
    const lines = content.split('\n')

    // Rule 1: border-radius must be 0 or 50%
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      for (const match of line.matchAll(borderRadiusRegex)) {
        const value = match[1].trim().replace(/\s*!important$/, '')
        // Allow CSS variables for the reset (none used here) and the two legal values.
        if (value !== '0' && value !== '50%') {
          record('border-radius', filePath, i + 1, line)
        }
      }
    }

    // Rule 2: no box-shadow (except setting it to none in the global reset)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (boxShadowRegex.test(line)) {
        // Allow declarations that set it to none
        const isReset = /box-shadow\s*:\s*none/.test(line)
        if (!isReset) {
          record('box-shadow', filePath, i + 1, line)
        }
      }
      boxShadowRegex.lastIndex = 0
    }

    // Rule 3: Zilla Slab must not appear anywhere. The old wordmark used
    // Zilla Slab for the 'alignmem' text; the new wordmark is the official
    // SVG logo, so the font is no longer loaded or referenced.
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (zillaRegex.test(line)) {
        record('zilla-slab', filePath, i + 1, line)
      }
      zillaRegex.lastIndex = 0
    }
  }
}

if (violations.length === 0) {
  console.log('\u2713 brand-audit: all rules passed')
  console.log('  - border-radius: only 0 or 50%')
  console.log('  - box-shadow: none')
  console.log('  - Zilla Slab: absent from src/ and server/')
  process.exit(0)
}

console.error('\u2717 brand-audit: violations found')
for (const v of violations) {
  console.error(`  [${v.rule}] ${v.file}:${v.line}  ${v.context}`)
}
process.exit(1)
