import type { CardState, Rating } from '@/lib/srs'

export interface Flashcard {
  id: string
  user_id: string
  folder_id: string
  definition: string
  answer: string
  extra: string | null
  tags: string[]
  suspended: boolean
  ease_factor: number
  interval_days: number
  repetitions: number
  due_date: string
  state: CardState
  last_reviewed_at: string | null
  last_rating: Rating | null
  created_at: string
  updated_at: string
}
