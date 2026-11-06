import { Check, ChevronDown, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type {
  ArticleGenre,
  ArticleLength,
  ArticleLevel,
  GeneratedArticle,
} from '@/lib/ai/types'
import {
  MAX_WORD_LIST,
  type ParsedWordList,
} from '@/lib/word-list'
import { cn } from '@/lib/utils'

const LEVELS: Array<{ value: ArticleLevel; label: string }> = [
  { value: 'A2', label: 'A2' },
  { value: 'B1', label: 'B1' },
  { value: 'B2', label: 'B2' },
  { value: 'C1', label: 'C1' },
]

const LENGTHS: Array<{ value: ArticleLength; label: string }> = [
  { value: 'short', label: '短 ~180' },
  { value: 'medium', label: '中 ~300' },
  { value: 'long', label: '长 ~500' },
]

const GENRES: Array<{ value: ArticleGenre; label: string }> = [
  { value: 'article', label: '短文' },
  { value: 'story', label: '故事' },
  { value: 'dialogue', label: '对话' },
  { value: 'email', label: '邮件' },
]

const GENRE_LABEL: Record<ArticleGenre, string> = {
  article: '短文',
  story: '故事',
  dialogue: '日常对话',
  email: '邮件',
}

const LEVEL_NOTE: Record<ArticleLevel, string> = {
  A2: 'A2',
  B1: 'B1',
  B2: 'B2',
  C1: 'C1',
}

function FieldSelect<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  id: string
  label: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
  disabled?: boolean
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-[10.5px] font-medium text-foreground"
      >
        {label}
      </label>
      <div className="relative mt-1.5">
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value as T)}
          className="h-10 w-full appearance-none rounded-xl border border-input bg-card px-2.5 pr-7 text-[11.5px] text-foreground outline-none transition-[border-color,box-shadow] focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/20"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          strokeWidth={1.8}
        />
      </div>
    </div>
  )
}

export interface WordArticleFormProps {
  wordInput: string
  onWordInputChange: (value: string) => void
  parsed: ParsedWordList
  level: ArticleLevel
  onLevelChange: (value: ArticleLevel) => void
  length: ArticleLength
  onLengthChange: (value: ArticleLength) => void
  genre: ArticleGenre
  onGenreChange: (value: ArticleGenre) => void
  scenario: string
  onScenarioChange: (value: string) => void
  article: GeneratedArticle | null
  title: string
  onTitleChange: (value: string) => void
  generating: boolean
  disabled?: boolean
  onRegenerate: () => void
  onAdjustSettings: () => void
}

