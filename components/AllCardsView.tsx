'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Download, Plus, Save, Upload } from 'lucide-react'
import type { Folder } from '@/types/folder'
import type { Flashcard } from '@/types/flashcard'
import { folderPath, parseTags } from '@/lib/folders'
import { emptyCsvRow, parseEditorCsv, serializeCsv, type CsvRow } from '@/lib/csv'

interface AllCardsViewProps {
  folders: Folder[]
  folderIds?: string[]
  title?: string
  defaultFolderPath?: string
  onBack: () => void
  onUpdate: () => void
}

function cardsToRows(cards: Flashcard[], folders: Folder[]): CsvRow[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]))
  return cards.map((card) => {
    const folder = byId.get(card.folder_id)
    return {
      id: card.id,
      folder: folder ? folderPath(folders, folder) : '',
      definition: card.definition,
      answer: card.answer,
      extra: card.extra || '',
      tags: (card.tags || []).join(', '),
      suspended: card.suspended ? 'true' : 'false',
    }
  })
}

export default function AllCardsView({
  folders,
  folderIds,
  title = 'All flashcards',
  defaultFolderPath = '',
  onBack,
  onUpdate,
}: AllCardsViewProps) {
  const [rows, setRows] = useState<CsvRow[]>([])
  const [originalIds, setOriginalIds] = useState<string[]>([])
  const [mode, setMode] = useState<'table' | 'csv'>('table')
  const [csvText, setCsvText] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const folderOptions = useMemo(
    () => folders.map((folder) => folderPath(folders, folder)).sort(),
    [folders]
  )
  const pathToFolderId = useMemo(() => {
    const map = new Map<string, string>()
    folders.forEach((folder) => map.set(folderPath(folders, folder), folder.id))
    return map
  }, [folders])

  useEffect(() => {
    loadCards()
  }, [folderIds?.join(','), folders.length])

  async function loadCards() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (folderIds && folderIds.length > 0) {
        query = query.in('folder_id', folderIds)
      }

      const { data, error } = await query
      if (error) throw error

      const nextRows = cardsToRows((data || []) as Flashcard[], folders)
      setRows(nextRows)
      setOriginalIds(nextRows.map((row) => row.id).filter(Boolean))
      setCsvText(serializeCsv(nextRows))
    } catch (error) {
      console.error('Error loading cards:', error)
      alert('Failed to load flashcards')
    } finally {
      setLoading(false)
    }
  }

  function currentRows(): CsvRow[] {
    if (mode === 'csv') return parseEditorCsv(csvText)
    return rows
  }

  function switchMode(next: 'table' | 'csv') {
    if (next === mode) return
    if (next === 'csv') {
      setCsvText(serializeCsv(rows))
    } else {
      setRows(parseEditorCsv(csvText))
    }
    setMode(next)
  }

  function updateRow(index: number, patch: Partial<CsvRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function addRow() {
    setRows((prev) => [...prev, emptyCsvRow(defaultFolderPath || folderOptions[0] || '')])
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  function downloadCsv() {
    const text = serializeCsv(currentRows())
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'flashyflash-cards.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  function onUploadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '')
      const imported = parseEditorCsv(text).map((row) => ({
        ...row,
        id: '',
        folder: row.folder || defaultFolderPath || folderOptions[0] || '',
      }))
      setRows(imported)
      setCsvText(serializeCsv(imported))
      setMode('csv')
      setOriginalIds([])
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  async function save() {
    const nextRows = currentRows().filter((row) => row.definition.trim() && row.answer.trim())
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const hasIds = nextRows.some((row) => row.id)
      if (hasIds) {
        const keptIds = new Set(nextRows.map((row) => row.id).filter(Boolean))
        const removedIds = originalIds.filter((id) => !keptIds.has(id))
        if (removedIds.length > 0) {
          const confirmed = confirm(
            `You removed ${removedIds.length} card${removedIds.length === 1 ? '' : 's'} from this list. Delete them from the database too?`
          )
          if (confirmed) {
            const { error } = await supabase.from('flashcards').delete().in('id', removedIds)
            if (error) throw error
          }
        }
      }

      const { data: existingCards, error: existingError } = await supabase
        .from('flashcards')
        .select('id, folder_id, definition')
        .eq('user_id', user.id)

      if (existingError) throw existingError

      const byFolderAndDefinition = new Map(
        (existingCards || []).map((card) => [
          `${card.folder_id}::${card.definition.trim().toLowerCase()}`,
          card.id,
        ])
      )

      const toInsert: Record<string, unknown>[] = []
      for (const row of nextRows) {
        const folderId = pathToFolderId.get(row.folder) || pathToFolderId.get(defaultFolderPath) || folders[0]?.id
        if (!folderId) throw new Error('Create a folder before saving cards.')

        const payload = {
          folder_id: folderId,
          definition: row.definition.trim(),
          answer: row.answer.trim(),
          extra: row.extra.trim() || null,
          tags: parseTags(row.tags),
          suspended: row.suspended.trim().toLowerCase() === 'true' || row.suspended.trim() === '1',
          updated_at: new Date().toISOString(),
        }

        const matchId = row.id || byFolderAndDefinition.get(`${folderId}::${payload.definition.toLowerCase()}`)
        if (matchId && matchId !== 'pending') {
          const { error } = await supabase.from('flashcards').update(payload).eq('id', matchId)
          if (error) throw error
        } else {
          toInsert.push({ ...payload, user_id: user.id })
          byFolderAndDefinition.set(`${folderId}::${payload.definition.toLowerCase()}`, 'pending')
        }
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from('flashcards').insert(toInsert)
        if (error) throw error
      }

      await loadCards()
      onUpdate()
      alert('Saved.')
    } catch (error: any) {
      console.error('Error saving CSV:', error)
      alert(error?.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const visibleRows = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => {
      const query = search.trim().toLowerCase()
      if (!query) return true
      return [row.folder, row.definition, row.answer, row.extra, row.tags].some((value) =>
        value.toLowerCase().includes(query)
      )
    })

  const inputClass = 'w-full min-w-[140px] px-2 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]'

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-2 hover:bg-[var(--muted)] rounded-lg"
            title="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold text-[var(--foreground)] truncate">
              {title}
            </h2>
            <p className="text-sm text-[var(--foreground)]/60">
              {rows.length} cards · upload a word list, edit, then Save. No IDs needed.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
            <button
              onClick={() => switchMode('table')}
              className={`px-3 py-2 text-sm ${mode === 'table' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--muted)]'}`}
            >
              Table
            </button>
            <button
              onClick={() => switchMode('csv')}
              className={`px-3 py-2 text-sm ${mode === 'csv' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--muted)]'}`}
            >
              CSV
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="hidden"
            onChange={onUploadFile}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm min-h-[40px]"
          >
            <Upload size={16} />
            Upload CSV
          </button>
          <button
            onClick={downloadCsv}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm min-h-[40px]"
          >
            <Download size={16} />
            Download
          </button>
          <button
            onClick={save}
            disabled={saving || loading}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--accent)] text-white rounded-lg text-sm min-h-[40px] disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {mode === 'table' && (
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter this table..."
          className="w-full mb-3 px-3 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
      )}

      {loading ? (
        <div className="text-center py-12 text-[var(--foreground)]/50">Loading cards...</div>
      ) : mode === 'csv' ? (
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          className="w-full min-h-[70vh] px-3 py-3 bg-[var(--muted)] border border-[var(--border)] rounded-lg font-mono text-xs sm:text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          spellCheck={false}
        />
      ) : (
        <div className="overflow-x-auto border border-[var(--border)] rounded-lg">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-[var(--muted)] text-left text-[var(--foreground)]/70">
              <tr>
                <th className="p-2 font-medium">Folder</th>
                <th className="p-2 font-medium">Definition</th>
                <th className="p-2 font-medium">Answer</th>
                <th className="p-2 font-medium">Extra</th>
                <th className="p-2 font-medium">Tags</th>
                <th className="p-2 font-medium">Suspended</th>
                <th className="p-2 font-medium w-16"></th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(({ row, index }) => (
                <tr key={row.id || `new-${index}`} className="border-t border-[var(--border)]">
                  <td className="p-1.5">
                    <select
                      value={row.folder}
                      onChange={(e) => updateRow(index, { folder: e.target.value })}
                      className={inputClass}
                    >
                      {row.folder && !folderOptions.includes(row.folder) && (
                        <option value={row.folder}>{row.folder}</option>
                      )}
                      {folderOptions.map((path) => (
                        <option key={path} value={path}>{path}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1.5">
                    <input
                      value={row.definition}
                      onChange={(e) => updateRow(index, { definition: e.target.value })}
                      className={inputClass}
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      value={row.answer}
                      onChange={(e) => updateRow(index, { answer: e.target.value })}
                      className={inputClass}
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      value={row.extra}
                      onChange={(e) => updateRow(index, { extra: e.target.value })}
                      className={inputClass}
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      value={row.tags}
                      onChange={(e) => updateRow(index, { tags: e.target.value })}
                      className={inputClass}
                    />
                  </td>
                  <td className="p-1.5">
                    <input
                      type="checkbox"
                      checked={row.suspended === 'true'}
                      onChange={(e) => updateRow(index, { suspended: e.target.checked ? 'true' : 'false' })}
                    />
                  </td>
                  <td className="p-1.5">
                    <button
                      onClick={() => removeRow(index)}
                      className="text-xs text-[var(--foreground)]/50 hover:text-red-500"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={addRow}
            className="flex items-center gap-2 w-full p-3 text-sm text-[var(--foreground)]/70 hover:bg-[var(--muted)] border-t border-[var(--border)]"
          >
            <Plus size={16} />
            Add row
          </button>
        </div>
      )}
    </div>
  )
}
