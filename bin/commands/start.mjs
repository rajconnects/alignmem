// `alignmink-dtp start` — boot the Decision Journal reader.
//
// Runs the prebuilt server (dist/server/index.js) as a child process,
// waits for it to bind to the requested port, opens the user's browser
// (unless --no-open), and forwards SIGINT/SIGTERM cleanly so Ctrl+C
// shuts down the server.
//
// First-run handles two failure modes:
//   1. dist/ missing — typical after `npm install` from a registry that
//      published only source. Run the build before spawning.
//   2. node_modules missing — possible if user cloned and ran without
//      install. Detected by missing dist/server, treated like (1).

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

// Exported for unit tests. parseArgs is pure so it's safe to test
// without spawning the server.
export function parseArgs(args) {
  const out = { port: 3000, host: '127.0.0.1', open: true }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]

    // Accept both --port=value and --port value forms.
    let key = a
    let inlineVal = null
    if (a.startsWith('--') && a.includes('=')) {
      const eqIdx = a.indexOf('=')
      key = a.slice(0, eqIdx)
      inlineVal = a.slice(eqIdx + 1)
    }

    if (key === '--port' || key === '-p') {
      const next = inlineVal !== null ? inlineVal : args[++i]
      const n = Number.parseInt(next, 10)
      if (!Number.isFinite(n) || n < 1 || n > 65535) {
        throw new Error(`invalid --port value: ${next}`)
      }
      out.port = n
    } else if (key === '--bind' || key === '-b') {
      const next = inlineVal !== null ? inlineVal : args[++i]
      if (typeof next !== 'string' || next.length === 0) {
        throw new Error(`invalid --bind value: ${next}`)
      }
      out.host = next
    } else if (key === '--no-open') {
      out.open = false
    } else if (key === '--help' || key === '-h') {
      out.help = true
    } else {
      throw new Error(`unknown option for 'start': ${a}`)
    }
  }
  return out
}

function printStartHelp() {
  process.stdout.write(`Usage: alignmink-dtp start [options]

Options:
  --port, -p <number>   Port to listen on (default: 3000)
  --bind, -b <host>     Interface to bind to (default: 127.0.0.1).
                        Use 0.0.0.0 to expose on your LAN — not recommended.
  --no-open             Don't auto-open the browser
  --help, -h            Show this help

The Decision Journal will be available at http://localhost:<port>.
On first run you'll be asked to set a passcode.
`)
}

function openBrowser(url) {
  const platform = process.platform
  const cmd =
    platform === 'darwin' ? 'open' :
    platform === 'win32' ? 'start' :
    'xdg-open'
  try {
    spawn(cmd, [url], { stdio: 'ignore', detached: true }).unref()
  } catch {
    // Best-effort. If the user has no GUI, they'll just open manually.
  }
}

async function ensureBuilt(packageRoot) {
  const distServer = path.join(packageRoot, 'dist', 'server', 'index.js')
  if (existsSync(distServer)) return
  process.stdout.write('[alignmink-dtp] First run — building (this happens once)...\n')
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  await new Promise((resolve, reject) => {
    const child = spawn(npm, ['run', 'build'], {
      cwd: packageRoot,
      stdio: 'inherit'
    })
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`build failed with exit code ${code}`))
    })
  })
}

export async function startCommand({ args, packageRoot }) {
  let opts
  try {
    opts = parseArgs(args)
  } catch (err) {
    process.stderr.write(`alignmink-dtp start: ${err.message}\n`)
    printStartHelp()
    process.exit(1)
  }

  if (opts.help) {
    printStartHelp()
    return
  }

  await ensureBuilt(packageRoot)

  const serverPath = path.join(packageRoot, 'dist', 'server', 'index.js')
  // Display URL is loopback for the user-facing log; HOST is what the
  // server actually binds (only differs when the user passes --bind).
  const displayHost =
    opts.host === '0.0.0.0' || opts.host === '::' ? 'localhost' : opts.host
  const url = `http://${displayHost}:${opts.port}`

  process.stdout.write(`[alignmink-dtp] Starting Decision Journal on ${url}\n`)
  if (opts.host !== '127.0.0.1' && opts.host !== '::1' && opts.host !== 'localhost') {
    process.stdout.write(
      `[alignmink-dtp] ⚠ binding to ${opts.host} — reachable from your LAN. ` +
        `Set a passcode immediately and consider unbinding when done.\n`
    )
  }

  const child = spawn(process.execPath, [serverPath], {
    cwd: packageRoot,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(opts.port),
      HOST: opts.host
    },
    stdio: 'inherit'
  })

  // Forward signals so Ctrl+C cleanly stops the server.
  const forward = (sig) => {
    if (!child.killed) child.kill(sig)
  }
  process.on('SIGINT', () => forward('SIGINT'))
  process.on('SIGTERM', () => forward('SIGTERM'))

  child.on('exit', (code, signal) => {
    if (signal) {
      process.exit(0)
    }
    process.exit(code ?? 0)
  })

  // Open the browser after a short delay so the server has time to bind.
  // The reader logs `listening on http://localhost:<port>` once ready;
  // we don't parse stdio here (would require capturing stdio piped) — a
  // 1.2s delay is the pragmatic compromise.
  if (opts.open) {
    setTimeout(() => openBrowser(url), 1200)
  }
}
