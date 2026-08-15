'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Folder as FolderIcon, Pencil, Trash2 } from 'lucide-react'
import type { Folder } from '@/types/folder'

interface FolderCardProps {
  folder: Folder
  path?: string
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function FolderCard({ folder, path, onOpen, onEdit, onDelete }: FolderCardProps) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const count = folder.flashcard_count ?? 0

  async function deleteFolder(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Delete "${folder.name}"? This also deletes all subfolders and their flashcards.`)) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folder.id)

      if (error) throw error
      onDelete()
    } catch (error) {
      console.error('Error deleting folder:', error)
      alert('Failed to delete folder')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={onOpen}
      disabled={loading}
      className="text-left bg-[var(--muted)] rounded-lg border border-[var(--border)] p-4 hover:border-[var(--accent)]/30 transition-all hover:shadow-sm group relative w-full"
    >
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
        <span
          role="button"
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
          className="p-1.5 hover:bg-[var(--background)] rounded transition-all"
          title="Edit folder"
        >
          <Pencil size={14} className="text-[var(--foreground)]/50" />
        </span>
        <span
          role="button"
          onClick={deleteFolder}
          className="p-1.5 hover:bg-[var(--background)] rounded transition-all"
          title="Delete folder"
        >
          <Trash2 size={14} className="text-[var(--foreground)]/50" />
        </span>
      </div>

      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${folder.color}20`, color: folder.color }}
        >
          <FolderIcon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-[var(--foreground)] truncate pr-12">
            {folder.name}
          </h3>
          {path && path !== folder.name && (
            <p className="text-xs text-[var(--foreground)]/40 truncate mt-0.5">{path}</p>
          )}
          {folder.description && (
            <p className="text-sm text-[var(--foreground)]/60 line-clamp-2 mt-1">
              {folder.description}
            </p>
          )}
          <p className="text-xs text-[var(--foreground)]/50 mt-2">
            {count} {count === 1 ? 'flashcard' : 'flashcards'}
            {(folder.subfolder_count ?? 0) > 0 && (
              <span>
                {' '}· {folder.subfolder_count} {folder.subfolder_count === 1 ? 'subfolder' : 'subfolders'}
              </span>
            )}
            {(folder.due_count ?? 0) > 0 && (
              <span className="ml-2 text-[var(--accent)]">
                · {folder.due_count} due today
              </span>
            )}
          </p>
        </div>
      </div>
    </button>
  )
}
