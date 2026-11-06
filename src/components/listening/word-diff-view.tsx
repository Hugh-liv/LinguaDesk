import type { WordDiff } from '@/lib/diff'
import { cn } from '@/lib/utils'

export function WordDiffView({ result }: { result: WordDiff }) {
  return (
    <div>
      <p className="rounded-xl border border-border/60 bg-card px-4 py-3 font-display text-[14px] leading-6 text-foreground/85">
        {result.expected.map((token) => token.word).join(' ')}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {result.expected.map((token, index) => (
          <span
            key={`${token.word}-${index}`}
            className={cn(
              'rounded px-1 py-0.5 text-[11.5px]',
              token.matched
                ? 'bg-primary-wash/70 text-primary-ink'
                : 'bg-destructive/[0.07] text-destructive line-through decoration-destructive/40',
            )}
          >
            {token.word}
          </span>
        ))}
      </div>
      {result.extra.length > 0 && (
        <p className="mt-2 text-[10.5px] leading-5 text-destructive/85">
          多写：{result.extra.join(' · ')}
        </p>
      )}
    </div>
  )
}
