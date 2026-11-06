import { useLiveQuery } from 'dexie-react-hooks'
import {
  AlertCircle,
  Globe2,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { AutoMaterialDialog } from '@/components/materials/auto-material-dialog'
import { EmptyDesk } from '@/components/materials/empty-desk'
import {
  ImportDialog,
  type ImportPayload,
} from '@/components/materials/import-dialog'
import { MaterialCard } from '@/components/materials/material-card'
import {
  PackPreviewDialog,
  type PackEntry,
} from '@/components/materials/pack-preview-dialog'
import { WebSearchDialog } from '@/components/materials/web-search-dialog'
import { WordBatchDialog } from '@/components/materials/word-batch-dialog'
import { WordPlanDialog } from '@/components/materials/word-plan-dialog'
import { PageHeader } from '@/components/layout/page-header'
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
import { generateLearningPack } from '@/lib/ai/generate'
import type { LearningPack } from '@/lib/ai/types'
import type { CreatedMaterial } from '@/lib/auto-material'
import { SAMPLE_TEXT, SAMPLE_TITLE } from '@/data/sample'
import {
  db,
  deleteMaterial,
  savePack,
  type MaterialRow,
} from '@/lib/db'
import { newId } from '@/lib/ids'
import { countWords, deriveTitle } from '@/lib/text'
import { cn } from '@/lib/utils'
import type { CreatedSearchMaterial } from '@/lib/web-material'

type Filter = 'all' | 'pending' | 'ready'

interface MaterialWithPack {
  material: MaterialRow
  pack: LearningPack | null
}

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待生成' },
  { value: 'ready', label: '已生成' },
]

const EMPTY_ROWS: MaterialWithPack[] = []

function nowMs(): number {
  return Date.now()
}

