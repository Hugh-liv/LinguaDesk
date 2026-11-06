import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { formatCloudError, isCloudConfigured, supabase } from './supabase'

export function useCloudAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isCloudConfigured)

  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session ?? null)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })
    return () => {
      cancelled = true
      data.subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string): Promise<void> {
    if (!supabase) throw new Error('云端还没有配置。')
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) throw new Error(formatCloudError(error))
  }

  async function signUp(email: string, password: string): Promise<string> {
    if (!supabase) throw new Error('云端还没有配置。')
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })
    if (error) throw new Error(formatCloudError(error))
    return data.session
      ? '账号已创建并登录。'
      : '账号已创建。请查看邮箱完成验证，然后回来登录。'
  }

  async function signOut(): Promise<void> {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(formatCloudError(error))
  }

  return {
    configured: isCloudConfigured,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  }
}
