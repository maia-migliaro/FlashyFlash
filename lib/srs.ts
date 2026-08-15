export type Rating = 'again' | 'hard' | 'good' | 'easy'
export type CardState = 'new' | 'learning' | 'review'

export interface SrsFields {
  ease_factor: number
  interval_days: number
  repetitions: number
  due_date: string
  state: CardState
  last_reviewed_at: string | null
  last_rating: Rating | null
}

export const DEFAULT_EASE = 2.5
export const MIN_EASE = 1.3
export const EASY_BONUS = 1.3

export function getTodayKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + days)
  return getTodayKey(date)
}

export function isDue(dueDate: string | null | undefined, today = getTodayKey()): boolean {
  return !dueDate || dueDate <= today
}

function roundEase(ease: number): number {
  return Math.round(Math.max(MIN_EASE, ease) * 100) / 100
}

export function applyRating(card: Partial<SrsFields>, rating: Rating, today = getTodayKey()): SrsFields {
  let ease = card.ease_factor ?? DEFAULT_EASE
  let interval = card.interval_days ?? 0
  let repetitions = card.repetitions ?? 0
  const isNewOrLearning = !card.state || card.state === 'new' || card.state === 'learning' || repetitions === 0

  if (rating === 'again') {
    repetitions = 0
    interval = 0
    ease = roundEase(ease - 0.2)
    return {
      ease_factor: ease,
      interval_days: interval,
      repetitions,
      due_date: today,
      state: 'learning',
      last_reviewed_at: new Date().toISOString(),
      last_rating: rating,
    }
  }

  if (rating === 'hard') {
    interval = isNewOrLearning ? 1 : Math.max(1, Math.round(interval * 1.2))
    ease = roundEase(ease - 0.15)
    repetitions += 1
  } else if (rating === 'good') {
    if (isNewOrLearning) {
      interval = 1
    } else if (repetitions === 1) {
      interval = 6
    } else {
      interval = Math.max(1, Math.round(interval * ease))
    }
    repetitions += 1
  } else {
    interval = isNewOrLearning ? 4 : Math.max(1, Math.round(interval * ease * EASY_BONUS))
    ease = roundEase(ease + 0.15)
    repetitions += 1
  }

  return {
    ease_factor: ease,
    interval_days: interval,
    repetitions,
    due_date: addDays(today, interval),
    state: 'review',
    last_reviewed_at: new Date().toISOString(),
    last_rating: rating,
  }
}

export function previewIntervalLabel(card: Partial<SrsFields>, rating: Rating): string {
  const next = applyRating(card, rating)
  if (next.interval_days === 0) return 'today'
  if (next.interval_days === 1) return '1 day'
  return `${next.interval_days} days`
}

export function formatDueLabel(dueDate: string | null | undefined, today = getTodayKey()): string | null {
  if (!dueDate) return 'Due today'
  if (dueDate <= today) return 'Due today'
  const [y1, m1, d1] = today.split('-').map(Number)
  const [y2, m2, d2] = dueDate.split('-').map(Number)
  const a = new Date(y1, m1 - 1, d1)
  const b = new Date(y2, m2 - 1, d2)
  const days = Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
  if (days === 1) return 'Due tomorrow'
  return `Due in ${days} days`
}
