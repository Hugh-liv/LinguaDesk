import Dexie, { type Table } from 'dexie'
import type {
  LearningPack,
  WritingFeedback,
  WritingLevel,
  WritingPromptData,
  WritingTaskType,
  WritingCategory,
  SpeakingFeedback,
  SpeakingLevel,
  SpeakingTurn,
  WordBatchPlan,
} from './ai/types'
import type {
  ListeningMode,
  ListeningSegment,
  ListeningSource,
} from './listening'
import { newId } from './ids'

export type MaterialSource =
  | 'paste'
  | 'file'
  | 'sample'
  | 'words'
  | 'word-batch'
  | 'ai'
  | 'web'
  | 'image'

/** A web page the material is grounded in (DeepSeek Search). */
export interface MaterialSourceRef {
  title: string
  url: string
  siteName?: string | null
  date?: string | null
}

/** A small thumbnail of the photo a material was recognised from. */
export interface MaterialImageRef {
  dataUrl: string
  name?: string
}

export interface MaterialRow {
  id: string
  title: string
  text: string
  sourceType: MaterialSource
  wordCount: number
  createdAt: number
  updatedAt: number
  packGeneratedAt: number | null
  /** Words the material was built from, for "words → article" imports. */
  focusWords?: string[]
  /** Full AI grouping when the material came from a large word batch. */
  wordPlan?: WordBatchPlan
  /** Real-world sources behind a search-grounded lesson. */
  sources?: MaterialSourceRef[]
  /** Thumbnail of the photo a material was recognised from. */
  image?: MaterialImageRef
}

export interface PackRow {
  materialId: string
  pack: LearningPack
  createdAt: number
  /** Local mutation time for cloud sync; older rows fall back to createdAt. */
  updatedAt?: number
}

export type ReviewKind =
  | 'reading'
  | 'vocab'
  | 'pattern'
  | 'dictation'
  | 'quiz'
  | 'retell'
  | 'listening'
  | 'recall'
  | 'corpus'

export interface ReviewItemRow {
  id: string
  materialId: string
  kind: ReviewKind
  refId: string
  prompt: string
  answer: string
  dueAt: number
  intervalDays: number
  ease: number
  reps: number
  lapses: number
  createdAt: number
  /** True when this review item is a multi-word chunk. */
  chunk?: boolean
  updatedAt?: number
}

export interface AttemptRow {
  id: string
  materialId: string
  kind: ReviewKind
  score: number | null
  durationMs: number | null
  errorTags: string[]
  createdAt: number
}

export type CorpusSourceType = 'writing' | 'speaking'

export interface CorpusSourceRef {
  type: CorpusSourceType
  id: string
  title: string
  createdAt: number
}

export interface CorpusItemRow {
  id: string
  sourceType: CorpusSourceType
  original: string
  better: string
  whyZh: string
  sources: CorpusSourceRef[]
  occurrences: number
  dueAt: number
  intervalDays: number
  ease: number
  reps: number
  lapses: number
  status: 'active' | 'mastered'
  drillCount: number
  lastDrilledAt: number | null
  createdAt: number
  updatedAt: number
}

export interface ErrorTagRow {
  id: string
  tag: string
  count: number
  lastSeenAt: number
  note?: string
  updatedAt?: number
}

export interface WritingWorkRow {
  id: string
  category: WritingCategory
  taskType: WritingTaskType
  level: WritingLevel
  targetWords: number
  prompt: WritingPromptData
  draft: string
  feedback: WritingFeedback | null
  feedbackDraft: string
  feedbackAt: number | null
  createdAt: number
  updatedAt: number
}

export interface SpeakingSessionRow {
  id: string
  scenarioId: string
  scenarioTitle: string
  level: SpeakingLevel
  turns: SpeakingTurn[]
  feedback: SpeakingFeedback | null
  createdAt: number
  updatedAt: number
}

