export type AiProviderId = 'anthropic' | 'deepseek'

export interface AiRuntimeConfig {
  provider?: string
  anthropicApiKey?: string
  anthropicModel?: string
  anthropicBaseUrl?: string
  deepseekApiKey?: string
  deepseekModel?: string
  /** Vision-capable model used for image understanding. */
  deepseekVisionModel?: string
  deepseekBaseUrl?: string
}

/** One normalised result from DeepSeek's /v1/tools/search endpoint. */
export interface WebSearchSource {
  title: string
  url: string
  snippet: string
  summary: string
  content: string
  siteName: string | null
  siteIcon: string | null
  date: string | null
  authority: number
  rerankScore: number | null
}

export interface SearchCallInput {
  query: string
  count?: number
  needContent?: boolean
  localization?: string
}

export interface VisionCallInput {
  imageDataUrl: string
  system: string
  user: string
  maxTokens?: number
}

export interface AiHttpResult {
  status: number
  body: unknown
}

export interface AiTool {
  name: string
  description: string
  input_schema: unknown
}

export interface StructuredCallInput {
  config: AiRuntimeConfig
  task: string
  system: string
  user: string
  tool: AiTool
  maxTokens: number
  temperature: number
}

interface ResolvedProvider {
  id: AiProviderId
  apiKey: string
  model: string
  baseUrl: string
}

interface CallInput {
  provider: ResolvedProvider
  task: string
  system: string
  user: string
  tool: AiTool
  maxTokens: number
  temperature: number
}

interface AnthropicToolUse {
  type?: string
  name?: string
  input?: unknown
}

interface AnthropicResponse {
  model?: string
  content?: AnthropicToolUse[]
  usage?: {
    input_tokens?: number
    output_tokens?: number
  }
}

interface DeepSeekResponse {
  model?: string
  choices?: Array<{
    message?: {
      content?: string | null
      tool_calls?: Array<{
        id?: string
        function?: {
          name?: string
          arguments?: string | Record<string, unknown>
        }
      }>
    }
    finish_reason?: string
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
  }
}

const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-5-5'
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-chat'
const DEFAULT_DEEPSEEK_VISION_MODEL = 'deepseek-flash'
const DEFAULT_ANTHROPIC_BASE_URL = 'https://api.anthropic.com'
const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com'
const ANTHROPIC_VERSION = '2023-06-01'
const AI_TIMEOUT_MS = 55_000
const SEARCH_TIMEOUT_MS = 30_000
const VISION_TIMEOUT_MS = 90_000

function redactSecrets(text: string): string {
  return text
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, 'sk-***')
    .replace(/bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer ***')
    .slice(0, 1600)
}

/**
 * Never log a key. These booleans are enough to catch the common mistakes:
 * wrong provider's key, copy/paste whitespace, or an inline `.env` comment.
 */
function keyDiagnostics(apiKey: string) {
  return {
    present: apiKey.length > 0,
    length: apiKey.length,
    startsWithSk: apiKey.startsWith('sk-'),
    hasWhitespace: /\s/.test(apiKey),
    hasHash: apiKey.includes('#'),
    hasNonAscii: /[^\x20-\x7E]/.test(apiKey),
  }
}

function logProviderFailure(
  provider: { id: string; baseUrl: string; model: string; apiKey: string },
  status: number,
  rawBody: string,
): void {
  console.error(
    '[linguadesk:ai:failure]',
    JSON.stringify({
      provider: provider.id,
      baseUrl: provider.baseUrl,
      model: provider.model,
      status,
      key: keyDiagnostics(provider.apiKey),
      body: redactSecrets(rawBody),
    }),
  )
}

function result(status: number, body: unknown): AiHttpResult {
  return { status, body }
}

function isStructuredFailure(result: AiHttpResult): boolean {
  if (result.status !== 502) return false
  const body = result.body
  return (
    typeof body === 'object' &&
    body !== null &&
    (body as { code?: string }).code === 'AI_BAD_RESPONSE'
  )
}

