import type { IndexedTrace } from '../../lib/types'
import { Tag } from '../primitives/Tag'
import { ProseBlock } from '../primitives/ProseBlock'

interface SummaryTabProps {
  trace: IndexedTrace
}

// Renders the trace's headline content. DTP v0.1 uses
// decision.statement + decision.reasoning; engine traces use
// resolution_summary. DTP wins if both present (cleaner separation
// of decision vs reasoning); engine fallback covers legacy data.
export function SummaryTab({ trace }: SummaryTabProps) {
  const related = trace.topic_tags.filter((t) => t !== trace.category)
  const decision = trace.decision

  return (
    <div>
      {decision ? (
        <>
          <div className="summary-statement" style={{ marginBottom: 14 }}>
            <ProseBlock text={decision.statement} />
          </div>
          {decision.reasoning && (
            <div style={{ marginBottom: 16 }}>
              <div className="summary-section-label">REASONING</div>
              <ProseBlock text={decision.reasoning} />
            </div>
          )}
        </>
      ) : trace.resolution_summary ? (
        <div style={{ marginBottom: 16 }}>
          <ProseBlock text={trace.resolution_summary} />
        </div>
      ) : (
        <div className="summary-body">No decision summary yet.</div>
      )}

      {/* Revisit triggers — DTP array preferred; legacy single string fallback */}
      {trace.revisit_triggers && trace.revisit_triggers.length > 0 ? (
        <div className="revisit-trigger">
          <div className="revisit-trigger-label">REVISIT TRIGGERS</div>
          <ul className="revisit-trigger-list">
            {trace.revisit_triggers.map((t, i) => (
              <li key={i} className="revisit-trigger-item">{t}</li>
            ))}
          </ul>
        </div>
      ) : trace.revisit_trigger && (
        <div className="revisit-trigger">
          <div className="revisit-trigger-label">REVISIT TRIGGER</div>
          <ProseBlock text={trace.revisit_trigger} className="revisit-trigger-body" />
        </div>
      )}

      {/* Themes (DTP) — stakeholder-oriented; rendered with amber accent */}
      {trace.themes && trace.themes.length > 0 && (
        <div className="theme-row">
          <div className="summary-section-label">THEMES</div>
          <div className="chip-row">
            {trace.themes.map((t) => (
              <Tag key={t} as="span" color="var(--amber)">
                {t}
              </Tag>
            ))}
          </div>
        </div>
      )}

      {/* Topic tags (legacy + derived) — only render if distinct from themes */}
      {(trace.category || related.length > 0) && (
        <div className="chip-row">
          {trace.category && (
            <Tag as="span" color="var(--text-300)">
              {trace.category}
            </Tag>
          )}
          {related
            .filter((tag) => !(trace.themes ?? []).includes(tag))
            .map((tag) => (
              <Tag key={tag} as="span" color="var(--text-300)">
                {tag}
              </Tag>
            ))}
        </div>
      )}
    </div>
  )
}
