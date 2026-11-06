import { newId } from '../ids'
import { clipWords, collapseWhitespace, countWords } from '../text'
import { lookupGloss } from './glossary'
import { generatePackWithAi } from './remote'
import type {
  ChoiceQuestion,
  DictationItem,
  LearningPack,
  PackGenerationInput,
  PackGenerator,
  PatternItem,
  QuestionItem,
  VocabItem,
} from './types'

const STOPWORDS = new Set([
  'about', 'above', 'after', 'again', 'against', 'almost', 'along', 'already',
  'also', 'although', 'always', 'among', 'another', 'any', 'anyone', 'anything',
  'are', 'around', 'because', 'been', 'before', 'being', 'below', 'beside',
  'besides', 'between', 'both', 'cannot', 'could', 'did', 'does', 'doing',
  'done', 'down', 'during', 'each', 'either', 'else', 'enough', 'especially',
  'even', 'ever', 'every', 'few', 'for', 'found', 'from', 'further', 'gets',
  'give', 'given', 'goes', 'going', 'good', 'got', 'had', 'has', 'have',
  'having', 'here', 'herself', 'himself', 'how', 'however', 'into', 'itself',
  'just', 'kept', 'know', 'known', 'last', 'later', 'least', 'less', 'likely',
  'made', 'make', 'makes', 'making', 'many', 'may', 'might', 'more', 'most',
  'much', 'must', 'myself', 'near', 'nearly', 'neither', 'never', 'next',
  'nothing', 'often', 'once', 'only', 'other', 'others', 'ourselves', 'over',
  'perhaps', 'quite', 'rather', 'really', 'said', 'same', 'says', 'seem',
  'seen', 'several', 'shall', 'should', 'since', 'some', 'something',
  'sometimes', 'still', 'such', 'than', 'that', 'their', 'theirs', 'them',
  'themselves', 'then', 'there', 'these', 'they', 'thing', 'things', 'this',
  'those', 'though', 'through', 'thus', 'too', 'toward', 'under', 'until',
  'upon', 'used', 'uses', 'very', 'well', 'were', 'what', 'when', 'where',
  'whether', 'which', 'while', 'whom', 'whose', 'why', 'will', 'with',
  'within', 'without', 'would', 'your', 'yours', 'yourself', 'yourselves',
  "don't", "can't", "it's", "that's", "there's", "we're", "i'm",
])

const BASIC_WORDS = new Set([
  'book', 'page', 'time', 'day', 'week', 'year', 'night', 'morning', 'evening',
  'life', 'world', 'work', 'room', 'table', 'chair', 'window', 'small', 'start',
  'begin', 'finish', 'stop', 'give', 'find', 'help', 'keep', 'hold', 'move',
  'open', 'close', 'read', 'write', 'tell', 'speak', 'make', 'take', 'wait',
  'walk', 'light', 'sound', 'word', 'text', 'story', 'friend', 'family', 'home',
  'house', 'water', 'food', 'people', 'body', 'hand', 'head', 'long', 'short',
  'big', 'good', 'bad', 'new', 'old', 'part', 'place', 'way', 'man', 'woman',
  'child', 'boy', 'girl', 'school', 'city', 'country', 'name', 'number', 'line',
  'point', 'early', 'late', 'full', 'empty', 'slow', 'fast', 'strong', 'weak',
  'hard', 'easy', 'high', 'low', 'young', 'tree', 'sun', 'moon', 'star', 'rain',
  'wind', 'fire', 'car', 'street', 'town', 'money', 'white', 'black', 'red',
])

