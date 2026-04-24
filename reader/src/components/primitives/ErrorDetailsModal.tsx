import { useEffect, useRef, useState } from 'react'

// Modal disclosure for the dense technical text of a multi-error event.
// The banner shows a one-line summary; this modal shows per-error rows
// with a copy-to-clipboard button each. Press ESC or click outside to
// close.
//
// Spec: Product-Documentation/Specs/dtr/04-reader-ux.md §7.2

interface ErrorEntry {
  file: string
  message: string
}

interface ErrorDetailsModalProps {
  errors: ErrorEntry[]
  title?: string
  onClose: () => void
}

export function ErrorDetailsModal({
  errors,
  title = 'Trace files that could not be read',
  onClose
}: ErrorDetailsModalProps) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Focus the dialog on mount so keyboard users land inside
  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  const copyEntry = async (entry: ErrorEntry, idx: number): Promise<void> => {
    const text = `${entry.file}\n${entry.message}`
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx((current) => (current === idx ? null : current)), 1600)
    } catch {
      // Clipboard API not available (insecure context or older browser).
      // Silently ignore — user can still read the text.
    }
  }

  const copyAll = async (): Promise<void> => {
    const text = errors.map((e) => `${e.file}\n${e.message}`).join('\n\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIdx(-1)
      setTimeout(() => setCopiedIdx((c) => (c === -1 ? null : c)), 1600)
    } catch {
      // ignore
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="error-modal-title"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="error-modal-title" className="modal-title">
            {title} <span className="modal-count">({errors.length})</span>
          </h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>
        <div className="modal-body">
          <ul className="error-list">
            {errors.map((entry, idx) => (
              <li key={`${entry.file}-${idx}`} className="error-list-item">
                <div className="error-list-file">{entry.file}</div>
                <pre className="error-list-message">{entry.message}</pre>
                <button
                  type="button"
                  className="error-list-copy"
                  onClick={() => copyEntry(entry, idx)}
                >
                  {copiedIdx === idx ? 'Copied' : 'Copy to clipboard'}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <footer className="modal-footer">
          <button type="button" className="modal-footer-btn" onClick={copyAll}>
            {copiedIdx === -1 ? 'Copied all' : 'Copy all'}
          </button>
          <button type="button" className="modal-footer-btn-primary" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  )
}
