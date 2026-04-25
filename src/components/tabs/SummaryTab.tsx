import type { IndexedTrace } from '../../lib/types'
import { Tag } from '../primitives/Tag'
import { ProseBlock } from '../primitives/ProseBlock'

interface SummaryTabProps {
  trace: IndexedTrace
}

export function SummaryTab({ trace }: SummaryTabProps) {
  const related = trace.topic_tags.filter((t) => t !== trace.category)
  return (
    <div>
      {trace.resolution_summary ? (
        <div style={{ marginBottom: 16 }}>
          <ProseBlock text={trace.resolution_summary} />
        </div>
      ) : (
        <div className="summary-body">No resolution summary yet.</div>
      )}

      {trace.revisit_trigger && (
        <div className="revisit-trigger">
          <div className="revisit-trigger-label">REVISIT TRIGGER</div>
          <ProseBlock text={trace.revisit_trigger} className="revisit-trigger-body" />
        </div>
      )}

      <div className="chip-row">
        <Tag as="span" color="var(--amber)">
          {trace.category}
        </Tag>
        {related.map((tag) => (
          <Tag key={tag} as="span" color="var(--text-300)">
            {tag}
          </Tag>
        ))}
      </div>
    </div>
  )
}