function errorResult(
  status: number,
  code: string,
  error: string,
): AiHttpResult {
  return result(status, { ok: false, code, error })
}

function resolveProvider(
  config: AiRuntimeConfig,
): ResolvedProvider | { error: string } {
  const requested = config.provider?.trim().toLowerCase()
  const anthropicKey = config.anthropicApiKey?.trim()
  const deepseekKey = config.deepseekApiKey?.trim()

  if (requested && requested !== 'anthropic' && requested !== 'deepseek') {
    return { error: 'AI_PROVIDER 只能设为 anthropic 或 deepseek。' }
  }

  const selected: AiProviderId | null =
    requested === 'anthropic'
      ? 'anthropic'
      : requested === 'deepseek'
        ? 'deepseek'
        : anthropicKey
          ? 'anthropic'
          : deepseekKey
            ? 'deepseek'
            : null

  if (!selected) {
    return {
      error:
        '还没有配置 AI。请在服务端设置 ANTHROPIC_API_KEY 或 DEEPSEEK_API_KEY；同时配置两个时，用 AI_PROVIDER 选择。',
    }
  }

  if (selected === 'anthropic') {
    if (!anthropicKey) {
      return { error: 'AI_PROVIDER=anthropic，但缺少 ANTHROPIC_API_KEY。' }
    }
    return {
      id: 'anthropic',
      apiKey: anthropicKey,
      model: config.anthropicModel?.trim() || DEFAULT_ANTHROPIC_MODEL,
      baseUrl: (
        config.anthropicBaseUrl?.trim() || DEFAULT_ANTHROPIC_BASE_URL
      ).replace(/\/+$/, ''),
    }
  }

  if (!deepseekKey) {
    return { error: 'AI_PROVIDER=deepseek，但缺少 DEEPSEEK_API_KEY。' }
  }

  return {
    id: 'deepseek',
    apiKey: deepseekKey,
    model: config.deepseekModel?.trim() || DEFAULT_DEEPSEEK_MODEL,
    baseUrl: (
      config.deepseekBaseUrl?.trim() || DEFAULT_DEEPSEEK_BASE_URL
    ).replace(/\/+$/, ''),
  }
}

function resolveDeepSeekKey(
  config: AiRuntimeConfig,
): { apiKey: string; baseUrl: string } | { error: string } {
  const apiKey = config.deepseekApiKey?.trim()
  if (!apiKey) {
    return {
      error:
        '联网搜索和图像理解由 DeepSeek 提供，需要在服务端配置 DEEPSEEK_API_KEY。',
    }
  }
  return {
    apiKey,
    baseUrl: (
      config.deepseekBaseUrl?.trim() || DEFAULT_DEEPSEEK_BASE_URL
    ).replace(/\/+$/, ''),
  }
}

/**
 * The Search / Fetch tools live at `{base}/v1/tools/...` even when the chat
 * endpoint was configured with or without the `/v1` suffix.
 */
function deepSeekToolsUrl(baseUrl: string, path: string): string {
  const root = baseUrl.endsWith('/chat/completions')
    ? baseUrl.slice(0, -'/chat/completions'.length)
    : baseUrl
  return root.endsWith('/v1') ? `${root}${path}` : `${root}/v1${path}`
}

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function normalizeSearchResults(raw: unknown): WebSearchSource[] {
  if (!Array.isArray(raw)) return []

  return raw
    .map((item): WebSearchSource | null => {
      if (typeof item !== 'object' || item === null) return null
      const record = item as Record<string, unknown>
      const url = asTrimmedString(record.url)
      if (!url || !isHttpUrl(url)) return null

      return {
        title: asTrimmedString(record.title) || url,
        url,
        snippet: asTrimmedString(record.snippet),
        summary: asTrimmedString(record.summary),
        content: asTrimmedString(record.content),
        siteName: asTrimmedString(record.site_name) || null,
        siteIcon: asTrimmedString(record.site_icon) || null,
        date: asTrimmedString(record.date) || null,
        authority:
          typeof record.authority === 'number' ? record.authority : -1,
        rerankScore:
          typeof record.rerank_score === 'number' ? record.rerank_score : null,
      }
    })
    .filter((item): item is WebSearchSource => item !== null)
}

