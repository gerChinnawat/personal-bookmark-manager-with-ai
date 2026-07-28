import apiService from '../../../services/api.service'
import type { IResponse } from '../../../interfaces/response.interface'
import type { Bookmark } from '../interfaces/bookmark.interface'

export interface CreateBookmarkInput {
  url: string
  title: string
  notes?: string
  collectionId?: string
}

// GET /bookmarks is paginated (default 25, max 100 — API_DESIGN.md §5); this
// fetches the max single page rather than implementing infinite scroll/load
// more, which is a bigger feature than binding the list for now.
export async function fetchBookmarks(): Promise<Bookmark[]> {
  const envelope = await apiService.get<IResponse<Bookmark[]>>('/bookmarks', {
    params: { limit: 100 },
  })
  return envelope.data
}

export async function createBookmark(input: CreateBookmarkInput): Promise<Bookmark> {
  const envelope = await apiService.post<IResponse<Bookmark>>('/bookmarks', input)
  return envelope.data
}

export async function deleteBookmark(id: string): Promise<void> {
  await apiService.delete(`/bookmarks/${id}`)
}

export async function fetchSharedBookmarks(token: string): Promise<Bookmark[]> {
  const envelope = await apiService.get<IResponse<Bookmark[]>>(
    `/share/collections/${token}/bookmarks`,
    { params: { limit: 100 } },
  )
  return envelope.data
}
