'use client'

import { useEffect, useState } from 'react'
import {
  defaultReviewLimits,
  loadReviewLimits,
  saveReviewLimits,
  subscribeReviewLimits,
  type ReviewLimits,
} from '@/lib/reviewSettings'

export function useReviewLimits() {
  const [limits, setLimitsState] = useState<ReviewLimits>(defaultReviewLimits)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const sync = () => setLimitsState(loadReviewLimits())
    sync()
    setHydrated(true)
    return subscribeReviewLimits(sync)
  }, [])

  function setLimits(next: ReviewLimits) {
    setLimitsState(saveReviewLimits(next))
  }

  return { ...limits, setLimits, hydrated }
}
