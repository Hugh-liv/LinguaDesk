import { useLiveQuery } from 'dexie-react-hooks'
import {
  BookMarked,
  BookOpenText,
  Headphones,
  Layers,
  Loader2,
  Mic,
  PenLine,
  Plus,
  Sparkles,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AutoMaterialDialog } from '@/components/materials/auto-material-dialog'
import { DictationPanel } from '@/components/study/dictation-panel'
import { MaterialSwitcher } from '@/components/study/material-switcher'
import { ReadingPanel } from '@/components/study/reading-panel'
import { RetellPanel } from '@/components/study/retell-panel'
import type { StudyEntry, StudyMode } from '@/components/study/types'
import { VocabPanel } from '@/components/study/vocab-panel'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { db } from '@/lib/db'

const MODES: Array<{
  value: StudyMode
  label: string
  icon: typeof BookOpenText
}> = [
  { value: 'reading', label: '阅读', icon: BookOpenText },
  { value: 'vocab', label: '词卡', icon: Layers },
  { value: 'dictation', label: '听写', icon: Headphones },
  { value: 'retell', label: '复述', icon: Mic },
]

function isStudyMode(value: string | null): value is StudyMode {
  return MODES.some((mode) => mode.value === value)
}

function PanelLoading() {
  return (
    <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/55 px-6 py-16 text-[12px] text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      正在整理复习队列…
    </div>
  )
}

function StudyEmpty({ onAutoGenerate }: { onAutoGenerate: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/55 px-6 py-12 text-center shadow-desk">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary-wash text-primary">
        <BookOpenText className="size-6" strokeWidth={1.7} />
      </div>
      <h2 className="mt-4 text-balance font-display text-[23px] tracking-[-0.02em]">
        学习台还没有可以摊开的材料
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-[12.5px] leading-6 text-muted-foreground">
        先在材料页导入一段英文并生成学习包，阅读、词汇卡、听写和复述就会出现在这里。
      </p>
      <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
        <Button variant="action" onClick={onAutoGenerate}>
          <Sparkles strokeWidth={1.9} />
          AI 生成一份材料
        </Button>
        <Button variant="outline" asChild>
          <Link to="/materials">
            <Plus strokeWidth={2} />
            去材料库
          </Link>
        </Button>
      </div>
      <p className="mt-4 text-[10px] text-muted-foreground/65">
        不填材料也能开始；学习记录只保存在这台设备上。
      </p>
    </div>
  )
}

