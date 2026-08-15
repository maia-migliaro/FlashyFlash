'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus } from 'lucide-react'

interface InlineCardFormProps {
  folderId: string
  existingDefinitions: string[]
  onCreated: () => void
}

export default function InlineCardForm({ folderId, existingDefinitions, onCreated }: InlineCardFormProps) {
  const [definition, setDefinition] = useState('')
  const [answer, setAnswer] = useState('')
  const [tags, setTags] = useState('')
  const [alsoReverse, setAlsoReverse] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const definitionRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function save() {
    const front = definition.trim()
    const back = answer.trim()
    if (!front || !back || saving) return

    const existing = new Set(existingDefinitions.map((item) => item.trim().toLowerCase()))
    if (existing.has(front.toLowerCase())) {
      setError('A card with this definition already exists in this folder.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const parsedTags = tags.split(',').map((tag) => tag.trim()).filter(Boolean)
      const rows = [
        {
          user_id: user.id,
          folder_id: folderId,
          definition: front,
          answer: back,
          tags: parsedTags,
        },
      ]

      if (alsoReverse && front.toLowerCase() !== back.toLowerCase()) {
        rows.push({
          user_id: user.id,
          folder_id: folderId,
          definition: back,
          answer: front,
          tags: parsedTags,
        })
      }

      const { error: insertError } = await supabase.from('flashcards').insert(rows)
      if (insertError) throw insertError

      setDefinition('')
      setAnswer('')
      onCreated()
      definitionRef.current?.focus()
    } catch (err: any) {
      setError(err?.message || 'Failed to create flashcard')
    } finally {
      setSaving(false)
    }
  }

  function onKeyDown(event: React.KeyboardEvent, field: 'definition' | 'answer') {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (field === 'definition') {
        const answerInput = document.getElementById('inline-answer') as HTMLInputElement | null
        answerInput?.focus()
        return
      }
      save()
    }
  }

  return (
    <div className="bg-[var(--muted)] rounded-lg border border-dashed border-[var(--border)] p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3">
        <Plus size={16} className="text-[var(--accent)]" />
        <p className="text-sm font-medium text-[var(--foreground)]">Quick add</p>
        <p className="text-xs text-[var(--foreground)]/50 hidden sm:block">
          Tab between fields, Enter to save
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          ref={definitionRef}
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          onKeyDown={(e) => onKeyDown(e, 'definition')}
          className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)] text-sm"
          placeholder="Definition"
        />
        <input
          id="inline-answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => onKeyDown(e, 'answer')}
          className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)] text-sm"
          placeholder="Answer"
        />
      </div>
      <div className="mt-2 flex flex-col sm:flex-row gap-2 sm:items-center">
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          onKeyDown={(e) => onKeyDown(e, 'answer')}
          className="flex-1 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)] text-sm"
          placeholder="Tags, comma separated (optional)"
        />
        <label className="flex items-center gap-2 text-sm text-[var(--foreground)]/70 whitespace-nowrap">
          <input
            type="checkbox"
            checked={alsoReverse}
            onChange={(e) => setAlsoReverse(e.target.checked)}
          />
          Also reverse
        </label>
        <button
          type="button"
          onClick={save}
          disabled={saving || !definition.trim() || !answer.trim()}
          className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm disabled:opacity-50 min-h-[40px]"
        >
          {saving ? 'Saving...' : 'Add'}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  )
}
