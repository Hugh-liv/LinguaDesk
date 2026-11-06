import { supabase } from '../cloud/supabase'
import { newId } from '../ids'
import { countWords, deriveTitle } from '../text'
import type {
  ArticleFromWordsInput,
  AutoListeningInput,
  AutoListeningResult,
  AutoMaterialInput,
  AutoMaterialResult,
  ChoiceQuestion,
  DictationItem,
  GeneratedArticle,
  ImageMaterialInput,
  ImageMaterialResult,
  LearningPack,
  OpenQuestion,
  PackGenerationInput,
  PatternItem,
  QuestionItem,
  RetellPlan,
  SearchLessonInput,
  SearchLessonResult,
  SpeakingFeedback,
  SpeakingFeedbackInput,
  SpeakingReply,
  SpeakingReplyInput,
  VocabItem,
  WebSearchInput,
  WebSearchSource,
  WordBatchGroup,
  WordBatchInput,
  WordBatchPlan,
  WordBatchResult,
  WordBatchWord,
  WritingArgumentChunk,
  WritingArgumentMap,
  WritingArgumentPoint,
  WritingFeedback,
  WritingFeedbackImprovement,
  WritingFeedbackInput,
  WritingPromptData,
  WritingTaskInput,
} from './types'

interface ApiEnvelope {
  ok?: boolean
  code?: string
  error?: string
  data?: unknown
  model?: string
  provider?: string
  providers?: Record<string, unknown>
  capabilities?: Record<string, unknown>
  defaultProvider?: string | null
  results?: unknown
  sources?: unknown
  text?: unknown
  title?: unknown
}

export type AiProviderPreference = 'auto' | 'anthropic' | 'deepseek'

export interface ProviderAvailability {
  anthropic: boolean
  deepseek: boolean
  search: boolean
  vision: boolean
  visionModel: string | null
  defaultProvider: 'anthropic' | 'deepseek' | null
}

const PROVIDER_STORAGE_KEY = 'linguadesk:ai-provider'

export function getProviderPreference(): AiProviderPreference {
  try {
    const value = localStorage.getItem(PROVIDER_STORAGE_KEY)
    return value === 'anthropic' || value === 'deepseek' ? value : 'auto'
  } catch {
    return 'auto'
  }
}

export function setProviderPreference(
  value: AiProviderPreference,
): void {
  try {
    if (value === 'auto') localStorage.removeItem(PROVIDER_STORAGE_KEY)
    else localStorage.setItem(PROVIDER_STORAGE_KEY, value)
  } catch {
    // A blocked localStorage should not break the rest of the app.
  }
}

async function fetchGeneratedAvailability(): Promise<ProviderAvailability> {
  let response: Response
  try {
    response = await fetch('/api/generate', {
      method: 'GET',
      headers: { accept: 'application/json' },
      cache: 'no-store',
    })
  } catch {
    throw new AiRequestError(
      '无法连接 AI 配置接口。请检查网络，或确认 API 代理正在运行。',
      { code: 'AI_CONFIG_UNAVAILABLE' },
    )
  }

  if (!response.ok) {
    throw new AiRequestError(
      `AI 配置接口返回 HTTP ${response.status}。请检查 Vercel Serverless Function 是否部署，或打开 /api/health 诊断。`,
      { code: 'AI_CONFIG_UNAVAILABLE', status: response.status },
    )
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    throw new AiRequestError(
      'AI 配置接口返回了网页而不是 JSON。Vercel 可能没有部署 api/ 函数，请确认 Root Directory 是仓库根目录，并打开 /api/health 检查。',
      { code: 'AI_CONFIG_UNAVAILABLE' },
    )
  }

  let payload: ApiEnvelope
  try {
    payload = (await response.json()) as ApiEnvelope
  } catch {
    throw new AiRequestError(
      'AI 配置接口返回了无法解析的 JSON。请查看 Vercel Functions 日志。',
      { code: 'AI_CONFIG_UNAVAILABLE' },
    )
  }
  if (!payload.ok) {
    throw new AiRequestError(
      payload.error || '服务端 AI 配置不可用。',
      { code: payload.code || 'AI_CONFIG_UNAVAILABLE' },
    )
  }

  const providers = isRecord(payload.providers) ? payload.providers : {}
  const capabilities = isRecord(payload.capabilities)
    ? payload.capabilities
    : {}
  return {
    anthropic: providers.anthropic === true,
    deepseek: providers.deepseek === true,
    search: capabilities.search === true,
    vision: capabilities.vision === true,
    visionModel: asString(capabilities.visionModel) || null,
    defaultProvider:
      payload.defaultProvider === 'anthropic' ||
      payload.defaultProvider === 'deepseek'
        ? payload.defaultProvider
        : null,
  }
}