const PATTERN_RULES: Array<{
  label: string
  regex: RegExp
  explanationZh: string
}> = [
  {
    label: 'not only … but also',
    regex: /\bnot only\b[\s\S]{0,100}?\bbut also\b/i,
    explanationZh:
      '递进结构：不仅……而且……。not only 放在句首时，前一个分句常用部分倒装。',
  },
  {
    label: 'the more … the less …',
    regex:
      /\bthe\s+(?:more|less|better|worse)\b[\s\S]{0,100}?\bthe\s+(?:more|less|better|worse)\b/i,
    explanationZh: '比较结构：越……，就越……。前后两个分句都使用比较级。',
  },
  {
    label: 'rather than',
    regex: /\brather than\b/i,
    explanationZh: '取舍结构：而不是。连接的两部分在语法形式上通常保持一致。',
  },
  {
    label: 'so … that',
    regex: /\bso\s+[a-z]+(?:\s+[a-z]+){0,6}\s+that\b/i,
    explanationZh: '结果结构：如此……以至于……。so 后接形容词或副词。',
  },
  {
    label: 'such … that',
    regex: /\bsuch\s+(?:a\s+|an\s+)?[a-z]+(?:\s+[a-z]+){0,5}\s+that\b/i,
    explanationZh: '结果结构：如此……以至于……。such 后接名词短语。',
  },
  {
    label: 'as … as',
    regex: /\bas\s+[a-z]+\s+as\b/i,
    explanationZh: '同级比较：和……一样……。两个 as 之间放形容词或副词。',
  },
  {
    label: 'be + 过去分词',
    regex:
      /\b(?:is|are|was|were|be|been|being)\s+(?:not\s+)?(?:[a-z]+ly\s+)?[a-z]+(?:ed|en)\b/i,
    explanationZh: '被动语态：be + 过去分词，强调动作的承受者而非执行者。',
  },
  {
    label: 'which / who 从句',
    regex: /\b(?:which|who|whom|whose)\b/i,
    explanationZh: '定语从句：由关系词引导，用来补充说明前面的名词。',
  },
  {
    label: 'if 条件句',
    regex: /\bif\b[^.!?]{0,90}\b(?:will|would|can|could|might)\b/i,
    explanationZh: '条件句：if 从句提出条件，主句说明结果。真实条件常用“主将从现”。',
  },
  {
    label: 'despite / in spite of',
    regex: /\b(?:despite|in spite of)\b/i,
    explanationZh: '让步结构：尽管。后面接名词、代词或动名词，不直接接句子。',
  },
  {
    label: 'in order to',
    regex: /\bin order to\b/i,
    explanationZh: '目的结构：为了……。后接动词原形。',
  },
]

interface Candidate {
  key: string
  count: number
  first: number
  zh?: string
}

const DOT_SENTINEL = '__ABBR_DOT__'

