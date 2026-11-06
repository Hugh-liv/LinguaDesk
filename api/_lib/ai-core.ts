import type {
  ArticleFromWordsInput,
  ArticleGenre,
  ArticleLength,
  ArticleLevel,
  AutoListeningInput,
  AutoListeningLength,
  AutoListeningLevel,
  AutoMaterialInput,
  WordBatchInput,
  WordBatchInputWord,
  WritingCategory,
  WritingFeedbackInput,
  WritingLevel,
  WritingTaskInput,
  WritingTaskType,
} from '../../src/lib/ai/types.ts'
import { callStructured, callVision, callWebSearch } from './provider.js'
import type {
  AiHttpResult,
  AiRuntimeConfig,
  AiTool,
  WebSearchSource,
} from './provider.js'

export type { AiHttpResult, AiRuntimeConfig } from './provider.js'
import {
  SPEAKING_FEEDBACK_TOOL,
  SPEAKING_REPLY_TOOL,
  buildSpeakingFeedbackPrompts,
  buildSpeakingReplyPrompts,
  parseSpeakingFeedbackInput,
  parseSpeakingReplyInput,
} from './speaking.js'

const MAX_PACK_TEXT = 20_000
const MAX_FOCUS_WORDS = 20
const MAX_BATCH_WORDS = 60

const LEVELS: ArticleLevel[] = ['A2', 'B1', 'B2', 'C1']
const LENGTHS: ArticleLength[] = ['short', 'medium', 'long']
const GENRES: ArticleGenre[] = ['article', 'story', 'dialogue', 'email']
const LISTENING_LEVELS: AutoListeningLevel[] = ['B1', 'B2', 'C1']
const LISTENING_LENGTHS: AutoListeningLength[] = ['short', 'medium']

const LENGTH_RANGES: Record<ArticleLength, [number, number]> = {
  short: [160, 230],
  medium: [280, 360],
  long: [450, 560],
}

const GENRE_LABELS: Record<ArticleGenre, string> = {
  article: 'short article',
  story: 'short story',
  dialogue: 'natural dialogue with speaker labels',
  email: 'email including a subject line',
}

const WRITING_CATEGORIES: WritingCategory[] = [
  'daily',
  'work',
  'technology',
  'environment',
  'relationships',
  'education',
  'health',
  'culture',
]

const WRITING_TASKS: WritingTaskType[] = [
  'opinion',
  'email',
  'message',
  'story',
  'description',
]

const WRITING_LEVELS: WritingLevel[] = ['B1', 'B2', 'C1']

const WRITING_TARGETS = [120, 180, 280]

const WRITING_CATEGORY_LABELS: Record<WritingCategory, string> = {
  daily: 'daily life',
  work: 'work and career',
  technology: 'technology',
  environment: 'environment',
  relationships: 'relationships',
  education: 'learning and education',
  health: 'health',
  culture: 'culture and travel',
}

const WRITING_TASK_LABELS: Record<WritingTaskType, string> = {
  opinion: 'opinion piece',
  email: 'email',
  message: 'short message or note to a real person',
  story: 'short story',
  description: 'description of a place, experience or process',
}

const PACK_TOOL = {
  name: 'submit_learning_pack',
  description:
    'Return a complete English learning pack for the supplied text.',
  input_schema: {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description:
          'A faithful 80–140 character summary in Simplified Chinese.',
      },
      keyPoints: {
        type: 'array',
        items: { type: 'string' },
        minItems: 2,
        maxItems: 4,
        description:
          '2–4 short key sentences in English, taken from or closely paraphrased from the text.',
      },
      vocab: {
        type: 'array',
        minItems: 4,
        maxItems: 18,
        items: {
          type: 'object',
          properties: {
            term: {
              type: 'string',
              description:
                'Base form of a useful word or a short chunk that appears in the text.',
            },
            meaningZh: {
              type: 'string',
              description:
                'Concise Simplified Chinese meaning, including nuance when useful.',
            },
            example: {
              type: 'string',
              description:
                'An exact sentence from the text that contains the word or chunk.',
            },
          },
          required: ['term', 'meaningZh', 'example'],
        },
      },
      patterns: {
        type: 'array',
        minItems: 2,
        maxItems: 5,
        items: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              description: 'English name of the structure, e.g. not only … but also.',
            },
            explanationZh: {
              type: 'string',
              description:
                'Simplified Chinese explanation of form, meaning and usage.',
            },
            example: {
              type: 'string',
              description: 'An exact sentence from the text using the structure.',
            },
          },
          required: ['pattern', 'explanationZh', 'example'],
        },
      },
      questions: {
        type: 'array',
        minItems: 3,
        maxItems: 5,
        items: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: ['choice', 'open'] },
            prompt: {
              type: 'string',
              description:
                'Question in English. For a cloze, use a clear English instruction.',
            },
            sentence: {
              type: 'string',
              description:
                'Exact supporting quote from the text. For a cloze, replace the target word with ____. Use "" for an open question.',
            },
            choices: {
              type: 'array',
              items: { type: 'string' },
              maxItems: 4,
              description:
                'Exactly 4 options for choice questions; [] for open questions.',
            },
            answerIndex: {
              type: 'integer',
              minimum: 0,
              maximum: 3,
              description: 'Zero-based index of the correct option. Use 0 for open.',
            },
            referenceAnswer: {
              type: 'string',
              description:
                'Correct option text for choice questions; a model answer in English for open questions.',
            },
            rationaleZh: {
              type: 'string',
              description: 'Brief Simplified Chinese explanation.',
            },
          },
          required: [
            'kind',
            'prompt',
            'sentence',
            'choices',
            'answerIndex',
            'referenceAnswer',
            'rationaleZh',
          ],
        },
      },
      dictation: {
        type: 'array',
        minItems: 3,
        maxItems: 6,
        items: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'An exact sentence from the text, 8–22 words.',
            },
            hint: {
              type: 'string',
              description:
                'Chinese hint with word count and 1–2 keywords, without writing the full sentence.',
            },
          },
          required: ['text', 'hint'],
        },
      },
      retell: {
        type: 'object',
        properties: {
          promptZh: {
            type: 'string',
            description:
              'Chinese instruction for a 45–60 second retelling of the text.',
          },
          outline: {
            type: 'array',
            items: { type: 'string' },
            minItems: 2,
            maxItems: 4,
            description:
              '2–4 outline anchors, mixing Chinese stage labels with English anchors.',
          },
        },
        required: ['promptZh', 'outline'],
      },
    },
    required: [
      'summary',
      'keyPoints',
      'vocab',
      'patterns',
      'questions',
      'dictation',
      'retell',
    ],
  },
} as const