async function fetchHealthAvailability(): Promise<ProviderAvailability | null> {
  try {
    const response = await fetch('/api/health', {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    })
    if (!response.ok) return null
    const payload = (await response.json()) as Record<string, unknown>
    if (payload.ok !== true || payload.serverless !== true) return null
    const ai = isRecord(payload.ai) ? payload.ai : {}
    const provider = asString(ai.provider)
    return {
      anthropic: ai.anthropic === true,
      deepseek: ai.deepseek === true,
      search: ai.search === true,
      vision: ai.vision === true,
      visionModel: null,
      defaultProvider:
        provider === 'anthropic' || provider === 'deepseek' ? provider : null,
    }
  } catch {
    return null
  }
}

export async function fetchProviderAvailability(): Promise<ProviderAvailability> {
  try {
    return await fetchGeneratedAvailability()
  } catch (error) {
    // /api/generate and /api/health are separate functions. If only the
    // config route is failing, health still gives the app enough information
    // to render a useful state instead of a dead-end error.
    const health = await fetchHealthAvailability()
    if (health) return health
    throw error
  }
}

export class AiRequestError extends Error {
  readonly code?: string
  readonly status: number

  constructor(
    message: string,
    options: { code?: string; status?: number } = {},
  ) {
    super(message)
    this.name = 'AiRequestError'
    this.code = options.code
    this.status = options.status ?? 0
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
    : []
}

interface AiCallResult {
  data: unknown
  model?: string
  results?: unknown
  sources?: unknown
  text?: unknown
  title?: unknown
}

async function callAi(
  body: unknown,
  options: { timeoutMs?: number } = {},
): Promise<AiCallResult> {
  const controller = new AbortController()
  const timeout = window.setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 75_000,
  )

  try {
    const preference = getProviderPreference()
    const requestBody =
      preference === 'auto' || !isRecord(body)
        ? body
        : { ...body, provider: preference }

    const headers: Record<string, string> = {
      'content-type': 'application/json',
    }
    if (supabase) {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.access_token) {
        headers.authorization = `Bearer ${session.access_token}`
      }
    }

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })

    let payload: ApiEnvelope | null = null
    try {
      payload = (await response.json()) as ApiEnvelope
    } catch {
      payload = null
    }

    if (!response.ok || !payload?.ok) {
      const code = payload?.code
      const message =
        code === 'AUTH_REQUIRED'
          ? '请先在「我的 → 云同步」登录，再使用 AI。本地学习功能不受影响。'
          : code === 'AUTH_CONFIG'
            ? '云端登录校验还没有配置好。请联系管理员检查 Vercel 的 Supabase 环境变量。'
            : payload?.error || 'AI 服务暂时不可用，请稍后再试。'
      throw new AiRequestError(message, {
        code,
        status: response.status,
      })
    }

    return {
      data: payload.data,
      model: payload.model,
      results: payload.results,
      sources: payload.sources,
      text: payload.text,
      title: payload.title,
    }
  } catch (error) {
    if (error instanceof AiRequestError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new AiRequestError('AI 生成超时，请重新试一次。', {
        code: 'AI_TIMEOUT',
      })
    }
    throw new AiRequestError('连接 AI 服务失败，请检查网络后重试。', {
      code: 'AI_NETWORK',
    })
  } finally {
    window.clearTimeout(timeout)
  }
}

function modelLabel(model?: string): string {
  if (!model) return 'AI'
  const value = model.toLowerCase()
  if (value.includes('deepseek')) return 'DeepSeek'
  if (value.includes('opus')) return 'Claude Opus'
  if (value.includes('haiku')) return 'Claude Haiku'
  if (value.includes('sonnet')) return 'Claude Sonnet'
  return model
}

