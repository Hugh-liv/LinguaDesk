import { useLiveQuery } from 'dexie-react-hooks'
import {
  Check,
  ChevronRight,
  Loader2,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SelectField } from '@/components/ui/select-field'
import { SpeechButton } from '@/components/ui/speech-button'
import {
  AiRequestError,
  generateSpeakingFeedback,
  generateSpeakingReply,
} from '@/lib/ai/remote'
import { collectSpeakingFeedback } from '@/lib/corpus'
import type {
  SpeakingFeedback,
  SpeakingLevel,
  SpeakingProgress,
  SpeakingTurn,
} from '@/lib/ai/types'
import { db, type SpeakingSessionRow } from '@/lib/db'
import { formatRelativeTime } from '@/lib/format'
import { newId } from '@/lib/ids'
import { canSpeak, speakEnglish } from '@/lib/speech'
import {
  SPEAKING_LEVELS,
  SPEAKING_SCENARIOS,
  type SpeakingScenario,
} from '@/lib/speaking'
import { useSpeechRecognition } from '@/lib/use-speech-recognition'
import { cn } from '@/lib/utils'

function formatAiError(error: unknown): string {
  if (error instanceof AiRequestError) {
    if (error.code === 'AI_NOT_CONFIGURED') {
      return error.message
    }
    return error.message
  }
  return 'AI 请求失败，请稍后再试。'
}

function progressLabel(progress: SpeakingProgress): string {
  if (progress === 'done') return '目标已达成'
  if (progress === 'mostly') return '接近目标'
  return '目标进行中'
}

function scenarioBase(scenario: SpeakingScenario, level: SpeakingLevel) {
  return {
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    scenarioZh: scenario.scenarioZh,
    role: scenario.role,
    userGoalZh: scenario.userGoalZh,
    level,
  }
}

