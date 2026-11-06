export const MIN_WORD_LIST = 3
export const MAX_WORD_LIST = 15

export interface ParsedWordList {
  words: string[]
  invalid: string[]
  duplicates: string[]
}

const WORD_OR_CHUNK = /^[A-Za-z][A-Za-z'’]*(?:[ -][A-Za-z][A-Za-z'’]*){0,3}$/

export function parseWordList(raw: string): ParsedWordList {
  const tokens = raw
    .split(/[\n,，;；]+/)
    .map((token) =>
      token
        .replace(/^\s*(?:[-*•]|\d+[.)、])\s*/g, '')
        .replace(/^["'“”]+|["'“”]+$/g, '')
        .trim(),
    )
    .filter(Boolean)

  const seen = new Set<string>()
  const words: string[] = []
  const invalid: string[] = []
  const duplicates: string[] = []

  for (const token of tokens) {
    if (!WORD_OR_CHUNK.test(token)) {
      invalid.push(token)
      continue
    }

    const key = token.toLowerCase()
    if (seen.has(key)) {
      duplicates.push(token)
      continue
    }

    seen.add(key)
    words.push(token)
  }

  return { words, invalid, duplicates }
}

/** Large, messy word lists (one per line, optional Chinese hints, POS or IPA). */
export const MIN_BATCH_WORDS = 6
export const MAX_BATCH_WORDS = 60

export interface BatchWordItem {
  term: string
  noteZh?: string
}

export interface ParsedBatchWordList {
  words: BatchWordItem[]
  invalid: string[]
  duplicates: string[]
}

function cleanBatchToken(raw: string): BatchWordItem | null {
  let token = raw.trim()
  if (!token) return null

  token = token
    .replace(/^\s*(?:[-*•·]|\d+[.)、:])\s*/g, '')
    .replace(/\s*\/[^/]{1,48}\/\s*/g, ' ')
    .replace(/\s*\[[^\]]{1,32}\]\s*/g, ' ')
    .replace(/\((?:n|v|adj|adv|prep|conj|pron|phr)\.?\)/gi, ' ')
    .trim()

  const firstCjk = token.search(/[㐀-鿿]/)
  let termPart = firstCjk >= 0 ? token.slice(0, firstCjk) : token
  let note = firstCjk >= 0 ? token.slice(firstCjk) : ''

  termPart = termPart
    .replace(
      /\s+(?:n|v|adj|adv|prep|conj|pron|phr)(?:\.\s*(?:v|n)\.?)?\.?$/i,
      '',
    )
    .replace(/^[\s\-—–:：,，;；.]+|[\s\-—–:：,，;；.]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  note = note
    .replace(/^[\s\-—–:：,，;；]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)

  if (!termPart) return null
  return { term: termPart, noteZh: note || undefined }
}

export function parseBatchWordList(raw: string): ParsedBatchWordList {
  // If a line is "word 中文", the Chinese is a hint. Comma-separated lists
  // still work; purely Chinese fragments are treated as notes, not errors.
  const tokens = raw
    .split(/[\n,，;；]+/)
    .map((token) => token.trim())
    .filter(Boolean)

  const seen = new Set<string>()
  const words: BatchWordItem[] = []
  const invalid: string[] = []
  const duplicates: string[] = []

  for (const token of tokens) {
    if (!/[A-Za-z]/.test(token)) continue
    const cleaned = cleanBatchToken(token)
    if (!cleaned || !WORD_OR_CHUNK.test(cleaned.term)) {
      invalid.push(token.replace(/\s+/g, ' ').slice(0, 60))
      continue
    }

    const key = cleaned.term.toLowerCase()
    if (seen.has(key)) {
      duplicates.push(cleaned.term)
      continue
    }
    seen.add(key)
    words.push(cleaned)
  }

  return { words, invalid, duplicates }
}
