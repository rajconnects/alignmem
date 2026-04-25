import type { IndexedTrace } from '../../lib/types'
import { Tag } from '../primitives/Tag'
import { ProseBlock } from '../primitives/ProseBlock'

interface SummaryTabProps {
  trace: IndexedTrace
}

// Renders the trace's headline content. DTP v0.1: decision.statement is
// the distilled commitment; the full reasoning lives in nodes[] (rendered
// by ThreadTab). Engine traces fall back to resolution_summary.
export function SummaryTab({ trace }: SummaryTabProps) {
  const related = trace.topic_tags.filter((t) => t !== trace.category)
  const decision = trace.decision

  // Headline: prefer decision.statement (DTP), fall back to resolution_summary (engine).
  const headline = decision?.statement ?? trace.resolution_summary

  return (
    <div>
      {headline ? (
        <div className="summary-statement" style={{ marginBottom: 16 }}>
          <ProseBlock text={headline} />
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

      {/* Topic tags (legacy + derived) — only show if distinct from themes */}
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
