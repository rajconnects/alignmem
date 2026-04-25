import type { CSSProperties, ReactNode } from 'react'

interface TagProps {
  children: ReactNode
  active?: boolean
  color?: string
  onClick?: () => void
  as?: 'button' | 'span'
  ariaPressed?: boolean
  title?: string
}

// The .tag primitive: mono 10px uppercase, 1px border in currentColor,
// square corners. Same treatment for status chips (button) and inline
// category labels (span).
export function Tag({ children, active, color, onClick, as = 'button', ariaPressed, title }: TagProps) {
  const style: CSSProperties = color ? { color } : {}
  const className = `tag${active ? ' active' : ''}${as === 'span' ? ' static' : ''}`
  if (as === 'span') {
    return (
      <span className={className} style={style} title={title}>
        {children}
      </span>
    )
  }
  return (
    <button
      type="button"
      className={className}
      style={style}
      onClick={onClick}
      aria-pressed={ariaPressed}
      title={title}
    >
      {children}
    </button>
  )
}
