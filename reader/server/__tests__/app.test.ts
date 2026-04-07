import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import request from 'supertest'
import { fileURLToPath } from 'node:url'
import { createApp } from '../app.js'
import { closeAllWatchers } from '../watcher.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REAL_PROJECT = path.resolve(__dirname, '..', '..', '..', 'samples')
const COOKIE_SECRET = 'test-secret-32bytes-for-cookie-sign'
const TEST_PASSCODE = 'supersecret'

async function bootApp() {
  // Point ALIGNMEM_HOME at a fresh tmpdir per test so we get clean state.
  const home = await fs.mkdtemp(path.join(os.tmpdir(), 'alignmem-test-'))
  process.env.ALIGNMEM_HOME = home
  delete process.env.PASSCODE
  const app = await createApp({ cookieSecret: COOKIE_SECRET })
  return { app, home }
}

async function authenticated(app: Awaited<ReturnType<typeof createApp>>) {
  // Set up a passcode, then login
  await request(app).post('/api/auth/setup').send({ passcode: TEST_PASSCODE })
  const login = await request(app).post('/api/auth/login').send({ passcode: TEST_PASSCODE })
  const cookie = login.headers['set-cookie']?.[0] ?? ''
  return cookie
}

afterAll(async () => {
  await closeAllWatchers()
})

describe('auth', () => {
  beforeEach(async () => {
    // Each test gets a fresh home dir via bootApp
  })

  it('reports first run when no passcode is set', async () => {
    const { app } = await bootApp()
    const res = await request(app).get('/api/auth/status')
    expect(res.status).toBe(200)
    expect(res.body.data.firstRun).toBe(true)
    expect(res.body.data.authed).toBe(false)
  })

  it('rejects setup with short passcode', async () => {
    const { app } = await bootApp()
    const res = await request(app).post('/api/auth/setup').send({ passcode: '123' })
    expect(res.status).toBe(400)
  })

  it('allows setup then login', async () => {
    const { app } = await bootApp()
    const setup = await request(app).post('/api/auth/setup').send({ passcode: TEST_PASSCODE })
    expect(setup.status).toBe(200)
    const wrong = await request(app).post('/api/auth/login').send({ passcode: 'nope-wrong' })
    expect(wrong.status).toBe(401)
    const login = await request(app).post('/api/auth/login').send({ passcode: TEST_PASSCODE })
    expect(login.status).toBe(200)
  })

  it('rejects protected routes without a session', async () => {
    const { app } = await bootApp()
    const res = await request(app).get('/api/projects')
    expect(res.status).toBe(401)
  })
})

describe('projects + traces', () => {
  it('adds the real project and lists its traces', async () => {
    const { app } = await bootApp()
    const cookie = await authenticated(app)

    const add = await request(app).post('/api/projects').set('Cookie', cookie).send({ path: REAL_PROJECT })
    expect(add.status).toBe(200)
    expect(add.body.data.project.path).toBe(REAL_PROJECT)
    const projectName = add.body.data.project.name

    const list = await request(app).get('/api/projects').set('Cookie', cookie)
    expect(list.status).toBe(200)
    expect(list.body.data.length).toBeGreaterThan(0)

    const traces = await request(app)
      .get(`/api/traces?project=${encodeURIComponent(projectName)}`)
      .set('Cookie', cookie)
    expect(traces.status).toBe(200)
    expect(traces.body.data.traces.length).toBeGreaterThan(0)
    const firstId = traces.body.data.traces[0].id
    const single = await request(app)
      .get(`/api/traces/${encodeURIComponent(firstId)}?project=${encodeURIComponent(projectName)}`)
      .set('Cookie', cookie)
    expect(single.status).toBe(200)
    expect(single.body.data.id).toBe(firstId)
  })

  it('rejects an invalid project path', async () => {
    const { app } = await bootApp()
    const cookie = await authenticated(app)
    const res = await request(app)
      .post('/api/projects')
      .set('Cookie', cookie)
      .send({ path: '/definitely/not/a/real/path' })
    expect(res.status).toBe(400)
  })

  it('accepts the alignmink-traces folder directly and resolves to the project root', async () => {
    const { app } = await bootApp()
    const cookie = await authenticated(app)
    const tracesFolder = path.join(REAL_PROJECT, 'alignmink-traces')
    const res = await request(app).post('/api/projects').set('Cookie', cookie).send({ path: tracesFolder })
    expect(res.status).toBe(200)
    expect(res.body.data.project.path).toBe(REAL_PROJECT)
  })

  it('accepts the threads folder directly and resolves to the project root', async () => {
    const { app } = await bootApp()
    const cookie = await authenticated(app)
    const threadsFolder = path.join(REAL_PROJECT, 'alignmink-traces', 'threads')
    const res = await request(app).post('/api/projects').set('Cookie', cookie).send({ path: threadsFolder })
    expect(res.status).toBe(200)
    expect(res.body.data.project.path).toBe(REAL_PROJECT)
  })
})