function normalizeQuestion(raw: unknown): QuestionItem | null {
  if (!isRecord(raw)) return null

  const prompt = asString(raw.prompt)
  if (!prompt) return null
  const rationaleZh = asString(raw.rationaleZh)
  const sentence = asString(raw.sentence)

  if (raw.kind === 'open') {
    const referenceAnswer = asString(raw.referenceAnswer)
    if (!referenceAnswer) return null
    const question: OpenQuestion = {
      id: newId(),
      kind: 'open',
      prompt,
      referenceAnswer,
      rationaleZh: rationaleZh || undefined,
    }
    return question
  }

  const choices = asStringArray(raw.choices)
  const answerIndex =
    typeof raw.answerIndex === 'number' && Number.isInteger(raw.answerIndex)
      ? raw.answerIndex
      : 0

  if (choices.length < 2 || answerIndex < 0 || answerIndex >= choices.length) {
    return null
  }

  const referenceAnswer = asString(raw.referenceAnswer, choices[answerIndex])
  const question: ChoiceQuestion = {
    id: newId(),
    kind: 'choice',
    prompt,
    sentence,
    choices,
    answerIndex,
    rationaleZh: rationaleZh || `参考答案：${referenceAnswer}`,
  }
  return question
}

function normalizePack(
  raw: unknown,
  input: PackGenerationInput,
  model?: string,
): LearningPack {
  if (!isRecord(raw)) {
    throw new AiRequestError('AI 返回了无法识别的学习包。', {
      code: 'AI_BAD_RESPONSE',
    })
  }

  const summary = asString(raw.summary)
  if (!summary) {
    throw new AiRequestError('AI 没有返回摘要。', {
      code: 'AI_BAD_RESPONSE',
    })
  }

  const vocab: VocabItem[] = (Array.isArray(raw.vocab) ? raw.vocab : [])
    .map((item): VocabItem | null => {
      if (!isRecord(item)) return null
      const term = asString(item.term)
      const example = asString(item.example)
      if (!term || !example) return null
      return {
        term,
        meaningZh: asString(item.meaningZh),
        example,
      }
    })
    .filter((item): item is VocabItem => item !== null)

  if (vocab.length === 0) {
    throw new AiRequestError('AI 没有返回可用词汇。', {
      code: 'AI_BAD_RESPONSE',
    })
  }

  const patterns: PatternItem[] = (Array.isArray(raw.patterns) ? raw.patterns : [])
    .map((item): PatternItem | null => {
      if (!isRecord(item)) return null
      const pattern = asString(item.pattern)
      const explanationZh = asString(item.explanationZh)
      const example = asString(item.example)
      if (!pattern || !example) return null
      return { pattern, explanationZh, example }
    })
    .filter((item): item is PatternItem => item !== null)

  const questions = (Array.isArray(raw.questions) ? raw.questions : [])
    .map(normalizeQuestion)
    .filter((item): item is QuestionItem => item !== null)

  const dictation: DictationItem[] = (
    Array.isArray(raw.dictation) ? raw.dictation : []
  )
    .map((item): DictationItem | null => {
      if (!isRecord(item)) return null
      const text = asString(item.text)
      if (!text) return null
      return {
        id: newId(),
        text,
        hint:
          asString(item.hint) ||
          `${countWords(text)} 个词 · 来自原文`,
      }
    })
    .filter((item): item is DictationItem => item !== null)

  const retellRaw = isRecord(raw.retell) ? raw.retell : {}
  const retell: RetellPlan = {
    promptZh:
      asString(retellRaw.promptZh) ||
      `用 45–60 秒复述《${input.title}》，先说主题，再补细节，最后收束。`,
    outline: asStringArray(retellRaw.outline).slice(0, 4),
  }

  return {
    version: 1,
    generator: 'ai',
    generatorLabel: modelLabel(model),
    sourceWordCount: countWords(input.text),
    title: input.title,
    summary,
    keyPoints: asStringArray(raw.keyPoints).slice(0, 4),
    vocab: vocab.slice(0, 18),
    patterns: patterns.slice(0, 5),
    questions: questions.slice(0, 5),
    dictation: dictation.slice(0, 6),
    retell,
    createdAt: Date.now(),
  }
}

