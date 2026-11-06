import { useLiveQuery } from 'dexie-react-hooks'
import {
  Bot,
  CalendarDays,
  Check,
  Cloud,
  Database,
  Download,
  HardDrive,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  RefreshCw,
  Upload,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  backupCountLabel,
  readBackupFile,
  restoreBackup,
  saveBackup,
  type BackupSummary,
} from '@/lib/backup'
import { useCloudAuth } from '@/lib/cloud/use-cloud-auth'
import { getLastCloudSync, syncNow } from '@/lib/cloud/sync'
import { formatCloudError } from '@/lib/cloud/supabase'
import { db } from '@/lib/db'
import { formatRelativeTime } from '@/lib/format'
import {
  fetchProviderAvailability,
  getProviderPreference,
  setProviderPreference,
  type AiProviderPreference,
  type ProviderAvailability,
} from '@/lib/ai/remote'
import { cn } from '@/lib/utils'

const DAILY_OPTIONS = [30, 45, 60, 90]

function todayStartMs(): number {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function formatStart(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(timestamp)
}

const PROVIDER_OPTIONS: Array<{
  value: AiProviderPreference
  label: string
  description: string
}> = [
  {
    value: 'auto',
    label: '自动',
    description: '跟随服务端的 AI_PROVIDER；未设置时自动检测。',
  },
  {
    value: 'deepseek',
    label: 'DeepSeek',
    description: 'OpenAI-compatible · 文本 / 联网搜索 / 图像理解',
  },
  {
    value: 'anthropic',
    label: 'Anthropic',
    description: 'Claude · 默认 claude-sonnet-5-5',
  },
]

export function MePage() {
  const [provider, setProvider] = useState<AiProviderPreference>(() =>
    getProviderPreference(),
  )
  const [availability, setAvailability] =
    useState<ProviderAvailability | null>(null)
  const [availabilityError, setAvailabilityError] = useState<string | null>(
    null,
  )
  const [notice, setNotice] = useState<string | null>(null)
  const [backupError, setBackupError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [pendingRestore, setPendingRestore] = useState<BackupSummary | null>(
    null,
  )
  const [restoring, setRestoring] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const cloud = useCloudAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [authBusy, setAuthBusy] = useState(false)
  const [authMessage, setAuthMessage] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<number | null>(null)

  useEffect(() => {
    if (!cloud.session) return
    let cancelled = false
    const onSynced = (event: Event) => {
      const detail = (event as CustomEvent<{ syncedAt?: number }>).detail
      if (detail?.syncedAt) setLastSync(detail.syncedAt)
    }
    window.addEventListener('linguadesk:cloud-sync', onSynced)
    void getLastCloudSync().then((value) => {
      if (!cancelled) setLastSync(value)
    })
    return () => {
      cancelled = true
      window.removeEventListener('linguadesk:cloud-sync', onSynced)
    }
  }, [cloud.session])

  const settings = useLiveQuery(async () => {
    const [daily, journey] = await Promise.all([
      db.settings.get('dailyMinutes'),
      db.settings.get('journeyStart'),
    ])
    return {
      dailyMinutes: Number(daily?.value) || 45,
      journeyStart: journey ? Number(journey.value) : null,
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchProviderAvailability()
      .then((value) => {
        if (cancelled) return
        setAvailability(value)
        setAvailabilityError(null)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setAvailabilityError(
          error instanceof Error
            ? error.message
            : '无法读取服务端 AI 配置。',
        )
      })
    return () => {
      cancelled = true
    }
  }, [])

  function chooseProvider(value: AiProviderPreference) {
    setProvider(value)
    setProviderPreference(value)
    setNotice('AI 供应商偏好已保存，下一次 AI 请求会使用它。')
  }

  async function handleAuth() {
    if (authBusy) return
    setAuthError(null)
    setAuthMessage(null)
    if (!email.trim() || password.length < 6) {
      setAuthError('请输入邮箱，并设置至少 6 位密码。')
      return
    }
    setAuthBusy(true)
    try {
      if (authMode === 'signup') {
        setAuthMessage(await cloud.signUp(email, password))
      } else {
        await cloud.signIn(email, password)
        setAuthMessage('登录成功，正在准备云同步。')
      }
      setPassword('')
    } catch (error) {
      setAuthError(formatCloudError(error))
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleCloudSignOut() {
    if (authBusy) return
    setAuthBusy(true)
    setAuthError(null)
    try {
      await cloud.signOut()
      setLastSync(null)
      setAuthMessage('已退出云端账号，本地数据仍然保留。')
    } catch (error) {
      setAuthError(formatCloudError(error))
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleCloudSync() {
    if (syncing) return
    setSyncing(true)
    setSyncError(null)
    setSyncMessage(null)
    try {
      const result = await syncNow()
      setLastSync(result.syncedAt)
      setSyncMessage(
        `同步完成：拉取 ${result.pulled} 条，推送 ${result.pushed} 条，删除 ${result.deleted} 条。`,
      )
    } catch (error) {
      setSyncError(formatCloudError(error))
    } finally {
      setSyncing(false)
    }
  }

  async function chooseDaily(minutes: number) {
    await db.settings.put({
      key: 'dailyMinutes',
      value: String(minutes),
      updatedAt: Date.now(),
    })
    setNotice(`每日目标已设为 ${minutes} 分钟。`)
  }

  async function startJourneyToday() {
    await db.settings.put({
      key: 'journeyStart',
      value: String(todayStartMs()),
      updatedAt: Date.now(),
    })
    setNotice('9 个月航线起点已设为今天。')
  }

  async function handleExport() {
    if (exporting) return
    setExporting(true)
    setBackupError(null)
    try {
      const result = await saveBackup()
      if (result === 'saved') {
        setNotice('备份已导出。建议保存到 D:\\LinguaDesk\\backups。')
      }
    } catch (error) {
      setBackupError(
        error instanceof Error ? error.message : '导出备份失败。',
      )
    } finally {
      setExporting(false)
    }
  }

  async function handleBackupFile(file: File) {
    setBackupError(null)
    try {
      const summary = await readBackupFile(file)
      setPendingRestore(summary)
    } catch (error) {
      setBackupError(
        error instanceof Error ? error.message : '读取备份失败。',
      )
    }
  }

  async function confirmRestore() {
    if (!pendingRestore || restoring) return
    setRestoring(true)
    setBackupError(null)
    try {
      await restoreBackup(pendingRestore.backup)
      window.location.reload()
    } catch (error) {
      setBackupError(
        error instanceof Error ? error.message : '恢复备份失败。',
      )
      setRestoring(false)
    }
  }

  const dailyMinutes = settings?.dailyMinutes ?? 45
  const deepseekAvailable = availability?.deepseek === true
  const anthropicAvailable = availability?.anthropic === true

  return (
    <>
      <PageHeader
        eyebrow="我的 · Me"
        title="把书桌调成你的样子"
        description="不登录也能本地使用；登录后可以把学习记录同步到手机和电脑。AI 供应商只决定服务端使用哪一把 Key。"
      />

      {notice && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-action/20 bg-action-wash/55 px-3.5 py-2.5 text-[11.5px] text-action-ink">
          <Check className="size-3.5 shrink-0" strokeWidth={2} />
          {notice}
        </div>
      )}
      {backupError && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-destructive/25 bg-destructive/[0.06] px-3.5 py-2.5 text-[11.5px] leading-5 text-destructive"
        >
          {backupError}
        </div>
      )}

      <div className="space-y-4">
        <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-desk sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">云同步 · Supabase</p>
              <h2 className="mt-1 font-display text-[20px] tracking-[-0.015em]">
                手机和电脑共用一套学习记录
              </h2>
              <p className="mt-1 text-[11.5px] leading-5 text-muted-foreground">
                本地仍然优先；登录后自动同步文字数据。第一次同步会把本机现有数据上传到云端。
              </p>
            </div>
            <Cloud className="size-4 text-primary/60" strokeWidth={1.8} />
          </div>

          {!cloud.configured ? (
            <div className="mt-4 rounded-xl border border-action/20 bg-action-wash/40 px-4 py-3 text-[11px] leading-5 text-action-ink">
              云端还没有配置。请在 `.env.local` 写入 `VITE_SUPABASE_URL` 和
              `VITE_SUPABASE_ANON_KEY`，重启应用后再回来。
            </div>
          ) : cloud.loading ? (
            <p className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              正在检查云端账号…
            </p>
          ) : cloud.session ? (
            <div className="mt-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/15 bg-primary-wash/30 px-4 py-3">
                <div>
                  <p className="text-[11.5px] font-medium text-primary-ink">
                    {cloud.session.user.email || '已登录'}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {lastSync
                      ? `最近同步：${formatRelativeTime(lastSync)}`
                      : '尚未完成第一次同步'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="action"
                    size="sm"
                    onClick={() => void handleCloudSync()}
                    disabled={syncing}
                  >
                    {syncing ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <RefreshCw strokeWidth={1.8} />
                    )}
                    {syncing ? '同步中…' : '立即同步'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleCloudSignOut()}
                    disabled={authBusy}
                  >
                    <LogOut strokeWidth={1.8} />
                    退出
                  </Button>
                </div>
              </div>
              {syncMessage && (
                <p className="mt-2 text-[10.5px] leading-5 text-primary-ink">
                  {syncMessage}
                </p>
              )}
              {syncError && (
                <p role="alert" className="mt-2 text-[10.5px] leading-5 text-destructive">
                  {syncError}
                </p>
              )}
            </div>
          ) : (
            <form
              className="mt-4 space-y-2.5"
              onSubmit={(event) => {
                event.preventDefault()
                void handleAuth()
              }}
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="邮箱"
                  autoComplete="email"
                  aria-label="云端邮箱"
                  disabled={authBusy}
                />
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="密码（至少 6 位）"
                  autoComplete={
                    authMode === 'signup' ? 'new-password' : 'current-password'
                  }
                  aria-label="云端密码"
                  disabled={authBusy}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="submit"
                  variant="action"
                  size="sm"
                  disabled={authBusy}
                >
                  {authBusy ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <LogIn strokeWidth={1.8} />
                  )}
                  {authMode === 'signup' ? '创建账号' : '登录云同步'}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode((mode) =>
                      mode === 'signup' ? 'signin' : 'signup',
                    )
                    setAuthError(null)
                    setAuthMessage(null)
                  }}
                  className="text-[10.5px] text-primary underline-offset-2 hover:underline"
                >
                  {authMode === 'signup'
                    ? '已有账号？去登录'
                    : '第一次使用？创建账号'}
                </button>
              </div>
            </form>
          )}

          {authMessage && (
            <p className="mt-2 text-[10.5px] leading-5 text-primary-ink">
              {authMessage}
            </p>
          )}
          {authError && (
            <p role="alert" className="mt-2 text-[10.5px] leading-5 text-destructive">
              {authError}
            </p>
          )}

          <p className="mt-3 border-t border-border/60 pt-3 text-[10px] leading-5 text-muted-foreground/70">
            同步材料、学习包、复习、写作、口语、语料库和设置；听力音频文件不参与云端同步。
            如果当前网络无法连接 Supabase，需要先启用 VPN；错误会在这里显示。首次同步前建议先在下方导出一份 JSON 备份。
          </p>
          <p className="mt-1 text-[10px] leading-5 text-muted-foreground/55">
            首次配置：在 Supabase SQL Editor 运行仓库里的
            <span className="mx-1 font-mono text-[9.5px]">supabase/schema.sql</span>
            ，再登录。
          </p>
        </section>

        <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-desk sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">AI · Provider</p>
              <h2 className="mt-1 font-display text-[20px] tracking-[-0.015em]">
                服务端使用哪一个模型
              </h2>
              <p className="mt-1 text-[11.5px] leading-5 text-muted-foreground">
                Key 只存在服务端。切换只影响之后的 AI 请求，不会动已保存的学习包。
              </p>
            </div>
            <Bot className="size-4 text-primary/60" strokeWidth={1.8} />
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {PROVIDER_OPTIONS.map((option) => {
              const available =
                option.value === 'auto'
                  ? true
                  : option.value === 'deepseek'
                    ? deepseekAvailable
                    : anthropicAvailable
              const selected = provider === option.value
              const status =
                option.value === 'auto'
                  ? availability?.defaultProvider
                    ? `当前：${availability.defaultProvider === 'deepseek' ? 'DeepSeek' : 'Anthropic'}`
                    : '自动检测'
                  : availability === null
                    ? availabilityError
                      ? '无法读取配置'
                      : '正在检查…'
                    : available
                      ? '服务端已配置'
                      : '服务端未配置'

              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  disabled={!available}
                  onClick={() => chooseProvider(option.value)}
                  className={cn(
                    'rounded-xl border px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-45',
                    selected
                      ? 'border-primary/25 bg-primary-wash/45'
                      : 'border-border/65 bg-card hover:border-primary/20 hover:bg-muted/30',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[12.5px] font-medium">
                      {option.label}
                    </span>
                    {selected && (
                      <Check className="size-3.5 text-primary" strokeWidth={2} />
                    )}
                  </span>
                  <span className="mt-1 block text-[9.5px] leading-4 text-muted-foreground">
                    {status}
                  </span>
                  <span className="mt-1.5 block text-[9px] leading-4 text-muted-foreground/65">
                    {option.description}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-4 grid gap-2 rounded-xl border border-border/60 bg-muted/15 p-3 sm:grid-cols-2">
            <div>
              <p className="text-[10.5px] font-medium">联网搜索 · Search</p>
              <p className="mt-0.5 text-[9.5px] leading-4 text-muted-foreground">
                {availability === null
                  ? '正在检查服务端配置…'
                  : availability.search
                    ? '可用 · DeepSeek /v1/tools/search'
                    : '需要 DEEPSEEK_API_KEY'}
              </p>
            </div>
            <div>
              <p className="text-[10.5px] font-medium">图像理解 · Vision</p>
              <p className="mt-0.5 text-[9.5px] leading-4 text-muted-foreground">
                {availability === null
                  ? '正在检查服务端配置…'
                  : availability.vision
                    ? `可用 · ${availability.visionModel || 'deepseek-flash'}`
                    : '需要 DEEPSEEK_API_KEY'}
              </p>
            </div>
          </div>

          {availabilityError && (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-destructive/20 bg-destructive/[0.05] px-3 py-2 text-[10.5px] leading-5 text-destructive"
            >
              {availabilityError}
            </p>
          )}
          {provider !== 'auto' &&
            availability &&
            ((provider === 'deepseek' && !availability.deepseek) ||
              (provider === 'anthropic' && !availability.anthropic)) && (
              <p className="mt-3 text-[10.5px] leading-5 text-action-ink">
                当前选中的供应商没有在服务端配置 Key；下一次 AI 请求会失败。请切回自动，或补上对应的环境变量。
              </p>
            )}
          <p className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
            <Lock className="size-3" />
            浏览器只发送“选哪一家”的偏好，不接触任何 Key。
          </p>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-desk">
            <p className="eyebrow">每日目标</p>
            <h2 className="mt-1 font-display text-[19px]">给今天一个长度</h2>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              今日航线会按这个时长分配复习、输入和输出。
            </p>
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              {DAILY_OPTIONS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  aria-pressed={dailyMinutes === minutes}
                  onClick={() => void chooseDaily(minutes)}
                  className={cn(
                    'h-9 rounded-lg border text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                    dailyMinutes === minutes
                      ? 'border-primary/25 bg-primary-wash text-primary-ink'
                      : 'border-border/65 text-muted-foreground hover:border-primary/20',
                  )}
                >
                  {minutes} 分
                </button>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-muted-foreground/70">
              默认 45 分钟；不追求每天都做满。
            </p>
          </section>

          <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-desk">
            <p className="eyebrow">9 个月起点</p>
            <h2 className="mt-1 font-display text-[19px]">把路放进日历</h2>
            {settings?.journeyStart ? (
              <>
                <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                  <CalendarDays className="size-3.5 text-primary/70" />
                  起点：{formatStart(settings.journeyStart)}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => void startJourneyToday()}
                >
                  把起点设为今天
                </Button>
              </>
            ) : (
              <>
                <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                  还没有记录起点。开始后，今日页会显示月份、阶段和本周重点。
                </p>
                <Button
                  variant="action"
                  size="sm"
                  className="mt-3"
                  onClick={() => void startJourneyToday()}
                >
                  从今天开始
                </Button>
              </>
            )}
          </section>
        </div>

        <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-desk sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">数据备份 · Backup</p>
              <h2 className="mt-1 font-display text-[20px]">
                把九个月带走
              </h2>
              <p className="mt-1 text-[11.5px] leading-5 text-muted-foreground">
                导出材料、学习包、复习、练习、写作、口语、听力、个人语料库和设置为一个 JSON；恢复会替换当前全部本地数据。
              </p>
            </div>
            <Database className="size-4 text-primary/60" strokeWidth={1.8} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => void handleExport()}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Download strokeWidth={1.8} />
              )}
              导出备份
            </Button>
            <Button
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={restoring}
            >
              <Upload strokeWidth={1.8} />
              恢复备份
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void handleBackupFile(file)
                event.target.value = ''
              }}
            />
          </div>
          <p className="mt-3 text-[10px] leading-5 text-muted-foreground/70">
            导出时会打开系统保存对话框（支持的浏览器），可以直接选择
            D:\LinguaDesk\backups。备份不包含服务端 API Key，也不包含听力音频文件；文本、时间轴和练习记录会保留，音频可之后重新导入。
          </p>
        </section>

        <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-desk sm:p-6">
          <div className="flex items-start gap-3">
            <HardDrive className="mt-0.5 size-4 shrink-0 text-primary/65" strokeWidth={1.8} />
            <div>
              <p className="eyebrow">数据位置 · D:</p>
              <h2 className="mt-1 font-display text-[19px]">
                项目在 D 盘，学习记录跟着浏览器
              </h2>
              <p className="mt-2 text-[11.5px] leading-6 text-muted-foreground">
                项目与构建文件位于 <span className="font-mono text-[10.5px]">D:\LinguaDesk</span>。
                Web 应用无法直接指定 IndexedDB 的磁盘目录；它由浏览器的用户配置目录管理。要把学习记录也放到 D 盘，可以：
              </p>
              <ul className="mt-2 space-y-1.5 text-[11px] leading-5 text-muted-foreground">
                <li>1. 在「导出备份」里选择 D:\LinguaDesk\backups，定期保存 JSON；</li>
                <li>2. 进阶：用 Edge/Chrome 的 <span className="font-mono text-[10px]">--user-data-dir=D:\LinguaDesk\browser-profile</span> 启动，浏览器的站点数据也会落在 D 盘。</li>
              </ul>
              <p className="mt-3 rounded-lg border border-border/60 bg-muted/15 px-3 py-2 text-[10px] leading-5 text-muted-foreground">
                桌面快捷方式：双击 <span className="font-mono text-[9.5px]">LinguaDesk.lnk</span> 会在后台启动并打开 localhost:5173；停止服务运行 <span className="font-mono text-[9.5px]">npm run stop</span>。
              </p>
            </div>
          </div>
        </section>

        <p className="pt-1 text-center text-[10px] leading-5 text-muted-foreground/60">
          LinguaDesk · 本地优先 · 可选云同步 · 没有排行榜
        </p>
      </div>

      <Dialog
        open={pendingRestore !== null}
        onOpenChange={(open) => {
          if (!open && !restoring) setPendingRestore(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <div className="px-5 pb-5 pt-6 sm:px-6">
            <p className="eyebrow">恢复 · Restore</p>
            <DialogHeader className="mt-1">
              <DialogTitle>用备份替换当前数据？</DialogTitle>
              <DialogDescription>
                这会清空当前浏览器里的全部学习数据，再导入备份；无法撤销。
                {pendingRestore && (
                  <span className="mt-2 block text-[11px] text-foreground/70">
                    {backupCountLabel(pendingRestore.counts)}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="border-t border-border/70 bg-muted/20 px-5 py-4 sm:px-6">
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setPendingRestore(null)}
                disabled={restoring}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={() => void confirmRestore()}
                disabled={restoring}
              >
                {restoring && <Loader2 className="animate-spin" />}
                恢复并替换
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
