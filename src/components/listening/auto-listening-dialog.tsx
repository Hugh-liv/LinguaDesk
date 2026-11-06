import { Headphones, Loader2 } from 'lucide-react'
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
import { AiRequestError, generateAutoListening } from '@/lib/ai/remote'
import type {
  AutoListeningInput,
  AutoListeningLength,
  AutoListeningLevel,
  AutoListeningResult,
} from '@/lib/ai/types'

const LEVELS: AutoListeningLevel[] = ['B1', 'B2', 'C1']
const LENGTHS: Array<{ value: AutoListeningLength; label: string }> = [
  { value: 'short', label: '短 · 约 1 分钟' },
  { value: 'medium', label: '中 · 约 2 分钟' },
]

function formatError(error: unknown): string {
  if (error instanceof AiRequestError) return error.message
  return 'AI 生成听力失败，请稍后再试。'
}

export function AutoListeningDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (input: AutoListeningInput, result: AutoListeningResult) => void
}) {
  const [topic, setTopic] = useState('')
  const [level, setLevel] = useState<AutoListeningLevel>('B1')
  const [length, setLength] = useState<AutoListeningLength>('short')
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
    const input: AutoListeningInput = {
      level,
      length,
      topic: topic.trim() || undefined,
    }
    setBusy(true)
    setError(null)
    try {
      const result = await generateAutoListening(input)
      onCreated(input, result)
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
      <DialogContent className="sm:max-w-md">
        <div className="px-5 pb-5 pt-6 sm:px-6">
          <p className="eyebrow">AI 生成听力 · No audio needed</p>
          <DialogHeader className="mt-1">
            <DialogTitle>先听一段刚刚写好的英文</DialogTitle>
            <DialogDescription>
              AI 会写一段口语风格的英文，立刻用系统英语朗读播放，并自动拆成逐句精听和 Dictogloss 的材料。
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="auto-listening-topic" className="text-[10.5px] font-medium">
                主题 / 场景 <span className="font-normal text-muted-foreground">（可选）</span>
              </label>
              <Input
                id="auto-listening-topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="例如：搬家第一天 / 和同事确认会议时间"
                maxLength={200}
                className="mt-1.5"
                disabled={busy}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <SelectField
                id="auto-listening-level"
                label="等级"
                value={level}
                options={LEVELS.map((value) => ({ value, label: value }))}
                onChange={(value) => setLevel(value as AutoListeningLevel)}
                disabled={busy}
              />
              <SelectField
                id="auto-listening-length"
                label="长度"
                value={length}
                options={LENGTHS}
                onChange={(value) => setLength(value as AutoListeningLength)}
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
              生成后没有真人音频，会使用系统英语朗读；仍可做逐句精听与整段听写。会使用一次 API 额度。
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
                <Headphones strokeWidth={1.9} />
              )}
              {busy ? '正在写一段听力…' : '生成听力'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
