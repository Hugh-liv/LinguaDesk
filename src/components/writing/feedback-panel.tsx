import { ArrowUpRight, Check, ChevronRight, Target } from 'lucide-react'
import type { WritingFeedback } from '@/lib/ai/types'
import { formatRelativeTime } from '@/lib/format'

export function FeedbackPanel({
  feedback,
  stale,
  reviewedAt,
}: {
  feedback: WritingFeedback
  stale: boolean
  reviewedAt: number | null
}) {
  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-desk">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/20 px-5 py-3 sm:px-7">
        <p className="eyebrow">反馈 · Editor's notes</p>
        {reviewedAt && (
          <span className="text-[10px] text-muted-foreground">
            {formatRelativeTime(reviewedAt)}
          </span>
        )}
      </div>

      {stale && (
        <div className="border-b border-action/15 bg-action-wash/45 px-5 py-2.5 text-[10.5px] leading-5 text-action-ink sm:px-7">
          你已经改过草稿；下面这份反馈对应上一版。修改后可以再次请 AI 反馈。
        </div>
      )}

      <div className="px-5 py-5 sm:px-7 sm:py-6">
        <p className="font-display text-[15px] leading-7 text-foreground/90">
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
          <div className="mt-5">
            <p className="eyebrow">最值得改的地方</p>
            <ol className="mt-2.5 space-y-3">
              {feedback.improvements.map((item, index) => (
                <li
                  key={`${item.original}-${index}`}
                  className="rounded-xl border border-border/65 bg-muted/15 p-4"
                >
                  <p className="text-[11.5px] font-medium leading-5 text-foreground/85">
                    {item.issueZh}
                  </p>
                  <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
                    <p className="rounded-lg bg-card px-3 py-2 text-[11.5px] leading-5 text-muted-foreground line-through decoration-destructive/35">
                      {item.original}
                    </p>
                    <p className="rounded-lg border border-primary/15 bg-primary-wash/45 px-3 py-2 text-[11.5px] leading-5 text-primary-ink">
                      {item.better}
                    </p>
                  </div>
                  {item.whyZh && (
                    <p className="mt-2 text-[10.5px] leading-5 text-muted-foreground">
                      {item.whyZh}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        {feedback.nextStepZh && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-action/20 bg-action-wash/45 px-4 py-3.5">
            <Target
              className="mt-0.5 size-4 shrink-0 text-action-ink"
              strokeWidth={1.8}
            />
            <div>
              <p className="text-[9px] uppercase tracking-[0.14em] text-action-ink/70">
                下一步 · Next step
              </p>
              <p className="mt-1 text-[11.5px] leading-5 text-action-ink">
                {feedback.nextStepZh}
              </p>
            </div>
          </div>
        )}

        {feedback.improvedDraft && (
          <details className="group mt-4 border-t border-border/60 pt-4">
            <summary className="inline-flex cursor-pointer items-center gap-1 text-[11.5px] font-medium text-primary transition-colors hover:text-primary-ink">
              <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" />
              查看轻改版（保留你的结构）
            </summary>
            <div className="mt-3 whitespace-pre-wrap rounded-xl border border-border/60 bg-secondary/30 px-4 py-4 font-display text-[13px] leading-7 text-foreground/80">
              {feedback.improvedDraft}
            </div>
            <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
              <ArrowUpRight className="size-3" />
              建议只挑 1–2 处吸收，不要整段替换自己的表达。
            </p>
          </details>
        )}
      </div>
    </section>
  )
}
