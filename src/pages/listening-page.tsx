import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowLeft,
  AudioLines,
  ChevronRight,
  Headphones,
  Layers3,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { AutoListeningDialog } from '@/components/listening/auto-listening-dialog'
import { ClipImportDialog } from '@/components/listening/clip-import-dialog'
import { CloseListening } from '@/components/listening/close-listening'
import { Dictogloss } from '@/components/listening/dictogloss'
import { useListeningPlayer } from '@/components/listening/use-listening-player'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import {
  db,
  deleteListeningClip,
  type ListeningClipRow,
} from '@/lib/db'
import type {
  AutoListeningInput,
  AutoListeningResult,
} from '@/lib/ai/types'
import { formatRelativeTime } from '@/lib/format'
import { newId } from '@/lib/ids'
import {
  SAMPLE_LISTENING_TEXT,
  SAMPLE_LISTENING_TITLE,
  hasTiming,
  splitTranscript,
  type ListeningClipDraft,
  type ListeningMode,
} from '@/lib/listening'
import { countWords } from '@/lib/text'
import { cn } from '@/lib/utils'

function sourceLabel(clip: ListeningClipRow): string {
  if (clip.audioBlob) return '音频'
  if (clip.audioOmitted) return '音频未随备份恢复'
  if (clip.sourceType === 'material') return '来自材料'
  if (clip.sourceType === 'ai') return 'AI 生成'
  return '系统朗读'
}

function ListeningPractice({
  clip,
  mode,
  onModeChange,
}: {
  clip: ListeningClipRow
  mode: ListeningMode
  onModeChange: (mode: ListeningMode) => void
}) {
  const player = useListeningPlayer(clip)

  function switchMode(nextMode: ListeningMode) {
    player.stop()
    onModeChange(nextMode)
  }

  return (
    <>
      <section className="mb-4 rounded-2xl border border-border/80 bg-card p-4 shadow-desk sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-primary-wash px-2 py-0.5 text-[8.5px] text-primary-ink">
                {sourceLabel(clip)}
              </span>
              <span className="rounded-full bg-secondary/70 px-2 py-0.5 text-[8.5px] text-muted-foreground">
                {clip.segments.length} 句 · {countWords(clip.transcript)} 词
              </span>
              {hasTiming(clip.segments) && (
                <span className="rounded-full bg-action-wash/70 px-2 py-0.5 text-[8.5px] text-action-ink">
                  有字幕时间轴
                </span>
              )}
            </div>
            <h2 className="mt-2 font-display text-[21px] leading-snug tracking-[-0.02em]">
              {clip.title}
            </h2>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <Button
            variant={mode === 'close' ? 'default' : 'outline'}
            size="sm"
            onClick={() => switchMode('close')}
          >
            <Headphones strokeWidth={1.8} />
            逐句精听
          </Button>
          <Button
            variant={mode === 'dictogloss' ? 'default' : 'outline'}
            size="sm"
            onClick={() => switchMode('dictogloss')}
          >
            <Layers3 strokeWidth={1.8} />
            Dictogloss
          </Button>
          <span className="ml-auto self-center text-[9.5px] text-muted-foreground">
            {mode === 'close' ? '听一句 → 写一句 → 对照' : '听整段 → 重建 → 对照'}
          </span>
        </div>

        {!clip.audioBlob && (
          <p className="mt-3 rounded-lg border border-border/60 bg-muted/15 px-3 py-2 text-[10px] leading-5 text-muted-foreground">
            {clip.audioOmitted
              ? '备份不含音频文件；这段听力会改用系统英语朗读。重新导入音频即可恢复原声。'
              : '这段听力没有上传音频，使用系统英语朗读。'}{' '}
            朗读取决于设备里的英语语音。
          </p>
        )}
      </section>

      {mode === 'close' ? (
        <CloseListening
          clip={clip}
          player={player}
          onStartDictogloss={() => switchMode('dictogloss')}
        />
      ) : (
        <Dictogloss
          clip={clip}
          player={player}
          onStartClose={() => switchMode('close')}
        />
      )}
    </>
  )
}

