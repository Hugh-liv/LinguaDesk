import { Loader2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { WritingWorkRow } from '@/lib/db'
import { formatRelativeTime } from '@/lib/format'
import { countWords } from '@/lib/text'
import { writingCategoryLabel, writingTaskLabel } from '@/lib/writing'
import { cn } from '@/lib/utils'

export function WorkHistory({
  works,
  currentWorkId,
  onOpen,
  onDelete,
}: {
  works: WritingWorkRow[] | undefined
  currentWorkId: string | null
  onOpen: (work: WritingWorkRow) => void
  onDelete: (work: WritingWorkRow) => void
}) {
  const [pendingDelete, setPendingDelete] = useState<WritingWorkRow | null>(
    null
  )

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">最近写作 · Archive</p>
          <h2 className="mt-1 font-display text-[19px] tracking-[-0.015em]">
            留在桌上的稿子
          </h2>
        </div>
        {works && works.length > 0 && (
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {works.length} 篇
          </span>
        )}
      </div>

      {works === undefined ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-card/50 px-4 py-8 text-[11px] text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          正在整理稿子…
        </div>
      ) : works.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/45 px-5 py-7 text-center text-[11.5px] leading-6 text-muted-foreground">
          保存草稿后，这里会出现最近写作与反馈，方便你回看自己的变化。
        </div>
      ) : (
        <div className="space-y-2">
          {works.map((work) => {
            const selected = work.id === currentWorkId
            const wordCount = countWords(work.draft)

            return (
              <div
                key={work.id}
                className={cn(
                  'flex items-start gap-1 rounded-xl border bg-card/65 p-1.5 transition-colors',
                  selected
                    ? 'border-primary/25 bg-primary-wash/25'
                    : 'border-border/70 hover:border-primary/20'
                )}
              >
                <button
                  type="button"
                  onClick={() => onOpen(work)}
                  className="min-w-0 flex-1 rounded-lg px-2.5 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[9.5px] text-muted-foreground">
                    <span>{writingCategoryLabel(work.category)}</span>
                    <span className="text-border">·</span>
                    <span>{writingTaskLabel(work.taskType)}</span>
                    <span className="text-border">·</span>
                    <span>{work.level}</span>
                    <span className="text-border">·</span>
                    <span>{wordCount} 词</span>
                    {work.feedback && (
                      <span className="rounded border border-primary/15 bg-primary-wash px-1 py-px text-[8.5px] text-primary-ink">
                        已反馈
                      </span>
                    )}
                    <span className="ml-auto">
                      {formatRelativeTime(work.updatedAt)}
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 font-display text-[14px] leading-snug text-foreground/85">
                    {work.prompt.prompt}
                  </p>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="删除这篇写作"
                  onClick={() => setPendingDelete(work)}
                  className="mt-0.5 shrink-0 text-muted-foreground/50 hover:text-destructive"
                >
                  <Trash2 strokeWidth={1.8} />
                </Button>
              </div>
            )
          })}
        </div>
      )}

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <div className="px-5 pb-5 pt-6 sm:px-6">
            <p className="eyebrow">删除 · Remove</p>
            <DialogHeader className="mt-1">
              <DialogTitle>删除这篇写作？</DialogTitle>
              <DialogDescription>
                草稿与 AI 反馈会一并删除，无法恢复。
                {pendingDelete && (
                  <span className="mt-2 line-clamp-2 block text-foreground/70">
                    “{pendingDelete.prompt.prompt}”
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="border-t border-border/70 bg-muted/20 px-5 py-4 sm:px-6">
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">取消</Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={() => {
                  if (pendingDelete) onDelete(pendingDelete)
                  setPendingDelete(null)
                }}
              >
                删除
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
