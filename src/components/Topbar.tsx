import { AlignmikLogo } from '../assets/AlignmikLogo'
import type { ProjectEntry } from '../lib/types'
import { formatCapturedShort } from '../lib/format'

interface TopbarProps {
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  project: ProjectEntry | null
  traceCount: number
  lastCapturedAt: string | null
  onLock: () => void
}

export function Topbar({ theme, onToggleTheme, project, traceCount, lastCapturedAt, onLock }: TopbarProps) {
  const pairs: Array<[string, string]> = [
    ['PROJECT', project?.name ?? '—'],
    ['TRACES', String(traceCount)],
    ['LAST CAPTURE', lastCapturedAt ? formatCapturedShort(lastCapturedAt) : '—']
  ]
  return (
    <header className="top" role="banner">
      <div className="wordmark">
        <AlignmikLogo theme={theme} />
      </div>
      <div className="top-meta" aria-label="Project metadata">
        {pairs.map(([k, v]) => (
          <div key={k} className="top-meta-pair">
            <span className="top-meta-key">{k}</span>
            <span className="top-meta-val">/ {v}</span>
          </div>
        ))}
      </div>
      <div className="top-right">
        <button className="theme-btn" onClick={onToggleTheme} aria-label="Toggle color theme">
          {theme === 'dark' ? '☀ LIGHT' : '◑ DARK'}
        </button>
        <button className="theme-btn" onClick={onLock} aria-label="Lock session">
          LOCK ⌘
        </button>
      </div>
    </header>
  )
}
