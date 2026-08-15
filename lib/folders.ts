import type { Folder } from '@/types/folder'

export function getChildren(folders: Folder[], parentId: string | null): Folder[] {
  return folders.filter((folder) => (folder.parent_id ?? null) === parentId)
}

export function getDescendantIds(folders: Folder[], folderId: string): string[] {
  const ids = [folderId]
  for (const child of getChildren(folders, folderId)) {
    ids.push(...getDescendantIds(folders, child.id))
  }
  return ids
}

export function getBreadcrumb(folders: Folder[], folder: Folder): Folder[] {
  const byId = new Map(folders.map((item) => [item.id, item]))
  const trail: Folder[] = [folder]
  let current = folder
  const seen = new Set([folder.id])

  while (current.parent_id) {
    const parent = byId.get(current.parent_id)
    if (!parent || seen.has(parent.id)) break
    trail.unshift(parent)
    seen.add(parent.id)
    current = parent
  }

  return trail
}

export function folderPath(folders: Folder[], folder: Folder): string {
  return getBreadcrumb(folders, folder).map((item) => item.name).join(' / ')
}

export function canBeParent(folders: Folder[], folderId: string, candidateParentId: string | null): boolean {
  if (!candidateParentId) return true
  if (candidateParentId === folderId) return false
  return !getDescendantIds(folders, folderId).includes(candidateParentId)
}

export function parseTags(value: string): string[] {
  const tags = value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
  return [...new Set(tags)]
}

export function tagsToInput(tags: string[] | null | undefined): string {
  return (tags || []).join(', ')
}
