import { useLiveQuery } from 'dexie-react-hooks'
import { useLocation } from 'react-router-dom'
import { CorpusRail } from '@/components/layout/corpus-rail'
import { DiagnosticsRail } from '@/components/layout/diagnostics-rail'
import { ListeningRail } from '@/components/layout/listening-rail'
import { MeRail } from '@/components/layout/me-rail'
import { SpeakingRail } from '@/components/layout/speaking-rail'
import { findNavItem } from '@/components/layout/nav-items'
import { StudyRail } from '@/components/layout/study-rail'
import { TodayRail } from '@/components/layout/today-rail'
import { WritingRail } from '@/components/layout/writing-rail'
import { db } from '@/lib/db'
import { formatDeskDate } from '@/lib/format'

function StatCell({ value, label }: { value: number; label: string }) {
  return (
    <div className="px-2 text-center first:pl-0 last:pr-0">
      <p className="font-display text-[24px] font-semibold leading-none tracking-[-0.02em] text-foreground">
        {value}
      </p>
      <p className="mt-1.5 text-[10px] tracking-[0.02em] text-muted-foreground">
        {label}
      </p>
    </div>
  )
}

function MaterialsRail() {
  const stats = useLiveQuery(async () => {
    const [materials, packs, due] = await Promise.all([
      db.materials.count(),
      db.packs.count(),
      db.reviewItems.where('dueAt').belowOrEqual(Date.now()).count(),
    ])
    return { materials, packs, due }
  }, [])

  return (
    <>
      <section className="rounded-xl border border-border/70 bg-card/70 p-4">
        <p className="eyebrow">书桌一览</p>
        <div className="mt-4 grid grid-cols-3 divide-x divide-border/70">
          <StatCell value={stats?.materials ?? 0} label="材料" />
          <StatCell value={stats?.packs ?? 0} label="学习包" />
          <StatCell value={stats?.due ?? 0} label="待复习" />
        </div>
        <p className="mt-4 border-t border-border/60 pt-3 text-[10.5px] leading-5 text-muted-foreground">
          新生成的词汇与听写句会自动进入复习队列。
        </p>
      </section>

      <section className="rounded-xl border border-border/70 bg-card/70 p-4">
        <p className="eyebrow">导入小贴士</p>
        <ol className="mt-3 space-y-3">
          {[
            ['01', 'TXT / PDF / DOCX 都可以；扫描版 PDF 需要 OCR，暂不支持。'],
            ['02', '300–3000 词的短文，拆出来的学习包最好用。'],
            ['03', '想让一组新词有语境？试试「词汇成文」。'],
          ].map(([number, text]) => (
            <li key={number} className="flex gap-3">
              <span className="mt-px font-display text-[11px] font-medium text-action-ink">
                {number}
              </span>
              <span className="text-[11.5px] leading-5 text-muted-foreground">
                {text}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border border-border/70 bg-card/70 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="eyebrow">关于生成</p>
          <span className="rounded border border-border/80 px-1.5 py-0.5 text-[8.5px] uppercase tracking-[0.13em] text-muted-foreground">
            AI · Local
          </span>
        </div>
        <p className="mt-3 text-[11.5px] leading-5 text-muted-foreground">
          学习包优先由 AI 生成中文摘要、词汇与练习；API 不可用时自动退回本地启发式。
        </p>
        <p className="mt-2 text-[11.5px] leading-5 text-muted-foreground">
          Key 只存在服务端；AI 生成时当前文本会发送给所选 AI 服务，材料仍保存在本机。
        </p>
      </section>
    </>
  )
}

function ComingRail() {
  const { pathname } = useLocation()
  const item = findNavItem(pathname)

  return (
    <>
      <section className="rounded-xl border border-border/70 bg-card/70 p-4">
        <p className="eyebrow">{item.zh} · {item.en}</p>
        <p className="mt-3 font-display text-[15px] leading-6 text-foreground/85">
          {item.blurb}
        </p>
        <div className="mt-4 border-t border-border/60 pt-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
            正在准备
          </p>
          <ul className="mt-2 space-y-2">
            {item.coming.map((entry) => (
              <li
                key={entry}
                className="flex items-start gap-2 text-[11.5px] leading-5 text-muted-foreground"
              >
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-action/70" />
                {entry}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-xl border border-border/70 bg-card/70 p-4">
        <p className="eyebrow">工作节奏</p>
        <p className="mt-2 text-[11.5px] leading-5 text-muted-foreground">
          这一版先完成材料入库与学习包。其余页面会一张一张接上，不赶工，也不塞满。
        </p>
        <div className="mt-3 flex items-center gap-1.5">
          <span className="h-1 flex-1 rounded-full bg-primary/70" />
          <span className="h-1 flex-1 rounded-full bg-border" />
          <span className="h-1 flex-1 rounded-full bg-border" />
          <span className="h-1 flex-1 rounded-full bg-border" />
          <span className="h-1 flex-1 rounded-full bg-border" />
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground/70">
          第 1 张 / 共 5 张
        </p>
      </section>
    </>
  )
}

export function ContextRail() {
  const { pathname } = useLocation()
  const isToday = pathname === '/' || pathname.startsWith('/today')
  const isMaterials = pathname.startsWith('/materials')
  const isStudy = pathname.startsWith('/study')
  const isWriting = pathname.startsWith('/writing')
  const isSpeaking = pathname.startsWith('/speaking')
  const isListening = pathname.startsWith('/listening')
  const isCorpus = pathname.startsWith('/corpus')
  const isDiagnostics = pathname.startsWith('/diagnostics')
  const isMe = pathname.startsWith('/me')

  return (
    <aside className="sticky top-0 hidden h-dvh overflow-y-auto border-l border-border/60 px-6 py-8 xl:block">
      <div className="flex items-baseline justify-between gap-3">
        <p className="eyebrow">桌边 · Context</p>
        <p className="whitespace-nowrap text-[10px] text-muted-foreground/65">
          {formatDeskDate()}
        </p>
      </div>
      <div className="mt-5 space-y-4">
        {isToday ? (
          <TodayRail />
        ) : isMaterials ? (
          <MaterialsRail />
        ) : isStudy ? (
          <StudyRail />
        ) : isWriting ? (
          <WritingRail />
        ) : isSpeaking ? (
          <SpeakingRail />
        ) : isListening ? (
          <ListeningRail />
        ) : isCorpus ? (
          <CorpusRail />
        ) : isDiagnostics ? (
          <DiagnosticsRail />
        ) : isMe ? (
          <MeRail />
        ) : (
          <ComingRail />
        )}
      </div>
    </aside>
  )
}
