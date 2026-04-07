import type { ChangeEvent, RefObject } from 'react'
import type { StatusFilter } from '../lib/types'
import { Tag } from './primitives/Tag'

interface FilterBarProps {
  status: StatusFilter
  onStatusChange: (status: StatusFilter) => void
  query: string
  onQueryChange: (value: string) => void
  searchRef: RefObject<HTMLInputElement>
}

const STATUSES: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'ALL' },
  { value: 'open', label: 'OPEN' },
  { value: 'resolved', label: 'RESOLVED' },
  { value: 'contested', label: 'CONTESTED' },
  { value: 'archived', label: 'ARCHIVED' }
]

export function FilterBar({ status, onStatusChange, query, onQueryChange, searchRef }: FilterBarProps) {
  const onInput = (e: ChangeEvent<HTMLInputElement>): void => onQueryChange(e.target.value)
  return (
    <div className="filter-bar" role="toolbar" aria-label="Filters">
      <div className="chips" role="group" aria-label="Status filter">
        {STATUSES.map((s) => (
          <Tag
            key={s.value}
            active={status === s.value}
            onClick={() => onStatusChange(s.value)}
            ariaPressed={status === s.value}
          >
            {s.label}
          </Tag>
        ))}
      </div>
      <label className="search-wrap" aria-label="Search topic or resolution">
        <input
          ref={searchRef}
          className="search-input"
          type="search"
          value={query}
          onChange={onInput}
          placeholder="SEARCH TOPIC OR RESOLUTION…"
          spellCheck={false}
          autoComplete="off"
        />
      </label>
    </div>
  )
}
