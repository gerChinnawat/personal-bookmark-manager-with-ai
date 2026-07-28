import { beforeEach, describe, expect, it, vi } from 'vitest'
import apiService from '../../../services/api.service'
import { createCollection, deleteCollection, fetchCollections } from './collection.service'
import type { Collection } from '../interfaces/collection.interface'

vi.mock('../../../services/api.service', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockedApiService = vi.mocked(apiService, true)

const collection: Collection = {
  id: 'c1',
  name: 'Reading list',
  shareEnabled: false,
  shareToken: null,
  createdAt: '2026-07-28T00:00:00.000Z',
  updatedAt: '2026-07-28T00:00:00.000Z',
}

describe('collection.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchCollections', () => {
    it('GETs /collections and unwraps the envelope', async () => {
      mockedApiService.get.mockResolvedValue({
        status: true,
        message: 'OK',
        data: [collection],
      })

      const result = await fetchCollections()

      expect(mockedApiService.get).toHaveBeenCalledWith('/collections')
      expect(result).toEqual([collection])
    })
  })

  describe('createCollection', () => {
    it('POSTs the name and unwraps the envelope', async () => {
      mockedApiService.post.mockResolvedValue({
        status: true,
        message: 'Created',
        data: collection,
      })

      const result = await createCollection('Reading list')

      expect(mockedApiService.post).toHaveBeenCalledWith('/collections', {
        name: 'Reading list',
      })
      expect(result).toEqual(collection)
    })
  })

  describe('deleteCollection', () => {
    it('DELETEs /collections/:id', async () => {
      mockedApiService.delete.mockResolvedValue(undefined)

      await deleteCollection('c1')

      expect(mockedApiService.delete).toHaveBeenCalledWith('/collections/c1')
    })
  })
})
