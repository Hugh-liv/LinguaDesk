import type { IncomingMessage, ServerResponse } from 'node:http'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { handleAiRequest, type AiRuntimeConfig } from './api/_lib/ai-core.ts'
import {
  verifyCloudAuth,
  type CloudAuthConfig,
} from './api/_lib/auth.ts'
import { getProviderAvailability } from './api/_lib/provider.ts'

// Images are sent as base64 data URLs; keep this above the client-side cap.
const MAX_BODY_BYTES = 4_300_000

function readRequestBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0

    request.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request body too large'))
        request.destroy()
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    request.on('error', reject)
  })
}

/**
 * Makes `/api/generate` work under `vite` and `vite preview` as well as on
 * Vercel, using the same server-side handler. The API key is only read from
 * the Node environment, never exposed to the client bundle.
 */
function aiDevPlugin(
  runtime: AiRuntimeConfig,
  authConfig: CloudAuthConfig,
): Plugin {
  async function handler(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    if (request.method === 'GET') {
      const availability = getProviderAvailability(runtime)
      response.statusCode = 200
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.setHeader('Cache-Control', 'no-store')
      response.end(
        JSON.stringify({
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
        }),
      )
      return
    }

    if (request.method !== 'POST') {
      response.statusCode = 405
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.end(JSON.stringify({ ok: false, error: '只支持 POST 请求。' }))
      return
    }

    try {
      const auth = await verifyCloudAuth(
        request.headers.authorization,
        authConfig,
      )
      if (!auth.ok) {
        response.statusCode = auth.status
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.setHeader('Cache-Control', 'no-store')
        response.end(JSON.stringify(auth.body))
        return
      }

      const raw = await readRequestBody(request)
      let body: unknown = null
      try {
        body = raw ? JSON.parse(raw) : null
      } catch {
        response.statusCode = 400
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.end(JSON.stringify({ ok: false, error: '请求 JSON 不合法。' }))
        return
      }

      const result = await handleAiRequest(body, runtime)
      response.statusCode = result.status
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.setHeader('Cache-Control', 'no-store')
      response.end(JSON.stringify(result.body))
    } catch (error) {
      console.error(
        '[linguadesk:dev-ai]',
        error instanceof Error ? error.message : 'unknown error',
      )
      if (!response.headersSent) {
        response.statusCode = 500
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.end(
          JSON.stringify({ ok: false, error: 'AI 请求失败，请稍后再试。' }),
        )
      }
    }
  }

  return {
    name: 'linguadesk-ai-dev',
    configureServer(server) {
      server.middlewares.use('/api/generate', handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/generate', handler)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const readEnv = (key: string) => env[key] || process.env[key]
  const runtime: AiRuntimeConfig = {
    provider: readEnv('AI_PROVIDER'),
    anthropicApiKey: readEnv('ANTHROPIC_API_KEY'),
    anthropicModel: readEnv('ANTHROPIC_MODEL'),
    anthropicBaseUrl: readEnv('ANTHROPIC_BASE_URL'),
    deepseekApiKey: readEnv('DEEPSEEK_API_KEY'),
    deepseekModel: readEnv('DEEPSEEK_MODEL'),
    deepseekVisionModel: readEnv('DEEPSEEK_VISION_MODEL'),
    deepseekBaseUrl: readEnv('DEEPSEEK_BASE_URL'),
  }
  const authConfig: CloudAuthConfig = {
    supabaseUrl:
      readEnv('SUPABASE_URL') || readEnv('VITE_SUPABASE_URL'),
    supabaseAnonKey:
      readEnv('SUPABASE_ANON_KEY') || readEnv('VITE_SUPABASE_ANON_KEY'),
    requireAuth: readEnv('REQUIRE_CLOUD_AUTH'),
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      aiDevPlugin(runtime, authConfig),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icons/*.png', 'icons/linguadesk.ico'],
        manifest: {
          name: 'LinguaDesk · 安静书桌',
          short_name: 'LinguaDesk',
          description: '一张安静的书桌：读英语、记词汇、做听写、精听与复述。',
          lang: 'zh-CN',
          dir: 'ltr',
          theme_color: '#0F6B5E',
          background_color: '#F7F3EA',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: '/icons/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,mjs,css,html,svg,png,woff2}'],
          navigateFallback: '/index.html',
          cleanupOutdatedCaches: true,
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
