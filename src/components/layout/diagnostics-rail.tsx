import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { deriveFocus } from '@/lib/diagnostics'

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[11.5px] text-muted-foreground">{label}</span>
      <span className="font-display text-[19px] font-semibold leading-none tracking-[-0.02em]">
        {value}
      </span>
    </div>
  )
}

export function DiagnosticsRail() {
  const data = useLiveQuery(async () => {
    const since = Date.now() - 7 * 86_400_000
    const [attempts, errors] = await Promise.all([
      db.attempts.where('createdAt').aboveOrEqual(since).count(),
      db.errors.toArray(),
    ])
    return {
      attempts,
      tags: errors.filter((error) => error.count > 0).length,
      focus: deriveFocus(errors),
    }
  }, [])

  return (
    <>
      <section className="rounded-xl border border-border/70 bg-card/70 p-4">
        <p className="eyebrow">诊断概览 · 7 days</p>
        <div className="mt-4 space-y-3.5">
          <StatRow label="近 7 天练习" value={data?.attempts ?? 0} />
          <StatRow label="错误标签" value={data?.tags ?? 0} />
          <div className="border-t border-border/60 pt-3.5">
            <StatRow
              label="当前焦点"
              value={data?.focus ? `${data.focus.minutes} 分钟` : '待积累'}
            />
          </div>
        </div>
        {data?.focus && (
          <p className="mt-3 text-[10.5px] leading-5 text-muted-foreground">
            {data.focus.tag} · {data.focus.title}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border/70 bg-card/70 p-4">
        <p className="eyebrow">诊断原则</p>
        <p className="mt-3 text-[11.5px] leading-5 text-muted-foreground">
          错误是线索，不是分数。我们不计算排名，只找重复出现、下一次可以改的地方。
        </p>
        <p className="mt-2 text-[11.5px] leading-5 text-muted-foreground">
          词汇、听写和复述会记录错误标签；写作反馈与更多练习会逐步接入。
        </p>
      </section>

      <section className="rounded-xl border border-border/70 bg-card/70 p-4">
        <p className="eyebrow">怎么积累线索</p>
        <ol className="mt-3 space-y-3">
          {[
            ['01', '每天先翻几张到期词汇卡，诚实评分。'],
            ['02', '听写后检查错词，不要只看对错。'],
            ['03', '复述结束后按真实感受自评。'],
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
    </>
  )
}
