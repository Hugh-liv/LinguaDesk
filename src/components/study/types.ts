import type { LearningPack } from '@/lib/ai/types'
import type { MaterialRow } from '@/lib/db'

export interface StudyEntry {
  material: MaterialRow
  pack: LearningPack
}

export type StudyMode = 'reading' | 'vocab' | 'dictation' | 'retell'
