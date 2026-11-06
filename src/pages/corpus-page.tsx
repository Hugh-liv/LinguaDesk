import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  Check,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CorpusDrill } from '@/components/corpus/corpus-drill'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import {
  gradeCorpusItem,
  removeCorpusItem,
  setCorpusStatus,
  syncCorpusFromHistory,
} from '@/lib/corpus'
import {
  db,
  type CorpusItemRow,
} from '@/lib/db'
import { formatRelativeTime } from '@/lib/format'
import type { ReviewGrade } from '@/lib/srs'
import { cn } from '@/lib/utils'

function sourceLabel(item: CorpusItemRow): string {
  return item.sourceType === 'writing' ? '写作' : '口语'
}

function dueLabel(item: CorpusItemRow, now: number): string {
  if (item.status === 'mastered') return '已掌握'
  if (item.dueAt <= now) return '待复习'
  return `下次 ${formatRelativeTime(item.dueAt)}`
}

export function CorpusPage() {
  const items = useLiveQuery(
    () => db.corpusItems.orderBy('updatedAt').reverse().toArray(),
    [],
  )
  const [queue, setQueue] = useState<CorpusItemRow[] | null>(null)
  const [index, setIndex] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const rows = items ?? []
  const active = rows.filter((item) => item.status === 'active')
  const due = active.filter((item) => item.dueAt <= now)
  const mastered = rows.filter((item) => item.status === 'mastered')

  function start(itemsToDrill: CorpusItemRow[]) {
    if (itemsToDrill.length === 0) return
    setQueue(itemsToDrill)
    setIndex(0)
    setError(null)
  }

  async function handleGrade(grade: ReviewGrade, score: number | null) {
    if (!queue) return
    const current = queue[index]
    if (!current) return
    try {
      await gradeCorpusItem(current, grade, score)
      const nextIndex = index + 1
      if (nextIndex >= queue.length) {
        setQueue(null)
        setIndex(0)
        setNotice('这一轮微训练完成了。')
      } else {
        setIndex(nextIndex)
      }
    } catch {
      setError('这次记录没有保存成功，请再试一次。')
    }
  }

  async function syncHistory() {
    if (syncing) return
    setSyncing(true)
    setError(null)
    try {
      const changed = await syncCorpusFromHistory()
      setNotice(
        changed > 0
          ? `已从历史写作/口语反馈中同步 ${changed} 条错误。`
          : '历史反馈已经同步过了，没有新的错误。',
      )
    } catch {
      setError('同步历史反馈失败，请再试一次。')
    } finally {
      setSyncing(false)
    }
  }

  async function toggleMastered(item: CorpusItemRow) {
    await setCorpusStatus(
      item.id,
      item.status === 'mastered' ? 'active' : 'mastered',
    )
    setNotice(
      item.status === 'mastered'
        ? '已重新放回微训练队列。'
        : '已标记为掌握。',
    )
  }

  async function remove(item: CorpusItemRow) {
    const confirmed = window.confirm(
      `从个人语料库移除「${item.original.slice(0, 40)}…」？`,
    )
    if (!confirmed) return
    await removeCorpusItem(item.id)
    setNotice('这条错误已移除。')
  }

  if (queue) {
    const current = queue[index]
    if (!current) return null

    return (
      <>
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">语料库 · Micro-drill</p>
            <h1 className="mt-1.5 font-display text-[25px] font-semibold leading-tight tracking-[-0.025em]">
              一次只改一句
            </h1>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setQueue(null)
              setIndex(0)
            }}
          >
            <ArrowLeft strokeWidth={1.8} />
            返回语料库
          </Button>
        </header>

        <CorpusDrill
          key={current.id}
          item={current}
          index={index}
          total={queue.length}
          onGrade={handleGrade}
          onExit={() => {
            setQueue(null)
            setIndex(0)
          }}
        />

        {error && (
          <p role="alert" className="mt-3 text-center text-[10.5px] text-destructive">
            {error}
          </p>
        )}
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="个人语料库 · Corpus"
        title="把犯过的错，练成自己的句子"
        description="写作和口语反馈中的错误会自动收集。反复出现的错误会累积次数，并进入短练队列。"
      >
        <Button
          variant="outline"
          onClick={() => void syncHistory()}
          disabled={syncing}
        >
          {syncing ? (
            <Loader2 className="animate-spin" />
          ) : (
            <RefreshCw strokeWidth={1.8} />
          )}
          {syncing ? '同步中…' : '同步历史反馈'}
        </Button>
      </PageHeader>

      {notice && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-primary/15 bg-primary-wash/40 px-3.5 py-2.5 text-[11px] text-primary-ink">
          <Sparkles className="size-3.5 shrink-0" strokeWidth={1.8} />
          {notice}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-destructive/25 bg-destructive/[0.06] px-3.5 py-2.5 text-[11.5px] leading-5 text-destructive"
        >
          {error}
        </div>
      )}

      {items === undefined ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/55 px-6 py-16 text-[12px] text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          正在整理你的错误…
        </div>
      ) : rows.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-card/55 px-6 py-10 text-center shadow-desk sm:py-12">
          <div className="mx-auto grid size-12 place-items-center rounded-xl bg-primary-wash text-primary">
            <BookMarked className="size-5" strokeWidth={1.7} />
          </div>
          <h2 className="mt-3 font-display text-[22px] tracking-[-0.02em]">
            语料库还是空的
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[12px] leading-6 text-muted-foreground">
            去写作工坊或口语陪练完成一次反馈，错误会自动收集到这里；已有的历史反馈可以点右上角「同步历史反馈」。
          </p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <Button variant="action" asChild>
              <Link to="/writing">去写一段</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/speaking">去做一次口语</Link>
            </Button>
          </div>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-3 divide-x divide-border/70 rounded-2xl border border-border/80 bg-card px-4 py-4 shadow-desk sm:px-6">
            {[
              ['收集错误', String(rows.length)],
              ['待复习', String(due.length)],
              ['已掌握', String(mastered.length)],
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

          <section className="mt-4 rounded-2xl border border-action/20 bg-action-wash/30 p-4 shadow-desk sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow text-action-ink/75">今日微训练</p>
                <p className="mt-1 text-[12px] leading-5 text-action-ink/85">
                  {due.length > 0
                    ? `${due.length} 条错误到期。每条只改一句，约 1–2 分钟。`
                    : '今天没有到期的错误卡，可以练一条已掌握的，或去写/说一点新的。'}
                </p>
              </div>
              <Button
                variant="action"
                disabled={due.length === 0}
                onClick={() => start(due.slice(0, 10))}
              >
                开始微训练
                <ArrowRight strokeWidth={1.8} />
              </Button>
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="eyebrow">错误卡 · Errors</p>
                <h2 className="mt-1 font-display text-[19px]">
                  反复出现的地方
                </h2>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {rows.length} 条
              </span>
            </div>

            <div className="space-y-2.5">
              {rows.map((item) => (
                <article
                  key={item.id}
                  className={cn(
                    'rounded-xl border bg-card p-4',
                    item.status === 'mastered'
                      ? 'border-primary/15 bg-primary-wash/10'
                      : item.dueAt <= now
                        ? 'border-action/20'
                        : 'border-border/65',
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-secondary/70 px-2 py-0.5 text-[8.5px] text-muted-foreground">
                      {sourceLabel(item)}
                    </span>
                    {item.occurrences > 1 && (
                      <span className="rounded-full bg-action-wash/70 px-2 py-0.5 text-[8.5px] text-action-ink">
                        出现 {item.occurrences} 次
                      </span>
                    )}
                    <span className="text-[9.5px] text-muted-foreground/70">
                      {dueLabel(item, now)}
                    </span>
                    <span className="ml-auto text-[9px] text-muted-foreground/55">
                      练过 {item.drillCount} 次
                    </span>
                  </div>

                  <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
                    <p className="rounded-lg bg-muted/25 px-3 py-2 text-[11.5px] leading-5 text-muted-foreground line-through decoration-destructive/30">
                      {item.original}
                    </p>
                    <p className="rounded-lg border border-primary/15 bg-primary-wash/35 px-3 py-2 text-[11.5px] leading-5 text-primary-ink">
                      {item.better}
                    </p>
                  </div>
                  {item.whyZh && (
                    <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
                      {item.whyZh}
                    </p>
                  )}
                  <p className="mt-1.5 truncate text-[9px] text-muted-foreground/55">
                    来源：{item.sources[0]?.title || sourceLabel(item)}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/55 pt-2.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => start([item])}
                    >
                      练这一条
                      <ArrowRight strokeWidth={1.8} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void toggleMastered(item)}
                    >
                      {item.status === 'mastered' ? (
                        <>
                          <RefreshCw strokeWidth={1.8} />
                          重新激活
                        </>
                      ) : (
                        <>
                          <Check strokeWidth={2} />
                          标记掌握
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void remove(item)}
                      className="ml-auto text-muted-foreground/60 hover:text-destructive"
                    >
                      <Trash2 strokeWidth={1.8} />
                      移除
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </>
  )
}
