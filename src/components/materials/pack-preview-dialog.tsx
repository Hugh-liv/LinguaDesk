import { BookOpenText } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DictationPanel,
  PatternsPanel,
  QuestionsPanel,
  RetellPanel,
  SummaryPanel,
  VocabPanel,
} from '@/components/materials/pack-panels'
import type { LearningPack } from '@/lib/ai/types'
import type { MaterialRow } from '@/lib/db'
import { formatRelativeTime } from '@/lib/format'

export interface PackEntry {
  material: MaterialRow
  pack: LearningPack
}

export function PackPreviewDialog({
  entry,
  onClose,
}: {
  entry: PackEntry | null
  onClose: () => void
}) {
  return (
    <Dialog
      open={entry !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="h-[92dvh] p-0 sm:h-auto sm:max-h-[88dvh] sm:max-w-3xl">
        {entry && (
          <>
            <header className="shrink-0 border-b border-border/70 px-5 pb-4 pr-14 pt-5 sm:px-7 sm:pt-6">
              <p className="eyebrow">学习包 · Study pack</p>
              <DialogTitle className="mt-2 text-[21px] leading-tight tracking-[-0.02em] sm:text-[25px]">
                {entry.material.title}
              </DialogTitle>
              <DialogDescription asChild>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-muted-foreground">
                  <span>{entry.pack.sourceWordCount} 词</span>
                  <span className="text-border">·</span>
                  <span>{entry.pack.generatorLabel}</span>
                  <span className="text-border">·</span>
                  <span>{formatRelativeTime(entry.pack.createdAt)}</span>
                </div>
              </DialogDescription>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant="outline">词汇 {entry.pack.vocab.length}</Badge>
                <Badge variant="outline">句型 {entry.pack.patterns.length}</Badge>
                <Badge variant="outline">理解 {entry.pack.questions.length}</Badge>
                <Badge variant="outline">听写 {entry.pack.dictation.length}</Badge>
              </div>
            </header>

            <Tabs
              defaultValue="summary"
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="shrink-0 px-5 pt-4 sm:px-7">
                <TabsList>
                  <TabsTrigger value="summary">摘要</TabsTrigger>
                  <TabsTrigger value="vocab">词汇</TabsTrigger>
                  <TabsTrigger value="patterns">句型</TabsTrigger>
                  <TabsTrigger value="questions">理解</TabsTrigger>
                  <TabsTrigger value="dictation">听写</TabsTrigger>
                  <TabsTrigger value="retell">复述</TabsTrigger>
                </TabsList>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
                <TabsContent value="summary">
                  <SummaryPanel pack={entry.pack} />
                </TabsContent>
                <TabsContent value="vocab">
                  <VocabPanel pack={entry.pack} />
                </TabsContent>
                <TabsContent value="patterns">
                  <PatternsPanel pack={entry.pack} />
                </TabsContent>
                <TabsContent value="questions">
                  <QuestionsPanel pack={entry.pack} />
                </TabsContent>
                <TabsContent value="dictation">
                  <DictationPanel pack={entry.pack} />
                </TabsContent>
                <TabsContent value="retell">
                  <RetellPanel pack={entry.pack} />
                </TabsContent>
              </div>
            </Tabs>

            <footer className="shrink-0 border-t border-border/70 bg-muted/20 px-5 py-3 sm:px-7">
              <div className="flex items-center justify-between gap-3">
                <p className="hidden text-[10.5px] text-muted-foreground sm:block">
                  词汇与听写句已进入复习队列。
                </p>
                <div className="ml-auto flex items-center gap-2">
                  <DialogClose asChild>
                    <Button variant="outline" size="sm">
                      收起学习包
                    </Button>
                  </DialogClose>
                  <Button variant="action" size="sm" asChild>
                    <Link to="/study">
                      <BookOpenText strokeWidth={1.8} />
                      去学习台
                    </Link>
                  </Button>
                </div>
              </div>
            </footer>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
