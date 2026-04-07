#!/usr/bin/env node
// Refresh logo — copies the current Black logo PNG from
// Logos/Black & White/ into src/assets/alignmink-logo.png.
//
// We use only the black (dark-strokes-on-white) version. CSS
// composites it for dark theme via filter:invert(1) + mix-blend-mode:
// screen, so no separate white-stroke file is needed.
//
// Re-run whenever the brand team updates the source file:
//   npm run refresh-logos

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const LOGOS_DIR = path.resolve(ROOT, '..', '..', 'Logos', 'Black & White')
const OUT_DIR = path.resolve(ROOT, 'src', 'assets')

const SRC = 'Black Transparent Logo.png'
const OUT = 'alignmink-logo.png'

try {
  const inputPath = path.join(LOGOS_DIR, SRC)
  const outputPath = path.join(OUT_DIR, OUT)
  const buf = fs.readFileSync(inputPath)
  fs.writeFileSync(outputPath, buf)
  console.log(`[refresh-logos] ${SRC} -> ${OUT}  (${buf.length} bytes)`)
} catch (err) {
  console.error(`[refresh-logos] failed:`, err.message)
  process.exit(1)
}
