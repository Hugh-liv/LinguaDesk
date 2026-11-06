import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const pidFile = path.join(ROOT, 'logs', 'server.pid')

if (!existsSync(pidFile)) {
  console.log('LinguaDesk 没有记录正在运行的服务。')
  process.exit(0)
}

const pid = Number(readFileSync(pidFile, 'utf8').trim())
if (!Number.isInteger(pid) || pid <= 0) {
  rmSync(pidFile, { force: true })
  console.log('PID 文件无效，已清理。')
  process.exit(0)
}

try {
  execFileSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
    stdio: 'ignore',
  })
  console.log(`已停止 LinguaDesk 服务（PID ${pid}）。`)
} catch {
  console.log('服务可能已经退出。')
}

rmSync(pidFile, { force: true })
