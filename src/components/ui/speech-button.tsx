import { Volume2 } from 'lucide-react'
import { canSpeak, speakEnglish } from '@/lib/speech'
import { cn } from '@/lib/utils'

export function SpeechButton({
  text,
  rate = 0.95,
  label = '朗读',
  className,
}: {
  text: string
  rate?: number
  label?: string
  className?: string
}) {
  const supported = canSpeak()

  return (
    <button
      type="button"
      aria-label={label}
      title={supported ? label : '当前浏览器不支持语音朗读'}
      disabled={!supported}
      onClick={() => speakEnglish(text, rate)}
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-full border border-border/80 bg-card text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-40',
        className,
      )}
    >
      <Volume2 className="size-3.5" strokeWidth={1.8} />
    </button>
  )
}