const ARTICLE_TOOL = {
  name: 'submit_article',
  description:
    'Return an original English text that naturally uses a target word list.',
  input_schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'A short, natural title of at most 70 characters.',
      },
      article: {
        type: 'string',
        description:
          'The complete text as plain text, using blank lines between paragraphs.',
      },
      usedWords: {
        type: 'array',
        items: { type: 'string' },
        description:
          'The exact target words/chunks that appear in the article.',
      },
      unusedWords: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Target words/chunks that could not be used naturally.',
      },
    },
    required: ['title', 'article', 'usedWords', 'unusedWords'],
  },
} as const

const AUTO_MATERIAL_TOOL = {
  name: 'submit_auto_material',
  description:
    'Write an original English lesson text and return its complete learning pack in one response.',
  input_schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'A short natural title, at most 80 characters.',
      },
      text: {
        type: 'string',
        description:
          'The complete original English lesson text as plain text with blank lines between paragraphs.',
      },
      ...PACK_TOOL.input_schema.properties,
    },
    required: ['title', 'text', ...PACK_TOOL.input_schema.required],
  },
} as const

const AUTO_LISTENING_TOOL = {
  name: 'submit_auto_listening',
  description:
    'Write a short, natural spoken-style English transcript for listening practice.',
  input_schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'A short natural title, at most 80 characters.',
      },
      transcript: {
        type: 'string',
        description:
          'A complete spoken-style English text. No headings, stage directions, translations or markdown.',
      },
    },
    required: ['title', 'transcript'],
  },
} as const

const WORD_BATCH_TOOL = {
  name: 'submit_word_batch',
  description:
    'Organise a messy word list into thematic groups and turn it into one directly learnable lesson with a complete learning pack.',
  input_schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'A short natural lesson title, at most 80 characters.',
      },
      overviewZh: {
        type: 'string',
        description:
          '2–4 Chinese sentences explaining how the list was grouped, what the core words are, and the best study order.',
      },
      groups: {
        type: 'array',
        minItems: 2,
        maxItems: 6,
        items: {
          type: 'object',
          properties: {
            themeZh: {
              type: 'string',
              description: 'A short Chinese theme label.',
            },
            themeEn: {
              type: 'string',
              description: 'A short English theme label.',
            },
            noteZh: {
              type: 'string',
              description:
                'One Chinese sentence on why these words belong together or how to learn them.',
            },
            words: {
              type: 'array',
              minItems: 1,
              maxItems: 20,
              items: {
                type: 'object',
                properties: {
                  term: { type: 'string' },
                  meaningZh: {
                    type: 'string',
                    description: 'Concise Chinese meaning in this context.',
                  },
                  collocation: {
                    type: 'string',
                    description:
                      'One natural English collocation or short chunk using the word.',
                  },
                  example: {
                    type: 'string',
                    description:
                      'One natural English example sentence, preferably from or close to the generated article.',
                  },
                  core: {
                    type: 'boolean',
                    description:
                      'True for the highest-value words that the article and review cards should prioritise.',
                  },
                },
                required: [
                  'term',
                  'meaningZh',
                  'collocation',
                  'example',
                  'core',
                ],
              },
            },
          },
          required: ['themeZh', 'themeEn', 'noteZh', 'words'],
        },
      },
      articleTitle: {
        type: 'string',
        description: 'A short natural title for the generated article.',
      },
      article: {
        type: 'string',
        description:
          'A coherent original English article or dialogue that uses the core words naturally. Plain text, blank lines between paragraphs.',
      },
      usedWords: {
        type: 'array',
        items: { type: 'string' },
        description: 'Input words that appear in the article.',
      },
      unusedWords: {
        type: 'array',
        items: { type: 'string' },
        description: 'Input words that could not be used naturally.',
      },
      ...PACK_TOOL.input_schema.properties,
    },
    required: [
      'title',
      'overviewZh',
      'groups',
      'articleTitle',
      'article',
      'usedWords',
      'unusedWords',
      ...PACK_TOOL.input_schema.required,
    ],
  },
} as const

const WRITING_PROMPT_TOOL = {
  name: 'submit_writing_task',
  description:
    'Return a practical writing task and an argument map that the learner can use to write in their own words.',
  input_schema: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description:
          'The writing task in English, 1–4 sentences, with a real audience and purpose. Include the target length.',
      },
      contextZh: {
        type: 'string',
        description:
          'One or two Chinese sentences explaining the situation and what the learner needs to write.',
      },
      argumentMap: {
        type: 'object',
        properties: {
          thesis: {
            type: 'string',
            description:
              'One clear English sentence stating a possible stance, main point, theme or central impression.',
          },
          points: {
            type: 'array',
            minItems: 2,
            maxItems: 4,
            items: {
              type: 'object',
              properties: {
                claim: {
                  type: 'string',
                  description: 'An English claim or beat that supports the thesis.',
                },
                support: {
                  type: 'string',
                  description:
                    'A reason, explanation or detail in English that develops the claim.',
                },
                example: {
                  type: 'string',
                  description:
                    'A specific example, image or piece of evidence in English.',
                },
              },
              required: ['claim', 'support', 'example'],
            },
          },
          counterargument: {
            type: 'string',
            description:
              'An alternative view, objection or anticipated concern in English.',
          },
          usefulChunks: {
            type: 'array',
            minItems: 4,
            maxItems: 8,
            items: {
              type: 'object',
              properties: {
                phrase: {
                  type: 'string',
                  description:
                    'A useful English phrase, collocation or sentence frame for this task.',
                },
                meaningZh: {
                  type: 'string',
                  description: 'Concise Chinese meaning and when to use it.',
                },
              },
              required: ['phrase', 'meaningZh'],
            },
          },
          structure: {
            type: 'array',
            minItems: 3,
            maxItems: 5,
            items: { type: 'string' },
            description:
              'An outline item with a Chinese stage label and brief English guidance, e.g. 开头 · 改写题目并明确立场。',
          },
        },
        required: [
          'thesis',
          'points',
          'counterargument',
          'usefulChunks',
          'structure',
        ],
      },
    },
    required: ['prompt', 'contextZh', 'argumentMap'],
  },
} as const