export function MaterialsPage() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [importOpen, setImportOpen] = useState(false)
  const [autoOpen, setAutoOpen] = useState(false)
  const [webOpen, setWebOpen] = useState(false)
  const [wordBatchOpen, setWordBatchOpen] = useState(false)
  const [viewing, setViewing] = useState<PackEntry | null>(null)
  const [viewingPlan, setViewingPlan] = useState<MaterialRow | null>(null)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<MaterialRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [loadingSample, setLoadingSample] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const data = useLiveQuery(async () => {
    const materials = await db.materials.orderBy('createdAt').reverse().toArray()
    const packs = await db.packs.bulkGet(materials.map((material) => material.id))
    return materials.map<MaterialWithPack>((material, index) => ({
      material,
      pack: packs[index]?.pack ?? null,
    }))
  }, [])

  const rows = data ?? EMPTY_ROWS
  const readyCount = rows.filter((row) => row.pack !== null).length
  const pendingCount = rows.length - readyCount

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase()

    return rows.filter((row) => {
      if (filter === 'ready' && row.pack === null) return false
      if (filter === 'pending' && row.pack !== null) return false
      if (!needle) return true

      return (
        row.material.title.toLowerCase().includes(needle) ||
        row.material.text.toLowerCase().includes(needle)
      )
    })
  }, [rows, filter, query])

  const filteredCounts: Record<Filter, number> = {
    all: rows.length,
    pending: pendingCount,
    ready: readyCount,
  }

  async function handleImport(payload: ImportPayload) {
    const now = nowMs()
    const material: MaterialRow = {
      id: newId(),
      title: payload.title || deriveTitle(payload.text),
      text: payload.text,
      sourceType: payload.sourceType,
      focusWords: payload.focusWords,
      image: payload.image,
      wordCount: countWords(payload.text),
      createdAt: now,
      updatedAt: now,
      packGeneratedAt: null,
    }

    await db.materials.add(material)
    setImportOpen(false)

    if (payload.autoGeneratePack) {
      setNotice(
        payload.sourceType === 'image'
          ? '图片已识别并存入，AI 正在生成学习包…'
          : '词汇短文已存入，AI 正在生成学习包…',
      )
      window.setTimeout(() => {
        void handleGenerate(material)
      }, 0)
    } else if (payload.sourceType === 'image') {
      setNotice('图片已识别。正文可以随时修改，准备好后再生成学习包。')
    } else {
      setNotice('材料已放上书桌。现在可以生成学习包了。')
    }
  }

  function handleAutoCreated(created: CreatedMaterial) {
    setViewing({ material: created.material, pack: created.pack })
    setNotice('AI 已写好一页内容，并拆成完整学习包。')
  }

  function handleWordBatchSaved(created: CreatedMaterial) {
    setViewingPlan(created.material)
    setNotice('词表已整理成一课，学习包与复习卡也准备好了。')
  }

  function handleSearchLessonCreated(created: CreatedSearchMaterial) {
    setViewing({ material: created.material, pack: created.pack })
    setNotice(
      created.sources.length > 0
        ? `AI 已基于 ${created.sources.length} 条实时网页写好一课，来源已附在材料上。`
        : 'AI 已基于这次的搜索结果写好一课。',
    )
  }

  function handleWebSaved(materials: MaterialRow[]) {
    if (materials.length === 0) return
    setNotice(
      materials.length === 1
        ? '联网结果已存入书桌。现在可以生成学习包了。'
        : `${materials.length} 条联网结果已存入书桌。可以逐份生成学习包。`,
    )
  }

  async function handleLoadSample() {
    setError(null)
    if (rows.some((row) => row.material.sourceType === 'sample')) {
      setNotice('示例材料已经在书桌上了。')
      return
    }

    setLoadingSample(true)
    try {
      const now = nowMs()
      await db.materials.add({
        id: newId(),
        title: SAMPLE_TITLE,
        text: SAMPLE_TEXT,
        sourceType: 'sample',
        wordCount: countWords(SAMPLE_TEXT),
        createdAt: now,
        updatedAt: now,
        packGeneratedAt: null,
      })
      setNotice('示例材料已放上书桌。点「生成学习包」看看它的拆解。')
    } catch {
      setError('载入示例时遇到问题，请再试一次。')
    } finally {
      setLoadingSample(false)
    }
  }

  async function handleGenerate(material: MaterialRow) {
    if (generatingId) return
    setError(null)
    setGeneratingId(material.id)

    try {
      const pack = await generateLearningPack({
        title: material.title,
        text: material.text,
        focusWords: material.focusWords,
      })
      await savePack(material, pack)
      setViewing({
        material: { ...material, packGeneratedAt: nowMs() },
        pack,
      })
      setNotice(
        pack.generator === 'ai'
          ? 'AI 学习包已生成。'
          : 'AI 暂不可用，本次使用本地启发式生成。检查 API Key 后可启用 AI。',
      )
    } catch {
      setError('生成学习包时遇到问题，请再试一次。')
    } finally {
      setGeneratingId(null)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)

    try {
      await deleteMaterial(pendingDelete.id)
      if (viewing?.material.id === pendingDelete.id) setViewing(null)
      setPendingDelete(null)
      setNotice('材料已从书桌移开。')
    } catch {
      setError('删除材料时遇到问题，请再试一次。')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="材料 · Library"
        title="把好文字，放到书桌上"
        description="粘贴、上传文件或拍一张照片，也可以联网找今天的真实内容；什么都不准备时，让 AI 生成一页内容。一大批零碎单词也能整理成可直接学习的一课。"
      >
        <Button variant="outline" onClick={() => setAutoOpen(true)}>
          <Sparkles strokeWidth={1.9} />
          AI 生成
        </Button>
        <Button variant="outline" onClick={() => setWebOpen(true)}>
          <Globe2 strokeWidth={1.8} />
          联网搜索
        </Button>
        <Button variant="outline" onClick={() => setWordBatchOpen(true)}>
          <Wand2 strokeWidth={1.8} />
          AI 整理词表
        </Button>
        <Button variant="action" onClick={() => setImportOpen(true)}>
          <Plus strokeWidth={2} />
          导入材料
        </Button>
      </PageHeader>

      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/[0.06] px-3.5 py-2.5 text-[11.5px] leading-5 text-destructive"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.9} />
          <p className="flex-1">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="关闭错误提示"
            className="rounded p-0.5 hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {notice && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-action/20 bg-action-wash/60 px-3.5 py-2.5 text-[11.5px] leading-5 text-action-ink">
          <Sparkles className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.9} />
          <p className="flex-1">{notice}</p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="关闭提示"
            className="rounded p-0.5 hover:bg-action/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/30"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyDesk
          onImport={() => setImportOpen(true)}
          onLoadSample={handleLoadSample}
          loadingSample={loadingSample}
          onAutoGenerate={() => setAutoOpen(true)}
          onWordBatch={() => setWordBatchOpen(true)}
          onWebSearch={() => setWebOpen(true)}
        />
      ) : (
        <>
          <div className="border-b border-border/70 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-baseline gap-2.5">
                <h2 className="font-display text-[17px] tracking-[-0.01em]">
                  书桌上的材料
                </h2>
                <span className="text-[10.5px] text-muted-foreground">
                  {rows.length} 份 · {readyCount} 个学习包
                </span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative">
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="搜索标题或正文"
                    aria-label="搜索材料"
                    className="h-9 rounded-lg pl-8 text-[12px] sm:w-52"
                  />
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-card/60 p-1">
                  {FILTERS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setFilter(item.value)}
                      aria-pressed={filter === item.value}
                      className={cn(
                        'h-7 rounded-md px-2.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                        filter === item.value
                          ? 'bg-primary-wash text-primary-ink'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {item.label}
                      <span className="ml-1 text-[9.5px] opacity-65">
                        {filteredCounts[item.value]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
              <p className="font-display text-[18px]">没有找到符合条件的材料</p>
              <p className="mt-1.5 text-[12px] text-muted-foreground">
                换个关键词，或把筛选切回「全部」。
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setQuery('')
                  setFilter('all')
                }}
              >
                清除筛选
              </Button>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {filteredRows.map((row, index) => (
                <MaterialCard
                  key={row.material.id}
                  material={row.material}
                  pack={row.pack}
                  index={index}
                  generating={generatingId === row.material.id}
                  onGenerate={() => void handleGenerate(row.material)}
                  onView={() => {
                    if (row.pack) {
                      setViewing({ material: row.material, pack: row.pack })
                    }
                  }}
                  onViewPlan={
                    row.material.wordPlan
                      ? () => setViewingPlan(row.material)
                      : undefined
                  }
                  onRequestDelete={() => setPendingDelete(row.material)}
                />
              ))}
            </div>
          )}

          <p className="mt-8 text-center text-[10px] leading-5 text-muted-foreground/60">
            材料保存在此设备的 IndexedDB 中。清除浏览器站点数据会一并删除。
          </p>
        </>
      )}

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={handleImport}
        onOpenWordBatch={() => setWordBatchOpen(true)}
      />
      <AutoMaterialDialog
        open={autoOpen}
        onOpenChange={setAutoOpen}
        onCreated={handleAutoCreated}
      />
      <WebSearchDialog
        open={webOpen}
        onOpenChange={setWebOpen}
        onLessonCreated={handleSearchLessonCreated}
        onSaved={handleWebSaved}
      />
      <WordBatchDialog
        open={wordBatchOpen}
        onOpenChange={setWordBatchOpen}
        onSaved={handleWordBatchSaved}
      />
      <WordPlanDialog
        material={viewingPlan}
        onOpenChange={(open) => {
          if (!open) setViewingPlan(null)
        }}
      />

      <PackPreviewDialog entry={viewing} onClose={() => setViewing(null)} />

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <div className="px-5 pb-5 pt-6 sm:px-6">
            <div className="mb-3 grid size-9 place-items-center rounded-lg bg-destructive/10 text-destructive">
              <Trash2 className="size-4" strokeWidth={1.9} />
            </div>
            <DialogHeader>
              <p className="eyebrow">删除 · Remove</p>
              <DialogTitle className="mt-1">把这份材料移开？</DialogTitle>
              <DialogDescription>
                《{pendingDelete?.title}》连同它的学习包和复习卡片会一起删除，无法恢复。
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="border-t border-border/70 bg-muted/20 px-5 py-4 sm:px-6">
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost" disabled={deleting}>
                  取消
                </Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={() => void confirmDelete()}
                disabled={deleting}
              >
                {deleting && <Loader2 className="animate-spin" />}
                删除材料
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
