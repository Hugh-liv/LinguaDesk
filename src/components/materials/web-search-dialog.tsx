import {
  ExternalLink,
  Globe2,
  Loader2,
  Search,
  Sparkles,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { SelectField } from '@/components/ui/select-field'
import { AiRequestError, searchWeb } from '@/lib/ai/remote'
import type {
  ArticleGenre,
  ArticleLength,
  ArticleLevel,
  WebSearchSource,
} from '@/lib/ai/types'
import type { MaterialRow } from '@/lib/db'
import { countWords } from '@/lib/text'
import {
  createSearchLessonMaterial,
  isImportableWebResult,
  saveWebSearchResults,
  type CreatedSearchMaterial,
  webResultText,
} from '@/lib/web-material'
import { cn } from '@/lib/utils'

const RESULT_COUNT = 8

const LEVELS = ['A2', 'B1', 'B2', 'C1'] as const
const LENGTHS: Array<{ value: ArticleLength; label: string }> = [
  { value: 'short', label: '短 · 约 200 词' },
  { value: 'medium', label: '中 · 约 300 词' },
  { value: 'long', label: '长 · 约 500 词' },
]
const GENRES: Array<{ value: ArticleGenre; label: string }> = [
  { value: 'article', label: '短文' },
  { value: 'story', label: '故事' },
  { value: 'dialogue', label: '对话' },
  { value: 'email', label: '邮件' },
]

type SearchCategory = 'news' | 'podcast' | 'speech' | 'transcript' | 'other'

const CATEGORIES: Array<{
  value: SearchCategory
  label: string
  query: string
  hint: string
}> = [
  {
    value: 'news',
    label: '新闻',
    query: 'latest world news this week',
    hint: '适合找一篇有完整正文的近期报道。',
  },
  {
    value: 'podcast',
    label: '播客',
    query: 'podcast episode transcript conversation',
    hint: '优先找带 transcript / 文字稿的播客页面。',
  },
  {
    value: 'speech',
    label: '演讲',
    query: 'TED talk transcript speech',
    hint: '优先找有演讲全文或字幕稿的页面。',
  },
  {
    value: 'transcript',
    label: '讲稿 / 访谈',
    query: 'interview transcript conversation',
    hint: '适合访谈、毕业演讲、发布会问答等文字稿。',
  },
  {
    value: 'other',
    label: '其他',
    query: '',
    hint: '输入任意主题，例如 climate policy 或 starting a new job。',
  },
]

function formatError(error: unknown): string {
  if (error instanceof AiRequestError) return error.message
  return '联网搜索失败，请稍后再试。'
}

function formatDate(value?: string | null): string {
  if (!value) return ''
  const time = Date.parse(value)
  if (Number.isNaN(time)) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(time)
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function WebSearchDialog({
  open,
  onOpenChange,
  onLessonCreated,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLessonCreated: (created: CreatedSearchMaterial) => void
  onSaved: (materials: MaterialRow[]) => void
}) {
  const [category, setCategory] = useState<SearchCategory>('news')
  const [query, setQuery] = useState('')
  const [searchedQuery, setSearchedQuery] = useState('')
  const [results, setResults] = useState<WebSearchSource[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [searching, setSearching] = useState(false)
  const [importing, setImporting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [level, setLevel] = useState<ArticleLevel>('B1')
  const [length, setLength] = useState<ArticleLength>('medium')
  const [genre, setGenre] = useState<ArticleGenre>('article')

  const busy = searching || importing || generating

  const selectedSources = useMemo(
    () =>
      (results ?? []).filter(
        (source) =>
          selected.has(source.url) && isImportableWebResult(source),
      ),
    [results, selected],
  )

  function reset() {
    setCategory('news')
    setQuery('')
    setSearchedQuery('')
    setResults(null)
    setSelected(new Set())
    setSearching(false)
    setImporting(false)
    setGenerating(false)
    setError(null)
    setLevel('B1')
    setLength('medium')
    setGenre('article')
  }

  function close() {
    reset()
    onOpenChange(false)
  }

  function chooseCategory(next: SearchCategory) {
    const preset = CATEGORIES.find((item) => item.value === next)
    const usingPreset =
      !query.trim() || CATEGORIES.some((item) => item.query === query)
    setCategory(next)
    setError(null)
    if (preset && usingPreset) setQuery(preset.query)
  }

  async function runSearch() {
    if (busy) return
    const preset =
      CATEGORIES.find((item) => item.value === category)?.query ?? ''
    const clean = query.trim() || (category === 'other' ? '' : preset)
    if ([...clean].length < 2) {
      setError('请输入至少 2 个字符的搜索词。')
      return
    }

    setSearching(true)
    setError(null)
    setResults(null)
    setSelected(new Set())

    try {
      const list = await searchWeb({ query: clean, count: RESULT_COUNT })
      setResults(list)
      setSearchedQuery(clean)
      if (list.length === 0) {
        setError('这次搜索没有找到结果。换一个更具体的关键词试试。')
      } else {
        const first = list.find(isImportableWebResult)
        if (first) setSelected(new Set([first.url]))
      }
    } catch (caught) {
      setError(formatError(caught))
    } finally {
      setSearching(false)
    }
  }

  function toggle(url: string) {
    setSelected((previous) => {
      const next = new Set(previous)
      if (next.has(url)) next.delete(url)
      else next.add(url)
      return next
    })
  }

  function toggleAll() {
    const importable = (results ?? []).filter(isImportableWebResult)
    if (selectedSources.length === importable.length && importable.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(importable.map((source) => source.url)))
    }
  }

  async function importSelected() {
    if (busy || selectedSources.length === 0) return
    setImporting(true)
    setError(null)
    try {
      const rows = await saveWebSearchResults(selectedSources)
      if (rows.length === 0) {
        setError('选中的结果正文太短，换一条，或直接让 AI 写一课。')
        return
      }
      onSaved(rows)
      close()
    } catch {
      setError('保存搜索结果失败，请再试一次。')
    } finally {
      setImporting(false)
    }
  }

  async function generateLesson() {
    if (busy || !searchedQuery || !results?.length) return
    setGenerating(true)
    setError(null)
    try {
      const created = await createSearchLessonMaterial({
        query: searchedQuery,
        level,
        length,
        genre,
      })
      onLessonCreated(created)
      close()
    } catch (caught) {
      setError(formatError(caught))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
        else onOpenChange(true)
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-6 sm:px-7">
          <DialogHeader className="pr-8">
            <p className="eyebrow">联网 · Live web</p>
            <DialogTitle className="mt-1">从今天的真实世界里读英语</DialogTitle>
            <p className="mt-2 text-[11.5px] leading-5 text-muted-foreground">
              用 DeepSeek 搜索实时网页。可以直接把结果存成阅读材料，也可以让
              AI 只依据这些结果写一篇原创英文课，并把来源留在材料上。
            </p>
          </DialogHeader>

          <div
            className="mt-4 flex flex-wrap gap-1.5"
            role="group"
            aria-label="搜索类型"
          >
            {CATEGORIES.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={category === item.value}
                disabled={busy}
                onClick={() => chooseCategory(item.value)}
                className={cn(
                  'h-7 rounded-full border px-3 text-[10.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60',
                  category === item.value
                    ? 'border-primary/25 bg-primary-wash text-primary-ink'
                    : 'border-border/70 bg-card text-muted-foreground hover:border-primary/20 hover:text-foreground',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] leading-5 text-muted-foreground/80">
            {CATEGORIES.find((item) => item.value === category)?.hint}
          </p>

          <form
            className="mt-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              void runSearch()
            }}
          >
            <div className="relative flex-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60"
                strokeWidth={1.9}
              />
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  if (error) setError(null)
                }}
                maxLength={128}
                disabled={busy}
                placeholder="例如：AI and language learning 2026"
                aria-label="搜索词"
                className="pl-8"
              />
            </div>
            <Button type="submit" variant="action" disabled={busy}>
              {searching ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Search strokeWidth={1.9} />
              )}
              {searching ? '搜索中…' : '搜索'}
            </Button>
          </form>

          <p className="mt-2 flex items-center gap-1.5 text-[10px] leading-5 text-muted-foreground/70">
            <Globe2 className="size-3" strokeWidth={1.8} />
            默认只取英文网页；支持 site: / lang: / after: 等语法。按成功请求计费，无结果不计费。
          </p>

          {results && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10.5px] font-medium text-muted-foreground">
                  搜索结果 · {results.length} 条
                </p>
                <button
                  type="button"
                  onClick={toggleAll}
                  disabled={busy || results.length === 0}
                  className="rounded px-1.5 py-0.5 text-[10px] text-action-ink transition-colors hover:bg-action-wash/60 disabled:opacity-50"
                >
                  {selectedSources.length > 0 ? '取消全选' : '全选可存入的'}
                </button>
              </div>

              <div className="max-h-[46dvh] space-y-2 overflow-y-auto pr-0.5">
                {results.map((source) => {
                  const importable = isImportableWebResult(source)
                  const words = countWords(webResultText(source))
                  const checked = selected.has(source.url)

                  return (
                    <div
                      key={source.url}
                      className={cn(
                        'rounded-xl border px-3 py-2.5 transition-colors',
                        checked
                          ? 'border-action/35 bg-action-wash/25'
                          : 'border-border/70 bg-card',
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!importable || busy}
                          onChange={() => toggle(source.url)}
                          aria-label={`选择 ${source.title}`}
                          className="mt-1 size-3.5 shrink-0 disabled:opacity-40"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[12.5px] font-medium leading-5">
                              {source.title}
                            </p>
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              aria-label={`打开 ${source.title}`}
                              className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground/60 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                            >
                              <ExternalLink className="size-3.5" strokeWidth={1.8} />
                            </a>
                          </div>
                          <p className="mt-0.5 text-[9.5px] text-muted-foreground/70">
                            {hostOf(source.url)}
                            {formatDate(source.date)
                              ? ` · ${formatDate(source.date)}`
                              : ''}
                            {` · 约 ${words} 词`}
                            {source.authority !== undefined &&
                            source.authority >= 3
                              ? ' · 高权威'
                              : ''}
                          </p>
                          {(source.summary || source.snippet) && (
                            <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted-foreground">
                              {source.summary || source.snippet}
                            </p>
                          )}
                          {!importable && (
                            <p className="mt-1 text-[9.5px] text-action-ink/80">
                              正文太短，只能作为写课的参考资料。
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5">
                <p className="text-[11px] font-medium">或者：用这次搜索写一课</p>
                <p className="mt-0.5 text-[10px] leading-5 text-muted-foreground">
                  AI 只从上面的结果里取事实，写一篇原创英文，再拆成完整学习包；来源会附在材料上。
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <SelectField
                    id="web-lesson-level"
                    label="等级"
                    value={level}
                    options={LEVELS.map((value) => ({ value, label: value }))}
                    onChange={(value) => setLevel(value as ArticleLevel)}
                    disabled={busy}
                  />
                  <SelectField
                    id="web-lesson-length"
                    label="长度"
                    value={length}
                    options={LENGTHS}
                    onChange={(value) => setLength(value as ArticleLength)}
                    disabled={busy}
                  />
                  <SelectField
                    id="web-lesson-genre"
                    label="体裁"
                    value={genre}
                    options={GENRES}
                    onChange={(value) => setGenre(value as ArticleGenre)}
                    disabled={busy}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border/70 bg-muted/20 px-5 py-4 sm:px-7">
          {error && (
            <div
              role="alert"
              className="mb-3 rounded-lg border border-destructive/25 bg-destructive/[0.06] px-3 py-2.5 text-[11px] leading-5 text-destructive"
            >
              {error}
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={busy}>
                取消
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="outline"
              onClick={() => void importSelected()}
              disabled={busy || selectedSources.length === 0}
            >
              {importing ? (
                <Loader2 className="animate-spin" />
              ) : (
                <ExternalLink strokeWidth={1.8} />
              )}
              存入选中
              {selectedSources.length > 0 ? ` (${selectedSources.length})` : ''}
            </Button>
            <Button
              type="button"
              variant="action"
              onClick={() => void generateLesson()}
              disabled={busy || !results?.length}
            >
              {generating ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Sparkles strokeWidth={1.9} />
              )}
              {generating ? '搜索并写课…' : '写成一课'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
