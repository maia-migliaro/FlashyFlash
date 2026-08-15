'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'
import type { Flashcard } from '@/types/flashcard'
import { parseTags, tagsToInput } from '@/lib/folders'

interface CreateFlashcardModalProps {
  folderId: string
  existingDefinitions?: string[]
  onClose: () => void
  onSuccess: () => void
  flashcard?: Flashcard | null
}

export default function CreateFlashcardModal({
  folderId,
  existingDefinitions = [],
  onClose,
  onSuccess,
  flashcard,
}: CreateFlashcardModalProps) {
  const isEditing = !!flashcard
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    definition: flashcard?.definition || '',
    answer: flashcard?.answer || '',
    extra: flashcard?.extra || '',
    tags: tagsToInput(flashcard?.tags),
    alsoReverse: false,
    suspended: flashcard?.suspended || false,
  })
  const supabase = createClient()

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const definition = formData.definition.trim()
      const answer = formData.answer.trim()
      const tags = parseTags(formData.tags)

      if (!isEditing) {
        const exists = existingDefinitions.some((item) => item.trim().toLowerCase() === definition.toLowerCase())
        if (exists) {
          throw new Error('A card with this definition already exists in this folder.')
        }
      }

      const cardData = {
        definition,
        answer,
        extra: formData.extra.trim() || null,
        tags,
        suspended: formData.suspended,
        updated_at: new Date().toISOString(),
      }

      if (isEditing && flashcard) {
        const { error } = await supabase
          .from('flashcards')
          .update(cardData)
          .eq('id', flashcard.id)

        if (error) throw error
      } else {
        const rows: any[] = [{
          user_id: user.id,
          folder_id: folderId,
          ...cardData,
        }]

        if (formData.alsoReverse && definition.toLowerCase() !== answer.toLowerCase()) {
          rows.push({
            user_id: user.id,
            folder_id: folderId,
            definition: answer,
            answer: definition,
            extra: formData.extra.trim() || null,
            tags,
            suspended: false,
          })
        }

        const { error } = await supabase.from('flashcards').insert(rows)
        if (error) throw error
      }

      onSuccess()
    } catch (error: any) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} flashcard:`, error)
      alert(`Failed to ${isEditing ? 'update' : 'create'} flashcard: ${error?.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-[var(--background)] rounded-lg border border-[var(--border)] w-full max-w-md shadow-xl my-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[var(--border)] flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-semibold text-[var(--foreground)]">
            {isEditing ? 'Edit Flashcard' : 'Create New Flashcard'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--muted)] rounded transition-colors touch-manipulation"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Definition *
              </label>
              <textarea
                required
                value={formData.definition}
                onChange={(e) => setFormData({ ...formData, definition: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)] resize-none"
                rows={4}
                placeholder="Front of the card — the prompt or definition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Answer *
              </label>
              <textarea
                required
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)] resize-none"
                rows={4}
                placeholder="Back of the card — the answer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Extra notes
              </label>
              <textarea
                value={formData.extra}
                onChange={(e) => setFormData({ ...formData, extra: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)] resize-none"
                rows={2}
                placeholder="Mnemonic, example sentence, or extra info (shown after the answer)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Tags
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)]"
                placeholder="irregular, exam-1"
              />
              <p className="text-xs text-[var(--foreground)]/50 mt-1">Comma separated</p>
            </div>

            {!isEditing && (
              <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={formData.alsoReverse}
                  onChange={(e) => setFormData({ ...formData, alsoReverse: e.target.checked })}
                />
                Also create reverse card
              </label>
            )}

            {isEditing && (
              <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={formData.suspended}
                  onChange={(e) => setFormData({ ...formData, suspended: e.target.checked })}
                />
                Suspend (hide from review)
              </label>
            )}
          </div>

          <div className="flex gap-3 p-4 sm:p-6 border-t border-[var(--border)] flex-shrink-0 bg-[var(--background)]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-[var(--foreground)] active:bg-[var(--border)] transition-colors touch-manipulation min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.definition.trim() || !formData.answer.trim()}
              className="flex-1 px-4 py-3 bg-[var(--accent)] text-white rounded-lg active:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px] font-medium"
            >
              {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Flashcard' : 'Create Flashcard')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