const WRITING_FEEDBACK_TOOL = {
  name: 'submit_writing_feedback',
  description:
    'Return specific, actionable feedback that preserves the learner’s ideas and voice.',
  input_schema: {
    type: 'object',
    properties: {
      summaryZh: {
        type: 'string',
        description:
          'Two or three Chinese sentences describing what works and the main priority for revision.',
      },
      strengthsZh: {
        type: 'array',
        items: { type: 'string' },
        minItems: 2,
        maxItems: 3,
        description: 'Two or three specific strengths in Chinese.',
      },
      improvements: {
        type: 'array',
        minItems: 2,
        maxItems: 4,
        items: {
          type: 'object',
          properties: {
            issueZh: {
              type: 'string',
              description: 'The issue or opportunity in Chinese, short and specific.',
            },
            original: {
              type: 'string',
              description: 'An exact phrase or sentence from the learner’s draft.',
            },
            better: {
              type: 'string',
              description:
                'A corrected or stronger English version that keeps the writer’s meaning.',
            },
            whyZh: {
              type: 'string',
              description: 'Why the change helps, explained in Chinese.',
            },
          },
          required: ['issueZh', 'original', 'better', 'whyZh'],
        },
      },
      nextStepZh: {
        type: 'string',
        description:
          'One concrete 5–10 minute revision or practice step in Chinese.',
      },
      improvedDraft: {
        type: 'string',
        description:
          'A light edit of the complete draft that preserves its ideas, structure and voice. Correct errors and improve clarity; do not add new arguments or rewrite it as your own essay.',
      },
    },
    required: [
      'summaryZh',
      'strengthsZh',
      'improvements',
      'nextStepZh',
      'improvedDraft',
    ],
  },
} as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function coerceBody(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function errorResult(
  status: number,
  code: string,
  error: string,
): AiHttpResult {
  return { status, body: { ok: false, code, error } }
}

function readFocusWords(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined

  const words = value
    .filter(isString)
    .map((word) => word.trim())
    .filter((word) => word.length <= 60)
    .slice(0, MAX_FOCUS_WORDS)

  return words.length > 0 ? words : undefined
}

function buildPackPrompts(input: {
  title: string
  text: string
  focusWords?: string[]
}): { system: string; user: string } {
  const focus = input.focusWords?.length
    ? `\nThe material was written from this target word list. Prioritise these items: include every target item that actually appears in the text in the vocab list before adding other words.\nTarget list: ${input.focusWords.join(', ')}\n`
    : ''

  return {
    system: `You are the senior English curriculum designer inside LinguaDesk, a personal study app for an adult Chinese learner who wants practical English for real conversation, reading and writing rather than exam tricks.
Rules:
- Work only from the supplied text. Never invent quotations or facts.
- Learner-facing explanations, summaries and rationales must be in Simplified Chinese. English examples, key sentences and questions stay in English.
- Choose useful words, chunks and structures that the learner can reuse in speaking and writing.
- Questions must test comprehension or natural usage, not trivia.
- Fill every field in the tool. Do not use markdown.`,
    user: `TITLE: ${input.title}

TEXT:
${input.text}
${focus}
Create a learning pack with:
- summary: 80–140 Chinese characters, faithful and specific.
- keyPoints: 2–4 short English sentences from the text (quotes or close paraphrase).
- vocab: 8–12 items normally; if a target list is supplied, include every target item that appears and add a few other high-value items (maximum 18). term = base form or a short chunk. meaningZh = concise Chinese. example = an exact sentence from the text containing it.
- patterns: 3–5 useful structures. Use an English pattern label, Chinese explanation, and an exact example from the text.
- questions: exactly 4. Make 3 kind=choice and 1 kind=open. Choice questions: English prompt; sentence = a short exact context quote, or a cloze sentence with ____; exactly 4 plausible choices; correct answerIndex; referenceAnswer; Chinese rationale. Open question: English prompt, choices [], answerIndex 0, sentence "", English model referenceAnswer, Chinese rationale.
- dictation: 4–5 exact sentences from the text, each 8–22 words. Hint in Chinese with the word count and 1–2 keywords, never the whole sentence.
- retell: a Chinese 45–60 second retelling prompt, plus 3 outline anchors mixing Chinese stage labels with English anchors.

Return only by calling submit_learning_pack.`,
  }
}

function buildArticlePrompts(input: ArticleFromWordsInput): {
  system: string
  user: string
} {
  const [minWords, maxWords] = LENGTH_RANGES[input.length]
  const levelBrief: Record<ArticleLevel, string> = {
    A2:
      'A2: short, high-frequency sentences; simple past/present; concrete vocabulary; limited subordinate clauses.',
    B1:
      'B1: clear connected prose; common tenses; some linking devices; vocabulary a intermediate learner can mostly infer.',
    B2:
      'B2: natural, varied sentences; some less common vocabulary and connectors; appropriate for a confident learner.',
    C1:
      'C1: nuanced, idiomatic and varied language; sophisticated connectors; still coherent and learnable.',
  }

  return {
    system: `You are an expert English writer and language teacher creating original reading material for a Chinese learner. Write natural, coherent English that sounds like real usage, not a vocabulary exercise.
Rules:
- Use the target words/chunks in meaningful, varied contexts. Naturalness comes first; do not stuff them in.
- Do not add a glossary, definitions, translations, bold/underlining, numbering, or meta commentary.
- Do not mention that this was generated for a word list.
- Use inflections of target words when natural.
- Return everything by calling submit_article; no markdown.`,
    user: `Write an original ${GENRE_LABELS[input.genre]} in English.
Level: ${levelBrief[input.level]}
Length: ${minWords}–${maxWords} words.
${input.scenario?.trim() ? `Scenario / theme: ${input.scenario.trim()}\n` : ''}Target words and chunks (use as many as fit naturally):
${input.words.map((word) => `- ${word}`).join('\n')}

For ${input.genre}:
- article: 3–5 paragraphs, one clear central idea.
- story: a small arc with a character, a turn, and an ending.
- dialogue: 10–16 natural exchanges with speaker labels (A: / B:).
- email: a realistic email with a subject line, greeting, body and sign-off.

Return usedWords as the exact target strings that appear in the text; put the rest in unusedWords. Do not claim a target word is used if it is absent.`,
  }
}

function buildAutoMaterialPrompts(input: AutoMaterialInput): {
  system: string
  user: string
} {
  const [minWords, maxWords] = LENGTH_RANGES[input.length]
  const levelBrief: Record<ArticleLevel, string> = {
    A2:
      'A2: short, high-frequency sentences; simple past/present; concrete vocabulary; limited subordinate clauses.',
    B1:
      'B1: clear connected prose; common tenses; some linking devices; vocabulary an intermediate learner can mostly infer.',
    B2:
      'B2: natural, varied sentences; some less common vocabulary and connectors; appropriate for a confident learner.',
    C1:
      'C1: nuanced, idiomatic and varied language; sophisticated connectors; still coherent and learnable.',
  }

  return {
    system: `You are the curriculum designer and staff writer inside LinguaDesk, a quiet study app for an adult Chinese learner who wants practical English for work, travel and daily life rather than exam tricks.
Create one complete lesson from scratch. The generated text must sound like real English and the learning pack must refer only to that text.
Rules:
- Never use markdown, headings inside the text, glossaries or translations in the text.
- The summary, rationale and explanations are in Simplified Chinese; examples, questions and key sentences are in English.
- Make the lesson useful, specific and free of exam clichés. Avoid generic motivational filler.
- Fill every field in the tool.`,
    user: `Write an original ${GENRE_LABELS[input.genre]} in English.
Level: ${levelBrief[input.level]}
Length: ${minWords}–${maxWords} words.
${
  input.topic?.trim()
    ? `Topic / situation: ${input.topic.trim()}`
    : 'Topic: choose one specific, practical situation an adult learner might really meet (work, travel, health, home, technology or everyday conversation). Do not ask for more input; choose it yourself.'
}

Then create a complete learning pack about exactly this text:
- title: a short natural title.
- text: the complete article/story/dialogue/email, plain text with blank lines between paragraphs.
- summary: 80–140 Chinese characters, faithful and specific.
- keyPoints: 2–4 short English sentences from the text.
- vocab: 8–12 useful items. term is the base form or short chunk; meaningZh is Chinese; example must be an exact sentence from the generated text.
- patterns: 3–5 useful structures with English label, Chinese explanation and exact example from the text.
- questions: exactly 4. Make 3 kind=choice and 1 kind=open. Choice questions need 4 plausible choices, answerIndex, referenceAnswer and Chinese rationale. Open question has choices [], answerIndex 0, sentence "", English referenceAnswer and Chinese rationale.
- dictation: 4–5 exact sentences from the text, each 8–22 words, with a Chinese hint that does not reveal the full sentence.
- retell: a Chinese 45–60 second retelling prompt plus 3 outline anchors mixing Chinese stage labels with English anchors.

Return only by calling submit_auto_material.`,
  }
}

function parseAutoMaterialInput(
  raw: Record<string, unknown>,
): AutoMaterialInput | { error: string } {
  if (!LEVELS.includes(raw.level as ArticleLevel)) {
    return { error: '生成等级不合法。' }
  }
  if (!LENGTHS.includes(raw.length as ArticleLength)) {
    return { error: '生成长度不合法。' }
  }
  if (!GENRES.includes(raw.genre as ArticleGenre)) {
    return { error: '生成体裁不合法。' }
  }
  if (raw.topic !== undefined && typeof raw.topic !== 'string') {
    return { error: '生成主题不合法。' }
  }
  return {
    level: raw.level as ArticleLevel,
    length: raw.length as ArticleLength,
    genre: raw.genre as ArticleGenre,
    topic:
      typeof raw.topic === 'string'
        ? raw.topic.trim().slice(0, 240)
        : undefined,
  }
}

// ---------------------------------------------------------------------------
// DeepSeek web search + image understanding
// ---------------------------------------------------------------------------

const MAX_IMAGE_DATA_URL_CHARS = 5_800_000
const IMAGE_DATA_URL_PATTERN =
  /^data:image\/(?:jpeg|png|gif|webp);base64,[A-Za-z0-9+/=]+$/i

function parseWebSearchInput(raw: Record<string, unknown>):
  | { query: string; count: number; needContent: boolean }
  | { error: string } {
  if (typeof raw.query !== 'string') {
    return { error: '搜索词不合法。' }
  }
  const query = raw.query.trim()
  const length = [...query].length
  if (length < 2 || length > 128) {
    return { error: '搜索词需要 2–128 个字符。' }
  }

  const count =
    typeof raw.count === 'number' && Number.isFinite(raw.count)
      ? Math.min(Math.max(Math.round(raw.count), 1), 20)
      : 8

  return {
    query,
    count,
    needContent: raw.needContent !== false,
  }
}

/**
 * LinguaDesk reads English, so prefer English pages unless the learner chose
 * a language explicitly. `lang:` has a 128-character query budget.
 */
function preferEnglishSources(query: string): string {
  if (/\blang:/i.test(query)) return query
  const withLang = `${query} lang:en`
  return [...withLang].length <= 128 ? withLang : query
}

function parseSearchLessonInput(
  raw: Record<string, unknown>,
):
  | {
      query: string
      level: ArticleLevel
      length: ArticleLength
      genre: ArticleGenre
    }
  | { error: string } {
  const search = parseWebSearchInput(raw)
  if ('error' in search) return search

  if (!LEVELS.includes(raw.level as ArticleLevel)) {
    return { error: '生成等级不合法。' }
  }
  if (!LENGTHS.includes(raw.length as ArticleLength)) {
    return { error: '生成长度不合法。' }
  }
  if (!GENRES.includes(raw.genre as ArticleGenre)) {
    return { error: '生成体裁不合法。' }
  }

  return {
    query: search.query,
    level: raw.level as ArticleLevel,
    length: raw.length as ArticleLength,
    genre: raw.genre as ArticleGenre,
  }
}

function trimSourceText(value: string, max: number): string {
  const clean = value.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max)}…` : clean
}

function buildSearchLessonPrompts(
  input: {
    query: string
    level: ArticleLevel
    length: ArticleLength
    genre: ArticleGenre
  },
  sources: WebSearchSource[],
): { system: string; user: string } {
  const [minWords, maxWords] = LENGTH_RANGES[input.length]
  const levelBrief: Record<ArticleLevel, string> = {
    A2:
      'A2: short, high-frequency sentences; simple past/present; concrete vocabulary; limited subordinate clauses.',
    B1:
      'B1: clear connected prose; common tenses; some linking devices; vocabulary an intermediate learner can mostly infer.',
    B2:
      'B2: natural, varied sentences; some less common vocabulary and connectors; appropriate for a confident learner.',
    C1:
      'C1: nuanced, idiomatic and varied language; sophisticated connectors; still coherent and learnable.',
  }

  const sourceBlocks = sources
    .map((source, index) => {
      const published = source.date ? ` (${source.date.slice(0, 10)})` : ''
      const summary = trimSourceText(source.summary || source.snippet, 900)
      const content = trimSourceText(source.content, 1800)
      return [
        `[${index + 1}] ${source.title}${published}`,
        `Site: ${source.siteName || 'unknown'} · trusted score: ${source.authority ?? -1}/4`,
        `URL: ${source.url}`,
        summary ? `Summary: ${summary}` : '',
        content ? `Excerpt: ${content}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n\n')

  return {
    system: `You are the curriculum designer and staff writer inside LinguaDesk, a quiet study app for an adult Chinese learner who wants practical English for real life.
You are given fresh web search results. Turn them into one original, accurate English lesson.
Rules:
- Base every factual claim on the supplied sources. Never invent names, numbers, dates or quotations.
- Do not copy source sentences verbatim. Paraphrase and synthesise in your own words.
- Prefer the most authoritative and recent result when sources conflict; reflect uncertainty honestly in the Chinese summary.
- Never put URLs, citations, markdown, headings or Chinese inside the generated English text.
- The learning pack must refer only to the text you wrote, not to the search snippets.
- Chinese summaries and explanations; English examples, questions and key sentences.
- Fill every field in the tool. No markdown.`,
    user: `SEARCH QUERY: ${input.query}

REAL WEB SOURCES:
${sourceBlocks}

Write an original ${GENRE_LABELS[input.genre]} in English.
Level: ${levelBrief[input.level]}
Length: ${minWords}–${maxWords} words.
${
  input.genre === 'article'
    ? 'Use the sources to explain what is happening now, why it matters and what it means for an ordinary reader.'
    : 'Stay grounded in the facts from the sources, but shape them for this genre.'
}

Then create a complete learning pack about exactly this text:
- title: a short, natural, specific English title.
- text: the complete article/story/dialogue/email, plain text with blank lines between paragraphs.
- summary: 80–140 Chinese characters that also mentions this is based on recent reporting.
- keyPoints: 2–4 short English sentences from your text.
- vocab: 8–12 useful items. example must be an exact sentence from your text.
- patterns: 3–5 useful structures with English label, Chinese explanation and exact example from your text.
- questions: exactly 4. Make 3 kind=choice and 1 kind=open. Choice questions need 4 plausible choices, answerIndex, referenceAnswer and Chinese rationale. Open question has choices [], answerIndex 0, sentence "", English referenceAnswer and Chinese rationale.
- dictation: 4–5 exact sentences from your text, each 8–22 words, with a Chinese hint that does not reveal the full sentence.
- retell: a Chinese 45–60 second retelling prompt plus 3 outline anchors mixing Chinese stage labels with English anchors.

Return only by calling submit_auto_material.`,
  }
}

