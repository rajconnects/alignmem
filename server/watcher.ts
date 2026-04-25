import chokidar, { type FSWatcher } from 'chokidar'
import path from 'node:path'
import { importTrace, removeLocalTrace } from './storage.js'

// Chokidar watcher pool, keyed by project name.
// Each watcher copies changed files into the local store first, then
// debounces notifications so the indexer (which reads from local store)
// never touches the cloud-synced source directory after the initial import.
// A single 'traces-updated' event is emitted per 200ms burst to prevent
// SSE flooding on bulk file operations.

type ChangeListener = () => void

interface Watcher {
  fs: FSWatcher
  listeners: Set<ChangeListener>
  timer: NodeJS.Timeout | null
}

const watchers = new Map<string, Watcher>()
const DEBOUNCE_MS = 200

export function subscribe(projectName: string, projectPath: string, listener: ChangeListener): () => void {
  let watcher = watchers.get(projectName)
  if (!watcher) {
    const threadsDir = path.join(projectPath, 'alignmink-traces', 'threads')
    const fsWatcher = chokidar.watch(threadsDir, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
      ignored: [/\/\.DS_Store$/, /\/\.[^/]+$/]
    })
    watcher = { fs: fsWatcher, listeners: new Set(), timer: null }

    const scheduleNotify = (): void => {
      const w = watchers.get(projectName)
      if (!w) return
      if (w.timer) clearTimeout(w.timer)
      w.timer = setTimeout(() => {
        const current = watchers.get(projectName)
        current?.listeners.forEach((fn) => {
          try {
            fn()
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[watcher] listener error', err)
          }
        })
      }, DEBOUNCE_MS)
    }

    fsWatcher.on('add', (filePath: string) => {
      if (!filePath.toLowerCase().endsWith('.json')) return
      importTrace(filePath, projectName)
        .then(scheduleNotify)
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error(`[watcher] importTrace failed for ${filePath}:`, err)
          scheduleNotify()
        })
    })

    fsWatcher.on('change', (filePath: string) => {
      if (!filePath.toLowerCase().endsWith('.json')) return
      importTrace(filePath, projectName)
        .then(scheduleNotify)
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error(`[watcher] importTrace failed for ${filePath}:`, err)
          scheduleNotify()
        })
    })

    fsWatcher.on('unlink', (filePath: string) => {
      if (!filePath.toLowerCase().endsWith('.json')) return
      const fileName = path.basename(filePath)
      removeLocalTrace(fileName, projectName)
        .then(scheduleNotify)
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.error(`[watcher] removeLocalTrace failed for ${fileName}:`, err)
          scheduleNotify()
        })
    })

    fsWatcher.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error(`[watcher] error on ${threadsDir}:`, err)
    })

    watchers.set(projectName, watcher)
  }

  watcher.listeners.add(listener)

  return () => {
    const w = watchers.get(projectName)
    if (!w) return
    w.listeners.delete(listener)
    if (w.listeners.size === 0) {
      if (w.timer) clearTimeout(w.timer)
      void w.fs.close()
      watchers.delete(projectName)
    }
  }
}

export function closeAllWatchers(): Promise<void> {
  const closers: Promise<void>[] = []
  for (const [, w] of watchers) {
    if (w.timer) clearTimeout(w.timer)
    closers.push(w.fs.close())
  }
  watchers.clear()
  return Promise.all(closers).then(() => undefined)
}
