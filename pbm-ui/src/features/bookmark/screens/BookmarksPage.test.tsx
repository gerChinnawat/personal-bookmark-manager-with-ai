import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BookmarksPage from './BookmarksPage'
import { createBookmark, deleteBookmark, fetchBookmarks } from '../services/bookmark.service'
import { fetchCollections } from '../../collection/services/collection.service'
import type { Bookmark } from '../interfaces/bookmark.interface'
import type { Collection } from '../../collection/interfaces/collection.interface'

vi.mock('../services/bookmark.service', () => ({
  fetchBookmarks: vi.fn(),
  createBookmark: vi.fn(),
  deleteBookmark: vi.fn(),
}))

vi.mock('../../collection/services/collection.service', () => ({
  fetchCollections: vi.fn(),
}))

const mockedFetchBookmarks = vi.mocked(fetchBookmarks)
const mockedCreateBookmark = vi.mocked(createBookmark)
const mockedDeleteBookmark = vi.mocked(deleteBookmark)
const mockedFetchCollections = vi.mocked(fetchCollections)

const collection: Collection = {
  id: 'c1',
  name: 'Reading list',
  createdAt: '2026-07-28T00:00:00.000Z',
  updatedAt: '2026-07-28T00:00:00.000Z',
}

const bookmark: Bookmark = {
  id: 'b1',
  title: 'Example',
  url: 'https://example.com',
  notes: null,
  collectionId: null,
  createdAt: '2026-07-28T00:00:00.000Z',
  updatedAt: '2026-07-28T00:00:00.000Z',
}

describe('BookmarksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedFetchCollections.mockResolvedValue([collection])
  })

  it('loads and displays bookmarks on mount', async () => {
    mockedFetchBookmarks.mockResolvedValue([bookmark])

    render(<BookmarksPage />)

    expect(await screen.findByText('Example')).toBeInTheDocument()
    expect(mockedFetchBookmarks).toHaveBeenCalledTimes(1)
  })

  it('shows the empty state when there are no bookmarks', async () => {
    mockedFetchBookmarks.mockResolvedValue([])

    render(<BookmarksPage />)

    expect(await screen.findByText('No bookmarks here')).toBeInTheDocument()
  })

  it('shows an error message when loading fails', async () => {
    mockedFetchBookmarks.mockRejectedValue(new Error('network error'))

    render(<BookmarksPage />)

    expect(await screen.findByText('Could not load bookmarks.')).toBeInTheDocument()
  })

  it('creates a bookmark and reloads the list', async () => {
    const user = userEvent.setup()
    mockedFetchBookmarks.mockResolvedValueOnce([]).mockResolvedValueOnce([bookmark])
    mockedCreateBookmark.mockResolvedValue(bookmark)

    render(<BookmarksPage />)
    await screen.findByText('No bookmarks here')

    await user.click(screen.getByRole('button', { name: 'New bookmark' }))
    await user.type(screen.getByLabelText('URL'), 'https://example.com')
    await user.type(screen.getByLabelText('Title'), 'Example')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() =>
      expect(mockedCreateBookmark).toHaveBeenCalledWith({
        url: 'https://example.com',
        title: 'Example',
        notes: undefined,
        collectionId: undefined,
      }),
    )
    expect(await screen.findByText('Example')).toBeInTheDocument()
  })

  it('optimistically removes a bookmark on delete', async () => {
    const user = userEvent.setup()
    mockedFetchBookmarks.mockResolvedValue([bookmark])
    mockedDeleteBookmark.mockResolvedValue(undefined)

    render(<BookmarksPage />)
    await screen.findByText('Example')

    await user.click(screen.getByRole('button', { name: 'Delete Example' }))

    expect(mockedDeleteBookmark).toHaveBeenCalledWith('b1')
    await waitFor(() => expect(screen.queryByText('Example')).not.toBeInTheDocument())
  })

  it('shows an error when delete fails, after rolling back the optimistic removal', async () => {
    const user = userEvent.setup()
    mockedFetchBookmarks.mockResolvedValue([bookmark])
    mockedDeleteBookmark.mockRejectedValue(new Error('network error'))

    render(<BookmarksPage />)
    await screen.findByText('Example')

    await user.click(screen.getByRole('button', { name: 'Delete Example' }))

    // The page swaps the grid for an error message on failure (BookmarksPage.tsx),
    // so the rolled-back bookmark isn't rendered — only the error surfaces.
    expect(await screen.findByText('Could not delete the bookmark.')).toBeInTheDocument()
  })
})
