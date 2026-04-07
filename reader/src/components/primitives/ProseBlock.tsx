import { type ReactNode } from 'react'

// Lightweight prose formatter for decision-trace content. Detects
// structural patterns common in strategic decision summaries and
// thread nodes, and adds visual breathing room without requiring
// the source JSON to contain HTML or Markdown.
//
// Patterns detected:
//   1. Lettered lists:   "(a) ... (b) ... (c) ..."
//   2. Enumerated points: "First: ... Second: ... Third: ..."
//   3. Long prose blocks → split into ~2-3 sentence paragraphs
//
// Inline formatting:
//   - 'Quoted terms' → mono highlight
//   - (M1), (M2), (M3) milestone refs → amber mono
//   - Colon labels in context → subtle emphasis

// ── Inline formatting ───────────────────────────────────

// Regex for inline patterns:
//   Group 1: 'single-quoted term'
//   Group 2: "double-quoted term"
//   Group 3: milestone ref like (M1), (M2.2)
//   Group 4: arrow chain separator →
const INLINE_PATTERN = /'([^']{2,60})'|"([^"]{2,60})"|(\(M\d[.\d]*\))|( → )/g

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  INLINE_PATTERN.lastIndex = 0
  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }

    if (match[1] != null) {
      // Single-quoted term
      parts.push(
        <span className="prose-term" key={`q${match.index}`}>
          &lsquo;{match[1]}&rsquo;
        </span>
      )
    } else if (match[2] != null) {
      // Double-quoted term
      parts.push(
        <span className="prose-term" key={`dq${match.index}`}>
          &ldquo;{match[2]}&rdquo;
        </span>
      )
    } else if (match[3] != null) {
      // Milestone ref
      parts.push(
        <span className="prose-ref" key={`m${match.index}`}>
          {match[3]}
        </span>
      )
    } else if (match[4] != null) {
      // Arrow
      parts.push(
        <span className="prose-arrow" key={`a${match.index}`}>
          {' → '}
        </span>
      )
    }

    lastIndex = INLINE_PATTERN.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

// ── Block-level structure detection ─────────────────────

interface ProseSegment {
  kind: 'paragraph' | 'list-item'
  label?: string
  content: string
}

// Detect and split on lettered list pattern: (a) ... (b) ... (c) ...
const LETTERED_LIST = /(?:,\s*|\.\s+|;\s+)(?=\([a-z]\)\s)/g
const HAS_LETTERED = /\([a-z]\)\s/

// Detect enumerated points: "First: ... Second: ... Third: ..."
const ENUM_WORDS = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth']
const ENUM_PATTERN = new RegExp(
  `(?<=\\.\\s|^)(?=${ENUM_WORDS.join('|')})[:\\.]?`,
  'g'
)
const HAS_ENUM = new RegExp(`\\b(?:${ENUM_WORDS.slice(0, 3).join('|')})[:.]`)

function extractLabel(text: string): { label: string; body: string } | null {
  // Try lettered: "(a) ..."
  const letterMatch = text.match(/^\(?([a-z])\)\s+(.*)/)
  if (letterMatch) {
    return { label: `(${letterMatch[1]})`, body: letterMatch[2] }
  }
  // Try enumerated: "First: ..." or "First, ..."
  const enumMatch = text.match(/^(First|Second|Third|Fourth|Fifth|Sixth)[:.,]\s*(.*)/)
  if (enumMatch) {
    return { label: enumMatch[1], body: enumMatch[2] }
  }
  return null
}

function splitOnLettered(text: string): ProseSegment[] {
  // Split before each (a), (b), (c) occurrence
  const parts = text.split(/(?=\([a-z]\)\s)/).filter((s) => s.trim().length > 0)

  const segments: ProseSegment[] = []
  for (const part of parts) {
    const trimmed = part.replace(/^[,;.\s]+/, '').trim()
    if (!trimmed) continue
    const extracted = extractLabel(trimmed)
    if (extracted) {
      segments.push({ kind: 'list-item', label: extracted.label, content: extracted.body })
    } else {
      segments.push({ kind: 'paragraph', content: trimmed })
    }
  }
  return segments
}

function splitOnEnumerated(text: string): ProseSegment[] {
  const pattern = new RegExp(`(?=\\b(?:${ENUM_WORDS.join('|')})[:.,])`, 'g')
  const parts = text.split(pattern).filter((s) => s.trim().length > 0)

  const segments: ProseSegment[] = []
  for (const part of parts) {
    const trimmed = part.replace(/^[,;.\s]+/, '').trim()
    if (!trimmed) continue
    const extracted = extractLabel(trimmed)
    if (extracted) {
      segments.push({ kind: 'list-item', label: extracted.label, content: extracted.body })
    } else {
      segments.push({ kind: 'paragraph', content: trimmed })
    }
  }
  return segments
}

// Split long prose into paragraphs at sentence boundaries.
// Groups sentences into chunks of ~2-3 or when exceeding ~280 chars.
function splitIntoParagraphs(text: string): ProseSegment[] {
  if (text.length < 200) {
    return [{ kind: 'paragraph', content: text }]
  }

  // Split on period + space + capital letter (sentence boundary heuristic)
  const sentences = text.split(/(?<=\.)\s+(?=[A-Z])/)
  if (sentences.length <= 2) {
    return [{ kind: 'paragraph', content: text }]
  }

  const paragraphs: ProseSegment[] = []
  let current: string[] = []
  let currentLen = 0

  for (const sentence of sentences) {
    current.push(sentence)
    currentLen += sentence.length

    if (current.length >= 3 || currentLen > 280) {
      paragraphs.push({ kind: 'paragraph', content: current.join(' ') })
      current = []
      currentLen = 0
    }
  }
  if (current.length > 0) {
    paragraphs.push({ kind: 'paragraph', content: current.join(' ') })
  }
  return paragraphs
}

function parseSegments(text: string): ProseSegment[] {
  // Priority 1: lettered list
  if (HAS_LETTERED.test(text)) {
    return splitOnLettered(text)
  }
  // Priority 2: enumerated points
  if (HAS_ENUM.test(text)) {
    return splitOnEnumerated(text)
  }
  // Default: paragraph splitting
  return splitIntoParagraphs(text)
}

// ── ProseBlock component ────────────────────────────────

interface ProseBlockProps {
  text: string
  className?: string
}

export function ProseBlock({ text, className }: ProseBlockProps) {
  const segments = parseSegments(text)
  const hasListItems = segments.some((s) => s.kind === 'list-item')

  return (
    <div className={className ?? 'prose-block'}>
      {segments.map((seg, i) => {
        if (seg.kind === 'list-item') {
          return (
            <div key={i} className="prose-list-item">
              {seg.label && <div className="prose-list-label">{seg.label}</div>}
              <div className="prose-list-body">{renderInline(seg.content)}</div>
            </div>
          )
        }
        // Paragraph — add extra spacing when mixed with list items
        return (
          <p key={i} className={hasListItems ? 'prose-para prose-para-spaced' : 'prose-para'}>
            {renderInline(seg.content)}
          </p>
        )
      })}
    </div>
  )
}
