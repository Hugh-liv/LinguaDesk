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

export function ListeningRail() {
  const data = useLiveQuery(async () => {
    const [clips, sessions] = await Promise.all([
      db.listeningClips.count(),
      db.listeningSessions.orderBy('updatedAt').reverse().limit(1).toArray(),
    ])
    return {
      clips,
      latest: sessions[0] ?? null,
    }
  }, [])

  return (
    <>
      <section className="rounded-xl border border-border/70 bg-card/70 p-4">
        <p className="eyebrow">听力档案 · All</p>
        <div className="mt-4 space-y-3.5">
          <StatRow label="听力片段" value={data?.clips ?? 0} />
          <div className="border-t border-border/60 pt-3.5">
            <StatRow
              label="最近正确率"
              value={
                data?.latest ? `${Math.round(data.latest.accuracy * 100)}%` : '—'
              }
            />
          </div>
        </div>
        {data?.latest && (
          <p className="mt-3 text-[10.5px] leading-5 text-muted-foreground">
            {data.latest.clipTitle} · {formatRelativeTime(data.latest.updatedAt)}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border/70 bg-card/70 p-4">
        <p className="eyebrow">怎么听</p>
        <ol className="mt-3 space-y-3">
          {[
            ['01', '第一遍只抓大意，不暂停。'],
            ['02', '第二遍用逐句精听，补词和词尾。'],
            ['03', '做一次 Dictogloss，把结构写回来。'],
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
        <p className="eyebrow">音频与备份</p>
        <p className="mt-3 text-[11.5px] leading-5 text-muted-foreground">
          音频留在浏览器本地，不会上传。JSON 备份会保留文本和练习记录，但不包含音频文件。
        </p>
        <p className="mt-2 text-[11.5px] leading-5 text-muted-foreground">
          没有音频时，用系统英语朗读；声音取决于设备里的语音。
        </p>
      </section>
    </>
  )
}
