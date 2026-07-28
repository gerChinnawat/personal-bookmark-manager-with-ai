export interface Bookmark {
  id: string
  title: string
  url: string
  notes?: string | null
  collectionId?: string | null
  createdAt: string
  updatedAt: string
}
