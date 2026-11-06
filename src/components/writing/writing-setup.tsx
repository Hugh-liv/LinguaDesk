import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SelectField } from '@/components/ui/select-field'
import {
  WRITING_CATEGORIES,
  WRITING_LEVELS,
  WRITING_TARGETS,
  WRITING_TASKS,
} from '@/lib/writing'
import type {
  WritingCategory,
  WritingLevel,
  WritingTaskType,
} from '@/lib/ai/types'
import { cn } from '@/lib/utils'

export function WritingSetup({
  category,
  onCategoryChange,
  taskType,
  onTaskTypeChange,
  level,
  onLevelChange,
  targetWords,
  onTargetWordsChange,
  generating,
  onGenerate,
  hasPrompt,
  error,
  disabled,
}: {
  category: WritingCategory
  onCategoryChange: (value: WritingCategory) => void
  taskType: WritingTaskType
  onTaskTypeChange: (value: WritingTaskType) => void
  level: WritingLevel
  onLevelChange: (value: WritingLevel) => void
  targetWords: number
  onTargetWordsChange: (value: number) => void
  generating: boolean
  onGenerate: () => void
  hasPrompt: boolean
  error: string | null
  disabled?: boolean
}) {
  const locked = generating || disabled

  return (
    <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-desk sm:p-6">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">出题 · Prompt lab</p>
          <h2 className="mt-1 font-display text-[21px] tracking-[-0.02em]">
            先选一个真实的写作场景
          </h2>
          <p className="mt-1 text-[11.5px] leading-5 text-muted-foreground">
            AI 给出题目、论点和可用语块；作文仍由你写。
          </p>
        </div>
        <span className="w-fit rounded border border-border/80 px-1.5 py-0.5 text-[8.5px] uppercase tracking-[0.13em] text-muted-foreground">
          AI · Write
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {WRITING_CATEGORIES.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={category === item.value}
            disabled={locked}
            onClick={() => onCategoryChange(item.value)}
            className={cn(
              'h-7 rounded-lg border px-2.5 text-[10.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60',
              category === item.value
                ? 'border-primary/20 bg-primary-wash font-medium text-primary-ink'
                : 'border-border/70 bg-card text-muted-foreground hover:border-primary/20 hover:text-foreground'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <SelectField
          id="writing-task-type"
          label="体裁"
          value={taskType}
          options={WRITING_TASKS}
          onChange={(value) => onTaskTypeChange(value as WritingTaskType)}
          disabled={locked}
        />
        <SelectField
          id="writing-level"
          label="等级"
          value={level}
          options={WRITING_LEVELS}
          onChange={(value) => onLevelChange(value as WritingLevel)}
          disabled={locked}
        />
        <SelectField
          id="writing-target"
          label="目标"
          value={String(targetWords)}
          options={WRITING_TARGETS.map((item) => ({
            value: String(item.value),
            label: item.label,
          }))}
          onChange={(value) => onTargetWordsChange(Number(value))}
          disabled={locked}
        />
      </div>

      {error && (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-destructive/25 bg-destructive/[0.06] px-3 py-2.5 text-[11px] leading-5 text-destructive"
        >
          {error}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[10px] leading-5 text-muted-foreground">
          出题约需 10–20 秒 · 会使用一次 API 额度
        </p>
        <Button
          variant="action"
          onClick={onGenerate}
          disabled={locked}
          className="w-full sm:w-auto"
        >
          {generating ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Sparkles strokeWidth={1.9} />
          )}
          {generating
            ? 'AI 正在出题…'
            : hasPrompt
              ? 'AI 换一个题目'
              : 'AI 生成题目'}
        </Button>
      </div>
    </section>
  )
}