/**
 * DeepSeek's own web-search tool. Authenticated with the DeepSeek key even
 * when generation itself is routed to another provider.
 */
export async function callWebSearch(
  config: AiRuntimeConfig,
  input: SearchCallInput,
): Promise<AiHttpResult> {
  const resolved = resolveDeepSeekKey(config)
  if ('error' in resolved) {
    return errorResult(503, 'SEARCH_NOT_CONFIGURED', resolved.error)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS)
  const endpoint = deepSeekToolsUrl(resolved.baseUrl, '/tools/search')
  const count = Math.min(Math.max(Math.round(input.count ?? 8), 1), 20)
  const provider = {
    id: 'deepseek',
    apiKey: resolved.apiKey,
    baseUrl: resolved.baseUrl,
    model: 'search',
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${resolved.apiKey}`,
      },
      body: JSON.stringify({
        query: input.query,
        count,
        need_content: input.needContent ?? true,
        ...(input.localization ? { localization: input.localization } : {}),
      }),
      signal: controller.signal,
    })

    const rawText = await response.text()
    let payload: { results?: unknown } | null = null
    try {
      payload = JSON.parse(rawText) as { results?: unknown }
    } catch {
      payload = null
    }

    if (!response.ok) {
      logProviderFailure(provider, response.status, rawText)
      if (response.status === 401 || response.status === 403) {
        return errorResult(
          502,
          'SEARCH_AUTH',
          'DeepSeek 搜索鉴权失败，请检查 DEEPSEEK_API_KEY。',
        )
      }
      if (response.status === 402) {
        return errorResult(
          402,
          'SEARCH_NO_BALANCE',
          'DeepSeek 账户余额不足，联网搜索暂时不可用。',
        )
      }
      if (response.status === 429) {
        return errorResult(
          429,
          'SEARCH_RATE_LIMIT',
          'DeepSeek 搜索请求过于频繁，请稍后再试。',
        )
      }
      if (response.status === 400) {
        return errorResult(
          400,
          'SEARCH_BAD_REQUEST',
          '搜索词格式不正确，请调整后再试。',
        )
      }
      if (response.status >= 500) {
        return errorResult(
          503,
          'SEARCH_UNAVAILABLE',
          'DeepSeek 搜索服务暂时不可用，请稍后再试。',
        )
      }
      return errorResult(
        502,
        'SEARCH_ERROR',
        'DeepSeek 搜索返回了错误，请稍后再试。',
      )
    }

    return result(200, {
      ok: true,
      provider: 'deepseek',
      task: 'web-search',
      results: normalizeSearchResults(payload?.results),
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return errorResult(504, 'SEARCH_TIMEOUT', '联网搜索超时，请重新试一次。')
    }
    console.error(
      '[linguadesk:search]',
      error instanceof Error ? error.message : 'unknown error',
    )
    return errorResult(500, 'SEARCH_ERROR', '联网搜索失败，请稍后再试。')
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Image understanding through DeepSeek's vision-capable Flash model. Images
 * are sent as a base64 data URL; the browser downscales them first.
 */
export async function callVision(
  config: AiRuntimeConfig,
  input: VisionCallInput,
): Promise<AiHttpResult> {
  const resolved = resolveDeepSeekKey(config)
  if ('error' in resolved) {
    return errorResult(503, 'VISION_NOT_CONFIGURED', resolved.error)
  }

  const model =
    config.deepseekVisionModel?.trim() || DEFAULT_DEEPSEEK_VISION_MODEL
  const endpoint = resolved.baseUrl.endsWith('/chat/completions')
    ? resolved.baseUrl
    : `${resolved.baseUrl}/chat/completions`
  const provider = {
    id: 'deepseek',
    apiKey: resolved.apiKey,
    baseUrl: resolved.baseUrl,
    model,
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), VISION_TIMEOUT_MS)

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${resolved.apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: input.maxTokens ?? 3500,
        temperature: 0.2,
        stream: false,
        messages: [
          { role: 'system', content: input.system },
          {
            role: 'user',
            content: [
              { type: 'text', text: input.user },
              {
                type: 'image_url',
                image_url: { url: input.imageDataUrl, detail: 'high' },
              },
            ],
          },
        ],
      }),
      signal: controller.signal,
    })

    const rawText = await response.text()
    let payload: DeepSeekResponse | null = null
    try {
      payload = JSON.parse(rawText) as DeepSeekResponse
    } catch {
      payload = null
    }

    if (!response.ok) {
      logProviderFailure(provider, response.status, rawText)
      if (response.status === 401 || response.status === 403) {
        return errorResult(
          502,
          'VISION_AUTH',
          'DeepSeek 图像理解鉴权失败，请检查 DEEPSEEK_API_KEY。',
        )
      }
      if (response.status === 402) {
        return errorResult(
          402,
          'VISION_NO_BALANCE',
          'DeepSeek 账户余额不足，暂时无法识别图片。',
        )
      }
      if (response.status === 429) {
        return errorResult(
          429,
          'VISION_RATE_LIMIT',
          'DeepSeek 图片识别请求过于频繁，请稍后再试。',
        )
      }
      if (response.status === 400) {
        return errorResult(
          400,
          'VISION_BAD_REQUEST',
          '图片格式或请求不合法，请换一张 JPEG / PNG / WebP 图片。',
        )
      }
      if (response.status >= 500) {
        return errorResult(
          503,
          'VISION_UNAVAILABLE',
          'DeepSeek 图像理解服务暂时不可用，请稍后再试。',
        )
      }
      return errorResult(
        502,
        'VISION_ERROR',
        'DeepSeek 图像理解返回了错误，请稍后再试。',
      )
    }

    const text = payload?.choices?.[0]?.message?.content?.trim() ?? ''
    if (!text) {
      return errorResult(
        502,
        'VISION_BAD_RESPONSE',
        '模型没有从图片里读出可用内容，请换一张更清晰的图片。',
      )
    }

    return result(200, {
      ok: true,
      provider: 'deepseek',
      model: payload?.model ?? model,
      text,
      usage: payload?.usage,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return errorResult(
        504,
        'VISION_TIMEOUT',
        '图片识别超时，请换一张小一点的图片再试。',
      )
    }
    console.error(
      '[linguadesk:vision]',
      error instanceof Error ? error.message : 'unknown error',
    )
    return errorResult(500, 'VISION_ERROR', '图片识别失败，请稍后再试。')
  } finally {
    clearTimeout(timeout)
  }
}

async function callAnthropic({
  provider,
  task,
  system,
  user,
  tool,
  maxTokens,
  temperature,
}: CallInput): Promise<AiHttpResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)

  try {
    const response = await fetch(`${provider.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': provider.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: maxTokens,
        temperature,
        system,
        messages: [{ role: 'user', content: user }],
        tools: [tool],
        tool_choice: { type: 'tool', name: tool.name },
      }),
      signal: controller.signal,
    })

    const rawText = await response.text()
    let payload: AnthropicResponse | null = null
    try {
      payload = JSON.parse(rawText) as AnthropicResponse
    } catch {
      payload = null
    }

    if (!response.ok) {
      logProviderFailure(provider, response.status, rawText)
      if (response.status === 401 || response.status === 403) {
        return errorResult(
          502,
          'AI_AUTH',
          'Claude 鉴权失败，请检查 ANTHROPIC_API_KEY。',
        )
      }
      if (response.status === 429) {
        return errorResult(
          429,
          'AI_RATE_LIMIT',
          'Claude 请求过于频繁，请稍后再试。',
        )
      }
      if (response.status === 529 || response.status >= 500) {
        return errorResult(
          503,
          'AI_UNAVAILABLE',
          'Claude 服务暂时不可用，请稍后再试。',
        )
      }
      return errorResult(502, 'AI_ERROR', 'Claude 返回了错误，请稍后再试。')
    }

    const toolUse = payload?.content?.find(
      (block) => block.type === 'tool_use' && block.name === tool.name,
    )

    if (!toolUse || toolUse.input === undefined) {
      return errorResult(
        502,
        'AI_BAD_RESPONSE',
        'Claude 没有返回结构化内容，请重新生成。',
      )
    }

    return result(200, {
      ok: true,
      provider: provider.id,
      model: payload?.model ?? provider.model,
      task,
      data: toolUse.input,
      usage: payload?.usage,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return errorResult(504, 'AI_TIMEOUT', 'AI 生成超时，请重新试一次。')
    }
    console.error(
      '[linguadesk:ai]',
      error instanceof Error ? error.message : 'unknown error',
    )
    return errorResult(500, 'AI_ERROR', 'AI 请求失败，请稍后再试。')
  } finally {
    clearTimeout(timeout)
  }
}

