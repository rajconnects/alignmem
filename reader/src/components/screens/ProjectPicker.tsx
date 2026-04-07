import { useEffect, useState } from 'react'
import type { ProjectEntry } from '../../lib/types'
import { api } from '../../lib/api'
import { Topbar } from '../Topbar'
import { SetPasscodeBanner } from '../SetPasscodeBanner'
import { formatCapturedShort } from '../../lib/format'

interface ProjectPickerProps {
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  onSelect: (project: ProjectEntry) => void
  onLock: () => void
  firstRun: boolean
  onPasscodeSet: () => void
}

interface PickerState {
  projects: ProjectEntry[]
  loading: boolean
  error: string | null
  manualPath: string
  browsing: boolean
}

const initialState: PickerState = {
  projects: [],
  loading: true,
  error: null,
  manualPath: '',
  browsing: false
}

export function ProjectPicker({ theme, onToggleTheme, onSelect, onLock, firstRun, onPasscodeSet }: ProjectPickerProps) {
  const [state, setState] = useState<PickerState>(initialState)

  useEffect(() => {
    let cancelled = false
    api
      .listProjects()
      .then((projects) => {
        if (cancelled) return
        setState((s) => ({ ...s, projects, loading: false }))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to list projects'
        }))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const submitPath = async (rawPath: string): Promise<void> => {
    const path = rawPath.trim()
    if (!path) return
    try {
      const { project, projects } = await api.addProject(path)
      setState((s) => ({ ...s, projects, browsing: false, manualPath: '', error: null }))
      onSelect(project)
    } catch (err: unknown) {
      setState((s) => ({
        ...s,
        error: err instanceof Error ? err.message : 'Failed to add project'
      }))
    }
  }

  return (
    <div className="auth-shell" data-theme={theme}>
      <Topbar
        theme={theme}
        onToggleTheme={onToggleTheme}
        project={null}
        traceCount={0}
        lastCapturedAt={null}
        onLock={onLock}
      />

      {firstRun && <SetPasscodeBanner onSet={onPasscodeSet} />}
      <div className="picker-main">
        <div className="picker-eyebrow">PICK A PROJECT</div>

        <button
          type="button"
          className="picker-row browse"
          onClick={() => setState((s) => ({ ...s, browsing: !s.browsing }))}
        >
          <span className="picker-sig">+</span>
          <span className="picker-path">BROWSE FOLDER…</span>
          <span className="picker-meta">{state.browsing ? 'CANCEL' : 'PASTE ABSOLUTE PATH'}</span>
        </button>

        {state.browsing && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void submitPath(state.manualPath)
            }}
            style={{ display: 'flex', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}
          >
            <input
              className="auth-input"
              type="text"
              style={{ flex: 1 }}
              value={state.manualPath}
              onChange={(e) => setState((s) => ({ ...s, manualPath: e.target.value }))}
              placeholder="/path/to/project  OR  .../alignmink-traces  OR  .../alignmink-traces/threads"
              autoFocus
              aria-label="Project absolute path"
            />
            <button type="submit" className="auth-submit" style={{ width: 'auto' }}>
              → ADD
            </button>
          </form>
        )}

        {state.error && (
          <div className="auth-error" role="alert" style={{ margin: '12px 0' }}>
            {state.error.toUpperCase()}
          </div>
        )}

        {state.loading && <div className="main-empty">LOADING PROJECTS…</div>}

        {!state.loading && state.projects.length === 0 && !state.error && (
          <div className="main-empty">NO PROJECTS YET — BROWSE TO ADD ONE.</div>
        )}

        {state.projects.map((p) => (
          <button
            key={p.path}
            type="button"
            className="picker-row"
            onClick={() => onSelect(p)}
            aria-label={`Select project ${p.name}`}
          >
            <span className="picker-sig">+</span>
            <span className="picker-path">{p.path}</span>
            <span className="picker-meta">
              {(p.trace_count ?? 0)} TRACES · SEEN {formatCapturedShort(p.last_seen)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
