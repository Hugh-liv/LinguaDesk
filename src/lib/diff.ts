export interface DiffWord {
  word: string
  matched: boolean
}

export interface WordDiff {
  expected: DiffWord[]
  extra: string[]
  matched: number
  total: number
  accuracy: number
}

function normalizeWords(text: string): string[] {
  return (
    text
      .toLowerCase()
      .replace(/[’]/g, "'")
      .match(/[a-z0-9]+(?:'[a-z0-9]+)*/g) ?? []
  )
}

/**
 * Word-level comparison for dictation. Punctuation is ignored; extra words
 * count against accuracy so a memorised sentence full of fillers doesn't score
 * as perfect.
 */
export function diffWords(expectedText: string, actualText: string): WordDiff {
  const expectedWords = normalizeWords(expectedText)
  const actualWords = normalizeWords(actualText)
  const rows = expectedWords.length
  const cols = actualWords.length

  const matrix = Array.from({ length: rows + 1 }, () =>
    new Array<number>(cols + 1).fill(0),
  )

  for (let row = 1; row <= rows; row += 1) {
    for (let col = 1; col <= cols; col += 1) {
      matrix[row][col] =
        expectedWords[row - 1] === actualWords[col - 1]
          ? matrix[row - 1][col - 1] + 1
          : Math.max(matrix[row - 1][col], matrix[row][col - 1])
    }
  }

  const matchedExpected = new Array<boolean>(rows).fill(false)
  const matchedActual = new Array<boolean>(cols).fill(false)

  let row = rows
  let col = cols

  while (row > 0 && col > 0) {
    if (expectedWords[row - 1] === actualWords[col - 1]) {
      matchedExpected[row - 1] = true
      matchedActual[col - 1] = true
      row -= 1
      col -= 1
    } else if (matrix[row - 1][col] >= matrix[row][col - 1]) {
      row -= 1
    } else {
      col -= 1
    }
  }

  const matched = matchedExpected.filter(Boolean).length
  const extra = actualWords.filter((_, index) => !matchedActual[index])
  const total = expectedWords.length

  return {
    expected: expectedWords.map((word, index) => ({
      word,
      matched: matchedExpected[index],
    })),
    extra,
    matched,
    total,
    accuracy: total === 0 ? 0 : matched / Math.max(total, actualWords.length),
  }
}