export function ListeningPage() {
  const clips = useLiveQuery(
    () => db.listeningClips.orderBy('updatedAt').reverse().toArray(),
    [],
  )
  const materials = useLiveQuery(
    () => db.materials.orderBy('createdAt').reverse().toArray(),
    [],
  )
  const sessions = useLiveQuery(
    () =>
      db.listeningSessions
        .orderBy('updatedAt')
        .reverse()
        .limit(8)
        .toArray(),
    [],
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [practice, setPractice] = useState<ListeningMode | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [autoOpen, setAutoOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const selected =
    clips?.find((clip) => clip.id === selectedId) ?? clips?.[0] ?? null

  async function createClip(draft: ListeningClipDraft) {
    const now = Date.now()
    const row: ListeningClipRow = {
      id: newId(),
      ...draft,
      createdAt: now,
      updatedAt: now,
    }
    await db.listeningClips.put(row)
    setSelectedId(row.id)
    setPractice('close')
    setNotice('听力已经放上书桌。')
  }

  async function loadSample() {
    const segments = splitTranscript(SAMPLE_LISTENING_TEXT)
    await createClip({
      title: SAMPLE_LISTENING_TITLE,
      transcript: SAMPLE_LISTENING_TEXT,
      segments,
      sourceType: 'text',
      audioBytes: 0,
    })
  }

  async function createAiListening(
    _input: AutoListeningInput,
    result: AutoListeningResult,
  ) {
    const now = Date.now()
    const row: ListeningClipRow = {
      id: newId(),
      title: result.title,
      transcript: result.transcript,
      segments: splitTranscript(result.transcript),
      sourceType: 'ai',
      audioBytes: 0,
      createdAt: now,
      updatedAt: now,
    }
    try {
      await db.listeningClips.put(row)
      setSelectedId(row.id)
      setPractice('close')
      setNotice('AI 已写好一段听力，可以直接开始精听。')
    } catch {
      setNotice('这段 AI 听力没有保存成功，请再试一次。')
    }
  }

  async function removeClip(clip: ListeningClipRow) {
    const confirmed = window.confirm(
      `删除「${clip.title}」？这也会删除它的练习记录和会话。`,
    )
    if (!confirmed) return
    await deleteListeningClip(clip.id)
    if (selectedId === clip.id) {
      setSelectedId(null)
      setPractice(null)
    }
    setNotice('这段听力已删除。')
  }

  return (
    <>
      {practice && selected ? (
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">听力 · Practice</p>
            <h1 className="mt-1.5 font-display text-[25px] font-semibold leading-tight tracking-[-0.025em]">
              先听，再写，最后对照
            </h1>
          </div>
          <Button variant="outline" onClick={() => setPractice(null)}>
            <ArrowLeft strokeWidth={1.8} />
            返回听力库
          </Button>
        </header>
      ) : (
        <PageHeader
          eyebrow="听力 · Listening"
          title="听见结构，再写下来"
          description="导入音频 + 字幕，或者什么都不准备，让 AI 写一段听力。逐句精听抓住词，Dictogloss 抓住整段的结构。"
        >
          <Button variant="outline" onClick={() => setAutoOpen(true)}>
            <Sparkles strokeWidth={1.9} />
            AI 生成听力
          </Button>
          <Button variant="action" onClick={() => setImportOpen(true)}>
            <Plus strokeWidth={2} />
            导入听力
          </Button>
        </PageHeader>
      )}

      {notice && !practice && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-primary/15 bg-primary-wash/40 px-3.5 py-2.5 text-[11px] text-primary-ink">
          <Sparkles className="size-3.5 shrink-0" strokeWidth={1.8} />
          {notice}
        </div>
      )}

      {practice && selected ? (
        <ListeningPractice
          key={selected.id}
          clip={selected}
          mode={practice}
          onModeChange={setPractice}
        />
      ) : clips === undefined ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card/55 px-6 py-16 text-[12px] text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          正在整理听力…
        </div>
      ) : clips.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-card/55 px-6 py-10 text-center shadow-desk sm:py-12">
          <div className="mx-auto grid size-12 place-items-center rounded-xl bg-primary-wash text-primary">
            <AudioLines className="size-5" strokeWidth={1.7} />
          </div>
          <h2 className="mt-3 font-display text-[22px] tracking-[-0.02em]">
            先放一段声音上书桌
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[12px] leading-6 text-muted-foreground">
            上传音频和对应文本，或直接从材料库选一篇。音频只保存在本机；没有音频时用系统朗读也能做 Dictogloss。
          </p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <Button variant="action" onClick={() => setAutoOpen(true)}>
              <Sparkles strokeWidth={1.9} />
              AI 生成一段听力
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Plus strokeWidth={2} />
              导入第一段听力
            </Button>
          </div>
          <div className="mt-2 flex justify-center">
            <Button variant="ghost" size="sm" onClick={() => void loadSample()}>
              先用示例试试
            </Button>
          </div>
          <p className="mt-4 text-[10px] text-muted-foreground/65">
            支持的音频：MP3 / M4A / WAV / OGG / WebM；字幕：SRT / VTT。
          </p>
        </section>
      ) : (
        <>
          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="eyebrow">听力库 · Clips</p>
                <h2 className="mt-1 font-display text-[19px]">今天听哪一段</h2>
              </div>
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {clips.length} 段
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {clips.map((clip) => {
                const active = clip.id === selectedId
                return (
                  <button
                    key={clip.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setSelectedId(clip.id)
                      setPractice(null)
                    }}
                    className={cn(
                      'rounded-xl border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                      active
                        ? 'border-primary/25 bg-primary-wash/35'
                        : 'border-border/65 bg-card hover:border-primary/20 hover:bg-muted/25',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-display text-[15px]">{clip.title}</p>
                        <p className="mt-1 text-[9.5px] text-muted-foreground">
                          {clip.segments.length} 句 · {countWords(clip.transcript)} 词 ·{' '}
                          {formatRelativeTime(clip.updatedAt)}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-secondary/70 px-2 py-0.5 text-[8px] text-muted-foreground">
                        {sourceLabel(clip)}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-[10.5px] leading-5 text-muted-foreground/75">
                      {clip.transcript}
                    </p>
                  </button>
                )
              })}
            </div>
          </section>

          {selected && (
            <section className="mt-4 rounded-2xl border border-border/80 bg-card p-5 shadow-desk sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="eyebrow">已选中 · Ready</p>
                  <h2 className="mt-1 font-display text-[21px]">{selected.title}</h2>
                  <p className="mt-1 text-[10.5px] text-muted-foreground">
                    {selected.segments.length} 句 · {countWords(selected.transcript)} 词 ·{' '}
                    {selected.audioBlob ? '原声音频' : '系统朗读'}
                    {selected.audioName ? ` · ${selected.audioName}` : ''}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void removeClip(selected)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 strokeWidth={1.8} />
                  删除
                </Button>
              </div>

              <p className="mt-3 line-clamp-3 rounded-xl border border-border/60 bg-muted/15 px-4 py-3 text-[11.5px] leading-6 text-muted-foreground">
                {selected.transcript}
              </p>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPractice('close')}
                  className="rounded-xl border border-border/70 bg-card px-4 py-3 text-left transition-colors hover:border-primary/25 hover:bg-primary-wash/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  <span className="flex items-center gap-2 text-[12.5px] font-medium">
                    <Headphones className="size-4 text-primary" strokeWidth={1.8} />
                    逐句精听
                    <ChevronRight className="ml-auto size-3.5 text-primary/70" />
                  </span>
                  <span className="mt-1 block text-[10px] leading-5 text-muted-foreground">
                    一句一句听，写下来，再看漏了哪些词。
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPractice('dictogloss')}
                  className="rounded-xl border border-action/20 bg-action-wash/25 px-4 py-3 text-left transition-colors hover:bg-action-wash/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/30"
                >
                  <span className="flex items-center gap-2 text-[12.5px] font-medium text-action-ink">
                    <Layers3 className="size-4" strokeWidth={1.8} />
                    整段 Dictogloss
                    <ChevronRight className="ml-auto size-3.5 text-action-ink/70" />
                  </span>
                  <span className="mt-1 block text-[10px] leading-5 text-action-ink/70">
                    听两遍，把整段重建出来，再对照结构。
                  </span>
                </button>
              </div>
            </section>
          )}

          <section className="mt-7">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="eyebrow">最近听力 · Archive</p>
                <h2 className="mt-1 font-display text-[19px]">留下的声音记录</h2>
              </div>
            </div>
            {sessions === undefined ? (
              <p className="text-[11px] text-muted-foreground">正在整理记录…</p>
            ) : sessions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card/45 px-4 py-6 text-center text-[11px] text-muted-foreground">
                完成一次逐句精听或 Dictogloss 后，记录会留在这里。
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => {
                      const clip = clips.find((item) => item.id === session.clipId)
                      if (clip) {
                        setSelectedId(clip.id)
                        setPractice(session.mode)
                      }
                    }}
                    className="flex w-full items-center gap-3 rounded-xl border border-border/65 bg-card/65 px-3.5 py-3 text-left transition-colors hover:border-primary/20 hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-[14px]">
                        {session.clipTitle}
                      </p>
                      <p className="mt-0.5 text-[9.5px] text-muted-foreground">
                        {session.mode === 'close' ? '逐句精听' : 'Dictogloss'} · 写对{' '}
                        {Math.round(session.accuracy * 100)}% ·{' '}
                        {formatRelativeTime(session.updatedAt)}
                      </p>
                    </div>
                    <ChevronRight className="size-3.5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <AutoListeningDialog
        open={autoOpen}
        onOpenChange={setAutoOpen}
        onCreated={createAiListening}
      />
      <ClipImportDialog
        key={importOpen ? 'open' : 'closed'}
        open={importOpen}
        onOpenChange={setImportOpen}
        materials={materials ?? []}
        onCreate={createClip}
      />

      {clips && clips.length === 0 && (
        <p className="mt-6 text-center text-[10px] leading-5 text-muted-foreground/65">
          音频与文本都保存在浏览器的 IndexedDB；JSON 备份会保留文本和记录，但不包含音频文件。
        </p>
      )}
    </>
  )
}
