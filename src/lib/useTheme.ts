import { useCallback, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

const STORAGE_KEY = 'decision-journal.theme'
const LEGACY_KEY = 'alignmem.theme'

function readInitial(): Theme {
  if (typeof document === 'undefined') return 'dark'
  const stored = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return 'dark'
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(readInitial)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggle }
}
