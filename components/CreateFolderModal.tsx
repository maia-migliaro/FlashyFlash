'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'
import type { Folder } from '@/types/folder'
import { canBeParent } from '@/lib/folders'

interface CreateFolderModalProps {
  onClose: () => void
  onSuccess: () => void
  folder?: Folder | null
  parentFolder?: Folder | null
  allFolders?: Folder[]
}

const COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
]

export default function CreateFolderModal({ onClose, onSuccess, folder, parentFolder, allFolders = [] }: CreateFolderModalProps) {
  const isEditing = !!folder
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: folder?.name || '',
    description: folder?.description || '',
    color: folder?.color || COLORS[0],
    parent_id: folder?.parent_id || parentFolder?.id || null as string | null,
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

      const folderData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        color: formData.color,
        parent_id: formData.parent_id,
        updated_at: new Date().toISOString(),
      }

      if (isEditing && folder) {
        const { error } = await supabase
          .from('folders')
          .update(folderData)
          .eq('id', folder.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('folders')
          .insert({
            user_id: user.id,
            ...folderData,
          })

        if (error) throw error
      }

      onSuccess()
    } catch (error: any) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} folder:`, error)
      alert(`Failed to ${isEditing ? 'update' : 'create'} folder: ${error?.message || 'Unknown error'}`)
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
            {isEditing ? 'Edit Folder' : parentFolder ? `New subfolder in ${parentFolder.name}` : 'Create New Folder'}
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
                Folder Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)]"
                placeholder="e.g., Spanish vocabulary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)] resize-none"
                rows={2}
                placeholder="Optional description"
              />
            </div>

            {allFolders.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Parent folder
                </label>
                <select
                  value={formData.parent_id || ''}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value || null })}
                  className="w-full px-3 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-[var(--foreground)]"
                >
                  <option value="">None (top level)</option>
                  {allFolders
                    .filter((item) => !folder || canBeParent(allFolders, folder.id, item.id))
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-8 h-8 rounded-full transition-all ${
                      formData.color === color ? 'ring-2 ring-offset-2 ring-[var(--foreground)]' : ''
                    }`}
                    style={{ backgroundColor: color, ['--tw-ring-offset-color' as string]: 'var(--background)' }}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
            </div>
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
              disabled={loading || !formData.name.trim()}
              className="flex-1 px-4 py-3 bg-[var(--accent)] text-white rounded-lg active:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px] font-medium"
            >
              {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Folder' : 'Create Folder')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
