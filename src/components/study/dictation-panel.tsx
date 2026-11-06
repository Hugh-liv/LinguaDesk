import {
  ArrowRight,
  Check,
  Headphones,
  Loader2,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { StudyEntry, StudyMode } from '@/components/study/types'
import { canSpeak, speakEnglish } from '@/lib/speech'
import { diffWords, type WordDiff } from '@/lib/diff'
import {
  db,
  recordAttempt,
  type ReviewItemRow,
} from '@/lib/db'
import { gradeFromAccuracy, scheduleReview } from '@/lib/srs'
import { cn } from '@/lib/utils'

function scoreLabel(accuracy: number, extraCount: number): string {
  if (accuracy >= 0.999 && extraCount === 0) return '一字不差'
  if (accuracy >= 0.9) return '很接近了'
  if (accuracy >= 0.6) return '抓到了大意'
  return '再听一遍会更清楚'
}

export function DictationPanel({
  entry,
  reviewItems,
  onNextMode,
}: {
  entry: StudyEntry
  reviewItems: ReviewItemRow[]
  onNextMode: (mode: StudyMode) => void
}) {
  const sentences = entry.pack.dictation
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [checked, setChecked] = useState(false)
  const [result, setResult] = useState<WordDiff | null>(null)
  const [results, setResults] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [finished, setFinished] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const speechReady = canSpeak()

  const current = sentences[index]
  const average =
    results.length > 0
      ? Math.round(
          (results.reduce((sum, value) => sum + value, 0) / results.length) *
            100,
        )
      : 0

  function resetExercise() {
    setAnswer('')
    setChecked(false)
    setResult(null)
    setError(null)
    window.setTimeout(() => textareaRef.current?.focus(), 0)
  }

  async function checkAnswer() {
    if (!current || checked || saving || !answer.trim()) return

    const diff = diffWords(current.text, answer)
    const grade = gradeFromAccuracy(diff.accuracy)

    setResult(diff)
    setChecked(true)
    setResults((previous) => [...previous, diff.accuracy])
    setSaving(true)
    setError(null)

    try {
      const review = reviewItems.find(
        (item) => item.kind === 'dictation' && item.refId === current.id,
      )
      if (review) {
        await db.reviewItems.update(review.id, {
          ...scheduleReview(review, grade),
          updatedAt: Date.now(),
        })
      }

      const tags: string[] = []
      if (diff.accuracy < 0.9) tags.push('听写细节')
      if (diff.accuracy < 0.55) tags.push('听力辨词')
      if (diff.extra.length > 0) tags.push('拼写')

      await recordAttempt({
        materialId: entry.material.id,
        kind: 'dictation',
        score: diff.accuracy,
        errorTags: tags,
      })
    } catch {
      setError('这次结果没有完整保存，但对照仍可继续。')
    } finally {
      setSaving(false)
    }
  }

  function nextSentence() {
    if (index + 1 >= sentences.length) {
      setFinished(true)
      return
    }
    setIndex((previous) => previous + 1)
    resetExercise()
  }

  function restart() {
    setIndex(0)
    setResults([])
    setFinished(false)
    resetExercise()
  }

  if (sentences.length === 0) {
    return (
      <section className="rounded-2xl border border-border/80 bg-card px-6 py-10 text-center shadow-desk">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary-wash text-primary">
          <Headphones className="size-5" strokeWidth={1.8} />
        </div>
        <h2 className="mt-4 font-display text-[22px]">这份材料没有听写句</h2>
        <p className="mx-auto mt-2 max-w-sm text-[12px] leading-6 text-muted-foreground">
          换一份更完整的材料，学习包会自动抽出长度合适的句子。
        </p>
        <Button
          variant="outline"
          className="mt-5"
          onClick={() => onNextMode('retell')}
        >
          去复述
          <ArrowRight strokeWidth={1.8} />
        </Button>
      </section>
    )
  }

  if (finished) {
    return (
      <section className="rounded-2xl border border-border/80 bg-card px-6 py-10 text-center shadow-desk sm:py-12">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary-wash text-primary">
          <Check className="size-5" strokeWidth={2} />
        </div>
        <h2 className="mt-4 font-display text-[22px] tracking-[-0.02em]">
          听写这一轮结束了
        </h2>
        <p className="mt-2 text-[12px] leading-6 text-muted-foreground">
          {sentences.length} 句 · 平均写对 {average}% 的词
        </p>
        <p className="mx-auto mt-3 max-w-sm text-[10.5px] leading-5 text-muted-foreground/80">
          错误标签会留在诊断页，之后可以按标签集中练。
        </p>
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          <Button variant="outline" onClick={restart}>
            再练一轮
          </Button>
          <Button variant="action" onClick={() => onNextMode('retell')}>
            去复述
            <ArrowRight strokeWidth={1.8} />
          </Button>
        </div>
      </section>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-border/80">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${(index / sentences.length) * 100}%` }}
          />
        </div>
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
          {index + 1} / {sentences.length}
        </span>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-desk">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-5 py-3 sm:px-6">
          <p className="eyebrow">听写 · Dictation</p>
          <details className="group">
            <summary className="cursor-pointer rounded text-[10px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30">
              看提示
            </summary>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {current.hint}
            </p>
          </details>
        </div>

        <div className="flex flex-col items-center px-5 py-6 text-center sm:px-7">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              onClick={() => speakEnglish(current.text, 0.8)}
              disabled={!speechReady}
            >
              <Headphones strokeWidth={1.9} />
              播放（慢速）
            </Button>
            <Button
              variant="outline"
              onClick={() => speakEnglish(current.text, 0.98)}
              disabled={!speechReady}
            >
              常速
            </Button>
          </div>
          <p className="mt-2.5 text-[10px] text-muted-foreground">
            {speechReady
              ? '可以重复播放，写完后不要先看原文。'
              : '当前浏览器没有可用的英语语音。'}
          </p>
        </div>

        <div className="px-5 pb-5 sm:px-7 sm:pb-6">
          <label htmlFor="dictation-answer" className="sr-only">
            听写答案
          </label>
          <textarea
            ref={textareaRef}
            id="dictation-answer"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            readOnly={checked}
            rows={3}
            placeholder="写下你听到的句子…"
            className={cn(
              'w-full resize-y rounded-xl border border-input bg-card px-3.5 py-3 text-[13px] leading-6 text-foreground shadow-[inset_0_1px_1px_rgb(31_41_51_/_0.02)] outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/65 focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/20',
              checked && 'bg-muted/35 text-foreground/70',
            )}
          />

          {!checked && (
            <Button
              variant="action"
              className="mt-3 w-full"
              onClick={() => void checkAnswer()}
              disabled={!answer.trim() || saving}
            >
              {saving ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Check strokeWidth={2} />
              )}
              检查听写
            </Button>
          )}
        </div>

        {checked && result && (
          <div className="border-t border-border/60 bg-muted/20 px-5 py-5 sm:px-7">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-display text-[18px] tracking-[-0.015em]">
                {scoreLabel(result.accuracy, result.extra.length)}
              </p>
              <p className="text-[10.5px] tabular-nums text-muted-foreground">
                写对 {result.matched} / {result.total} 个词
                {result.extra.length > 0 &&
                  ` · 多写 ${result.extra.length} 个`}
              </p>
            </div>

            <p className="mt-3 rounded-xl border border-border/60 bg-card px-4 py-3 font-display text-[14px] leading-6 text-foreground/85">
              {current.text}
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {result.expected.map((token, tokenIndex) => (
                <span
                  key={`${token.word}-${tokenIndex}`}
                  className={cn(
                    'rounded px-1 py-0.5 text-[11.5px]',
                    token.matched
                      ? 'bg-primary-wash/70 text-primary-ink'
                      : 'bg-destructive/[0.07] text-destructive line-through decoration-destructive/40',
                  )}
                >
                  {token.word}
                </span>
              ))}
            </div>

            {result.extra.length > 0 && (
              <p className="mt-2 text-[10.5px] text-destructive/85">
                多写：{result.extra.join(' · ')}
              </p>
            )}

            {error && (
              <p role="alert" className="mt-2 text-[10.5px] text-destructive">
                {error}
              </p>
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => speakEnglish(current.text, 0.8)}
                disabled={!speechReady}
              >
                <Headphones strokeWidth={1.9} />
                再听一遍
              </Button>
              <Button
                variant="action"
                onClick={nextSentence}
                disabled={saving}
              >
                {index + 1 >= sentences.length ? '查看小结' : '下一句'}
                <ArrowRight strokeWidth={1.8} />
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
