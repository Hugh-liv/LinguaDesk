import { cn } from '@/lib/utils'

export function DeskMark({
  className,
  muted = false,
}: {
  className?: string
  muted?: boolean
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={cn('size-9 shrink-0', className)}
    >
      <rect
        width="64"
        height="64"
        rx="15"
        fill={muted ? 'var(--primary-wash)' : 'var(--primary)'}
      />
      <circle cx="32" cy="19.5" r="4.2" fill="var(--action)" />
      <path
        d="M13 34c6.8-2.6 12.8-2.2 19 1.2 6.2-3.4 12.2-3.8 19-1.2v14c-6.8-2.6-12.8-2.2-19 1.2-6.2-3.4-12.2-3.8-19-1.2V34Z"
        fill={muted ? 'var(--primary)' : 'var(--background)'}
      />
      <path
        d="M32 35.2v14"
        stroke={muted ? 'var(--background)' : 'var(--primary)'}
        strokeWidth="1.6"
        opacity=".45"
      />
      <path
        d="M19.5 39.5c3.1-.5 5.7-.2 8.4 1M19.5 44c3.1-.5 5.7-.2 8.4 1"
        stroke={muted ? 'var(--background)' : 'var(--primary)'}
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity=".3"
      />
    </svg>
  )
}
