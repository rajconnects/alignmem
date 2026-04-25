import { useState, type FormEvent } from 'react'
import { api } from '../../lib/api'
import { Topbar } from '../Topbar'

interface LoginProps {
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  onSuccess: () => void
}

export function Login({ theme, onToggleTheme, onSuccess }: LoginProps) {
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.login(passcode)
      onSuccess()
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : 'LOGIN FAILED').toUpperCase())
    } finally {
      setBusy(false)
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
        onLock={() => undefined}
      />
      <div className="auth-center">
        <form className="auth-card" onSubmit={submit} aria-label="Passcode form">
          <div className="auth-label">PASSCODE</div>
          <input
            className="auth-input"
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            autoFocus
            autoComplete="current-password"
            aria-label="Passcode"
            disabled={busy}
          />
          <button className="auth-submit" type="submit" disabled={busy || passcode.length === 0}>
            → UNLOCK
          </button>
          <div className="auth-error" role="alert" aria-live="polite">{error ?? ''}</div>
        </form>
      </div>
    </div>
  )
}