function parseImageInput(raw: Record<string, unknown>):
  | { imageDataUrl: string; mode: 'extract' | 'describe'; hint?: string }
  | { error: string } {
  if (typeof raw.image !== 'string') {
    return { error: '缺少图片数据。' }
  }
  const imageDataUrl = raw.image.trim()
  if (
    imageDataUrl.length > MAX_IMAGE_DATA_URL_CHARS ||
    !IMAGE_DATA_URL_PATTERN.test(imageDataUrl)
  ) {
    return {
      error:
        '图片需要是 5 MB 以内的 JPEG / PNG / WebP / GIF（请重新选择，让浏览器先压缩）。',
    }
  }
  if (raw.mode !== 'extract' && raw.mode !== 'describe') {
    return { error: '图片处理方式不合法。' }
  }
  if (raw.hint !== undefined && typeof raw.hint !== 'string') {
    return { error: '图片提示不合法。' }
  }

  return {
    imageDataUrl,
    mode: raw.mode,
    hint:
      typeof raw.hint === 'string'
        ? raw.hint.trim().slice(0, 240) || undefined
        : undefined,
  }
}

function buildImagePrompts(input: {
  mode: 'extract' | 'describe'
  hint?: string
}): { system: string; user: string } {
  if (input.mode === 'extract') {
    return {
      system: `You are the OCR and reading assistant inside LinguaDesk, an English learning app for an adult Chinese learner.
Rules:
- Transcribe the English text visible in the image exactly.
- Preserve the original spelling, punctuation and paragraph structure. Keep headings and list items on their own lines.
- Do not translate, summarise, correct grammar, explain or add commentary.
- Ignore page numbers, watermarks, interface chrome and non-English text unless it is part of a bilingual passage.
- Return plain text only, with no markdown fences.
- If the image contains no meaningful English text, return exactly: NO_TEXT`,
      user: `Extract the English text from this image.${
        input.hint ? `\nFocus: ${input.hint}` : ''
      }`,
    }
  }

  return {
    system: `You are the curriculum designer and staff writer inside LinguaDesk, an English learning app for an adult Chinese learner.
Describe the supplied image as a short piece of natural English reading material.
Rules:
- Describe only what is visible or can be reasonably inferred. Do not invent facts, names or backstory.
- Write 140–220 words in 2–4 paragraphs, with a clear central impression and concrete details.
- Natural, useful English at the learner's level; no markdown, headings, bullet lists, Chinese or commentary.
- Return exactly:
TITLE: <a short English title of at most 70 characters>
<blank line>
<the passage>`,
    user: `Write a short English passage describing this image.${
      input.hint ? `\nThe learner wants you to focus on: ${input.hint}` : ''
    }`,
  }
}

