import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { formatRelativeTime } from '@/lib/format'

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[11.5px] text-muted-foreground">{label}</span>
      <span className="font-display text-[22px] font-semibold leading-none tabular-nums tracking-[-0.02em]">
        {value}
      </span>
    </div>
  )
}

export function SpeakingRail() {
  const data = useLiveQuery(async () => {
    const sessions = await db.speakingSessions
      .orderBy('updatedAt')
      .reverse()
      .limit(20)
      .toArray()
    return {
      total: sessions.length,
      latest: sessions[0] ?? null,
    }
  }, [])

  return (
    <>
      <section className="rounded-xl border border-border/70 bg-card/70 p-4">
        <p className="eyebrow">口语档案 · All</p>
        <div className="mt-4 space-y-3.5">
          <StatRow label="完成角色扮演" value={data?.total ?? 0} />
          <div className="border-t border-border/60 pt-3.5">
            <StatRow label="最近一次" value={data?.latest ? '刚刚' : '—'} />
          </div>
        </div>
        {data?.latest && (
          <p className="mt-3 text-[10.5px] leading-5 text-muted-foreground">
            {data.latest.scenarioTitle} ·{' '}
            {formatRelativeTime(data.latest.updatedAt)}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border/70 bg-card/70 p-4">
        <p className="eyebrow">怎么用</p>
        <ol className="mt-3 space-y-3">
          {[
            ['01', '选一个真实场景，先开口。'],
            ['02', '尽量别翻译；卡住就换一种说法。'],
            ['03', '结束后看 2–3 个改动，再做一次 Take 2。'],
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
        <p className="eyebrow">语音与网络</p>
        <p className="mt-3 text-[11.5px] leading-5 text-muted-foreground">
          语音输入依赖浏览器的语音识别服务，在中国网络下可能不可用；随时可以直接打字，不耽误练习。
        </p>
        <p className="mt-2 text-[11.5px] leading-5 text-muted-foreground">
          AI 回复的朗读使用系统语音；声音不会上传到本应用之外。
        </p>
      </section>
    </>
  )
}
