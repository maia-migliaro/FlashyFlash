'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'
import { parseCardText } from '@/lib/csv'
import { definitionsInFolder } from '@/lib/reviewQueue'

interface ImportCardsModalProps {
  folderId: string
  existingDefinitions: string[]
  onClose: () => void
  onSuccess: () => void
}

export default function ImportCardsModal({
  folderId,
  existingDefinitions,
  onClose,
  onSuccess,
}: ImportCardsModalProps) {
  const [text, setText] = useState('')
  const [alsoReverse, setAlsoReverse] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const parsed = parseCardText(text)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  async function handleImport() {
    if (parsed.length === 0) return
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const existing = new Set(existingDefinitions.map((item) => item.trim().toLowerCase()))
      const rows: {
        user_id: string
        folder_id: string
        definition: string
        answer: string
        tags: string[]
      }[] = []

      for (const card of parsed) {
        const key = card.definition.toLowerCase()
        if (existing.has(key)) continue
        existing.add(key)
        rows.push({
          user_id: user.id,
          folder_id: folderId,
          definition: card.definition,
          answer: card.answer,
          tags: card.tags,
        })

        if (alsoReverse && card.definition.toLowerCase() !== card.answer.toLowerCase()) {
          const reverseKey = card.answer.toLowerCase()
          if (!existing.has(reverseKey)) {
            existing.add(reverseKey)
            rows.push({
              user_id: user.id,
              folder_id: folderId,
              definition: card.answer,
              answer: card.definition,
              tags: card.tags,
            })
          }
        }
      }

      if (rows.length === 0) {
        alert('Nothing to import. Those cards already exist in this folder.')
        return
      }

      const { error } = await supabase.from('flashcards').insert(rows)
      if (error) throw error
      onSuccess()
    } catch (error: any) {
      console.error('Error importing cards:', error)
      alert(error?.message || 'Failed to import cards')
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
      <div className="bg-[var(--background)] rounded-lg border border-[var(--border)] w-full max-w-lg shadow-xl my-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[var(--border)]">
          <h2 className="text-lg sm:text-xl font-semibold text-[var(--foreground)]">
            Import flashcards
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--muted)] rounded" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <p className="text-sm text-[var(--foreground)]/60">
            Paste one card per line: <code className="text-xs">definition,answer</code>. Tabs and semicolons work too. Optional third column is tags, separated by <code className="text-xs">|</code>.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            className="w-full px-3 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)] font-mono text-sm"
            placeholder={'hola,hello\nadiós,goodbye,travel|basics'}
          />
          <p className="text-sm text-[var(--foreground)]/60">
            {parsed.length} {parsed.length === 1 ? 'card' : 'cards'} ready
          </p>
          <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
            <input
              type="checkbox"
              checked={alsoReverse}
              onChange={(e) => setAlsoReverse(e.target.checked)}
            />
            Also create reverse cards (answer → definition)
          </label>
        </div>

        <div className="flex gap-3 p-4 sm:p-6 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-[var(--muted)] border border-[var(--border)] rounded-lg min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={loading || parsed.length === 0}
            className="flex-1 px-4 py-3 bg-[var(--accent)] text-white rounded-lg disabled:opacity-50 min-h-[44px] font-medium"
          >
            {loading ? 'Importing...' : `Import ${parsed.length}`}
          </button>
        </div>
      </div>
    </div>
  )
}
