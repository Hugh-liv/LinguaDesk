import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[11.5px] text-muted-foreground">{label}</span>
      <span className="font-display text-[22px] font-semibold leading-none tabular-nums tracking-[-0.02em]">
        {value}
      </span>
    </div>
  )
}

export function StudyRail() {
  const stats = useLiveQuery(async () => {
    const due = await db.reviewItems
      .where('dueAt')
      .belowOrEqual(Date.now())
      .toArray()

    return {
      dueVocab: due.filter(
        (item) => item.kind === 'vocab' || item.kind === 'recall',
      ).length,
      dueDictation: due.filter((item) => item.kind === 'dictation').length,
      packs: await db.packs.count(),
    }
  }, [])

  return (
    <>
      <section className="rounded-xl border border-border/70 bg-card/70 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="eyebrow">复习队列 · All</p>
          <span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground/60">
            全部材料
          </span>
        </div>
        <div className="mt-4 space-y-3.5">
          <StatRow label="待复习词卡" value={stats?.dueVocab ?? 0} />
          <StatRow label="待复习听写" value={stats?.dueDictation ?? 0} />
          <div className="border-t border-border/60 pt-3.5">
            <StatRow label="可用学习包" value={stats?.packs ?? 0} />
          </div>
        </div>
        <p className="mt-3.5 text-[10.5px] leading-5 text-muted-foreground">
          评分之后，复习间隔会慢慢拉长；忘记的卡会先回来。
        </p>
      </section>

      <section className="rounded-xl border border-border/70 bg-card/70 p-4">
        <p className="eyebrow">桌边提示</p>
        <ol className="mt-3 space-y-3">
          {[
            ['01', '先读一遍原文，再翻词汇卡。语境比孤立记忆更稳。'],
            ['02', '听写时先别急着看原文；写完再对照，错误才有信息。'],
            ['03', '复述追求连贯，不追求逐字复刻。说满 60 秒就很好。'],
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
          <p className="eyebrow">间隔复习</p>
          <span className="rounded border border-border/80 px-1.5 py-0.5 text-[8.5px] uppercase tracking-[0.13em] text-muted-foreground">
            Local
          </span>
        </div>
        <p className="mt-3 text-[11.5px] leading-5 text-muted-foreground">
          忘记：约 10 分钟后回来。模糊：约 1 天后。记得：间隔逐次拉长。
        </p>
        <p className="mt-2 text-[11.5px] leading-5 text-muted-foreground">
          所有调度都在本机计算，不需要联网。
        </p>
      </section>
    </>
  )
}