export interface ListeningClipRow {
  id: string
  title: string
  transcript: string
  segments: ListeningSegment[]
  sourceType: ListeningSource
  materialId?: string
  audioBlob?: Blob
  audioName?: string
  audioMime?: string
  audioBytes: number
  /** Set by a backup export; the audio file is deliberately not in JSON. */
  audioOmitted?: boolean
  createdAt: number
  updatedAt: number
}

export interface ListeningSessionRow {
  id: string
  clipId: string
  clipTitle: string
  mode: ListeningMode
  accuracy: number
  matched: number
  total: number
  createdAt: number
  updatedAt: number
}

export interface AppSettingRow {
  key: string
  value: string
  updatedAt?: number
}

export interface SyncStateRow {
  key: string
  value: string
  updatedAt: number
}

class LinguaDeskDB extends Dexie {
  readonly materials!: Table<MaterialRow, string>
  readonly packs!: Table<PackRow, string>
  readonly reviewItems!: Table<ReviewItemRow, string>
  readonly attempts!: Table<AttemptRow, string>
  readonly errors!: Table<ErrorTagRow, string>
  readonly writingWorks!: Table<WritingWorkRow, string>
  readonly settings!: Table<AppSettingRow, string>
  readonly speakingSessions!: Table<SpeakingSessionRow, string>
  readonly listeningClips!: Table<ListeningClipRow, string>
  readonly listeningSessions!: Table<ListeningSessionRow, string>
  readonly corpusItems!: Table<CorpusItemRow, string>
  readonly syncState!: Table<SyncStateRow, string>

  constructor() {
    super('linguadesk')

    this.version(1).stores({
      materials: 'id, createdAt, updatedAt',
      packs: 'materialId, createdAt',
      reviewItems: 'id, materialId, dueAt, kind',
      attempts: 'id, materialId, createdAt, kind',
      errors: 'id, lastSeenAt, tag',
    })

    this.version(2).stores({
      writingWorks: 'id, updatedAt, createdAt, category',
    })

    this.version(3).stores({
      settings: 'key',
    })

    this.version(4).stores({
      speakingSessions: 'id, updatedAt, createdAt, scenarioId',
    })

    this.version(5).stores({
      listeningClips: 'id, updatedAt, createdAt',
      listeningSessions: 'id, updatedAt, createdAt, clipId',
    })

    this.version(6).stores({
      corpusItems: 'id, dueAt, updatedAt, createdAt, sourceType, status',
    })

    this.version(7).stores({
      syncState: 'key',
    })
  }
}

export const db = new LinguaDeskDB()

function isChunkTerm(term: string): boolean {
  return /\s/.test(term.trim())
}

function buildReviewItems(
  materialId: string,
  pack: LearningPack,
): ReviewItemRow[] {
  const now = Date.now()
  const base = {
    materialId,
    dueAt: now,
    intervalDays: 0,
    ease: 2.5,
    reps: 0,
    lapses: 0,
    createdAt: now,
    updatedAt: now,
  }

  const vocabItems: ReviewItemRow[] = pack.vocab.flatMap((item) => {
    const chunk = isChunkTerm(item.term)
    const cards: ReviewItemRow[] = [
      {
        ...base,
        id: newId(),
        kind: 'vocab',
        refId: item.term,
        prompt: item.term,
        answer: item.meaningZh || item.example,
        chunk,
      },
    ]
    if (item.meaningZh.trim()) {
      cards.push({
        ...base,
        id: newId(),
        kind: 'recall',
        refId: item.term,
        prompt: item.meaningZh,
        answer: item.term,
        chunk,
      })
    }
    return cards
  })

  return [
    ...vocabItems,
    ...pack.dictation.map((item) => ({
      ...base,
      id: newId(),
      kind: 'dictation' as const,
      refId: item.id,
      prompt: item.hint,
      answer: item.text,
    })),
  ]
}

/**
 * Existing packs created before two-way review do not have recall cards yet.
 * Add only the missing production cards; never reset an existing schedule.
 */
