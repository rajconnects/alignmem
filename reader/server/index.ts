import 'dotenv/config'
import { createApp } from './app.js'
import { getCookieSecret, ensureHome } from './storage.js'
import { closeAllWatchers } from './watcher.js'

const PORT = Number(process.env.PORT ?? 3000)

async function main(): Promise<void> {
  await ensureHome()
  const cookieSecret = await getCookieSecret()
  const app = await createApp({ cookieSecret })

  const server = app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[alignmem-trace-reader] listening on http://localhost:${PORT}`)
  })

  const shutdown = async (signal: string): Promise<void> => {
    // eslint-disable-next-line no-console
    console.log(`[alignmem-trace-reader] ${signal} — shutting down`)
    await closeAllWatchers()
    server.close(() => process.exit(0))
  }
  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('[alignmem-trace-reader] fatal startup error', err)
  process.exit(1)
})
