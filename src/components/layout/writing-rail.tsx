import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { countWords } from '@/lib/text'

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

export function WritingRail() {
  const works = useLiveQuery(() => db.writingWorks.toArray(), [])
  const reviewed = works?.filter((work) => work.feedback !== null).length ?? 0
  const writtenWords =
    works?.reduce((total, work) => total + countWords(work.draft), 0) ?? 0

  return (
    <>
      <section className="rounded-xl border border-border/70 bg-card/70 p-4">
        <p className="eyebrow">写作档案 · All</p>
        <div className="mt-4 space-y-3.5">
          <StatRow label="已保存作品" value={works?.length ?? 0} />
          <StatRow label="收到反馈" value={reviewed} />
          <div className="border-t border-border/60 pt-3.5">
            <StatRow label="累计写作词数" value={writtenWords} />
          </div>
        </div>
        <p className="mt-3.5 text-[10.5px] leading-5 text-muted-foreground">
          目标是让每一版都比上一版清楚一点，而不是一次写成范文。
        </p>
      </section>

      <section className="rounded-xl border border-border/70 bg-card/70 p-4">
        <p className="eyebrow">一次写作的节奏</p>
        <ol className="mt-3 space-y-3">
          {[
            ['01', '出题：选真实场景，先看论点和语块。'],
            ['02', '起草：用自己的话写完，不必边写边改。'],
            ['03', '反馈：只挑 1–2 个最重要的改动。'],
            ['04', '重写：保留自己的声音，再请一次反馈。'],
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
          <p className="eyebrow">反馈原则</p>
          <span className="rounded border border-border/80 px-1.5 py-0.5 text-[8.5px] uppercase tracking-[0.13em] text-muted-foreground">
            Keep voice
          </span>
        </div>
        <p className="mt-3 text-[11.5px] leading-5 text-muted-foreground">
          AI 不会替你重写整篇。它只指出 2–4
          个最值得改的地方，并给一版轻改稿供对照。
        </p>
        <p className="mt-2 text-[11.5px] leading-5 text-muted-foreground">
          写作记录与反馈保存在本机；请求反馈时，当前草稿会发送给所选 AI 服务。
        </p>
      </section>
    </>
  )
}
