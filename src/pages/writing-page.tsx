import { useLiveQuery } from 'dexie-react-hooks'
import { PenLine } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/page-header'
import { ArgumentMapCard } from '@/components/writing/argument-map'
import { FeedbackPanel } from '@/components/writing/feedback-panel'
import { WorkHistory } from '@/components/writing/work-history'
import {
  WritingEditor,
  type WritingSaveState,
} from '@/components/writing/writing-editor'
import { WritingSetup } from '@/components/writing/writing-setup'
import {
  AiRequestError,
  generateWritingFeedback,
  generateWritingTask,
} from '@/lib/ai/remote'
import type {
  WritingCategory,
  WritingFeedback,
  WritingLevel,
  WritingPromptData,
  WritingTaskType,
} from '@/lib/ai/types'
import { collectWritingFeedback } from '@/lib/corpus'
import { db, type WritingWorkRow } from '@/lib/db'
import { newId } from '@/lib/ids'
import { countWords } from '@/lib/text'

function nowMs(): number {
  return Date.now()
}

function formatWritingError(error: unknown): string {
  if (error instanceof AiRequestError) {
    if (error.code === 'AI_NOT_CONFIGURED') {
      return 'AI 还没有接通。请配置 DEEPSEEK_API_KEY 或 ANTHROPIC_API_KEY，并在 .env.local 或 Vercel 中重启 / 重新部署。'
    }
    return error.message
  }
  return 'AI 请求失败，请稍后再试。'
}

