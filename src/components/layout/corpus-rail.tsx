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

export function CorpusRail() {
  const stats = useLiveQuery(async () => {
    const [all, due] = await Promise.all([
      db.corpusItems.toArray(),
      db.corpusItems.where('dueAt').belowOrEqual(Date.now()).toArray(),
    ])
    return {
      total: all.length,
      active: all.filter((item) => item.status === 'active').length,
      due: due.filter((item) => item.status === 'active').length,
      mastered: all.filter((item) => item.status === 'mastered').length,
    }
  }, [])

  return (
    <>
      <section className="rounded-xl border border-border/70 bg-card/70 p-4">
        <p className="eyebrow">语料库 · Corpus</p>
        <div className="mt-4 space-y-3.5">
          <StatRow label="收集错误" value={stats?.total ?? 0} />
          <div className="border-t border-border/60 pt-3.5">
            <StatRow label="待微训练" value={stats?.due ?? 0} />
          </div>
          <StatRow label="已掌握" value={stats?.mastered ?? 0} />
        </div>
        <p className="mt-3.5 text-[10.5px] leading-5 text-muted-foreground">
          同一错误再次出现时，次数会累加。
        </p>
      </section>

      <section className="rounded-xl border border-border/70 bg-card/70 p-4">
        <p className="eyebrow">怎么练</p>
        <ol className="mt-3 space-y-3">
          {[
            ['01', '先不看参考，重写原句。'],
            ['02', '检查差异，再读一遍更自然的版本。'],
            ['03', '按真实记忆程度评分，让错误按间隔回来。'],
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
        <p className="eyebrow">来源</p>
        <p className="mt-3 text-[11.5px] leading-5 text-muted-foreground">
          写作工坊和口语陪练生成反馈时，错误会自动收集；旧反馈可以在页面右上角同步。
        </p>
      </section>
    </>
  )
}
