import { useLiveQuery } from 'dexie-react-hooks'
import {
  Activity,
  ArrowRight,
  Check,
  ChevronRight,
  Target,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import type { AttemptRow, ErrorTagRow } from '@/lib/db'
import { db } from '@/lib/db'
import {
  areaLabel,
  buildStrategyCards,
  deriveFocus,
  practiceHref,
  type DiagnosticCard,
} from '@/lib/diagnostics'
import { formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const KIND_LABEL: Record<string, string> = {
  reading: '阅读',
  vocab: '词汇卡',
  recall: '中→英产出',
  corpus: '语料微训练',
  dictation: '听写',
  listening: '听力',
  retell: '复述',
  pattern: '句型',
  quiz: '理解题',
  writing: '写作',
}

function scoreLabel(attempt: AttemptRow): string {
  if (attempt.kind === 'reading') return '完成'
  if (attempt.score === null) return '完成'
  if (
    attempt.kind === 'dictation' ||
    attempt.kind === 'listening' ||
    attempt.kind === 'corpus'
  ) {
    return `${Math.round(attempt.score * 100)}%`
  }
  if (attempt.kind === 'vocab' || attempt.kind === 'recall') {
    return attempt.score >= 1 ? '记得' : attempt.score >= 0.5 ? '模糊' : '忘记'
  }
  if (attempt.kind === 'retell') {
    return attempt.score >= 1 ? '顺利' : '有点卡'
  }
  return '完成'
}

function FocusCard({
  focus,
  href,
}: {
  focus: DiagnosticCard
  href: string
}) {
  return (
    <section className="rounded-2xl border border-action/20 bg-action-wash/35 p-5 shadow-desk sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow text-action-ink/75">当前焦点 · Focus</p>
        <span className="rounded-full border border-action/20 bg-card/60 px-2 py-0.5 text-[9px] text-action-ink/75">
          {areaLabel(focus.area)} · {focus.count} 次记录
        </span>
      </div>

      <h2 className="mt-3 font-display text-[23px] leading-snug tracking-[-0.02em]">
        {focus.title}
      </h2>
      <p className="mt-2 max-w-xl text-[12px] leading-6 text-foreground/70">
        {focus.summaryZh}
      </p>

      <div className="mt-4 rounded-xl border border-action/15 bg-card/70 px-4 py-3.5">
        <p className="text-[9px] uppercase tracking-[0.14em] text-action-ink/70">
          今天怎么练 · {focus.minutes} 分钟
        </p>
        <p className="mt-1.5 text-[12px] leading-6 text-foreground/80">
          {focus.drillZh}
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-1.5 text-[10px] text-action-ink/65">
          <Check className="size-3" strokeWidth={2} />
          已同步到今日航线
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/today">查看今日航线</Link>
          </Button>
          <Button variant="action" size="sm" asChild>
            <Link to={href}>
              去练 {focus.minutes} 分钟
              <ArrowRight strokeWidth={1.8} />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

function StrategyCard({
  card,
  href,
}: {
  card: DiagnosticCard
  href: string
}) {
  return (
    <article className="rounded-xl border border-border/70 bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] uppercase tracking-[0.13em] text-muted-foreground/70">
          {areaLabel(card.area)} · {card.count} 次
        </span>
        <span className="text-[9px] text-muted-foreground/60">
          {card.minutes} min
        </span>
      </div>
      <h3 className="mt-1.5 font-display text-[16px] leading-snug">
        {card.title}
      </h3>
      <p className="mt-1.5 text-[11.5px] leading-5 text-muted-foreground">
        {card.drillZh}
      </p>
      <Link
        to={href}
        className="mt-3 inline-flex items-center gap-1 text-[10.5px] font-medium text-primary transition-colors hover:text-primary-ink"
      >
        去练这个
        <ChevronRight className="size-3.5" strokeWidth={1.8} />
      </Link>
    </article>
  )
}

export function DiagnosticsPage() {
  const snapshot = useLiveQuery(async () => {
    const since = Date.now() - 7 * 86_400_000
    const [attempts, errors, materials, packs] = await Promise.all([
      db.attempts.orderBy('createdAt').reverse().limit(80).toArray(),
      db.errors.toArray(),
      db.materials.orderBy('createdAt').reverse().toArray(),
      db.packs.toArray(),
    ])

    const packIds = new Set(packs.map((pack) => pack.materialId))
    const latest = materials.find((material) => packIds.has(material.id)) ?? null
    const errorsSorted: ErrorTagRow[] = errors
      .filter((error) => error.count > 0)
      .sort((a, b) => b.count - a.count || b.lastSeenAt - a.lastSeenAt)
    const focus = deriveFocus(errors)
    const strategies = buildStrategyCards(errors)
    const recentAttempts = attempts.filter(
      (attempt) => attempt.createdAt >= since,
    )

    return {
      attempts: attempts.slice(0, 8),
      recentCount: recentAttempts.length,
      errors: errorsSorted,
      focus,
      strategies,
      latestMaterialId: latest?.id ?? null,
      focusHref: focus ? practiceHref(focus.area, latest?.id) : null,
    }
  }, [])

  if (snapshot === undefined) {
    return (
      <>
        <PageHeader
          eyebrow="诊断 · Insight"
          title="把错误，变成下一次的练习"
          description="不给自己打分，只看线索：哪些地方反复出现，下一次该怎么练。"
        />
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/55 px-6 py-16 text-[12px] text-muted-foreground">
          <Activity className="size-4 animate-pulse" />
          正在整理线索…
        </div>
      </>
    )
  }

  const hasData = snapshot.attempts.length > 0 || snapshot.errors.length > 0
  const focus = snapshot.focus
  const otherStrategies = focus
    ? snapshot.strategies.filter((card) => card.area !== focus.area)
    : snapshot.strategies

  return (
    <>
      <PageHeader
        eyebrow="诊断 · Insight"
        title="把错误，变成下一次的练习"
        description="不给自己打分，只看线索：哪些地方反复出现，下一次该怎么练。诊断焦点会同步到今日航线。"
      >
        <Button variant="outline" asChild>
          <Link to="/today">
            回到今日
            <ArrowRight strokeWidth={1.8} />
          </Link>
        </Button>
      </PageHeader>

      {!hasData ? (
        <section className="rounded-2xl border border-dashed border-border bg-card/55 px-6 py-10 text-center shadow-desk">
          <div className="mx-auto grid size-12 place-items-center rounded-xl bg-primary-wash text-primary">
            <Activity className="size-5" strokeWidth={1.7} />
          </div>
          <h2 className="mt-3 font-display text-[22px] tracking-[-0.02em]">
            诊断需要真实的练习
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[12px] leading-6 text-muted-foreground">
            先完成几张词汇卡、一次听写、一段听力或一次复述。错误标签会在这里慢慢形成，不会凭空给你打分。
          </p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <Button variant="outline" asChild>
              <Link to="/today">从今日航线开始</Link>
            </Button>
            <Button variant="action" asChild>
              <Link to="/study">去学习台</Link>
            </Button>
          </div>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-3 divide-x divide-border/70 rounded-2xl border border-border/80 bg-card px-4 py-4 shadow-desk sm:px-6">
            {[
              ['近 7 天练习', String(snapshot.recentCount)],
              ['错误标签', String(snapshot.errors.length)],
              ['当前重点', focus ? areaLabel(focus.area) : '待积累'],
            ].map(([label, value]) => (
              <div key={label} className="px-2 text-center first:pl-0 last:pr-0">
                <p className="font-display text-[22px] font-semibold leading-none tracking-[-0.02em]">
                  {value}
                </p>
                <p className="mt-1.5 text-[9.5px] text-muted-foreground">
                  {label}
                </p>
              </div>
            ))}
          </section>

          {focus && snapshot.focusHref ? (
            <div className="mt-5">
              <FocusCard focus={focus} href={snapshot.focusHref} />
            </div>
          ) : (
            <section className="mt-5 rounded-2xl border border-border/80 bg-card p-5 shadow-desk">
              <p className="eyebrow">当前焦点 · Focus</p>
              <h2 className="mt-2 font-display text-[20px]">
                还没有重复出现的错误标签
              </h2>
              <p className="mt-2 max-w-xl text-[12px] leading-6 text-muted-foreground">
                这可能是好事，也可能只是样本还少。继续完成练习，诊断会自动积累；不用为了产生数据而故意犯错。
              </p>
            </section>
          )}

          {otherStrategies.length > 0 && (
            <section className="mt-5">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p className="eyebrow">策略卡 · Strategies</p>
                  <h2 className="mt-1 font-display text-[19px]">
                    其他可以练的方向
                  </h2>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {otherStrategies.map((card) => (
                  <StrategyCard
                    key={`${card.tag}-${card.area}`}
                    card={card}
                    href={practiceHref(card.area, snapshot.latestMaterialId)}
                  />
                ))}
              </div>
            </section>
          )}

          <div className="mt-5 grid gap-4">
            <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-desk">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="eyebrow">错误标签 · Tags</p>
                  <h2 className="mt-1 font-display text-[19px]">
                    反复出现的线索
                  </h2>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {snapshot.errors.length} 个
                </span>
              </div>

              {snapshot.errors.length === 0 ? (
                <p className="mt-4 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-[11.5px] leading-5 text-muted-foreground">
                  还没有错误标签。继续做词汇卡、听写、听力或复述，标签会自动出现。
                </p>
              ) : (
                <div className="mt-4 space-y-2">
                  {snapshot.errors.slice(0, 6).map((error) => (
                    <div
                      key={error.tag}
                      className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/15 px-3.5 py-2.5"
                    >
                      <span
                        className={cn(
                          'size-1.5 shrink-0 rounded-full',
                          error.count >= 3 ? 'bg-destructive' : 'bg-action',
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-medium">{error.tag}</p>
                        <p className="mt-0.5 text-[9.5px] text-muted-foreground">
                          最近一次 · {formatRelativeTime(error.lastSeenAt)}
                        </p>
                      </div>
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {error.count} 次
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-desk">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="eyebrow">最近练习 · Activity</p>
                  <h2 className="mt-1 font-display text-[19px]">
                    留下记录的片刻
                  </h2>
                </div>
              </div>

              {snapshot.attempts.length === 0 ? (
                <p className="mt-4 text-[11.5px] text-muted-foreground">
                  完成一次练习后，这里会出现记录。
                </p>
              ) : (
                <div className="mt-4 divide-y divide-border/60">
                  {snapshot.attempts.slice(0, 6).map((attempt) => (
                    <div key={attempt.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary/70" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <p className="text-[11.5px] font-medium">
                            {KIND_LABEL[attempt.kind] ?? attempt.kind}
                          </p>
                          <span className="text-[9.5px] text-muted-foreground">
                            {scoreLabel(attempt)}
                          </span>
                          <span className="ml-auto text-[9px] text-muted-foreground/65">
                            {formatRelativeTime(attempt.createdAt)}
                          </span>
                        </div>
                        {attempt.errorTags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {attempt.errorTags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded bg-destructive/[0.06] px-1.5 py-px text-[8.5px] text-destructive/85"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-[10px] text-muted-foreground/65">
            <Target className="size-3" />
            诊断焦点会根据本地错误标签自动更新，并同步到今日航线。
          </p>
        </>
      )}
    </>
  )
}
