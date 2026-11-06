import {
  ArrowRight,
  Check,
  Headphones,
  Loader2,
  Pause,
  RotateCcw,
} from 'lucide-react'
import { useMemo, useState } from 'react'
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
  buildDictoglossChunks,
  hasTiming,
  listeningErrorTags,
  listeningScoreLabel,
} from '@/lib/listening'
import { cn } from '@/lib/utils'

interface ChunkResult {
  accuracy: number
  matched: number
  total: number
}

export function Dictogloss({
  clip,
  player,
  onStartClose,
}: {
  clip: ListeningClipRow
  player: ReturnType<typeof useListeningPlayer>
  onStartClose: () => void
}) {
  const chunks = useMemo(
    () => buildDictoglossChunks(clip.segments),
    [clip.segments],
  )
  const [chunkIndex, setChunkIndex] = useState(0)
  const [listens, setListens] = useState(0)
  const [input, setInput] = useState('')
  const [checked, setChecked] = useState(false)
  const [result, setResult] = useState<WordDiff | null>(null)
  const [results, setResults] = useState<ChunkResult[]>([])
  const [finished, setFinished] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const current = chunks[chunkIndex]
  const timed = hasTiming(clip.segments)
  const average =
    results.length > 0
      ? Math.round(
          (results.reduce((sum, item) => sum + item.accuracy, 0) /
            results.length) *
            100,
        )
      : 0

  function resetChunk(nextIndex: number) {
    player.stop()
    setChunkIndex(nextIndex)
    setListens(0)
    setInput('')
    setChecked(false)
    setResult(null)
    setError(null)
  }

  function listen() {
    if (!current) return
    player.playSegments(current.segments)
    setListens((count) => Math.min(9, count + 1))
  }

  async function check() {
    if (!current || !input.trim() || checked || saving) return
    const diff = diffWords(current.text, input)
    setResult(diff)
    setChecked(true)
    setResults((previous) => [
      ...previous,
      { accuracy: diff.accuracy, matched: diff.matched, total: diff.total },
    ])
    setSaving(true)
    setError(null)

    try {
      await recordAttempt({
        materialId: clip.id,
        kind: 'listening',
        score: diff.accuracy,
        errorTags: listeningErrorTags(
          diff.accuracy,
          diff.extra.length,
          diff.total,
          'dictogloss',
        ),
      })
      await saveListeningSession({
        clipId: clip.id,
        clipTitle: clip.title,
        mode: 'dictogloss',
        accuracy: diff.accuracy,
        matched: diff.matched,
        total: diff.total,
      })
    } catch {
      setError('这段结果没有完整保存，但对照仍可以继续。')
    } finally {
      setSaving(false)
    }
  }

  function next() {
    if (chunkIndex + 1 >= chunks.length) {
      player.stop()
      setFinished(true)
      return
    }
    resetChunk(chunkIndex + 1)
  }

  function restart() {
    player.stop()
    setChunkIndex(0)
    setListens(0)
    setInput('')
    setChecked(false)
    setResult(null)
    setResults([])
    setFinished(false)
    setError(null)
  }

  if (!current || chunks.length === 0) {
    return (
      <section className="rounded-2xl border border-border/80 bg-card px-6 py-10 text-center shadow-desk">
        <p className="text-[12px] text-muted-foreground">这段听力没有可练习的段落。</p>
        <Button variant="outline" className="mt-4" onClick={onStartClose}>
          去逐句精听
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
          整段听写完成了
        </h2>
        <p className="mt-2 text-[12px] leading-6 text-muted-foreground">
          {chunks.length} 段 · 平均写对 {average}% 的词
        </p>
        <p className="mx-auto mt-2 max-w-sm text-[10.5px] leading-5 text-muted-foreground/80">
          Dictogloss 练的是结构和词块；漏掉几个功能词很正常，先把整段意思留住。
        </p>
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          <Button variant="outline" onClick={restart}>
            <RotateCcw strokeWidth={1.8} />
            再练一轮
          </Button>
          <Button variant="outline" onClick={onStartClose}>
            回到逐句精听
          </Button>
        </div>
      </section>
    )
  }

  const hint = current.segments[0]?.text.split(/\s+/).slice(0, 3).join(' ') ?? ''

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="h-1 min-w-24 flex-1 overflow-hidden rounded-full bg-border/80">
          <div
            className="h-full rounded-full bg-action transition-[width] duration-300"
            style={{ width: `${((chunkIndex + (checked ? 1 : 0)) / chunks.length) * 100}%` }}
          />
        </div>
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
          {chunkIndex + 1} / {chunks.length} 段
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
                  ? 'bg-action-wash text-action-ink'
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
          <div className="flex flex-wrap items-center gap-2">
            <p className="eyebrow">整段听写 · Dictogloss</p>
            <span className="rounded-full bg-action-wash/70 px-2 py-0.5 text-[8.5px] text-action-ink">
              {current.wordCount} 词 / {current.segments.length} 句
            </span>
            <span className="rounded-full bg-secondary/70 px-2 py-0.5 text-[8.5px] text-muted-foreground">
              {clip.audioBlob ? (timed ? '音频' : '音频 · 整段') : '系统朗读'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={player.stop} disabled={!player.playing}>
              <Pause strokeWidth={1.8} />
              停止
            </Button>
            <Button variant="ghost" size="sm" onClick={onStartClose}>
              逐句精听
            </Button>
          </div>
        </div>

        <div className="px-5 py-6 sm:px-7">
          <div className="grid grid-cols-3 gap-1.5">
            {[
              ['01', '听两遍', listens > 0],
              ['02', '写下整段', input.trim().length > 0],
              ['03', '对照修改', checked],
            ].map(([number, label, done]) => (
              <div
                key={number as string}
                className={cn(
                  'rounded-lg border px-2.5 py-2 text-center',
                  done
                    ? 'border-primary/20 bg-primary-wash/35 text-primary-ink'
                    : 'border-border/60 bg-muted/15 text-muted-foreground',
                )}
              >
                <p className="text-[9px] tabular-nums opacity-70">{number as string}</p>
                <p className="mt-0.5 text-[10.5px] font-medium">{label as string}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button onClick={listen} disabled={!player.hasAudio && !player.speechReady}>
              <Headphones strokeWidth={1.9} />
              {listens === 0 ? '听第一遍' : '再听一遍'}
            </Button>
            <span className="text-[10px] text-muted-foreground">
              {listens === 0 ? '先别写，听结构' : `已听 ${listens} 遍`}
            </span>
          </div>
          {player.hasAudio && !timed && (
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              没有逐句时间轴；播放会从整段开头开始。
            </p>
          )}

          <div className="mt-5 rounded-xl border border-dashed border-border/80 bg-muted/15 px-4 py-5">
            {checked ? (
              <p className="font-display text-[15px] leading-7 text-foreground/85">
                {current.text}
              </p>
            ) : (
              <div className="text-center">
                <p className="text-[11.5px] leading-5 text-muted-foreground">
                  这一段有 {current.segments.length} 句、约 {current.wordCount} 词。
                </p>
                <p className="mt-1.5 text-[10px] leading-5 text-muted-foreground/65">
                  第一遍只记开头和结构，第二遍补连接词与词尾。
                </p>
                <details className="mt-3">
                  <summary className="cursor-pointer text-[10px] text-primary/80">
                    卡住了？看前三个词
                  </summary>
                  <p className="mt-1 font-display text-[12px] text-foreground/70">
                    {hint}…
                  </p>
                </details>
              </div>
            )}
          </div>

          <label htmlFor="dictogloss-answer" className="sr-only">
            整段听写答案
          </label>
          <textarea
            id="dictogloss-answer"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            readOnly={checked}
            rows={6}
            placeholder="听完后，用自己的手把整段写回来。拼写不确定也先写，不要停…"
            className={cn(
              'mt-4 w-full resize-y rounded-xl border border-input bg-card px-3.5 py-3 text-[13px] leading-6 text-foreground shadow-[inset_0_1px_1px_rgb(31_41_51_/_0.02)] outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/65 focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/20',
              checked && 'bg-muted/35 text-foreground/70',
            )}
          />

          {!checked && (
            <Button
              variant="action"
              className="mt-3 w-full"
              onClick={() => void check()}
              disabled={!input.trim() || saving}
            >
              {saving ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Check strokeWidth={2} />
              )}
              对照整段
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
              <Button variant="outline" onClick={listen} disabled={!player.hasAudio && !player.speechReady}>
                <Headphones strokeWidth={1.8} />
                再听一遍
              </Button>
              <Button variant="action" onClick={next}>
                {chunkIndex + 1 >= chunks.length ? '完成整段' : '下一段'}
                <ArrowRight strokeWidth={1.8} />
              </Button>
            </div>
          </div>
        )}
      </section>

      <p className="mt-3 text-center text-[10px] leading-5 text-muted-foreground/65">
        Dictogloss 不要求逐字复刻；先保留主干，再用对照补上漏掉的词。
      </p>
    </div>
  )
}
