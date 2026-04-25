import type { IndexedTrace } from '../../lib/types'
import { formatIsoDate, sortNodesBySequence } from '../../lib/format'
import { ProseBlock } from '../primitives/ProseBlock'

interface ThreadTabProps {
  trace: IndexedTrace
}

// Renders the trace's deliberation as the canonical conversation thread.
// nodes[] is the single source of truth — intent → response → dissent →
// resolution turns between authors. Aligned with the V1 SaaS decision_nodes
// table.
//
// Legacy decision.alternatives[] is treated as deprecated. If a trace has
// alternatives but no nodes (pre-migration data), we degrade gracefully
// by surfacing the alternatives via the same .thread-node styling so the
// reader doesn't show an empty thread.
export function ThreadTab({ trace }: ThreadTabProps) {
  const nodes = sortNodesBySequence(trace.nodes)

  // Empty deliberation — single-author no-discussion capture.
  if (nodes.length === 0) {
    return (
      <div className="thread-list" role="list" aria-label="Decision deliberation">
        <div className="summary-body">
          No deliberation captured. This trace records the decision only.
        </div>
      </div>
    )
  }

  return (
    <div className="thread-list" role="list" aria-label="Decision deliberation">
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
