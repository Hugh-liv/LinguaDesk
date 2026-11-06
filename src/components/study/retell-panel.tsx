import {
  ArrowRight,
  Check,
  Loader2,
  Mic,
  Square,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { StudyEntry, StudyMode } from '@/components/study/types'
import { recordAttempt } from '@/lib/db'
import { cn } from '@/lib/utils'

const LIMIT_SECONDS = 60

function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

export function RetellPanel({
  entry,
  onNextMode,
}: {
  entry: StudyEntry
  onNextMode: (mode: StudyMode) => void
}) {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [rating, setRating] = useState<'smooth' | 'uneven' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const elapsedRef = useRef(0)

  useEffect(() => {
    if (!running) return

    const timer = window.setInterval(() => {
      const next = Math.min(LIMIT_SECONDS, elapsedRef.current + 1)
      elapsedRef.current = next
      setElapsed(next)

      if (next >= LIMIT_SECONDS) {
        window.clearInterval(timer)
        setRunning(false)
      }
    }, 1000)

    return () => window.clearInterval(timer)
  }, [running])

  const remaining = Math.max(0, LIMIT_SECONDS - elapsed)
  const reviewPhase = !running && elapsed > 0 && !saved
  const timeUp = elapsed >= LIMIT_SECONDS

  function start() {
    elapsedRef.current = 0
    setElapsed(0)
    setSaved(false)
    setRating(null)
    setError(null)
    setRunning(true)
  }

  function stop() {
    setRunning(false)
  }

  async function saveRating(value: 'smooth' | 'uneven') {
    if (saving) return
    setSaving(true)
    setError(null)

    try {
      await recordAttempt({
        materialId: entry.material.id,
        kind: 'retell',
        score: value === 'smooth' ? 1 : 0.5,
        durationMs: elapsed * 1000,
        errorTags: value === 'uneven' ? ['复述不连贯'] : [],
      })
      setRating(value)
      setSaved(true)
    } catch {
      setError('这次自评没有保存成功，请再试一次。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.12fr_0.88fr] lg:items-stretch">
      <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-desk sm:p-6">
        <div className="flex items-center gap-2 text-primary">
          <Mic className="size-3.5" strokeWidth={1.9} />
          <p className="eyebrow text-primary/70">复述 · Retell</p>
        </div>
        <p className="mt-2.5 font-display text-[16px] leading-7 text-foreground/88 sm:text-[17px]">
          {entry.pack.retell.promptZh}
        </p>

        <div className="mt-5 border-t border-border/60 pt-4">
          <p className="eyebrow">提纲 · Outline</p>
          <ol className="mt-2.5 space-y-2.5">
            {entry.pack.retell.outline.map((step, index) => (
              <li key={step} className="flex items-start gap-2.5">
                <span
                  className={cn(
                    'mt-2 size-1.5 shrink-0 rounded-full',
                    index === 0 ? 'bg-action' : 'bg-border',
                  )}
                />
                <p className="text-[12px] leading-6 text-muted-foreground">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="flex flex-col justify-center rounded-2xl border border-border/80 bg-card px-5 py-7 text-center shadow-desk sm:px-7 sm:py-8">
        <p className="eyebrow">计时 · Timer</p>
        <p className="mt-3 font-display text-[54px] leading-none tracking-[-0.03em] tabular-nums sm:text-[64px]">
          {formatClock(remaining)}
          <span className="ml-2 text-[13px] font-normal tracking-normal text-muted-foreground">
            / {formatClock(LIMIT_SECONDS)}
          </span>
        </p>

        <div className="mx-auto mt-5 h-1 w-full max-w-sm overflow-hidden rounded-full bg-border/80">
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-500',
              timeUp ? 'bg-action' : 'bg-primary',
            )}
            style={{ width: `${(elapsed / LIMIT_SECONDS) * 100}%` }}
          />
        </div>

        <p className="mx-auto mt-3 min-h-5 max-w-sm text-[10.5px] leading-5 text-muted-foreground">
          {running
            ? '先把话说出来，不必完美。'
            : reviewPhase
              ? timeUp
                ? '60 秒到了。按真实感受评一下，不必追求完整。'
                : `已用 ${elapsed} 秒。按真实感受评一下。`
              : saved
                ? '这一轮已经记下。'
                : '准备好后开始。可以停下来，也可以说满一分钟。'}
        </p>

        {!running && !reviewPhase && !saved && (
          <Button
            variant="action"
            size="lg"
            className="mt-4 w-full sm:w-auto"
            onClick={start}
          >
            <Mic strokeWidth={1.9} />
            开始 60 秒复述
          </Button>
        )}

        {running && (
          <Button
            variant="outline"
            size="lg"
            className="mt-4 w-full sm:w-auto"
            onClick={stop}
          >
            <Square className="size-3.5" strokeWidth={2} />
            结束并自评
          </Button>
        )}

        {reviewPhase && (
          <div className="mx-auto mt-4 max-w-md">
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="action"
                className="h-auto flex-col gap-0.5 py-2.5"
                disabled={saving}
                onClick={() => void saveRating('smooth')}
              >
                <span>顺利讲完</span>
                <span className="text-[9px] font-normal opacity-75">
                  主题和收束都在
                </span>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-0.5 border-destructive/20 py-2.5 text-destructive hover:bg-destructive/[0.05] hover:text-destructive"
                disabled={saving}
                onClick={() => void saveRating('uneven')}
              >
                <span>有点卡</span>
                <span className="text-[9px] font-normal opacity-65">
                  还要再练一遍
                </span>
              </Button>
            </div>
            <button
              type="button"
              onClick={start}
              disabled={saving}
              className="mt-3 text-[10.5px] text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground disabled:opacity-50"
            >
              不计入记录，重新计时
            </button>
            {error && (
              <p role="alert" className="mt-2 text-[10.5px] text-destructive">
                {error}
              </p>
            )}
          </div>
        )}

        {saved && (
          <div className="mx-auto mt-4 max-w-md">
            <div className="flex items-center justify-center gap-2 rounded-xl border border-primary/15 bg-primary-wash/45 px-4 py-3 text-[11.5px] text-primary-ink">
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" strokeWidth={2} />
              )}
              已记录这次复述 · 用时 {elapsed} 秒 ·{' '}
              {rating === 'smooth' ? '顺利' : '有点卡'}
            </div>
            <div className="mt-3 flex flex-col justify-center gap-2 sm:flex-row">
              <Button variant="outline" onClick={start}>
                再复述一次
              </Button>
              <Button variant="action" onClick={() => onNextMode('reading')}>
                回到阅读
                <ArrowRight strokeWidth={1.8} />
              </Button>
            </div>
            <p className="mt-3 text-[10px] leading-5 text-muted-foreground/75">
              这条记录会进入诊断页，用来找“哪里容易卡住”，不会变成分数。
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
