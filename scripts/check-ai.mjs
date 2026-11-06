import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const ENV_FILE = path.join(ROOT, '.env.local')

function parseEnv(text) {
  const values = {}
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const normalized = line.startsWith('export ') ? line.slice(7).trim() : line
    const separator = normalized.indexOf('=')
    if (separator <= 0) continue
    const key = normalized.slice(0, separator).trim()
    let value = normalized.slice(separator + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    values[key] = value
  }
  return values
}

if (!existsSync(ENV_FILE)) {
  console.error('缺少 .env.local。')
  process.exit(1)
}

const env = parseEnv(readFileSync(ENV_FILE, 'utf8'))
const key = env.DEEPSEEK_API_KEY?.trim() ?? ''
const baseUrl = (env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(
  /\/+$/,
  '',
)
const model = env.DEEPSEEK_MODEL?.trim() || 'deepseek-chat'

if (!key) {
  console.error('DEEPSEEK_API_KEY 为空。')
  process.exit(1)
}

console.log('provider:', env.AI_PROVIDER || 'auto')
console.log('model:', model)
console.log('baseUrl:', baseUrl)
console.log('key present:', true)
console.log('key sha256 prefix:', createHash('sha256').update(key).digest('hex').slice(0, 10))
console.log('key contains whitespace:', /\s/.test(key))
console.log('key contains #:', key.includes('#'))
console.log('key starts with sk-:', key.startsWith('sk-'))
console.log('key length:', key.length)

function redact(text) {
  return String(text)
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, 'sk-***')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer ***')
    .slice(0, 1200)
}

async function request(url, options) {
  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(20_000),
    })
    const body = await response.text()
    return { status: response.status, body, headers: response.headers }
  } catch (error) {
    return {
      status: 0,
      body: error instanceof Error ? error.message : String(error),
      headers: new Headers(),
    }
  }
}

console.log('\n--- GET /models ---')
const models = await request(`${baseUrl}/models`, {
  headers: { authorization: `Bearer ${key}` },
})
console.log('status:', models.status)
console.log('body:', redact(models.body))

console.log('\n--- POST /chat/completions (max_tokens=8) ---')
const chat = await request(`${baseUrl}/chat/completions`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    authorization: `Bearer ${key}`,
  },
  body: JSON.stringify({
    model,
    max_tokens: 8,
    temperature: 0,
    messages: [{ role: 'user', content: 'Say OK.' }],
  }),
})
console.log('status:', chat.status)
console.log('body:', redact(chat.body))