function parseImageOutput(
  raw: string,
  mode: 'extract' | 'describe',
): { title: string; text: string } {
  let text = raw
    .replace(/^```[a-zA-Z]*\s*/g, '')
    .replace(/```$/g, '')
    .trim()

  if (mode === 'describe') {
    const match = text.match(/^TITLE:\s*(.+?)\s*\n+([\s\S]+)$/i)
    if (match) {
      return {
        title: match[1].replace(/^["“]|["”]$/g, '').trim().slice(0, 90),
        text: match[2].trim(),
      }
    }
  }

  return { title: '', text }
}

function buildAutoListeningPrompts(input: AutoListeningInput): {
  system: string
  user: string
} {
  const levelBrief: Record<AutoListeningLevel, string> = {
    B1: 'B1: clear, fairly short spoken sentences; common vocabulary; natural linking words.',
    B2: 'B2: natural connected speech; varied sentence length; some idiomatic chunks.',
    C1: 'C1: fluent, nuanced spoken English; natural reductions and sophisticated connectors, still clear.',
  }
  const range: Record<AutoListeningLevel, string> = {
    B1: '90–130 words',
    B2: '120–170 words',
    C1: '150–210 words',
  }
  const lengthNote =
    input.length === 'short'
      ? 'about 60–90 seconds when read aloud'
      : 'about 2 minutes when read aloud'

  return {
    system: `You write listening material for LinguaDesk, a personal English study app for an adult Chinese learner.
The text will be read by a text-to-speech voice and used for sentence-by-sentence dictation and whole-passage reconstruction.
Rules:
- Write natural spoken-style English, not an essay and not an exam lecture.
- Use contractions, short pauses, signposting and a clear beginning, middle and end.
- No headings, bullet lists, speaker labels, stage directions, translations, markdown or meta commentary.
- Keep the content specific and practical: one person talking about a real situation, decision or small story.
- Fill every field in the tool.`,
    user: `Create one listening transcript.
Level: ${levelBrief[input.level]}
Target length: ${range[input.level]} (${lengthNote}).
${
  input.topic?.trim()
    ? `Topic / situation: ${input.topic.trim()}`
    : 'Topic: choose a specific everyday or work situation that an adult learner would plausibly listen to. Do not ask for more input.'
}

Return a short title and the complete transcript. The transcript should be 3–5 short paragraphs of connected speech, with natural discourse markers such as "so", "actually", "the thing is" and "in the end" where they fit. Do not include a summary or questions.

Return only by calling submit_auto_listening.`,
  }
}

