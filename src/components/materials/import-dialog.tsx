import {
  Camera,
  FileText,
  ImagePlus,
  Loader2,
  Lock,
  Plus,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'
import { useRef, useState, type DragEvent, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { WordArticleForm } from '@/components/materials/word-article-form'
import {
  AiRequestError,
  extractImageMaterial,
  generateArticleFromWords,
} from '@/lib/ai/remote'
import type {
  ArticleGenre,
  ArticleLength,
  ArticleLevel,
  GeneratedArticle,
  ImageMaterialMode,
} from '@/lib/ai/types'
import type { MaterialImageRef } from '@/lib/db'
import { prepareImage, type PreparedImage } from '@/lib/image'
import { ImportFileError, parseImportFile } from '@/lib/import-files'
import { countWords, deriveTitle } from '@/lib/text'
import {
  MAX_WORD_LIST,
  MIN_WORD_LIST,
  parseWordList,
} from '@/lib/word-list'
import { cn } from '@/lib/utils'

export interface ImportPayload {
  title: string
  text: string
  sourceType: 'paste' | 'file' | 'words' | 'image'
  focusWords?: string[]
  autoGeneratePack?: boolean
  image?: MaterialImageRef
}

type Mode = 'paste' | 'file' | 'image' | 'words'

const MAX_CHARS = 60_000

const MODES: Array<{ value: Mode; label: string }> = [
  { value: 'paste', label: '粘贴文本' },
  { value: 'file', label: '上传文件' },
  { value: 'image', label: '拍张照片' },
  { value: 'words', label: '词汇成文' },
]

function formatAiError(
  error: unknown,
  fallback = 'AI 请求失败，请再试一次。',
): string {
  if (error instanceof AiRequestError) {
    if (error.code === 'AI_NOT_CONFIGURED') {
      return 'AI 还没有接通。请配置 DEEPSEEK_API_KEY 或 ANTHROPIC_API_KEY，并在 .env.local 或 Vercel 中重启 / 重新部署。'
    }
    if (error.code === 'VISION_NOT_CONFIGURED') {
      return '图像理解需要 DeepSeek。请配置 DEEPSEEK_API_KEY，并在 .env.local 或 Vercel 中重启 / 重新部署。'
    }
    return error.message
  }
  return fallback
}

export function ImportDialog({
  open,
  onOpenChange,
  onImport,
  onOpenWordBatch,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (payload: ImportPayload) => Promise<void>
  onOpenWordBatch?: () => void
}) {
  const [mode, setMode] = useState<Mode>('paste')
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parseLabel, setParseLabel] = useState('正在解析文件…')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [wordInput, setWordInput] = useState('')
  const [level, setLevel] = useState<ArticleLevel>('B1')
  const [length, setLength] = useState<ArticleLength>('medium')
  const [genre, setGenre] = useState<ArticleGenre>('article')
  const [scenario, setScenario] = useState('')
  const [generatingArticle, setGeneratingArticle] = useState(false)
  const [generatedArticle, setGeneratedArticle] =
    useState<GeneratedArticle | null>(null)
  const [articleTitle, setArticleTitle] = useState('')

  const [image, setImage] = useState<PreparedImage | null>(null)
  const [imageMode, setImageMode] = useState<ImageMaterialMode>('extract')
  const [imageHint, setImageHint] = useState('')
  const [imageDone, setImageDone] = useState(false)
  const [preparingImage, setPreparingImage] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [autoPack, setAutoPack] = useState(true)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const parsedWords = parseWordList(wordInput)
  const wordCount = countWords(text)
  const busy =
    saving || generatingArticle || parsing || preparingImage || extracting

  function resetForm() {
    setMode('paste')
    setTitle('')
    setText('')
    setFileName(null)
    setError(null)
    setSaving(false)
    setDragging(false)
    setParsing(false)
    setParseLabel('正在解析文件…')
    setWordInput('')
    setLevel('B1')
    setLength('medium')
    setGenre('article')
    setScenario('')
    setGeneratingArticle(false)
    setGeneratedArticle(null)
    setArticleTitle('')
    setImage(null)
    setImageMode('extract')
    setImageHint('')
    setImageDone(false)
    setPreparingImage(false)
    setExtracting(false)
    setAutoPack(true)
  }

  function changeMode(next: Mode) {
    setMode(next)
    setError(null)
    if (next !== 'words') {
      setGeneratedArticle(null)
      setArticleTitle('')
    }
  }

  function validateWordList(): string | null {
    if (parsedWords.invalid.length > 0) {
      return `词表里有无法识别的内容：${parsedWords.invalid
        .slice(0, 3)
        .join('、')}。请只保留英文词或短语。`
    }
    if (parsedWords.words.length < MIN_WORD_LIST) {
      return `至少需要 ${MIN_WORD_LIST} 个英文词或短语。`
    }
    if (parsedWords.words.length > MAX_WORD_LIST) {
      return `一次最多 ${MAX_WORD_LIST} 个，请分批生成。`
    }
    return null
  }

  async function handleFile(file: File) {
    setError(null)
    setParsing(true)
    setParseLabel('正在解析文件…')

    try {
      const parsed = await parseImportFile(file, setParseLabel)
      setText(parsed.text)
      setFileName(parsed.fileName)
      setMode('file')
      if (!title.trim()) {
        setTitle(parsed.fileName.replace(/\.[^.]+$/, ''))
      }
    } catch (caught) {
      setError(
        caught instanceof ImportFileError
          ? caught.message
          : '文件解析失败，请换一个文件再试。',
      )
    } finally {
      setParsing(false)
      setParseLabel('正在解析文件…')
    }
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  async function handleImageFile(file: File) {
    setError(null)
    setPreparingImage(true)

    try {
      const prepared = await prepareImage(file)
      setImage(prepared)
      setFileName(file.name)
      setImageDone(false)
      setText('')
      setTitle('')
      setArticleTitle('')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : '图片处理失败，请换一张再试。',
      )
    } finally {
      setPreparingImage(false)
    }
  }

  async function extractImage() {
    if (!image || extracting) return
    setError(null)
    setExtracting(true)

    try {
      const result = await extractImageMaterial({
        image: image.dataUrl,
        mode: imageMode,
        hint: imageHint.trim() || undefined,
      })
      setText(result.text)
      setTitle(result.title || deriveTitle(result.text))
      setImageDone(true)
      if (countWords(result.text) < 30) {
        setError(
          '识别出的英文较少。可以直接在正文里补充，或换一张更清晰、文字更多的图片。',
        )
      }
    } catch (caught) {
      setError(formatAiError(caught, '图片识别失败，请再试一次。'))
    } finally {
      setExtracting(false)
    }
  }

  async function generateArticle() {
    if (generatingArticle) return
    setError(null)

    const validation = validateWordList()
    if (validation) {
      setError(validation)
      return
    }

    setGeneratingArticle(true)
    try {
      const generated = await generateArticleFromWords({
        words: parsedWords.words,
        level,
        length,
        genre,
        scenario: scenario.trim() || undefined,
      })
      setGeneratedArticle(generated)
      setArticleTitle(generated.title)
    } catch (caught) {
      setError(formatAiError(caught))
    } finally {
      setGeneratingArticle(false)
    }
  }

  async function saveStandard() {
    const clean = text.trim()

    if (!clean) {
      setError('先粘贴或上传一段英文文本。')
      return
    }
    if (countWords(clean) < 30) {
      setError('至少需要 30 个英文单词，学习包才有意义。')
      return
    }
    if (clean.length > MAX_CHARS) {
      setError('文本过长，请控制在 6 万字符以内。')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onImport({
        title: title.trim() || deriveTitle(clean),
        text: clean,
        sourceType:
          mode === 'image'
            ? 'image'
            : mode === 'file' && fileName
              ? 'file'
              : 'paste',
        image:
          mode === 'image' && image
            ? { dataUrl: image.thumbnail, name: fileName ?? undefined }
            : undefined,
        autoGeneratePack:
          mode === 'image' && imageDone ? autoPack : undefined,
      })
      resetForm()
    } catch {
      setError('保存失败，请再试一次。')
    } finally {
      setSaving(false)
    }
  }

  async function saveWordArticle() {
    if (!generatedArticle) return

    setSaving(true)
    setError(null)
    try {
      await onImport({
        title:
          articleTitle.trim() ||
          generatedArticle.title ||
          deriveTitle(generatedArticle.article),
        text: generatedArticle.article,
        sourceType: 'words',
        focusWords: parsedWords.words,
        autoGeneratePack: true,
      })
      resetForm()
    } catch {
      setError('保存短文失败，请再试一次。')
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (mode === 'words') {
      if (generatedArticle) {
        await saveWordArticle()
      } else {
        await generateArticle()
      }
      return
    }

    if (mode === 'image' && !imageDone) {
      if (!image) {
        setError('先选择或拍一张图片。')
        return
      }
      await extractImage()
      return
    }

    await saveStandard()
  }

  const primaryLabel =
    mode === 'words'
      ? generatedArticle
        ? saving
          ? '正在生成学习包…'
          : '存入并生成学习包'
        : generatingArticle
          ? 'AI 正在写…'
          : '生成短文'
      : mode === 'image'
        ? !image
          ? '先选择图片'
          : !imageDone
            ? extracting
              ? '正在识别…'
              : '识别图片'
            : saving
              ? autoPack
                ? '正在生成学习包…'
                : '正在保存…'
              : autoPack
                ? '存入并生成学习包'
                : '存入材料库'
        : saving
          ? '正在保存…'
          : '存入材料库'

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-[660px]">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-6 sm:px-7 sm:pb-6">
          <DialogHeader className="pr-8">
            <p className="eyebrow">导入 · New material</p>
            <DialogTitle className="mt-1">放到书桌上</DialogTitle>
            <DialogDescription>
              {mode === 'words'
                ? '让 AI 用一组词写一篇自然短文，再生成学习包。'
                : mode === 'image'
                  ? '上传或拍一张英文照片，AI 先读出原文（或写一段描述），再像普通材料一样保存。'
                  : '粘贴英文，或上传 TXT / PDF / DOCX。文件先在浏览器本地解析。'}
            </DialogDescription>
          </DialogHeader>

          <form
            id="import-material-form"
            onSubmit={handleSubmit}
            className="mt-6 space-y-5"
          >
            <div
              className="grid grid-cols-4 gap-1 rounded-xl border border-border/80 bg-muted/55 p-1"
              role="group"
              aria-label="导入方式"
            >
              {MODES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={mode === item.value}
                  disabled={busy}
                  onClick={() => changeMode(item.value)}
                  className={cn(
                    'h-8 rounded-lg text-[11.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-60',
                    mode === item.value
                      ? 'bg-card text-primary shadow-[0_1px_2px_rgb(31_41_51_/_0.07)]'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {mode === 'words' ? (
              <>
                <WordArticleForm
                  wordInput={wordInput}
                  onWordInputChange={(value) => {
                    setWordInput(value)
                    setError(null)
                  }}
                  parsed={parsedWords}
                  level={level}
                  onLevelChange={(value) => {
                    setLevel(value)
                    setError(null)
                  }}
                  length={length}
                  onLengthChange={(value) => {
                    setLength(value)
                    setError(null)
                  }}
                  genre={genre}
                  onGenreChange={(value) => {
                    setGenre(value)
                    setError(null)
                  }}
                  scenario={scenario}
                  onScenarioChange={(value) => {
                    setScenario(value)
                    setError(null)
                  }}
                  article={generatedArticle}
                  title={articleTitle}
                  onTitleChange={setArticleTitle}
                  generating={generatingArticle}
                  disabled={saving}
                  onRegenerate={() => void generateArticle()}
                  onAdjustSettings={() => {
                    setGeneratedArticle(null)
                    setArticleTitle('')
                    setError(null)
                  }}
                />
                {onOpenWordBatch && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-action/20 bg-action-wash/30 px-3.5 py-2.5">
                    <p className="text-[10.5px] leading-5 text-action-ink/85">
                      超过 15 个词，或词表很零碎？交给 AI 整理成主题分组和完整一课。
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenChange(false)
                        onOpenWordBatch()
                      }}
                      className="shrink-0 rounded-lg border border-action/25 bg-card px-2.5 py-1 text-[10px] font-medium text-action-ink transition-colors hover:bg-action-wash/50"
                    >
                      AI 整理词表
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                {mode === 'image' && (
                  <>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) void handleImageFile(file)
                        event.target.value = ''
                      }}
                    />
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) void handleImageFile(file)
                        event.target.value = ''
                      }}
                    />

                    {!image ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          disabled={busy}
                          className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-muted/25 px-4 py-5 text-center transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60"
                        >
                          {preparingImage ? (
                            <Loader2 className="size-4 animate-spin text-primary" />
                          ) : (
                            <ImagePlus
                              className="size-4 text-primary"
                              strokeWidth={1.8}
                            />
                          )}
                          <span className="mt-1 text-[12px] font-medium">
                            {preparingImage ? '正在处理图片…' : '选择图片'}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            JPEG / PNG / WebP / GIF
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          disabled={busy}
                          className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-muted/25 px-4 py-5 text-center transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60"
                        >
                          <Camera
                            className="size-4 text-primary"
                            strokeWidth={1.8}
                          />
                          <span className="mt-1 text-[12px] font-medium">
                            拍一张
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            手机上直接打开相机
                          </span>
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-xl border border-border/80 bg-muted/20">
                        <img
                          src={image.thumbnail}
                          alt="待识别的图片"
                          className="max-h-52 w-full bg-white object-contain"
                        />
                        <div className="flex items-center gap-2 px-3 py-2 text-[10px] text-muted-foreground">
                          <span className="truncate">{fileName}</span>
                          <span className="shrink-0 tabular-nums">
                            {image.width}×{image.height}
                          </span>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setImage(null)
                              setImageDone(false)
                              setText('')
                              setTitle('')
                              setError(null)
                            }}
                            className="ml-auto shrink-0 rounded px-1 py-0.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                          >
                            换一张
                          </button>
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-[10.5px] font-medium">识别方式</p>
                      <div
                        className="mt-1.5 grid grid-cols-2 gap-1 rounded-xl border border-border/80 bg-muted/55 p-1"
                        role="group"
                        aria-label="图片识别方式"
                      >
                        {(
                          [
                            { value: 'extract', label: '提取原文' },
                            { value: 'describe', label: '看图写一段' },
                          ] as const
                        ).map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            aria-pressed={imageMode === item.value}
                            disabled={busy}
                            onClick={() => {
                              setImageMode(item.value)
                              setImageDone(false)
                              setError(null)
                            }}
                            className={cn(
                              'h-8 rounded-lg text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-60',
                              imageMode === item.value
                                ? 'bg-card text-primary shadow-[0_1px_2px_rgb(31_41_51_/_0.07)]'
                                : 'text-muted-foreground hover:text-foreground',
                            )}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                      <p className="mt-1.5 text-[10px] leading-5 text-muted-foreground">
                        {imageMode === 'extract'
                          ? '把照片里的英文原样读出来，适合书页、菜单、截图和板书。'
                          : '让 AI 用英文描述这张图片，适合没有文字或文字很少的实景照片。'}
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="image-hint"
                        className="text-[10.5px] font-medium"
                      >
                        补充说明{' '}
                        <span className="font-normal text-muted-foreground">
                          （可选）
                        </span>
                      </label>
                      <Input
                        id="image-hint"
                        value={imageHint}
                        onChange={(event) => setImageHint(event.target.value)}
                        placeholder={
                          imageMode === 'extract'
                            ? '例如：只提取菜单上的英文'
                            : '例如：重点写人物、天气和地点'
                        }
                        maxLength={240}
                        disabled={busy}
                        className="mt-1.5"
                      />
                    </div>

                    {imageDone && (
                      <>
                        <div className="rounded-lg border border-action/20 bg-action-wash/40 px-3 py-2 text-[10.5px] leading-5 text-action-ink">
                          已读出约 {wordCount} 词。可以直接在下方修改，再存入书桌。
                        </div>
                        <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={autoPack}
                            disabled={busy}
                            onChange={(event) => setAutoPack(event.target.checked)}
                            className="mt-0.5 size-3.5 shrink-0"
                          />
                          <span className="text-[10.5px] leading-5">
                            存入后立即生成学习包
                            <span className="mt-0.5 block text-[9.5px] leading-4 text-muted-foreground">
                              会再调用一次 AI，把识别出的文字拆成摘要、词汇、听写与复述。
                            </span>
                          </span>
                        </label>
                      </>
                    )}
                  </>
                )}

                {mode === 'file' && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(event) => {
                        event.preventDefault()
                        if (!parsing) setDragging(true)
                      }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={handleDrop}
                      disabled={parsing}
                      className={cn(
                        'flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                        dragging
                          ? 'border-primary bg-primary-wash/60'
                          : 'border-border bg-muted/25 hover:border-primary/40 hover:bg-muted/40',
                      )}
                    >
                      {parsing ? (
                        <>
                          <Loader2 className="size-5 animate-spin text-primary" />
                          <span className="mt-1 text-[12px] font-medium">
                            {parseLabel}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="grid size-10 place-items-center rounded-full border border-border/80 bg-card text-primary">
                            <Upload className="size-4" strokeWidth={1.8} />
                          </span>
                          <span className="mt-1 text-[12.5px] font-medium">
                            选择或拖入 .txt / .pdf / .docx
                          </span>
                          <span className="text-[10.5px] text-muted-foreground">
                            单文件 · 15 MB 以内 · 扫描版 PDF 暂不支持
                          </span>
                        </>
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) void handleFile(file)
                        event.target.value = ''
                      }}
                    />
                  </>
                )}

                {(mode !== 'image' || imageDone) && (
                  <>
                <div>
                  <label
                    htmlFor="material-title"
                    className="text-[12px] font-medium text-foreground"
                  >
                    标题{' '}
                    <span className="font-normal text-muted-foreground">
                      （可选）
                    </span>
                  </label>
                  <Input
                    id="material-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={90}
                    placeholder="例如：The Art of Attention"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <div className="flex items-baseline justify-between gap-3">
                    <label
                      htmlFor="material-text"
                      className="text-[12px] font-medium text-foreground"
                    >
                      正文
                    </label>
                    <span
                      className={cn(
                        'text-[10.5px] tabular-nums',
                        wordCount >= 30
                          ? 'text-primary'
                          : 'text-muted-foreground',
                      )}
                    >
                      {wordCount} 词
                    </span>
                  </div>
                  {mode === 'paste' && (
                    <p className="mt-1 text-[10.5px] text-muted-foreground">
                      直接粘贴英文原文，保留段落也可以。
                    </p>
                  )}
                  <Textarea
                    id="material-text"
                    value={text}
                    onChange={(event) => {
                      setText(event.target.value)
                      if (error) setError(null)
                    }}
                    placeholder="Paste the English text here…"
                    className="mt-1.5 min-h-[170px] text-[13px]"
                    maxLength={MAX_CHARS + 1000}
                  />
                  {fileName && mode !== 'image' && (
                    <div className="mt-2 flex items-center gap-2 text-[10.5px] text-muted-foreground">
                      <FileText
                        className="size-3.5 shrink-0"
                        strokeWidth={1.8}
                      />
                      <span className="truncate">已读取 {fileName}</span>
                      <button
                        type="button"
                        onClick={() => setFileName(null)}
                        className="ml-auto inline-flex items-center gap-1 rounded px-1 py-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                      >
                        <X className="size-3" />
                        移除
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-1.5 text-[10.5px] leading-5 text-muted-foreground">
                  <Lock className="mt-0.5 size-3 shrink-0" strokeWidth={1.8} />
                  {mode === 'image'
                    ? '图片先在浏览器里压缩；点「识别图片」时会发送给 DeepSeek 图像理解。原图不保存到云端，材料里只留一张小缩略图。'
                    : '文件在浏览器本地解析；生成学习包时会把正文发送给 AI 处理，材料仍保存在本机。'}
                </div>
                  </>
                )}
              </>
            )}
          </form>
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
              <Button type="button" variant="ghost">
                取消
              </Button>
            </DialogClose>
            <Button
              type="submit"
              form="import-material-form"
              variant="action"
              disabled={busy}
            >
              {saving ||
              generatingArticle ||
              parsing ||
              preparingImage ||
              extracting ? (
                <Loader2 className="animate-spin" />
              ) : mode === 'words' && !generatedArticle ? (
                <Sparkles strokeWidth={1.9} />
              ) : (
                <Plus strokeWidth={2} />
              )}
              {primaryLabel}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
