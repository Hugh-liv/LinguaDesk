import { spawn, spawnSync } from 'node:child_process'
import {
  appendFileSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { createConnection } from 'node:net'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const PORT = Number(process.env.LINGUADESK_PORT || 5173)
const APP_URL = `http://localhost:${PORT}`
const PROBE_HOSTS = ['127.0.0.1', '[::1]']
const LOG_DIR = path.join(ROOT, 'logs')
const LOG_FILE = path.join(LOG_DIR, 'desktop.log')
const PID_FILE = path.join(LOG_DIR, 'server.pid')
const NO_OPEN = process.env.LINGUADESK_NO_OPEN === '1'

mkdirSync(LOG_DIR, { recursive: true })

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`
  appendFileSync(LOG_FILE, line)
}

async function isLinguaDesk() {
  for (const host of PROBE_HOSTS) {
    try {
      const response = await fetch(`http://${host}:${PORT}/api/generate`, {
        signal: AbortSignal.timeout(1500),
        cache: 'no-store',
      })
      if (!response.ok) continue
      const payload = await response.json()
      if (payload?.ok === true && payload?.providers !== undefined) return true
    } catch {
      // Try the next loopback family.
    }
  }
  return false
}

function portInUse(host, port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port })
    const done = (value) => {
      socket.destroy()
      resolve(value)
    }
    socket.setTimeout(800, () => done(false))
    socket.once('connect', () => done(true))
    socket.once('error', () => done(false))
  })
}

async function anyPortInUse(port) {
  const [ipv4, ipv6] = await Promise.all([
    portInUse('127.0.0.1', port),
    portInUse('::1', port),
  ])
  return ipv4 || ipv6
}

function showError(message) {
  log(`ERROR ${message}`)
  if (NO_OPEN) return
  const escaped = message.replace(/'/g, "''")
  const script = `Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('${escaped}', 'LinguaDesk', 'OK', 'Error') | Out-Null`
  spawn(
    'powershell.exe',
    ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', script],
    { detached: true, stdio: 'ignore', windowsHide: true },
  ).unref()
}

function openBrowser() {
  if (NO_OPEN) {
    log(`Ready at ${APP_URL} (browser not opened)`)
    return
  }
  spawn('cmd.exe', ['/c', 'start', '', APP_URL], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  }).unref()
  log(`Opened ${APP_URL}`)
}

function buildIfNeeded() {
  if (existsSync(path.join(ROOT, 'dist', 'index.html'))) return true
  log('dist missing; building production bundle')
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const result = spawnSync(npm, ['run', 'build'], {
    cwd: ROOT,
    shell: process.platform === 'win32',
    windowsHide: true,
    encoding: 'utf8',
  })
  if (result.stdout) appendFileSync(LOG_FILE, result.stdout)
  if (result.stderr) appendFileSync(LOG_FILE, result.stderr)
  if (result.status !== 0) {
    showError('构建失败。请打开 logs/desktop.log 查看原因，或在项目目录运行 npm run build。')
    return false
  }
  return true
}

async function main() {
  if (await isLinguaDesk()) {
    log(`LinguaDesk is already running at ${APP_URL}`)
    openBrowser()
    return
  }

  if (await anyPortInUse(PORT)) {
    showError(
      `端口 ${PORT} 已被其他程序占用。请关闭占用该端口的程序后再启动 LinguaDesk。`,
    )
    return
  }

  if (!buildIfNeeded()) return

  const tsxCli = path.join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs')
  if (!existsSync(tsxCli)) {
    showError('依赖不完整：找不到 tsx。请在项目目录运行 npm install。')
    return
  }

  const fd = openSync(LOG_FILE, 'a')
  const child = spawn(process.execPath, [tsxCli, 'server/index.ts'], {
    cwd: ROOT,
    env: {
      ...process.env,
      HOST: '::',
      PORT: String(PORT),
    },
    detached: true,
    windowsHide: true,
    stdio: ['ignore', fd, fd],
  })
  child.unref()
  closeSync(fd)
  if (child.pid) writeFileSync(PID_FILE, String(child.pid))
  log(`Started server pid=${child.pid} on port ${PORT}`)

  for (let attempt = 0; attempt < 60; attempt += 1) {
    await delay(500)
    if (await isLinguaDesk()) {
      openBrowser()
      return
    }
    if (child.exitCode !== null) break
  }

  let detail = ''
  try {
    detail = readFileSync(LOG_FILE, 'utf8').slice(-1600)
  } catch {
    // Keep the message short if the log is unavailable.
  }
  showError(
    `LinguaDesk 没能启动。请查看 logs/desktop.log。\n\n${detail || '服务没有在 30 秒内就绪。'}`,
  )
}

main().catch((error) => {
  showError(error instanceof Error ? error.message : '启动失败。')
})
