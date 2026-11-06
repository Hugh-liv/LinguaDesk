import type { ReactNode } from 'react'

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <header className="mb-8 md:mb-10">
      <p className="eyebrow">{eyebrow}</p>
      <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <h1 className="text-balance font-display text-[2rem] font-semibold leading-[1.08] tracking-[-0.028em] sm:text-[2.55rem]">
            {title}
          </h1>
          {description && (
            <p className="mt-3 max-w-lg text-[13px] leading-6 text-muted-foreground sm:text-[13.5px]">
              {description}
            </p>
          )}
        </div>
        {children && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </header>
  )
}
