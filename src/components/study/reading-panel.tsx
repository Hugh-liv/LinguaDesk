import { Check, Loader2, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { SpeechButton } from '@/components/ui/speech-button'
import type { StudyEntry, StudyMode } from '@/components/study/types'
import { lookupGloss } from '@/lib/ai/glossary'
import type { VocabItem } from '@/lib/ai/types'
import { recordAttempt } from '@/lib/db'
import { cn } from '@/lib/utils'

const FONT_SIZES = [
  { label: '小', className: 'text-[14px] leading-7' },
  { label: '中', className: 'text-[15.5px] leading-8' },
  { label: '大', className: 'text-[17.5px] leading-9' },
]

export function ReadingPanel({
  entry,
  onNextMode,
}: {
  entry: StudyEntry
  onNextMode: (mode: StudyMode) => void
}) {
  const [fontSize, setFontSize] = useState(1)
  const [selected, setSelected] = useState<VocabItem | null>(null)
  const [completed, setCompleted] = useState(false)
  const [completing, setCompleting] = useState(false)
  const startedAt = useRef(0)
  const size = FONT_SIZES[fontSize]

  useEffect(() => {
    startedAt.current = Date.now()
  }, [])

  const paragraphs = useMemo(() => {
    const vocabMap = new Map(entry.pack.vocab.map((item) => [item.term, item]))

    return entry.material.text
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .map((paragraph, paragraphIndex) => {
        const pieces = paragraph.split(/([A-Za-z][A-Za-z'’-]*)/g)

        return (
          <p
            key={paragraphIndex}
            className={cn(
              'font-display tracking-[0.002em] text-foreground/88',
              size.className,
            )}
          >
            {pieces.map((piece, pieceIndex) => {
              if (!/^[A-Za-z]/.test(piece)) {
                return <span key={pieceIndex}>{piece}</span>
              }

              const gloss = lookupGloss(piece)
              const vocab =
                (gloss && vocabMap.get(gloss.lemma)) ??
                vocabMap.get(piece.toLowerCase())

              if (!vocab) {
                return <span key={pieceIndex}>{piece}</span>
              }

              return (
                <button
                  key={pieceIndex}
                  type="button"
                  onClick={() => setSelected(vocab)}
                  className="-mx-0.5 inline rounded-[3px] px-0.5 text-foreground underline decoration-action/55 decoration-dotted underline-offset-[5px] transition-colors hover:bg-action-wash hover:text-action-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/30"
                  aria-label={`查看 ${vocab.term} 的释义`}
                >
                  {piece}
                </button>
              )
            })}
          </p>
        )
      })
  }, [entry.material.text, entry.pack.vocab, size.className])

  async function finishReading() {
    if (completing) return
    setCompleting(true)

    try {
      if (!completed) {
        await recordAttempt({
          materialId: entry.material.id,
          kind: 'reading',
          durationMs: Date.now() - (startedAt.current || Date.now()),
          errorTags: [],
        })
        setCompleted(true)
      }
    } catch {
      // Reading still moves on; the attempt is a nice-to-have.
    } finally {
      setCompleting(false)
      onNextMode('vocab')
    }
  }

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-desk">
        <header className="border-b border-border/70 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="eyebrow">原文 · Reading</p>
              <h2 className="mt-2 text-balance font-display text-[23px] leading-tight tracking-[-0.025em] sm:text-[27px]">
                {entry.material.title}
              </h2>
              <p className="mt-2 text-[10.5px] text-muted-foreground">
                {entry.material.wordCount} 词 · 约{' '}
                {Math.max(1, Math.ceil(entry.material.wordCount / 180))} 分钟
                · 慢慢读
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 self-start">
              <span className="text-[10px] tracking-[0.08em] text-muted-foreground">
                字号
              </span>
              <div className="flex items-center gap-0.5 rounded-lg border border-border/80 bg-muted/40 p-0.5">
                {FONT_SIZES.map((option, index) => (
                  <button
                    key={option.label}
                    type="button"
                    aria-pressed={fontSize === index}
                    onClick={() => setFontSize(index)}
                    className={cn(
                      'grid h-7 min-w-8 place-items-center rounded-md px-1.5 text-[10.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                      fontSize === index
                        ? 'bg-card text-primary shadow-[0_1px_2px_rgb(31_41_51_/_0.06)]'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        <div className="px-5 py-6 sm:px-8 sm:py-8">
          <p className="mb-6 flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
            <Sparkles className="size-3 text-action/70" strokeWidth={1.8} />
            带琥珀色虚线的词可点开看释义
          </p>

          <div className="space-y-5 sm:space-y-6">{paragraphs}</div>

          <div className="mt-8 flex flex-col gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10.5px] leading-5 text-muted-foreground">
              读完一遍就好。理解比速度重要。
            </p>
            <Button
              variant={completed ? 'outline' : 'action'}
              onClick={() => void finishReading()}
              disabled={completing}
              className="w-full sm:w-auto"
            >
              {completing ? (
                <Loader2 className="animate-spin" />
              ) : completed ? (
                <Check strokeWidth={2} />
              ) : null}
              读完了 · 去词汇卡
            </Button>
          </div>
        </div>
      </section>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          {selected && (
            <div className="px-5 pb-5 pt-6 sm:px-6">
              <p className="eyebrow">词汇 · Word</p>
              <div className="mt-2 flex items-center gap-3">
                <DialogTitle className="text-[30px] leading-none tracking-[-0.02em]">
                  {selected.term}
                </DialogTitle>
                <SpeechButton
                  text={selected.term}
                  label={`朗读 ${selected.term}`}
                  className="mt-1"
                />
              </div>
              <DialogDescription className="mt-3 text-[13.5px] text-primary-ink">
                {selected.meaningZh || '释义待补充 · 先借例句记住它'}
              </DialogDescription>
              <p className="mt-4 rounded-xl border border-border/60 bg-secondary/35 px-4 py-3.5 font-display text-[13px] italic leading-6 text-foreground/75">
                “{selected.example}”
              </p>
              <p className="mt-4 text-[10px] text-muted-foreground">
                来自《{entry.material.title}》
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
