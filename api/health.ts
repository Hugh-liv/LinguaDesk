import type { VercelRequest, VercelResponse } from '@vercel/node'

function present(value: string | undefined): boolean {
  return Boolean(value?.trim())
}

export default function handler(
  request: VercelRequest,
  response: VercelResponse,
): void {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'GET') {
    response.status(405).json({ ok: false, error: '只支持 GET 请求。' })
    return
  }

  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey =
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const cloudConfigured = present(supabaseUrl) && present(supabaseKey)
  const deepseek = present(process.env.DEEPSEEK_API_KEY)
  const anthropic = present(process.env.ANTHROPIC_API_KEY)

  response.status(200).json({
    ok: true,
    app: 'LinguaDesk',
    serverless: true,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    ai: {
      provider: process.env.AI_PROVIDER || null,
      deepseek,
      anthropic,
      search: deepseek,
      vision: deepseek,
    },
    cloud: {
      configured: cloudConfigured,
      requireAuth:
        process.env.REQUIRE_CLOUD_AUTH === '1' ||
        (process.env.VERCEL === '1' && cloudConfigured),
    },
  })
}
