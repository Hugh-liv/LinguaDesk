import { BookMarked, Headphones, Lock, Mic, PenLine } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { DeskMark } from '@/components/brand/desk-mark'
import { NAV_ITEMS } from '@/components/layout/nav-items'
import { cn } from '@/lib/utils'

export function LeftNav() {
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col overflow-y-auto border-r border-border/70 px-5 py-7 md:flex">
      <Link
        to="/today"
        className="flex items-center gap-3 rounded-xl px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <DeskMark className="size-9" />
        <span className="min-w-0">
          <span className="block font-display text-[21px] font-semibold leading-none tracking-[-0.02em]">
            LinguaDesk
          </span>
          <span className="mt-1.5 block text-[9.5px] uppercase tracking-[0.19em] text-muted-foreground">
            a quiet desk
          </span>
        </span>
      </Link>

      <div className="mt-10">
        <p className="eyebrow px-3">书桌 · Desk</p>
        <nav className="mt-3 space-y-1" aria-label="主导航">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                {({ isActive }) => (
                  <span
                    className={cn(
                      'flex h-11 items-center gap-3 rounded-xl border px-3 text-[13.5px] transition-colors',
                      isActive
                        ? 'border-border/80 bg-card text-foreground shadow-desk'
                        : 'border-transparent text-muted-foreground hover:bg-card/60 hover:text-foreground',
                    )}
                  >
                    <Icon
                      className={cn(
                        'size-[17px] shrink-0',
                        isActive ? 'text-primary' : 'text-muted-foreground/80',
                      )}
                      strokeWidth={isActive ? 2 : 1.7}
                    />
                    <span className="flex-1 font-medium">{item.zh}</span>
                    <span
                      className={cn(
                        'text-[9px] uppercase tracking-[0.13em]',
                        isActive
                          ? 'text-primary/80'
                          : 'text-muted-foreground/55',
                      )}
                    >
                      {item.en}
                    </span>
                    {isActive && (
                      <span className="size-1.5 rounded-full bg-action" aria-hidden="true" />
                    )}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>
      </div>

      <div className="mt-6">
        <p className="eyebrow px-3">工具 · Tools</p>
        <NavLink
          to="/writing"
          className="mt-3 block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          {({ isActive }) => (
            <span
              className={cn(
                'flex h-11 items-center gap-3 rounded-xl border px-3 text-[13.5px] transition-colors',
                isActive
                  ? 'border-border/80 bg-card text-foreground shadow-desk'
                  : 'border-transparent text-muted-foreground hover:bg-card/60 hover:text-foreground',
              )}
            >
              <PenLine
                className={cn(
                  'size-[17px] shrink-0',
                  isActive ? 'text-primary' : 'text-muted-foreground/80',
                )}
                strokeWidth={isActive ? 2 : 1.7}
              />
              <span className="flex-1 font-medium">写作工坊</span>
              <span
                className={cn(
                  'text-[9px] uppercase tracking-[0.13em]',
                  isActive
                    ? 'text-primary/80'
                    : 'text-muted-foreground/55',
                )}
              >
                Write
              </span>
              {isActive && (
                <span
                  className="size-1.5 rounded-full bg-action"
                  aria-hidden="true"
                />
              )}
            </span>
          )}
        </NavLink>
        <NavLink
          to="/speaking"
          className="mt-1 block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          {({ isActive }) => (
            <span
              className={cn(
                'flex h-11 items-center gap-3 rounded-xl border px-3 text-[13.5px] transition-colors',
                isActive
                  ? 'border-border/80 bg-card text-foreground shadow-desk'
                  : 'border-transparent text-muted-foreground hover:bg-card/60 hover:text-foreground',
              )}
            >
              <Mic
                className={cn(
                  'size-[17px] shrink-0',
                  isActive ? 'text-primary' : 'text-muted-foreground/80',
                )}
                strokeWidth={isActive ? 2 : 1.7}
              />
              <span className="flex-1 font-medium">口语陪练</span>
              <span
                className={cn(
                  'text-[9px] uppercase tracking-[0.13em]',
                  isActive ? 'text-primary/80' : 'text-muted-foreground/55',
                )}
              >
                Speak
              </span>
              {isActive && (
                <span className="size-1.5 rounded-full bg-action" aria-hidden="true" />
              )}
            </span>
          )}
        </NavLink>
        <NavLink
          to="/listening"
          className="mt-1 block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          {({ isActive }) => (
            <span
              className={cn(
                'flex h-11 items-center gap-3 rounded-xl border px-3 text-[13.5px] transition-colors',
                isActive
                  ? 'border-border/80 bg-card text-foreground shadow-desk'
                  : 'border-transparent text-muted-foreground hover:bg-card/60 hover:text-foreground',
              )}
            >
              <Headphones
                className={cn(
                  'size-[17px] shrink-0',
                  isActive ? 'text-primary' : 'text-muted-foreground/80',
                )}
                strokeWidth={isActive ? 2 : 1.7}
              />
              <span className="flex-1 font-medium">听力室</span>
              <span
                className={cn(
                  'text-[9px] uppercase tracking-[0.13em]',
                  isActive ? 'text-primary/80' : 'text-muted-foreground/55',
                )}
              >
                Listen
              </span>
              {isActive && (
                <span className="size-1.5 rounded-full bg-action" aria-hidden="true" />
              )}
            </span>
          )}
        </NavLink>
        <NavLink
          to="/corpus"
          className="mt-1 block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          {({ isActive }) => (
            <span
              className={cn(
                'flex h-11 items-center gap-3 rounded-xl border px-3 text-[13.5px] transition-colors',
                isActive
                  ? 'border-border/80 bg-card text-foreground shadow-desk'
                  : 'border-transparent text-muted-foreground hover:bg-card/60 hover:text-foreground',
              )}
            >
              <BookMarked
                className={cn(
                  'size-[17px] shrink-0',
                  isActive ? 'text-primary' : 'text-muted-foreground/80',
                )}
                strokeWidth={isActive ? 2 : 1.7}
              />
              <span className="flex-1 font-medium">个人语料库</span>
              <span
                className={cn(
                  'text-[9px] uppercase tracking-[0.13em]',
                  isActive ? 'text-primary/80' : 'text-muted-foreground/55',
                )}
              >
                Corpus
              </span>
              {isActive && (
                <span className="size-1.5 rounded-full bg-action" aria-hidden="true" />
              )}
            </span>
          )}
        </NavLink>
      </div>

      <div className="mt-auto space-y-4 pt-6">
        <div className="rounded-xl border border-border/70 bg-card/55 p-4">
          <div className="flex items-center gap-2 text-primary">
            <Lock className="size-3.5" strokeWidth={1.8} />
            <span className="text-[11.5px] font-medium">本地优先</span>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
            材料与学习记录保存在本机。使用 AI 生成时，当前文本会发送给
            所选 AI 服务。
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 px-2 text-[9px] uppercase tracking-[0.12em] text-muted-foreground/60">
          <span>v0.12 · Quiet desk</span>
          <span className="shrink-0">Local</span>
        </div>
      </div>
    </aside>
  )
}
