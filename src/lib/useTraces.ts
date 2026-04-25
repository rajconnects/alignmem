import { useEffect, useState, useCallback } from 'react'
import type { IndexedTrace, ProjectEntry } from './types'
import { api, traceEventSource } from './api'

interface UseTracesResult {
  traces: IndexedTrace[]
  project: ProjectEntry | null
  errors: Array<{ file: string; message: string }>
  isLoading: boolean
  error: string | null
  reload: () => void
  watcherConnected: boolean
}

// Fetch-on-mount + SSE live-update hook. When the server emits a
// traces-updated event (chokidar detected a disk change), the traces
// are re-fetched. Reconnects every 3s if the stream drops.
export function useTraces(projectName: string | null): UseTracesResult {
  const [traces, setTraces] = useState<IndexedTrace[]>([])
  const [project, setProject] = useState<ProjectEntry | null>(null)
  const [errors, setErrors] = useState<Array<{ file: string; message: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [watcherConnected, setWatcherConnected] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  const reload = useCallback(() => setReloadToken((n) => n + 1), [])

  useEffect(() => {
    if (!projectName) {
      setTraces([])
      setProject(null)
      setIsLoading(false)
      return
    }
    let cancelled = false
    setIsLoading(true)
    api
      .listTraces(projectName)
      .then((data) => {
        if (cancelled) return
        setTraces(data.traces)
        setProject(data.project)
        setErrors(data.errors)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'failed to load traces')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [projectName, reloadToken])

  useEffect(() => {
    if (!projectName) return
    let source: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const connect = (): void => {
      source = traceEventSource(projectName)
      source.addEventListener('ready', () => setWatcherConnected(true))
      source.addEventListener('traces-updated', () => {
        setReloadToken((n) => n + 1)
      })
      source.addEventListener('error', () => {
        setWatcherConnected(false)
        source?.close()
        reconnectTimer = setTimeout(connect, 3000)
      })
    }
    connect()

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer)
      source?.close()
      setWatcherConnected(false)
    }
  }, [projectName])

  return { traces, project, errors, isLoading, error, reload, watcherConnected }
}
