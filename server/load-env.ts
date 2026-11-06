import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

function unquote(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

/**
 * Minimal .env loader for the self-host / desktop server. Existing process
 * variables win, so Docker and `PORT=... npm start` keep their values.
 */
export function loadEnvFiles(root = process.cwd()): void {
  for (const filename of ['.env.local', '.env']) {
    const file = path.join(root, filename)
    if (!existsSync(file)) continue

    for (const rawLine of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const normalized = line.startsWith('export ') ? line.slice(7).trim() : line
      const separator = normalized.indexOf('=')
      if (separator <= 0) continue
      const key = normalized.slice(0, separator).trim()
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue
      if (process.env[key] !== undefined) continue
      process.env[key] = unquote(normalized.slice(separator + 1))
    }
  }
}

loadEnvFiles()
