'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, Play, Upload, FolderPlus, Table } from 'lucide-react'
import type { Folder } from '@/types/folder'
import type { Flashcard } from '@/types/flashcard'
import FlashcardCard from './FlashcardCard'
import CreateFlashcardModal from './CreateFlashcardModal'
import CreateFolderModal from './CreateFolderModal'
import ReviewSession from './ReviewSession'
import InlineCardForm from './InlineCardForm'
import ImportCardsModal from './ImportCardsModal'
import FolderCard from './FolderCard'
import AllCardsView from './AllCardsView'
import { getBreadcrumb, getChildren, getDescendantIds, folderPath } from '@/lib/folders'
import { buildReviewQueue } from '@/lib/reviewQueue'
import { useReviewLimits } from '@/lib/useReviewLimits'

interface FolderDetailProps {
  folder: Folder
  allFolders: Folder[]
  onOpenFolder: (folder: Folder) => void
  onBack: () => void
  onGoHome: () => void
  onFolderUpdate: () => void
}

type CardFilter = 'all' | 'due' | 'new' | 'learning' | 'suspended'

export default function FolderDetail({
  folder,
  allFolders,
  onOpenFolder,
  onBack,
  onGoHome,
  onFolderUpdate,
}: FolderDetailProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [descendantCards, setDescendantCards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSubfolderModal, setShowSubfolderModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null)
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [cardFilter, setCardFilter] = useState<CardFilter>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [moveToId, setMoveToId] = useState('')
  const [showAllCards, setShowAllCards] = useState(false)
  const { newLimit, reviewLimit } = useReviewLimits()
  const supabase = createClient()

  const subfolders = getChildren(allFolders, folder.id)
  const breadcrumb = getBreadcrumb(allFolders, folder)

  useEffect(() => {
    loadCards()
    setSelectedIds(new Set())
  }, [folder.id])

  async function loadCards() {
    setLoading(true)
    try {
      const descendantIds = getDescendantIds(allFolders, folder.id)
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .in('folder_id', descendantIds)
        .order('created_at', { ascending: false })

      if (error) throw error
      const all = (data || []) as Flashcard[]
      setDescendantCards(all)
      setFlashcards(all.filter((card) => card.folder_id === folder.id))
    } catch (error) {
      console.error('Error loading flashcards:', error)
      setFlashcards([])
      setDescendantCards([])
    } finally {
      setLoading(false)
    }
  }

  function handleUpdate() {
    loadCards()
    onFolderUpdate()
  }

  const reviewCards = buildReviewQueue(descendantCards, newLimit, reviewLimit)
  const scopedFolderIds = getDescendantIds(allFolders, folder.id)

  const allTags = useMemo(() => {
    const tags = new Set<string>()
    flashcards.forEach((card) => (card.tags || []).forEach((tag) => tags.add(tag)))
    return [...tags].sort()
  }, [flashcards])

  const visibleCards = useMemo(() => {
    const query = search.trim().toLowerCase()
    return flashcards.filter((card) => {
      if (cardFilter === 'due' && buildReviewQueue([card], newLimit, reviewLimit).length === 0) return false
      if (cardFilter === 'new' && card.state !== 'new') return false
      if (cardFilter === 'learning' && card.state !== 'learning') return false
      if (cardFilter === 'suspended' && !card.suspended) return false
      if (tagFilter && !(card.tags || []).includes(tagFilter)) return false
      if (!query) return true
      return (
        card.definition.toLowerCase().includes(query) ||
        card.answer.toLowerCase().includes(query) ||
        (card.extra || '').toLowerCase().includes(query) ||
        (card.tags || []).some((tag) => tag.toLowerCase().includes(query))
      )
    })
  }, [flashcards, search, tagFilter, cardFilter, newLimit, reviewLimit])

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function bulkUpdate(values: Record<string, unknown>) {
    if (selectedIds.size === 0) return
    const { error } = await supabase
      .from('flashcards')
      .update({ ...values, updated_at: new Date().toISOString() })
      .in('id', [...selectedIds])
    if (error) {
      alert('Failed to update selected cards')
      return
    }
    setSelectedIds(new Set())
    handleUpdate()
  }

  async function bulkDelete() {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} selected flashcards?`)) return
    const { error } = await supabase.from('flashcards').delete().in('id', [...selectedIds])
    if (error) {
      alert('Failed to delete selected cards')
      return
    }
    setSelectedIds(new Set())
    handleUpdate()
  }

  async function bulkMove() {
    if (!moveToId) return
    await bulkUpdate({ folder_id: moveToId })
    setMoveToId('')
  }

  if (showAllCards) {
    return (
      <AllCardsView
        folders={allFolders}
        folderIds={scopedFolderIds}
        title={`${folder.name} · CSV`}
        defaultFolderPath={folderPath(allFolders, folder)}
        onBack={() => {
          setShowAllCards(false)
          handleUpdate()
        }}
        onUpdate={handleUpdate}
      />
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
        <div className="flex items-start gap-3 min-w-0">
          <button
            onClick={onBack}
            className="mt-0.5 p-2 hover:bg-[var(--muted)] rounded-lg transition-colors touch-manipulation"
            title="Back"
          >
            <ArrowLeft size={20} className="text-[var(--foreground)]" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1 text-xs text-[var(--foreground)]/50 mb-1">
              <button type="button" onClick={onGoHome} className="hover:text-[var(--foreground)]">
                Folders
              </button>
              {breadcrumb.map((item, index) => (
                <span key={item.id} className="flex items-center gap-1">
                  <span>/</span>
                  {index === breadcrumb.length - 1 ? (
                    <span className="text-[var(--foreground)]">{item.name}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpenFolder(item)}
                      className="hover:text-[var(--foreground)]"
                    >
                      {item.name}
                    </button>
                  )}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: folder.color }}
              />
              <h2 className="text-lg sm:text-xl font-semibold text-[var(--foreground)] truncate">
                {folder.name}
              </h2>
            </div>
            {folder.description && (
              <p className="text-sm text-[var(--foreground)]/60 mt-1">
                {folder.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {reviewCards.length > 0 && (
            <button
              onClick={() => setReviewing(true)}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-2 bg-[var(--muted)] border border-[var(--border)] text-[var(--foreground)] rounded-lg min-h-[44px]"
            >
              <Play size={16} />
              <span className="text-sm sm:text-base">Review today ({reviewCards.length})</span>
            </button>
          )}
          <button
            onClick={() => setShowSubfolderModal(true)}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-2 bg-[var(--muted)] border border-[var(--border)] rounded-lg min-h-[44px]"
          >
            <FolderPlus size={16} />
            <span className="text-sm sm:text-base">Subfolder</span>
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-2 bg-[var(--muted)] border border-[var(--border)] rounded-lg min-h-[44px]"
          >
            <Upload size={16} />
            <span className="text-sm sm:text-base">Import</span>
          </button>
          <button
            onClick={() => setShowAllCards(true)}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-2 bg-[var(--muted)] border border-[var(--border)] rounded-lg min-h-[44px]"
          >
            <Table size={16} />
            <span className="text-sm sm:text-base">CSV</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-2 bg-[var(--accent)] text-white rounded-lg min-h-[44px]"
          >
            <Plus size={18} />
            <span className="text-sm sm:text-base">New Flashcard</span>
          </button>
        </div>
      </div>

      {subfolders.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-[var(--foreground)]/70 mb-3">Subfolders</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subfolders.map((subfolder) => (
              <FolderCard
                key={subfolder.id}
                folder={subfolder}
                onOpen={() => onOpenFolder(subfolder)}
                onEdit={() => setEditingFolder(subfolder)}
                onDelete={handleUpdate}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cards..."
          className="px-3 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm text-[var(--foreground)]"
        />
        <select
          value={cardFilter}
          onChange={(e) => setCardFilter(e.target.value as CardFilter)}
          className="px-3 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm text-[var(--foreground)]"
        >
          <option value="all">All cards</option>
          <option value="due">Due today</option>
          <option value="new">New</option>
          <option value="learning">Learning</option>
          <option value="suspended">Suspended</option>
        </select>
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="px-3 py-2 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-sm text-[var(--foreground)]"
        >
          <option value="">All tags</option>
          {allTags.map((tag) => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 bg-[var(--muted)] border border-[var(--border)] rounded-lg p-3">
          <span className="text-sm text-[var(--foreground)]">{selectedIds.size} selected</span>
          <select
            value={moveToId}
            onChange={(e) => setMoveToId(e.target.value)}
            className="px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm"
          >
            <option value="">Move to folder...</option>
            {allFolders.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <button onClick={bulkMove} disabled={!moveToId} className="px-3 py-2 text-sm rounded-lg bg-[var(--background)] border border-[var(--border)] disabled:opacity-50">
            Move
          </button>
          <button onClick={() => bulkUpdate({ suspended: true })} className="px-3 py-2 text-sm rounded-lg bg-[var(--background)] border border-[var(--border)]">
            Suspend
          </button>
          <button onClick={() => bulkUpdate({ suspended: false })} className="px-3 py-2 text-sm rounded-lg bg-[var(--background)] border border-[var(--border)]">
            Unsuspend
          </button>
          <button onClick={bulkDelete} className="px-3 py-2 text-sm rounded-lg bg-red-500/10 text-red-500 border border-red-500/20">
            Delete
          </button>
        </div>
      )}

      <div className="mb-4">
        <InlineCardForm
          folderId={folder.id}
          existingDefinitions={flashcards.map((card) => card.definition)}
          onCreated={handleUpdate}
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--foreground)]/50">
          Loading flashcards...
        </div>
      ) : visibleCards.length === 0 ? (
        <div className="text-center py-12 bg-[var(--muted)] rounded-lg border border-[var(--border)]">
          <p className="text-[var(--foreground)]/60">
            {flashcards.length === 0
              ? 'No flashcards in this folder yet. Use Quick add, Import, or create a subfolder.'
              : 'No flashcards match these filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleCards.map((card) => (
            <FlashcardCard
              key={card.id}
              flashcard={card}
              selected={selectedIds.has(card.id)}
              onToggleSelect={toggleSelect}
              onEdit={() => setEditingCard(card)}
              onDelete={handleUpdate}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateFlashcardModal
          folderId={folder.id}
          existingDefinitions={flashcards.map((card) => card.definition)}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            handleUpdate()
          }}
        />
      )}

      {editingCard && (
        <CreateFlashcardModal
          folderId={folder.id}
          flashcard={editingCard}
          existingDefinitions={flashcards.map((card) => card.definition)}
          onClose={() => setEditingCard(null)}
          onSuccess={() => {
            setEditingCard(null)
            handleUpdate()
          }}
        />
      )}

      {showSubfolderModal && (
        <CreateFolderModal
          parentFolder={folder}
          allFolders={allFolders}
          onClose={() => setShowSubfolderModal(false)}
          onSuccess={() => {
            setShowSubfolderModal(false)
            handleUpdate()
          }}
        />
      )}

      {editingFolder && (
        <CreateFolderModal
          folder={editingFolder}
          allFolders={allFolders}
          onClose={() => setEditingFolder(null)}
          onSuccess={() => {
            setEditingFolder(null)
            handleUpdate()
          }}
        />
      )}

      {showImportModal && (
        <ImportCardsModal
          folderId={folder.id}
          existingDefinitions={flashcards.map((card) => card.definition)}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false)
            handleUpdate()
          }}
        />
      )}

      {reviewing && (
        <ReviewSession
          cards={reviewCards}
          onClose={() => {
            setReviewing(false)
            handleUpdate()
          }}
        />
      )}
    </div>
  )
}
