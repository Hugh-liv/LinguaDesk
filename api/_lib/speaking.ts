import type {
  SpeakingFeedbackInput,
  SpeakingLevel,
  SpeakingReplyInput,
  SpeakingTurn,
} from '../../src/lib/ai/types.ts'

const SPEAKING_LEVELS: SpeakingLevel[] = ['B1', 'B2', 'C1']

const SPEAKING_REPLY_TOOL = {
  name: 'submit_speaking_reply',
  description:
    'Reply in character to the learner and track their scenario goal.',
  input_schema: {
    type: 'object',
    properties: {
      reply: {
        type: 'string',
        description:
          'A natural English reply in character, 1–3 sentences. No corrections, meta-commentary or Chinese.',
      },
      objectiveProgress: {
        type: 'string',
        enum: ['not_yet', 'mostly', 'done'],
      },
      cueZh: {
        type: 'string',
        description:
          'An optional short Chinese hint if the learner is stuck; use "" otherwise.',
      },
    },
    required: ['reply', 'objectiveProgress', 'cueZh'],
  },
} as const

const SPEAKING_FEEDBACK_TOOL = {
  name: 'submit_speaking_feedback',
  description:
    'Give specific, actionable feedback on a spoken roleplay without replacing the learner’s voice.',
  input_schema: {
    type: 'object',
    properties: {
      summaryZh: {
        type: 'string',
        description:
          'Two or three Chinese sentences on what worked and the main priority for the next take.',
      },
      strengthsZh: {
        type: 'array',
        items: { type: 'string' },
        minItems: 2,
        maxItems: 3,
      },
      improvements: {
        type: 'array',
        minItems: 2,
        maxItems: 4,
        items: {
          type: 'object',
          properties: {
            original: {
              type: 'string',
              description: 'An exact phrase the learner said.',
            },
            better: {
              type: 'string',
              description:
                'A natural English alternative that keeps the learner’s meaning.',
            },
            whyZh: { type: 'string' },
          },
          required: ['original', 'better', 'whyZh'],
        },
      },
      usefulPhrases: {
        type: 'array',
        minItems: 3,
        maxItems: 6,
        items: {
          type: 'object',
          properties: {
            phrase: { type: 'string' },
            meaningZh: { type: 'string' },
          },
          required: ['phrase', 'meaningZh'],
        },
      },
      nextTakeZh: { type: 'string' },
      canDoZh: { type: 'string' },
    },
    required: [
      'summaryZh',
      'strengthsZh',
      'improvements',
      'usefulPhrases',
      'nextTakeZh',
      'canDoZh',
    ],
  },
} as const

export { SPEAKING_REPLY_TOOL, SPEAKING_FEEDBACK_TOOL }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function readSpeakingHistory(value: unknown): SpeakingTurn[] | null {
  if (!Array.isArray(value)) return null

  const turns: SpeakingTurn[] = []
  for (const raw of value.slice(0, 40)) {
    if (!isRecord(raw)) continue
    const role =
      raw.role === 'user'
        ? ('user' as const)
        : raw.role === 'assistant'
          ? ('assistant' as const)
          : null
    const text = typeof raw.text === 'string' ? raw.text.trim() : ''
    if (!role || !text || text.length > 2000) continue
    turns.push({ role, text })
  }
  return turns
}

function parseSpeakingBase(raw: Record<string, unknown>):
  | {
      scenarioId: string
      scenarioTitle: string
      scenarioZh: string
      role: string
      userGoalZh: string
      level: SpeakingLevel
    }
  | { error: string } {
  if (!isString(raw.scenarioId) || raw.scenarioId.length > 80) {
    return { error: '口语场景不合法。' }
  }
  if (!isString(raw.scenarioTitle) || raw.scenarioTitle.length > 120) {
    return { error: '口语场景标题不合法。' }
  }
  if (!isString(raw.scenarioZh) || raw.scenarioZh.length > 800) {
    return { error: '口语场景说明不合法。' }
  }
  if (!isString(raw.role) || raw.role.length > 300) {
    return { error: '口语角色不合法。' }
  }
  if (!isString(raw.userGoalZh) || raw.userGoalZh.length > 300) {
    return { error: '口语目标不合法。' }
  }
  if (!SPEAKING_LEVELS.includes(raw.level as SpeakingLevel)) {
    return { error: '口语等级不合法。' }
  }
  return {
    scenarioId: raw.scenarioId.trim(),
    scenarioTitle: raw.scenarioTitle.trim(),
    scenarioZh: raw.scenarioZh.trim(),
    role: raw.role.trim(),
    userGoalZh: raw.userGoalZh.trim(),
    level: raw.level as SpeakingLevel,
  }
}

