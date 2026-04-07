import type { IndexedTrace } from '../lib/types'
import { buildCardMetaLine, signalFor, statusColorVar } from '../lib/format'
import { Tag } from './primitives/Tag'

interface CardRowProps {
  trace: IndexedTrace
  selected: boolean
  onSelect: (id: string) => void
}

export function CardRow({ trace, selected, onSelect }: CardRowProps) {
  const color = statusColorVar(trace.status)
  return (
    <button
      type="button"
      className={`card-row${selected ? ' selected' : ''}`}
      onClick={() => onSelect(trace.id)}
      aria-pressed={selected}
      aria-label={`${trace.status} trace — ${trace.topic}`}
    >
      <span className="card-sig" style={{ color }}>
        {signalFor(trace.status)}
      </span>
      <div className="card-body">
        <div className="card-headline">{trace.topic}</div>
        <div className="card-meta">{buildCardMetaLine(trace)}</div>
      </div>
      <div className="card-tag">
        <Tag as="span" color={color}>
          {trace.category}
        </Tag>
      </div>
    </button>
  )
}
