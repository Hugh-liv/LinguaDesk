import { useLiveQuery } from 'dexie-react-hooks'
import {
  Check,
  ChevronRight,
  Loader2,
  PenLine,
  Sparkles,
  Target,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AutoMaterialDialog } from '@/components/materials/auto-material-dialog'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { db, type MaterialRow } from '@/lib/db'
import { deriveFocus, practiceHref } from '@/lib/diagnostics'
import { formatDeskDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const DAY_MS = 86_400_000
const JOURNEY_DAYS = 270

const PHASES = [
  {
    label: '基础',
    months: '1–3 月',
    focus: [
      '高频语块与句子输出',
      '短篇精读 + 复述',
      '听写与朗读节奏',
    ],
  },
  {
    label: '流利',
    months: '4–6 月',
    focus: [
      '限时写作 + 轻改稿',
      '多材料复述与改写',
      '跨材料复习与输出',
    ],
  },
  {
    label: '独立',
    months: '7–9 月',
    focus: [
      '真实话题写作 + 观点',
      '长文精读与要点提取',
      '复述、重写与错误清零',
    ],
  },
]

function todayStartMs(): number {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

interface DueRow {
  material: MaterialRow
  vocab: number
  dictation: number
  total: number
}

interface JourneySnapshot {
  days: number
  month: number
  phaseIndex: number
  focus: string
  progress: number
  complete: boolean
}

interface TodaySnapshot {
  materialsCount: number
  packCount: number
  dueRows: DueRow[]
  dueVocab: number
  dueDictation: number
  dueTotal: number
  latest: MaterialRow | null
  reviewDone: boolean
  inputDone: boolean
  outputDone: boolean
  listeningToday: number
  writingToday: number
  corpusTotal: number
  corpusDue: number
  dailyMinutes: number
  focus: {
    tag: string
    title: string
    minutes: number
    count: number
    href: string
  } | null
  journey: JourneySnapshot | null
}

function RouteStep({
  index,
  title,
  minutes,
  meta,
  done,
  to,
  action,
}: {
  index: number
  title: string
  minutes: number
  meta: string
  done: boolean
  to?: string
  action?: string
}) {
  const body = (
    <>
      <span
        className={cn(
          'grid size-8 shrink-0 place-items-center rounded-full border font-display text-[11px]',
          done
            ? 'border-primary/20 bg-primary-wash text-primary'
            : 'border-border/80 text-muted-foreground',
        )}
      >
        {done ? <Check className="size-4" strokeWidth={2} /> : index}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span
            className={cn(
              'text-[13px] font-medium',
              done ? 'text-foreground/65' : 'text-foreground',
            )}
          >
            {title}
          </span>
          <span className="text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground/60">
            {minutes} min
          </span>
        </span>
        <span className="mt-0.5 block text-[10.5px] leading-5 text-muted-foreground">
          {meta}
        </span>
      </span>
      {to && action ? (
        <span className="flex shrink-0 items-center gap-1 text-[10.5px] font-medium text-primary">
          {action}
          <ChevronRight className="size-3.5" strokeWidth={1.8} />
        </span>
      ) : done ? (
        <span className="shrink-0 text-[10px] text-muted-foreground/65">
          已清空
        </span>
      ) : null}
    </>
  )

  const className = cn(
    'flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors',
    done
      ? 'border-primary/12 bg-primary-wash/20'
      : 'border-border/65 bg-card hover:border-primary/25 hover:bg-muted/25',
  )

  return to ? (
    <Link
      to={to}
      className={cn(
        className,
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}

export function TodayPage() {
  const [starting, setStarting] = useState(false)
  const [autoOpen, setAutoOpen] = useState(false)

  const snapshot = useLiveQuery<TodaySnapshot>(async () => {
    const now = Date.now()
    const dayStart = new Date(now)
    dayStart.setHours(0, 0, 0, 0)
    const since = dayStart.getTime()

    const [
      materials,
      packRows,
      dueItems,
      attemptsToday,
      writingToday,
      speakingToday,
      corpusItems,
      setting,
      dailySetting,
      errorRows,
    ] = await Promise.all([
      db.materials.orderBy('createdAt').reverse().toArray(),
      db.packs.toArray(),
      db.reviewItems.where('dueAt').belowOrEqual(now).toArray(),
      db.attempts.where('createdAt').aboveOrEqual(since).toArray(),
      db.writingWorks.where('updatedAt').aboveOrEqual(since).count(),
      db.speakingSessions.where('updatedAt').aboveOrEqual(since).count(),
      db.corpusItems.toArray(),
      db.settings.get('journeyStart'),
      db.settings.get('dailyMinutes'),
      db.errors.toArray(),
    ])

    const packMap = new Map(packRows.map((row) => [row.materialId, row.pack]))
    const ready = materials.filter((material) => packMap.has(material.id))
    const latest = ready[0] ?? null

    const dueByMaterial = new Map<
      string,
      { vocab: number; dictation: number }
    >()
    for (const item of dueItems) {
      if (
        item.kind !== 'vocab' &&
        item.kind !== 'recall' &&
        item.kind !== 'dictation'
      ) {
        continue
      }
      const counts = dueByMaterial.get(item.materialId) ?? {
        vocab: 0,
        dictation: 0,
      }
      if (item.kind === 'vocab' || item.kind === 'recall') counts.vocab += 1
      else counts.dictation += 1
      dueByMaterial.set(item.materialId, counts)
    }

    const dueRows: DueRow[] = [...dueByMaterial.entries()]
      .flatMap(([materialId, counts]) => {
        const material = materials.find((item) => item.id === materialId)
        if (!material) return []
        return [
          {
            material,
            vocab: counts.vocab,
            dictation: counts.dictation,
            total: counts.vocab + counts.dictation,
          },
        ]
      })
      .sort((a, b) => b.total - a.total)

    const dueVocab = dueItems.filter(
      (item) => item.kind === 'vocab' || item.kind === 'recall',
    ).length
    const dueDictation = dueItems.filter(
      (item) => item.kind === 'dictation',
    ).length
    const dueTotal = dueVocab + dueDictation

    const reviewDone =
      dueTotal === 0 ||
      attemptsToday.some(
        (attempt) =>
          attempt.kind === 'vocab' ||
          attempt.kind === 'recall' ||
          attempt.kind === 'dictation',
      )
    const listeningToday = attemptsToday.filter(
      (attempt) => attempt.kind === 'listening',
    ).length
    const inputDone =
      attemptsToday.some((attempt) => attempt.kind === 'reading') ||
      listeningToday > 0
    const outputDone =
      writingToday > 0 ||
      speakingToday > 0 ||
      attemptsToday.some((attempt) => attempt.kind === 'retell')
    const activeCorpus = corpusItems.filter((item) => item.status === 'active')
    const corpusDue = activeCorpus.filter(
      (item) => item.dueAt <= now,
    ).length

    const dailyMinutes = Math.min(
      90,
      Math.max(20, Number(dailySetting?.value) || 45),
    )
    const diagnosticFocus = deriveFocus(errorRows)
    const focus = diagnosticFocus
      ? {
          tag: diagnosticFocus.tag,
          title: diagnosticFocus.title,
          minutes: diagnosticFocus.minutes,
          count: diagnosticFocus.count,
          href: practiceHref(
            diagnosticFocus.area,
            (latest as MaterialRow | null)?.id ?? null,
          ),
        }
      : null

    let journey: JourneySnapshot | null = null
    if (setting) {
      const start = Number(setting.value)
      if (Number.isFinite(start)) {
        const days = Math.max(0, Math.floor((now - start) / DAY_MS))
        const phaseIndex = days < 90 ? 0 : days < 180 ? 1 : 2
        const phase = PHASES[phaseIndex]
        const week = Math.floor(days / 7)
        journey = {
          days,
          month: Math.min(9, Math.floor(days / 30) + 1),
          phaseIndex,
          focus: phase.focus[week % phase.focus.length],
          progress: Math.min(100, Math.round((days / JOURNEY_DAYS) * 100)),
          complete: days >= JOURNEY_DAYS,
        }
      }
    }

    return {
      materialsCount: materials.length,
      packCount: packRows.length,
      dueRows,
      dueVocab,
      dueDictation,
      dueTotal,
      latest,
      reviewDone,
      inputDone,
      outputDone,
      listeningToday,
      writingToday,
      corpusTotal: activeCorpus.length,
      corpusDue,
      dailyMinutes,
      focus,
      journey,
    }
  }, [])

  async function startJourney() {
    if (starting) return
    setStarting(true)
    try {
      await db.settings.put({
        key: 'journeyStart',
        value: String(todayStartMs()),
        updatedAt: Date.now(),
      })
    } finally {
      setStarting(false)
    }
  }

  const topDue = snapshot?.dueRows[0]
  const reviewHref = topDue
    ? `/study?mode=${topDue.vocab > 0 ? 'vocab' : 'dictation'}&material=${
        topDue.material.id
      }`
    : undefined
  const readingHref = snapshot?.latest
    ? `/study?mode=reading&material=${snapshot.latest.id}`
    : '/materials'
  const completedCount = snapshot
    ? [snapshot.reviewDone, snapshot.inputDone, snapshot.outputDone].filter(
        Boolean,
      ).length
    : 0
  const dailyMinutes = snapshot?.dailyMinutes ?? 45
  const reviewMinutes = Math.max(3, Math.round(dailyMinutes * 0.2))
  const inputMinutes = Math.max(5, Math.round(dailyMinutes * 0.4))
  const outputMinutes = Math.max(
    5,
    dailyMinutes - reviewMinutes - inputMinutes,
  )
  const journey = snapshot?.journey ?? null
  const phase = journey ? PHASES[journey.phaseIndex] : null

  return (
    <>
      <PageHeader
        eyebrow="今日 · Today"
        title="今天，只做三件事"
        description={`先清掉到期复习，再读一段，最后用自己的话输出。约 ${dailyMinutes} 分钟，不需要一次做完所有事。`}
      >
        <span className="rounded-lg border border-border/80 bg-card/70 px-3 py-1.5 text-[10.5px] text-muted-foreground">
          {formatDeskDate()}
        </span>
      </PageHeader>

      {snapshot === undefined ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/55 px-6 py-16 text-[12px] text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          正在摆好今天的书桌…
        </div>
      ) : (
        <>
          <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-desk sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">今日航线 · Route</p>
                <h2 className="mt-1 font-display text-[21px] tracking-[-0.02em]">
                  按顺序走完就好
                </h2>
              </div>
              <span className="shrink-0 rounded-full bg-secondary/70 px-2.5 py-1 text-[9.5px] text-muted-foreground">
                约 {snapshot.dailyMinutes} 分钟
              </span>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-border/80">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500"
                  style={{ width: `${(completedCount / 3) * 100}%` }}
                />
              </div>
              <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                {completedCount} / 3
              </span>
            </div>

            {snapshot.focus && (
              <Link
                to={snapshot.focus.href}
                className="mt-3 flex items-center gap-2.5 rounded-xl border border-action/20 bg-action-wash/35 px-3.5 py-2.5 text-action-ink transition-colors hover:bg-action-wash/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/30"
              >
                <Target className="size-4 shrink-0" strokeWidth={1.8} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11.5px] font-medium">
                    诊断重点 · {snapshot.focus.title}
                  </span>
                  <span className="mt-0.5 block text-[9.5px] text-action-ink/70">
                    来自 {snapshot.focus.count} 次记录 · 已同步到今日航线
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-[10px] font-medium">
                  去练 {snapshot.focus.minutes} 分钟
                  <ChevronRight className="size-3.5" strokeWidth={1.8} />
                </span>
              </Link>
            )}

            <div className="mt-4 space-y-2">
              <RouteStep
                index={1}
                title="复习到期卡片"
                minutes={reviewMinutes}
                meta={
                  snapshot.dueTotal > 0
                    ? `词卡 ${snapshot.dueVocab} · 听写 ${snapshot.dueDictation}`
                    : '今天没有到期卡片，可以直接去读'
                }
                done={snapshot.reviewDone}
                to={snapshot.dueTotal > 0 ? reviewHref : undefined}
                action="去复习"
              />
              <RouteStep
                index={2}
                title="读或听一段"
                minutes={inputMinutes}
                meta={
                  snapshot.listeningToday > 0
                    ? `今天已听 ${snapshot.listeningToday} 句/段 · 也可以再读一段`
                    : snapshot.latest
                      ? `${snapshot.latest.title} · ${snapshot.latest.wordCount} 词`
                      : '还没有学习包，也可以先去听力室'
                }
                done={snapshot.inputDone}
                to={readingHref}
                action={snapshot.latest ? '去阅读' : '去材料库'}
              />
              <RouteStep
                index={3}
                title="用自己的话输出"
                minutes={outputMinutes}
                meta={
                  snapshot.latest
                    ? '写一小段、复述材料，或做一次口语角色扮演'
                    : '用英文写三句话也算开始'
                }
                done={snapshot.outputDone}
                to="/writing"
                action="去写作"
              />
            </div>

            {snapshot.latest === null && (
              <button
                type="button"
                onClick={() => setAutoOpen(true)}
                className="mt-3 flex w-full items-center gap-2.5 rounded-xl border border-action/25 bg-action-wash/40 px-3.5 py-3 text-left text-action-ink transition-colors hover:bg-action-wash/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/30"
              >
                <Sparkles className="size-4 shrink-0" strokeWidth={1.9} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11.5px] font-medium">
                    还没有材料？让 AI 先生成一课
                  </span>
                  <span className="mt-0.5 block text-[9.5px] text-action-ink/70">
                    不用粘贴任何内容，生成后直接进入阅读、词汇与听写
                  </span>
                </span>
                <ChevronRight className="size-3.5 shrink-0" strokeWidth={1.8} />
              </button>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <Link
                to="/speaking"
                className="inline-flex items-center gap-1 text-[10.5px] font-medium text-primary transition-colors hover:text-primary-ink"
              >
                也可以做一次 3 分钟口语角色扮演
                <ChevronRight className="size-3.5" strokeWidth={1.8} />
              </Link>
              <Link
                to="/listening"
                className="inline-flex items-center gap-1 text-[10.5px] font-medium text-primary transition-colors hover:text-primary-ink"
              >
                或去听力室做一段 Dictogloss
                <ChevronRight className="size-3.5" strokeWidth={1.8} />
              </Link>
              {snapshot.corpusTotal > 0 && (
                <Link
                  to="/corpus"
                  className="inline-flex items-center gap-1 text-[10.5px] font-medium text-action-ink transition-colors hover:text-action-hover"
                >
                  {snapshot.corpusDue > 0
                    ? `语料库有 ${snapshot.corpusDue} 条错误待微训练`
                    : `语料库已收集 ${snapshot.corpusTotal} 条错误`}
                  <ChevronRight className="size-3.5" strokeWidth={1.8} />
                </Link>
              )}
            </div>

            {completedCount === 3 && (
              <p className="mt-4 flex items-center gap-1.5 text-[10.5px] text-primary">
                <Check className="size-3.5" strokeWidth={2} />
                今天的航线走完了。剩下的时间留给散步，或者休息。
              </p>
            )}
          </section>

          <div className="mt-5 grid gap-4">
            <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-desk sm:p-6">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="eyebrow">到期复习 · Review</p>
                  <h2 className="mt-1 font-display text-[19px] tracking-[-0.015em]">
                    跨材料的复习队列
                  </h2>
                </div>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {snapshot.dueTotal} 张
                </span>
              </div>

              {snapshot.dueRows.length === 0 ? (
                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/20 px-4 py-3.5 text-[11.5px] leading-5 text-muted-foreground">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  今天没有到期的词汇或听写卡片。新卡片会在生成学习包时进入这里。
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {snapshot.dueRows.slice(0, 4).map((row) => {
                    const mode = row.vocab > 0 ? 'vocab' : 'dictation'
                    return (
                      <Link
                        key={row.material.id}
                        to={`/study?mode=${mode}&material=${row.material.id}`}
                        className="flex items-center gap-3 rounded-xl border border-border/65 bg-muted/15 px-3.5 py-3 transition-colors hover:border-primary/25 hover:bg-primary-wash/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-[14px] leading-snug">
                            {row.material.title}
                          </p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            词卡 {row.vocab} · 听写 {row.dictation}
                          </p>
                        </div>
                        <span className="text-[10.5px] font-medium text-primary">
                          去复习
                        </span>
                        <ChevronRight className="size-3.5 text-primary/70" />
                      </Link>
                    )
                  })}
                  {snapshot.dueRows.length > 4 && (
                    <p className="pt-1 text-[10px] text-muted-foreground">
                      还有 {snapshot.dueRows.length - 4} 份材料有到期卡片。
                    </p>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-desk sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">9 个月航线 · Journey</p>
                  <h2 className="mt-1 font-display text-[19px] tracking-[-0.015em]">
                    把功能串成一条路
                  </h2>
                </div>
                <span className="rounded-full bg-secondary/70 px-2.5 py-1 text-[9.5px] text-muted-foreground">
                  {journey ? phase?.label : '尚未开始'}
                </span>
              </div>

              {journey === null ? (
                <div className="mt-4">
                  <p className="max-w-xl text-[11.5px] leading-6 text-muted-foreground">
                    以每天 45–60 分钟、每周 5 天为节奏。今日航线会把复习、阅读和输出排成一条可完成的路；真正的月度诊断会在后续页面接入。
                  </p>
                  <Button
                    variant="action"
                    className="mt-4"
                    onClick={() => void startJourney()}
                    disabled={starting}
                  >
                    {starting ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <PenLine strokeWidth={1.8} />
                    )}
                    从今天开始
                  </Button>
                  <p className="mt-2 text-[10px] text-muted-foreground/70">
                    起点只保存在本机，不需要账号。
                  </p>
                </div>
              ) : (
                <div className="mt-4">
                  <div className="flex items-end justify-between gap-3">
                    <p className="font-display text-[24px] leading-none tracking-[-0.02em]">
                      第 {journey.month} 月{' '}
                      <span className="text-[12px] font-normal text-muted-foreground">
                        / 9
                      </span>
                    </p>
                    <p className="text-[10px] tabular-nums text-muted-foreground">
                      第 {journey.days + 1} 天
                    </p>
                  </div>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-border/80">
                    <div
                      className="h-full rounded-full bg-action transition-[width] duration-500"
                      style={{ width: `${journey.progress}%` }}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-1.5">
                    {PHASES.map((item, index) => (
                      <div
                        key={item.label}
                        className={cn(
                          'rounded-lg border px-2.5 py-2',
                          index === journey.phaseIndex
                            ? 'border-action/25 bg-action-wash/45'
                            : 'border-border/60 bg-muted/15',
                        )}
                      >
                        <p
                          className={cn(
                            'text-[10px] font-medium',
                            index === journey.phaseIndex
                              ? 'text-action-ink'
                              : 'text-muted-foreground',
                          )}
                        >
                          {item.label}
                        </p>
                        <p className="mt-0.5 text-[9px] text-muted-foreground/70">
                          {item.months}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-xl border border-border/60 bg-secondary/30 px-4 py-3">
                    <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground/70">
                      本周重点 · This week
                    </p>
                    <p className="mt-1 font-display text-[14px] leading-6 text-foreground/85">
                      {snapshot.focus ? snapshot.focus.title : journey.focus}
                    </p>
                    <p className="mt-1 text-[9px] text-muted-foreground/65">
                      {snapshot.focus
                        ? `来自诊断 · ${snapshot.focus.tag}`
                        : '来自当前阶段的建议'}
                    </p>
                  </div>

                  <p className="mt-3 text-[10px] leading-5 text-muted-foreground/75">
                    {journey.complete
                      ? '9 个月路线已经走完。接下来是维护和真实使用。'
                      : `每天 ${snapshot.dailyMinutes} 分钟 · 每周 5 天 · 现在只记录起点和阶段。`}
                  </p>
                </div>
              )}
            </section>
          </div>

          <p className="mt-8 text-center text-[10px] leading-5 text-muted-foreground/60">
            今日路线只读取本机的学习记录；AI 生成的内容会在对应页面发送给所选 AI 服务。
          </p>
        </>
      )}

      <AutoMaterialDialog
        open={autoOpen}
        onOpenChange={setAutoOpen}
        onCreated={() => undefined}
      />
    </>
  )
}
