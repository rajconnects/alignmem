import { useState, type FormEvent } from 'react'
import { api } from '../lib/api'

interface SetPasscodeBannerProps {
  onSet: () => void
}

// Non-blocking banner prompting the user to set a passcode after
// they've already seen value (project picker or dashboard). Appears
// only when firstRun=true. Dismissable — the user can skip it and
// set a passcode later via LOCK in the topbar.
export function SetPasscodeBanner({ onSet }: SetPasscodeBannerProps) {
  const [expanded, setExpanded] = useState(false)
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    if (passcode.length < 6) {
      setError('MUST BE ≥ 6 CHARACTERS')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api.setup(passcode)
      onSet()
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : 'FAILED').toUpperCase())
    } finally {
      setBusy(false)
    }
  }

  // Tooltip text spelling out *why* — without this, CEOs dismiss the
  // banner reflexively. The reader binds to loopback by default, so the
  // realistic risk only materializes if they passed --bind 0.0.0.0 or
  // share the device. Naming both keeps the warning honest.
  const warningTooltip =
    'No passcode set. Anyone with access to this machine — or this network ' +
    'if you bound the reader to your LAN with --bind — can read your ' +
    'decision traces and add new project folders. Set a passcode to lock ' +
    'the reader behind a credential.'

  return (
    <div className="passcode-banner" style={{ gridColumn: '1 / -1' }}>
      {!expanded ? (
        <div className="passcode-banner-row">
          <span
            className="passcode-banner-warning"
            role="img"
            aria-label="Warning"
            title={warningTooltip}
          >
            ⚠
          </span>
          <span className="passcode-banner-text" title={warningTooltip}>
            SECURE YOUR SESSION — SET A PASSCODE TO LOCK THIS READER
          </span>
          <button
            type="button"
            className="passcode-banner-action"
            onClick={() => setExpanded(true)}
          >
            → SET PASSCODE
          </button>
          <button
            type="button"
            className="passcode-banner-dismiss"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss for this session"
            title="Dismiss for this session — banner returns on next reload until you set a passcode"
          >
            SKIP
          </button>
        </div>
      ) : (
        <form className="passcode-banner-row" onSubmit={submit}>
          <input
            className="passcode-banner-input"
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="ENTER PASSCODE (≥ 6 CHARS)"
            autoFocus
            autoComplete="new-password"
            disabled={busy}
          />
          <button type="submit" className="passcode-banner-action" disabled={busy || passcode.length === 0}>
            → SET
          </button>
          <button
            type="button"
            className="passcode-banner-dismiss"
            onClick={() => {
              setExpanded(false)
              setPasscode('')
              setError(null)
            }}
          >
            CANCEL
          </button>
          {error && <span className="passcode-banner-error">{error}</span>}
        </form>
      )}
    </div>
  )
}
