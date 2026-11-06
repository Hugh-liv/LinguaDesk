import { ArrowRight, LibraryBig } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { NavItem } from '@/components/layout/nav-items'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ComingSoonPage({ item }: { item: NavItem }) {
  const Icon = item.icon

  return (
    <>
      <PageHeader
        eyebrow={`${item.zh} · ${item.en}`}
        title={item.comingTitle}
        description={item.blurb}
      >
        <Button variant="outline" asChild>
          <Link to="/materials">
            <LibraryBig strokeWidth={1.8} />
            先去材料库
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-[1.35fr_1fr]">
        <Card className="bg-card/70">
          <CardHeader>
            <div className="mb-2 grid size-11 place-items-center rounded-xl bg-primary-wash text-primary">
              <Icon className="size-5" strokeWidth={1.7} />
            </div>
            <p className="eyebrow">下一张页面</p>
            <CardTitle className="text-[22px] tracking-[-0.02em]">
              这里会有什么
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {item.coming.map((entry, index) => (
                <li key={entry} className="flex items-start gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border/80 font-display text-[10px] text-muted-foreground">
                    {index + 1}
                  </span>
                  <span className="text-[12.5px] leading-6 text-muted-foreground">
                    {entry}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/30 p-4 text-[11.5px] leading-6 text-muted-foreground">
              当前可用：材料导入与学习包生成。先去材料库放一段文字，之后的页面会读取这里的材料与复习数据。
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed bg-card/45">
          <CardContent className="flex h-full flex-col justify-between pt-6">
            <div>
              <p className="eyebrow">一条原则</p>
              <p className="mt-3 font-display text-[19px] leading-8 text-foreground/85">
                把注意力留在桌上，
                <br />
                一次只做一件事。
              </p>
            </div>
            <div className="mt-8">
              <p className="text-[11.5px] leading-5 text-muted-foreground">
                不用登录，不用同步，不为留存设计。
              </p>
              <Link
                to="/materials"
                className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] font-medium text-primary transition-colors hover:text-primary-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                回到已完成的材料页
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
