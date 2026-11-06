import { generateAutoMaterial, generateWordBatch } from './ai/remote'
import type {
  AutoMaterialInput,
  LearningPack,
  WordBatchInput,
  WordBatchResult,
} from './ai/types'
import { db, savePack, type MaterialRow } from './db'
import { newId } from './ids'
import { countWords } from './text'

export interface CreatedMaterial {
  material: MaterialRow
  pack: LearningPack
}

export async function createAutoMaterial(
  input: AutoMaterialInput,
): Promise<CreatedMaterial> {
  const result = await generateAutoMaterial(input)
  const now = Date.now()
  const material: MaterialRow = {
    id: newId(),
    title: result.title,
    text: result.text,
    sourceType: 'ai',
    wordCount: countWords(result.text),
    createdAt: now,
    updatedAt: now,
    packGeneratedAt: null,
  }

  await db.materials.add(material)
  try {
    await savePack(material, result.pack)
  } catch (error) {
    await db.materials.delete(material.id)
    throw error
  }

  return {
    material: { ...material, packGeneratedAt: now },
    pack: result.pack,
  }
}

export async function saveWordBatchMaterial(
  input: WordBatchInput,
  result: WordBatchResult,
): Promise<CreatedMaterial> {
  const now = Date.now()
  const material: MaterialRow = {
    id: newId(),
    title: result.plan.title || result.plan.articleTitle,
    text: result.plan.article,
    sourceType: 'word-batch',
    focusWords: input.words.map((word) => word.term),
    wordPlan: result.plan,
    wordCount: countWords(result.plan.article),
    createdAt: now,
    updatedAt: now,
    packGeneratedAt: null,
  }

  await db.materials.add(material)
  try {
    await savePack(material, result.pack)
  } catch (error) {
    await db.materials.delete(material.id)
    throw error
  }

  return {
    material: { ...material, packGeneratedAt: now },
    pack: result.pack,
  }
}

/** Used by the word-batch dialog to generate before the learner saves. */
export const generateWordBatchResult = generateWordBatch
