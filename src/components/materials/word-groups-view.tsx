import type { WordBatchPlan } from '@/lib/ai/types'
import { cn } from '@/lib/utils'

export function WordGroupsView({
  plan,
  showOverview = true,
}: {
  plan: WordBatchPlan
  showOverview?: boolean
}) {
  return (
    <div className="space-y-4">
      {showOverview && plan.overviewZh && (
        <p className="rounded-xl border border-primary/15 bg-primary-wash/35 px-4 py-3 text-[11.5px] leading-6 text-primary-ink/90">
          {plan.overviewZh}
        </p>
      )}

      <div className="space-y-3">
        {plan.groups.map((group, groupIndex) => (
          <section
            key={`${group.themeZh}-${groupIndex}`}
            className="rounded-xl border border-border/65 bg-card p-3.5"
          >
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="font-display text-[15px]">{group.themeZh}</p>
              {group.themeEn && (
                <span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground/65">
                  {group.themeEn}
                </span>
              )}
              <span className="ml-auto text-[9.5px] text-muted-foreground">
                {group.words.length} 词
              </span>
            </div>
            {group.noteZh && (
              <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
                {group.noteZh}
              </p>
            )}

            <div className="mt-2.5 divide-y divide-border/50">
              {group.words.map((word) => (
                <div key={word.term} className="py-2.5 first:pt-1 last:pb-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="font-display text-[14px] font-semibold">
                      {word.term}
                    </span>
                    {word.core && (
                      <span className="rounded bg-action-wash px-1.5 py-0.5 text-[8px] text-action-ink">
                        核心
                      </span>
                    )}
                    {word.meaningZh && (
                      <span className="text-[11px] text-muted-foreground">
                        {word.meaningZh}
                      </span>
                    )}
                  </div>
                  {word.collocation && (
                    <p className="mt-1 text-[10.5px] text-primary-ink/80">
                      {word.collocation}
                    </p>
                  )}
                  {word.example && (
                    <p className="mt-1 text-[10.5px] italic leading-5 text-foreground/55">
                      “{word.example}”
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {plan.unusedWords.length > 0 && (
        <p className="rounded-lg border border-action/15 bg-action-wash/30 px-3 py-2 text-[10px] leading-5 text-action-ink/85">
          短文没有自然用上：{plan.unusedWords.join('、')}。它们仍保留在分组里，可以在复习卡里单独记。
        </p>
      )}

      <div
        className={cn(
          'rounded-xl border border-border/60 bg-muted/15 px-4 py-3',
          'text-[10px] leading-5 text-muted-foreground',
        )}
      >
        <p className="font-medium text-foreground/75">短文 · {plan.articleTitle}</p>
        <p className="mt-1.5 whitespace-pre-wrap">{plan.article}</p>
      </div>
    </div>
  )
}
