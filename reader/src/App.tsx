import { useCallback, useEffect, useState } from 'react'
import { api } from './lib/api'
import type { ProjectEntry } from './lib/types'
import { useTheme } from './lib/useTheme'
import { Login } from './components/screens/Login'
import { ProjectPicker } from './components/screens/ProjectPicker'
import { Dashboard } from './components/Dashboard'

type AppState =
  | { kind: 'loading' }
  | { kind: 'auth' }
  | { kind: 'picker'; firstRun: boolean }
  | { kind: 'dashboard'; project: ProjectEntry; firstRun: boolean }

export default function App() {
  const [state, setState] = useState<AppState>({ kind: 'loading' })
  const { theme, toggle } = useTheme()

  const refreshAuth = useCallback(async (): Promise<void> => {
    try {
      const status = await api.authStatus()
      if (!status.authed) {
        // Not authed + not first run = passcode exists, need to unlock
        setState({ kind: 'auth' })
        return
      }
      // Authed (either via cookie or auto-auth on first run) → picker
      setState({ kind: 'picker', firstRun: status.firstRun })
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error('auth status failed', err)
      setState({ kind: 'auth' })
    }
  }, [])

  useEffect(() => {
    void refreshAuth()
  }, [refreshAuth])

  const onLogin = useCallback(() => setState({ kind: 'picker', firstRun: false }), [])
  const onSelectProject = useCallback(
    (project: ProjectEntry) =>
      setState((prev) => ({
        kind: 'dashboard',
        project,
        firstRun: prev.kind === 'picker' ? prev.firstRun : false
      })),
    []
  )
  const onSwitchProject = useCallback(
    () =>
      setState((prev) => ({
        kind: 'picker',
        firstRun: prev.kind === 'dashboard' ? prev.firstRun : false
      })),
    []
  )
  const onPasscodeSet = useCallback(() => {
    setState((prev) => {
      if (prev.kind === 'dashboard') return { ...prev, firstRun: false }
      if (prev.kind === 'picker') return { ...prev, firstRun: false }
      return prev
    })
  }, [])
  const onLock = useCallback(async () => {
    await api.logout().catch(() => undefined)
    setState({ kind: 'auth' })
  }, [])

  if (state.kind === 'loading') {
    return (
      <div className="auth-shell">
        <div className="auth-center">
          <div className="main-empty">LOADING…</div>
        </div>
      </div>
    )
  }

  if (state.kind === 'auth') {
    return <Login theme={theme} onToggleTheme={toggle} onSuccess={onLogin} />
  }

  if (state.kind === 'picker') {
    return (
      <ProjectPicker
        theme={theme}
        onToggleTheme={toggle}
        onSelect={onSelectProject}
        onLock={onLock}
        firstRun={state.firstRun}
        onPasscodeSet={onPasscodeSet}
      />
    )
  }

  return (
    <Dashboard
      theme={theme}
      onToggleTheme={toggle}
      initialProject={state.project}
      onSwitchProject={onSwitchProject}
      onLock={onLock}
      firstRun={state.firstRun}
      onPasscodeSet={onPasscodeSet}
    />
  )
}
