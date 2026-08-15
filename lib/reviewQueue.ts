import type { Flashcard } from '@/types/flashcard'
import { isDue } from '@/lib/srs'
import { DEFAULT_NEW_CARD_LIMIT, DEFAULT_REVIEW_LIMIT } from '@/lib/reviewSettings'

export const NEW_CARD_LIMIT = DEFAULT_NEW_CARD_LIMIT
export const REVIEW_LIMIT = DEFAULT_REVIEW_LIMIT

export function isActive(card: { suspended?: boolean }): boolean {
  return card.suspended !== true
}

export function isNewCard(card: { state?: string | null }): boolean {
  return !card.state || card.state === 'new'
}

export function buildReviewQueue(
  cards: Array<Pick<Flashcard, 'suspended' | 'state' | 'due_date'> & Partial<Flashcard>>,
  newLimit = NEW_CARD_LIMIT,
  reviewLimit = REVIEW_LIMIT
): Flashcard[] {
  const active = cards.filter(isActive)
  const due = active.filter((card) => isDue(card.due_date))
  const reviews = due.filter((card) => !isNewCard(card)).slice(0, reviewLimit)
  const news = due.filter(isNewCard).slice(0, newLimit)
  return [...reviews, ...news] as Flashcard[]
}

export function dueCount(cards: Flashcard[]): number {
  return buildReviewQueue(cards).length
}

export function definitionsInFolder(cards: Flashcard[]): Set<string> {
  return new Set(cards.map((card) => card.definition.trim().toLowerCase()).filter(Boolean))
}
