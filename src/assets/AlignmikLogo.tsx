import logoSrc from './alignmink-logo.png'

// Official Alignmink wordmark — single source file (dark strokes on
// white background). CSS composites it correctly for both themes:
//
//   Light theme:  mix-blend-mode: multiply
//                 White background × white topbar = white → invisible.
//                 Dark strokes × white topbar = dark strokes → visible.
//
//   Dark theme:   filter: invert(1) + mix-blend-mode: screen
//                 Invert flips white-bg→black, dark-strokes→white.
//                 Screen: black × dark topbar → dark topbar → invisible.
//                 Screen: white × dark topbar → white → visible.
//
// This approach uses a single opaque PNG without any alpha channel and
// produces pixel-clean transparency on both themes.
interface AlignmikLogoProps {
  theme: 'dark' | 'light'
  className?: string
  ariaLabel?: string
}

export function AlignmikLogo({ theme, className, ariaLabel = 'Alignmink' }: AlignmikLogoProps) {
  const isDark = theme === 'dark'
  return (
    <img
      src={logoSrc}
      alt={ariaLabel}
      className={className ?? 'alignmik-logo'}
      style={{
        filter: isDark ? 'invert(1)' : undefined,
        mixBlendMode: isDark ? 'screen' : 'multiply'
      }}
    />
  )
}
