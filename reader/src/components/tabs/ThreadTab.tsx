import type { IndexedTrace } from '../../lib/types'
import { formatIsoDate, sortNodesBySequence } from '../../lib/format'
import { ProseBlock } from '../primitives/ProseBlock'

interface ThreadTabProps {
  trace: IndexedTrace
}

export function ThreadTab({ trace }: ThreadTabProps) {
  const nodes = sortNodesBySequence(trace.nodes)
  return (
    <div className="thread-list" role="list" aria-label="Decision thread">
      {nodes.map((node) => {
        const dissent = node.node_type === 'dissent'
        const eyebrow = `${node.node_type.toUpperCase()} · ${node.author_name.toUpperCase()} · ${formatIsoDate(node.created_at)}`
        return (
          <article
            key={node.id}
            className={`thread-node${dissent ? ' dissent' : ''}`}
            role="listitem"
            aria-label={dissent ? `Dissent node from ${node.author_name}` : undefined}
          >
            <div className="thread-eyebrow">
              {dissent
                ? `DISSENT · ${node.author_name.toUpperCase()} · ${formatIsoDate(node.created_at)}`
                : eyebrow}
            </div>
            <div className="thread-divider" />
            <ProseBlock text={node.content} className="thread-body" />
          </article>
        )
      })}
    </div>
  )
}
