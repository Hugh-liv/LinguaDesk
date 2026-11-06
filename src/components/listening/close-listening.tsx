import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Headphones,
  Loader2,
  Pause,
  RotateCcw,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { WordDiffView } from '@/components/listening/word-diff-view'
import type { useListeningPlayer } from '@/components/listening/use-listening-player'
import type { WordDiff } from '@/lib/diff'
import { diffWords } from '@/lib/diff'
import {
  recordAttempt,
  saveListeningSession,
  type ListeningClipRow,
} from '@/lib/db'
import {
  hasTiming,
  listeningErrorTags,
  listeningScoreLabel,
} from '@/lib/listening'
import { cn } from '@/lib/utils'

interface SegmentResult {
  accuracy: number
  matched: number
  total: number
}

export function CloseListening({
  clip,
  player,
  onStartDictogloss,
}: {
  clip: ListeningClipRow
  player: ReturnType<typeof useListeningPlayer>
  onStartDictogloss: () => void
}) {
  const segments = clip.segments
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [checked, setChecked] = useState(false)
  const [result, setResult] = useState<WordDiff | null>(null)
  const [results, setResults] = useState<Record<number, SegmentResult>>({})
  const [finished, setFinished] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const segmentStartedAt = useRef<number | null>(null)
  const sessionSaved = useRef(false)

  const current = segments[index]
  const resultList = Object.values(results)
  const average =
    resultList.length > 0
      ? Math.round(
          (resultList.reduce((sum, item) => sum + item.accuracy, 0) /
            resultList.length) *
            100,
        )
      : 0
  const timed = hasTiming(segments)

  useEffect(() => {
    segmentStartedAt.current = Date.now()
  }, [index])

  function resetAnswer() {
    setAnswer('')
    setRevealed(false)
    setChecked(false)
    setResult(null)
    setError(null)
    segmentStartedAt.current = Date.now()
  }

  function goTo(nextIndex: number) {
    player.stop()
    setIndex(nextIndex)
    resetAnswer()
  }

  async function checkAnswer() {
    if (!current || checked || saving || !answer.trim()) return
    const diff = diffWords(current.text, answer)
    setResult(diff)
    setChecked(true)
    setResults((previous) => ({
      ...previous,
      [index]: {
        accuracy: diff.accuracy,
        matched: diff.matched,
        total: diff.total,
      },
    }))
    setSaving(true)
    setError(null)

    try {
      await recordAttempt({
        materialId: clip.id,
        kind: 'listening',
        score: diff.accuracy,
        durationMs:
          segmentStartedAt.current === null
            ? null
            : Date.now() - segmentStartedAt.current,
        errorTags: listeningErrorTags(
          diff.accuracy,
          diff.extra.length,
          diff.total,
          'close',
        ),
      })
    } catch {
      setError('这次结果没有完整保存，但对照仍可以继续。')
    } finally {
      setSaving(false)
    }
  }

  async function finish() {
    player.stop()
    setFinished(true)
    if (sessionSaved.current || resultList.length === 0) return
    sessionSaved.current = true
    const totalMatched = resultList.reduce((sum, item) => sum + item.matched, 0)
    const totalWords = resultList.reduce((sum, item) => sum + item.total, 0)
    try {
      await saveListeningSession({
        clipId: clip.id,
        clipTitle: clip.title,
        mode: 'close',
        accuracy:
          totalWords > 0
            ? totalMatched / totalWords
            : average / 100,
        matched: totalMatched,
        total: totalWords,
      })
    } catch {
      setError('本轮记录没有保存，但练习结果仍在屏幕上。')
    }
  }

  function next() {
    if (index + 1 >= segments.length) {
      void finish()
      return
    }
    goTo(index + 1)
  }

  function restart() {
    player.stop()
    setIndex(0)
    setResults({})
    setFinished(false)
    sessionSaved.current = false
    resetAnswer()
  }

  if (segments.length === 0) {
    return (
      <section className="rounded-2xl border border-border/80 bg-card px-6 py-10 text-center shadow-desk">
        <p className="text-[12px] text-muted-foreground">这段听力没有可练习的句子。</p>
        <Button variant="outline" className="mt-4" onClick={onStartDictogloss}>
          去整段听写
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
          逐句精听这一轮结束了
        </h2>
        <p className="mt-2 text-[12px] leading-6 text-muted-foreground">
          {segments.length} 句 · 平均写对 {average}% 的词
        </p>
        <p className="mx-auto mt-2 max-w-sm text-[10.5px] leading-5 text-muted-foreground/80">
          听不清的地方，明天再用 0.75 倍速听一遍。错误标签已经留在诊断页。
        </p>
        {error && (
          <p role="alert" className="mt-3 text-[10.5px] text-destructive">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          <Button variant="outline" onClick={restart}>
            <RotateCcw strokeWidth={1.8} />
            再练一轮
          </Button>
          <Button variant="action" onClick={onStartDictogloss}>
            做整段 Dictogloss
            <ArrowRight strokeWidth={1.8} />
          </Button>
        </div>
      </section>
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="h-1 min-w-24 flex-1 overflow-hidden rounded-full bg-border/80">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${((index + (checked ? 1 : 0)) / segments.length) * 100}%` }}
          />
        </div>
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
          {index + 1} / {segments.length}
        </span>
        <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-card p-0.5">
          {player.rates.map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => player.setRate(rate)}
              className={cn(
                'rounded-md px-1.5 py-1 text-[9.5px] tabular-nums transition-colors',
                player.rate === rate
                  ? 'bg-primary-wash text-primary-ink'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-desk">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-5 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <p className="eyebrow">逐句精听 · Close listening</p>
            <span className="rounded-full bg-secondary/70 px-2 py-0.5 text-[8.5px] text-muted-foreground">
              {clip.audioBlob ? (timed ? '音频 · 有时间轴' : '音频 · 整段播放') : '系统朗读'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goTo(Math.max(0, index - 1))}
              disabled={index === 0}
            >
              <ArrowLeft strokeWidth={1.8} />
              上一句
            </Button>
            <Button variant="ghost" size="sm" onClick={player.stop} disabled={!player.playing}>
              <Pause strokeWidth={1.8} />
              停止
            </Button>
          </div>
        </div>

        <div className="px-5 py-6 sm:px-7">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              onClick={() => player.playSegments([current])}
              disabled={!player.hasAudio && !player.speechReady}
            >
              <Headphones strokeWidth={1.9} />
              播放本句
            </Button>
            <Button
              variant="outline"
              onClick={() => player.playSegments([current])}
              disabled={!player.hasAudio && !player.speechReady}
            >
              再听一遍
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRevealed((value) => !value)}
            >
              {revealed ? <EyeOff strokeWidth={1.8} /> : <Eye strokeWidth={1.8} />}
              {revealed ? '收起文本' : '看文本跟读'}
            </Button>
          </div>
          {!player.hasAudio && !player.speechReady && (
            <p className="mt-2 text-center text-[10px] text-destructive">
              当前浏览器没有英语朗读，也没有音频文件；可以先看文本练习。
            </p>
          )}
          {player.hasAudio && !timed && (
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              这段音频没有逐句时间轴，播放会从整段开头开始。
            </p>
          )}

          <div className="mt-5 min-h-24 rounded-xl border border-dashed border-border/80 bg-muted/15 px-4 py-5 text-center">
            {revealed || checked ? (
              <p className="font-display text-[16px] leading-7 text-foreground/85">
                {current.text}
              </p>
            ) : (
              <div>
                <p className="text-[11.5px] text-muted-foreground">
                  先听，不要急着看原文。
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground/65">
                  可以把一句话拆成开头、中段、结尾，听三遍再写。
                </p>
              </div>
            )}
          </div>

          <label htmlFor="close-listening-answer" className="sr-only">
            逐句听写答案
          </label>
          <textarea
            id="close-listening-answer"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            readOnly={checked}
            rows={3}
            placeholder="写下你听到的这一句…"
            className={cn(
              'mt-4 w-full resize-y rounded-xl border border-input bg-card px-3.5 py-3 text-[13px] leading-6 text-foreground shadow-[inset_0_1px_1px_rgb(31_41_51_/_0.02)] outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/65 focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/20',
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
              检查这一句
            </Button>
          )}
        </div>

        {checked && result && (
          <div className="border-t border-border/60 bg-muted/20 px-5 py-5 sm:px-7">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-display text-[18px] tracking-[-0.015em]">
                {listeningScoreLabel(result.accuracy, result.extra.length)}
              </p>
              <p className="text-[10.5px] tabular-nums text-muted-foreground">
                写对 {result.matched} / {result.total} 个词
                {result.extra.length > 0 && ` · 多写 ${result.extra.length} 个`}
              </p>
            </div>
            <div className="mt-3">
              <WordDiffView result={result} />
            </div>
            {error && (
              <p role="alert" className="mt-2 text-[10.5px] text-destructive">
                {error}
              </p>
            )}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => player.playSegments([current])}
                disabled={!player.hasAudio && !player.speechReady}
              >
                <Headphones strokeWidth={1.8} />
                再听一遍
              </Button>
              <Button variant="action" onClick={next}>
                {index + 1 >= segments.length ? '完成本轮' : '下一句'}
                <ArrowRight strokeWidth={1.8} />
              </Button>
            </div>
          </div>
        )}
      </section>

      <p className="mt-3 text-center text-[10px] leading-5 text-muted-foreground/65">
        先听完整句，再写。对照时只看漏掉和写错的词，不用逐字重抄。
      </p>
    </div>
  )
}