export async function ensureRecallItems(): Promise<void> {
  const packs = await db.packs.toArray()
  if (packs.length === 0) return
  const now = Date.now()

  await db.transaction('rw', db.reviewItems, async () => {
    for (const row of packs) {
      const items = await db.reviewItems
        .where('materialId')
        .equals(row.materialId)
        .toArray()
      const existing = new Set(
        items
          .filter((item) => item.kind === 'recall')
          .map((item) => item.refId.toLowerCase()),
      )
      const additions: ReviewItemRow[] = []
      for (const vocab of row.pack.vocab) {
        const key = vocab.term.toLowerCase()
        if (!vocab.meaningZh.trim() || existing.has(key)) continue
        additions.push({
          id: newId(),
          materialId: row.materialId,
          kind: 'recall',
          refId: vocab.term,
          prompt: vocab.meaningZh,
          answer: vocab.term,
          dueAt: now,
          intervalDays: 0,
          ease: 2.5,
          reps: 0,
          lapses: 0,
          createdAt: now,
          updatedAt: now,
          chunk: isChunkTerm(vocab.term),
        })
      }
      if (additions.length > 0) await db.reviewItems.bulkAdd(additions)
    }
  })
}

export async function savePack(
  material: MaterialRow,
  pack: LearningPack,
): Promise<void> {
  const now = Date.now()

  await db.transaction(
    'rw',
    db.materials,
    db.packs,
    db.reviewItems,
    async () => {
      await db.packs.put({
        materialId: material.id,
        pack,
        createdAt: now,
        updatedAt: now,
      })

      await db.reviewItems.where('materialId').equals(material.id).delete()
      const items = buildReviewItems(material.id, pack)
      if (items.length > 0) await db.reviewItems.bulkAdd(items)

      await db.materials.update(material.id, {
        packGeneratedAt: now,
        updatedAt: now,
      })
    },
  )
}

export async function deleteMaterial(materialId: string): Promise<void> {
  await db.transaction(
    'rw',
    db.materials,
    db.packs,
    db.reviewItems,
    db.attempts,
    async () => {
      await db.materials.delete(materialId)
      await db.packs.delete(materialId)
      await db.reviewItems.where('materialId').equals(materialId).delete()
      await db.attempts.where('materialId').equals(materialId).delete()
    },
  )
}

export async function getPack(materialId: string): Promise<LearningPack | null> {
  const row = await db.packs.get(materialId)
  return row?.pack ?? null
}

export async function deleteListeningClip(clipId: string): Promise<void> {
  await db.transaction(
    'rw',
    db.listeningClips,
    db.listeningSessions,
    db.attempts,
    async () => {
      await db.listeningClips.delete(clipId)
      await db.listeningSessions.where('clipId').equals(clipId).delete()
      await db.attempts.where('materialId').equals(clipId).delete()
    },
  )
}

export interface AttemptInput {
  materialId: string
  kind: ReviewKind
  score?: number | null
  durationMs?: number | null
  errorTags?: string[]
}

export interface ListeningSessionInput {
  clipId: string
  clipTitle: string
  mode: ListeningMode
  accuracy: number
  matched: number
  total: number
}

export async function saveListeningSession(
  input: ListeningSessionInput,
): Promise<void> {
  const now = Date.now()
  await db.listeningSessions.put({
    id: newId(),
    ...input,
    createdAt: now,
    updatedAt: now,
  })
}

export async function recordAttempt(input: AttemptInput): Promise<void> {
  const now = Date.now()
  const errorTags = [...new Set(input.errorTags ?? [])]

  await db.transaction('rw', db.attempts, db.errors, async () => {
    await db.attempts.add({
      id: newId(),
      materialId: input.materialId,
      kind: input.kind,
      score: input.score ?? null,
      durationMs: input.durationMs ?? null,
      errorTags,
      createdAt: now,
    })

    for (const tag of errorTags) {
      const existing = await db.errors.where('tag').equals(tag).first()
      if (existing) {
        await db.errors.update(existing.id, {
          count: existing.count + 1,
          lastSeenAt: now,
          updatedAt: now,
        })
      } else {
        await db.errors.add({
          id: newId(),
          tag,
          count: 1,
          lastSeenAt: now,
          updatedAt: now,
        })
      }
    }
  })
}
