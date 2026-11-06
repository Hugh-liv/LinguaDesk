import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  disabled,
  className,
}: {
  id: string
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="text-[10.5px] font-medium text-foreground">
        {label}
      </label>
      <div className="relative mt-1.5">
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            'h-10 w-full appearance-none rounded-xl border border-input bg-card px-2.5 pr-7 text-[11.5px] text-foreground outline-none transition-[border-color,box-shadow] focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60'
          )}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          strokeWidth={1.8}
        />
      </div>
    </div>
  )
}
