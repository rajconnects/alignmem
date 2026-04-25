import type { RefObject } from 'react'
import type { IndexedTrace, LensSelection, StatusFilter } from '../lib/types'
import { FilterBar } from './FilterBar'
import { CardRow } from './CardRow'

interface MainProps {
  traces: readonly IndexedTrace[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  status: StatusFilter
  onStatusChange: (status: StatusFilter) => void
  query: string
  onQueryChange: (value: string) => void
  lens: LensSelection | null
  searchRef: RefObject<HTMLInputElement>
  isLoading: boolean
  loadError: string | null
}

function titleForLens(lens: LensSelection | null): string {
  if (!lens) return 'All Decision Traces'
  if (lens.kind === 'time') {
    const labels: Record<string, string> = {
      '7d': 'Last 7 Days',
      '14d': 'Last 14 Days',
      '30d': 'Last 30 Days',
      older: 'Older Decisions'
    }
    return labels[lens.value] ?? 'Decisions'
  }
  if (lens.kind === 'collaborator') return `Decisions with ${lens.value}`
  return `Topic · ${lens.value}`
}

export function Main({
  traces,
  selectedId,
  onSelect,
  status,
  onStatusChange,
  query,
  onQueryChange,
  lens,
  searchRef,
  isLoading,
  loadError
}: MainProps) {
  return (
    <main className="main" role="main">
      <div className="main-header">
        <div>
          <div className="main-eyebrow">DECISION TRACES · {traces.length} SHOWING</div>
          <h1 className="main-title">{titleForLens(lens)}</h1>
        </div>
      </div>

      <FilterBar
        status={status}
        onStatusChange={onStatusChange}
        query={query}
        onQueryChange={onQueryChange}
        searchRef={searchRef}
      />

      {loadError && <div className="main-empty" style={{ color: 'var(--red)' }}>{loadError}</div>}

      {!loadError && isLoading && <div className="main-empty">LOADING TRACES…</div>}

      {!loadError && !isLoading && traces.length === 0 && (
        <div className="main-empty">NO DECISIONS MATCH YOUR CURRENT FILTERS.</div>
      )}

      {!loadError && traces.length > 0 && (
        <div role="list" aria-label="Decision traces">
          {traces.map((trace) => (
            <CardRow
              key={trace.id}
              trace={trace}
              selected={trace.id === selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </main>
  )
}
