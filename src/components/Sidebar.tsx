import { useState, type ReactNode } from 'react'
import type { IndexedTrace, LensSelection, ProjectEntry } from '../lib/types'
import { collaboratorCounts, timeCounts, topicCounts } from '../lib/filters'

interface SidebarProps {
  traces: readonly IndexedTrace[]
  lens: LensSelection | null
  onLensChange: (lens: LensSelection | null) => void
  project: ProjectEntry | null
  onSwitchProject: () => void
  onLock: () => void
  isOpen?: boolean
}

interface LensRowProps {
  label: string
  count: number
  active: boolean
  onClick: () => void
}

function LensRow({ label, count, active, onClick }: LensRowProps) {
  return (
    <button
      type="button"
      className={`spine-row${active ? ' active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className="s-name">{label}</span>
      <span className="s-count">{count}</span>
    </button>
  )
}

const DEFAULT_VISIBLE = 5

interface LensSectionProps {
  header: string
  totalCount: number
  emptyFallback?: boolean
  collapsible: boolean
  children: ReactNode[]
}

// Wraps a list of LensRow children with a SHOW MORE / SHOW LESS toggle
// when the list exceeds DEFAULT_VISIBLE items. Non-collapsible lists
// (e.g. the 4-row time lens) render every child directly.
function LensSection({ header, totalCount, emptyFallback, collapsible, children }: LensSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const visible = collapsible && !expanded ? children.slice(0, DEFAULT_VISIBLE) : children
  const overflow = collapsible && children.length > DEFAULT_VISIBLE
  return (
    <>
      <div className="side-head">{header}</div>
      {children.length === 0 && emptyFallback && (
        <div className="side-head" style={{ textTransform: 'none' }}>—</div>
      )}
      {visible}
      {overflow && (
        <button
          type="button"
          className="side-show-more"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? '− SHOW LESS' : `+ SHOW ALL (${totalCount})`}
        </button>
      )}
    </>
  )
}

export function Sidebar({
  traces,
  lens,
  onLensChange,
  project,
  onSwitchProject,
  onLock,
  isOpen
}: SidebarProps) {
  const topics = topicCounts(traces)
  const collaborators = collaboratorCounts(traces)
  const times = timeCounts(traces)

  const isActive = (kind: LensSelection['kind'], value: string): boolean =>
    lens != null && lens.kind === kind && lens.value === value

  const toggle = (kind: LensSelection['kind'], value: string): void => {
    if (isActive(kind, value)) {
      onLensChange(null)
    } else {
      onLensChange({ kind, value })
    }
  }

  const topicRows = topics.map((t) => (
    <LensRow
      key={`topic-${t.value}`}
      label={t.value}
      count={t.count}
      active={isActive('topic', t.value)}
      onClick={() => toggle('topic', t.value)}
    />
  ))

  const collabRows = collaborators.map((c) => (
    <LensRow
      key={`collab-${c.value}`}
      label={c.value}
      count={c.count}
      active={isActive('collaborator', c.value)}
      onClick={() => toggle('collaborator', c.value)}
    />
  ))

  const timeRows = times.map((t) => (
    <LensRow
      key={`time-${t.value}`}
      label={t.label}
      count={t.count}
      active={isActive('time', t.value)}
      onClick={() => toggle('time', t.value)}
    />
  ))

  return (
    <aside className={`side${isOpen ? ' open' : ''}`} role="complementary" aria-label="Lens filters">
      <LensSection header="LENS / TOPIC" totalCount={topics.length} emptyFallback collapsible>
        {topicRows}
      </LensSection>

      <div className="side-divider" />

      <LensSection header="LENS / COLLABORATOR" totalCount={collaborators.length} collapsible>
        {collabRows}
      </LensSection>

      <div className="side-divider" />

      <LensSection header="LENS / TIME" totalCount={times.length} collapsible={false}>
        {timeRows}
      </LensSection>

      <div className="side-footer">
        <div className="side-footer-project" title={project?.path ?? ''}>
          {project?.name ?? '—'}
        </div>
        <div className="side-footer-links">
          <button type="button" className="side-footer-link" onClick={onSwitchProject}>
            SWITCH PROJECT
          </button>
          <button type="button" className="side-footer-link" onClick={onLock}>
            LOCK ⎋
          </button>
        </div>
      </div>
    </aside>
  )
}
