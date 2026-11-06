import { Globe2, Loader2, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

function DeskIllustration() {
  return (
    <svg
      viewBox="0 0 320 180"
      role="img"
      aria-label="一张摆着书、纸和茶杯的书桌插画"
      className="mx-auto w-full max-w-[300px]"
    >
      <ellipse cx="160" cy="151" rx="112" ry="7" fill="var(--border)" opacity=".42" />
      <line
        x1="30"
        y1="136"
        x2="290"
        y2="136"
        stroke="var(--border)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <rect
        x="62"
        y="96"
        width="30"
        height="38"
        rx="3"
        fill="var(--card)"
        stroke="var(--border)"
        strokeWidth="1.8"
        transform="rotate(-6 77 115)"
      />
      <path
        d="M70 105h14M70 111h14M70 117h9"
        stroke="var(--muted-foreground)"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity=".38"
        transform="rotate(-6 77 115)"
      />

      <path
        d="M104 116c14-6.5 27-5.5 40 2 13-7.5 26-8.5 40-2v16c-14-6.5-27-5.5-40 2-13-7.5-26-8.5-40-2v-16Z"
        fill="var(--card)"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M144 118.5v15.5" stroke="var(--primary)" strokeWidth="1.6" opacity=".45" />
      <path
        d="M112 122.5c6-1.5 11.5-1 17 1M112 127.5c6-1.5 11.5-1 17 1M159 122.5c6-2 11.5-2.5 17-1M159 127.5c6-2 11.5-2.5 17-1"
        stroke="var(--primary)"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity=".28"
      />

      <path
        d="M220 108h29v18a9 9 0 0 1-9 9h-11a9 9 0 0 1-9-9v-18Z"
        fill="var(--card)"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M249 112h4a6.5 6.5 0 0 1 0 13h-4"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
      />
      <path
        d="M227 99c-3-4 3-7 0-11M236 99c-3-4 3-7 0-11"
        stroke="var(--action)"
        strokeWidth="1.7"
        strokeLinecap="round"
        opacity=".75"
      />

      <circle cx="160" cy="41" r="9.5" fill="var(--action)" opacity=".92" />
      <path
        d="M160 24v-4M160 62v-4M143 41h-4M181 41h-4M148 29l-3-3M175 54l-3-3M172 29l3-3M145 54l3-3"
        stroke="var(--action)"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity=".42"
      />

      <path
        d="M88 72c4-2 8-2 12 0M100 66c3-1.5 6-1.5 9 0"
        stroke="var(--primary)"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity=".18"
      />
    </svg>
  )
}

export function EmptyDesk({
  onImport,
  onLoadSample,
  loadingSample,
  onAutoGenerate,
  onWordBatch,
  onWebSearch,
}: {
  onImport: () => void
  onLoadSample: () => void
  loadingSample: boolean
  onAutoGenerate: () => void
  onWordBatch: () => void
  onWebSearch: () => void
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/55 px-6 py-9 text-center shadow-desk sm:py-11">
      <DeskIllustration />
      <h2 className="mt-4 font-display text-[23px] tracking-[-0.02em]">
        书桌还空着
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-[12.5px] leading-6 text-muted-foreground">
        粘贴一段英文、导入文件、拍一张照片，或者联网找一篇今天的内容；也可以什么都不准备，让
        AI 直接写一页并拆成摘要、词汇、句型与练习。
      </p>
      <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
        <Button variant="action" onClick={onAutoGenerate}>
          <Sparkles strokeWidth={1.9} />
          AI 生成一份材料
        </Button>
        <Button variant="outline" onClick={onImport}>
          <Plus strokeWidth={2} />
          导入第一份材料
        </Button>
      </div>
      <div className="mt-2 flex flex-col justify-center gap-2 sm:flex-row">
        <Button variant="outline" onClick={onWebSearch}>
          <Globe2 strokeWidth={1.8} />
          联网找一页内容
        </Button>
        <Button variant="outline" onClick={onWordBatch}>
          一大批单词？AI 整理词表
        </Button>
        <Button variant="ghost" onClick={onLoadSample} disabled={loadingSample}>
          {loadingSample ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Sparkles strokeWidth={1.9} />
          )}
          载入示例
        </Button>
      </div>
      <p className="mt-4 text-[10px] text-muted-foreground/65">
        不填材料也能开始；示例：The Quiet Desk · 约 230 词
      </p>
    </div>
  )
}
