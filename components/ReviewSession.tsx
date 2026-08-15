'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'
import type { Flashcard } from '@/types/flashcard'
import { applyRating, previewIntervalLabel, type Rating } from '@/lib/srs'

interface ReviewSessionProps {
  cards: Flashcard[]
  onClose: () => void
}

const RATINGS: { id: Rating; label: string; shortcut: string; className: string }[] = [
  { id: 'again', label: 'Again', shortcut: '1', className: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/25' },
  { id: 'hard', label: 'Hard', shortcut: '2', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25' },
  { id: 'good', label: 'Good', shortcut: '3', className: 'bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30 hover:bg-[var(--accent)]/25' },
  { id: 'easy', label: 'Easy', shortcut: '4', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25' },
]

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export default function ReviewSession({ cards, onClose }: ReviewSessionProps) {
  const [queue, setQueue] = useState<Flashcard[]>(() => shuffle(cards))
  const [answerShown, setAnswerShown] = useState(false)
  const [reviewed, setReviewed] = useState(0)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const startingCount = cards.length
  const current = queue[0]

  const remainingLabel = useMemo(() => {
    if (!current) return 'Done'
    return `${reviewed + 1} of ${startingCount}`
  }, [current, reviewed, startingCount])

  const rate = useCallback(async (rating: Rating) => {
    if (!current || saving || !answerShown) return
    setSaving(true)

    const nextSrs = applyRating(current, rating)

    try {
      const { error } = await supabase
        .from('flashcards')
        .update({
          ...nextSrs,
          updated_at: new Date().toISOString(),
        })
        .eq('id', current.id)

      if (error) throw error

      setQueue((prev) => {
        const [, ...rest] = prev
        if (rating === 'again') {
          return [...rest, { ...current, ...nextSrs }]
        }
        return rest
      })
      if (rating !== 'again') {
        setReviewed((count) => count + 1)
      }
      setAnswerShown(false)
    } catch (error) {
      console.error('Error saving review:', error)
      alert('Failed to save this review. Try again.')
    } finally {
      setSaving(false)
    }
  }, [answerShown, current, saving, supabase])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return

      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (!current) return

      if (!answerShown && (event.key === ' ' || event.key === 'Enter')) {
        event.preventDefault()
        setAnswerShown(true)
        return
      }

      if (answerShown && !saving) {
        if (event.key === '1') rate('again')
        if (event.key === '2') rate('hard')
        if (event.key === '3') rate('good')
        if (event.key === '4') rate('easy')
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault()
          rate('good')
        }
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answerShown, current, onClose, rate, saving])

  return (
    <div className="fixed inset-0 z-50 bg-[var(--background)] flex flex-col">
      <div className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-[var(--border)]">
        <div>
          <p className="text-sm text-[var(--foreground)]/60">Review today</p>
          <p className="font-medium text-[var(--foreground)]">{remainingLabel}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-[var(--muted)] rounded-lg transition-colors"
          title="Exit review (Esc)"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 flex items-center justify-center">
        {!current ? (
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-2">
              You are done for today
            </h2>
            <p className="text-[var(--foreground)]/60 mb-6">
              Those cards will come back later, spaced out based on how well you knew them.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
            >
              Back to folders
            </button>
          </div>
        ) : (
          <div className="w-full max-w-2xl">
            <button
              type="button"
              onClick={() => setAnswerShown(true)}
              className="w-full min-h-[280px] bg-[var(--muted)] rounded-lg border border-[var(--border)] p-6 sm:p-8 text-left hover:border-[var(--accent)]/30 transition-colors"
            >
              <span className="text-xs uppercase tracking-wide text-[var(--accent)]">
                Definition
              </span>
              <p className="mt-3 text-xl sm:text-2xl text-[var(--foreground)] whitespace-pre-wrap">
                {current.definition}
              </p>

              {answerShown ? (
                <div className="mt-8 pt-6 border-t border-[var(--border)]">
                  <span className="text-xs uppercase tracking-wide text-[var(--accent)]">
                    Answer
                  </span>
                  <p className="mt-3 text-lg sm:text-xl text-[var(--foreground)] whitespace-pre-wrap">
                    {current.answer}
                  </p>
                  {current.extra && (
                    <p className="mt-4 text-sm text-[var(--foreground)]/60 whitespace-pre-wrap">
                      {current.extra}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-10 text-sm text-[var(--foreground)]/40">
                  Press Space or click to show the answer
                </p>
              )}
            </button>

            {answerShown && (
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {RATINGS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={saving}
                    onClick={() => rate(item.id)}
                    className={`rounded-lg border px-3 py-3 text-center transition-colors disabled:opacity-50 min-h-[72px] ${item.className}`}
                  >
                    <div className="text-xs opacity-70">{item.shortcut}</div>
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs mt-1 opacity-70">
                      {previewIntervalLabel(current, item.id)}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <p className="mt-4 text-center text-xs text-[var(--foreground)]/40">
              Shortcuts: Space to reveal, 1 Again, 2 Hard, 3 or Space Good, 4 Easy, Esc to exit
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
