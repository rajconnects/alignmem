import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProseBlock } from '../../components/primitives/ProseBlock'

function render(text: string): string {
  return renderToStaticMarkup(createElement(ProseBlock, { text }))
}

describe('ProseBlock', () => {
  it('renders short text as a single paragraph', () => {
    const html = render('This is a short decision summary.')
    expect(html).toContain('<p class="prose-para">This is a short decision summary.</p>')
  })

  it('splits long prose into multiple paragraphs', () => {
    const text =
      'Roadmap v2 is locked. The product is no longer organized around Decision Trace. ' +
      'Decision Trace is demoted to a capture primitive. The product is the full institutional memory layer. ' +
      'Three milestones defined. Five design tenets made invariant. MVP acceptance criterion established. ' +
      'Self-serve tier is a narrow-but-complete vertical slice. Synced to the specs repo.'
    const html = render(text)
    const paragraphs = html.match(/<p /g)
    expect(paragraphs).not.toBeNull()
    expect(paragraphs!.length).toBeGreaterThanOrEqual(2)
  })

  it('detects lettered list pattern and renders list items', () => {
    const text =
      'Revisit if (a) M1 Cowork skills fail to hit 25 CEOs, ' +
      '(b) the schema play fails to gain traction, ' +
      '(c) investor feedback rejects the sequencing, or ' +
      '(d) the hybrid org thesis weakens.'
    const html = render(text)
    expect(html).toContain('prose-list-item')
    expect(html).toContain('prose-list-label')
    // Should have at least 3 list items
    const items = html.match(/prose-list-item/g)
    expect(items!.length).toBeGreaterThanOrEqual(3)
  })

  it('detects enumerated point pattern', () => {
    const text =
      'Three structural tensions. First: M2.2 contradicts the April 3 lock. ' +
      'Second: the sequencing does not compound audiences. ' +
      'Third: open-sourcing is a strategic decision.'
    const html = render(text)
    expect(html).toContain('prose-list-item')
    expect(html).toContain('First')
    expect(html).toContain('Second')
  })

  it('highlights single-quoted terms in mono', () => {
    const text = "The product is 'institutional memory' not 'decision trace'."
    const html = render(text)
    expect(html).toContain('prose-term')
    expect(html).toContain('institutional memory')
  })

  it('highlights milestone refs in amber', () => {
    const text = 'Three milestones: (M1) Free Cowork Skills, (M2) Alignmem Core, (M3) Enterprise.'
    const html = render(text)
    expect(html).toContain('prose-ref')
    expect(html).toContain('(M1)')
    expect(html).toContain('(M2)')
  })

  it('renders arrow chains with styled separator', () => {
    const text = 'ingest → compile → schema → HIL'
    const html = render(text)
    expect(html).toContain('prose-arrow')
  })

  it('handles empty/short text gracefully', () => {
    expect(render('')).toContain('prose-para')
    expect(render('OK')).toContain('OK')
  })
})
