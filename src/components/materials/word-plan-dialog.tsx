import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { WordGroupsView } from '@/components/materials/word-groups-view'
import type { MaterialRow } from '@/lib/db'

export function WordPlanDialog({
  material,
  onOpenChange,
}: {
  material: MaterialRow | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog
      open={material !== null}
      onOpenChange={(open) => {
        if (!open) onOpenChange(false)
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        {material?.wordPlan && (
          <div className="max-h-[88dvh] overflow-y-auto px-5 pb-5 pt-6 sm:px-6">
            <p className="eyebrow">词汇整理 · Word plan</p>
            <DialogHeader className="mt-1">
              <DialogTitle>{material.wordPlan.title}</DialogTitle>
              <DialogDescription>
                {material.wordPlan.groups.length} 组 ·{' '}
                {material.wordPlan.groups.reduce(
                  (sum, group) => sum + group.words.length,
                  0,
                )}{' '}
                个词 · {material.wordPlan.usedWords.length} 个进入短文
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <WordGroupsView plan={material.wordPlan} />
            </div>
            <div className="mt-5 flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                关闭
              </Button>
              <Button variant="action" asChild>
                <Link to={`/study?mode=reading&material=${material.id}`}>
                  去学习这一课
                  <ArrowRight strokeWidth={1.8} />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
