'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Pencil, Trash2, Pause } from 'lucide-react'
import type { Flashcard } from '@/types/flashcard'
import { formatDueLabel } from '@/lib/srs'

interface FlashcardCardProps {
  flashcard: Flashcard
  selected?: boolean
  onToggleSelect?: (id: string) => void
  onEdit: () => void
  onDelete: () => void
}

export default function FlashcardCard({ flashcard, selected = false, onToggleSelect, onEdit, onDelete }: FlashcardCardProps) {
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const tags = flashcard.tags || []

  async function deleteFlashcard(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Delete this flashcard?')) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('flashcards')
        .delete()
        .eq('id', flashcard.id)

      if (error) throw error
      onDelete()
    } catch (error) {
      console.error('Error deleting flashcard:', error)
      alert('Failed to delete flashcard')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`relative group ${flashcard.suspended ? 'opacity-60' : ''}`}>
      {onToggleSelect && (
        <label
          className="absolute top-2 left-2 z-10 p-1"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(flashcard.id)}
          />
        </label>
      )}
      <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
          className="p-1.5 bg-[var(--background)]/90 border border-[var(--border)] hover:bg-[var(--muted)] rounded transition-all"
          disabled={loading}
          title="Edit flashcard"
        >
          <Pencil size={14} className="text-[var(--foreground)]/50" />
        </button>
        <button
          onClick={deleteFlashcard}
          className="p-1.5 bg-[var(--background)]/90 border border-[var(--border)] hover:bg-[var(--muted)] rounded transition-all"
          disabled={loading}
          title="Delete flashcard"
        >
          <Trash2 size={14} className="text-[var(--foreground)]/50" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((prev) => !prev)}
        disabled={loading}
        className="flashcard-scene w-full h-52 text-left"
        title="Click to flip"
      >
        <div className={`flashcard-inner ${flipped ? 'flipped' : ''}`}>
          <div className="flashcard-face bg-[var(--muted)] rounded-lg border border-[var(--border)] p-4 flex flex-col hover:border-[var(--accent)]/30 transition-colors">
            <div className="flex items-center justify-between mb-2 pl-6">
              <span className="text-xs uppercase tracking-wide text-[var(--accent)]">
                Definition
              </span>
              {flashcard.suspended && (
                <span className="flex items-center gap-1 text-xs text-[var(--foreground)]/50">
                  <Pause size={12} /> Suspended
                </span>
              )}
            </div>
            <p className="text-[var(--foreground)] text-sm sm:text-base whitespace-pre-wrap overflow-y-auto flex-1">
              {flashcard.definition}
            </p>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag) => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--background)] text-[var(--foreground)]/60 border border-[var(--border)]">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <span className="text-xs text-[var(--foreground)]/40 mt-2">
              Click to see answer · {formatDueLabel(flashcard.due_date)}
            </span>
          </div>
          <div className="flashcard-face flashcard-back bg-[var(--muted)] rounded-lg border border-[var(--accent)]/40 p-4 flex flex-col">
            <span className="text-xs uppercase tracking-wide text-[var(--accent)] mb-2">
              Answer
            </span>
            <p className="text-[var(--foreground)] text-sm sm:text-base whitespace-pre-wrap overflow-y-auto flex-1">
              {flashcard.answer}
            </p>
            {flashcard.extra && (
              <p className="text-xs text-[var(--foreground)]/50 mt-2 whitespace-pre-wrap">
                {flashcard.extra}
              </p>
            )}
            <span className="text-xs text-[var(--foreground)]/40 mt-2">
              Click to see definition
            </span>
          </div>
        </div>
      </button>
    </div>
  )
}
