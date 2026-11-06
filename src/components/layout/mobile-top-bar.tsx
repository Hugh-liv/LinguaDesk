import { Link } from 'react-router-dom'
import { DeskMark } from '@/components/brand/desk-mark'

export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-background/85 px-5 py-3 backdrop-blur-lg md:hidden">
      <Link
        to="/today"
        className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <DeskMark className="size-7" />
        <span className="font-display text-[17px] font-semibold tracking-[-0.02em]">
          LinguaDesk
        </span>
      </Link>
      <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
        <span className="size-1.5 rounded-full bg-primary/60" aria-hidden="true" />
        <span>本地存储</span>
      </div>
    </header>
  )
}
