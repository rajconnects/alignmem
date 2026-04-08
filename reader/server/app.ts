import express, { type Express, type Request, type Response } from 'express'
import cookieParser from 'cookie-parser'
import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import {
  clearSessionCookie,
  isFirstRun,
  issueSessionCookie,
  requireSession,
  setupPasscode,
  verifyPasscode
} from './auth.js'
import {
  findProjectByName,
  importAllTraces,
  readProjects,
  upsertProject,
  validateProjectPath,
  type ProjectEntry
} from './storage.js'
import { findTraceById, indexProject } from './indexer.js'
import { revealInFolder } from './reveal.js'
import { subscribe } from './watcher.js'
import {
  loginBodySchema,
  projectBodySchema,
  setupBodySchema
} from './schema.js'

// createApp returns a configured Express app. Exported so integration
// tests can spin up the app without binding to a port.
export async function createApp(options: { cookieSecret: string }): Promise<Express> {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '256kb' }))
  app.use(cookieParser(options.cookieSecret))

  // ── Auth ──────────────────────────────────────────────
  app.get('/api/auth/status', async (req, res) => {
    const authed = req.signedCookies?.alignmem_session === 'ok'
    const firstRun = await isFirstRun()
    // On first run (no passcode set), auto-authenticate so the user
    // sees the project picker immediately. The passcode setup is
    // deferred to a non-blocking prompt inside the dashboard.
    if (firstRun && !authed) {
      issueSessionCookie(res)
      res.json({ success: true, data: { authed: true, firstRun: true } })
      return
    }
    res.json({ success: true, data: { authed, firstRun } })
  })

  app.post('/api/auth/setup', async (req, res) => {
    const parsed = setupBodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Passcode must be at least 6 characters' })
      return
    }
    if (!(await isFirstRun())) {
      res.status(409).json({ success: false, error: 'Passcode already set' })
      return
    }
    await setupPasscode(parsed.data.passcode)
    issueSessionCookie(res)
    res.json({ success: true, data: { authed: true } })
  })

  app.post('/api/auth/login', async (req, res) => {
    const parsed = loginBodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Passcode required' })
      return
    }
    const ok = await verifyPasscode(parsed.data.passcode)
    if (!ok) {
      res.status(401).json({ success: false, error: 'Invalid passcode' })
      return
    }
    issueSessionCookie(res)
    res.json({ success: true, data: { authed: true } })
  })

  app.post('/api/auth/logout', (_req, res) => {
    clearSessionCookie(res)
    res.json({ success: true, data: { authed: false } })
  })

  // ── Projects ──────────────────────────────────────────
  app.get('/api/projects', requireSession, async (_req, res) => {
    const projects = await readProjects()
    res.json({ success: true, data: projects })
  })

  app.post('/api/projects', requireSession, async (req, res) => {
    const parsed = projectBodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'path required' })
      return
    }
    const validation = await validateProjectPath(parsed.data.path)
    if (!validation.valid || !validation.resolvedRoot) {
      res.status(400).json({ success: false, error: validation.reason })
      return
    }
    const projectRoot = validation.resolvedRoot
    const projectName = path.basename(projectRoot)
    const { imported, failed } = await importAllTraces(projectRoot, projectName)
    // eslint-disable-next-line no-console
    console.log(`[app] importAllTraces: ${imported} imported, ${failed} failed for "${projectName}"`)
    const { traces } = await indexProject(projectRoot, projectName)
    const entry: ProjectEntry = {
      name: projectName,
      path: projectRoot,
      last_seen: new Date().toISOString(),
      trace_count: traces.length
    }
    const next = await upsertProject(entry)
    res.json({ success: true, data: { project: entry, projects: next } })
  })

  // ── Traces ────────────────────────────────────────────
  async function resolveProject(req: Request, res: Response): Promise<ProjectEntry | null> {
    const name = typeof req.query.project === 'string' ? req.query.project : ''
    if (!name) {
      res.status(400).json({ success: false, error: 'project query param required' })
      return null
    }
    const project = await findProjectByName(name)
    if (!project) {
      res.status(404).json({ success: false, error: 'project not found' })
      return null
    }
    return project
  }

  app.get('/api/traces', requireSession, async (req, res) => {
    const project = await resolveProject(req, res)
    if (!project) return
    const result = await indexProject(project.path, project.name)
    res.json({
      success: true,
      data: { traces: result.traces, errors: result.errors, project }
    })
  })

  app.get('/api/traces/:id', requireSession, async (req, res) => {
    const project = await resolveProject(req, res)
    if (!project) return
    const trace = await findTraceById(project.path, project.name, req.params.id)
    if (!trace) {
      res.status(404).json({ success: false, error: 'trace not found' })
      return
    }
    res.json({ success: true, data: trace })
  })

  // ── Reveal in folder ──────────────────────────────────
  app.post('/api/reveal', requireSession, async (req, res) => {
    const project = await resolveProject(req, res)
    if (!project) return
    const id = typeof req.query.id === 'string' ? req.query.id : ''
    if (!id) {
      res.status(400).json({ success: false, error: 'id query param required' })
      return
    }
    const trace = await findTraceById(project.path, project.name, id)
    if (!trace) {
      res.status(404).json({ success: false, error: 'trace not found' })
      return
    }
    const target = path.join(project.path, 'alignmink-traces', 'threads', trace.file_name)
    const result = await revealInFolder(target)
    if (!result.ok) {
      res.status(500).json({ success: false, error: result.reason ?? 'reveal failed' })
      return
    }
    res.json({ success: true, data: { revealed: target } })
  })

  // ── SSE events ────────────────────────────────────────
  app.get('/api/events', requireSession, async (req, res) => {
    const project = await resolveProject(req, res)
    if (!project) return
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders?.()

    const send = (type: string, payload: unknown = {}): void => {
      res.write(`event: ${type}\n`)
      res.write(`data: ${JSON.stringify(payload)}\n\n`)
    }

    send('ready', { project: project.name })
    const unsubscribe = subscribe(project.name, project.path, () => {
      send('traces-updated', { at: new Date().toISOString() })
    })

    // Keepalive every 25s so intermediaries don't close the stream.
    const keepalive = setInterval(() => res.write(':keepalive\n\n'), 25_000)

    req.on('close', () => {
      clearInterval(keepalive)
      unsubscribe()
      res.end()
    })
  })

  // ── Static client in production ───────────────────────
  if (process.env.NODE_ENV === 'production') {
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const clientDir = path.resolve(__dirname, '..', 'client')
    try {
      await fs.access(clientDir)
      app.use(express.static(clientDir))
      app.get('*', (_req, res) => {
        res.sendFile(path.join(clientDir, 'index.html'))
      })
    } catch {
      // eslint-disable-next-line no-console
      console.warn('[server] client bundle not found at', clientDir)
    }
  }

  return app
}