function parseAutoListeningInput(
  raw: Record<string, unknown>,
): AutoListeningInput | { error: string } {
  if (!LISTENING_LEVELS.includes(raw.level as AutoListeningLevel)) {
    return { error: '听力等级不合法。' }
  }
  if (!LISTENING_LENGTHS.includes(raw.length as AutoListeningLength)) {
    return { error: '听力长度不合法。' }
  }
  if (raw.topic !== undefined && typeof raw.topic !== 'string') {
    return { error: '听力主题不合法。' }
  }
  return {
    level: raw.level as AutoListeningLevel,
    length: raw.length as AutoListeningLength,
    topic:
      typeof raw.topic === 'string'
        ? raw.topic.trim().slice(0, 240)
        : undefined,
  }
}

function parseWordBatchInput(
  raw: Record<string, unknown>,
): WordBatchInput | { error: string } {
  if (!Array.isArray(raw.words)) {
    return { error: '词表格式不合法。' }
  }
  if (!LEVELS.includes(raw.level as ArticleLevel)) {
    return { error: '词汇等级不合法。' }
  }
  if (raw.topic !== undefined && typeof raw.topic !== 'string') {
    return { error: '词汇主题不合法。' }
  }

  const seen = new Set<string>()
  const words: WordBatchInputWord[] = []
  for (const item of raw.words) {
    const term =
      typeof item === 'string'
        ? item.trim()
        : isRecord(item) && typeof item.term === 'string'
          ? item.term.trim()
          : ''
    if (!term || term.length > 60) continue
    const key = term.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const noteZh =
      isRecord(item) && typeof item.noteZh === 'string'
        ? item.noteZh.trim().slice(0, 120)
        : undefined
    words.push({ term, noteZh: noteZh || undefined })
    if (words.length >= MAX_BATCH_WORDS) break
  }

  if (words.length < 6) {
    return { error: '词表整理至少需要 6 个不同的英文词或短语。' }
  }

  return {
    words,
    level: raw.level as ArticleLevel,
    topic:
      typeof raw.topic === 'string'
        ? raw.topic.trim().slice(0, 240)
        : undefined,
  }
}

function buildWordBatchPrompts(input: WordBatchInput): {
  system: string
  user: string
} {
  const levelBrief: Record<ArticleLevel, string> = {
    A2: 'A2: simple, high-frequency language; short sentences; concrete examples.',
    B1: 'B1: clear connected language; common tenses; vocabulary an intermediate learner can mostly infer.',
    B2: 'B2: natural, varied language; some less common vocabulary and connectors.',
    C1: 'C1: nuanced, idiomatic language; sophisticated but still coherent.',
  }

  const wordLines = input.words
    .map((word) =>
      word.noteZh ? `- ${word.term} (learner note: ${word.noteZh})` : `- ${word.term}`,
    )
    .join('\n')

  return {
    system: `You are a senior English curriculum designer and editor inside LinguaDesk. An adult Chinese learner has dumped a messy, fragmented word list. Your job is to turn it into a clean, directly learnable lesson, not to return another list.
Rules:
- Every input word must appear exactly once across the groups. Keep the learner's spelling when reasonable; use the base form only when it is clearly a different inflection.
- Group the words by meaning, situation or function so the learner can study them together. Do not group alphabetically.
- Write concise Chinese meanings, natural English collocations and short natural example sentences.
- Mark 12–18 highest-value words as core=true; the rest false.
- The article must be coherent English that uses all core words and as many other words as fit naturally. Never write a word dump.
- The learning pack must be about exactly this article. Chinese explanations; English examples, questions and key sentences.
- No markdown. Fill every field in the tool.`,
    user: `LEVEL: ${input.level} — ${levelBrief[input.level]}
${input.topic?.trim() ? `TOPIC / SITUATION: ${input.topic.trim()}\n` : ''}
MESSY WORD LIST:
${wordLines}

First organise all words into 2–4 meaningful groups. For each word provide meaningZh, a natural collocation, an example sentence and core (boolean).
Then write a coherent article (220–320 words) that uses the core words and as many others as possible. Put every input word in exactly one group; list the ones that appear in the article in usedWords, the rest in unusedWords.
Then build the complete learning pack for that article:
- summary 80–140 Chinese characters
- keyPoints 2–4 short English sentences from the article
- vocab 10–14 core items with exact article examples
- patterns 3–4 with Chinese explanations and exact examples
- questions exactly 3: 2 choice + 1 open, with answers and Chinese rationales
- dictation 3–4 exact article sentences, each 8–22 words, with Chinese hints
- retell: Chinese 45–60 second prompt plus 3 outline anchors

Return only by calling submit_word_batch.`,
  }
}

function parseWritingTaskInput(
  raw: Record<string, unknown>,
): WritingTaskInput | { error: string } {
  if (!WRITING_CATEGORIES.includes(raw.category as WritingCategory)) {
    return { error: '写作话题不合法。' }
  }
  if (!WRITING_TASKS.includes(raw.taskType as WritingTaskType)) {
    return { error: '写作体裁不合法。' }
  }
  if (!WRITING_LEVELS.includes(raw.level as WritingLevel)) {
    return { error: '写作等级不合法。' }
  }
  if (
    typeof raw.targetWords !== 'number' ||
    !WRITING_TARGETS.includes(raw.targetWords)
  ) {
    return { error: '目标字数不合法。' }
  }

  return {
    category: raw.category as WritingCategory,
    taskType: raw.taskType as WritingTaskType,
    level: raw.level as WritingLevel,
    targetWords: raw.targetWords,
  }
}

function parseWritingFeedbackInput(
  raw: Record<string, unknown>,
): WritingFeedbackInput | { error: string } {
  const task = parseWritingTaskInput(raw)
  if ('error' in task) return task

  if (
    !isString(raw.prompt) ||
    raw.prompt.trim().length < 10 ||
    raw.prompt.length > 4000
  ) {
    return { error: '写作题目不合法。' }
  }
  if (
    !isString(raw.draft) ||
    raw.draft.trim().length < 20 ||
    raw.draft.length > 8000
  ) {
    return { error: '草稿太短或过长，无法反馈。' }
  }

  return {
    ...task,
    prompt: raw.prompt.trim(),
    draft: raw.draft.trim(),
  }
}

