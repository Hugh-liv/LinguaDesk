export interface VocabItem {
  term: string
  meaningZh: string
  example: string
}

export interface PatternItem {
  pattern: string
  explanationZh: string
  example: string
}

export interface ChoiceQuestion {
  id: string
  kind: 'choice'
  prompt: string
  sentence: string
  choices: string[]
  answerIndex: number
  rationaleZh: string
}

export interface OpenQuestion {
  id: string
  kind: 'open'
  prompt: string
  referenceAnswer: string
  rationaleZh?: string
}

export type QuestionItem = ChoiceQuestion | OpenQuestion

export interface DictationItem {
  id: string
  text: string
  hint: string
}

export interface RetellPlan {
  promptZh: string
  outline: string[]
}

export type PackGeneratorId = 'local-heuristic' | 'ai'

export interface LearningPack {
  version: 1
  generator: PackGeneratorId
  generatorLabel: string
  sourceWordCount: number
  title: string
  summary: string
  keyPoints: string[]
  vocab: VocabItem[]
  patterns: PatternItem[]
  questions: QuestionItem[]
  dictation: DictationItem[]
  retell: RetellPlan
  createdAt: number
}

export interface PackGenerationInput {
  title: string
  text: string
  /** Target words from a "words → article" import; the AI pack should include them. */
  focusWords?: string[]
}

export type ArticleLevel = 'A2' | 'B1' | 'B2' | 'C1'
export type ArticleLength = 'short' | 'medium' | 'long'
export type ArticleGenre = 'article' | 'story' | 'dialogue' | 'email'

export interface ArticleFromWordsInput {
  words: string[]
  level: ArticleLevel
  length: ArticleLength
  genre: ArticleGenre
  scenario?: string
}

export interface GeneratedArticle {
  title: string
  article: string
  usedWords: string[]
  unusedWords: string[]
}

export type WritingCategory =
  | 'daily'
  | 'work'
  | 'technology'
  | 'environment'
  | 'relationships'
  | 'education'
  | 'health'
  | 'culture'

export type WritingTaskType =
  | 'opinion'
  | 'email'
  | 'message'
  | 'story'
  | 'description'

export type WritingLevel = 'B1' | 'B2' | 'C1'

export interface WritingTaskInput {
  category: WritingCategory
  taskType: WritingTaskType
  level: WritingLevel
  targetWords: number
}

export interface WritingArgumentPoint {
  claim: string
  support: string
  example: string
}

export interface WritingArgumentChunk {
  phrase: string
  meaningZh: string
}

export interface WritingArgumentMap {
  thesis: string
  points: WritingArgumentPoint[]
  counterargument: string
  usefulChunks: WritingArgumentChunk[]
  structure: string[]
}

export interface WritingPromptData {
  prompt: string
  contextZh: string
  argumentMap: WritingArgumentMap
}

export interface WritingFeedbackImprovement {
  issueZh: string
  original: string
  better: string
  whyZh: string
}

export interface WritingFeedback {
  summaryZh: string
  strengthsZh: string[]
  improvements: WritingFeedbackImprovement[]
  nextStepZh: string
  improvedDraft: string
}

export interface WritingFeedbackInput extends WritingTaskInput {
  prompt: string
  draft: string
}

export interface PackGenerator {
  id: string
  label: string
  generate(input: PackGenerationInput): Promise<LearningPack>
}

export type SpeakingLevel = 'B1' | 'B2' | 'C1'

export type SpeakingProgress = 'not_yet' | 'mostly' | 'done'

export interface SpeakingTurn {
  role: 'assistant' | 'user'
  text: string
}

export interface SpeakingScenarioBase {
  scenarioId: string
  scenarioTitle: string
  scenarioZh: string
  role: string
  userGoalZh: string
  level: SpeakingLevel
}

export interface SpeakingReplyInput extends SpeakingScenarioBase {
  history: SpeakingTurn[]
  opening?: boolean
}

export interface SpeakingReply {
  reply: string
  objectiveProgress: SpeakingProgress
  cueZh: string
}

export interface SpeakingImprovement {
  original: string
  better: string
  whyZh: string
}

export interface SpeakingPhrase {
  phrase: string
  meaningZh: string
}

export interface SpeakingFeedback {
  summaryZh: string
  strengthsZh: string[]
  improvements: SpeakingImprovement[]
  usefulPhrases: SpeakingPhrase[]
  nextTakeZh: string
  canDoZh: string
}

export interface SpeakingFeedbackInput extends SpeakingScenarioBase {
  history: SpeakingTurn[]
}

/** One-click lesson generation when the desk is empty. */
export interface AutoMaterialInput {
  level: ArticleLevel
  length: ArticleLength
  genre: ArticleGenre
  topic?: string
}

export interface AutoMaterialResult {
  title: string
  text: string
  pack: LearningPack
}

/** A result returned by DeepSeek's /v1/tools/search endpoint. */
export interface WebSearchSource {
  title: string
  url: string
  snippet: string
  summary: string
  content: string
  siteName?: string | null
  siteIcon?: string | null
  date?: string | null
  authority?: number
  rerankScore?: number | null
}

export interface WebSearchInput {
  query: string
  count?: number
}

export interface SearchLessonInput {
  query: string
  level: ArticleLevel
  length: ArticleLength
  genre: ArticleGenre
}

export interface SearchLessonResult extends AutoMaterialResult {
  sources: WebSearchSource[]
}

export type ImageMaterialMode = 'extract' | 'describe'

export interface ImageMaterialInput {
  /** Base64 data URL, already downscaled by the browser. */
  image: string
  mode: ImageMaterialMode
  hint?: string
}

export interface ImageMaterialResult {
  title: string
  text: string
  model?: string
}

/** A messy word list organised into themes, examples and a study pack. */
export interface WordBatchInputWord {
  term: string
  noteZh?: string
}

export interface WordBatchInput {
  words: WordBatchInputWord[]
  level: ArticleLevel
  topic?: string
}

export interface WordBatchWord {
  term: string
  meaningZh: string
  collocation: string
  example: string
  core: boolean
}

export interface WordBatchGroup {
  themeZh: string
  themeEn: string
  noteZh: string
  words: WordBatchWord[]
}

export interface WordBatchPlan {
  title: string
  overviewZh: string
  groups: WordBatchGroup[]
  articleTitle: string
  article: string
  usedWords: string[]
  unusedWords: string[]
}

export interface WordBatchResult {
  plan: WordBatchPlan
  pack: LearningPack
}

/** A short piece of spoken-style English generated for the listening desk. */
export type AutoListeningLevel = 'B1' | 'B2' | 'C1'
export type AutoListeningLength = 'short' | 'medium'

export interface AutoListeningInput {
  level: AutoListeningLevel
  length: AutoListeningLength
  topic?: string
}

export interface AutoListeningResult {
  title: string
  transcript: string
}