export async function generatePackWithAi(
  input: PackGenerationInput,
): Promise<LearningPack> {
  const result = await callAi({
    task: 'learning-pack',
    title: input.title,
    text: input.text,
    focusWords: input.focusWords,
  })

  return normalizePack(result.data, input, result.model)
}

function cleanGeneratedText(raw: unknown, title: string): string {
  let text = asString(raw)
    .replace(/^```[a-zA-Z]*\s*/g, '')
    .replace(/```$/g, '')
    .trim()

  const lines = text.split(/\r?\n/)
  const firstLine = lines[0]?.replace(/^#{1,6}\s*/, '').trim()
  if (firstLine && firstLine.toLowerCase() === title.toLowerCase()) {
    text = lines.slice(1).join('\n').trim()
  }
  return text
}

function normalizeAutoMaterialData(
  raw: unknown,
  model?: string,
): AutoMaterialResult {
  if (!isRecord(raw)) {
    throw new AiRequestError('AI 返回了无法识别的材料。', {
      code: 'AI_BAD_RESPONSE',
    })
  }

  const title =
    asString(raw.title).slice(0, 80) || deriveTitle(asString(raw.text))
  const text = cleanGeneratedText(raw.text, title)
  if (countWords(text) < 80) {
    throw new AiRequestError('AI 生成的材料太短，请重新生成。', {
      code: 'AI_BAD_RESPONSE',
    })
  }

  return {
    title,
    text,
    pack: normalizePack(raw, { title, text }, model),
  }
}

export async function generateAutoMaterial(
  input: AutoMaterialInput,
): Promise<AutoMaterialResult> {
  const result = await callAi({
    task: 'auto-material',
    ...input,
  })

  return normalizeAutoMaterialData(result.data, result.model)
}

function normalizeSearchSource(raw: unknown): WebSearchSource | null {
  if (!isRecord(raw)) return null

  const url = asString(raw.url)
  if (!/^https?:\/\//i.test(url)) return null

  return {
    title: asString(raw.title).slice(0, 200) || url,
    url,
    snippet: asString(raw.snippet),
    summary: asString(raw.summary),
    content: asString(raw.content),
    siteName: asString(raw.siteName) || null,
    siteIcon: asString(raw.siteIcon) || null,
    date: asString(raw.date) || null,
    authority: typeof raw.authority === 'number' ? raw.authority : -1,
    rerankScore: typeof raw.rerankScore === 'number' ? raw.rerankScore : null,
  }
}

export async function searchWeb(
  input: WebSearchInput,
): Promise<WebSearchSource[]> {
  const result = await callAi(
    {
      task: 'web-search',
      query: input.query,
      count: input.count ?? 8,
    },
    { timeoutMs: 45_000 },
  )

  const rawResults = Array.isArray(result.results) ? result.results : []
  return rawResults
    .map(normalizeSearchSource)
    .filter((item): item is WebSearchSource => item !== null)
}

export async function generateSearchLesson(
  input: SearchLessonInput,
): Promise<SearchLessonResult> {
  const result = await callAi(
    {
      task: 'search-lesson',
      ...input,
    },
    { timeoutMs: 120_000 },
  )

  const material = normalizeAutoMaterialData(result.data, result.model)
  const rawSources = Array.isArray(result.sources) ? result.sources : []
  const sources = rawSources
    .map(normalizeSearchSource)
    .filter((item): item is WebSearchSource => item !== null)

  return { ...material, sources }
}

export async function extractImageMaterial(
  input: ImageMaterialInput,
): Promise<ImageMaterialResult> {
  const result = await callAi(
    {
      task: 'image-text',
      image: input.image,
      mode: input.mode,
      hint: input.hint,
    },
    { timeoutMs: 120_000 },
  )

  const text =
    asString(result.text) ||
    (isRecord(result.data) ? asString(result.data.text) : '')
  if (!text) {
    throw new AiRequestError('图片里没有读出可用内容，请换一张图片。', {
      code: 'IMAGE_EMPTY',
    })
  }

  const title = asString(result.title)
  return {
    title: title || deriveTitle(text),
    text,
    model: result.model,
  }
}

export async function generateAutoListening(
  input: AutoListeningInput,
): Promise<AutoListeningResult> {
  const result = await callAi({
    task: 'auto-listening',
    ...input,
  })

  if (!isRecord(result.data)) {
    throw new AiRequestError('AI 返回了无法识别的听力。', {
      code: 'AI_BAD_RESPONSE',
    })
  }

  const title =
    asString(result.data.title).slice(0, 80) ||
    deriveTitle(asString(result.data.transcript))
  const transcript = cleanGeneratedText(result.data.transcript, title)
  if (countWords(transcript) < 40) {
    throw new AiRequestError('AI 生成的听力太短，请重新生成。', {
      code: 'AI_BAD_RESPONSE',
    })
  }

  return { title, transcript }
}

function normalizeWordBatchGroup(raw: unknown): WordBatchGroup | null {
  if (!isRecord(raw) || !Array.isArray(raw.words)) return null
  const words: WordBatchWord[] = raw.words
    .map((item): WordBatchWord | null => {
      if (!isRecord(item)) return null
      const term = asString(item.term)
      if (!term) return null
      return {
        term,
        meaningZh: asString(item.meaningZh),
        collocation: asString(item.collocation),
        example: asString(item.example),
        core: item.core === true,
      }
    })
    .filter((item): item is WordBatchWord => item !== null)
    .slice(0, 24)
  if (words.length === 0) return null

  return {
    themeZh: asString(raw.themeZh) || '一组词',
    themeEn: asString(raw.themeEn) || 'Word group',
    noteZh: asString(raw.noteZh),
    words,
  }
}

export async function generateWordBatch(
  input: WordBatchInput,
): Promise<WordBatchResult> {
  const result = await callAi({
    task: 'word-batch',
    ...input,
  })

  if (!isRecord(result.data)) {
    throw new AiRequestError('AI 返回了无法识别的词汇整理。', {
      code: 'AI_BAD_RESPONSE',
    })
  }

  const rawGroups = Array.isArray(result.data.groups)
    ? result.data.groups
    : []
  const groups = rawGroups
    .map(normalizeWordBatchGroup)
    .filter((group): group is WordBatchGroup => group !== null)
    .slice(0, 6)

  if (groups.length === 0) {
    throw new AiRequestError('AI 没有返回词汇分组，请重新整理。', {
      code: 'AI_BAD_RESPONSE',
    })
  }

  const articleTitle =
    asString(result.data.articleTitle).slice(0, 80) ||
    asString(result.data.title).slice(0, 80) ||
    '一篇词汇短文'
  const article = cleanGeneratedText(result.data.article, articleTitle)
  if (countWords(article) < 60) {
    throw new AiRequestError('AI 生成的词汇短文太短，请重新整理。', {
      code: 'AI_BAD_RESPONSE',
    })
  }

  const seen = new Set<string>()
  for (const group of groups) {
    group.words = group.words.filter((word) => {
      const key = word.term.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  const missing = input.words.filter(
    (word) => !seen.has(word.term.toLowerCase()),
  )
  if (missing.length > 0) {
    groups.push({
      themeZh: '补充词',
      themeEn: 'Extra words',
      noteZh: 'AI 没有把这几项放进主题组，单独列在这里。',
      words: missing.map((word) => ({
        term: word.term,
        meaningZh: word.noteZh ?? '',
        collocation: '',
        example: '',
        core: false,
      })),
    })
  }

  const lowerArticle = article.toLowerCase().replace(/’/g, "'")
  const reported = new Set(
    asStringArray(result.data.usedWords).map((word) =>
      word.toLowerCase().replace(/’/g, "'"),
    ),
  )
  const usedWords = input.words
    .map((word) => word.term)
    .filter((term) => {
      const key = term.toLowerCase().replace(/’/g, "'")
      return lowerArticle.includes(key) || reported.has(key)
    })
  const unusedWords = input.words
    .map((word) => word.term)
    .filter((term) => !usedWords.includes(term))

  const title =
    asString(result.data.title).slice(0, 80) ||
    articleTitle
  const plan: WordBatchPlan = {
    title,
    overviewZh:
      asString(result.data.overviewZh) ||
      'AI 已按主题把词表拆开。先学 core 词，再用短文和练习把它们串起来。',
    groups,
    articleTitle,
    article,
    usedWords,
    unusedWords,
  }

  return {
    plan,
    pack: normalizePack(
      result.data,
      { title: articleTitle, text: article },
      result.model,
    ),
  }
}

function normalizeArgumentMap(raw: unknown): WritingArgumentMap {
  if (!isRecord(raw)) {
    throw new AiRequestError('AI 没有返回论点地图。', {
      code: 'AI_BAD_RESPONSE',
    })
  }

  const thesis = asString(raw.thesis)
  if (!thesis) {
    throw new AiRequestError('论点地图缺少中心立场。', {
      code: 'AI_BAD_RESPONSE',
    })
  }

  const points: WritingArgumentPoint[] = (
    Array.isArray(raw.points) ? raw.points : []
  )
    .map((item): WritingArgumentPoint | null => {
      if (!isRecord(item)) return null
      const claim = asString(item.claim)
      if (!claim) return null
      return {
        claim,
        support: asString(item.support),
        example: asString(item.example),
      }
    })
    .filter((item): item is WritingArgumentPoint => item !== null)

  if (points.length === 0) {
    throw new AiRequestError('论点地图缺少论点。', {
      code: 'AI_BAD_RESPONSE',
    })
  }

  const usefulChunks: WritingArgumentChunk[] = (
    Array.isArray(raw.usefulChunks) ? raw.usefulChunks : []
  )
    .map((item): WritingArgumentChunk | null => {
      if (!isRecord(item)) return null
      const phrase = asString(item.phrase)
      if (!phrase) return null
      return { phrase, meaningZh: asString(item.meaningZh) }
    })
    .filter((item): item is WritingArgumentChunk => item !== null)

  return {
    thesis,
    points: points.slice(0, 4),
    counterargument: asString(raw.counterargument),
    usefulChunks: usefulChunks.slice(0, 8),
    structure: asStringArray(raw.structure).slice(0, 5),
  }
}

export async function generateWritingTask(
  input: WritingTaskInput,
): Promise<WritingPromptData> {
  const result = await callAi({
    task: 'writing-task',
    ...input,
  })

  if (!isRecord(result.data)) {
    throw new AiRequestError('AI 返回了无法识别的题目。', {
      code: 'AI_BAD_RESPONSE',
    })
  }

  const prompt = asString(result.data.prompt)
  if (!prompt) {
    throw new AiRequestError('AI 没有返回写作题目。', {
      code: 'AI_BAD_RESPONSE',
    })
  }

  return {
    prompt,
    contextZh:
      asString(result.data.contextZh) || '根据题目完成这次写作。',
    argumentMap: normalizeArgumentMap(result.data.argumentMap),
  }
}

export async function generateWritingFeedback(
  input: WritingFeedbackInput,
): Promise<WritingFeedback> {
  const result = await callAi({
    task: 'writing-feedback',
    ...input,
  })

  if (!isRecord(result.data)) {
    throw new AiRequestError('AI 返回了无法识别的反馈。', {
      code: 'AI_BAD_RESPONSE',
    })
  }

  const summaryZh = asString(result.data.summaryZh)
  if (!summaryZh) {
    throw new AiRequestError('AI 没有返回反馈摘要。', {
      code: 'AI_BAD_RESPONSE',
    })
  }

  const improvements: WritingFeedbackImprovement[] = (
    Array.isArray(result.data.improvements) ? result.data.improvements : []
  )
    .map((item): WritingFeedbackImprovement | null => {
      if (!isRecord(item)) return null
      const issueZh = asString(item.issueZh)
      const original = asString(item.original)
      const better = asString(item.better)
      if (!issueZh || !original || !better) return null
      return {
        issueZh,
        original,
        better,
        whyZh: asString(item.whyZh),
      }
    })
    .filter((item): item is WritingFeedbackImprovement => item !== null)

  return {
    summaryZh,
    strengthsZh: asStringArray(result.data.strengthsZh).slice(0, 4),
    improvements: improvements.slice(0, 5),
    nextStepZh: asString(result.data.nextStepZh),
    improvedDraft: asString(result.data.improvedDraft),
  }
}

export async function generateArticleFromWords(
  input: ArticleFromWordsInput,
): Promise<GeneratedArticle> {
  const result = await callAi({
    task: 'article-from-words',
    ...input,
  })

  if (!isRecord(result.data)) {
    throw new AiRequestError('AI 返回了无法识别的短文。', {
      code: 'AI_BAD_RESPONSE',
    })
  }

  let article = asString(result.data.article)
    .replace(/^```[a-zA-Z]*\s*/g, '')
    .replace(/```$/g, '')
    .trim()

  const title =
    asString(result.data.title).slice(0, 80) || deriveTitle(article)

  // Some models repeat the title as an H1 at the top of the article. Keep the
  // editable title separate so the material list doesn't show it twice.
  const lines = article.split(/\r?\n/)
  const firstLine = lines[0]?.replace(/^#{1,6}\s*/, '').trim()
  if (firstLine && firstLine.toLowerCase() === title.toLowerCase()) {
    article = lines.slice(1).join('\n').trim()
  }

  if (countWords(article) < 60) {
    throw new AiRequestError('生成的短文太短，请调整设置后重试。', {
      code: 'AI_BAD_RESPONSE',
    })
  }

  const lowerArticle = article.toLowerCase().replace(/’/g, "'")
  const reported = new Set(
    asStringArray(result.data.usedWords).map((word) =>
      word.toLowerCase().replace(/’/g, "'"),
    ),
  )

  const usedWords = input.words.filter((word) => {
    const normalized = word.toLowerCase().replace(/’/g, "'")
    return lowerArticle.includes(normalized) || reported.has(normalized)
  })
  const unusedWords = input.words.filter((word) => !usedWords.includes(word))

  return {
    title,
    article,
    usedWords,
    unusedWords,
  }
}


export async function generateSpeakingReply(
  input: SpeakingReplyInput,
): Promise<SpeakingReply> {
  const result = await callAi({
    task: 'speaking-reply',
    ...input,
  })

  if (!isRecord(result.data)) {
    throw new AiRequestError('AI 返回了无法识别的口语回复。', {
      code: 'AI_BAD_RESPONSE',
    })
  }

  const reply = asString(result.data.reply)
  if (!reply) {
    throw new AiRequestError('AI 没有返回口语回复。', {
      code: 'AI_BAD_RESPONSE',
    })
  }

  const progress = result.data.objectiveProgress
  return {
    reply,
    objectiveProgress:
      progress === 'done' || progress === 'mostly' ? progress : 'not_yet',
    cueZh: asString(result.data.cueZh),
  }
}

export async function generateSpeakingFeedback(
  input: SpeakingFeedbackInput,
): Promise<SpeakingFeedback> {
  const result = await callAi({
    task: 'speaking-feedback',
    ...input,
  })

  if (!isRecord(result.data)) {
    throw new AiRequestError('AI 返回了无法识别的口语反馈。', {
      code: 'AI_BAD_RESPONSE',
    })
  }

  const summaryZh = asString(result.data.summaryZh)
  if (!summaryZh) {
    throw new AiRequestError('AI 没有返回口语反馈。', {
      code: 'AI_BAD_RESPONSE',
    })
  }

  const improvements = (Array.isArray(result.data.improvements)
    ? result.data.improvements
    : []
  )
    .filter(isRecord)
    .map((item) => ({
      original: asString(item.original),
      better: asString(item.better),
      whyZh: asString(item.whyZh),
    }))
    .filter((item) => item.original && item.better)
    .slice(0, 4)

  const usefulPhrases = (Array.isArray(result.data.usefulPhrases)
    ? result.data.usefulPhrases
    : []
  )
    .filter(isRecord)
    .map((item) => ({
      phrase: asString(item.phrase),
      meaningZh: asString(item.meaningZh),
    }))
    .filter((item) => item.phrase)
    .slice(0, 6)

  return {
    summaryZh,
    strengthsZh: asStringArray(result.data.strengthsZh).slice(0, 3),
    improvements,
    usefulPhrases,
    nextTakeZh: asString(result.data.nextTakeZh),
    canDoZh: asString(result.data.canDoZh),
  }
}
