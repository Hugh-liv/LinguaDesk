import { newId } from './ids'
import { countWords } from './text'

export type ListeningSource = 'audio' | 'text' | 'material' | 'ai'
export type ListeningMode = 'close' | 'dictogloss'

export interface ListeningSegment {
  id: string
  text: string
  /** Seconds. Null when the transcript has no subtitle timing. */
  start: number | null
  end: number | null
}

export interface ListeningClipDraft {
  title: string
  transcript: string
  segments: ListeningSegment[]
  sourceType: ListeningSource
  materialId?: string
  audioBlob?: Blob
  audioName?: string
  audioMime?: string
  audioBytes: number
}

export interface DictoglossChunk {
  index: number
  segments: ListeningSegment[]
  text: string
  wordCount: number
}

const TIME_LINE =
  /^\s*((?:\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3})\s*-->\s*((?:\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3})/

function parseTimecode(value: string): number {
  const parts = value.replace(',', '.').split(':').map(Number)
  if (parts.some((part) => !Number.isFinite(part))) return 0
  if (parts.length >= 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  return parts[0] * 60 + parts[1]
}

function cleanSubtitleText(lines: string[]): string {
  return lines
    .join(' ')
    .replace(/<\/?(?:i|b|u|em|strong|span|font)(?:\s[^>]*)?>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{[^}]+\}/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Reads SRT or WebVTT into timed segments. Cue numbers, settings and styling
 * tags are discarded. A plain transcript returns [].
 */
export function parseSubtitle(raw: string): ListeningSegment[] {
  const normalized = raw
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n')
    .trim()
  if (!normalized) return []

  const lines = normalized.split('\n')
  const segments: ListeningSegment[] = []
  let current: {
    start: number
    end: number
    lines: string[]
  } | null = null

  function finish() {
    if (!current) return
    const text = cleanSubtitleText(current.lines)
    if (text) {
      segments.push({
        id: newId(),
        text,
        start: current.start,
        end: current.end,
      })
    }
    current = null
  }

  for (const line of lines) {
    const match = line.match(TIME_LINE)
    if (match) {
      finish()
      current = {
        start: parseTimecode(match[1]),
        end: parseTimecode(match[2]),
        lines: [],
      }
      continue
    }

    if (!line.trim()) {
      finish()
      continue
    }

    if (current) current.lines.push(line)
    // Lines before the first timecode are WEBVTT headers, NOTE blocks or SRT
    // cue numbers; they are intentionally ignored.
  }
  finish()

  return segments.filter(
    (segment) =>
      segment.start !== null &&
      segment.end !== null &&
      segment.end > segment.start,
  )
}

function splitLongSentence(sentence: string, maxWords: number): string[] {
  if (countWords(sentence) <= maxWords) return [sentence]

  const clauses = sentence.split(/(?<=[,;:])\s+/)
  const result: string[] = []
  let buffer = ''

  function pushBuffer() {
    const text = buffer.trim()
    if (text) result.push(text)
    buffer = ''
  }

  for (const clause of clauses) {
    if (!buffer) {
      buffer = clause
      continue
    }
    if (countWords(`${buffer} ${clause}`) <= maxWords) {
      buffer = `${buffer} ${clause}`
    } else {
      pushBuffer()
      buffer = clause
    }
  }
  pushBuffer()

  return result.flatMap((part) => {
    if (countWords(part) <= maxWords) return [part]
    const words = part.split(/\s+/)
    const chunks: string[] = []
    for (let index = 0; index < words.length; index += maxWords) {
      chunks.push(words.slice(index, index + maxWords).join(' '))
    }
    return chunks
  })
}

/**
 * Splits a plain transcript into sentence-sized segments. No timing is
 * available, so the player reads the text with the system voice.
 */
export function splitTranscript(raw: string, maxWords = 32): ListeningSegment[] {
  const normalized = raw
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
  if (!normalized) return []

  return normalized
    .split(/\n{2,}/)
    .flatMap((paragraph) => paragraph.replace(/\n/g, ' ').split(/(?<=[.!?])\s+/))
    .flatMap((sentence) => splitLongSentence(sentence.trim(), maxWords))
    .filter(Boolean)
    .map((text) => ({
      id: newId(),
      text,
      start: null,
      end: null,
    }))
}

export function transcriptFromSegments(segments: ListeningSegment[]): string {
  return segments.map((segment) => segment.text).join(' ')
}

export function hasTiming(segments: ListeningSegment[]): boolean {
  return (
    segments.length > 0 &&
    segments.every(
      (segment) => segment.start !== null && segment.end !== null,
    )
  )
}

export function buildDictoglossChunks(
  segments: ListeningSegment[],
  maxWords = 68,
  maxSegments = 5,
): DictoglossChunk[] {
  const chunks: DictoglossChunk[] = []
  let current: ListeningSegment[] = []
  let words = 0

  function push() {
    if (current.length === 0) return
    chunks.push({
      index: chunks.length,
      segments: current,
      text: transcriptFromSegments(current),
      wordCount: words,
    })
    current = []
    words = 0
  }

  for (const segment of segments) {
    const segmentWords = countWords(segment.text)
    if (
      current.length > 0 &&
      (words + segmentWords > maxWords || current.length >= maxSegments)
    ) {
      push()
    }
    current.push(segment)
    words += segmentWords
  }
  push()

  return chunks
}

export function listeningScoreLabel(
  accuracy: number,
  extraCount: number,
): string {
  if (accuracy >= 0.999 && extraCount === 0) return '一字不差'
  if (accuracy >= 0.9) return '结构很稳'
  if (accuracy >= 0.72) return '大意抓住了'
  if (accuracy >= 0.5) return '还需要补细节'
  return '先慢下来，再听一遍'
}

export function listeningErrorTags(
  accuracy: number,
  extraCount: number,
  totalWords: number,
  mode: ListeningMode,
): string[] {
  const tags = new Set<string>()
  if (accuracy < 0.9) tags.add('听写细节')
  if (accuracy < 0.6) tags.add('听力辨词')
  if (extraCount > Math.max(2, Math.round(totalWords * 0.18))) {
    tags.add('听力辨词')
  }
  if (mode === 'dictogloss' && accuracy < 0.78) tags.add('篇章听力')
  return [...tags]
}

export function formatSeconds(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '--:--'
  const total = Math.max(0, Math.round(seconds))
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

export const SAMPLE_LISTENING_TITLE = 'A Small Morning Practice'

export const SAMPLE_LISTENING_TEXT = `Most mornings, I do the same small thing before I open my phone. I make tea, sit by the window, and listen to the street for one minute. At first, the minute feels long. Then I begin to notice the details: a bicycle bell, a door closing, someone laughing on the stairs.

The point is not to empty my mind. The point is to arrive. After that, everything I read seems a little quieter, and a little easier to keep.`

export const LISTENING_AUDIO_ACCEPT =
  'audio/*,.mp3,.m4a,.wav,.ogg,.oga,.webm,.aac'

export const LISTENING_SUBTITLE_ACCEPT =
  '.srt,.vtt,text/vtt,application/x-subrip,text/plain'

export const MAX_AUDIO_BYTES = 25 * 1024 * 1024
