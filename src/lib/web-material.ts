import { generateSearchLesson } from './ai/remote'
import type {
  LearningPack,
  SearchLessonInput,
  WebSearchSource,
} from './ai/types'
import {
  db,
  savePack,
  type MaterialRow,
  type MaterialSourceRef,
} from './db'
import { newId } from './ids'
import { countWords, deriveTitle } from './text'

const MAX_IMPORT_CHARS = 60_000
const MIN_IMPORT_WORDS = 30

export interface CreatedSearchMaterial {
  material: MaterialRow
  pack: LearningPack
  sources: WebSearchSource[]
}

export function toSourceRef(source: WebSearchSource): MaterialSourceRef {
  return {
    title: source.title,
    url: source.url,
    siteName: source.siteName ?? null,
    date: source.date ?? null,
  }
}

function cleanWebText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_IMPORT_CHARS)
}

/**
 * The body we keep when a search result is imported directly. `content` is the
 * extracted Markdown body; fall back to the long summary, then the snippet.
 */
export function webResultText(source: WebSearchSource): string {
  const content = cleanWebText(source.content)
  if (countWords(content) >= 30) return content

  const summary = cleanWebText(source.summary)
  if (countWords(summary) >= 20) return summary

  const snippet = cleanWebText(source.snippet)
  return content || summary || snippet
}

export function isImportableWebResult(source: WebSearchSource): boolean {
  return countWords(webResultText(source)) >= MIN_IMPORT_WORDS
}

/** Save selected search results as plain reading material (no learning pack). */
export async function saveWebSearchResults(
  sources: WebSearchSource[],
): Promise<MaterialRow[]> {
  const rows = sources
    .map((source): MaterialRow | null => {
      const text = webResultText(source)
      if (countWords(text) < MIN_IMPORT_WORDS) return null

      const now = Date.now()
      return {
        id: newId(),
        title:
          source.title.trim().slice(0, 90) ||
          deriveTitle(text),
        text,
        sourceType: 'web',
        sources: [toSourceRef(source)],
        wordCount: countWords(text),
        createdAt: now,
        updatedAt: now,
        packGeneratedAt: null,
      }
    })
    .filter((row): row is MaterialRow => row !== null)

  if (rows.length > 0) await db.materials.bulkAdd(rows)
  return rows
}

/**
 * Search + write a lesson grounded in the current results, then persist the
 * material, its pack and the source list in one step.
 */
export async function createSearchLessonMaterial(
  input: SearchLessonInput,
): Promise<CreatedSearchMaterial> {
  const result = await generateSearchLesson(input)
  const now = Date.now()
  const sources = result.sources.map(toSourceRef)

  const material: MaterialRow = {
    id: newId(),
    title: result.title,
    text: result.text,
    sourceType: 'web',
    sources,
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
    sources: result.sources,
  }
}
