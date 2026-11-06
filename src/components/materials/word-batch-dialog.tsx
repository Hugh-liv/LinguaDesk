import {
  ArrowLeft,
  Check,
  Loader2,
  Wand2,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { SelectField } from '@/components/ui/select-field'
import { Textarea } from '@/components/ui/textarea'
import { WordGroupsView } from '@/components/materials/word-groups-view'
import { saveWordBatchMaterial, type CreatedMaterial } from '@/lib/auto-material'
import { AiRequestError, generateWordBatch } from '@/lib/ai/remote'
import type {
  ArticleLevel,
  WordBatchInput,
  WordBatchResult,
} from '@/lib/ai/types'
import {
  MAX_BATCH_WORDS,
  MIN_BATCH_WORDS,
  parseBatchWordList,
} from '@/lib/word-list'
import { cn } from '@/lib/utils'

const LEVELS = ['A2', 'B1', 'B2', 'C1'] as const

function formatError(error: unknown): string {
  if (error instanceof AiRequestError) return error.message
  return 'AI 整理失败，请稍后再试。'
}

export function WordBatchDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (created: CreatedMaterial) => void
}) {
  const [wordInput, setWordInput] = useState('')
  const [level, setLevel] = useState<ArticleLevel>('B1')
  const [topic, setTopic] = useState('')
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<WordBatchResult | null>(null)
  const [submitted, setSubmitted] = useState<WordBatchInput | null>(null)

  const parsed = parseBatchWordList(wordInput)
  const overLimit = parsed.words.length > MAX_BATCH_WORDS

  function close() {
    setWordInput('')
    setLevel('B1')
    setTopic('')
    setBusy(false)
    setSaving(false)
    setError(null)
    setResult(null)
    setSubmitted(null)
    onOpenChange(false)
  }

  async function organize() {
    if (busy || saving) return
    setError(null)
    if (parsed.words.length < MIN_BATCH_WORDS) {
      setError(`至少需要 ${MIN_BATCH_WORDS} 个不同的英文词或短语。`)
      return
    }
    if (overLimit) {
      setError(`一次最多整理 ${MAX_BATCH_WORDS} 个词；请先分批。`)
      return
    }

    const input: WordBatchInput = {
      words: parsed.words,
      level,
      topic: topic.trim() || undefined,
    }

    setBusy(true)
    try {
      const next = await generateWordBatch(input)
      setResult(next)
      setSubmitted(input)
    } catch (caught) {
      setError(formatError(caught))
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    if (!result || !submitted || saving) return
    setSaving(true)
    setError(null)
    try {
      const created = await saveWordBatchMaterial(submitted, result)
      onSaved(created)
      close()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存失败，请再试一次。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
        else onOpenChange(true)
      }}
    >
      <DialogContent className="sm:max-w-3xl">
        <div className="max-h-[88dvh] overflow-y-auto px-5 pb-5 pt-6 sm:px-6">
          <p className="eyebrow">AI 词汇整理 · Word batch</p>
          <DialogHeader className="mt-1">
            <DialogTitle>
              {result ? '词表已经被整理成一课' : '把零碎词表变成可以直接学的一课'}
            </DialogTitle>
            <DialogDescription>
              {result
                ? '检查分组和短文；存入后，词汇卡、阅读、听写与复述都会使用这一课的内容。'
                : '粘贴一大串单词，可以带中文、词性、音标或编号。AI 会去重、按主题分组、补释义与搭配，再写成短文和完整学习包。'}
            </DialogDescription>
          </DialogHeader>

          {!result ? (
            <>
              <div className="mt-4">
                <div className="flex items-baseline justify-between gap-2">
                  <label htmlFor="word-batch-input" className="text-[11.5px] font-medium">
                    零碎词表
                  </label>
                  <span
                    className={cn(
                      'text-[10px] tabular-nums',
                      overLimit ? 'text-destructive' : 'text-muted-foreground',
                    )}
                  >
                    {parsed.words.length} / {MAX_BATCH_WORDS}
                  </span>
                </div>
                <Textarea
                  id="word-batch-input"
                  value={wordInput}
                  onChange={(event) => {
                    setWordInput(event.target.value)
                    setError(null)
                  }}
                  disabled={busy || saving}
                  placeholder={`abandon 放弃\n1. commute v. 通勤\nwell-being\nlandlord 房东\nfollow up 跟进`}
                  className="mt-1.5 min-h-44 font-mono text-[12.5px]"
                />
                <p className="mt-1.5 text-[10px] leading-5 text-muted-foreground">
                  一行一个最好；也可以逗号分隔。中文提示、编号、词性和音标会被自动去掉。一次 {MIN_BATCH_WORDS}–{MAX_BATCH_WORDS} 个。
                </p>
                {(parsed.invalid.length > 0 || parsed.duplicates.length > 0) && (
                  <div className="mt-2 space-y-1 text-[10px] leading-5">
                    {parsed.invalid.length > 0 && (
                      <p className="text-action-ink">
                        无法识别的项会忽略：{parsed.invalid.slice(0, 4).join('、')}
                        {parsed.invalid.length > 4 ? '…' : ''}
                      </p>
                    )}
                    {parsed.duplicates.length > 0 && (
                      <p className="text-muted-foreground">
                        已自动去掉重复：{parsed.duplicates.slice(0, 5).join('、')}
                        {parsed.duplicates.length > 5 ? '…' : ''}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-[120px_1fr]">
                <SelectField
                  id="word-batch-level"
                  label="等级"
                  value={level}
                  options={LEVELS.map((value) => ({ value, label: value }))}
                  onChange={(value) => setLevel(value as ArticleLevel)}
                  disabled={busy || saving}
                />
                <div>
                  <label htmlFor="word-batch-topic" className="text-[10.5px] font-medium">
                    想用在什么场景 <span className="font-normal text-muted-foreground">（可选）</span>
                  </label>
                  <Input
                    id="word-batch-topic"
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    placeholder="例如：工作沟通 / 旅行 / 健康"
                    maxLength={200}
                    className="mt-1.5"
                    disabled={busy || saving}
                  />
                </div>
              </div>

              {error && (
                <p
                  role="alert"
                  className="mt-3 rounded-lg border border-destructive/25 bg-destructive/[0.06] px-3 py-2.5 text-[11px] leading-5 text-destructive"
                >
                  {error}
                </p>
              )}

              <div className="mt-4 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-[10px] leading-5 text-muted-foreground">
                AI 会返回主题分组、每个词的释义/搭配/例句、一篇短文和完整学习包；会使用一次 API 额度。
              </div>

              <DialogFooter className="mt-5">
                <Button variant="ghost" onClick={close} disabled={busy || saving}>
                  取消
                </Button>
                <Button
                  variant="action"
                  onClick={() => void organize()}
                  disabled={busy || saving || parsed.words.length < MIN_BATCH_WORDS || overLimit}
                >
                  {busy ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Wand2 strokeWidth={1.9} />
                  )}
                  {busy ? 'AI 正在梳理词表…' : 'AI 整理词表'}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary-wash px-2 py-0.5 text-[9px] text-primary-ink">
                  {submitted?.words.length ?? 0} 个输入词
                </span>
                <span className="rounded-full bg-action-wash/70 px-2 py-0.5 text-[9px] text-action-ink">
                  {result.plan.groups.reduce((sum, group) => sum + group.words.length, 0)} 个已整理
                </span>
                <span className="rounded-full bg-secondary/70 px-2 py-0.5 text-[9px] text-muted-foreground">
                  {result.plan.usedWords.length} 个进入短文
                </span>
              </div>

              <div className="mt-4">
                <WordGroupsView plan={result.plan} />
              </div>

              {error && (
                <p
                  role="alert"
                  className="mt-3 rounded-lg border border-destructive/25 bg-destructive/[0.06] px-3 py-2.5 text-[11px] leading-5 text-destructive"
                >
                  {error}
                </p>
              )}

              <DialogFooter className="mt-5">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setResult(null)
                    setSubmitted(null)
                    setError(null)
                  }}
                  disabled={saving}
                >
                  <ArrowLeft strokeWidth={1.8} />
                  改词表
                </Button>
                <Button variant="action" onClick={() => void save()} disabled={saving}>
                  {saving ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Check strokeWidth={2} />
                  )}
                  {saving ? '正在存入书桌…' : '存入书桌并查看整理'}
                </Button>
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
