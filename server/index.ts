import 'dotenv/config'
import { createApp } from './app.js'
import { getCookieSecret, ensureHome } from './storage.js'
import { closeAllWatchers } from './watcher.js'

const PORT = Number(process.env.PORT ?? 3000)
// Default to loopback so the journal is genuinely localhost-only.
// CLI exposes --bind for users who deliberately want LAN access.
const HOST = process.env.HOST ?? '127.0.0.1'

async function main(): Promise<void> {
  await ensureHome()
  const cookieSecret = await getCookieSecret()
  const app = await createApp({ cookieSecret })

  const server = app.listen(PORT, HOST, () => {
    // eslint-disable-next-line no-console
    console.log(`[alignmem-trace-reader] listening on http://${HOST}:${PORT}`)
    if (HOST !== '127.0.0.1' && HOST !== '::1' && HOST !== 'localhost') {
      // eslint-disable-next-line no-console
      console.warn(
        `[alignmem-trace-reader] ⚠ bound to ${HOST} — reachable from your LAN. ` +
          `Anyone on this network can attempt to access your decision traces. ` +
          `Use 127.0.0.1 unless you know you need this.`
      )
    }
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
