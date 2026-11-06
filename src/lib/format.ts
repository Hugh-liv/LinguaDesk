const relative = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' })

const shortDate = new Intl.DateTimeFormat('zh-CN', {
  month: 'long',
  day: 'numeric',
})

const longDate = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

const weekdayFormat = new Intl.DateTimeFormat('zh-CN', { weekday: 'short' })

export function formatRelativeTime(timestamp: number): string {
  const diff = timestamp - Date.now()
  const abs = Math.abs(diff)

  if (abs < 60_000) return '刚刚'
  if (abs < 3_600_000) return relative.format(Math.round(diff / 60_000), 'minute')
  if (abs < 86_400_000) return relative.format(Math.round(diff / 3_600_000), 'hour')
  if (abs < 7 * 86_400_000) return relative.format(Math.round(diff / 86_400_000), 'day')

  const date = new Date(timestamp)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return sameYear
    ? shortDate.format(date)
    : longDate.format(date)
}

export function formatDeskDate(timestamp: number = Date.now()): string {
  const date = new Date(timestamp)
  const day = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('.')

  return `${day} ${weekdayFormat.format(date)}`
}
