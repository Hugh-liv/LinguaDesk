export interface CloudAuthConfig {
  supabaseUrl?: string
  supabaseAnonKey?: string
  requireAuth?: string
}

export type CloudAuthResult =
  | { ok: true; userId: string }
  | { ok: false; status: number; body: unknown }

function normalizeUrl(value: string | undefined): string {
  return (value ?? '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1$/i, '')
    .replace(/\/+$/, '')
}

function authConfig(overrides: CloudAuthConfig) {
  return {
    url: normalizeUrl(
      overrides.supabaseUrl ??
        process.env.SUPABASE_URL ??
        process.env.VITE_SUPABASE_URL,
    ),
    key: (
      overrides.supabaseAnonKey ??
      process.env.SUPABASE_ANON_KEY ??
      process.env.VITE_SUPABASE_ANON_KEY ??
      ''
    ).trim(),
    requireAuth:
      overrides.requireAuth ?? process.env.REQUIRE_CLOUD_AUTH ?? '',
  }
}

/**
 * Vercel deployments require a Supabase session by default when Supabase is
 * configured. Local and self-hosted use are open unless REQUIRE_CLOUD_AUTH=1.
 */
export function cloudAuthRequired(overrides: CloudAuthConfig = {}): boolean {
  const config = authConfig(overrides)
  if (config.requireAuth === '1') return true
  if (config.requireAuth === '0') return false
  return (
    process.env.VERCEL === '1' && Boolean(config.url && config.key)
  )
}

export async function verifyCloudAuth(
  authorization: string | string[] | undefined,
  overrides: CloudAuthConfig = {},
): Promise<CloudAuthResult> {
  if (!cloudAuthRequired(overrides)) {
    return { ok: true, userId: 'local' }
  }

  const config = authConfig(overrides)
  if (!config.url || !config.key) {
    return {
      ok: false,
      status: 503,
      body: {
        ok: false,
        code: 'AUTH_CONFIG',
        error:
          '服务端没有配置 Supabase 登录校验。请设置 SUPABASE_URL 和 SUPABASE_ANON_KEY。',
      },
    }
  }

  const header = Array.isArray(authorization)
    ? authorization[0]
    : authorization
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  if (!token) {
    return {
      ok: false,
      status: 401,
      body: {
        ok: false,
        code: 'AUTH_REQUIRED',
        error: '请先登录 LinguaDesk 云端账号，再使用 AI 功能。',
      },
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const response = await fetch(`${config.url}/auth/v1/user`, {
      headers: {
        apikey: config.key,
        authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    })
    if (!response.ok) {
      return {
        ok: false,
        status: 401,
        body: {
          ok: false,
          code: 'AUTH_REQUIRED',
          error: '登录状态已失效，请重新登录后再使用 AI。',
        },
      }
    }
    const user = (await response.json()) as { id?: unknown }
    return {
      ok: true,
      userId: typeof user.id === 'string' ? user.id : 'authenticated',
    }
  } catch (error) {
    console.error(
      '[linguadesk:auth]',
      error instanceof Error ? error.message : 'unknown error',
    )
    return {
      ok: false,
      status: 503,
      body: {
        ok: false,
        code: 'AUTH_UNAVAILABLE',
        error: '暂时无法验证登录状态，请稍后再试。',
      },
    }
  } finally {
    clearTimeout(timeout)
  }
}
