import type { ReviewItemRow } from './db'

export type ReviewGrade = 'again' | 'hard' | 'good'

const DAY = 86_400_000
const TEN_MINUTES = 10 * 60_000

interface SchedulingFields
  extends Pick<ReviewItemRow, 'intervalDays' | 'ease' | 'reps' | 'lapses'> {}

export interface ScheduleResult {
  dueAt: number
  intervalDays: number
  ease: number
  reps: number
  lapses: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * A small SM-2-inspired scheduler.
 * again → 10 minutes, hard → short interval, good → growing interval.
 */
export function scheduleReview(
  item: SchedulingFields,
  grade: ReviewGrade,
  now: number = Date.now(),
): ScheduleResult {
  let { intervalDays, ease, reps, lapses } = item

  if (grade === 'again') {
    return {
      dueAt: now + TEN_MINUTES,
      intervalDays: 0,
      ease: clamp(Math.round((ease - 0.2) * 100) / 100, 1.3, 3),
      reps: 0,
      lapses: lapses + 1,
    }
  }

  if (grade === 'hard') {
    intervalDays =
      intervalDays <= 0 ? 1 : clamp(Math.round(intervalDays * 1.5), 1, 180)
    ease = clamp(Math.round((ease - 0.05) * 100) / 100, 1.3, 3)
    reps += 1
  } else {
    if (intervalDays <= 0) intervalDays = 1
    else if (intervalDays === 1) intervalDays = 3
    else intervalDays = clamp(Math.round(intervalDays * ease), 3, 180)

    ease = clamp(Math.round((ease + 0.05) * 100) / 100, 1.3, 3)
    reps += 1
  }

  return {
    dueAt: now + intervalDays * DAY,
    intervalDays,
    ease,
    reps,
    lapses,
  }
}

export function gradeFromAccuracy(accuracy: number): ReviewGrade {
  if (accuracy >= 0.9) return 'good'
  if (accuracy >= 0.55) return 'hard'
  return 'again'
}
