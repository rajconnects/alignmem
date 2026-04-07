import fs from 'node:fs/promises'
import path from 'node:path'
import { decisionTraceSchema, type DecisionTraceSchema } from './schema.js'

// Read-only indexer: walks a project's alignmink-traces/threads/ directory,
// validates each *.json file against the Zod schema, and enriches each trace
// with derived fields (participants, turn_count, duration_days, age_bucket,
// topic_tags).
//
// Malformed files are logged to stderr but never crash the process. The
// consumer API route surfaces them via an `errors` field in the response.

export type AgeBucket = '7d' | '14d' | '30d' | 'older'

export interface TraceDerived {
  participants: string[]
  turn_count: number
  duration_days: number | null
  age_bucket: AgeBucket
  topic_tags: string[]
  file_name: string
}

export type IndexedTrace = DecisionTraceSchema & TraceDerived

export interface IndexResult {
  traces: IndexedTrace[]
  errors: Array<{ file: string; message: string }>
}

function diffInDays(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime()
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)))
}

export function bucketFor(captured: Date, now: Date = new Date()): AgeBucket {
  const days = diffInDays(captured, now)
  if (days <= 7) return '7d'
  if (days <= 14) return '14d'
  if (days <= 30) return '30d'
  return 'older'
}

export function derive(trace: DecisionTraceSchema, fileName: string, now: Date = new Date()): TraceDerived {
  const participants = Array.from(
    new Set(trace.nodes.map((n) => n.author_name).filter((s) => s.length > 0))
  )
  const turn_count = trace.nodes.length
  const duration_days =
    trace.resolved_at && trace.opened_at
      ? diffInDays(new Date(trace.opened_at), new Date(trace.resolved_at))
      : null
  const captured = new Date(trace.captured_at)
  const age_bucket = bucketFor(captured, now)
  const related = trace.nodes.flatMap((n) => n.context.related_topics)
  const topic_tags = Array.from(new Set([trace.category, ...related])).filter((t) => t.length > 0)
  return {
    participants,
    turn_count,
    duration_days,
    age_bucket,
    topic_tags,
    file_name: fileName
  }
}

export async function indexProject(projectPath: string, now: Date = new Date()): Promise<IndexResult> {
  const threadsDir = path.join(projectPath, 'alignmink-traces', 'threads')
  let entries: string[]
  try {
    entries = await fs.readdir(threadsDir)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return { traces: [], errors: [{ file: threadsDir, message: msg }] }
  }

  const jsonFiles = entries.filter((f) => f.toLowerCase().endsWith('.json'))
  const traces: IndexedTrace[] = []
  const errors: IndexResult['errors'] = []

  // Read + validate all files in parallel. Also stat each file to get
  // its mtime — used as a sort tiebreaker when JSON timestamps are
  // day-only (T00:00:00Z) and multiple traces share the same date.
  const results = await Promise.allSettled(
    jsonFiles.map(async (fileName) => {
      const filePath = path.join(threadsDir, fileName)
      const [raw, stat] = await Promise.all([
        fs.readFile(filePath, 'utf8'),
        fs.stat(filePath)
      ])
      const parsed = JSON.parse(raw) as unknown
      const result = decisionTraceSchema.safeParse(parsed)
      if (!result.success) {
        const message = result.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ')
        throw new Error(`[schema] ${fileName}: ${message}`)
      }
      return { trace: result.data, fileName, mtime: stat.mtimeMs }
    })
  )

  const mtimeMap = new Map<string, number>()
  for (const r of results) {
    if (r.status === 'fulfilled') {
      mtimeMap.set(r.value.fileName, r.value.mtime)
      traces.push({ ...r.value.trace, ...derive(r.value.trace, r.value.fileName, now) })
    } else {
      const message = r.reason instanceof Error ? r.reason.message : 'unknown error'
      const fileMatch = message.match(/\[schema\] ([^:]+):/)
      const fileName = fileMatch?.[1] ?? jsonFiles[results.indexOf(r)] ?? 'unknown'
      errors.push({ file: fileName, message })
      // eslint-disable-next-line no-console
      console.error(`[indexer] ${message}`)
    }
  }

  // Sort most-recent first.
  //   1. captured_at (when the trace was written)
  //   2. opened_at (when the decision started)
  //   3. file mtime (OS modification time — the most granular fallback
  //      when JSON timestamps are day-only T00:00:00Z)
  traces.sort((a, b) => {
    const ca = new Date(a.captured_at).getTime()
    const cb = new Date(b.captured_at).getTime()
    if (cb !== ca) return cb - ca
    const oa = new Date(a.opened_at).getTime()
    const ob = new Date(b.opened_at).getTime()
    if (ob !== oa) return ob - oa
    const ma = mtimeMap.get(a.file_name) ?? 0
    const mb = mtimeMap.get(b.file_name) ?? 0
    return mb - ma
  })

  return { traces, errors }
}

export async function findTraceById(
  projectPath: string,
  id: string
): Promise<IndexedTrace | null> {
  const { traces } = await indexProject(projectPath)
  return traces.find((t) => t.id === id) ?? null
}
