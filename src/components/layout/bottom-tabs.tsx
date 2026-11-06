import { Link, useLocation } from 'react-router-dom'
import { NAV_ITEMS } from '@/components/layout/nav-items'
import { cn } from '@/lib/utils'

export function BottomTabs() {
  const { pathname } = useLocation()

  return (
    <nav
      aria-label="主导航"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 px-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active =
            pathname === item.to ||
            pathname.startsWith(`${item.to}/`) ||
            (item.to === '/study' &&
              (pathname.startsWith('/writing') ||
                pathname.startsWith('/speaking') ||
                pathname.startsWith('/listening') ||
                pathname.startsWith('/corpus')))

          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className="group flex flex-col items-center gap-1 py-2.5 focus-visible:outline-none"
            >
              <span
                className={cn(
                  'grid h-8 w-12 place-items-center rounded-full transition-colors',
                  active
                    ? 'bg-primary-wash text-primary'
                    : 'text-muted-foreground group-hover:text-foreground',
                )}
              >
                <Icon
                  className="size-[18px]"
                  strokeWidth={active ? 2.1 : 1.75}
                />
              </span>
              <span
                className={cn(
                  'text-[10px] leading-none tracking-[0.02em]',
                  active
                    ? 'font-medium text-primary'
                    : 'text-muted-foreground',
                )}
              >
                {item.zh}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
