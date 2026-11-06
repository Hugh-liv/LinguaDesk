import './load-env.ts'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { handleAiRequest } from '../api/_lib/ai-core.ts'
import { verifyCloudAuth } from '../api/_lib/auth.ts'
import { getProviderAvailability } from '../api/_lib/provider.ts'

const DIST = path.resolve(process.cwd(), 'dist')
const INDEX = path.join(DIST, 'index.html')
const HOST = process.env.HOST ?? '0.0.0.0'
const PORT = Number(process.env.PORT ?? 3000)
// Images are sent as base64 data URLs; keep this above the client-side cap.
const MAX_BODY_BYTES = 4_300_000

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

function jsonResponse(
  response: ServerResponse,
  status: number,
  body: unknown,
): void {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  response.end(JSON.stringify(body))
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    request.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('REQUEST_TOO_LARGE'))
        request.destroy()
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    request.on('error', reject)
  })
}

async function isFile(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile()
  } catch {
    return false
  }
}

async function serveFile(
  request: IncomingMessage,
  response: ServerResponse,
  filePath: string,
): Promise<void> {
  const body = await readFile(filePath)
  const extension = path.extname(filePath).toLowerCase()
  const immutable = filePath.includes(`${path.sep}assets${path.sep}`)

  response.writeHead(200, {
    'content-type': MIME[extension] ?? 'application/octet-stream',
    'cache-control': immutable
      ? 'public, max-age=31536000, immutable'
      : 'no-cache',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
  })
  response.end(request.method === 'HEAD' ? undefined : body)
}

async function handleStatic(
  request: IncomingMessage,
  response: ServerResponse,
  pathname: string,
): Promise<void> {
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    response.writeHead(400)
    response.end('Bad request')
    return
  }

  const candidate = path.resolve(DIST, `.${decoded}`)
  if (candidate !== DIST && !candidate.startsWith(`${DIST}${path.sep}`)) {
    response.writeHead(403)
    response.end('Forbidden')
    return
  }

  let filePath = candidate
  let exists = await isFile(filePath)

  if (!exists) {
    // SPA routes such as /today and /writing fall back to the app shell.
    const extension = path.extname(decoded)
    if (!extension) {
      filePath = INDEX
      exists = await isFile(filePath)
    }
  }

  if (!exists) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('Not found')
    return
  }

  await serveFile(request, response, filePath)
}

async function main(): Promise<void> {
  const aiConfig = {
    provider: process.env.AI_PROVIDER,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    anthropicModel: process.env.ANTHROPIC_MODEL,
    anthropicBaseUrl: process.env.ANTHROPIC_BASE_URL,
    deepseekApiKey: process.env.DEEPSEEK_API_KEY,
    deepseekModel: process.env.DEEPSEEK_MODEL,
    deepseekVisionModel: process.env.DEEPSEEK_VISION_MODEL,
    deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL,
  }

  if (!(await isFile(INDEX))) {
    console.error('dist/index.html not found. Run `npm run build` first.')
    process.exit(1)
  }

  const server = createServer(
    async (request: IncomingMessage, response: ServerResponse) => {
      try {
        const url = new URL(
          request.url ?? '/',
          `http://${request.headers.host ?? 'localhost'}`,
        )

        if (url.pathname === '/api/generate') {
          if (request.method === 'GET') {
            const availability = getProviderAvailability(aiConfig)
            jsonResponse(response, 200, {
              ok: true,
              providers: {
                anthropic: availability.anthropic,
                deepseek: availability.deepseek,
              },
              capabilities: {
                search: availability.search,
                vision: availability.vision,
                visionModel: availability.visionModel,
              },
              defaultProvider: availability.defaultProvider,
            })
            return
          }

          if (request.method !== 'POST') {
            jsonResponse(response, 405, {
              ok: false,
              error: '只支持 POST 请求。',
            })
            return
          }

          const auth = await verifyCloudAuth(
            request.headers.authorization,
          )
          if (!auth.ok) {
            jsonResponse(response, auth.status, auth.body)
            return
          }

          let body: unknown
          try {
            const raw = await readBody(request)
            body = raw ? JSON.parse(raw) : null
          } catch (error) {
            const tooLarge =
              error instanceof Error && error.message === 'REQUEST_TOO_LARGE'
            jsonResponse(response, tooLarge ? 413 : 400, {
              ok: false,
              error: tooLarge ? '请求内容过大。' : '请求 JSON 不合法。',
            })
            return
          }

          const result = await handleAiRequest(body, aiConfig)
          jsonResponse(response, result.status, result.body)
          return
        }

        if (url.pathname.startsWith('/api/')) {
          jsonResponse(response, 404, { ok: false, error: 'Not found' })
          return
        }

        if (request.method !== 'GET' && request.method !== 'HEAD') {
          response.writeHead(405)
          response.end('Method not allowed')
          return
        }

        await handleStatic(request, response, url.pathname)
      } catch (error) {
        console.error(
          '[linguadesk:server]',
          error instanceof Error ? error.message : 'unknown error',
        )
        if (!response.headersSent) {
          jsonResponse(response, 500, {
            ok: false,
            error: '服务暂时不可用。',
          })
        }
      }
    },
  )

  server.listen(PORT, HOST, () => {
    const provider =
      process.env.AI_PROVIDER ||
      (process.env.ANTHROPIC_API_KEY
        ? 'anthropic (auto)'
        : process.env.DEEPSEEK_API_KEY
          ? 'deepseek (auto)'
          : 'not configured')
    const displayHost = HOST === '::' ? 'localhost' : HOST
    console.log(
      `LinguaDesk self-host server: http://${displayHost}:${PORT} · AI: ${provider}`,
    )
  })

  const shutdown = () => {
    server.close(() => process.exit(0))
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

void main()
