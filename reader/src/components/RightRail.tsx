import type { IndexedTrace, TraceStatus } from '../lib/types'
import { formatIsoDate } from '../lib/format'
import { SummaryTab } from './tabs/SummaryTab'
import { ThreadTab } from './tabs/ThreadTab'
import { SessionTab } from './tabs/SessionTab'

export type RailTab = 'summary' | 'thread' | 'session'

interface RightRailProps {
  trace: IndexedTrace | null
  tab: RailTab
  onTabChange: (tab: RailTab) => void
  projectName: string
  projectPath: string | null
  onReveal: () => void
  onClose: () => void
  open: boolean
  dragging: boolean
  onDragStart: (e: React.MouseEvent) => void
  onDragReset: () => void
  onDragKeyAdjust: (delta: number) => void
  width: number
  minWidth: number
  maxWidth: number
}

function statusColor(status: TraceStatus): string {
  switch (status) {
    case 'resolved':
      return 'var(--green)'
    case 'open':
      return 'var(--orange)'
    case 'contested':
      return 'var(--red)'
    case 'archived':
      return 'var(--text-300)'
  }
}

export function RightRail({
  trace,
  tab,
  onTabChange,
  projectName,
  projectPath,
  onReveal,
  onClose,
  open,
  dragging,
  onDragStart,
  onDragReset,
  onDragKeyAdjust,
  width,
  minWidth,
  maxWidth
}: RightRailProps) {
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      onDragKeyAdjust(24)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      onDragKeyAdjust(-24)
    } else if (e.key === 'Home' || e.key === 'Enter') {
      e.preventDefault()
      onDragReset()
    }
  }
  return (
    <aside
      className={`rail${open ? ' open' : ''}`}
      role="complementary"
      aria-label="Decision trace detail"
    >
      <div
        className={`rail-drag-handle${dragging ? ' dragging' : ''}`}
        onMouseDown={onDragStart}
        onDoubleClick={onDragReset}
        onKeyDown={handleKeyDown}
        role="separator"
        aria-label="Resize detail panel"
        aria-orientation="vertical"
        aria-valuenow={width}
        aria-valuemin={minWidth}
        aria-valuemax={maxWidth}
        tabIndex={0}
        title="Drag to resize · double-click to reset"
      />
      {!trace && <div className="rail-empty">SELECT A DECISION</div>}

      {trace && (
        <>
          <button
            type="button"
            className="rail-close"
            onClick={onClose}
            aria-label="Close detail panel"
          >
            ✕ CLOSE
          </button>

          <div className="rail-eyebrow">DECISION TRACE · {trace.id}</div>
          <h2 className="rail-title">{trace.topic}</h2>

          <div className="rail-meta" aria-label="Trace metadata">
            <div className="rail-meta-pair">
              <span className="rail-meta-key">STATUS</span>
              <span className="rail-meta-val" style={{ color: statusColor(trace.status) }}>
                {trace.status}
              </span>
            </div>
            <div className="rail-meta-pair">
              <span className="rail-meta-key">OPENED</span>
              <span className="rail-meta-val">{formatIsoDate(trace.opened_at)}</span>
            </div>
            <div className="rail-meta-pair">
              <span className="rail-meta-key">RESOLVED</span>
              <span className="rail-meta-val">{formatIsoDate(trace.resolved_at)}</span>
            </div>
            <div className="rail-meta-pair">
              <span className="rail-meta-key">TURNS</span>
              <span className="rail-meta-val">{trace.turn_count}</span>
            </div>
            <div className="rail-meta-pair">
              <span className="rail-meta-key">PARTICIPANTS</span>
              <span className="rail-meta-val">{trace.participants.join(' · ')}</span>
            </div>
          </div>

          <div className="rail-divider" />

          <div className="rail-tabs" role="tablist" aria-label="Detail views">
            {(['summary', 'thread', 'session'] as const).map((name) => (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={tab === name}
                className={`rail-tab${tab === name ? ' active' : ''}`}
                onClick={() => onTabChange(name)}
              >
                {name.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="rail-content" role="tabpanel">
            {tab === 'summary' && <SummaryTab trace={trace} />}
            {tab === 'thread' && <ThreadTab trace={trace} />}
            {tab === 'session' && (
              <SessionTab
                trace={trace}
                projectName={projectName}
                projectPath={projectPath}
                onReveal={onReveal}
              />
            )}
          </div>

          <div className="kbd-hints" aria-hidden="true">
            <span><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> TABS</span>
            <span><kbd>J</kbd><kbd>K</kbd> NAV</span>
            <span><kbd>/</kbd> SEARCH</span>
            <span><kbd>⎋</kbd> CLOSE</span>
          </div>
        </>
      )}
    </aside>
  )
}
