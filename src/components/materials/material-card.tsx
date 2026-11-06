import {
  BookOpenText,
  Layers3,
  Link2,
  Loader2,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { LearningPack } from '@/lib/ai/types'
import type { MaterialRow } from '@/lib/db'
import { formatRelativeTime } from '@/lib/format'
import { excerpt } from '@/lib/text'
import { cn } from '@/lib/utils'

const SOURCE_LABEL: Record<MaterialRow['sourceType'], string> = {
  paste: '粘贴导入',
  file: '文件导入',
  sample: '示例材料',
  words: '词汇成文',
  'word-batch': 'AI 词汇整理',
  ai: 'AI 自动生成',
  web: '联网搜索',
  image: '图片识别',
}

function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return '来源'
  }
}

function StatusPill({ ready }: { ready: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9.5px] font-medium tracking-[0.01em]',
        ready
          ? 'bg-primary-wash text-primary-ink'
          : 'bg-action-wash text-action-ink',
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          ready ? 'bg-primary' : 'bg-action',
        )}
        aria-hidden="true"
      />
      {ready ? '学习包已生成' : '待生成学习包'}
    </span>
  )
}

function MetaDot() {
  return <span className="text-border" aria-hidden="true">·</span>
}

export function MaterialCard({
  material,
  pack,
  index,
  generating,
  onGenerate,
  onView,
  onViewPlan,
  onRequestDelete,
}: {
  material: MaterialRow
  pack: LearningPack | null
  index: number
  generating: boolean
  onGenerate: () => void
  onView: () => void
  onViewPlan?: () => void
  onRequestDelete: () => void
}) {
  return (
    <article
      className="rise-in group rounded-2xl border border-border/80 bg-card p-5 shadow-desk transition-shadow hover:shadow-desk-lg sm:p-6"
      style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {material.image?.dataUrl && (
            <img
              src={material.image.dataUrl}
              alt=""
              className="mt-0.5 size-12 shrink-0 rounded-lg border border-border/70 bg-white object-cover sm:size-14"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <StatusPill ready={pack !== null} />
              <span className="text-[10px] text-muted-foreground/70">
                {formatRelativeTime(material.updatedAt)}更新
              </span>
            </div>
            <h3 className="mt-2.5 text-balance font-display text-[19px] leading-snug tracking-[-0.015em] sm:text-[21px]">
              {material.title}
            </h3>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`删除 ${material.title}`}
          onClick={onRequestDelete}
          className="-mr-1.5 -mt-1 shrink-0 text-muted-foreground/55 opacity-80 hover:text-destructive focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <Trash2 strokeWidth={1.8} />
        </Button>
      </div>

      <p className="mt-2.5 line-clamp-2 text-[12.5px] leading-6 text-muted-foreground">
        {excerpt(material.text)}
      </p>

      <div className="mt-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10.5px] text-muted-foreground/80">
        <span>{material.wordCount} 词</span>
        <MetaDot />
        <span>{SOURCE_LABEL[material.sourceType]}</span>
        <MetaDot />
        <span>{formatRelativeTime(material.createdAt)}</span>
      </div>

      {material.sources && material.sources.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground/55">
            来源
          </span>
          {material.sources.slice(0, 3).map((source) => (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noreferrer noopener"
              title={source.title}
              className="inline-flex max-w-[170px] items-center gap-1 rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[9.5px] text-muted-foreground transition-colors hover:border-primary/25 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <Link2 className="size-2.5 shrink-0" strokeWidth={1.9} />
              <span className="truncate">
                {source.siteName || sourceHost(source.url)}
              </span>
            </a>
          ))}
          {material.sources.length > 3 && (
            <span className="text-[9.5px] text-muted-foreground/60">
              +{material.sources.length - 3}
            </span>
          )}
        </div>
      )}

      {pack && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          <Badge variant="outline">词汇 {pack.vocab.length}</Badge>
          <Badge variant="outline">句型 {pack.patterns.length}</Badge>
          <Badge variant="outline">理解 {pack.questions.length}</Badge>
          <Badge variant="outline">听写 {pack.dictation.length}</Badge>
          {material.wordPlan && (
            <Badge variant="outline">
              整理 {material.wordPlan.groups.length} 组
            </Badge>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
        {pack ? (
          <>
            <Button variant="outline" onClick={onView}>
              <BookOpenText strokeWidth={1.8} />
              查看学习包
            </Button>
            {material.wordPlan && onViewPlan && (
              <Button variant="ghost" onClick={onViewPlan}>
                <Layers3 strokeWidth={1.8} />
                查看整理
              </Button>
            )}
          </>
        ) : (
          <Button variant="action" onClick={onGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Sparkles strokeWidth={1.9} />
            )}
            {generating ? '正在生成…' : '生成学习包'}
          </Button>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground/65">
          {pack ? '摘要 · 词汇 · 听写已就绪' : '优先 AI · 本地兜底'}
        </span>
      </div>
    </article>
  )
}
