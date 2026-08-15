'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, X } from 'lucide-react'
import { parseCardText } from '@/lib/csv'

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
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const parsed = parseCardText(text)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setText(String(reader.result || ''))
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  async function handleImport() {
    if (parsed.length === 0) return
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: existingCards, error: existingError } = await supabase
        .from('flashcards')
        .select('id, definition')
        .eq('folder_id', folderId)

      if (existingError) throw existingError

      const byDefinition = new Map(
        (existingCards || []).map((card) => [card.definition.trim().toLowerCase(), card.id])
      )

      const toInsert: Record<string, unknown>[] = []
      let updated = 0

      for (const card of parsed) {
        const key = card.definition.toLowerCase()
        const payload = {
          definition: card.definition,
          answer: card.answer,
          extra: card.extra.trim() || null,
          tags: card.tags,
          updated_at: new Date().toISOString(),
        }

        const existingId = byDefinition.get(key)
        if (existingId) {
          const { error } = await supabase.from('flashcards').update(payload).eq('id', existingId)
          if (error) throw error
          updated += 1
        } else {
          toInsert.push({
            ...payload,
            user_id: user.id,
            folder_id: folderId,
          })
          byDefinition.set(key, 'pending')
        }

        if (alsoReverse && card.definition.toLowerCase() !== card.answer.toLowerCase()) {
          const reverseKey = card.answer.toLowerCase()
          if (!byDefinition.has(reverseKey)) {
            toInsert.push({
              user_id: user.id,
              folder_id: folderId,
              definition: card.answer,
              answer: card.definition,
              extra: card.extra.trim() || null,
              tags: card.tags,
            })
            byDefinition.set(reverseKey, 'pending')
          }
        }
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from('flashcards').insert(toInsert)
        if (error) throw error
      }

      if (toInsert.length === 0 && updated === 0) {
        alert('Nothing to import.')
        return
      }

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
            Upload or paste a CSV with columns <code className="text-xs">definition,answer,extra,tags</code>.
            No id column needed. Existing words in this folder are updated; new words are created.
            Tags can be separated with <code className="text-xs">;</code> or commas.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="hidden"
            onChange={onFile}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm"
          >
            <Upload size={16} />
            Upload CSV file
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            className="w-full px-3 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)] font-mono text-sm"
            placeholder={'definition,answer,extra,tags\nhello,hallo,,German A1;Basics'}
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