function buildWritingTaskPrompts(input: WritingTaskInput): {
  system: string
  user: string
} {
  const levelBrief: Record<WritingLevel, string> = {
    B1: 'B1: clear, connected sentences; common vocabulary; a reader can follow the ideas without effort.',
    B2:
      'B2: natural paragraphing; varied sentence structures; some less common vocabulary and useful connectors.',
    C1:
      'C1: nuanced, idiomatic and flexible language; sophisticated but still clear organisation.',
  }

  const taskBrief: Record<WritingTaskType, string> = {
    opinion:
      'An opinion piece with a real question worth answering. The argument map needs a clear stance, three developed reasons/examples, and one genuine counterpoint.',
    email:
      'A real email to a named recipient with a concrete purpose. The argument map should cover the main request/point, the key pieces of information, one anticipated concern, and useful email phrases (greetings, softeners, closings).',
    message:
      'A short, natural message to a real person (friend, colleague, landlord, etc.). Keep the tone appropriate; the map should cover the main point, supporting details, an anticipated reaction, and useful conversational chunks.',
    story:
      'A small story with a character, a situation and a turn. The "thesis" is the theme or emotional centre; the points are story beats; the counterargument is an alternative turn or tension to consider.',
    description:
      'A description of a place, experience or simple process. The thesis is the central impression; the points are concrete sensory/detail angles; the counterargument is what would make the description feel overloaded or generic.',
  }

  return {
    system: `You are a senior English writing coach inside LinguaDesk, working with an adult Chinese learner who wants to write useful, natural English for real life, not exam templates.
Rules:
- Return a practical writing task in English and an idea map in English, not a finished model essay.
- The Chinese context explains the situation; all writing prompts, thesis statements, reasons, examples and phrases are in English.
- The map is scaffolding, not a script: give options and language, not paragraphs the learner can copy wholesale.
- Choose details that fit the category and genre. Avoid clichés and fake-sounding exam topics.
- Fill every field in the tool. No markdown.`,
    user: `Create a writing task.
Category: ${WRITING_CATEGORY_LABELS[input.category]}
Genre: ${WRITING_TASK_LABELS[input.taskType]}
Level: ${input.level} — ${levelBrief[input.level]}
Target length: about ${input.targetWords} English words.
Task guidance: ${taskBrief[input.taskType]}

The task prompt must include a real audience/purpose and the target length. Write contextZh in Simplified Chinese (1–2 sentences).
Argument map:
- thesis: one clear English stance/main point/theme.
- points: exactly 3, each with claim (English), support (English reason/development), example (English concrete detail).
- counterargument: one alternative view, objection, anticipated concern or alternative narrative direction in English.
- usefulChunks: 5–7 reusable English phrases/collocations/frames with concise Chinese meanings.
- structure: 3–5 outline steps, each with a Chinese stage label and short English guidance.

Return only by calling submit_writing_task.`,
  }
}

function buildWritingFeedbackPrompts(input: WritingFeedbackInput): {
  system: string
  user: string
} {
  return {
    system: `You are a careful English writing editor for an adult Chinese learner. Your job is to help the learner revise their own work, not to replace their voice.
Rules:
- Give feedback in Simplified Chinese; quotes, corrections and the improved draft are in English.
- Be specific and kind. Quote the learner's actual words. Avoid generic praise and vague advice.
- Identify only the 2–4 highest-leverage issues; do not overwhelm.
- Preserve the learner's ideas, structure and personality. The improvedDraft is a light edit, not a full rewrite and not an essay with new ideas.
- Check whether the draft fulfils the task and target length; mention gaps, but do not pad it for the learner.
- No marks, scores, grades or exam rubrics.
- Fill every tool field. No markdown.`,
    user: `Category: ${WRITING_CATEGORY_LABELS[input.category]}
Genre: ${WRITING_TASK_LABELS[input.taskType]}
Level: ${input.level}
Target length: about ${input.targetWords} words.

TASK PROMPT:
${input.prompt}

LEARNER DRAFT:
"""
${input.draft}
"""

Return:
- summaryZh: 2–3 Chinese sentences on what works and the main revision priority.
- strengthsZh: 2–3 specific strengths.
- improvements: 2–4 items; each with issueZh (Chinese), original (exact quote from the draft), better (English improvement preserving meaning), whyZh (Chinese).
- nextStepZh: one concrete 5–10 minute revision or practice step.
- improvedDraft: a light edit of the complete draft. Keep the same ideas and approximate length.

Return only by calling submit_writing_feedback.`,
  }
}

function parsePackInput(raw: Record<string, unknown>):
  | { title: string; text: string; focusWords?: string[] }
  | { error: string } {
  if (!isString(raw.title) || raw.title.length > 200) {
    return { error: '标题不合法。' }
  }
  if (!isString(raw.text) || raw.text.trim().length < 50) {
    return { error: '正文太短，无法生成学习包。' }
  }

  return {
    title: raw.title.trim(),
    text: raw.text.trim().slice(0, MAX_PACK_TEXT),
    focusWords: readFocusWords(raw.focusWords),
  }
}

function parseArticleInput(
  raw: Record<string, unknown>,
): ArticleFromWordsInput | { error: string } {
  const words = Array.isArray(raw.words)
    ? raw.words
        .filter(isString)
        .map((word) => word.trim())
        .filter((word) => word.length > 0 && word.length <= 60)
    : []

  if (words.length < 3 || words.length > 30) {
    return { error: '词表需要 3–30 个英文词或短语。' }
  }
  if (!LEVELS.includes(raw.level as ArticleLevel)) {
    return { error: '等级不合法。' }
  }
  if (!LENGTHS.includes(raw.length as ArticleLength)) {
    return { error: '长度不合法。' }
  }
  if (!GENRES.includes(raw.genre as ArticleGenre)) {
    return { error: '体裁不合法。' }
  }
  if (raw.scenario !== undefined && typeof raw.scenario !== 'string') {
    return { error: '场景说明不合法。' }
  }

  return {
    words: [...new Set(words)],
    level: raw.level as ArticleLevel,
    length: raw.length as ArticleLength,
    genre: raw.genre as ArticleGenre,
    scenario:
      typeof raw.scenario === 'string'
        ? raw.scenario.trim().slice(0, 240)
        : undefined,
  }
}

