import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { BottomTabs } from '@/components/layout/bottom-tabs'
import { ContextRail } from '@/components/layout/context-rail'
import { LeftNav } from '@/components/layout/left-nav'
import { MobileTopBar } from '@/components/layout/mobile-top-bar'
import { findNavItem } from '@/components/layout/nav-items'
import { startCloudSync } from '@/lib/cloud/sync'
import { ensureRecallItems } from '@/lib/db'

export function AppShell() {
  const { pathname } = useLocation()

  useEffect(() => {
    void ensureRecallItems().catch(() => {
      // A failed one-time backfill should not block the app shell.
    })
  }, [])

  useEffect(() => startCloudSync(), [])

  useEffect(() => {
    const label = pathname.startsWith('/writing')
      ? '写作'
      : pathname.startsWith('/speaking')
        ? '口语'
        : pathname.startsWith('/listening')
          ? '听力'
          : pathname.startsWith('/corpus')
            ? '语料库'
            : findNavItem(pathname).zh
    document.title = `${label} · LinguaDesk`
  }, [pathname])

  return (
    <div className="relative min-h-dvh">
      <div className="md:grid md:grid-cols-[224px_minmax(0,1fr)] xl:grid-cols-[248px_minmax(0,1fr)_304px]">
        <LeftNav />

        <div className="min-w-0 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
          <MobileTopBar />
          <main className="mx-auto w-full max-w-[820px] px-5 pb-10 pt-7 sm:px-8 md:px-10 md:pt-12">
            <Outlet />
          </main>
        </div>

        <ContextRail />
      </div>

      <BottomTabs />
    </div>
  )
}
