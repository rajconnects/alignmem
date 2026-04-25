import type { IndexedTrace } from '../../lib/types'
import { formatIsoDate, sortNodesBySequence } from '../../lib/format'
import { ProseBlock } from '../primitives/ProseBlock'

interface ThreadTabProps {
  trace: IndexedTrace
}

// Renders the trace's deliberation. DTP traces show alternatives as
// "Considered / Rejected because" cards. Engine traces show their nested
// node sequence. A trace can have both (mixed-shape migrations); render
// alternatives first, then nodes, with a visible separator if both exist.
export function ThreadTab({ trace }: ThreadTabProps) {
  const alternatives = trace.decision?.alternatives ?? []
  const nodes = sortNodesBySequence(trace.nodes)
  const hasBoth = alternatives.length > 0 && nodes.length > 0
  const hasNeither = alternatives.length === 0 && nodes.length === 0

  if (hasNeither) {
    return (
      <div className="thread-list" role="list" aria-label="Decision deliberation">
        <div className="summary-body">No deliberation captured.</div>
      </div>
    )
  }

  return (
    <div className="thread-list" role="list" aria-label="Decision deliberation">
      {alternatives.length > 0 && (
        <>
          {trace.decision?.statement && (
            <article
              className="thread-node thread-node-decision"
              role="listitem"
              aria-label="Decision statement"
            >
              <div className="thread-eyebrow">DECISION · {trace.author?.name?.toUpperCase() ?? 'AUTHOR'}</div>
              <div className="thread-divider" />
              <ProseBlock text={trace.decision.statement} className="thread-body" />
            </article>
          )}
          {alternatives.map((alt, idx) => (
            <article
              key={`alt-${idx}`}
              className="thread-node thread-node-alternative"
              role="listitem"
              aria-label={`Alternative ${idx + 1}, considered`}
            >
              <div className="thread-eyebrow">CONSIDERED · ALTERNATIVE {idx + 1}</div>
              <div className="thread-divider" />
              <ProseBlock text={alt.option} className="thread-body" />
              <div className="thread-rejected-label">REJECTED BECAUSE</div>
              <ProseBlock text={alt.rejected_because} className="thread-body thread-rejected-body" />
            </article>
          ))}
        </>
      )}

      {hasBoth && <div className="thread-section-separator" />}

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
