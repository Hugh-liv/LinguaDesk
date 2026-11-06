import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleAiRequest } from './_lib/ai-core'
import { verifyCloudAuth } from './_lib/auth'
import {
  getProviderAvailability,
  type AiRuntimeConfig,
} from './_lib/provider'

function runtimeConfig(): AiRuntimeConfig {
  return {
    provider: process.env.AI_PROVIDER,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    anthropicModel: process.env.ANTHROPIC_MODEL,
    anthropicBaseUrl: process.env.ANTHROPIC_BASE_URL,
    deepseekApiKey: process.env.DEEPSEEK_API_KEY,
    deepseekModel: process.env.DEEPSEEK_MODEL,
    deepseekVisionModel: process.env.DEEPSEEK_VISION_MODEL,
    deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL,
  }
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<void> {
  response.setHeader('Cache-Control', 'no-store')

  if (request.method === 'GET') {
    const availability = getProviderAvailability(runtimeConfig())
    response.status(200).json({
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
    response.status(405).json({ ok: false, error: '只支持 POST 请求。' })
    return
  }

  try {
    const auth = await verifyCloudAuth(request.headers.authorization)
    if (!auth.ok) {
      response.status(auth.status).json(auth.body)
      return
    }

    const result = await handleAiRequest(request.body, runtimeConfig())
    response.status(result.status).json(result.body)
  } catch (error) {
    console.error(
      '[linguadesk:api]',
      error instanceof Error ? error.message : 'unknown error',
    )
    response.status(500).json({
      ok: false,
      code: 'API_ERROR',
      error: '服务暂时不可用。',
    })
  }
}
