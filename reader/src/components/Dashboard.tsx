import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { IndexedTrace, LensSelection, ProjectEntry, StatusFilter } from '../lib/types'
import { useTraces } from '../lib/useTraces'
import { applyAll } from '../lib/filters'
import { Topbar } from './Topbar'
import { Sidebar } from './Sidebar'
import { Main } from './Main'
import { RightRail, type RailTab } from './RightRail'
import { SetPasscodeBanner } from './SetPasscodeBanner'
import { api } from '../lib/api'

interface DashboardProps {
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  initialProject: ProjectEntry
  onSwitchProject: () => void
  onLock: () => void
  firstRun: boolean
  onPasscodeSet: () => void
}

export function Dashboard({
  theme,
  onToggleTheme,
  initialProject,
  onSwitchProject,
  onLock,
  firstRun,
  onPasscodeSet
}: DashboardProps) {
  const {
    traces,
    project,
    errors,
    isLoading,
    error,
    watcherConnected
  } = useTraces(initialProject.name)

  const DEFAULT_RAIL_WIDTH = 296
  const MIN_RAIL_WIDTH = 280
  const getMaxRailWidth = (): number =>
    typeof window === 'undefined' ? 760 : Math.floor(window.innerWidth * 0.6)

  const [status, setStatus] = useState<StatusFilter>('all')
  const [query, setQuery] = useState('')
  const [lens, setLens] = useState<LensSelection | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<RailTab>('summary')
  const [railOpen, setRailOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [railWidth, setRailWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_RAIL_WIDTH
    const raw = window.localStorage.getItem('decision-journal.railWidth') ?? window.localStorage.getItem('alignmem.railWidth') ?? ''
    const stored = parseInt(raw, 10)
    if (Number.isFinite(stored) && stored >= MIN_RAIL_WIDTH) return stored
    return DEFAULT_RAIL_WIDTH
  })
  const [maxRailWidth, setMaxRailWidth] = useState<number>(() => getMaxRailWidth())
  const [isDraggingRail, setIsDraggingRail] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // Keep max width in sync with viewport resize so the clamp stays current.
  useEffect(() => {
    const onResize = (): void => setMaxRailWidth(getMaxRailWidth())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Persist rail width on every change. localStorage is fine at this frequency.
  useEffect(() => {
    try {
      window.localStorage.setItem('decision-journal.railWidth', String(railWidth))
    } catch {
      // ignore quota errors
    }
  }, [railWidth])

  const clampRailWidth = useCallback(
    (next: number): number => Math.min(maxRailWidth, Math.max(MIN_RAIL_WIDTH, next)),
    [maxRailWidth]
  )

  const onRailDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDraggingRail(true)
  }, [])

  const onRailReset = useCallback(() => {
    setRailWidth(DEFAULT_RAIL_WIDTH)
  }, [])

  const onRailKeyAdjust = useCallback(
    (delta: number) => {
      setRailWidth((w) => clampRailWidth(w + delta))
    },
    [clampRailWidth]
  )

  // Document-level mouse listeners, attached only while dragging.
  useEffect(() => {
    if (!isDraggingRail) return
    const onMove = (e: MouseEvent): void => {
      // Rail sits on the right edge; new width = distance from pointer to right edge
      const next = clampRailWidth(window.innerWidth - e.clientX)
      setRailWidth(next)
    }
    const onUp = (): void => setIsDraggingRail(false)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    const prevCursor = document.body.style.cursor
    const prevSelect = document.body.style.userSelect
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = prevCursor
      document.body.style.userSelect = prevSelect
    }
  }, [isDraggingRail, clampRailWidth])

  const filtered = useMemo<IndexedTrace[]>(
    () => applyAll(traces, { status, query, lens }),
    [traces, status, query, lens]
  )

  const selected = useMemo(
    () => filtered.find((t) => t.id === selectedId) ?? traces.find((t) => t.id === selectedId) ?? null,
    [filtered, traces, selectedId]
  )

  const handleSelect = useCallback((id: string | null) => {
    setSelectedId(id)
    if (id) {
      setTab('summary')
      setRailOpen(true)
    } else {
      setRailOpen(false)
    }
  }, [])

  const handleReveal = useCallback(() => {
    if (!selected || !project) return
    void api.reveal(project.name, selected.id).catch(() => {
      /* non-blocking */
    })
  }, [selected, project])

  // Keyboard shortcuts at the document level.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName.toLowerCase() ?? ''
      const isTyping = tag === 'input' || tag === 'textarea' || target?.isContentEditable === true
      if (e.key === '/' && !isTyping) {
        e.preventDefault()
        searchRef.current?.focus()
        return
      }
      if (e.key === 'Escape') {
        handleSelect(null)
        return
      }
      if (isTyping) return
      if (e.key === '1' && selected) {
        setTab('summary')
        return
      }
      if (e.key === '2' && selected) {
        setTab('thread')
        return
      }
      if (e.key === '3' && selected) {
        setTab('session')
        return
      }
      if ((e.key === 'j' || e.key === 'J') && filtered.length > 0) {
        const idx = Math.max(0, filtered.findIndex((t) => t.id === selectedId))
        const next = filtered[Math.min(filtered.length - 1, idx + 1)]
        if (next) handleSelect(next.id)
        return
      }
      if ((e.key === 'k' || e.key === 'K') && filtered.length > 0) {
        const idx = filtered.findIndex((t) => t.id === selectedId)
        const prev = filtered[Math.max(0, idx - 1)]
        if (prev) handleSelect(prev.id)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [filtered, selected, selectedId, handleSelect])

  const lastCapturedAt = traces[0]?.captured_at ?? null
  const showBanner = errors.length > 0 || (!watcherConnected && !isLoading && !error)

  return (
    <div
      className="shell"
      data-theme={theme}
      style={{ ['--rail-width' as string]: `${railWidth}px` }}
    >
      <Topbar
        theme={theme}
        onToggleTheme={onToggleTheme}
        project={project}
        traceCount={traces.length}
        lastCapturedAt={lastCapturedAt}
        onLock={onLock}
      />
      {firstRun && <SetPasscodeBanner onSet={onPasscodeSet} />}
      {showBanner && (
        <div
          className="banner"
          role="status"
          style={{ gridColumn: '1 / -1' }}
        >
          {errors.length > 0
            ? `${errors.length} TRACE FILE(S) COULD NOT BE READ — ${errors.map((e) => e.file).join(', ')}`
            : 'LIVE WATCHER DISCONNECTED — ATTEMPTING TO RECONNECT'}
        </div>
      )}
      <Sidebar
        traces={traces}
        lens={lens}
        onLensChange={setLens}
        project={project}
        onSwitchProject={onSwitchProject}
        onLock={onLock}
        isOpen={sidebarOpen}
      />
      <Main
        traces={filtered}
        selectedId={selected?.id ?? null}
        onSelect={handleSelect}
        status={status}
        onStatusChange={setStatus}
        query={query}
        onQueryChange={setQuery}
        lens={lens}
        searchRef={searchRef}
        isLoading={isLoading}
        loadError={error}
      />
      <RightRail
        trace={selected}
        tab={tab}
        onTabChange={setTab}
        projectName={project?.name ?? ''}
        projectPath={project?.path ?? null}
        onReveal={handleReveal}
        onClose={() => handleSelect(null)}
        open={railOpen}
        dragging={isDraggingRail}
        onDragStart={onRailDragStart}
        onDragReset={onRailReset}
        onDragKeyAdjust={onRailKeyAdjust}
        width={railWidth}
        minWidth={MIN_RAIL_WIDTH}
        maxWidth={maxRailWidth}
      />
      {/* Sidebar toggle for small screens */}
      <button
        type="button"
        className="sidebar-toggle"
        style={{ position: 'fixed', top: 10, left: 10, zIndex: 30, display: 'none' }}
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label="Toggle sidebar"
      >
        ☰
      </button>
    </div>
  )
}
