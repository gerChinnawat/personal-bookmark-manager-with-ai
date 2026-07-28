import { beforeEach, describe, expect, it, vi } from 'vitest'
import apiService from '../../../services/api.service'
import { createBookmark, deleteBookmark, fetchBookmarks } from './bookmark.service'
import type { Bookmark } from '../interfaces/bookmark.interface'

vi.mock('../../../services/api.service', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedApiService = vi.mocked(apiService, true)

const bookmark: Bookmark = {
  id: 'b1',
  title: 'Example',
  url: 'https://example.com',
  notes: null,
  collectionId: null,
  createdAt: '2026-07-28T00:00:00.000Z',
  updatedAt: '2026-07-28T00:00:00.000Z',
}

describe('bookmark.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchBookmarks', () => {
    it('GETs /bookmarks with limit=100 and unwraps the envelope', async () => {
      mockedApiService.get.mockResolvedValue({
        status: true,
        message: 'OK',
        data: [bookmark],
      })

      const result = await fetchBookmarks()

      expect(mockedApiService.get).toHaveBeenCalledWith('/bookmarks', {
        params: { limit: 100 },
      })
      expect(result).toEqual([bookmark])
    })
  })

  describe('createBookmark', () => {
    it('POSTs the input and unwraps the envelope', async () => {
      mockedApiService.post.mockResolvedValue({
        status: true,
        message: 'Created',
        data: bookmark,
      })

      const input = { url: 'https://example.com', title: 'Example' }
      const result = await createBookmark(input)

      expect(mockedApiService.post).toHaveBeenCalledWith('/bookmarks', input)
      expect(result).toEqual(bookmark)
    })
  })

  describe('deleteBookmark', () => {
    it('DELETEs /bookmarks/:id', async () => {
      mockedApiService.delete.mockResolvedValue(undefined)

      await deleteBookmark('b1')

      expect(mockedApiService.delete).toHaveBeenCalledWith('/bookmarks/b1')
    })
  })
})