export function WritingPage() {
  const [category, setCategory] = useState<WritingCategory>('daily')
  const [taskType, setTaskType] = useState<WritingTaskType>('opinion')
  const [level, setLevel] = useState<WritingLevel>('B1')
  const [targetWords, setTargetWords] = useState(180)

  const [promptData, setPromptData] = useState<WritingPromptData | null>(null)
  const [workId, setWorkId] = useState<string | null>(null)
  const [createdAt, setCreatedAt] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null)
  const [feedbackDraft, setFeedbackDraft] = useState('')
  const [feedbackAt, setFeedbackAt] = useState<number | null>(null)

  const [generatingTask, setGeneratingTask] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<WritingSaveState>('idle')

  const [lastSavedDraft, setLastSavedDraft] = useState('')
  const savingRef = useRef(false)
  const workIdRef = useRef<string | null>(null)
  const workshopRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const feedbackRef = useRef<HTMLDivElement>(null)

  const history = useLiveQuery(
    () => db.writingWorks.orderBy('updatedAt').reverse().limit(20).toArray(),
    []
  )

  const wordCount = countWords(draft)
  const dirty =
    promptData !== null && draft.trim().length > 0 && draft !== lastSavedDraft

  useEffect(() => {
    if (!dirty) return

    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', warnBeforeLeave)
    return () => window.removeEventListener('beforeunload', warnBeforeLeave)
  }, [dirty])

  async function persistWork(
    overrides: {
      feedback?: WritingFeedback | null
      feedbackDraft?: string
      feedbackAt?: number | null
    } = {}
  ): Promise<WritingWorkRow | null> {
    if (!promptData || !draft.trim() || savingRef.current) return null

    savingRef.current = true
    setSaveState('saving')

    try {
      const now = nowMs()
      const id = workIdRef.current ?? workId ?? newId()
      workIdRef.current = id
      const existing = await db.writingWorks.get(id)
      const row: WritingWorkRow = {
        id,
        category,
        taskType,
        level,
        targetWords,
        prompt: promptData,
        draft,
        feedback:
          overrides.feedback !== undefined ? overrides.feedback : feedback,
        feedbackDraft:
          overrides.feedbackDraft !== undefined
            ? overrides.feedbackDraft
            : feedbackDraft,
        feedbackAt:
          overrides.feedbackAt !== undefined
            ? overrides.feedbackAt
            : feedbackAt,
        createdAt: existing?.createdAt ?? createdAt ?? now,
        updatedAt: now,
      }

      await db.writingWorks.put(row)
      if (workId !== id) setWorkId(id)
      if (createdAt === null) setCreatedAt(row.createdAt)
      setLastSavedDraft(draft)
      setSaveState('saved')
      return row
    } catch {
      setSaveState('error')
      return null
    } finally {
      savingRef.current = false
    }
  }

  async function handleGenerateTask() {
    if (generatingTask || reviewing) return
    setSetupError(null)

    if (dirty) {
      const saved = await persistWork()
      if (!saved) {
        setSetupError('当前草稿没有保存成功，请先点「保存草稿」再换题。')
        return
      }
    }

    setGeneratingTask(true)
    try {
      const data = await generateWritingTask({
        category,
        taskType,
        level,
        targetWords,
      })

      setPromptData(data)
      setWorkId(null)
      workIdRef.current = null
      setCreatedAt(null)
      setDraft('')
      setFeedback(null)
      setFeedbackDraft('')
      setFeedbackAt(null)
      setSaveState('idle')
      setReviewError(null)
      setLastSavedDraft('')

      window.requestAnimationFrame(() => {
        workshopRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      })
    } catch (error) {
      setSetupError(formatWritingError(error))
    } finally {
      setGeneratingTask(false)
    }
  }

  async function handleSave() {
    if (!draft.trim()) return
    await persistWork()
  }

  async function handleReview() {
    if (!promptData || reviewing || generatingTask) return
    setReviewError(null)

    if (wordCount < 40) {
      setReviewError('至少写 40 个词，AI 才能给出有效反馈。')
      return
    }

    if (dirty) {
      const saved = await persistWork()
      if (!saved) {
        setReviewError('草稿没有保存成功，请先点「保存草稿」再请求反馈。')
        return
      }
    }

    setReviewing(true)
    try {
      const result = await generateWritingFeedback({
        category,
        taskType,
        level,
        targetWords,
        prompt: promptData.prompt,
        draft,
      })
      const reviewedAt = nowMs()

      const saved = await persistWork({
        feedback: result,
        feedbackDraft: draft,
        feedbackAt: reviewedAt,
      })
      if (!saved) {
        setReviewError('反馈已生成，但保存失败。请先保存草稿再离开。')
      } else {
        try {
          await collectWritingFeedback(
            {
              id: saved.id,
              title: saved.prompt.prompt,
              createdAt: saved.createdAt,
            },
            result.improvements,
          )
        } catch {
          setReviewError('反馈已生成，但个人语料库没有完整收集。')
        }
      }

      setFeedback(result)
      setFeedbackDraft(draft)
      setFeedbackAt(reviewedAt)

      window.requestAnimationFrame(() => {
        feedbackRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      })
    } catch (error) {
      setReviewError(formatWritingError(error))
    } finally {
      setReviewing(false)
    }
  }

  async function openWork(work: WritingWorkRow) {
    if (reviewing || generatingTask) return

    if (dirty) {
      const saved = await persistWork()
      if (!saved) return
    }

    setCategory(work.category)
    setTaskType(work.taskType)
    setLevel(work.level)
    setTargetWords(work.targetWords)
    setPromptData(work.prompt)
    setWorkId(work.id)
    workIdRef.current = work.id
    setCreatedAt(work.createdAt)
    setDraft(work.draft)
    setFeedback(work.feedback)
    setFeedbackDraft(work.feedbackDraft)
    setFeedbackAt(work.feedbackAt)
    setSaveState('saved')
    setSetupError(null)
    setReviewError(null)
    setLastSavedDraft(work.draft)

    window.requestAnimationFrame(() => {
      workshopRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  async function deleteWork(work: WritingWorkRow) {
    if (reviewing || generatingTask) return
    await db.writingWorks.delete(work.id)

    if (workId === work.id) {
      setWorkId(null)
      workIdRef.current = null
      setCreatedAt(null)
      setPromptData(null)
      setDraft('')
      setFeedback(null)
      setFeedbackDraft('')
      setFeedbackAt(null)
      setSaveState('idle')
      setLastSavedDraft('')
      setReviewError(null)
    }
  }

  const feedbackStale =
    feedback !== null && feedbackDraft.trim() !== draft.trim()

  return (
    <>
      <PageHeader
        eyebrow="写作 · Writing"
        title="把想法，写成自己的句子"
        description="先拿一个题目和论点地图，再写一版；AI 只指出可执行的改动，不替你重写。"
      />

      <WritingSetup
        category={category}
        onCategoryChange={setCategory}
        taskType={taskType}
        onTaskTypeChange={setTaskType}
        level={level}
        onLevelChange={setLevel}
        targetWords={targetWords}
        onTargetWordsChange={setTargetWords}
        generating={generatingTask}
        onGenerate={() => void handleGenerateTask()}
        hasPrompt={promptData !== null}
        error={setupError}
        disabled={reviewing}
      />

      {promptData === null ? (
        <section className="mt-5 rounded-2xl border border-dashed border-border bg-card/55 px-6 py-8 text-center shadow-desk sm:py-9">
          <div className="mx-auto grid size-11 place-items-center rounded-xl bg-primary-wash text-primary">
            <PenLine className="size-5" strokeWidth={1.7} />
          </div>
          <h2 className="mt-3 font-display text-[21px] tracking-[-0.02em]">
            先出题，再写，再改
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[12px] leading-6 text-muted-foreground">
            生成题目后会得到一张论点地图：中心立场、三组论点、反方视角和可用语块。作文仍由你从第一句开始写。
          </p>
          <ol className="mx-auto mt-5 grid max-w-lg grid-cols-2 gap-2 text-left sm:grid-cols-4">
            {[
              ['01', '出题', '话题、体裁与字数'],
              ['02', '论点', '挑 2–3 个能用'],
              ['03', '起草', '用自己的话说'],
              ['04', '反馈', '只改最关键的'],
            ].map(([number, title, text]) => (
              <li
                key={number}
                className="rounded-xl border border-border/60 bg-card/70 px-3 py-2.5"
              >
                <p className="font-display text-[10px] text-action-ink">
                  {number}
                </p>
                <p className="mt-1 text-[11.5px] font-medium">{title}</p>
                <p className="mt-0.5 text-[9.5px] leading-4 text-muted-foreground">
                  {text}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <div ref={workshopRef} className="scroll-mt-20 md:scroll-mt-8">
          <ArgumentMapCard
            key={promptData.prompt}
            data={promptData}
            category={category}
            taskType={taskType}
            level={level}
            targetWords={targetWords}
            onGoToDraft={() => {
              editorRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              })
            }}
          />

          <div ref={editorRef} className="scroll-mt-20 md:scroll-mt-8">
            <WritingEditor
              draft={draft}
              onDraftChange={(value) => {
                setDraft(value)
                if (reviewError) setReviewError(null)
              }}
              wordCount={wordCount}
              targetWords={targetWords}
              saveState={saveState}
              dirty={dirty}
              reviewing={reviewing}
              reviewError={reviewError}
              onSave={() => void handleSave()}
              onReview={() => void handleReview()}
            />
          </div>

          {feedback && (
            <div ref={feedbackRef} className="scroll-mt-20 md:scroll-mt-8">
              <FeedbackPanel
                feedback={feedback}
                stale={feedbackStale}
                reviewedAt={feedbackAt}
              />
              <div className="mt-3 flex justify-end">
                <Link
                  to="/corpus"
                  className="inline-flex items-center gap-1 text-[10.5px] font-medium text-primary transition-colors hover:text-primary-ink"
                >
                  反馈中的错误已收集 · 去微训练
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      <WorkHistory
        works={history}
        currentWorkId={workId}
        onOpen={(work) => void openWork(work)}
        onDelete={(work) => void deleteWork(work)}
      />
    </>
  )
}
