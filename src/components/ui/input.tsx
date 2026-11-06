import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-11 w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm text-foreground shadow-[inset_0_1px_1px_rgb(31_41_51_/_0.02)] transition-[border-color,box-shadow] outline-none',
        'placeholder:text-muted-foreground/65',
        'focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/20',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