export function WordArticleForm({
  wordInput,
  onWordInputChange,
  parsed,
  level,
  onLevelChange,
  length,
  onLengthChange,
  genre,
  onGenreChange,
  scenario,
  onScenarioChange,
  article,
  title,
  onTitleChange,
  generating,
  disabled = false,
  onRegenerate,
  onAdjustSettings,
}: WordArticleFormProps) {
  if (article) {
    const used = new Set(article.usedWords)
    const allUsed = article.unusedWords.length === 0

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2.5">
          <div>
            <p className="eyebrow">
              AI 生成 · {LEVEL_NOTE[level]} · {GENRE_LABEL[genre]}
            </p>
            <p className="mt-1 text-[10.5px] text-muted-foreground">
              已使用 {article.usedWords.length} / {parsed.words.length}{' '}
              个目标词
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onAdjustSettings}
              disabled={generating || disabled}
            >
              调整设置
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              disabled={generating || disabled}
            >
              {generating ? (
                <Loader2 className="animate-spin" />
              ) : (
                <RefreshCw strokeWidth={1.8} />
              )}
              {generating ? '重写中…' : '重新生成'}
            </Button>
          </div>
        </div>

        <div>
          <label
            htmlFor="generated-article-title"
            className="text-[11.5px] font-medium"
          >
            标题
          </label>
          <Input
            id="generated-article-title"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            disabled={generating}
            maxLength={90}
            className="mt-1.5 font-display text-[15px]"
          />
        </div>

        <article className="whitespace-pre-wrap rounded-xl border border-border/70 bg-secondary/30 px-4 py-4 font-display text-[14px] leading-7 text-foreground/85">
          {article.article}
        </article>

        <div
          className={cn(
            'rounded-xl border px-4 py-3',
            allUsed
              ? 'border-primary/15 bg-primary-wash/40'
              : 'border-action/20 bg-action-wash/45',
          )}
        >
          <div className="flex items-center gap-1.5">
            {allUsed ? (
              <Check className="size-3.5 text-primary" strokeWidth={2} />
            ) : null}
            <p className="text-[10.5px] font-medium text-foreground/80">
              {allUsed
                ? '全部目标词都已自然融入短文'
                : '有个别目标词没有自然用上'}
            </p>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {parsed.words.map((word) => (
              <span
                key={word}
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px]',
                  used.has(word)
                    ? 'bg-primary-wash text-primary-ink'
                    : 'bg-card text-action-ink',
                )}
              >
                {word}
              </span>
            ))}
          </div>
          {article.unusedWords.length > 0 && (
            <p className="mt-2 text-[10px] leading-5 text-action-ink/80">
              未用上：{article.unusedWords.join('、')}。可以重新生成，或直接存入——学习包会以文章实际内容为准。
            </p>
          )}
        </div>

        <p className="text-[10px] leading-5 text-muted-foreground">
          短文由 AI 生成。存入后会再调用一次 AI 生成学习包；所有内容保存在本机。
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <label
            htmlFor="word-list-input"
            className="text-[12px] font-medium text-foreground"
          >
            目标词 / 短语
          </label>
          <span
            className={cn(
              'text-[10.5px] tabular-nums',
              parsed.words.length > MAX_WORD_LIST
                ? 'text-destructive'
                : 'text-muted-foreground',
            )}
          >
            {parsed.words.length} / {MAX_WORD_LIST}
          </span>
        </div>
        <p className="mt-1 text-[10.5px] leading-5 text-muted-foreground">
          一行一个，或用逗号分隔。一次 3–{MAX_WORD_LIST} 个英文词/短语，AI
          会把它们写进一篇自然短文。
        </p>
        <Textarea
          id="word-list-input"
          value={wordInput}
          onChange={(event) => onWordInputChange(event.target.value)}
          disabled={generating || disabled}
          placeholder={'attention\nquiet focus\nhabit\nserendipity'}
          className="mt-1.5 min-h-[112px] font-mono text-[12.5px]"
        />
        {parsed.invalid.length > 0 && (
          <p className="mt-2 text-[10px] leading-5 text-destructive">
            这些不是可用的英文词/短语：{parsed.invalid.slice(0, 4).join('、')}
            {parsed.invalid.length > 4 ? '…' : ''}
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <FieldSelect
          id="article-level"
          label="等级"
          value={level}
          options={LEVELS}
          onChange={onLevelChange}
          disabled={generating || disabled}
        />
        <FieldSelect
          id="article-length"
          label="长度"
          value={length}
          options={LENGTHS}
          onChange={onLengthChange}
          disabled={generating || disabled}
        />
        <FieldSelect
          id="article-genre"
          label="体裁"
          value={genre}
          options={GENRES}
          onChange={onGenreChange}
          disabled={generating || disabled}
        />
      </div>

      <div>
        <label
          htmlFor="article-scenario"
          className="text-[11.5px] font-medium text-foreground"
        >
          场景或主题 <span className="font-normal text-muted-foreground">（可选）</span>
        </label>
        <Input
          id="article-scenario"
          value={scenario}
          onChange={(event) => onScenarioChange(event.target.value)}
          disabled={generating || disabled}
          placeholder="例如：在咖啡馆闲聊 / 给房东写一封邮件"
          maxLength={200}
          className="mt-1.5"
        />
      </div>

      <div className="rounded-lg border border-border/60 bg-muted/30 px-3.5 py-2.5 text-[10px] leading-5 text-muted-foreground">
        由 AI 生成 · 约 10–30 秒 · 会使用一次 API 额度。词表会发送给
        Anthropic，短文保存在本机。
      </div>
    </div>
  )
}