function StudyWorkspace({ entries }: { entries: StudyEntry[] }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabsRef = useRef<HTMLDivElement>(null)

  const materialParam = searchParams.get('material')
  const modeParam = searchParams.get('mode')
  const active =
    entries.find((entry) => entry.material.id === materialParam) ?? entries[0]
  const activeId = active.material.id
  const mode: StudyMode = isStudyMode(modeParam) ? modeParam : 'reading'

  const reviewItems = useLiveQuery(
    () => db.reviewItems.where('materialId').equals(activeId).toArray(),
    [activeId],
  )

  const dueVocab = useLiveQuery(
    () =>
      db.reviewItems
        .where('materialId')
        .equals(activeId)
        .and(
          (item) =>
            (item.kind === 'vocab' || item.kind === 'recall') &&
            item.dueAt <= Date.now(),
        )
        .sortBy('dueAt'),
    [activeId],
  )

  const dueVocabItems = dueVocab ?? []

  function setRoute(nextMode: StudyMode, nextMaterialId = activeId) {
    const params = new URLSearchParams(searchParams)
    params.set('mode', nextMode)
    params.set('material', nextMaterialId)
    setSearchParams(params, { replace: true })
  }

  function handleModeChange(value: string) {
    if (!isStudyMode(value)) return
    setRoute(value)
  }

  function goToMode(nextMode: StudyMode) {
    setRoute(nextMode)
    window.requestAnimationFrame(() => {
      tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <>
      <MaterialSwitcher
        entries={entries}
        active={active}
        onChange={(materialId) => setRoute(mode, materialId)}
      />

      <div ref={tabsRef} className="mt-5 scroll-mt-20 md:mt-6 md:scroll-mt-8">
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <p className="eyebrow">学习方式 · Modes</p>
          {dueVocabItems.length > 0 && (
            <p className="text-[10px] tabular-nums text-muted-foreground">
              {dueVocabItems.length} 张词卡待复习
            </p>
          )}
        </div>

        <Tabs value={mode} onValueChange={handleModeChange}>
          <TabsList className="grid h-auto w-full grid-cols-4 gap-1 rounded-2xl p-1.5">
            {MODES.map((item) => {
              const Icon = item.icon
              return (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="h-auto w-full flex-col gap-1 rounded-xl px-1 py-2.5 text-[10.5px]"
                >
                  <Icon className="size-4" strokeWidth={1.8} />
                  <span className="flex items-center gap-1">
                    {item.label}
                    {item.value === 'vocab' && dueVocabItems.length > 0 && (
                      <span className="rounded-full bg-action-wash px-1 py-px text-[8.5px] font-medium text-action-ink">
                        {dueVocabItems.length}
                      </span>
                    )}
                  </span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          <TabsContent value="reading">
            <ReadingPanel
              key={activeId}
              entry={active}
              onNextMode={goToMode}
            />
          </TabsContent>

          <TabsContent value="vocab">
            {reviewItems === undefined || dueVocab === undefined ? (
              <PanelLoading />
            ) : (
              <VocabPanel
                key={activeId}
                entry={active}
                initialItems={dueVocabItems}
                onNextMode={goToMode}
              />
            )}
          </TabsContent>

          <TabsContent value="dictation">
            {reviewItems === undefined ? (
              <PanelLoading />
            ) : (
              <DictationPanel
                key={activeId}
                entry={active}
                reviewItems={reviewItems}
                onNextMode={goToMode}
              />
            )}
          </TabsContent>

          <TabsContent value="retell">
            <RetellPanel key={activeId} entry={active} onNextMode={goToMode} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}

export function StudyPage() {
  const navigate = useNavigate()
  const [autoOpen, setAutoOpen] = useState(false)
  const entries = useLiveQuery(async () => {
    const materials = await db.materials.orderBy('createdAt').reverse().toArray()
    const packs = await db.packs.bulkGet(
      materials.map((material) => material.id),
    )

    return materials.flatMap<StudyEntry>((material, index) => {
      const pack = packs[index]?.pack
      return pack ? [{ material, pack }] : []
    })
  }, [])

  return (
    <>
      <PageHeader
        eyebrow="学习 · Study"
        title="在书桌前，慢一点"
        description="阅读原文、翻词汇卡、做一句听写，再用自己的话讲一遍。每次只拿一小段，注意力会自己回来。"
      >
        <Button variant="outline" asChild>
          <Link to="/writing">
            <PenLine strokeWidth={1.8} />
            写作工坊
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/speaking">
            <Mic strokeWidth={1.8} />
            口语陪练
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/listening">
            <Headphones strokeWidth={1.8} />
            听力室
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/corpus">
            <BookMarked strokeWidth={1.8} />
            语料库
          </Link>
        </Button>
      </PageHeader>

      {entries === undefined ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/55 px-6 py-16 text-[12px] text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          正在摊开书页…
        </div>
      ) : entries.length === 0 ? (
        <StudyEmpty onAutoGenerate={() => setAutoOpen(true)} />
      ) : (
        <StudyWorkspace entries={entries} />
      )}

      <AutoMaterialDialog
        open={autoOpen}
        onOpenChange={setAutoOpen}
        onCreated={({ material }) => {
          navigate(`/study?mode=reading&material=${material.id}`)
        }}
      />
    </>
  )
}
