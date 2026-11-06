import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function normalizeProjectUrl(value: string | undefined): string {
  return (value ?? '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1$/i, '')
    .replace(/\/+$/, '')
}

const projectUrl = normalizeProjectUrl(
  import.meta.env.VITE_SUPABASE_URL as string | undefined,
)
const anonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
)?.trim()

export const isCloudConfigured = Boolean(projectUrl && anonKey)

export const supabase: SupabaseClient | null = isCloudConfigured
  ? createClient(projectUrl, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export const cloudProjectHost = (() => {
  if (!projectUrl) return ''
  try {
    return new URL(projectUrl).hostname
  } catch {
    return ''
  }
})()

export function formatCloudError(error: unknown): string {
  const message =
    error instanceof Error ? error.message : String(error ?? '')
  if (/fetch|network|failed to fetch|load failed/i.test(message)) {
    return '无法连接云端。请检查网络，或在当前网络下启用 VPN 后重试。'
  }
  if (/relation .* does not exist|42P01/i.test(message)) {
    return '云端数据表还不存在。请先在 Supabase SQL Editor 运行 supabase/schema.sql。'
  }
  if (/row-level security|permission denied|401|403/i.test(message)) {
    return '云端权限不足。请确认已登录，并检查 Supabase 的 RLS 策略。'
  }
  return message || '云端请求失败，请稍后再试。'
}
