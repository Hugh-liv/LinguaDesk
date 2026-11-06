import { Loader2, Sparkles } from 'lucide-react'
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
import { createAutoMaterial, type CreatedMaterial } from '@/lib/auto-material'
import type {
  ArticleGenre,
  ArticleLength,
  ArticleLevel,
} from '@/lib/ai/types'
import { AiRequestError } from '@/lib/ai/remote'

const LEVELS = ['A2', 'B1', 'B2', 'C1'] as const
const LENGTHS: Array<{ value: ArticleLength; label: string }> = [
  { value: 'short', label: '短 · 约 200 词' },
  { value: 'medium', label: '中 · 约 300 词' },
  { value: 'long', label: '长 · 约 500 词' },
]
const GENRES: Array<{ value: ArticleGenre; label: string }> = [
  { value: 'article', label: '短文' },
  { value: 'story', label: '故事' },
  { value: 'dialogue', label: '对话' },
  { value: 'email', label: '邮件' },
]

function formatError(error: unknown): string {
  if (error instanceof AiRequestError) return error.message
  return 'AI 生成失败，请稍后再试。'
}

export function AutoMaterialDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (created: CreatedMaterial) => void
}) {
  const [topic, setTopic] = useState('')
  const [level, setLevel] = useState<ArticleLevel>('B1')
  const [length, setLength] = useState<ArticleLength>('medium')
  const [genre, setGenre] = useState<ArticleGenre>('article')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function close() {
    setBusy(false)
    setError(null)
    setTopic('')
    onOpenChange(false)
  }

  async function generate() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const created = await createAutoMaterial({
        level,
        length,
        genre,
        topic: topic.trim() || undefined,
      })
      onCreated(created)
      close()
    } catch (caught) {
      setError(formatError(caught))
    } finally {
      setBusy(false)
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
      <DialogContent className="sm:max-w-lg">
        <div className="px-5 pb-5 pt-6 sm:px-6">
          <p className="eyebrow">AI 生成 · No material needed</p>
          <DialogHeader className="mt-1">
            <DialogTitle>让书桌先有一页内容</DialogTitle>
            <DialogDescription>
              不用粘贴材料。AI 会写一篇原创英文，并同时拆成摘要、词汇、句型、理解、听写和复述。主题留空也可以直接生成。
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="auto-material-topic" className="text-[10.5px] font-medium">
                主题 / 场景 <span className="font-normal text-muted-foreground">（可选）</span>
              </label>
              <Input
                id="auto-material-topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="例如：和房东沟通维修 / 一次远程会议 / 旅行中的小决定"
                maxLength={200}
                className="mt-1.5"
                disabled={busy}
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <SelectField
                id="auto-material-level"
                label="等级"
                value={level}
                options={LEVELS.map((value) => ({ value, label: value }))}
                onChange={(value) => setLevel(value as ArticleLevel)}
                disabled={busy}
              />
              <SelectField
                id="auto-material-length"
                label="长度"
                value={length}
                options={LENGTHS}
                onChange={(value) => setLength(value as ArticleLength)}
                disabled={busy}
              />
              <SelectField
                id="auto-material-genre"
                label="体裁"
                value={genre}
                options={GENRES}
                onChange={(value) => setGenre(value as ArticleGenre)}
                disabled={busy}
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/25 bg-destructive/[0.06] px-3 py-2.5 text-[11px] leading-5 text-destructive"
              >
                {error}
              </p>
            )}

            <p className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-[10px] leading-5 text-muted-foreground">
              会使用一次 API 额度。生成后材料与学习包都保存在本机，之后可以照常阅读、复习和做听写。
            </p>
          </div>

          <DialogFooter className="mt-5">
            <Button variant="ghost" onClick={close} disabled={busy}>
              取消
            </Button>
            <Button variant="action" onClick={() => void generate()} disabled={busy}>
              {busy ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Sparkles strokeWidth={1.9} />
              )}
              {busy ? '正在写一页内容…' : '生成材料与学习包'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
