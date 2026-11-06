import { FileAudio, FileText, Loader2, Sparkles, Upload } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { SelectField } from '@/components/ui/select-field'
import { Textarea } from '@/components/ui/textarea'
import type { MaterialRow } from '@/lib/db'
import {
  LISTENING_AUDIO_ACCEPT,
  LISTENING_SUBTITLE_ACCEPT,
  MAX_AUDIO_BYTES,
  parseSubtitle,
  splitTranscript,
  transcriptFromSegments,
  type ListeningClipDraft,
  type ListeningSegment,
} from '@/lib/listening'
import { countWords } from '@/lib/text'
import { cn } from '@/lib/utils'

type SourceTab = 'media' | 'material'

function fileTitle(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
}

function fallbackTitle(transcript: string): string {
  const first = transcript.trim().split(/(?<=[.!?])\s+/)[0] ?? ''
  return first.length > 46 ? `${first.slice(0, 46).trim()}…` : first
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function ClipImportDialog({
  open,
  onOpenChange,
  materials,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  materials: MaterialRow[]
  onCreate: (draft: ListeningClipDraft) => Promise<void>
}) {
  const [source, setSource] = useState<SourceTab>('media')
  const [title, setTitle] = useState('')
  const [transcript, setTranscript] = useState('')
  const [timedSegments, setTimedSegments] = useState<ListeningSegment[]>([])
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [materialId, setMaterialId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [readingSubtitle, setReadingSubtitle] = useState(false)
  const [saving, setSaving] = useState(false)

  const selectedMaterial = materials.find((item) => item.id === materialId)
  const timedText = timedSegments.length > 0 ? transcriptFromSegments(timedSegments) : ''
  const transcriptEdited =
    timedSegments.length > 0 && transcript.trim() !== timedText.trim()
  const wordCount = countWords(transcript)

  async function handleSubtitle(file: File | null) {
    if (!file) return
    setReadingSubtitle(true)
    setError(null)
    try {
      const text = await file.text()
      const parsed = parseSubtitle(text)
      if (parsed.length === 0) {
        setTimedSegments([])
        setError('这个字幕文件里没有读到时间轴；可以粘贴纯文本，系统会用朗读来播放。')
        return
      }
      const plain = transcriptFromSegments(parsed)
      setTimedSegments(parsed)
      setTranscript(plain)
      if (!title.trim()) {
        setTitle(fileTitle(file.name))
      }
    } finally {
      setReadingSubtitle(false)
    }
  }

  async function handleAudio(file: File | null) {
    if (!file) return
    setError(null)
    if (file.size > MAX_AUDIO_BYTES) {
      setError(`音频最多 ${formatBytes(MAX_AUDIO_BYTES)}；这段有 ${formatBytes(file.size)}。可以先用剪辑软件截取一段。`)
      return
    }
    setAudioFile(file)
    if (!title.trim()) setTitle(fileTitle(file.name))
  }

  async function submit() {
    if (saving) return
    setError(null)

    let nextTranscript = transcript.trim()
    let nextSegments: ListeningSegment[] = []
    let nextMaterialId: string | undefined
    let nextSource: ListeningClipDraft['sourceType'] = audioFile
      ? 'audio'
      : 'text'

    if (source === 'material') {
      if (!selectedMaterial) {
        setError('先从材料库里选一篇材料。')
        return
      }
      nextTranscript = selectedMaterial.text.trim()
      nextSegments = splitTranscript(nextTranscript)
      nextMaterialId = selectedMaterial.id
      nextSource = 'material'
      if (nextSegments.length === 0) {
        setError('这份材料没有可用的英文文本。')
        return
      }
    } else {
      if (!nextTranscript) {
        setError('还需要一段英文文本或字幕。没有文本就无法生成听写对照。')
        return
      }
      nextSegments =
        timedSegments.length > 0 &&
        nextTranscript === transcriptFromSegments(timedSegments).trim()
          ? timedSegments
          : splitTranscript(nextTranscript)
    }

    if (nextSegments.length === 0) {
      setError('没有拆出可练习的句子，请检查文本。')
      return
    }

    const nextTitle =
      title.trim() ||
      (selectedMaterial?.title ?? '') ||
      (audioFile ? fileTitle(audioFile.name) : '') ||
      fallbackTitle(nextTranscript) ||
      '未命名听力'

    setSaving(true)
    try {
      await onCreate({
        title: nextTitle,
        transcript:
          nextTranscript || transcriptFromSegments(nextSegments),
        segments: nextSegments,
        sourceType: nextSource,
        materialId: nextMaterialId,
        audioBlob: audioFile
          ? audioFile.slice(0, audioFile.size, audioFile.type || 'audio/mpeg')
          : undefined,
        audioName: audioFile?.name,
        audioMime: audioFile?.type || undefined,
        audioBytes: audioFile?.size ?? 0,
      })
      onOpenChange(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存失败，请再试一次。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <div className="max-h-[88dvh] overflow-y-auto px-5 pb-5 pt-6 sm:px-6">
          <p className="eyebrow">新建听力 · New clip</p>
          <DialogHeader className="mt-1">
            <DialogTitle>放一段声音上书桌</DialogTitle>
            <DialogDescription>
              音频和字幕都只在本地解析。没有音频时，可以用系统英语朗读做逐句精听与 Dictogloss。
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl border border-border/70 bg-muted/50 p-1">
            {[
              { value: 'media' as const, label: '音频 / 文本', icon: FileAudio },
              { value: 'material' as const, label: '从材料库', icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon
              const active = source === tab.value
              return (
                <button
                  key={tab.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setSource(tab.value)
                    setError(null)
                  }}
                  className={cn(
                    'flex h-9 items-center justify-center gap-1.5 rounded-lg text-[11.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                    active
                      ? 'bg-card text-primary shadow-[0_1px_2px_rgb(31_41_51_/_0.07)]'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="size-3.5" strokeWidth={1.8} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {source === 'media' ? (
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="listening-title" className="text-[10.5px] font-medium">
                  标题
                </label>
                <Input
                  id="listening-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="例如：Coffee shop small talk"
                  className="mt-1.5"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/65 bg-muted/15 p-3.5">
                  <div className="flex items-center gap-2 text-primary">
                    <FileAudio className="size-4" strokeWidth={1.8} />
                    <p className="text-[11.5px] font-medium">音频（可选）</p>
                  </div>
                  <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
                    MP3 / M4A / WAV / OGG · 最大 {formatBytes(MAX_AUDIO_BYTES)}
                  </p>
                  <label className="mt-2.5 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[11px] text-foreground transition-colors hover:border-primary/25">
                    <Upload className="size-3.5" strokeWidth={1.8} />
                    选择音频
                    <input
                      type="file"
                      accept={LISTENING_AUDIO_ACCEPT}
                      className="sr-only"
                      onChange={(event) => {
                        void handleAudio(event.target.files?.[0] ?? null)
                        event.target.value = ''
                      }}
                    />
                  </label>
                  {audioFile && (
                    <p className="mt-2 truncate text-[10px] text-primary-ink">
                      {audioFile.name} · {formatBytes(audioFile.size)}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-border/65 bg-muted/15 p-3.5">
                  <div className="flex items-center gap-2 text-primary">
                    <FileText className="size-4" strokeWidth={1.8} />
                    <p className="text-[11.5px] font-medium">字幕（可选）</p>
                  </div>
                  <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
                    有 SRT / VTT 时间轴时，可以逐句播放音频。
                  </p>
                  <label className="mt-2.5 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[11px] text-foreground transition-colors hover:border-primary/25">
                    {readingSubtitle ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Upload className="size-3.5" strokeWidth={1.8} />
                    )}
                    选择字幕
                    <input
                      type="file"
                      accept={LISTENING_SUBTITLE_ACCEPT}
                      className="sr-only"
                      onChange={(event) => {
                        void handleSubtitle(event.target.files?.[0] ?? null)
                        event.target.value = ''
                      }}
                    />
                  </label>
                  {timedSegments.length > 0 && (
                    <p className="mt-2 text-[10px] text-primary-ink">
                      已读取 {timedSegments.length} 句带时间轴的字幕
                    </p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-end justify-between gap-2">
                  <label htmlFor="listening-transcript" className="text-[10.5px] font-medium">
                    英文文本
                  </label>
                  <span className="text-[9.5px] text-muted-foreground">
                    {wordCount} 词
                  </span>
                </div>
                <Textarea
                  id="listening-transcript"
                  value={transcript}
                  onChange={(event) => setTranscript(event.target.value)}
                  rows={7}
                  placeholder="粘贴这段音频的英文文本，或从字幕文件自动填入…"
                  className="mt-1.5 min-h-36 text-[12px]"
                />
                {transcriptEdited && (
                  <p className="mt-1.5 text-[10px] leading-5 text-action-ink">
                    文本已经手动修改；保存时会按纯文本重新分句，字幕时间轴不再使用。
                  </p>
                )}
                {audioFile && timedSegments.length === 0 && (
                  <p className="mt-1.5 text-[10px] leading-5 text-muted-foreground">
                    没有时间轴时，音频会从整段开头播放；逐句模式仍然可以对照文本练习。
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-[11px] leading-5 text-muted-foreground">
                从已有材料生成一段听力。没有原音频时，使用系统英语朗读逐句播放，适合做 Dictogloss。
              </p>
              {materials.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-border bg-muted/15 px-4 py-6 text-center text-[11.5px] text-muted-foreground">
                  材料库还是空的。先去材料页导入一段英文，再回来。
                </div>
              ) : (
                <>
                  <div className="mt-3">
                    <SelectField
                      id="listening-material"
                      label="选择材料"
                      value={materialId}
                      options={[
                        { value: '', label: '选择一份材料…' },
                        ...materials.map((material) => ({
                          value: material.id,
                          label: `${material.title} · ${material.wordCount} 词`,
                        })),
                      ]}
                      onChange={(value) => {
                        setMaterialId(value)
                        const material = materials.find((item) => item.id === value)
                        if (material) setTitle(material.title)
                      }}
                    />
                  </div>
                  {selectedMaterial && (
                    <div className="mt-3 rounded-xl border border-border/60 bg-muted/15 px-4 py-3">
                      <p className="text-[11.5px] font-medium">{selectedMaterial.title}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {selectedMaterial.wordCount} 词 · 会自动拆成句子
                      </p>
                      <p className="mt-2 line-clamp-3 text-[10.5px] leading-5 text-muted-foreground/80">
                        {selectedMaterial.text}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-destructive/20 bg-destructive/[0.05] px-3 py-2 text-[10.5px] leading-5 text-destructive"
            >
              {error}
            </p>
          )}

          <DialogFooter className="mt-5">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              取消
            </Button>
            <Button
              variant="action"
              onClick={() => void submit()}
              disabled={saving || readingSubtitle || (source === 'material' && !selectedMaterial)}
            >
              {saving ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Sparkles strokeWidth={1.9} />
              )}
              {saving ? '正在保存…' : '开始练习'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
