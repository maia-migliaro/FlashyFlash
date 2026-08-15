'use client'

import { useEffect, useState } from 'react'
import { useReviewLimits } from '@/lib/useReviewLimits'
import {
  DEFAULT_NEW_CARD_LIMIT,
  DEFAULT_REVIEW_LIMIT,
  parseLimit,
} from '@/lib/reviewSettings'

export default function ReviewLimitsButton() {
  const { newLimit, reviewLimit, setLimits, hydrated } = useReviewLimits()
  const [draftNew, setDraftNew] = useState(String(newLimit))
  const [draftReview, setDraftReview] = useState(String(reviewLimit))

  useEffect(() => {
    setDraftNew(String(newLimit))
    setDraftReview(String(reviewLimit))
  }, [newLimit, reviewLimit])

  function commit() {
    const next = {
      newLimit: parseLimit(draftNew, DEFAULT_NEW_CARD_LIMIT),
      reviewLimit: parseLimit(draftReview, DEFAULT_REVIEW_LIMIT),
    }
    setDraftNew(String(next.newLimit))
    setDraftReview(String(next.reviewLimit))
    if (next.newLimit === newLimit && next.reviewLimit === reviewLimit) return
    setLimits(next)
  }

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-1.5 text-sm text-[var(--foreground)]">
        <span className="whitespace-nowrap text-[var(--foreground)]/70">New</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          disabled={!hydrated}
          value={draftNew}
          onChange={(e) => setDraftNew(e.target.value.replace(/[^\d]/g, ''))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            }
          }}
          aria-label="New cards today"
          className="w-14 px-2 py-1.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-center text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
      </label>
      <label className="flex items-center gap-1.5 text-sm text-[var(--foreground)]">
        <span className="whitespace-nowrap text-[var(--foreground)]/70">Reviews</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          disabled={!hydrated}
          value={draftReview}
          onChange={(e) => setDraftReview(e.target.value.replace(/[^\d]/g, ''))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            }
          }}
          aria-label="Reviews today"
          className="w-14 px-2 py-1.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-center text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
      </label>
    </div>
  )
}
