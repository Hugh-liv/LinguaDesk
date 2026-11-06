import type {
  SpeakingImprovement,
  WritingFeedbackImprovement,
} from './ai/types'
import {
  db,
  recordAttempt,
  type CorpusItemRow,
  type CorpusSourceRef,
  type CorpusSourceType,
} from './db'
import { scheduleReview, type ReviewGrade } from './srs'
import { newId } from './ids'

export interface CorpusSourceInput {
  id: string
  title: string
  createdAt: number
}

interface CorpusImprovement {
  original: string
  better: string
  whyZh: string
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function corpusKey(original: string, better: string): string {
  return `${normalize(original)}||${normalize(better)}`
}

function clean(value: string, max: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, max)
}

function toImprovements(
  items: Array<WritingFeedbackImprovement | SpeakingImprovement>,
): CorpusImprovement[] {
  return items
    .map((item) => {
      const issueZh =
        'issueZh' in item && typeof item.issueZh === 'string'
          ? item.issueZh.trim()
          : ''
      return {
        original: clean(item.original, 2000),
        better: clean(item.better, 2000),
        whyZh: clean([issueZh, item.whyZh].filter(Boolean).join(' '), 1200),
      }
    })
    .filter(
      (item) =>
        item.original.length > 0 &&
        item.better.length > 0 &&
        normalize(item.original) !== normalize(item.better),
    )
}

async function upsertCorpus(
  sourceType: CorpusSourceType,
  source: CorpusSourceInput,
  improvements: CorpusImprovement[],
): Promise<number> {
  if (improvements.length === 0) return 0
  const now = Date.now()
  const ref: CorpusSourceRef = {
    type: sourceType,
    id: source.id,
    title: clean(source.title, 160) || `${sourceType} 反馈`,
    createdAt: source.createdAt,
  }
  let changed = 0

  await db.transaction('rw', db.corpusItems, async () => {
    const existing = await db.corpusItems
      .where('sourceType')
      .equals(sourceType)
      .toArray()
    const byKey = new Map(
      existing.map((item) => [corpusKey(item.original, item.better), item]),
    )

    for (const improvement of improvements) {
      const key = corpusKey(improvement.original, improvement.better)
      const current = byKey.get(key)

      if (current) {
        const alreadySeen = current.sources.some(
          (item) => item.type === ref.type && item.id === ref.id,
        )
        if (alreadySeen) continue
        const nextSources = [...current.sources, ref]
        await db.corpusItems.update(current.id, {
          sources: nextSources,
          occurrences: nextSources.length,
          whyZh: improvement.whyZh || current.whyZh,
          status: 'active',
          dueAt: current.status === 'mastered' ? now : current.dueAt,
          updatedAt: now,
        })
        changed += 1
        continue
      }

      const row: CorpusItemRow = {
        id: newId(),
        sourceType,
        original: improvement.original,
        better: improvement.better,
        whyZh: improvement.whyZh,
        sources: [ref],
        occurrences: 1,
        dueAt: now,
        intervalDays: 0,
        ease: 2.5,
        reps: 0,
        lapses: 0,
        status: 'active',
        drillCount: 0,
        lastDrilledAt: null,
        createdAt: now,
        updatedAt: now,
      }
      await db.corpusItems.add(row)
      byKey.set(key, row)
      changed += 1
    }
  })

  return changed
}

export async function collectWritingFeedback(
  source: CorpusSourceInput,
  improvements: WritingFeedbackImprovement[],
): Promise<number> {
  return upsertCorpus('writing', source, toImprovements(improvements))
}

export async function collectSpeakingFeedback(
  source: CorpusSourceInput,
  improvements: SpeakingImprovement[],
): Promise<number> {
  return upsertCorpus('speaking', source, toImprovements(improvements))
}

/** Collect feedback that existed before the corpus feature was enabled. */
export async function syncCorpusFromHistory(): Promise<number> {
  let changed = 0
  const [works, sessions] = await Promise.all([
    db.writingWorks.toArray(),
    db.speakingSessions.toArray(),
  ])

  for (const work of works) {
    if (!work.feedback) continue
    changed += await collectWritingFeedback(
      {
        id: work.id,
        title: work.prompt.prompt || '写作反馈',
        createdAt: work.createdAt,
      },
      work.feedback.improvements,
    )
  }

  for (const session of sessions) {
    if (!session.feedback) continue
    changed += await collectSpeakingFeedback(
      {
        id: session.id,
        title: session.scenarioTitle,
        createdAt: session.createdAt,
      },
      session.feedback.improvements,
    )
  }

  return changed
}

export async function gradeCorpusItem(
  item: CorpusItemRow,
  grade: ReviewGrade,
  score: number | null,
): Promise<void> {
  const now = Date.now()
  const next = scheduleReview(item, grade, now)
  const status =
    grade === 'good' && next.intervalDays >= 21 ? 'mastered' : 'active'

  await db.corpusItems.update(item.id, {
    ...next,
    status,
    drillCount: item.drillCount + 1,
    lastDrilledAt: now,
    updatedAt: now,
  })

  await recordAttempt({
    materialId: item.id,
    kind: 'corpus',
    score,
    errorTags: grade === 'good' ? [] : ['表达反复出错'],
  })
}

export async function setCorpusStatus(
  id: string,
  status: CorpusItemRow['status'],
): Promise<void> {
  const now = Date.now()
  const patch: Partial<CorpusItemRow> = { status, updatedAt: now }
  if (status === 'active') {
    patch.dueAt = now
    patch.intervalDays = 0
    patch.reps = 0
  }
  await db.corpusItems.update(id, patch)
}

export async function removeCorpusItem(id: string): Promise<void> {
  await db.corpusItems.delete(id)
}
