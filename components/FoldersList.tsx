'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Play, Table } from 'lucide-react'
import type { Folder } from '@/types/folder'
import type { Flashcard } from '@/types/flashcard'
import FolderCard from './FolderCard'
import CreateFolderModal from './CreateFolderModal'
import FolderDetail from './FolderDetail'
import ReviewSession from './ReviewSession'
import AllCardsView from './AllCardsView'
import { getChildren, getDescendantIds, folderPath } from '@/lib/folders'
import { buildReviewQueue } from '@/lib/reviewQueue'
import { getTodayKey } from '@/lib/srs'

export default function FoldersList() {
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null)
  const [reviewCards, setReviewCards] = useState<Flashcard[] | null>(null)
  const [showAllCards, setShowAllCards] = useState(false)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadFolders()
  }, [])

  async function loadFolders() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setFolders([])
        return
      }

      const { data, error } = await supabase
        .from('folders')
        .select('*, flashcards(id, due_date, suspended, state)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const withOwn = (data || []).map((folder: any) => ({
        ...folder,
        parent_id: folder.parent_id ?? null,
        _cards: folder.flashcards || [],
        flashcards: undefined,
      }))

      const withCounts = withOwn.map((folder: any) => {
        const ids = getDescendantIds(withOwn, folder.id)
        const cards = withOwn
          .filter((item: any) => ids.includes(item.id))
          .flatMap((item: any) => item._cards || [])
        return {
          ...folder,
          flashcard_count: cards.length,
          due_count: buildReviewQueue(cards).length,
          subfolder_count: getChildren(withOwn, folder.id).length,
          _cards: undefined,
        }
      })

      setFolders(withCounts)
      setSelectedFolder((current) => {
        if (!current) return null
        return withCounts.find((folder: Folder) => folder.id === current.id) || current
      })
    } catch (error) {
      console.error('Error loading folders:', error)
      setFolders([])
    } finally {
      setLoading(false)
    }
  }

  async function startGlobalReview() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = getTodayKey()
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', user.id)
        .eq('suspended', false)
        .lte('due_date', today)

      if (error) throw error
      setReviewCards(buildReviewQueue(data || []))
    } catch (error) {
      console.error('Error loading review cards:', error)
      alert('Failed to load today\'s review')
    }
  }

  const totalDue = folders
    .filter((folder) => !folder.parent_id)
    .reduce((sum, folder) => sum + (folder.due_count ?? 0), 0)

  const visibleFolders = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return getChildren(folders, null)
    return folders.filter((folder) =>
      folder.name.toLowerCase().includes(query) ||
      folderPath(folders, folder).toLowerCase().includes(query)
    )
  }, [folders, search])

  if (showAllCards) {
    return (
      <AllCardsView
        folders={folders}
        title="All flashcards"
        onBack={() => setShowAllCards(false)}
        onUpdate={loadFolders}
      />
    )
  }

  if (selectedFolder) {
    const current = folders.find((folder) => folder.id === selectedFolder.id) || selectedFolder
    const parent = current.parent_id
      ? folders.find((folder) => folder.id === current.parent_id) || null
      : null

    return (
      <FolderDetail
        folder={current}
        allFolders={folders}
        onOpenFolder={setSelectedFolder}
        onBack={() => setSelectedFolder(parent)}
        onGoHome={() => setSelectedFolder(null)}
        onFolderUpdate={loadFolders}
      />
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-[var(--foreground)]">
          Folders
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {totalDue > 0 && (
            <button
              onClick={startGlobalReview}
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-2 bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] rounded-lg min-h-[44px]"
            >
              <Play size={16} />
              <span className="text-sm sm:text-base">Review today ({totalDue})</span>
            </button>
          )}
          {folders.length > 0 && (
            <button
              onClick={() => setShowAllCards(true)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-2 bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] rounded-lg min-h-[44px]"
            >
              <Table size={16} />
              <span className="text-sm sm:text-base">All cards / CSV</span>
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-2 bg-[var(--accent)] text-white rounded-lg min-h-[44px]"
          >
            <Plus size={18} />
            <span className="text-sm sm:text-base">New Folder</span>
          </button>
        </div>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search folders..."
        className="w-full mb-4 px-3 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm text-[var(--foreground)]"
      />

      {loading ? (
        <div className="text-center py-12 text-[var(--foreground)]/50">
          Loading folders...
        </div>
      ) : visibleFolders.length === 0 ? (
        <div className="text-center py-12 bg-[var(--muted)] rounded-lg border border-[var(--border)]">
          <p className="text-[var(--foreground)]/60 mb-4">
            {folders.length === 0
              ? 'No folders yet. Create your first folder to start adding flashcards.'
              : 'No folders match that search.'}
          </p>
          {folders.length === 0 && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg"
            >
              <Plus size={18} />
              Create Folder
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleFolders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              path={search.trim() ? folderPath(folders, folder) : undefined}
              onOpen={() => setSelectedFolder(folder)}
              onEdit={() => setEditingFolder(folder)}
              onDelete={loadFolders}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateFolderModal
          allFolders={folders}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            loadFolders()
          }}
        />
      )}

      {editingFolder && (
        <CreateFolderModal
          folder={editingFolder}
          allFolders={folders}
          onClose={() => setEditingFolder(null)}
          onSuccess={() => {
            setEditingFolder(null)
            loadFolders()
          }}
        />
      )}

      {reviewCards && (
        <ReviewSession
          cards={reviewCards}
          onClose={() => {
            setReviewCards(null)
            loadFolders()
          }}
        />
      )}
    </div>
  )
}
