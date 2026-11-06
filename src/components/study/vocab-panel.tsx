import { ArrowRight, Check, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SpeechButton } from '@/components/ui/speech-button'
import type { StudyEntry, StudyMode } from '@/components/study/types'
import {
  db,
  recordAttempt,
  type ReviewItemRow,
} from '@/lib/db'
import { formatRelativeTime } from '@/lib/format'
import {
  scheduleReview,
  type ReviewGrade,
} from '@/lib/srs'

interface GradeCounts {
  again: number
  hard: number
  good: number
}

function normalizeProduction(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function VocabPanel({
  entry,
  initialItems,
  onNextMode,
}: {
  entry: StudyEntry
  initialItems: ReviewItemRow[]
  onNextMode: (mode: StudyMode) => void
}) {
  const [queue] = useState(() => [...initialItems])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [answerInput, setAnswerInput] = useState('')
  const [checked, setChecked] = useState(false)
  const [correct, setCorrect] = useState<boolean | null>(null)
  const [grading, setGrading] = useState(false)
  const [finished, setFinished] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [counts, setCounts] = useState<GradeCounts>({
    again: 0,
    hard: 0,
    good: 0,
  })

  const current = queue[index]
  const isProduction = current?.kind === 'recall'
  const vocab = current
    ? entry.pack.vocab.find((item) => item.term === current.refId)
    : undefined
  const meaning = isProduction ? current.prompt : (vocab?.meaningZh ?? '')
  const example =
    vocab?.example ??
    (current && !isProduction && current.answer !== current.prompt
      ? current.answer
      : '')
  const isChunk =
    current?.chunk === true || /\s/.test(vocab?.term ?? current?.refId ?? '')
  const showGrades = isProduction ? checked : flipped

  const previews = current
    ? {
        again: formatRelativeTime(scheduleReview(current, 'again').dueAt),
        hard: formatRelativeTime(scheduleReview(current, 'hard').dueAt),
        good: formatRelativeTime(scheduleReview(current, 'good').dueAt),
      }
    : null

  function resetCard() {
    setFlipped(false)
    setAnswerInput('')
    setChecked(false)
    setCorrect(null)
    setError(null)
  }

  function checkAnswer() {
    if (!current || checked || !answerInput.trim()) return
    setChecked(true)
    setCorrect(
      normalizeProduction(answerInput) === normalizeProduction(current.answer),
    )
  }

  function revealAnswer() {
    if (!current || checked) return
    setChecked(true)
    setCorrect(null)
  }

  async function handleGrade(grade: ReviewGrade) {
    if (!current || grading) return

    setGrading(true)
    setError(null)
    const next = scheduleReview(current, grade)

    try {
      await db.reviewItems.update(current.id, {
        ...next,
        updatedAt: Date.now(),
      })
      await recordAttempt({
        materialId: entry.material.id,
        kind: isProduction ? 'recall' : 'vocab',
        score: grade === 'good' ? 1 : grade === 'hard' ? 0.5 : 0,
        errorTags: grade === 'good' ? [] : ['词汇记忆不稳'],
      })

      setCounts((previous) => ({
        ...previous,
        [grade]: previous[grade] + 1,
      }))
      setFeedback(`已记录 · 下次复习 ${formatRelativeTime(next.dueAt)}`)

      const nextIndex = index + 1
      setIndex(nextIndex)
      resetCard()
      if (nextIndex >= queue.length) setFinished(true)
    } catch {
      setError('这次记录没有保存成功，请再试一次。')
    } finally {
      setGrading(false)
    }
  }

  if (queue.length === 0) {
    return (
      <section className="rounded-2xl border border-border/80 bg-card px-6 py-10 text-center shadow-desk sm:py-12">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary-wash text-primary">
          <Check className="size-5" strokeWidth={2} />
        </div>
        <h2 className="mt-4 font-display text-[22px] tracking-[-0.02em]">
          今天没有到期的词卡
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-[12px] leading-6 text-muted-foreground">
          新词和语块会在生成学习包时进入队列。每张词卡会同时安排“英→中”和“中→英”两个方向。
        </p>
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onNextMode('reading')}>
            去阅读
          </Button>
          <Button variant="action" onClick={() => onNextMode('dictation')}>
            去听写
            <ArrowRight strokeWidth={1.8} />
          </Button>
        </div>
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
          这一轮双向词卡看完了
        </h2>
        <p className="mt-2 text-[12px] leading-6 text-muted-foreground">
          {queue.length} 张 · 记得 {counts.good} · 模糊 {counts.hard} · 忘记{' '}
          {counts.again}
        </p>
        <p className="mx-auto mt-3 max-w-sm text-[10.5px] leading-5 text-muted-foreground/80">
          “认识”和“用得出”分开排期；忘记的卡片会在约 10 分钟后回来。
        </p>
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onNextMode('reading')}>
            回到阅读
          </Button>
          <Button variant="action" onClick={() => onNextMode('dictation')}>
            去听写
            <ArrowRight strokeWidth={1.8} />
          </Button>
        </div>
      </section>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-3 sm:mb-4">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-border/80">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${(index / queue.length) * 100}%` }}
          />
        </div>
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
          {index + 1} / {queue.length}
        </span>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-desk">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <p className="eyebrow">双向词卡 · Two-way</p>
            <span className="rounded-full bg-secondary/70 px-2 py-0.5 text-[8.5px] text-muted-foreground">
              {isProduction ? '中→英 · 产出' : '英→中 · 认读'}
            </span>
            {isChunk && (
              <span className="rounded-full bg-action-wash/70 px-2 py-0.5 text-[8.5px] text-action-ink">
                语块
              </span>
            )}
          </div>
          <p className="hidden truncate text-[10px] text-muted-foreground sm:block">
            来自《{entry.material.title}》
          </p>
        </div>

        {isProduction ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center px-5 py-6 text-center sm:min-h-[330px] sm:px-8 sm:py-8">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
              看中文，写出英文{isChunk ? '语块' : '词'}
            </p>
            <p className="mt-3 max-w-full break-words font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] sm:text-[34px]">
              {meaning}
            </p>

            {checked ? (
              <div className="mt-5 w-full max-w-md">
                <div className="flex items-center justify-center gap-2">
                  <p className="break-words font-display text-[24px] font-semibold text-primary-ink">
                    {current.answer}
                  </p>
                  <SpeechButton
                    text={current.answer}
                    label={`朗读 ${current.answer}`}
                  />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {correct === true
                    ? '写对了。再把它放进一个句子里。'
                    : correct === false
                      ? '还差一点。先读一遍正确形式，再给自己打分。'
                      : '先读一遍正确形式，再给自己打分。'}
                </p>
                {correct === false && answerInput.trim() && (
                  <p className="mt-1 text-[10.5px] text-action-ink/80">
                    你写的是：{answerInput.trim()}
                  </p>
                )}
                {example && (
                  <p className="mt-3 font-display text-[12px] italic leading-6 text-foreground/55">
                    “{example}”
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-5 w-full max-w-sm">
                <Input
                  value={answerInput}
                  onChange={(event) => setAnswerInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') checkAnswer()
                  }}
                  placeholder="输入英文词或语块…"
                  autoFocus
                  className="h-12 text-center font-display text-[17px]"
                  aria-label="写出英文答案"
                />
                <p className="mt-2 text-[10px] text-muted-foreground/70">
                  拼写和空格会被忽略；先回忆，再检查。
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-h-[170px] flex-col items-center justify-center px-5 py-5 text-center sm:min-h-[300px] sm:px-8 sm:py-8">
            <div className="flex min-w-0 max-w-full items-center gap-3">
              <p className="max-w-full break-words font-display text-[34px] font-semibold leading-none tracking-[-0.03em] sm:text-[42px]">
                {current.prompt}
              </p>
              <SpeechButton
                text={current.prompt}
                label={`朗读 ${current.prompt}`}
                className="mt-1"
              />
            </div>

            {flipped ? (
              <div className="mt-6 max-w-md">
                <p className="text-[15px] leading-6 text-primary-ink">
                  {meaning || '释义待补充 · 先借例句记住它'}
                </p>
                {example && (
                  <p className="mt-3 font-display text-[13px] italic leading-6 text-foreground/60">
                    “{example}”
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-6 text-[11px] leading-5 text-muted-foreground">
                先在心里说出释义，再翻面看看。
                <br className="sm:hidden" />
                不需要打分，只要诚实。
              </p>
            )}
          </div>
        )}

        <div className="border-t border-border/60 bg-muted/20 px-5 py-4 sm:px-6">
          {!showGrades ? (
            isProduction ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="action"
                  className="flex-1"
                  onClick={checkAnswer}
                  disabled={!answerInput.trim()}
                >
                  <Check strokeWidth={2} />
                  检查答案
                </Button>
                <Button variant="ghost" onClick={revealAnswer}>
                  直接看答案
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setFlipped(true)}
              >
                翻面看释义
              </Button>
            )
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                disabled={grading}
                onClick={() => void handleGrade('again')}
                className="h-auto flex-col gap-0.5 border-destructive/25 py-2.5 text-destructive hover:bg-destructive/[0.05] hover:text-destructive"
              >
                <span className="text-[12px]">忘记</span>
                <span className="text-[9px] font-normal opacity-80">
                  {previews?.again}
                </span>
              </Button>
              <Button
                variant="outline"
                disabled={grading}
                onClick={() => void handleGrade('hard')}
                className="h-auto flex-col gap-0.5 border-action/25 py-2.5 text-action-ink hover:bg-action-wash/50 hover:text-action-ink"
              >
                <span className="text-[12px]">模糊</span>
                <span className="text-[9px] font-normal opacity-80">
                  {previews?.hard}
                </span>
              </Button>
              <Button
                variant="action"
                disabled={grading}
                onClick={() => void handleGrade('good')}
                className="h-auto flex-col gap-0.5 py-2.5"
              >
                <span className="text-[12px]">记得</span>
                <span className="text-[9px] font-normal opacity-80">
                  {previews?.good}
                </span>
              </Button>
            </div>
          )}

          {feedback && (
            <p
              aria-live="polite"
              className="mt-2.5 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground"
            >
              <Sparkles className="size-3 text-action/60" strokeWidth={1.8} />
              {feedback}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-2 text-center text-[10.5px] text-destructive">
              {error}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