async function callDeepSeek({
  provider,
  task,
  system,
  user,
  tool,
  maxTokens,
  temperature,
}: CallInput): Promise<AiHttpResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)
  const endpoint = provider.baseUrl.endsWith('/chat/completions')
    ? provider.baseUrl
    : `${provider.baseUrl}/chat/completions`

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: maxTokens,
        temperature,
        stream: false,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.input_schema,
            },
          },
        ],
        tool_choice: {
          type: 'function',
          function: { name: tool.name },
        },
      }),
      signal: controller.signal,
    })

    const rawText = await response.text()
    let payload: DeepSeekResponse | null = null
    try {
      payload = JSON.parse(rawText) as DeepSeekResponse
    } catch {
      payload = null
    }

    if (!response.ok) {
      logProviderFailure(provider, response.status, rawText)
      if (response.status === 401 || response.status === 403) {
        return errorResult(
          502,
          'AI_AUTH',
          'DeepSeek 鉴权失败，请检查 DEEPSEEK_API_KEY。',
        )
      }
      if (response.status === 429) {
        return errorResult(
          429,
          'AI_RATE_LIMIT',
          'DeepSeek 请求过于频繁，请稍后再试。',
        )
      }
      if (response.status >= 500) {
        return errorResult(
          503,
          'AI_UNAVAILABLE',
          'DeepSeek 服务暂时不可用，请稍后再试。',
        )
      }
      return errorResult(
        502,
        'AI_ERROR',
        'DeepSeek 返回了错误，请确认模型支持 function calling。',
      )
    }

    const toolCall = payload?.choices?.[0]?.message?.tool_calls?.find(
      (call) => call.function?.name === tool.name,
    )
    const rawArguments = toolCall?.function?.arguments

    let toolInput: unknown
    if (typeof rawArguments === 'string') {
      try {
        toolInput = JSON.parse(rawArguments)
      } catch {
        toolInput = undefined
      }
    } else {
      toolInput = rawArguments
    }

    if (toolInput === undefined) {
      const choice = payload?.choices?.[0]
      console.error(
        '[linguadesk:ai:bad-response]',
        JSON.stringify({
          provider: 'deepseek',
          task,
          finishReason: choice?.finish_reason,
          toolCalls: choice?.message?.tool_calls?.length ?? 0,
          toolName: toolCall?.function?.name,
          rawArgumentsLength:
            typeof rawArguments === 'string' ? rawArguments.length : null,
          rawArgumentsPreview:
            typeof rawArguments === 'string'
              ? redactSecrets(rawArguments).slice(0, 900)
              : null,
          contentPreview: redactSecrets(choice?.message?.content ?? '').slice(
            0,
            500,
          ),
          usage: payload?.usage,
        }),
      )
      return errorResult(
        502,
        'AI_BAD_RESPONSE',
        'DeepSeek 没有返回结构化内容，请重新生成。',
      )
    }

    return result(200, {
      ok: true,
      provider: provider.id,
      model: payload?.model ?? provider.model,
      task,
      data: toolInput,
      usage: payload?.usage,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return errorResult(504, 'AI_TIMEOUT', 'AI 生成超时，请重新试一次。')
    }
    console.error(
      '[linguadesk:ai]',
      error instanceof Error ? error.message : 'unknown error',
    )
    return errorResult(500, 'AI_ERROR', 'AI 请求失败，请稍后再试。')
  } finally {
    clearTimeout(timeout)
  }
}

