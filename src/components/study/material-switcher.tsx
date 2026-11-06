import {
  ArrowUpRight,
  BookOpenText,
  Check,
  ChevronDown,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { StudyEntry } from '@/components/study/types'
import { formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'

export function MaterialSwitcher({
  entries,
  active,
  onChange,
}: {
  entries: StudyEntry[]
  active: StudyEntry
  onChange: (materialId: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-desk sm:p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-wash text-primary">
            <BookOpenText className="size-[18px]" strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="eyebrow">
              当前材料
              <span className="hidden sm:inline"> · Now reading</span>
            </p>
            <h2 className="mt-1 line-clamp-2 text-balance font-display text-[17px] leading-snug tracking-[-0.015em] sm:text-[19px]">
              {active.material.title}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-muted-foreground">
              <span>{active.material.wordCount} 词</span>
              <span className="text-border">·</span>
              <span>词汇 {active.pack.vocab.length}</span>
              <span className="text-border">·</span>
              <span>听写 {active.pack.dictation.length}</span>
              <Link
                to="/materials"
                className="ml-auto hidden items-center gap-1 rounded text-primary transition-colors hover:text-primary-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:inline-flex"
              >
                材料库
                <ArrowUpRight className="size-3" strokeWidth={1.8} />
              </Link>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => setOpen(true)}
          >
            <span className="hidden sm:inline">换一份</span>
            <span className="sm:hidden">更换</span>
            <ChevronDown strokeWidth={1.8} />
          </Button>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <div className="px-5 pb-2 pt-6 sm:px-6">
            <DialogHeader className="pr-8">
              <p className="eyebrow">材料 · Library</p>
              <DialogTitle className="mt-1">换一份材料</DialogTitle>
              <DialogDescription>
                这里只列出已生成学习包的材料。
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="max-h-[50dvh] overflow-y-auto px-3 pb-4 sm:px-4">
            {entries.map((entry) => {
              const selected = entry.material.id === active.material.id
              return (
                <button
                  key={entry.material.id}
                  type="button"
                  onClick={() => {
                    onChange(entry.material.id)
                    setOpen(false)
                  }}
                  className={cn(
                    'mt-1 flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                    selected
                      ? 'border-primary/25 bg-primary-wash/45'
                      : 'border-transparent hover:bg-muted/55',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[15px] leading-snug">
                      {entry.material.title}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {entry.material.wordCount} 词 · 词汇{' '}
                      {entry.pack.vocab.length} · 听写{' '}
                      {entry.pack.dictation.length} ·{' '}
                      {formatRelativeTime(entry.pack.createdAt)}
                    </p>
                  </div>
                  {selected && (
                    <Check
                      className="mt-1 size-4 shrink-0 text-primary"
                      strokeWidth={2}
                    />
                  )}
                </button>
              )
            })}
          </div>

          <div className="border-t border-border/70 bg-muted/20 px-5 py-3 text-[10.5px] text-muted-foreground sm:px-6">
            需要新材料？{' '}
            <Link
              to="/materials"
              className="font-medium text-primary transition-colors hover:text-primary-ink"
            >
              去材料库导入
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