export async function handleAiRequest(
  input: unknown,
  config: AiRuntimeConfig,
): Promise<AiHttpResult> {
  const body = coerceBody(input)
  if (!isRecord(body) || typeof body.task !== 'string') {
    return errorResult(400, 'BAD_REQUEST', '请求格式不合法。')
  }

  const task = body.task

  if (task === 'web-search') {
    const parsed = parseWebSearchInput(body)
    if ('error' in parsed) {
      return errorResult(400, 'BAD_REQUEST', parsed.error)
    }
    return callWebSearch(config, {
      ...parsed,
      query: preferEnglishSources(parsed.query),
    })
  }

  if (task === 'search-lesson') {
    const parsed = parseSearchLessonInput(body)
    if ('error' in parsed) {
      return errorResult(400, 'BAD_REQUEST', parsed.error)
    }

    const searchResult = await callWebSearch(config, {
      query: preferEnglishSources(parsed.query),
      count: 6,
      needContent: true,
    })
    if (searchResult.status !== 200) return searchResult

    const results = Array.isArray(
      (searchResult.body as { results?: WebSearchSource[] }).results,
    )
      ? (searchResult.body as { results: WebSearchSource[] }).results
      : []
    const sources = results
      .filter(
        (source) =>
          source.summary.trim().length > 0 ||
          source.content.trim().length > 0 ||
          source.snippet.trim().length > 0,
      )
      .slice(0, 5)

    if (sources.length === 0) {
      return errorResult(
        502,
        'SEARCH_EMPTY',
        '这次搜索没有找到可用结果，换一个更具体的搜索词试试。',
      )
    }

    const prompts = buildSearchLessonPrompts(parsed, sources)
    const requestedProvider =
      typeof body.provider === 'string' && body.provider !== 'auto'
        ? body.provider
        : undefined
    const generated = await callStructured({
      config: requestedProvider
        ? { ...config, provider: requestedProvider }
        : config,
      task,
      system: prompts.system,
      user: prompts.user,
      tool: AUTO_MATERIAL_TOOL,
      maxTokens: 7000,
      temperature: 0.6,
    })
    if (generated.status !== 200) return generated

    return {
      status: 200,
      body: {
        ...(generated.body as Record<string, unknown>),
        sources: sources.map((source) => ({
          title: source.title,
          url: source.url,
          snippet: source.snippet,
          summary: source.summary,
          content: '',
          siteName: source.siteName,
          siteIcon: source.siteIcon,
          date: source.date,
          authority: source.authority,
          rerankScore: source.rerankScore,
        })),
      },
    }
  }

  if (task === 'image-text') {
    const parsed = parseImageInput(body)
    if ('error' in parsed) {
      return errorResult(400, 'BAD_REQUEST', parsed.error)
    }

    const prompts = buildImagePrompts(parsed)
    const result = await callVision(config, {
      imageDataUrl: parsed.imageDataUrl,
      system: prompts.system,
      user: prompts.user,
    })
    if (result.status !== 200) return result

    const payload = result.body as {
      provider?: string
      model?: string
      text?: string
      usage?: unknown
    }
    const rawText = typeof payload.text === 'string' ? payload.text : ''
    if (/^NO_TEXT\b/i.test(rawText.trim())) {
      return errorResult(
        422,
        'IMAGE_NO_TEXT',
        '这张图片里没有可用的英文文字。可以换成「看图写一段」，或换一张更清晰的图片。',
      )
    }

    const parsedOutput = parseImageOutput(rawText, parsed.mode)
    if (parsedOutput.text.trim().length < 20) {
      return errorResult(
        502,
        'IMAGE_TOO_SHORT',
        '图片里能读出的内容太少，请换一张更清晰、文字更多的图片。',
      )
    }

    return {
      status: 200,
      body: {
        ok: true,
        provider: payload.provider ?? 'deepseek',
        model: payload.model,
        task,
        title: parsedOutput.title,
        text: parsedOutput.text,
        usage: payload.usage,
      },
    }
  }

  let system: string
  let user: string
  let tool: AiTool
  let maxTokens: number
  let temperature: number

  if (task === 'learning-pack') {
    const parsed = parsePackInput(body)
    if ('error' in parsed) return errorResult(400, 'BAD_REQUEST', parsed.error)
    const prompts = buildPackPrompts(parsed)
    system = prompts.system
    user = prompts.user
    tool = PACK_TOOL
    maxTokens = 6000
    temperature = 0.2
  } else if (task === 'article-from-words') {
    const parsed = parseArticleInput(body)
    if ('error' in parsed) return errorResult(400, 'BAD_REQUEST', parsed.error)
    const prompts = buildArticlePrompts(parsed)
    system = prompts.system
    user = prompts.user
    tool = ARTICLE_TOOL
    maxTokens = 2800
    temperature = 0.65
  } else if (task === 'auto-material') {
    const parsed = parseAutoMaterialInput(body)
    if ('error' in parsed) return errorResult(400, 'BAD_REQUEST', parsed.error)
    const prompts = buildAutoMaterialPrompts(parsed)
    system = prompts.system
    user = prompts.user
    tool = AUTO_MATERIAL_TOOL
    maxTokens = 7000
    temperature = 0.7
  } else if (task === 'auto-listening') {
    const parsed = parseAutoListeningInput(body)
    if ('error' in parsed) return errorResult(400, 'BAD_REQUEST', parsed.error)
    const prompts = buildAutoListeningPrompts(parsed)
    system = prompts.system
    user = prompts.user
    tool = AUTO_LISTENING_TOOL
    maxTokens = 1800
    temperature = 0.75
  } else if (task === 'word-batch') {
    const parsed = parseWordBatchInput(body)
    if ('error' in parsed) return errorResult(400, 'BAD_REQUEST', parsed.error)
    const prompts = buildWordBatchPrompts(parsed)
    system = prompts.system
    user = prompts.user
    tool = WORD_BATCH_TOOL
    maxTokens = 7500
    temperature = 0.55
  } else if (task === 'writing-task') {
    const parsed = parseWritingTaskInput(body)
    if ('error' in parsed) return errorResult(400, 'BAD_REQUEST', parsed.error)
    const prompts = buildWritingTaskPrompts(parsed)
    system = prompts.system
    user = prompts.user
    tool = WRITING_PROMPT_TOOL
    maxTokens = 3200
    temperature = 0.65
  } else if (task === 'speaking-reply') {
    const parsed = parseSpeakingReplyInput(body)
    if ('error' in parsed) return errorResult(400, 'BAD_REQUEST', parsed.error)
    const prompts = buildSpeakingReplyPrompts(parsed)
    system = prompts.system
    user = prompts.user
    tool = SPEAKING_REPLY_TOOL
    maxTokens = 900
    temperature = 0.7
  } else if (task === 'speaking-feedback') {
    const parsed = parseSpeakingFeedbackInput(body)
    if ('error' in parsed) return errorResult(400, 'BAD_REQUEST', parsed.error)
    const prompts = buildSpeakingFeedbackPrompts(parsed)
    system = prompts.system
    user = prompts.user
    tool = SPEAKING_FEEDBACK_TOOL
    maxTokens = 3500
    temperature = 0.25
  } else if (task === 'writing-feedback') {
    const parsed = parseWritingFeedbackInput(body)
    if ('error' in parsed) return errorResult(400, 'BAD_REQUEST', parsed.error)
    const prompts = buildWritingFeedbackPrompts(parsed)
    system = prompts.system
    user = prompts.user
    tool = WRITING_FEEDBACK_TOOL
    maxTokens = 4500
    temperature = 0.25
  } else {
    return errorResult(400, 'BAD_REQUEST', '未知的生成任务。')
  }

  const requestedProvider =
    typeof body.provider === 'string' && body.provider !== 'auto'
      ? body.provider
      : undefined
  const effectiveConfig = requestedProvider
    ? { ...config, provider: requestedProvider }
    : config

  return callStructured({
    config: effectiveConfig,
    task,
    system,
    user,
    tool,
    maxTokens,
    temperature,
  })
}
