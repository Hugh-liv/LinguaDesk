import { Check, ChevronRight, Copy, PenLine } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SpeechButton } from '@/components/ui/speech-button'
import type { LearningPack, QuestionItem } from '@/lib/ai/types'
import { cn } from '@/lib/utils'

function EmptyPanel({ children }: { children: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/25 px-4 py-8 text-center text-[12px] leading-6 text-muted-foreground">
      {children}
    </div>
  )
}

export function SummaryPanel({ pack }: { pack: LearningPack }) {
  const isAi = pack.generator === 'ai'

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/70 bg-secondary/35 p-4 sm:p-5">
        <p className="eyebrow">
          {isAi ? 'AI 摘要 · 中文' : '提取式摘要 · English'}
        </p>
        <p className="mt-2.5 font-display text-[15.5px] leading-7 text-foreground/90 sm:leading-8">
          {pack.summary}
        </p>
      </div>

      {pack.keyPoints.length > 0 && (
        <div>
          <h4 className="font-display text-[15px]">关键句</h4>
          <ol className="mt-3 space-y-3">
            {pack.keyPoints.map((point, index) => (
              <li key={point} className="flex gap-3">
                <span className="mt-0.5 font-display text-[11px] font-medium text-action-ink">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <p className="text-[12.5px] leading-6 text-foreground/75">
                  {point}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="border-t border-border/60 pt-4 text-[10.5px] leading-5 text-muted-foreground">
        {isAi
          ? '摘要与解释由 AI 生成；词汇例句以原文为准。'
          : '摘要由原文关键句提取，不添加原文没有的信息。配置 AI 后可获得中文综述与更自然的练习。'}
      </p>
    </div>
  )
}

export function VocabPanel({ pack }: { pack: LearningPack }) {
  if (pack.vocab.length === 0) {
    return <EmptyPanel>这段文字里没有提取到合适的词汇。换一段更完整的文本试试。</EmptyPanel>
  }

  return (
    <div>
      <p className="mb-1 text-[10.5px] text-muted-foreground">
        点击喇叭听发音 · {pack.vocab.length} 个词
      </p>
      <ul className="divide-y divide-border/60">
        {pack.vocab.map((item) => (
          <li key={item.term} className="flex gap-3 py-3.5 first:pt-1 last:pb-0">
            <SpeechButton text={item.term} label={`朗读 ${item.term}`} className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span className="font-display text-[16.5px] font-semibold tracking-[-0.01em]">
                  {item.term}
                </span>
                {item.meaningZh ? (
                  <span className="text-[12.5px] text-muted-foreground">
                    {item.meaningZh}
                  </span>
                ) : (
                  <span className="rounded border border-action/25 bg-action-wash px-1.5 py-0.5 text-[9.5px] text-action-ink">
                    释义待补充
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[12px] italic leading-5 text-foreground/55">
                “{item.example}”
              </p>
            </div>
          </li>
        ))}
      </ul>
      {pack.vocab.some((item) => !item.meaningZh) && (
        <p className="mt-4 border-t border-border/60 pt-3 text-[10.5px] leading-5 text-muted-foreground">
          内置小词典尚未收录个别词。先借例句记住它，之后接入 AI 会自动补齐中文释义。
        </p>
      )}
    </div>
  )
}

export function PatternsPanel({ pack }: { pack: LearningPack }) {
  if (pack.patterns.length === 0) {
    return <EmptyPanel>没有识别到明显的句型结构。可以直接从摘要和词汇开始。</EmptyPanel>
  }

  return (
    <ul className="space-y-3">
      {pack.patterns.map((item) => (
        <li
          key={item.pattern}
          className="rounded-xl border border-border/70 bg-muted/20 p-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-primary/15 bg-primary-wash px-2 py-0.5 text-[10.5px] font-medium text-primary-ink">
              {item.pattern}
            </span>
          </div>
          <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
            {item.explanationZh}
          </p>
          <p className="mt-2.5 border-l-2 border-action/30 pl-3 text-[12.5px] italic leading-6 text-foreground/65">
            {item.example}
          </p>
        </li>
      ))}
    </ul>
  )
}

function questionAnswer(question: QuestionItem): string {
  if (question.kind === 'choice') {
    return `${String.fromCharCode(65 + question.answerIndex)} · ${
      question.choices[question.answerIndex]
    }`
  }
  return question.referenceAnswer
}

export function QuestionsPanel({ pack }: { pack: LearningPack }) {
  if (pack.questions.length === 0) {
    return <EmptyPanel>暂未生成理解题。文本稍长一些会更合适。</EmptyPanel>
  }

  return (
    <ol className="space-y-3">
      {pack.questions.map((question, index) => (
        <li
          key={question.id}
          className="rounded-xl border border-border/70 p-4"
        >
          <div className="flex gap-2.5">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-border/80 font-display text-[10px] text-muted-foreground">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] leading-6 text-foreground/85">
                {question.prompt}
              </p>

              {question.kind === 'choice' ? (
                <>
                  {question.sentence && (
                    <p className="mt-2.5 rounded-lg bg-secondary/40 px-3 py-2.5 font-display text-[13px] italic leading-6 text-foreground/75">
                      “{question.sentence}”
                    </p>
                  )}
                  <ol className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
                    {question.choices.map((choice, choiceIndex) => (
                      <li
                        key={`${question.id}-${choice}`}
                        className="flex items-baseline gap-2 rounded-lg border border-border/60 bg-card px-2.5 py-1.5 text-[12px]"
                      >
                        <span className="font-display text-[10px] text-muted-foreground/70">
                          {String.fromCharCode(65 + choiceIndex)}
                        </span>
                        <span>{choice}</span>
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <p className="mt-2 text-[11px] text-muted-foreground">简答题 · 用英文或中文作答都可以。</p>
              )}

              <details className="group mt-3">
                <summary className="inline-flex items-center gap-1 text-[11.5px] font-medium text-primary transition-colors hover:text-primary-ink">
                  <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" />
                  查看参考答案
                </summary>
                <div className="mt-2.5 rounded-lg border border-border/60 bg-muted/35 px-3.5 py-3 text-[12px] leading-6 text-foreground/80">
                  <p>
                    <span className="font-medium">答案：</span>
                    {questionAnswer(question)}
                  </p>
                  {question.rationaleZh && (
                    <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                      {question.rationaleZh}
                    </p>
                  )}
                </div>
              </details>
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}

export function DictationPanel({ pack }: { pack: LearningPack }) {
  if (pack.dictation.length === 0) {
    return <EmptyPanel>没有找到长度合适的听写句。试试更完整的段落。</EmptyPanel>
  }

  return (
    <div>
      <p className="mb-1 text-[10.5px] text-muted-foreground">
        先用慢速听写，再对照原文。共 {pack.dictation.length} 句。
      </p>
      <ul className="divide-y divide-border/60">
        {pack.dictation.map((item) => (
          <li key={item.id} className="flex gap-3 py-3.5 first:pt-1 last:pb-0">
            <SpeechButton
              text={item.text}
              rate={0.8}
              label="慢速朗读听写句"
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <p className="font-display text-[13.5px] leading-6 text-foreground/85">
                {item.text}
              </p>
              <p className="mt-1 text-[10.5px] text-muted-foreground">
                {item.hint}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-border/60 pt-3 text-[10.5px] leading-5 text-muted-foreground">
        学习台接入后，听写模式会隐藏文字，只留声音和输入框。
      </p>
    </div>
  )
}

export function RetellPanel({ pack }: { pack: LearningPack }) {
  const [copied, setCopied] = useState(false)

  async function copyOutline() {
    const text = [
      pack.retell.promptZh,
      '',
      ...pack.retell.outline.map((item) => `- ${item}`),
    ].join('\n')

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/70 bg-secondary/35 p-4 sm:p-5">
        <div className="flex items-center gap-2 text-primary">
          <PenLine className="size-3.5" strokeWidth={1.8} />
          <p className="eyebrow text-primary/70">复述 prompt</p>
        </div>
        <p className="mt-2.5 font-display text-[15px] leading-7 text-foreground/85">
          {pack.retell.promptZh}
        </p>
      </div>

      <div>
        <h4 className="font-display text-[15px]">提纲</h4>
        <ol className="mt-3 space-y-3">
          {pack.retell.outline.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span
                className={cn(
                  'mt-1 size-1.5 shrink-0 rounded-full',
                  index === 0 ? 'bg-action' : 'bg-border',
                )}
              />
              <p className="text-[12.5px] leading-6 text-muted-foreground">{step}</p>
            </li>
          ))}
        </ol>
      </div>

      <Button variant="outline" size="sm" onClick={copyOutline}>
        {copied ? (
          <Check className="text-primary" strokeWidth={2} />
        ) : (
          <Copy strokeWidth={1.8} />
        )}
        {copied ? '已复制' : '复制复述提纲'}
      </Button>

      <p className="border-t border-border/60 pt-3 text-[10.5px] leading-5 text-muted-foreground">
        复述时先求连贯，再求准确。学习台会记录时长与自评，不给你打分。
      </p>
    </div>
  )
}
