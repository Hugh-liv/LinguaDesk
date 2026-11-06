export function countWords(text: string): number {
  const matches = text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)
  return matches?.length ?? 0
}

export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

export function excerpt(text: string, max = 190): string {
  const clean = collapseWhitespace(text)
  if (clean.length <= max) return clean

  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).trimEnd()}…`
}

export function clipWords(sentence: string, max: number): string {
  const words = collapseWhitespace(sentence).split(' ')
  if (words.length <= max) return words.join(' ')
  return `${words.slice(0, max).join(' ')}…`
}

export function deriveTitle(text: string): string {
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean)

  if (!firstLine) return '未命名材料'

  const words = firstLine.split(/\s+/)
  const title = words.slice(0, 9).join(' ').replace(/[.,;:!?"“”']+$/g, '')
  return title.length > 72 ? `${title.slice(0, 71)}…` : title
}
