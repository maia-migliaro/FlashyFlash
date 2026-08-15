export const DEFAULT_NEW_CARD_LIMIT = 20
export const DEFAULT_REVIEW_LIMIT = 100
export const REVIEW_LIMITS_KEY = 'flashyflash-review-limits'
export const MAX_DAILY_LIMIT = 9999

export interface ReviewLimits {
  newLimit: number
  reviewLimit: number
}

const listeners = new Set<() => void>()

export function clampLimit(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(MAX_DAILY_LIMIT, Math.max(0, Math.round(value)))
}

export function parseLimit(value: string, fallback: number): number {
  return clampLimit(Number.parseInt(value, 10), fallback)
}

export function defaultReviewLimits(): ReviewLimits {
  return {
    newLimit: DEFAULT_NEW_CARD_LIMIT,
    reviewLimit: DEFAULT_REVIEW_LIMIT,
  }
}

export function loadReviewLimits(): ReviewLimits {
  if (typeof window === 'undefined') return defaultReviewLimits()
  try {
    const raw = window.localStorage.getItem(REVIEW_LIMITS_KEY)
    if (!raw) return defaultReviewLimits()
    const parsed = JSON.parse(raw)
    return {
      newLimit: clampLimit(Number(parsed.newLimit), DEFAULT_NEW_CARD_LIMIT),
      reviewLimit: clampLimit(Number(parsed.reviewLimit), DEFAULT_REVIEW_LIMIT),
    }
  } catch {
    return defaultReviewLimits()
  }
}

export function subscribeReviewLimits(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function saveReviewLimits(limits: ReviewLimits): ReviewLimits {
  const next = {
    newLimit: clampLimit(limits.newLimit, DEFAULT_NEW_CARD_LIMIT),
    reviewLimit: clampLimit(limits.reviewLimit, DEFAULT_REVIEW_LIMIT),
  }
  window.localStorage.setItem(REVIEW_LIMITS_KEY, JSON.stringify(next))
  listeners.forEach((listener) => listener())
  return next
}
