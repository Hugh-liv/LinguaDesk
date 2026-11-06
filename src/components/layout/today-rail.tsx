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

export function TodayRail() {
  const stats = useLiveQuery(async () => {
    const [materials, packs, due, daily] = await Promise.all([
      db.materials.count(),
      db.packs.count(),
      db.reviewItems.where('dueAt').belowOrEqual(Date.now()).count(),
      db.settings.get('dailyMinutes'),
    ])
    return {
      materials,
      packs,
      due,
      daily: Math.min(90, Math.max(20, Number(daily?.value) || 45)),
    }
  }, [])
  const daily = stats?.daily ?? 45
  const review = Math.max(3, Math.round(daily * 0.2))
  const input = Math.max(5, Math.round(daily * 0.4))
  const output = Math.max(5, daily - review - input)

  return (
    <>
      <section className="rounded-xl border border-border/70 bg-card/70 p-4">
        <p className="eyebrow">书桌一览 · All</p>
        <div className="mt-4 space-y-3.5">
          <StatRow label="材料" value={stats?.materials ?? 0} />
          <StatRow label="学习包" value={stats?.packs ?? 0} />
          <div className="border-t border-border/60 pt-3.5">
            <StatRow label="待复习" value={stats?.due ?? 0} />
          </div>
        </div>
        <p className="mt-3.5 text-[10.5px] leading-5 text-muted-foreground">
          复习数量会随着词汇卡和听写练习变化。
        </p>
      </section>

      <section className="rounded-xl border border-border/70 bg-card/70 p-4">
        <p className="eyebrow">今日节奏 · {daily} min</p>
        <ol className="mt-3 space-y-3">
          {[
            [String(review), '复习到期卡片'],
            [String(input), '读一段材料'],
            [String(output), '写或复述一小段'],
          ].map(([minutes, text]) => (
            <li key={minutes + "-" + text} className="flex items-center gap-3">
              <span className="font-display text-[18px] leading-none text-action-ink">
                {minutes}
              </span>
              <span className="text-[11px] text-muted-foreground">{text}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 border-t border-border/60 pt-3 text-[10.5px] leading-5 text-muted-foreground">
          做不完也没关系。明天从到期卡片开始。
        </p>
      </section>

      <section className="rounded-xl border border-border/70 bg-card/70 p-4">
        <p className="eyebrow">一条原则</p>
        <p className="mt-2.5 font-display text-[16px] leading-7 text-foreground/85">
          一次只做一件事，
          <br />
          把注意力留在桌上。
        </p>
        <p className="mt-3 text-[10.5px] leading-5 text-muted-foreground">
          今日航线是建议，不是任务清单。状态不对时，先读一页就够了。
        </p>
      </section>
    </>
  )
}
