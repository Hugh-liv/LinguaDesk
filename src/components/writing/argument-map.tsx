import { ChevronDown, ChevronUp, PenLine } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type {
  WritingCategory,
  WritingLevel,
  WritingPromptData,
  WritingTaskType,
} from '@/lib/ai/types'
import { writingCategoryLabel, writingTaskLabel } from '@/lib/writing'

export function ArgumentMapCard({
  data,
  category,
  taskType,
  level,
  targetWords,
  onGoToDraft,
}: {
  data: WritingPromptData
  category: WritingCategory
  taskType: WritingTaskType
  level: WritingLevel
  targetWords: number
  onGoToDraft?: () => void
}) {
  const map = data.argumentMap
  const [mapOpen, setMapOpen] = useState(true)

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-desk">
      <header className="border-b border-border/70 px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
          <span>{writingCategoryLabel(category)}</span>
          <span className="text-border">·</span>
          <span>{writingTaskLabel(taskType)}</span>
          <span className="text-border">·</span>
          <span>{level}</span>
          <span className="text-border">·</span>
          <span>约 {targetWords} 词</span>
        </div>
        <p className="eyebrow mt-3">题目 · Prompt</p>
        <h2 className="mt-2 text-balance font-display text-[22px] leading-snug tracking-[-0.02em] sm:text-[26px]">
          {data.prompt}
        </h2>
        <p className="mt-2.5 text-[12px] leading-6 text-muted-foreground">
          {data.contextZh}
        </p>
      </header>

      <div className="px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="eyebrow">论点地图 · Map</p>
          <div className="flex items-center gap-1">
            {onGoToDraft && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onGoToDraft}
              >
                <PenLine strokeWidth={1.8} />
                去起草
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-expanded={mapOpen}
              aria-controls="argument-map-body"
              onClick={() => setMapOpen((open) => !open)}
            >
              {mapOpen ? (
                <ChevronUp strokeWidth={1.8} />
              ) : (
                <ChevronDown strokeWidth={1.8} />
              )}
              {mapOpen ? '收起' : '展开'}
            </Button>
          </div>
        </div>

        {mapOpen && (
          <div id="argument-map-body">
            <p className="mt-2 text-[10px] text-muted-foreground/70">
              这是脚手架，不是范文。
            </p>

            <div className="mt-2 rounded-xl border border-primary/15 bg-primary-wash/40 p-4">
              <p className="text-[9px] uppercase tracking-[0.15em] text-primary/65">
                中心立场 · Thesis
              </p>
              <p className="mt-1.5 font-display text-[15px] leading-7 text-foreground/90">
                {map.thesis}
              </p>
            </div>

            <ol className="mt-4 space-y-3">
              {map.points.map((point, index) => (
                <li
                  key={`${point.claim}-${index}`}
                  className="rounded-xl border border-border/65 bg-muted/15 p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 font-display text-[11px] font-medium text-action-ink">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-[14px] leading-6 text-foreground/90">
                        {point.claim}
                      </p>
                      {point.support && (
                        <p className="mt-1.5 text-[11.5px] leading-5 text-muted-foreground">
                          <span className="mr-1.5 text-[9px] uppercase tracking-[0.08em] text-muted-foreground/60">
                            展开
                          </span>
                          {point.support}
                        </p>
                      )}
                      {point.example && (
                        <p className="mt-1.5 border-l-2 border-action/30 pl-2.5 text-[11.5px] italic leading-5 text-foreground/60">
                          {point.example}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            {map.counterargument && (
              <div className="mt-3 rounded-xl border border-dashed border-border bg-card px-4 py-3.5">
                <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground/70">
                  另一种看法 · Counterpoint
                </p>
                <p className="mt-1.5 text-[12px] leading-6 text-foreground/70">
                  {map.counterargument}
                </p>
              </div>
            )}

            {map.usefulChunks.length > 0 && (
              <div className="mt-5">
                <p className="eyebrow">可用语块 · Chunks</p>
                <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
                  {map.usefulChunks.map((chunk) => (
                    <div
                      key={chunk.phrase}
                      className="rounded-lg border border-border/60 bg-card px-3 py-2"
                    >
                      <p className="text-[12px] leading-5 text-foreground/85">
                        {chunk.phrase}
                      </p>
                      {chunk.meaningZh && (
                        <p className="mt-0.5 text-[9.5px] leading-4 text-muted-foreground">
                          {chunk.meaningZh}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {map.structure.length > 0 && (
              <div className="mt-5 border-t border-border/60 pt-4">
                <p className="eyebrow">文章结构 · Structure</p>
                <ol className="mt-2.5 space-y-2">
                  {map.structure.map((step, index) => (
                    <li
                      key={`${step}-${index}`}
                      className="flex items-start gap-2.5"
                    >
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-border/80 font-display text-[9px] text-muted-foreground">
                        {index + 1}
                      </span>
                      <p className="text-[11.5px] leading-5 text-muted-foreground">
                        {step}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
