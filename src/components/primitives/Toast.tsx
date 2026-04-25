import { useEffect } from 'react'

// Transient, non-blocking notification rendered at the bottom-right.
// Auto-dismisses after `autoDismissMs` (default 5s for info, 8s for
// warning). Always shows an X to dismiss manually. Never used for
// critical errors — those belong in <ErrorBanner>.
//
// Spec: Product-Documentation/Specs/dtr/04-reader-ux.md §7.1.1

type ToastVariant = 'info' | 'warning' | 'success'

interface ToastProps {
  message: string
  onDismiss: () => void
  variant?: ToastVariant
  /** 0 = persist until manually dismissed; default 5000 (8000 for warning) */
  autoDismissMs?: number
}

export function Toast({ message, onDismiss, variant = 'info', autoDismissMs }: ToastProps) {
  const effectiveDelay = autoDismissMs ?? (variant === 'warning' ? 8000 : 5000)

  useEffect(() => {
    if (effectiveDelay <= 0) return
    const timer = setTimeout(onDismiss, effectiveDelay)
    return () => clearTimeout(timer)
  }, [effectiveDelay, onDismiss])

  return (
    <div className={`toast toast-${variant}`} role="status" aria-live="polite">
      <span className="toast-message">{message}</span>
      <button
        type="button"
        className="toast-dismiss"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}

interface ToastContainerProps {
  children: React.ReactNode
}

export function ToastContainer({ children }: ToastContainerProps) {
  return <div className="toast-container" aria-label="Notifications">{children}</div>
}