function splitSentences(text: string): string[] {
  const clean = collapseWhitespace(text)
  const protectedText = clean.replace(
    /\b(Mr|Mrs|Ms|Dr|Prof|St|vs|etc)\./g,
    `$1${DOT_SENTINEL}`,
  )

  const raw =
    protectedText.match(/[^.!?]+[.!?]+(?:["'”’)\]]*)?|[^.!?]+$/g) ?? []

  return raw
    .map((sentence) => sentence.split(DOT_SENTINEL).join('.').trim())
    .filter(
      (sentence) =>
        countWords(sentence) >= 4 &&
        /[A-Za-z]/.test(sentence) &&
        !/^(https?:\/\/|www\.)/i.test(sentence),
    )
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function contentScore(sentence: string): number {
  const tokens =
    sentence
      .toLowerCase()
      .match(/[a-z][a-z'-]+/g)
      ?.filter((token) => token.length >= 3 && !STOPWORDS.has(token)) ?? []

  const unique = new Set(tokens)
  return unique.size + tokens.length * 0.2
}

function extractCandidates(text: string): Candidate[] {
  const tokens = text.match(/[A-Za-z][A-Za-z'’-]*/g) ?? []
  const stats = new Map<string, Candidate>()

  tokens.forEach((raw, index) => {
    const clean = raw.toLowerCase().replace(/’/g, "'")
    if (!/^[a-z][a-z'-]+$/.test(clean)) return
    if (clean.length < 3 || STOPWORDS.has(clean)) return

    const gloss = lookupGloss(clean)
    const key = gloss?.lemma ?? clean
    const existing = stats.get(key)

    if (existing) {
      existing.count += 1
      if (!existing.zh && gloss?.zh) existing.zh = gloss.zh
    } else {
      stats.set(key, {
        key,
        count: 1,
        first: index,
        zh: gloss?.zh,
      })
    }
  })

  return [...stats.values()].sort(
    (a, b) => candidateScore(b) - candidateScore(a) || a.first - b.first,
  )
}

function candidateScore(candidate: Candidate): number {
  const lengthBoost = Math.min(candidate.key.length, 14) / 10
  const glossBoost = candidate.zh ? 0.35 : 0
  const basicPenalty = BASIC_WORDS.has(candidate.key) ? 2.2 : 0
  return candidate.count * (1 + lengthBoost) + glossBoost - basicPenalty
}

function findExample(sentences: string[], term: string): string {
  const regex = new RegExp(`\\b${escapeRegExp(term)}[a-z]*\\b`, 'i')
  return (
    sentences.find((sentence) => regex.test(sentence)) ??
    sentences[0] ??
    ''
  )
}

function buildVocab(
  text: string,
  sentences: string[],
  focusWords: string[] = [],
): VocabItem[] {
  const candidates = extractCandidates(text)
  const focus = new Set(focusWords.map((word) => word.toLowerCase().trim()))
  const focusCandidates = candidates.filter((candidate) =>
    focus.has(candidate.key.toLowerCase()),
  )
  const glossed = candidates.filter((candidate) => candidate.zh)
  const unglossed = candidates.filter((candidate) => !candidate.zh)

  const picked: Candidate[] = []
  const seen = new Set<string>()
  for (const candidate of [...focusCandidates, ...glossed]) {
    if (seen.has(candidate.key)) continue
    seen.add(candidate.key)
    picked.push(candidate)
  }

  if (picked.length < 8) {
    for (const candidate of unglossed) {
      if (picked.length >= 8) break
      if (seen.has(candidate.key)) continue
      seen.add(candidate.key)
      picked.push(candidate)
    }
  }

  return picked.slice(0, 16).map((candidate) => ({
    term: candidate.key,
    meaningZh: candidate.zh ?? '',
    example: findExample(sentences, candidate.key),
  }))
}

function buildSummary(sentences: string[]): {
  summary: string
  keyPoints: string[]
  anchors: string[]
} {
  if (sentences.length === 0) {
    return {
      summary: '原文较短，暂时无法提取完整摘要。',
      keyPoints: [],
      anchors: [],
    }
  }

  const first = sentences[0]
  const last = sentences[sentences.length - 1]
  const middlePool = sentences.slice(1, -1)
  const middle = [...middlePool].sort(
    (a, b) => contentScore(b) - contentScore(a),
  )[0]

  const chosen: string[] = []
  for (const sentence of [first, middle, last]) {
    if (sentence && !chosen.includes(sentence)) chosen.push(sentence)
  }

  const summary = chosen
    .slice(0, 3)
    .map((sentence) => clipWords(sentence, 32))
    .join(' ')

  return {
    summary,
    keyPoints: chosen.slice(0, 3).map((sentence) => clipWords(sentence, 20)),
    anchors: chosen,
  }
}

function buildPatterns(sentences: string[]): PatternItem[] {
  const patterns: PatternItem[] = []

  for (const rule of PATTERN_RULES) {
    if (patterns.length >= 4) break

    const example = sentences.find((sentence) => rule.regex.test(sentence))
    if (!example) continue
    if (patterns.some((item) => item.pattern === rule.label)) continue

    patterns.push({
      pattern: rule.label,
      explanationZh: rule.explanationZh,
      example,
    })
  }

  return patterns
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

function buildQuestions(vocab: VocabItem[], summary: string): QuestionItem[] {
  const usable = vocab.filter(
    (item) =>
      item.meaningZh &&
      item.example &&
      countWords(item.example) >= 6 &&
      countWords(item.example) <= 28,
  )

  const questions: QuestionItem[] = []

  for (const item of usable) {
    if (questions.length >= 3) break

    const regex = new RegExp(`\\b${escapeRegExp(item.term)}[a-z]*\\b`, 'i')
    if (!regex.test(item.example)) continue

    const distractors = shuffle(
      vocab.filter((other) => other.term !== item.term).map((other) => other.term),
    ).slice(0, 3)

    if (distractors.length < 3) continue

    const choices = shuffle([item.term, ...distractors])
    const question: ChoiceQuestion = {
      id: newId(),
      kind: 'choice',
      prompt: '根据上下文，选择最合适的词补全句子。',
      sentence: item.example.replace(regex, '____'),
      choices,
      answerIndex: choices.indexOf(item.term),
      rationaleZh: `原句：${item.example} ${item.term} 在这里表示「${item.meaningZh}」。`,
    }
    questions.push(question)
  }

  questions.push({
    id: newId(),
    kind: 'open',
    prompt: '用 2–3 句话概括这段文字的核心观点。',
    referenceAnswer: summary,
    rationaleZh: '意思接近即可，不必逐字复述原文。',
  })

  return questions
}

function pickSpread(sentences: string[], count: number): string[] {
  if (sentences.length <= count) return sentences

  const picked: string[] = []
  const step = (sentences.length - 1) / (count - 1)

  for (let index = 0; index < count; index += 1) {
    const sentence = sentences[Math.round(index * step)]
    if (sentence && !picked.includes(sentence)) picked.push(sentence)
  }

  return picked
}

function buildDictation(
  sentences: string[],
  vocab: VocabItem[],
): DictationItem[] {
  const candidates = sentences.filter((sentence) => {
    const words = countWords(sentence)
    return words >= 7 && words <= 24
  })

  return pickSpread(candidates, 5).map((sentence) => {
    const keywords = vocab
      .filter((item) =>
        new RegExp(`\\b${escapeRegExp(item.term)}[a-z]*\\b`, 'i').test(sentence),
      )
      .slice(0, 2)
      .map((item) => item.term)

    const hint = [
      `${countWords(sentence)} 个词`,
      keywords.length > 0 ? `关键词 ${keywords.join(' / ')}` : '',
    ]
      .filter(Boolean)
      .join(' · ')

    return {
      id: newId(),
      text: sentence,
      hint,
    }
  })
}

function buildRetell(
  title: string,
  anchors: string[],
): LearningPack['retell'] {
  const first = anchors[0] ?? ''
  const middle = anchors[1] ?? first
  const last = anchors[anchors.length - 1] ?? first

  return {
    promptZh: `用 45–60 秒复述《${title}》。不必背原文：先说主题，再补一个关键细节，最后用一句话收束。`,
    outline: [
      `开场 · ${clipWords(first, 10)}`,
      `展开 · ${clipWords(middle, 10)}`,
      `收束 · ${clipWords(last, 10)}`,
    ],
  }
}

async function generateLocalPack(
  input: PackGenerationInput,
): Promise<LearningPack> {
  const sentences = splitSentences(input.text)
  const { summary, keyPoints, anchors } = buildSummary(sentences)
  const vocab = buildVocab(input.text, sentences, input.focusWords)
  const patterns = buildPatterns(sentences)
  const questions = buildQuestions(vocab, summary)
  const dictation = buildDictation(sentences, vocab)

  return {
    version: 1,
    generator: 'local-heuristic',
    generatorLabel: '本地启发式 v0.1',
    sourceWordCount: countWords(input.text),
    title: input.title,
    summary,
    keyPoints,
    vocab,
    patterns,
    questions,
    dictation,
    retell: buildRetell(input.title, anchors),
    createdAt: Date.now(),
  }
}

export const localHeuristicGenerator: PackGenerator = {
  id: 'local-heuristic',
  label: '本地启发式 v0.1',
  generate: generateLocalPack,
}

/**
 * AI-first generation with a local fallback. The API key lives only on the
 * server / Vite dev middleware; the browser never sees it.
 */
export async function generateLearningPack(
  input: PackGenerationInput,
): Promise<LearningPack> {
  try {
    return await generatePackWithAi(input)
  } catch (error) {
    console.warn(
      '[linguadesk] AI pack generation failed; using local heuristic.',
      error,
    )
    return localHeuristicGenerator.generate(input)
  }
}