export function parseSpeakingReplyInput(
  raw: Record<string, unknown>,
): SpeakingReplyInput | { error: string } {
  const base = parseSpeakingBase(raw)
  if ('error' in base) return base
  const history = readSpeakingHistory(raw.history)
  if (history === null) return { error: '对话历史不合法。' }
  return { ...base, history, opening: raw.opening === true }
}

export function parseSpeakingFeedbackInput(
  raw: Record<string, unknown>,
): SpeakingFeedbackInput | { error: string } {
  const base = parseSpeakingBase(raw)
  if ('error' in base) return base
  const history = readSpeakingHistory(raw.history)
  if (history === null) return { error: '对话历史不合法。' }
  if (!history.some((turn) => turn.role === 'user')) {
    return { error: '还没有你的发言，无法生成口语反馈。' }
  }
  return { ...base, history }
}

export function buildSpeakingReplyPrompts(input: SpeakingReplyInput): {
  system: string
  user: string
} {
  const transcript =
    input.history.length === 0
      ? '(The conversation has not started yet. Open the scene naturally.)'
      : input.history
          .map(
            (turn) =>
              `${turn.role === 'user' ? 'LEARNER' : 'YOU'}: ${turn.text}`,
          )
          .join('\n')

  return {
    system: `You are a roleplay partner inside LinguaDesk, speaking with an adult Chinese learner.
Rules:
- Stay in character. Reply in natural English only, usually 1–3 sentences.
- Match the learner's level. Ask at most one question at a time.
- Do not correct grammar or give mini-lectures during the roleplay. Do not mention that this is practice.
- Keep the scenario moving toward the learner's can-do goal.
- cueZh is a very short Chinese hint only if the learner seems genuinely stuck; otherwise return an empty string.
- Fill every field in the tool.`,
    user: `SCENARIO: ${input.scenarioTitle}
SETTING (Chinese): ${input.scenarioZh}
YOUR ROLE: ${input.role}
LEARNER'S GOAL: ${input.userGoalZh}
LEVEL: ${input.level}

TRANSCRIPT:
${transcript}

${
  input.history.length === 0
    ? 'Open the scene in character now: greet the learner and start the conversation.'
    : 'Respond to the learner’s last line in character, then continue naturally.'
}

Return only by calling submit_speaking_reply.`,
  }
}

export function buildSpeakingFeedbackPrompts(input: SpeakingFeedbackInput): {
  system: string
  user: string
} {
  const transcript = input.history
    .map((turn) => `${turn.role === 'user' ? 'LEARNER' : 'AI'}: ${turn.text}`)
    .join('\n')

  return {
    system: `You are an English speaking coach for an adult Chinese learner.
Rules:
- Give feedback in Simplified Chinese; English only in quotes and example phrases.
- Quote the learner's actual words. Be specific, kind and practical.
- Focus on 2–4 highest-leverage changes; no scores, rankings or exam rubrics.
- Preserve the learner's voice. Do not rewrite the whole conversation.
- usefulPhrases must be reusable chunks for this scenario.
- Fill every field in the tool.`,
    user: `SCENARIO: ${input.scenarioTitle}
SETTING (Chinese): ${input.scenarioZh}
AI ROLE: ${input.role}
LEARNER'S GOAL: ${input.userGoalZh}
LEVEL: ${input.level}

TRANSCRIPT:
${transcript}

Return a short summary, 2–3 strengths, 2–4 improvements (exact original → better English + Chinese why), 3–6 useful phrases, one next-take instruction, and one can-do statement in Chinese. Return only by calling submit_speaking_feedback.`,
  }
}