export async function callStructured({
  config,
  task,
  system,
  user,
  tool,
  maxTokens,
  temperature,
}: StructuredCallInput): Promise<AiHttpResult> {
  const provider = resolveProvider(config)
  if ('error' in provider) {
    return errorResult(503, 'AI_NOT_CONFIGURED', provider.error)
  }

  if (
    provider.id === 'deepseek' &&
    provider.baseUrl.includes('api.deepseek.com') &&
    !provider.apiKey.startsWith('sk-')
  ) {
    logProviderFailure(provider, 0, 'preflight: key does not start with sk-')
    return errorResult(
      502,
      'AI_AUTH_CONFIG',
      'DEEPSEEK_API_KEY 看起来不是 DeepSeek 官方 Key（官方 Key 通常以 sk- 开头）。请确认没有把其他服务的 Key 填到 .env.local；如果你使用的是第三方代理，请同时设置 DEEPSEEK_BASE_URL。',
    )
  }

  const call: CallInput = {
    provider,
    task,
    system,
    user,
    tool,
    maxTokens,
    temperature,
  }

  const run = () =>
    provider.id === 'anthropic'
      ? callAnthropic(call)
      : callDeepSeek(call)

  const first = await run()
  if (!isStructuredFailure(first)) return first

  // Complex tool schemas occasionally come back without a usable tool call.
  // Retry once; auth, timeout and rate-limit errors are never retried.
  console.warn(
    '[linguadesk:ai:retry]',
    JSON.stringify({ provider: provider.id, task, reason: 'AI_BAD_RESPONSE' }),
  )
  return run()
}

export interface ProviderAvailability {
  anthropic: boolean
  deepseek: boolean
  /** DeepSeek key present → web search can be used. */
  search: boolean
  /** DeepSeek key present → image understanding can be used. */
  vision: boolean
  visionModel: string
  defaultProvider: AiProviderId | null
}

export function getProviderAvailability(
  config: AiRuntimeConfig,
): ProviderAvailability {
  const anthropic = Boolean(config.anthropicApiKey?.trim())
  const deepseek = Boolean(config.deepseekApiKey?.trim())
  const requested = config.provider?.trim().toLowerCase()

  let defaultProvider: AiProviderId | null = null
  if (requested === 'anthropic' && anthropic) defaultProvider = 'anthropic'
  else if (requested === 'deepseek' && deepseek) defaultProvider = 'deepseek'
  else if (!requested) {
    defaultProvider = anthropic ? 'anthropic' : deepseek ? 'deepseek' : null
  }

  return {
    anthropic,
    deepseek,
    search: deepseek,
    vision: deepseek,
    visionModel:
      config.deepseekVisionModel?.trim() || DEFAULT_DEEPSEEK_VISION_MODEL,
    defaultProvider,
  }
}
