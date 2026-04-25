import type { ReactNode } from 'react'

// Compact persistent banner for critical or semi-critical errors that
// need user action. Always dismissible. Used ONLY for errors the user
// needs to see above the fold — multi-file parse errors, folder read
// failures, etc. Transient/recoverable events should use <Toast> instead.
//
// Spec: Product-Documentation/Specs/dtr/04-reader-ux.md §7.1.3

interface ErrorBannerProps {
  message: string
  actionLabel?: string
  onAction?: () => void
  onDismiss: () => void
  variant?: 'warning' | 'critical'
  /** Optional additional content (e.g. View details button) */
  extra?: ReactNode
}

export function ErrorBanner({
  message,
  actionLabel,
  onAction,
  onDismiss,
  variant = 'warning',
  extra
}: ErrorBannerProps) {
  return (
    <div className={`error-banner error-banner-${variant}`} role="alert">
      <span className="error-banner-message">{message}</span>
      <div className="error-banner-actions">
        {extra}
        {actionLabel && onAction && (
          <button
            type="button"
            className="error-banner-action"
            onClick={onAction}
          >
            {actionLabel}
          </button>
        )}
        <button
          type="button"
          className="error-banner-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
