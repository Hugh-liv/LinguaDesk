import { Loader2, PenLine, Save, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type WritingSaveState = 'idle' | 'saving' | 'saved' | 'error'

export function WritingEditor({
  draft,
  onDraftChange,
  wordCount,
  targetWords,
  saveState,
  dirty,
  reviewing,
  reviewError,
  onSave,
  onReview,
}: {
  draft: string
  onDraftChange: (value: string) => void
  wordCount: number
  targetWords: number
  saveState: WritingSaveState
  dirty: boolean
  reviewing: boolean
  reviewError: string | null
  onSave: () => void
  onReview: () => void
}) {
  const saveLabel =
    saveState === 'saving'
      ? '保存中…'
      : saveState === 'error'
        ? '保存失败'
        : dirty
          ? '有未保存的修改'
          : saveState === 'saved'
            ? '已保存'
            : '尚未保存'

  const reachedTarget = wordCount >= targetWords

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-desk">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3 sm:px-7">
        <div className="flex items-center gap-2 text-primary">
          <PenLine className="size-3.5" strokeWidth={1.9} />
          <p className="eyebrow text-primary/70">起草 · Draft</p>
        </div>
        <span
          aria-live="polite"
          className={cn(
            'text-[10px]',
            saveState === 'error'
              ? 'text-destructive'
              : dirty
                ? 'text-action-ink/80'
                : 'text-muted-foreground'
          )}
        >
          {saveLabel}
        </span>
      </div>

      <div className="px-5 py-5 sm:px-7 sm:py-6">
        <label htmlFor="writing-draft" className="sr-only">
          写作草稿
        </label>
        <textarea
          id="writing-draft"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          disabled={reviewing}
          placeholder="Start writing here. A rough first draft is welcome."
          className="min-h-[260px] w-full resize-y rounded-xl border border-input bg-card px-4 py-4 font-display text-[14.5px] leading-8 text-foreground shadow-[inset_0_1px_1px_rgb(31_41_51_/_0.02)] outline-none transition-[border-color,box-shadow] placeholder:font-sans placeholder:text-[13px] placeholder:text-muted-foreground/55 focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-70 sm:min-h-[300px]"
        />

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <p
            className={cn(
              'text-[10.5px] tabular-nums',
              reachedTarget ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            {wordCount} / {targetWords} 词{reachedTarget ? ' · 已到目标' : ''}
          </p>
          <p className="text-[10px] text-muted-foreground/70">
            草稿只保存在本机
          </p>
        </div>

        {reviewError && (
          <div
            role="alert"
            className="mt-3 rounded-lg border border-destructive/25 bg-destructive/[0.06] px-3 py-2.5 text-[11px] leading-5 text-destructive"
          >
            {reviewError}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-[10px] leading-5 text-muted-foreground">
            反馈会保留你的声音，只指出 2–4 个最值得改的地方，不替你重写。
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={onSave}
              disabled={reviewing || !draft.trim() || saveState === 'saving'}
            >
              <Save strokeWidth={1.8} />
              保存草稿
            </Button>
            <Button variant="action" onClick={onReview} disabled={reviewing}>
              {reviewing ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Sparkles strokeWidth={1.9} />
              )}
              {reviewing ? 'AI 正在读…' : '请 AI 反馈'}
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
