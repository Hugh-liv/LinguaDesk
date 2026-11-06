import {
  ArrowRight,
  Check,
  Eye,
  Lightbulb,
  Loader2,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SpeechButton } from '@/components/ui/speech-button'
import { WordDiffView } from '@/components/listening/word-diff-view'
import type { CorpusItemRow } from '@/lib/db'
import { diffWords, type WordDiff } from '@/lib/diff'
import { formatRelativeTime } from '@/lib/format'
import { scheduleReview, type ReviewGrade } from '@/lib/srs'

function sourceLabel(item: CorpusItemRow): string {
  return item.sourceType === 'writing' ? '写作反馈' : '口语反馈'
}

export function CorpusDrill({
  item,
  index,
  total,
  onGrade,
  onExit,
}: {
  item: CorpusItemRow
  index: number
  total: number
  onGrade: (grade: ReviewGrade, score: number | null) => Promise<void>
  onExit: () => void
}) {
  const [answer, setAnswer] = useState('')
  const [checked, setChecked] = useState(false)
  const [result, setResult] = useState<WordDiff | null>(null)
  const [hint, setHint] = useState(false)
  const [grading, setGrading] = useState(false)

  const previews = {
    again: formatRelativeTime(scheduleReview(item, 'again').dueAt),
    hard: formatRelativeTime(scheduleReview(item, 'hard').dueAt),
    good: formatRelativeTime(scheduleReview(item, 'good').dueAt),
  }

  function check() {
    if (checked || !answer.trim()) return
    setResult(diffWords(item.better, answer))
    setChecked(true)
  }

  function reveal() {
    setChecked(true)
    setResult(null)
  }

  async function grade(next: ReviewGrade) {
    if (grading) return
    setGrading(true)
    try {
      await onGrade(next, result?.accuracy ?? null)
    } finally {
      setGrading(false)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-border/80">
          <div
            className="h-full rounded-full bg-action transition-[width] duration-300"
            style={{ width: `${(index / total) * 100}%` }}
          />
        </div>
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
          {index + 1} / {total}
        </span>
        <Button variant="ghost" size="sm" onClick={onExit} disabled={grading}>
          退出
        </Button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-desk">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-5 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <p className="eyebrow">错误微训练 · Micro-drill</p>
            <span className="rounded-full bg-secondary/70 px-2 py-0.5 text-[8.5px] text-muted-foreground">
              {sourceLabel(item)}
            </span>
            {item.occurrences > 1 && (
              <span className="rounded-full bg-action-wash/70 px-2 py-0.5 text-[8.5px] text-action-ink">
                出现过 {item.occurrences} 次
              </span>
            )}
          </div>
          <p className="truncate text-[9.5px] text-muted-foreground/70">
            来自 {item.sources[0]?.title || sourceLabel(item)}
          </p>
        </div>

        <div className="px-5 py-6 sm:px-7">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
            原句 · Rewrite it more naturally
          </p>
          <p className="mt-2 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 font-display text-[15px] leading-7 text-foreground/80">
            {item.original}
          </p>

          <div className="mt-4 flex items-start gap-2 rounded-lg border border-action/15 bg-action-wash/25 px-3.5 py-2.5">
            <Lightbulb
              className="mt-0.5 size-3.5 shrink-0 text-action-ink/70"
              strokeWidth={1.8}
            />
            <div className="min-w-0 flex-1">
              {hint ? (
                <p className="text-[10.5px] leading-5 text-action-ink/85">
                  {item.whyZh || '先找出不自然的地方，再把它换成一个更常见的搭配或句式。'}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => setHint(true)}
                  className="text-[10.5px] text-action-ink/80 underline-offset-2 hover:underline"
                >
                  卡住了？看提示
                </button>
              )}
            </div>
          </div>

          <label htmlFor="corpus-drill-answer" className="sr-only">
            改写答案
          </label>
          <textarea
            id="corpus-drill-answer"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            readOnly={checked}
            rows={4}
            placeholder="用更自然的英文重写这句话…"
            className="mt-4 w-full resize-y rounded-xl border border-input bg-card px-3.5 py-3 text-[13px] leading-6 text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/65 focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/20 read-only:bg-muted/30"
          />

          {!checked && (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button
                variant="action"
                className="flex-1"
                onClick={check}
                disabled={!answer.trim()}
              >
                <Check strokeWidth={2} />
                检查改写
              </Button>
              <Button variant="ghost" onClick={reveal}>
                <Eye strokeWidth={1.8} />
                直接看参考
              </Button>
            </div>
          )}
        </div>

        {checked && (
          <div className="border-t border-border/60 bg-muted/20 px-5 py-5 sm:px-7">
            <div className="flex flex-wrap items-center gap-2">
              <p className="eyebrow">参考改写</p>
              <p className="font-display text-[15px] leading-6 text-primary-ink">
                {item.better}
              </p>
              <SpeechButton text={item.better} label="朗读参考改写" />
            </div>
            {item.whyZh && (
              <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                {item.whyZh}
              </p>
            )}
            {result ? (
              <div className="mt-3">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[10.5px] text-muted-foreground">
                    相似度 {Math.round(result.accuracy * 100)}% · 不要求一字不差
                  </p>
                  <p className="text-[9.5px] text-muted-foreground/60">
                    对照只帮你找差异
                  </p>
                </div>
                <WordDiffView result={result} />
              </div>
            ) : (
              <p className="mt-3 text-[10.5px] text-muted-foreground">
                先读一遍参考，再诚实评分。
              </p>
            )}

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                disabled={grading}
                onClick={() => void grade('again')}
                className="h-auto flex-col gap-0.5 border-destructive/25 py-2.5 text-destructive hover:bg-destructive/[0.05]"
              >
                <span className="text-[12px]">还没掌握</span>
                <span className="text-[9px] font-normal opacity-80">
                  {previews.again}
                </span>
              </Button>
              <Button
                variant="outline"
                disabled={grading}
                onClick={() => void grade('hard')}
                className="h-auto flex-col gap-0.5 border-action/25 py-2.5 text-action-ink hover:bg-action-wash/50"
              >
                <span className="text-[12px]">有点接近</span>
                <span className="text-[9px] font-normal opacity-80">
                  {previews.hard}
                </span>
              </Button>
              <Button
                variant="action"
                disabled={grading}
                onClick={() => void grade('good')}
                className="h-auto flex-col gap-0.5 py-2.5"
              >
                <span className="text-[12px]">掌握了</span>
                <span className="text-[9px] font-normal opacity-80">
                  {previews.good}
                </span>
              </Button>
            </div>
            {grading && (
              <p className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                正在记录…
              </p>
            )}
          </div>
        )}
      </section>

      <p className="mt-3 flex items-center justify-center gap-1 text-[10px] leading-5 text-muted-foreground/65">
        微训练只改一句，不写长文。
        <ArrowRight className="size-3" strokeWidth={1.8} />
      </p>
    </div>
  )
}