export function SpeakingPage() {
  const [selected, setSelected] = useState<SpeakingScenario | null>(null)
  const [active, setActive] = useState<SpeakingScenario | null>(null)
  const [level, setLevel] = useState<SpeakingLevel>('B1')
  const [turns, setTurns] = useState<SpeakingTurn[]>([])
  const [input, setInput] = useState('')
  const [cue, setCue] = useState<string | null>(null)
  const [busy, setBusy] = useState<'start' | 'reply' | 'feedback' | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<SpeakingFeedback | null>(null)
  const [progress, setProgress] = useState<SpeakingProgress>('not_yet')
  const [voiceOn, setVoiceOn] = useState(() => canSpeak())
  const [viewing, setViewing] = useState<SpeakingSessionRow | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const voiceBaseRef = useRef('')
  const sessionStartedAt = useRef<number | null>(null)

  const speech = useSpeechRecognition((text) => {
    setInput(`${voiceBaseRef.current} ${text}`.trim())
  })

  const sessions = useLiveQuery(
    () =>
      db.speakingSessions
        .orderBy('updatedAt')
        .reverse()
        .limit(10)
        .toArray(),
    [],
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns.length, busy])

  async function begin(
    scenario: SpeakingScenario,
    nextLevel: SpeakingLevel = level,
  ) {
    if (busy) return
    setBusy('start')
    setError(null)
    setFeedback(null)
    setTurns([])
    setInput('')
    setCue(null)
    setProgress('not_yet')
    sessionStartedAt.current = Date.now()
    speech.stop()

    try {
      const reply = await generateSpeakingReply({
        ...scenarioBase(scenario, nextLevel),
        history: [],
        opening: true,
      })
      setSelected(scenario)
      setActive(scenario)
      setLevel(nextLevel)
      setTurns([{ role: 'assistant', text: reply.reply }])
      setProgress(reply.objectiveProgress)
      setCue(reply.cueZh || null)
      if (voiceOn) speakEnglish(reply.reply)
    } catch (caught) {
      setError(formatAiError(caught))
    } finally {
      setBusy(null)
    }
  }

  async function send() {
    if (!active || !input.trim() || busy || feedback) return
    const text = input.trim()
    const nextTurns: SpeakingTurn[] = [...turns, { role: 'user', text }]
    speech.stop()
    setTurns(nextTurns)
    setInput('')
    setCue(null)
    setError(null)
    setBusy('reply')

    try {
      const reply = await generateSpeakingReply({
        ...scenarioBase(active, level),
        history: nextTurns,
      })
      setTurns([...nextTurns, { role: 'assistant', text: reply.reply }])
      setProgress(reply.objectiveProgress)
      setCue(reply.cueZh || null)
      if (voiceOn) speakEnglish(reply.reply)
    } catch (caught) {
      setError(formatAiError(caught))
    } finally {
      setBusy(null)
    }
  }

  async function endSession() {
    if (!active || busy || feedback) return
    if (!turns.some((turn) => turn.role === 'user')) {
      setError('先开口说一句，再结束并反馈。')
      return
    }

    speech.stop()
    setBusy('feedback')
    setError(null)

    try {
      const result = await generateSpeakingFeedback({
        ...scenarioBase(active, level),
        history: turns,
      })
      const now = Date.now()
      const sessionId = newId()
      const createdAt = sessionStartedAt.current ?? now
      await db.speakingSessions.put({
        id: sessionId,
        scenarioId: active.id,
        scenarioTitle: active.title,
        level,
        turns,
        feedback: result,
        createdAt,
        updatedAt: now,
      })
      try {
        await collectSpeakingFeedback(
          {
            id: sessionId,
            title: active.title,
            createdAt,
          },
          result.improvements,
        )
      } catch {
        setError('对话已保存，但个人语料库没有完整收集。')
      }
      setFeedback(result)
    } catch (caught) {
      setError(formatAiError(caught))
    } finally {
      setBusy(null)
    }
  }

  function resetToSetup() {
    if (turns.length > 0 && !feedback) {
      const confirmed = window.confirm(
        '这轮对话还没有反馈，换场景会丢失。继续吗？',
      )
      if (!confirmed) return
    }
    speech.stop()
    setActive(null)
    setSelected(null)
    setTurns([])
    setInput('')
    setCue(null)
    setFeedback(null)
    setError(null)
    setProgress('not_yet')
  }

  function takeTwo() {
    if (!active) return
    void begin(active, level)
  }

  function toggleVoice() {
    if (speech.listening) {
      speech.stop()
      return
    }
    voiceBaseRef.current = input
    speech.start()
  }

  return (
    <>
      <PageHeader
        eyebrow="口语 · Speaking"
        title="先开口，再改"
        description="选一个真实场景，和 AI 角色对话；结束后只给 2–3 个可执行改动，再来一次 Take 2。"
      />

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-destructive/25 bg-destructive/[0.06] px-3.5 py-2.5 text-[11.5px] leading-5 text-destructive"
        >
          {error}
        </div>
      )}

      {active === null ? (
        <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-desk sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">选择场景 · Roleplay</p>
              <h2 className="mt-1 font-display text-[21px] tracking-[-0.02em]">
                先选一个你最近真的会用到的场景
              </h2>
              <p className="mt-1 text-[11.5px] leading-5 text-muted-foreground">
                AI 会扮演对方，不会在对话中不停纠正你。
              </p>
            </div>
            <div className="w-32">
              <SelectField
                id="speaking-level"
                label="等级"
                value={level}
                options={SPEAKING_LEVELS.map((value) => ({
                  value,
                  label: value,
                }))}
                onChange={(value) => setLevel(value as SpeakingLevel)}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {SPEAKING_SCENARIOS.map((scenario) => {
              const isSelected = selected?.id === scenario.id
              return (
                <button
                  key={scenario.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelected(scenario)}
                  className={cn(
                    'rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                    isSelected
                      ? 'border-primary/25 bg-primary-wash/45'
                      : 'border-border/65 bg-card hover:border-primary/20 hover:bg-muted/25',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-display text-[15px]">
                      {scenario.title}
                    </span>
                    {isSelected && (
                      <Check className="size-3.5 text-primary" strokeWidth={2} />
                    )}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                    {scenario.titleZh}
                  </span>
                  <span className="mt-1.5 block text-[10.5px] leading-5 text-muted-foreground/80">
                    {scenario.userGoalZh}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] leading-5 text-muted-foreground">
              语音输入取决于浏览器；文字输入总是可用。
            </p>
            <Button
              variant="action"
              disabled={!selected || busy !== null}
              onClick={() => {
                if (selected) void begin(selected, level)
              }}
              className="w-full sm:w-auto"
            >
              {busy === 'start' ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Mic strokeWidth={1.9} />
              )}
              {busy === 'start' ? '正在进入场景…' : '开始对话'}
            </Button>
          </div>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-desk sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="eyebrow">角色扮演 · Roleplay</p>
                  <span className="rounded-full bg-primary-wash px-2 py-0.5 text-[9px] text-primary-ink">
                    {level}
                  </span>
                  <span className="rounded-full bg-secondary/70 px-2 py-0.5 text-[9px] text-muted-foreground">
                    {progressLabel(progress)}
                  </span>
                </div>
                <h2 className="mt-1.5 font-display text-[19px]">
                  {active.title}
                </h2>
                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                  {active.userGoalZh}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVoiceOn((value) => !value)}
                  aria-label={voiceOn ? '关闭 AI 朗读' : '打开 AI 朗读'}
                  disabled={!canSpeak()}
                >
                  {voiceOn ? (
                    <Volume2 strokeWidth={1.8} />
                  ) : (
                    <VolumeX strokeWidth={1.8} />
                  )}
                </Button>
                <Button variant="ghost" size="sm" onClick={resetToSetup}>
                  换场景
                </Button>
                <Button
                  variant="action"
                  size="sm"
                  onClick={() => void endSession()}
                  disabled={
                    busy !== null ||
                    feedback !== null ||
                    !turns.some((turn) => turn.role === 'user')
                  }
                >
                  {busy === 'feedback' ? (
                    <Loader2 className="animate-spin" />
                  ) : null}
                  {busy === 'feedback' ? '正在整理反馈…' : '结束并反馈'}
                </Button>
              </div>
            </div>
          </section>

          <section className="mt-4 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-desk">
            <div className="max-h-[48dvh] min-h-[260px] space-y-3 overflow-y-auto px-4 py-5 sm:px-6">
              {turns.map((turn, index) => (
                <div
                  key={`${turn.role}-${index}`}
                  className={cn(
                    'flex',
                    turn.role === 'user' ? 'justify-end' : 'justify-start',
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[86%] rounded-2xl px-4 py-3 sm:max-w-[76%]',
                      turn.role === 'user'
                        ? 'rounded-br-md bg-primary text-primary-foreground'
                        : 'rounded-bl-md border border-border/70 bg-muted/25 text-foreground',
                    )}
                  >
                    {turn.role === 'assistant' && (
                      <div className="mb-1 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.12em] text-muted-foreground/65">
                        <span>AI · {active.title}</span>
                        <SpeechButton
                          text={turn.text}
                          label="朗读这句话"
                          className="ml-auto size-6 border-0 bg-transparent"
                        />
                      </div>
                    )}
                    <p className="whitespace-pre-wrap text-[13px] leading-6">
                      {turn.text}
                    </p>
                  </div>
                </div>
              ))}

              {turns.length === 0 && busy === null && (
                <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 text-center">
                  <p className="text-[11.5px] text-muted-foreground">这一轮还没有开始。</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void begin(active, level)}
                  >
                    重新开始
                  </Button>
                </div>
              )}

              {busy === 'reply' || busy === 'start' ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md border border-border/70 bg-muted/25 px-4 py-3">
                    <Loader2 className="size-4 animate-spin text-primary" />
                  </div>
                </div>
              ) : null}
              <div ref={bottomRef} />
            </div>

            {feedback === null ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  void send()
                }}
                className="border-t border-border/70 bg-muted/15 px-4 py-3.5 sm:px-6"
              >
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void send()
                    }
                  }}
                  rows={2}
                  placeholder="用英文说出你的下一句…"
                  className="w-full resize-none rounded-xl border border-input bg-card px-3.5 py-2.5 text-[13px] leading-6 outline-none placeholder:text-muted-foreground/60 focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/20"
                  disabled={busy !== null}
                />
                {speech.error && (
                  <p className="mt-1.5 text-[10px] text-action-ink">
                    {speech.error}
                  </p>
                )}
                {cue && (
                  <p className="mt-1.5 text-[10px] leading-5 text-muted-foreground">
                    提示：{cue}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  {speech.supported && (
                    <Button
                      type="button"
                      variant={speech.listening ? 'default' : 'outline'}
                      size="sm"
                      onClick={toggleVoice}
                      disabled={busy !== null}
                    >
                      {speech.listening ? (
                        <MicOff strokeWidth={1.8} />
                      ) : (
                        <Mic strokeWidth={1.8} />
                      )}
                      {speech.listening ? '正在听…' : '语音输入'}
                    </Button>
                  )}
                  <p className="hidden text-[9.5px] text-muted-foreground/65 sm:block">
                    Enter 发送 · Shift + Enter 换行
                  </p>
                  <Button
                    type="submit"
                    variant="action"
                    size="sm"
                    className="ml-auto"
                    disabled={!input.trim() || busy !== null}
                  >
                    {busy === 'reply' ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Send strokeWidth={1.8} />
                    )}
                    发送
                  </Button>
                </div>
              </form>
            ) : (
              <div className="border-t border-border/70 bg-muted/15 px-4 py-3 text-[10.5px] text-muted-foreground sm:px-6">
                这轮对话已保存。看完反馈后，可以带着 1–2 个改动再来一次。
              </div>
            )}
          </section>

          {feedback && (
            <section className="mt-4 rounded-2xl border border-border/80 bg-card p-5 shadow-desk sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">反馈 · Coach notes</p>
                  <h2 className="mt-1 font-display text-[20px]">
                    {feedback.canDoZh || '看看下一轮可以怎样更自然'}
                  </h2>
                </div>
              </div>
              <p className="mt-3 font-display text-[14px] leading-7 text-foreground/85">
                {feedback.summaryZh}
              </p>

              {feedback.strengthsZh.length > 0 && (
                <div className="mt-4">
                  <p className="eyebrow">已经做得好的</p>
                  <ul className="mt-2 space-y-1.5">
                    {feedback.strengthsZh.map((strength) => (
                      <li
                        key={strength}
                        className="flex items-start gap-2 text-[11.5px] leading-5 text-muted-foreground"
                      >
                        <Check
                          className="mt-0.5 size-3.5 shrink-0 text-primary"
                          strokeWidth={2}
                        />
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {feedback.improvements.length > 0 && (
                <div className="mt-4">
                  <p className="eyebrow">下一轮可以改</p>
                  <ol className="mt-2.5 space-y-2.5">
                    {feedback.improvements.map((item, index) => (
                      <li
                        key={`${item.original}-${index}`}
                        className="rounded-xl border border-border/65 bg-muted/15 p-3.5"
                      >
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          <p className="rounded-lg bg-card px-2.5 py-2 text-[11px] leading-5 text-muted-foreground line-through decoration-destructive/30">
                            {item.original}
                          </p>
                          <p className="rounded-lg border border-primary/15 bg-primary-wash/40 px-2.5 py-2 text-[11px] leading-5 text-primary-ink">
                            {item.better}
                          </p>
                        </div>
                        <p className="mt-2 text-[10.5px] leading-5 text-muted-foreground">
                          {item.whyZh}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {feedback.usefulPhrases.length > 0 && (
                <div className="mt-4">
                  <p className="eyebrow">可以带走的语块</p>
                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {feedback.usefulPhrases.map((item) => (
                      <div
                        key={item.phrase}
                        className="rounded-lg border border-border/60 bg-card px-3 py-2"
                      >
                        <p className="text-[11.5px]">{item.phrase}</p>
                        <p className="mt-0.5 text-[9.5px] text-muted-foreground">
                          {item.meaningZh}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {feedback.nextTakeZh && (
                <div className="mt-4 rounded-xl border border-action/20 bg-action-wash/40 px-4 py-3">
                  <p className="text-[9px] uppercase tracking-[0.14em] text-action-ink/70">
                    下一次 · Take 2
                  </p>
                  <p className="mt-1 text-[11.5px] leading-5 text-action-ink">
                    {feedback.nextTakeZh}
                  </p>
                </div>
              )}

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  to="/corpus"
                  className="inline-flex items-center gap-1 text-[10.5px] font-medium text-primary transition-colors hover:text-primary-ink"
                >
                  这轮错误已收集 · 去微训练
                </Link>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="outline" onClick={resetToSetup}>
                    换一个场景
                  </Button>
                  <Button variant="action" onClick={takeTwo} disabled={busy !== null}>
                    <Sparkles strokeWidth={1.9} />
                    Take 2 · 再来一次
                  </Button>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">最近口语 · Archive</p>
            <h2 className="mt-1 font-display text-[19px]">
              说过的场景
            </h2>
          </div>
          {sessions && sessions.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {sessions.length} 次
            </span>
          )}
        </div>

        {sessions === undefined ? (
          <div className="rounded-xl border border-border/70 bg-card/50 px-4 py-6 text-center text-[11px] text-muted-foreground">
            正在整理记录…
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/45 px-5 py-6 text-center text-[11.5px] leading-5 text-muted-foreground">
            完成一次对话并生成反馈后，记录会留在这里。
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => setViewing(session)}
                className="flex w-full items-center gap-3 rounded-xl border border-border/65 bg-card/65 px-3.5 py-3 text-left transition-colors hover:border-primary/20 hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[14px]">
                    {session.scenarioTitle}
                  </p>
                  <p className="mt-0.5 text-[9.5px] text-muted-foreground">
                    {session.level} · {session.turns.length} 轮 ·{' '}
                    {formatRelativeTime(session.updatedAt)}
                  </p>
                </div>
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </section>

      <Dialog
        open={viewing !== null}
        onOpenChange={(open) => {
          if (!open) setViewing(null)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          {viewing && (
            <div className="max-h-[80dvh] overflow-y-auto px-5 pb-5 pt-6 sm:px-6">
              <p className="eyebrow">口语记录 · Session</p>
              <DialogHeader className="mt-1">
                <DialogTitle>{viewing.scenarioTitle}</DialogTitle>
                <DialogDescription>
                  {viewing.level} · {formatRelativeTime(viewing.updatedAt)}
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-2">
                {viewing.turns.map((turn, index) => (
                  <p
                    key={`${turn.role}-${index}`}
                    className={cn(
                      'rounded-lg px-3 py-2 text-[11.5px] leading-5',
                      turn.role === 'user'
                        ? 'bg-primary-wash/50 text-primary-ink'
                        : 'bg-muted/25 text-muted-foreground',
                    )}
                  >
                    <span className="mr-1.5 text-[9px] uppercase tracking-[0.1em] opacity-60">
                      {turn.role === 'user' ? 'You' : 'AI'}
                    </span>
                    {turn.text}
                  </p>
                ))}
              </div>
              {viewing.feedback && (
                <div className="mt-4 border-t border-border/60 pt-3">
                  <p className="eyebrow">当时反馈</p>
                  <p className="mt-1.5 text-[11.5px] leading-5 text-muted-foreground">
                    {viewing.feedback.summaryZh}
                  </p>
                  {viewing.feedback.nextTakeZh && (
                    <p className="mt-2 text-[10.5px] leading-5 text-action-ink">
                      下一次：{viewing.feedback.nextTakeZh}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
