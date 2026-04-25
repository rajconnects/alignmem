import { useState } from 'react'
import type { IndexedTrace } from '../../lib/types'
import { Tag } from '../primitives/Tag'

interface SessionTabProps {
  trace: IndexedTrace
  projectName: string
  projectPath: string | null
  onReveal: () => void
}

export function SessionTab({ trace, projectName, projectPath, onReveal }: SessionTabProps) {
  const [rawOpen, setRawOpen] = useState(false)
  const pairs: Array<[string, string]> = [
    ['SESSION ID', trace.session_id],
    ['CAPTURED AT', trace.captured_at],
    ['FILE PATH', projectPath ? `${projectPath}/alignmink-traces/threads/${trace.file_name}` : trace.file_name],
    ['PROJECT', projectName],
    ['TRACE ID', trace.id]
  ]
  const related = Array.from(
    new Set(trace.nodes.flatMap((n) => n.context.related_topics))
  ).filter((t) => t.length > 0)

  return (
    <div>
      <div className="session-list">
        {pairs.map(([k, v]) => (
          <div key={k} className="session-item">
            <div className="session-key">{k}</div>
            <div className="session-val">{v}</div>
          </div>
        ))}
      </div>

      {related.length > 0 && (
        <>
          <div className="session-key" style={{ marginBottom: 8 }}>RELATED TOPICS</div>
          <div className="chip-row">
            {related.map((topic) => (
              <Tag key={topic} as="span" color="var(--text-300)">
                {topic}
              </Tag>
            ))}
          </div>
        </>
      )}

      <button type="button" className="reveal-btn" onClick={onReveal}>
        → REVEAL IN FOLDER
      </button>

      <div>
        <button
          type="button"
          className="raw-json-toggle"
          onClick={() => setRawOpen((v) => !v)}
          aria-expanded={rawOpen}
        >
          {rawOpen ? '▾ RAW JSON' : '▸ RAW JSON'}
        </button>
        {rawOpen && (
          <pre className="raw-json">{JSON.stringify(trace, null, 2)}</pre>
        )}
      </div>
    </div>
  )
}
