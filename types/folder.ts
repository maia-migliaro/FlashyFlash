export interface Folder {
  id: string
  user_id: string
  name: string
  description: string | null
  color: string
  parent_id: string | null
  created_at: string
  updated_at: string
  flashcard_count?: number
  due_count?: number
  subfolder_count?: number
}
